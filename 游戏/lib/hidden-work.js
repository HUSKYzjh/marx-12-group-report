/* Page-local task experiment; explicit toy times, no AI call or save mutation. */
(function(root){
 'use strict';
 const tasks=Object.freeze([
  Object.freeze({id:'repeat',name:'重复订单',detail:'十袋同样的面包',manual:4,review:0}),
  Object.freeze({id:'allergy',name:'过敏备注',detail:'“不能有坚果”写在留言里',manual:4,review:3}),
  Object.freeze({id:'address',name:'地址不全',detail:'还得联系顾客补齐',manual:4,review:4})
 ]);
 function calculate(plan){
  if(!Array.isArray(plan)||plan.length!==tasks.length||plan.some(v=>!['manual','auto','review'].includes(v)))return null;
  const rows=tasks.map((task,i)=>{const mode=plan[i],machine=mode==='manual'?0:1,human=mode==='manual'?task.manual:mode==='review'?task.review:0,ready=mode==='manual'||mode==='review'||task.review===0;return {...task,mode,machine,human,ready};});
  return {rows,machine:rows.reduce((n,r)=>n+r.machine,0),human:rows.reduce((n,r)=>n+r.human,0),total:rows.reduce((n,r)=>n+r.machine+r.human,0),ready:rows.filter(r=>r.ready).length,pending:rows.filter(r=>!r.ready).length,baseline:tasks.reduce((n,r)=>n+r.manual,0)};
 }
 function audit(plan){
  const a=calculate(plan);if(!a)return null;
  return {ready:a.ready,pending:a.pending,total:a.total,baseline:a.baseline,comparable:a.pending===0,savedMinutes:a.pending===0?a.baseline-a.total:null,wages:'not-measured',schedule:'not-measured',generalIntelligence:'not-tested',future:'not-verified'};
 }
 // A separate fictional payment experiment. A time audit alone cannot infer wages.
 function settle(plan,rule){
  const a=calculate(plan);if(!a||!['all','original'].includes(rule))return null;
  if(a.pending)return {blocked:true,ready:a.ready,pending:a.pending};
  const originalMinutes=a.rows.filter(r=>r.mode==='manual').reduce((n,r)=>n+r.human,0),reviewMinutes=a.human-originalMinutes;
  const paidMinutes=originalMinutes+(rule==='all'?reviewMinutes:0),unpaidMinutes=a.human-paidMinutes;
  const accounts={firm:20,customer:18,staff:0,system:0},entries=[];
  function pay(from,to,amount,why){if(!Number.isInteger(amount)||amount<0||accounts[from]<amount)throw new Error('Unfunded hidden-work payment');if(!amount)return;accounts[from]-=amount;accounts[to]+=amount;entries.push({from,to,amount,why});}
  pay('firm','staff',paidMinutes,'记入工资的人工');pay('firm','system',a.machine,'系统使用费');pay('customer','firm',18,'三笔合格订单');
  return {blocked:false,rule,human:a.human,total:a.total,ready:a.ready,reviewMinutes,paidMinutes,unpaidMinutes,wages:paidMinutes,systemFee:a.machine,revenue:18,profit:18-paidMinutes-a.machine,accounts,entries,moneyTotal:38};
 }
 const promises=Object.freeze(['下一代系统，所有订单都能搞定！','机器再聪明一点，大家就都不用上班！','面包管够，未来人人都分得到！']);
 function mount(parent){
  let plan=['manual','manual','manual'],promiseIndex=0,promiseOpen=false,audited=false,payRule='all',bill=null;
  const desk=document.createElement('section');desk.className='hidden-work';desk.dataset.testid='hidden-work';parent.appendChild(desk);
  function el(tag,text,box,cls){const n=document.createElement(tag);n.textContent=text;n.className=cls||'';box.appendChild(n);if(root.StreetArt)root.StreetArt.decorateMoney(n);return n;}
  function button(label,next,box){const b=el('button',label,box,'secondary');b.type='button';b.onclick=()=>{const task=b.closest('[data-task]')?.dataset.task;promiseOpen=!!desk.querySelector('.hidden-work-promise')?.open;const before=JSON.stringify(plan);plan=next();if(JSON.stringify(plan)!==before){audited=false;bill=null;}draw();const target=task?desk.querySelector('[data-task="'+task+'"] button'):[...desk.querySelectorAll('button')].find(n=>n.textContent===label);if(target)target.focus({preventScroll:true});else{const result=desk.querySelector('.hidden-work-result');result.tabIndex=-1;result.focus({preventScroll:true});}};return b;}
  function draw(){
   const a=calculate(plan);desk.replaceChildren();desk.dataset.ready=String(a.ready);desk.dataset.minutes=String(a.total);
   el('p','看起来自动了。谁在收尾？',desk,'hidden-work-title');
   const rows=el('div','',desk,'hidden-work-rows');a.rows.forEach((r,i)=>{
    const row=el('div','',rows,'hidden-work-row');row.dataset.task=r.id;row.dataset.mode=r.mode;
    const name=el('div','',row);el('strong',r.name,name);el('small',r.detail,name);
    const status=el('div',r.ready?'可以交付':'还不能交付',row,'hidden-work-status');status.dataset.ready=String(r.ready);
    el('small',r.mode==='manual'?'人工 '+r.human+' 分钟':'系统 '+r.machine+' 分钟'+(r.human?' ＋ 人工 '+r.human+' 分钟':''),status);
    button(r.mode==='manual'?'交给系统':!r.ready?'请人核对':'自己处理',()=>plan.map((v,j)=>j!==i?v:r.mode==='manual'?'auto':!r.ready?'review':'manual'),row);
   });
   const result=el('p','本批 '+a.total+' 分钟 · 全人工 '+a.baseline+' 分钟',desk,'hidden-work-result');result.setAttribute('role','status');
   if(a.pending)el('p','转出去了，还没做完。',desk,'hidden-work-voice');
   const actions=el('div','',desk,'hidden-work-actions');
   button('这批全交给系统',()=>['auto','auto','auto'],actions);
   if(a.pending)button('请人收尾',()=>plan.map((v,i)=>v==='auto'&&tasks[i].review?'review':v),actions);
   button('只自动处理重复订单',()=>['auto','manual','manual'],actions);
   button('验收今天这批',()=>{audited=true;return plan;},actions);
   const future=el('details','',desk,'hidden-work-promise');future.open=promiseOpen;future.ontoggle=function(){if(future.isConnected)promiseOpen=future.open;};el('summary','广告里的未来，今天兑现了多少？',future);
   const poster=el('div','',future,'hidden-work-poster');poster.dataset.claim=String(promiseIndex);el('small','假想广告',poster);el('p',promises[promiseIndex],poster,'hidden-work-slogan');
   const tools=el('div','',future,'hidden-work-actions');
   button('宣传再大胆一点',()=>{promiseIndex=(promiseIndex+1)%promises.length;return plan;},tools);
   if(audited){
    const receipt=audit(plan),auditBox=el('div','',desk,'hidden-work-audit');auditBox.dataset.testid='promise-audit';auditBox.dataset.ready=String(receipt.ready);auditBox.dataset.comparable=String(receipt.comparable);auditBox.dataset.saved=receipt.savedMinutes===null?'unknown':String(receipt.savedMinutes);
    el('strong','本批验收',auditBox);
    const comparison=receipt.savedMinutes>0?'比全人工少'+receipt.savedMinutes+'分钟。':receipt.savedMinutes<0?'比全人工多'+Math.abs(receipt.savedMinutes)+'分钟。':'和全人工一样，没有省时。';
    const status=el('p',receipt.comparable?comparison:'还没做完，不能算省时。',auditBox);status.setAttribute('role','status');
    if(receipt.comparable)payDesk(desk);
   }
   const limits=el('details','',desk,'street-bounds');el('summary','这是任务实验，不是AI测评',limits);
   el('p','三笔假想订单：人工各4分钟；系统各1分钟，后两笔另需人工3、4分钟。核对后才能交付。不核对的速度不能与完整交付的速度直接比较；时间不代表工资或价值量。',limits);
   el('p','这里只演示任务与收尾劳动如何分配，没有模拟模型训练、数据标注、设备维护和照护劳动。不同任务、系统与组织规则会有不同结果。退出或刷新后，本小实验重置；主线存档不变。局部任务省时不证明通用智能已实现，也不自动带来缩短排班。',limits);
   el('p','结算另用假想合同：店里20枚、顾客18枚，员工和系统商各0枚；三笔全部合格才收18枚。每分钟人工记1枚，每笔用系统付1枚，都是教学价格，不是劳动价值量。两种记账口径只比较收尾是否漏付；漏记不代表现实中可以合法不付工资，争议应由合同、劳动法和协商处理。',limits);
   el('p','每次结算从同一起点重算，不重复扣款；改变任务或记账规则会收起旧结算。店里现金不是老板个人钱包，收入也不等于利润。本页没有计入研发、固定设备、税费或完整经济循环；支付变化不表示产权变化，更不能单独称为社会主义。',limits);
   const sources=el('details','',limits);el('summary','文稿线索与研究',sources);
   const video=el('p','学院派Academia，2023年AI讨论约12—22分钟提供“隐形劳动”的追问。机器转写未逐句听校，不把未来预测当成事实。',sources);const va=el('a','查看视频 ↗',video);va.href='https://www.bilibili.com/video/BV1bk4y1e7Jp/';va.target='_blank';va.rel='noreferrer';
   const study=el('p','ILO–NASK（2025）区分任务暴露与实际失业；潜在暴露不等于岗位已被替代。',sources);const sa=el('a','研究原文 ↗',study);sa.href='https://www.ilo.org/publications/generative-ai-and-jobs-refined-global-index-occupational-exposure';sa.target='_blank';sa.rel='noreferrer';
   const agi=el('p','2026年AGI文稿约3:27明确讨论的是叙事作用，不预测AGI是否或何时实现。这里的广告由本作虚构，不冒充任何公司的原话；尚未兑现不等于未来不可能兑现。',sources);const aa=el('a','文稿视频 ↗',agi);aa.href='https://www.bilibili.com/video/BV1X5fgBfEFp/';aa.target='_blank';aa.rel='noreferrer';
   const measure=el('p','NIST AI RMF 1.0（2023）MEASURE 2.1与2.5要求记录测试情境、指标及泛化限制。本作只借用核查思路，不声称完成真实模型评测或框架认证。',sources);const ma=el('a','框架原文 ↗',measure);ma.href='https://airc.nist.gov/airmf-resources/airmf/5-sec-core/';ma.target='_blank';ma.rel='noreferrer';
   const views=el('details','',limits);el('summary','四篇文稿，各在追问什么？',views);let loaded=false;views.ontoggle=function(){if(views.open&&!loaded){loaded=true;root.ResearchReader.mount(views,'',{topics:viewpoints});}};
  }
  function payDesk(parent){
   const section=el('section','',parent,'hidden-work-pay');section.dataset.testid='hidden-work-pay';
   el('p','同样的活，这些工时算工资吗？',section,'hidden-work-pay-title');
   const rules=el('div','',section,'hidden-work-actions');
   [['all','核对也计薪'],['original','只记原岗位']].forEach(([id,label])=>{const b=button(label,()=>{if(payRule!==id){payRule=id;bill=null;}return plan;},rules);b.dataset.payRule=id;b.setAttribute('aria-pressed',String(payRule===id));});
   if(!bill){el('small','假想合同：每分钟人工1枚，系统每笔1枚。三笔合格收18枚。',section);button('照这张工时单结算 →',()=>{bill=settle(plan,payRule);return plan;},section);return;}
   const result=el('div','',section,'hidden-work-pay-result');result.dataset.testid='hidden-work-pay-result';result.dataset.wages=String(bill.wages);result.dataset.unpaid=String(bill.unpaidMinutes);result.setAttribute('role','status');
   const figures=el('dl','',result,'hidden-work-pay-figures');[['实际人工',bill.human+'分钟'],['没记工资',bill.unpaidMinutes+'分钟'],['员工收到',bill.wages+'枚'],['店里结余',bill.accounts.firm+'枚']].forEach(([name,value])=>{const pair=el('div','',figures);el('dt',name,pair);el('dd',value,pair);});
   el('p',bill.unpaidMinutes?'活没消失，只是从工资单上消失了。':'收尾也算工作，工资单终于看见了它。',result,'hidden-work-pay-voice');
   const ledger=el('details','',result);el('summary','逐笔查账',ledger);const names={firm:'店里',customer:'顾客',staff:'员工',system:'系统商'};
   bill.entries.forEach(e=>el('p',names[e.from]+' → '+names[e.to]+'：'+e.amount+'枚 · '+e.why,ledger));
   el('p','开局店里20枚，顾客18枚。销售收入'+bill.revenue+'枚，工资'+bill.wages+'枚，系统费'+bill.systemFee+'枚；本批简化利润'+bill.profit+'枚。总金币仍为38枚。',ledger);
  }
  draw();return desk;
 }
 const viewpoints=Object.freeze([
  {title:'2020：信息不只是帮人干活',pages:['《赛博朋克》约7:16—17:17关注数据、组织和管理如何结合：谁能读取信息、设定指标、获得培训？这是一种批判视角，不是所有数字技术必然消灭人的历史定律。','这里让同样的收尾劳动留下不同工资记录：记录影响分配，但记录不是劳动本身。现实的监控、申诉和协商更复杂，本页没有模拟。\nhttps://www.bilibili.com/video/BV1NK4y1L7gw/']},
  {title:'2023：归谁、藏了谁、能改变什么',pages:['《AI会带来赛博朋克，还是解放全人类？》约1:45—9:52追问技术所有权；9:52—23:22追问隐形劳动与规训；23:47—27:38承认技术能力，并讨论公共所有与基本收入的政治方案。','这三路是作者的组织框架，不是已核实的“学界只有三派”。公共AI、基本收入是作者支持的主张，不是唯一解或必然实现的预言；发钱、开放使用也不自动等于改变所有制。\nhttps://www.bilibili.com/video/BV1bk4y1e7Jp/']},
  {title:'2024：更先进，还要问为了什么',pages:['《科学向善》约0:51—5:18、6:43—8:56和12:02—15:16反对把技术先进直接当成社会进步，强调目的、生态约束、人的主体性和公众参与。','游戏用节能炉比较单位与总能耗；本页比较谁的工作被记录。企业宣传、调查比例及引语不作本局证据，假想数字也不能证明某公司或某制度的实际效果。\nhttps://www.bilibili.com/video/BV1Xb421b74B/']},
  {title:'2026：别把今天交给未来的承诺',pages:['《AGI成为新宗教》3:27明确不预测AGI可行性，约7:28—11:39、30:13—35:26关注未来许诺是否让人推迟今天的行动。这是在分析叙事功能，不是证明AGI不可能。','与2023年的技术解放期待相比，2026年更警惕等待技术替人解决社会关系。本页改变广告不改变交付、工资或产权；实际改变记账规则才改变这份教学账。尚未兑现也不等于以后不能兑现。\nhttps://www.bilibili.com/video/BV1X5fgBfEFp/']},
  {title:'阅读范围与理论边界',pages:['以上是对本地机器稿相关时段的概括，不是逐字引文；未逐句听校，同一作者的不同年份观点不当作研究共识。工资、时间、使用价值和马克思的价值量分别处理。','资本主义基本矛盾不能缩成“有人漏付工资”。这些实验只展示技术怎样嵌入产权、管理和分配关系；合作社、公共服务或基本收入也不能单独代表社会主义国家的制度全貌。']}
 ]);
 root.HiddenWork={calculate,audit,settle,viewpoints,mount};
})(window);
