import test from 'node:test';
import assert from 'node:assert/strict';
import { createExperiment, PRIZES } from '../core.js';
import { getProfile, PROFILE_COUNT } from '../profiles.js';

const config = { rounds: 1, tickets: 10, mode: 'auto', seed: '123456789abcdef0fedcba9876543210' };
function outcome(ranks, closest = 2, bonusMatch = false) {
  const counts = [0, 0, 0, 0, 0, 0];
  ranks.forEach(rank => counts[rank]++);
  const best = ranks.filter(Boolean).sort()[0];
  return {
    config: { ...config, tickets: ranks.length }, rounds: 1, games: ranks.length, counts,
    prize: counts.reduce((sum, count, rank) => sum + count * PRIZES[rank], 0),
    best: best ? { rank: best } : null,
    last: { tickets: ranks.map(() => ({ matches: closest, bonusMatch })) }
  };
}

test('fifth-prize stories distinguish a loss, exact break-even, and a profit', () => {
  const ranks = Array(10).fill(0);
  ranks[0] = 5;
  const loss = getProfile(outcome(ranks));
  ranks[1] = 5;
  const even = getProfile(outcome(ranks));
  ranks[2] = 5;
  const profit = getProfile(outcome(ranks));
  assert.equal(loss.code, 'MINI'); assert.equal(loss.balance, -5000);
  assert.equal(even.code, 'BACK'); assert.equal(even.balance, 0);
  assert.equal(profit.code, 'GAIN'); assert.equal(profit.balance, 5000);
});

test('a bonus near miss remains a losing result, distinct from an ordinary miss', () => {
  const ordinary = getProfile(outcome([0], 2, false));
  const bonus = getProfile(outcome([0], 2, true));
  assert.equal(ordinary.rank, 0); assert.equal(bonus.rank, 0);
  assert.equal(ordinary.code, 'NORM'); assert.equal(bonus.code, 'EDGE');
  assert.equal(bonus.wins, 0);
  assert.notEqual(getProfile(outcome([0], 0)).code, getProfile(outcome([0], 1)).code);
});

test('a good fourth-prize result does not imply a profit after a large purchase', () => {
  const small = getProfile(outcome([4, ...Array(9).fill(0)]));
  const large = getProfile(outcome([4, ...Array(99).fill(0)]));
  assert.equal(small.code, 'GOOD'); assert.equal(small.balance, 40000);
  assert.equal(large.code, 'PEAK'); assert.equal(large.balance, -50000);
  assert.equal(large.rank, 4);
});

test('shared experiments reproduce the same type and wording across all copy variants', () => {
  assert.equal(PROFILE_COUNT, 16);
  const lines = new Set();
  for (let i = 1; i <= 12; i++) {
    const result = outcome([0]);
    result.config.seed = i.toString(16).padStart(8, '0') + config.seed.slice(8);
    const a = getProfile(result), b = getProfile(structuredClone(result));
    assert.deepEqual(a, b); lines.add(a.line);
  }
  assert.equal(lines.size, 6);
  const experiment = createExperiment(config); experiment.step(1);
  const result = experiment.snapshot();
  const profile = getProfile(result);
  assert.equal(profile.rank, result.best?.rank ?? 0);
  assert.equal(profile.wins, result.games - result.counts[0]);
  assert.equal(profile.balance, result.prize - result.games * 1000);
});
