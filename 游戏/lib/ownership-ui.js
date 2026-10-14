(function(root){
 'use strict';
 function el(tag,words,parent,cls){var n=document.createElement(tag);n.textContent=words||'';n.className=cls||'';parent.appendChild(n);StreetArt.decorateMoney(n);return n;}
 function button(c,words,action,parent,cls){var b=el('button',words,parent||c.controls,cls||'secondary');b.type='button';b.onclick=function(){c.send({type:'OWNERSHIP',action:action});};return b;}
 function key(){return '<path d="M-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0M9 2l20 11m-6-4-4 6m10-2-4 6"/>';}
 function server(x,y){return '<g transform="translate('+x+' '+y+')"><path d="M-32-30h64v60h-64ZM-32-10h64m-64 20h64M-23-20h4m-4 20h4m-4 20h4M-8-20h30M-8 0h30M-8 20h30"/></g>';}
 function peep(income){var b=TRUST_ASSETS.bakery;function crop(url,atlas,name){var f=atlas.frames[name].frame;return '<svg viewBox="'+f.x+' '+f.y+' '+f.w+' '+f.h+'" aria-hidden="true"><image href="'+url+'" width="'+atlas.meta.size.w+'" height="'+atlas.meta.size.h+'"/></svg>';}
  return '<span class="technology-peep">'+crop(b.body,b.bodyAtlas,'body0000')+crop(income>=4?b.face:b.nervous,income>=4?b.faceAtlas:b.nervousAtlas,income>=4?'face0000':Object.keys(b.nervousAtlas.frames)[0])+'</span>';
 }
 function report(c,t){var d=el('details','',c.readout,'technology-report');d.dataset.testid='ownership-report';el('summary','现实研究与来源',d);
  var full=el('div','',d,'technology-report-body');root.ResearchReader.mount(full,c.state.ownershipReports[t.branch],{sources:c.state.ownershipEvidence.sources.filter(function(s){return s.branch===t.branch;})});
 }
 function platform(c,t,a){
  var modes=el('div','',c.readout,'ownership-modes');['locked','portable','joint'].forEach(function(mode,i){var b=button(c,{locked:'资料锁定',portable:'可以搬走',joint:'共同平台'}[mode],{type:'PLATFORM_MODE',mode:mode},modes,'choice');b.dataset.ownershipMode=mode;b.setAttribute('aria-pressed',String(mode===t.platformMode));if(t.seen&(1<<i))b.dataset.observed='true';});
  var fee=el('div','',c.readout,'ownership-fee');el('span','每家每期使用费',fee);var minus=button(c,'−',{type:'FEE',delta:-1},fee,'step');minus.setAttribute('aria-label','减少平台使用费');minus.disabled=t.platformMode==='joint'||t.fee===0;el('output',a.fee+'枚',fee);var plus=button(c,'＋',{type:'FEE',delta:1},fee,'step');plus.setAttribute('aria-label','增加平台使用费');plus.disabled=t.platformMode==='joint'||t.fee===6;
  var board=el('div','',c.readout,'ownership-platform-board');board.dataset.testid='platform-result';board.dataset.round=t.round;board.dataset.mode=t.platformMode;board.dataset.layer='cooperation';
  var switched=t.round===2,svg='<svg viewBox="0 0 480 235" fill="none" stroke="#626262" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  svg+='<g class="ownership-links"><path class="ownership-old-link" d="M80 170Q65 85 235 55"'+(switched?' opacity=".15"':'')+'/><path d="M240 170V65m160 105Q400 85 265 55"/><path class="ownership-new-link" d="M80 170Q300 140 417 52" opacity="'+(switched?1:0)+'"/></g>';
  svg+=(t.platformMode==='joint'?[80,240,400].map(function(x){return '<g class="ownership-key" transform="translate('+x+' 135)">'+key()+'</g>';}).join(''):'<g class="ownership-key" transform="translate(265 85)">'+key()+'</g>')+server(245,36)+server(422,36);
  [80,240,400].forEach(function(x,i){svg+='<image href="'+[TRUST_ASSETS.bakery.newOven,TRUST_ASSETS.street.clothes,TRUST_ASSETS.street.cars][i]+'" x="'+(x-40)+'" y="155" width="80" height="70"/>';});svg+='</svg>';board.innerHTML=svg;
  var labels=el('div','',board,'ownership-platform-labels');el('span',t.platformMode==='joint'?'共同平台':'原服务商',labels);el('span','备选服务商',labels);
  var accounts=el('div','',c.readout,'ownership-shop-cash');a.shops.forEach(function(cash,i){var box=el('div','',accounts);el('span',['面包厂','服装厂','车厂'][i],box);el('strong',cash+'枚',box);});
  var layers=el('div','',c.readout,'ownership-layers');['cooperation','control'].forEach(function(layer){var b=el('button',layer==='cooperation'?'看协作':'看决定权',layers,'secondary');b.type='button';b.setAttribute('aria-pressed',String(layer==='cooperation'));b.onclick=function(){board.dataset.layer=layer;layers.querySelectorAll('button').forEach(function(n){n.setAttribute('aria-pressed',String(n===b));});hint.textContent=layer==='cooperation'?'三家共用技术入口':a.control;};});
  var hint=el('p','三家共用技术入口',c.readout,'small');
  if(t.round)el('p',t.round===1?'“换家服务商，容易吗？”':'迁移花了'+a.migration+'枚。',c.readout,'relief-caption');
  if(t.round<2)button(c,t.round===0?'用技术，营业一期 →':'把第一家搬走，再营业 →',{type:'OPERATE',expectedRound:t.round},null,'primary');
  var book=el('details','',c.readout,'street-bounds');el('summary','这两期的钱，怎么算？',book);
  el('p','同一开局：三店各20枚，两家服务商各12枚，外部顾客72枚。每店每期工资4枚、原料2枚，卖4件，每件2枚。服务商每个客户维护1枚。',book);
  el('p','原服务商'+a.platform+'枚，备选'+a.alternative+'枚；工人'+a.workers+'枚，原料、维护及迁移服务'+a.supplier+'枚，顾客'+a.buyers+'枚。合计'+a.moneyAfter+'枚。',book);
  el('p','迁移费：锁定6枚，可搬或共同平台1枚；新服务商使用费2枚。共同平台按维护成本每店收1枚，不是免费技术。原平台成员减少，维护费也减少。',book);
  el('p','外部买家在这两期付得起，产品全部卖出；没有假设收费自动导致降薪。共同平台不等于三家小厂也共同所有。改变收费会重置所有对照。',book);
 }
 function sharing(c,t,a){
  var modes=el('div','',c.readout,'ownership-modes');['bonus','minority','coop'].forEach(function(mode,i){var b=button(c,{bonus:'发奖金',minority:'少数持股',coop:'共同经营'}[mode],{type:'SHARE_MODE',mode:mode},modes,'choice');b.dataset.ownershipMode=mode;b.setAttribute('aria-pressed',String(mode===t.shareMode));if(t.seen&(1<<i))b.dataset.observed='true';});
  var initial=el('div','',c.readout,'ownership-share-start');initial.innerHTML=StreetArt.icon('cash');el('p','工资、耗材已付。先分12枚，余下12枚由谁决定？',initial);
  var ballots=el('div','',c.readout,'ownership-ballot-choices');['divide','invest'].forEach(function(ballot){var b=button(c,ballot==='divide'?'我投：分给大家':'我投：添一台机器',{type:'BALLOT',ballot:ballot},ballots,'choice');b.dataset.ballot=ballot;b.setAttribute('aria-pressed',String(t.ballot===ballot));});
  button(c,'按这套规则，表决 →',{type:'VOTE'},c.readout,'primary');
  if(a){
   var result=el('div','',c.readout,'ownership-vote-result');result.dataset.testid='sharing-result';result.dataset.mode=a.mode;result.dataset.outcome=a.outcome;
   var people=el('div','',result,'ownership-people');a.people.forEach(function(p,i){var cell=el('div','',people,'ownership-person');cell.dataset.player=String(i===5);cell.innerHTML=peep(p.income);el('span',i===5?'你':'工人',cell);el('strong',p.votes+'票',cell);el('span',p.income+'枚',cell);cell.title=(p.ballot==='divide'?'想分给大家':'想添机器')+'；工资加分配，不代表手中股份价值';});
   el('p',a.ownerVotes?'老板 '+a.ownerVotes+'票 · 投添机器':'没有外部老板票 · 六名成员各一票',result,'ownership-owner-votes');
   el('p','分给大家 '+a.divideVotes+'票 ／ 添机器 '+a.investVotes+'票',result,'relief-caption');
   el('p',{divide:'“通过了，这12枚分给大家。”',invest:'“通过了，12枚付给设备厂。”',hold:'“三比三。先留着钱，再商量。”'}[a.outcome],result,'ownership-voice');
   if(a.mode!==t.shareMode||a.ballot!==t.ballot)el('p','显示的是上次表决；新选择还没执行。',result,'small');
   var ledger=el('details','',c.readout,'street-bounds');el('summary','收入和票权，分开看',ledger);
   el('p','企业开局40枚，顾客48枚。卖12件收48枚，工资12枚、耗材12枚，现金收支差24枚；未计旧机器折旧，不是完整净利润。',ledger);
   el('p','第一笔：工人'+a.firstWorkers+'枚，老板'+a.firstOwner+'枚。余下：分给工人'+a.extraWorkers+'枚，买设备'+a.equipment+'枚。企业剩'+a.firm+'枚，工资加分配'+a.workers+'枚。全部账户合计'+a.moneyAfter+'枚。',ledger);
   el('p','六名工人中三人想分红、两人想投资，你是第六人。奖金规则没有工人票；少数权益规则老板7票、工人各1票；共同经营各成员1票。平票暂缓，不默认投资或分红。',ledger);
   el('p','三个独立的假想章程，不是现实公司的复制，也没有模拟所有权转让。第一笔收入相同，后续权利仍可不同；共同经营也可选择投资。',ledger);
  }else el('p','你是第六名工人。想要，不一定能拍板。',c.readout,'small');
 }
 root.renderOwnershipExperiment=function(c){if(root.clearPlatformNetworkGeometry)root.clearPlatformNetworkGeometry();var t=c.state.prologue.ownershipTechnology,a=c.state.ownershipAccount,isPlatform=t.branch==='concentration';
  c.title(isPlatform?'大家接上了。谁拿着钥匙？':t.council?.step==='production'?'机器替谁省时间？':'分了钱，就能作决定吗？','');
  if(t.phase==='intro'){
   var intro=el('div','',c.readout,'ownership-intro');intro.innerHTML='<svg viewBox="0 0 100 75" fill="none" stroke="#626262" stroke-width="3" stroke-linecap="round">'+(isPlatform?server(40,34):'<g transform="translate(25 30)">'+key()+'</g>')+'</svg>';
   el('p',isPlatform?'三家共用一个平台。钥匙在谁手里？':'老板说“都有份”。拍板也有你的份吗？',c.readout,'relief-caption');button(c,isPlatform?'先接上技术 →':'看看这笔钱 →',isPlatform?{type:'NETWORK',action:{type:'BEGIN'}}:{type:'COUNCIL',action:{type:'BEGIN'}},null,'primary');
  }else if(t.phase==='lab'){
   if(t.network)root.renderPlatformNetwork(c,t);else if(t.council)root.renderSharingCouncil(c,t);else if(isPlatform){platform(c,t,a);button(c,'换成亲手连线 ↺',{type:'RESTART'});}else{sharing(c,t,a);button(c,'换成钱袋与票箱 ↺',{type:'RESTART'});}
   var count=[0,1,2].filter(function(i){return t.seen&(1<<i);}).length;if(!t.network&&!t.council)el('p','已试 '+count+' / 3',c.readout,'small');
   if(t.seen===7&&(isPlatform?t.round===2:!!t.run))button(c,'这些结果说明什么？ →',{type:'CONCLUDE'},null,'primary');
  }else{
   var end=el('div','',c.readout,'ownership-conclusion');el('p',isPlatform?'能一起生产，不等于都拿着钥匙。':t.council?.productionEnabled?'收入共享，不等于决定权相同；机器省下的时间，也要有人决定留给谁。':'收入共享，不等于决定权相同。',end,'relief-caption');
   var limits=el('details','',end,'street-bounds');el('summary','这能说明什么？',limits);
   el('p',isPlatform?'资料能否迁移、平台由谁控制，会影响谁得到协作收益。':'奖金和分红改善收入；谁决定下一笔钱，仍取决于产权与票权。',limits);
   if(t.council?.productionEnabled)el('p','三班对照把工资、实际购买、剩货与带薪休息分开记录。同一台快炉可以继续扩产，也可以少开工并保工资；少排班却不保工资，则可能让有需要的人买不起。结果取决于具体钱包、产能与安排，不把某种章程写成必胜答案。',limits);
   el('p','单家企业的改变不等于全社会产权已改变；社会主义国家也不能套用同一资本主义基本矛盾。',limits);
   if(t.network||t.council){
    var reset=el('details','',limits,'experiment-reset');el('summary','清空记录，重新开局',reset);el('p','只清空这条分支的安排和回执，其他分支不动。',reset);button(c,'清空本分支，重新开局',{type:'RESTART'},reset);
    button(c,isPlatform?'保留回执，再接一次 ↺':'保留回执，重新分配 ↺',{type:isPlatform?'NETWORK':'COUNCIL',action:{type:'RETRY'}});
   }else button(c,'重新试试 ↺',{type:'RESTART'});
  }
  if(t.phase!=='intro'&&t.phase!=='lab')report(c,t);var back=el('button','回到假设目录 ↩',c.controls,'secondary');back.type='button';back.onclick=function(){c.send({type:'BACK_ASSUMPTIONS'});};
 };
})(window);
