(function(root){
 'use strict';
 const names=['周一','周二','周三','周四','周五'];
 const life=[{id:0,day:2,name:'踢球'},{id:1,day:4,name:'画画'}];
 let executing=false,focusId=null,quickFocus=null,workspaceOpen=false;
 function el(tag,text,parent,cls){const n=document.createElement(tag);n.textContent=text||'';n.className=cls||'';parent.appendChild(n);StreetArt.decorateMoney(n);return n;}
 function crop(url,atlas,key){const f=atlas.frames[key].frame;return '<svg viewBox="'+(f.x+24)+' '+(f.y+34)+' 72 108" aria-hidden="true"><image href="'+url+'" width="'+atlas.meta.size.w+'" height="'+atlas.meta.size.h+'"/></svg>';}
 function person(income,chef){const a=TRUST_ASSETS.bakery;return '<span class="technology-peep">'+crop(a.body,a.bodyAtlas,'body0000')+crop(income?a.face:a.nervous,income?a.faceAtlas:a.nervousAtlas,income?'face0000':'face_nervous0008')+(chef?'<img src="'+a.chefHat+'" alt="">':'')+'</span>';}
 function lifeArt(id){return '<svg viewBox="0 0 60 60" aria-hidden="true"><g fill="white" stroke="#666" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'+(id===0?'<circle cx="30" cy="30" r="23"/><path d="M30 18L41 26 36 39H23L19 26ZM30 18V7M41 26L52 23M36 39L45 49M23 39L15 49M19 26L8 23"/>':'<path d="M12 17Q29 9 45 18L50 42Q29 53 10 43Z"/><circle cx="21" cy="24" r="3"/><circle cx="32" cy="22" r="3"/><circle cx="19" cy="35" r="3"/><path d="M40 40L52 8 57 11 44 44Q39 51 35 48Z"/>')+'</g></svg>';}
 function send(c,a){c.send({type:'TECHNOLOGY',action:{type:'CALENDAR',action:a}});}
 function action(c,text,a,parent,cls){const b=el('button',text,parent,cls||'secondary');b.type='button';b.onclick=function(){send(c,a);};return b;}
 function identical(a,b){return a&&b&&a.rate===b.rate&&a.contract===b.contract&&JSON.stringify(a.staff)===JSON.stringify(b.staff)&&JSON.stringify(a.extras)===JSON.stringify(b.extras)&&JSON.stringify(a.life||[false,false])===JSON.stringify(b.life||[false,false]);}
 // A second view of the same draft, not a second economic experiment. The paid
 // week stays read-only above; the complete crew/capability desk stays optional.
 function nextWeek(c,s,parent,workspace,core){
  const quick=el('section','',parent,'calendar-next');quick.dataset.testid='calendar-next';quick.hidden=workspace.open;
  el('h4','再试一周 · 还没结算',quick);
  const hint=el('p',!s.staff[0]?'阿面没排班。可在“机器与人手”改名单。':core>=5?'日期已排满。可在“机器与人手”改名单。':'拿走工作，排上约定；翻牌换工资约定。',quick,'calendar-next-hint');hint.setAttribute('role','status');
  const pieces=[],targets=[];
  function piece(id,text,host,cls){const b=el('button',text,host,cls);b.type='button';b.dataset.calendarNextPiece=id;pieces.push({id:id,name:text,node:b});return b;}
  function target(id,host,b,accepts){host.dataset.calendarNextTarget=id;targets.push({id:id,node:host,button:b,accepts:accepts});}
  const days=el('div','',quick,'calendar-days');
  for(let i=0;i<5;i++){
   const slot=el('section','',days,'calendar-next-day');slot.dataset.day=String(i);
   const date=el('button',names[i],slot,'calendar-date');date.type='button';date.setAttribute('aria-label','再试一周放到'+names[i]);
   target('day:'+i,slot,date,function(id){const n=Number(id.split(':')[1]);return id.startsWith('life:')?life[n].day===i:id.startsWith('day:')&&i>=core&&!s.extras[i];});
   const content=el('div','',slot,'calendar-next-slot');
   if(i<core)el('span',s.staff[0]?'原来的活':'没排班',content,'calendar-next-locked');
   else if(s.extras[i])piece('day:'+i,'继续做货',content,'calendar-work');
   else el('span',s.staff[0]?'留给生活':'没排班',content,'calendar-free');
   for(const activity of life)if(activity.day===i&&s.life?.[activity.id]){const b=piece('life:'+activity.id,activity.name,content,'calendar-life-card');const art=el('span','',b);art.innerHTML=lifeArt(activity.id);}
  }
  const tray=el('div','',quick,'calendar-next-tray');
  const rest=el('section','',tray,'calendar-next-rest'),restButton=el('button','把工作放下',rest,'calendar-destination');restButton.type='button';restButton.setAttribute('aria-label','再试一周放到休息处');target('rest',rest,restButton,function(id){return id.startsWith('day:')&&s.extras[Number(id.split(':')[1])];});
  const pocket=el('div','',rest,'calendar-rest-pocket');for(let i=core;i<5;i++)if(!s.extras[i])piece('day:'+i,names[i]+' · 休息',pocket,'calendar-rest-day');
  const wishes=el('section','',tray,'calendar-next-wishes'),wishesButton=el('button','我的约定',wishes,'calendar-destination');wishesButton.type='button';wishesButton.setAttribute('aria-label','再试一周把约定放回');target('wishes',wishes,wishesButton,function(id){return id.startsWith('life:');});
  const pending=el('div','',wishes,'calendar-pending-life');for(const activity of life)if(!s.life?.[activity.id]){const b=piece('life:'+activity.id,activity.name,pending,'calendar-life-card');const art=el('span','',b);art.innerHTML=lifeArt(activity.id);el('small',names[activity.day],b);}
  const contract=action(c,'',{type:'FLIP_CONTRACT'},quick,'calendar-next-contract');contract.dataset.testid='calendar-next-contract';contract.dataset.contract=s.contract;contract.setAttribute('aria-label','再试一周翻转工资约定');el('span',s.contract==='weekly'?'周薪不变 · 每周5枚':'按天付薪 · 每天1枚',contract);el('small','翻面比较另一种约定 ↺',contract);
  root.GestureBoard.bind(quick,{pieces:pieces,targets:targets,hint:hint,prompt:'拖工作或约定到日历；也可以先拿起，再点日期。',rejectMessage:function(id,to){return id?.startsWith('life:')&&to.startsWith('day:')?'约的是'+names[life[Number(id.split(':')[1])].day]+'，不是这天。':'这天的工作不能放在这里。';},onDrop:function(id,to){
   const i=Number(id.split(':')[1]);if(id.startsWith('life:')){if(to!=='wishes'&&s.staff[0]&&(life[i].day<core||s.extras[life[i].day])){hint.textContent='这天还在上班，先把工作拿走。';return;}quickFocus=id;send(c,{type:'PLACE_LIFE',activity:i,placed:to!=='wishes'});}else{quickFocus=to.startsWith('day:')?to:id;send(c,{type:'PLACE_DAY',from:i,to:to==='rest'?'rest':Number(to.split(':')[1])});}
  }});
  if(quickFocus){const b=quick.querySelector('[data-calendar-next-piece="'+quickFocus+'"]');if(b){b.dataset.arrived='true';b.focus({preventScroll:true});}quickFocus=null;}
  return quick;
 }
 function receipts(c,s,parent){
  const all=c.state.calendarTrials||[];if(!all.length)return;
  const past=el('details','',parent,'calendar-past-trials');el('summary','已过完的周 · '+all.length+'份回执',past);
  el('p','同一机器条件放在一起；每周从同一起点重算。',past,'small');
  [0,20,40,60,80].forEach(function(rate){const rows=all.filter(function(r){return r.rate===rate;});if(!rows.length)return;
   const group=el('section','',past,'capability-receipt-group');group.dataset.receiptRate=String(rate);group.dataset.receiptCount=String(rows.length);
   el('h4','机器省下 '+rate+'% 工时'+(rate===s.rate?' · 当前条件':''),group);
   rows.forEach(function(r,i){el('p',(i+1)+' · 阿面收入'+r.personal.income+'枚 · 买到'+r.personal.bought+'/5份 · '+r.crew+'人 × '+r.workDays+'天 · 剩货'+r.unsold,group);});
  });
 }
 root.renderTimeCalendar=function(c,t){
  const s=t.calendar,a=c.state.calendarAccount,trials=(c.state.calendarTrials||[]).filter(function(r){return r.rate===s.rate;});
  if(s.phase==='conclusion'){
   const end=el('div','',c.readout,'technology-conclusion');
   el('p','机器省下了劳动；少上班是否少拿钱，要看怎样安排。',end,'relief-caption');
   const history=el('div','',end,'calendar-comparisons');trials.slice(-3).forEach(function(r){const row=el('span','上班'+r.personal.freeDays.filter(v=>!v).length+'天 · 收入'+r.personal.income+'枚 · 买到'+r.personal.bought+'/5份 · '+(r.personal.recorded?r.personal.activities.filter(v=>v.attended).length+'个约定赶上了':'旧记录未记生活安排'),history);row.dataset.personalWorkDays=String(r.personal.freeDays.filter(v=>!v).length);});receipts(c,s,end);
   const limits=el('details','',end,'street-bounds');el('summary','这个实验能说明什么？',limits);
   el('p','同样节省工时，可能换来更多产出，也可能换来带薪休息。只减少排班而不保收入，购买力会下降；减少人手也不同于每个人少上一天班。',limits);
   el('p','技术没有自动改变机器的产权和经营决定权。保工资、缩工时并不直接等于社会主义，也不能从一次简化实验推出资本主义必然自动崩溃。',limits);
   const reset=el('details','',limits,'experiment-reset');el('summary','清空记录，重新开局',reset);el('p','只清空这条闲暇分支的安排和回执，其他分支不动。',reset);
   const clear=el('button','清空本分支，重新开局',reset,'secondary');clear.type='button';clear.onclick=function(){c.send({type:'TECHNOLOGY',action:{type:'RESTART'}});};
   const again=action(c,'保留回执，再排一周 ↺',{type:'REOPEN'},c.controls);again.onclick=function(){workspaceOpen=true;send(c,{type:'REOPEN'});};return;
  }
  const wrap=el('div','',c.readout,'time-calendar');wrap.dataset.testid='time-calendar';
  const workspace=el('details','',wrap,'calendar-workspace');workspace.open=!a||workspaceOpen;
  const workspaceHeading=el('summary','机器与人手 · 完整安排',workspace);workspaceHeading.hidden=!a;
  let quick=null;
  workspace.addEventListener('toggle',function(){workspaceOpen=workspace.open;if(quick)quick.hidden=workspace.open;root.GestureBoard.cancel();});
  const crew=s.staff.filter(Boolean).length,core=crew?Math.min(5,Math.ceil((50-s.rate/2)/crew)):5;
  const knobs=el('details','',workspace,'calendar-capability');el('summary','机器省下 '+s.rate+'% 工时',knobs);
  const label=el('label','假设节省的任务工时',knobs);label.htmlFor='calendar-rate';
  const rate=el('input','',knobs);rate.id='calendar-rate';rate.type='range';rate.min='0';rate.max='80';rate.step='20';rate.value=String(s.rate);rate.onchange=function(){send(c,{type:'RATE',rate:Number(rate.value)});};
  const wish=el('div','',workspace,'calendar-intention');const face=el('span','',wish,'calendar-intention-person');face.innerHTML=person(5,true);el('p','阿面：“周三踢球，周五画画。别又忙忘啦！”',wish);
  const hint=el('p','先拿走那天的工作，再把想做的事放进日历。',workspace,'calendar-hint');hint.setAttribute('role','status');
  const calendar=el('div','',workspace,'calendar-sheet');el('span','这一周的排班 · 同起点重试',calendar,'calendar-sheet-label');
  const days=el('div','',calendar,'calendar-days'),pieces=[],targets=[];
  function piece(id,text,parent,cls){const n=el('button',text,parent,cls);n.type='button';n.dataset.calendarPiece=id;pieces.push({id:id,name:text||'小'+(Number(id.split(':')[1])+1),node:n});return n;}
  function free(i){return !s.staff[0]||i>=core&&!s.extras[i];}
  function target(id,node,button,kind,available){node.dataset.calendarTarget=id;targets.push({id:id,node:node,button:button,accepts:function(piece){const i=Number(piece.split(':')[1]);if(kind==='day'&&piece.startsWith('life:'))return life[i].day===Number(id.split(':')[1]);return piece.startsWith(kind+':')&&(!available||available(i));}});}
  function lifePiece(id,parent){const b=piece('life:'+id,life[id].name,parent,'calendar-life-card');b.prepend(document.createElement('span'));b.firstChild.innerHTML=lifeArt(id);return b;}
  for(let i=0;i<5;i++){
   const slot=el('section','',days,'calendar-day');slot.dataset.day=String(i);slot.dataset.kind=i<core?'core':s.extras[i]?'extra':'rest';
   const heading=el('button',names[i],slot,'calendar-date');heading.type='button';heading.setAttribute('aria-label','放到'+names[i]);target('day:'+i,slot,heading,'day',function(){return i>=core&&!s.extras[i];});
   if(i<core){el('span','原来的活',slot,'calendar-core');el('span','已排好',slot,'calendar-lock');}
   else{if(s.extras[i])piece('day:'+i,'继续做货',slot,'calendar-work');else el('span','留给生活',slot,'calendar-free');}
   for(const activity of life)if(activity.day===i&&s.life?.[activity.id])lifePiece(activity.id,slot);
  }
  const wishes=el('section','',workspace,'calendar-wishes');const returnWish=el('button','想留给自己的事',wishes,'calendar-destination');returnWish.type='button';returnWish.setAttribute('aria-label','把约定放回');target('wishes',wishes,returnWish,'life');const pending=el('div','',wishes,'calendar-pending-life');for(const activity of life)if(!s.life?.[activity.id]){const b=lifePiece(activity.id,pending);el('small',names[activity.day],b);}
  const below=el('div','',workspace,'calendar-below');
  const rest=el('section','',below,'calendar-rest');const restHeading=el('button','留给生活',rest,'calendar-destination');restHeading.type='button';restHeading.setAttribute('aria-label','放到休息处');target('rest',rest,restHeading,'day',function(i){return s.extras[i];});
  const pocket=el('div','',rest,'calendar-rest-pocket');
  for(let i=core;i<5;i++)if(!s.extras[i])piece('day:'+i,names[i]+' · 休息',pocket,'calendar-rest-day');
  if(!pocket.children.length){const idle=el('span','',pocket,'calendar-rest-peep');idle.innerHTML=person(5);idle.setAttribute('aria-hidden','true');el('span','把工作日放在这里',pocket,'calendar-empty');}
  const contract=action(c,'',{type:'FLIP_CONTRACT'},below,'calendar-contract');contract.dataset.testid='calendar-contract';contract.dataset.contract=s.contract;contract.setAttribute('aria-label','翻转工资约定');
  el('small','工资约定 · 试换条件',contract);el('strong',s.contract==='weekly'?'周薪不变':'按上班天数',contract);el('span',s.contract==='weekly'?'每人每周5枚':'每人每天1枚',contract);el('small',s.contract==='weekly'?'有休息日，也照发':'不排班的日子，不发',contract);
  const roster=el('details','',workspace,'calendar-roster');el('summary','人手名单 · '+crew+' / 10 人排班',roster);
  const lists=el('div','',roster,'calendar-staff-zones');
  const zones={};[['staff','仍在名单'],['off','本周不排班']].forEach(function(row){const zone=el('section','',lists,'calendar-staff-zone');const heading=el('button',row[1],zone,'calendar-destination');heading.type='button';heading.setAttribute('aria-label','放到'+row[1]);target(row[0],zone,heading,'person',function(i){return s.staff[i]!== (row[0]==='staff');});zones[row[0]]=el('div','',zone,'calendar-people');});
  s.staff.forEach(function(employed,i){const p=piece('person:'+i,'',zones[employed?'staff':'off'],'calendar-person');p.innerHTML=person(employed?5:0);el('small','小'+(i+1),p);});
  el('p','名单始终是这十个人。不排班，不会从街上消失。',roster,'small');
  root.GestureBoard.bind(workspace,{prompt:'拿起工作日或小人，再选择位置放下。',hint:hint,pieces:pieces,targets:targets,onDrop:function(id,to){
   workspaceOpen=true;
   const i=Number(id.split(':')[1]);if(id.startsWith('life:')){if(to!=='wishes'&&!free(life[i].day)){hint.textContent='这天还在上班，先把工作拿走。';return;}focusId=id;send(c,{type:'PLACE_LIFE',activity:i,placed:to!=='wishes'});}else{focusId=id;if(id.startsWith('day:'))send(c,{type:'PLACE_DAY',from:i,to:to==='rest'?'rest':Number(to.split(':')[1])});else send(c,{type:'STAFF',person:i,employed:to==='staff'});}
  }});
  if(focusId){const n=wrap.querySelector('[data-calendar-piece="'+focusId+'"]');if(n){const detail=n.closest('details');if(detail)detail.open=true;n.dataset.arrived='true';n.focus({preventScroll:true});}focusId=null;}
  const run=action(c,'照这样，过一周 →',{type:'RUN'},wrap,'primary');run.dataset.testid='calendar-run';run.onclick=function(){executing=true;workspaceOpen=false;send(c,{type:'RUN'});};
  if(a){
   const probe=c.state.calendarExploration;
   const result=el('section','',wrap,'calendar-result');wrap.insertBefore(result,workspace);result.dataset.testid='calendar-result';result.dataset.stale=String(!identical(s,s.run));if(executing)result.dataset.running='true';
   el('p',identical(s,s.run)?'刚过完的一周':'下面的安排已改；这里仍是上次实际结果。',result,'calendar-result-label');
   const question=el('h3',probe?probe.prompt:'阿面，这周过得怎样？',result,'calendar-result-title');if(probe)question.dataset.testid='calendar-question';
   const previous=trials.at(-2);
   if(previous){const change=previous.personal.freeDays.filter(Boolean).length-a.personal.freeDays.filter(Boolean).length,income=a.personal.income-previous.personal.income;const comparison=el('p',probe&&probe.comparison?probe.comparison:'比上次：'+(change===0?'上班天数不变':(change<0?'少上':'多上')+Math.abs(change)+'天')+' · '+(income===0?'收入不变':(income<0?'少领':'多领')+Math.abs(income)+'枚'),result,'calendar-result-change');comparison.dataset.matched=String(!!(probe&&probe.comparison));}
   const week=el('div','',result,'calendar-actual-week');week.setAttribute('aria-label','阿面上次实际的一周');
   a.personal.freeDays.forEach(function(free,i){const day=el('span','',week);day.dataset.day=String(i);day.dataset.free=String(free);day.style.setProperty('--day',String(i));const label=el('small',names[i],day);if(probe&&probe.focusDay===i)label.dataset.probeFocus='true';el('span',free?(s.run.staff[0]?'休息':'没排班'):'上班',day);const activity=a.personal.activities.find(v=>v.day===i&&v.attended);if(activity){const art=el('span','',day,'calendar-actual-activity');art.innerHTML=lifeArt(activity.id);art.setAttribute('aria-label',activity.name+'赶上了');}});
   const personal=el('div','',result,'calendar-personal-result');personal.dataset.testid='calendar-personal';personal.dataset.bought=a.personal.bought;personal.dataset.attended=a.personal.activities.filter(v=>v.attended).length;
   const portrait=el('span','',personal,'calendar-protagonist');portrait.innerHTML=person(a.personal.bought>=5,s.run.staff[0]);
   const personalCopy=el('div','',personal);el('span','阿面这一周领了'+a.personal.income+'枚',personalCopy);const bag=el('div','',personalCopy,'calendar-personal-bag');for(let i=0;i<5;i++){const loaf=el('img','',bag);loaf.src=TRUST_ASSETS.bakery.bread;loaf.alt=i<a.personal.bought?'买到一个面包':'还想买一个面包';loaf.dataset.missing=i>=a.personal.bought;}el('small','买到'+a.personal.bought+' / 想买5份',personalCopy);
   const moments=el('div','',personalCopy,'calendar-life-moments');for(const v of a.personal.activities){const moment=el('span','',moments);moment.dataset.attended=v.attended;moment.innerHTML=lifeArt(v.id);el('small',v.name+'：'+(!a.personal.recorded?'旧记录未记':v.attended?'赶上了':v.working?'这天在上班':'没有安排'),moment);}
   el('p',!a.personal.recorded?'这是旧账，新约定还没有执行。':a.personal.bought<5?'“时间空下来了，面包却买不够。”':a.personal.activities.every(v=>v.attended)?'“这次不用爽约了！”':'“工资拿到了，约好的事还没赶上。”',result,'calendar-personal-voice');
   const shop=el('details','',result,'calendar-shop-result');el('summary','整间店这一周',shop);
   const film=el('div','',shop,'calendar-week-film');a.days.forEach(function(d){const frame=el('span','',film,'calendar-frame');frame.dataset.kind=d.kind;frame.style.setProperty('--day',String(d.day));el('small',names[d.day],frame);const art=el('span','',frame,'calendar-day-art');if(d.working){const oven=el('img','',art);oven.src=TRUST_ASSETS.bakery.newOven;oven.alt='烤炉在工作';}else{art.innerHTML=person(s.run.contract==='weekly'?5:0);art.setAttribute('aria-label','这一日休息');}el('span',d.working?'做了'+d.output:'休息',frame);});
   const stats=el('div','',shop,'calendar-stats');[['做出',a.output],['卖出',a.sold],['留下',a.unsold]].forEach(function(row){el('span',row[0]+' '+row[1],stats);});
   const wallets=el('div','',shop,'calendar-wallets');a.people.forEach(function(p){const box=el('span','',wallets,'calendar-wallet');box.dataset.person=String(p.id);box.dataset.income=String(p.income);el('small',p.id?'小'+(p.id+1):'阿面',box);el('span',p.income+'枚',box);box.title='本周买了'+p.bought+'份，钱包剩'+p.cash+'金币';});
   el('p',a.crew+'人上班 · 每人'+a.workDays+'天 · 工资合计'+a.wages+'枚',shop,'calendar-income');
   const book=el('details','',result,'street-bounds');el('summary','账本与模型假设',book);
   el('p','每次从企业100枚、老板10枚、十人零积蓄重试，总金币110枚。工资'+a.wages+'枚、原料'+a.materials+'枚、维护'+a.maintenance+'枚；企业结余'+a.firmAfter+'枚。结余变化不是净利润，未计机器购置、折旧和存货估值。',book);
   el('p','这是独立的一周实验，不带入序章街道资金。原来10人各干5天，做60份；机器使原来的任务需要更少人日。假设任务完全可分，多出的生产日才增加产量。每人最多买5份，老板最多买10份，价格为1金币；购买有实际付款，剩货不算卖出。',book);
   el('p','周薪合同中，在名单上的人每周领5枚；按天合同中，每上班一天领1枚。翻面是比较两种假想约定，不代表工人能单方改变合同。人手调整比较不同的稳定安排，不模拟一次真实解雇、安置和劳动法规。阿面是十名劳动者的第一位，踢球和画画只检验日期是否空出；不核算交通、器材与场地费用，买五份是教学需要，不是现实营养标准。现实的缩工时效果还取决于劳动强度、需求、工资协商和国家制度。',book);
   quick=nextWeek(c,s,wrap,workspace,core);wrap.insertBefore(quick,workspace);
   if(executing){result.tabIndex=-1;result.focus({preventScroll:true});result.scrollIntoView({block:'start',behavior:'instant'});}
  }
  receipts(c,s,wrap);
  executing=false;
  if(s.run&&(s.rate===0||trials.length>=2))action(c,'时间归谁？ →',{type:'CONCLUDE'},c.controls,'primary');
 };
})(window);
