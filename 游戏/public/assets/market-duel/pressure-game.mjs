import {PRESSURE_DAYS,initialPressure,pressurePlan,pressureCost,pressureRound,rewindPressure,restorePressure,pressureIssue} from './pressure-model.mjs';
import {pressureFeedback} from './pressure-feedback.mjs';
const $=id=>document.getElementById(id),key='feast-competitive-pressure-v1',coin='<i class="coin" aria-label="金币"></i>',names=['阿面','小麦','团团','圆圆','阿青','阿蓝','小雨','小风','你','隔壁老板','原料商'];
let state=initialPressure(),draft='hold',reference=null,paths=[],busy=false,lastFocus=null,automatic=false,autoSerial=0;
try{const saved=JSON.parse(localStorage.getItem(key)),world=restorePressure(saved?.state);if(world){state=world;draft=['hold','price','follow'].includes(saved.draft)?saved.draft:'hold';const old=restorePressure(saved.reference);reference=old&&old.seed===state.seed?old:null;paths=(saved.paths||[]).map(restorePressure).filter(s=>s&&s.seed===state.seed).slice(-3);}}catch{}
const atlas=Object.fromEntries(await Promise.all(['body','face','face_nervous','hatguy'].map(async n=>[n,await (await fetch('../wbwwb-source/'+n+'.json')).json()])));
function sprite(name,frame,person=false){const a=atlas[name],f=a.frames[frame].frame,b=person?[f.x+24,f.y+34,72,108]:[f.x,f.y,f.w,f.h];return `<svg viewBox="${b.join(' ')}" aria-hidden="true"><image href="../wbwwb-source/${name}.png" width="${a.meta.size.w}" height="${a.meta.size.h}"/></svg>`;}
function peep(worried=false,cap=false){const face=worried?'face_nervous':'face',f=worried?'face_nervous0008':'face0000';return `<span class="peep">${sprite('body','body0000',true)}${sprite(face,f,true)}${cap?'<img class="cap" src="../bakery/chef-hat.svg" alt="">':''}</span>`;}
function persist(){try{localStorage.setItem(key,JSON.stringify({state,draft,reference,paths}));}catch{$('draft').textContent='无法保存，仍可在这页继续。';}}
function person(id,employed){const p=state.people[id],r=state.history.at(-1),visit=r?.visits.find(v=>v.person===id),b=document.createElement('button');b.type='button';b.className='person';b.dataset.person=id;b.dataset.lost=!employed;b.dataset.hungry=!!visit&&!visit.success;b.setAttribute('aria-label','看看'+names[id]+'的钱包');b.innerHTML=peep(visit&&!visit.success,employed)+`<small>${names[id]}</small><span class="pocket">${p.cash} ${coin}</span>`+(visit&&!visit.success?`<small class="purchase-failed">${visit.reason}</small>`:'');b.onclick=()=>thought(id);return b;}
function render(){
 const r=state.history.at(-1),ended=state.day===PRESSURE_DAYS,feedback=pressureFeedback(state);
 document.body.dataset.phase=ended?'ending':'play';$('day').textContent=ended?'第九天，回头看这条街':state.day?`第 ${state.day} / ${PRESSURE_DAYS} 天 · 营业结束`:`第 1 / ${PRESSURE_DAYS} 天 · 开门前`;
 const following=state.firms[0].fast;
 document.querySelector('h1').textContent=ended?(following?'炉子更快，街上更静。':'客人走了，工资还得发。'):r?.shortOfMoney?'老顾客，开始买不起了。':r?.closed[0]?'这一天，没开成炉。':following?'你也跟着压了成本。':r&&state.firms[0].price===1?'客人回来了一些。':r?'钱，去了隔壁。':'隔壁挂出了低价。';
 $('prompt').textContent=ended?'省下来的工资，也是顾客少掉的钱。':r?.closed[0]?'开门前的钱，不够发工资、开炉。':r?.shortOfMoney?'他们不是不想买，是钱包已经空了。':following?'刚裁掉的人还有积蓄。能撑几天？':r&&state.firms[0].price===1?'面包便宜了，四份工资没有少。':'裁掉两人，压低工资，再用快炉抢客。';
 for(let id=0;id<2;id++){
  const f=state.firms[id];$('owner-'+id).innerHTML=sprite('hatguy','hatguy0000');$('owner-'+id).tabIndex=0;$('owner-'+id).setAttribute('role','button');$('owner-'+id).setAttribute('aria-label','看看'+names[id+8]+'的钱包');$('owner-'+id).onclick=()=>thought(id+8);$('owner-'+id).onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();thought(id+8);}};
  $('shop-'+id).toggleAttribute('data-closed',!!r?.closed[id]);
  $('oven-'+id).querySelector('img').src='../bakery/'+(f.fast?'oven-new':'oven-old')+'.svg';$('stats-'+id).innerHTML=`<span><img src="../bakery/bread.svg" alt="待售面包">${f.bread.length}</span><span>${f.cash} ${coin}</span>`;
  $('tag-'+id).innerHTML=`面包 ${f.price} ${coin}<small>每人工资 ${f.wage} ${coin}</small>`;
  $('crew-'+id).replaceChildren(...f.workers.map(p=>person(p,true)));
  let shelf=$('shelf-'+id);if(!shelf){shelf=document.createElement('div');shelf.id='shelf-'+id;shelf.className='pressure-stock';$('tag-'+id).after(shelf);}shelf.replaceChildren();shelf.setAttribute('aria-label','实际剩下'+f.bread.length+'个面包');for(const loaf of f.bread){const image=document.createElement('img');image.src='../bakery/bread.svg';image.alt='';image.dataset.old=state.day>loaf.day;shelf.append(image);}
 }
 $('speech-0').textContent=!r?'四份工资，都还在。':r.closed[0]?'钱不够，今天先停。':r.action==='follow'&&!r.before.firms[0].fast?'又省下两份工资！':r.sold[0]===0?'我的厨师也去隔壁买了？':r.shortOfMoney?'原来的客人，怎么不买了？':'这天卖了'+r.sold[0]+'个。';
 $('speech-1').textContent=!r?'我只要更便宜！':r.closed[1]?'我也开不了炉了。':state.firms[0].price===1?'你也降？那就一起卖。':'客人都往我这儿来！';
 const waiting=document.createElement('span');waiting.textContent='没了这份工作\n仍是你的顾客';$('unemployed').replaceChildren(waiting);
 for(let id=0;id<8;id++)if(!state.firms[state.people[id].home].workers.includes(id))$('unemployed').append(person(id,false));
 const supplier=person(10,false);supplier.dataset.lost=false;$('unemployed').append(supplier);
 $('daily').innerHTML=r?`你的店卖了 ${r.sold[0]} 个，隔壁卖了 ${r.sold[1]} 个。${r.stockOut?'<br>'+r.stockOut+'人想买，但两店都没货了。':''}`:'';
 $('consequence').replaceChildren();const message=document.createElement('p');message.textContent=feedback.message;$('consequence').append(message);
 if(r){const trace=document.createElement('div');trace.className='pressure-trace';trace.innerHTML=`<span>店里今天 <strong>${feedback.cashChange>0?'+':''}${feedback.cashChange}</strong> ${coin}</span><span>全街工资 <strong>${feedback.initialWages} → ${feedback.wages}</strong> ${coin}</span><span>有货却买不起 <strong>${feedback.poor.length}</strong> 人</span>`;$('consequence').append(trace);}
 $('decisions').hidden=ended;$('ending').hidden=!ended;
 $('match-price').hidden=state.day===0||state.firms[0].price===1;$('follow').hidden=state.day===0||state.firms[0].fast;document.querySelector('.pressure-tools').hidden=$('match-price').hidden&&$('follow').hidden;
 $('follow').disabled=busy||automatic||state.firms[0].fast;$('match-price').disabled=busy||automatic||state.firms[0].price===1;
 $('match-price').toggleAttribute('data-chosen',draft==='price');$('follow').toggleAttribute('data-chosen',draft==='follow');$('undo').hidden=draft==='hold';
 const p=pressurePlan(state,draft);$('draft').innerHTML=draft==='hold'?'':draft==='price'?`只换价签：${p.price} ${coin}。工资和人手不动。`:`留2人，工资1 ${coin}，价签1 ${coin}。换炉的钱会实际付出去。`;
 const required=pressureCost(state,draft),cash=state.firms[0].cash;$('cash-pressure').innerHTML=`<span>店里 ${cash} ${coin}</span><span>下一次开炉需 ${required} ${coin}</span>`;$('cash-pressure').dataset.short=cash<required;
 const issue=pressureIssue(state,draft);if(issue)$('draft').textContent=issue+' 可以先卖尚未坏的旧货。';
 $('submit').disabled=busy;$('submit').textContent=busy?'客人上街了……':issue?'停炉一天，卖旧货 →':draft==='follow'?'裁员、降薪，开门 →':draft==='price'?'只降价，开门 →':'保留当前安排，开门 →';
 $('continue').hidden=!state.day||ended;$('continue').disabled=false;$('continue').textContent=automatic?'暂停营业 Ⅱ':'照此安排，继续营业 ▷';$('submit').disabled=busy||automatic;$('undo').disabled=busy||automatic;
 $('try-follow').hidden=ended||following||!r?.closed[0];$('try-follow').disabled=busy||automatic;
 $('instruction').textContent=state.day===0?'先照原来的安排，开一天看看。':reference&&state.day===1?'回到第二天，同一批顾客，换个决定。':following?'先看看那四个没工资的人，钱包还剩多少。':'只把面包卖便宜，还是连工资、人手一起压？';
 $('instruction').hidden=state.day>0&&draft==='hold';
 const dates=$('dates');dates.replaceChildren();if(state.day){const label=document.createElement('span');label.textContent='翻回';dates.append(label);for(let day=1;day<=state.day;day++){const b=document.createElement('button');b.type='button';b.textContent=day+'日 ↶';b.setAttribute('aria-label','翻回第'+day+'天');b.disabled=busy||automatic;b.onclick=()=>rewind(day);dates.append(b);}}
 if(ended){const peak=Math.max(...state.history.map(h=>h.stock[0]+h.stock[1]));$('ending-title').textContent=following?'两家都降了成本。然后呢？':'不跟，店也撑不住。';$('ending-copy').textContent=following?`两家一度留下${peak}个面包。最后一天，${r.shortOfMoney}人有面包可买却钱不够。`:'维持原价，客人往便宜的店去。只降价，卖回来的钱又不够支撑原来的工资。';
  const snapshots=[...paths,state].slice(-3);$('paths').replaceChildren();for(const s of snapshots){const last=s.history.at(-1),cut=s.firms[0].fast,price=s.firms[0].price===1,b=document.createElement('div');b.className='path-note';b.innerHTML=`<strong>${cut?'人手、工资也跟着压':price?'只跟着降价':'工资、价格照旧'}</strong>最后店内 ${s.firms[0].cash} ${coin}<small>开不了炉 ${s.history.filter(r=>r.closed[0]).length} 天<br>最后一天钱不够 ${last.shortOfMoney} 人</small>`;$('paths').append(b);}}
}
async function walk(after){
 if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 const report=after.history.at(-1);
 await Promise.all(report.visits.map(async v=>{const source=document.querySelector('[data-person="'+v.person+'"]')||(v.person===8||v.person===9?$('owner-'+(v.person-8)):null);if(!source)return;const a=source.getBoundingClientRect(),t=$('shop-'+v.shop).getBoundingClientRect(),x=t.left+t.width/2-a.left-18,y=t.bottom-a.top-65,g=document.createElement('div');g.className='travel-ghost';g.innerHTML=peep(!v.success,v.person<8&&after.firms[after.people[v.person].home].workers.includes(v.person));g.style.left=a.left+'px';g.style.top=a.top+'px';document.body.append(g);source.style.opacity='.2';try{await g.animate([{transform:'translate(0,0)'},{transform:`translate(${x}px,${y}px)`}],{duration:380,delay:v.person*18,fill:'forwards',easing:'ease-in-out'}).finished;if(v.success){const b=document.createElement('img');b.className='carried-bread';b.src='../bakery/bread.svg';b.alt='';g.append(b);}await g.animate([{transform:`translate(${x}px,${y}px)`},{transform:'translate(0,0)'}],{duration:380,delay:120,fill:'forwards',easing:'ease-in-out'}).finished;}finally{g.remove();source.style.opacity='';}}));
}
async function payday(after){
 if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 // These slips repeat funded ledger entries; animation never pays a second time.
 const report=after.history.at(-1);
 await Promise.all(after.people.slice(0,8).map(async p=>{
  const paid=report.paid[p.id],worked=report.before.firms[p.home].workers.includes(p.id);
  if(!paid&&!worked)return;
  const source=document.querySelector('[data-person="'+p.id+'"]');if(!source)return;
  const a=source.getBoundingClientRect(),slip=document.createElement('div');
  slip.className='pressure-payday';slip.dataset.paid=paid;slip.setAttribute('aria-hidden','true');
  slip.innerHTML=paid?'工资 +'+paid+' '+coin:'今天没工资';
  slip.style.left=a.left+a.width/2+'px';slip.style.top=a.top-12+'px';document.body.append(slip);
  try{await slip.animate([{opacity:0,transform:'translate(-50%,8px)'},{opacity:1,transform:'translate(-50%,-12px)',offset:.3},{opacity:1,transform:'translate(-50%,-12px)',offset:.8},{opacity:0,transform:'translate(-50%,-18px)'}],{duration:640,easing:'ease-out'}).finished;}finally{slip.remove();}
 }));
}
async function layoffs(after){
 if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 const out=state.firms[0].workers.filter(id=>!after.firms[0].workers.includes(id));
 await Promise.all(out.map(async(id,i)=>{const source=document.querySelector('[data-person="'+id+'"]'),a=source.getBoundingClientRect(),b=$('unemployed').getBoundingClientRect(),g=document.createElement('div');g.className='travel-ghost';g.innerHTML=peep(true,true);g.style.left=a.left+'px';g.style.top=a.top+'px';document.body.append(g);source.style.opacity='.2';try{void g.querySelector('.cap').animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(14px) rotate(35deg)'}],{duration:320,fill:'forwards'});await g.animate([{transform:'translate(0,0)'},{transform:`translate(${b.left+b.width*.35+i*55-a.left}px,${b.top-a.top}px)`}],{duration:650,delay:i*100,easing:'ease-in-out',fill:'forwards'}).finished;}finally{g.remove();source.style.opacity='';}}));
}
async function submit(){if(busy||state.day===PRESSURE_DAYS)return;const after=pressureRound(state,draft);busy=true;render();try{await layoffs(after);await payday(after);await walk(after);}finally{state=after;draft='hold';busy=false;if(pressureFeedback(state).checkpoint)automatic=false;persist();render();}}
async function continueTrading(){
 if(automatic){automatic=false;render();return;}if(busy||!state.day||state.day===PRESSURE_DAYS)return;
 const serial=++autoSerial;automatic=true;render();
 // The delay gives each receipt time to be read. The same real round function
 // is used; first layoffs, first cash stop, first unaffordable bread, or day9 pause it.
 while(automatic&&serial===autoSerial&&state.day<PRESSURE_DAYS){await submit();if(automatic)await new Promise(resolve=>setTimeout(resolve,700));}
 if(serial===autoSerial){automatic=false;render();}
}
function rewind(day){if(busy||automatic)return;reference=structuredClone(state);state=rewindPressure(state,day);draft='hold';persist();render();}
function tryFollowing(){if(busy||automatic||state.firms[0].fast||!state.history.at(-1)?.closed[0])return;reference=structuredClone(state);paths=[...paths,state].slice(-2);state=rewindPressure(state,2);draft='follow';persist();render();}
function thought(id){lastFocus=document.activeElement;const p=state.people[id],r=state.history.at(-1),visit=r?.visits.find(v=>v.person===id),employed=id<8&&state.firms[p.home].workers.includes(id);$('person-title').textContent=names[id]+(id<8?(employed?' · 厨师':' · 没了这份工作'):'');$('person-wallet').innerHTML='现在有 '+p.cash+' '+coin;$('person-wish').textContent=(r&&id<8?'今天工资 '+r.paid[id]+'金币。':'')+(visit?(visit.success?'今天去'+(visit.shop?'隔壁':'你的店')+'买了一个面包。':'今天也想买面包：'+visit.reason+'。'):'今天想买一个面包。')+(id<8&&!employed?'“还得吃饭，可积蓄不能一直花。”':'');$('person-dialog').hidden=false;$('close-person').focus();}
function closeThought(){$('person-dialog').hidden=true;lastFocus?.focus();}
$('close-person').onclick=closeThought;$('person-dialog').onkeydown=e=>{if(e.key==='Escape')closeThought();if(e.key==='Tab'){e.preventDefault();$('close-person').focus();}};
$('match-price').onclick=()=>{if(busy||automatic)return;draft='price';persist();render();};$('follow').onclick=()=>{if(busy||automatic)return;draft='follow';persist();render();};$('undo').onclick=()=>{if(busy||automatic)return;draft='hold';persist();render();};$('submit').onclick=submit;$('continue').onclick=continueTrading;
$('restart').onclick=()=>{paths=[...paths,state].slice(-2);reference=null;state=initialPressure(state.seed);draft='hold';persist();render();};
$('try-follow').onclick=tryFollowing;
render();
