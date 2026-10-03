import { VERSION, PRIZES, validateConfig, createRandom, createSampler, createExperiment, firstPrizeChance } from './core.js?v=11';
import { getProfile, PROFILE_COUNT } from './profiles.js?v=13';
import { readReceipt } from './receipts.js?v=9';
import { nextBudgetStep } from './budget.js?v=9';
import { playDrawReveal } from './draw-reveal.js?v=12';
import { firstPrizePresentation, createFirstPrizeEffects } from './first-prize.js?v=12';

const $ = id => document.getElementById(id);
const format = new Intl.NumberFormat('ko-KR');
const decimal = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 });
const currency = value => `${format.format(value)}원`;
const state = { worker: null, reveal: null, result: null, purchase: null, seed: null, picks: new Set(), timer: null, purchasePage: 0, resultPage: 0, receiptIndex: null, receiptFilter: 'all', receiptAnimation: null, showingFriend: false, challenge: null };
const text = (id, value) => { $(id).textContent = value; };
const budgetLabel = games => games >= 100000 ? `${decimal.format(games / 100000)}억원치` : games === 10000 ? '1천만원치' : games >= 10 ? `${decimal.format(games / 10)}만원치` : `${currency(games * 1000)}어치`;
const drawLabel = (games, rounds) => `${budgetLabel(games)} ${rounds === 1 ? '바로 돌려보기' : '연속 돌려보기'}`;
const resultMotion = matchMedia('(prefers-reduced-motion: reduce)');
const firstPrizeEffects = createFirstPrizeEffects({
  card: $('rank-1').closest('[data-rank]'), canvas: $('result-celebration'),
  reducedMotion: () => resultMotion.matches,
  viewport: () => ({ width: innerWidth, height: innerHeight, pixelRatio: devicePixelRatio }),
  requestFrame: callback => requestAnimationFrame(callback),
  cancelFrame: frame => cancelAnimationFrame(frame)
});
resultMotion.addEventListener('change', () => { if (resultMotion.matches) firstPrizeEffects.cancel(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) firstPrizeEffects.cancel(); });
window.addEventListener('pagehide', () => firstPrizeEffects.cancel());
window.addEventListener('resize', () => firstPrizeEffects.cancel());

let resultVisuals;
function prepareResultVisuals() {
  if (resultVisuals) return resultVisuals;
  const images = ['lotto-mascots-sheet.png', 'lotto-official.svg'].map(asset => {
    const image = new Image();
    image.src = new URL(`./assets/${asset}`, import.meta.url).href;
    return image.decode();
  });
  const fonts = document.fonts ? Promise.all([
    document.fonts.load('800 16px Pretendard', '로또 당첨 내 운'),
    document.fonts.load('800 16px Manrope', '0123456789')
  ]).then(() => document.fonts.ready) : Promise.resolve();
  // A slow or failed asset must not strand a completed experiment. The fallback
  // keeps the result stable even if that asset arrives after the timeout.
  resultVisuals = new Promise(resolve => {
    const timer = setTimeout(() => resolve(false), 5000);
    Promise.allSettled([...images, fonts]).then(results => {
      clearTimeout(timer);
      resolve(results.every(result => result.status === 'fulfilled'));
    });
  }).then(ready => { if (!ready) resultVisuals = null; return ready; });
  return resultVisuals;
}

function freshSeed() {
  const words = crypto.getRandomValues(new Uint32Array(4));
  if (words.every(n => n === 0)) words[0] = 1;
  return Array.from(words, n => n.toString(16).padStart(8, '0')).join('');
}

function toast(message) {
  clearTimeout(state.timer);
  text('toast', message);
  $('toast').classList.add('visible');
  state.timer = setTimeout(() => $('toast').classList.remove('visible'), 4000);
}

function currentMode() { return document.querySelector('input[name="mode"]:checked').value; }

function updateSettings() {
  if (state.worker) return;
  const rounds = Number($('rounds').value), tickets = Number($('tickets').value), mode = currentMode();
  const valid = Number.isInteger(rounds) && rounds > 0 && Number.isInteger(tickets) && tickets > 0;
  text('planned-games', valid ? `${format.format(rounds * tickets)}게임` : '—');
  text('planned-cost', valid ? currency(rounds * tickets * 1000) : '—');
  text('years-hint', rounds > 0 ? `매주 한 번이면 ${rounds < 52 ? `약 ${rounds}주` : `약 ${decimal.format(rounds / 52)}년`}` : '1~100,000회 중에서 골라주세요.');
  text('mode-hint', mode === 'auto' ? '자동으로 매번 새로운 번호를 구매합니다.' : '아래에서 6개 번호를 골라 고정하세요.');
  text('slip-mode', mode === 'auto' ? '자동 미리보기' : '수동 · 고정 번호');
  $('number-grid').classList.toggle('auto-preview', mode === 'auto');
  text('start-label', valid ? drawLabel(rounds * tickets, rounds) : '내 운 돌려보기');
  text('settings-summary', `${mode === 'auto' ? '자동' : '수동'} · ${format.format(tickets)}게임 · ${format.format(rounds)}회`);
  $('number-picker').hidden = mode === 'auto';
  $('single-draw').hidden = rounds === 1;
  text('draw-action-note', rounds === 1 ? `실제 지출 0원 · 당첨번호 한 세트에 ${format.format(tickets)}게임 대조` : `실제 지출 0원 · ${format.format(rounds)}회 추첨, 회차마다 ${format.format(tickets)}게임`);
  text('page-title', `${valid ? budgetLabel(rounds * tickets) : '로또'} 사면,`);
  const accent = document.createElement('span'); accent.textContent = '내 운은 어떨까?';
  $('page-title').append(document.createElement('br'), accent);
  document.querySelector('.intro-eyebrow').textContent = `${valid ? format.format(rounds * tickets) : '내'}게임. ${rounds === 1 ? '한 번의 추첨.' : `${format.format(rounds)}번의 추첨.`} 내 운의 정체.`;
  if (!state.result) {
    headline(`내 복권 ${format.format(tickets)}게임,`, '당첨될까?');
    text('result-description', rounds === 1 ? '구매 영수증의 번호에 당첨번호 한 세트를 대조합니다.' : `${format.format(rounds)}회 연속 추첨 · 회차마다 ${tickets}게임 · ${mode === 'auto' ? '매번 자동' : '같은 번호로'}`);
  }
  text('chance-explanation', valid ? `${mode === 'fixed' ? `같은 번호로 ${format.format(rounds)}번 추첨할 때` : `자동 ${format.format(rounds * tickets)}게임을 실험할 때`}, 1등을 한 번 이상 만날 확률` : '설정한 실험에서 1등을 한 번 이상 만날 확률');
  const chance = valid ? firstPrizeChance(rounds, tickets, mode) * 100 : 0;
  const chanceLabel = chance > 0 && chance < 0.0001 ? chance.toFixed(7) : chance.toFixed(4);
  $('chance-value').replaceChildren(document.createTextNode(chanceLabel), unit('%'));
  document.querySelectorAll('[data-rounds]').forEach(button => select(button, rounds === Number(button.dataset.rounds)));
  document.querySelectorAll('[data-tickets]').forEach(button => select(button, tickets === Number(button.dataset.tickets)));
  $('form-error').hidden = true;
  preparePurchase();
}

function currentConfig(rounds = Number($('rounds').value)) {
  return validateConfig({ rounds, tickets: Number($('tickets').value), mode: currentMode(), seed: state.seed ?? state.purchase?.config.seed ?? freshSeed(), fixed: Array.from(state.picks) });
}

function preparePurchase() {
  try {
    const config = currentConfig();
    const preview = createExperiment(config);
    preview.step(1);
    state.purchase = { config, last: preview.snapshot().last };
    renderTickets(state.purchase.last, config, false);
  } catch {
    state.purchase = null;
    $('ticket-list').replaceChildren();
    $('ticket-pager').hidden = true;
    text('purchase-status', '설정 확인'); $('purchase-caption').hidden = false;
    text('purchase-caption', currentMode() === 'fixed' ? '서로 다른 번호 6개를 마킹하면 복권을 발행합니다.' : '횟수와 게임 수를 확인해주세요.');
    text('ticket-count', '—'); text('ticket-cost', '—');
  }
}

function resetExperiment() {
  state.purchase = null;
  state.result = null;
  state.receiptIndex = null;
  state.purchasePage = 0; state.resultPage = 0;
  for (const id of ['stat-games', 'stat-cost', 'stat-prize', 'stat-balance']) metric(id, 0, id === 'stat-games' ? '게임' : '원');
  for (let rank = 0; rank <= 5; rank++) {
    text(`rank-${rank}`, '0');
    const card = $(`rank-${rank}`).closest('[data-rank]');
    card.classList.remove('has-win'); card.dataset.countDigits = '1';
  }
  $('stat-balance').classList.remove('negative', 'positive');
  text('best-rank', '아직 추첨 전');
  $('result-share').disabled = true; $('result-save').disabled = true;
  $('draw-stage').classList.remove('has-draw');
  text('draw-status', '추첨 준비 완료'); text('result-kicker', '내 번호를 먼저 확인해보세요.');
  text('draw-caption', '당첨번호 · 추첨 전'); text('progress-text', '구매 영수증 발행 완료 · 추첨 대기');
  text('progress-percent', '0%'); $('progress').value = 0;
  const balls = document.createDocumentFragment();
  ['yellow', 'blue', 'red', 'gray', 'green', 'yellow', 'blue'].forEach((color, i) => {
    if (i === 6) { const plus = document.createElement('span'); plus.className = 'bonus-plus'; plus.textContent = '+'; plus.setAttribute('aria-hidden', 'true'); balls.append(plus); }
    const ball = document.createElement('span'); ball.className = `ball placeholder ${color} ${i === 6 ? 'bonus' : ''}`; ball.textContent = '?'; balls.append(ball);
  });
  $('winning-balls').replaceChildren(balls); $('winning-balls').setAttribute('aria-label', '추첨 대기');
}

function changePurchase() {
  if (state.challenge && (Number($('rounds').value) * Number($('tickets').value) !== state.challenge.games || Number($('rounds').value) !== state.challenge.rounds)) {
    state.challenge = null; $('shared-banner').hidden = true;
  }
  discardReplay(); resetExperiment(); updateSettings();
}

function select(button, active) { button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); }
function unit(value) { const el = document.createElement('small'); el.textContent = value; return el; }

function metric(id, value, suffix) {
  let label = format.format(value), end = suffix;
  if (suffix === '원' && Math.abs(value) >= 100_000_000) { label = decimal.format(value / 100_000_000); end = '억 원'; }
  else if (suffix === '원' && Math.abs(value) >= 1_000_000) { label = decimal.format(value / 10_000); end = '만 원'; }
  $(id).replaceChildren(document.createTextNode(label), unit(end));
}

function renderPicks() {
  text('pick-count', state.picks.size);
  document.querySelectorAll('[data-number]').forEach(button => button.setAttribute('aria-pressed', String(state.picks.has(Number(button.dataset.number)))));
}

for (let n = 1; n <= 45; n++) {
  const button = document.createElement('button');
  button.type = 'button'; button.textContent = n; button.dataset.number = n;
  button.setAttribute('aria-label', `${n}번`); button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    if (currentMode() === 'auto') {
      document.querySelector('input[name="mode"][value="fixed"]').checked = true;
      updateSettings();
    }
    if (state.picks.has(n)) state.picks.delete(n);
    else if (state.picks.size < 6) state.picks.add(n);
    else { toast('번호는 6개까지 선택할 수 있어요. 선택한 번호를 누르면 취소됩니다.'); return; }
    renderPicks(); changePurchase();
  });
  $('number-grid').append(button);
}

$('quick-pick').addEventListener('click', () => {
  state.picks = new Set(createSampler(createRandom(freshSeed()))(6));
  renderPicks(); changePurchase();
});

function discardReplay() {
  if (!state.seed) return;
  state.seed = null;
  $('shared-banner').hidden = true;
  history.replaceState(null, '', location.pathname);
}

document.querySelectorAll('[data-rounds], [data-tickets]').forEach(button => button.addEventListener('click', () => {
  const key = button.dataset.rounds ? 'rounds' : 'tickets';
  $(key).value = button.dataset[key]; changePurchase();
}));
document.querySelectorAll('#rounds, #tickets, input[name="mode"]').forEach(input => input.addEventListener('input', changePurchase));
$('own-challenge').addEventListener('click', () => { state.showingFriend = false; changePurchase(); toast('같은 설정, 새로운 운으로 시작합니다.'); });
$('new-purchase').addEventListener('click', () => {
  document.querySelector('input[name="mode"][value="auto"]').checked = true;
  changePurchase();
  if (state.purchase) toast(`${format.format(state.purchase.config.tickets)}게임의 자동 번호를 새로 뽑았어요.`);
});
$('experiment-form').addEventListener('submit', event => { event.preventDefault(); start(); });
$('single-draw').addEventListener('click', () => start(1));
function stopExperiment() {
  if (!state.worker) return;
  state.worker.postMessage({ type: 'stop' });
  $('stop-button').disabled = true;
  $('reveal-stop').disabled = true;
  text('stop-button', '마지막 추첨 정리 중…');
  text('reveal-caption', '지금까지 완료한 추첨을 정리하고 있어요.');
}
$('stop-button').addEventListener('click', stopExperiment);
$('reveal-stop').addEventListener('click', stopExperiment);

$('draw-theater').addEventListener('cancel', event => event.preventDefault());

function revealNumber(number, index, animate = true) {
  const bonus = index === 6;
  const slot = $('reveal-numbers').querySelector(`[data-reveal-slot="${index}"]`);
  slot.textContent = number;
  slot.className = `reveal-slot is-revealed ${ballColor(number)}${bonus ? ' reveal-bonus' : ''}${animate ? ' just-revealed' : ''}`;
  slot.setAttribute('aria-label', `${bonus ? '보너스' : `${index + 1}번째 당첨`} 번호 ${number}번`);
  const ball = document.createElement('span');
  ball.className = `reveal-hero-number ${ballColor(number)}${animate ? ' ball-arrive' : ''}`;
  ball.textContent = number;
  $('reveal-current').replaceChildren(ball);
}

function openDrawReveal(config, ready) {
  const dialog = $('draw-theater');
  text('reveal-title', `${budgetLabel(config.rounds * config.tickets)}, 내 운은…`);
  text('reveal-subtitle', config.rounds === 1 ? `내 로또 ${format.format(config.tickets)}게임 · 한 번의 추첨` : `${format.format(config.rounds)}회 중 마지막 추첨 · 전체 결과는 곧 공개`);
  text('reveal-calculation', `실제 지출 0원 · ${format.format(config.rounds * config.tickets)}게임`);
  text('reveal-caption', '제발, 이번엔…');
  $('reveal-stop').hidden = false; $('reveal-stop').disabled = false;
  $('reveal-numbers').querySelectorAll('[data-reveal-slot]').forEach((slot, index) => {
    slot.textContent = '·'; slot.className = `reveal-slot${index === 6 ? ' reveal-bonus' : ''}`;
    slot.setAttribute('aria-label', `${index === 6 ? '보너스 공' : `${index + 1}번째 공`} 공개 전`);
  });
  dialog.dataset.phase = 'countdown';
  dialog.showModal(); document.body.classList.add('is-drawing');
  $('reveal-title').focus({ preventScroll: true });
  return playDrawReveal({ ready, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, update(frame) {
    dialog.dataset.phase = frame.phase;
    if (frame.phase === 'countdown' || frame.phase === 'mixing' || frame.phase === 'bonus') {
      const count = document.createElement('span'); count.className = 'reveal-countdown';
      count.textContent = frame.phase === 'countdown' ? frame.value : '?';
      $('reveal-current').replaceChildren(count);
      const caption = frame.phase === 'countdown' ? '제발, 이번엔…' : frame.phase === 'bonus' ? '한 박자 더. 보너스 공은…?' : '공을 섞고 있어요. 곧 나옵니다.';
      text('reveal-caption', caption);
      text('reveal-status', frame.phase === 'countdown' ? `추첨 시작 ${frame.value}` : caption);
    } else if (frame.phase === 'number') {
      revealNumber(frame.number, frame.index, frame.animate);
      const label = frame.bonus ? '보너스 공' : `${frame.index + 1}번째 공`;
      text('reveal-caption', frame.bonus ? '보너스 공까지, 추첨 완료!' : frame.index === 5 ? '당첨번호 6개, 다 나왔어요.' : `${label}, ${frame.number}번!`);
      text('reveal-status', `${label}, ${frame.number}번.`);
    } else if (frame.phase === 'complete') {
      text('reveal-caption', '번호는 나왔고… 내 운의 정체는?');
      text('reveal-status', '추첨 완료. 내 로또 유형을 확인합니다.');
    }
  } });
}

function start(overrideRounds, { replay = false } = {}) {
  if (state.worker) return;
  let config;
  try {
    config = currentConfig(overrideRounds ?? Number($('rounds').value));
  } catch (error) { $('settings-panel').open = true; $('form-error').hidden = false; text('form-error', error.message); toast(error.message); return; }
  if (!('Worker' in window)) { toast('이 브라우저에서는 실험을 실행할 수 없어요. 최신 브라우저에서 다시 열어주세요.'); return; }
  firstPrizeEffects.cancel();
  const visualsReady = prepareResultVisuals();
  discardReplay();
  state.result = null;
  state.receiptIndex = null;
  if (!state.purchase) {
    const preview = createExperiment(config); preview.step(1);
    renderTickets(preview.snapshot().last, config, false);
  }
  $('settings').disabled = true; $('stop-button').hidden = false; $('stop-button').disabled = false;
  $('start-button').disabled = true; $('single-draw').disabled = true;
  $('new-purchase').disabled = true;
  $('big-budget-draw').disabled = true;
  $('result-screen').setAttribute('aria-busy', 'true');
  for (const id of ['ticket-prev', 'ticket-next', 'ticket-jump']) $(id).disabled = true;
  text('stop-button', '여기서 멈추기');
  $('result-share').disabled = true; $('result-save').disabled = true;
  $('draw-stage').classList.add('is-running');
  text('draw-status', '추첨 중'); text('result-kicker', '운을 꺼내보는 중');
  headline('이번에는', '어떤 결과가?');
  text('result-description', config.rounds === 1 ? `구매한 ${config.tickets}게임에 당첨번호 한 세트를 대조합니다.` : `${format.format(config.rounds)}회 연속 추첨 · 회차마다 ${config.tickets}게임 · ${config.mode === 'auto' ? '자동 번호' : '고정 번호'}`);
  try {
    const worker = new Worker(new URL('./worker.js?v=11', import.meta.url), { type: 'module' });
    state.worker = worker;
    let deliver;
    const ready = new Promise(resolve => { deliver = resolve; });
    if (!replay) state.reveal = openDrawReveal(config, ready);
    worker.onmessage = ({ data }) => {
      if (state.worker !== worker) return;
      if (data.type === 'error') { fail(data.message); return; }
      if (!data.result) return;
      const finished = data.type === 'done' || data.type === 'stopped';
      if (!finished) {
        render(data.result, false, false);
        text('reveal-calculation', `${format.format(data.result.rounds)} / ${format.format(config.rounds)}회 추첨 · 영수증 대조 중`);
      }
      if (finished) {
        worker.terminate(); $('stop-button').hidden = true; $('reveal-stop').hidden = true;
        deliver(data.result);
        text('reveal-calculation', `${format.format(data.result.games)}게임 대조 완료 · 실제 지출 0원`);
        text('start-label', replay ? '결과 확인 중…' : '당첨번호 공개 중…');
        Promise.all([visualsReady, state.reveal?.finished ?? ready]).then(([visualsLoaded, revealed]) => {
          if (state.worker !== worker || !revealed) return;
          state.result = data.result;
          render(data.result, true, data.type === 'stopped');
          $('result-screen').classList.toggle('visual-fallback', !visualsLoaded);
          finish(); showResultScreen();
        }).catch(() => { if (state.worker === worker) fail('추첨을 표시하지 못했어요. 다시 시도해주세요.'); });
      }
    };
    worker.onerror = event => { event.preventDefault(); fail('실험을 불러오지 못했어요. 페이지를 새로고침하고 다시 시도해주세요.'); };
    worker.postMessage({ type: 'start', config });
  } catch { fail('실험을 시작하지 못했어요. 페이지를 새로고침하고 다시 시도해주세요.'); }
}

function finish() {
  state.reveal?.cancel(); state.reveal = null;
  if ($('draw-theater').open) $('draw-theater').close();
  document.body.classList.remove('is-drawing');
  state.worker?.terminate(); state.worker = null;
  $('settings').disabled = false; $('stop-button').hidden = true;
  $('start-button').disabled = false; $('single-draw').disabled = false;
  $('new-purchase').disabled = false;
  $('big-budget-draw').disabled = false;
  $('result-screen').setAttribute('aria-busy', 'false');
  $('draw-stage').classList.remove('is-running');
  $('result-share').disabled = !state.result?.games; $('result-save').disabled = !state.result?.games;
  if (state.purchase && !state.result) renderTicketPage(state.purchase.last, state.purchase.config, false, 'ticket-list', state.purchasePage);
  if (state.result) state.purchase = null;
  if (state.result) {
    text('start-label', Number($('rounds').value) === 1 ? '새 추첨으로 한 번 더' : `${format.format(Number($('rounds').value))}회 다시 추첨`);
    text('draw-action-note', currentMode() === 'auto' ? '다시 추첨하면 새 자동 번호로 구매합니다.' : '다시 추첨하면 같은 구매 번호로 새 당첨번호를 뽑습니다.');
  }
}

function fail(message) {
  finish(); text('draw-status', '다시 시도');
  headline('잠깐,', '다시 시도해주세요.');
  text('result-description', message); toast(message);
}

function headline(before, accent) {
  const em = document.createElement('em'); em.textContent = accent;
  $('result-headline').replaceChildren(document.createTextNode(`${before} `), em);
}

function render(result, finished, stopped) {
  const { games, rounds, config, counts, prize, last, best } = result;
  const percent = (rounds / config.rounds) * 100;
  metric('stat-games', games, '게임'); metric('stat-cost', games * 1000, '원');
  metric('stat-prize', prize, '원'); metric('stat-balance', prize - games * 1000, '원');
  $('stat-balance').classList.toggle('negative', prize < games * 1000);
  $('stat-balance').classList.toggle('positive', prize > games * 1000);
  for (let rank = 0; rank <= 5; rank++) {
    text(`rank-${rank}`, format.format(counts[rank]));
    const card = $(`rank-${rank}`).closest('[data-rank]');
    card.classList.toggle('has-win', counts[rank] > 0);
    card.dataset.countDigits = String(counts[rank]).length;
  }
  const firstPrize = firstPrizePresentation(result, budgetLabel(games));
  text('first-prize-story', firstPrize.story);
  text('first-prize-context', firstPrize.context);
  text('first-prize-reaction', firstPrize.reaction);
  text('first-prize-end', firstPrize.end);
  const rank = best?.rank ?? 0, wins = games - counts[0];
  text('best-rank', rank ? `최고 ${rank}등` : '아직 당첨 없음');
  text('progress-text', `${format.format(rounds)} / ${format.format(config.rounds)}번 추첨${stopped ? ' · 중간에 멈춤' : finished ? ' · 완료' : ''}`);
  text('progress-percent', `${percent < 1 && percent > 0 ? percent.toFixed(1) : Math.floor(percent)}%`);
  $('progress').value = percent;
  text('draw-caption', config.rounds === 1 ? '이번 추첨의 당첨번호' : `마지막 당첨번호 · ${format.format(rounds)}회차`);
  if (last) renderBalls(last, finished);
  if (finished) {
    text('draw-status', stopped ? '추첨 중단' : rank === 1 ? '1등 당첨!' : '추첨 완료');
    text('result-kicker', stopped ? '지금까지 완료한 추첨만 계산했어요.' : '이번 실험의 결과는…');
    headline(`${format.format(games)}게임 중,`, rank ? `최고 ${rank}등!` : '당첨 없음.');
    text('result-description', rank === 1 ? '1등을 여기서 만났네요! 다음 실험의 결과는 또 달라질 수 있어요.' : rank === 0 ? '번호 3개 맞히기도 쉽지 않죠. 실제로는 돈을 쓰지 않았어요.' : `당첨 ${format.format(wins)}게임. ${prize < games * 1000 ? '지갑을 열지 않아서 다행이에요.' : '이번 가상 실험에서는 구매 비용을 회수했어요.'}`);
    renderTickets(last, config);
  }
}

function ballColor(n) { return n <= 10 ? '' : n <= 20 ? 'blue' : n <= 30 ? 'red' : n <= 40 ? 'gray' : 'green'; }
function renderBalls(last, animate) {
  $('draw-stage').classList.add('has-draw');
  renderBallSet('winning-balls', last, animate);
}
function renderBallSet(target, last, animate = false) {
  const fragment = document.createDocumentFragment();
  [...last.winning, last.bonus].forEach((number, i) => {
    if (i === 6) { const plus = document.createElement('span'); plus.className = 'bonus-plus'; plus.textContent = '+'; plus.setAttribute('aria-hidden', 'true'); fragment.append(plus); }
    const ball = document.createElement('span');
    ball.className = `ball ${ballColor(number)} ${i === 6 ? 'bonus' : ''} ${animate ? 'revealed' : ''}`;
    ball.textContent = number; ball.style.setProperty('--i', i); fragment.append(ball);
  });
  $(target).replaceChildren(fragment);
  $(target).setAttribute('aria-label', `당첨번호 ${last.winning.join(', ')}. 보너스 번호 ${last.bonus}.`);
}

function ticketRows(last, config, checked, label, start = 0) {
  const fragment = document.createDocumentFragment();
  const group = document.createElement('div'); group.className = 'ticket-group';
  group.textContent = `${label} · ${config.mode === 'fixed' ? '수동' : '자동'}`;
  fragment.append(group);
  last.tickets.forEach((ticket, offset) => {
    const game = ticket.game ?? start + offset + 1;
    const row = document.createElement('div'); row.className = `ticket-row${checked ? ticket.rank ? ' is-winner' : ' is-loser' : ''}`; row.dataset.game = game;
    if (checked) row.dataset.rank = ticket.rank;
    const index = document.createElement('span'); index.textContent = 'ABCDE'[offset];
    const numbers = document.createElement('div'); numbers.className = 'ticket-numbers';
    ticket.numbers.forEach(n => {
      const el = document.createElement('span'); el.textContent = String(n).padStart(2, '0');
      if (checked && last.winning.includes(n)) { el.className = 'matched'; el.setAttribute('aria-label', `${n}번 일치`); }
      else if (checked && n === last.bonus) { el.className = 'bonus-match'; el.setAttribute('aria-label', `${n}번 보너스 일치`); }
      numbers.append(el);
    });
    const rank = document.createElement('strong'); rank.textContent = checked ? ticket.rank ? `${ticket.rank}등` : '낙첨' : config.mode === 'auto' ? '자동' : '수동';
    if (checked && ticket.rank) rank.className = 'won';
    row.append(index, numbers, rank); fragment.append(row);
  });
  return fragment;
}

function renderTicketPage(last, config, checked, target, page) {
  const pages = Math.ceil(last.tickets.length / 5), prefix = 'ticket';
  page = Math.max(0, Math.min(page, pages - 1));
  state.purchasePage = page;
  const part = { ...last, tickets: last.tickets.slice(page * 5, page * 5 + 5) };
  $(target).replaceChildren(ticketRows(part, config, checked, `영수증 ${String(page + 1).padStart(2, '0')} · ${page * 5 + 1}~${Math.min(page * 5 + 5, last.tickets.length)}번째 게임`, page * 5));
  $(`${prefix}-pager`).hidden = pages <= 1;
  text(`${prefix}-page`, `${page + 1} / ${pages}장`);
  const jump = $(`${prefix}-jump`);
  if (jump.options.length !== pages) {
    jump.replaceChildren(...Array.from({ length: pages }, (_, i) => new Option(`${i + 1} / ${pages}장`, String(i))));
  }
  jump.value = String(page);
  jump.disabled = Boolean(state.worker);
  $(`${prefix}-prev`).disabled = page === 0 || Boolean(state.worker);
  $(`${prefix}-next`).disabled = page === pages - 1 || Boolean(state.worker);
}

for (const [prefix, target, checked] of [['ticket', 'ticket-list', false]]) {
  $(`${prefix}-jump`).addEventListener('change', event => {
    const data = checked ? state.result : state.purchase;
    if (!data || state.worker) return;
    renderTicketPage(data.last, data.config, checked, target, Number(event.target.value));
  });
  for (const [direction, delta] of [['prev', -1], ['next', 1]]) {
    $(`${prefix}-${direction}`).addEventListener('click', () => {
      const data = checked ? state.result : state.purchase;
      if (!data || state.worker) return;
      const page = checked ? state.resultPage : state.purchasePage;
      renderTicketPage(data.last, data.config, checked, target, page + delta);
    });
  }
}

function renderTickets(last, config, checked = true) {
  if (!last) return;
  renderTicketPage(last, config, checked, 'ticket-list', state.purchasePage);
  text('ticket-count', `${format.format(config.tickets)}게임`);
  text('ticket-cost', currency(config.tickets * 1000));
  text('purchase-status', checked ? '당첨 확인 완료' : '추첨 대기');
  $('purchase-caption').hidden = config.rounds === 1;
  text('purchase-caption', checked ? `이 영수증은 ${format.format(last.round)}회차의 구매 번호입니다. 누적 결과는 성적표에서 확인하세요.` : `첫 회차 구매 번호. ${config.mode === 'auto' ? '회차마다 새 자동 번호를 구매합니다.' : '같은 번호로 당첨번호만 새로 뽑습니다.'}`);
  $('purchase-ticket').classList.toggle('is-checked', checked);
}

function renderResultReceipt(page = state.resultPage, animate = false) {
  if (!state.result || !state.receiptIndex) return;
  const index = state.receiptIndex, filter = state.receiptFilter;
  const selection = filter === 'all' ? null : index[filter];
  const pages = selection ? selection.length : index.total;
  const previous = state.resultPage;
  page = Number.isFinite(page) ? Math.max(0, Math.min(Math.floor(page), pages - 1)) : previous;
  state.resultPage = page;
  document.querySelectorAll('[data-receipt-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.receiptFilter === filter)));
  $('receipt-stack').hidden = pages === 0;
  $('receipt-empty').hidden = pages !== 0;
  $('result-ticket-pager').hidden = pages === 0;
  text('result-detail-caption', !pages ? '다른 종류를 선택하면 영수증을 볼 수 있어요.' : filter === 'all' ? '좌우로 밀어 넘기기 · 장 번호로 바로 이동' : `${filter === 'winners' ? '당첨 있는' : '전부 낙첨인'} 영수증 ${format.format(page + 1)} / ${format.format(pages)}장 · 좌우로 넘기세요`);
  if (!pages) return;
  const sheet = selection ? selection[page] : page;
  const receipt = readReceipt(state.result.receipts, sheet);
  $('result-ticket-list').replaceChildren(ticketRows(receipt, state.result.config, true, `영수증 ${format.format(sheet + 1)} · ${format.format(receipt.round)}회차`));
  const wins = receipt.tickets.filter(ticket => ticket.rank > 0).length;
  text('receipt-verdict', wins ? `당첨 ${wins} · 낙첨 ${receipt.tickets.length - wins}` : '전부 낙첨');
  text('receipt-announcement', `전체 ${index.total}장 중 영수증 ${sheet + 1}번. ${receipt.round}회차. 당첨 ${wins}게임, 낙첨 ${receipt.tickets.length - wins}게임.`);
  $('receipt-verdict').classList.toggle('receipt-won', wins > 0);
  text('type-draw-label', `${format.format(receipt.round)}회차 당첨번호 · 마지막 공은 보너스`);
  renderBallSet('result-balls', receipt);
  text('result-cost', currency(receipt.tickets.length * 1000));
  text('result-prize', currency(receipt.tickets.reduce((sum, ticket) => sum + PRIZES[ticket.rank], 0)));
  const jump = $('result-ticket-jump'); jump.max = index.total; jump.value = sheet + 1;
  text('result-ticket-page', `/ ${format.format(index.total)}장`);
  $('result-ticket-prev').disabled = page === 0;
  $('result-ticket-next').disabled = page === pages - 1;
  const scrubber = $('receipt-scrubber'); scrubber.max = pages; scrubber.value = page + 1; scrubber.disabled = pages === 1;
  scrubber.setAttribute('aria-valuetext', `${pages}장 중 ${page + 1}번째. 전체 영수증 ${sheet + 1}번, ${receipt.round}회차.`);
  state.receiptAnimation?.cancel();
  if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const direction = page < previous ? -1 : 1;
    state.receiptAnimation = $('receipt-paper').animate([{ opacity: .65, transform: `translateX(${direction * 8}px) rotate(${direction * .4}deg)` }, { opacity: 1, transform: 'translateX(0) rotate(0)' }], { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' });
  }
}

document.querySelectorAll('[data-receipt-filter]').forEach(button => button.addEventListener('click', () => {
  state.receiptFilter = button.dataset.receiptFilter;
  renderResultReceipt(0, true);
}));
for (const [direction, delta] of [['prev', -1], ['next', 1]]) $('result-ticket-' + direction).addEventListener('click', () => renderResultReceipt(state.resultPage + delta, true));
function jumpToReceipt() {
  if (!state.receiptIndex) return;
  const sheet = Math.max(0, Math.min(Math.floor(Number($('result-ticket-jump').value)) - 1, state.receiptIndex.total - 1));
  let page = state.receiptFilter === 'all' ? sheet : state.receiptIndex[state.receiptFilter].indexOf(sheet);
  if (page === -1) { state.receiptFilter = 'all'; page = sheet; }
  renderResultReceipt(page, true);
}
$('result-ticket-pager').addEventListener('submit', event => { event.preventDefault(); jumpToReceipt(); });
$('result-ticket-jump').addEventListener('change', jumpToReceipt);
$('receipt-scrubber').addEventListener('input', event => renderResultReceipt(Number(event.target.value) - 1));
$('receipt-stack').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault(); renderResultReceipt(state.resultPage + (event.key === 'ArrowLeft' ? -1 : 1), true);
});
let swipeStart = null;
$('receipt-stack').addEventListener('pointerdown', event => { if (event.pointerType !== 'mouse') swipeStart = { x: event.clientX, y: event.clientY }; });
$('receipt-stack').addEventListener('pointercancel', () => { swipeStart = null; });
$('receipt-stack').addEventListener('pointerup', event => {
  if (!swipeStart) return;
  const dx = event.clientX - swipeStart.x, dy = event.clientY - swipeStart.y; swipeStart = null;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) renderResultReceipt(state.resultPage + (dx < 0 ? 1 : -1), true);
});

function showChallenge(result) {
  const incoming = state.showingFriend;
  $('friend-challenge').hidden = !incoming && !state.challenge;
  $('challenge-scores').hidden = incoming || !state.challenge;
  $('challenge-start').hidden = !incoming;
  $('result-share').hidden = incoming;
  $('share-nudge').hidden = incoming;
  if (incoming) {
    text('challenge-title', '이 정도 운이면, 내가 이길 수 있지?');
    text('challenge-copy', `친구는 ${budgetLabel(result.games)} 돌리고 ${currency(result.prize)}을 건졌어요. 같은 설정, 새로운 추첨으로 붙어보세요.`);
    text('challenge-start', `나도 ${budgetLabel(result.games)} 돌려보기 ↗`);
  } else if (state.challenge) {
    const delta = result.prize - state.challenge.prize;
    text('challenge-title', delta > 0 ? '이번 판은 내 승리!' : delta < 0 ? '친구가 한 수 위였네…' : '우리, 운까지 닮았네?');
    text('challenge-copy', `각자의 가상 당첨금으로 비교했어요. ${delta > 0 ? `내가 ${currency(delta)} 더 건졌어요.` : delta < 0 ? `친구가 ${currency(-delta)} 더 건졌어요.` : '당첨금이 똑같아요. 다음 판은 누가 웃을까?'}`);
    text('friend-prize', currency(state.challenge.prize)); text('my-prize', currency(result.prize));
  }
}

function showResultScreen(push = true) {
  if (!state.result) return;
  const result = state.result, profile = getProfile(result);
  text('type-code', profile.code); text('type-title', profile.title); text('type-line', profile.line);
  text('type-basis', profile.basis);
  $('type-character').className = `mascot mascot-${profile.character}`;
  $('type-character').setAttribute('aria-label', `${profile.title.replaceAll('\n', ' ')} 캐릭터`);
  text('result-page-title', state.showingFriend ? '친구가 뽑은 운, 이 정도였어요.' : `${budgetLabel(result.games)} 돌린 내 운은…`);
  text('result-page-subtitle', `${format.format(result.rounds)}회 추첨 · 전체 회차 합산${state.showingFriend ? ' · 친구의 결과' : ''}`);
  text('type-explanation', profile.description);
  text('type-facts', profile.reaction);
  text('type-friend', profile.friend);
  text('result-again', state.showingFriend ? '내 번호로 도전하기' : '다시 돌려보기');
  $('type-card').style.setProperty('--type-paper', profile.color);
  if (!state.receiptIndex) {
    state.receiptIndex = result.receiptIndex;
    state.receiptFilter = state.receiptIndex.winners.length ? 'winners' : 'all';
    state.resultPage = state.receiptFilter === 'winners' ? state.receiptIndex.winners.indexOf(state.receiptIndex.bestSheet) : 0;
    document.querySelector('.fortune-details').open = false;
  }
  text('receipt-total', `${format.format(result.rounds)}회분 · ${format.format(state.receiptIndex.total)}장`);
  for (const filter of ['all', 'winners', 'losers']) text(`receipts-${filter}`, format.format(filter === 'all' ? state.receiptIndex.total : state.receiptIndex[filter].length));
  renderResultReceipt();
  showChallenge(result);
  const next = nextBudgetStep(result.games);
  text('next-budget-kicker', next.repeat ? '이번에도 한 번 더' : '이번에는');
  text('next-budget-amount', next.amount);
  text('next-budget-games', `${format.format(next.games)}게임 · ${format.format(next.rounds)}회 추첨`);
  $('next-budget-character').className = `mascot mascot-${next.games === 10_000 ? 'clover' : 'royal'} next-budget-character`;
  $('big-budget-draw').setAttribute('aria-label', `${next.repeat ? '1억원 한 번 더' : `이번에는 ${next.amount}`} 돌려보기. 자동 ${format.format(next.games)}게임, 실제 지출 0원.`);
  $('simulator-screen').hidden = true; $('result-screen').hidden = false;
  document.title = `${profile.title.replaceAll('\n', ' ')} · 내 로또 유형 · 로또랩`;
  if (push && location.href !== shareUrl(result, state.showingFriend)) history.pushState({ view: 'result' }, '', shareUrl(result, state.showingFriend));
  window.scrollTo({ top: 0, behavior: 'instant' });
  $('result-page-title').setAttribute('tabindex', '-1');
  $('result-page-title').focus({ preventScroll: true });
  firstPrizeEffects.play(result);
}

function showSimulator(fresh = false) {
  firstPrizeEffects.cancel();
  $('simulator-screen').hidden = false; $('result-screen').hidden = true;
  document.title = '로또랩 — 100만원치 돌려본 내 운은?';
  if (fresh) {
    history.pushState(null, '', location.pathname); changePurchase();
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function acceptChallenge(immediate) {
  if (!state.result) return;
  state.challenge = { prize: state.result.prize, games: state.result.games, rounds: state.result.rounds };
  state.showingFriend = false;
  showSimulator(true);
  $('shared-banner').hidden = false;
  $('shared-banner').querySelector('span').textContent = `친구는 ${currency(state.challenge.prize)}. 이번엔 내 운을 꺼내볼 차례!`;
  $('own-challenge').hidden = true;
  if (immediate) start();
}
$('challenge-start').addEventListener('click', () => acceptChallenge(true));
$('result-again').addEventListener('click', () => {
  if (state.showingFriend) { acceptChallenge(false); return; }
  state.challenge = null; $('shared-banner').hidden = true;
  showSimulator(true);
});
$('big-budget-draw').addEventListener('click', () => {
  if (state.worker || !state.result) return;
  const next = nextBudgetStep(state.result.games);
  state.challenge = null; state.showingFriend = false;
  $('shared-banner').hidden = true;
  $('rounds').value = next.rounds; $('tickets').value = next.tickets;
  document.querySelector('input[name="mode"][value="auto"]').checked = true;
  showSimulator(true);
  start();
});
window.addEventListener('popstate', () => {
  if (state.worker) { finish(); resetExperiment(); updateSettings(); }
  if (location.hash !== '#result') { showSimulator(); return; }
  const params = new URLSearchParams(location.search);
  if (state.result && params.get('s') === state.result.config.seed && Number(params.get('r')) === state.result.rounds) { state.showingFriend = params.get('c') === '1'; showResultScreen(false); }
  else if (!state.worker) { restoreSharedExperiment(); resetExperiment(); updateSettings(); start(undefined, { replay: true }); }
});

function shareUrl(result, challenge = false) {
  const url = new URL(location.href); url.search = ''; url.hash = 'result';
  const { config, rounds } = result;
  for (const [key, value] of Object.entries({ v: VERSION, r: rounds, g: config.tickets, m: config.mode === 'fixed' ? 'f' : 'a', s: config.seed })) url.searchParams.set(key, value);
  if (config.mode === 'fixed') url.searchParams.set('n', config.fixed.join(','));
  if (challenge) url.searchParams.set('c', '1');
  return url.toString();
}

function shareText(result) {
  const profile = getProfile(result);
  return `${budgetLabel(result.games)} 돌리고 ${currency(result.prize)} 건짐.\n내 운은 「${profile.title.replaceAll('\n', ' ')}」\n“${profile.line}”\n${profile.basis}\n너 이거 이길 수 있어? 같은 금액으로 붙어보자. 실제 지출은 0원! #로또랩`;
}

$('result-share').addEventListener('click', async () => {
  if (!state.result) return;
  const payload = { title: '내 로또 유형 · 로또랩', text: shareText(state.result), url: shareUrl(state.result, true) };
  if (navigator.share) {
    try { await navigator.share(payload); return; }
    catch (error) { if (error.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(`${payload.text}\n${payload.url}`); toast('내 운과 실험 링크를 복사했어요. 친구에게 보내보세요!'); }
  catch { showCopyDialog(`${payload.text}\n${payload.url}`); }
});

function showCopyDialog(value) {
  const dialog = document.createElement('dialog'); dialog.className = 'copy-dialog';
  const label = document.createElement('label'); label.textContent = '이 내용을 복사해 친구에게 보내주세요.';
  const input = document.createElement('textarea'); input.value = value; input.readOnly = true; input.rows = 5;
  input.setAttribute('aria-label', '공유할 결과와 링크');
  const button = document.createElement('button'); button.textContent = '닫기'; button.addEventListener('click', () => dialog.close());
  label.append(input); dialog.append(label, button); document.body.append(dialog);
  dialog.addEventListener('close', () => dialog.remove()); dialog.showModal(); input.focus(); input.select();
}

$('result-save').addEventListener('click', async () => {
  if (!state.result) return;
  const button = $('result-save'); button.disabled = true;
  try {
    await document.fonts.ready;
    const result = state.result, profile = getProfile(result);
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1440;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = profile.color; ctx.fillRect(0, 0, 1080, 1440);
    const ink = '#262c40';
    const fit = (value, size, width, weight = 850) => {
      ctx.font = `${weight} ${size}px Pretendard, sans-serif`;
      while (ctx.measureText(value).width > width && size > 20) { size--; ctx.font = `${weight} ${size}px Pretendard, sans-serif`; }
      return size;
    };
    const logo = new Image(); logo.src = new URL('./assets/lotto-official.svg', import.meta.url).href;
    const sheet = new Image(); sheet.src = new URL('./assets/lotto-mascots-sheet.png', import.meta.url).href;
    await Promise.all([logo.decode(), sheet.decode()]);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(56, 45, 267, 76, 12); ctx.fill();
    ctx.drawImage(logo, 74, 62, 232, 48);
    ctx.fillStyle = ink; ctx.textAlign = 'right'; ctx.font = '750 25px Pretendard, sans-serif'; ctx.fillText('나의 로또 운 캐릭터', 1018, 77);
    ctx.font = '800 25px Manrope, sans-serif'; ctx.fillText(`${profile.code} · ${String(profile.number).padStart(2, '0')} / ${PROFILE_COUNT}`, 1018, 111);
    const cells = { warm: [0, 0], office: [1, 0], clover: [2, 0], pink: [0, 1], royal: [1, 1] };
    const [column, row] = cells[profile.character];
    const cellWidth = sheet.naturalWidth / 3, cellHeight = sheet.naturalHeight / 2;
    ctx.drawImage(sheet, column * cellWidth, row * cellHeight, cellWidth, cellHeight, 320, 129, 440, 440);
    ctx.fillStyle = ink; ctx.textAlign = 'center';
    const titles = profile.title.split('\n');
    let titleSize = 88;
    for (const title of titles) titleSize = Math.min(titleSize, fit(title, titleSize, 948, 900));
    ctx.font = `900 ${titleSize}px Pretendard, sans-serif`;
    titles.forEach((line, i) => ctx.fillText(line, 540, 644 + i * titleSize * 1.14));
    ctx.fillStyle = '#535b70'; fit(`“${profile.line}”`, 33, 930, 650); ctx.fillText(`“${profile.line}”`, 540, 814);
    ctx.fillStyle = '#ffffffcd'; ctx.beginPath(); ctx.roundRect(56, 866, 968, 248, 24); ctx.fill();
    ctx.fillStyle = '#626779'; ctx.font = '650 30px Pretendard, sans-serif'; ctx.fillText(`${budgetLabel(result.games)} 돌리고`, 540, 927);
    ctx.fillStyle = ink; fit(`${currency(result.prize)} 건짐`, 72, 898, 900); ctx.fillText(`${currency(result.prize)} 건짐`, 540, 1016);
    ctx.fillStyle = '#626779'; fit(profile.reaction, 29, 896, 650); ctx.fillText(profile.reaction, 540, 1072);
    ctx.fillStyle = ink;
    const summary = `${format.format(result.games)}게임 · ${profile.basis}`;
    fit(summary, 29, 960, 700); ctx.fillText(summary, 540, 1171);
    ctx.font = '800 29px Pretendard, sans-serif'; ctx.fillText('실제로 쓴 돈은 0원.', 540, 1230);
    ctx.fillStyle = '#626779'; ctx.font = '500 22px Pretendard, sans-serif'; ctx.fillText('가상 추첨 · 1~3등은 세전 예시 금액 · 재미로 붙인 별명', 540, 1277);
    ctx.fillText('한 게임의 1등 확률 8,145,060분의 1', 540, 1311);
    ctx.fillStyle = ink; ctx.fillRect(0, 1340, 1080, 100);
    ctx.fillStyle = '#ffe34d'; ctx.textAlign = 'left'; ctx.font = '850 34px Pretendard, sans-serif'; ctx.fillText('너 이거 이길 수 있어?', 57, 1402);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.font = '700 24px Manrope, sans-serif'; ctx.fillText('lucianlabs.dev/lotto', 1022, 1402);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Image export unavailable');
    const file = new File([blob], `lottolab-${profile.code.toLowerCase()}.png`, { type: 'image/png' });
    if (/Android|iPhone|iPad/i.test(navigator.userAgent) && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: '내 로또 유형 카드' }); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    const href = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = href; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(href), 60_000);
    toast('내 로또 유형 카드를 저장했어요. 친구에게도 보여주세요!');
  } catch { toast('이미지를 저장하지 못했어요. 결과 공유 버튼으로 링크를 보낼 수 있어요.'); }
  finally { button.disabled = false; }
});

function restoreSharedExperiment() {
  const params = new URLSearchParams(location.search);
  if (!params.has('s')) return;
  try {
    if (Number(params.get('v')) !== VERSION) throw new Error('Version mismatch');
    const config = validateConfig({ rounds: Number(params.get('r')), tickets: Number(params.get('g')), mode: params.get('m') === 'f' ? 'fixed' : params.get('m') === 'a' ? 'auto' : 'invalid', seed: params.get('s'), fixed: params.has('n') ? params.get('n').split(',').map(Number) : [] });
    $('rounds').value = config.rounds; $('tickets').value = config.tickets;
    document.querySelector(`input[name="mode"][value="${config.mode}"]`).checked = true;
    state.picks = new Set(config.fixed); state.seed = config.seed;
    state.showingFriend = params.get('c') === '1'; state.challenge = null;
    $('shared-banner').hidden = false; $('own-challenge').hidden = false;
    $('shared-banner').querySelector('span').textContent = '친구가 공유한 번호와 추첨입니다.'; renderPicks();
  } catch { toast('이 공유 링크는 재현할 수 없어요. 새 실험을 시작해보세요.'); }
}

restoreSharedExperiment();
if (state.picks.size === 0) state.picks = new Set(createSampler(createRandom(freshSeed()))(6));
renderPicks();
updateSettings();
if (location.hash === '#result' && state.seed) start(undefined, { replay: true });
