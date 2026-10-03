import test from 'node:test';
import assert from 'node:assert/strict';
import { binomialAtLeast, getLuck } from '../luck.js';

const C = 8145060;
const close = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
function outcome(games, wins = {}, { tickets = 1000, mode = 'auto', rounds = games / tickets } = {}) {
  const counts = [0, 0, 0, 0, 0, 0];
  for (const [rank, count] of Object.entries(wins)) counts[rank] = count;
  counts[0] = games - counts.slice(1).reduce((sum, value) => sum + value, 0);
  return { games, rounds, counts, config: { tickets, mode, rounds: Math.max(rounds, 1000) } };
}

test('binomial tails match exhaustive small experiments and exact endpoint formulas', () => {
  for (let n = 1; n <= 8; n++) for (const p of [.1, .3, .5, .9]) for (let k = 0; k <= n + 1; k++) {
    let exact = 0;
    for (let bits = 0; bits < 2 ** n; bits++) {
      const successes = bits.toString(2).replaceAll('0', '').length;
      if (successes >= k) exact += p ** successes * (1 - p) ** (n - successes);
    }
    close(binomialAtLeast(n, k, p), exact);
  }
  close(binomialAtLeast(1_000_000, 1, 1 / C), -Math.expm1(1_000_000 * Math.log1p(-1 / C)));
  assert.equal(binomialAtLeast(100, 1, 0), 0);
  assert.equal(binomialAtLeast(100, 100, 1), 1);
});

test('the user result gets a truthful 0.695% card, based on this million-game batch', () => {
  const result = outcome(1_000_000, { 1: 2, 2: 1, 3: 39, 4: 1349, 5: 22484 });
  result.journey = { attempts: 4, spent: 4_000_000_000, hit: true };
  const luck = getLuck(result);
  close(luck.probability, .006947318859696905);
  assert.equal(luck.percent, '0.695%');
  assert.equal(luck.rank, 1);
  assert.equal(luck.trials, 1_000_000);
  assert.match(luck.evidence, /1등 2번.*2등 1번.*3등 39번.*4등 1,349번.*5등 22,484번/);
  assert.match(luck.basis, /1등이 2번 이상/);
});

test('lower-tier rarity includes better prizes, with explicit evidence and no jackpot claim', () => {
  for (let rank = 2; rank <= 5; rank++) {
    const luck = getLuck(outcome(100, { [rank]: 1 }, { tickets: 100 }));
    const favorable = [0, 1, 6, 228, 11115, 182780].slice(1, rank + 1).reduce((a, b) => a + b, 0);
    close(luck.probability, -Math.expm1(100 * Math.log1p(-favorable / C)));
    assert.match(luck.basis, /더 높은 등수/);
    assert.doesNotMatch(luck.verdict, /1등 당첨|왕관|전설/);
  }
  const rare = getLuck(outcome(1000, { 3: 1, 4: 2, 5: 17 }));
  assert.match(rare.verdict, /1등은 없었지만/);
  const common = getLuck(outcome(1_000_000, { 3: 39, 4: 1300, 5: 22400 }));
  assert.ok(common.probability > .5);
  assert.doesNotMatch(common.label, /행운아/);
});

test('fixed copies count independent winning rounds, not duplicate tickets', () => {
  const one = getLuck(outcome(100, { 3: 1 }, { tickets: 1, mode: 'fixed', rounds: 100 }));
  const many = getLuck(outcome(100000, { 3: 1000 }, { tickets: 1000, mode: 'fixed', rounds: 100 }));
  close(one.probability, many.probability);
  assert.equal(many.trials, 100);
  assert.equal(many.hits, 1);
  assert.match(many.basis, /100회.*3등이 1번 이상/);
  assert.match(many.modeNote, /1,000게임/);
});

test('all losses get the chance of no prize and never a lucky label; tiny values are not zero', () => {
  const ordinary = getLuck(outcome(1, {}, { tickets: 1 }));
  close(ordinary.probability, 7950930 / C);
  assert.equal(ordinary.rank, 0);
  assert.match(ordinary.metric, /전부 낙첨/);
  assert.doesNotMatch(ordinary.label, /행운아/);
  const bad = getLuck(outcome(1000));
  assert.equal(bad.percent, '<0.000001%');
  assert.doesNotMatch(bad.label, /행운아/);
  const impossibleToDisplay = getLuck(outcome(1_000_000, { 1: 1_000_000 }));
  assert.equal(impossibleToDisplay.percent, '<0.000001%');
});

test('stopped results and stale best records use only completed games and current counts', () => {
  const result = outcome(1000, { 5: 20 });
  result.best = { rank: 1 };
  const luck = getLuck(result);
  assert.equal(luck.trials, 1000);
  assert.equal(luck.rank, 5);
  assert.doesNotMatch(luck.verdict, /1등 당첨/);
});

// Independently generated with scipy.stats.binom.sf.
test('large and extreme binomial tails agree with independent SciPy reference values', () => {
  const fixtures = [{"n":1,"k":1,"p":1.2277380399898834e-07,"expected":1.2277380399898834e-07},{"n":100,"k":1,"p":1.2277380399898834e-07,"expected":1.2277305786833683e-05},{"n":1000,"k":1,"p":1.2277380399898834e-07,"expected":0.0001227662751397201},{"n":1000000,"k":2,"p":1.2277380399898834e-07,"expected":0.006947318859696895},{"n":1000000,"k":3,"p":1.2277380399898834e-07,"expected":0.00028138328274719037},{"n":1000,"k":1,"p":2.7992451368947507e-05,"expected":0.027604673950680874},{"n":1000000,"k":39,"p":2.7992451368947507e-05,"expected":0.02820596970013705},{"n":1000000,"k":22485,"p":0.02244059589493509,"expected":0.3830782452355501},{"n":1000000,"k":500000,"p":0.5,"expected":0.5003989421806653},{"n":1000000,"k":499000,"p":0.5,"expected":0.9773038320453267},{"n":1000000,"k":501000,"p":0.5,"expected":0.02280414993269482},{"n":1000000,"k":999990,"p":0.99999,"expected":0.583039750199722}];
  for (const { n, k, p, expected } of fixtures) close(binomialAtLeast(n, k, p), expected, 2e-9);
});
