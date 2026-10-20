/* Three distinct policy toys. Decisions come from the host; no UI-made money. */
(function(root){
 'use strict';
 let previousRun=null,toolsOpen=false,fourthOpen=false,lastRoute=null,lastBeat=null,feedbackStop=null,peekStop=null,inspectionStop=null,openOutlook='normal';
 const moneyBeat=550;
 const names={consumption:'增加消费',investment:'增加投资',exports:'增加出口'};
 const modes={consumption:[['raise','加工资'],['credit','先借钱']],investment:[['expand','扩建产线'],['replace','换掉旧机器']],exports:[['single','押一个大客户'],['diverse','分散找客户']]};
 const conditions={consumption:'如果收入也增长？ →',investment:'如果下游订单落实？ →',exports:'如果海外订单稳定？ →'};
 const risks={consumption:'如果工资少了一半？ →',investment:'如果设备买家少下单？ →',exports:'如果大客户停单？ →'};
 const advisers={consumption:{quote:'先让钱包鼓起来。',role:'金融顾问',prop:'cash'},investment:{quote:'先让设备厂忙起来。',role:'投资顾问',prop:'ovens'},exports:{quote:'去外面找找买家。',role:'贸易顾问',prop:'ship'}};
 function menuChoice(p,id,account){
  const round=p.remedyLabs?.[id]?.history.length??0,completed=p.reliefCompleted.includes(id);
  // Past collection is not completion of a fresh rematch. Only show a receipt
  // for this run after the player has actually collected its tested response.
  const r=completed&&account?.canContinue?account.display:null;
  const trial=r?(account.flow&&r.control.dose===0?'照常营业':modes[id].find(m=>m[0]===r.control.mode)[1])+' · '+{normal:'原条件',adverse:'逆风',supported:'顺风'}[r.control.outlook]:'';
  const consequence=r?(id==='consumption'?(r.debt?'下期还'+(r.debt+Math.ceil(r.debt/5))+'枚':'工资'+r.wages+'枚'):
   id==='investment'?(r.control.mode==='expand'?'下期产能'+(50+r.capacity)+'份':'下期开工'+(Math.max(10,15-r.world.efficiency)+Math.ceil(r.capacity/5))+'枚'):'跑腿'+r.transport+'枚'):'';
  const quote=r?'剩'+r.stock+'份 · '+consequence:advisers[id].quote;
  const progress=round&&(!account||!account.canContinue)?'接着玩 →':completed?'再试 ↺':'→';
  return {round,completed,quote,trial,recorded:!!r,progress,
   label:names[id]+'：'+(r?'你的上次试法，'+trial+'。':'')+quote+(progress==='接着玩 →'?'接着玩，保留原记录。':completed?(account?.flow?'已观察实际交易，再试这张处方。':'已完成对照，再试这张处方。'):'试这张处方。')};
 }
 // Predictions are optional, page-local notes. They never enter the economic
 // model, the save, the completion gate, or a classroom aggregate.
 let guessDraft={},guessPending=null,guessResult=null,guessRevealing=false;
 const guessChoices={stock:['empty','left'],cash:['up','not-up']};
 const guessLabels={empty:'猜空',left:'猜剩',up:'猜增','not-up':'不增'};
 function nextGuess(target,current){if(!Object.hasOwn(guessChoices,target))return undefined;const choices=guessChoices[target];return choices[choices.indexOf(current)+1];}
 function gradeGuess(choices,r){
  if(!r||!Number.isInteger(r.stock)||r.stock<0||!Number.isInteger(r.cashChange))return null;
  const actual={stock:r.stock===0?'empty':'left',cash:r.cashChange>0?'up':'not-up'};
  const checks=Object.keys(guessChoices).filter(k=>guessChoices[k].includes(choices?.[k])).map(k=>({target:k,choice:choices[k],actual:actual[k],matched:choices[k]===actual[k]}));
  return checks.length?{checks:checks}:null;
 }
 function guessKey(run){return JSON.stringify({route:run.route,history:run.history,comparisons:run.comparisons,followups:run.followups??[]});}
 function captureGuess(c,a){
  if(!['PLACE','OPERATE','COMPARE','FOLLOWUP'].includes(a.type))return;
  const route=c.state.prologue.reliefRoute,lab=c.state.prologue.remedyLabs[route];
  guessPending=lab&&Object.keys(guessDraft).length?{route:route,base:guessKey(lab),round:a.type==='FOLLOWUP'?4:Math.min(3,lab.history.length+1),
   control:{dose:lab.dose,mode:a.mode??lab.mode,outlook:a.type==='FOLLOWUP'?'adverse':a.outlook??lab.thirdOutlook??'normal'},choices:{...guessDraft}}:null;
  guessDraft={};guessResult=null;
 }
 function settleGuess(previous,next,r){
  const executed=didOperate(previous,next),pending=guessPending;guessPending=null;
  if(executed){
   guessResult=pending&&pending.base===guessKey(previous)&&pending.route===next.route&&pending.round===r?.round&&['dose','mode','outlook'].every(k=>pending.control[k]===r.control[k])?gradeGuess(pending.choices,r):null;
   guessDraft={};
  }else if(!previous||guessKey(previous)!==guessKey(next)){guessDraft={};guessResult=null;}
  else if(pending)guessDraft={...pending.choices};
  guessRevealing=executed&&!!guessResult;return guessResult;
 }
 function guessControl(box,target){
  const button=el('button','',box,'remedy-guess');button.type='button';button.dataset.guessTarget=target;
  function draw(){
   const choice=guessDraft[target],check=guessResult?.checks.find(g=>g.target===target);
   button.textContent=choice?guessLabels[choice]:'';button.dataset.state=choice?'draft':check?'revealed':'idle';button.dataset.revealing=String(guessRevealing);
   if(choice){button.dataset.choice=choice;}else delete button.dataset.choice;
   if(check&&!choice){button.dataset.matched=String(check.matched);button.dataset.actual=check.actual;
    button.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M27 10C23 2 7 3 4 13S7 29 18 28S31 19 27 10Z"/>'+(check.matched?'<path d="m9 16 5 5 9-11"/>':'<path d="m16 9-1 10m0 5h.1"/>')+'</svg>';
   }else {delete button.dataset.matched;delete button.dataset.actual;if(!choice)button.textContent='?';}
   const topic=target==='stock'?'有没有剩货':'本期生产账户增不增',states={empty:'无剩货',left:'有剩货',up:'本期增加','not-up':'本期没有增加'};
   const verdict=check&&!choice?'刚才猜'+states[check.choice]+'，实际'+states[check.actual]+'。':'',label='预测下一招：'+topic+'。'+(choice?'已选'+states[choice]+'；再点切换或取消。':verdict+'点一下猜一猜。');
   button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-pressed',String(!!choice));
  }
  button.onclick=function(){const choice=nextGuess(target,guessDraft[target]);if(choice)guessDraft[target]=choice;else delete guessDraft[target];
   if(guessResult){guessResult={checks:guessResult.checks.filter(g=>g.target!==target)};if(!guessResult.checks.length)guessResult=null;}draw();};
  draw();return button;
 }
 function el(tag,text,parent,cls){const n=document.createElement(tag);n.textContent=text||'';n.className=cls||'';parent.appendChild(n);StreetArt.decorateMoney(n);return n;}
 function action(c,parent,label,a,cls){const b=el('button',label,parent,cls||'secondary');b.type='button';b.onclick=function(){if(a.type==='RESTART'){guessDraft={};guessPending=null;guessResult=null;guessRevealing=false;}captureGuess(c,a);c.send({type:'REMEDY',action:a});};return b;}
 function host(c,parent,label,type){const b=el('button',label,parent,'secondary');b.type='button';b.onclick=function(){c.send({type:type});};return b;}
 function image(parent,src,cls){const i=document.createElement('img');i.src=src;i.alt='';i.className=cls||'';parent.appendChild(i);return i;}
 function characterFrame(src,atlas,key){const f=atlas.frames[key].frame,size=atlas.meta.size;return '<svg viewBox="'+[f.x,f.y,f.w,f.h].join(' ')+'" width="120" height="140"><image href="'+src+'" width="'+size.w+'" height="'+size.h+'"/></svg>';}
 function householdFigure(svg,mood){
  svg.innerHTML=characterFrame(TRUST_ASSETS.bakery.body,TRUST_ASSETS.bakery.bodyAtlas,'body0000')+(mood==='worried'?characterFrame(TRUST_ASSETS.bakery.nervous,TRUST_ASSETS.bakery.nervousAtlas,'face_nervous0008'):characterFrame(TRUST_ASSETS.bakery.face,TRUST_ASSETS.bakery.faceAtlas,mood==='happy'?'face0006':'face0000'));svg.dataset.expression=mood;
 }
 function character(parent,boss,happy,expression){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 120 140');svg.setAttribute('aria-hidden','true');svg.classList.add('remedy-person');
  if(boss)svg.innerHTML=characterFrame(TRUST_ASSETS.bakery.hat,TRUST_ASSETS.bakery.hatAtlas,'hatguy0000');else householdFigure(svg,expression|| (happy?'happy':'ready'));
  if(expression)svg.dataset.expression=expression;parent.appendChild(svg);return svg;
 }
 root.WorkshopPeople={character:character};
 // The opponent's third-turn trials all start after the same two turns. They
 // are alternative timelines, NOT extra days in a winning/losing streak.
 function producerReaction(account){
  const r=account.display;
  if(!r||!r.cashChange)return {mood:'ready',streak:0};
  const prefix=account.reports.slice(0,r.round-1);if(r.round===4&&account.followupBase)prefix[2]=account.followupBase;
  const sign=Math.sign(r.cashChange),path=prefix.concat(r);
  let streak=0;for(let i=path.length-1;i>=0&&Math.sign(path[i].cashChange)===sign;i--)streak++;
  return {mood:sign>0?(streak>1?'delighted':'pleased'):(streak>1?'distressed':'worried'),streak:streak};
 }
 function producerCharacter(parent,reaction){
  const svg=character(parent,true,false);svg.dataset.expression=reaction.mood;
  // Preserve the original hat, monocle, moustache and body. Only the exposed
  // eye/eyebrow and mouth change; these vector poses are this adaptation's art.
  const faces={
   pleased:'<path d="M49 63q4-6 8 0M57 80q6 4 12 0"/>',
   delighted:'<path d="M48 63q5-9 10 0M57 78q6 13 12 0Z"/><path d="M46 53l10-2"/>',
   worried:'<path d="M48 55l10 4M51 64h4M58 82q5-5 11-1"/>',
   distressed:'<path d="M47 54l11 5M51 64h4M57 83q7-8 13-1M39 55q-5 7 0 9q5-2 0-9Z"/>',
  };
  if(faces[reaction.mood])svg.insertAdjacentHTML('beforeend','<g class="remedy-owner-face"><path d="M44 48h27v23H44Z" fill="white"/><g fill="none" stroke="#666" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">'+faces[reaction.mood]+'</g></g>');
  return svg;
 }
 function adviserCharacter(parent,id){
  const person=character(parent,id==='consumption',id==='exports');person.dataset.adviser=id;
  if(id==='investment')person.insertAdjacentHTML('beforeend','<g fill="none" stroke="#666" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M42 57h16v12H42Zm22 0h16v12H64Zm-6 5h6m-24-3-6-2m48 2 5-2"/><path d="M54 100h12l-6 8-5 17 5 5 5-5-5-17Z"/></g>');
  if(id==='exports')person.insertAdjacentHTML('beforeend','<g fill="white" stroke="#666" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M36 43q25-17 50 0l-4 7H39Z M34 51h53M50 101l10 7 10-7-8 14-2-7-5 15Z"/></g>');
  const prop=el('span','',parent,'remedy-adviser-prop');prop.setAttribute('aria-hidden','true');prop.innerHTML=advisers[id].prop==='ship'?'<svg viewBox="0 0 100 90"><g fill="white" stroke="#666" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M10 45h80L74 67H26ZM30 44V25h38v19M49 25V10"/><path d="M6 79q10-8 20 0t20 0t20 0t20 0" fill="none"/></g></svg>':StreetArt.icon(advisers[id].prop);
 }
 function receipt(parent,r){
  const details=el('details','',parent,'remedy-receipt');el('summary','看看细账',details);
  el('p','做出'+r.made+'份，卖出'+r.sold+'份，剩货'+r.stock+'份。',details,'small');
  const list=el('ul','',details);r.payments.forEach(function(p){el('li',p.reason+' · '+p.amount+'枚',list);});
  const debt=r.debtAccount;
  if(debt&&(debt.openingPrincipal||debt.openingInterest||debt.borrowed)){
   const account=el('dl','',details,'remedy-debt-account');account.dataset.testid='remedy-debt-account';
   [['期初本金',debt.openingPrincipal],['期初未付利息',debt.openingInterest],['本期借入',debt.borrowed],['本期计息',debt.interestCharged],['归还本金',debt.principalRepaid],['支付利息',debt.interestPaid],['期末本金',debt.closingPrincipal],['期末未付利息',debt.closingInterest]].forEach(function(row){el('dt',row[0],account);el('dd',row[1]+'枚',account);});
  }
  const ownerPaid=r.payments.filter(p=>p.from==='shop'&&p.to==='owners').reduce((n,p)=>n+p.amount,0);
  el('p','生产账户变化 '+(r.cashChange>=0?'＋':'')+r.cashChange+'枚。销售 '+r.sold+' − 工资 '+r.wages+' − 生产维护 '+r.costs+' − 运费 '+r.transport+(ownerPaid?' − 业主领取 '+ownerPaid:'')+' = '+r.cashChange+'。这是本局现金变化，不是单家企业净利润或剩余价值。',details,'small');
  return details;
 }
 function meter(parent,label,value,max,unit,kind,start){
  const box=el('div','',parent,'remedy-status '+kind);el('span',label,box);el('strong',value+unit,box);
  const bar=el('div','',box,'remedy-meter');bar.setAttribute('role','meter');bar.setAttribute('aria-label',label);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(Math.max(1,max,value)));bar.setAttribute('aria-valuenow',String(value));
  const fill=el('span','',bar),ceiling=Math.max(1,max,value);fill.style.width=(value/ceiling*100)+'%';
  if(Number.isInteger(start)&&start>=0&&start<=ceiling){bar.dataset.start=String(start);fill.style.setProperty('--meter-from',start/ceiling*100+'%');}
  return box;
 }
 // Show the actual period opening: turn four follows its chosen third turn;
 // a same-period retry never starts from the last rendered alternative.
 function priorReport(account){const r=account.display;return r?.round===4&&!account.flow?account.followupBase:r?account.reports[r.round-2]:null;}
 function meterOpening(account){
  const r=account?.display;if(!r)return null;
  const before=r.round>1?priorReport(account)?.world:account.opening;
  if(!before||before.round!==r.round-1||before.stock!==r.stock-r.newStock||before.cash.shop!==r.world.cash.shop-r.cashChange)return null;
  return {stock:before.stock,cash:before.cash.shop};
 }
 // One tick is the original 60-coin working fund. Keep a spare tick at the
 // opening so earnings visibly fill the ruler instead of redefining "full".
 function cashRuler(...values){return Math.max(120,Math.ceil(Math.max(0,...values)/60)*60);}
 // Both impacts are changes within this funded period, not a score or the
 // difference between alternative third-turn trials. Cash is not profit.
 function turnEffects(r){
  if(!r)return null;
  function effect(amount,unit,topic){
   const direction=amount>0?'grow':amount<0?'shrink':'steady';
   return {amount:amount,direction:direction,text:amount?(amount>0?'＋':'−')+Math.abs(amount)+unit:'不变',description:'本期'+topic+(amount>0?'增加':amount<0?'减少':'没有增减')+(amount?Math.abs(amount)+unit:'')};
  }
  const stock=effect(r.newStock,'份','库存'),cash=effect(r.cashChange,'枚','生产账户');
  stock.description+='；做出'+r.made+'份，卖出'+r.sold+'份。';
  return {stock:stock,cash:cash};
 }
 // An empty shelf is a local result, not a policy score. No production must
 // never earn the same celebratory mark as actually producing and selling.
 function shelfState(r){
  if(!r)return {kind:'ready',caption:'待开工'};
  if(r.stock>0)return {kind:'stocked',caption:''};
  if(r.made>0&&r.sold>0)return {kind:'cleared',caption:'卖完！'};
  if(r.sold>0)return {kind:'old-cleared',caption:'旧货卖完'};
  return {kind:'idle',caption:r.made?'货架空了':'没开工'};
 }
 // A short battle cry replaces the producer label during a real new move.
 // Never cheer an unfunded loan, missing equipment or an unshipped order.
 function moveCue(route,r){
  if(!r)return null;
  if(!r.made)return {text:'本期停工…',kind:'idle'};
  const base=r.control.outlook==='adverse'?10:r.control.outlook==='supported'?30:20;
  const landed=route==='consumption'?(r.control.mode==='credit'?creditFlows(r).borrowed>0:r.wages>base):route==='investment'?r.investment>0:r.exports>0;
  return landed?{text:modes[route].find(m=>m[0]===r.control.mode)[1]+'！',kind:'move'}:{text:r.control.dose?'没使出来…':'照常经营！',kind:'idle'};
 }
 function showTurnEffect(parent,effect,kind){
  const line=el('small','本期 ',parent,'remedy-turn-delta');line.dataset.kind=kind;line.dataset.direction=effect.direction;
  line.title=effect.description;line.setAttribute('aria-label',effect.description);
  const value=el('span',effect.text,line,'remedy-delta-value');value.dataset.amount=String(effect.amount);return line;
 }
 function turnPrompt(route,round,r){
  if(!round)return '做50份，平常卖40份。试着清货！';
  if(round===3)return '你怎么接？';
  if(route==='consumption'){
   if(r.debt)return (r.stock?'剩'+r.stock+'份。':r.made?'卖完了！':'这回没出货。')+'下回合先还旧账'+(r.debt+Math.ceil(r.debt/5))+'枚。还借？';
   return r.made&&!r.stock?'这回卖完了！下回合也这样发工资？':'货架还有'+r.stock+'份。钱包还够吗？';
  }
  if(route==='investment'){
   if(r.control.mode==='replace'&&!r.investment)return '这回没换机器。要不要下单？';
   if(r.control.mode==='replace')return r.capacity?'换机没缩产能。下一批货卖给谁？':'旧机换下来了。接着扩产吗？';
   return !r.investment?'这回没添机器。下一招？':r.stock?'货架还有'+r.stock+'份，还添机器？':'卖完了！新机器下回合开工，多做'+r.investment+'份。';
  }
  if(r.exportSupplyShortfall)return '客户肯买，但货不够。多找客户有用吗？';
  if(!r.exports)return '这回没出海。换客户，还是改分量？';
  if(r.control.mode==='diverse')return '客户分开了，跑腿钱也多了。继续？';
  return r.lostExports?'大客户少买了。还押这一家？':'今天大客户接单。明天也接吗？';
 }
 function householdMood(r){
  if(!r)return 'ready';
  const basket=r.control.outlook==='supported'?40:30,wanted=Math.min(basket,r.sold+r.stock);
  const bought=r.payments.filter(p=>p.from==='households'&&p.to==='shop'&&p.reason==='家庭购物').reduce((sum,p)=>sum+p.amount,0);
  return bought<wanted?'worried':wanted<basket?'ready':'happy';
 }
 function creditFlows(r){
  return {borrowed:r?r.payments.filter(p=>p.from==='bank'&&p.to==='households'&&p.reason==='借款').reduce((sum,p)=>sum+p.amount,0):0,
   repaid:r?r.payments.filter(p=>p.from==='households'&&p.to==='bank'&&p.reason==='还本付息').reduce((sum,p)=>sum+p.amount,0):0};
 }
 // Reconstruct the household's funded path, not an extra simulation or a
 // purchase forecast. Third-turn trials each have their own unchanged prefix.
 function householdTimeline(r){
  if(!r)return {opening:0,closing:0,wanted:30,bought:0,events:[]};
  const transfers=r.payments.filter(p=>p.from==='households'||p.to==='households'),closing=r.world.cash.households;
  let balance=closing-transfers.reduce((sum,p)=>sum+(p.to==='households'?p.amount:-p.amount),0);
  const opening=balance,events=[];
  for(const p of transfers){
   const incoming=p.to==='households';balance+=incoming?p.amount:-p.amount;
   const kind=p.reason==='工资'?'wages':p.reason==='还本付息'?'repay':p.reason==='借款'?'borrow':p.reason==='家庭购物'?'shopping':'other';
   const text=kind==='shopping'?'买到'+p.amount+'份 · 清单'+(r.control.outlook==='supported'?40:30)+'份':
    (kind==='wages'?'工资到手':kind==='repay'?'先还账单':kind==='borrow'?'再借一点':incoming?'进账':'支付')+' '+p.amount+'枚 → 钱包'+balance+'枚';
   events.push({kind:kind,amount:p.amount,balance:balance,text:text});
  }
  const bought=transfers.filter(p=>p.reason==='家庭购物'&&p.from==='households'&&p.to==='shop').reduce((sum,p)=>sum+p.amount,0),wanted=r.control.outlook==='supported'?40:30;
  if(!events.some(e=>e.kind==='shopping'))events.push({kind:'shopping',amount:0,balance:balance,text:'这回买到0份 · 清单'+wanted+'份'});
  return {opening:opening,closing:closing,wanted:wanted,bought:bought,events:events};
 }
 // Keep the consumption lesson on purchasing room and the bill, not profit.
 // Both numbers come from the existing funded household transfers.
 function consumptionFocus(account){
  const r=account.display,story=householdTimeline(r);
  const due=r?.debt?r.debt+Math.ceil(r.debt/5):0;
  let line='想多卖一点，先让顾客买得起。';
  if(r){
   if(r.creditStopped)line='旧账没还完。银行：先别借了。';
   else if(r.repayment)line='工资先还账，剩下的才能买东西。';
   else if(story.bought<Math.min(story.wanted,r.sold+r.stock))line='有货，也想买。就是钱不够。';
   else if(story.bought<story.wanted)line='这回货没备够，不能只看钱包。';
   else line=r.debt?'明天还有账单。':'没有新借款。';
   if(r.control.outlook==='adverse')line='底薪减半。'+line;
  }
  return {bought:story.bought,wanted:story.wanted,due:due,debt:r?.debt??0,repayment:r?.repayment??0,line:line};
 }
 root.ConsumptionFocus=consumptionFocus;
 function consumptionForecast(r,outlook){
  const bought=householdTimeline(r).bought;
  return (r.repayment?'先还'+r.repayment+'枚，买到'+bought+'份。':'这回买到'+bought+'份。')+
   {adverse:'下回合底薪减半。',normal:'下回合照常经营。',supported:'下回合收入涨了。'}[outlook];
 }
 root.ConsumptionForecast=consumptionForecast;
 function cancelFeedback(){if(feedbackStop)feedbackStop();}
 // A transfer-stage face follows funded buying room, not the final empty
 // wallet after successful shopping. The icon is the existing pooled wallet.
 function householdStep(event,story,r){
  const buyingRoom=Math.min(story.wanted,r.sold+r.stock),shopping=event.kind==='shopping';
  const mood=shopping?householdMood(r):!buyingRoom?'ready':event.balance>=buyingRoom?'happy':'worried';
  const cue=shopping?'买到'+event.amount+'份':({wages:'工资到手',repay:'先还账单',borrow:'再借一点',other:'收支到账'}[event.kind]);
  return {mood:mood,wallet:event.balance,cue:cue};
 }
 function playHousehold(message,r,animate){
  cancelFeedback();if(!message||!message.isConnected||!r)return;
  const story=householdTimeline(r),finalHTML=message.innerHTML,line=message.parentElement,timers=[],scene=message.closest('.remedy-battle').querySelector('.remedy-scene'),wallet=scene.querySelector('.remedy-wallet'),figures=scene.querySelectorAll('.remedy-buyers>.remedy-person'),originalTitle=message.title,keepForecast=message.dataset.forecast==='true'||scene.dataset.focus==='consumption',cashCue=wallet?.querySelector('.remedy-cash-cue');
  line.style.minHeight=line.getBoundingClientRect().height+'px';
  function stop(){timers.forEach(clearTimeout);if(message.isConnected){message.innerHTML=finalHTML;message.title=originalTitle;delete message.dataset.cashStep;delete message.dataset.wallet;delete message.dataset.amount;line.style.minHeight='';if(wallet){wallet.hidden=true;wallet.dataset.active='false';}if(cashCue){cashCue.hidden=true;cashCue.textContent='';}figures.forEach(p=>householdFigure(p,householdMood(r)));}if(feedbackStop===stop)feedbackStop=null;}
  feedbackStop=stop;
  function show(event){
   if(!message.isConnected){stop();return;}
   message.dataset.cashStep=event.kind;message.dataset.wallet=String(event.balance);message.dataset.amount=String(event.amount);if(!keepForecast)message.textContent='';
   const step=householdStep(event,story,r);if(!keepForecast)message.title=event.text;
   if(wallet){wallet.hidden=false;wallet.dataset.active='true';wallet.dataset.wallet=String(step.wallet);wallet.querySelector('output').textContent=step.wallet+'枚';StreetArt.decorateMoney(wallet);wallet.setAttribute('aria-label','家庭合计钱包'+step.wallet+'枚');}figures.forEach(p=>householdFigure(p,step.mood));
   if(keepForecast){if(cashCue){cashCue.hidden=false;cashCue.textContent=step.cue;}return;}
   const symbol=el('span','',message,'remedy-sequence-symbol');symbol.setAttribute('aria-hidden','true');
   symbol.innerHTML=event.kind==='shopping'?'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 11h20l-2 17H8ZM11 11V7a5 5 0 0 1 10 0v4"/>'+ (event.amount?'<path d="M12 19l3 3 6-6"/>':'<path d="M12 20h8"/>')+'</svg>':'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h23v17H4ZM4 9V5h18v4M20 15h8v7h-8Z"/>'+ (event.balance?'<circle cx="24" cy="18.5" r=".8" fill="currentColor"/>':'')+'</svg>';
   el('span',step.cue,message);
  }
  if(!animate){
   const fragments=story.events.filter(e=>e.kind!=='shopping').map(e=>({wages:'工资',repay:'还账',borrow:'借款',other:'收支'}[e.kind])+e.amount+'枚');
   if(story.opening)fragments.unshift('原有'+story.opening+'枚');
   message.dataset.cashStep='summary';if(!keepForecast){message.title=fragments.concat('买到'+story.bought+'份').join(' → ');message.textContent='买到'+story.bought+'份 · 清单'+story.wanted+'份';}else if(cashCue){cashCue.hidden=false;cashCue.textContent='买到'+story.bought+'份';}
   if(wallet){wallet.hidden=false;wallet.dataset.active='true';wallet.dataset.wallet=String(story.closing);wallet.querySelector('output').textContent=story.closing+'枚';StreetArt.decorateMoney(wallet);wallet.setAttribute('aria-label','家庭合计钱包'+story.closing+'枚');}
   timers.push(setTimeout(stop,2400));return;
  }
  story.events.forEach((event,i)=>{if(!i)show(event);else timers.push(setTimeout(()=>show(event),i*moneyBeat));});
  timers.push(setTimeout(stop,story.events.length*moneyBeat+200));
 }
 function investmentState(account){
  const r=account.display,previous=priorReport(account),before=previous?previous.world:account.opening;
  const bought=r?r.payments.filter(p=>p.from==='buyers'&&p.to==='shop'&&p.reason==='新增设备订单').reduce((sum,p)=>sum+p.amount,0):0;
  const activeCapacity=before.capacity,pendingCapacity=bought?Math.max(0,r.capacity-activeCapacity):0;
  const saving=bought?Math.max(0,Math.max(10,15-before.efficiency)-Math.max(10,15-r.world.efficiency)):0;
  return {bought: bought,activeCapacity:activeCapacity,activeEfficiency:before.efficiency??0,nextCapacity:r?r.capacity:activeCapacity,saving:saving,pendingCapacity:pendingCapacity,
   maintenance:Math.max(0,Math.ceil((activeCapacity+pendingCapacity)/5)-Math.ceil(activeCapacity/5)),
   booting:!!(r&&previous&&previous.investment),running:!!(r&&r.made)};
 }
 function investmentCheck(s){
  if(!s.bought)return '这回没新设备。';
  if(s.pendingCapacity)return '下期多做'+s.pendingCapacity+'份，维护多'+s.maintenance+'枚。';
  return s.saving?'下期少花'+s.saving+'枚，不多做。':'设备到了，成本没再降。';
 }
 function cancelInspection(){if(inspectionStop)inspectionStop();}
 function showInspection(button,parent,quote){
   cancelInspection();cancelFeedback();
   const message=parent.closest('.remedy-battle').querySelector('.remedy-message');if(!message)return;
   const baseline=message.innerHTML,narration=message.closest('.remedy-narration'),minHeight=narration.style.minHeight;
   narration.style.minHeight=narration.getBoundingClientRect().height+'px';
   function stop(){clearTimeout(timer);if(message.isConnected){message.innerHTML=baseline;delete message.dataset.inspecting;narration.style.minHeight=minHeight;}button.removeAttribute('data-checked');if(inspectionStop===stop)inspectionStop=null;}
   message.dataset.inspecting='true';message.textContent=quote;StreetArt.decorateMoney(message);button.dataset.checked='true';
   inspectionStop=stop;const timer=setTimeout(stop,1600);
 }
 function inspect(button,parent,quote){
  button.onclick=function(){showInspection(button,parent,quote);};
 }
 // Only actually paid equipment/downstream orders make it onto this clipboard.
 // The person represents the pooled buyers account, not a newly created wallet.
 function equipmentBuyer(account){
  const r=account.display;
  function orders(report){return report?report.payments.filter(p=>p.from==='buyers'&&p.to==='shop'&&['原有设备订单','新增设备订单','已落实的下游订单'].includes(p.reason)).reduce((sum,p)=>sum+p.amount,0):0;}
  const total=orders(r),previous=priorReport(account),prior=previous?orders(previous):null;
  return {total:total,prior:prior,status:!r?'ready':!total?'none':prior!==null&&total<prior?'less':'ordered'};
 }
 function buyerQuote(s,account){
  if(s.status==='ready')return '我来买设备，还没下单。';
  if(s.status==='none')return '这回没成交。喊大声也没用。';
  if(s.status==='less')return '上回买'+s.prior+'份，这回买'+s.total+'份。';
  if(!investmentState(account).bought)return '这回买'+s.total+'份，没添新设备。';
  return '这回买'+s.total+'份，'+(account.display.control.mode==='replace'?'只换旧机器。':'下回合才开工！');
 }
 function buyerCharacter(parent,account,animate){
  const s=equipmentBuyer(account),button=el('button','',parent,'remedy-equipment-buyer');button.type='button';button.dataset.status=s.status;button.dataset.orders=String(s.total);button.dataset.testid='remedy-equipment-buyer';button.setAttribute('aria-label','看看下游客户');button.title='下游客户 · '+(!account.display?'还没下单':'本期实际买'+s.total+'份');
  const person=character(button,false,false,s.status==='less'?'worried':'ready');
  person.insertAdjacentHTML('beforeend','<g fill="white" stroke="#666" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m55 101 5 7 5-7m-5 7-4 17 4 5 4-5Z"/><path d="M29 99h21v29H29Z M35 96h9v6h-9Z M34 109h11m-11 6h11m-11 6h7"/></g>');
  el('small',account.display?'订'+s.total+'份':'下游客户',button);button.dataset.animate=String(animate);inspect(button,parent,buyerQuote(s,account));
 }
 function exportState(r){
  if(!r)return {mode:null,requested:0,quota:0,shipped:0,transport:0,shortfall:0,limited:0,status:'ready'};
  const requested=r.control.dose*5,shipped=r.payments.filter(p=>p.from==='foreign'&&p.to==='shop'&&p.reason==='海外订单').reduce((sum,p)=>sum+p.amount,0);
  const transport=r.payments.filter(p=>p.from==='shop'&&p.to==='suppliers'&&p.reason==='运费与开拓市场').reduce((sum,p)=>sum+p.amount,0),limited=Math.max(0,requested-r.exportQuota);
  return {mode:r.control.mode,requested:requested,quota:r.exportQuota,shipped:shipped,transport:transport,shortfall:r.exportSupplyShortfall,limited:limited,
   status:!requested?'idle':!r.exportQuota?(r.world?.cash.foreign===0&&!(r.control.outlook==='adverse'&&r.control.mode==='single')?'unfunded':'stopped'):r.exportSupplyShortfall?'shortage':limited?'reduced':shipped?'traded':'idle'};
 }
 function exportCheck(s){
  if(s.status==='ready')return '还没接单，船先歇着。';
  if(!s.requested)return '没接海外单。船先歇着。';
  if(s.shortfall)return '肯买'+Math.min(s.requested,s.quota)+'份，只发'+s.shipped+'份：缺货。';
  if(s.status==='unfunded')return '客户的本局现款用完了，不是到了日期就停单。';
  if(s.status==='stopped')return s.mode==='single'?'客户停单，船不能当顾客。':'没海外订单，找人也不保证成交。';
  return s.limited?'想卖'+s.requested+'份，卖了'+s.shipped+'份；跑腿'+s.transport+'枚。':'卖'+s.shipped+'份，跑腿'+s.transport+'枚，不是白赚。';
 }
 function exportNetwork(parent,r,animate){
  const s=exportState(r),button=el('button','',parent,'remedy-export-network');button.type='button';button.setAttribute('aria-label','看看本期出口');button.title='点击看看订单和运费';
  button.dataset.status=s.status;button.dataset.mode=s.mode||'none';button.dataset.shipped=String(s.shipped);button.dataset.transport=String(s.transport);button.dataset.quota=String(s.quota);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 200 110');svg.setAttribute('aria-hidden','true');svg.classList.add('remedy-export-map');button.appendChild(svg);
  const active=s.requested>0&&s.quota>0;
  const count=s.mode==='single'?1:3,path=count===3?'M61 78H67M67 78Q78 85 97 82M67 78Q98 93 137 82M67 78Q122 103 177 82':'M61 78H152';button.dataset.customers=String(count);
  svg.innerHTML='<g fill="none" stroke="#666" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path class="remedy-export-route" data-connected="'+active+'" d="'+path+'"/><g class="remedy-export-ship"><path d="M8 69h51L49 86H20ZM22 69V54h22v15M34 54V43M5 95q9-7 18 0t18 0t18 0"/></g></g>';
  for(let k=0;k<count;k++){
   const customer=character(svg,false,false);customer.classList.remove('remedy-person');customer.classList.add('remedy-export-customer');
   // Keep the full original body: cropped, squeezed heads looked like dots.
   customer.setAttribute('x',count===1?'128':String(74+k*40));customer.setAttribute('y','5');customer.setAttribute('width',count===1?'60':'46');customer.setAttribute('height','70');customer.dataset.connected=String(active);customer.style.opacity=s.status==='stopped'?'.35':'1';
  }
  if(s.status==='stopped')svg.insertAdjacentHTML('beforeend','<g class="remedy-export-stop" stroke="#666" stroke-width="3" stroke-linecap="round"><path d="M79 68l20 20m0-20-20 20"/></g>');
  if(s.shipped&&animate)svg.insertAdjacentHTML('beforeend','<g class="remedy-export-cargo"><rect x="-5" y="-5" width="10" height="10" rx="1" fill="white" stroke="#666" stroke-width="2"/><path d="M-3-2h6M0-4v8" stroke="#888"/><animateMotion dur=".7s" begin=".25s" fill="freeze" path="M40 78H107"/></g>');
  el('small',r?'卖'+s.shipped+'份 · 跑腿'+s.transport+'枚':'海外买家',button);inspect(button,parent,exportCheck(s));
 }
 function equipmentArt(account){
  const s=investmentState(account),previous=priorReport(account),count=Math.min(3,1+Math.ceil(s.activeCapacity/10));
  const baseKind=s.activeEfficiency?'upgraded':'old',mode=s.bought?account.display.control.mode:null;
  return {baseKind:baseKind,count:count,mode:mode,outgoingKind:mode==='replace'?baseKind:null,bootIndex:s.booting&&s.running?(previous?.control?.mode==='replace'?0:count-1):-1};
 }
 function machineGroups(parent,account,animate){
  const s=investmentState(account),groups=el('div','',parent,'remedy-machine-groups');groups.dataset.activeCapacity=String(s.activeCapacity);groups.dataset.pendingCapacity=String(s.pendingCapacity);groups.dataset.activeEfficiency=String(s.activeEfficiency);groups.dataset.saving=String(s.saving);
  const live=el('div','',groups,'remedy-machine-live'),machines=el('div','',live,'remedy-machines');
  live.setAttribute('aria-label','本期可用产能'+(50+s.activeCapacity)+'份。机器图标为示意，不是台数。');
  const artState=equipmentArt(account);
  for(let j=0;j<artState.count;j++){const kind=j?'addition':artState.baseKind,m=image(machines,kind==='old'?TRUST_ASSETS.bakery.emptyOldOven:TRUST_ASSETS.street.emptyOven);m.dataset.machineKind=kind;m.dataset.booting=String(j===artState.bootIndex);m.alt=kind==='old'?'本期在用的旧设备':kind==='upgraded'?'前期换好、本期在用的设备':'前期添置、本期在用的设备';}
  el('small',!account.display?'未开工':s.running?'开工':'停机',live);
  if(!s.bought)return;
  const pending=el('button','',groups,'remedy-machine-pending');pending.type='button';pending.setAttribute('aria-label','检查待安装设备');pending.title='刚到的设备，下回合才生效';pending.dataset.effect=s.pendingCapacity?'capacity':s.saving?'cost':'none';pending.dataset.mode=account.display.control.mode;
  const art=el('span','',pending,'remedy-machine-package');
  if(account.display.control.mode==='replace'){const old=image(art,s.activeEfficiency?TRUST_ASSETS.street.emptyOven:TRUST_ASSETS.bakery.emptyOldOven,'remedy-machine-outgoing');old.alt='下期将换下的设备';}
  const arriving=image(art,TRUST_ASSETS.street.emptyOven,'remedy-machine-arriving');arriving.alt='本期刚到、下期才能使用的设备';
  art.insertAdjacentHTML('beforeend','<svg class="remedy-machine-operation" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#666" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'+(account.display.control.mode==='replace'?'<path d="M3 12h17m-6-6 6 6-6 6"/>':'<path d="M12 4v16M4 12h16"/>')+'</svg>');
  art.insertAdjacentHTML('beforeend','<svg class="remedy-install-clock" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="white" stroke="#666" stroke-width="1.7"/><path d="M12 6v6l5 3" fill="none" stroke="#666" stroke-width="1.7" stroke-linecap="round"/></svg>');
  el('small',s.pendingCapacity?'下期＋'+s.pendingCapacity+'份':s.saving?'下期省'+s.saving+'枚':'已到货',pending);
  pending.dataset.animate=String(animate);inspect(pending,parent,investmentCheck(s));
 }
 function moveHint(route,mode,dose){
  const amount=dose*5;
  if(route==='consumption')return mode==='raise'?'店里付 '+amount+'枚':amount?'申请 '+amount+'枚 · 下期还':'不借新钱';
  if(route==='investment')return mode==='expand'?'下期添产能':'不添产能';
  return mode==='single'?'省钱怕停单':'多付跑腿钱';
 }
 function bankFlow(parent,r,animate){
  const bank=el('div','',parent,'remedy-bank');bank.setAttribute('role','img');
  const balance=r?r.world.cash.bank:90;bank.title='银行余额 '+balance+'枚';bank.setAttribute('aria-label',bank.title);
  bank.innerHTML='<svg viewBox="0 0 42 50" aria-hidden="true"><g fill="white" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17 21 6 39 17Z M6 21h30v20H6Z M3 44h36M2 48h38"/><path d="M11 24v13m10-13v13m10-13v13"/></g></svg>';
  const flows=creditFlows(r);if(!flows.borrowed&&!flows.repaid)return;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 92 64');svg.classList.add('remedy-bank-flow');svg.dataset.borrowed=String(flows.borrowed);svg.dataset.repaid=String(flows.repaid);svg.setAttribute('role','img');svg.setAttribute('aria-label','本期银行借出'+flows.borrowed+'枚，家庭归还'+flows.repaid+'枚');
  let drawing='';
  for(const [amount,path,head,kind] of [[flows.borrowed,'M17 48Q42 61 67 48','M58 48l9 0-4 8','borrow'],[flows.repaid,'M67 56Q42 70 17 56','M25 56l-8 0 4 7','repay']]){
   if(!amount)continue;
   drawing+='<path class="remedy-bank-arrow" d="'+path+' '+head+'" fill="none" stroke="#888" stroke-width="1.6" stroke-linecap="round"/>';
   if(animate){const index=householdTimeline(r).events.findIndex(e=>e.kind===kind),delay=Math.max(0,index)*moneyBeat/1000;
    drawing+='<g class="remedy-bank-token" data-payment="'+kind+'" style="--money-delay:'+delay+'s"><circle r="6" fill="#ffe06a" stroke="#cfae25" stroke-width="1.3"/><animateMotion dur=".45s" begin="'+delay+'s" fill="freeze" path="'+path+'"/></g>';
   }
  }
  svg.innerHTML=drawing;bank.appendChild(svg);
 }
 function feedback(route,r){
  if(route==='consumption'){
   if(r.control.mode==='raise'){
    if(r.repayment)return '工资发了，也先还了一笔旧账。';
    if(!r.control.dose)return r.control.outlook==='supported'?'收入长了，货也得有人买。':'招牌换了，工资没加。';
    if(r.control.outlook==='adverse'&&r.wages<=20)return '加薪遇上缩水，钱包还没鼓起来。';
    return '钱包厚一点，才敢多买一点。';
   }
   if(r.creditStopped)return '工资薄了，账单可没变薄。';
   if(r.repayment)return '刚领工资，账单就来排队了。';
   return r.borrowed?'今天买得起。明天还有账单。':'没借到钱，顾客可不会自动冒出来。';
  }
  if(route==='investment')return !r.investment?'这回没买到机器。旧的还在。':r.control.mode==='replace'?(r.capacity?'旧机换了，已经扩出的产能还在。':'换旧机，不是又开一家厂。'):r.stock?'机器有了。剩货也有了。':'订单来了！机器下回合才开工。';
  if(r.exportSupplyShortfall)return '有订单，没那么多货。别把缺货当滞销。';
  if(!r.control.dose)return '没接海外单，船先歇着。';
  if(r.control.outlook==='adverse'&&r.control.mode==='single')return '船准备好了。大客户：下次吧。';
  if(!r.exports&&r.world?.cash.foreign===0)return '客户想买，本局现款已经用完。';
  return r.control.mode==='diverse'?'多找几家客户，跑腿钱也多了。':r.lostExports?'有船，也得有人下单。':'这单出海了。运费可没游泳回来。';
 }
 function comparisonView(account){
  if(account.followups?.length){
   if(account.followups.length<2)return null;
   const end=account.followups.length-1,base=account.followupBases?.[end];
   const index=account.followups.slice(0,end).findLastIndex((_,i)=>JSON.stringify(account.followupBases?.[i]?.control)===JSON.stringify(base?.control));
   if(index<0)return null;
   const before=account.followups[index],after=account.display,changes=['mode','dose','outlook'].filter(k=>before.control[k]!==after.control[k]);
   return {before,after,changes,fourth:true,stock:after.stock-before.stock,sold:after.sold-before.sold,cash:after.world.cash.shop-before.world.cash.shop};
  }
  if(!account.comparisons.length)return null;
  const after=account.display,before=account.comparisons.slice(0,-1).reverse().find(r=>r.control.outlook===after.control.outlook)??account.thirdBaseline;
  const changes=['mode','dose','outlook'].filter(k=>before.control[k]!==after.control[k]);
  return {before,after,changes,stock:after.stock-before.stock,sold:after.sold-before.sold,cash:after.world.cash.shop-before.world.cash.shop};
 }
 function pathView(account){
  if(account.followups?.length)return null;
  const rounds=account.reports.length,original=account.archives?.find(run=>run.reports.length>=rounds);
  if(!rounds||!original)return null;
  const before=original.reports[rounds-1],after=account.reports[rounds-1];
  const steps=account.reports.map((r,i)=>({round:i+1,fields:['mode','dose','outlook'].filter(k=>r.control[k]!==original.reports[i].control[k])})).filter(s=>s.fields.length);
  if(rounds<3&&!steps.length)return null;
  return {before,after,steps,rounds,stock:after.stock-before.stock,sold:after.sold-before.sold,cash:after.world.cash.shop-before.world.cash.shop};
 }
 // A visual replay needs its actual prefix, too: today's prefix would invent
 // old machine capacity and winning streaks in an archived arrangement.
 function previousView(account,result){
  if(!account?.display||!result?.before||result.after!==account.display)return null;
  const before=result.before;let reports;
  if(result.fourth){if(!account.followups?.includes(before)||!account.followupBase)return null;reports=account.reports.slice(0,2).concat(account.followupBase);}
  else if(result.rounds){const original=account.archives?.find(run=>run.reports[result.rounds-1]===before);if(!original)return null;reports=original.reports.slice(0,result.rounds);}
  else {if(before!==account.thirdBaseline&&!account.comparisons.includes(before))return null;reports=account.reports.slice(0,before.round-1).concat(before);}
  return {...account,display:before,reports:reports};
 }
 function comparisonLabel(result){
  if(result.fourth)return '重打第4回合 · 前三回合不变';
  return result.changes?(result.changes.length?'改了'+result.changes.map(k=>({mode:'招式',dose:'分量',outlook:'条件'}[k])).join('＋')+' · 同一起点重试':'安排没变 · 原结果复现'):
   result.steps.length?(result.rounds<3?'前'+result.rounds+'回合对照':'整局重打')+' · 改了'+result.steps.map(s=>'第'+s.round+'回合'+(s.fields.includes('outlook')?'的条件':'')).join('＋'):'三招没变 · 原结果复现';
 }
 function comparisonScale(result){
  return result?.before&&result.after?{stock:Math.max(1,result.before.sold+result.before.stock,result.after.sold+result.after.stock),cash:cashRuler(result.before.world.cash.shop,result.after.world.cash.shop,result.before.world.cash.shop-result.before.cashChange,result.after.world.cash.shop-result.after.cashChange)}:null;
 }
 function comparisonSubject(result){return result.rounds?'旧安排':result.changes?.some(k=>k!=='mode')?'旧试法':'旧招';}
 function comparisonPreview(route,result){
  const r=result?.before,move=modes[route]?.find(m=>m[0]===r?.control?.mode);if(!move)return '';
  return comparisonSubject(result)+'：'+move[1]+' · '+{normal:'原条件',adverse:'逆风',supported:'顺风'}[r.control.outlook]+'。';
 }
 function cancelPeek(){if(peekStop)peekStop();}
 function comparisonPeek(parent,scene,route,account,result){
  const previous=previousView(account,result);if(!previous)return;
  const subject=comparisonSubject(result),idle='按住看'+subject,button=el('button','',parent,'remedy-comparison'),heading=el('span',idle,button),caption=el('small',comparisonLabel(result),button),before=previous.display;
  button.type='button';button.dataset.testid='remedy-comparison';button.dataset.kind=result.changes?'turn':'path';button.dataset.peeking='false';button.setAttribute('aria-pressed','false');
  const condition={normal:'原条件',adverse:'逆风',supported:'顺风'}[before.control.outlook],move=modes[route].find(m=>m[0]===before.control.mode)[1],description=comparisonLabel(result);
  button.setAttribute('aria-label',idle+'，松开看现在。'+description+'。之前库存'+before.stock+'份，生产账户'+before.world.cash.shop+'枚；现在库存'+result.after.stock+'份，生产账户'+result.after.world.cash.shop+'枚。空格按住，回车切换，Escape返回。');
  button.title='只回看真实记录，不付款、不重演交易';let preview=null,pointer=null,restoreTranscript=null;
  function stop(){
   if(!preview)return;preview.remove();preview=null;scene.classList.remove('remedy-peek-original');scene.removeAttribute('aria-hidden');if(restoreTranscript){restoreTranscript();restoreTranscript=null;}button.dataset.peeking='false';button.setAttribute('aria-pressed','false');heading.textContent=idle;caption.textContent=description;button.style.minHeight='';if(pointer!==null&&button.hasPointerCapture(pointer))button.releasePointerCapture(pointer);pointer=null;
   root.removeEventListener('pointerup',release);root.removeEventListener('pointercancel',stop);root.removeEventListener('blur',stop);document.removeEventListener('keydown',escape);document.removeEventListener('visibilitychange',visibility);if(peekStop===stop)peekStop=null;
  }
  function escape(e){if(e.key==='Escape'){e.preventDefault();stop();}}
  function visibility(){if(document.hidden)stop();}
  function release(){if(button.dataset.hold==='true')stop();}
  function start(hold){
   if(preview){button.dataset.hold=String(hold);heading.textContent=hold?'松开看现在':'再按看现在';return;}cancelPeek();cancelInspection();const narration=scene.parentElement.querySelector('.remedy-narration'),minHeight=narration.style.minHeight;narration.style.minHeight=narration.getBoundingClientRect().height+'px';cancelFeedback();button.style.minHeight=button.getBoundingClientRect().height+'px';button.dataset.hold=String(hold);
   const message=narration.querySelector('.remedy-message'),baseline=message.innerHTML;message.dataset.peek='previous';message.textContent=comparisonPreview(route,result);
   restoreTranscript=function(){if(message.isConnected){message.innerHTML=baseline;delete message.dataset.peek;narration.style.minHeight=minHeight;}};
   preview=board(scene.parentElement,route,previous,false,false,comparisonScale(result));preview.classList.add('remedy-preview-scene');preview.dataset.peek='true';preview.setAttribute('role','group');preview.setAttribute('aria-label','之前的真实记录 · '+move+' · '+condition);preview.querySelectorAll('button').forEach(b=>{b.disabled=true;b.tabIndex=-1;});
   scene.parentElement.insertBefore(preview,scene);scene.classList.add('remedy-peek-original');scene.setAttribute('aria-hidden','true');button.dataset.peeking='true';button.setAttribute('aria-pressed','true');heading.textContent=hold?'松开看现在':'再按看现在';caption.textContent=condition+' · 分量'+before.control.dose*5;peekStop=stop;
   root.addEventListener('pointerup',release);root.addEventListener('pointercancel',stop);root.addEventListener('blur',stop);document.addEventListener('keydown',escape);document.addEventListener('visibilitychange',visibility);
  }
  button.onpointerdown=function(e){if(e.button!==0)return;e.preventDefault();button.focus({preventScroll:true});start(true);pointer=e.pointerId;button.setPointerCapture(pointer);};
  button.onkeydown=function(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();if(e.repeat)return;if(e.key===' ')start(true);else if(preview)stop();else start(false);}};
  button.onkeyup=function(e){if(e.key===' '){e.preventDefault();stop();}};
  button.onclick=function(e){if(e.detail===0){if(preview)stop();else start(false);}};
  button.onblur=stop;button.oncontextmenu=e=>e.preventDefault();
 }
 // Animate a newly executed turn/trial, not reopening a save or restoring an
 // earlier prefix. A rewind is a new experiment, not cash paid twice.
 function didOperate(previous,next){
  if(!previous||previous.route!==next.route)return false;
  if(next.history.length>previous.history.length)return JSON.stringify(next.history.slice(0,previous.history.length))===JSON.stringify(previous.history);
  return next.history.length===3&&JSON.stringify(next.history)===JSON.stringify(previous.history)&&(JSON.stringify(next.comparisons)!==JSON.stringify(previous.comparisons)||JSON.stringify(next.followups??[])!==JSON.stringify(previous.followups??[]));
 }
 function tradeoff(result){
  const prefix='比'+comparisonSubject(result)+'：';
  const later=[];
  if(result.before&&result.after){
   const capacity=result.after.capacity-result.before.capacity,debt=result.after.debt-result.before.debt;
   if(capacity)later.push('下期产能'+(capacity>0?'多':'少')+Math.abs(capacity)+'份');
   if(debt)later.push((debt>0?'多欠':'少欠')+Math.abs(debt)+'枚');
   const cost=r=>Number.isInteger(r.capacity)&&Number.isInteger(r.world?.efficiency)?Math.max(10,15-r.world.efficiency)+Math.ceil(r.capacity/5):null;
   const beforeCost=cost(result.before),afterCost=cost(result.after);
   if(beforeCost!==null&&afterCost!==null&&afterCost!==beforeCost)later.push((capacity?'开工':'下期开工')+(afterCost>beforeCost?'多花':'少花')+Math.abs(afterCost-beforeCost)+'枚');
  }
  if(result.stock||result.cash){
   const stock=result.stock?(result.stock>0?'多剩':'少剩')+Math.abs(result.stock)+'份':'剩货一样',cash=result.cash?'钱'+(result.cash>0?'多':'少')+Math.abs(result.cash)+'枚':'钱没变';
   // Keep the default transcript short: present tradeoffs plus the leading
   // carryover. The equipment inspection retains its full cost breakdown.
   return prefix+stock+'，'+cash+(later.length?'；'+later[0]:'')+'。';
  }
  if(later.length)return prefix+'眼前一样，'+later.join('、')+'。';
  return prefix+'眼前没变。再试一招？';
 }
 function battleBeat(account){return account.reports.length===2?'anticipate':account.reports.length<3?'play':!account.riskSeen?'incoming':!account.canContinue?'respond':'free';}
 function battleMessage(route,account,hasArchive){
  const r=account.display,round=account.reports.length,beat=battleBeat(account);
  if(!r)return hasArchive?'换个开局，明天会不同吗？':turnPrompt(route,0,null);
  if(beat==='play'||beat==='anticipate')return turnPrompt(route,round,r);
  if(account.followups?.length===1)return '第4回合：'+feedback(route,r);
  const result=account.followups?.length||account.comparisons.length?comparisonView(account):pathView(account);
  return beat==='free'&&result?tradeoff(result):feedback(route,r);
 }
 const replies={consumption:{title:'工资缩水',quote:'工资缩水，钱包撑得住吗？',icon:'cash'},investment:{title:'设备订单缩水',quote:'设备客户：这回少买点。',icon:'ovens'},exports:{title:'大客户停单',quote:'大客户：这回先不买了。',icon:'clothes'}};
 function replyQuote(route,r){return route==='consumption'&&r.debt?'工资缩水，旧账照样来。':replies[route].quote;}
 // A future test condition, not a receipt or an automatic crisis. Reading or
 // choosing it cannot pay, operate, or complete the experiment.
 function forecast(route,r,outlook){
  const quote=outlook==='adverse'?{consumption:r?.debt?'底薪减半，旧账不打折。':'底薪减半，购物也得省。',investment:'设备客户：这回少买点。',exports:'大客户：这回先不买了。'}[route]:outlook==='supported'?{consumption:'收入涨了，试试看？',investment:'下游订单落实了。',exports:'海外订单稳住了。'}[route]:'第三招，照常开门？';
  return {heading:'下一招 · '+{adverse:'试一次逆风',normal:'按原条件',supported:'试一次顺风'}[outlook],quote:quote,mood:outlook==='adverse'?'worried':outlook==='supported'?'happy':'ready'};
 }
 root.RemedyFeedback={choice:menuChoice,forecast:forecast,line:feedback,prompt:turnPrompt,message:battleMessage,householdMood:householdMood,creditFlows:creditFlows,householdTimeline:householdTimeline,householdStep:householdStep,investmentState:investmentState,equipmentArt:equipmentArt,investmentCheck:investmentCheck,equipmentBuyer:equipmentBuyer,buyerQuote:buyerQuote,exportState:exportState,exportCheck:exportCheck,moveHint:moveHint,producerReaction:producerReaction,comparison:comparisonView,path:pathView,previousView:previousView,comparisonLabel:comparisonLabel,comparisonScale:comparisonScale,comparisonSubject:comparisonSubject,comparisonPreview:comparisonPreview,meterOpening:meterOpening,cashRuler:cashRuler,turnEffects:turnEffects,shelfState:shelfState,moveCue:moveCue,tradeoff:tradeoff,beat:battleBeat,reply:replyQuote,didOperate:didOperate,nextGuess:nextGuess,gradeGuess:gradeGuess};
 function archiveRecords(parent,account,route){
  if(!account.archives?.length)return;
  const archives=el('details','',parent,'remedy-path-records');el('summary','原记录 · '+account.archives.length+'套安排',archives);let built=false;
  archives.ontoggle=function(){if(!archives.open||built)return;built=true;
   account.archives.forEach(function(run,i){const group=el('details','',archives);el('summary','第'+(i+1)+'套'+(run.reports.length<3?' · 只试到第'+run.reports.length+'回合':''),group);let loaded=false;group.ontoggle=function(){if(!group.open||loaded)return;loaded=true;
    run.reports.concat(run.comparisons,run.followups??[]).forEach(function(r){const name=modes[route].find(m=>m[0]===r.control.mode)[1];el('p','回合'+r.round+' · '+{normal:'原条件',adverse:'逆风',supported:'顺风'}[r.control.outlook]+' · '+name+' · 分量'+r.control.dose*5,group,'small');el('p','剩货'+r.stock+'份 · 账户'+r.world.cash.shop+'枚',group);receipt(group,r);});
   };});
  };
 }
 // After period three, the command revises that same trial, not another day.
 // Only the currently displayed trial is an echo; earlier trials stay revisitable.
 function isEcho(lab,mode,outlook){
  if(lab?.history?.length!==3)return false;
  const current=lab.followups?.at(-1)?.control??lab.comparisons?.at(-1)??lab.history.at(-1);
  return !!current&&current.mode===mode&&current.dose===lab.dose&&current.outlook===outlook;
 }
 root.RemedyFeedback.isEcho=isEcho;
 // These are intentions on a move card, never receipts or an advance result.
 function moveArt(route,mode){
  const person='<circle cx="61" cy="42" r="6"/><path d="m57 49-3 13h6l1-5 1 5h6l-4-13"/>';
  const oven='<path d="M7 34h23v29H7Z M11 43h15v15H11Z M11 38h2m4 0h2m4 0h2"/>';
  let art='';
  if(route==='consumption'){
   art=(mode==='credit'?'<path d="m6 19 14-9 15 9Z M9 23v16h23V23M7 42h27M14 25v10m6-10v10m6-10v10"/>':'<path d="M7 23h26v19H7Z M6 23l4-9h20l4 9M11 27v6h8v-6m5 0v15"/>')+person+'<path d="M35 30q19-11 24 3m-6-1 6 1 1-6"/><circle class="remedy-move-motion" cx="43" cy="24" r="4"/>'+(mode==='credit'?'<path stroke-dasharray="2 3" d="M52 59Q29 71 21 47m-3 6 3-6 5 4"/>':'');
  }else if(route==='investment'){
   art=oven+'<g class="remedy-move-motion"><path d="M49 8h24v29H49Z M53 19h16v13H53Z M53 13h2m5 0h2m5 0h2"/></g>'+(mode==='expand'?'<path d="M39 18v13m-6-6h12M34 49h19m-5-5 5 5-5 5"/>':'<path d="M28 22h13m-5-5 5 5-5 5M50 49H36m5-5-5 5 5 5"/>');
  }else{
   art='<path d="M5 51h28l-6 10H11Z M18 50V34l12 13H18"/>';
   if(mode==='single')art+='<g class="remedy-move-motion"><circle cx="62" cy="17" r="8"/><path d="m55 27-3 16h8l2-6 2 6h8l-4-16"/></g><path d="M31 43q2-26 19-26m-5-4 5 4-4 5"/>';
   else art+='<g class="remedy-move-motion"><circle cx="51" cy="13" r="5"/><circle cx="68" cy="32" r="5"/><circle cx="57" cy="54" r="5"/></g><path d="m47 20-2 8h11l-2-8m10 19-2 8h11l-2-8m-18 22-2 7h11l-2-7M30 43l8-27 6-2m-14 29 31-9m-31 9 20 12"/>';
  }
  return '<svg viewBox="0 0 80 74" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">'+art+'</svg>';
 }
 function movePiece(route){return {consumption:{name:'收支安排',icon:'cash',prompt:'点招式，或把收支安排拖过去。'},investment:{name:'设备订单',icon:'ovens',prompt:'点招式，或把设备订单拖过去。'},exports:{name:'海外订单',icon:'order',prompt:'点招式，或把海外订单拖过去。'}}[route];}
 root.RemedyFeedback.moveArt=moveArt;root.RemedyFeedback.movePiece=movePiece;
 function moveControls(c,parent,route,lab,r,round,fourth){
  const wrap=el('div','',parent,'remedy-counter');
  const settings=el('div','',wrap,'remedy-settings'),grid=el('div','',settings,'gesture-zones');let committed=false;
  // A second click in a native double-click belongs to the same gesture, even
  // if the host has already replaced the first button with the next receipt.
  const moveTarget=e=>e.target.closest('[data-gesture-target],[data-gesture-packet]');
  settings.addEventListener('click',function(e){if(e.detail>1&&moveTarget(e)){e.preventDefault();e.stopImmediatePropagation();}},true);
  settings.addEventListener('keydown',function(e){if(e.repeat&&(e.key==='Enter'||e.key===' ')&&moveTarget(e))e.preventDefault();},true);
  const outlook=round===3&&r?r.control.outlook:round===2?lab.thirdOutlook??'adverse':'normal';
  const echo=mode=>(!fourth||!!lab.followups?.length)&&isEcho(lab,mode,outlook);
  function play(mode){
   if(committed)return;
   if(echo(mode)){showInspection(grid.querySelector('[data-gesture-target="'+mode+'"]'),settings,'试过啦！换招，或改分量？');return;}
   // Lock this receipt only until the host returns the next state. Feedback
   // animations are view-only: they must not impose an extra move cooldown.
   committed=true;settings.setAttribute('aria-busy','true');
   settings.querySelectorAll('button').forEach(b=>{b.disabled=true;});
   const move=fourth?{type:'FOLLOWUP',mode:mode,expectedPlan:JSON.stringify(lab)}:{type:'PLACE',mode:mode,expectedRound:round,outlook:outlook};captureGuess(c,move);c.send({type:'REMEDY',action:move});
  }
  const targets=modes[route].map(function(m){
   const button=el('button','',grid,'gesture-zone remedy-move');button.type='button';button.dataset.gestureTarget=m[0];button.setAttribute('aria-label',m[1]);button.setAttribute('aria-description',moveHint(route,m[0],lab.dose)+'；出招后才结算。');
   const art=el('span','',button,'remedy-move-art');art.setAttribute('aria-hidden','true');art.dataset.mode=m[0];art.innerHTML=moveArt(route,m[0]);el('span',m[1],button,'remedy-move-name');
   const hint=moveHint(route,m[0],lab.dose),note=el('small','',button);note.setAttribute('aria-label',hint);hint.split(' · ').forEach(function(part){el('span',part,note,'remedy-hint-part');});
   if(echo(m[0])){button.dataset.echo='true';button.setAttribute('aria-description','这是当前结果的招式；换招或改分量可以试新的对照。');const marker=el('span','刚才',button,'remedy-echo-marker');marker.setAttribute('aria-hidden','true');}
   return {id:m[0],node:button,button:button};
  });
  const tools=el('details','',settings,'remedy-tools');tools.open=toolsOpen;tools.ontoggle=function(){if(tools.isConnected)toolsOpen=tools.open;};el('summary',round===2?'分量与条件':'改改分量',tools);
  const knob=el('div','',tools,'remedy-knob');
  const down=action(c,knob,'−',{type:'DOSE',delta:-1});down.setAttribute('aria-label','减少药方力度');down.disabled=lab.dose===0;
  const out=el('output',String(lab.dose*5)+(route==='consumption'?'枚':'份'),knob);out.dataset.testid='remedy-dose';
  const up=action(c,knob,'＋',{type:'DOSE',delta:1});up.setAttribute('aria-label','增加药方力度');up.disabled=lab.dose===3;
  if(route==='consumption')targets.forEach(t=>{t.button.onclick=function(){play(t.id);};});
  else {
   const piece=movePiece(route),packet=el('button','',tools,'gesture-packet');packet.type='button';packet.dataset.gesturePacket='true';packet.innerHTML=piece.icon==='order'?'<svg viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h19l6 6v28H8Z M27 3v7h6M13 16h14m-14 5h14m-14 5h9"/></svg>':StreetArt.icon(piece.icon);el('span',piece.name,packet);
   const hint=el('p',piece.prompt,tools,'gesture-hint');hint.setAttribute('role','status');
   GestureBoard.bind(settings,{prompt:piece.prompt,hint:hint,pieces:[{id:'order',name:piece.name,node:packet}],targets:targets,onDrop:function(_,mode){play(mode);},onInspect:play,ghostClass:'gesture-ghost'});
  }
  if(round===2){
   const choices=el('div','',tools,'remedy-operate');
   [['adverse','试一次逆风'],['normal','按原条件经营'],['supported','试一次顺风']].forEach(function(choice){const b=action(c,choices,choice[1],{type:'PREPARE_OUTLOOK',outlook:choice[0]});b.dataset.testid='remedy-prepare-'+choice[0];b.setAttribute('aria-pressed',String((lab.thirdOutlook??'adverse')===choice[0]));b.onclick=function(){toolsOpen=false;c.send({type:'REMEDY',action:{type:'PREPARE_OUTLOOK',outlook:choice[0]}});};});
  }
  return tools;
 }
 function board(parent,route,account,animate,guessable,scale){
  const r=account.display,scene=el('div','',parent,'remedy-scene');scene.dataset.testid='remedy-scene';scene.dataset.route=route;scene.dataset.animate=String(animate);scene.dataset.round=r?r.round:0;
  const focused=route==='consumption',focus=focused?consumptionFocus(account):null;if(focused)scene.dataset.focus='consumption';
  const stock=r?r.stock:0,cash=r?r.world.cash.shop:60,start=meterOpening(account),effects=turnEffects(r);
  const pressure=meter(scene,focused?'卖剩的货':'待售库存',stock,scale?.stock??(r?r.sold+r.stock:50),'份','remedy-pressure-status',start?.stock);
  if(!focused){const tally=effects?showTurnEffect(pressure,effects.stock,'stock'):el('small','还没开工',pressure);tally.dataset.testid='remedy-tally';}
  const reserve=focused?meter(scene,r?'顾客买到':'顾客想买',focus.bought,focus.wanted,'份','remedy-shopping-status'):meter(scene,'生产账户',cash,scale?.cash??cashRuler(cash,start?.cash??60),'枚','remedy-cash-status',start?.cash);
  if(focused){reserve.querySelector('strong').textContent=r?focus.bought+' / '+focus.wanted+'份':focus.wanted+'份';reserve.dataset.bought=String(focus.bought);reserve.dataset.wanted=String(focus.wanted);}
  else if(effects)showTurnEffect(reserve,effects.cash,'cash');else el('small','先发工资，再收货款',reserve);
  if(guessable&&!focused){guessControl(pressure,'stock');guessControl(reserve,'cash');}
  const reaction=producerReaction(account),producer=el('div','',scene,'remedy-producer');producer.dataset.mood=reaction.mood;producer.dataset.streak=String(reaction.streak);
  producer.setAttribute('aria-label',!r?'生产这边，还没开工':!r.cashChange?'生产账户本期没有增减':'生产账户连续'+reaction.streak+'期'+(r.cashChange>0?'增加':'减少'));
  const machine=image(producer,route==='investment'&&!investmentState(account).activeEfficiency?TRUST_ASSETS.bakery.emptyOldOven:TRUST_ASSETS.street.emptyOven,'remedy-oven');machine.alt=route==='investment'?'本期在用的设备，尚未安装的新设备不会替换它':'';
  producerCharacter(producer,reaction);
  if(animate){const cue=moveCue(route,r),cry=el('span',cue.text,producer,'remedy-move-cue');cry.dataset.kind=cue.kind;cry.setAttribute('aria-hidden','true');}
  const shelf=el('div','',scene,'remedy-leftovers'),shelfView=shelfState(r);shelf.dataset.state=shelfView.kind;shelf.setAttribute('role','img');shelf.setAttribute('aria-label',r?'本期做'+r.made+'份、卖'+r.sold+'份，待售库存'+stock+'份。':'待售库存0份，还未开工。');
  for(let si=0;si<Math.min(18,Math.ceil(stock/3));si++){const parcel=el('span','',shelf);parcel.innerHTML=StreetArt.icon(['bread','clothes','ovens'][si%3]);}
  if(shelfView.caption){const caption=el('em',shelfView.caption,shelf,'remedy-shelf-caption');caption.setAttribute('aria-hidden','true');}
  const flow=el('div','',scene,'remedy-flow');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 120 45');svg.setAttribute('aria-hidden','true');
  svg.innerHTML='<path d="M8 24Q52 20 108 22m-12-10 12 10-12 10" fill="none" stroke="#777" stroke-width="2.5" stroke-linecap="round"/>';flow.appendChild(svg);
  const crates=el('div','',flow,'remedy-crates');crates.dataset.sold=String(r?r.sold:0);for(let i=0;i<(r&&r.sold?6:0);i++){const icon=el('span','',crates);icon.innerHTML=StreetArt.icon(['bread','clothes','ovens'][i%3]);icon.style.setProperty('--parcel',String(i));}
  const buyers=el('div','',scene,'remedy-buyers');
  if(route==='consumption'){
   bankFlow(buyers,r,animate);
   const mood=householdMood(r);character(buyers,false,mood==='happy',mood);character(buyers,false,mood==='happy',mood);
   const wallet=el('div','',reserve,'remedy-wallet');wallet.hidden=true;wallet.dataset.active='false';wallet.setAttribute('role','img');wallet.title='家庭合计的钱包，不是新增的钱';wallet.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h23v17H4ZM4 9V5h18v4M20 15h8v7h-8Z"/></svg>';el('output','',wallet);const cashCue=el('small','',wallet,'remedy-cash-cue');cashCue.hidden=true;
   if(r&&(r.debt||r.repayment)){const bill=el('div',r.creditStopped?'旧账还欠 '+r.debt+'枚':r.debt?'下回合还 '+focus.due+'枚':'旧账已还清',scene,'remedy-bill');bill.dataset.testid='remedy-bill';bill.dataset.stopped=String(r.creditStopped);bill.dataset.due=String(focus.due);bill.dataset.debt=String(r.debt);}
  }else if(route==='investment'){
   buyerCharacter(buyers,account,animate);
   machineGroups(buyers,account,animate);
  }else{
   exportNetwork(buyers,r,animate);
  }
  return scene;
 }
 function openNotes(route){
  if(!names[route])return [];
  const idea={consumption:'加工资是多一份收入；借钱是多一笔要还的账。眼前都能多买，明天未必一样。',investment:'买设备，今天有人接单；扩建交付后，明天多产，也多维护开支。换旧机可省开支，不自动扩产。停止追加，不会撤销已到货的机器。',exports:'外面的客人也能买。运费、客户集中和付款能力会影响结果；分散客户也要多花开拓费，不保证总划算。'}[route];
  const finance=route==='consumption'?'所有支付来自已有账户，银行不创造新钱。账单利息每次20%，是放大还款次序的教学设定，不是现实利率。':route==='investment'?'追加投资用一笔120枚现款，不每天重置；没模拟投资者回款再投资。预算用完，只说明这笔钱用完，不等于现实投资必然崩溃。':'海外买家只有120枚现款，不每天重置；没模拟其收入、进口和资金回流。用完这笔钱，不证明出口必然失败。全球净出口合计为零，也不等于贸易额不能增长。';
  return [
   {title:'这招在试什么？',pages:route==='consumption'?[idea,'消费增长是买得更多；这里讨论的消费主义，是把不断购买与身份、成功相联系的倾向。需要、消费愿望与支付能力不是一回事；愿望增加不会自动给钱包添钱。','消费也不全靠借贷，借贷也不必然酿成危机。本局固定购物清单，只试收入与还款的关系，不测量广告或文化影响。']: [idea]},
   {title:'钱与货从哪里来？',pages:['消费品和设备合并记账，基础产出50份，每份1枚；家庭清单30份。基础工资20枚、生产支出15枚；业主最多领5枚再消费，供货商用实际收款买设备。所有支付从已有钱包转出，均为教学假设。',finance,...(route==='consumption'?['本局先还本金，再还利息；没付的利息单列，仍参与下一期计息。细账拆开本金和利息，但只有一次实际还款转账，不会重复扣钱。这些顺序是教学设定，不代表现实贷款合同。']:[])]},
   {title:'哪些限制要记住？',pages:['不设固定天数，也不必经历危机才能离开。额外挑战只影响你所选的下一天，随后恢复照常；已发生的债务、库存、设备、开支和付款仍然保留。','没完整模拟折旧、政府采购、国际收支与其他行业。结果随收入和订单等条件改变，不证明经济必然崩溃。企业余额不是利润，物量不等于马克思所说的价值。']}
  ];
 }
 root.RemedyFeedback.openNotes=openNotes;
 function renderOpenRemedy(c,lab,account){
  const route=lab.route,focused=route==='consumption',r=account.display,round=lab.history.length,nextRun={route:route,history:lab.history,comparisons:[],followups:[]};
  const animate=!!r&&didOperate(previousRun,nextRun)&&!c.reduced;previousRun=nextRun;
  const battle=el('div','',c.readout,'remedy-battle remedy-compact remedy-open'+(focused?' remedy-consumption':''));battle.dataset.testid='remedy-battle';battle.dataset.flow=lab.flow;battle.dataset.animate=String(animate);
  battle.addEventListener('click',e=>{if(e.detail>1&&!e.target.closest('.remedy-knob')){e.preventDefault();e.stopImmediatePropagation();}},true);
  battle.addEventListener('keydown',e=>{if(e.repeat&&(e.key==='Enter'||e.key===' '))e.preventDefault();},true);
  el('div',round?'第'+round+'天 · 已结算':'第1天 · 开门前',battle,'remedy-day-heading');
  board(battle,route,account,animate,false);
  const console=el('div','',battle,'remedy-console'),narration=el('div','',console,'remedy-narration'),commands=el('div','',console,'remedy-commands');
  const line=el('p','',narration,'remedy-voice remedy-prompt');line.setAttribute('role','status');line.dataset.testid='remedy-feedback';
  const focus=focused?consumptionFocus(account):null;
  const message=el('span',focused?(r&&r.repayment?'先还'+r.repayment+'枚，剩下的才能买东西。':focus.line):r?feedback(route,r):advisers[route].quote,line,'remedy-message');
  if(r&&route==='investment'&&!r.control.dose)message.textContent='这次没添设备。之前的产线继续开。';
  if(r?.control.outlook==='adverse'&&(!focused||!message.textContent.includes('底薪减半')))message.textContent=(focused?'你试了底薪减半。':route==='investment'?'你试了设备订单减半。':'你试了大客户停单。')+message.textContent;
  if(r&&route==='investment'&&r.investment)el('small',r.control.mode==='expand'?'新设备明天开工：最多做'+(50+r.capacity)+'份。':'明天生产维护需'+(Math.max(10,15-r.world.efficiency)+Math.ceil(r.capacity/5))+'枚。',narration,'remedy-open-consequence');
  if(!focused){const budget=el('small',(route==='investment'?'本局追加订单预算：':'海外买家现款：')+(r?r.world.cash[route==='investment'?'buyers':'foreign']:120)+'枚',narration,'remedy-open-budget');budget.dataset.testid='remedy-budget';}
  StreetArt.decorateMoney(message);if(animate&&focused)playHousehold(message,r,true);
  let submitting=false;
  const play=(mode,dose)=>{if(submitting)return;submitting=true;const outlook=openOutlook;openOutlook='normal';c.send({type:'REMEDY',action:{type:'DAY',mode,dose,expectedRound:round,expectedPlan:JSON.stringify(lab),outlook}});};
  const moves=el('div','',commands,'remedy-operate remedy-open-moves');
  const moveList=focused?[['raise','加工资','店里付 '+lab.dose*5+'枚'],['credit','先借钱','申请 '+lab.dose*5+'枚，下次先还']]
   :modes[route].map(item=>[item[0],item[1],route==='investment'?'下单 '+lab.dose*5+'份，明天用':'想卖 '+lab.dose*5+'份，成交才运货']);
  moveList.forEach(item=>{
   const b=el('button','',moves,'gesture-zone remedy-move');b.type='button';b.dataset.gestureTarget=item[0];b.setAttribute('aria-label',item[1]);
   const art=el('span','',b,'remedy-move-art');art.innerHTML=moveArt(route,item[0]);art.setAttribute('aria-hidden','true');
   const text=el('span','',b);el('span',item[1],text);el('small',item[2],text);b.onclick=()=>play(item[0]);
  });
  const links=el('div','',commands,'remedy-open-links');
  const wait=el('button',focused?'照常营业':route==='investment'?'先不添设备':'先不接海外单',links,'secondary');wait.type='button';wait.onclick=()=>play(focused?'raise':lab.mode,0);
  host(c,links,account.canContinue?'看看其他办法 →':'换处方 ↩',account.canContinue?'RELIEF_WRAP':'RELIEF_MENU');
  const supplement=el('details','',c.readout,'scene-supplement');el('summary','账本与实验设置',supplement);
  if(focused)root.MortgageLab.mount(supplement);
  const records=el('div','',supplement,'remedy-records');
  records.addEventListener('toggle',function(e){
   if(e.target.parentElement!==records||!e.target.open)return;
   for(const section of records.children)if(section!==e.target&&section.tagName==='DETAILS')section.open=false;
  },true);
  if(r){const ledger=receipt(records,r);el('p','生产账户余额 '+r.world.cash.shop+'枚。',ledger,'small');
   const reset=action(c,ledger,'换个办法，从头试 ↺',{type:'REPLAY',fromRound:0,expectedPlan:JSON.stringify(lab)});reset.setAttribute('aria-label','从头试，保留这次记录');
   const days=el('details','',records,'remedy-receipt');el('summary','前几天的账',days);let loaded=false;days.ontoggle=function(){if(!days.open||loaded)return;loaded=true;account.reports.forEach(day=>{const d=receipt(days,day);d.querySelector('summary').textContent='第'+day.round+'天 · '+(day.control.dose?modes[route].find(m=>m[0]===day.control.mode)[1]:'照常营业');});};
  }
  const tools=el('details','',records,'remedy-consumption-tools');el('summary','换个分量／额外挑战',tools);
  const knob=el('div','',tools,'remedy-knob');action(c,knob,'−',{type:'DOSE',delta:-1}).setAttribute('aria-label','减少药方力度');el('span',lab.dose*5+(focused?'枚':'份'),knob);action(c,knob,'＋',{type:'DOSE',delta:1}).setAttribute('aria-label','增加药方力度');
  const label=el('label','只改变下一天的条件：',tools),select=document.createElement('select');select.setAttribute('aria-label','下一天的额外条件');label.appendChild(select);
  const outlooks=focused?[['normal','照常'],['adverse','底薪减半'],['supported','收入增加']]:route==='investment'?[['normal','照常下单'],['adverse','设备订单减半'],['supported','下游追加订单']]:[['normal','照常接单'],['adverse','大客户停单'],['supported','海外订单增加']];
  outlooks.forEach(v=>{const option=el('option',v[1],select);option.value=v[0];});select.value=openOutlook;select.onchange=()=>{openOutlook=select.value;};
  archiveRecords(records,account,route);
  const bounds=el('details','',records,'street-bounds');el('summary','这个实验说明什么？',bounds);
  const explanation=el('div','',bounds,'technology-report-body');root.ResearchReader.mount(explanation,'',{topics:openNotes(route),sources:c.state.remedySources});
 }
 root.renderRemedyAdviser=adviserCharacter;
 root.renderRemedyLab=function(c){
  cancelPeek();cancelInspection();cancelFeedback();
  const p=c.state.prologue,route=p.reliefRoute;
  if(lastRoute!==route){lastRoute=route;toolsOpen=false;fourthOpen=false;previousRun=null;guessDraft={};guessPending=null;guessResult=null;openOutlook='normal';}
  c.title(route?'第四幕·'+names[route]:'第四幕·资产阶级精英开出的药方','');
  if(!route){
   const encounter=el('div','',c.readout,'remedy-encounter'),shelf=el('span','',encounter,'remedy-encounter-shelf');shelf.setAttribute('role','img');shelf.setAttribute('aria-label','剩货问题的示意，不是本次库存账目');
   ['bread','clothes','ovens','bread'].forEach(id=>{const product=el('span','',shelf);product.innerHTML=StreetArt.icon(id);});
   el('p',p.reliefCompleted.length?'试过的办法，留下了什么？':'如果又剩货了，听谁的？',encounter);
   const menu=el('div','',c.readout,'remedy-menu');
   ['consumption','investment','exports'].forEach(function(id){
    const choice=menuChoice(p,id,c.state.remedyMenu?.[id]),card=el('button','',menu,'remedy-card');card.type='button';card.dataset.route=id;card.dataset.completed=String(choice.completed);card.dataset.recorded=String(choice.recorded);card.setAttribute('aria-label',choice.label);card.onclick=function(){c.send({type:'CHOOSE_RELIEF',route:id});};
    el('span',names[id],card,'remedy-card-title');const promise=el('span','',card,'remedy-card-promise');choice.quote.split(' · ').forEach(function(part,i){if(i)el('span',' · ',promise);el('span',part,promise,'remedy-card-fact');});
    const prop=el('span','',card,'remedy-card-art');prop.setAttribute('aria-hidden','true');adviserCharacter(prop,id);
    const progress=el('span','',card,'remedy-card-progress');if(choice.trial)el('small',choice.trial,progress,'remedy-card-trial');el('span',choice.progress,progress);
   });
   if(p.reliefCompleted.length===3){
    host(c,c.controls,'继续故事 →','FINISH_RELIEF').className='primary';
   }else if(c.state.reliefSampleAvailable){
    el('p','已试 '+p.reliefCompleted.length+' / 3 · 其余仍可选',c.readout,'remedy-final');
    host(c,c.controls,'先继续故事 →','FINISH_RELIEF_SAMPLE').className='primary';
   }
   root.MortgageLab.mount(c.readout);
   return;
  }
  const lab=p.remedyLabs[route],account=c.state.remedy;
  if(lab?.flow&&account){renderOpenRemedy(c,lab,account);return;}
  if(lab){
   const notice=el('section','',c.readout,'remedy-legacy-notice');
   el('p','旧账留着，今天重新开门。',notice,'remedy-legacy-title');
   el('p','这次按天经营，不限四回合。旧记录不会丢。',notice,'small');
   action(c,c.controls,'开始按天经营 →',{type:'OPEN_FLOW'},'primary');
   const old=el('details','',c.readout,'remedy-legacy-record');el('summary','查看旧版账本与回合',old);
   if(route==='consumption'||!lab.history.length){
    if(account?.reports.length){let loaded=false;old.ontoggle=()=>{if(!old.open||loaded)return;loaded=true;account.reports.concat(account.comparisons,account.followups??[]).forEach(r=>receipt(old,r));};}
    host(c,c.controls,'换处方 ↩','RELIEF_MENU');return;
   }
   // Keep the original contract and replay controls, but do not make the old
   // four-round board compete with the current game's primary entry.
   c={...c,readout:old,controls:old};
  }
  if(!lab||!account){
   el('p','旧版记录保留；这次从相同起点重新试验。',c.readout,'small');
   const restart=el('button','开始这张处方 →',c.controls,'primary');restart.type='button';restart.onclick=function(){c.send({type:'CHOOSE_RELIEF',route:route});};
   host(c,c.controls,'回到三张处方 ↩','RELIEF_MENU');return;
  }
  const round=lab.history.length,r=account.display,followed=!!account.followups?.length,finished=p.reliefPhase==='done',beat=battleBeat(account),result=followed||lab.comparisons.length?comparisonView(account):pathView(account);
  if(lastBeat!==beat){lastBeat=beat;toolsOpen=false;fourthOpen=false;}
  const nextRun={route:route,history:lab.history,comparisons:lab.comparisons,followups:lab.followups},operated=!!r&&didOperate(previousRun,nextRun),animate=operated&&!c.reduced;settleGuess(previousRun,nextRun,r);previousRun=nextRun;
  if(operated)fourthOpen=false;
  const battle=el('div','',c.readout,'remedy-battle remedy-compact'+(route==='consumption'?' remedy-consumption':''));battle.dataset.testid='remedy-battle';battle.dataset.beat=beat;battle.dataset.animate=String(animate);
  // A result may replace the move cards with the exit. The second click of
  // the same gesture must not click through into that newly revealed exit.
  battle.addEventListener('click',function(e){if(e.detail>1&&!e.target.closest('.remedy-knob')){e.preventDefault();e.stopImmediatePropagation();}},true);
  battle.addEventListener('keydown',function(e){if(e.repeat&&(e.key==='Enter'||e.key===' ')&&!e.target.closest('.remedy-knob'))e.preventDefault();},true);
  const track=el('ol','',battle,'remedy-track');track.setAttribute('aria-label','四个回合；已玩过的编号可重打');const currentStep=followed?4:round<3?round+1:beat==='respond'?4:3;
  for(let step=1;step<=4;step++){const t=el('li','',track),played=step<4?round>=step:followed;t.dataset.played=String(played);if(currentStep===step)t.setAttribute('aria-current','step');
   if(played&&step===4){const retry=el('button','4',t,'remedy-replay');retry.type='button';retry.setAttribute('aria-label','重打第4回合，前三回合不变');retry.onclick=function(){const d=battle.querySelector('.remedy-fourth-retry');if(d){d.open=true;fourthOpen=true;d.querySelector('.gesture-zone')?.focus({preventScroll:true});}};}
   else if(played){const retry=action(c,t,String(step),{type:'REPLAY',fromRound:step-1,expectedPlan:JSON.stringify(lab)},'remedy-replay');retry.setAttribute('aria-label','从第'+step+'回合重打，保留原记录');retry.title='换第'+step+'招，保留原记录';}
   else {const number=el('span',String(step),t,'remedy-round-number');number.setAttribute('aria-label','第'+step+'回合，还没出招');}
  }
  const scene=board(battle,route,account,animate,!finished,comparisonScale(result));
  const console=el('div','',battle,'remedy-console'),narration=el('div','',console,'remedy-narration'),commands=el('div','',console,'remedy-commands');
  const line=el('p','',narration,'remedy-voice remedy-prompt');line.setAttribute('role','status');line.dataset.testid='remedy-feedback';
  if(r&&r.control.outlook==='adverse'&&route!=='consumption'){const stamp=el('span',replies[route].title,line,'remedy-impact');stamp.dataset.testid='remedy-impact';}
  const draftOutlook=lab.thirdOutlook??'adverse';
  const challenge=beat==='anticipate'?forecast(route,r,draftOutlook):null;
  if(challenge&&route!=='consumption'){line.classList.add('remedy-forecast');const portrait=el('span','',line,'remedy-forecast-portrait');portrait.setAttribute('aria-hidden','true');character(portrait,false,false,challenge.mood);}
  const message=el('span',challenge?'':route==='consumption'&&!(beat==='free'&&result)?consumptionFocus(account).line:battleMessage(route,account,!!lab.archives?.length),line,'remedy-message');
  if(challenge){message.dataset.testid='remedy-challenge';message.dataset.outlook=draftOutlook;message.dataset.forecast='true';if(route==='consumption'){message.textContent=consumptionForecast(r,draftOutlook);StreetArt.decorateMoney(message);}else{el('small',challenge.heading,message);el('span',challenge.quote,message,'remedy-forecast-quote');}}
  if(route==='consumption'&&animate&&r)playHousehold(message,r,true);
  let comparisonParent=commands,consumptionTools=null;
  if(!finished){
   if(beat==='incoming'){
    const reply=el('section','',commands,'remedy-reply');reply.dataset.testid='remedy-reply';
    el('small','回招 · 试一次逆风',reply);const prop=el('span','',reply,'remedy-reply-art');prop.innerHTML=StreetArt.icon(replies[route].icon);
    el('p',replyQuote(route,r),reply,'remedy-reply-quote');el('small','同一个第三回合，换个条件。',reply);
    action(c,reply,'接这一招 →',{type:'COMPARE',outlook:'adverse'},'primary').setAttribute('aria-label',risks[route]);
   }else{
    let moveParent=commands;
    if(followed){const retry=el('details','',commands,'remedy-fourth-retry');retry.open=fourthOpen;retry.ontoggle=function(){if(retry.isConnected)fourthOpen=retry.open;};el('summary','换招重打第4回合',retry);moveParent=retry;comparisonParent=retry;}
    const extraTools=moveControls(c,moveParent,route,lab,r,round,round===3&&r?.control.outlook==='adverse'&&(!account.canContinue||followed));if(route==='consumption')consumptionTools=extraTools;
    if(beat==='free'){
     const rematch=el('div','',commands,'remedy-rematch');
     const retry=action(c,rematch,'换开局 ↺',{type:'REPLAY',fromRound:0,expectedPlan:JSON.stringify(lab)},'remedy-rematch-start');retry.setAttribute('aria-label','从第一回合重打，保留这次账目');
     const next=host(c,rematch,'换张处方 →','RELIEF_WRAP');next.className='remedy-next';next.setAttribute('aria-label','收下这张处方的教训 →');
     if(!followed){const settings=el('details','',commands,'remedy-conditions');el('summary','换条件'+(result?' · 看'+comparisonSubject(result):''),settings);const buttons=el('div','',settings,'remedy-operate');comparisonParent=settings;
      action(c,buttons,'逆风',{type:'COMPARE',outlook:'adverse'}).setAttribute('aria-label',risks[route]);
      action(c,buttons,'顺风',{type:'COMPARE',outlook:'supported'}).setAttribute('aria-label',conditions[route]);
      action(c,buttons,'原条件',{type:'COMPARE',outlook:'normal'});}
    }
   }
  }
  if(result)comparisonPeek(comparisonParent,scene,route,account,result);
  if(finished){
   el('p',{consumption:'加薪不是借钱，借款明天还要还。',investment:'投资带来订单，不等于销路无限。',exports:'外面的市场不是无限的。'}[route],commands,'remedy-final');
   host(c,commands,'换一张处方 →','RELIEF_MENU').className='primary';
  }
  if(beat!=='free'||finished){const footer=el('div','',commands,'remedy-links');host(c,footer,'换处方 ↩','RELIEF_MENU').setAttribute('aria-label','先看看别的处方 ↩');}
  const records=el('div','',c.readout,'remedy-records'),restartLabel=lab.archives?.length?'清空这张处方的记录 ↺':'从相同起点再试 ↺';if(r){const ledger=receipt(records,r);if(route==='consumption'){const replay=el('button','重看本轮收支 ↺',ledger,'secondary');replay.type='button';replay.onclick=function(){playHousehold(message,r,!c.reduced);};}action(c,ledger,restartLabel,{type:'RESTART'});}else {const restart=el('details','',records,'remedy-receipt');el('summary','重新开局',restart);action(c,restart,restartLabel,{type:'RESTART'});}
  if(route==='consumption'&&r)el('p','生产账户余额 '+r.world.cash.shop+'枚。余额不是利润。',records.querySelector('.remedy-receipt'),'small');
  if(consumptionTools){consumptionTools.classList.add('remedy-consumption-tools');consumptionTools.querySelector('summary').textContent='实验设置';records.appendChild(consumptionTools);}
  archiveRecords(records,account,route);
  if(account.followups?.length>1){const trials=el('details','',records,'remedy-receipt');el('summary','第4回合的试招记录',trials);for(const trial of account.followups){el('p',modes[route].find(m=>m[0]===trial.control.mode)[1]+' · 分量'+trial.control.dose*5,trials,'small');receipt(trials,trial);}}
  const bounds=el('details','',c.readout,'street-bounds');el('summary','这张处方的边界与依据',bounds);
  el('p','三张处方借鉴遨游之舟的论述。增加消费不只靠借款，凯恩斯主义不只是借钱或印钱，宏观需求还包括政府购买和进口扣除；本局不是完整的国民经济核算。',bounds);
  el('p','这次把几家厂的生产合起来看，默认连续经营四回合，不继承面包店的钱。第四回合承接所选第三回合的钱、库存、欠款和设备，不是回到第二回合重算。产品是消费品与设备的简化篮子，不全是面包；每份按1枚计价。所有支付来自已有钱包；银行只转借已有资金，没有模拟现实银行的存款创造。',bounds);
  if(route==='investment')el('p','新增产能属于实际买到设备的生产部门，不是卖设备的一家店凭空添炉。画面合并显示设备卖家和购入设备的厂家，分别记录生产现金与投资钱包；不能将内部设备付款或生产账户变化当作单店净利润或GDP。',bounds);
  el('p','每期先发20枚基本工资、支付15枚生产费用，再接受家庭、业主与设备买家的订单。家庭本期购物清单最多30份；不是说所有人的需要都有固定上限。',bounds);
  el('p','利息每期20%、扩产与维护系数、运费、有限市场以及条件变化，都是为了看清机制的教学设定，不是现实估计。几回合的实验不足以证明政策永远有效或必然失败。',bounds);
  el('p','问号只猜本局出招后有没有剩货、生产账户本期是否增加，不给政策打分。预测不扣钱，不参与通关；刷新会清空预测，实际经营账目仍保留。',bounds);
  el('p','默认第三回合开始试逆风，第四回合沿用这次条件：消费线的基本工资减半，欠款未清则暂停新贷款；投资线的原有设备订单从15份降至8份，新增订单减半；出口线的大客户停单，分散客户仍保留5份订单。第四回合可以沿用原招，不强迫换招来取得继续资格。没有模拟货币增发、房价、证券化或战争。',bounds);
  el('p','换招重打第4回合是可选对照：前三回合与同一起点不变，旧的第四回合记录保留，不把替代试招当成第五天。若要改变第三回合条件，请从编号3重打；原来第三期对照的存档仍可查看。',bounds);
  el('p','金融危机、贸易冲突和产能压力是需要条件触发的风险，不能当作三张处方的必然结局。技术革命也可能提高收入、降低成本或满足新需要；产权与控制的问题另行讨论。',bounds);
  el('p','加薪不必然耗尽企业资金：新增消费会形成回款。投资可能创造有效需求，替代性投资也不一定增加产能。出口额不等于净出口，全球不能同时都获得顺差。',bounds);
  el('p','这里仍由私人老板掌握机器和经营决策。药方可能缓和矛盾的表现，不等于改变生产资料占有；不能直接代指社会主义国家。',bounds);
  c.state.remedySources.forEach(function(source){const line=el('p',source.note,bounds),a=el('a',source.title+' ↗',line);a.href=source.url;a.target='_blank';a.rel='noreferrer';});
 };
})(window);
