/* The fourth act explains three responses; reading never runs an experiment. */
(function(root){
 'use strict';
 var closeCurrent=null;
 var content={
  consumption:{title:'增加消费',promise:'先让钱包鼓起来。',path:['可支配收入增加','形成消费订单','企业回款与就业'],sections:[
   ['为什么可能有效？','有人需要商品，却未必付得起。工资增长、转移支付或减轻必要支出，可以把需要转化为实际购买，帮助企业卖出产品。'],
   ['加收入与借钱有什么不同？','加薪涉及企业收入怎样分配；公共支持需要税收、预算或举债等资金来源。消费信贷把未来支付能力提前使用，后续仍要靠收入偿还，不能把两者混为一谈。'],
   ['依赖什么条件？','收入能否持续、支持是否到达有消费需要的人、供给能否满足这些需要，都会影响结果。技术提效若转化为收入增长或降价，也可能扩大购买力。'],
   ['局限在哪里？','靠不断加债维持消费，可能积累偿还压力；但借贷不必然导致危机。增加消费也不等于消费主义，更不能假设人会无限购买同一种商品。']
  ],question:'生产能力提高以后，收益怎样变成更多人的实际生活改善？'},
  investment:{title:'增加投资',promise:'先让设备厂忙起来。',path:['购买设备与建设','带动订单、收入和就业','形成未来生产能力'],sections:[
   ['为什么可能有效？','企业购买设备、建设厂房，本身就是对其他企业的需求。投资支出会形成供应商的订单，也可能带来工资与消费，缓解当下的销路压力。'],
   ['今天的订单，明天的什么？','扩建可能增加未来产能；替换旧设备可能主要降低成本或改善品质，不一定扩大产能。要区分投资带来的当期需求，与投产后的供给变化。'],
   ['依赖什么条件？','投资需要留存收益、融资或公共预算等资金来源，也要看预期销路、融资成本与实际用途。新设备能否满足新的需要，比单纯增加设备数量更关键。'],
   ['局限在哪里？','如果许多企业同时扩产，而后续购买没有跟上，新增产能可能再次遇到卖不掉的问题。投资也可能改善技术、开拓新需求，不能预设它必然造成更严重的过剩。']
  ],question:'新增设备最终满足谁的需要，收益和投资决定权掌握在谁手里？'},
  exports:{title:'增加出口',promise:'去外面找找买家。',path:['获得国外订单','形成出口收入','带动国内生产与就业'],sections:[
   ['为什么可能有效？','当国内销路不足时，国外有需要且有支付能力的买家，可以带来额外订单，支持本国企业的生产和就业。'],
   ['外面的购买力从哪里来？','国外买家同样依赖收入、融资和实际用途。能否持续出口，要看外部需求、产品竞争力、汇率、运输成本和贸易条件，而不是把外部市场当成无限钱包。'],
   ['出口额与净出口有什么不同？','出口增加不等于贸易顺差增加，还要同时看进口。全球不可能每个经济体都获得净出口顺差；这不意味着各国之间的贸易总额不能共同增长。'],
   ['局限在哪里？','依赖少数市场或客户会增加订单变化的风险，贸易摩擦也可能影响销路。出口能够缓解一国的需求压力，但不能把所有经济体的需求不足都推给别国解决。']
  ],question:'外部订单是否稳定？谁得到出口收益，又由谁承担市场变化的风险？'}
 };
 function el(tag,text,parent,cls){var n=document.createElement(tag);n.textContent=text||'';n.className=cls||'';parent.appendChild(n);return n;}
 root.closeReliefReading=function(){if(closeCurrent)closeCurrent();};
 function openExplanation(id,opener){
  root.closeReliefReading();var item=content[id],dialog=document.createElement('dialog');dialog.className='relief-explanation-dialog';dialog.dataset.reliefExplanation=id;dialog.setAttribute('aria-labelledby','relief-explanation-title');
  var top=el('div','',dialog,'relief-explanation-top'),heading=el('h2',item.title,top);heading.id='relief-explanation-title';
  var close=el('button','×',top,'relief-explanation-close');close.type='button';close.setAttribute('aria-label','关闭解释');
  var body=el('div','',dialog,'relief-explanation-body');
  var path=el('p','',body,'relief-explanation-path');path.setAttribute('aria-label','作用过程');item.path.forEach(function(words,i){if(i)el('span',' → ',path,'relief-explanation-arrow');el('span',words,path);});
  item.sections.forEach(function(pair){var section=el('section','',body);el('h3',pair[0],section);el('p',pair[1],section);});
  el('p',item.question,body,'relief-explanation-question');
  el('p','这些办法可以缓和产销矛盾，成效取决于分配、需求和制度安排；增加订单本身不等于改变生产资料的占有关系。',body,'relief-explanation-boundary');
  var back=el('button','返回三张药方',dialog,'primary relief-explanation-back');back.type='button';
  var hostOverflow,disposed=false;document.body.appendChild(dialog);
  try{hostOverflow=parent.document.body.style.overflow;parent.document.body.style.overflow='hidden';}catch(err){}
  function place(){if(disposed)return;var offset=0,available=innerHeight;try{if(frameElement){var rect=frameElement.getBoundingClientRect();offset=Math.max(0,-rect.top);available=Math.max(120,Math.min(innerHeight-offset,parent.innerHeight-Math.max(0,rect.top)));}}catch(err){}dialog.style.maxHeight=Math.max(96,available-24)+'px';dialog.style.top=offset+Math.max(12,(available-dialog.offsetHeight)/2)+'px';}
  function cleanup(){if(disposed)return;disposed=true;dialog.close();dialog.remove();try{if(hostOverflow!==undefined)parent.document.body.style.overflow=hostOverflow;parent.removeEventListener('scroll',place);parent.removeEventListener('resize',place);}catch(err){}window.removeEventListener('resize',place);if(closeCurrent===cleanup)closeCurrent=null;if(opener&&opener.isConnected)opener.focus({preventScroll:true});}
  closeCurrent=cleanup;close.onclick=back.onclick=cleanup;dialog.addEventListener('cancel',function(e){e.preventDefault();cleanup();});
  dialog.addEventListener('click',function(e){var rect=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom))cleanup();});
  dialog.showModal();close.focus({preventScroll:true});window.addEventListener('resize',place);try{parent.addEventListener('scroll',place,{passive:true});parent.addEventListener('resize',place);}catch(err){}place();requestAnimationFrame(place);
 }
 root.renderReliefReading=function(c){
  root.closeReliefReading();c.title('第四幕·资产阶级精英开出的药方','');
  var encounter=el('div','',c.readout,'remedy-encounter'),shelf=el('span','',encounter,'remedy-encounter-shelf');shelf.setAttribute('aria-hidden','true');
  ['bread','clothes','ovens','bread'].forEach(function(id){el('span','',shelf).innerHTML=StreetArt.icon(id);});el('p','如果又剩货了，听谁的？',encounter);
  var menu=el('div','',c.readout,'remedy-menu');menu.dataset.testid='relief-reading-menu';
  Object.keys(content).forEach(function(id){var item=content[id],card=el('button','',menu,'remedy-card');card.type='button';card.dataset.route=id;card.setAttribute('aria-label',item.title+'：查看解释');card.setAttribute('aria-haspopup','dialog');card.onclick=function(){openExplanation(id,card);};
   el('span',item.title,card,'remedy-card-title');el('span',item.promise,card,'remedy-card-promise');var art=el('span','',card,'remedy-card-art');art.setAttribute('aria-hidden','true');root.renderRemedyAdviser(art,id);el('span','查看解释 →',card,'remedy-card-progress');
  });
  var next=el('button','继续故事 →',c.controls,'primary');next.type='button';next.onclick=function(){c.send({type:'FINISH_RELIEF_READING'});};
 };
 window.addEventListener('pagehide',root.closeReliefReading);
})(window);
