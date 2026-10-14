import {DAYS, initialBattle, moves, rivalMove, moveIssue, round, replay, restoreBattle} from './battle-model.mjs';
const $ = id => document.getElementById(id), key = 'feast-shop-battle-v1', coin = '<i class="coin" aria-label="金币"></i>';
const names = ['阿面', '小麦', '团团', '圆圆', '阿青', '阿蓝', '小雨', '小风', '你', '隔壁老板', '原料商'];
let state = initialBattle(), stage = 'choose', selected = null, busy = false, previous = null;
try {const save = JSON.parse(localStorage.getItem(key)); state = restoreBattle(save?.state) || state; previous = restoreBattle(save?.previous); stage = save?.stage === 'result' && state.day ? 'result' : 'choose';} catch {}
const atlas = Object.fromEntries(await Promise.all(['body', 'face', 'face_nervous', 'hatguy'].map(async name => {
  const response = await fetch('../wbwwb-source/' + name + '.json'); if (!response.ok) throw new Error('Missing character asset'); return [name, await response.json()];
})));
function sprite(name, frame, cropped = false) {const a = atlas[name], f = a.frames[frame].frame, box = cropped ? [f.x + 24, f.y + 34, 72, 108] : [f.x, f.y, f.w, f.h]; return `<svg viewBox="${box.join(' ')}" aria-hidden="true"><image href="../wbwwb-source/${name}.png" width="${a.meta.size.w}" height="${a.meta.size.h}"/></svg>`;}
function peep(worried, employed) {return `<span class="peep">${sprite('body', 'body0000', true)}${sprite(worried ? 'face_nervous' : 'face', worried ? 'face_nervous0008' : 'face0000', true)}${employed ? '<img class="cap" src="../bakery/chef-hat.svg" alt="">' : ''}</span>`;}
function icon(type) {if (type === 'oven' || type === 'bread') return `<img src="../bakery/${type === 'oven' ? 'oven-new' : 'bread'}.svg" alt="">`; return type === 'tag' ? '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 5L21 4 29 16 17 28 4 16Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="10" r="2" fill="currentColor"/></svg>' : '<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="9" r="5"/><path d="M4 28L7 16 15 16 18 28M21 5A5 5 0 0 1 21 15M22 18L25 28"/></g></svg>';}
function persist() {try {localStorage.setItem(key, JSON.stringify({state, stage, previous}));} catch { $('subline').textContent += '（此浏览器无法保存进度。）';}}
function employed(id, s = state) {return s.shops.some(f => f.workers.includes(id));}
function customerCash(id, s = state) {return id === 10 ? s.supplier : s.people[id].cash;}
function dialog(title, html) {$('detail-title').textContent = title; $('detail-copy').innerHTML = html; $('detail').showModal();}
function thought(id) {
  const v = state.history.at(-1)?.visits.find(v => v.id === id), working = id < 8 ? employed(id) ? '还在店里工作' : '离开了工作，仍要吃饭' : id === 10 ? '卖原料，也买面包' : '从店里领取生活费';
  dialog(names[id], `<p>${working}</p><p>钱包里：${customerCash(id)} ${coin}</p><p>今天想买：一个面包。</p><p>${v ? v.bought ? `买到了，去的是${v.shop === 0 ? '你的店' : '隔壁'}。` : v.reason === '钱不够' ? '“不是不饿，是钱不够了。”' : '“来晚了，两家都卖完了。”' : '“哪家便宜，我先去哪家。”'}</p>`);
}
function render() {
  const last = state.history.at(-1), ended = state.day === DAYS, result = stage === 'result';
  $('day').textContent = ended ? '第九天 · 收摊' : `第 ${result ? state.day : state.day + 1} 天`;
  $('turn').textContent = Math.min(DAYS, result ? state.day : state.day + 1);
  $('rival-level').textContent = state.shops[1].fast ? '快速烤炉' : '普通烤炉';
  $('round-dots').innerHTML = Array.from({length: DAYS}, (_, i) => `<i class="${i < state.day ? 'done' : ''}"></i>`).join('');
  for (const f of state.shops) {
    const id = f.id; $('cash-' + id).innerHTML = f.cash + ' ' + coin;
    $('bar-' + id).style.width = Math.min(100, f.cash / 36 * 100) + '%'; $('bar-' + id).classList.toggle('low', f.cash < 12);
    $('stats-' + id).innerHTML = `面包 ${f.price} ${coin} · ${f.workers.length} 人 · 剩货 ${f.bread.length}`;
    $('figures-' + id).innerHTML = `<span class="owner">${sprite('hatguy', 'hatguy0000')}</span><img class="oven" src="../bakery/${f.fast ? 'oven-new' : 'oven-old'}.svg" alt="${f.fast ? '快炉' : '旧炉'}">`;
    $('crew-' + id).innerHTML = f.workers.map(() => peep(false, true)).join('');
  }
  $('customers').replaceChildren();
  for (let id = 0; id < 11; id++) {
    const visit = last?.visits.find(v => v.id === id), b = document.createElement('button'); b.className = 'customer' + (visit && !visit.bought ? ' hungry' : ''); b.dataset.person = id; b.setAttribute('aria-label', names[id] + '的钱包');
    b.innerHTML = peep(visit && !visit.bought, id < 8 && employed(id)) + `<small>${customerCash(id)} ${coin}</small>` + (visit?.bought ? '<img class="purchase" src="../bakery/bread.svg" alt="买到面包">' : ''); b.onclick = () => thought(id); $('customers').append(b);
  }
  $('street-summary').textContent = last ? `${last.visits.filter(v => v.bought).length} 人买到${last.poor ? ` · ${last.poor} 人钱不够` : ''}` : '每人每天买一个面包';
  $('speech-1').textContent = result ? last.stopped[1] ? '等等，我也没钱开炉了……' : last.poor ? '人还在，怎么没人掏钱？' : `今天卖了 ${last.sold[1]} 个！` : rivalMove(state).line.replace(/[“”]/g, '');
  $('speech-0').textContent = result ? last.stopped[0] ? '今天开不起炉，只能卖旧货。' : last.sold[0] === 0 ? '一个也没卖掉？' : `卖了 ${last.sold[0]} 个，剩下 ${last.stock[0]} 个。` : state.day === 0 ? '我的面包，也不差啊。' : '';
  $('moves').replaceChildren();
  for (const move of moves(state)) {const b = document.createElement('button'); b.className = 'move' + (moveIssue(state, move.id) ? ' locked' : ''); b.dataset.move = move.id; b.innerHTML = `${icon(move.icon)}<strong>${move.name}</strong><small>${move.hint.replace('每天可做', '日产').replaceAll('金币', coin)}</small>`; b.onclick = () => preview(move.id); $('moves').append(b);}
  $('moves').hidden = result || ended || !!selected;
  $('preview').hidden = !selected || result || ended;
  $('advance').hidden = !result || ended;
  $('choose-label').textContent = result ? '这一招，留下了什么？' : '你的店，怎么应对？';
  if (result) {
    $('eyebrow').textContent = '营业结算'; $('message').textContent = last.stopped[0] ? '今天，开不起炉。' : last.poor ? '货还在，有人买不起了。' : `你卖出 ${last.sold[0]} 个 · 隔壁 ${last.sold[1]} 个`;
    const delta = last.after[0] - last.before[0]; $('subline').innerHTML = `店内资金 ${delta >= 0 ? '+' : ''}${delta} ${coin} · 剩货 ${last.stock[0]} 个`;
    $('preview').hidden = false; $('preview').innerHTML = `<p id="round-effect">${effect(last)}</p><button id="receipt">看看今天的钱去哪了 ↗</button>`;
    $('receipt').onclick = receipt;
  } else {
    $('eyebrow').textContent = '对手的下一招'; $('message').textContent = rivalMove(state).name; $('subline').textContent = rivalMove(state).line;
    restorePreview();
  }
  $('console').hidden = ended; $('ending').hidden = !ended;
  $('undo').disabled = !state.day || busy; $('restart').disabled = busy;
  if (ended) renderEnding();
}
function effect(r) {
  if (r.poor) return `${r.poor} 个人想买，却付不起。两家店还剩 ${r.stock[0] + r.stock[1]} 个面包。`;
  if (r.stopped[0]) return '开门前的现金，付不起这次安排的工资、原料和欠下的保管费。';
  if (r.fired.length) return '少发了工资。离开的员工还带着积蓄，今天照样上街买面包。';
  if (r.move === '换快炉') return `快炉做出 ${r.made[0]} 个，卖掉 ${r.sold[0]} 个。做得多，不等于卖得多。`;
  if (r.move === '少做一点') return '炉子慢下来，原料少花了，工资仍照付。';
  if (r.move === '压低工资') return '今天的工资单变小了。街上买东西的钱也少了一点。';
  return r.sold[0] > r.sold[1] ? '这回抢到了更多客人。每个卖多少钱、开门花多少钱，还得一起看。' : '同样的面包，客人先挑便宜的。卖完之后，才会去另一家。';
}
function restorePreview() {$('preview').innerHTML = '<p id="preview-copy"></p><div><button id="cancel">返回</button><button id="confirm" class="primary">使出这一招 →</button></div>'; $('cancel').onclick = () => {selected = null; render();}; $('confirm').onclick = play;}
function preview(id) {if (busy || stage !== 'choose') return; selected = id; const move = moves(state).find(m => m.id === id), issue = moveIssue(state, id); $('moves').hidden = true; $('preview').hidden = false; $('choose-label').textContent = move.name; $('preview-copy').textContent = issue || move.detail; $('confirm').disabled = !!issue; $('confirm').focus();}
function receipt() {const r = state.history.at(-1), paid = r.receipts.filter(p => p.from === 'f0'), totals = {}; for (const p of paid) totals[p.reason] = (totals[p.reason] || 0) + p.amount; dialog(`第 ${r.day} 天 · 你的账单`, `<p>开门前 ${r.before[0]} ${coin}</p><p>卖面包 +${r.receipts.filter(p => p.to === 'f0').reduce((n, p) => n + p.amount, 0)} ${coin}</p>${Object.entries(totals).map(([label, n]) => `<p>${label} −${n} ${coin}</p>`).join('')}<p>收摊后 ${r.after[0]} ${coin}</p><p>做出 ${r.made[0]} 个 · 卖掉 ${r.sold[0]} 个 · 坏掉 ${r.spoiled[0]} 个</p>`);}
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const pause = ms => new Promise(resolve => setTimeout(resolve, reduced() ? 0 : ms));
async function announce(text, id) {$('banner').textContent = text; $('banner').hidden = false; $('fighter-' + id).classList.add('lunge'); await pause(600); $('fighter-' + id).classList.remove('lunge'); $('banner').hidden = true;}
async function walk(next) {
  if (reduced()) return;
  await Promise.all(next.history.at(-1).visits.map(async (v, index) => {
    const source = document.querySelector(`[data-person="${v.id}"]`), a = source.getBoundingClientRect(), target = $('figures-' + v.shop).getBoundingClientRect(), ghost = document.createElement('div');
    ghost.className = 'traveller'; ghost.innerHTML = peep(!v.bought, v.id < 8 && employed(v.id, next)); ghost.style.left = a.left + 'px'; ghost.style.top = a.top + 'px'; document.body.append(ghost); source.style.opacity = '.15';
    const dx = target.left + target.width / 2 - a.left, dy = target.bottom - a.top - 35;
    try {await ghost.animate([{transform: 'translate(0,0)'}, {transform: `translate(${dx}px,${dy}px)`}], {duration: 370, delay: index * 24, fill: 'forwards', easing: 'ease-in-out'}).finished; if (v.bought) ghost.insertAdjacentHTML('beforeend', '<img class="purchase" src="../bakery/bread.svg" alt="">'); await ghost.animate([{transform: `translate(${dx}px,${dy}px)`}, {transform: 'translate(0,0)'}], {duration: 330, delay: 90, fill: 'forwards', easing: 'ease-in-out'}).finished;} finally {ghost.remove(); source.style.opacity = '';}
  }));
}
async function play() {
  if (busy || !selected || moveIssue(state, selected)) return;
  busy = true; const next = round(state, selected), last = next.history.at(-1);
  document.querySelectorAll('button').forEach(b => b.disabled = true);
  try {
    await announce('隔壁使出 · ' + last.rival, 1); await announce('你使出 · ' + last.move, 0);
    $('message').textContent = '开门，客人来了。'; $('subline').textContent = '发工资 → 开炉 → 买面包';
    await walk(next); state = next; stage = 'result'; selected = null;
    render(); persist();
    for (let id = 0; id < 2; id++) {const delta = last.after[id] - last.before[id]; $('float-' + id).innerHTML = (delta >= 0 ? '+' : '') + delta + ' ' + coin; $('float-' + id).classList.add('pop');}
    await pause(800);
  } finally {busy = false; for (let id = 0; id < 2; id++) {$('float-' + id).textContent = ''; $('float-' + id).classList.remove('pop');} document.querySelectorAll('button').forEach(b => b.disabled = false); $('undo').disabled = !state.day;}
}
function renderEnding() {
  const last = state.history.at(-1), totalStock = last.stock[0] + last.stock[1], stopped = state.history.filter(r => r.stopped[0]).length;
  $('ending-title').textContent = last.poor ? '抢到了生意，留得住顾客吗？' : stopped ? '店还在，炉子却开不起来。' : '撑过九天，还要看街上的人。';
  $('ending-copy').textContent = `你的店剩 ${state.shops[0].cash} 金币，${stopped ? `${stopped} 天没能开炉。` : '每天都开了炉。'}最后一天，${last.poor} 人有货却买不起；两家剩下 ${totalStock} 个面包。`;
  $('comparison').innerHTML = [previous, state].filter(Boolean).map((s, i) => `<div class="run-note"><b>${previous && i === 0 ? '上一次' : '这一次'} · 第 ${s.day} 天</b>店内 ${s.shops[0].cash} ${coin}<br>开不起炉 ${s.history.filter(r => r.stopped[0]).length} 天<br>这天买不起 ${s.history.at(-1)?.poor || 0} 人</div>`).join('');
}
function restart() {if (busy) return; if (state.day) previous = structuredClone(state); state = initialBattle(state.seed); stage = 'choose'; selected = null; render(); persist();}
$('restart').onclick = restart; $('retry').onclick = restart;
$('advance').onclick = () => {if (busy) return; stage = 'choose'; selected = null; render(); persist();};
$('undo').onclick = () => {if (busy || !state.day) return; state = replay(state.history.slice(0, -1).map(r => r.action), state.seed); stage = 'choose'; selected = null; render(); persist();};
$('rules-open').onclick = () => dialog('这场对决的条件', '<p>两家店卖一样的面包。8 位工人、2 位老板和原料商，每天各买 1 个；先买便宜的，同价时换着挑。</p><p>全街共 120 金币，工资、货款都从现有钱包支付。没有借贷、政府采购和外来顾客。老板每天最多取 2 金币生活费。</p><p>普通炉每人做 1.5 个，快炉最多做 12 个。每 4 个面包用 1 金币原料（向上取整）；每 6 个剩货收 1 金币保管费；两天后坏掉。资金条以开局 36 为参照。</p><p>这是让竞争压力可见的短实验。低价优势和需求收缩取决于这些条件，不代表所有企业只有一种活法。</p><p>人物素材来自 Nicky Case《We Become What We Behold》，烤炉为本项目绘制；仅借用回合对战的表现形式。</p>');
$('detail-close').onclick = () => $('detail').close();
render(); persist();
