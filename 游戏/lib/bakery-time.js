/* Same oven, two tomorrow plans. Page-local counterfactual, not a sales ledger. */
(function(root){
 'use strict';
 function calculate(plan){
  if(!['more','rest'].includes(plan))return null;
  return {plan,loaves:plan==='more'?12:8,hours:plan==='more'?6:4,savedHours:plan==='more'?0:2,baselineLoaves:8,baselineHours:6};
 }
 function mount(parent,assets,wage){
  const desk=document.createElement('details');desk.className='bakery-time';desk.dataset.testid='bakery-time';desk.hidden=true;parent.appendChild(desk);
  function el(tag,text,box,cls){const n=document.createElement(tag);n.textContent=text;n.className=cls||'';box.appendChild(n);return n;}
  el('summary','同一台炉，能早点收工吗？',desk);
  el('small','两种安排都照发刚才约定的工资。',desk,'bakery-time-question');
  const actions=el('div','',desk,'bakery-time-actions');
  const result=el('div','',desk,'bakery-time-result');result.hidden=true;
  const buttons=[];
  for(const [id,label] of [['more','照常干，多做些'],['rest','按原订单，早点收工']]){
   const b=el('button',label,actions,'secondary');b.type='button';b.dataset.timePlan=id;b.setAttribute('aria-pressed','false');buttons.push(b);
   b.onclick=()=>{
    const a=calculate(id);desk.dataset.plan=id;desk.dataset.loaves=String(a.loaves);desk.dataset.hours=String(a.hours);
    buttons.forEach(n=>n.setAttribute('aria-pressed',String(n===b)));result.replaceChildren();result.hidden=false;
    const tray=el('div','',result,'bakery-time-tray');tray.setAttribute('aria-hidden','true');
    for(let i=0;i<a.loaves;i++){const bread=el('img','',tray);bread.src=assets.bread;bread.alt='';bread.style.setProperty('--loaf-i',i);}
    const clock=el('div','',result,'bakery-time-clock');clock.setAttribute('aria-hidden','true');
    for(let i=0;i<6;i++){const tick=el('span','',clock);tick.className=i<a.hours?'worked':'free';}
    const status=el('p',a.loaves+'个面包 · '+a.hours+'小时',result,'bakery-time-status');status.setAttribute('role','status');
    el('p',id==='more'?'面包多了，客人呢？':'机器没换，收工的规矩换了。',result,'bakery-time-voice');
   };
  }
  const limits=el('details','',desk,'street-bounds');el('summary','这个对照怎么算？',limits);
  el('p','假设旧炉6小时做8个，新炉6小时做12个。按原来8个的订单，只需4小时。两种方案都按刚才约定的'+wage+'枚发工资，不把少上班自动变成少领钱。数字是教学设定，不是历史工时。',limits);
  el('p','这是明天的排班对照，不改刚才已经收到和分出的15枚，也不写入后续竞争的账本。少做可能少收款，多做可能卖不完；这一步只问如何使用省下的时间。后面的工时日历可继续试工资、工时与生产安排。',limits);
  const source=el('p','文稿线索：学院派Academia，2023年AI讨论约33—35分钟（机器转写未逐句听校）。区分机器的能力和使用机器的社会关系。',limits);
  const link=el('a','视频 ↗',source);link.href='https://www.bilibili.com/video/BV1bk4y1e7Jp/';link.target='_blank';link.rel='noreferrer';
  const original=el('p','进一步阅读：',limits),ma=el('a','马克思《资本论》第一卷第十五章 ↗',original);ma.href='https://www.marxists.org/archive/marx/works/1867-c1/ch15.htm';ma.target='_blank';ma.rel='noreferrer';
  return desk;
 }
 root.BakeryTime={calculate,mount};
})(window);
