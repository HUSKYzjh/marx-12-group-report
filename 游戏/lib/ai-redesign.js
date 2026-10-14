(function(root){
 'use strict';
 const goals={expand:'继续多做',rest:'早点收工',replace:'少排两个人'};
 function day(goal){
  if(!Object.hasOwn(goals,goal))return null;
  const output=goal==='expand'?16:8,working=goal==='replace'?2:4,hours=goal==='rest'?2:4,wages=working*3;
  const accounts={firm:60,buyers:24,workers:0,supplier:0},entries=[];
  function pay(from,to,amount,why){accounts[from]-=amount;accounts[to]+=amount;entries.push({from,to,amount,why});}
  pay('firm','supplier',6,'购机');pay('firm','supplier',output,'原料');pay('firm','workers',wages,'工资');pay('buyers','firm',24,'8份已付款订单');
  return {goal,output,sold:8,stock:output-8,working,hours,wages,accounts,entries,total:84};
 }
 function permission(rule,role,crewSigned){
  if(!['owner','joint'].includes(rule)||!['chef','owner'].includes(role))return null;
  return rule==='owner'?(role==='owner'?'apply':'pending'):(role==='chef'?'sign':crewSigned?'apply':'needs-crew');
 }
 function bridge(plan){
  if(!plan||!Object.hasOwn(goals,plan.goal)||![0,2].includes(plan.adopt)||![0,2].includes(plan.start)||![0,6,12].includes(plan.reserve))return null;
  const accounts={firm:60,fund:0,supplier:0,shop:0,workers:[3,3,3,3]},entries=[],days=[];
  function transfer(from,to,amount,why,day){
   const get=k=>typeof k==='number'?accounts.workers[k]:accounts[k];
   if(!Number.isInteger(amount)||amount<0||get(from)<amount)throw new Error('Unfunded transition');
   if(typeof from==='number')accounts.workers[from]-=amount;else accounts[from]-=amount;
   if(typeof to==='number')accounts.workers[to]+=amount;else accounts[to]+=amount;
   if(amount)entries.push({from,to,amount,why,day});
  }
  transfer('firm','fund',plan.reserve,'先留过渡金',-1);
  for(let d=0;d<3;d++){
   if(d===plan.adopt)transfer('firm','supplier',6,'购机',d);
   const replaced=plan.goal==='replace'&&d>=plan.adopt;
   const people=accounts.workers.map((_,i)=>{
    const wage=replaced&&i>=2?0:3;
    if(wage)transfer('firm',i,wage,'工资',d);
    const support=!wage&&d>=plan.start?Math.min(3,accounts.fund):0;
    if(support)transfer('fund',i,support,'过渡支持',d);
    const spent=Math.min(3,accounts.workers[i]);transfer(i,'shop',spent,'当天生活开支',d);
    return {id:i,wage,support,spent,gap:3-spent,balance:accounts.workers[i],hours:wage?(d<plan.adopt?4:plan.goal==='rest'?2:4):0};
   });
   days.push({day:d,adopted:d>=plan.adopt,people,gap:people.reduce((s,p)=>s+p.gap,0),fund:accounts.fund,firm:accounts.firm});
  }
  return {plan:{...plan},days,entries,accounts,gap:days.reduce((s,d)=>s+d.gap,0),total:Object.values(accounts).reduce((s,v)=>s+(Array.isArray(v)?v.reduce((a,b)=>a+b,0):v),0)};
 }
 function mount(parent){
  let step=0,draft='expand',trial=null,active='expand',proposal='rest',role='chef',rule='owner',signed=false,message='',adopt=0,start=2,reserve=12,result=null;
  const desk=document.createElement('section');desk.className='ai-redesign';desk.dataset.testid='ai-redesign';parent.appendChild(desk);
  function el(tag,text,box,cls){const n=document.createElement(tag);n.textContent=text;n.className=cls||'';box.appendChild(n);root.StreetArt?.decorateMoney(n);return n;}
  function button(text,box,fn,selected){const b=el('button',text,box,'secondary');b.type='button';if(selected!==undefined)b.setAttribute('aria-pressed',String(selected));b.onclick=()=>{const before=step;fn();draw();const target=before===step?[...desk.querySelectorAll('button')].find(n=>n.textContent===text):null;if(target)target.focus({preventScroll:true});else{const heading=desk.querySelector('h3');heading.tabIndex=-1;heading.focus({preventScroll:true});}};return b;}
  function figures(rows,box){const dl=el('dl','',box,'ai-redesign-figures');rows.forEach(([key,value])=>{const pair=el('div','',dl);el('dt',key,pair);el('dd',String(value),pair);});}
  function personArt(working,worried){
   const a=root.TRUST_ASSETS?.bakery;if(!a)return '';
   function layer(url,atlas,key){const f=atlas.frames[key].frame;return '<svg viewBox="'+[f.x+24,f.y+34,72,108].join(' ')+'" aria-hidden="true"><image href="'+url+'" width="'+atlas.meta.size.w+'" height="'+atlas.meta.size.h+'"/></svg>';}
   const face=worried?a.nervous:a.face,atlas=worried?a.nervousAtlas:a.faceAtlas,key=worried?(atlas.frames.face_nervous0008?'face_nervous0008':Object.keys(atlas.frames)[0]):'face0000';
   return '<span class="ai-redesign-peep">'+layer(a.body,a.bodyAtlas,'body0000')+layer(face,atlas,key)+(working?'<img class="ai-redesign-hat" src="'+a.chefHat+'" alt="">':'')+'</span>';
  }
  function choices(box,current,fn){Object.entries(goals).forEach(([id,label])=>button(label,box,()=>fn(id),current===id));}
  function draw(){
   desk.replaceChildren();desk.dataset.step=String(step);desk.dataset.goal=active;
   el('small',(step+1)+' / 3',desk);
   el('h3',['机器为了什么而忙？','谁能修改安排？','保障赶得上变化吗？'][step],desk);
   if(step===0){
    el('p','机器要资金、设备和平台。怎样让它服务更多人的需要？',desk);
    const scene=el('div','',desk,'ai-redesign-scene');
    if(root.TRUST_ASSETS){const oven=el('img','',scene,'ai-redesign-oven');oven.src=root.TRUST_ASSETS.bakery.newOven;oven.alt='同一台新烤炉';}
    const crew=el('div','',scene,'ai-redesign-crew');for(let i=0;i<4;i++){const working=!trial||i<trial.working,p=el('div','',crew);p.innerHTML=personArt(working,!working);p.setAttribute('aria-label','小'+(i+1)+(working?'在岗':'未排班'));}
    const options=el('div','',desk,'ai-redesign-actions');choices(options,draft,id=>{draft=id;trial=null;});
    el('small','同一新炉6枚；每人每天3枚，原料每份1枚。今天有8份订单，每份3枚。',desk);
    button('试一天 →',desk,()=>{trial=day(draft);active=draft;});
    if(trial){
     const box=el('div','',desk,'ai-redesign-result');box.dataset.testid='redesign-goal-result';
     const loaves=el('div','',box,'ai-redesign-loaves');loaves.setAttribute('aria-label',trial.sold+'份售出，'+trial.stock+'份留下');
     if(root.TRUST_ASSETS)for(let i=0;i<trial.output;i++){const loaf=el('img','',loaves);loaf.src=root.TRUST_ASSETS.bakery.bread;loaf.alt='';loaf.dataset.sold=String(i<trial.sold);}
     figures([['做出 / 卖出',trial.output+' / '+trial.sold],['在岗 / 每人工时',trial.working+'人 / '+trial.hours+'小时'],['发出工资',trial.wages+'枚'],['剩货',trial.stock+'份']],box);
     el('p',trial.stock?'炉子更忙了，面包却还没找到买家。':trial.goal==='rest'?'同样的工资，早点回家。':'店里少付了工资，两个人没了这份收入。',box,'ai-redesign-voice');
     button('安排是谁定的？ →',desk,()=>{step=1;proposal=active==='rest'?'expand':'rest';});
    }
   }else if(step===1){
    el('p','机器会照做。你说的，算不算？',desk);
    const roles=el('div','',desk,'ai-redesign-actions');button('我是厨师',roles,()=>{role='chef';message='';},role==='chef');button('我是老板',roles,()=>{role='owner';message='';},role==='owner');
    const rules=el('div','',desk,'ai-redesign-actions');button('老板拍板',rules,()=>{rule='owner';signed=false;message='';},rule==='owner');button('共同审批',rules,()=>{rule='joint';signed=false;message='';},rule==='joint');
    const options=el('div','',desk,'ai-redesign-actions');choices(options,proposal,id=>{proposal=id;signed=false;message='';});
    el('small','共同审批：厨师先签，老板再确认；这里只换章程，不改变产权。',desk);
    el('p','正在执行：'+goals[active],desk,'ai-redesign-active');
    button(role==='chef'?'提交安排 →':'确认安排 →',desk,()=>{
     const outcome=permission(rule,role,signed);
     if(outcome==='apply'){active=proposal;message='安排改了。机器的本事没有变。';result=null;}
     else if(outcome==='sign'){signed=true;message='厨师签了，还需要老板确认。';}
     else message=outcome==='pending'?'意见交上去了，规则还没有变。':'还缺厨师的同意，不能跳过。';
    });
    if(message){const line=el('p',message,desk,'ai-redesign-voice');line.setAttribute('role','status');}
    button('照现有安排，往后看 →',desk,()=>{step=2;result=null;});
   }else{
    el('p','机器明天能上岗。饭钱能不能跟上？',desk);
    el('small','继续采用：'+goals[active]+'。只看收入过渡，不重复上一步的销售账。',desk);
    const timing=el('div','',desk,'ai-redesign-actions');button('明天换机',timing,()=>{adopt=0;result=null;},adopt===0);button('等两天再换',timing,()=>{adopt=2;result=null;},adopt===2);
    const support=el('div','',desk,'ai-redesign-actions');button('支持明天到账',support,()=>{start=0;result=null;},start===0);button('两天后到账',support,()=>{start=2;result=null;},start===2);
    const fund=el('div','',desk,'ai-redesign-actions');[0,6,12].forEach(n=>button('先留'+n+'枚',fund,()=>{reserve=n;result=null;},reserve===n));
    el('small','从店里的60枚中先留过渡金。每人原有3枚，每天生活要3枚；停薪者每天最多补3枚，用完即止。换机另付6枚。',desk);
    button('看到支持能到账的那天 →',desk,()=>{result=bridge({goal:active,adopt,start,reserve});});
    if(result){
     const timeline=el('div','',desk,'ai-redesign-days');result.days.forEach(d=>{
      const row=el('section','',timeline,'ai-redesign-day');el('strong',['明天','后天','第三天'][d.day]+(d.adopted?' · 新机':' · 旧机'),row);
      const crew=el('div','',row,'ai-redesign-crew');d.people.forEach(p=>{
       const person=el('div','',crew);person.dataset.gap=String(p.gap);person.dataset.testid='redesign-person';
       person.innerHTML=personArt(p.wage>0,p.gap>0);
       el('small','小'+(p.id+1),person);el('span',p.wage?'工资 '+p.wage:p.support?'支持 '+p.support:'收入 0',person);el('small',p.gap?'生活还差'+p.gap+'枚':'生活付清',person);
      });
     });
     const gap=result.gap,missedWage=result.days.some(d=>d.people.some(p=>p.wage===0));
     const voice=el('p',!missedWage?'这次没有停薪；不能据此推断所有转型都一样。':gap?'收入先断了，生活开支没等人。':'安排变了，收入和生活接上了。',desk,'ai-redesign-voice');voice.setAttribute('role','status');
     figures([['三天未付生活开支',gap+'枚'],['店里 / 过渡金',result.accounts.firm+' / '+result.accounts.fund+'枚']],desk);
     el('p','改机器，也要看目标、决定权和过渡安排。',desk);
     const book=el('details','',desk);el('summary','逐笔查账',book);const names={firm:'店里',fund:'过渡金',supplier:'设备商',shop:'生活商品店'};
     result.entries.forEach(e=>el('p',(e.day<0?'准备':e.day+1+'日')+' · '+(names[e.from]||'小'+(e.from+1))+' → '+(names[e.to]||'小'+(e.to+1))+'：'+e.amount+'枚 · '+e.why,book));
     el('p','全体余额合计'+result.total+'枚。未付生活开支不是已经借到的债，也没有凭空补钱。',book);
    }
   }
   const nav=el('div','',desk,'ai-redesign-actions');if(step>0)button('← 改前面的安排',nav,()=>{step--;message='';});
   const bounds=el('details','',desk,'street-bounds');el('summary','这个实验省略了什么？',bounds);
   el('p','三个小对照，不是完整宏观模型。第一步：店里60、买家24，订单固定且可付款，购机、原料、工资均实际转账；现金不等于净利润。第二步：操作身份与教学章程决定审批，提议不自动生效；公有或私有都不能代替具体治理规则。第三步从独立起点重算：店里60、四人各3，三天工资与过渡金从现有钱包支付，换机付设备商6；没有纳入销售、原料、税费、培训或政府财政，不据此判断企业存续。每次重试不累计扣款，退出后重置，主线存档不变。',bounds);
   el('p','改写自学院派Academia《AI会带来赛博朋克，还是解放全人类？》约27:19—28:37的三个追问。机器稿未逐句听校，本作改写不是引文。这里的安排由人设定，系统没有自我意识；基本收入、公共AI也不是无条件充分的解放方案。',bounds);
   const a=el('a','文稿视频 ↗',bounds);a.href='https://www.bilibili.com/video/BV1bk4y1e7Jp/';a.target='_blank';a.rel='noreferrer';
  }
  draw();return desk;
 }
 root.AIRedesign={day,permission,bridge,mount};
})(window);
