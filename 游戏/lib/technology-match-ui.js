(function(root){
 'use strict';
 const labels={off:'照旧手做',more:'继续做货',rest:'带薪休息',cut:'不再排班',share:'不排班，仍分享'};
 const rivalNames={mirror:'学人精',bargain:'抢客王',steady:'老熟人'};
 let pendingDay=null;
 function el(tag,text,parent,cls){const n=document.createElement(tag);n.className=cls||'';n.textContent=text||'';parent.appendChild(n);StreetArt.decorateMoney(n);return n;}
 function art(name,key,person){const a=TRUST_ASSETS.bakery,atlas=a[name+'Atlas'],f=atlas.frames[key].frame,b=person?[f.x+24,f.y+34,72,108]:[f.x,f.y,f.w,f.h];return '<svg viewBox="'+b.join(' ')+'" aria-hidden="true"><image href="'+a[name]+'" width="'+atlas.meta.size.w+'" height="'+atlas.meta.size.h+'"/></svg>';}
 function peep(worried,cap){return '<span class="match-peep">'+art('body','body0000',true)+art(worried?'nervous':'face',worried?'face_nervous0008':'face0000',true)+(cap?'<img src="'+TRUST_ASSETS.bakery.chefHat+'" alt="">':'')+'</span>';}
 function send(c,a){c.send({type:'TECHNOLOGY',action:{type:'MATCH',action:a}});}
 function button(c,text,a,parent,cls){const b=el('button',text,parent,cls||'secondary');b.type='button';b.onclick=function(){send(c,a);};return b;}
 function animateVisits(board,world){
  const report=world.history.at(-1).report;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const buttons=board.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);
  const jobs=report.people.map(async function(p){
   const source=board.querySelector('[data-match-person="'+p.id+'"]'),visit=p.visits[0];if(!source||!visit)return;
   const target=board.querySelector('[data-match-shop="'+visit.shop+'"]'),a=source.getBoundingClientRect(),b=target.getBoundingClientRect();
   const ghost=el('div','',document.body,'match-traveller');ghost.innerHTML=peep(!visit.success,p.id<8);ghost.style.left=a.left+'px';ghost.style.top=a.top+'px';source.style.opacity='.25';
   const x=b.left+b.width*.5-a.left-18,y=b.top+b.height*.35-a.top;
   try{
    await ghost.animate([{transform:'translate(0,0)'},{transform:'translate('+x+'px,'+y+'px)'}],{duration:360,delay:p.id*20,fill:'forwards',easing:'ease-in-out'}).finished;
    if(visit.success){const bread=el('img','',ghost);bread.src=TRUST_ASSETS.bakery.bread;bread.alt='';}
    await ghost.animate([{transform:'translate('+x+'px,'+y+'px)'},{transform:'translate(0,0)'}],{duration:360,delay:120,fill:'forwards',easing:'ease-in-out'}).finished;
   }finally{ghost.remove();source.style.opacity='';}
  });
  void Promise.all(jobs).catch(function(){/* Interrupted animation must not alter already-settled accounts. */}).finally(function(){buttons.forEach(b=>{if(b.isConnected)b.disabled=b.dataset.cannot==='true';});});
 }
 root.renderTechnologyMatch=function(c,t){
  const m=t.match,s=m.world,r=s.history.at(-1)?.report,ended=s.day===6,d=m.draft;
  const board=el('div','',c.readout,'technology-match');board.dataset.testid='technology-match';board.dataset.day=s.day;
  el('p',ended?(s.firms[0].cash>s.firms[1].cash?'你留下的钱更多。':s.firms[0].cash<s.firms[1].cash?'隔壁留下的钱更多。':'两边留下的钱一样多。'):'第 '+(s.day+1)+' / 6 天 · 比比谁留下的钱多',board,'match-day');
  const shops=el('div','',board,'match-shops');
  for(let id=0;id<2;id++){
   const f=s.firms[id],shop=el('section','',shops,'match-shop');shop.dataset.matchShop=id;
   el('h3',id?rivalNames[s.strategy]+'的店':'你的店',shop);
   const head=el('div','',shop,'match-shop-head'),boss=el('button','',head,'match-boss');boss.type='button';boss.dataset.matchPerson=id+8;boss.innerHTML=art('hat','hatguy0000');boss.setAttribute('aria-label',id?'看看隔壁老板的钱包':'看看老板的钱包');
   const oven=el('img','',head,'match-oven');oven.src=f.robot?TRUST_ASSETS.bakery.newOven:TRUST_ASSETS.bakery.oven;oven.alt=f.robot?'装上自动控制的烤炉':'原来的烤炉';
   const voice=el('div','',shop,'match-speech');voice.textContent=!r?'今天各自作决定。':id&&s.strategy==='mirror'&&s.day>1?'你昨天那招，我学会了。':r.closed[id]?'今天先停炉。':f.robot&&f.automation==='more'?'炉子更快，客人呢？':f.robot&&f.automation==='cut'?'这下能少发两份工资！':f.robot?'机器接活，人能歇吗？':'这次，卖了'+r.sold[id]+'个。';
   const cash=el('div',f.cash+'枚',shop,'match-cash');cash.setAttribute('aria-label','店内现金'+f.cash+'金币');
   const stock=el('span','待售 '+f.bread.length,shop,'match-stock');const bread=el('img','',stock);bread.src=TRUST_ASSETS.bakery.bread;bread.alt='面包';
   const crew=el('div','',shop,'match-crew');
   for(const p of s.people.filter(p=>p.role==='worker'&&p.home===id)){
    const outcome=r?.people[p.id],work=r?.work[p.id],off=!!work&&work.days===0;
    const person=el('button','',crew,'match-person');person.type='button';person.dataset.matchPerson=p.id;person.setAttribute('aria-label','看看厨师'+(p.id+1)+'的钱包');person.innerHTML=peep(!!outcome&&!outcome.bought,!off);person.dataset.off=off;
    el('small',work?(work.kind==='cut'?'没排班':work.kind==='share'?'分到钱':off?'带薪休息':'上班'):'厨师'+(p.id+1),person);
   }
   if(id)el('small',r?.offers[1]?'上次工资 '+r.offers[1].wage+'枚 · 售价 '+r.offers[1].price+'枚':'还没揭晓',shop,'match-rival');
  }
  const street=el('div','',board,'match-street');el('span',r?'这天 '+r.fed+' / 11 人买到面包':'同一条街，11个人',street);
  const supplier=el('button','看看原料商',street,'match-link');supplier.type='button';supplier.dataset.matchPerson=10;
  const thoughts=el('div','',board,'match-thoughts');thoughts.hidden=true;thoughts.setAttribute('role','status');
  board.querySelectorAll('[data-match-person]').forEach(function(b){b.onclick=function(){const p=s.people[Number(b.dataset.matchPerson)],got=r?.people[p.id],work=r?.work?.[p.id];thoughts.replaceChildren();el('p',(p.role==='owner'?'老板':p.role==='supplier'?'原料商':'厨师'+(p.id+1))+' · 现在有 '+p.cash+'枚',thoughts);el('p',got?(got.bought?'今天买到'+got.bought+'个面包。':'今天想买面包，'+(got.visits[0]?.reason||'没买到')+'。'):'每天先试买一个面包，再考虑第二个。',thoughts);if(work)el('small','这天收到 '+work.income+'枚 · '+(work.days?'当天上班':'当天不排班'),thoughts);const close=el('button','收起 ×',thoughts,'match-link');close.onclick=function(){thoughts.hidden=true;b.focus();};thoughts.hidden=false;};});
  if(!ended){
   const choices=el('div','',board,'match-choices'),wages=el('div','',choices,'match-wage');
   const minus=button(c,'−',{type:'SET',field:'wage',value:d.wage-1},wages,'match-adjust');minus.setAttribute('aria-label','少发1金币工资');minus.disabled=d.wage===1;
   el('span','每人工资 '+d.wage+'枚',wages);
   const plus=button(c,'+',{type:'SET',field:'wage',value:d.wage+1},wages,'match-adjust');plus.setAttribute('aria-label','多发1金币工资');plus.disabled=d.wage===4;
   if(s.day>=1)button(c,'面包价签 '+d.price+'枚 ↻',{type:'SET',field:'price',value:d.price%4+1},choices,'match-price');
   if(s.day>=2){
    if(d.automation==='off'){
     const connect=button(c,'接上机器，试试 →',{type:'PLAN',plan:'more'},choices,'match-connect');connect.dataset.testid='connect-automation';
     el('small','同一炉面包，原来4人做；装上后2人就能做。',choices);
    }else{
     const planning=el('div','',choices,'match-planning');
     GestureBoard.mountPieces(planning,{prompt:'机器接了活，这两个人接下来做什么？',pieces:[{id:'freed',name:'腾出工时的两人',target:d.automation,html:peep(false,true)+peep(false,true)}],targets:[{id:'more',label:labels.more,hint:'仍发工资 · 做12个'},{id:'rest',label:labels.rest,hint:'仍发工资 · 做6个'},{id:'cut',label:labels.cut,hint:'不发工资 · 做6个'},{id:'share',label:labels.share,hint:'仍分到钱 · 做6个'}],onDrop:function(_,plan){send(c,{type:'PLAN',plan:plan});}});
     if(!s.firms[0].robot)button(c,'这次先不装',{type:'PLAN',plan:'off'},choices,'match-link');
    }
   }
   const estimate=c.state.matchOfferIssue||'',closed=c.state.matchCannotOpen;
   const hint=el('p',closed?'今天付不起开炉，只卖尚未坏的旧货。':estimate,board,'match-issue');hint.setAttribute('role','status');
   const run=button(c,closed?'今天停炉，只卖旧货 →':'封好安排，开门 →',{type:'RUN'},board,'primary');run.dataset.testid='match-run';run.disabled=!!estimate&&!closed;run.dataset.cannot=run.disabled;
   run.onclick=function(){pendingDay=s.day+1;send(c,{type:'RUN'});};
   if(s.day)button(c,'翻回昨天 ↶',{type:'REWIND',day:s.day},board,'match-link');
   if(r)el('p','做了'+r.made[0]+'，卖了'+r.sold[0]+'。店内现金'+(r.cashChange[0]<0?'少':'多')+Math.abs(r.cashChange[0])+'枚。',board,'match-receipt');
  }else{
   const comparison=m.synchronous||m.reference;
   const days=el('div','',board,'match-days');el('small','哪天想换个决定？',days);
   s.history.forEach(function(h,i){const old=comparison?.history[i]?.report;const b=button(c,(i+1)+'日\n'+h.report.fed+'/11',{type:'REWIND',day:i+1},days,'match-date');b.setAttribute('aria-label','翻回第'+(i+1)+'天');if(old)el('small','对照 '+old.fed+'/11',b);});
   if(m.synchronous){const other=m.synchronous;el('p','隔壁照做后：两店现金 '+other.firms[0].cash+'枚 / '+other.firms[1].cash+'枚；最后一天 '+other.history.at(-1).report.fed+'人买到面包。',board,'match-receipt');}
   if(t.phase==='lab'){
    button(c,'隔壁照做，会怎样？ →',{type:'COMPARE'},board,'secondary');
    button(c,'这局说明了什么？ →',{type:'CONCLUDE'},board,'primary');
   }
   const opponents=el('div','',board,'match-opponents');for(const id of Object.keys(rivalNames))button(c,'再和'+rivalNames[id]+'过一局',{type:'RESTART',strategy:id},opponents,'match-link');
  }
  const rules=el('details','',board,'street-bounds');el('summary','这局的条件与账',rules);
  el('p','两店各36枚，八位厨师各6枚，两位老板与合并供货商共用另外三个账户，初始为零。总计120枚、11人。每次工资、安装、开炉、购物和保管都从现有账户支付。余额不是净利润，剩货没有算销售。',rules);
  el('p','邻店只看上一天，不看你这次草稿。学人精照工资、售价和机器安排；抢客王有剩货尝试降价、资金紧尝试降薪；老熟人有余力尝试保工资。动作仍要付得起。',rules);
  el('p','机器是假设每天省下两人的工时，安装8枚。继续做货产量从6升到12、原料随产量计；其他机器安排仍做6个。带薪休息保工资；不再排班只发其余两人工资；分享向不排班两人转同样的钱。产权、定价权、排班权仍在老板。没有失业补助、遣散费和折旧的完整核算；这些安排不是对AI能力或劳动法的估计。',rules);
  el('p','工资与售价为1至4。先发工资，每人先试买一个面包，买到后有70%机会想买第二个，最多两个。同种子重试不重抽偏好。老板取最多2枚生活费。每4个面包1枚原料费向上取整，剩货每6个1枚保管费，两天前的面包坏掉；未付保管款是欠账，不是现金。所有数字均为教学设定。无信贷、政府购买、外部市场或新增人口。',rules);
  el('p','此局只检验特定条件下的局部与总体后果，不证明危机必然发生。生产社会化与生产资料资本主义私人占有才是基本矛盾的定义；低工资或库存不是定义本身。工资分享不等于社会主义，资本主义公共救助也不改变国家制度；社会主义国家不能直接套同一基本矛盾。',rules);
  if(pendingDay===s.day){pendingDay=null;animateVisits(board,s);}
 };
})(window);
