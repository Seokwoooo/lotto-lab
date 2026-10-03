import test from 'node:test';
import assert from 'node:assert/strict';
import { nextBudgetStep } from '../budget.js';

test('the default million-won result advances to ten million, then one hundred million', () => {
  const second = nextBudgetStep(1000);
  assert.equal(second.games * 1000, 10_000_000);
  assert.equal(second.rounds * second.tickets, second.games);
  assert.equal(second.amount, '1천만원');
  const third = nextBudgetStep(second.games);
  assert.equal(third.games * 1000, 100_000_000);
  assert.equal(third.rounds * third.tickets, third.games);
  assert.equal(third.amount, '1억원');
  assert.equal(third.repeat, false);
  assert.equal(nextBudgetStep(third.games).repeat, true);
});

test('custom and stopped results use completed games and keep quick experiments capped', () => {
  for (const games of [1, 5000, 9999]) assert.equal(nextBudgetStep(games).games, 10_000);
  for (const games of [10_000, 50_000, 99_999]) assert.equal(nextBudgetStep(games).games, 100_000);
  for (const games of [100_000, 1_000_000]) {
    assert.equal(nextBudgetStep(games).games, 100_000);
    assert.equal(nextBudgetStep(games).repeat, true);
  }
});

test('an unavailable result cannot start a budget step', () => {
  for (const games of [undefined, NaN, 0, -1, 1.5]) assert.throws(() => nextBudgetStep(games));
});
