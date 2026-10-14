(function(root){
 'use strict';
 function el(tag,words,parent,cls){const n=document.createElement(tag);n.textContent=words||'';n.className=cls||'';parent.appendChild(n);StreetArt.decorateMoney(n);return n;}
 function button(c,words,action,parent,cls){const b=el('button',words,parent||c.controls,cls||'secondary');b.type='button';b.onclick=function(){c.send({type:'TECHNOLOGY',action:action});};return b;}
 function crop(url,atlas,key,person){const f=atlas.frames[key].frame,box=person?[f.x+24,f.y+34,72,108]:[f.x,f.y,f.w,f.h];return '<svg viewBox="'+box.join(' ')+'" aria-hidden="true"><image href="'+url+'" width="'+atlas.meta.size.w+'" height="'+atlas.meta.size.h+'"/></svg>';}
 function peep(employed,income,satisfied){const a=TRUST_ASSETS.bakery,happy=!!satisfied&&!!a.faceAtlas.frames.face0006;return '<span class="technology-peep '+(employed?'at-work':'off-work')+'" data-expression="'+(happy?'happy':income?'steady':'worried')+'">'+crop(a.body,a.bodyAtlas,'body0000',true)+crop(income?a.face:a.nervous,income?a.faceAtlas:a.nervousAtlas,income?happy?'face0006':'face0000':a.nervousAtlas.frames.face_nervous0008?'face_nervous0008':Object.keys(a.nervousAtlas.frames)[0],true)+'</span>';}
 let arrangementFocus=null;
 let arrangementExecuting=false;
 let arrangementWorkspaceOpen=false;
 let arrangementNextFocus=false;
 const allocationNames={cut:'不再排班',expand:'继续做货',time:'带薪休息',share:'不排班，仍分享'};
 function arrangementArt(mode){
  if(mode==='expand')return '<img src="'+TRUST_ASSETS.bakery.newOven+'" alt="">';
  const shapes={cut:'<path d="M21 72V13L48 10V72M48 72H67M30 42H65M57 34L66 42L57 50"/><circle cx="40" cy="42" r="1.5"/>',time:'<path d="M15 48H71V61H15ZM19 61V73M67 61V73M21 48V25H64V48M25 35H60"/><path d="M50 9H61L50 20H61"/>',share:'<circle cx="29" cy="29" r="15"/><path d="M27 21H33M27 21V37M27 29H33M13 62Q24 47 39 50L48 54M22 63L44 66Q54 65 70 48Q75 43 69 41L49 54H37"/>'};
  return '<svg viewBox="0 0 86 82" aria-hidden="true"><g fill="none" stroke="#60605d" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">'+shapes[mode]+'</g></svg>';
 }
 function allocations(t){return t.allocations||Array(t.rate/10).fill(t.mode);}
 function samePlan(t){return !!t.run&&JSON.stringify(allocations(t))===JSON.stringify(allocations(t.run));}
 function receipts(c,t,parent){
  const all=c.state.technologyTrials||[];if(!all.length)return;
  const past=el('details','',parent,'automation-past-trials');el('summary','已营业的回执 · '+all.length+'份',past);
  el('p','同一机器条件放在一起；每次从同一起点重算。',past,'small');
  [0,20,40,60,80].forEach(function(rate){const rows=all.filter(function(r){return r.rate===rate;});if(!rows.length)return;
   const group=el('section','',past,'capability-receipt-group');group.dataset.receiptRate=String(rate);group.dataset.receiptCount=String(rows.length);
   el('h4','机器省下 '+rate+'% 工时'+(rate===t.rate?' · 当前条件':''),group);
   rows.forEach(function(r,i){el('p',(i+1)+' · '+r.households.filter(function(p){return p.income>0;}).length+'人有收入 · 做出'+r.output+' · 卖出'+r.sold+' · 剩'+r.unsold,group);});
  });
 }
 function hiddenWorkEntry(parent){
  const hidden=el('details','',parent,'hidden-work-entry');el('summary','掀开“自动接单”的幕布',hidden);let mounted=false;
  hidden.ontoggle=function(){if(hidden.open&&!mounted){mounted=true;root.HiddenWork.mount(hidden);}};
 }
 function introduction(c,intro){
  el('p','机器接走六成工时。腾出来的人，怎么安排？',intro,'relief-caption');
  const handoff=el('div','',intro,'automation-handoff');handoff.dataset.testid='automation-handoff';
  const packet=el('button','',handoff,'automation-task-packet');packet.type='button';packet.dataset.taskPiece='batch';
  packet.innerHTML='<svg class="automation-task-art" viewBox="0 0 100 110" aria-hidden="true"><g stroke="#60605d" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round" fill="#fffef8"><path d="M19 14L80 12L83 96L17 98Z"/><path d="M36 9L63 8L65 22L34 23Z"/><path d="M29 40L34 45L42 34M49 39L69 38M29 60L34 65L42 54M49 59L69 58" fill="none"/><path d="M29 81Q30 69 47 70Q66 68 70 80L68 88L31 89Z" fill="#e8ddc3"/><path d="M40 73L43 79M52 73L55 79"/></g></svg><span>这批重复的活</span>';
  packet.setAttribute('aria-label','拿起这批任务');
  const socket=el('button','',handoff,'automation-task-socket');socket.type='button';socket.setAttribute('aria-label','交给自动化设备');
  socket.innerHTML='<img src="'+TRUST_ASSETS.bakery.newOven+'" alt="自动化设备"><span>交给机器</span>';
  const hint=el('div','',intro,'piece-hint');hint.setAttribute('role','status');
  GestureBoard.bind(handoff,{pieces:[{id:'batch',name:'这批任务',node:packet}],targets:[{id:'machine',node:socket,button:socket}],hint:hint,prompt:'把任务交给机器：拖动或点选。',onDrop:function(){c.send({type:'TECHNOLOGY',action:{type:'BEGIN'}});}});
  const more=el('details','',intro,'scene-supplement');el('summary','另外试试',more);
  const optional=el('details','',more,'street-bounds');el('summary','隔壁的低价',optional);button(c,'去看看隔壁的低价 →',{type:'PRESSURE',action:{type:'BEGIN'}},optional);
  hiddenWorkEntry(more);
  return more;
 }
 function rehearse(c,t,result){
  const next=c.state.automationRehearsal;if(!next)return;
  const desk=el('section','',result,'automation-rehearsal');desk.dataset.testid='automation-rehearsal';desk.dataset.changedPeople=String(next.changedPeople);
  el('p',next.changedPeople>1?'下一次的排班草稿':'下一次，只改'+next.name,desk,'automation-next-title');
  const prompt='挪一人，再试一周。',hint=el('p',next.changedPeople>1?'已改'+next.changedPeople+'人；这不是单人对照。':'',desk,'automation-next-hint');hint.setAttribute('role','status');
  const places=el('div','',desk,'automation-next-places'),targets=[];
  const terms={cut:'工资0枚',expand:'工资4枚 · 做货',time:'工资4枚 · 休息',share:'分享4枚 · 不排班'};
  let piece;
  ['cut','expand','time','share'].forEach(function(mode){
   const zone=el('div','',places,'automation-next-place');zone.dataset.automationNextTarget=mode;
   const destination=el('button','',zone,'automation-next-destination');destination.type='button';destination.setAttribute('aria-label','下次安排：'+allocationNames[mode]);
   destination.innerHTML=arrangementArt(mode);el('span',allocationNames[mode],destination);el('small',terms[mode],destination);
   const slot=el('div','',zone,'automation-next-slot');
   if(mode===next.mode){piece=el('button','',slot,'automation-next-card');piece.type='button';piece.dataset.automationNextPiece=String(next.person);piece.dataset.draftMode=mode;piece.innerHTML='<span class="automation-name-clip" aria-hidden="true"></span>';el('span',next.name,piece);el('small','下次排班牌',piece);}
   targets.push({id:mode,node:zone,button:destination});
  });
  GestureBoard.bind(desk,{pieces:[{id:next.person,name:next.name+'的下次排班牌',node:piece}],targets:targets,hint:hint,prompt:prompt,ghostClass:'automation-next-ghost',onDrop:function(id,mode){if(allocations(t)[Number(id)]===mode)return;arrangementNextFocus=true;arrangementWorkspaceOpen=false;c.send({type:'TECHNOLOGY',action:{type:'ASSIGN',person:Number(id),mode:mode}});}});
  if(arrangementNextFocus){piece.dataset.arrived='true';piece.focus({preventScroll:true});arrangementNextFocus=false;}
  if(next.changedPeople){
   const run=button(c,'按新安排，重做这一周 →',{type:'RUN'},desk,'primary');run.dataset.testid='automation-retrial-run';
   run.onclick=function(){arrangementExecuting=true;arrangementWorkspaceOpen=false;c.send({type:'TECHNOLOGY',action:{type:'RUN'}});};
  }
 }
 function renderArrangement(c,t,a){
  const setup=el('div','',c.readout,'automation-arrangement');setup.dataset.testid='automation-arrangement';
  const planner=el(a?'details':'div','',setup,'automation-plan');
  if(a){el('summary','全部人手与机器条件',planner);planner.open=(!samePlan(t)&&(!c.state.automationRehearsal||c.state.automationRehearsal.changedPeople>1))||arrangementWorkspaceOpen;planner.ontoggle=function(){if(planner.isConnected)arrangementWorkspaceOpen=planner.open;};}
  const rate=el('details','',planner,'automation-capability');el('summary','机器能接多少活？ · 当前 '+t.rate+'%',rate);
  const label=el('label','假设省下的任务工时',rate);label.htmlFor='automation-rate';
  const input=el('input','',rate);input.id='automation-rate';input.type='range';input.min='0';input.max='80';input.step='20';input.value=String(t.rate);
  input.onchange=function(){c.send({type:'TECHNOLOGY',action:{type:'RATE',rate:Number(input.value)}});};
  const stage=el('div','',planner,'automation-floor');const machine=el('div','',stage,'automation-controller');
  machine.innerHTML='<svg viewBox="0 0 100 90" aria-label="接下任务的自动化控制器" role="img"><g fill="white" stroke="#555" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 18Q20 11 28 11H74Q81 11 81 20L79 63H20Z"/><path d="M30 23L69 24V51H30Z" fill="#f3f2ef"/><path d="M42 63L40 74H65L61 63M31 80H74M49 11V5"/><circle cx="50" cy="3" r="2"/><path d="M41 33V38M59 33V38M42 44Q50 50 60 43"/></g></svg>';
  const owner=el('span','',machine,'automation-owner');owner.dataset.role='machine-owner';owner.innerHTML=crop(TRUST_ASSETS.bakery.hat,TRUST_ASSETS.bakery.hatAtlas,'hatguy0000');owner.setAttribute('aria-label','拥有机器的老板');
  el('span','机器归老板',machine);
  const crew=el('div','',stage,'automation-remaining');for(let i=0;i<10-t.rate/10;i++){const p=el('span','',crew);p.innerHTML=peep(true,4);p.setAttribute('aria-label','继续原来的工作');}
  el('span',(10-t.rate/10)+'人继续原来的工作',crew,'automation-remaining-label');
  const pieces=allocations(t).map(function(mode,i){return {id:i,name:'小'+(i+1),target:mode,html:peep(mode==='expand'||mode==='time',mode==='cut'?0:4)};});
  if(pieces.length){
   const board=root.GestureBoard.mountPieces(planner,{
    prompt:'把小人放进这周的安排：拖动或点选。',
    pieces:pieces,
    targets:[{id:'cut',label:allocationNames.cut,hint:'不发工资'},{id:'expand',label:allocationNames.expand,hint:'工资4枚 · 多做产品'},{id:'time',label:allocationNames.time,hint:'工资4枚 · 轮休一周'},{id:'share',label:allocationNames.share,hint:'分享4枚 · 不领工资'}],
    onDrop:function(id,mode){if(allocations(t)[Number(id)]===mode)return;arrangementFocus=id;c.send({type:'TECHNOLOGY',action:{type:'ASSIGN',person:Number(id),mode:mode}});}
   });
   board.querySelectorAll('.piece-destination').forEach(function(destination){const image=document.createElement('span');image.className='automation-place-art';image.innerHTML=arrangementArt(destination.closest('[data-piece-target]').dataset.pieceTarget);destination.prepend(image);});
   if(arrangementFocus!==null){const focus=setup.querySelector('[data-piece="'+arrangementFocus+'"]');if(focus){focus.dataset.arrived='true';focus.focus({preventScroll:true});}arrangementFocus=null;}
  }else el('p','这次机器没接走工时，十个人仍照常上班。',planner,'small');
  const run=button(c,'按这个安排，做一周 →',{type:'RUN'},planner,'primary');run.dataset.testid='automation-run';
  run.onclick=function(){arrangementExecuting=true;arrangementWorkspaceOpen=false;c.send({type:'TECHNOLOGY',action:{type:'RUN'}});};
  if(a){
   const probe=c.state.automationExploration;
   const result=el('div','',setup,'automation-outcome');result.dataset.testid='technology-result';result.dataset.mode=a.mode;
   setup.insertBefore(result,planner);
   if(arrangementExecuting)result.dataset.running='true';
   result.dataset.stale=String(!samePlan(t));
   result.setAttribute('aria-label','本周实际结果');
   if(!samePlan(t))el('p','草稿已改，仍显示上次结果。',result,'automation-result-label');
   const stats=el('div','',result,'technology-stats');[['做出',a.output],['卖出',a.sold],['留下',a.unsold]].forEach(function(row){const line=el('div','',stats,'technology-stat');const bread=el('img','',line);bread.src=TRUST_ASSETS.bakery.bread;bread.alt='';el('span',row[0]+' '+row[1],line);});
   const spotlight=el('div','',result,'automation-focus-result');
   const thoughts=el('div','',result,'automation-person-thought');thoughts.hidden=true;thoughts.setAttribute('role','status');
   const others=el('details','',result,'automation-other-people');el('summary','其余9人，这一周怎样？',others);
   const households=el('div','',others,'automation-payouts');
   a.households.forEach(function(p){
    const name=p.id<10-a.rate/10?'原班'+(p.id+1):'小'+(p.id-(10-a.rate/10)+1),box=el('button','',p.id===(probe?probe.focusPerson:0)?spotlight:households,'automation-payout');box.type='button';box.dataset.person=String(p.id);box.dataset.income=String(p.income);box.dataset.bought=String(p.bought);box.dataset.workDays=String(p.days);box.dataset.allocation=p.allocation;box.dataset.automationPerson=String(p.id);box.style.setProperty('--person-order',String(p.id));box.setAttribute('aria-label',name+'：本周收入'+p.income+'金币，买到'+p.bought+'份面包');box.setAttribute('aria-expanded','false');
    const figure=el('span','',box,'automation-actual-peep');figure.innerHTML=peep(p.employed,p.income,p.bought===4);
    const label=el('small',name,box);if(probe&&probe.focusPerson===p.id)label.dataset.probeFocus='true';el('span',p.income+'枚',box,'automation-actual-income');
    const bag=el('span','',box,'automation-shopping-bag');const bread=el('img','',bag);bread.src=TRUST_ASSETS.bakery.bread;bread.alt='买到面包';el('span',String(p.bought),bag);
    box.onclick=function(){
     const closing=box.getAttribute('aria-expanded')==='true';result.querySelectorAll('.automation-payout').forEach(function(b){b.setAttribute('aria-expanded','false');});thoughts.replaceChildren();thoughts.hidden=closing;if(closing)return;box.setAttribute('aria-expanded','true');
     const voices={work:'原来的活还得做。下班，照样得吃饭。',cut:'机器接班了，我的饭钱可没接上。',expand:'工资照领，继续赶货。面包可别比客人还勤快！',time:'工资没少，这周轮休。终于不用跟烤炉比耐热了。',share:'这周没排班，也分到了钱。能不能决定下一步？还没说呢。'};
     el('p','“'+voices[p.allocation]+'”',thoughts);el('small',name+' · 本周'+(p.allocation==='share'?'分享':'工资')+' '+p.income+'枚 · 上班'+p.days+'天 · 想买4份，买到'+p.bought+'份',thoughts);
     const close=el('button','收起 ×',thoughts,'automation-thought-close');close.type='button';close.onclick=function(){thoughts.hidden=true;box.setAttribute('aria-expanded','false');box.focus({preventScroll:true});};
    };
   });
   const earners=a.households.filter(function(p){return p.income>0;}).length;
   el('p',earners+' / 10 人有收入 · '+a.jobs+' 人在册',result,'automation-income');
   const question=el('p',probe?probe.prompt:a.rate===0?'机器没省下工时，这次安排没有带来变化。':earners===10&&a.unsold===0?'“面包卖完了，我也没断收入！”':earners<10?'“活交给机器了，我的钱包却空了。”':'“大家还有收入，可多做的面包留下了。”',spotlight,'technology-voice');if(probe)question.dataset.testid='automation-question';
   const trials=(c.state.technologyTrials||[]).filter(function(r){return r.rate===t.rate;});
   if(trials.length>1){const before=trials.at(-2),after=trials.at(-1),delta=after.householdIncome-before.householdIncome;
    const contrast=el('p',probe&&probe.comparison?probe.comparison:'机器没换。'+(delta?'这次大家的收入'+(delta>0?'多':'少')+Math.abs(delta)+'枚，卖出'+(after.sold-before.sold>=0?'多':'少')+Math.abs(after.sold-before.sold)+'份。':after.output!==before.output?'收入没变，产量变了，剩货也跟着变。':'这两次的产销相同；再看看工资、分享和在册人数。'),result,'automation-contrast');contrast.dataset.testid='automation-contrast';contrast.dataset.matched=String(!!(probe&&probe.comparison));
   }
   rehearse(c,t,result);
   const book=el('details','',result,'street-bounds');el('summary','工资、分享和机器的账',book);
   el('p','工资'+a.wages+'枚，分享'+a.transfer+'枚，维护'+a.inputs+'枚，收款'+a.sold+'枚，企业结余'+a.firmAfter+'枚。所有账户的金币合计仍为'+a.moneyAfter+'枚。',book);
   el('p','剩货没有假装卖出。本周收支差不是净利润：机器已经购入，这里未计购置、折旧和存货估值。',book);
   el('p','这局不比较老板赚多少：员工的收入全用于本店面包，所以不同安排的店内余额相同。这里比较谁有收入、谁买到面包、谁上班，以及留下多少货。',book);
   el('p','每次从相同开局重试。小人表示被省下的岗位量；这是把任务工时折成排班的教学设定，不是说AI能把某个真实职业整个替换。带薪休息是本周轮休，不是永久失业。每人最多买4份，老板用原来的8枚购物。机器的产权与经营决定权未变。',book);
  }
  receipts(c,t,setup);
  arrangementExecuting=false;
  if(t.run&&(t.rate===0||(t.trials||[]).filter(function(r){return r.rate===t.rate;}).length>=2||t.seen===15))button(c,'结果为什么不同？ →',{type:'CONCLUDE'},null,'primary');
 }
 function report(c,t,parent){
  const d=el('details','',parent||c.readout,'technology-report');d.dataset.testid='technology-report';el('summary','现实研究与来源',d);
  const manuscripts=[
   ['2020-12-12','谁设定管理的目标？','控制论讨论用于追问算法背后的组织目的，不把技术直接等同于统治。','BV1NK4y1L7gw'],
   ['2021-02-02','工具在谁手上，谁能作决定？','资本讨论用于区分物质工具、使用权与所有权，不用工厂账面余额代替剩余价值。','BV1Jt4y1B72f'],
   ['2023-04-14','看起来自动了，谁在收尾？','AI讨论用于追问隐形劳动和省下工时的去向，不把任务暴露当成已经失业。','BV1bk4y1e7Jp'],
   ['2024-05-18','效率提高，目的和总耗能呢？','科学向善讨论用于追问生产目标与生态，不把企业调查或宣传当作独立研究结论。','BV1Xb421b74B'],
   ['2026-02-20','未来许诺了什么，今天兑现了什么？','AGI讨论用于区分未来叙事与已验证成果；约3:27明确不预测实现时间或可行性。','BV1X5fgBfEFp']
  ].map(function(row){return row[0]+' · '+row[1]+'\n'+row[2]+'\n学院派Academia · https://www.bilibili.com/video/'+row[3]+'/\n同一作者的追问，不是学界共识的演进史。日期据本地视频元数据；机器稿未逐句听校，以上为本作概括，不是逐字引文。';});
  const full=el('div','',d,'technology-report-body');root.ResearchReader.mount(full,c.state.technologyReports[t.branch],{sources:c.state.technologyEvidence.sources,topics:[{title:'文稿背景（逐篇）',pages:manuscripts}]});
 }
 root.renderTechnologyExperiment=function(c){
  const t=c.state.prologue.technology,a=c.state.technologyAccount;
  let introExtras=null,conclusionExtras=null;
  let pressureTitle='';if(t.pressure){const p=t.pressure,s=p.world,r=s.history.at(-1);pressureTitle=p.stage==='support'?'如果买不起的人有保障？':s.day===9?'机器更快，为什么还卖不动？':r?.shortOfMoney?'老顾客，开始买不起了。':r?.closed[0]?'今天，开不了炉了。':s.firms[0].fast?'我也省下了两份工资。':s.firms[0].price===1?'客人回来了一些。':r?'钱，去了隔壁。':'隔壁挂出了低价。';}
  c.title(t.branch==='time'?'如果机器换来少上班？':t.pressure?pressureTitle:t.match?'机器接了活，谁还来买？':'如果机器接下大部分工作？','');
  if(t.phase==='intro'){
   const intro=el('div','',c.readout,'technology-intro');
   if(t.branch==='automation')introExtras=introduction(c,intro);
   else{const image=el('img','',intro);image.src=TRUST_ASSETS.bakery.newOven;image.alt='接入自动化控制的新烤炉';el('p','机器两天做完活。阿面掏出了休假单——老板会掏出哪张工资单？',intro,'relief-caption');button(c,'试着安排一周 →',{type:'CALENDAR',action:{type:'BEGIN'}},null,'primary');}
  }else if(t.pressure){
   root.renderCompetitivePressure(c,t);
   if(t.phase==='conclusion'){const conclusion=el('div','',c.readout,'technology-conclusion');el('p','机器改变效率。收入、需求和决定权，决定压力落到谁身上。',conclusion,'relief-caption');}
  }else if(t.match){
   root.renderTechnologyMatch(c,t);
   if(t.phase==='conclusion'){
    const conclusion=el('div','',c.readout,'technology-conclusion');el('p',t.match.world.firms.some(function(f){return f.robot;})?'机器能省工时。谁拿到时间和收入，仍取决于决定权。':'这局还没装机器，不能据此判断技术的影响。',conclusion,'relief-caption');
   }
  }else if(t.calendar){
   root.renderTimeCalendar(c,t);
  }else if(t.phase==='lab'){
   if(t.branch==='automation')renderArrangement(c,t,a);
   else{
   const rate=el('div','',c.readout,'technology-rate');const label=el('label','假设机器省下 '+t.rate+'% 的任务工时',rate);label.htmlFor='automation-rate';
   const input=el('input','',rate);input.type='range';input.id='automation-rate';input.min='0';input.max='80';input.step='20';input.value=String(t.rate);input.onchange=function(){c.send({type:'TECHNOLOGY',action:{type:'RATE',rate:Number(input.value)}});};
   const shortNames={cut:'减少人手',expand:'继续扩产',time:'带薪休息',share:'分享收益'};
   const modes=el('div','',c.readout,'technology-modes');['cut','expand','time','share'].forEach(function(mode){const b=button(c,shortNames[mode],{type:'MODE',mode:mode},modes,'choice');b.dataset.mode=mode;b.setAttribute('aria-pressed',String(t.mode===mode));if(t.seen&(1<<['cut','expand','time','share'].indexOf(mode)))b.dataset.observed='true';});
   const runControls=el('div','',c.readout,'technology-actions');button(c,'按这个安排，做一周 →',{type:'RUN'},runControls,'primary');
   if(!a)el('p','每种安排从同一起点重试。',c.readout,'small');
   else{
    const board=el('div','',c.readout,'technology-board');board.dataset.mode=a.mode;board.dataset.testid='technology-result';
    const machine=el('div','',board,'technology-machine');const img=el('img','',machine);img.src=TRUST_ASSETS.bakery.newOven;img.alt='智能烤炉';el('span','AI＋自动化控制',machine,'small');
    const figures=el('div','',board,'technology-households');a.households.forEach(function(person){const personBox=el('div','',figures,'technology-household');personBox.dataset.income=String(person.income);const art=el('span','',personBox);art.innerHTML=peep(person.employed,person.income);el('span',person.income+'枚',personBox);personBox.title=(person.employed?'在岗':'不在岗')+'，本周收入'+person.income+'金币，购买'+person.bought+'份';});
    const stats=el('div','',board,'technology-stats');[['做出',a.output],['卖出',a.sold],['留下',a.unsold]].forEach(function(row){const line=el('div','',stats,'technology-stat');el('span',row[0]+' '+row[1],line);const track=el('span','',line,'technology-track');const bar=el('i','',track);bar.style.setProperty('--bar-size',String(row[1]/240));});
    el('p',a.jobs+'人在岗 · 每周'+a.workDays+'天',c.readout,'technology-caption');
    const voices={cut:'“炉子还在忙，可我没有工资了。”',expand:'“做得更多，就一定卖得更多？”',time:'“工资没少，这周能早点回家！”',share:'“这周没排班，也分到了机器带来的钱。”'};el('p',a.rate?voices[a.mode]:'“这次没省工时，各种安排还没有差别。”',c.readout,'technology-voice');
    const account=el('details','',c.readout,'street-bounds');el('summary','这周的钱，怎么流？',account);
    el('p','企业开局'+a.firmBefore+'枚，工资'+a.wages+'枚，分享'+a.transfer+'枚，维护'+a.inputs+'枚，收款'+a.sold+'枚，结余'+a.firmAfter+'枚。本周收支差'+a.cashSurplus+'枚。',account);
    el('p','老板用原来的8枚消费；剩货没有假装卖出。所有支付后，总金币仍为'+a.moneyAfter+'枚。',account);
    el('p','对照基准：没有新技术时，10人干5天，做48、卖48，十人收入40枚。新机器已经购入，购置费用未计入本周；未增加原料成本，也未计折旧和存货估值，所以收支差不是净利润。',account);
   }
   const count=[1,2,4,8].filter(function(bit){return t.seen&bit;}).length;el('p','当前条件已试 '+count+' / 4 · 旧回执保留',c.readout,'small');receipts(c,t,c.readout);
   button(c,'换成日历安排 ↺',{type:'RESTART'});
   if(t.seen===15)button(c,'结果为什么不同？ →',{type:'CONCLUDE'},null,'primary');
   }
  }else{
   const result=el('div','',c.readout,'technology-conclusion');
   el('p','技术省下的是劳动。谁得到时间和收入，要另做决定。',result,'relief-caption');
   receipts(c,t,result);
   conclusionExtras=el('details','',result,'scene-supplement');el('summary','继续探索与说明',conclusionExtras);
   const limits=el('details','',conclusionExtras,'street-bounds');el('summary','这能说明什么？',limits);
   el('p','只裁员而不接住收入，可能削弱购买力；保收入、缩工时或分享收益，也可能缓和压力。',limits);
   el('p','分享收益不等于改变产权，也不能直接称为社会主义。现实的AI任务暴露不等于已经失业。',limits);
   const reset=el('details','',limits,'experiment-reset');el('summary','清空记录，重新开局',reset);el('p','只清空这条技术分支的安排和回执，其他分支不动。',reset);button(c,'清空本分支，重新开局',{type:'RESTART'},reset);
   const again=button(c,'保留回执，再挪挪人 ↺',{type:'REOPEN'});again.onclick=function(){arrangementWorkspaceOpen=true;c.send({type:'TECHNOLOGY',action:{type:'REOPEN'}});};
  }
  if(t.phase==='conclusion'){
   if(!conclusionExtras){conclusionExtras=el('details','',c.readout,'scene-supplement');el('summary','继续探索与说明',conclusionExtras);}
   const purpose=el('details','',conclusionExtras,'production-purpose-entry');el('summary','再问一步：节能炉，省了什么？',purpose);let mounted=false;
   purpose.ontoggle=function(){if(purpose.open&&!mounted){mounted=true;root.ProductionPurpose.mount(purpose);}};
   if(t.branch==='automation'){
    hiddenWorkEntry(conclusionExtras);
    const redesign=el('details','',conclusionExtras,'ai-redesign-entry');el('summary','机器接班后，谁来改规则？',redesign);let loaded=false;
    redesign.ontoggle=function(){if(redesign.open&&!loaded){loaded=true;root.AIRedesign.mount(redesign);}};
   }
  }
  if(t.phase==='intro'||t.phase==='conclusion')root.WeberPerspective.mount(introExtras||conclusionExtras||c.readout,'technology');
  if(t.phase==='conclusion')root.ValueJourney.mount(conclusionExtras,'ai');
  if(t.phase!=='intro'&&t.phase!=='lab')report(c,t,conclusionExtras);const back=el('button','回到假设目录 ↩',c.controls,'secondary');back.type='button';back.onclick=function(){c.send({type:'BACK_ASSUMPTIONS'});};
 };
})(window);
