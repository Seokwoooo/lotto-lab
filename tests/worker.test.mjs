import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { createExperiment } from '../core.js';

const seed = '123456789abcdef0fedcba9876543210';
const config = { rounds: 100, tickets: 1000, mode: 'auto', seed, fixed: [] };

function runWorker(input, stopOnProgress = false) {
  const workerUrl = new URL('../worker.js', import.meta.url).href;
  const bridge = `import { parentPort } from 'node:worker_threads';
    globalThis.self = { postMessage: data => parentPort.postMessage(data) };
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

test('the 100-million-won worker run matches the seeded model and retains only its last round', { timeout: 5000 }, async () => {
  const messages = await runWorker(config);
  for (const message of messages.filter(m => m.type === 'progress')) {
    assert.ok(message.result.last === null, 'Progress must not clone receipt arrays');
  }
  const result = messages.at(-1).result;
  const expected = createExperiment(config); expected.step(config.rounds);
  assert.deepEqual(result, expected.snapshot());
  assert.equal(result.games, 100000);
  assert.equal(result.counts.reduce((sum, count) => sum + count, 0), 100000);
  assert.equal(result.last.tickets.length, 1000);
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
});
