(function(root){
 'use strict';
 const modes={bonus:'奖金，没有决定票',minority:'少数权益，有票但少',coop:'成员共同经营'},choices={divide:'分给大家',invest:'添机器'};
 let focusId=null,executing=null,charterOpen=false;
 function el(tag,text,parent,cls){const n=document.createElement(tag);n.className=cls||'';n.textContent=text||'';parent.appendChild(n);StreetArt.decorateMoney(n);return n;}
 function send(c,a){c.send({type:'OWNERSHIP',action:{type:'COUNCIL',action:a}});}
 function action(c,text,a,parent,cls){const b=el('button',text,parent,cls||'secondary');b.type='button';b.onclick=()=>send(c,a);return b;}
 function crop(url,atlas,key,boss){const f=atlas.frames[key].frame;return '<svg viewBox="'+(boss?f.x:f.x+24)+' '+(boss?f.y:f.y+34)+' '+(boss?f.w+' '+f.h:'72 108')+'" aria-hidden="true"><image href="'+url+'" width="'+atlas.meta.size.w+'" height="'+atlas.meta.size.h+'"/></svg>';}
 function person(income,boss){const b=TRUST_ASSETS.bakery;if(boss)return '<span class="council-boss">'+crop(b.hat,b.hatAtlas,'hatguy0000',true)+'</span>';return '<span class="technology-peep">'+crop(b.body,b.bodyAtlas,'body0000')+crop(income>=4?b.face:b.nervous,income>=4?b.faceAtlas:b.nervousAtlas,income>=4?'face0000':'face_nervous0008')+'</span>';}
 function bag(){return '<svg viewBox="0 0 70 64" fill="white" stroke="#777" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M24 17l-7-12 17 3 20-4-8 14Q66 30 62 48q-3 10-27 10T8 48Q6 31 24 17ZM22 18h25m-24 5h24"/><path d="M31 31h10m-12 7h14m-8-8v18"/></svg>';}
 function box(){return '<svg viewBox="0 0 160 112" fill="white" stroke="#777" stroke-width="2.4" stroke-linejoin="round" aria-hidden="true"><path d="M15 31l21-17h90l20 18-3 64-124 1ZM15 31l131 1M54 24h55M27 44v43m-1-10h18M37 16L35 3h28l2 18"/></svg>';}
 function key(){return '<svg viewBox="0 0 50 28" fill="none" stroke="#777" stroke-width="2.3" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M17 11l23 9m-9-4-2 5m7-3-1 5"/></svg>';}
 function wish(id){const paths=['M7 19l4-12 11 3 3 8 16 5q5 2 4 8H6v-8ZM6 27h38M13 13l9 3m-10 1 10 3','M5 23L25 6l20 17M10 20v23h30V20M21 43V29h9v14M15 24h3','M8 20h35l-5 23H13ZM15 20l9-15 11 15M19 26v11m12-11v11'];return id<3?'<svg viewBox="0 0 50 50" fill="white" stroke="#777" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+paths[id]+'"/></svg>':id<5?StreetArt.icon('ovens'):key();}
 function weight(parent,count){
  parent.dataset.decidingVotes=String(count);
  if(!count){el('small','意见，不计票',parent,'council-no-vote');return;}
  const papers=el('span','',parent,'council-vote-weight');papers.setAttribute('role','img');papers.setAttribute('aria-label',count+'张决定票');
  for(let i=0;i<count;i++){const paper=el('span','',papers);paper.dataset.decisionPaper='true';paper.innerHTML='<svg viewBox="0 0 20 26" fill="white" stroke="#777" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 2l12 1 3 4-1 17-15-1ZM14 3v5h4M6 13l3 3 5-7"/></svg>';}
  el('small',count+'票',parent);
 }
 root.renderSharingCouncil=function(c,t){
  if(t.council.step==='production'){root.renderCouncilProduction(c,t);return;}
  const s=t.council,a=c.state.councilAccount,probe=c.state.councilExploration,review=!!s.production?.history.length,wrap=el('div','',c.readout,'sharing-council');wrap.dataset.step=s.step;wrap.dataset.testid='council-board';wrap.dataset.mode=s.mode;wrap.dataset.personal=!!s.personal;
  if(s.trials.length){const past=el('details','',wrap,'council-past-trials');el('summary','之前的回执 · '+s.trials.length+'次表决',past);(c.state.councilTrials||[]).forEach(function(r){el('p',modes[r.mode]+' · 工人收到'+r.workers+'枚 · 老板收到'+r.owner+'枚 · '+(r.outcome==='hold'?'平票暂缓':choices[r.outcome]),past);});(c.state.councilProductionTrials||[]).forEach(function(r){el('p','三班排班 · '+modes[r.mode]+' · 工资'+r.wages+'枚 · 做出'+r.produced+' · 剩'+r.stock.length+' · 带薪休息'+r.paidRest+'人班',past);});}
  if(probe){const q=el('h3',probe.prompt,wrap,'council-question');q.dataset.testid='council-question';}
  const hint=el('p',review?'表决时的钱与票；后面三班另记账。':s.step==='money'?'把金币放进钱袋；确认前可以重分。':s.step==='ballot'?'你是第六名工人。把自己的'+(a.workerWeight?'票':'意见')+'放进票箱。':'',wrap,'council-hint');hint.setAttribute('role','status');
  const heart=el('aside','',wrap,'council-heart');heart.hidden=true;heart.setAttribute('role','dialog');heart.setAttribute('aria-modal','true');heart.setAttribute('aria-label','工人的打算');let returnFocus=null;
  function hear(id){const p=a.people[id];if(!s.personal)return;returnFocus=document.activeElement;heart.replaceChildren();el('h3',p.name,heart);el('p',(review?'表决结束时 ':'现在 ')+p.income+'枚 · '+p.votes+'票决定权',heart);el('p',p.target===null?p.wish:'打算'+p.wish+'，要 '+p.target+'枚。'+(p.income>=p.target?(review?'当时的钱够了。':'现在的钱够了。'):(review?'当时还差 ':'现在还差 ')+(p.target-p.income)+'枚。'),heart);el('p',(s.step==='money'?'如果这笔钱发到手，才会决定投哪边。':s.step==='result'?'投票时说：':'说：')+(s.step==='money'?'':p.voice),heart,'council-voice');if(s.step==='result'&&p.target!==null)el('small','投票前有 '+p.beforeBallotIncome+'枚；这里尚未购买愿望中的物品。',heart);const close=el('button','收起 ×',heart,'secondary');close.type='button';close.onclick=function(){heart.hidden=true;returnFocus?.focus({preventScroll:true});};heart.onkeydown=function(e){if(e.key==='Escape'){e.preventDefault();close.click();}if(e.key==='Tab'){e.preventDefault();close.focus();}};heart.hidden=false;close.focus({preventScroll:true});}
  const pieces=[],targets=[];
  function target(id,node,button,accepts){node.dataset.councilTarget=id;targets.push({id,node,button,accepts});}
  function piece(id,text,parent,cls,name){const b=el('button',text,parent,cls);b.type='button';b.dataset.councilPiece=id;pieces.push({id,node:b,name:name||text});return b;}
  const constitutions=el('section','',wrap,'council-constitutions'),folder=el('details','',constitutions,'council-charter-folder');folder.open=charterOpen;folder.ontoggle=()=>{charterOpen=folder.open;};el('summary','翻翻其他章程',folder);
  const papers=el('div','',folder,'council-papers');Object.keys(modes).forEach(mode=>{const p=piece('mode:'+mode,modes[mode],papers,'council-paper');p.disabled=s.step==='ballot';p.dataset.active=String(s.mode===mode);});
  el('small',s.step==='result'?'把另一张纸放进章程夹。可沿用的分钱草稿会保留，重新确认才付钱。':'拿一张纸，放进下面的章程夹。',folder,'council-charter-instruction');
  const holder=el('section','',constitutions,'council-holder'),hb=el('button','本次章程：'+modes[s.mode],holder,'council-destination');hb.type='button';target('charter',holder,hb,id=>id.startsWith('mode:')&&s.step!=='ballot');
  function coins(to,parent){if(s.step!=='money')return;for(let i=0;i<(s.loose?12:6);i++){if(s.allocation[s.loose?i:i*2]!==to)continue;const id=(s.loose?'coin:':'roll:')+i,b=piece(id,'',parent,'council-coin',s.loose?'一金币':'两金币');b.innerHTML=StreetArt.icon('cash')+(s.loose?'':StreetArt.icon('cash'));}}
  if(s.step==='money'){
   const bank=el('section','',wrap,'council-bank'),bb=el('button','待分的十二金币',bank,'council-destination');bb.type='button';target('bank',bank,bb,id=>id.startsWith('roll:')||id.startsWith('coin:'));const bankCoins=el('div','',bank,'council-coins');coins(null,bankCoins);
   action(c,s.loose?'合回一组':'拆开零钱',{type:'LOOSE',enabled:!s.loose},bank,'council-split').disabled=s.loose&&s.allocation.some((to,i)=>i%2===1&&to!==s.allocation[i-1]);
  }
  const wallets=s.step==='result'?el('details','',wrap,'council-income-records'):wrap;if(s.step==='result')el('summary','大家分到的钱与打算',wallets);
  const stage=el('div','',wallets,'council-people');a.people.forEach(p=>{
   const cell=el('section','',stage,'council-person');cell.dataset.person=String(p.id);cell.dataset.player=String(p.id===5);if(probe?.focusPerson===p.id)cell.dataset.probeFocus='true';
   const heading=el('button','',cell,'council-destination');heading.type='button';heading.innerHTML=person(s.personal?(p.target!==null&&p.income<p.target?2:4):p.income,false);el('span',s.personal?p.name:p.id===5?'你':'小'+(p.id+1),heading);heading.setAttribute('aria-label',s.personal?'听听'+p.name+'的打算，或放进钱袋':'放到'+(p.id===5?'你的':'小'+(p.id+1)+'的')+'钱袋');target('wallet:'+p.id,cell,heading,id=>s.step==='money'&&(id.startsWith('coin:')||id.startsWith('roll:')));
   const pocket=el('div','',cell,'council-pocket');pocket.innerHTML=bag();const count=s.allocation.filter(v=>v===p.id).length;el('strong',p.income+'枚',cell,'council-income');el('small',s.step==='money'?'拟分 '+count+'枚':p.first+'枚已收到',cell,'council-first');el('small',p.votes+'票决定权',cell,'council-rights');const tokens=el('div','',cell,'council-coins');coins(p.id,tokens);
   if(s.personal){const need=el('div','',cell,'council-wish');need.innerHTML=wish(p.id);need.dataset.testid='council-wish-'+p.id;el('small',p.target===null?p.id===5?'你来选':'想添机器':p.wish+' '+p.target+'枚',need);if(s.step!=='money'&&p.target!==null)el('small',(s.step==='result'?'投票前':'')+(p.gap?'还差'+p.gap+'枚':'够了'),need,'council-wish-gap');}
  });
  const owner=el('section','',wallets,'council-owner');if(s.mode!=='coop'){
   const ob=el('button','',owner,'council-destination');ob.type='button';ob.innerHTML=person(a.owner,true);el('span','老板',ob);ob.setAttribute('aria-label','放到老板的钱袋');target('owner',owner,ob,id=>s.step==='money'&&(id.startsWith('coin:')||id.startsWith('roll:')));
   const info=el('div','',owner,'council-owner-info');info.innerHTML=key();el('strong',a.owner+'枚',info);const rights=el('span',a.ownerVotes+'票 · 想添机器',info);if(probe?.focusAuthority)rights.dataset.probeFocus='true';if(s.step==='money')el('small','拟分 '+s.allocation.filter(v=>v==='owner').length+'枚',info);const tokens=el('div','',owner,'council-coins');coins('owner',tokens);
  }else{owner.innerHTML=key().repeat(3);el('span','没有外部老板 · 成员各一票',owner);}
  if(s.step==='money'){
   const ready=s.allocation.every(v=>v!==null),pay=action(c,'照这样分，发到手 →',{type:'DISTRIBUTE',expectedRevision:s.revision},wrap,'primary');pay.disabled=!ready;pay.onclick=()=>{executing='money';charterOpen=false;send(c,{type:'DISTRIBUTE',expectedRevision:s.revision});};
  }else{
   const voteFloor=el('section','',wrap,'council-voting');
   function ownSlip(parent){const b=piece('ballot',a.workerWeight?'你的票':'你的意见',parent,'council-slip your-vote');weight(b,a.workerWeight);b.disabled=s.step!=='ballot';}
   if(s.step==='ballot'){const hand=el('section','',voteFloor,'council-hand'),handButton=el('button','拿回手中',hand,'council-destination');handButton.type='button';target('hand',hand,handButton,id=>id==='ballot');if(s.ballot===null)ownSlip(hand);}
   const boxes=el('div','',voteFloor,'council-boxes');['divide','invest'].forEach(to=>{
    const cell=el('section','',boxes,'council-box'),heading=el('button','',cell,'council-destination');heading.type='button';heading.innerHTML=box();el('span',choices[to],heading);target(to,cell,heading,id=>s.step==='ballot'&&(id==='ballot'||id.startsWith('opinion:')));
    const slips=el('div','',cell,'council-slips');s.others.forEach((vote,i)=>{if(vote===to){const b=s.personal?el('button','',slips,'council-slip council-fixed-vote'):piece('opinion:'+i,'小'+(i+1)+'的意见',slips,'council-slip');if(s.personal){b.type='button';b.dataset.councilVoter=String(i);b.setAttribute('aria-label','听听'+a.people[i].name+'投票时的打算');el('span',a.people[i].name,b,'council-voter-name');b.onclick=()=>hear(i);if(probe?.focusPerson===i)b.dataset.probeFocus='true';}weight(b,a.workerWeight);if(!s.personal)b.disabled=s.step!=='ballot';}});
    if(s.ballot===to)ownSlip(slips);if(to==='invest'&&a.ownerVotes){const boss=el('span','老板的票',slips,'council-slip owner-vote');weight(boss,a.ownerVotes);if(probe?.focusAuthority)boss.dataset.probeFocus='true';}
    if(s.step==='result')el('strong',(to==='divide'?a.divideVotes:a.investVotes)+'票',cell,'council-box-tally');
   });
   if(s.step==='ballot'){const vote=action(c,'开票，照结果办 →',{type:'VOTE',expectedRevision:s.revision},wrap,'primary');vote.disabled=s.ballot===null;vote.onclick=()=>{executing='vote';send(c,{type:'VOTE',expectedRevision:s.revision});};}
  }
  root.GestureBoard.bind(wrap,{pieces:pieces.filter(p=>!p.node.disabled),targets,hint,ghostClass:'council-ghost',prompt:s.step==='money'?'拿起金币，再放进钱袋。':'拿起票，再放进票箱。',placedMessage:'草稿已改，确认后才执行。',onInspect:id=>{if(s.personal&&id.startsWith('wallet:')){hear(Number(id.slice(7)));return;}hint.textContent=id.startsWith('wallet:')?'钱包收入与决定票是两回事；拿到钱不会增加票权。':id==='owner'?'老板的决定票来自本次章程，不来自手上金币数量。':id==='charter'?'章程是同起点假想条件，不是免费买下企业。':id==='bank'?'先分十二金币，另一笔十二金币等下一步决定。':'可以改票，不会改写已发到手的钱。';},onDrop:(id,to)=>{
   focusId=id;if(id.startsWith('mode:'))send(c,{type:s.step==='result'?'RECHARTER':'CONDITION',mode:id.slice(5)});else if(id==='ballot')send(c,{type:'BALLOT',to:to==='hand'?null:to});else if(id.startsWith('opinion:'))send(c,{type:'OPINION',person:Number(id.slice(8)),to});else send(c,{type:s.loose?'COIN':'ROLL',[s.loose?'coin':'roll']:Number(id.split(':')[1]),to:to==='bank'?null:to==='owner'?'owner':Number(to.split(':')[1])});
  }});
  if(focusId){const n=wrap.querySelector('[data-council-piece="'+focusId+'"]');if(n){n.focus({preventScroll:true});n.dataset.arrived='true';}focusId=null;}
  if(executing){wrap.dataset.executed=executing;executing=null;}
  if(s.run){const result=el('div','',wrap,'council-result');result.dataset.testid='council-result';result.dataset.outcome=a.outcome;el('p',{divide:'通过了。十二金币分给六个人。',invest:'通过了。十二金币付给设备厂。',hold:'三比三。钱先留着，再商量。'}[a.outcome],result,'council-outcome');if(a.equipment){const machine=el('div','',result,'council-equipment');machine.innerHTML=StreetArt.icon('ovens');el('span','设备厂收到12枚',machine);}}
  if(s.step==='result'&&probe?.comparison){const comparison=el('p',probe.comparison,wrap,'council-probe-comparison');comparison.dataset.testid='council-comparison';comparison.dataset.matched=probe.changed;}
  else if(s.step==='result'&&!probe){const comparisons=el('div','',wrap,'council-comparisons');(c.state.councilTrials||[]).slice(-3).forEach(p=>{const row=el('span','',comparisons);el('small',modes[p.mode],row);el('span','先给工人'+p.firstWorkers+'枚 · '+{divide:'再分给大家',invest:'买机器',hold:'暂缓'}[p.outcome],row);});}
  const book=el('details','',wrap,'street-bounds');el('summary','账本与假设',book);
  el('p','同起点：企业40枚，顾客48枚，合计88枚。十二件商品每件4枚售完，工资12枚、耗材12枚，企业余额64枚。未计旧设备折旧，现金差额不是完整净利润。先分12枚，另一笔12枚等表决。',book);
  el('p','先排的是已获同意的可协商分配款，不是随手改变股份或法定股息。这里未模拟提案如何获准；玩家此步作为实验者配置收入，投票步扮演第六名工人。奖金与少数权益可分给工人及老板，共同经营没有外部老板钱袋；分配不增加票权。章程切换是独立反事实，不是免费产权转让。结果后换章程，可合法沿用的收款安排只带入草稿，必须重新发款、表决；若原来有钱给外部老板，改为共同经营时需重分，不会自动转给工人。',book);
  el('p',s.personal?'奖金工人决定票0、老板1票；少数权益工人各1、老板7票；共同经营六人各1票。老板想添机器。阿面鞋钱4、小麦房租6、团团家用品5：工资加第一笔分配未够目标时想再分，够了则想投资；圆圆、阿青本次始终想投资。你决定自己的票，不能挪别人的票。这是几个虚构人物的明确约定，不是工资决定政治偏好的普遍规律，也不是支付换取选票的政策。愿望只是预算与打算，尚未模拟实际购物；投票后再收到钱，不会倒改已投的票。意见的0权重不假装正式决定权。':'奖金工人决定票0、老板1票；少数权益工人各1、老板7票；共同经营六人各1票。老板初始想添机器，其他五人初始三人分钱、两人投资。拖意见卡是在开票前显式修改偏好假设，不是玩家秘密代投；不能事后改票或改已发收入。意见票的0权重不假装成正式决定票。',book);
  el('p','实际：企业'+a.firm+'枚、工人'+a.workers+'枚、老板'+a.owner+'枚、原料商'+a.supplier+'枚、设备商'+a.equipmentSupplier+'枚，合计'+a.moneyAfter+'枚。第一次分配已付工人'+a.firstWorkers+'枚、老板'+a.firstOwner+'枚；表决后再分'+a.extraWorkers+'枚、买设备'+a.equipment+'枚。平票钱仍在企业，不凭空买机器。',book);
  el('p','不强制试完三章程。仅改变草稿、钱币身份或等价位置不算新的观察。'+(s.personal?'不同人物有不同打算，换实际收款人会计入条件对照。':'')+(s.productionEnabled?'下一步沿用这次实际钱包和是否买了设备，试排三班；比较两次表决、两段完成的排班后再总结。':'比较两种已分配且已表决的条件即可继续；尚未模拟下一期设备效率与销售。')+'每次重试是同起点独立实验，不重复发钱；未模拟融资，不预测合作社必胜，也不把企业内成员表决等同社会主义国家制度。',book);
  if(s.step==='result'){action(c,'同一笔钱，重新安排 ↺',{type:'REARRANGE'},c.controls);if(s.productionEnabled)action(c,s.production?'继续刚才的排班 →':'带着这个决定，开下一班 →',{type:'PRODUCTION_BEGIN'},c.controls,'primary');else if(s.trials.length>=2)action(c,'拿到钱，也拿到钥匙了吗？ →',{type:'CONCLUDE'},c.controls,'primary');}
 };
})(window);
