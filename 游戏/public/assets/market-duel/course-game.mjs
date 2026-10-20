import {TITLES,LENGTHS,initialCourse,adoptEquipmentCourse,externalDemandCourse,finished,courseMoves,courseIssue,courseRound,nextCourse,beginProfitChallenge,retryScene,undoCourse,restoreCourse,courseRival,courseCapacity} from './course-model.mjs';
import {wavesReview,socialReview} from './course-review.mjs';
import {courseMenu,shortMoveLabel} from './course-menu.mjs';
import {profitReview} from './profit-challenge.mjs';
import {coursePart} from './course-parts.mjs';
import {challengeRules,steadyChallenge,restoreSteadyBest,steadyBestGain,rememberSteadyBest} from './steady-challenge.mjs';
import {OWNER_ATLASES,ownerEmotion,ownerMarkup} from './owner-art.mjs';
import {customerMarkup,pedestrianMarkup} from './customer-art.mjs';
import {createStreetCrowd} from './street-crowd.mjs';
import {openingTradeExample} from './equipment-model.mjs';
import {ovenReport} from './equipment-receipt.mjs';
import {batchUpgrade,readyShop} from './equipment-model.mjs';
import {simpleRules} from './simple-consequences.mjs';
async function start(){
const embedded=window.__BATTLE_EMBED__,resources=window.__BATTLE_RESOURCES__;
const asset=name=>resources?.images[name]||'../bakery/'+name+'.svg';
const $=id=>document.getElementById(id),key='feast-shop-course-v2',coin='<i class="coin" aria-label="金币"></i>',names=['阿面','小麦','团团','圆圆','阿青','阿蓝','小雨','小风','你','隔壁老板','原料商'];
let state=initialCourse(true,true,true,true,true),view='choose',selected=null,busy=false,lastTrace=null,openingStep=0,openingSold=6,openingRead=false,steadyBest=null;
try{const save=embedded?embedded.snapshot:JSON.parse(localStorage.getItem(key)),valid=restoreCourse(save?.state);if(valid){state=valid;view=save.view==='result'&&state.world.day?'result':'choose';lastTrace=state.traced.at(-1)??null;openingRead=save.openingRead===true||state.world.day>0||state.mode!=='steady';steadyBest=restoreSteadyBest(save.steadyBest);}}catch{}
// Compatibility belongs to loading, not to the player's opening dialogue.
if(!simpleRules(state.world)){state=adoptEquipmentCourse(state,true,true,true,true,true);view='choose';lastTrace=null;openingRead=false;steadyBest=null;}
if(!state.externalOnly){state=externalDemandCourse(state);if(state.mode==='done')view='choose';lastTrace=null;}
const atlas=resources?.atlases||Object.fromEntries(await Promise.all([...OWNER_ATLASES,'trust'].map(async n=>{const r=await fetch(n==='trust'?'../trust/iterated_peep.json':'../wbwwb-source/'+n+'.json');if(!r.ok)throw new Error('人物素材加载失败');return[n,await r.json()];})));
function peep(id,worried=false,working=false,world=state.world){return customerMarkup(atlas,id,{worried,working,employer:world.shops.find(f=>f.workers.includes(id))?.id,history:world.history,hat:asset('chef-hat')});}
const crowd=createStreetCrowd($('customer-gate'),id=>pedestrianMarkup(atlas,id),()=>matchMedia('(prefers-reduced-motion:reduce)').matches);
function icon(type){if(['oven','bread'].includes(type))return `<img src="${asset(type==='oven'?'oven-new':'bread')}" alt="">`;return type==='tag'?'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 5L21 4 29 16 17 28 4 16Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="10" r="2" fill="currentColor"/></svg>':'<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="9" r="5"/><path d="M4 28L7 16 15 16 18 28M21 5A5 5 0 0 1 21 15M22 18L25 28"/></g></svg>';}
const social=()=>!state.externalOnly&&['source','social','done'].includes(state.mode);
const employed=(id,w=state.world)=>w.shops.some(f=>f.workers.includes(id));
const wallet=id=>id===10?state.world.supplier:state.world.people[id].cash;
function persist(snapshot={state,view,openingRead}){steadyBest=rememberSteadyBest(steadyBest,snapshot.state);if(steadyBest)snapshot={...snapshot,steadyBest};if(embedded){parent.postMessage({app:'feast-battle',type:'save',snapshot},'*');return;}try{localStorage.setItem(key,JSON.stringify(snapshot));}catch{$('subline').textContent+='（进度暂时无法保存。）';}}
function syncStreet(){
  $('battle-frame').classList.toggle('street-idle',view==='choose'&&!selected&&!busy&&!finished(state)&&state.mode!=='source'&&!$('detail').open&&!$('opening-guide').open&&!document.hidden);
  $('battle-frame').classList.toggle('is-trading',busy);
  crowd.setActive($('battle-frame').classList.contains('street-idle')&&!social());
}
function showDialog(title,html){$('detail-title').textContent=title;$('detail-copy').innerHTML=html;$('detail').scrollTop=0;$('detail').showModal();(window.frameElement||document.querySelector('main')).scrollIntoView({block:'start',behavior:'instant'});fitOpeningGuide();$('detail-close').focus({preventScroll:true});syncStreet();}
const openingRequired=()=>!openingRead&&state.mode==='steady'&&!state.world.day;
function renderOpeningExample(){
 const original=openingTradeExample(openingSold),sample={...original,storage:0,change:original.revenue-original.operating};
 openingSold=sample.sold;$('opening-sold').textContent=sample.sold;
 $('opening-sold-less').disabled=sample.sold===0;$('opening-sold-more').disabled=sample.sold===sample.quantity;
 $('opening-example-result').innerHTML=`<span>收进<b>${sample.revenue} ${coin}</b></span><span>花掉<b>${sample.operating+sample.storage} ${coin}</b></span><span>店里${sample.change===0?'没变':sample.change<0?'少':'多'}<b>${Math.abs(sample.change)} ${coin}</b></span>`;
 $('opening-example-result').insertAdjacentHTML('beforeend','<small>没卖完就留着，不收保管费。</small>');
}
function fitOpeningGuide(){
  // A tall embedded battle is not the viewer's screen. Limit the modal using
  // the visible outer viewport rather than the iframe's full document height.
  let viewer=window,offset=20,height=innerHeight;
  try{
    while(viewer.frameElement){offset+=viewer.frameElement.getBoundingClientRect().top;viewer=viewer.parent;}
    height=viewer.visualViewport?.height||viewer.innerHeight;
  }catch{/* A standalone or cross-origin embedding still uses its own viewport. */}
  for(const id of ['opening-guide','detail'])$(id).style.maxHeight=Math.max(180,height-Math.max(20,offset)-20)+'px';
}
function renderOpeningGuide(){
  const pages=[...document.querySelectorAll('[data-opening-page]')],last=openingStep===pages.length-1;
  $('opening-guide').dataset.openingStep=String(openingStep);
  pages.forEach((page,i)=>{page.hidden=i!==openingStep;});
  document.querySelectorAll('.opening-topics li').forEach((topic,i)=>{
    if(i===openingStep)topic.setAttribute('aria-current','step');else topic.removeAttribute('aria-current');
  });
  $('opening-title').textContent=pages[openingStep].dataset.title;
  $('opening-progress').textContent=`${openingStep+1} / ${pages.length}`;
  $('opening-back').hidden=openingStep===0;$('opening-next').hidden=last;$('opening-start').hidden=!last;
  $('opening-next').textContent=['看看价目 →','看看一次性措施 →','看看日常调整 →','准备营业 →'][openingStep]||'下一页 →';
  $('opening-start').textContent=openingRequired()?'开始第一回合 →':'回到店里 →';
  $('opening-close').hidden=openingRequired();
  $('opening-guide').scrollTop=0;
  fitOpeningGuide();
}
function openingGuide(){
  if(busy||$('opening-guide').open)return;
  openingStep=0;openingSold=6;renderOpeningExample();renderOpeningGuide();
  const newcomer={mood:'neutral',streak:0,balance:0,label:'准备开门'};
  $('opening-shop-scene').innerHTML='<span class="opening-shop-speech">借过，生意算我一份。</span><div class="opening-shop-props">'+ownerMarkup(atlas,1,newcomer)+`<img class="opening-shop-oven" src="${asset('oven-old')}" alt="旧烤炉"><img class="opening-shop-rack" src="${asset('bread-rack')}" alt="空货架"></div><div class="opening-shop-crew">`+[4,5,6].map(id=>customerMarkup(atlas,id,{working:true,employer:1,hat:asset('chef-hat')})).join('')+'</div>';
  document.querySelectorAll('[data-opening-art]').forEach(image=>{image.src=asset(image.dataset.openingArt);});
  document.querySelectorAll('[data-opening-worker]').forEach(node=>{node.innerHTML=customerMarkup(atlas,0,{working:true,employer:0,hat:asset('chef-hat')});});
  $('opening-guide').showModal();
  // The battle also lives inside a tall iframe. Bring the whole guide into view,
  // not just its autofocus button, when reopening it from the bottom toolbar.
  (window.frameElement||document.querySelector('main')).scrollIntoView({block:'start',behavior:'instant'});
  fitOpeningGuide();
  $('opening-next').focus({preventScroll:true});syncStreet();
}
function customer(id){
  const v=state.world.history.at(-1)?.visits.find(v=>v.id===id);
  const thought=id<8?(employed(id)?(state.world.shops[0].workers.includes(id)?'我给你做面包，下班去街上花工资。':'我给隔壁做面包。买哪家的？看价钱。'):'今天没班上，肚子照常上班。'):id===10?'我卖原料，也得买成品。总不能生啃面粉吧。':'我也要吃饭。金币不能当面包嚼。';
  const visit=v?.bought?`今天买了${v.shop===0?'你家':'隔壁'}的。`:v?.reason==='钱不够'?'面包在，钱不够。今天空手回去。':v?.reason==='卖完了'?'来晚一步，架子比我的袋子还空。':'';
  showDialog(names[id],`<p>“${thought}”</p><p>钱包 ${wallet(id)} ${coin}</p><p>想买：一个面包。${visit}</p>`);
}
function renderPeople(){
  // One visible visitor per unit of observed demand; tomorrow is revealed only after choosing.
  crowd.setCount(social()?0:state.world.history.at(-1)?.demand??12);
  $('street-panel').hidden=!social();$('customers').replaceChildren();if(!social())return;
  const r=state.world.history.at(-1),targets=[];
  for(let id=0;id<11;id++){
    const visit=r?.visits.find(v=>v.id===id),b=document.createElement('button');b.dataset.person=id;b.className='customer'+(visit&&!visit.bought?' hungry':'')+(targets.includes(id)?' traceable':'')+(state.traced.includes(id)&&state.mode==='source'?' traced':'');
    b.setAttribute('aria-label',names[id]+(targets.includes(id)?'：追踪工资和购物':'的钱包'));
    b.innerHTML=peep(id,visit&&!visit.bought,id<8&&employed(id))+`<small>${wallet(id)} ${coin}</small>`+(visit?.bought?'<img class="purchase" src="'+asset('bread')+'" alt="买到了面包">':'');b.onclick=()=>customer(id);$('customers').append(b);
  }
  $('street-summary').textContent=r?`${r.visits.filter(v=>v.bought).length} 人买到${r.poor?' · '+r.poor+' 人钱不够':''}`:'还没开门，先选一招。';
}
function render(){
  $('steady-maximum').hidden=true;$('steady-maximum').replaceChildren();
  const mode=state.mode,w=state.world,r=w.history.at(-1),result=view==='result',over=finished(state)&&!result,isSource=mode==='source',isUpper=!!state.splitActs&&mode==='steady',isProfit=!!state.profitChallenge&&mode==='social'||isUpper;
  const part=coursePart(state);$('course-parts').hidden=!state.splitActs;
  document.querySelectorAll('[data-course-part]').forEach(el=>{if(el.dataset.coursePart===part.id)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
  $('part-context').textContent=part.phase+' · '+part.note;
  $('round-report').hidden=!result&&!isSource;
  const challenge=steadyChallenge(state);$('steady-goal').hidden=(!challenge&&!isProfit)||over;
  $('steady-goal').innerHTML=challenge?`<span>${isUpper?'赚钱的算盘：少发工资，多卖产品。':'三天，怎样赚得最多？'}</span><strong>本局 ${challenge.gain>=0?'+':''}${challenge.gain} ${coin}</strong>`:isProfit?`<span>${state.splitActs?'同样省工资，还能多赚吗？':'少发工资，多卖产品。'}</span><strong>本局净增 ${w.shops[0].cash>=36?'+':''}${w.shops[0].cash-36} ${coin}</strong>`:'';
  document.body.dataset.mode=mode;$('battle-frame').classList.toggle('source-mode',isSource);$('battle-frame').classList.toggle('has-crowd',social());
  document.body.dataset.rules=String(state.version);$('old-record').hidden=!state.previousCourse;
  $('chapter-title').textContent=state.splitActs?part.title:isProfit||isSource?'第三场 · 赚钱的算盘':mode==='done'&&state.profitChallenge?'少发、多卖，赚到了吗？':TITLES[mode];
  const length=LENGTHS[mode]||(state.externalOnly?5:9);$('day').textContent=isSource?'新一局 · 第一天的真实账单':over?'收摊，回头看看':`第 ${result?w.day:w.day+1} / ${length} 天`;
  $('turn').textContent=Math.min(length,result||isSource||over?w.day:w.day+1);$('round-dots').innerHTML=Array.from({length},(_,i)=>`<i class="${i<w.day?'done':''}"></i>`).join('');
  const shopsForView=result||isSource||state.version===2?w.shops:w.shops.map(f=>{const today=readyShop(f);return {...today,fast:today.fastOvens>0};});
  for(const f of shopsForView){const id=f.id;$('cash-'+id).innerHTML=f.cash+' '+coin;$('bar-'+id).style.width=Math.min(100,f.cash/60*100)+'%';$('bar-'+id).classList.toggle('low',f.cash<12);
    const equipment=id===1?[f.ovens>f.fastOvens?`${f.ovens-f.fastOvens}旧炉`:'',f.fastOvens?`${f.fastOvens}快炉`:''].filter(Boolean).join(' · '):`${f.ovens-f.fastOvens}旧炉 · ${f.fastOvens}快炉`;
    const trade=id===1?`售价${f.price}${coin} · ${social()||isUpper?'工资'+f.wage+coin:'余'+f.bread.length+'个'}`:`售价 ${f.price} ${coin} · ${social()||isUpper?'工资 '+f.wage+' '+coin:'剩货 '+f.bread.length+' 个'}`;
    $('stats-'+id).innerHTML=trade+(state.version===3?`<span class="equipment-status">${equipment} · ${f.workers.length}人</span>`:'');
    $(id===0?'player-capacity':'rival-level').textContent=`当前可做${courseCapacity(state,w.shops[id])}个`;
    const note=$(id===0?'player-equipment-note':'rival-equipment-note');
    note.textContent=result&&r.installing?.[id]?'停工安装':f.pending?'有明日安排':'';note.hidden=!note.textContent;
    $('figures-'+id).innerHTML=ownerMarkup(atlas,id,ownerEmotion(w.history,id),busy&&result)+`<img class="oven" src="${asset(f.fast?'oven-new':'oven-old')}" alt="${f.fast?'快炉':'旧炉'}"><span class="bread-rack" role="img" aria-label="货架：剩余 ${f.bread.length} 个面包" title="剩余 ${f.bread.length} 个面包"><img class="rack-frame" src="${asset('bread-rack')}" alt="">${Array.from({length:Math.min(6,f.bread.length)},(_,i)=>`<img class="rack-loaf" src="${asset('bread')}" alt="" style="left:${19+i%2*34}%;top:${22+Math.floor(i/2)*26}%">`).join('')}</span>`;
    $('crew-'+id).innerHTML=f.workers.map(pid=>peep(pid,false,true,{...w,shops:shopsForView})).join('');
    $('crew-'+id).style.setProperty('--crew-count',f.workers.length);$('crew-'+id).classList.toggle('expanded-crew',f.workers.length>4);
    if(state.version===3&&f.ovens>1)$('figures-'+id).insertAdjacentHTML('beforeend',`<span class="oven-count">×${f.ovens}</span>`);
  }
  $('schedule').hidden=state.version===2&&social();
  $('schedule').innerHTML=state.version===2&&social()?'':`<span>${result?'出炉':'今天可做'} <b>${result?r.made[0]:courseCapacity(state,w.shops[0])}</b></span>`;
  $('signal-label').textContent=isSource?'新挑战开局':isProfit?(result?'今日实付工资':'今日预计工资'):social()?'今天买不起':mode==='steady'?'每日需求':result?'今日需求':'昨日需求';
  $('signal-value').textContent=isSource?'36 枚':isProfit?String(result?r.wages[0]:readyShop(w.shops[0]).workers.length*readyShop(w.shops[0]).wage)+' 枚':social()?(r?.poor||0)+' 人':(mode==='steady'?12:r?.demand??12)+' 个';
  $('signal-note').textContent='';
  $('market-signal').classList.toggle('changed',result&&mode==='waves');
  $('speech-1').textContent=isSource?'':social()?result?(r.stopped[1]?'我也开不了炉了。':`今天卖了 ${r.sold[1]} 个！`):courseRival(state).line.replace(/[“”]/g,''):mode==='steady'?'六个就六个。我与烤炉都很佛系。':result?`今天来了 ${r.demand} 个买家。`:'昨天挺好。今天？先照昨天来。';
  $('speech-0').textContent=isSource?'':result?(r.stopped[0]?'今天先卖旧货。':`卖了 ${r.sold[0]}，剩下 ${r.stock[0]}。`):'';
  renderPeople();syncStreet();$('money-route').replaceChildren();$('ending').hidden=!over;$('console').hidden=!!over;
  $('undo').disabled=busy||isSource||mode==='done'||!w.day||(mode==='social'&&w.day===1&&!state.profitChallenge);$('restart').disabled=busy;
  $('advance').hidden=true;$('preview').hidden=true;$('moves').hidden=false;$('moves').replaceChildren();
  if(over){checkpoint();return;}
  if(isSource){renderSource();return;}
  if(result){
    $('eyebrow').textContent='';$('message').textContent=r.installing?.[0]?'今天停工安装。工资照发，明天可复工。':r.stopped[0]?'钱不够，今天停炉。烤炉被迫放假。':social()&&r.poor?'面包有了。买面包的钱呢？':`你卖了 ${r.sold[0]} · 隔壁卖了 ${r.sold[1]}`;
    const change=r.after[0]-r.before[0];$('subline').innerHTML=`店里 ${change>=0?'+':''}${change} ${coin} · 剩货 ${r.stock[0]} 个`;
    if(state.version===3&&w.shops[0].pending){const p=w.shops[0].pending;$('subline').insertAdjacentHTML('beforeend',`<br><small>明天：${p.ovens}台炉（${p.fastOvens}快炉） · ${p.workers.length}人 · 工资${p.wage} ${coin}/人</small>`);}
    $('eyebrow').textContent='';
    $('speech-0').textContent='';$('speech-1').textContent='';
    $('moves').hidden=true;$('choose-label').textContent='';$('preview').hidden=false;$('preview').innerHTML='<button id="receipt">账单 ↗</button>';$('receipt').onclick=receipt;
    if(isProfit)$('message').textContent=`工资支出 ${r.wages[0]} 枚 · 卖出 ${r.sold[0]} 个`;
    if(challenge)$('preview').insertAdjacentHTML('afterbegin',`<p id="steady-insight">${challenge.hint}</p>`);
    if(state.version===3&&w.shops[0].fastOvens>0){
      const compare=document.createElement('button');compare.id='oven-report';compare.textContent=ovenReport(w).installed?'换炉前后 ↗':'烤炉与账单 ↗';compare.onclick=ovenReceipt;$('preview').append(compare);
    }
    $('advance').hidden=false;$('advance').textContent=finished(state)?'看看这一场 →':'下一回合 →';return;
  }
  $('eyebrow').textContent=mode==='steady'?'三天，怎样赚得最多？':mode==='waves'?(w.day?'炉子不能跟着客人瞬移':'重新开店 · 钱包还是 36'):'对手的下一招';
  $('message').textContent=mode==='steady'?'每天 12 个，两家来卖。':mode==='waves'?`这批 ${w.shops[0].nextQuantity} 个，已经定了。`:courseRival(state).name;
  $('subline').textContent=mode==='steady'?'':mode==='waves'?'选择当天生效，再看看今天的客流。':'';
  if(embedded&&mode==='steady'&&!w.day)$('subline').textContent='新账本：36枚 · 每人工资'+w.shops[0].wage+'枚。';
  $('choose-label').textContent='';
  $('choose-label').textContent=isProfit?'每天选一招，看看能多赚多少。':'每天选一招，随后营业。';
  $('moves').classList.add('simplified-moves');
  const menu=courseMenu(courseMoves(state));
  function moveButton(m,parent){
    const b=document.createElement('button'),issue=courseIssue(state,m.id);
    b.className='move'+(issue?' locked':'');b.dataset.move=m.id;b.disabled=!!issue;b.title=issue||(isUpper&&m.id.startsWith('wage-')?'工资当天生效，人数和产量不变；上幕需求固定12个。':m.detail);
    b.innerHTML=`${icon(m.icon)}<strong>${shortMoveLabel(m)}</strong><small>${(issue||m.hint).replace('每天可做','日产').replaceAll('金币',coin)}</small>`;
    b.onclick=()=>select(m.id);parent.append(b);
  }
  for(const group of menu.groups){
    const detail=document.createElement('section');detail.className='move-group';detail.dataset.moveGroup=group.id;
    const heading=document.createElement('h3');heading.textContent=group.label;detail.append(heading);
    const choices=document.createElement('div');choices.className='move-group-choices';detail.append(choices);
    group.moves.forEach(m=>moveButton(m,choices));$('moves').append(detail);
  }
  menu.direct.forEach(m=>moveButton(m,$('moves')));
  $('preview').replaceChildren();
}
function checkpoint(){
  $('open-six')?.remove();
  const w=state.world,r=w.history.at(-1),mode=state.externalOnly&&state.mode==='done'?'waves':state.mode,limits=challengeRules(state);$('next-scene').hidden=state.mode==='done'&&!embedded;$('retry').textContent='重打这一场 ↻';
  const challenge=steadyChallenge(state);$('comparison').dataset.challenge=String(!!challenge);$('comparison').dataset.review=mode==='waves'?'waves':mode==='done'?'social':'';
  if((state.mode==='done'||state.splitActs&&mode==='steady')&&state.version===3&&batchUpgrade(w)){
    $('steady-maximum').hidden=false;
    $('steady-maximum').innerHTML=`${state.splitActs?'上幕':'第一场'}三天最高收益：<strong>+${limits.maxGain} 金币</strong><br><small>按资金净增计；开局 ${limits.opening} → 期末 ${limits.opening+limits.maxGain} 金币。</small>`;
  }

  if(challenge){
    const gain=challenge.gain,best=steadyBestGain(steadyBest)??gain,extra=gain-challenge.baselineGain;
    $('ending-kicker').textContent=state.splitActs?'上幕结束 · 固定需求':'第一场 · 三天收摊';
    $('ending-title').textContent=challenge.atMaximum?'本局最高收益，做到了！':gain===challenge.baselineGain?`稳稳赚了${challenge.baselineGain}枚，还能更多吗？`:gain<0?`这次少了${-gain}枚，换个赚法？`:`这次赚了${gain}枚，还能再多一点？`;
    $('ending-copy').textContent=challenge.atMaximum?'客流没变，你让每个面包多带回了钱。':`比三天照常营业${extra>=0?'多赚':'少赚'}${Math.abs(extra)}枚。换一项策略，再比一比。`;
    $('comparison').innerHTML=[['本次收益',gain],['照常营业',challenge.baselineGain],['个人纪录',best]].map(([label,n])=>`<div class="outcome-figure">${label}<b>${n>=0?'+':''}${n} ${coin}</b></div>`).join('');
    $('retry').textContent=challenge.atMaximum?'再试一种赚法 ↻':'再试一次，赚更多 ↻';
    $('next-scene').textContent=state.splitActs?'进入下幕：需求不确定 →':'客流变了呢？ →';
    if(state.splitActs)$('ending-copy').textContent+=' 刚才客流固定。下幕，再看看客流怎么变。';
  }else if(mode==='steady'){
    const gain=w.shops[0].cash-36;$('ending-kicker').textContent='第一场结束';$('ending-title').textContent=gain>=0?'老板，钱包挺住了！':'开了三天，钱包瘦了。';
    $('ending-copy').textContent=gain>=0?'客人天天来，生意还能稳住。':'卖得多，也可能少赚钱。再试试？';
    $('comparison').innerHTML=`<div class="outcome-figure">开局<b>36 ${coin}</b></div><div class="outcome-figure">三天后<b>${w.shops[0].cash} ${coin}</b></div>`;$('next-scene').textContent='如果客流开始变呢？ →';
  }else if(mode==='waves'){
    const review=wavesReview({...state,mode:'waves'});$('ending-kicker').textContent=state.splitActs?'下幕 · 客流波动之后':'第二场 · 五天收摊';
    if(review){
      $('ending-title').textContent=review.stock?'客人走了，面包还在。':review.spoiled?'账能重算，坏面包回不来。':'这次，节奏跟上了吗？';
      $('ending-copy').textContent='客流 '+review.demand.join(' → ')+'。'+(review.difference?'比照常营业'+(review.difference>0?'多':'少')+Math.abs(review.difference)+'枚。':'和照常营业的资金净增相同。');
      $('comparison').innerHTML=[['本次净增',review.gain],['照常净增',review.baselineGain]].map(([label,n])=>`<div class="outcome-figure">${label}<b>${n>=0?'+':''}${n} ${coin}</b></div>`).join('')+`<div class="outcome-figure">期末剩货<b>${review.stock} 个</b></div>`;
    }else{
      $('ending-title').textContent='你能换炉子。不能撤回昨天的面包。';$('ending-copy').textContent='';
      $('comparison').innerHTML=w.history.map(h=>`<div class="outcome-figure">第 ${h.day} 天<b>${h.demand}</b>买家</div>`).join('');
    }
    $('next-scene').textContent=state.externalOnly?'进入第三幕：六家厂商 →':state.splitActs?'再看：买家的钱也会变 →':'怎么把钱留在店里？ →';
  }else if(state.profitChallenge){
    const review=profitReview(w),a=review.actual;
    $('ending-kicker').textContent=state.splitActs?'下幕结束 · 收入与购买力':'第三场 · 经营结果';$('ending-title').textContent=state.splitActs?'这次，省下的钱留住了吗？':'少发、多卖，赚到了吗？';
    $('ending-copy').textContent=`比同样开局照常营业，资金净增${review.difference>=0?'多':'少'} ${Math.abs(review.difference)} 枚。`;
    $('comparison').innerHTML=`<div class="outcome-figure">工资支出<b>${a.wages} ${coin}</b></div><div class="outcome-figure">累计卖出<b>${a.sold} 个</b></div><div class="outcome-figure">本局净增<b>${a.gain>=0?'+':''}${a.gain} ${coin}</b></div>`;
    $('next-scene').textContent='再看一个小故事 →';
  }else{
    const review=socialReview(w),stopped=review.stopped;$('ending-kicker').textContent='第三场 · 回头看整条街';$('ending-title').textContent=review.title;
    $('ending-copy').textContent=`最后一天，${r.poor} 人有货却买不起。你的店共 ${stopped} 天因资金不足停炉。`;
    $('comparison').innerHTML=`<div class="outcome-figure">两家剩货<b>${r.stock[0]+r.stock[1]} 个</b></div><div class="outcome-figure">当天全街工资<b>${r.wages[0]+r.wages[1]} ${coin}</b></div>`;$('next-scene').textContent=mode==='done'&&embedded?'再看一个小故事 →':'两家店，为什么绕回了这里？ →';
  }
}
function renderSource(){
  $('moves').hidden=true;$('preview').hidden=false;$('choose-label').textContent='';
  $('eyebrow').textContent='另开挑战 · 原账目保留';$('message').textContent='少发工资，多卖产品。';
  $('subline').textContent='从36枚开始，看看店里最后多了多少钱。';
  $('preview').innerHTML='<button id="start-profit" class="primary">开始赚钱挑战 →</button>';
  $('start-profit').onclick=()=>{state=beginProfitChallenge(state);view='choose';selected=null;lastTrace=null;render();persist();};
}
function select(id){if(busy||$('opening-guide').open||view!=='choose'||courseIssue(state,id))return;selected=id;syncStreet();play();}
function receipt(){const r=state.world.history.at(-1),totals={};for(const p of r.receipts.filter(p=>p.from==='f0'))totals[p.reason]=(totals[p.reason]||0)+p.amount;showDialog(`第 ${r.day} 天 · 你的账`, `<p>开门前 ${r.before[0]} ${coin}</p><p>营业收入 +${r.receipts.filter(p=>p.to==='f0').reduce((n,p)=>n+p.amount,0)} ${coin}</p>${Object.entries(totals).map(([k,n])=>`<p>${k} −${n} ${coin}</p>`).join('')}<p>收摊后 ${r.after[0]} ${coin}</p>${steadyChallenge(state)?'<p class="small">本局收益按三天资金净增加计分，设备款、工资、原料和固定开支均按实际支出扣除；这是简化的资金净增，不是完整净利润。</p>':''}<p>本轮出炉 ${r.made[0]}，剩下 ${r.stock[0]}。</p>`);}
function ovenReceipt(){
 const a=ovenReport(state.world);if(!a)return;
 const days=[a.previous,a.current].filter(Boolean);
 const fields=[['出炉',r=>r.made+' 个'],['卖出',r=>r.sold+' 个'],['工资／原料',r=>r.wages+' / '+r.inputs],['收入／支出',r=>r.revenue+' / '+r.outflow],['其中购机款',r=>r.equipment],['余额变化',r=>(r.change>=0?'+':'')+r.change]];
 showDialog(a.headline,`<div class="oven-receipt" data-testid="oven-receipt"><table><thead><tr><th></th>${days.map(r=>'<th>第'+r.day+'天</th>').join('')}</tr></thead><tbody>${fields.map(([name,value])=>'<tr><th scope="row">'+name+'</th>'+days.map(r=>'<td>'+value(r)+'</td>').join('')+'</tr>').join('')}</tbody></table><p>${a.note}</p><details><summary>这张对照能说明什么？</summary><p>逐项显示真实付款，金额单位为金币。本局每天只付工资、原料与固定开支；换炉时另付一次8枚。余额变化不是净利润。</p><p>这是相邻两天，不是只有机器改变的实验：客流、售价、人手和库存也可能变化。换炉在当天生效，购机款也在当天付出；人数和工资不随换炉改变。</p><p>对手维持原安排，便于观察你自己的选择。</p></details></div>`);
}
const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,reduced()?0:ms));
async function announce(text,id){$('banner').textContent=text;$('banner').hidden=false;$('fighter-'+id).classList.add('lunge');await pause(480);$('fighter-'+id).classList.remove('lunge');$('banner').hidden=true;}
async function walk(next){
  if(reduced())return;const r=next.world.history.at(-1),live=social();
  await Promise.all(r.visits.map(async(v,i)=>{const source=live?document.querySelector(`[data-person="${v.id}"]`):crowd.element(v.id),a=source.getBoundingClientRect(),t=$('figures-'+v.shop).getBoundingClientRect(),g=document.createElement('div');g.className='traveller';g.innerHTML=live?peep(v.id,!v.bought,v.id<8&&employed(v.id,next.world),next.world):pedestrianMarkup(atlas,v.id,{worried:!v.bought});const x=a.left,y=a.top;g.style.left=x+'px';g.style.top=y+'px';document.body.append(g);source.style.opacity='0';const dx=t.left+t.width/2-x,dy=t.bottom-y-30;
    try{await g.animate([{transform:'translate(0,0)',opacity:1},{transform:`translate(${dx}px,${dy}px)`,opacity:1}],{duration:480,delay:i*35,fill:'both'}).finished;if(v.bought)g.insertAdjacentHTML('beforeend','<img class="purchase" src="'+asset('bread')+'" alt="">');await g.animate([{transform:`translate(${dx}px,${dy}px)`,opacity:1},{transform:'translate(0,0)',opacity:1}],{duration:420,delay:80,fill:'forwards'}).finished;}finally{g.remove();source.style.opacity='';}
  }));
}
async function play(){
  if(busy||!selected||courseIssue(state,selected))return;busy=true;syncStreet();$('moves').hidden=true;$('choose-label').textContent='正在营业…';const m=courseMoves(state).find(m=>m.id===selected),next=courseRound(state,selected),r=next.world.history.at(-1);const controls=[...document.querySelectorAll('button')].map(button=>[button,button.disabled]);controls.forEach(([button])=>button.disabled=true);
  // A chosen move is settled before its presentation: reload or chapter changes
  // resume at this receipt, and an interrupted animation cannot erase the turn.
  persist({state:next,view:'result',openingRead});
  try{
    if(!social()){
      $('choose-label').textContent='街上的客流变了…';
      await crowd.reconcile(r.demand);
      $('signal-label').textContent='今天实际需求';$('signal-value').textContent=r.demand+' 个';$('signal-note').textContent='一位顾客，一份需求';
    }
    $('choose-label').textContent='正在营业…';
    await announce((social()?'隔壁使出 · '+r.rival:'隔壁 · 按原计划开炉'),1);await announce(m.name+' · 当天生效',0);$('message').textContent=state.mode==='waves'?`今天来了 ${r.demand} 个买家。`:'客人上街了。';$('subline').textContent='';await walk(next);state=next;view='result';selected=null;render();persist();for(let i=0;i<2;i++){$('float-'+i).innerHTML=(r.after[i]-r.before[i]>=0?'+':'')+(r.after[i]-r.before[i])+' '+coin;$('float-'+i).classList.add('pop');}await pause(600);
  }catch(error){
    if(error?.name!=='AbortError')console.warn('经营动画已中断，结算结果已保留。',error);
  }finally{
    state=next;view='result';selected=null;busy=false;
    for(let i=0;i<2;i++){$('float-'+i).textContent='';$('float-'+i).classList.remove('pop');}
    controls.forEach(([button,disabled])=>button.disabled=disabled);render();persist();
  }
  syncStreet();
}
function transition(){if(busy)return;state=nextCourse(state);view='choose';selected=null;lastTrace=null;document.body.classList.add('body-transition');render();persist();setTimeout(()=>document.body.classList.remove('body-transition'),500);}
$('advance').onclick=()=>{if(busy)return;if(state.mode==='source'){state=beginProfitChallenge(state);view='choose';render();persist();}else{if((state.profitChallenge&&state.mode==='social'||state.externalOnly&&state.mode==='waves')&&finished(state))state=nextCourse(state);view='choose';selected=null;render();persist();}};
$('next-scene').onclick=()=>{if(embedded&&state.mode==='done'){persist();parent.postMessage({app:'feast-battle',type:'complete'},'*');}else transition();};
$('retry').onclick=()=>{if(busy)return;state=retryScene(state);view='choose';selected=null;render();persist();if(openingRequired())openingGuide();};
$('restart').onclick=()=>{if(busy)return;state={...initialCourse(true,true,true,true,true),...(state.previousCourse?{previousCourse:state.previousCourse}:{})};view='choose';selected=null;lastTrace=null;render();persist();if(openingRequired())openingGuide();};
$('undo').onclick=()=>{if(busy)return;state=undoCourse(state);view='choose';selected=null;render();persist();};
function showRules(){
 const shop=state.world.shops[0],upper=state.mode==='steady',wages=courseMoves(state).some(move=>move.id==='wage-down'),daily=shop.workers.length*shop.wage+5;
 const context=upper?'上幕 · 固定客流 · 3天':'下幕 · 波动客流 · 5天';
 const demand=upper?'每天12位顾客，两店争同一批生意。让3天的资金净增尽量多。':'客流每天变化，两店争同一批顾客。开门后才知道今天来了多少人。';
 const wage=wages?'<p><b>调工资：</b>每人每天加减1枚，只改变本店开支；本幕顾客的钱来自外部，不随工资减少。</p>':'<p>本场每人工资不调，先观察调价和设备怎样应对客流变化。</p>';
 showDialog('本局规则',`<div class="course-rules" data-testid="course-rules">
  <p class="rules-context">${context}</p><p class="rules-goal">${demand}</p>
  <section><h3>先选一项，再营业一天</h3><p>选择当天生效，之后沿用。隔壁始终照常营业。</p><p><b>调价：</b>降价更容易先卖出；提价每个收得多，但可能少卖。</p>${wage}
   <div class="rules-investments"><div><h4>添炉＋招工 · 付10枚</h4><p>每天多做6个<br>每天多付1人工资</p></div><div><h4>换快炉 · 付8枚</h4><p>每天多做6个<br>人数、工资不变</p></div></div>
  </section>
  <section><h3>先付生产开支，再卖面包收钱</h3><p class="rules-equation">收入＝实际卖出 × 售价<br>每日开支＝员工数 × 每人工资＋5枚<br>资金净增＝收入－每日开支－当天购炉款</p><p class="rules-current">按你当前配置：${shop.workers.length}人 × ${shop.wage}枚＋5枚＝${daily}枚／天。</p></section>
  <details><summary>卖不完、钱不够和其他限制</summary><p>顾客每人最多买1个，先买便宜的，同价轮流优先。做得多不保证卖得多；剩货以后继续卖，免费留存、不坏损。</p><p>现金付不起当天全部生产开支，就不生产、不付该天生产开支，仍可卖已有面包。购炉前须同时付得起购炉款与当天开支。</p><p>售价范围1—5枚；${wages?'每人工资范围1—4枚；':''}每店开局3人，最多3台炉。添炉招工合在一次操作；换快炉每次升级1台旧炉，两者都不停工。固定5枚包含原料3枚、其他2枚。</p><p>上下幕各从36枚另开账。第二幕只看外部客流，工资与购买力的联系放到第三幕的六家厂商、20人账本观察。期末资金净增不等于完整净利润。</p></details>
 </div>`);
}
$('rules-open').onclick=showRules;
$('detail-close').onclick=()=>$('detail').close();$('detail').addEventListener('close',syncStreet);document.addEventListener('visibilitychange',syncStreet);window.addEventListener('resize',()=>{});render();persist();
$('opening-help').onclick=openingGuide;
$('opening-sold-less').onclick=()=>{openingSold--;renderOpeningExample();};
$('opening-sold-more').onclick=()=>{openingSold++;renderOpeningExample();};
$('old-record').onclick=()=>{const old=state.previousCourse;if(!old)return;showDialog('保留的旧版账目',`<p>${TITLES[old.mode]} · 第${old.world.day}天</p><p>你店里 ${old.world.shops[0].cash} ${coin} · 隔壁 ${old.world.shops[1].cash} ${coin}</p>${old.world.history.map(r=>`<p>第${r.day}天 · ${r.move||r.action} · 卖出${r.sold[0]}个 · 余额${r.after[0]} ${coin}</p>`).join('')}<p>此记录仍按原规则保存，不参与新版结算。</p>`);};
$('opening-back').onclick=()=>{if(openingStep>0){openingStep--;renderOpeningGuide();$('opening-next').focus({preventScroll:true});}};
$('opening-next').onclick=()=>{const last=document.querySelectorAll('[data-opening-page]').length-1;if(openingStep<last){openingStep++;renderOpeningGuide();$(openingStep===last?'opening-start':'opening-next').focus({preventScroll:true});}};
$('opening-start').onclick=()=>{if(openingStep===document.querySelectorAll('[data-opening-page]').length-1){openingRead=true;persist();$('opening-guide').close();}};
$('opening-close').onclick=()=>{if(!openingRequired())$('opening-guide').close();};
$('opening-guide').addEventListener('cancel',event=>{if(openingRequired())event.preventDefault();});
$('opening-guide').addEventListener('close',()=>{syncStreet();document.querySelector('.move:not(:disabled)')?.focus({preventScroll:true});});
window.addEventListener('resize',fitOpeningGuide);
try{
  if(window.top!==window){
    const viewer=window.top;
    viewer.addEventListener('resize',fitOpeningGuide);
    window.addEventListener('pagehide',()=>viewer.removeEventListener('resize',fitOpeningGuide),{once:true});
  }
}catch{}
if(openingRequired())openingGuide();
if(embedded){
 document.body.classList.add('embedded');
 document.querySelector('header a').replaceWith(Object.assign(document.createElement('span'),{textContent:'饥馑的盛宴'}));
 const report=()=>parent.postMessage({app:'feast-battle',type:'height',height:Math.ceil(document.querySelector('main').getBoundingClientRect().height)+8},'*');
 new ResizeObserver(report).observe(document.querySelector('main'));report();
}
}
start().catch(error=>{console.error(error);document.body.dataset.failed='true';if(window.__BATTLE_EMBED__)parent.postMessage({app:'feast-battle',type:'error'},'*');});
