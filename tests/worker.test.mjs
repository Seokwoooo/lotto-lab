import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { createExperiment } from '../core.js';
import { classify } from '../core.js';
import { indexReceipts, readReceipt } from '../receipts.js';

const seed = '123456789abcdef0fedcba9876543210';
const config = { rounds: 100, tickets: 1000, mode: 'auto', seed, fixed: [] };

function runWorker(input, stopOnProgress = false) {
  const workerUrl = new URL('../worker.js', import.meta.url).href;
  const bridge = `import { parentPort } from 'node:worker_threads';
    globalThis.self = { postMessage: (data, transfer) => parentPort.postMessage(data, transfer) };
    await import(${JSON.stringify(workerUrl)});
    parentPort.on('message', data => self.onmessage({ data }));
    parentPort.postMessage({ type: 'ready' });`;
  const worker = new Worker(new URL(`data:text/javascript,${encodeURIComponent(bridge)}`));
  const messages = [];
  return new Promise((resolve, reject) => {
    worker.on('error', reject);
    worker.on('message', message => {
      if (message.type === 'ready') { worker.postMessage({ type: 'start', config: input }); return; }
      if (message.type === 'error') { reject(new Error(message.message)); return; }
      messages.push(message);
      if (message.type === 'progress' && stopOnProgress) worker.postMessage({ type: 'stop' });
      if (message.type === 'done' || message.type === 'stopped') resolve(messages);
    });
  }).finally(() => worker.terminate());
}

test('the worker preserves seeded outcomes and every receipt across 100 rounds', { timeout: 5000 }, async () => {
  const messages = await runWorker(config);
  for (const message of messages.filter(m => m.type === 'progress')) {
    assert.ok(message.result.last === null, 'Progress must not clone receipt arrays');
    assert.equal(message.result.receipts, undefined, 'History is transferred only on completion');
    assert.equal(message.result.receiptIndex, undefined, 'Receipt indices are transferred only on completion');
  }
  const result = messages.at(-1).result;
  const expected = createExperiment(config); expected.step(config.rounds);
  const { receipts, receiptIndex, ...outcome } = result;
  assert.deepEqual(outcome, expected.snapshot());
  assert.equal(result.games, 100000);
  assert.equal(result.counts.reduce((sum, count) => sum + count, 0), 100000);
  assert.equal(result.last.tickets.length, 1000);
  assert.equal(receipts.numbers.length, result.games * 6);
  assert.equal(receipts.ranks.length, result.games);
  assert.equal(receipts.draws.length, result.rounds * 7);
  const index = indexReceipts(receipts);
  assert.deepEqual(receiptIndex, index);
  assert.equal(index.total, 20000);
  assert.equal(index.winners.length + index.losers.length, index.total);
  const counts = [0, 0, 0, 0, 0, 0];
  for (let sheet = 0; sheet < index.total; sheet++) {
    const receipt = readReceipt(receipts, sheet);
    for (const ticket of receipt.tickets) {
      assert.equal(ticket.rank, classify(ticket.numbers, receipt.winning, receipt.bonus));
      counts[ticket.rank]++;
    }
  }
  assert.deepEqual(counts, result.counts);
  assert.equal(readReceipt(receipts, index.total - 1).tickets.at(-1).game, result.games);
});

test('a large worker run can stop between chunks without counting unfinished rounds', { timeout: 5000 }, async () => {
  const input = { ...config, rounds: 1000 };
  const messages = await runWorker(input, true);
  const progress = messages.find(m => m.type === 'progress');
  assert.ok(progress, 'The worker should yield before completing a million games');
  assert.ok(progress.result.last === null, 'Progress must not clone receipt arrays');
  const stopped = messages.at(-1);
  assert.equal(stopped.type, 'stopped');
  assert.ok(stopped.result.rounds > 0 && stopped.result.rounds < input.rounds);
  assert.equal(stopped.result.complete, false);
  assert.equal(stopped.result.games, stopped.result.rounds * input.tickets);
  assert.equal(stopped.result.counts.reduce((sum, count) => sum + count, 0), stopped.result.games);
  assert.equal(stopped.result.last.tickets.length, input.tickets);
  assert.equal(stopped.result.receipts.rounds, stopped.result.rounds);
  assert.equal(stopped.result.receipts.ranks.length, stopped.result.games);
  assert.equal(stopped.result.receiptIndex.total, stopped.result.rounds * Math.ceil(input.tickets / 5));
});
