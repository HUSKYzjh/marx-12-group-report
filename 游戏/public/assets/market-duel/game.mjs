import {DAYS,STRATEGIES,initialDuel,currentOffer,offerIssue,settleDuel,rewindDuel,replayEveryone,restoreDuel} from './model.mjs';
const $=id=>document.getElementById(id),key='feast-market-duel-v1';
const coin='<i class="coin" aria-label="金币"></i>';
const names=['阿面','小麦','团团','圆圆','小衣','阿车','老炉','小火','你','隔壁老板','原料商'];
let state=initialDuel(),started=false,reference=null,allPath=null,draft=currentOffer(state),busy=false,picked=null,lastFocus=null;
try{const saved=JSON.parse(localStorage.getItem(key));const restored=restoreDuel(saved?.state);if(restored){state=restored;started=!!saved.started;const ref=restoreDuel(saved.reference),all=restoreDuel(saved.allPath);reference=ref&&ref.seed===state.seed&&ref.strategy===state.strategy?ref:null;allPath=all&&JSON.stringify(all)===JSON.stringify(replayEveryone(state))?all:null;draft=currentOffer(state);if(saved.draft&&offerIssue(state,saved.draft)!=='这张安排不成立。')draft=saved.draft;}}catch{}
const atlas=Object.fromEntries(await Promise.all(['body','face','face_nervous','hatguy'].map(async n=>[n,await (await fetch('../wbwwb-source/'+n+'.json')).json()])));
function sprite(name,frame,person=false){const a=atlas[name],f=a.frames[frame].frame,b=person?[f.x+24,f.y+34,72,108]:[f.x,f.y,f.w,f.h];return `<svg viewBox="${b.join(' ')}" aria-hidden="true"><image href="../wbwwb-source/${name}.png" width="${a.meta.size.w}" height="${a.meta.size.h}"/></svg>`;}
function peep(hungry=false,chef=true){const face=hungry?'face_nervous':'face',f=hungry?(atlas.face_nervous.frames.face_nervous0008?'face_nervous0008':Object.keys(atlas.face_nervous.frames)[0]):'face0000';return `<span class="peep">${sprite('body','body0000',true)}${sprite(face,f,true)}${chef?'<img class="cap" src="../bakery/chef-hat.svg" alt="">':''}</span>`;}
function persist(){try{localStorage.setItem(key,JSON.stringify({state,started,reference,allPath,draft}));}catch{$('issue').textContent='浏览器未保存；这页仍可继续玩。';}}
function ownMoney(id){return `${state.firms[id].cash} ${coin}`;}
function render(){
  document.body.dataset.phase=state.day===DAYS?'ending':'play';
  document.querySelector('h1').textContent=state.day===DAYS?'六天过了。':'隔壁也想发财。';
  $('day').textContent=state.day===DAYS?'六天后，收店看一眼':started?`第 ${state.day+1} / ${DAYS} 天`:'同一条街，两家面包店';
  $('opening').hidden=started;$('play').hidden=!started||state.day===DAYS;$('ending').hidden=state.day!==DAYS;
  if(state.day===DAYS)$('prompt').textContent='看看钱，也看看面包去了哪。';
  $('rival-name').textContent=STRATEGIES[state.strategy].name+'的店';
  for(let id=0;id<2;id++){
    $('owner-'+id).innerHTML=sprite('hatguy','hatguy0000');$('owner-'+id).onclick=()=>showPerson(id+8);$('owner-'+id).tabIndex=0;$('owner-'+id).setAttribute('role','button');$('owner-'+id).setAttribute('aria-label',id?'看看隔壁老板的钱包':'看看老板的钱包');$('owner-'+id).onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showPerson(id+8);}};
    const f=state.firms[id];$('stats-'+id).innerHTML=`<span title="待售面包"><img src="../bakery/bread.svg" alt="待售面包">${f.bread.length}</span><span title="店内现金">${ownMoney(id)}</span>`;
    const oven=id?$('rival-oven'):document.querySelector('[data-drop="oven"]');oven.classList.toggle('multiple',f.ovens>1);oven.dataset.count='×'+f.ovens;oven.querySelector('img').src='../bakery/'+(f.ovens>1?'oven-new':'oven-old')+'.svg';
    $('crew-'+id).replaceChildren();for(const p of state.people.filter(p=>p.role==='worker'&&p.home===id)){const outcome=state.history.at(-1)?.report.people[p.id],hungry=!!outcome&&!outcome.bought;const b=document.createElement('button');b.type='button';b.className='person';b.dataset.person=p.id;b.dataset.hungry=hungry;b.setAttribute('aria-label',`看看${names[p.id]}的钱包`);b.innerHTML=peep(hungry)+`<small>${names[p.id]}</small>`;b.onclick=()=>showPerson(p.id);$('crew-'+id).append(b);}
  }
  $('supplier').innerHTML=peep(false,false)+'<span>原料商</span>';
  const r=state.history.at(-1)?.report;$('fed').innerHTML=r?`今天 ${r.fed} / 11 人买到了面包`:'11人 · 今天还没开门';
  $('rival-offer').innerHTML=r?(r.closed[1]?'今天没开炉':`每人工资 ${r.offers[1].wage} ${coin}<br>面包 ${r.offers[1].price} ${coin}`):'今天的决定还没揭晓';
  $('wage-value').innerHTML=draft.wage+' '+coin;$('wage-bag').setAttribute('aria-label',`工资袋：每人${draft.wage}金币，把工资金币放进袋子`);
  $('wage-coins').replaceChildren();for(let amount=1;amount<=4;amount++){const b=document.createElement('button');b.type='button';b.className='wage-piece';b.dataset.piece='wage:'+amount;b.setAttribute('aria-label',`拿起每人${amount}金币的工资`);b.setAttribute('aria-pressed',String(draft.wage===amount));b.innerHTML=coin.repeat(amount);b.onclick=()=>pick('wage:'+amount,b);wireDrag(b,'wage:'+amount);$('wage-coins').append(b);}
  $('price').hidden=state.day<1;$('price').innerHTML='面包价签 '+draft.price+' '+coin+' ↻';$('price').setAttribute('aria-label',`翻面包价签，当前${draft.price}金币`);
  $('new-oven').hidden=state.day<2||state.firms[0].ovens>=3;$('new-oven').setAttribute('aria-pressed',String(draft.ovens>state.firms[0].ovens));
  const cannotOpen=!!offerIssue(state,{...currentOffer(state),wage:1});
  $('rewind').hidden=state.day<1;$('issue').textContent=state.day===DAYS?'':cannotOpen?'今天付不起开炉，仍可卖没坏的旧货，或翻回昨天。':offerIssue(state,draft);$('submit').disabled=busy||!!offerIssue(state,draft)&&!cannotOpen;$('submit').textContent=busy?'开门了……':cannotOpen?'今天停炉，只卖旧货 →':'封好安排，开门 →';
  if(r){$('round-result').textContent=`你的店卖了${r.sold[0]}个，隔壁卖了${r.sold[1]}个。${r.cashChange[0]>=0?'店里多了':'店里少了'}${Math.abs(r.cashChange[0])}金币。`;if(!busy)voices(r);}
  if(state.day===DAYS)ending();
  document.querySelectorAll('#play button').forEach(b=>{if(b.id!=='submit')b.disabled=busy;});
  $('rule').textContent='这局的隔壁是'+STRATEGIES[state.strategy].name+'：'+STRATEGIES[state.strategy].rule+' 你与他同时决定；他看不到你今天尚未提交的安排。';
}
function baseDraft(){return currentOffer(state);}
function pick(id,element){if(busy||state.day===DAYS)return;picked=id;document.querySelectorAll('[data-picked]').forEach(n=>delete n.dataset.picked);element.dataset.picked='true';$('instruction').textContent=id==='oven'?'把新烤炉放到你的店。':'把这一份放进工资袋。';}
function drop(target){
  if(!picked||busy)return;
  if(target==='wage'&&picked.startsWith('wage:')){draft={...baseDraft(),wage:Number(picked.split(':')[1])};$('instruction').textContent='定好了。开门时，隔壁的决定一起揭晓。';}
  else if(target==='oven'&&picked==='oven'){draft={...baseDraft(),ovens:state.firms[0].ovens+1};$('instruction').textContent='添炉的钱会付给原料商；客人会不会也多呢？';}
  else{$('issue').textContent='这个东西不放这里。';return;}
  picked=null;render();persist(); // Draft is not saved as a paid transaction.
}
function wireDrag(element,id){element.onpointerdown=e=>{
  if(busy||e.button!==0)return;let moved=false,ghost=null;const startX=e.clientX,startY=e.clientY,previous=picked;
  element.setPointerCapture(e.pointerId);
  const cleanup=()=>{ghost?.remove();document.querySelectorAll('[data-hover]').forEach(n=>delete n.dataset.hover);element.removeEventListener('pointermove',move);element.removeEventListener('pointerup',up);element.removeEventListener('pointercancel',cancel);document.removeEventListener('keydown',escape);};
  const cancel=()=>{cleanup();picked=previous;render();};const escape=k=>{if(k.key==='Escape'){k.preventDefault();cancel();}};
  const move=m=>{if(!moved&&Math.hypot(m.clientX-startX,m.clientY-startY)<7)return;if(!moved){moved=true;pick(id,element);ghost=document.createElement('div');ghost.className='drag-ghost';ghost.innerHTML=id==='oven'?'<img width="44" src="../bakery/oven-new.svg" alt="">':coin.repeat(Number(id.split(':')[1]));document.body.append(ghost);}ghost.style.left=m.clientX+'px';ghost.style.top=m.clientY+'px';document.querySelectorAll('[data-hover]').forEach(n=>delete n.dataset.hover);const t=document.elementFromPoint(m.clientX,m.clientY)?.closest('[data-drop]');if(t)t.dataset.hover='true';};
  const up=m=>{const target=document.elementFromPoint(m.clientX,m.clientY)?.closest('[data-drop]');cleanup();if(moved){element.onclick=()=>{};if(target)drop(target.dataset.drop);else{picked=null;render();$('instruction').textContent='没放进去。这次工资还没改变。';}setTimeout(()=>{if(element.isConnected)element.onclick=()=>pick(id,element);},0);}};
  element.addEventListener('pointermove',move);element.addEventListener('pointerup',up);element.addEventListener('pointercancel',cancel);document.addEventListener('keydown',escape);
};}
async function animateTrade(after){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const jobs=after.history.at(-1).report.people.map(async p=>{
    const source=document.querySelector('[data-person="'+p.id+'"]')||(p.id===10?$('supplier'):$('owner-'+(p.id-8)));if(!source)return;
    const visit=p.visits[0];if(!visit)return;const target=$('shop-'+visit.shop).getBoundingClientRect(),a=source.getBoundingClientRect();
    const ghost=document.createElement('div');ghost.className='travel-ghost';ghost.innerHTML=peep(!visit.success,p.id<8);ghost.style.left=a.left+'px';ghost.style.top=a.top+'px';document.body.append(ghost);source.style.opacity='.2';
    const x=target.left+target.width/2-a.left-21,y=target.bottom-a.top-76;
    try{await ghost.animate([{transform:'translate(0,0)'},{transform:`translate(${x}px,${y}px)`}],{duration:420,delay:p.id*22,fill:'forwards',easing:'ease-in-out'}).finished;
      if(visit.success){const bread=document.createElement('img');bread.className='carried-bread';bread.src='../bakery/bread.svg';bread.alt='';ghost.append(bread);const c=document.createElement('i');c.className='coin coin-flight';c.style.left=target.left+target.width/2+'px';c.style.top=target.bottom-65+'px';document.body.append(c);await c.animate([{transform:'translate(0,0)',opacity:1},{transform:'translate(0,-75px)',opacity:0}],{duration:220,easing:'ease-out'}).finished;c.remove();}
      await ghost.animate([{transform:`translate(${x}px,${y}px)`},{transform:'translate(0,0)'}],{duration:420,fill:'forwards',easing:'ease-in-out'}).finished;
    }finally{ghost.remove();source.style.opacity='';}
  });
  await Promise.all(jobs);
}
function voices(r){
  const prev=reference?.history[r.day-1]?.report;
  $('speech-0').textContent=r.closed[0]?'今天真付不起了。':r.fed<8?'客人来了，钱包没跟上。':r.stock[0]>6?'炉子没闲着，货也没走完。':r.sold[0]>r.sold[1]?'这轮，我多卖了一点！':'明天换个办法试试。';
  $('speech-1').textContent=r.closed[1]?'今天先停一停。':state.strategy==='mirror'&&r.day>1?'你昨天那招，我学会了。':state.strategy==='bargain'?'便宜一点，客人会来吗？':'先让大家拿到工资。';
  for(const id of [0,1])$('speech-'+id).dataset.fresh='true';
  if(prev)$('round-result').textContent+=` 同一天原来卖${prev.sold[0]}个，这次卖${r.sold[0]}个。`;
}
function ending(){
  const [mine,other]=state.firms.map(f=>f.cash);$('ending-title').textContent=mine>other?'你留下的钱更多。':mine<other?'隔壁留下的钱更多。':'两边留下的钱一样多。';
  $('score').innerHTML=state.firms.map((f,id)=>`<div class="score-column">${id?'隔壁':'你的店'}<strong>${f.cash} ${coin}</strong><small>待售${f.bread.length}个${f.debt?'<br>欠保管款'+f.debt:''}</small></div>`).join('');
  const source=allPath??reference;const chart=document.createElement('div');chart.className='compare-chart';chart.innerHTML='<span>买到<br>面包</span>';
  state.history.forEach((h,i)=>{const c=document.createElement('div');c.className='compare-cell';const amount=h.report.fed,old=source?.history[i]?.report.fed;c.style.setProperty('--fed',Math.max(amount,old??0));c.innerHTML=`<em>${amount}${old!==undefined?'/'+old:''}</em><i style="height:${amount*8}px" title="这次${amount}人"></i>${old!==undefined?`<i class="all" style="height:${old*8}px" title="对照${old}人"></i>`:''}<small>${i+1}日</small>`;chart.append(c);});
  $('comparison').replaceChildren(chart);const p=document.createElement('p');p.className='compare-caption';p.textContent=allPath?'实线：你先作决定，隔壁按自己的策略。斜线：隔壁每次也采用你的安排。两条路各自从同样120金币出发。':reference?'实线：改过的路径。斜线：原来的路径。没有重抽客人或挪用另一条路的钱。':'每天多少人买到了至少一个面包；不是“大家是否开心”的总分。';$('comparison').append(p);
  const dates=document.createElement('div');dates.className='rewind-days';dates.setAttribute('aria-label','选一天翻回去');for(let day=1;day<=state.day;day++){const b=document.createElement('button');b.textContent='↶ '+day+'日';b.setAttribute('aria-label','翻回第'+day+'天');b.onclick=()=>rewind(day);dates.append(b);}$('comparison').append(dates);
  if(allPath){const last=allPath.history.at(-1).report;$('ending-question').textContent=`两家照做时，第六天${last.fed}人买到面包，两店留下${allPath.firms[0].cash}与${allPath.firms[1].cash}金币。改善了吗？你还想改哪一步？`;}
  $('opponents').replaceChildren();for(const [id,entry]of Object.entries(STRATEGIES)){const b=document.createElement('button');b.textContent='再和'+entry.name+'过一局';b.onclick=()=>restart(id);$('opponents').append(b);}
}
async function submit(){if(busy)return;const issue=offerIssue(state,draft),cannotOpen=!!offerIssue(state,{...currentOffer(state),wage:1});if(issue&&!cannotOpen){$('issue').textContent=issue;return;}const after=settleDuel(state,draft,{allowClosed:cannotOpen});busy=true;render();$('rival-offer').innerHTML=after.history.at(-1).offers[1]?`他定了：每人工资 ${after.history.at(-1).offers[1].wage} ${coin}`:'他今天停工';try{await animateTrade(after);}finally{state=after;draft=baseDraft();picked=null;busy=false;persist();render();$('instruction').textContent=state.day===1?'也可以翻价签。每轮只换一个主要办法。':state.day===2?'现在可添炉。拖到店里试试，别急着买。':'要沿用昨天，还是换一招？';}}
function rewind(day=state.day){if(busy||!state.day)return;reference=structuredClone(state);allPath=null;state=rewindDuel(state,day);draft=baseDraft();picked=null;persist();render();$('prompt').textContent='翻回这一天。客人没重抽，你可以改一个决定。';}
function restart(strategy){state=initialDuel(strategy,state.seed);reference=null;allPath=null;draft=baseDraft();picked=null;started=true;persist();render();$('prompt').textContent='这回，你准备怎么对付他？';$('round-result').textContent='';$('speech-0').textContent='再试一次。';$('speech-1').textContent='开门，见真章。';}
function showPerson(id){lastFocus=document.activeElement;const p=state.people[id],r=state.history.at(-1)?.report.people[id];$('person-title').textContent=names[id]+(p.role==='worker'?(p.home===0?' · 你的厨师':' · 邻店厨师'):p.role==='owner'?' · 老板':'');$('person-wallet').innerHTML='现在的钱包：'+p.cash+' '+coin;$('person-wish').textContent=(r?`今天${r.bought?'买到'+r.bought+'个面包':'没买到面包'}。`:'')+'每天先试买一个。有余钱、也还想吃，才考虑第二个。';$('person-dialog').hidden=false;$('close-person').focus();}
$('close-person').onclick=()=>{$('person-dialog').hidden=true;lastFocus?.focus();};$('person-dialog').onkeydown=e=>{if(e.key==='Escape')$('close-person').click();if(e.key==='Tab'){e.preventDefault();$('close-person').focus();}};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&picked){picked=null;render();$('instruction').textContent='没改工资；可以再拿一份。';}});
document.addEventListener('dragstart',e=>e.preventDefault());
$('supplier').onclick=()=>showPerson(10);$('begin').onclick=()=>{started=true;persist();render();};$('submit').onclick=submit;$('rewind').onclick=()=>rewind();$('retry-last').onclick=()=>rewind();
$('wage-bag').onclick=()=>drop('wage');document.querySelector('[data-drop="oven"]').onclick=()=>drop('oven');document.querySelector('[data-drop="oven"]').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();drop('oven');}};
$('price').onclick=()=>{if(busy)return;draft={...baseDraft(),price:draft.price%4+1};picked=null;render();persist();$('instruction').textContent='只换价签。这轮工资与炉子照旧。';};
$('new-oven').onclick=()=>pick('oven',$('new-oven'));wireDrag($('new-oven'),'oven');$('everyone').onclick=()=>{allPath=replayEveryone(state);persist();render();};
render();
