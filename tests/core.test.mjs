import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, firstPrizeChance, createExperiment, createRandom, createSampler, validateConfig, COMBINATIONS, PRIZES } from '../core.js';

const seed = '123456789abcdef0fedcba9876543210';
const config = { rounds: 100, tickets: 5, mode: 'auto', seed, fixed: [] };

test('classifies all real 6/45 tiers, including the bonus distinction', () => {
  const winning = [1, 2, 3, 4, 5, 6];
  assert.equal(classify([6, 5, 4, 3, 2, 1], winning, 7), 1);
  assert.equal(classify([1, 2, 3, 4, 5, 7], winning, 7), 2);
  assert.equal(classify([1, 2, 3, 4, 5, 8], winning, 7), 3);
  assert.equal(classify([1, 2, 3, 4, 7, 8], winning, 7), 4);
  assert.equal(classify([1, 2, 3, 7, 8, 9], winning, 7), 5);
  assert.equal(classify([1, 2, 7, 8, 9, 10], winning, 7), 0);
  assert.equal(classify([7, 8, 9, 10, 11, 12], winning, 7), 0);
});

test('uses the exact combination count and stable cumulative probabilities', () => {
  assert.equal(COMBINATIONS, 8145060);
  assert.equal(firstPrizeChance(1), 1 / 8145060);
  assert.equal(firstPrizeChance(0), 0);
  assert.ok(Math.abs(firstPrizeChance(8145060) - (1 - Math.exp(-1))) < 1e-7);
  assert.equal(firstPrizeChance(100, 5, 'fixed'), firstPrizeChance(100));
  assert.equal(firstPrizeChance(100, 5, 'auto'), firstPrizeChance(500));
});

test('rejects invalid or excessive work and duplicate fixed numbers', () => {
  for (const change of [{ rounds: 0 }, { rounds: 1.5 }, { rounds: 100001 }, { tickets: 0 }, { tickets: 1001 }, { rounds: 1001, tickets: 1000 }, { rounds: 100000, tickets: 11 }, { mode: 'unknown' }, { seed: 'bad' }]) {
    assert.throws(() => validateConfig({ ...config, ...change }));
  }
  assert.throws(() => validateConfig({ ...config, mode: 'fixed', fixed: [1, 1, 2, 3, 4, 5] }));
  assert.throws(() => validateConfig({ ...config, mode: 'fixed', fixed: [1, 2, 3, 4, 5, 46] }));
  assert.doesNotThrow(() => validateConfig({ ...config, mode: 'fixed', fixed: [1, 2, 3, 4, 5, 6] }));
  assert.doesNotThrow(() => validateConfig({ ...config, rounds: 1000, tickets: 1000 }));
});

test('samples unique in-range numbers and replays the same seed', () => {
  const sampleA = createSampler(createRandom(seed));
  const sampleB = createSampler(createRandom(seed));
  for (let i = 0; i < 2000; i++) {
    const a = sampleA(7);
    assert.deepEqual(a, sampleB(7));
    assert.equal(new Set(a).size, 7);
    assert.ok(a.every(n => Number.isInteger(n) && n >= 1 && n <= 45));
  }
});

test('a finished experiment conserves games and computes rewards from real outcomes', () => {
  const experiment = createExperiment(config);
  experiment.step(1000);
  const result = experiment.snapshot();
  assert.equal(result.rounds, 100);
  assert.equal(result.games, 500);
  assert.equal(result.counts.reduce((a, b) => a + b, 0), 500);
  assert.equal(result.prize, result.counts.reduce((sum, count, rank) => sum + count * PRIZES[rank], 0));
  assert.equal(result.complete, true);
  for (const ticket of result.last.tickets) assert.equal(ticket.rank, classify(ticket.numbers, result.last.winning, result.last.bonus));
});

test('chunk boundaries do not change a reproducible result', () => {
  const a = createExperiment(config);
  const b = createExperiment(config);
  a.step(100);
  for (let i = 0; i < 100; i++) b.step(1);
  assert.deepEqual(a.snapshot(), b.snapshot());
});

test('a stopped experiment accounts only for completed rounds', () => {
  const experiment = createExperiment({ ...config, rounds: 1000 });
  experiment.step(3);
  const result = experiment.snapshot();
  assert.equal(result.games, 15);
  assert.equal(result.rounds, 3);
  assert.equal(result.complete, false);
  assert.equal(result.counts.reduce((a, b) => a + b, 0), 15);
});

test('multiple identical fixed tickets share a single draw outcome', () => {
  const a = createExperiment({ ...config, rounds: 2000, tickets: 1, mode: 'fixed', fixed: [1, 2, 3, 4, 5, 6] });
  const b = createExperiment({ ...config, rounds: 2000, tickets: 10, mode: 'fixed', fixed: [1, 2, 3, 4, 5, 6] });
  a.step(2000);
  b.step(2000);
  const ra = a.snapshot();
  const rb = b.snapshot();
  assert.deepEqual(ra.last.winning, rb.last.winning);
  assert.equal(ra.last.bonus, rb.last.bonus);
  assert.deepEqual(rb.counts, ra.counts.map(n => n * 10));
  assert.equal(rb.prize, ra.prize * 10);
  assert.ok(rb.last.tickets.every(t => t.rank === rb.last.tickets[0].rank));
});

test('every purchased game appears in a one-draw receipt with a consistent verdict', () => {
  for (const tickets of [1, 10, 100, 1000]) {
    for (const mode of ['auto', 'fixed']) {
      const experiment = createExperiment({ ...config, rounds: 1, tickets, mode, fixed: [1, 2, 3, 4, 5, 6] });
      experiment.step(1);
      const result = experiment.snapshot();
      assert.equal(result.games, tickets);
      assert.equal(result.last.tickets.length, tickets);
      assert.equal(result.last.omitted, 0);
      const visibleCounts = [0, 0, 0, 0, 0, 0];
      for (const ticket of result.last.tickets) {
        assert.equal(new Set(ticket.numbers).size, 6);
        assert.equal(ticket.rank, classify(ticket.numbers, result.last.winning, result.last.bonus));
        visibleCounts[ticket.rank]++;
      }
      assert.deepEqual(visibleCounts, result.counts);
      assert.equal(result.prize, visibleCounts.reduce((sum, count, rank) => sum + count * PRIZES[rank], 0));
    }
  }
});
