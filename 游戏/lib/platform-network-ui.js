(function(root){
 'use strict';
 let focusId=null,nextFocus=null,nextRulesOpen=false,operating=false,geometryObserver=null,workspaceOpen=false;
 root.clearPlatformNetworkGeometry=function(){if(geometryObserver){geometryObserver.disconnect();geometryObserver=null;}};
 const names=['面包厂','服装厂','车厂'],rules={locked:'资料锁定',portable:'资料可搬',joint:'成员共有平台'};
 function el(tag,text,parent,cls){const n=document.createElement(tag);n.className=cls||'';n.textContent=text||'';parent.appendChild(n);StreetArt.decorateMoney(n);return n;}
 function send(c,a){c.send({type:'OWNERSHIP',action:{type:'NETWORK',action:a}});}
 function action(c,text,a,parent,cls){const b=el('button',text,parent,cls||'secondary');b.type='button';b.onclick=()=>send(c,a);return b;}
 function server(){return '<svg viewBox="0 0 100 90" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 9l56 2 2 64-58 2ZM22 31l57-1M22 52l57 1M30 21h3m-3 21h3m-3 21h3M45 21h23M45 42h23M45 63h23M27 79v5m47-6v6"/><circle cx="35" cy="21" r="2"/><circle cx="35" cy="42" r="2"/><circle cx="35" cy="63" r="2"/></svg>';}
 function plug(){return '<svg viewBox="0 0 42 32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M11 10l21 1-1 12-19 1ZM17 2v8m9-8v9M20 24v6"/></svg>';}
 function key(){return '<svg viewBox="0 0 50 26" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M17 11l23 9m-9-4-2 5m7-3-1 5"/></svg>';}
 function nextWiring(c,s,parent,workspace){
  const d=s.proposal||s,desk=el('section','',parent,'network-next');parent.insertBefore(desk,workspace);desk.hidden=workspace.open;
  el('h4','再试一组 · 还没结算',desk);el('small','同一起点，换个接法。',desk,'network-next-note');
  const board=el('div','',desk,'network-next-board'),pieces=[],targets=[],sources=[],destinations={};
  const wires=document.createElementNS('http://www.w3.org/2000/svg','svg');wires.classList.add('network-wires');wires.setAttribute('aria-hidden','true');board.appendChild(wires);
  const shops=el('div','',board,'network-next-shops');names.forEach((name,i)=>{
   const cell=el('div','',shops,'network-next-shop'),image=el('img','',cell);image.src=[TRUST_ASSETS.bakery.newOven,TRUST_ASSETS.street.clothes,TRUST_ASSETS.street.cars][i];image.alt='';el('span',name,cell);
   const b=el('button','',cell,'network-plug');b.type='button';b.dataset.networkNextPiece='shop:'+i;b.innerHTML=plug();el('small',d.routes[i]===null?'停用':d.routes[i]==='A'?'原入口':'备选入口',b);sources.push(b);pieces.push({id:'shop:'+i,node:b,name:name+'下次的插头'});
   const path=document.createElementNS(wires.namespaceURI,'path');path.dataset.shop=String(i);wires.appendChild(path);
  });
  const providers=el('div','',board,'network-next-providers');['A','B','unplug'].forEach(to=>{
   const target=el('div','',providers,'network-next-provider'),b=el('button','',target,'network-destination');b.type='button';target.dataset.networkNextTarget=to;
   b.innerHTML=to==='unplug'?plug():server();el('span',to==='A'?d.rule==='joint'?'成员入口':'原入口':to==='B'?'备选入口':'暂时停用',b);el('small',to==='unplug'?'不开工':(to==='A'?d.fee:2)+'枚 / 店',b);destinations[to]=b;targets.push({id:to,node:target,button:b,accepts:id=>id.startsWith('shop:')});
  });
  const hint=el('p','拖插头换入口，执行后结算。',desk,'network-next-hint');hint.setAttribute('role','status');
  const rulesDesk=el('details','',desk,'network-next-rules');el('summary','收费与钥匙 · '+rules[d.rule],rulesDesk);rulesDesk.open=nextRulesOpen;rulesDesk.ontoggle=()=>{if(rulesDesk.isConnected)nextRulesOpen=rulesDesk.open;};
  const papers=el('div','',rulesDesk,'network-papers');Object.keys(rules).forEach(rule=>{const b=el('button',rules[rule],papers,'network-paper');b.type='button';b.dataset.networkNextPiece='rule:'+rule;b.dataset.active=String(d.rule===rule);pieces.push({id:'rule:'+rule,node:b,name:rules[rule]+'条件纸'});});
  const holder=el('div','',rulesDesk,'network-holder'),hb=el('button','下次条件：'+rules[d.rule],holder,'network-destination');hb.type='button';holder.dataset.networkNextTarget='contract';targets.push({id:'contract',node:holder,button:hb,accepts:id=>id.startsWith('rule:')});
  const authority=el('div','',rulesDesk,'network-next-authority');authority.innerHTML=key().repeat(d.rule==='joint'?3:1);el('small',d.rule==='joint'?'三店共同决定':'服务商决定',authority);
  if(d.rule!=='joint'){
   const fees=el('div','',rulesDesk,'network-next-fee');el('span','原入口每店 ',fees);
   const minus=action(c,'−',{type:'NEXT_FEE',fee:d.fee-1},fees,'step');minus.setAttribute('aria-label','下次减少使用费');minus.disabled=d.fee===0;
   el('output',d.fee+'枚',fees);const plus=action(c,'＋',{type:'NEXT_FEE',fee:d.fee+1},fees,'step');plus.setAttribute('aria-label','下次增加使用费');plus.disabled=d.fee===6;
  }
  function curve(path,point){const b=board.getBoundingClientRect(),from=sources[Number(path.dataset.shop)].querySelector('svg').getBoundingClientRect(),x=from.left+from.width/2-b.left,y=from.bottom-b.top;path.setAttribute('d','M'+x+' '+y+' C'+x+' '+(y+30)+' '+point.x+' '+(point.y-30)+' '+point.x+' '+point.y);}
  function align(){if(!board.isConnected||!board.getClientRects().length)return;const b=board.getBoundingClientRect();wires.setAttribute('viewBox','0 0 '+b.width+' '+b.height);wires.querySelectorAll('path:not([data-pulling])').forEach(path=>{const to=d.routes[Number(path.dataset.shop)]||'unplug',r=destinations[to].querySelector('svg').getBoundingClientRect();curve(path,{x:r.left+r.width/2-b.left,y:r.top-b.top});});}
  root.GestureBoard.bind(desk,{pieces,targets,hint,ghostClass:'network-next-ghost',prompt:'改的是下一组安排，不是过去的收款。',onDragMove:(id,p)=>{
   if(!id.startsWith('shop:'))return;const path=wires.querySelector('[data-shop="'+id.slice(5)+'"]'),b=board.getBoundingClientRect();path.dataset.pulling='true';curve(path,{x:p.x-b.left,y:p.y-b.top});
  },onDragEnd:id=>{if(id.startsWith('shop:')){wires.querySelector('[data-shop="'+id.slice(5)+'"]').removeAttribute('data-pulling');align();}},onInspect:to=>{
   hint.textContent=to==='contract'?'拖入条件纸。连线和其他收费不动；共同入口按维护成本收1枚。':to==='unplug'?'停用也有代价：这一期不开工、不发工资。':to==='B'?'备选每店收2枚；从原入口搬过去，还要付'+(d.rule==='locked'?6:1)+'枚迁移费。':'留在原入口，第二期没有迁移费。';StreetArt.decorateMoney(hint);
  },onDrop:(id,to)=>{nextFocus=id;send(c,id.startsWith('rule:')?{type:'NEXT_RULE',rule:id.slice(5)}:{type:'NEXT_CONNECT',shop:Number(id.slice(5)),to:to==='unplug'?null:to});}});
  const run=action(c,'按新安排，经营对照 →',{type:'COMPARE',expectedRevision:s.revision},desk,'secondary');run.disabled=!s.proposal;run.dataset.networkCompare='true';run.onclick=()=>{operating=true;send(c,{type:'COMPARE',expectedRevision:s.revision});};
  if(nextFocus){const node=desk.querySelector('[data-network-next-piece="'+nextFocus+'"]');node?.focus({preventScroll:true});nextFocus=null;}
  requestAnimationFrame(align);if(document.fonts)void document.fonts.ready.then(align);
  return {node:desk,board,align};
 }
 root.renderPlatformNetwork=function(c,t){
  const s=t.network,a=c.state.networkAccount,probe=c.state.networkExploration,round=s.history.length,justOperated=operating,wrap=el('div','',c.readout,'platform-network');wrap.dataset.testid='network-board';wrap.dataset.round=String(round);
  if(justOperated&&round===2)workspaceOpen=false;
  if(round){
   const period=a.periods.at(-1),paid=period.payments,result=el('section','',wrap,'network-result');result.dataset.testid='network-result';result.dataset.round=String(round);if(justOperated)result.dataset.running='true';
   el('small',rules[s.rule]+' · 第'+round+'期',result,'network-result-condition');
   el('p',probe?probe.prompt:'这一期，钱去了哪？',result,probe?'network-result-title network-probe-question':'network-result-title');
   const authority=el('div','',result,'network-result-authority');authority.innerHTML=key().repeat(s.rule==='joint'?3:1);el('small',s.rule==='joint'?'原入口：三店共同决定':'原入口：服务商决定',authority);
   el('p','卖出 '+period.sold.reduce((n,x)=>n+x,0)+'件 · 工人收到 '+paid.wages+'枚',result,'network-actual-output');
   const stores=el('div','',result,'network-shop-results'),inspection=el('details','',result,'network-shop-inspection');el('summary','点一家店，看看这期全账',inspection);
   const individual=el('div','',inspection,'network-individual-account');
   names.forEach((name,i)=>{
    const b=el('button','',stores,'network-shop-summary');b.type='button';b.dataset.networkInspect=String(i);b.setAttribute('aria-label','查看'+name+'第'+round+'期实际账目');
    b.dataset.probeFocus=String(probe?.focusShop===i);
    const image=el('img','',b);image.src=[TRUST_ASSETS.bakery.newOven,TRUST_ASSETS.street.clothes,TRUST_ASSETS.street.cars][i];image.alt='';el('span',name,b);
    el('span',period.before[i]+'枚 → '+period.closing[i]+'枚',b,'network-shop-balance');
    b.onclick=function(){
     stores.querySelectorAll('button').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));individual.replaceChildren();inspection.open=true;inspection.firstElementChild.textContent=name+' · 第'+round+'期全账';
     const receipts=a.transfers.filter(p=>p.day===round&&(p.from==='shop-'+i||p.to==='shop-'+i));
     receipts.forEach(p=>{const income=p.to==='shop-'+i,who=p.kind==='sale'?'顾客':p.kind==='wage'?'工人':p.kind==='inputs'?'原料商':p.kind==='migration'?'迁移服务商':p.to==='A'?(s.rule==='joint'?'成员平台':'原服务商'):'备选服务商',row=el('div','',individual,'network-receipt');el('span',who,row);el('span',income?'买产品':p.kind==='wage'?'工资':p.kind==='inputs'?'原料':p.kind==='migration'?'搬资料':'使用费',row);el('span',(income?'＋':'−')+p.amount+'枚',row);});
     if(!receipts.length)el('p','这期没开工，没有发工资、生产或收款。',individual);
     el('p','期初 '+period.before[i]+'枚 · 期末 '+period.closing[i]+'枚',individual,'network-inspection-total');
    };
   });
   // Three arrows, three distinct actual costs. Migration is paid to the
   // supplier, not credited to either platform; maintenance is paid by platforms.
   const flows=el('div','',result,'network-payment-flows');result.insertBefore(flows,inspection);
   const lines=[['access','三家小店','使用费',paid.accessA+paid.accessB,(s.rule==='joint'?'成员平台 ':'原服务商 ')+paid.accessA+'枚\n备选 '+paid.accessB+'枚'],['maintenance','服务商','维护',paid.maintenance,'维护服务商'],['migration','搬走的小店','搬资料',paid.migration,'迁移服务商']];
   lines.forEach(([kind,from,label,amount,to],i)=>{const row=el('div','',flows,'network-flow-line');row.dataset.paymentKind=kind;row.dataset.amount=String(amount);row.dataset.empty=String(amount===0);row.style.setProperty('--flow-delay',i*230+'ms');el('span',from,row,'network-flow-from');const rail=el('div','',row,'network-flow-rail');el('small',label,rail);el('span',amount+'枚',rail,'network-payment-packet');el('span',to,row,'network-flow-to');});
   if(probe?.comparison){
    const next=el('div','',result,'network-probe');result.insertBefore(next,inspection);
    el('p',probe.comparison,next,'network-probe-comparison');
   }
   if(justOperated){result.tabIndex=-1;result.focus({preventScroll:true});result.scrollIntoView({block:'start',behavior:'instant'});}
  }
  const workspace=el('details','',wrap,'network-workspace'),workspaceHeading=el('summary','完整连线 · 重新开局',workspace);workspaceHeading.hidden=round<2;workspace.open=round<2||workspaceOpen;
  let quick=null;
  workspace.ontoggle=function(){if(!workspace.isConnected)return;workspaceOpen=workspace.open;if(quick){quick.node.hidden=workspace.open;quick.align();}root.GestureBoard.cancel();if(workspace.open)alignWires();};
  const hint=el('p',round===0?'先营业一次。':round===1?'拖插头换入口，搬家要付钱。':'换条件，从同一起点重试。',workspace,'network-hint');hint.setAttribute('role','status');
  const pieces=[],targets=[];
  function target(id,node,button,accepts){node.dataset.networkTarget=id;targets.push({id,node,button,accepts});}
  function piece(id,text,parent,cls){const b=el('button',text,parent,cls);b.type='button';b.dataset.networkPiece=id;pieces.push({id,node:b,name:id.startsWith('rule:')?rules[id.slice(5)]+'条件纸':names[Number(id.slice(5))]+'的插头'});return b;}
  const contracts=el('section','',workspace,'network-contracts');
  const papers=el('div','',contracts,'network-papers');Object.keys(rules).forEach(rule=>{const p=piece('rule:'+rule,rules[rule],papers,'network-paper');p.dataset.active=String(rule===s.rule);p.disabled=round===1;});
  const holder=el('section','',contracts,'network-holder'),hb=el('button','本次条件：'+rules[s.rule],holder,'network-destination');hb.type='button';target('contract',holder,hb,id=>id.startsWith('rule:')&&round!==1);el('small',round===1?'本期条件已锁定':round===2?'放入另一张，从相同钱包重试':'拖一张条件纸到这里',holder);
  const board=el('div','',workspace,'network-stage');
  const wires=document.createElementNS('http://www.w3.org/2000/svg','svg');wires.setAttribute('viewBox','0 0 100 100');wires.setAttribute('preserveAspectRatio','none');wires.classList.add('network-wires');wires.setAttribute('aria-hidden','true');
  s.routes.forEach((to,i)=>{if(to===null)return;const p=document.createElementNS(wires.namespaceURI,'path');p.dataset.shop=String(i);p.dataset.endpoint=to;wires.appendChild(p);});board.appendChild(wires);
  const providers={};['A','B'].forEach(to=>{
   const p=el('section','',board,'network-provider provider-'+to);providers[to]=p;
   const b=el('button','',p,'network-destination');b.type='button';b.innerHTML=server();el('span',to==='A'?s.rule==='joint'?'成员平台':'原服务商':'备选服务商',b);el('small',(to==='A'?s.fee:2)+'枚 / 店',b);target(to,p,b,id=>id.startsWith('shop:')&&round===1);
   const authority=el('div','',p,'network-authority');authority.innerHTML=key().repeat(to==='A'&&s.rule==='joint'?3:1);el('small',to==='A'&&s.rule==='joint'?'三店共决':'服务商决定',authority);
   el('span',(to==='A'?a.platform:a.alternative)+'枚',p,'network-provider-cash');
   const ports=el('div','',p,'network-ports');ports.dataset.provider=to;
   for(let i=0;i<3;i++){const socket=el('span','',ports,'network-port');if(s.routes[i]===to){const b=piece('shop:'+i,'',socket,'network-plug');b.innerHTML=plug();el('small',names[i],b);b.disabled=round!==1;}}
  });
  const factories=el('div','',board,'network-factories');names.forEach((name,i)=>{
   const cell=el('section','',factories,'network-factory');cell.dataset.shop=String(i);const image=el('img','',cell);image.src=[TRUST_ASSETS.bakery.newOven,TRUST_ASSETS.street.clothes,TRUST_ASSETS.street.cars][i];image.alt='';
   el('span',name,cell);el('strong',a.shops[i]+'枚',cell);el('small',round===2?s.routes[i]===null?'停了一期': '卖出4件':round===1?'首期卖出4件':'待营业',cell);
  });
  const loose=el('section','',workspace,'network-loose'),lb=el('button','暂时拔掉',loose,'network-destination');lb.type='button';target('unplug',loose,lb,id=>id.startsWith('shop:')&&round===1);const tray=el('div','',loose,'network-loose-plugs');s.routes.forEach((r,i)=>{if(r===null){const p=piece('shop:'+i,'',tray,'network-plug');p.innerHTML=plug();el('small',names[i],p);p.disabled=round!==1;}});el('small','不接入口，这期不生产、不发这期工资。',loose);
  function curve(p,b,ex,ey){const shop=factories.children[Number(p.dataset.shop)].querySelector('img').getBoundingClientRect(),x=shop.left+shop.width/2-b.left,y=shop.top+4-b.top;p.setAttribute('d','M'+x+' '+y+' C'+x+' '+(y-45)+' '+ex+' '+(ey+45)+' '+ex+' '+ey);}
  function alignWires(){if(!board.isConnected||!board.getClientRects().length)return;const b=board.getBoundingClientRect();wires.setAttribute('viewBox','0 0 '+b.width+' '+b.height);wires.querySelectorAll('path:not([data-pulling])').forEach(p=>{const i=Number(p.dataset.shop),port=providers[p.dataset.endpoint].querySelectorAll('.network-port')[i].querySelector('svg').getBoundingClientRect();curve(p,b,port.left+port.width/2-b.left,port.bottom-2-b.top);});}
  function pullCable(id,point){if(!id.startsWith('shop:'))return;const shop=id.slice(5),b=board.getBoundingClientRect();let p=wires.querySelector('path[data-shop="'+shop+'"]');if(!p){p=document.createElementNS(wires.namespaceURI,'path');p.dataset.shop=shop;p.dataset.temporary='true';wires.appendChild(p);}p.dataset.pulling='true';wires.setAttribute('viewBox','0 0 '+b.width+' '+b.height);curve(p,b,point.x-b.left,point.y-b.top);wrap.querySelector('[data-network-piece="'+id+'"]').dataset.cableHeld='true';
   hint.textContent=point.target==='B'?'接到备选入口：搬资料要付'+(s.rule==='locked'?6:1)+'枚。':point.target==='unplug'?'先停用：这一期不生产，也不发工资。':point.target==='A'?'接回原入口。':'拉着插头接到入口；放在空处会收回。';StreetArt.decorateMoney(hint);
  }
  function releaseCable(id){if(!id.startsWith('shop:'))return;const p=wires.querySelector('path[data-shop="'+id.slice(5)+'"]');if(p){if(p.dataset.temporary)p.remove();else p.removeAttribute('data-pulling');}const node=wrap.querySelector('[data-network-piece="'+id+'"]');if(node)node.removeAttribute('data-cable-held');alignWires();}
  root.clearPlatformNetworkGeometry();geometryObserver=new ResizeObserver(alignWires);geometryObserver.observe(board);requestAnimationFrame(alignWires);if(document.fonts)void document.fonts.ready.then(alignWires);
  root.GestureBoard.bind(workspace,{pieces:pieces.filter(p=>!p.node.disabled),targets,hint,ghostClass:'network-ghost',prompt:'拿起插头，再接到入口。',onDragMove:pullCable,onDragEnd:releaseCable,onInspect:to=>{hint.textContent=to==='contract'?'条件纸是假想制度对照，不是拖一下就完成产权转让。':to==='unplug'?'停用也有代价：不生产，少了一期工资。':to==='A'?s.rule==='joint'?'三家共同掌管服务平台，小厂仍分别所有。':'钥匙在服务商手里。': '迁移后使用费2枚；搬资料还要付'+(s.rule==='locked'?6:1)+'枚。';StreetArt.decorateMoney(hint);},onDrop:(id,to)=>{
   focusId=id;if(id.startsWith('rule:'))send(c,{type:'CONDITION',rule:id.slice(5)});else send(c,{type:'CONNECT',shop:Number(id.slice(5)),to:to==='unplug'?null:to});
  }});
  if(round===2){quick=nextWiring(c,s,wrap,workspace);geometryObserver.disconnect();geometryObserver=new ResizeObserver(()=>{alignWires();quick.align();});geometryObserver.observe(board);geometryObserver.observe(quick.board);}
  if(focusId){const node=wrap.querySelector('[data-network-piece="'+focusId+'"]');if(node){node.focus({preventScroll:true});node.dataset.arrived='true';}focusId=null;}
  if(round===0){const fee=el('label','原入口使用费 ',workspace,'network-fee'),input=el('input','',fee);input.type='range';input.min='0';input.max='6';input.step='1';input.value=String(s.fee);input.disabled=s.rule==='joint';input.setAttribute('aria-label','原入口使用费');el('output',s.fee+'枚',fee);input.onchange=()=>send(c,{type:'FEE',fee:Number(input.value)});}
  if(round<2){const run=action(c,round===0?'先营业一期 →':'按连线，再营业 →',{type:'OPERATE',expectedRevision:s.revision},wrap,'primary');run.onclick=()=>{operating=true;send(c,{type:'OPERATE',expectedRevision:s.revision});};}
  if(operating&&round){board.dataset.running='true';}operating=false;
  const past=el('details','',wrap,'network-past-trials');past.hidden=!s.trials.length;el('summary','之前的回执 · '+s.trials.length+'次',past);const trials=el('div','',past,'network-comparisons');(c.state.networkTrials||[]).forEach(p=>{const cell=el('span','',trials);el('small',rules[p.rule]+' · 使用费'+p.fee+'枚 · 搬走'+p.routes.filter(r=>r==='B').length+'店 · 停用'+p.routes.filter(r=>r===null).length+'店',cell);el('strong','三店余额 '+p.shops.join('／')+'枚',cell);el('small','搬资料 '+p.migration+'枚',cell);});
  const book=el('details','',wrap,'street-bounds');el('summary','账本与边界',book);
  el('p','三店各20枚，两服务商各12枚，外部顾客72枚，总计156枚。每家开工工资4枚、原料2枚，四件产品每件2枚。每个实际接入的客户，服务商付1枚维护。没有接入就不开工，不向顾客收费，也不发本期工资。现实不接某个平台仍可能生产，这里只研究这个技术入口。',book);
  el('p','锁定搬资料6枚，可搬或共同平台1枚，付给迁移服务供应者；备选入口使用费2枚。共同平台原入口按维护成本收1枚。切换条件是同一起点的假想规则对照，不是免费的实际产权转让，也没有把三家小厂变成共同所有。',book);
  el('p','店内余额'+a.shops.reduce((n,x)=>n+x,0)+'枚、原平台'+a.platform+'枚、备选'+a.alternative+'枚、工人'+a.workers+'枚、供应者'+a.supplier+'枚、顾客'+a.buyers+'枚，合计'+a.moneyAfter+'枚。',book);
  a.periods.forEach(p=>el('p','第'+p.day+'期：三店使用费 '+p.fees.join(' / ')+'；迁移 '+p.migration.join(' / ')+'；期末 '+p.closing.join(' / ')+'金币。',book));
  el('p','这里外部买家两期都付得起，产品能售完；工资和售价固定。结果展示技术协作、收费分配与控制权，不单凭两轮推出工资必降或宏观危机。下次接线只是草稿，旧回执不改；执行对照从相同的钱包经营两期，不是拿上一组的余额续营。',book);
  if(round===2){action(c,'同样的钱，再试一次 ↺',{type:'RETRY'},c.controls);if(s.trials.length>=2)action(c,'一起生产，谁拿钥匙？ →',{type:'CONCLUDE'},c.controls,'primary');}
 };
})(window);
