(function(root){
 'use strict';
 let focusId=null,executing=false,workspaceOpen=false,singlesOpen=false,equipmentOpen=null;
 function el(tag,text,parent,cls){const n=document.createElement(tag);n.className=cls||'';n.textContent=text||'';parent.appendChild(n);StreetArt.decorateMoney(n);return n;}
 function send(c,a){c.send({type:'NEEDS',action:{type:'CARE',action:a}});}
 function action(c,text,a,parent,cls){const b=el('button',text,parent,cls||'secondary');b.type='button';b.onclick=function(){send(c,a);};return b;}
 function crop(url,atlas,key){const f=atlas.frames[key].frame;return '<svg viewBox="'+(f.x+24)+' '+(f.y+34)+' 72 108" aria-hidden="true"><image href="'+url+'" width="'+atlas.meta.size.w+'" height="'+atlas.meta.size.h+'"/></svg>';}
 function person(happy,nurse){const a=TRUST_ASSETS.bakery;return '<span class="technology-peep">'+crop(a.body,a.bodyAtlas,'body0000')+crop(happy?a.face:a.nervous,happy?a.faceAtlas:a.nervousAtlas,happy?'face0000':'face_nervous0008')+(nurse?'<svg class="care-cap" viewBox="0 0 60 35" aria-hidden="true"><path d="M9 29L5 8Q30-2 55 8l-4 21Z" fill="white" stroke="#626262" stroke-width="2.5"/><path d="M30 7v16m-8-8h16" fill="none" stroke="#777" stroke-width="2.5"/></svg>':'')+'</span>';}
 function tool(){return '<svg viewBox="0 0 90 90" fill="white" stroke="#626262" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" aria-label="辅助设备" role="img"><path d="M18 8h55v37H18ZM24 15h43v23H24ZM45 45v13m-11 0h22M15 68h62v13H15ZM25 69V57h10M63 68V52h12V33h-7"/><path d="M28 26h8l4-7 7 14 6-9h9" fill="none"/><circle cx="27" cy="83" r="4"/><circle cx="66" cy="83" r="4"/></svg>';}
 function station(){return '<svg viewBox="0 0 260 130" fill="none" stroke="#626262" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round" aria-label="私人照护站" role="img"><path d="M18 116V42q0-14 14-14h194q14 0 14 14v74M8 117h244M93 27V8h74v19m-37-23v19m-10-10h20M34 61h52v31H34ZM42 50h13M178 50h43v39h-43M101 111V66h51v45m-43-22h9M34 101h52m92 0h43"/></svg>';}
 function queueOf(s){return s.queue||Array.from({length:12},(_,i)=>i);}
 function identical(a,b){return !!b&&JSON.stringify({slots:a.slots,training:a.training,vouchers:a.vouchers,tool:a.tool,queue:queueOf(a)})===JSON.stringify({slots:b.slots,training:b.training,vouchers:b.vouchers,tool:b.tool,queue:queueOf(b)});}
 function changeMessage(a,previous){
  if(!previous)return '';
  const difference=a.served-previous.served;
  if(difference)return '比上次'+(difference>0?'多':'少')+'服务 '+Math.abs(difference)+' 人。';
  const gained=a.people.filter(p=>p.served&&!previous.people[p.id].served),lost=a.people.filter(p=>!p.served&&previous.people[p.id].served);
  if(gained.length&&lost.length)return '人数没变：小'+(gained[0].id+1)+'用上了，小'+(lost[0].id+1)+'开始等。'+(gained.length>1?'不止这两个人换了位置。':'');
  if(a.capacity!==previous.capacity)return '能力'+(a.capacity>previous.capacity?'多':'少')+'了'+Math.abs(a.capacity-previous.capacity)+'位，实际用上的人数没变。';
  const fundedWait=a.people.find(p=>p.covered&&p.reason==='capacity'&&!previous.people[p.id].covered);
  if(fundedWait)return '小'+(fundedWait.id+1)+'有人代付了，还是没排到。人数没变。';
  return '换了安排，用上的人数和上次一样。';
 }
 root.renderCareRouting=function(c,t){
  const s=t.care,a=c.state.careRoutingAccount,invitation=c.state.careExploration;
  if(s.phase==='conclusion'){
   const end=el('div','',c.readout,'needs-conclusion');el('p','有需要的人，用上新工具，还要接上钱和人手。',end,'relief-caption');
   const rows=el('div','',end,'care-comparisons');(c.state.careRoutingTrials||[]).slice(-3).forEach(r=>el('span',r.staff+'人上岗 · 能服务'+r.capacity+' · 用上'+r.served+' · 仍等'+r.unmet,rows));
   const bounds=el('details','',end,'street-bounds');el('summary','这个实验能说明什么？',bounds);
   el('p','只提高能力，付不起的人仍可能用不上；只安排付款，人手也可能不足。改排队能改变谁先用上，却不增加能力。培训、工具与支付相互配合，确实可以缓和服务缺口。',bounds);
   el('p','这里仍由私人照护站拥有设备并安排岗位。公共代付没有自动改变产权；照护不足也不等于资本主义基本矛盾的定义。社会主义国家的预算、地区分配和组织问题，不能直接套进同一个资本主义矛盾。',bounds);
   const reset=el('details','',bounds,'experiment-reset');el('summary','清空记录，重新开局',reset);el('p','只清空这条照护分支的安排和回执，其他分支不动。',reset);
   const clear=el('button','清空本分支，重新开局',reset,'secondary');clear.type='button';clear.onclick=function(){c.send({type:'NEEDS',action:{type:'RESTART'}});};
   const again=action(c,'保留回执，继续安排 ↺',{type:'REOPEN',expectedRevision:s.revision},c.controls);again.onclick=function(){workspaceOpen=true;send(c,{type:'REOPEN',expectedRevision:s.revision});};return;
  }
  const same=identical(s,s.run),wrap=el('div','',c.readout,'care-routing');wrap.dataset.testid='care-routing';wrap.dataset.revision=String(s.revision);
  if(executing){workspaceOpen=false;singlesOpen=false;equipmentOpen=null;}
  if(!a&&s.revision===0)equipmentOpen=null;
  const hint=el('p',invitation?invitation.prompt:'小5的钱包只有1枚。帮他代付，就一定轮得到吗？',wrap,'care-hint');hint.setAttribute('role','status');StreetArt.decorateMoney(hint);
  const workspace=el('details','',wrap,'care-adjustments');
  const workspaceHeading=el('summary','再调整人手和付款安排',workspace);workspaceHeading.hidden=!a;
  workspace.open=!a||!same||workspaceOpen;
  workspace.ontoggle=function(){if(!workspace.isConnected)return;workspaceOpen=workspace.open;const review=wrap.querySelector('.care-result-review');if(review)review.open=!workspace.open;if(!workspace.open)root.GestureBoard.cancel();};
  const pieces=[],targets=[];
  function piece(id,text,parent,cls){const n=el('button',text,parent,cls);n.type='button';n.dataset.carePiece=id;const name=id==='tool'?'辅助设备':id.startsWith('visitor:')?'小'+(Number(id.split(':')[1])+1):id.startsWith('worker:')?'护'+(Number(id.split(':')[1])+1):id.startsWith('training:')?'培训名额':'两金币代付凭证';pieces.push({id,node:n,name});return n;}
  function target(id,node,button,accepts){node.dataset.careTarget=id;targets.push({id,node,button,accepts});}
  const floor=el('div','',workspace,'care-floor');
  const counter=el('div','',floor,'care-counter');counter.innerHTML=station();
  const counterCopy=el('div','',counter,'care-counter-copy');el('span','私人照护站',counterCopy);
  el('span',s.slots.filter(w=>w!==null).length+'人上岗 · 能服务'+s.slots.filter(w=>w!==null).length*(s.tool?3:2)+'位',counterCopy);
  el('small','每次2枚 · 同一起点重试',counterCopy);
  const queue=el('section','',floor,'care-queue');
  const equipment=el('details','',floor,'care-equipment-drawer');el('summary','人手不够？看看设备和培训',equipment);
  // Everything remains available immediately; the drawer is presentation only.
  equipment.open=equipmentOpen===null?s.trials.length>=2||s.tool||s.training.some(w=>w!==null)||JSON.stringify(s.slots)!==JSON.stringify([0,1,null,null]):equipmentOpen;
  equipment.ontoggle=function(){if(equipment.isConnected){equipmentOpen=equipment.open;if(!equipment.open)root.GestureBoard.cancel();}};
  const engineering=el('div','',equipment,'care-engineering'),bench=el('section','',engineering,'care-bench');
  const benchHeading=el('button','待安排的人手',bench,'care-destination');benchHeading.type='button';target('bench',bench,benchHeading,id=>id.startsWith('worker:'));
  const waiting=el('div','',bench,'care-workers');
  function worker(id,parent){
   const cell=el('div','',parent,'care-worker-cell'),n=piece('worker:'+id,'',cell,'care-worker');n.innerHTML=person(true,true);el('small','护'+(id+1),n);
   const trained=id<2||s.training.includes(id),cert=el('button',id<2?'已受训':trained?'培训已排':'待培训',cell,'care-qualification');cert.type='button';cert.setAttribute('aria-label','给护'+(id+1)+'安排培训');
   target('worker:'+id,cell,cert,p=>id>=2&&p.startsWith('training:')&&!trained);
   const ci=s.training.indexOf(id);if(ci>=0){const card=piece('training:'+ci,'培训',cell,'care-cert attached');card.setAttribute('aria-label','拿起护'+(id+1)+'的培训名额');}
   n.dataset.qualified=String(trained);return cell;
  }
  for(let i=0;i<4;i++)if(!s.slots.includes(i))worker(i,waiting);
  if(!waiting.children.length)el('span','四人都已排岗',waiting,'care-empty');
  const resources=el('div','',bench,'care-resources'),resourceHeading=el('button','设备与培训名额',resources,'care-destination');resourceHeading.type='button';
  target('resources',resources,resourceHeading,id=>id==='tool'&&s.tool||id.startsWith('training:')&&s.training[Number(id.split(':')[1])]!==null);
  if(!s.tool){const device=piece('tool','',resources,'care-tool');device.innerHTML=tool();el('small','辅助设备',device);}
  s.training.forEach((id,i)=>{if(id===null){const cert=piece('training:'+i,'培训名额',resources,'care-cert');el('small','2枚',cert);}});
  if(s.tool&&s.training.every(id=>id!==null))el('span','物件可拖回这里',resources,'care-empty');
  const clinic=el('section','',engineering,'care-clinic');clinic.innerHTML=station();el('span','私人照护站',clinic,'care-station-name');
  const positions=el('div','',clinic,'care-positions');
  for(let i=0;i<4;i++){
   const slot=el('section','',positions,'care-position');if(s.slots[i]!==null)worker(s.slots[i],slot);
   const heading=el('button',s.slots[i]===null?'岗位'+(i+1):'已排岗',slot,'care-position-button');heading.type='button';heading.setAttribute('aria-label','放到照护岗位'+(i+1));
   target('slot:'+i,slot,heading,id=>id.startsWith('worker:')&&s.slots[i]===null&&(Number(id.split(':')[1])<2||s.training.includes(Number(id.split(':')[1]))));
  }
  const socket=el('section','',clinic,'care-socket'),socketHeading=el('button','设备接入口',socket,'care-destination');socketHeading.type='button';target('socket',socket,socketHeading,id=>id==='tool'&&!s.tool);
  if(s.tool){const device=piece('tool','',socket,'care-tool attached');device.innerHTML=tool();el('small','已接入',device);}else el('small','每人能照护2位',socket);
  el('span','排岗 '+s.slots.filter(w=>w!==null).length+'人 · 能服务 '+s.slots.filter(w=>w!==null).length*(s.tool?3:2)+'位',clinic,'care-draft-capacity');
  el('span',a?'下一次安排 · 同一起点':'十二个人，都需要一次照护',queue,'care-queue-title');
  const funding=el('section','',queue,'care-funding');const people=el('div','',queue,'care-patients');
  queueOf(s).forEach(function(i,position){
   const cell=el('section','',people,'care-patient');cell.dataset.person=String(i);cell.dataset.queuePosition=String(position);cell.dataset.funded=String(s.vouchers.includes(i));cell.dataset.focusPerson=String(i===(invitation?invitation.focusPerson:4));el('span',String(position+1),cell,'care-order');
   const heading=piece('visitor:'+i,'',cell,'care-patient-button');heading.innerHTML=person(true,false);el('small','小'+(i+1),heading);el('span',(i<4?4:1)+'枚',heading,'care-wallet');
   heading.setAttribute('aria-label','给小'+(i+1)+'放付款凭证');heading.title='需要一次照护；自己付需2金币。本次起点钱包'+(i<4?4:1)+'金币。安排还没有执行。';
   target('person:'+i,cell,heading,id=>id.startsWith('visitor:')&&Number(id.split(':')[1])!==i||id.startsWith('voucher:')&&!s.vouchers.includes(i));
   const vi=s.vouchers.indexOf(i);if(vi>=0){const card=piece('voucher:'+vi,'代付',cell,'care-voucher attached');el('small','2枚',card);}
  });
  const fundingHeading=el('button','公共付款账户 · 本次起点24枚',funding,'care-destination');fundingHeading.type='button';target('funding',funding,fundingHeading,id=>id.startsWith('voucher:')&&s.vouchers[Number(id.split(':')[1])]!==null);
  const remaining=s.vouchers.filter(id=>id===null).length,brushRow=el('div','',funding,'care-brush-row'),brush=el('button','',brushRow,'care-payment-brush');brush.type='button';brush.dataset.careBrush='true';brush.disabled=!remaining;
  brush.innerHTML='<svg viewBox="0 0 76 55" fill="#fffef8" stroke="#777" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M10 16l54-5 4 35-54 5ZM6 10l54-4 4 35-54 5ZM4 6l53-3 4 35-53 4Z"/><circle cx="32" cy="22" r="8" fill="#e8c875"/><path d="M32 17v10"/></svg>';
  el('span',remaining?'拿一叠 · '+remaining+'份':'凭证已排完',brush);brush.setAttribute('aria-label','拿起一叠代付凭证');
  const brushStatus=el('p','服务后才付钱。',brushRow,'care-brush-status');brushStatus.setAttribute('role','status');brush.setAttribute('title','拖过要代付的人，或点选后确认');
  const brushActions=el('div','',funding,'care-brush-actions'),brushApply=el('button','就帮这些人 →',brushActions,'secondary'),brushCancel=el('button','放回去 ↩',brushActions,'secondary');brushApply.type=brushCancel.type='button';
  const singles=el('details','',funding,'care-single-vouchers');el('summary','也可以逐张拖放',singles);singles.hidden=!remaining;singles.open=singlesOpen;
  singles.ontoggle=function(){if(singles.isConnected)singlesOpen=singles.open;};
  const slips=el('div','',singles,'care-slips');s.vouchers.forEach((id,i)=>{if(id===null){const card=piece('voucher:'+i,'代付',slips,'care-voucher');el('small','2枚',card);}});
  if(!slips.children.length)el('small','凭证已分完，没用上的款不会付出。',funding,'care-empty');
  function inspectPerson(id){if(id.startsWith('person:')||id.startsWith('visitor:')){const i=Number(id.split(':')[1]);hint.textContent='小'+(i+1)+'：需要一次照护，本次起点钱包'+(i<4?4:1)+'枚。'+(s.vouchers.includes(i)?'代付已排，还没服务。':'自己付，需要2枚。')+' 拖到另一人的位置，就能换顺序。';StreetArt.decorateMoney(hint);}}
  root.GestureBoard.bind(wrap,{pieces,targets,hint,ghostClass:'care-ghost',prompt:'拖动小人换顺序，或放入付款凭证。',onPickup:inspectPerson,onInspect:inspectPerson,onDrop:function(id,to){
   focusId=id;const n=Number(id.split(':')[1]);if(id==='tool')send(c,{type:'TOOL',enabled:to==='socket'});else if(id.startsWith('visitor:'))send(c,{type:'QUEUE',person:n,position:queueOf(s).indexOf(Number(to.split(':')[1]))});else if(id.startsWith('worker:'))send(c,{type:'WORKER',worker:n,slot:to==='bench'?'bench':Number(to.split(':')[1])});else if(id.startsWith('training:'))send(c,{type:'TRAIN',certificate:n,person:to==='resources'?null:Number(to.split(':')[1])});else send(c,{type:'VOUCHER',voucher:n,person:to==='funding'?null:Number(to.split(':')[1])});
  }});
  root.GestureBoard.paint(wrap,{trigger:brush,apply:brushApply,cancel:brushCancel,capacity:remaining,cells:[...people.children].map(node=>({id:Number(node.dataset.person),node,eligible:!s.vouchers.includes(Number(node.dataset.person))})),onPreview:function(ids,active,directStroke){
   // A direct drag commits on release; inserting confirmation controls mid-stroke
   // would move the people away from the pointer. Tap/keyboard groups keep theirs.
   brushActions.hidden=!active||directStroke;brushStatus.textContent=active?'已选 '+ids.length+' 人 · 还可排 '+(remaining-ids.length)+' 份。'+(directStroke?'松手排好。':'划过或逐个选，再确认。'):remaining?'服务后才付钱。':'已安排，尚未付款。';
  },onCommit:function(ids){focusId='visitor:'+ids.at(-1);send(c,{type:'COVER',people:ids,expectedRevision:s.revision});}});
  if(focusId){const n=wrap.querySelector('[data-care-piece="'+focusId+'"]');if(n){
   // A returned slip must remain visible and focusable, not disappear into a folded drawer.
   const drawer=n.closest('.care-single-vouchers');if(drawer){drawer.open=true;singlesOpen=true;}
   const engineeringDrawer=n.closest('.care-equipment-drawer');if(engineeringDrawer){engineeringDrawer.open=true;equipmentOpen=true;}
   n.dataset.arrived='true';n.focus({preventScroll:true});
  }focusId=null;}
  const run=action(c,'照这样，服务一期 →',{type:'RUN',expectedRevision:s.revision},wrap,'primary');run.disabled=same;run.hidden=!!a&&same;run.onclick=function(){executing=true;send(c,{type:'RUN',expectedRevision:s.revision});};
  if(executing&&same&&a)wrap.dataset.running='true';
  if(a){
   const result=el('div','',wrap,'care-routing-result');result.dataset.testid='care-routing-result';result.dataset.stale=String(!same);if(executing&&same)result.dataset.running='true';
   wrap.prepend(result);
   if(!same)el('p','新安排还没服务。这里仍是上次结果。',result,'care-result-label');
   const stats=el('div','',result,'care-stats');[['用上',a.served],['仍在等',a.unmet],['能力空着',a.unused]].forEach(row=>el('span',row[0]+' '+row[1],stats));
   const previous=(c.state.careRoutingTrials||[]).at(-2);
   const change=invitation&&invitation.fundingFeedback||changeMessage(a,previous);if(change)el('p',change,result,'care-result-change');
   const review=el('details','',result,'care-result-review');review.open=!workspace.open;el('summary','上次十二人的结果',review);
   const inspection=el('p','',review,'care-result-inspection');inspection.hidden=true;inspection.setAttribute('role','status');
   const observers=el('div','',review,'care-result-people');
   a.queue.forEach(function(i,position){
    const p=a.people[i],n=el('button','',observers,'care-observer');n.type='button';n.dataset.careResultPerson=String(i);n.dataset.served=String(p.served);
    const outcome=p.served?'用上了':p.reason==='money'?'付不起':'没排到';
    n.innerHTML=person(p.served,false);el('small','小'+(i+1)+' · '+p.cash+'枚',n);el('small',outcome,n);
    n.setAttribute('aria-label','小'+(i+1)+'：上次钱包'+p.cash+'金币，'+outcome);
    n.style.setProperty('--visit-delay',position*65+'ms');
    n.onclick=function(){inspection.hidden=false;inspection.textContent='小'+(i+1)+'：上次钱包剩'+p.cash+'枚。'+(p.served?(p.covered?'有人代付，用上了照护。':'自己付款，用上了照护。'):p.reason==='money'?'需要照护，但付不起。':'钱备好了，但人手不够，没排到。');StreetArt.decorateMoney(inspection);};
   });
   const past=el('details','',result,'care-past-runs');el('summary','看看前几次的安排',past);
   const served=el('p','用上了：'+(a.queue.filter(i=>a.people[i].served).map(i=>'小'+(i+1)).join('、')||'还没有人'),past,'care-who-served');served.dataset.testid='care-who-served';
   el('p','付得起，但没排到：'+(a.queue.filter(i=>a.people[i].reason==='capacity').map(i=>'小'+(i+1)).join('、')||'无人'),past,'care-who-waits');
   const trials=el('div','',past,'care-comparisons');(c.state.careRoutingTrials||[]).slice(-3).forEach(r=>el('span',r.staff+'人 · 能服务'+r.capacity+' · 用上'+r.served,trials));
   if(executing){result.tabIndex=-1;result.focus({preventScroll:true});result.scrollIntoView({block:'start',behavior:'instant'});}
  }
  executing=false;
  const book=el('details','',wrap,'street-bounds');el('summary','账本与假设',book);
  el('p','每次从同一起点比较：十二个钱包共24枚，私人照护站20枚，公共账户24枚，总计68枚。前四人各4枚，其余各1枚，每次服务售价2枚。四位已有工作人员，先有两位受训。不会新增居民或凭空发钱。',book);
  el('p','每名排岗者工资2枚，每份培训名额支付受训者2枚（教学培训补助），设备设置2枚，每次已服务耗材1枚。付款凭证只指定公共账户替谁付款，不给钱包充值；未被服务，不支付，也不消耗耗材。辅助设备假设把每人能力从2位提高到3位，不是经验估计。',book);
  if(a)el('p','上次实际：照护站'+a.firm+'枚、家庭'+a.households+'枚、公共账户'+a.publicFunds+'枚、四位工作人员'+a.workerFunds+'枚、供应者'+a.supplier+'枚，合计'+a.moneyAfter+'枚；工资'+a.wages+'枚、培训补助'+a.training+'枚、设备'+a.setup+'枚、耗材'+a.inputs+'枚、收款'+a.receipts+'枚。',book);
  el('p','一次独立教学期，不是可直接使用的医疗排班。培训在期内先完成再服务，被大幅压缩，不代表现实当天取得执业资格。未模拟服务质量、安全、固定费用、税收或长期筹资，余额变化不是净利润。今天错过的服务不能放入仓库。拖动小人把他插到该位置，其余顺移；能力和总需求不变。顺序只在实际服务时生效，付不起的人不占用已完成服务的名额。本局未引入病情轻重，不是临床分诊规范。',book);
  if(s.run&&s.trials.length>=2)action(c,invitation?invitation.finishLabel:'谁还在门外？ →',{type:'CONCLUDE'},c.controls,'primary');
 };
})(window);
