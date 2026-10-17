import {TITLES,LENGTHS,initialCourse,adoptEquipmentCourse,finished,courseMoves,courseIssue,courseRound,nextCourse,crossCustomers,traceCustomer,retryScene,undoCourse,restoreCourse,courseRival,courseCapacity} from './course-model.mjs';
import {steadyChallenge,restoreSteadyBest,steadyBestGain,rememberSteadyBest} from './steady-challenge.mjs';
import {OWNER_ATLASES,ownerEmotion,ownerMarkup} from './owner-art.mjs';
import {customerMarkup,pedestrianMarkup} from './customer-art.mjs';
import {createStreetCrowd} from './street-crowd.mjs';
import {openingTradeExample} from './equipment-model.mjs';
import {ovenReport} from './equipment-receipt.mjs';
import {batchUpgrade,readyShop} from './equipment-model.mjs';
async function start(){
const embedded=window.__BATTLE_EMBED__,resources=window.__BATTLE_RESOURCES__;
const asset=name=>resources?.images[name]||'../bakery/'+name+'.svg';
const $=id=>document.getElementById(id),key='feast-shop-course-v2',coin='<i class="coin" aria-label="金币"></i>',names=['阿面','小麦','团团','圆圆','阿青','阿蓝','小雨','小风','你','隔壁老板','原料商'];
let state=initialCourse(),view='choose',selected=null,busy=false,lastTrace=null,openingStep=0,openingSold=6,openingRead=false,steadyBest=null;
try{const save=embedded?embedded.snapshot:JSON.parse(localStorage.getItem(key)),valid=restoreCourse(save?.state);if(valid){state=valid;view=save.view==='result'&&state.world.day?'result':'choose';lastTrace=state.traced.at(-1)??null;openingRead=save.openingRead===true||state.world.day>0||state.mode!=='steady';steadyBest=restoreSteadyBest(save.steadyBest);}}catch{}
const atlas=resources?.atlases||Object.fromEntries(await Promise.all([...OWNER_ATLASES,'trust'].map(async n=>{const r=await fetch(n==='trust'?'../trust/iterated_peep.json':'../wbwwb-source/'+n+'.json');if(!r.ok)throw new Error('人物素材加载失败');return[n,await r.json()];})));
function peep(id,worried=false,working=false,world=state.world){return customerMarkup(atlas,id,{worried,working,employer:world.shops.find(f=>f.workers.includes(id))?.id,history:world.history,hat:asset('chef-hat')});}
const crowd=createStreetCrowd($('customer-gate'),id=>pedestrianMarkup(atlas,id),()=>matchMedia('(prefers-reduced-motion:reduce)').matches);
function icon(type){if(['oven','bread'].includes(type))return `<img src="${asset(type==='oven'?'oven-new':'bread')}" alt="">`;return type==='tag'?'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 5L21 4 29 16 17 28 4 16Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="10" r="2" fill="currentColor"/></svg>':'<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="9" r="5"/><path d="M4 28L7 16 15 16 18 28M21 5A5 5 0 0 1 21 15M22 18L25 28"/></g></svg>';}
const social=()=>['source','social','done'].includes(state.mode);
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
const needsEquipmentUpdate=()=>state.version===2||!batchUpgrade(state.world);
function renderOpeningExample(){
 const sample=openingTradeExample(openingSold);
 openingSold=sample.sold;$('opening-sold').textContent=sample.sold;
 $('opening-sold-less').disabled=sample.sold===0;$('opening-sold-more').disabled=sample.sold===sample.quantity;
 $('opening-example-result').innerHTML=`<span>收进<b>${sample.revenue} ${coin}</b></span><span>花掉<b>${sample.operating+sample.storage} ${coin}</b></span><span>店里${sample.change===0?'没变':sample.change<0?'少':'多'}<b>${Math.abs(sample.change)} ${coin}</b></span>`;
 $('opening-example-result').insertAdjacentHTML('beforeend',`<small>${sample.storage?'剩下面包还要花 1 '+coin+' 保管。':'全卖完，不用付保管费。'}</small>`);
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
  if(needsEquipmentUpdate()){offerUpgrade();return;}
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
function offerUpgrade(){
 showDialog('换炉规则更新了',`<p>整店升级：每台旧炉8金币，停工一天，工资照发。</p><p>旧账不重算。开始新版会重新开局，旧记录另外保留。</p><button id="equipment-start" class="primary">保留旧账，开始新版 →</button>`);
 $('equipment-start').onclick=()=>{state=adoptEquipmentCourse(state);openingRead=false;view='choose';selected=null;lastTrace=null;$('detail').close();render();persist();openingGuide();};
}
function customer(id){
  if(state.mode==='source'&&crossCustomers(state).includes(id)){state=traceCustomer(state,id);lastTrace=id;render();persist();return;}
  const v=state.world.history.at(-1)?.visits.find(v=>v.id===id);
  const thought=id<8?(employed(id)?(state.world.shops[0].workers.includes(id)?'我给你做面包，下班去街上花工资。':'我给隔壁做面包。买哪家的？看价钱。'):'今天没班上，肚子照常上班。'):id===10?'我卖原料，也得买成品。总不能生啃面粉吧。':'我也要吃饭。金币不能当面包嚼。';
  const visit=v?.bought?`今天买了${v.shop===0?'你家':'隔壁'}的。`:v?.reason==='钱不够'?'面包在，钱不够。今天空手回去。':v?.reason==='卖完了'?'来晚一步，架子比我的袋子还空。':'';
  showDialog(names[id],`<p>“${thought}”</p><p>钱包 ${wallet(id)} ${coin}</p><p>想买：一个面包。${visit}</p>`);
}
function renderPeople(){
  // One visible visitor per unit of observed demand; tomorrow is revealed only after choosing.
  crowd.setCount(social()?0:state.world.history.at(-1)?.demand??12);
  $('street-panel').hidden=!social();$('customers').replaceChildren();if(!social())return;
  const r=state.world.history.at(-1),targets=state.mode==='source'?crossCustomers(state):[];
  for(let id=0;id<11;id++){
    const visit=r?.visits.find(v=>v.id===id),b=document.createElement('button');b.dataset.person=id;b.className='customer'+(visit&&!visit.bought?' hungry':'')+(targets.includes(id)?' traceable':'')+(state.traced.includes(id)&&state.mode==='source'?' traced':'');
    b.setAttribute('aria-label',names[id]+(targets.includes(id)?'：追踪工资和购物':'的钱包'));
    b.innerHTML=peep(id,visit&&!visit.bought,id<8&&employed(id))+`<small>${wallet(id)} ${coin}</small>`+(visit?.bought?'<img class="purchase" src="'+asset('bread')+'" alt="买到了面包">':'');b.onclick=()=>customer(id);$('customers').append(b);
  }
  $('street-summary').textContent=state.mode==='source'?'点虚线框里的人，追一笔钱':`${r.visits.filter(v=>v.bought).length} 人买到${r.poor?' · '+r.poor+' 人钱不够':''}`;
}
function render(){
  const mode=state.mode,w=state.world,r=w.history.at(-1),result=view==='result',over=finished(state)&&!result,isSource=mode==='source';
  $('round-report').hidden=!result&&!isSource;
  const challenge=steadyChallenge(state);$('steady-goal').hidden=!challenge||over;
  $('steady-goal').innerHTML=challenge?`<span>三天，怎样赚得最多？</span><strong>本局 ${challenge.gain>=0?'+':''}${challenge.gain} ${coin}</strong>`:'';
  document.body.dataset.mode=mode;$('battle-frame').classList.toggle('source-mode',isSource);$('battle-frame').classList.toggle('has-crowd',social());
  document.body.dataset.rules=String(state.version);$('upgrade-course').hidden=!needsEquipmentUpdate();$('old-record').hidden=!state.previousCourse;
  $('chapter-title').textContent=TITLES[mode];
  const length=LENGTHS[mode]||9;$('day').textContent=isSource?'新一局 · 第一天的真实账单':over?'收摊，回头看看':`第 ${result?w.day:w.day+1} / ${length} 天`;
  $('turn').textContent=Math.min(length,result||isSource||over?w.day:w.day+1);$('round-dots').innerHTML=Array.from({length},(_,i)=>`<i class="${i<w.day?'done':''}"></i>`).join('');
  const shopsForView=result||isSource||state.version===2?w.shops:w.shops.map(f=>{const today=readyShop(f);return {...today,fast:today.fastOvens>0};});
  $('rival-level').textContent=social()?(shopsForView[1].fast?'快速烤炉':'普通烤炉'):'每天做 6 个';
  for(const f of shopsForView){const id=f.id;$('cash-'+id).innerHTML=f.cash+' '+coin;$('bar-'+id).style.width=Math.min(100,f.cash/60*100)+'%';$('bar-'+id).classList.toggle('low',f.cash<12);
    $('stats-'+id).innerHTML=`售价 ${f.price} ${coin} · ${social()?'工资 '+f.wage+' '+coin:'剩货 '+f.bread.length+' 个'}`+(state.version===3?`<span class="equipment-status">${f.ovens-f.fastOvens}旧炉 · ${f.fastOvens}快炉 · ${f.workers.length}人${id===0?'':result&&r.installing?.[id]?' · 停工安装':f.pending?' · 有明日安排':''}</span>`:'');
    if(id===0){
      let note=$('player-equipment-note');
      if(!note){note=document.createElement('span');note.id='player-equipment-note';note.className='equipment-note';$('player-shop-title').parentElement.append(note);}
      note.textContent=result&&r.installing?.[id]?'停工安装':f.pending?'有明日安排':'';note.hidden=!note.textContent;
    }
    $('figures-'+id).innerHTML=ownerMarkup(atlas,id,ownerEmotion(w.history,id),busy&&result)+`<img class="oven" src="${asset(f.fast?'oven-new':'oven-old')}" alt="${f.fast?'快炉':'旧炉'}"><span class="bread-rack" role="img" aria-label="货架：剩余 ${f.bread.length} 个面包" title="剩余 ${f.bread.length} 个面包"><img class="rack-frame" src="${asset('bread-rack')}" alt="">${Array.from({length:Math.min(6,f.bread.length)},(_,i)=>`<img class="rack-loaf" src="${asset('bread')}" alt="" style="left:${19+i%2*34}%;top:${22+Math.floor(i/2)*26}%">`).join('')}</span>`;
    $('crew-'+id).innerHTML=f.workers.map(pid=>peep(pid,false,true,{...w,shops:shopsForView})).join('');
    $('crew-'+id).style.setProperty('--crew-count',f.workers.length);$('crew-'+id).classList.toggle('expanded-crew',f.workers.length>4);
    if(state.version===3&&f.ovens>1)$('figures-'+id).insertAdjacentHTML('beforeend',`<span class="oven-count">×${f.ovens}</span>`);
  }
  $('schedule').hidden=state.version===2&&social();
  $('schedule').innerHTML=state.version===2&&social()?'':`<span>${result?'出炉':'今天可做'} <b>${result?r.made[0]:courseCapacity(state,w.shops[0])}</b></span>`+(result?` → <span class="next">明天可做 <b>${w.shops[0].nextQuantity}</b></span>`:'');
  $('signal-label').textContent=isSource?'领工资的买家':social()?'今天买不起':mode==='steady'?'每日需求':result?'今日需求':'昨日需求';
  $('signal-value').textContent=isSource?(w.shops.reduce((n,f)=>n+f.workers.length,0)+' / 11'):social()?(r?.poor||0)+' 人':(mode==='steady'?12:r?.demand??12)+' 个';
  $('signal-note').textContent='';
  $('market-signal').classList.toggle('changed',result&&mode==='waves');
  $('speech-1').textContent=isSource?'':social()?result?(r.stopped[1]?'我也开不了炉了。':`今天卖了 ${r.sold[1]} 个！`):courseRival(state).line.replace(/[“”]/g,''):mode==='steady'?'六个就六个。我与烤炉都很佛系。':result?`今天来了 ${r.demand} 个买家。`:'昨天挺好。今天？先照昨天来。';
  $('speech-0').textContent=isSource?'':result?(r.stopped[0]?'今天先卖旧货。':`卖了 ${r.sold[0]}，剩下 ${r.stock[0]}。`):'';
  renderPeople();syncStreet();$('money-route').replaceChildren();$('ending').hidden=!over;$('console').hidden=!!over;
  $('undo').disabled=busy||isSource||mode==='done'||!w.day||(mode==='social'&&w.day===1);$('restart').disabled=busy;
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
    if(challenge)$('preview').insertAdjacentHTML('afterbegin',`<p id="steady-insight">${challenge.hint}</p>`);
    if(state.version===3&&w.shops[0].fastOvens>0){
      const compare=document.createElement('button');compare.id='oven-report';compare.textContent=ovenReport(w).installed?'换炉前后 ↗':'烤炉与账单 ↗';compare.onclick=ovenReceipt;$('preview').append(compare);
    }
    $('advance').hidden=false;$('advance').textContent=finished(state)?'看看这一场 →':'下一回合 →';return;
  }
  $('eyebrow').textContent=mode==='steady'?'三天，怎样赚得最多？':mode==='waves'?(w.day?'炉子不能跟着客人瞬移':'重新开店 · 钱包还是 36'):'对手的下一招';
  $('message').textContent=mode==='steady'?'每天 12 个，两家来卖。':mode==='waves'?`这批 ${w.shops[0].nextQuantity} 个，已经定了。`:courseRival(state).name;
  $('subline').textContent=mode==='steady'?'':mode==='waves'?'换炉、换人，明天才生效。':'';
  if(embedded&&mode==='steady'&&!w.day)$('subline').textContent='这场重新开账。';
  $('choose-label').textContent='';
  let wages;
  for(const m of courseMoves(state)){const b=document.createElement('button'),issue=courseIssue(state,m.id);b.className='move'+(issue?' locked':'');b.dataset.move=m.id;b.disabled=!!issue;b.title=issue||m.detail;b.innerHTML=`${icon(m.icon)}<strong>${m.name}</strong><small>${(issue||m.hint).replace('每天可做','日产').replaceAll('金币',coin)}</small>`;b.onclick=()=>select(m.id);if(m.group==='wages'){if(!wages){wages=document.createElement('details');wages.className='wage-moves';wages.innerHTML='<summary>调整工资</summary><div></div>';$('moves').append(wages);}wages.querySelector('div').append(b);}else $('moves').append(b);}
  $('preview').replaceChildren();
}
function checkpoint(){
  $('open-six')?.remove();
  if(embedded&&state.mode==='done'){
   const explore=document.createElement('button');explore.id='open-six';explore.textContent='把镜头拉远：六家店 →';
   explore.onclick=()=>{persist();parent.postMessage({app:'feast-battle',type:'sandbox'},'*');};
   document.querySelector('.ending-actions').prepend(explore);
  }
  const w=state.world,r=w.history.at(-1),mode=state.mode;$('next-scene').hidden=mode==='done'&&!embedded;$('retry').textContent='重打这一场 ↻';
  const challenge=steadyChallenge(state);$('comparison').dataset.challenge=String(!!challenge);
  if(challenge){
    const gain=challenge.gain,best=steadyBestGain(steadyBest)??gain,extra=gain-challenge.baselineGain;
    $('ending-kicker').textContent='第一场 · 三天收摊';
    $('ending-title').textContent=challenge.atMaximum?'本局最高收益，做到了！':gain===challenge.baselineGain?'稳稳赚了21枚，还能更多吗？':gain<0?`这次少了${-gain}枚，换个赚法？`:`这次赚了${gain}枚，还能再多一点？`;
    $('ending-copy').textContent=challenge.atMaximum?'客流没变，你让每个面包多带回了钱。':`比三天照常营业${extra>=0?'多赚':'少赚'}${Math.abs(extra)}枚。换一项策略，再比一比。`;
    $('comparison').innerHTML=[['本次收益',gain],['照常营业',challenge.baselineGain],['个人纪录',best]].map(([label,n])=>`<div class="outcome-figure">${label}<b>${n>=0?'+':''}${n} ${coin}</b></div>`).join('');
    $('retry').textContent=challenge.atMaximum?'再试一种赚法 ↻':'再试一次，赚更多 ↻';
    $('next-scene').textContent='客流变了呢？ →';
  }else if(mode==='steady'){
    const gain=w.shops[0].cash-36;$('ending-kicker').textContent='第一场结束';$('ending-title').textContent=gain>=0?'老板，钱包挺住了！':'开了三天，钱包瘦了。';
    $('ending-copy').textContent=gain>=0?'客人天天来，生意还能稳住。':'卖得多，也可能少赚钱。再试试？';
    $('comparison').innerHTML=`<div class="outcome-figure">开局<b>36 ${coin}</b></div><div class="outcome-figure">三天后<b>${w.shops[0].cash} ${coin}</b></div>`;$('next-scene').textContent='如果客流开始变呢？ →';
  }else if(mode==='waves'){
    $('ending-kicker').textContent='第二场结束';$('ending-title').textContent='你能换炉子。不能撤回昨天的面包。';$('ending-copy').textContent='';
    $('comparison').innerHTML=w.history.map(h=>`<div class="outcome-figure">第 ${h.day} 天<b>${h.demand}</b>买家</div>`).join('');$('next-scene').textContent='需求，从哪里来？ →';
  }else{
    const stopped=w.history.filter(h=>h.stopped[0]&&!h.installing?.[0]).length,cut=w.history.some(h=>h.wages[0]>0&&h.wages[0]<(state.version===3?6:8));$('ending-kicker').textContent='第三场 · 回头看整条街';$('ending-title').textContent=cut?'我省工资，盼别人发工资。':'隔壁省下的工资，你的顾客也少拿了。';
    $('ending-copy').textContent=mode==='done'?(cut?'巧了，隔壁也这么盘算。':'隔壁的员工，也是你的顾客。'):`${stopped} 天因资金不足停炉。最后一天，${r.poor} 人有货却买不起。`;
    $('comparison').innerHTML=`<div class="outcome-figure">两家剩货<b>${r.stock[0]+r.stock[1]} 个</b></div><div class="outcome-figure">当天全街工资<b>${r.wages[0]+r.wages[1]} ${coin}</b></div>`;$('next-scene').textContent=mode==='done'&&embedded?'再看一个小故事 →':'两家店，为什么绕回了这里？ →';
  }
}
function renderSource(){
  const targets=crossCustomers(state),id=lastTrace??null;$('moves').hidden=true;$('preview').hidden=false;$('choose-label').textContent='';$('eyebrow').textContent='新一局 · 已发薪、已购物';
  $('message').textContent=id===null?'需求，从哪里来？':Math.floor(id/4)===0?'你发的工资，给隔壁冲了业绩。':'隔壁发工资，你的柜台收了钱。';
  const r=state.world.history[0];
  if(id!==null){const employer=Math.floor(id/4),v=r.visits.find(v=>v.id===id),salary=r.receipts.find(p=>p.reason==='工资'&&p.to==='p'+id),purchase=r.receipts.find(p=>p.reason==='买面包'&&p.from==='p'+id);$('subline').innerHTML=`${employer===0?'你':'隔壁'}发工资 ${salary.amount} ${coin} → ${v.shop===0?'你的店':'隔壁'}收货款 ${purchase.amount} ${coin}`;}else $('subline').textContent='';
  $('preview').innerHTML=`<p class="source-proof">${state.traced.length===2?'上班是员工，下班是彼此的顾客。':''}</p><div class="source-controls">${targets.map(pid=>`<button data-trace="${pid}" class="${state.traced.includes(pid)?'seen':''}">${state.traced.includes(pid)?'✓ ':''}追踪${names[pid]}</button>`).join('')}</div>`;
  document.querySelectorAll('[data-trace]').forEach(b=>b.onclick=()=>customer(Number(b.dataset.trace)));
  $('advance').hidden=state.traced.length!==2;$('advance').textContent='继续对战 →';
  if(id!==null)requestAnimationFrame(()=>drawRoute(id));
}
function drawRoute(id){
  if(state.mode!=='source')return;const root=$('battle-frame').getBoundingClientRect(),origin=$('figures-'+Math.floor(id/4)).getBoundingClientRect(),person=document.querySelector(`[data-person="${id}"]`).getBoundingClientRect(),v=state.world.history[0].visits.find(v=>v.id===id),shop=$('figures-'+v.shop).getBoundingClientRect();
  const p={x:person.left+person.width/2-root.left,y:person.top+12-root.top},a={x:origin.left+origin.width/2-root.left,y:origin.bottom-root.top},b={x:shop.left+shop.width/2-root.left,y:shop.bottom-root.top};
  const salaryLeft=a.x<root.width/2,shopLeft=b.x<root.width/2;
  const left=salaryLeft?4:root.width-8,right=shopLeft?7:root.width-5;
  const route=(from,to,edge)=>{const dir=Math.sign(to.y-from.y)||1;return `M${from.x},${from.y} Q${edge},${from.y} ${edge},${from.y+12*dir} L${edge},${to.y-12*dir} Q${edge},${to.y} ${to.x},${to.y}`;};
  $('money-route').innerHTML=`<defs><marker id="salary-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" style="fill:none;stroke:#637d67;stroke-dasharray:none"/></marker></defs><path class="salary" marker-end="url(#salary-arrow)" d="${route(a,p,left)}"/><path class="shopping" marker-end="url(#salary-arrow)" d="${route(p,b,right)}"/><text x="${salaryLeft?16:root.width-52}" y="${(a.y+p.y)/2}">发工资</text><text x="${shopLeft?19:root.width-54}" y="${(b.y+p.y)/2}">买面包</text><circle class="node" cx="${p.x}" cy="${p.y}" r="5"/>`;
}
function select(id){if(busy||$('opening-guide').open||view!=='choose'||courseIssue(state,id))return;selected=id;syncStreet();play();}
function receipt(){const r=state.world.history.at(-1),totals={};for(const p of r.receipts.filter(p=>p.from==='f0'))totals[p.reason]=(totals[p.reason]||0)+p.amount;showDialog(`第 ${r.day} 天 · 你的账`, `<p>开门前 ${r.before[0]} ${coin}</p><p>营业收入 +${r.receipts.filter(p=>p.to==='f0').reduce((n,p)=>n+p.amount,0)} ${coin}</p>${Object.entries(totals).map(([k,n])=>`<p>${k} −${n} ${coin}</p>`).join('')}<p>收摊后 ${r.after[0]} ${coin}</p>${steadyChallenge(state)?'<p class="small">本局收益按三天资金净增加计分，设备款和老板生活费也扣除；未估算设备余值、折旧和库存价值，不是完整净利润。</p>':''}<p>本轮出炉 ${r.made[0]}，剩下 ${r.stock[0]}。</p>`);}
function ovenReceipt(){
 const a=ovenReport(state.world);if(!a)return;
 const days=[a.previous,a.current].filter(Boolean);
 const fields=[['出炉',r=>r.made+' 个'],['卖出',r=>r.sold+' 个'],['工资／原料',r=>r.wages+' / '+r.inputs],['收入／支出',r=>r.revenue+' / '+r.outflow],['其中购机款',r=>r.equipment],['余额变化',r=>(r.change>=0?'+':'')+r.change]];
 showDialog(a.headline,`<div class="oven-receipt" data-testid="oven-receipt"><table><thead><tr><th></th>${days.map(r=>'<th>第'+r.day+'天</th>').join('')}</tr></thead><tbody>${fields.map(([name,value])=>'<tr><th scope="row">'+name+'</th>'+days.map(r=>'<td>'+value(r)+'</td>').join('')+'</tr>').join('')}</tbody></table><p>${a.note}</p><details><summary>这张对照能说明什么？</summary><p>逐项显示真实付款，金额单位为金币。全部支出也包含保管、老板生活费和已付解聘补偿。余额变化不是净利润。</p><p>这是相邻两天，不是只有机器改变的实验：客流、售价、人手和库存也可能变化。新炉在明天交付，购机款在订购当天付出；不能只拿交付当天的收入，忽略昨天买炉的钱。</p><p>隔壁的升级、降薪与裁员是本局设定，不是所有企业必然采取的策略。</p></details></div>`);
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
    await announce((social()?'隔壁使出 · '+r.rival:'隔壁 · 按原计划开炉'),1);await announce(m.name+(['buy','upgrade','hire','fire','wage-down','wage-up','more','less'].includes(selected)?' · 明天生效':''),0);$('message').textContent=state.mode==='waves'?`今天来了 ${r.demand} 个买家。`:'客人上街了。';$('subline').textContent='';await walk(next);state=next;view='result';selected=null;render();persist();for(let i=0;i<2;i++){$('float-'+i).innerHTML=(r.after[i]-r.before[i]>=0?'+':'')+(r.after[i]-r.before[i])+' '+coin;$('float-'+i).classList.add('pop');}await pause(600);
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
$('advance').onclick=()=>{if(busy)return;if(state.mode==='source')transition();else{view='choose';selected=null;render();persist();}};
$('next-scene').onclick=()=>{if(embedded&&state.mode==='done'){persist();parent.postMessage({app:'feast-battle',type:'complete'},'*');}else transition();};
$('retry').onclick=()=>{if(busy)return;state=retryScene(state);view='choose';selected=null;render();persist();if(openingRequired())openingGuide();};
$('restart').onclick=()=>{if(busy)return;const upgrading=needsEquipmentUpdate();if(upgrading)openingRead=false;state=upgrading?adoptEquipmentCourse(state):{...initialCourse(),...(state.previousCourse?{previousCourse:state.previousCourse}:{})};view='choose';selected=null;lastTrace=null;render();persist();if(openingRequired())openingGuide();};
$('undo').onclick=()=>{if(busy)return;state=undoCourse(state);view='choose';selected=null;render();persist();};
$('rules-open').onclick=()=>showDialog('这个实验，改了哪些条件？',state.version===2?'<p>这是保留的旧规则记录：四位员工、四项策略。可通过“使用新版经营策略”另开一局，旧账不会重算。</p>':`<p>第一场挑战三天内赚得最多，以资金净增加计分，设备款也扣除，不等于完整净利润。顾客每天12位，对手固定售价和产量；买家没有单独的保留价格，提价上限是本局设定。前两场各重新开账：两店各36金币、3位员工，工资每人2；普通炉3人做6个，快炉2人做12个。照常营业，在固定需求12个时每天净增7，不必降薪。</p><p>价签当天改；添炉、升级、招工、解聘与工资调整次日生效。新增普通炉10金币。${batchUpgrade(state.world)?'整店升级费用为8金币乘以尚未升级的旧炉数；当天停炉安装，工资和老板生活费照付，不买生产原料，已有面包仍可出售，次日复工。':'本存档沿用旧规则：每次8金币升级一台，当天不停工。'}解聘另付一日工资补偿。店内最多3炉、6人；8位劳动者最初6人在职、2人待业，招聘不增加人口。</p><p>第二场只把需求改为12、20、20、6、12。前两场买家预算来自外部账户，工资流出后不追踪去向；这不是一个封闭社会。第三场重新开局，11人共享120金币，每人每天尝试买一个面包，所有支付从现有钱包转出。对手起初已降薪降价，随后也需付钱订炉和解聘；整店升级时也遵守停工规则。</p><p>前两场每2个面包需1金币原料，第三场每4个需1金币，向原料商实际支付；每店每天另转给老板2金币生活费。剩货每6个收1金币保管费，不足6个也收，留到第三天会坏。现金不够时停炉；不是自动清零或破产。</p><p>生产社会化在这里表现为相互依赖的生产与交换。生产资料的资本主义私人占有，体现在老板控制机器、雇佣和经营安排。这是基本矛盾在一个简化场景中的表现，不是基本矛盾的全部。</p><p>家庭消费还有经营、财产、转移收入和信贷等来源；投资、政府购买和外部市场也会形成需求。本实验没模拟全部渠道，不能据此证明压工资必然获胜、商品必然过剩或资本主义必然自动崩溃。机器的效果也取决于就业、分配和市场。</p><p>布局借鉴宝可梦的对战界面；人物素材：Nicky Case；烤炉：本项目。</p>`);
$('detail-close').onclick=()=>$('detail').close();$('detail').addEventListener('close',syncStreet);document.addEventListener('visibilitychange',syncStreet);window.addEventListener('resize',()=>{if(lastTrace!==null)drawRoute(lastTrace);});render();persist();
$('opening-help').onclick=openingGuide;
$('opening-sold-less').onclick=()=>{openingSold--;renderOpeningExample();};
$('opening-sold-more').onclick=()=>{openingSold++;renderOpeningExample();};
$('upgrade-course').onclick=offerUpgrade;
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
if(needsEquipmentUpdate()||openingRequired())openingGuide();
if(embedded){
 document.body.classList.add('embedded');
 document.querySelector('header a').replaceWith(Object.assign(document.createElement('span'),{textContent:'第二幕 · 面包店对决'}));
 const report=()=>parent.postMessage({app:'feast-battle',type:'height',height:Math.ceil(document.querySelector('main').getBoundingClientRect().height)+8},'*');
 new ResizeObserver(report).observe(document.querySelector('main'));report();
}
}
start().catch(error=>{console.error(error);document.body.dataset.failed='true';if(window.__BATTLE_EMBED__)parent.postMessage({app:'feast-battle',type:'error'},'*');});
