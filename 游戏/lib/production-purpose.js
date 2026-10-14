/* A page-local, explicitly hypothetical energy/output comparison, not an economy. */
(function(root){
 'use strict';
 function calculate(plan){
  if(!plan||!['old','new'].includes(plan.machine)||![6,18].includes(plan.orders)||!Number.isInteger(plan.batches)||plan.batches<1||plan.batches>3||(plan.machine==='old'&&plan.batches!==1))return null;
  const output=plan.batches*6,hours=plan.machine==='old'?3:plan.batches,energyPerLoaf=plan.machine==='old'?2:1;
  return {machine:plan.machine,orders:plan.orders,batches:plan.batches,output,hours,freeHours:3-hours,energyPerLoaf,energy:output*energyPerLoaf,sold:Math.min(output,plan.orders),stock:Math.max(0,output-plan.orders),unfilled:Math.max(0,plan.orders-output)};
 }
 function feedback(a){
  if(a.machine==='old')return a.unfilled?'忙满了，还是没做够。':'这台老炉，刚好够用。';
  if(a.unfilled)return '省了每份，订单还是没做够。';
  if(a.stock)return a.energy>12?'每份省了，总共却更费。':'每份省了，总共没省。';
  if(a.freeHours)return '做够就停，时间和能源都省了。';
  return '多做的也都有人要。';
 }
 function mount(parent){
  let plan={machine:'old',orders:6,batches:1},conditionsOpen=false,limitsOpen=false;
  const desk=document.createElement('section');desk.className='production-purpose';desk.dataset.testid='production-purpose';parent.appendChild(desk);
  function el(tag,text,box,cls){const n=document.createElement(tag);n.textContent=text;n.className=cls||'';box.appendChild(n);return n;}
  function action(label,id,next,box){const b=el('button',label,box,'secondary');b.type='button';b.dataset.purposeAction=id;b.onclick=function(){plan=next();draw();const target=desk.querySelector('[data-purpose-action="'+id+'"]')||desk.querySelector('[data-purpose-action="full"], [data-purpose-action="upgrade"]');target?.focus({preventScroll:true});};return b;}
  function draw(){
   const a=calculate(plan),old=calculate({machine:'old',orders:plan.orders,batches:1});desk.replaceChildren();
   for(const key of ['machine','orders','output','energy','hours','sold','stock','unfilled'])desk.dataset[key]=String(a[key]);
   el('p','省了每一份，省了总量吗？',desk,'production-purpose-title');
   const order=el('p','今天的订单：'+a.orders+'份',desk,'production-purpose-orders');order.dataset.testid='purpose-orders';
   const scene=el('div','',desk,'production-purpose-scene');scene.dataset.machine=a.machine;
   const oven=el('img','',scene,'production-purpose-oven');oven.src=a.machine==='old'?root.TRUST_ASSETS.bakery.emptyOldOven:root.TRUST_ASSETS.bakery.newOven;oven.alt=a.machine==='old'?'老烤炉':'节能新烤炉';
   const goods=el('div','',scene,'production-purpose-goods');
   const tray=el('div','',goods,'production-purpose-tray');tray.setAttribute('aria-label','做出'+a.output+'份，其中'+a.stock+'份未售');
   for(let i=0;i<a.output;i++){const loaf=el('img','',tray);loaf.src=root.TRUST_ASSETS.bakery.bread;loaf.alt='';loaf.dataset.sold=String(i<a.sold);loaf.style.setProperty('--loaf-i',String(i));}
   el('small',a.stock?'虚线里的'+a.stock+'份，没卖出':a.unfilled?'还有'+a.unfilled+'份订单没做够':'刚好做够，全部卖出',goods);
   const meter=el('div','',desk,'production-purpose-energy');meter.setAttribute('aria-label','总耗能'+a.energy+'格，每份耗能'+a.energyPerLoaf+'格');
   el('span','每份 '+a.energyPerLoaf+' 格 · 总共 '+a.energy+' 格',meter);const cells=el('span','',meter,'production-purpose-cells');cells.setAttribute('aria-hidden','true');
   for(let i=0;i<18;i++){const cell=el('i','',cells);cell.dataset.used=String(i<a.energy);}
   const clock=el('div','',desk,'production-purpose-clock');clock.setAttribute('aria-label','生产'+a.hours+'小时，腾出'+a.freeHours+'小时');
   for(let i=0;i<3;i++)el('span',i<a.hours?'烤':'空',clock,i<a.hours?'worked':'free');
   const line=el('p',feedback(a),desk,'production-purpose-result');line.setAttribute('role','status');
   if(a.machine==='new')el('small','旧炉同样三小时：做'+old.output+'份，用'+old.energy+'格。',desk,'production-purpose-baseline');
   const actions=el('div','',desk,'production-purpose-actions');
   if(a.machine==='old')action('换节能新炉 →','upgrade',()=>({...plan,machine:'new',batches:3}),actions);
   else{
    const full=action('烤满三小时','full',()=>({...plan,batches:3}),actions);full.setAttribute('aria-pressed',String(a.batches===3));
    const enough=action('够订单就停','enough',()=>({...plan,batches:plan.orders/6}),actions);enough.setAttribute('aria-pressed',String(a.batches===plan.orders/6));
   }
   const conditions=el('details','',desk,'street-bounds');conditions.open=conditionsOpen;conditions.ontoggle=function(){if(conditions.isConnected)conditionsOpen=conditions.open;};el('summary','如果订单变多呢？',conditions);
   const demand=action(a.orders===6?'试试18份订单':'回到6份订单','orders',()=>({...plan,orders:plan.orders===6?18:6}),conditions);demand.dataset.orders=String(a.orders===6?18:6);
   const limits=el('details','',desk,'street-bounds');limits.open=limitsOpen;limits.ontoggle=function(){if(limits.isConnected)limitsOpen=limits.open;};el('summary','假设、来源与边界',limits);
   el('p','另开一组能耗假设，不沿用前面经营的产量和账本。每炉6份；老炉每炉3小时、每份2格能耗；新炉每炉1小时、每份1格能耗。一天最多生产3小时。订单均能付款，做够的部分全部售出；未售不等于已经报废。格只是相对能耗单位，不是电价或碳排放。',limits);
   el('p','这是同一店的假想安排，约定工资不变。腾出的时间是否成为休息，还要决定；多做也可能满足新增需要。此处未计购机、原料、预热、折旧或全生命周期，不能用来判断企业利润、现实节能幅度或某种制度的必然结果。',limits);
   el('p','每份耗能与总耗能要分开：总量也取决于做多少。这个对照没有模拟效率提升如何改变价格和需求，因而不是对反弹效应大小的估计。退出或刷新后重置，主线账本不变。',limits);
   const source=el('p','学院派Academia，2024年“科学向善”讨论约6:43—8:56，提供目的与生态的追问。机器稿未逐句听校；不采用企业调查或宣传作为节能证据。',limits);link('文稿视频 ↗','https://www.bilibili.com/video/BV1Xb421b74B/',source);
   const study=el('p','IPCC AR6第三工作组第5章讨论需求、效率与潜在反弹：技术潜力不能替代对总需求和使用方式的考察。这里的数字不是该报告数据。',limits);link('研究章节 ↗','https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-5/',study);
   if(a.machine==='new')action('重看旧炉','reset',()=>({machine:'old',orders:6,batches:1}),limits);
  }
  function link(label,url,box){const a=el('a',label,box);a.href=url;a.target='_blank';a.rel='noreferrer';}
  draw();return desk;
 }
 root.ProductionPurpose={calculate,feedback,mount};
})(window);
