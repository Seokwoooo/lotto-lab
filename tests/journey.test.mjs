import test from 'node:test';
import assert from 'node:assert/strict';
import { createBillionJourney } from '../journey.js';

function memoryStorage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key), data };
}
const result = (seed, first = 0, games = 1_000_000) => ({
  config: { seed, rounds: 1000, tickets: 1000, mode: 'auto', fixed: [] },
  rounds: games / 1000, games, counts: [games - first, first, 0, 0, 0, 0]
});

test('billion attempts accumulate until the first win, then the next run starts a new journey', () => {
  const journey = createBillionJourney(memoryStorage());
  assert.equal(journey.record({ ...result('warmup'), config: { ...result('warmup').config, rounds: 100 }, rounds: 100, games: 100000 }), null);
  assert.deepEqual(journey.record(result('a')), { attempts: 1, spent: 1_000_000_000, hit: false });
  assert.deepEqual(journey.record(result('b')), { attempts: 2, spent: 2_000_000_000, hit: false });
  assert.deepEqual(journey.record(result('c', 1)), { attempts: 3, spent: 3_000_000_000, hit: true });
  assert.deepEqual(journey.record(result('d')), { attempts: 1, spent: 1_000_000_000, hit: false });
});

test('reload, back navigation, shared links, and duplicate deliveries never add attempts', () => {
  const storage = memoryStorage(), journey = createBillionJourney(storage);
  const first = result('a'), second = result('b');
  journey.record(first); journey.record(second);
  const reloaded = createBillionJourney(storage);
  assert.equal(reloaded.record(second, { replay: true }).attempts, 2);
  assert.equal(reloaded.record(second).attempts, 2);
  assert.equal(reloaded.record(first, { replay: true }), null);
  assert.equal(reloaded.record(result('friend', 1), { replay: true }), null);
  assert.equal(reloaded.record(second, { replay: true, friend: true }), null);
  assert.equal(reloaded.record(result('c')).attempts, 3);
});

test('an interrupted billion run counts only completed purchases and can be restored', () => {
  const storage = memoryStorage(), journey = createBillionJourney(storage);
  assert.equal(journey.record(result('empty', 0, 0)), null);
  const stopped = result('a', 0, 7000);
  assert.deepEqual(journey.record(stopped), { attempts: 1, spent: 7_000_000, hit: false });
  const replay = { ...stopped, config: { ...stopped.config, rounds: 7 } };
  assert.equal(createBillionJourney(storage).record(replay, { replay: true }).spent, 7_000_000);
  assert.deepEqual(journey.record(result('b', 1)), { attempts: 2, spent: 1_007_000_000, hit: true });
});

test('persistence is bounded and reset clears the record without retaining receipts', () => {
  const storage = memoryStorage(), journey = createBillionJourney(storage);
  for (let i = 0; i < 1000; i++) journey.record({ ...result(String(i)), receipts: { numbers: new Uint8Array(6000) } });
  assert.ok([...storage.data.values()][0].length < 300);
  journey.reset();
  assert.equal(storage.data.size, 0);
  assert.equal(journey.record(result('after-reset')).attempts, 1);
});

test('unavailable or corrupt storage falls back to in-memory tracking', () => {
  const unavailable = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); }, removeItem() { throw Error('blocked'); } };
  const journey = createBillionJourney(unavailable);
  assert.equal(journey.record(result('a')).attempts, 1);
  assert.equal(journey.record(result('b')).attempts, 2);
  journey.reset();
  const corrupt = { ...unavailable, getItem: () => '{bad json' };
  assert.equal(createBillionJourney(corrupt).record(result('a')).attempts, 1);
});
