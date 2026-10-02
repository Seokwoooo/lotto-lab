/** Deterministic Lotto 6/45 model. No DOM, network, or external dependencies. */
export const VERSION = 1;
export const COMBINATIONS = 8_145_060;
export const MAX_GAMES = 1_000_000;
// Illustrative pretax rewards. Only fourth and fifth prizes are fixed in real Lotto.
export const PRIZES = Object.freeze([0, 2_000_000_000, 50_000_000, 1_500_000, 50_000, 5_000]);

export function validateConfig(input) {
  const { rounds, tickets, mode, seed, fixed = [] } = input;
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 100_000) throw new Error('추첨 횟수는 1~100,000 사이의 정수로 입력해주세요.');
  if (!Number.isInteger(tickets) || tickets < 1 || tickets > 100) throw new Error('구매 장수는 1~100 사이의 정수로 입력해주세요.');
  if (rounds * tickets > MAX_GAMES) throw new Error('한 번의 실험은 최대 100만 장입니다. 횟수나 장수를 줄여주세요.');
  if (!['auto', 'fixed'].includes(mode)) throw new Error('번호 선택 방식을 확인해주세요.');
  if (typeof seed !== 'string' || !/^[0-9a-f]{32}$/.test(seed) || /^0+$/.test(seed)) throw new Error('실험 시드가 올바르지 않습니다. 새 실험을 시작해주세요.');
  if (mode === 'fixed' && (!Array.isArray(fixed) || fixed.length !== 6 || new Set(fixed).size !== 6 || fixed.some(n => !Number.isInteger(n) || n < 1 || n > 45))) throw new Error('서로 다른 번호 6개를 골라주세요.');
  return { rounds, tickets, mode, seed, fixed: mode === 'fixed' ? [...fixed].sort((a, b) => a - b) : [] };
}

/** xoshiro128** with a 128-bit seed. Simulation PRNG, not a prediction tool. */
export function createRandom(seed) {
  if (!/^[0-9a-f]{32}$/.test(seed) || /^0+$/.test(seed)) throw new Error('Invalid seed');
  let a = parseInt(seed.slice(0, 8), 16) >>> 0;
  let b = parseInt(seed.slice(8, 16), 16) >>> 0;
  let c = parseInt(seed.slice(16, 24), 16) >>> 0;
  let d = parseInt(seed.slice(24, 32), 16) >>> 0;
  const rotate = (x, k) => ((x << k) | (x >>> (32 - k))) >>> 0;
  return function below(bound) {
    if (!Number.isInteger(bound) || bound < 1 || bound > 45) throw new Error('Invalid random bound');
    const limit = 0x100000000 - (0x100000000 % bound);
    let value;
    do {
      value = Math.imul(rotate(Math.imul(b, 5), 7), 9) >>> 0;
      const t = b << 9;
      c ^= a; d ^= b; b ^= c; a ^= d; c ^= t; d = rotate(d, 11);
    } while (value >= limit);
    return value % bound;
  };
}

/** A partial Fisher–Yates shuffle; every 6-number combination is equiprobable. */
export function createSampler(random) {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1);
  return function sample(count = 6) {
    if (!Number.isInteger(count) || count < 1 || count > 7) throw new Error('Invalid sample size');
    for (let i = 0; i < count; i++) {
      const j = i + random(45 - i);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  };
}

function rankFromMatches(matches, bonusMatch) {
  if (matches === 6) return 1;
  if (matches === 5) return bonusMatch ? 2 : 3;
  if (matches === 4) return 4;
  if (matches === 3) return 5;
  return 0;
}

export function classify(ticket, winning, bonus) {
  const numbers = new Set(winning);
  let matches = 0;
  for (const n of ticket) if (numbers.has(n)) matches++;
  return rankFromMatches(matches, ticket.includes(bonus));
}

export function firstPrizeChance(rounds, tickets = 1, mode = 'auto') {
  const trials = rounds * (mode === 'fixed' ? 1 : tickets);
  return -Math.expm1(trials * Math.log1p(-1 / COMBINATIONS));
}

export function createExperiment(input) {
  const config = validateConfig(input);
  const sample = createSampler(createRandom(config.seed));
  const marks = new Uint8Array(46);
  const counts = [0, 0, 0, 0, 0, 0];
  let rounds = 0, prize = 0, best = null, last = null;

  function nextRound() {
    const draw = sample(7);
    const winning = draw.slice(0, 6).sort((a, b) => a - b);
    const bonus = draw[6];
    marks.fill(0);
    for (const n of winning) marks[n] = 1;
    rounds++;
    const visible = [];
    const iterations = config.mode === 'fixed' ? 1 : config.tickets;
    const copies = config.mode === 'fixed' ? config.tickets : 1;
    for (let t = 0; t < iterations; t++) {
      const numbers = config.mode === 'fixed' ? config.fixed : sample(6);
      let matches = 0, bonusMatch = false;
      for (const n of numbers) { matches += marks[n]; if (n === bonus) bonusMatch = true; }
      const rank = rankFromMatches(matches, bonusMatch);
      counts[rank] += copies;
      prize += PRIZES[rank] * copies;
      const ticket = { numbers: [...numbers].sort((a, b) => a - b), rank, matches, bonusMatch };
      for (let c = 0; c < copies; c++) visible.push(ticket);
      if (rank > 0 && (!best || rank < best.rank)) best = { round: rounds, ticket: t + 1, rank, numbers: [...numbers].sort((a, b) => a - b), winning, bonus };
    }
    last = { round: rounds, winning, bonus, tickets: visible, omitted: Math.max(0, config.tickets - visible.length) };
  }

  return {
    step(amount = 1) {
      if (!Number.isInteger(amount) || amount < 1) throw new Error('Invalid step');
      const end = Math.min(config.rounds, rounds + amount);
      while (rounds < end) nextRound();
      return rounds === config.rounds;
    },
    snapshot() {
      return { version: VERSION, config, rounds, games: rounds * config.tickets, counts: [...counts], prize, best, last, complete: rounds === config.rounds };
    }
  };
}
