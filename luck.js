import { COMBINATIONS } from './core.js?v=11';

// Exact counts of six-number combinations for a single draw, including its bonus ball.
const FAVORABLE = [7_950_930, 1, 6, 228, 11_115, 182_780];
const number = new Intl.NumberFormat('ko-KR');
const percentage = new Intl.NumberFormat('ko-KR', { maximumSignificantDigits: 3 });
const cache = new WeakMap();

function logChoose(n, k) {
  k = Math.min(k, n - k);
  let sum = 0, correction = 0;
  for (let i = 1; i <= k; i++) {
    const value = Math.log1p((n - k) / i) - correction;
    const next = sum + value;
    correction = (next - sum) - value; sum = next;
  }
  return sum;
}

/** P(X >= k), X ~ Binomial(n, p). Sum away from the mode to avoid underflow at P(X=0). */
export function binomialAtLeast(n, k, p) {
  if (!Number.isInteger(n) || n < 0 || n > 1_000_000 || !Number.isInteger(k) || !Number.isFinite(p) || p < 0 || p > 1) throw new Error('Invalid binomial input');
  if (k <= 0) return 1;
  if (k > n || p === 0) return 0;
  if (p === 1) return 1;
  if (k === 1) return -Math.expm1(n * Math.log1p(-p));
  const upper = k > n * p, start = upper ? k : k - 1;
  let term = Math.exp(logChoose(n, start) + start * Math.log(p) + (n - start) * Math.log1p(-p));
  let sum = term;
  if (upper) {
    for (let i = start; i < n && term > 0; i++) {
      term *= (n - i) / (i + 1) * p / (1 - p); sum += term;
      if (term < sum * 1e-15) break;
    }
  } else {
    for (let i = start; i > 0 && term > 0; i--) {
      term *= i / (n - i + 1) * (1 - p) / p; sum += term;
      if (term < sum * 1e-15) break;
    }
  }
  return Math.max(0, Math.min(1, upper ? sum : 1 - sum));
}

function formatPercent(probability) {
  const value = probability * 100;
  if (value < .000001) return '<0.000001%';
  if (value > 99.9) return '>99.9%';
  return `${percentage.format(value)}%`;
}

/** A theoretical result threshold, not a measured percentile of site visitors or future luck. */
export function getLuck(result) {
  if (cache.has(result)) return cache.get(result);
  const { games, rounds, counts, config } = result;
  const fixed = config.mode === 'fixed';
  const trials = fixed ? rounds : games;
  const rank = Math.max(0, counts.findIndex((count, tier) => tier > 0 && count > 0));
  const hits = rank ? counts[rank] / (fixed ? config.tickets : 1) : 0;
  let probability;
  if (rank) {
    const higher = FAVORABLE.slice(1, rank).reduce((sum, value) => sum + value, 0);
    const noHigherLog = trials * Math.log1p(-higher / COMBINATIONS);
    probability = -Math.expm1(noHigherLog) + Math.exp(noHigherLog) * binomialAtLeast(trials, hits, FAVORABLE[rank] / (COMBINATIONS - higher));
  } else {
    probability = Math.exp(trials * Math.log(FAVORABLE[0] / COMBINATIONS));
  }
  probability = Math.max(0, Math.min(1, probability));
  const percent = formatPercent(probability), rare = rank > 0 && probability <= .05;
  const label = rank === 1 || rare ? '의 행운아' : rank && probability <= .2 ? '의 은근한 행운아' : rank ? '의 현실 로또인' : probability <= .05 ? '의 지독한 꽝손' : '의 평범한 꽝손';
  const wins = counts.slice(1).flatMap((count, index) => count ? [`${index + 1}등 ${number.format(count)}번`] : []);
  const evidence = rank ? `${number.format(games)}게임에서 ${wins.join(', ')} 당첨됐어요.` : `${number.format(games)}게임을 돌렸지만 모두 꽝이었어요. 이번에는 번호 3개를 맞힌 게임도 없었습니다.`;
  const scope = fixed ? `같은 번호로 ${number.format(rounds)}회 추첨했을 때` : `${number.format(games)}게임을 자동으로 샀을 때`;
  const threshold = rank ? `${rank}등이 ${number.format(hits)}번 이상 나오${rank > 1 ? '거나 더 높은 등수에 당첨될' : '는'} 확률` : '모든 추첨에서 전부 낙첨될 확률';
  const verdict = rank === 1 ? '진짜 1등을 만났네요. 이번 행운은 자랑해도 됩니다.'
    : rare ? '1등은 없었지만, 이번엔 정말 행운아입니다.'
    : rank && probability <= .2 ? '1등은 없었지만, 그냥 지나치기엔 꽤 좋은 운이에요.'
    : rank ? '작은 당첨은 챙겼어요. 오늘은 꽤 현실적인 로또인이네요.'
    : probability <= .05 ? '이렇게 안 맞기도 쉽지 않네요. 실제 돈을 안 써서 다행이에요.'
    : '오늘의 운은 아직 예열 중. 돈 대신 호기심만 쓴 걸로 해요.';
  const luck = {
    rank, trials, hits, probability, percent, label, headline: `나는 ${percent}${label}`,
    metric: rank ? '이 정도 이상 당첨될 이론 확률' : '전부 낙첨될 이론 확률',
    scope: `이번 ${number.format(games)}게임${fixed ? ' · 같은 번호' : ' 기준'}`, evidence, verdict,
    basis: `${scope}, ${threshold}입니다.`,
    modeNote: fixed ? `고정 번호 ${number.format(config.tickets)}게임은 한 회차에 함께 당첨되므로, 중복 장수가 아닌 ${number.format(rounds)}번의 추첨으로 계산했어요.` : rank ? '최고 등수와 그 등수의 당첨 횟수로 비교해요. 나머지 등수는 내역으로 보여주며, 각각의 확률을 곱하지 않아요.' : '1~5등에 한 번도 당첨되지 않은 결과를 기준으로 계산했어요.'
  };
  cache.set(result, luck);
  return luck;
}
