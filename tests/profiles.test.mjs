import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
  assert.equal(PROFILE_COUNT, 24);
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

function experimentProfile(seed, rounds = 100) {
  const experiment = createExperiment({ seed, rounds, tickets: 1000, mode: 'auto' });
  experiment.step(rounds);
  return { result: experiment.snapshot(), profile: getProfile(experiment.snapshot()) };
}

test('one through six actual third-prize wins produce distinct stories with truthful evidence', () => {
  const fixtures = [
    ['fdb711eee9948abc0b3025ccec2f7223', 1, 20.17],
    ['42124d922326870a98144dd493bf134c', 2, 20.035],
    ['92241300d280b1ef7a089022495820c0', 3, 22.905],
    ['801d99ab201512a6b0f2f2ad3989af30', 4, 23.485],
    ['35ad7d94e292a45cc31c2ddebba8ee7b', 5, 25.92],
    ['a842b4ce90677abb2d4af65b9d0c98dd', 6, 26.82]
  ];
  const stories = fixtures.map(([seed, count, recovery]) => {
    const {result, profile} = experimentProfile(seed);
    assert.equal(result.counts[3], count);
    assert.equal(profile.rank, 3);
    assert.ok(Math.abs(profile.recovery - recovery) < 1e-10);
    assert.ok(profile.basis.includes(`3등 ${count}게임`));
    return profile;
  });
  assert.equal(new Set(stories.map(p => p.code)).size, 6);
  assert.equal(new Set(stories.map(p => p.title)).size, 6);
  assert.ok(new Set(stories.map(p => p.character)).size >= 3);
});

test('a reproducible sample of billion- and hundred-million-won runs cannot collapse into one type', () => {
  for (const [rounds, runs] of [[100, 48], [1000, 16]]) {
    const frequencies = new Map();
    for (let i = 0; i < runs; i++) {
      const seed = createHash('sha256').update(`lotto-profile-diversity-${i}`).digest('hex').slice(0, 32);
      const {profile} = experimentProfile(seed, rounds);
      frequencies.set(profile.code, (frequencies.get(profile.code) ?? 0) + 1);
    }
    assert.ok(frequencies.size >= 5, `${rounds}: only ${frequencies.size} types`);
    assert.ok(Math.max(...frequencies.values()) / runs < 0.5, `${rounds}: a single type owns half the sample`);
  }
});

test('fixed copies of one third-prize combination do not pretend to be repeated independent wins', () => {
  const fixed = { rounds: 1, mode: 'fixed', seed: '2124ef1261724b85c707cbfbd49334bf', fixed: [2, 3, 16, 21, 43, 44] };
  const stories = [1, 1000].map(tickets => {
    const experiment = createExperiment({...fixed, tickets}); experiment.step(1);
    const result = experiment.snapshot();
    assert.equal(result.counts[3], tickets);
    return getProfile(result);
  });
  assert.equal(stories[0].code, stories[1].code);
  assert.equal(typeof stories[1].basis, 'string');
  assert.ok(stories[1].basis.includes('같은 번호'));
});

test('first and second prizes keep priority over third-prize subtypes across successive runs', () => {
  const first = getProfile(outcome([1, 3, 3, 3, 3, 3, 3]));
  const second = getProfile(outcome([2, 3, 3, 3, 3, 3, 3]));
  const third = getProfile(outcome([3, 3, 3, 3, 3, 3]));
  const miss = getProfile(outcome([0]));
  assert.equal(first.rank, 1); assert.equal(first.code, 'LUCK');
  assert.equal(second.rank, 2); assert.equal(second.code, 'EPIC');
  assert.equal(third.rank, 3); assert.notEqual(third.code, first.code);
  assert.equal(miss.rank, 0); assert.equal(miss.code, 'NORM');
  assert.ok(getProfile(outcome([2, 2])).code !== second.code);
});
