(function(root){
 'use strict';
 function el(tag,words,parent,cls){var n=document.createElement(tag);n.textContent=words||'';n.className=cls||'';parent.appendChild(n);StreetArt.decorateMoney(n);return n;}
 function button(c,words,action,parent,cls){var b=el('button',words,parent||c.controls,cls||'secondary');b.type='button';b.onclick=function(){c.send({type:'NEEDS',action:action});};return b;}
 var spaceNames={wish:'愿望很大，订单很小',contract:'签下整座基地',renew:'建完，再签维护'};
 var careNames={selfpay:'自己付钱',assist:'只加新工具',cover:'有人代付',both:'代付、培训和工具'};
 function icon(kind){return '<svg viewBox="0 0 240 160" fill="none" stroke="#626262" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(kind==='space'?'<path d="M12 140q45-10 85 0t130-4M65 135V90q30-54 63 0v45M66 91h62M79 108h13v27h-13m23-27h13v27h-13M138 135V85h30v50m-28-40h26m-26 14h26M173 135l8-24h37l-7 24m-35-12h37m-13-12-5 24M190 100V60m-4 0h9M28 62l7-24 6 24m-12-9h10M150 37h5m-3-3v6"/>':'<path d="M35 135V65q0-20 20-20h128q20 0 20 20v70M25 136h187M92 44V27h54v17M108 20v22m-11-11h22M55 92h52v30H55Zm6-13h14m52 24h57m-20-22v49m-33-65h51M58 53h20m83 0h21M43 119h7"/>')+'</svg>';}
 function people(a){var b=TRUST_ASSETS.bakery;function crop(url,atlas,key){var f=atlas.frames[key].frame;return '<svg viewBox="'+f.x+' '+f.y+' '+f.w+' '+f.h+'" aria-hidden="true"><image href="'+url+'" width="'+atlas.meta.size.w+'" height="'+atlas.meta.size.h+'"/></svg>';}
  return '<span class="technology-peep">'+crop(b.body,b.bodyAtlas,'body0000')+crop(a.served?b.face:b.nervous,a.served?b.faceAtlas:b.nervousAtlas,a.served?'face0000':Object.keys(b.nervousAtlas.frames)[0])+'</span>';
 }
 function report(c,t){var d=el('details','',c.readout,'technology-report');d.dataset.testid='needs-report';el('summary','现实研究与来源',d);
  var full=el('div','',d,'technology-report-body');root.ResearchReader.mount(full,c.state.needsReports[t.branch],{sources:c.state.needsEvidence.sources.filter(function(s){return s.branch===t.branch;})});
 }
 root.renderNeedsExperiment=function(c){var t=c.state.prologue.needsTechnology,a=c.state.needsAccount,isSpace=t.branch==='space';
  c.title(isSpace?'如果要建一座太空城市？':'如果缺的不是面包，而是照护？','');
  if(t.phase==='intro'){
   var intro=el('div','',c.readout,'needs-intro');intro.innerHTML=icon(t.branch);
   el('p',isSpace?'太空城要开工了！先看看，谁来下单？':'小5需要照护，却付不起。帮他付钱，能轮到吗？',c.readout,'relief-caption');button(c,isSpace?'准备第一批材料 →':'安排这一期 →',isSpace?{type:'FREIGHT',action:{type:'BEGIN'}}:{type:'CARE',action:{type:'BEGIN'}},null,'primary');
  }else if(t.freight){
   root.renderSpaceFreight(c,t);
  }else if(t.care){
   root.renderCareRouting(c,t);
  }else if(t.phase==='lab'){
   var choices=el('div','',c.readout,'needs-modes');
   (isSpace?['wish','contract','renew']:['selfpay','assist','cover','both']).forEach(function(mode,i){var b=button(c,(isSpace?spaceNames:careNames)[mode],{type:isSpace?'SPACE_MODE':'CARE_MODE',mode:mode},choices,'choice');b.dataset.needsMode=mode;b.setAttribute('aria-pressed',String(mode===(isSpace?t.spaceMode:t.careMode)));if(t.seen&(1<<i))b.dataset.observed='true';});
   if(isSpace){
    var speed=el('div','',c.readout,'needs-capacity');el('span','每期最多做',speed);[2,4,6].forEach(function(cap){var b=button(c,cap+'组',{type:'CAPACITY',capacity:cap},speed);b.dataset.capacity=cap;b.setAttribute('aria-pressed',String(t.capacity===cap));});
    var scene=el('div','',c.readout,'needs-space-board');scene.dataset.testid='space-result';scene.dataset.round=t.round;scene.dataset.mode=t.spaceMode;
    var factory=el('div','',scene,'needs-factory');factory.innerHTML='<svg viewBox="0 0 240 160" aria-hidden="true" fill="none" stroke="#626262" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 137V70l40-25v25l40-25v25l40-25v92H15Zm118 0h75V65h-20V30h-20v35h-35M25 102h19v24H25Zm37-21h18v19H62Zm36 0h18v19H98Zm48 9h48v36h-48M164 24q-10-15 4-20m22 20q12-10 0-20"/><path d="M19 146h197"/></svg>';el('span','材料厂',factory);el('strong','待售 '+a.stock+'组',factory);
    var crates=el('div','',factory,'needs-crates');crates.setAttribute('aria-hidden','true');for(var k=0;k<a.stock;k++){var crate=el('i','',crates);crate.style.setProperty('--crate-delay',k*25+'ms');}
    var flight=el('div','',scene,'needs-flight');flight.innerHTML='<svg viewBox="0 0 80 100" aria-hidden="true" fill="white" stroke="#626262" stroke-width="3"><path d="M40 8Q18 25 23 63h34Q62 25 40 8Zm-17 37L9 70l14-7m34-18 14 25-14-7M30 70l10 20 10-20"/><circle cx="40" cy="35" r="9"/></svg>';flight.dataset.flying=String(t.round>0&&a.periods[t.round-1].sold>0);
    var site=el('div','',scene,'needs-site');site.innerHTML=icon('space');site.querySelector('svg').style.opacity=a.delivered===0?'.25':String(Math.min(1,.35+a.delivered/18));el('span','到货 '+a.delivered+'组',site);el('strong','还需要 '+a.need+'组',site);
    var last=t.round?a.periods[t.round-1]:null;
    el('p',last?'第'+t.round+'期 · 做出'+last.produced+' · 卖出'+last.sold:'每组售价4枚',c.readout,'relief-caption');
    el('p',t.spaceMode==='wish'?'“想建一座城，这次却只订了四组。”':last&&last.newOrder?'“建完了。维护订单也签好了。”':a.need===0?'“基地建完了，下一批材料卖给谁？”':'“先按合同，一批一批交货。”',c.readout,'needs-voice');
    if(t.round<3)button(c,'生产并交货 · 第'+(t.round+1)+'期 →',{type:'SHIP',expectedRound:t.round},null,'primary');
    var book=el('details','',c.readout,'street-bounds');el('summary','付款与库存，怎么算？',book);
    el('p','同一开局：工厂60枚，买方96枚。每组付工资2枚、原料1枚。未售材料留在库存；没有自动变成收入。',book);
    el('p','现在：工厂'+a.firm+'枚，买方'+a.buyer+'枚，工人'+a.workers+'枚，供应商'+a.supplier+'枚。合计'+a.moneyAfter+'枚。订单只是允许花的钱，不是新造的钱。',book);
    a.periods.forEach(function(p){el('p','第'+p.day+'期：工资'+p.wages+'枚，原料'+p.inputs+'枚，收款'+p.receipts+'枚；现金变动'+(p.cashChange>=0?'＋':'')+p.cashChange+'枚。',book);});
    el('p','三期独立实验，不继承面包店的钱；没有模拟发射失败、税收或融资。组是综合建设材料，不是真实吨位。调产能会重置这组比较。',book);
   }else{
    button(c,'按这个安排，服务一天 →',{type:'CARE_RUN'},c.readout,'primary');
    if(!a)el('p','每种安排从同一起点重试。',c.readout,'small');
    else{var board=el('div','',c.readout,'needs-care-board');board.dataset.testid='care-result';board.dataset.mode=a.mode;
     var building=el('div','',board,'needs-care-station');building.innerHTML=icon('services');el('strong',a.staff+'位工作人员',building);el('span','最多服务 '+a.capacity+'人',building);
     var queue=el('div','',board,'needs-care-people');a.people.forEach(function(p){var cell=el('div','',queue,'needs-care-person');cell.dataset.served=p.served;cell.innerHTML=people(p);cell.title=(p.served?'已得到服务':p.affordable?'能付款，但还在排队':'需要服务，但付不起')+'；原有钱包'+p.wallet+'金币';el('span',p.served?'用上了':p.affordable?'还在等':'钱不够',cell);});
     el('p',{selfpay:'“不是不需要，是我付不起。”',assist:'“工具空着，我的钱包也空着。”',cover:'“这次有人付款，可还是轮不到我。”',both:'“钱、人手和工具一起到位，今天都用上了。”'}[a.mode],c.readout,'needs-voice');
     var ledger=el('details','',c.readout,'street-bounds');el('summary','这一天的钱与人手',ledger);
     el('p','同一开局：家庭24枚、照护站20枚、公共购买账户24枚。十二人各要一次服务，售价2枚。四个家庭各有4枚，八个各有1枚。',ledger);
     el('p','工资'+a.wages+'枚，耗材'+a.inputs+'枚，工具设置'+a.setup+'枚，培训'+a.training+'枚；收款'+a.receipts+'枚。照护站剩'+a.firm+'枚，公共账户剩'+a.publicFunds+'枚。总金币仍为'+a.moneyAfter+'枚。',ledger);
     el('p','四位已有工作人员，两位原先能上岗。工具假设让每位从服务2人变为3人；培训被压缩为一个按钮，不代表现实能瞬间取得资格。未得到的服务不能存入仓库。',ledger);
    }
   }
   var count=Array.from({length:isSpace?3:4},function(_,i){return !!(t.seen&(1<<i));}).filter(Boolean).length;
   el('p','已试 '+count+' / '+(isSpace?3:4),c.readout,'small');
   if(isSpace)button(c,'换成装船玩法 ↺',{type:'RESTART'});
   else button(c,'换成照护排班 ↺',{type:'RESTART'});
   if(isSpace?t.seen===7&&t.round===3:t.seen===15)button(c,'这些结果说明什么？ →',{type:'CONCLUDE'},null,'primary');
  }else{
   var end=el('div','',c.readout,'needs-conclusion');
   el('p',isSpace?'需要很大，不等于订单无限。':'货有剩余，人也可能仍得不到服务。',end,'relief-caption');
   var limits=el('details','',end,'street-bounds');el('summary','这能说明什么？',limits);
   el('p',isSpace?'付得起、接得上的订单可以缓解积压；扩产比订单快，也可能多剩货。':'工具、付款与受训人手缺一项，都可能有人用不上服务。',limits);
   el('p','这类改善不自动改变产权。社会主义国家也有预算与协调难题，但不能直接套用资本主义基本矛盾。',limits);button(c,'重新试试 ↺',{type:'RESTART'});
  }
  if(t.phase!=='intro'&&t.phase!=='lab')report(c,t);var back=el('button','回到假设目录 ↩',c.controls,'secondary');back.type='button';back.onclick=function(){c.send({type:'BACK_ASSUMPTIONS'});};
 };
})(window);
