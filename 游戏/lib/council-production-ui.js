(function(root){
 'use strict';
 const labels={work:'继续开工','paid-rest':'休息，工资照发',unpaid:'这班不排，没工资'},names=['阿面','小麦','团团','圆圆','阿青','你'];
 let focusId=null,executing=null,workspaceOpen=false;
 function el(tag,text,parent,cls){const n=document.createElement(tag);n.textContent=text||'';n.className=cls||'';parent.appendChild(n);StreetArt.decorateMoney(n);return n;}
 function send(c,a){c.send({type:'OWNERSHIP',action:{type:'COUNCIL',action:a}});}
 function button(c,text,a,parent,cls){const n=el('button',text,parent,cls||'secondary');n.type='button';n.onclick=function(){send(c,a);};return n;}
 function peep(worried,working,smiling){const b=TRUST_ASSETS.bakery;function crop(url,atlas,key){const f=atlas.frames[key].frame;return '<svg viewBox="'+(f.x+24)+' '+(f.y+34)+' 72 108" aria-hidden="true"><image href="'+url+'" width="'+atlas.meta.size.w+'" height="'+atlas.meta.size.h+'"/></svg>';}
  return '<span class="production-peep">'+crop(b.body,b.bodyAtlas,'body0000')+crop(worried?b.nervous:b.face,worried?b.nervousAtlas:b.faceAtlas,worried?'face_nervous0008':smiling?'face0006':'face0000')+(working?'<img class="production-hat" src="'+b.chefHat+'" alt="">':'')+'</span>';
 }
 function bench(){return '<svg viewBox="0 0 150 70" fill="white" stroke="#777" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14Q65 10 130 15v23H20ZM15 45l124-1-5 11H19ZM27 55l-4 11m101-12 5 13M30 18v18m35-21v22m35-23v22M22 24h105"/></svg>';}
 function door(){return '<svg viewBox="0 0 100 90" fill="none" stroke="#777" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 83V11l55-3v73M27 81V20L63 10v71M63 52h-6M10 84h72M78 31l12 10-12 11m-4-11h16"/></svg>';}
 function arrangement(p){const first=p.shifts[0]?.jobs;if(!first||p.shifts.some(r=>JSON.stringify(r.jobs)!==JSON.stringify(first)))return '换过排班';const rest=first.filter(j=>j==='paid-rest').length,unpaid=first.filter(j=>j==='unpaid').length;return rest?rest+'人带薪休息':unpaid?unpaid+'人没工资':'六人都开工';}
 root.renderCouncilProduction=function(c,t){
  const s=t.council,p=s.production,a=c.state.councilProductionAccount,last=a.shifts.at(-1),done=p.history.length===3;
  const wrap=el('div','',c.readout,'council-production');wrap.dataset.testid='council-production';wrap.dataset.shift=p.history.length;wrap.dataset.revision=s.revision;wrap.dataset.fast=String(a.fast);wrap.dataset.baked=String(!!last?.made);
  if(!done)el('p','第 '+(p.history.length+1)+' / 3 班 · 拖动小人排班',wrap,'production-caption');
  const hint=el('p',last?(done?'点小人，看这三班的账。':'先看刚才那班，再展开排班台安排下一班。'):(s.mode==='coop'?'这一段假设成员同意试排班。':'这一段假设老板同意试排班。')+'下一班才按安排发工资。',wrap,'production-hint');hint.setAttribute('role','status');
  let observation=null;
  if(last){
   observation=el('section','',wrap,'production-observation');observation.dataset.testid='production-observation';observation.dataset.actualShift=String(last.shift);
   el('h3',done?'三班过去了。':'第'+last.shift+'班，已经结束。',observation);
   const people=el('div','',observation,'production-records');
   for(let id=0;id<6;id++){
    const cell=el('button','',people,'production-record-person');cell.type='button';cell.dataset.resultPerson=String(id);cell.setAttribute('aria-label','查看'+names[id]+'已结束的班次');cell.onclick=function(){inspect(id);};
    const bought=last.bought['worker-'+id],poor=last.workerPoor.includes(id),short=last.workerStockOut.includes(id);
    cell.innerHTML=peep(poor||short,last.worked.includes(id),bought===2);cell.dataset.expression=poor||short?'worried':bought===2?'smiling':'neutral';el('span',names[id],cell);
    const time=el('span','',cell,'production-shift-strip');
    for(let i=0;i<3;i++){
     const r=a.shifts[i],day=el('span','',time,'production-shift-tile');day.dataset.shift=String(i+1);
     const job=!r?'future':!r.opened?'stopped':r.worked.includes(id)?'work':r.paidRest.includes(id)?'paid-rest':'unpaid';day.dataset.actualJob=job;
     day.setAttribute('aria-label','第'+(i+1)+'班 · '+({future:'还没开始',stopped:'没开成班',work:'上班', 'paid-rest':'带薪休息',unpaid:'没排班'}[job]));
     if(job==='work'){const hat=el('img','',day);hat.src=TRUST_ASSETS.bakery.chefHat;hat.alt='';}else if(job==='paid-rest')day.innerHTML=bench();else if(job==='unpaid')day.innerHTML=door();else el('span',job==='future'?'·':'—',day);
    }
    const bag=el('span','',cell,'production-record-bag');bag.setAttribute('aria-label','第'+last.shift+'班买到'+bought+'个面包');
    last.visits.filter(function(v){return v.person==='worker-'+id&&v.success;}).forEach(function(v){const img=el('img','',bag);img.src=TRUST_ASSETS.bakery.bread;img.alt='买到的面包';img.dataset.boughtBread=v.bread;});
    if(!bought)el('small',poor?'钱不够':'没面包了',bag);
    el('small',a.workers[id]+'枚',cell,'production-record-wallet');
   }
   el('p','厨师帽：上班 · 长凳：带薪休息 · 门：没排班 · —：没开成班',observation,'production-record-key');
   el('p','上班 '+a.work+'次 · 带薪休息 '+a.paidRest+'次 · 工资 '+a.wages+'枚',observation,'production-actual-totals');
  }else el('p',a.fast?'炉子更快了。能不能少上班，照样领工资？':'旧炉子还在。先试试不同的排班。',wrap,'production-small-question');
  const workspace=el('details','',wrap,'production-workspace');workspace.open=!last||!done&&workspaceOpen;
  const summary=el('summary',done?'查看最后一班的排班':'调整下一班的排班',workspace);summary.hidden=!last;
  workspace.ontoggle=function(){workspaceOpen=workspace.open;if(!workspace.open)GestureBoard.cancel();};
  const floor=el('div','',workspace,'production-floor'),work=el('section','',floor,'production-work'),other=el('div','',floor,'production-other');
  const targets=[],pieces=[],containers={};
  for(const job of ['work','paid-rest','unpaid']){
   const zone=job==='work'?work:el('section','',other,'production-zone production-'+job);zone.dataset.productionTarget=job;
   const heading=el('button',labels[job],zone,'production-destination');heading.type='button';heading.setAttribute('aria-label','放到'+labels[job]);heading.disabled=done;
   if(job==='work'){const image=el('img','',zone,'production-oven');image.src=a.fast?TRUST_ASSETS.bakery.newOven:TRUST_ASSETS.bakery.oven;image.alt=a.fast?'实际买下的快炉':'保留原来的普通炉';el('small',a.fast?'快炉已经付过款':'没买新炉，仍用原来的',zone);}
   else {const art=el('div','',zone,'production-location-art');art.innerHTML=job==='paid-rest'?bench():door();}
   const crew=el('div','',zone,'production-crew');containers[job]=crew;targets.push({id:job,node:zone,button:heading,accepts:function(){return !done;}});
  }
  const heart=el('aside','',wrap,'council-heart');heart.hidden=true;heart.setAttribute('role','dialog');heart.setAttribute('aria-modal','true');heart.setAttribute('aria-label','这班的账');let returnFocus=null;
  function inspect(id){returnFocus=document.activeElement;heart.replaceChildren();el('h3',names[id],heart);el('p','现在 '+a.workers[id]+'枚',heart);el('p',last?'第'+last.shift+'班领到 '+last.paid[id]+'枚，买到 '+last.bought['worker-'+id]+'个面包。':'还没开下一班，钱来自刚才的真实分配。',heart);
   if(last){a.shifts.forEach(function(r){el('p','第'+r.shift+'班：'+(!r.opened?'没开成班':r.worked.includes(id)?'上班':r.paidRest.includes(id)?'带薪休息':'没排班')+' · 领'+r.paid[id]+'枚 · 买'+r.bought['worker-'+id]+'个面包。',heart);});}
   el('p',last?.workerPoor.includes(id)?'“不是不想吃，是钱不够了。”':last?.workerStockOut.includes(id)?'“有钱，可轮到我时没面包了。”':last&&!last.opened?'“说好的排班没开成，工资也没发。”':last?.paidRest.includes(id)?'“这班没上工，工资真到了。”':last&&!last.worked.includes(id)?'“没排班，也没工资。先花积蓄吧。”':!last&&p.jobs[id]==='paid-rest'?'“这班安排休息，工资发不发，开班后看账。”':'“先干活，再看看买得到多少。”',heart);const close=el('button','收起 ×',heart,'secondary');close.type='button';close.onclick=function(){heart.hidden=true;returnFocus?.focus({preventScroll:true});};heart.onkeydown=function(e){if(e.key==='Escape'){e.preventDefault();close.click();}if(e.key==='Tab'){e.preventDefault();close.focus();}};heart.hidden=false;close.focus({preventScroll:true});}
  p.jobs.forEach(function(job,id){const cell=el('figure','',containers[job],'production-person');cell.dataset.person=id;
   const person=el('button','',cell,'production-person-art');person.type='button';person.disabled=done;person.dataset.councilPiece='person:'+id;person.innerHTML=peep(!!last&&(last.workerPoor.includes(id)||last.workerStockOut.includes(id)),job==='work');el('span',names[id],person);pieces.push({id:'person:'+id,node:person,name:names[id]});
   const cash=el('button',a.workers[id]+'枚',cell,'production-wallet');cash.type='button';cash.setAttribute('aria-label','看看'+names[id]+'这班的账');cash.onclick=function(){inspect(id);};
   if(last){const receipt=el('div','',cell,'production-loaf-receipt');receipt.setAttribute('aria-label','这班买到'+last.bought['worker-'+id]+'个面包');for(let j=0;j<last.bought['worker-'+id];j++){const loaf=el('img','',receipt);loaf.src=TRUST_ASSETS.bakery.bread;loaf.alt='';}if(!last.bought['worker-'+id])el('small',last.workerPoor.includes(id)?'钱不够':'没买到',receipt);}
  });
  if(!done)GestureBoard.bind(wrap,{pieces,targets,hint,ghostClass:'production-person-ghost',prompt:'把人放在炉边、休息长凳或门外。',onDrop:function(id,job){workspaceOpen=true;focusId=id;send(c,{type:'PRODUCTION_ASSIGN',person:Number(id.slice(7)),job});}});
  if(focusId){const n=wrap.querySelector('[data-council-piece="'+focusId+'"]');if(n){n.focus({preventScroll:true});n.dataset.arrived='true';}focusId=null;}
  const shelf=el('section','',observation||wrap,'production-stock');el('span','柜台还剩 '+a.stock.length+'个 · 每个2枚',shelf);const loaves=el('div','',shelf);for(const id of a.stock){const image=el('img','',loaves);image.src=TRUST_ASSETS.bakery.bread;image.alt='';image.dataset.bread=id;image.dataset.old=Number(id.split(':')[0])<a.shift;}
  if(last)el('p',last.opened?'刚才：做出'+last.made+'个，卖出'+last.sold+'个。'+(last.workerPoor.length?last.workerPoor.length+'位工人想买第一个，却钱不够。':''):'刚才没开成炉，也没发工资；只卖了旧货'+last.sold+'个。',observation,'production-outcome');
  if(!done){el('p','拟做 '+a.nextOutput+'个 · 工资 '+a.nextWages+'枚 + 原料 '+a.nextOutput/2+'枚 · 店里 '+a.wallets.firm+'枚',workspace,'production-preview');const run=button(c,a.canOpen?'按排班，开一班 →':'钱不够，先卖旧货 →',{type:'PRODUCTION_RUN',expectedRevision:s.revision},c.controls,'primary');run.dataset.testid='production-run';run.onclick=function(){workspaceOpen=false;executing=p.history.length+1;send(c,{type:'PRODUCTION_RUN',expectedRevision:s.revision});};}
  else{
   const comparisons=el('details','',wrap,'production-past-trials');el('summary','比较已经试过的排班',comparisons);
   const records=c.state.councilProductionTrials||[],table=el('table','',comparisons,'production-comparisons');table.dataset.testid='production-comparisons';const caption=el('caption','六人 · 三班合计',table);caption.className='production-caption';const head=el('tr','',el('thead','',table));for(const label of ['排班','做出','剩下','工资','带薪休息'])el('th',label,head);const body=el('tbody','',table);records.slice(-3).forEach(function(record){const row=el('tr','',body);el('td',({bonus:'奖金',minority:'少数权益',coop:'共同经营'}[record.mode])+' · '+(record.fast?'快炉':'普通炉')+' · '+arrangement(record),row);el('td',String(record.produced),row);el('td',String(record.stock.length),row);el('td',record.wages+'枚',row);el('td',record.paidRest+'次',row);});
   button(c,'同样的钱，换个排班 ↺',{type:'PRODUCTION_RETRY'},c.controls,'secondary');
   if(c.state.councilCanConclude)button(c,'机器省下了什么，谁拿到了？ →',{type:'CONCLUDE'},c.controls,'primary');
  }
  button(c,'回看刚才的分配与表决 ↩',{type:'PRODUCTION_BACK'},c.controls,'production-back');
  const book=el('details','',wrap,'street-bounds');el('summary','三班的账与条件',book);
  el('p','直接沿用刚才的账户，合计88枚。只有设备商实际收到12枚，才有快炉；平票、再分钱都不会免费得到机器。旧记录未实际玩过这里，不补写结果。',book);
  el('p','这是已获有权者批准的假想排班，玩家不是单方改变合同。奖金、少数权益与共同经营都可以分别检验排班；前一次的票权和分配不变，带薪休息不自动来自某种章程。',book);
  el('p','接下来只看面包，每个2枚；工资每人每班2枚。普通炉每位开工者做2个，快炉做4个；每2个面包用1枚原料。工作与带薪休息者领工资，不排班者不领；必须先付得起这班全部工资和原料，才能开工，否则不发工资、不做新货，旧货仍可出售。',book);
  el('p','六位工人、合并原料商与设备商，还有私营章程下已有外部老板，依次尝试第一个面包，再按相同顺序尝试第二个；每人每班最多两个，只花已有钱包。商家的消费与经营账户在这里合并，未模拟继续雇人或投资。上段外部订单的钱已花完，不补新订单、信用或政府购买。买不起与没有面包分开记录。',book);
  el('p','三班不计变质、保管、租金和折旧，不是完整利润计算；实际持有的面包按先做先卖。换排班是从同一真实表决后的钱包作独立对照，不是再次凭空领钱。查看人的余额不会购买之前愿望中的鞋或家用品；投票时的理由不随后来花钱倒改。',book);
  el('p','企业'+a.wallets.firm+'枚，六人'+a.workers.reduce((x,y)=>x+y,0)+'枚，原料商'+a.wallets.supplier+'枚，设备商'+a.wallets.equipmentSupplier+'枚，外部老板'+(a.wallets.owner??0)+'枚，合计'+a.moneyAfter+'枚。'+(done?'累计上班'+a.work+'次，带薪休息'+a.paidRest+'次。':'下一班开工需'+a.nextRequired+'枚。'),book);
  if(executing===p.history.length){wrap.dataset.executed=String(executing);executing=null;}
 };
})(window);
