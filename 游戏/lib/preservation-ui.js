(function(root){
 'use strict';
 let focusId=null,executed=null,observer=null,motionFrame=null,workspaceOpen=false;
 root.clearPreservationGeometry=function(){if(observer){observer.disconnect();observer=null;}if(motionFrame!==null){cancelAnimationFrame(motionFrame);motionFrame=null;}};
 const toolNames={efficient:'省料装置',cold:'冷柜'};
 function el(tag,text,parent,cls){const n=document.createElement(tag);n.textContent=text||'';n.className=cls||'';parent.appendChild(n);StreetArt.decorateMoney(n);return n;}
 function send(c,a){c.send({type:'RULES',action:{type:'PRESERVATION',action:a}});}
 function button(c,text,a,parent,cls){const b=el('button',text,parent,cls||'secondary');b.type='button';b.onclick=()=>{executed=a.type;if(a.type==='RUN'||a.type==='NEXT'||a.type==='REPLAN')workspaceOpen=false;send(c,a);};return b;}
 function plug(){return '<svg viewBox="0 0 42 32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M11 10l21 1-1 12-19 1ZM17 2v8m9-8v9M20 24v6"/></svg>';}
 function device(tool){return tool==='cold'?'<svg viewBox="0 0 90 115" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 10q30-4 58 0l-1 91-57 1ZM17 40l57 1M65 20v11m0 23v14M24 103v5m40-5v5M34 63l26 22m-26 0 26-22M47 58v32m-17-16h34"/></svg>':'<svg viewBox="0 0 110 115" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 9l52 2-6 36H26ZM30 48l28 1 1 21M48 64h41l8 35-55 2-4-26M19 100h76M25 104v6m58-6v6M24 79h17M10 70l10 9-9 11"/><circle cx="69" cy="83" r="9"/><path d="M66 83h7m-4-4v8"/></svg>';}
 function person(happy){const b=TRUST_ASSETS.bakery;function crop(url,atlas,key){const f=atlas.frames[key].frame;return '<svg viewBox="'+(f.x+24)+' '+(f.y+34)+' 72 108" aria-hidden="true"><image href="'+url+'" width="'+atlas.meta.size.w+'" height="'+atlas.meta.size.h+'"/></svg>';}
  return '<span class="technology-peep">'+crop(b.body,b.bodyAtlas,'body0000')+crop(happy===false?b.nervous:b.face,happy===false?b.nervousAtlas:b.faceAtlas,happy===false?'face_nervous0008':happy===true?'face0006':'face0000')+'</span>';
 }
 function arrangement(p){return p.map(x=>x.price+'枚 · '+(x.bake===false?'停炉':x.efficient?'省料':'普通')+(x.cold?'＋冷柜':'')).join(' → ');}
 function probe(c,s,parent,e){
  const board=el('section','',parent,'preservation-probe');board.dataset.testid='preservation-probe';
  el('h3',e.question,board).dataset.testid='preservation-question';
  const face=el('div','',board,'preservation-probe-person');face.innerHTML=person(e.days.every(x=>x.bought===2));el('small','顾客1 · 每天想吃2个',face);
  const hint=el('p','同一起点，换个价签或开关。',board,'preservation-probe-hint');hint.setAttribute('role','status');
  const pieces=[],targets=[];
  const tags=el('div','',board,'preservation-tags');[1,2,3].forEach(price=>{const b=el('button',price+'枚',tags,'preservation-tag');b.type='button';b.dataset.preservationProbePiece='price:'+price;pieces.push({id:'price:'+price,name:price+'枚价签',node:b});});
  const dates=el('div','',board,'preservation-probe-dates');
  e.days.forEach(p=>{
   const day=el('section','',dates,'preservation-probe-day');day.dataset.probeDay=String(p.day);
   el('span','第'+p.day+'天 · 已营业',day);
   const price=el('button',p.setup.price+'枚 / 个',day,'preservation-destination');price.type='button';price.dataset.probeTarget='price:'+p.day;
   targets.push({id:'price:'+p.day,node:price,button:price,accepts:id=>id.startsWith('price:')&&Number(id.slice(6))!==p.setup.price});
   el('small','做 '+p.produced+' · 卖 '+p.sold,day);
   const meal=el('div','',day,'preservation-probe-meal');for(let i=0;i<p.bought;i++){const bread=el('img','',meal);bread.src=TRUST_ASSETS.bakery.bread;bread.alt='顾客1这天实际买到的面包';bread.draggable=false;}el('span','买到 '+p.bought+' / 2',meal);
   el('small','购物后钱包 '+p.wallet+'枚'+(p.oldBought?' · '+p.oldBought+'个来自昨天':''),day);
   if(p.day===2&&s.flexibleBake){
    const switchbox=el('div','',day,'preservation-probe-switch');
    ['hot','off'].forEach(mode=>{
     const box=el('section','',switchbox,'preservation-switch-position'),b=el('button',mode==='hot'?'开炉':'停炉',box,'preservation-destination');b.type='button';b.dataset.probeTarget='oven:'+mode;
     targets.push({id:'oven:'+mode,node:box,button:b,accepts:id=>id==='bake'&&(mode==='hot')!==(p.setup.bake!==false)});
     if((mode==='hot')===(p.setup.bake!==false)){const lever=el('button','',box,'preservation-lever');lever.type='button';lever.dataset.preservationProbePiece='bake';lever.innerHTML='<svg viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M10 32q12-3 24 0l-2 5H12ZM22 32L'+(mode==='hot'?'29 13':'15 13')+'"/><circle cx="'+(mode==='hot'?29:15)+'" cy="10" r="5"/></svg>';pieces.push({id:'bake',name:'第二天的炉子开关',node:lever});}
    });el('small','停炉，工资照付',day);
   }
  });
  if(e.comparison){const line=el('p',e.comparison.text,board,'preservation-probe-comparison');line.dataset.testid='preservation-probe-comparison';line.dataset.field=e.comparison.field;line.dataset.day=String(e.comparison.day);}
  root.GestureBoard.bind(board,{pieces,targets,hint,ghostClass:'preservation-ghost',prompt:'改一处再试；这里不会重算已经发生的交易。',onDrop:(id,to)=>{workspaceOpen=false;send(c,id==='bake'?{type:'REPLAN_BAKE',enabled:to==='oven:hot',expectedRevision:s.revision}:{type:'REPLAN_PRICE',day:Number(to.slice(6)),price:Number(id.slice(6)),expectedRevision:s.revision});}});
 }
 root.renderPreservationWorkbench=function(c,t){
  const s=t.workbench,a=c.state.preservationAccount,last=a.periods.at(-1),editable=s.step==='arrange',exploration=c.state.preservationExploration;
  const wrap=el('div','',c.readout,'preservation-workbench');wrap.dataset.testid='preservation-board';wrap.dataset.revision=String(s.revision);wrap.dataset.day=String(s.day);wrap.dataset.step=s.step;
  if(executed)wrap.dataset.executed=executed;executed=null;
  const observation=el('section','',wrap,'preservation-observation');observation.dataset.testid='preservation-observation';observation.dataset.actualDay=String(last?.day||0);observation.dataset.night=String(!!a.night);
  if(last&&!exploration){el('p',s.day===2&&editable?'第二天开门前 · 今日还没营业':'第'+last.day+'天 · 营业已结束',observation,'preservation-observation-label');el('h3',s.day===2&&editable?'昨晚，面包留下了吗？':'面包去哪了？',observation);}
  if(exploration)probe(c,s,observation,exploration);
  const money=el('div','',observation,'preservation-balance');el('span','店里 '+a.firm+'枚',money);if(!exploration)el('small',last?'最近营业：第'+last.day+'天':'第'+s.day+'天',money);
  let goal;
  if(s.step==='result'){
   const fed=a.periods.every(p=>p.purchases.every(n=>n===2)),kept=a.firm>=50;
   goal=el('div','',observation,'preservation-challenge-result');goal.dataset.testid='preservation-challenge';goal.dataset.achieved=String(fed&&kept);
   [[fed,fed?'两天都让六人买够':'还有人没买够'],[kept,kept?'店内资金没减少':'店里少了'+(50-a.firm)+'枚']].forEach(([met,label])=>{const line=el('span','',goal);line.dataset.met=String(met);line.innerHTML='<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">'+(met?'<path d="M4 11l5 6L19 5"/>':'<path d="M5 11h12"/>')+'</svg>';el('span',label,line);});
   if(fed&&kept)el('strong','这一局，做到了。',goal);
  }
  let result;
  if(last){result=el('div','',observation,'preservation-result');result.dataset.testid='preservation-result';el('span','第'+last.day+'天：做 '+last.produced.length+' · 卖 '+last.sold,result);el('span','店内增减 '+(last.cashChange>0?'+':'')+last.cashChange+'枚',result);el('small',last.setup.bake===false?'卖的是旧面包；没开炉，六份工资照付':last.upgrade?'含首次装置款 '+last.upgrade+'枚':'现金增减，不是完整利润',result);}
  const workspace=el('details','',wrap,'preservation-workspace');workspace.open=!last||editable&&workspaceOpen;
  const workspaceHeading=el('summary',editable?'调整今天的价签和装置':'查看这天的价签和装置',workspace);workspaceHeading.hidden=!last;
  const hint=el('p',s.step==='night'?'今天已结算，明天再改。':s.step==='result'?'两天已结算。':s.day===1?'换价签、接插头，或照常营业。':s.flexibleBake?'先卖剩货，还是继续开炉？':'换价签，或拔掉装置。',workspace,'preservation-hint');hint.setAttribute('role','status');
  if(s.nextDraft)el('small','第二天的预留安排：'+arrangement([s.nextDraft])+'。还没营业、还没付款。',workspace,'preservation-next-draft');
  const pieces=[],targets=[];
  function target(id,node,b,accepts){node.dataset.preservationTarget=id;targets.push({id,node,button:b,accepts});}
  function piece(id,name,parent,cls){const b=el('button','',parent,cls);b.type='button';b.dataset.preservationPiece=id;b.disabled=!editable;pieces.push({id,name,node:b});return b;}
  const tags=el('div','',workspace,'preservation-tags');[1,2,3].forEach(price=>{const p=piece('price:'+price,price+'枚价签',tags,'preservation-tag');el('span',price+'枚',p);p.dataset.active=String(price===s.draft.price);});
  const kitchen=el('div','',workspace,'preservation-kitchen'),wires=document.createElementNS('http://www.w3.org/2000/svg','svg');wires.setAttribute('aria-hidden','true');wires.classList.add('preservation-wires');kitchen.appendChild(wires);
  const deviceNodes={},ports={};
  function tool(tool){
   const box=el('section','',kitchen,'preservation-device tool-'+tool);deviceNodes[tool]=box;
   const art=el('div','',box,'preservation-device-art');art.innerHTML=device(tool);
   el('span',toolNames[tool],box);el('small',a.owned[tool]?'已买，不退钱': '首次使用 6枚',box);
   const tray=el('div','',box,'preservation-plug-tray');const tb=el('button','拔下收好',tray,'preservation-destination');tb.type='button';tb.disabled=!editable;target('unplug:'+tool,tray,tb,id=>editable&&id==='tool:'+tool);
   if(!s.draft[tool]){const p=piece('tool:'+tool,toolNames[tool]+'插头',tray,'preservation-plug');p.innerHTML=plug();}
  }
  tool('efficient');
  const shop=el('section','',kitchen,'preservation-shop');const oven=el('img','',shop,'preservation-oven');oven.src=TRUST_ASSETS.bakery.newOven;oven.alt='烤炉';oven.draggable=false;
  if(s.flexibleBake&&s.day===2){
   const switchbox=el('div','',shop,'preservation-oven-switch');switchbox.dataset.bake=String(s.draft.bake);el('small','今天的烤炉',switchbox);
   ['hot','off'].forEach(mode=>{const box=el('section','',switchbox,'preservation-switch-position'),b=el('button',mode==='hot'?'开炉':'停炉',box,'preservation-destination');b.type='button';b.disabled=!editable;target('oven:'+mode,box,b,id=>editable&&id==='bake');
    if((mode==='hot')===s.draft.bake){const lever=piece('bake','炉子开关',box,'preservation-lever');lever.innerHTML='<svg viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M10 32q12-3 24 0l-2 5H12Z"/><path d="M22 32L'+(mode==='hot'?'29 13':'15 13')+'"/><circle cx="'+(mode==='hot'?29:15)+'" cy="10" r="5"/></svg>';}
   });el('small','停炉，工资照付',switchbox,'preservation-wage-note');
  }
  const sockets=el('div','',shop,'preservation-sockets');['efficient','cold'].forEach(tool=>{const port=el('section','',sockets,'preservation-socket');ports[tool]=port;const b=el('button','',port,'preservation-destination');b.type='button';b.disabled=!editable;el('span',tool==='efficient'?'省料口':'保鲜口',b);el('span','∶',b,'preservation-port-mark');target('socket:'+tool,port,b,id=>editable&&id==='tool:'+tool);if(s.draft[tool]){const p=piece('tool:'+tool,toolNames[tool]+'插头',port,'preservation-plug');p.innerHTML=plug();}});
  const counter=el('section','',shop,'preservation-counter');const cb=el('button',s.draft.price+'枚 / 个',counter,'preservation-destination');cb.type='button';cb.disabled=!editable;target('counter',counter,cb,id=>editable&&id.startsWith('price:'));el('small',editable?'今天的价签':'今日价签已结算',counter);
  tool('cold');
  function align(){if(!kitchen.isConnected||!kitchen.getClientRects().length)return;const base=kitchen.getBoundingClientRect();wires.setAttribute('viewBox','0 0 '+base.width+' '+base.height);wires.replaceChildren();['efficient','cold'].forEach(tool=>{const from=deviceNodes[tool].querySelector('.preservation-device-art').getBoundingClientRect(),end=wrap.querySelector('[data-preservation-piece="tool:'+tool+'"] svg').getBoundingClientRect(),p=document.createElementNS(wires.namespaceURI,'path'),side=tool==='efficient'?-1:1,x=(side<0?from.left+4:from.right-4)-base.left,y=from.bottom-12-base.top,ex=end.left+end.width/2-base.left,ey=end.bottom-base.top;p.setAttribute('d','M'+x+' '+y+' C'+(x+side*30)+' '+(y+25)+' '+(ex+side*25)+' '+(ey+28)+' '+ex+' '+ey);p.dataset.connected=String(s.draft[tool]);wires.appendChild(p);});}
  workspace.addEventListener('toggle',()=>{workspaceOpen=workspace.open;if(workspace.open)align();else root.GestureBoard.cancel();});
  root.clearPreservationGeometry();observer=new ResizeObserver(align);observer.observe(kitchen);
  // A landing animation moves the plug without changing the grid's size.
  // ResizeObserver alone therefore freezes the wire at an intermediate frame.
  const landedAt=performance.now();function followLanding(){if(!kitchen.isConnected)return;align();if(performance.now()-landedAt<300&&!matchMedia('(prefers-reduced-motion: reduce)').matches)motionFrame=requestAnimationFrame(followLanding);else motionFrame=null;}
  motionFrame=requestAnimationFrame(followLanding);wrap.addEventListener('animationend',align);if(document.fonts)void document.fonts.ready.then(align);
  const stores=el('div','',observation,'preservation-stores');
  const shelf=el('section','',stores,'preservation-shelf');el('span','还在架上 '+a.stock,shelf,'preservation-shelf-label');const loaves=el('div','',shelf,'preservation-loaves');
  a.inventory.forEach(id=>{const p=el('span','',loaves,'preservation-loaf');p.dataset.bread=id;p.dataset.old=String(id.startsWith('1:')&&s.day===2);const img=el('img','',p);img.src=TRUST_ASSETS.bakery.bread;img.alt=id.startsWith('1:')&&s.day===2?'昨天留下的面包':'今天的面包';img.draggable=false;});
  if(wrap.dataset.executed==='NEXT'&&a.night?.lost.length){const ghosts=el('div','',shelf,'preservation-decay');a.night.lost.forEach(id=>{const img=el('img','',ghosts);img.src=TRUST_ASSETS.bakery.bread;img.alt='';img.draggable=false;img.dataset.lost=id;});}
  if(!a.inventory.length)el('small',last?'柜台空了':'还没开炉',loaves);
  if(s.day===2&&a.night)el('small',a.night.lost.length?'昨晚坏掉 '+a.night.lost.length+'个':a.night.kept.length?'昨晚留下 '+a.night.kept.length+'个':'昨晚没有剩货',shelf,'preservation-night-note');
  if(last){const waste=el('section','',stores,'preservation-waste');el('span','已坏掉 '+a.spoiled,waste,'preservation-shelf-label');const pile=el('div','',waste,'preservation-spoiled-loaves');a.spoiledIDs.forEach(id=>{const p=el('span','',pile);p.dataset.spoiledBread=id;const img=el('img','',p);img.src=TRUST_ASSETS.bakery.bread;img.alt='已经坏掉的面包，不是成交';img.draggable=false;});if(!a.spoiled)el('small',a.night?'这一晚没有损坏':'还没过夜',waste);}
  const inspection=el('p','点一个人，看看钱包和买到的面包。',observation,'preservation-inspection');inspection.setAttribute('role','status');
  const people=el('div','',observation,'preservation-people');a.wallets.forEach((cash,i)=>{const bought=last?last.purchases[i]:0,p=el('button','',people,'preservation-person');p.type='button';p.dataset.person=String(i);p.dataset.satisfied=String(bought===2);p.dataset.expression=last?(bought===2?'relieved':'nervous'):'neutral';p.setAttribute('aria-label','查看顾客'+(i+1)+'的钱包与购物');p.innerHTML=person(last?bought===2:null);el('small','顾客'+(i+1),p);el('span',cash+'枚',p);const bag=el('div','',p,'preservation-bag');for(const id of last?.bought[i]||[]){const img=el('img','',bag);img.src=TRUST_ASSETS.bakery.bread;img.alt=last.day===2&&id.startsWith('1:')?'买到昨天留下的面包':'买到今天新做的面包';img.dataset.purchasedBread=id;img.dataset.old=String(last.day===2&&id.startsWith('1:'));img.draggable=false;}el('small',last?'买到 '+bought+' / 想买2':'想买2个',p);p.onclick=()=>{const old=last?.day===2?last.bought[i].filter(id=>id.startsWith('1:')).length:0;inspection.textContent='顾客'+(i+1)+'：钱包剩'+cash+'枚。'+(last?'第'+last.day+'天每个'+last.setup.price+'枚，想买2个，买到'+bought+'个。'+(old?'其中'+old+'个是昨晚留下的。':''):'还没营业，想买2个面包。');StreetArt.decorateMoney(inspection);};});
  // Before the first operation, put the live workbench ahead of the untouched shelf.
  if(!last){wrap.insertBefore(workspace,observation);wrap.insertBefore(money,workspace);const challenge=el('p','两天都让六人买够。结束时，店里还能有50枚吗？',wrap,'preservation-challenge-prompt');wrap.insertBefore(challenge,workspace);}
  if(editable)root.GestureBoard.bind(workspace,{pieces,targets,hint,ghostClass:'preservation-ghost',prompt:s.day===2&&s.flexibleBake?'移价签、接插头，或把炉子开关放到停炉。':'先拿起价签或插头，再放到对应位置。',onInspect:id=>{hint.textContent=id.startsWith('oven:')?'不开炉不会退工资；有昨晚的剩货才有面包卖。':id==='counter'?'每人最多要两个，今天的工资1枚。':id.includes('efficient')?'省料只减少原料支出，不自动加产。':'冷柜不加收入；有剩货时付2枚保鲜费。';StreetArt.decorateMoney(hint);},onDrop:(id,to)=>{focusId=id;workspaceOpen=true;send(c,id==='bake'?{type:'BAKE',enabled:to==='oven:hot',expectedRevision:s.revision}:id.startsWith('price:')?{type:'PRICE',price:Number(id.slice(6)),expectedRevision:s.revision}:{type:'CONNECT',tool:id.slice(5),enabled:to.startsWith('socket:'),expectedRevision:s.revision});}});
  if(focusId){const p=wrap.querySelector('[data-preservation-piece="'+focusId+'"]');if(p){p.focus({preventScroll:true});p.dataset.arrived='true';}focusId=null;}
  if(editable)button(c,'按今天的安排营业 →',{type:'RUN',expectedRevision:s.revision},wrap,'primary');
  else if(s.step==='night')button(c,'关灯，过一晚 →',{type:'NEXT',expectedRevision:s.revision},wrap,'primary');
  const past=el('details','',wrap,'preservation-past-trials');past.hidden=!(c.state.preservationTrials||[]).length;el('summary','对照前几次的安排',past);
  const comparisons=el('div','',past,'preservation-comparisons');(c.state.preservationTrials||[]).slice(-3).forEach(p=>{const cell=el('span','',comparisons);el('small',arrangement(p.periods.map(x=>x.setup)),cell);el('span','卖 '+p.periods.reduce((n,x)=>n+x.sold,0)+' · 坏 '+p.spoiled+' · 剩 '+p.stock,cell);el('strong','店里 '+p.firm+'枚',cell);});
  const book=el('details','',wrap,'street-bounds');el('summary','账本与边界',book);el('p','店里50枚，六人各2枚，总计62枚。开炉一次做12个，普通原料12枚、省料后3枚。每天六人工资各1枚，每人最多买2个。装置各6枚，第一次实际营业才付款；拔掉不退款，再接上不重买。',book);
  book.dataset.preservationBook='true';
  if(exploration){[goal,result,wrap.querySelector('.preservation-night-note'),inspection,people,workspace,past].filter(Boolean).forEach(node=>book.appendChild(node));const replan=button(c,'沿用两天的安排，再试一次 ↺',{type:'REPLAN',expectedRevision:s.revision},wrap);replan.dataset.presentationAction='replan';}
  if(s.flexibleBake)el('p','第一批已经开做，第二天可选择停炉：不付新原料、不产新货，现有面包仍可卖。六人工资照付，这是本局既定合同，不是所有企业停工都会这样。顾客依次尝试第一份，再尝试第二份；没钱或没货就买不到。保存旧货不自动少做新货；要比较是否减少重复生产。',book);
  a.periods.forEach(p=>el('p','第'+p.day+'天：售价'+p.setup.price+'枚，卖出'+p.sold+'个，收入'+p.receipts+'枚；工资6枚、原料'+p.inputs+'枚、保鲜'+p.storage+'枚、首次设备'+p.upgrade+'枚。当天现金变化'+p.cashChange+'枚。',book));
  el('p','店里'+a.firm+'枚，顾客共'+a.wallets.reduce((n,x)=>n+x,0)+'枚，原料仓储商'+a.supplier+'枚，设备商'+a.equipment+'枚；合计'+a.moneyAfter+'枚。已坏'+a.spoiled+'个不是卖掉，未售库存不折成现金。',book);
  el('p','当日有剩货且接冷柜才支付2枚保鲜费，保护这一晚。没有保护的面包在进入第二天时坏掉；后来接冷柜不能恢复。第二天也按当日剩货付保鲜费，第三天不在实验范围内。改今天不改昨天；重试从相同钱包开始。两种真正不同的两天安排就可进入解释。',book);
  el('p','只比较两天、一种商品，价格1至3枚、需求上限固定；不模拟全部能源、税、旧设备折旧或融资，收支不称完整利润。低价不自动创造新需要，冷柜不自动改变私人所有权。真实冷链可运输到新市场，这里没有该渠道，不据此说冷链无用或危机必然。',book);
  if(exploration)el('p','挪动结果上的价签或开关，会生成同一开局钱包的新草稿，保留另一天的安排；不会退款、回滚已发生交易或直接产货。两天需重新营业才能比较。对照使用相邻保留的两份不同完整回执，重复安排不多记一次；只有一个日期、一个输入不同，才显示单条件对照，多项一起改不归因给某一台机器。原料与设备商在本实验只收款，不另行给消费者发薪或采购。',book);
  if(!s.flexibleBake)button(c,'试试先卖昨天的面包 ↺',{type:'PLANNED_BEGIN'},c.controls);
  if(s.step==='result'){button(c,'同样的钱，换个安排 ↺',{type:'RETRY'},exploration?book:c.controls);if(s.trials.length>=2)button(c,'这次为什么不同？ →',{type:'CONCLUDE'},c.controls,'primary');}
  if(last&&(wrap.dataset.executed==='RUN'||wrap.dataset.executed==='NEXT')){observation.tabIndex=-1;observation.focus({preventScroll:true});observation.scrollIntoView({block:'start',behavior:'instant'});}
 };
})(window);
