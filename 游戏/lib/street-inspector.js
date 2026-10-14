/* Paper ledger outside the canvas: accessible, read-only and usable on phones. */
(function(root){
 'use strict';
 root.StreetInspector=function(options){
  var self=this,firm=null,opener=null,tab=0,hostOverflow=null;
  var shade=document.createElement('div');shade.className='shop-ledger-shade';shade.hidden=true;document.body.appendChild(shade);
  var dialog=document.createElement('section');dialog.className='shop-ledger-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','shop-ledger-heading');shade.appendChild(dialog);
  function el(tag,text,cls,parent){var n=document.createElement(tag);n.className=cls||'';if(text)n.textContent=text;(parent||dialog).appendChild(n);StreetArt.decorateMoney(n);return n;}
  function coins(cents){return Math.floor(cents/100)+'枚';}
  function row(parent,label,value){var n=el('div','','shop-ledger-row',parent);el('span',label,'',n);el('strong',value,'',n);return n;}
  function paragraph(parent,text){return el('p',text,'shop-ledger-note',parent);}
  function flow(parent,book){
   if(!book.rows.length)paragraph(parent,'没有这家店的收付款记录。');
   book.rows.forEach(function(item){row(parent,(item.direction==='in'?'收：':'付：')+item.label,coins(item.amount));});
   row(parent,'收入合计',coins(book.incoming));row(parent,'支出合计',coins(book.outgoing));
   row(parent,'现金净变化',(book.net<0?'−':'＋')+coins(Math.abs(book.net)));
  }
  function place(){
   if(shade.hidden)return;
   var offset=0,available=window.innerHeight;
   // The teaching iframe grows with the street, so its viewport is not the
   // player's visible screen. Anchor to the visible part of the host viewport.
   try{if(window.frameElement){var r=window.frameElement.getBoundingClientRect();offset=Math.max(0,-r.top);available=Math.max(120,Math.min(window.innerHeight-offset,parent.innerHeight-Math.max(0,r.top)));}}catch(e){}
   dialog.style.maxHeight=Math.max(96,available-32)+'px';
   dialog.style.top=(offset+Math.max(12,(available-dialog.offsetHeight)/2))+'px';
  }
  function render(){
   var d=StreetLedger.inspect(options.getGame(),firm);if(!d)return;dialog.innerHTML='';
   var top=el('div','','shop-ledger-top'),heading=el('h2',d.name,'',top);heading.id='shop-ledger-heading';
   var close=el('button','×','shop-ledger-close',top);close.type='button';close.setAttribute('aria-label','关闭店铺账本');close.onclick=function(){self.close();};
   var sub=el('div','','shop-ledger-sub');el('span',d.round?'第'+d.round+'轮之后':'还没开门','',sub);
   var select=el('select','','',sub);select.setAttribute('aria-label','切换账本店铺');Object.keys(StreetLedger.names).forEach(function(id){var o=el('option',StreetLedger.names[id],'',select);o.value=id;o.selected=id===firm;});select.onchange=function(){firm=select.value;render();dialog.querySelector('select').focus();};
   var tabs=el('div','','shop-ledger-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','账本分类');
   var panels=[];
   ['店里现在','钱的去向','成本怎么算'].forEach(function(name,i){var b=el('button',name,'',tabs);b.type='button';b.id='shop-ledger-tab-'+i;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(tab===i));b.setAttribute('aria-controls','shop-ledger-panel-'+i);b.tabIndex=tab===i?0:-1;
    function activate(next){tab=next;render();dialog.querySelector('#shop-ledger-tab-'+tab).focus();}
    b.onclick=function(){activate(i);};b.onkeydown=function(e){if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();activate(e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3);}};
   });
   var body=el('div','','shop-ledger-body');
   for(var i=0;i<3;i++){var p=el('div','','shop-ledger-panel',body);p.id='shop-ledger-panel-'+i;p.hidden=tab!==i;p.setAttribute('role','tabpanel');p.setAttribute('aria-labelledby','shop-ledger-tab-'+i);panels.push(p);}
   var now=panels[0],metrics=el('div','','shop-ledger-metrics',now);
   [[d.id==='bakery'||d.id==='rival'?'bread':d.id,'待售',d.stock+d.unit],['person','在册',d.staff.length+'人'],['cash','现金',coins(d.cash)]].forEach(function(a){var cell=el('div','','',metrics);var icon=el('span','','',cell);icon.innerHTML=StreetArt.icon(a[0]);el('span',a[1],'',cell);el('strong',a[2],'',cell);});
   row(now,d.product+'售价'+(d.id==='inputs'?'（4份一包）':''),coins(d.price));row(now,'每人每轮工资',coins(d.wage));
   if(d.pending)paragraph(now,'下轮设定。上一轮售价'+coins(d.lastPrice)+'，工资'+coins(d.lastWage)+'。');
   row(now,'上一轮实际开工',d.round?d.working+'人':'尚未开工');
   row(now,'上一轮产出 / 卖出',d.round?d.produced+d.unit+' / '+d.sold+d.unit:'0'+d.unit+' / 0'+d.unit);
   if(d.baking)row(now,'烤炉 / 可用烤炉',d.machines+'台 / '+d.usable+'台');
   if(d.id!=='inputs')row(now,'现有原料',d.inputs+'份');
   if(d.storageDebt)row(now,'还欠的保管费',d.storageDebt+'枚');
   if(d.rentDebt)row(now,'还欠的店租',d.rentDebt+'枚');
   if(d.id!=='bakery'){
    var strategy=el('details','','shop-ledger-strategy',now);el('summary','老板最近怎么调整','',strategy);
    if(d.decision){var a=d.decision,label={'price-cut':'售价','wage-cut':'工资','wage-rise':'工资',layoff:'人数',hire:'人数',expand:'设备'}[a.kind],unit=a.kind==='expand'?'台':['layoff','hire'].includes(a.kind)?'人':'枚';row(strategy,'第'+a.round+'轮 · '+label,a.oldValue+unit+' → '+a.value+unit);paragraph(strategy,a.reason);}
    else paragraph(strategy,'还没有调价或改变用工。');
   }
   var employees=el('details','','shop-ledger-staff',now);el('summary','员工名单 · '+d.staff.length+'人','',employees);
   d.staff.forEach(function(person){var line=el('div','','shop-ledger-employee',employees),link=el('button',person.name+' →','',line);link.type='button';link.setAttribute('aria-label','查看'+person.id+'的钱包');link.onclick=function(){self.close(false);options.onPerson(person.id);};el('span','钱包'+coins(person.cash)+' · '+(person.paid===null?'尚未领薪':person.paid?'本轮工资'+coins(person.paid):'本轮未领薪'),'',line);});
   var cash=panels[1];
   if(d.day){el('h3','第'+d.day.round+'轮营业账','',cash);if(d.day.opening!==null)row(cash,'开门时现金',coins(d.day.opening));flow(cash,d.day.flows);if(d.day.closing!==null)row(cash,'关门时现金',coins(d.day.closing));}
   else paragraph(cash,d.round?'旧存档没有保存这轮完整营业账。下轮开始记录。':'还没营业，没有收入和支出。');
   if(d.management&&d.management.rows.length){el('h3','最近一次购炉 / 用工行动','',cash);flow(cash,d.management);}
   row(cash,'现在店里的现金',coins(d.cash));
   if(d.day&&d.day.accounts){var a=d.day.accounts;el('h3','本轮利润','',cash);[['销售额',a.sales],['售出产品成本',a.costOfSales],['店租',a.fixedCosts||0],['坏损与仓储费',a.spoilage+a.storage],['离职安置款',a.severance],['净利润',a.netProfit],['老板个人取用',a.ownerDraw],['公司留存利润',a.retained]].forEach(function(item){row(cash,item[0],(item[1]%100?'约':'')+Math.round(item[1]/100)+'枚');});}
   paragraph(cash,'余额不是利润。');
   if(d.history.length>1){var history=el('details','','',cash);el('summary','最近三轮现金变化','',history);d.history.forEach(function(h){row(history,'第'+h.round+'轮',(h.flows.net<0?'−':'＋')+coins(Math.abs(h.flows.net)));});}
   var costs=panels[2],e=d.estimate;
   el('h3','按现有人手与排班估算','',costs);row(costs,'计划开工',e.workers+'人');row(costs,'满班最多做',e.capacity+d.unit);row(costs,'工资：'+e.workers+'人 × '+coins(d.wage),coins(e.wages));
   if(d.id!=='inputs'){row(costs,'所需原料',e.raw+'份');row(costs,'需买原料',e.packs+'包（每包4份）');row(costs,'原料：'+e.packs+'包 × '+coins(e.packPrice),coins(e.materials));}
   row(costs,'工资 + 需买原料',coins(e.wages+e.materials));
   if(d.rentPerDay)row(costs,'每天店租（停工也付）',d.rentPerDay+'枚');
   el('h3','剩货也要花钱','',costs);
   if(d.holdingUnit){row(costs,'每'+d.holdingUnit+d.unit+'剩货（向上取整）','1枚 / 轮');row(costs,'当前库存保管费',coins(d.holdingEstimate));if(d.storage)row(costs,'上一轮应付 / 已付',d.storage.due+'枚 / '+d.storage.paid+'枚');}
   else paragraph(costs,'原料免保管费；这家收取其他店的保管费。');
   if(d.storageDebt)row(costs,'旧欠保管费',d.storageDebt+'枚');
   if(d.baking){row(costs,'面包保质期','3轮');row(costs,'普通炉：售价 / 每人每轮产量',coins(d.ovenPrice)+' / 6个');row(costs,'快炉：售价 / 每人每轮产量',coins(d.ovenPrice*2)+' / 12个');row(costs,'烤炉使用期限','12轮');}
   row(costs,'老板消费前留足工资','3轮');
   paragraph(costs,d.rentModel?'教学预算，未模拟税费；我们的利润账另计折旧。':d.day&&d.day.accounts?'教学预算；利润账另计折旧，未模拟房租、税费。':'教学预算，未模拟房租、税费。');
   if(d.cash%100)paragraph(costs,'旧存档零钱保留；这里只显示可用金币。');
   shade.dataset.firm=firm;place();
  }
  self.isOpen=function(){return !shade.hidden;};
  self.open=function(id,button){firm=id;opener=button;tab=0;shade.hidden=false;options.onOpen();render();document.body.classList.add('shop-ledger-open');try{hostOverflow=parent.document.body.style.overflow;parent.document.body.style.overflow='hidden';}catch(e){}place();dialog.querySelector('.shop-ledger-close').focus({preventScroll:true});};
  self.refresh=function(){if(self.isOpen()){var focused=document.activeElement,focusId=focused&&focused.id;render();if(focusId&&document.getElementById(focusId))document.getElementById(focusId).focus();else dialog.querySelector('.shop-ledger-close').focus();}};
  self.close=function(restore){if(shade.hidden)return;shade.hidden=true;document.body.classList.remove('shop-ledger-open');try{if(hostOverflow!==null)parent.document.body.style.overflow=hostOverflow;}catch(e){}hostOverflow=null;if(restore!==false){var target=opener&&opener.isConnected?opener:document.querySelector('.street-shop-hit[data-firm="'+firm+'"]');if(target)target.focus({preventScroll:true});}};
  shade.onclick=function(e){if(e.target===shade)self.close();};
  shade.onkeydown=function(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();self.close();}if(e.key==='Tab'){var nodes=Array.from(dialog.querySelectorAll('button,select,summary')).filter(function(n){return n.tabIndex>=0&&n.getClientRects().length&&!n.disabled;}),first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
  window.addEventListener('resize',place);try{parent.addEventListener('resize',place);parent.addEventListener('scroll',place,{passive:true});}catch(e){}
 };
})(window);
