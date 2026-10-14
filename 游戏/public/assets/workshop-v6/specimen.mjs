import {person,machine,products,wallet,timeRuler,relation,node,stateFrame,icon,iconNames,ledger,sampleScenarios} from './art-kit.mjs';
const embedded = new URL(location.href).searchParams.has('embed');
document.body.classList.toggle('embedded',embedded);
const $=id=>document.getElementById(id);
const feedback={old:'8件产品，每人4，工作8小时。',new:'产品翻倍；工资与合同工时还没变。',pay:'产量仍是16件，每人收入从4到6。',time:'产量回到8件，每人收入不变，合同缩短到4小时。'};
function showScenario(key){
  const s=sampleScenarios[key]; if(!s)return;
  $('factory-scene').innerHTML=`<div class="workers">${person(0,'劳动者甲')}${person(2,'劳动者乙')}</div><div class="machine-area">${machine(s.upgraded)}</div>${products(s.products)}`;
  $('income-art').innerHTML=`<div class="income-pair">${wallet(s.wage,'甲的收入')}${wallet(s.wage,'乙的收入')}</div>`;
  $('hours-art').innerHTML=timeRuler(s.hours);
  $('ledger-art').innerHTML=ledger(s);
  $('feedback').textContent=feedback[key];
  document.querySelectorAll('[data-scenario]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scenario===key)));
  document.body.dataset.scenario=key;
}
document.querySelectorAll('[data-scenario]').forEach(b=>b.addEventListener('click',()=>showScenario(b.dataset.scenario)));
showScenario('old');
if(!embedded){
  $('nodes').innerHTML=node('supply','供应')+node('science','科研')+node('transport','运输')+node('owner','所有者身份');
  $('relations').innerHTML=['cooperation','ownership','control','payment','unknown'].map(k=>relation(k)).join('');
  const showState=()=>{$('state-art').innerHTML=stateFrame(products(8),$('state-select').value,'产品托盘');};
  $('state-select').addEventListener('change',showState);showState();
  $('markers').innerHTML=[['marker-prediction','预测'],['marker-actual','实际'],['marker-unknown','未知']].map(([i,l])=>`<figure>${icon(i)}<figcaption>${l}</figcaption></figure>`).join('');
  $('empty-examples').innerHTML=`<div>${products(0)}</div><div>${wallet(0,'空收入袋')}</div><div>${timeRuler(6,{kind:'任务用时'})}</div>`;
  const labels=['产品','托盘','收入袋','合同','供应节点','科研节点','运输节点','身份牌','协作线','产权线','管理线','付款线','待证线','预测标记','实际标记','未知标记','插槽','新机标记','时间尺'];
  $('asset-grid').innerHTML=iconNames.map((n,i)=>`<article class="asset-card">${icon(n)}<a href="./${n}.svg" target="_blank" rel="noopener">${labels[i]}</a><code>${n}.svg</code></article>`).join('');
  $('static-toggle').addEventListener('click',()=>{const on=document.body.dataset.static!=='true';document.body.dataset.static=String(on);$('static-toggle').setAttribute('aria-pressed',String(on));const frame=document.querySelector('iframe');if(frame.contentDocument)frame.contentDocument.body.dataset.static=String(on);});
  $('reset-sample').addEventListener('click',()=>{$('state-select').value='default';showState();showScenario('old');});
  $('text-scale').addEventListener('click',()=>{const on=!document.documentElement.classList.contains('text-large');document.documentElement.classList.toggle('text-large',on);$('text-scale').setAttribute('aria-pressed',String(on));const frame=document.querySelector('iframe');if(frame.contentDocument)frame.contentDocument.documentElement.classList.toggle('text-large',on);});
  const frame=document.querySelector('iframe');
  frame.addEventListener('load',()=>{frame.contentDocument.documentElement.classList.toggle('text-large',document.documentElement.classList.contains('text-large'));frame.contentDocument.body.dataset.static=document.body.dataset.static||'false';});
  const tests=iconNames.map(name=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(null);img.onerror=()=>resolve(name);img.src=new URL(`./${name}.svg`,import.meta.url).href;}));
  const failed=(await Promise.all(tests)).filter(Boolean);
  $('asset-health').textContent=failed.length?`未载入：${failed.join('、')}`:`19个SVG已载入。原图未改写。`;
  document.body.dataset.assets=failed.length?'error':'ready';
}
