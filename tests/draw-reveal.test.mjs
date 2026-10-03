import test from 'node:test';
import assert from 'node:assert/strict';
import { playDrawReveal } from '../draw-reveal.js';

const result = Object.freeze({
  games: 1000,
  last: Object.freeze({
    winning: Object.freeze([3, 7, 36, 38, 39, 42]),
    bonus: 44,
    drawOrder: Object.freeze([7, 36, 39, 3, 42, 38, 44])
  })
});
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
async function advance(t, milliseconds) {
  for (let elapsed = 0; elapsed < milliseconds; elapsed += 50) {
    t.mock.timers.tick(50);
    await flush();
  }
}

test('a fast calculation still reveals the drawn balls one at a time, with the bonus last', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const frames = [];
  const reveal = playDrawReveal({ ready: Promise.resolve(result), update: frame => frames.push(frame) });
  let finished = false;
  reveal.finished.then(() => { finished = true; });
  await flush();
  assert.equal(frames[0]?.phase, 'countdown');
  await advance(t, 1000);
  assert.equal(finished, false, 'a ready Worker must not bypass the suspense');
  assert.equal(frames.some(frame => frame.phase === 'number'), false);
  await advance(t, 8000);
  assert.equal(finished, true);
  assert.deepEqual(frames.filter(frame => frame.phase === 'countdown').map(frame => frame.value), [3, 2, 1]);
  const balls = frames.filter(frame => frame.phase === 'number');
  assert.deepEqual(balls.map(frame => frame.number), [7, 36, 39, 3, 42, 38, 44]);
  assert.deepEqual(balls.map(frame => frame.bonus), [false, false, false, false, false, false, true]);
  assert.equal(await reveal.finished, result);
});

test('skipping bypasses the presentation but still waits for the real calculation', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let deliver;
  const ready = new Promise(resolve => { deliver = resolve; });
  const frames = [];
  const reveal = playDrawReveal({ ready, update: frame => frames.push(frame) });
  let finished = false;
  reveal.finished.then(() => { finished = true; });
  reveal.skip();
  await advance(t, 10000);
  assert.equal(finished, false);
  deliver(result);
  await flush();
  assert.equal(await reveal.finished, result);
  assert.deepEqual(frames.find(frame => frame.phase === 'all')?.numbers, [7, 36, 39, 3, 42, 38, 44]);
  assert.equal(frames.some(frame => frame.phase === 'number'), false);
});

test('a cancelled countdown cannot publish a late calculation or reveal more balls', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let deliver;
  const frames = [];
  const reveal = playDrawReveal({ ready: new Promise(resolve => { deliver = resolve; }), update: frame => frames.push(frame) });
  await advance(t, 100);
  reveal.cancel();
  const count = frames.length;
  deliver(result);
  await advance(t, 10000);
  assert.equal(await reveal.finished, null);
  assert.equal(frames.length, count);
});

test('cancelling after a ball appears clears the remaining presentation', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const frames = [];
  const reveal = playDrawReveal({ ready: Promise.resolve(result), update: frame => frames.push(frame) });
  await advance(t, 1800);
  assert.ok(frames.some(frame => frame.phase === 'number'));
  reveal.cancel();
  const count = frames.length;
  await advance(t, 10000);
  assert.equal(await reveal.finished, null);
  assert.equal(frames.length, count);
});

test('reduced motion keeps all seven real numbers with a shorter presentation', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const frames = [];
  const reveal = playDrawReveal({ ready: Promise.resolve(result), reducedMotion: true, update: frame => frames.push(frame) });
  let finished = false;
  reveal.finished.then(() => { finished = true; });
  await advance(t, 4000);
  assert.equal(finished, true);
  assert.deepEqual(frames.filter(frame => frame.phase === 'number').map(frame => frame.number), [7, 36, 39, 3, 42, 38, 44]);
  assert.equal(await reveal.finished, result);
});
