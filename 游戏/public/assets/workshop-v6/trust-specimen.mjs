import {products,income,timeRuler,relationSymbol,relationTypes,ledger,sampleScenarios,sourceSamples} from './trust-kit.mjs';
import {factoryRelationKinds,factoryRelationPlan,factoryMarkup,drawFactoryRelations} from './factory-relations.mjs';
const embedded=new URL(location.href).searchParams.has('embed');document.body.classList.toggle('embedded',embedded);
const $=id=>document.getElementById(id);
let activeRelation='cooperation';
function showRelation(kind){
 if(!factoryRelationKinds.includes(kind))return;
 activeRelation=kind;
 const s=sampleScenarios[document.body.dataset.scenario||'old'];
 $('factory-scene').innerHTML=factoryMarkup(kind,s);
 $('factory-scene').dataset.relation=kind;
 $('relation-explanation').textContent=factoryRelationPlan(kind,s).note;
 drawFactoryRelations($('factory-scene'),kind,s);
 document.querySelectorAll('[data-relation]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.relation===kind)));
}
const feedback={old:'8件产品，每人4，工作8小时。',new:'产量翻倍，工资和工时还没有变。',pay:'每人收入从4到6，产量仍是16件。',time:'每人收入不变，合同从8小时缩短到4小时。'};
function showScenario(key){const s=sampleScenarios[key];if(!s)return;$('products-art').innerHTML=products(s.products);$('benefits-art').innerHTML=income(s.wage,'甲的收入')+income(s.wage,'乙的收入')+timeRuler(s.hours);$('ledger-art').innerHTML=ledger(s);$('feedback').textContent=feedback[key];document.body.dataset.scenario=key;document.querySelectorAll('[data-scenario]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scenario===key)));showRelation(activeRelation);}
 $('relations').innerHTML=factoryRelationKinds.map(kind=>`<button type="button" class="tr-relation-choice" data-relation="${kind}" aria-pressed="${kind===activeRelation}" aria-controls="factory-scene" aria-label="${relationTypes[kind].label}：${relationTypes[kind].hint}">${relationSymbol(kind)}<span>${relationTypes[kind].label}</span></button>`).join('');
 document.querySelectorAll('[data-relation]').forEach(b=>b.addEventListener('click',()=>showRelation(b.dataset.relation)));
 document.querySelectorAll('[data-scenario]').forEach(b=>b.addEventListener('click',()=>showScenario(b.dataset.scenario)));
 showScenario('old');
 const redraw=()=>drawFactoryRelations($('factory-scene'),activeRelation,sampleScenarios[document.body.dataset.scenario]);
 new ResizeObserver(redraw).observe($('factory-scene'));
 if(document.fonts)document.fonts.ready.then(redraw);
if(!embedded){
 $('source-catalog').innerHTML=sourceSamples.map(([label,source,render])=>`<article class="tr-card"><div class="tr-card-art">${render()}</div><h3>${label}</h3><code>${source}</code></article>`).join('');
 $('pose-select').addEventListener('change',()=>{document.body.dataset.pose=$('pose-select').value;$('pose-message').textContent=$('pose-select').value==='blink'?'正在显示原作闭眼帧；不是情绪或政治评价。':'没有把原作策略性格分配给劳动者或所有者。';});
 $('static-toggle').addEventListener('click',()=>{const on=document.body.dataset.static!=='true';document.body.dataset.static=String(on);$('static-toggle').setAttribute('aria-pressed',String(on));const f=document.querySelector('iframe');if(f.contentDocument)f.contentDocument.body.dataset.static=String(on);});
 $('reset-sample').addEventListener('click',()=>{activeRelation='cooperation';showScenario('old');$('pose-select').value='normal';document.body.dataset.pose='normal';$('pose-message').textContent='没有把原作策略性格分配给劳动者或所有者。';});
 $('text-scale').addEventListener('click',()=>{const on=!document.documentElement.classList.contains('text-large');document.documentElement.classList.toggle('text-large',on);$('text-scale').setAttribute('aria-pressed',String(on));$('scale-state').textContent=on?'当前200%；点击恢复100%。':'当前100%；点击检查200%。';const f=document.querySelector('iframe');if(f.contentDocument)f.contentDocument.documentElement.classList.toggle('text-large',on);});
 document.querySelector('iframe').addEventListener('load',e=>{e.target.contentDocument.documentElement.classList.toggle('text-large',document.documentElement.classList.contains('text-large'));e.target.contentDocument.body.dataset.static=document.body.dataset.static||'false';});
 const images=new Set([...document.querySelectorAll('img,svg image')].map(el=>new URL(el.getAttribute('src')||el.getAttribute('href'),location.href).href));images.add(new URL('../trust-source/button_short.png',import.meta.url).href);
 const failed=(await Promise.all([...images].map(src=>new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(null);im.onerror=()=>resolve(src);im.src=src;})))).filter(Boolean);
 $('asset-health').textContent=failed.length?`未载入：${failed.length}项`:`当前${images.size}个图像文件全部载入；两台机器为本作新绘，原作PNG未改写。`;document.body.dataset.assets=failed.length?'error':'ready';
}
