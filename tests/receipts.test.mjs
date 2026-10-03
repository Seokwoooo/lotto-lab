import test from 'node:test';
import assert from 'node:assert/strict';
import { createExperiment, classify } from '../core.js';
import { createReceiptArchive, indexReceipts, readReceipt } from '../receipts.js';

const seed = '2124ef1261724b85c707cbfbd49334bf';

test('partial sheets never combine tickets from different draws', () => {
  const config = { rounds: 3, tickets: 7, mode: 'auto', seed };
  const archive = createReceiptArchive(config), rounds = [];
  const experiment = createExperiment(config, { onRound(last) { archive.record(last); rounds.push(last); } });
  experiment.step(3);
  const history = archive.snapshot(), index = indexReceipts(history);
  assert.equal(index.total, 6);
  const seen = [];
  for (let sheet = 0; sheet < index.total; sheet++) {
    const receipt = readReceipt(history, sheet);
    assert.equal(receipt.tickets.length, sheet % 2 ? 2 : 5);
    assert.deepEqual(receipt.winning, rounds[Math.floor(sheet / 2)].winning);
    for (const ticket of receipt.tickets) {
      seen.push(ticket.game);
      assert.equal(ticket.rank, classify(ticket.numbers, receipt.winning, receipt.bonus));
    }
  }
  assert.deepEqual(seen, Array.from({ length: 21 }, (_, i) => i + 1));
  assert.throws(() => readReceipt(history, 6));
});

test('winning and losing sheet filters partition the full history, including fixed copies', () => {
  for (const mode of ['auto', 'fixed']) {
    const config = { rounds: 1000, tickets: 11, mode, seed, fixed: [1, 2, 3, 4, 5, 6] };
    const archive = createReceiptArchive(config);
    const experiment = createExperiment(config, { onRound: last => archive.record(last) });
    experiment.step(config.rounds);
    const history = archive.snapshot(), index = indexReceipts(history);
    assert.equal(index.winners.length + index.losers.length, 3000);
    assert.equal(new Set([...index.winners, ...index.losers]).size, 3000);
    for (const sheet of index.winners) assert.ok(readReceipt(history, sheet).tickets.some(t => t.rank > 0));
    for (const sheet of index.losers) assert.ok(readReceipt(history, sheet).tickets.every(t => t.rank === 0));
    if (index.winners.length) {
      const best = Math.min(...history.ranks.filter(rank => rank > 0));
      assert.ok(readReceipt(history, index.bestSheet).tickets.some(t => t.rank === best));
    }
  }
});

test('the receipt buffers remain bounded at the one-million-game limit', () => {
  const history = createReceiptArchive({ rounds: 100000, tickets: 10 }).snapshot();
  const bytes = history.numbers.buffer.byteLength + history.ranks.buffer.byteLength + history.draws.buffer.byteLength;
  assert.equal(bytes, 7700000);
  assert.equal(history.rounds, 0);
  assert.equal(indexReceipts(history).total, 0);
});
