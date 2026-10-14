(function(root){
 'use strict';
 function el(tag,words,parent,cls){var n=document.createElement(tag);n.textContent=words||'';n.className=cls||'';parent.appendChild(n);StreetArt.decorateMoney(n);return n;}
 function button(c,words,action,parent,cls){var b=el('button',words,parent||c.controls,cls||'secondary');b.type='button';b.onclick=function(){if(action.type==='DEMAND'&&['RETRY','SHARED_BEGIN'].includes(action.action.type)&&root.resetPublicDemandPresentation)root.resetPublicDemandPresentation();c.send({type:'RULES',action:action});};return b;}
 function peep(happy){var b=TRUST_ASSETS.bakery;function crop(url,atlas,name){var f=atlas.frames[name].frame;return '<svg viewBox="'+f.x+' '+f.y+' '+f.w+' '+f.h+'" aria-hidden="true"><image href="'+url+'" width="'+atlas.meta.size.w+'" height="'+atlas.meta.size.h+'"/></svg>';}
  return '<span class="technology-peep">'+crop(b.body,b.bodyAtlas,'body0000')+crop(happy?b.face:b.nervous,happy?b.faceAtlas:b.nervousAtlas,happy?'face0000':Object.keys(b.nervousAtlas.frames)[0])+'</span>';
 }
 function fridge(){return '<svg viewBox="0 0 80 100" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M15 7q25-4 50 0v82H15ZM15 38h50M54 17v10m0 23v12M22 89v6m36-6v6M34 55v21m-9-10h18m-16-8 14 16m-14 0 14-16"/></svg>';}
 function book(c,t,a){var b=el('details','',c.readout,'street-bounds');el('summary','钱和剩货，怎么算？',b);
  if(t.branch==='policy'){
   el('p','六个人，各有2枚，每期生产再领1枚工资。每人想要2个面包，售价2枚；工厂每期生产12个，付工资6枚、原料6枚。现有库存不额外收费或过期，只观察两期。',b);
   el('p','工厂40枚，公共预算32枚，贷款方40枚，其他雇主24枚，个人合计12枚。总金币148枚；借款从贷款方已有现金转出，不是央行或银行创造货币。',b);
   el('p','公共采购每期最多6个，按需分给这六个人补足所需，不重复算成私人购买。持续增收由其他雇主每期支付每人2枚；没有免费增加收入。',b);
   el('p','借款每人2枚，下期归还本金2枚、利息1枚，付不起的保留为欠款。额外收入调节只在借款第二期支付，来自其他雇主24枚，不代表债务必然违约。',b);
   el('p','现在：工厂'+a.firm+'枚，公共预算'+a.publicFund+'枚，贷款方'+a.lender+'枚，其他雇主'+a.employer+'枚，原料商'+a.supplier+'枚，个人合计'+a.wallets.reduce(function(x,y){return x+y;},0)+'枚。总金币'+a.moneyAfter+'枚；欠款'+a.debt+'枚是债权，不再加进现金。',b);
  }else{
   el('p','独立对照：工厂50枚，六个顾客各2枚。每期做12个，付工资6枚进入这些顾客钱包；每人最多想买2个。普通原料12枚，省料工艺3枚。教学参数，不是面包店的现实成本比例。',b);
   el('p','省料设备、冷柜各花6枚，付给设备商。普通面包在下一期开始前坏掉；冷柜可保存过夜，有剩货的当期付电费与仓储2枚。不因降价自动加产，不自动转化库存为现金。',b);
   el('p','现在工厂'+a.firm+'枚，原料仓储商'+a.supplier+'枚，设备商'+a.equipment+'枚，顾客合计'+a.wallets.reduce(function(x,y){return x+y;},0)+'枚，共'+a.moneyAfter+'枚。经营收支未计旧设备折旧和税，不称完整净利润。',b);
  }
  el('p','换规则会从同一开局重算；新设定要重新走完四组。只能说明这两期和这些条件，不证明永久有效或必然崩溃。',b);
 }
 root.renderMarketRules=function(c){var t=c.state.prologue.marketRules,a=c.state.rulesAccount,policy=t.branch==='policy';
  c.title(policy?(c.state.demandExploration?c.state.demandExploration.name+'的两天':t.demand&&!t.demand.sharedBudget?'谁来买走剩下的面包？':'食堂的钱，买面包还是买机器？'):c.state.preservationExploration?'两天的面包':!t.workbench||t.workbench.flexibleBake?'剩下的面包，留到明天？':'便宜一点，就能卖掉吗？','');
  if(t.phase==='intro'){
   var intro=el('div','',c.readout,'rules-intro');intro.innerHTML=policy?StreetArt.icon('cash'):fridge();el('p',policy?'一笔预算。先喂饱人，还是先喂饱炉子？':'冷柜能救面包。能救生意吗？',c.readout,'relief-caption');button(c,'开门试试 →',policy?{type:'DEMAND',action:{type:'BEGIN'}}:{type:'PRESERVATION',action:{type:'BEGIN'}},null,'primary');
  }else if(t.phase==='lab'){
   if(t.demand){root.renderPublicDemand(c,t);var backDemand=el('button','回到假设目录 ↩',c.controls,'secondary');backDemand.type='button';backDemand.onclick=function(){c.send({type:'BACK_ASSUMPTIONS'});};return;}
   if(t.workbench){root.renderPreservationWorkbench(c,t);var backWorkbench=el('button','回到假设目录 ↩',c.controls,'secondary');backWorkbench.type='button';backWorkbench.onclick=function(){c.send({type:'BACK_ASSUMPTIONS'});};return;}
   if(policy)button(c,'换成订单与欠条 ↺',{type:'RESTART'},c.controls);
   else button(c,'换成两天的工作台 ↺',{type:'RESTART'},c.controls);
   var modes=el('div','',c.readout,'rules-modes'),names=policy?{alone:'照常营业',public:'公共购买',loan:'先借钱买',income:'持续增收'}:{ordinary:'普通工艺',efficient:'省料工艺',cold:'只加冷柜',both:'省料＋冷柜'};
   Object.keys(names).forEach(function(mode,i){var b=button(c,names[mode],{type:'MODE',mode:mode},modes,'choice');b.dataset.rulesMode=mode;b.setAttribute('aria-pressed',String(mode===(policy?t.policyMode:t.priceMode)));if(t.seen&(1<<i))b.dataset.observed='true';});
   var knob=el('div','',c.readout,'rules-knob');el('span',policy?'借款下期额外收入／人':'每个面包售价',knob);var value=policy?t.income:t.price,type=policy?'INCOME':'PRICE';var minus=button(c,'−',{type:type,delta:-1},knob,'step');minus.setAttribute('aria-label',policy?'减少下期额外收入':'减少面包售价');minus.disabled=value===(policy?0:1);el('output',value+'枚',knob);var plus=button(c,'＋',{type:type,delta:1},knob,'step');plus.setAttribute('aria-label',policy?'增加下期额外收入':'增加面包售价');plus.disabled=value===(policy?4:3);
   var last=t.round?a.periods[t.round-1]:null;
   var scene=el('div','',c.readout,'rules-scene');scene.dataset.round=String(t.round);
   var shop=el('div','',scene,'rules-shop');var img=el('img','',shop);img.src=TRUST_ASSETS.bakery.newOven;img.alt='面包烤炉';el('span','厂里 '+a.firm+'枚',shop);var stock=el('div','',shop,'rules-stock');for(var j=0;j<a.stock;j++){var bread=el('img','',stock);bread.src=TRUST_ASSETS.bakery.bread;bread.alt='待售面包';}el('strong','剩货 '+a.stock+'个',shop);
   var people=el('div','',scene,'rules-people');a.wallets.forEach(function(w,i){var p=el('div','',people,'rules-person');var bought=last?last.purchases[i]:0,provided=policy&&last&&last.publicSold?1:0;p.innerHTML=peep(bought+provided>=2);el('span',w+'枚',p);el('span',last?'买了'+bought+(provided?'，领了1':''):'想买2个',p);p.dataset.satisfied=String(bought+provided>=2);});
   if(policy){var funding=el('div','',c.readout,'rules-funders');[['公共预算',a.publicFund],['贷款方',a.lender],['其他雇主',a.employer]].forEach(function(pair){var n=el('div','',funding);el('span',pair[0],n);el('strong',pair[1]+'枚',n);});}
   else{var tools=el('div','',c.readout,'rules-tools');if(t.priceMode==='cold'||t.priceMode==='both')tools.innerHTML=fridge();el('span','已坏掉 '+a.spoiled+'个',tools);}
   el('p',last?'第'+t.round+'期 · 卖出'+last.sold+' · 现金变化'+(last.operatingCash>0?'+':'')+last.operatingCash+'枚。':'',c.readout,'relief-caption').dataset.testid='rules-result';
   if(last&&policy&&t.policyMode==='loan'){el('p',t.round===1?'下期每人要还3枚。':a.debt?'还欠'+a.debt+'枚。':'欠款还清了。',c.readout,'small').dataset.testid='rules-debt';if(t.round===2)el('p',a.debt?'“先还钱，今天的面包又得省了。”':'“收入跟得上，这次按时还了。”',c.readout,'rules-voice');}
   if(last&&!policy&&t.priceMode==='cold')el('p','“没坏掉，不等于卖掉了。”',c.readout,'rules-voice');
   if(t.round<2)button(c,t.round===0?'营业一期 →':'再过一期 →',{type:'OPERATE',expectedRound:t.round},null,'primary');
   var count=[0,1,2,3].filter(function(i){return t.seen&(1<<i);}).length;el('p','已试 '+count+' / 4',c.readout,'small');if(t.seen===15&&t.round===2)button(c,'这些结果说明什么？ →',{type:'CONCLUDE'},null,'primary');book(c,t,a);
  }else{
   var end=el('div','',c.readout,'rules-conclusion');el('p',policy?(t.demand&&t.demand.sharedBudget?'同一笔公共钱，可以喂饱人，也可以添大私人的炉子。':'谁出钱，会改变结果。'):'卖得更多、损失更少、赚到更多，不是一回事。',end,'relief-caption');
   var limits=el('details','',end,'street-bounds');el('summary','这能说明什么？',limits);
   el('p',policy?'公共购买与持续收入能形成订单；借款还要有后续收入偿还。':'降价可能多卖，也可能亏钱；省料降低成本，冷柜却不增加购买力。',limits);
   el('p','改善不自动改变生产资料的占有；风险转给家庭可能加剧压力。社会主义国家的政策须按不同制度背景分析。',limits);
   if(policy&&t.demand&&!t.demand.sharedBudget)button(c,'试试同一笔公共预算 ↺',{type:'DEMAND',action:{type:'SHARED_BEGIN'}},c.controls,'primary');
   else if(!policy&&t.workbench&&!t.workbench.flexibleBake)button(c,'试试先卖昨天的面包 ↺',{type:'PRESERVATION',action:{type:'PLANNED_BEGIN'}},c.controls,'primary');
   else if(policy&&t.demand)button(c,'同样的钱，再换个安排 ↺',{type:'DEMAND',action:{type:'RETRY'}});
   else if(!policy&&t.workbench)button(c,'同样的钱，再换个安排 ↺',{type:'PRESERVATION',action:{type:'RETRY'}});
   else button(c,'再换条件 ↺',{type:'RESTART'});
  }
  if(t.phase!=='intro'&&t.phase!=='lab'){
   var report=el('details','',c.readout,'technology-report');report.dataset.testid='rules-report';el('summary','现实研究与来源',report);var full=el('div','',report,'technology-report-body');root.ResearchReader.mount(full,c.state.rulesReports[t.branch],{sources:c.state.rulesEvidence.sources.filter(function(s){return s.branch===t.branch;})});
  }
  var back=el('button','回到假设目录 ↩',c.controls,'secondary');back.type='button';back.onclick=function(){c.send({type:'BACK_ASSUMPTIONS'});};
 };
})(window);
