/* One-time receipts, acknowledged in the saved model rather than local timers. */
(function(root){
 'use strict';
 root.installStreetBriefing=function(c){
  var notice=c.game.tutorial&&c.game.tutorial.pending[0],previous=c.scene.onChange,opened=false,acknowledged=false;
  function open(){
   if(!notice||opened||acknowledged||c.scene.entrance<1||!c.scene.graphics.visible||c.scene.game!==c.game)return;opened=true;
   c.scene.auto=false;c.scene.autoPending=false;
   var shade=document.createElement('div');shade.className='shop-ledger-shade';shade.id='street-briefing';
   var dialog=document.createElement('section');dialog.className='shop-ledger-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','street-briefing-title');shade.appendChild(dialog);
   function el(tag,text,cls){var n=document.createElement(tag);n.textContent=text;n.className=cls||'';dialog.appendChild(n);return n;}
   var titles={'first-day':'第一天的钱，怎么算？','first-oven':'新烤炉，付钱了。','first-stock':'没卖完，也要花钱。'};
   var heading=el('h2',titles[notice.id]);heading.id='street-briefing-title';
   var labels={'售出面包的成本（含折旧）':'成本（含折旧）','坏掉与保管费用':'坏损与保管','厨师工资（已计生产成本）':'其中：厨师工资','公司留存利润':'留在店里','购置后公司余额':'店里还剩','待售面包（个）':'剩下面包'};
   // Zero charges and a duplicate paid-in-full line add no new information.
   // Keep the saved receipt and the detailed ledger intact.
   var rows=notice.rows.filter(function(item){if(item[0]==='坏掉与保管费用'&&!item[1])return false;if(item[0]==='实际支付')return !notice.rows.some(function(other){return other[0]==='本轮保管费'&&other[1]===item[1];});return true;});
   if(notice.id==='first-day'){var wage=rows.find(function(item){return item[0]==='厨师工资（已计生产成本）';});if(wage){rows=rows.filter(function(item){return item!==wage;});var cost=rows.findIndex(function(item){return item[0]==='售出面包的成本（含折旧）';});rows.splice(cost+1,0,wage);}}
   rows.forEach(function(item){var row=el('div','','shop-ledger-row');var name=document.createElement('span'),value=document.createElement('strong');name.textContent=labels[item[0]]||item[0];value.textContent=item[0].includes('（个）')?item[1]+'个':(item[1]%100?'约':'')+Math.round(item[1]/100)+'枚';if(item[0]==='厨师工资（已计生产成本）')row.classList.add('street-receipt-included');row.appendChild(name);row.appendChild(value);});
   el('p',{'first-day':'工资已计入成本。余额不是利润。','first-oven':'钱付给烤炉厂，炉子归你的店。','first-stock':'保管要钱，放满三天会坏。'}[notice.id],'shop-ledger-note');
   StreetArt.decorateMoney(dialog);
   var confirm=el('button','明白了 →','primary');confirm.type='button';
   var focused=document.activeElement,main=document.querySelector('main'),footer=document.querySelector('footer'),mainInert=main.inert,footerInert=footer.inert,hostOverflow;
   main.inert=footer.inert=true;document.body.appendChild(shade);
   try{hostOverflow=parent.document.body.style.overflow;parent.document.body.style.overflow='hidden';}catch(e){}
   function place(){var offset=0,available=innerHeight;try{if(window.frameElement){var r=window.frameElement.getBoundingClientRect();offset=Math.max(0,-r.top);available=Math.max(120,Math.min(innerHeight-offset,parent.innerHeight-Math.max(0,r.top)));}}catch(e){}dialog.style.maxHeight=Math.max(96,available-32)+'px';dialog.style.top=offset+Math.max(12,(available-dialog.offsetHeight)/2)+'px';}
   function close(send){shade.remove();main.inert=mainInert;footer.inert=footerInert;try{if(hostOverflow!==undefined)parent.document.body.style.overflow=hostOverflow;}catch(e){}window.removeEventListener('resize',place);try{parent.removeEventListener('scroll',place);parent.removeEventListener('resize',place);}catch(e){}if(c.scene.closeBriefing===cleanup)c.scene.closeBriefing=null;if(focused&&focused.isConnected)focused.focus({preventScroll:true});if(send){acknowledged=true;c.send({type:'ACK_NOTICE',id:notice.id});}}
   function cleanup(){close(false);}
   c.scene.closeBriefing=cleanup;confirm.onclick=function(){close(true);};shade.onkeydown=function(e){if(e.key==='Escape'){e.preventDefault();close(true);}if(e.key==='Tab'){e.preventDefault();confirm.focus();}};
   window.addEventListener('resize',place);try{parent.addEventListener('scroll',place,{passive:true});parent.addEventListener('resize',place);}catch(e){}place();confirm.focus({preventScroll:true});
  }
  c.scene.onChange=function(sample){if(previous)previous(sample);if(sample.complete)open();};
  if(c.scene.time>=8)open();
 };
})(window);
