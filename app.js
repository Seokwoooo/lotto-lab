import { VERSION, validateConfig, createRandom, createSampler, createExperiment, firstPrizeChance } from './core.js';
import { getProfile } from './profiles.js';

const $ = id => document.getElementById(id);
const format = new Intl.NumberFormat('ko-KR');
const decimal = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 });
const currency = value => `${format.format(value)}원`;
const state = { worker: null, result: null, purchase: null, seed: null, picks: new Set(), timer: null };
const text = (id, value) => { $(id).textContent = value; };

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
  text('start-label', rounds === 1 ? `이 ${tickets}게임 추첨하기` : `${format.format(rounds)}회 연속 추첨`);
  text('settings-summary', `${mode === 'auto' ? '자동' : '수동'} · ${tickets}게임 · ${format.format(rounds)}회`);
  $('number-picker').hidden = mode === 'auto';
  $('single-draw').hidden = rounds === 1;
  text('draw-action-note', rounds === 1 ? '당첨번호 6개 + 보너스 1개를 뽑아 대조합니다.' : `회차마다 당첨번호를 새로 뽑고 ${tickets}게임씩 구매합니다.`);
  if (!state.result) {
    headline(`내 복권 ${tickets}게임,`, '당첨될까?');
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
    text('purchase-status', '설정 확인'); $('purchase-caption').hidden = false;
    text('purchase-caption', currentMode() === 'fixed' ? '서로 다른 번호 6개를 마킹하면 복권을 발행합니다.' : '횟수와 게임 수를 확인해주세요.');
    text('ticket-count', '—'); text('ticket-cost', '—');
  }
}

function resetExperiment() {
  state.purchase = null;
  state.result = null;
  for (const id of ['stat-games', 'stat-cost', 'stat-prize', 'stat-balance']) metric(id, 0, id === 'stat-games' ? '게임' : '원');
  for (let rank = 0; rank <= 5; rank++) {
    text(`rank-${rank}`, '0'); document.querySelector(`[data-rank="${rank}"]`)?.classList.remove('has-win');
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

function changePurchase() { discardReplay(); resetExperiment(); updateSettings(); }

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
$('own-challenge').addEventListener('click', () => { changePurchase(); toast('같은 설정, 새로운 운으로 시작합니다.'); });
$('new-purchase').addEventListener('click', () => {
  document.querySelector('input[name="mode"][value="auto"]').checked = true;
  changePurchase();
  if (state.purchase) toast(`${state.purchase.config.tickets}게임의 자동 번호를 새로 뽑았어요.`);
});
$('experiment-form').addEventListener('submit', event => { event.preventDefault(); start(); });
$('single-draw').addEventListener('click', () => start(1));
$('stop-button').addEventListener('click', () => {
  if (!state.worker) return;
  state.worker.postMessage({ type: 'stop' });
  $('stop-button').disabled = true;
  text('stop-button', '마지막 추첨 정리 중…');
});

function start(overrideRounds) {
  if (state.worker) return;
  let config;
  try {
    config = currentConfig(overrideRounds ?? Number($('rounds').value));
  } catch (error) { $('settings-panel').open = true; $('form-error').hidden = false; text('form-error', error.message); toast(error.message); return; }
  if (!('Worker' in window)) { toast('이 브라우저에서는 실험을 실행할 수 없어요. 최신 브라우저에서 다시 열어주세요.'); return; }
  discardReplay();
  state.result = null;
  if (!state.purchase) {
    const preview = createExperiment(config); preview.step(1);
    renderTickets(preview.snapshot().last, config, false);
  }
  $('settings').disabled = true; $('stop-button').hidden = false; $('stop-button').disabled = false;
  $('start-button').disabled = true; $('single-draw').disabled = true;
  $('new-purchase').disabled = true;
  text('stop-button', '여기서 멈추기');
  $('result-share').disabled = true; $('result-save').disabled = true;
  $('draw-stage').classList.add('is-running');
  text('draw-status', '추첨 중'); text('result-kicker', '운을 꺼내보는 중');
  headline('이번에는', '어떤 결과가?');
  text('result-description', config.rounds === 1 ? `구매한 ${config.tickets}게임에 당첨번호 한 세트를 대조합니다.` : `${format.format(config.rounds)}회 연속 추첨 · 회차마다 ${config.tickets}게임 · ${config.mode === 'auto' ? '자동 번호' : '고정 번호'}`);
  try {
    const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    state.worker = worker;
    worker.onmessage = ({ data }) => {
      if (data.type === 'error') { fail(data.message); return; }
      if (!data.result) return;
      const finished = data.type === 'done' || data.type === 'stopped';
      if (finished) { worker.terminate(); $('stop-button').hidden = true; $('draw-stage').classList.remove('is-running'); }
      render(data.result, finished, data.type === 'stopped');
      if (finished) {
        state.result = data.result;
        const delay = config.rounds === 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 1300 : 0;
        setTimeout(() => { finish(); showResultScreen(); }, delay);
      }
    };
    worker.onerror = event => { event.preventDefault(); fail('실험을 불러오지 못했어요. 페이지를 새로고침하고 다시 시도해주세요.'); };
    worker.postMessage({ type: 'start', config });
  } catch { fail('실험을 시작하지 못했어요. 페이지를 새로고침하고 다시 시도해주세요.'); }
}

function finish() {
  state.worker?.terminate(); state.worker = null;
  $('settings').disabled = false; $('stop-button').hidden = true;
  $('start-button').disabled = false; $('single-draw').disabled = false;
  $('new-purchase').disabled = false;
  $('draw-stage').classList.remove('is-running');
  $('result-share').disabled = !state.result?.games; $('result-save').disabled = !state.result?.games;
  state.purchase = null;
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
    document.querySelector(`[data-rank="${rank}"]`)?.classList.toggle('has-win', counts[rank] > 0);
  }
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
  const fragment = document.createDocumentFragment();
  [...last.winning, last.bonus].forEach((number, i) => {
    if (i === 6) { const plus = document.createElement('span'); plus.className = 'bonus-plus'; plus.textContent = '+'; plus.setAttribute('aria-hidden', 'true'); fragment.append(plus); }
    const ball = document.createElement('span');
    ball.className = `ball ${ballColor(number)} ${i === 6 ? 'bonus' : ''} ${animate ? 'revealed' : ''}`;
    ball.textContent = number; ball.style.setProperty('--i', i); fragment.append(ball);
  });
  $('winning-balls').replaceChildren(fragment);
  $('winning-balls').setAttribute('aria-label', `당첨번호 ${last.winning.join(', ')}. 보너스 번호 ${last.bonus}.`);
}

function renderTickets(last, config, checked = true) {
  if (!last) return;
  const fragment = document.createDocumentFragment();
  last.tickets.forEach((ticket, i) => {
    if (i % 5 === 0) {
      const group = document.createElement('div'); group.className = 'ticket-group';
      group.textContent = `복권 ${Math.floor(i / 5) + 1} · ${Math.min(5, last.tickets.length - i)}게임 · ${config.mode === 'fixed' ? '수동' : '자동'}`;
      fragment.append(group);
    }
    const row = document.createElement('div'); row.className = 'ticket-row';
    const index = document.createElement('span'); index.textContent = 'ABCDE'[i % 5];
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
  $('ticket-list').replaceChildren(fragment);
  text('ticket-count', `${config.tickets}게임`);
  text('ticket-cost', currency(config.tickets * 1000));
  text('purchase-status', checked ? '당첨 확인 완료' : '추첨 대기');
  $('purchase-caption').hidden = config.rounds === 1;
  text('purchase-caption', checked ? `이 영수증은 ${format.format(last.round)}회차의 구매 번호입니다.${config.rounds > 1 ? ' 누적 결과는 성적표에서 확인하세요.' : ''}` : config.rounds === 1 ? `아래 ${config.tickets}게임으로 한 번 추첨합니다.` : `첫 회차의 구매 번호입니다. ${config.mode === 'auto' ? '회차마다 새 자동 번호로 구매합니다.' : '같은 구매 번호로 당첨번호만 새로 뽑습니다.'}`);
  $('purchase-ticket').classList.toggle('is-checked', checked);
}

function showResultScreen(push = true) {
  if (!state.result) return;
  const result = state.result, profile = getProfile(result);
  text('type-code', profile.code); text('type-title', profile.title); text('type-line', profile.line);
  text('type-rank', profile.rank ? `${profile.rank}등` : '당첨 없음');
  text('type-games', `${format.format(result.games)}게임`); text('type-rounds', `${format.format(result.rounds)}회`);
  text('type-prize', currency(result.prize));
  text('result-cost', currency(result.games * 1000)); text('result-prize', currency(result.prize));
  text('type-explanation', profile.description);
  text('type-facts', `${format.format(result.games)}게임 중 ${format.format(profile.wins)}게임 당첨. 가상 손익 ${currency(profile.balance)}.`);
  text('type-friend', profile.friend);
  text('result-again', result.config.mode === 'auto' ? '새 번호로 다시 해보기' : '같은 번호로 다시 추첨');
  text('type-draw-label', result.rounds === 1 ? '당첨번호 · 마지막 공은 보너스' : `마지막 ${format.format(result.rounds)}회차 당첨번호 · 보너스`);
  text('result-detail-caption', result.rounds === 1 ? `${result.config.tickets}게임의 구매 번호와 당첨 결과입니다.` : `전체 ${format.format(result.rounds)}회 중 마지막 회차의 ${result.config.tickets}게임입니다. 위의 등수와 당첨금은 전체 회차를 합한 결과입니다.`);
  $('result-detail-caption').hidden = result.rounds === 1;
  $('type-card').style.setProperty('--type-paper', profile.color);
  $('result-balls').replaceChildren(...Array.from($('winning-balls').children, child => {
    const copy = child.cloneNode(true); copy.classList.remove('revealed'); return copy;
  }));
  $('result-balls').setAttribute('aria-label', $('winning-balls').getAttribute('aria-label'));
  $('result-ticket-list').replaceChildren(...Array.from($('ticket-list').children, child => child.cloneNode(true)));
  $('simulator-screen').hidden = true; $('result-screen').hidden = false;
  document.title = `${profile.title.replaceAll('\n', ' ')} · 내 로또 유형 · 로또랩`;
  if (push && location.href !== shareUrl(result)) history.pushState({ view: 'result' }, '', shareUrl(result));
  window.scrollTo({ top: 0, behavior: 'instant' });
  $('result-page-title').setAttribute('tabindex', '-1');
  $('result-page-title').focus({ preventScroll: true });
}

function showSimulator(fresh = false) {
  $('simulator-screen').hidden = false; $('result-screen').hidden = true;
  document.title = '로또랩 — 본인의 운을 테스트해보세요!';
  if (fresh) {
    history.pushState(null, '', location.pathname); changePurchase();
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

$('result-again').addEventListener('click', () => showSimulator(true));
window.addEventListener('popstate', () => {
  if (location.hash !== '#result') { showSimulator(); return; }
  const params = new URLSearchParams(location.search);
  if (state.result && params.get('s') === state.result.config.seed && Number(params.get('r')) === state.result.rounds) showResultScreen(false);
  else if (!state.worker) { restoreSharedExperiment(); resetExperiment(); updateSettings(); start(); }
});

function shareUrl(result) {
  const url = new URL(location.href); url.search = ''; url.hash = 'result';
  const { config, rounds } = result;
  for (const [key, value] of Object.entries({ v: VERSION, r: rounds, g: config.tickets, m: config.mode === 'fixed' ? 'f' : 'a', s: config.seed })) url.searchParams.set(key, value);
  if (config.mode === 'fixed') url.searchParams.set('n', config.fixed.join(','));
  return url.toString();
}

function shareText(result) {
  const profile = getProfile(result);
  return `내 로또 유형은 「${profile.title.replaceAll('\n', ' ')}」 ${profile.code}\n“${profile.line}”\n${format.format(result.games)}게임 · ${profile.rank ? `최고 ${profile.rank}등` : '당첨 없음'}. 실제로 쓴 돈은 0원. 너는 어떤 유형? #로또랩`;
}

$('result-share').addEventListener('click', async () => {
  if (!state.result) return;
  const payload = { title: '내 로또 유형 · 로또랩', text: shareText(state.result), url: shareUrl(state.result) };
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
    ctx.fillStyle = '#172d66'; ctx.lineWidth = 4; ctx.strokeStyle = '#172d66'; ctx.strokeRect(35, 35, 1010, 1290);
    const logo = new Image(); logo.src = new URL('./assets/lotto-official.svg', import.meta.url).href;
    await logo.decode(); ctx.fillStyle = '#fff'; ctx.fillRect(80, 78, 320, 86); ctx.drawImage(logo, 98, 90, 284, 59);
    ctx.fillStyle = '#172d66'; ctx.textAlign = 'right'; ctx.font = '900 54px Manrope, sans-serif'; ctx.fillText(profile.code, 1000, 139);
    ctx.textAlign = 'left'; ctx.font = '800 27px Pretendard, sans-serif'; ctx.fillText('나의 로또 운 유형', 80, 224);
    const titles = profile.title.split('\n');
    let titleSize = 112;
    const titleFont = () => { ctx.font = `900 ${titleSize}px Pretendard, sans-serif`; };
    titleFont();
    while (Math.max(...titles.map(title => ctx.measureText(title).width)) > 920 && titleSize > 55) { titleSize--; titleFont(); }
    titles.forEach((line, i) => ctx.fillText(line, 80, 360 + i * titleSize * 1.18));
    ctx.font = '650 34px Pretendard, sans-serif';
    const quoteLines = []; let quoteLine = '';
    for (const character of profile.line) {
      if (ctx.measureText(quoteLine + character).width > 890) { quoteLines.push(quoteLine); quoteLine = ''; }
      quoteLine += character;
    }
    quoteLines.push(quoteLine);
    quoteLines.forEach((line, i) => ctx.fillText(line, 80, 555 + i * 46));
    ctx.fillStyle = '#172d66'; ctx.fillRect(80, 645, 920, 135);
    ctx.fillStyle = profile.color; ctx.font = '600 27px Pretendard, sans-serif'; ctx.fillText('이번 실험의 최고 등수', 106, 689);
    ctx.font = '900 54px Pretendard, sans-serif'; ctx.fillText(profile.rank ? `${profile.rank}등` : '당첨 없음', 106, 748);
    const stats = [['실험한 게임', `${format.format(result.games)}게임`], ['추첨 횟수', `${format.format(result.rounds)}회`], ['예시 당첨금 · 세전', currency(result.prize)]];
    ctx.fillStyle = '#172d66';
    stats.forEach(([label, value], i) => {
      const x = 80 + i * 310;
      ctx.font = '600 25px Pretendard, sans-serif'; ctx.fillText(label, x, 850);
      let size = 41; ctx.font = `900 ${size}px Pretendard, sans-serif`;
      while (ctx.measureText(value).width > 290 && size > 20) { size--; ctx.font = `900 ${size}px Pretendard, sans-serif`; }
      ctx.fillText(value, x, 913);
    });
    ctx.font = '600 24px Pretendard, sans-serif'; ctx.fillText(result.rounds === 1 ? '이번 당첨번호 · 마지막 공은 보너스' : '마지막 회차 당첨번호 · 마지막 공은 보너스', 80, 1000);
    const numbers = [...result.last.winning, result.last.bonus];
    numbers.forEach((n, i) => {
      const x = 170 + i * 110 + (i === 6 ? 24 : 0), y = 1080;
      if (i === 6) { ctx.fillStyle = '#172d66'; ctx.font = '600 28px Manrope, sans-serif'; ctx.fillText('+', x - 68, y + 9); }
      ctx.fillStyle = n <= 10 ? '#f6ca38' : n <= 20 ? '#45bced' : n <= 30 ? '#f57182' : n <= 40 ? '#a6b4c9' : '#9bd666';
      ctx.beginPath(); ctx.arc(x, y, 43, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(x, y, 23, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#23334e'; ctx.textAlign = 'center'; ctx.font = '900 29px Manrope, sans-serif'; ctx.fillText(n, x, y + 10); ctx.textAlign = 'left';
    });
    ctx.font = '600 24px Pretendard, sans-serif'; ctx.fillText('한 게임의 1등 확률 8,145,060분의 1 · 1~3등은 예시 금액', 80, 1200);
    ctx.font = '500 22px Pretendard, sans-serif'; ctx.fillText('이번 가상 추첨으로 보는 재미있는 별명 · 비공식 무료 시뮬레이터', 80, 1253);
    ctx.fillStyle = '#172d66'; ctx.fillRect(0, 1325, 1080, 115);
    ctx.fillStyle = '#fff'; ctx.font = '850 43px Pretendard, sans-serif'; ctx.fillText('실제로 쓴 돈은 0원.', 80, 1396);
    ctx.font = '700 27px Manrope, sans-serif'; ctx.textAlign = 'right'; ctx.fillText('lucianlabs.dev/lotto', 1000, 1396);
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
    $('shared-banner').hidden = false; renderPicks();
  } catch { toast('이 공유 링크는 재현할 수 없어요. 새 실험을 시작해보세요.'); }
}

restoreSharedExperiment();
if (state.picks.size === 0) state.picks = new Set(createSampler(createRandom(freshSeed()))(6));
renderPicks();
updateSettings();
if (location.hash === '#result' && state.seed) start();
