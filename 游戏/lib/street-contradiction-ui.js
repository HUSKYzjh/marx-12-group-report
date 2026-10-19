(function(root){
 'use strict';
 var names={bakery:'本店',rival:'邻店',clothes:'服装厂',cars:'汽车厂',ovens:'烤炉厂',inputs:'原料商'};
 function el(tag,text,parent,cls){var n=document.createElement(tag);n.textContent=text||'';n.className=cls||'';parent.appendChild(n);return n;}
 function signed(n){return (n>=0?'+':'')+n;}
 function evidence(c,parent){
  var e=c.evidence,a=e&&e.actual;if(!a)return;
  var card=el('section','',parent,'street-evidence');card.dataset.testid='street-evidence';
  el('p','面包：出炉 '+a.produced+' → 卖出 '+a.sold+' → 剩 '+a.breadStock+' 个',card,'street-bread-flow');
  var row=el('div','',card,'street-evidence-grid');
  [['本店实付工资',a.ownWages+' 枚'],['本店资金变化',signed(a.ownCashChange)+' 枚'],['全街实付工资',a.wageTotal+' 枚']].forEach(function(v){var cell=el('div','',row);el('span',v[0],cell);el('strong',v[1],cell);});
  var stock=a.stock.filter(function(v){return v.quantity>0;});
  if(stock.length)el('p','待售：'+stock.map(function(v){return v.kind+' '+v.quantity+v.unit;}).join(' · '),card,'street-stock-line');
  el('p',a.needsWithStock?'有货，仍有 '+a.needsWithStock+' 人想买却付不起。':a.breadUnaffordable?'有 '+a.breadUnaffordable+' 人想买面包却钱不够。':'本轮没人因缺钱买不到基本面包。',card,'street-affordability');
  if(a.spoiledBread)el('small','另有 '+a.spoiledBread+' 个旧面包坏掉；库存减少不全是卖掉。',card);
  if(a.suppliers.length)el('p',a.suppliers.length+' 家厂商向原料商付了货款。',card,'street-flow-link');
  if(a.crossPurchases.length){var link=a.crossPurchases[0];el('p',names[link.employer]+'的工资 → 员工 → '+names[link.seller]+'的收款',card,'street-flow-link');}
 }
 root.renderStreetEvidence=function(c){
  evidence(c,c.readout);
  var a=c.evidence&&c.evidence.actual;
  if(!a)el('p',c.game.report&&c.game.report.management?'投资已付款。开一天，看看新增产品卖到哪里。':'先开一天；再试本店扩产、同行跟进和工资。',c.readout,'street-inspect-hint');
 };
 root.renderStreetContradiction=function(c){
  c.scene.auto=false;c.scene.autoPending=false;c.title();
  var e=c.evidence,a=e&&e.actual;
  var heading=el('h2','每家都想多赚，为什么还会卖不掉？',c.readout,'street-review-heading');heading.id='street-review-title';
  el('p','对一家店，少发工资能省钱，多生产能争取收入。但一家付出的工资，也是别家顾客的购买力。',c.readout,'street-review-lead');
  if(a)el('p','本轮面包：出炉 '+a.produced+' 个，卖出 '+a.sold+' 个；期末库存 '+a.breadStock+' 个（含旧货）。'+(a.breadUnaffordable?'另有 '+a.breadUnaffordable+' 人想买基本面包，却付不起。':'本轮没人因缺钱买不到基本面包。'),c.readout,'street-review-fact');
  var pair=el('div','',c.readout,'street-structure');
  [['生产社会化','原料、机器、协作和消费互相依赖。一家的支出，是别家的收入。'],['生产资料的资本主义私人占有','店和机器归各家老板；投资、工资和开工由各家分别决定，收益也分别核算。']].forEach(function(v){var block=el('section','',pair);el('h3',v[0],block);el('p',v[1],block);});
  el('h3','资本主义基本矛盾',c.readout);
  el('p','生产社会化，与生产资料的资本主义私人占有之间的矛盾。生产依靠社会协作，投资、用工和收益分配却由各家资本分别支配。',c.readout,'street-core-contradiction');
  el('h3',a&&a.breadStock?'面包剩下，谁还买得起？':'这次没有面包积压，矛盾就消失了吗？',c.readout);
  el('p',a&&a.breadStock?'按现价卖不掉的商品，是相对有支付能力需求的过剩；不等于人人的需要都满足。':'本局可能卖完。基本矛盾是生产关系的结构，不能用一次剩货或一次卖完代替判断。',c.readout,'street-surplus-explanation');
  var rootReadout=c.readout,detail=el('details','',rootReadout,'street-review-details');el('summary','展开本局账目与降薪对照',detail);c.readout=detail;detail.appendChild(pair);evidence(c,detail);
  if(e&&e.repeatedOwnStock)el('p','你的店已连续两期有剩货。看看产量、售价和顾客钱包各变了多少。',c.readout,'street-hint');
  var compare=e&&e.comparison;
  if(compare&&compare.own&&compare.follow){
   var section=el('section','',c.readout,'street-wage-comparison');el('h3','重算同一天：如果别家也降薪',section);
   el('p','同一期开门前的钱、设备和库存；本店工资 '+compare.wage+'、售价 '+compare.price+'、开工 '+compare.shifts+' 人保持相同。只改变同行是否跟进。',section,'small');
   var table=el('table','',section);table.dataset.testid='street-wage-comparison';var head=el('thead','',table),hr=el('tr','',head);['','只改本店','同行也降薪'].forEach(function(v){el('th',v,hr);});var body=el('tbody','',table);
   [['本店资金变化（枚）',signed(compare.own.ownCashChange),signed(compare.follow.ownCashChange)],['全街工资（枚）',compare.own.wageTotal,compare.follow.wageTotal],['面包剩货（个）',compare.own.breadStock,compare.follow.breadStock],['有货却付不起的人',compare.own.needsWithStock,compare.follow.needsWithStock]].forEach(function(v){var tr=el('tr','',body);el('th',v[0],tr);el('td',String(v[1]),tr);el('td',String(v[2]),tr);});
   el('p','这是从同一起点做的条件对照，不改已发生的账，也不假定所有老板必然降薪。',section,'small');
  }
  el('p','扩产也会创造设备订单和工资；消费、投资、降价等可能吸收产品。一次积压不足以证明全面危机。',c.readout,'street-review-limit');
  c.readout=rootReadout;
  var back=el('button','回到街上，换个办法',c.controls,'secondary');back.type='button';back.onclick=function(){c.send({type:'MANAGE'});};
  if(e&&e.reviewReady&&a)c.ending('继续看故事 →');
  // The review is the popup itself, rather than a second notice before it.
  var dialog=document.createElement('dialog');dialog.className='street-review-dialog';dialog.setAttribute('aria-labelledby',heading.id);
  var body=el('div','',dialog,'street-review-body');while(rootReadout.firstChild)body.appendChild(rootReadout.firstChild);
  var actions=el('div','',dialog,'street-review-actions');while(c.controls.firstChild)actions.appendChild(c.controls.firstChild);rootReadout.appendChild(dialog);
  requestAnimationFrame(function(){
  if(!dialog.isConnected)return;
  var previousFocus=document.activeElement,hostOverflow,disposed=false;
  try{rootReadout.style.minHeight=Math.max(320,parent.innerHeight-150)+'px';hostOverflow=parent.document.body.style.overflow;parent.document.body.style.overflow='hidden';}catch(err){}
  function place(){if(disposed)return;var offset=0,available=innerHeight;try{if(frameElement){var rect=frameElement.getBoundingClientRect();offset=Math.max(0,-rect.top);available=Math.max(120,Math.min(innerHeight-offset,parent.innerHeight-Math.max(0,rect.top)));}}catch(err){}dialog.style.maxHeight=Math.max(96,available-24)+'px';dialog.style.top=offset+Math.max(12,(available-dialog.offsetHeight)/2)+'px';}
  function cleanup(){if(disposed)return;disposed=true;dialog.close();dialog.remove();rootReadout.style.minHeight='';try{if(hostOverflow!==undefined)parent.document.body.style.overflow=hostOverflow;parent.removeEventListener('resize',place);parent.removeEventListener('scroll',place);}catch(err){}window.removeEventListener('resize',place);if(c.scene.closeBriefing===cleanup)c.scene.closeBriefing=null;if(previousFocus&&previousFocus.isConnected)previousFocus.focus({preventScroll:true});}
  c.scene.closeBriefing=cleanup;dialog.addEventListener('cancel',function(event){event.preventDefault();c.send({type:'MANAGE'});});
  dialog.showModal();heading.tabIndex=-1;heading.focus({preventScroll:true});window.addEventListener('resize',place);try{parent.addEventListener('resize',place);parent.addEventListener('scroll',place,{passive:true});}catch(err){}place();requestAnimationFrame(place);
  dialog.addEventListener('toggle',place);detail.addEventListener('toggle',place);
  });
 };
})(window);
