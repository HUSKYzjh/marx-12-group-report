(function(root){
 'use strict';
 const names=['阿面','小麦','团团','圆圆','阿青','阿蓝','小雨','小风','你','隔壁老板','供货商'];
 let pending=null,automatic=null;
 function el(tag,text,parent,cls){const n=document.createElement(tag);n.textContent=text||'';n.className=cls||'';parent.appendChild(n);StreetArt.decorateMoney(n);return n;}
 function sprite(name,key,person){const a=TRUST_ASSETS.bakery,f=a[name+'Atlas'].frames[key].frame,b=person?[f.x+24,f.y+34,72,108]:[f.x,f.y,f.w,f.h];return '<svg viewBox="'+b.join(' ')+'" aria-hidden="true"><image href="'+a[name]+'" width="'+a[name+'Atlas'].meta.size.w+'" height="'+a[name+'Atlas'].meta.size.h+'"/></svg>';}
 function peep(worried,cap){return '<span class="pressure-peep">'+sprite('body','body0000',true)+sprite(worried?'nervous':'face',worried?'face_nervous0008':'face0000',true)+(cap?'<img src="'+TRUST_ASSETS.bakery.chefHat+'" alt="">':'')+'</span>';}
 function send(c,a){c.send({type:'TECHNOLOGY',action:{type:'PRESSURE',action:a}});}
 function button(c,text,a,parent,cls){const b=el('button',text,parent,cls||'secondary');b.type='button';b.onclick=function(){send(c,a);};return b;}
 async function travel(board,s){
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  board.dataset.moving='true';const buttons=board.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);
  try{
   const report=s.history.at(-1);
   // Show the actual funded wage receipts, not an additional money transfer.
   await Promise.all(s.people.slice(0,8).map(async function(p){
    const paid=report.paid[p.id],supportPaid=report.support?.paid.includes(p.id)?1:0,worked=report.before.firms[p.home].workers.includes(p.id);
    if(!paid&&!worked&&!supportPaid)return;
    const source=board.querySelector('[data-pressure-person="'+p.id+'"]');if(!source||!source.isConnected)return;
    const a=source.getBoundingClientRect(),label=(paid?'本日工资 +'+paid+'枚':supportPaid?'':'今天没工资')+(supportPaid?(paid?' · ':'')+'保障 +1枚':''),slip=el('div',label,document.body,'pressure-payday');
    slip.dataset.paid=paid;slip.dataset.supportPaid=supportPaid;slip.setAttribute('aria-hidden','true');slip.style.left=a.left+a.width/2+'px';slip.style.top=a.top-12+'px';
    try{await slip.animate([{opacity:0,transform:'translate(-50%,8px)'},{opacity:1,transform:'translate(-50%,-12px)',offset:.3},{opacity:1,transform:'translate(-50%,-12px)',offset:.8},{opacity:0,transform:'translate(-50%,-18px)'}],{duration:640,easing:'ease-out'}).finished;}finally{slip.remove();}
   }));
   if(!board.isConnected)return;
   await Promise.all(report.visits.map(async function(v){
   const source=board.querySelector('[data-pressure-person="'+v.person+'"]');if(!source)return;
   const a=source.getBoundingClientRect(),b=board.querySelector('[data-pressure-shop="'+v.shop+'"]').getBoundingClientRect(),x=b.left+b.width*.5-a.left-16,y=b.top+b.height*.36-a.top;
   const g=el('div','',document.body,'pressure-traveller');g.innerHTML=peep(!v.success,false);g.style.left=a.left+'px';g.style.top=a.top+'px';source.style.opacity='.2';
   try{await g.animate([{transform:'translate(0,0)'},{transform:'translate('+x+'px,'+y+'px)'}],{duration:340,delay:v.person*20,fill:'forwards',easing:'ease-in-out'}).finished;if(v.success){const bread=el('img','',g);bread.src=TRUST_ASSETS.bakery.bread;bread.alt='';}await g.animate([{transform:'translate('+x+'px,'+y+'px)'},{transform:'translate(0,0)'}],{duration:340,delay:100,fill:'forwards',easing:'ease-in-out'}).finished;}finally{g.remove();source.style.opacity='';}
  }));}finally{delete board.dataset.moving;buttons.forEach(b=>{if(b.isConnected)b.disabled=b.dataset.locked==='true';});}
 }
 root.renderCompetitivePressure=function(c,t){
  const p=t.pressure,s=p.world,r=s.history.at(-1),support=p.stage==='support',ended=s.day===9;
  const feedback=c.state.pressureFeedback;
  if(automatic&&(automatic.stage!==p.stage||automatic.day!==s.day||automatic.revision!==p.revision||t.phase!=='lab'))automatic=null;
  if(automatic&&feedback?.checkpoint)automatic=null;
  const board=el('div','',c.readout,'competitive-pressure');board.dataset.testid='competitive-pressure';board.dataset.day=s.day;board.dataset.stage=p.stage;board.dataset.revision=p.revision;
  el('p',ended?'九天后，回头看这条街':support?s.day===6?'回到第六天末 · 从明天换收入保障':'第 '+s.day+' 天 · 换了收入保障':s.day?'第 '+s.day+' / 9 天 · 营业结束':'第 1 / 9 天 · 开门前',board,'pressure-day');
  const shops=el('div','',board,'pressure-shops'),targets=[],sources=[],people={};
  const thought=el('div','',board,'pressure-thought');thought.hidden=true;
  function inspect(id){automatic=null;const person=s.people[id],visit=r?.visits.find(v=>v.person===id);thought.replaceChildren();el('p',names[id]+' · 现在有 '+person.cash+'枚',thought);el('p',visit?(visit.success?'今天去'+(visit.shop?'隔壁':'你的店')+'买了一个面包。':'今天也想买：'+visit.reason+'。'):'今天想买一个面包。',thought);if(id<8)el('small',r?'这天工资 '+r.paid[id]+'枚'+(r.support?.paid.includes(id)?' · 保障1枚':''):'在职领工资，不在职先花积蓄。',thought);const close=el('button','收起 ×',thought,'pressure-link');close.onclick=function(){thought.hidden=true;};thought.hidden=false;const auto=board.querySelector('[data-testid="pressure-continue"]');if(auto)auto.textContent='照此安排，继续营业 ▷';}
  function person(id,parent,working){const wrap=el('figure','',parent,'pressure-person');wrap.dataset.pressurePerson=id;const outcome=r?.visits.find(v=>v.person===id),b=el('button','',wrap,'pressure-person-art');b.type='button';b.innerHTML=peep(!!outcome&&!outcome.success,working);b.setAttribute('aria-label','看看'+names[id]+'的钱包');b.onclick=function(){inspect(id);};el('small',names[id],wrap);const wallet=el('button',s.people[id].cash+'枚',wrap,'pressure-wallet');wallet.type='button';wallet.setAttribute('aria-label','放进'+names[id]+'的钱包');wallet.onclick=function(){inspect(id);};if(outcome&&!outcome.success)el('small',outcome.reason,wrap,'pressure-purchase-failed');people[id]={node:wrap,button:wallet};return wrap;}
  for(let id=0;id<2;id++){
   const f=s.firms[id],shop=el('section','',shops,'pressure-shop');shop.dataset.pressureShop=id;shop.toggleAttribute('data-closed',!!r?.closed[id]);el('h3',id?'隔壁面包店':'你的面包店',shop);
   const head=el('div','',shop,'pressure-shop-head'),boss=el('button','',head,'pressure-boss');boss.type='button';boss.dataset.pressurePerson=id+8;boss.innerHTML=sprite('hat','hatguy0000');boss.setAttribute('aria-label','看看'+names[id+8]+'的钱包');boss.onclick=function(){inspect(id+8);};
   const oven=el('img','',head,'pressure-oven');oven.src=f.fast?TRUST_ASSETS.bakery.newOven:TRUST_ASSETS.bakery.oven;oven.alt=f.fast?'快速烤炉':'老烤炉';
   el('p',!r?(id?'裁掉两个，工资压低！':'四份工资，都还在。'):r.closed[id]?'今天钱不够，先停炉。':!id&&r.action==='follow'&&!r.before.firms[0].fast?'又省下两份工资！':id?'低价，客人就来！':r.sold[0]===0?'我的厨师也去隔壁买了？':r.shortOfMoney?'原来的客人，怎么不买了？':'这天卖了'+r.sold[0]+'个。',shop,'pressure-speech');
   const stats=el('div','',shop,'pressure-store-stats');const stock=el('span',String(f.bread.length),stats);const bread=el('img','',stock);bread.src=TRUST_ASSETS.bakery.bread;bread.alt='待售面包';el('span',f.cash+'枚',stats);
   const tag=el('button','面包 '+f.price+'枚',shop,'pressure-counter');tag.type='button';tag.dataset.pressureTarget=id?'other':'counter';tag.setAttribute('aria-label',id?'隔壁的价签':'你的价签');el('small','每人工资 '+f.wage+'枚',tag);tag.onclick=function(){inspect(id+8);};
   const shelf=el('div','',shop,'pressure-shelf');shelf.setAttribute('aria-label','实际剩下'+f.bread.length+'个面包');for(const loaf of f.bread){const image=el('img','',shelf);image.src=TRUST_ASSETS.bakery.bread;image.alt='';image.dataset.old=s.day>loaf.day;}
   const crew=el('div','',shop,'pressure-crew');f.workers.forEach(w=>person(w,crew,true));
  }
  const street=el('div','',board,'pressure-jobless');el('span','没了这份工作\n仍是你的顾客',street);for(let id=0;id<8;id++)if(!s.firms[s.people[id].home].workers.includes(id))person(id,street,false);person(10,street,false).classList.add('pressure-supplier');
  if(feedback){const consequence=el('div','',board,'pressure-consequence');consequence.setAttribute('role','status');el('p',feedback.message,consequence);if(r){const trace=el('div','',consequence,'pressure-trace');el('span','店里今天 '+(feedback.cashChange>0?'+':'')+feedback.cashChange+'枚',trace);el('span','全街工资 '+feedback.initialWages+' → '+feedback.wages+'枚',trace);el('span','有货却买不起 '+feedback.poor.length+'人',trace);}}
  if(r)el('p','第'+r.day+'天：你的店卖了'+r.sold[0]+'个，隔壁卖了'+r.sold[1]+'个。'+(r.shortOfMoney?r.shortOfMoney+'人有货可买却钱不够。':r.stockOut?r.stockOut+'人想买却没货。':'11人都买到了面包。'),board,'pressure-receipt');
  const hint=el('p','',board,'pressure-hint');hint.setAttribute('role','status');
  if(!ended&&t.phase==='lab'){
   if(support){
    const remaining=Math.max(0,12-s.history.reduce((n,h)=>n+h.receipts.filter(x=>x.reason==='收入保障').reduce((sum,x)=>sum+x.amount,0),0));
    const fund=el('div','',board,'pressure-fund');el('span','保障预算还剩 '+remaining+'枚',fund);el('small','从供货商已有的钱中付出，不增发金币。',fund);
    const tray=el('div','',fund,'pressure-coin-tray');const back=el('button','放回预算',tray,'pressure-return');back.type='button';back.dataset.pressureTarget='fund';targets.push({id:'fund',node:tray,button:back});
    for(let id=0;id<4;id++){
     const where=p.coins[id],coin=el('button','1枚',where===null?tray:people[where].node,'pressure-support-coin');coin.type='button';coin.dataset.pressurePiece='coin:'+id;sources.push({id:'coin:'+id,name:'保障金币'+(id+1),node:coin});
    }
    for(let id=0;id<8;id++){people[id].node.dataset.pressureTarget='wallet:'+id;targets.push({id:'wallet:'+id,...people[id],accepts:function(piece){const coin=Number(piece.split(':')[1]);return !p.coins.includes(id)||p.coins[coin]===id;}});}
    GestureBoard.bind(board,{pieces:sources,targets,hint,prompt:'把四枚金币放到具体人的钱包，也可以点选放下。',onInspect:function(id){if(id.startsWith('wallet:'))inspect(Number(id.slice(7)));},onDrop:function(id,to){send(c,{type:'COIN',coin:Number(id.slice(5)),person:to==='fund'?null:Number(to.slice(7))});}});
    hint.textContent='这三天，钱给谁？金币营业后才发，不是无限补钱。';
   }else if(s.day){
    const tools=el('div','',board,'pressure-tools');
    if(s.firms[0].price!==1){const tag=button(c,'只降价\n面包 1枚',{type:'DRAFT',choice:'price'},tools,'pressure-price-slip');tag.dataset.pressurePiece='price';tag.setAttribute('aria-pressed',p.draft==='price');}
    if(!s.firms[0].fast){const letter=button(c,'跟着裁员、降薪\n留两人 · 工资1枚',{type:'DRAFT',choice:'follow'},tools,'pressure-dismissal');letter.dataset.pressurePiece='follow';letter.setAttribute('aria-pressed',p.draft==='follow');}
    hint.textContent=p.draft==='price'?'工资和人手不动，先试着把客人拉回来。':p.draft==='follow'?'开门时，另两人会离开工位；换快炉的钱实际付出。':s.firms[0].fast?'刚裁掉的人还有积蓄。能撑几天？':'不降，客人走；只降价，四份工资还得发。';
    if(p.draft!=='hold')button(c,'撤回草稿 ↶',{type:'DRAFT',choice:'hold'},board,'pressure-link');
   }else hint.textContent='先照原来的安排，开一天看看。';
   const decision=support?p.reference.history[s.day].action:p.draft,f=s.firms[0],fast=f.fast||decision==='follow',crew=decision==='follow'?2:f.workers.length,wage=decision==='follow'?1:f.wage,cost=crew*wage+Math.ceil((fast?12:Math.floor(crew*1.5))/4)+(fast&&!f.fast?8:0)+f.debt,stopped=cost>f.cash;
   const cash=el('div','',board,'pressure-cash');cash.dataset.short=stopped;el('span','店里 '+f.cash+'枚',cash);el('span','这次开炉需 '+cost+'枚',cash);
   if(stopped)el('small','店里的钱不够开炉，先卖还没坏的旧货。',board,'pressure-stop-note');
   function nextDay(){if(!board.isConnected)return;if(automatic){automatic.day=s.day+1;automatic.revision=p.revision+1;}pending={day:s.day+1,stage:p.stage};send(c,{type:'RUN',revision:p.revision});}
   const run=button(c,support?'照原决定，再过一天 →':stopped?'停炉一天，卖旧货 →':p.draft==='follow'?'裁员、降薪，开门 →':p.draft==='price'?'只降价，开门 →':'保留当前安排，开门 →',{type:'RUN',revision:p.revision},board,'primary');run.dataset.testid='pressure-run';run.onclick=function(){automatic=null;nextDay();};
   if(s.day&&!support){const keep=el('button',automatic?'暂停营业 Ⅱ':'照此安排，继续营业 ▷',board,'pressure-link');keep.type='button';keep.dataset.testid='pressure-continue';keep.onclick=function(){if(automatic){automatic=null;keep.textContent='照此安排，继续营业 ▷';}else{automatic={day:s.day,revision:p.revision,stage:p.stage};nextDay();}};}
   board.pressureNextDay=nextDay;
   if(!support&&!f.fast&&r?.closed[0])button(c,'回到第二天，试着跟进 ↶',{type:'TRY_FOLLOW'},board,'pressure-link');
  }
  if(ended){
   const conclusion=el('div','',board,'pressure-ending');
   if(support){
    const original=p.reference.history.at(-1);el('h3','同一条街，收入接住了多少？',conclusion);
    el('p','原来'+original.shortOfMoney+'人买不起；这次'+r.shortOfMoney+'人。剩货仍有'+(r.stock[0]+r.stock[1])+'个。',conclusion,'pressure-receipt');
    el('small','保障预算已用 '+(12-r.support.remaining)+' / 12枚。钱有期限，机器和产权没变。',conclusion);
   }else{const peak=Math.max(...s.history.map(h=>h.stock[0]+h.stock[1]));el('h3',s.firms[0].fast?'两家都降了成本。然后呢？':'不跟，钱又撑得住吗？',conclusion);el('p','这条街最多剩下'+peak+'个面包。最后一天，'+r.shortOfMoney+'人有货却买不起。',conclusion,'pressure-receipt');if(t.phase==='lab')button(c,'如果买不起的人有保障？ →',{type:'SUPPORT'},conclusion,'primary');}
   if(t.phase==='lab')button(c,'这局说明了什么？ →',{type:'CONCLUDE'},conclusion,'secondary');
   button(c,'重新开局，换一条路 ↺',{type:'RESTART'},conclusion,'pressure-link');
  }
  if(s.day){const dates=el('div','',board,'pressure-dates');el('small','翻回某一天，换个决定',dates);for(let day=support?7:1;day<=s.day;day++){const b=button(c,day+'日 ↶',{type:'REWIND',day},dates,'pressure-date');b.setAttribute('aria-label','翻回第'+day+'天');}}
  const notes=el('details','',board,'street-bounds');el('summary','这条街的条件',notes);el('p','11人、120枚。价低先买，需求有限，没有额外订单、信用或外部买家。供货商收款后只买一个面包，其他收入暂不用于其他行业再生产。工资之外还有其他需求来源，本局刻意限制它们，不把产品超过工资直接说成必然过剩。',notes);el('p','普通炉四人做6个，快炉两人做12个；快炉8枚，工资和价签均为教学参数。原料每4个1枚、保管每6个1枚，向上取整，两天前的面包坏掉。停炉也能卖旧货。没有完整折旧和遣散费核算，余额不是净利润。',notes);el('p','保障对照从原来第六天的真实存档分叉：同样的人、钱、工艺、顾客偏好和原经营决定。只增加12枚有限保障预算，从合并供货商现有现金转出，每天最多四人各1枚，可给在职或未在职者。少拿起、没放下、没有预算，都不凭空补钱。它是再分配的教学情景，不是已存在的具体政策，也不改变私人产权，更不等同于社会主义制度。',notes);
  if(pending&&pending.day===s.day&&pending.stage===p.stage){pending=null;const sequence=automatic;void travel(board,s).catch(function(){automatic=null;/* Settlement is not rerun for a cancelled animation. */}).then(async function(){if(!sequence||automatic!==sequence)return;await new Promise(resolve=>setTimeout(resolve,700));if(!board.isConnected){if(automatic===sequence)automatic=null;return;}if(automatic===sequence&&board.pressureNextDay)board.pressureNextDay();});}
 };
})(window);
