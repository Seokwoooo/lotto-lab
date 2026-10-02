import { VERSION, validateConfig, createRandom, createSampler, firstPrizeChance } from './core.js';

const $ = id => document.getElementById(id);
const format = new Intl.NumberFormat('ko-KR');
const decimal = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 });
const currency = value => `${format.format(value)}원`;
const state = { worker: null, result: null, seed: null, picks: new Set(), timer: null };
const names = ['오늘은 예열 중', '이걸 여기서?!', '한 끗의 전설', '꽤 강한 운', '소소한 행운 수집가', '작은 행운 발견'];
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
  const rounds = Number($('rounds').value), tickets = Number($('tickets').value), mode = currentMode();
  const valid = Number.isInteger(rounds) && rounds > 0 && Number.isInteger(tickets) && tickets > 0;
  text('planned-games', valid ? `${format.format(rounds * tickets)}장` : '—');
  text('planned-cost', valid ? currency(rounds * tickets * 1000) : '—');
  text('years-hint', rounds > 0 ? `매주 한 번이면 ${rounds < 52 ? `약 ${rounds}주` : `약 ${decimal.format(rounds / 52)}년`}` : '1~100,000회 중에서 골라주세요.');
  text('mode-hint', mode === 'auto' ? '자동으로 매번 새로운 번호를 구매합니다.' : '아래에서 6개 번호를 골라 고정하세요.');
  text('slip-mode', mode === 'auto' ? '자동 미리보기' : '수동 · 고정 번호');
  $('number-grid').classList.toggle('auto-preview', mode === 'auto');
  if (!state.worker && !state.result) text('result-description', `${format.format(rounds)}번 추첨 · 한 번에 ${tickets}장 · ${mode === 'auto' ? '매번 자동' : '같은 번호로'}`);
  text('chance-explanation', valid ? `${mode === 'fixed' ? `같은 번호로 ${format.format(rounds)}번 추첨할 때` : `자동 ${format.format(rounds * tickets)}장을 실험할 때`}, 1등을 한 번 이상 만날 확률` : '설정한 실험에서 1등을 한 번 이상 만날 확률');
  const chance = valid ? firstPrizeChance(rounds, tickets, mode) * 100 : 0;
  const chanceLabel = chance > 0 && chance < 0.0001 ? chance.toFixed(7) : chance.toFixed(4);
  $('chance-value').replaceChildren(document.createTextNode(chanceLabel), unit('%'));
  document.querySelectorAll('[data-rounds]').forEach(button => select(button, rounds === Number(button.dataset.rounds)));
  document.querySelectorAll('[data-tickets]').forEach(button => select(button, tickets === Number(button.dataset.tickets)));
  $('form-error').hidden = true;
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
    discardReplay(); renderPicks(); $('form-error').hidden = true;
  });
  $('number-grid').append(button);
}

$('quick-pick').addEventListener('click', () => {
  state.picks = new Set(createSampler(createRandom(freshSeed()))(6));
  discardReplay(); renderPicks();
});

function discardReplay() {
  if (!state.seed) return;
  state.seed = null;
  $('shared-banner').hidden = true;
  history.replaceState(null, '', location.pathname);
}

document.querySelectorAll('[data-rounds], [data-tickets]').forEach(button => button.addEventListener('click', () => {
  const key = button.dataset.rounds ? 'rounds' : 'tickets';
  $(key).value = button.dataset[key]; discardReplay(); updateSettings();
}));
document.querySelectorAll('#rounds, #tickets, input[name="mode"]').forEach(input => input.addEventListener('input', () => { discardReplay(); updateSettings(); }));
$('own-challenge').addEventListener('click', () => { discardReplay(); toast('같은 설정, 새로운 운으로 시작합니다.'); });
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
    config = validateConfig({ rounds: overrideRounds ?? Number($('rounds').value), tickets: Number($('tickets').value), mode: currentMode(), seed: state.seed ?? freshSeed(), fixed: Array.from(state.picks) });
  } catch (error) { $('form-error').hidden = false; text('form-error', error.message); toast(error.message); return; }
  if (!('Worker' in window)) { toast('이 브라우저에서는 실험을 실행할 수 없어요. 최신 브라우저에서 다시 열어주세요.'); return; }
  discardReplay();
  state.result = null;
  $('settings').disabled = true; $('stop-button').hidden = false; $('stop-button').disabled = false;
  $('start-button').disabled = true; $('single-draw').disabled = true;
  document.querySelector('.mobile-start').disabled = true;
  text('stop-button', '여기서 멈추기');
  $('share-result').disabled = true; $('save-receipt').disabled = true;
  $('draw-stage').classList.add('is-running');
  text('draw-status', '추첨 중'); text('result-kicker', '운을 꺼내보는 중');
  headline('이번에는', '어떤 결과가?');
  text('result-description', `${format.format(config.rounds)}번 추첨 · 매번 ${config.tickets}장 · ${config.mode === 'auto' ? '자동 번호' : '고정 번호'}`);
  try {
    const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    state.worker = worker;
    worker.onmessage = ({ data }) => {
      if (data.type === 'error') { fail(data.message); return; }
      if (!data.result) return;
      const finished = data.type === 'done' || data.type === 'stopped';
      render(data.result, finished, data.type === 'stopped');
      if (finished) { state.result = data.result; finish(); }
    };
    worker.onerror = event => { event.preventDefault(); fail('실험을 불러오지 못했어요. 페이지를 새로고침하고 다시 시도해주세요.'); };
    worker.postMessage({ type: 'start', config });
  } catch { fail('실험을 시작하지 못했어요. 페이지를 새로고침하고 다시 시도해주세요.'); }
}

function finish() {
  state.worker?.terminate(); state.worker = null;
  $('settings').disabled = false; $('stop-button').hidden = true;
  $('start-button').disabled = false; $('single-draw').disabled = false;
  document.querySelector('.mobile-start').disabled = false;
  $('draw-stage').classList.remove('is-running');
  $('share-result').disabled = !state.result?.games; $('save-receipt').disabled = !state.result?.games;
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
  metric('stat-games', games, '장'); metric('stat-cost', games * 1000, '원');
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
  text('draw-caption', `마지막 추첨 · ${format.format(rounds)}회차`);
  if (last) renderBalls(last, finished);
  text('receipt-badge', names[rank]);
  text('receipt-rank', rank ? `${rank}등` : '당첨 없음');
  text('receipt-wins', `${format.format(wins)} / ${format.format(games)}장`);
  text('receipt-return', `${decimal.format(games ? (prize / (games * 1000)) * 100 : 0)}%`);
  text('receipt-message', games ? `${format.format(games)}장 샀는데, ${rank ? `최고 ${rank}등.` : '한 장도 안 됐어요.'}` : '아직 추첨 전입니다.');
  if (finished) {
    text('draw-status', stopped ? '추첨 중단' : rank === 1 ? '1등 당첨!' : '추첨 완료');
    text('result-kicker', stopped ? '지금까지 완료한 추첨만 계산했어요.' : '이번 실험의 결과는…');
    headline(`${format.format(games)}장 중,`, rank ? `최고 ${rank}등!` : '당첨 없음.');
    text('result-description', rank === 1 ? '1등을 여기서 만났네요! 다음 실험의 결과는 또 달라질 수 있어요.' : rank === 0 ? '번호 3개 맞히기도 쉽지 않죠. 실제로는 돈을 쓰지 않았어요.' : `당첨 ${format.format(wins)}장. ${prize < games * 1000 ? '지갑을 열지 않아서 다행이에요.' : '이번 가상 실험에서는 구매 비용을 회수했어요.'}`);
    renderTickets(last, config);
    $('receipt-title').textContent = '내 운 영수증';
  }
}

function ballColor(n) { return n <= 10 ? '' : n <= 20 ? 'blue' : n <= 30 ? 'red' : n <= 40 ? 'gray' : 'green'; }
function renderBalls(last, animate) {
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

function renderTickets(last, config) {
  if (!last) return;
  const fragment = document.createDocumentFragment();
  last.tickets.forEach((ticket, i) => {
    const row = document.createElement('div'); row.className = 'ticket-row';
    const index = document.createElement('span'); index.textContent = String(i + 1).padStart(2, '0');
    const numbers = document.createElement('div'); numbers.className = 'ticket-numbers';
    ticket.numbers.forEach(n => {
      const el = document.createElement('span'); el.textContent = n;
      if (last.winning.includes(n)) { el.className = 'matched'; el.setAttribute('aria-label', `${n}번 일치`); }
      else if (n === last.bonus) { el.className = 'bonus-match'; el.setAttribute('aria-label', `${n}번 보너스 일치`); }
      numbers.append(el);
    });
    const rank = document.createElement('strong'); rank.textContent = ticket.rank ? `${ticket.rank}등` : '꽝';
    if (ticket.rank) rank.className = 'won';
    row.append(index, numbers, rank); fragment.append(row);
  });
  if (last.omitted) { const note = document.createElement('p'); note.className = 'field-note'; note.textContent = `처음 10장만 표시합니다. 나머지 ${last.omitted}장도 결과에 모두 반영했어요.`; fragment.append(note); }
  $('ticket-list').replaceChildren(fragment);
  text('ticket-count', `${config.tickets}장 · ${config.mode === 'fixed' ? '같은 번호' : '자동'}`);
}

function shareUrl(result) {
  const url = new URL(location.href); url.search = ''; url.hash = '';
  const { config, rounds } = result;
  for (const [key, value] of Object.entries({ v: VERSION, r: rounds, g: config.tickets, m: config.mode === 'fixed' ? 'f' : 'a', s: config.seed })) url.searchParams.set(key, value);
  if (config.mode === 'fixed') url.searchParams.set('n', config.fixed.join(','));
  return url.toString();
}

function shareText(result) {
  const rank = result.best?.rank;
  return `로또 ${format.format(result.games)}장 샀는데 ${rank ? `최고 ${rank}등` : '당첨 없음'}! 🎟️ 실제로 쓴 돈은 0원. 너도 네 운을 테스트해봐! #로또랩`;
}

$('share-result').addEventListener('click', async () => {
  if (!state.result) return;
  const payload = { title: '내 운 영수증 · 로또랩', text: shareText(state.result), url: shareUrl(state.result) };
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

$('save-receipt').addEventListener('click', async () => {
  if (!state.result) return;
  const button = $('save-receipt'); button.disabled = true;
  try {
    await document.fonts.ready;
    const result = state.result, rank = result.best?.rank ?? 0;
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1380;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = '#222421'; ctx.fillRect(0, 0, 1080, 1380);
    ctx.fillStyle = '#fffefb'; ctx.fillRect(65, 65, 950, 1210);
    const logo = new Image(); logo.src = new URL('./assets/lotto-official.svg', import.meta.url).href;
    await logo.decode(); ctx.drawImage(logo, 115, 108, 350, 73);
    ctx.fillStyle = '#222421'; ctx.font = '700 29px Pretendard, sans-serif';
    ctx.fillText('무료 시뮬레이션', 730, 155);
    ctx.font = '800 78px Pretendard, sans-serif'; ctx.fillText('내 운 영수증', 115, 290);
    ctx.font = '700 39px Pretendard, sans-serif'; ctx.fillText(names[rank], 115, 355);
    ctx.strokeStyle = '#222421'; ctx.setLineDash([10, 9]); ctx.beginPath(); ctx.moveTo(115, 385); ctx.lineTo(965, 385); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '800 112px Manrope, "Apple SD Gothic Neo", sans-serif'; ctx.fillText(rank ? `최고 ${rank}등` : '당첨 없음', 115, 545);
    const lines = [
      ['실험한 복권', `${format.format(result.games)}장`],
      ['가상 구매 비용', currency(result.games * 1000)],
      ['예시 당첨금 · 세전', currency(result.prize)],
      ['가상 손익', currency(result.prize - result.games * 1000)],
      ['당첨된 복권', `${format.format(result.games - result.counts[0])}장`]
    ];
    lines.forEach(([label, value], i) => {
      const y = 665 + i * 77;
      ctx.textAlign = 'left'; ctx.font = '500 32px "Apple SD Gothic Neo", sans-serif'; ctx.fillText(label, 115, y);
      ctx.textAlign = 'right'; ctx.font = '700 33px Manrope, "Apple SD Gothic Neo", sans-serif'; ctx.fillText(value, 965, y);
    });
    ctx.textAlign = 'left'; ctx.fillStyle = '#1748d5'; ctx.font = '800 43px Pretendard, sans-serif'; ctx.fillText('실제로 쓴 돈은 0원.', 115, 1135);
    ctx.fillStyle = '#222421'; ctx.font = '500 25px "Apple SD Gothic Neo", sans-serif'; ctx.fillText('1등 확률 8,145,060분의 1 · 1~3등은 예시 금액', 115, 1190);
    ctx.fillStyle = '#fff'; ctx.font = '800 29px Manrope, sans-serif'; ctx.fillText('lucianlabs.dev/lotto  ·  돈 말고, 호기심을 쓰세요.', 65, 1330);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Image export unavailable');
    const file = new File([blob], 'lottolab-my-luck.png', { type: 'image/png' });
    if (/Android|iPhone|iPad/i.test(navigator.userAgent) && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: '내 운 영수증' }); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    const href = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = href; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(href), 60_000);
    toast('운 영수증을 저장했어요. 이미지로도 자랑해보세요!');
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
