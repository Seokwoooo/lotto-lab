import test from 'node:test';
import assert from 'node:assert/strict';
import { createExperiment, createRandom, createSampler } from '../core.js';
import { firstPrizePresentation, createFirstPrizeEffects } from '../first-prize.js';

const seed = '2124ef1261724b85c707cbfbd49334bf';
const config = { rounds: 100, tickets: 1000, mode: 'auto', seed };
function resultAfter(rounds = 100) {
  const experiment = createExperiment(config);
  experiment.step(rounds);
  return experiment.snapshot();
}

test('one hundred million won is 100,000 games, with 100 draws explained separately', () => {
  const result = resultAfter();
  assert.equal(result.games * 1000, 100_000_000);
  assert.equal(result.counts[1], 0);
  const copy = firstPrizePresentation(result, '1억원치');
  assert.equal(copy.story, '1억원치, 100,000게임을 돌렸지만…');
  assert.match(copy.context, /^100회 추첨 × 회차당 1,000게임/);
  assert.equal(copy.hasWin, false);
});

test('a stopped run presents completed games and draws, rather than the requested budget', () => {
  const result = resultAfter(2);
  const copy = firstPrizePresentation(result, '200만원치');
  assert.equal(copy.story, '200만원치, 2,000게임을 돌렸지만…');
  assert.match(copy.context, /^2회 추첨 × 회차당 1,000게임/);
});

test('an actual fixed-number first prize uses winning copy and game-level counts', () => {
  const fixed = createSampler(createRandom(seed))(7).slice(0, 6);
  const experiment = createExperiment({ rounds: 1, tickets: 5, mode: 'fixed', seed, fixed });
  experiment.step(1);
  const result = experiment.snapshot();
  const copy = firstPrizePresentation(result, '5,000원어치');
  assert.equal(result.counts[1], 5);
  assert.equal(copy.hasWin, true);
  assert.equal(copy.story, '5,000원어치, 5게임을 돌린 끝에…');
  assert.equal(copy.end, '!');
});

function harness({ reduced = false, contextAvailable = true } = {}) {
  const classes = new Set();
  const frames = new Map();
  let nextFrame = 0, painted = 0;
  const context = {
    setTransform() {}, clearRect() {}, save() {}, translate() {}, rotate() {}, restore() {},
    fillRect() { painted++; }
  };
  const canvas = { hidden: true, width: 1, height: 1, getContext: () => contextAvailable ? context : null };
  const card = { classList: { add: name => classes.add(name), remove: (...names) => names.forEach(name => classes.delete(name)) }, getBoundingClientRect: () => ({ bottom: 330 }) };
  const effects = createFirstPrizeEffects({
    card, canvas, reducedMotion: () => reduced,
    viewport: () => ({ width: 390, height: 844, pixelRatio: 3 }),
    requestFrame: callback => { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelFrame: id => frames.delete(id)
  });
  return { effects, canvas, classes, frames, painted: () => painted, tick(time) {
    const pending = [...frames.values()]; frames.clear();
    pending.forEach(callback => callback(time));
  } };
}
const loss = { games: 100_000, counts: [97615, 0, 0, 3, 148, 2234] };
const win = { games: 5, counts: [0, 5, 0, 0, 0, 0] };

test('zero first prizes get falling scraps; a first prize gets a single bounded celebration', () => {
  const h = harness();
  h.effects.play(loss);
  assert.equal(h.classes.has('impact-miss'), true);
  assert.equal(h.canvas.hidden, false);
  assert.equal(h.frames.size, 1);
  assert.equal(h.classes.has('celebrate-win'), false);
  h.tick(0); h.tick(900);
  assert.ok(h.painted() > 0, 'the loss also draws actual particles');
  h.effects.play(win);
  assert.equal(h.classes.has('celebrate-win'), true);
  assert.equal(h.canvas.hidden, false);
  assert.equal(h.canvas.width, 585, 'high pixel ratios are capped');
  h.tick(100); h.tick(600);
  assert.ok(h.painted() > 0);
  assert.equal(h.frames.size, 1, 'five winning games still use one animation loop');
  h.tick(3400);
  assert.equal(h.frames.size, 0);
  assert.equal(h.canvas.hidden, true);
  assert.equal(h.canvas.width * h.canvas.height, 1, 'the bitmap is released');
});

test('cancellation clears the pending celebration and revisiting the same result does not replay it', () => {
  const h = harness();
  h.effects.play(win);
  h.effects.cancel();
  assert.equal(h.frames.size, 0);
  assert.equal(h.classes.size, 0);
  assert.equal(h.canvas.hidden, true);
  h.effects.play(win);
  assert.equal(h.frames.size, 0);
  h.effects.play({ ...win });
  assert.equal(h.frames.size, 1, 'a new draw may celebrate again');
});

test('reduced motion avoids both impact and confetti, and an unavailable canvas remains harmless', () => {
  const h = harness({ reduced: true });
  for (const result of [loss, win]) h.effects.play(result);
  assert.equal(h.frames.size, 0);
  assert.equal(h.classes.size, 0);
  assert.equal(h.canvas.hidden, true);
  const fallback = harness({ contextAvailable: false });
  assert.doesNotThrow(() => fallback.effects.play(win));
  assert.equal(fallback.canvas.hidden, true);
  assert.equal(fallback.frames.size, 0);
});
