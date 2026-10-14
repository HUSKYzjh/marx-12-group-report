(function(root){
 'use strict';
 let focusId=null,focusTarget=null,event=null;
 function el(tag,text,parent,cls){const n=document.createElement(tag);n.className=cls||'';n.textContent=text||'';parent.appendChild(n);StreetArt.decorateMoney(n);return n;}
 function send(c,a){c.send({type:'NEEDS',action:{type:'FREIGHT',action:a}});}
 function action(c,text,a,parent,cls){const b=el('button',text,parent,cls||'secondary');b.type='button';b.onclick=function(){send(c,a);};return b;}
 function art(paths,label,box){return '<svg viewBox="'+(box||'0 0 200 150')+'" fill="white" stroke="#5b5b5b" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="'+label+'">'+paths+'</svg>';}
 function crate(){return art('<path d="M8 16L35 7l26 9v35L34 62 8 52ZM8 16l26 10 27-10M34 26v36M13 25l15 6m-15 9 15 6m13-16 14-6m-14 20 14-6"/><path d="M23 11l26 10v9M17 20v31"/>','一组实际生产的材料','0 0 70 70');}
 const partNames={power:'能源件',air:'供气件',structure:'结构件'};
 function part(kind){
  const paths={power:'<path d="M11 15h43l-8 28H4ZM25 15l-7 28m20-28-6 28M8 29h42M23 43v10m-9 3h19"/>',air:'<path d="M18 19q0-10 11-10t11 10v30q-11 12-22 0ZM22 9V4h14v5M18 22h22m-22 21h22M40 26h10v20m-9-15h8"/>',structure:'<path d="M8 52V31q0-21 22-21t22 21v21ZM8 31h44M26 52V37h9v15M15 37h6v7h-6m25-7h6v7h-6M4 57h52"/>'};
  return art(paths[kind],partNames[kind],'0 0 62 64');
 }
 function base(a,loaded){
  const projected=Object.assign({},a.built);
  loaded.forEach(function(k){projected[k]=Math.min(4,projected[k]+1);});
  const possible=Math.min(projected.power,projected.air,projected.structure);
  function attrs(k,i){return i<a.built[k]?'opacity="1"':i<projected[k]?'data-preview-part="'+k+'" opacity=".75" stroke-dasharray="4 3"':'opacity=".18"';}
  return '<svg data-built-habitats="'+a.habitats+'" data-preview-habitats="'+possible+'" viewBox="0 0 300 142" fill="none" stroke="#5b5b5b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="已能住'+a.habitats+'间；这一船交付后能住'+possible+'间，虚线只是预览">'+[0,1,2,3].map(function(i){const x=i*74+5,live=i<a.habitats,preview=!live&&i<possible;return '<g transform="translate('+x+' 0)"><g '+attrs('power',i)+'><path d="M5 14h34l-6 16H1ZM15 14l-5 16m17-16-5 16M4 22h32M17 30v7"/></g><g '+attrs('air',i)+'><path d="M48 18q0-8 8-8t8 8v21q-8 8-16 0ZM52 10V5h8v5M48 22h16m-16 12h16"/></g><path d="M17 37v10h9m30-4v4H42" opacity="'+(live?1:preview?.7:.18)+'"'+(preview?' stroke-dasharray="4 3"':'')+'/><g '+attrs('structure',i)+'><path d="M5 105V78q0-30 28-30t28 30v27ZM5 78h56M26 105V88h14v17M12 84h8v11h-8m35-11h8v11h-8"/></g>'+((live||preview)?'<g '+(preview?'data-preview-resident="true" opacity=".7" stroke-dasharray="3 3"':'data-built-resident="'+i+'"')+'><circle cx="33" cy="67" r="5"/><path d="M29 74v6h8v-6M13 124l5-4m31 4 5-4"/></g>':'')+'</g>';}).join('')+'<path d="M2 112q42-5 80 0t80 0t133 0"/></svg>';
 }
 function factory(){return art('<path d="M12 132V66l38-23v23l38-23v23l38-23v89ZM125 132h64V69h-18V27h-19v42h-27M23 91h17v23H23Zm34 0h17v23H57Zm34 0h17v23H91ZM143 88h28v27h-28M153 19q-9-10 2-17m19 17q8-8 0-17"/><path d="M8 140h185"/>','你的材料厂');}
 function city(a){
  const shapes=['M12 123V91q14-38 31 0v32Z','M16 89h23M24 104v19M12 124h31','M50 123V78h29v45Z','M57 91h14v15H57ZM55 114h18','M84 123V59h27v64Z','M90 74h15m-15 14h15m-15 14h15','M116 123l5-26h35l-7 26Z','M128 97l-5 25m18-25-7 25m-14-13h33','M155 123V82h26v41Z','M155 94h26m-26 13h26M168 82V54','M33 76V56m-8 0h17M73 63V39','M119 81V64m-5 0h11M186 125h7'];
  return '<svg viewBox="0 0 200 150" fill="none" stroke="#5b5b5b" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="基地实际建成'+a.delivered+'／12组"><path d="M5 134q44-7 80 0t109-1"/>'+shapes.map((d,i)=>'<path d="'+d+'" opacity="'+(i<a.delivered?'1':'.18')+'"/>').join('')+'</svg>';
 }
 function owner(){const a=TRUST_ASSETS.bakery,f=a.hatAtlas.frames.hatguy0000.frame;return '<svg viewBox="'+f.x+' '+f.y+' '+f.w+' '+f.h+'" aria-label="材料厂老板" role="img"><image href="'+a.hat+'" width="'+a.hatAtlas.meta.size.w+'" height="'+a.hatAtlas.meta.size.h+'"/></svg>';}
 function lastDelivery(s,a,parent){
  const p=a.periods.at(-1);if(!p)return;
  const row=el('section','',parent,'freight-settlement');row.dataset.testid='freight-settlement';row.dataset.actualRound=String(p.round);
  el('span','第'+p.round+'期已结算',row,'freight-period');
  const goods=el('div','',row,'freight-delivered-goods'),kinds=s.history.flatMap(function(r){return r.mix||[];});
  s.history.at(-1).shipped.forEach(function(id){const n=el('span','',goods);n.dataset.deliveredCrate=String(id);n.dataset.kind=kinds[id]||'';n.innerHTML=s.construction?part(kinds[id]):crate();});
  if(!p.sold)el('span','这期没有交货',goods,'freight-empty');
  el('p','交货 '+p.sold+'组 → 收到 '+p.receipts+'枚',row);
  const before=p.round===1?60:a.periods[p.round-2].closing,delta=p.closing-before;
  el('small','本期工资 '+p.wages+'枚 · 原料 '+p.inputs+'枚 · 工厂资金 '+(delta>=0?'+':'')+delta+'枚',row);
 }
 root.renderSpaceFreight=function(c,t){
  const s=t.freight,a=c.state.freightAccount,probe=c.state.freightExploration;
  if(s.phase==='conclusion'){
   const end=el('div','',c.readout,'needs-conclusion');el('p','技术造得更快，不会让付款订单自动续上。',end,'relief-caption');
   const contrasts=el('div','',end,'freight-comparisons');(c.state.freightTrials||[]).slice(-3).forEach(function(r){el('span','产能'+r.capacity+' · 订单'+r.order+(r.renewed?'＋维护':'')+' · 交货'+r.sold+' · 剩'+r.stock+(r.construction?' · 能住'+r.habitats+'间':''),contrasts);});
   const limits=el('details','',end,'street-bounds');el('summary','这个实验能说明什么？',limits);
   el('p','新的建设需要、有资金的投资和维护订单，可以吸收材料并带来工作；产能快于订单，或建完后仍照旧生产，也可能留下更多库存。少生产也能避免积压，不能把危机写成每条路必然的终点。',limits);
   if(s.construction)el('p','基地既缺材料，也可能有不合用的库存：能源、供气、结构须配套。换生产图纸改变产品搭配，扩大订单改变已承诺的购买；不是同一个条件。每间住舱的一比一配套、各类成本相同均为教学设定，不是航天工程比例。',limits);
   el('p','材料厂、建设方和供应者分工协作，但厂主仍掌握生产安排和机器。更大的市场不自动改变产权。这个独立采购实验不是全部社会的再生产模型，不能仅据此证明资本主义必然崩溃，也不能把公共采购直接称为社会主义。',limits);
   const reset=el('details','',limits,'experiment-reset');el('summary','清空记录，重新开局',reset);el('p','只清空这条太空分支的订单和回执，其他分支不动。',reset);
   const clear=el('button','清空本分支，重新开局',reset,'secondary');clear.type='button';clear.onclick=function(){c.send({type:'NEEDS',action:{type:'RESTART'}});};
   action(c,'保留回执，再接一单 ↺',{type:'RETRY'},c.controls);return;
  }
  const wrap=el('div','',c.readout,'space-freight');wrap.dataset.testid='space-freight';wrap.dataset.stage=s.stage;wrap.dataset.round=String(s.history.length);if(s.construction)wrap.dataset.construction='true';
  if(s.trials.length){const past=el('details','',wrap,'freight-past-trials');el('summary','之前的回执 · '+s.trials.length+'次',past);(c.state.freightTrials||[]).forEach(function(r){el('p','产能'+r.capacity+' · 订单'+r.order+(r.renewed?'＋维护':'')+' · 做出'+r.produced+' · 交货'+r.sold+' · 剩'+r.stock+(r.construction?' · 能住'+r.habitats+'间':''),past);});}
  el('span',s.stage==='finished'?'三期结束':'第'+(s.history.length+1)+'期 · '+(s.stage==='planning'?'接单备货':'装船交货'),wrap,'freight-period');
  const pieces=[],targets=[];
  const hint=el('p',s.stage==='planning'?'看订单，定产量。':s.stage==='loading'?(a.loadLimit?'装船，交货后收钱。':'订单用完了，剩货留在仓库。'):probe?probe.prompt:'同一起点，换个条件。',wrap,'freight-hint');hint.setAttribute('role','status');if(probe)hint.dataset.testid='freight-challenge';
  // Finished play shows actual goods and payment, not an empty loading editor.
  if(s.stage==='finished'){
   const outcome=el('section','',wrap,'freight-outcome');outcome.dataset.testid='freight-outcome';
   const site=el('div','',outcome,'freight-built-site');site.innerHTML=s.construction?base(a,[]):city(a);
   el('h3',s.construction?'能住 '+a.habitats+' / 4 间':'基地 '+a.delivered+' / 12',site);
   if(a.renewed)el('small','已完成维护 '+a.maintenanceDelivered+' / 6组',site);
   else el('small',a.need?'还缺 '+a.need+'组材料':'建设订单完成，维护须另接单。',site);
   lastDelivery(s,a,outcome);
   const result=el('div','',outcome,'freight-final');result.dataset.testid='freight-final';el('span','做出 '+a.produced,result);el('span','交货 '+a.sold,result);el('span','剩下 '+a.stock,result);
   const stock=el('section','',outcome,'freight-leftovers');el('span','仍在工厂的货',stock,'freight-stock-title');
   const notice=el('p',a.stock?'':'仓库空了，下一单还没签。',stock,'freight-stock-inspection');notice.hidden=!!a.stock;notice.setAttribute('role','status');
   const bins=el('div','',stock,'freight-stock-bins');bins.dataset.single=String(s.construction&&new Set(a.crates.map(function(item){return item.kind;})).size===1);
   (s.construction?Object.keys(partNames):['material']).forEach(function(k){
    const items=a.crates.filter(function(item){return !s.construction||item.kind===k;}),bin=el('div','',bins,'freight-stock-bin');bin.dataset.stockKind=k;bin.dataset.count=String(items.length);
    el('span',(partNames[k]||'材料')+' '+items.length+'组',bin);if(probe&&probe.focusKind===k)bin.dataset.probeFocus='true';
    items.forEach(function(item){const b=el('button','',bin,'freight-stock-item');b.type='button';b.dataset.storedCrate=String(item.id);b.innerHTML=s.construction?part(k):crate();b.setAttribute('aria-label','查看'+(partNames[k]||'材料')+'货号'+item.id);
     b.onclick=function(){const wanted=s.construction?a.wanted[k]:a.need+a.maintenanceNeed;notice.hidden=false;notice.textContent='货号'+item.id+' · '+(partNames[k]||'材料')+'。'+(!wanted?'当前订单不再需要这种货。':a.authorization<4?'基地仍缺这种货，但已签付款用完了。':'基地仍需这种货，已签付款也还有；这次没有交付。')+'它仍归工厂，没有换成收款。';};
    });
   });
   const money=el('div','',outcome,'freight-wallets');[['工厂',a.firm],['建设方',a.buyer],['工人',a.workers],['供应者',a.supplier]].forEach(function(pair){el('span',pair[0]+' '+pair[1]+'枚',money);});
   const log=el('details','',wrap,'freight-production-log');el('summary','查看三期生产与交货',log);
   a.periods.forEach(function(p){const row=el('div','第'+p.round+'期 · 做'+p.produced+' · 交'+p.sold+' · 剩'+p.stock+(s.construction?' · 能住'+p.habitats+'间':''),log);row.dataset.loggedRound=String(p.round);});
   if(probe&&probe.comparison)el('p',probe.comparison,wrap,'freight-probe-comparison');
   action(c,'换个条件再试 ↺',{type:'RETRY'},wrap,'secondary');if(s.trials.length>=2)action(c,'订单会一直来吗？ →',{type:'CONCLUDE'},c.controls,'primary');
   ledger(s,a,wrap);event=null;return;
  }
  if(s.stage==='planning'&&s.history.length)lastDelivery(s,a,wrap);
  function kindOf(id){return a.crates.find(function(k){return k.id===id;})?.kind;}
  function canLoad(id){const k=kindOf(id);return s.cargo.includes(id)||s.cargo.filter(n=>n!==null).length<a.loadLimit&&(!s.construction||s.cargo.filter(n=>n!==null&&kindOf(n)===k).length<a.wanted[k]);}
  function piece(id,text,parent,cls){const n=el('button',text,parent,cls);n.type='button';n.dataset.freightPiece=id;pieces.push({id,name:id.startsWith('crate:')?(partNames[kindOf(Number(id.slice(6)))]||'一组材料'):text,node:n});return n;}
  function target(id,node,button,accepts){node.dataset.freightTarget=id;targets.push({id,node,button,accepts});}
  const documents=el('div','',wrap,'freight-documents');
  if(s.stage==='planning'&&!s.history.length){
   const offers=el('div','',documents,'freight-offers');[4,12].forEach(function(n){const paper=piece('contract:'+n,'本单'+n+'组',offers,'freight-paper');el('small','已批付款 '+n*4+'枚',paper);paper.dataset.current=String(s.order===n);});
  }
  const order=el('section','',documents,'freight-orderbook');const orderHeading=el('button','订单夹',order,'freight-destination');orderHeading.type='button';orderHeading.setAttribute('aria-label','把合同放进订单夹');
  target('book',order,orderHeading,function(id){return id.startsWith('contract:')&&s.stage==='planning'&&!s.history.length||id==='maintenance'&&s.stage!=='finished'&&a.need===0&&!a.renewed;});
  el('span','已签 '+s.order+'组'+(a.renewed?' ＋ 维护6组':''),order);el('small','还收 '+a.loadLimit+'组 / 船',order);el('small','买方现有 '+a.buyer+'枚',order);
  if(a.need===0&&!a.renewed&&s.stage!=='finished'){const offer=piece('maintenance','维护单 · 6组',documents,'freight-paper freight-maintenance');el('small','已批付款24枚',offer);}
  const floor=el('div','',wrap,'freight-floor');
  const shop=el('section','',floor,'freight-factory');const factoryArt=el('div','',shop,'freight-factory-art');factoryArt.innerHTML=factory();const boss=el('span','',factoryArt,'freight-owner');boss.innerHTML=owner();
  const stored=a.available.filter(id=>!s.cargo.includes(id));
  if(s.construction&&s.stage==='planning'){
   const program=el('div','',wrap,'freight-program');el('span','这期生产线',program,'freight-program-title');
   const palette=el('div','',program,'freight-blueprints');Object.keys(partNames).forEach(function(k){const n=piece('blueprint:'+k,'',palette,'freight-blueprint');n.innerHTML=part(k);el('small',partNames[k],n);n.setAttribute('aria-label','拿起'+partNames[k]+'的生产图纸');});
   const machines=el('div','',program,'freight-machines');for(let i=0;i<s.capacity;i++){const node=el('div','',machines,'freight-machine'),b=el('button','',node,'freight-machine-face');b.type='button';b.dataset.kind=s.plan[i]||'';b.setAttribute('aria-label','把图纸放到生产位'+(i+1));b.innerHTML=s.plan[i]?part(s.plan[i]):'<span>空着</span>';target('machine:'+i,node,b,function(id){return id.startsWith('blueprint:');});const clear=action(c,'×',{type:'PLAN',slot:i,kind:null},node,'freight-clear');clear.setAttribute('aria-label','停用生产位'+(i+1));clear.disabled=s.plan[i]===null;}
  }
  const shelfHeading=el('button','仓库 · '+stored.length+'组',shop,'freight-destination');shelfHeading.type='button';shelfHeading.setAttribute('aria-label','把材料放回仓库');target('store',shop,shelfHeading,function(id){return id.startsWith('crate:')&&s.cargo.includes(Number(id.split(':')[1]));});
  shop.dataset.empty=stored.length===0;
  const shelves=el('div','',shop,'freight-warehouse');
  stored.slice(0,s.construction?stored.length:6).forEach(function(id){const n=piece('crate:'+id,'',shelves,'freight-crate');n.innerHTML=s.construction?part(kindOf(id)):crate();n.setAttribute('aria-label',(partNames[kindOf(id)]||'材料')+' · 货号'+id);n.dataset.kind=kindOf(id)||'';n.dataset.loadable=canLoad(id);if(s.stage!=='loading')n.disabled=true;n.dataset.crate=String(id);n.dataset.newGoods=String(s.pending!==null&&id>=a.produced-s.pending);});
  if(!s.construction&&stored.length>6)el('small','另有 '+(stored.length-6)+'组',shop,'freight-remaining');if(!stored.length)el('span','仓库空着',shelves,'freight-empty');
  const ship=el(s.construction?'details':'section','',floor,'freight-ship');if(s.construction){const summary=el('summary','船上 '+s.cargo.filter(n=>n!==null).length+' / '+a.loadLimit+'组 · 查看、卸货',ship,'freight-cargo-summary');summary.dataset.testid='freight-cargo-summary';}else el('span','货船',ship,'freight-ship-title');const holds=el('div','',ship,'freight-holds');
  for(let i=0;i<6;i++){
   const hold=el('div','',holds,'freight-hold');const lid=el('button','舱'+(i+1),hold,'freight-hold-button');lid.type='button';lid.setAttribute('aria-label','放进船舱'+(i+1));
   target('hold:'+i,hold,lid,function(id){const crateId=Number(id.split(':')[1]);return s.stage==='loading'&&id.startsWith('crate:')&&s.cargo[i]===null&&a.available.includes(crateId)&&canLoad(crateId);});
   if(s.cargo[i]!==null){const n=piece('crate:'+s.cargo[i],'',hold,'freight-crate freight-loaded');n.innerHTML=s.construction?part(kindOf(s.cargo[i])):crate();n.dataset.kind=kindOf(s.cargo[i])||'';n.setAttribute('aria-label',(partNames[kindOf(s.cargo[i])]||'材料')+' · 已装货号'+s.cargo[i]);}
  }
  el('small','已装 '+s.cargo.filter(n=>n!==null).length+' / '+a.loadLimit+'组',ship,'freight-loaded-count');
  const loadedKinds=s.cargo.filter(id=>id!==null).map(kindOf);
  const site=el('section','',floor,'freight-site');site.innerHTML=s.construction?base(a,loadedKinds):city(a);el('span',s.construction?'能住 '+a.habitats+' / 4 间':'基地 '+a.delivered+' / 12',site);
  if(s.construction&&s.stage==='loading'){
   const projected=Number(site.querySelector('[data-preview-habitats]').dataset.previewHabitats),extra=projected-a.habitats;
   const preview=el('small',!loadedKinds.length?'尚未装船':a.need===0?'发船后完成这批维护':extra?'发船后，可再住'+extra+'间':'这批还没配齐住舱',site,'freight-preview');preview.setAttribute('role','status');preview.dataset.extraHomes=String(extra);
   el('small','虚线：船上的货，尚未交付',site,'freight-preview-key');
  }
  if(s.construction){const missing=el('div','',site,'freight-needs');Object.keys(partNames).forEach(function(k){
   const row=el(s.stage==='loading'?'div':'span','',missing,s.stage==='loading'?'freight-need-socket':'');
   if(s.stage==='loading'){
    const n=el('button','',row,'freight-need-button');n.type='button';n.setAttribute('aria-label','为基地配'+partNames[k]);n.innerHTML=part(k);el('span',partNames[k],n);
    el('small','还缺 '+a.wanted[k]+' · 船上 '+loadedKinds.filter(function(kind){return kind===k;}).length,n);row.dataset.neededKind=k;
    target('site:'+k,row,n,function(id){const crateId=Number(id.split(':')[1]);return id.startsWith('crate:')&&kindOf(crateId)===k&&!s.cargo.includes(crateId)&&canLoad(crateId);});
    row.dataset.receivable=String(a.wanted[k]>loadedKinds.filter(function(kind){return kind===k;}).length&&s.cargo.filter(n=>n!==null).length<a.loadLimit);
   }else{row.innerHTML=part(k);el('small',partNames[k]+'还需'+a.wanted[k],row);}
  });}if(a.renewed)el('small','维护 '+a.maintenanceDelivered+' / 6',site);else if(a.need===0)el('small','建成了！',site);else if(!s.construction)el('small','还缺 '+a.need+'组',site);
  const flight=el('div','',wrap,'freight-flight');flight.innerHTML=art('<path d="M15 32L49 9l11 10-23 34-15 2ZM32 21l-17-3-6 7 16 4m17 10 3 17 7-6-2-19M18 37L6 51m19-9L12 57"/>','正在交货的货船','0 0 70 70');if(event==='launch'&&a.periods.at(-1)?.sold>0)flight.dataset.flying='true';else flight.hidden=true;
  if(s.stage==='planning'){
   const controls=el('div','',wrap,'freight-production');const label=el('label','这期做 '+s.quantity+'组',controls);label.htmlFor='freight-quantity';
   if(!s.construction){const q=el('input','',controls);q.id='freight-quantity';q.type='range';q.min='0';q.max=String(s.capacity);q.step='1';q.value=String(s.quantity);q.onchange=function(){send(c,{type:'QUANTITY',quantity:Number(q.value)});};}
   const equipment=el('details','',controls,'freight-equipment');el('summary','机器产能 · '+s.capacity+'组 / 期',equipment);const cap=el('input','',equipment);cap.id='freight-capacity';cap.setAttribute('aria-label','假设每期最大产能');cap.type='range';cap.min='2';cap.max='6';cap.step='2';cap.value=String(s.capacity);cap.disabled=s.history.length>0;cap.onchange=function(){send(c,{type:'CAPACITY',capacity:Number(cap.value)});};
   const run=action(c,s.quantity?'开工 →':'这期不开工 →',{type:'PRODUCE',expectedRound:s.history.length},wrap,'primary');run.onclick=function(){event='produce';send(c,{type:'PRODUCE',expectedRound:s.history.length});};
  }else if(s.stage==='loading'){
   const n=s.cargo.filter(v=>v!==null).length;const run=action(c,n?'发船 →':'结束这一期 →',{type:'LAUNCH',expectedRound:s.history.length},wrap,'primary');run.onclick=function(){event='launch';send(c,{type:'LAUNCH',expectedRound:s.history.length});};
  }
  if(event==='produce'&&s.pending>0)wrap.dataset.producing='true';event=null;
  const loadingPrompt='部件放到对应缺口，发船才交货。';
  root.GestureBoard.bind(wrap,{ghostClass:'freight-ghost',pieces,targets,hint,prompt:s.construction&&s.stage==='loading'?loadingPrompt:s.construction?'按基地缺的种类排图纸、装材料。':'拿起合同或材料，再选择位置放下。',placedMessage:'已安排；发船后才交货付款。',rejectMessage:function(id,to){
   if(id&&id.startsWith('crate:')&&to.startsWith('site:')){const k=kindOf(Number(id.slice(6))),needed=to.slice(5);if(k!==needed)return partNames[k]+'不能代替'+partNames[needed]+'。';if(s.cargo.includes(Number(id.slice(6))))return '它已经在船上了。';return a.loadLimit===0?'基地有需要，但这单的付款用完了。':a.wanted[k]===0?'这类材料已经够了，不收更多。':loadedKinds.filter(function(kind){return kind===k;}).length>=a.wanted[k]?'这类材料已经装够了，不收更多。':'这船已经装够了。';}
   return '这里放不下，回到原处。';
  },onPickup:function(id){if(s.construction&&id.startsWith('crate:')&&!canLoad(Number(id.slice(6))))hint.textContent=a.loadLimit===0?'这单没有剩余付款了。':a.wanted[kindOf(Number(id.slice(6)))]===0?'基地已经不缺这种部件。':'这类部件，这船已经装够了。';},onDrop:function(id,to){
   focusId=id;focusTarget=to.startsWith('site:')?to:null;if(id.startsWith('blueprint:'))send(c,{type:'PLAN',slot:Number(to.split(':')[1]),kind:id.slice(10)});else if(id.startsWith('contract:'))send(c,{type:'CONTRACT',order:Number(id.split(':')[1])});else if(id==='maintenance')send(c,{type:'MAINTENANCE'});else{const crateId=Number(id.split(':')[1]);send(c,to.startsWith('site:')?{type:'LOAD_FOR_NEED',crate:crateId,kind:to.slice(5),expectedRound:s.history.length}:to==='store'?{type:'UNLOAD',slot:s.cargo.indexOf(crateId)}:{type:'LOAD',crate:crateId,slot:Number(to.split(':')[1])});}
  }});
  if(s.construction&&s.stage==='planning')hint.textContent='把图纸放上生产线。三样配齐，住舱才能用。';
  if(s.construction&&s.stage==='loading')hint.textContent=loadingPrompt;
  if(focusId){const n=wrap.querySelector('[data-freight-piece="'+focusId+'"]');if(n)n.dataset.arrived='true';const destination=focusTarget&&wrap.querySelector('[data-freight-target="'+focusTarget+'"] > button');if(destination)destination.focus({preventScroll:true});else if(n&&n.getClientRects().length)n.focus({preventScroll:true});focusId=null;focusTarget=null;}
  ledger(s,a,wrap);
 };
 function ledger(s,a,wrap){
  const book=el('details','',wrap,'street-bounds');el('summary','账本与假设',book);
  el('p','独立开局：工厂60枚，建设方96枚，工人和供应者零余额，总计156枚。每组工资2枚、原料1枚、售价4枚。当前工厂'+a.firm+'枚、建设方'+a.buyer+'枚、工人'+a.workers+'枚、供应者'+a.supplier+'枚。库存仍归工厂，装船不是销售，发船才交货付款。',book);
  el('p','基地总需12组。订单可以只批4组，也可批整座12组；基地建成后才开放维护6组，须另外接单。本实验中付款方已有96枚，批款不是新造钱。未批预算仍留在买方账户，不等于会买走全部库存。',book);
  el('p','三期教学情景；组是综合材料，不是真实吨位。机器已购入，产能是可变假设，未计购置、折旧、发射成本和失败风险，因此余额变化不是净利润。人手与工资聚合为一个工人账户，不模拟失业、生活消费、融资或政府制度。每次重试从同一开局开始，日常调生产量不清空已有库存。',book);
  if(s.construction)el('p','一间住舱各需能源、供气、结构一组，共四间；维修另需各两组。比例、同价同成本、到货就能装配都是教学设定，并非真实月面工程图纸。图纸可重复使用，不是待售商品；停用生产位减少这期工作量，不清空旧库存。只有基地仍缺的类型、且有已批付款时才能发货；调换船舱位置本身没有额外收益。',book);
  if(s.construction)el('p','把部件放到基地缺口，只是按类型预留一个空船舱；虚线不算建成，也没有提前收款。各类货配给哪一间在本局不影响账目，因而不要求反复选择相同的舱位；装载表仍可展开检查、卸货或移动。',book);
  a.periods.forEach(function(p){el('p','第'+p.round+'期：做'+p.produced+'、交'+p.sold+'、剩'+p.stock+'；工资'+p.wages+'枚、原料'+p.inputs+'枚、收款'+p.receipts+'枚。',book);});
 }
})(window);
