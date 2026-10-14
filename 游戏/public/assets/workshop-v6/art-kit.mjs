// Visual primitives only: callers supply validated model results, never inferred economics.
export const palette = Object.freeze({paper:'#ffffff', ink:'#222222', muted:'#595959', line:'#d3d3d3', blue:'#285fbd', red:'#cf3a2b', yellow:'#ffdc63'});
export const states = Object.freeze(['default','selected','preview','disabled','unknown','history']);
export const iconNames = Object.freeze(['product','tray','wallet','contract','node-supply','node-science','node-transport','owner-tag','relation-cooperation','relation-ownership','relation-control','relation-payment','relation-unknown','marker-prediction','marker-actual','marker-unknown','slot','machine-upgrade','time-ruler']);
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asset = name => new URL(name, import.meta.url).href;
const integer = (value, min, max) => { if (!Number.isInteger(value) || value < min || value > max) throw new RangeError(`Expected integer ${min}–${max}`); return value; };
const finite = value => { if (!Number.isFinite(value)) throw new RangeError('Expected finite amount'); return value; };
export function icon(name, className = '') {
  if (!iconNames.includes(name)) throw new RangeError('Unknown icon');
  return `<img class="wk-icon ${escapeHtml(className)}" src="${asset(`${name}.svg`)}" alt="" aria-hidden="true">`;
}
function crop(file, frame, label, className) {
  const [x,y,w,h,iw,ih] = frame;
  return `<svg class="${className}" viewBox="${x} ${y} ${w} ${h}" role="img" aria-label="${escapeHtml(label)}"><image href="${asset(`../trust/${file}`)}" width="${iw}" height="${ih}"/></svg>`;
}
export function person(index=0, label='劳动者甲') {
  integer(index,0,7);
  return `<figure class="wk-person">${crop('peep_characters.png',[index*300,0,300,325,2400,325],label,'wk-person-art')}<figcaption>${escapeHtml(label)}</figcaption></figure>`;
}
export function machine(upgraded=false) {
  if (typeof upgraded !== 'boolean') throw new TypeError('upgraded must be boolean');
  return `<div class="wk-machine">${crop('iterated_machine.png',[10,10,1398,498,2048,2048],upgraded?'新机器':'旧机器','wk-machine-art')}<div class="wk-machine-caption"><span>${upgraded?'新机器':'旧机器'}</span><strong>${upgraded?'×2':'×1'}</strong></div>${upgraded?icon('machine-upgrade','wk-speed'):''}</div>`;
}
export function coin() { return crop('iterated_coin.png',[10,10,102,102,128,128],'货币筹码','wk-coin'); }
export function products(count=8, unsold=0) {
  integer(count,0,64); integer(unsold,0,count);
  const visible = Math.min(count,32);
  return `<figure class="wk-products" aria-label="${count}件产品，${unsold}件未售出"><div class="wk-product-grid" aria-hidden="true">${Array.from({length:visible},(_,i)=>`<span class="${i >= count-unsold?'wk-unsold':''}">${icon('product')}</span>`).join('')}${count>32?'<span class="wk-more">…</span>':''}</div>${icon('tray','wk-tray')}<figcaption><strong>${count}</strong> 件产品${unsold?` · ${unsold}件未售出`:''}</figcaption></figure>`;
}
export function wallet(amount=4,label='每人收入') {
  finite(amount);
  return `<figure class="wk-wallet">${icon('wallet')}<div class="wk-wallet-amount">${coin()}<strong>${escapeHtml(amount)}</strong></div><figcaption>${escapeHtml(label)} · 货币单位${amount<0?'（缺口）':amount===0?'（空）':''}</figcaption></figure>`;
}
export function timeRuler(hours=8, {baseline=8,kind='合同工时'}={}) {
  integer(hours,0,8); integer(baseline,hours,8);
  return `<div class="wk-time" role="img" aria-label="${escapeHtml(kind)}${hours}小时，基准${baseline}小时"><div class="wk-time-head"><span>${escapeHtml(kind)}</span><strong>${hours} 小时</strong></div><div class="wk-time-track"><div class="wk-time-base" style="width:${baseline/8*100}%"></div><div class="wk-time-fill" style="width:${hours/8*100}%"></div>${hours<baseline?`<span class="wk-time-gap" style="left:${hours/8*100}%;width:${(baseline-hours)/8*100}%">${baseline-hours}小时${kind==='合同工时'?'缩短':'未安排'}</span>`:''}</div><div class="wk-time-ticks" aria-hidden="true">${[0,2,4,6,8].map(n=>`<span>${n}</span>`).join('')}</div></div>`;
}
export function relation(kind='cooperation',label) {
  const labels={cooperation:'共同协作',ownership:'产权归属',control:'安排权限',payment:'实际付款',unknown:'关系待证'};
  if (!(kind in labels)) throw new RangeError('Unknown relation');
  return `<figure class="wk-relation">${icon(`relation-${kind}`)}<figcaption>${escapeHtml(label??labels[kind])}</figcaption></figure>`;
}
export function node(kind='supply',label='供应') {
  if (!['supply','science','transport','owner'].includes(kind)) throw new RangeError('Unknown node');
  return `<div class="wk-node">${icon(kind==='owner'?'owner-tag':`node-${kind}`)}<span>${escapeHtml(label)}</span></div>`;
}
export function stateFrame(content,state='default',label='样张状态') {
  if(!states.includes(state)) throw new RangeError('Unknown visual state');
  const labels={default:'默认',selected:'已选中',preview:'预览，尚未提交',disabled:'不可用：仅作对照',unknown:'未知：等待依据',history:'此前对照，不是当前结果'};
  return `<div class="wk-state wk-state-${state}"><span class="wk-state-label">${escapeHtml(label)} · ${labels[state]}</span>${content}</div>`;
}
export function ledger({revenue,materials,equipment,wages,surplus}) {
  for (const value of [revenue,materials,equipment,wages,surplus]) finite(value);
  if(Math.abs(revenue-materials-equipment-wages-surplus)>1e-8) throw new RangeError('Ledger does not balance');
  return `<dl class="wk-ledger">${[['销售收入',revenue],['材料',materials],['设备',equipment],['工资总额',wages],['会计结余',surplus]].map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
}
export const sampleScenarios = Object.freeze({
  old:Object.freeze({label:'旧机',upgraded:false,products:8,wage:4,hours:8,revenue:24,materials:8,equipment:2,wages:8,surplus:6}),
  new:Object.freeze({label:'换上新机',upgraded:true,products:16,wage:4,hours:8,revenue:48,materials:8,equipment:4,wages:8,surplus:28}),
  pay:Object.freeze({label:'新机 · 加薪',upgraded:true,products:16,wage:6,hours:8,revenue:48,materials:8,equipment:4,wages:12,surplus:24}),
  time:Object.freeze({label:'新机 · 缩时',upgraded:true,products:8,wage:4,hours:4,revenue:24,materials:4,equipment:4,wages:8,surplus:8}),
});
