/* Standalone counterfactuals. Never mutate the story save or its economic accounts. */
(function(root){
 'use strict';
 const SOURCES=[
  {title:'马克思《资本论》第一卷第1章',url:'https://www.marxists.org/archive/marx/works/1867-c1/ch01.htm',note:'使用价值、交换价值、价值与社会必要劳动时间；不是四个可互换的名称。'},
  {title:'马克思《资本论》第一卷第4章',url:'https://www.marxists.org/archive/marx/works/1867-c1/ch04.htm',note:'两种流通目的及资本一般公式；本作的经营现金差不直接命名为剩余价值。'},
  {title:'马克思《资本论》第一卷第8、12、15章',url:'https://www.marxists.org/archive/marx/works/1867-c1/ch08.htm',note:'不变/可变资本按价值增殖作用区分，不按价格是否变化区分。',numericUrl:'https://www.marxists.org/archive/marx/works/1867-c1/ch12.htm'},
  {title:'机器、大工业与劳动强化',url:'https://www.marxists.org/archive/marx/works/1867-c1/ch15.htm',note:'机器的应用、工作日延长与劳动强化。'},
  {title:'固定资本与流动资本',url:'https://www.marxists.org/archive/marx/works/1885-c2/ch08.htm',note:'不同于不变/可变资本的另一分类。'},
  {title:'马克思《资本论》第三卷第13、14章',url:'https://www.marxists.org/archive/marx/works/1894-c3/ch13.htm',note:'利润率趋向下降及反作用因素。下面价值例题与面包店现金账独立。',numericUrl:'https://www.marxists.org/archive/marx/works/1894-c3/ch14.htm'},
  {title:'Bitcoin: A Peer-to-Peer Electronic Cash System',url:'https://bitcoin.org/bitcoin.pdf',note:'摘要、引言和第6节：点对点支付及算力/激励的原始设计，不是当前价格或投资收益证据。'},
  {title:'学院派Academia：资本主义的本质是什么？',url:'https://www.bilibili.com/video/BV1Jt4y1B72f/',note:'机器稿17:35—19:58提供目的与比特币追问，32:25—34:43提供技术/资本构成追问。未经逐句回听；已修正文稿把固定资本与可变资本并列等问题。'}
 ];
 function transfer(accounts,from,to,amount,why,entries){
  if(!Number.isInteger(amount)||amount<0||accounts[from]<amount)throw new Error('Unfunded value-journey payment');
  accounts[from]-=amount;accounts[to]+=amount;entries.push({from,to,amount,why});
 }
 function bakery(p){
  if(!p||!['old','new'].includes(p.machine)||![6,12,24].includes(p.orders)||![2,3].includes(p.price)||!['keep','rest','cut','expand'].includes(p.plan)||!['normal','hurry'].includes(p.pace))return null;
  if(p.machine==='old'&&p.plan!=='keep')return null;
  const workers=p.plan==='cut'?1:p.plan==='expand'?4:2,hours=p.plan==='rest'?3:6,ovens=Math.ceil(workers/2);
  const output=workers*((p.machine==='new'?6:3)+(p.pace==='hurry'?2:0))*hours/6;
  const wages=workers*3,materials=output,machinePurchase=ovens*(p.machine==='new'?12:6),depreciation=ovens*(p.machine==='new'?2:1);
  const sold=Math.min(output,p.orders),unsold=output-sold,revenue=sold*p.price;
  const accounts={firm:72,buyers:72,workers:0,supplier:0,machineMaker:0},entries=[];
  transfer(accounts,'firm','machineMaker',machinePurchase,'购买烤炉',entries);
  transfer(accounts,'firm','workers',wages,'支付工资',entries);
  transfer(accounts,'firm','supplier',materials,'原料与燃料',entries);
  transfer(accounts,'buyers','firm',revenue,'售出面包',entries);
  return {...p,workers,hours,laborHours:workers*hours,ovens,output,wages,materials,machinePurchase,depreciation,
   sold,unsold,revenue,advance:machinePurchase+wages+materials,cashChange:accounts.firm-72,
   profit:revenue-materials-wages-depreciation,machineBook:machinePurchase-depreciation,
   moneyTotal:Object.values(accounts).reduce((a,b)=>a+b,0),accounts,entries};
 }
 function service(p){
  if(!p||![5,10].includes(p.tasks)||![1,4].includes(p.price))return null;
  const affordable=p.price<=2,assisted=affordable?p.tasks:0,accounts={user:2,provider:0},entries=[];
  if(affordable)transfer(accounts,'user','provider',p.price,'本批服务使用权',entries);
  return {...p,affordable,assisted,minutes:50-assisted*3,verification:assisted,accounts,entries,moneyTotal:2};
 }
 function resale(p){
  if(!p||![8,12].includes(p.offer)||!['same','improved'].includes(p.network))return null;
  const accounts={trader:100,firstSeller:0,nextBuyer:160,operator:0},entries=[];
  transfer(accounts,'trader','firstSeller',100,'买入10份虚构资产',entries);
  transfer(accounts,'nextBuyer','trader',10*p.offer,'转售10份',entries);
  transfer(accounts,'trader','operator',2,'退出交易费',entries);
  return {...p,accounts,entries,holdings:{trader:0,firstSeller:0,nextBuyer:10},proceeds:10*p.offer,fee:2,profit:accounts.trader-100,moneyTotal:260};
 }
 function payment(p){
  if(!p||!['same','improved'].includes(p.network)||![0,1,2].includes(p.step)||typeof p.accepts!=='boolean')return null;
  const accounts={guest:2,maker:0,bakery:0},goods={guest:{snack:0,dinner:0},maker:{snack:1,dinner:0},bakery:{snack:0,dinner:1}},entries=[];
  if(p.step>=1){transfer(accounts,'guest','maker',2,'买点心',entries);goods.maker.snack--;goods.guest.snack++;}
  const blocked=p.step===2&&!p.accepts,stage=blocked?1:p.step;
  if(stage===2){transfer(accounts,'maker','bakery',2,'买晚饭',entries);goods.bakery.dinner--;goods.maker.dinner++;}
  return {...p,stage,blocked,accounts,goods,entries,tokenTotal:2};
 }
 function valueRate(c,v,s){
  if(![c,v,s].every(Number.isFinite)||c<0||v<=0||s<0)return null;
  return {c,v,s,composition:c/v,surplusRate:s/v,profitRate:s/(c+v)};
 }
 function spending(a){
  const paid=to=>a.entries.filter(e=>e.from==='firm'&&e.to===to).reduce((n,e)=>n+e.amount,0);
  const tools=paid('machineMaker'),inputs=paid('supplier'),labor=paid('workers');
  return {tools,inputs,means:tools+inputs,labor,total:tools+inputs+labor};
 }
 const BAKERY_KEYS=['machine','orders','price','plan','pace'];
 function bakeryChanges(before,after){return BAKERY_KEYS.filter(k=>before[k]!==after[k]);}
 function mount(parent,start){
  const entry=document.createElement('details');entry.className='value-journey-entry';entry.dataset.testid='value-journey-entry';parent.appendChild(entry);
  const summary=document.createElement('summary');summary.textContent='同一项技术：好用，就一定好卖？';entry.appendChild(summary);
  let ready=false;
  entry.ontoggle=function(){if(!entry.open||ready)return;ready=true;build(entry,start);};
  return entry;
 }
 function build(parent,start){
  let page=start==='ai'?2:0,swap=0,plan={machine:'old',orders:6,price:3,plan:'keep',pace:'normal'},ran=false,
   ai={tasks:5,price:1},aiRun=null,coin={offer:12,network:'same'},intent=null,settled=false,payStep=0,payAccepts=true,conditionsOpen=false,lastRun=null,previousRun=null,spendingNote=null;
  const desk=document.createElement('section');desk.className='value-journey';desk.dataset.testid='value-journey';parent.appendChild(desk);
  function el(tag,text,box,cls){const n=document.createElement(tag);n.textContent=text||'';n.className=cls||'';box.appendChild(n);if(text&&root.StreetArt)root.StreetArt.decorateMoney(n);return n;}
  function money(box,text){const n=el('span',text,box);if(root.StreetArt)root.StreetArt.decorateMoney(n);return n;}
  function button(text,id,fn,box){const b=el('button',text,box,'secondary');b.type='button';b.dataset.valueAction=id;b.onclick=function(){const oldPage=page,wasRan=ran;fn();draw();let next=desk.querySelector('[data-value-action="'+id+'"]');if(next?.closest?.('details:not([open])'))next=null;(next||desk.querySelector('h3')).focus({preventScroll:true});if(page!==oldPage||(ran&&!wasRan))desk.scrollIntoView?.({block:'start'});};return b;}
  function image(src,alt,box){const n=el('img','',box);n.src=src;n.alt=alt;return n;}
  function choices(box,items,active,select){const row=el('div','',box,'value-actions');items.forEach(function(x){const b=button(x[1],x[0],()=>select(x[0]),row);b.setAttribute('aria-pressed',String(x[0]===active));});}
  function facts(box,rows){const list=el('dl','',box,'value-facts');rows.forEach(function(r){const item=el('div','',list);el('dt',r[0],item);money(el('dd','',item),r[1]);});}
  function sources(box,topics){const d=el('details','',box,'value-notes');el('summary','条件、概念与出处',d);let loaded=false;d.ontoggle=function(){if(d.open&&!loaded){loaded=true;root.ResearchReader.mount(d,'',{topics,sources:SOURCES});}};}
  function ledger(box,a){const d=el('details','',box,'value-notes');el('summary','逐笔看钱去了哪',d);
   const names={firm:'店里',buyers:'顾客',workers:'劳动者',supplier:'原料商',machineMaker:'炉厂',trader:'转售者',firstSeller:'原持有人',nextBuyer:'接手者',operator:'服务方',user:'使用者',provider:'服务商'};
   a.entries.forEach(function(x){money(el('p','',d),x.why+'：'+names[x.from]+' → '+names[x.to]+' · '+x.amount+'枚');});
   Object.entries(a.accounts).forEach(function(x){money(el('p','',d),(names[x[0]]||x[0])+'余额 '+x[1]+'枚');});
   if(a.machinePurchase){
    el('p','为卖而买：M—C … 生产 … C′—M₁',d,'value-formula');
    money(el('p','',d),'开局72枚 → 买炉、原料、劳动力 → 生产、卖货 → 店里'+a.accounts.firm+'枚');
    money(el('p','',d),'本批成本 '+(a.materials+a.wages+a.depreciation)+'枚：原料燃料'+a.materials+'＋工资'+a.wages+'＋折旧'+a.depreciation+'。购机款不重复计入本批费用。');
   }
   if(a.holdings)el('p','资产从原持有人经转售者交给接手者；期末接手者有10份，另外两人各0份。资产份数没增加。',d);
   money(el('p','',d),'总金币仍为 '+a.moneyTotal+'枚。不是机器或价格把钱变了出来。');
  }
  function spendingBoard(a){
   const paid=spending(a),box=el('section','',desk,'value-spending');box.setAttribute('aria-label',ran?'本批实际付款的用途':'本批拟付款的用途');
   el('p',ran?'这批已付':'开炉前要先付',box,'value-spending-heading');const row=el('div','',box,'value-spending-cards');
   const means=button('','spending-means',()=>spendingNote=spendingNote==='means'?null:'means',row);means.className='value-spending-card';means.setAttribute('aria-expanded',String(spendingNote==='means'));means.setAttribute('aria-label','机器、原料：'+paid.means+'枚。查看资本分类');
   const art=el('span','',means,'value-spending-art');image(a.machine==='old'?root.TRUST_ASSETS.bakery.emptyOldOven:root.TRUST_ASSETS.bakery.newOven,'',art);
   const sack=el('span','',art);sack.innerHTML='<svg viewBox="0 0 48 58" aria-hidden="true"><g fill="white" stroke="#777" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 13-3-9 27 1-4 9c8 12 11 26 8 39L7 54C3 39 6 25 12 13ZM11 16h23"/><path d="M23 24v20m0-12-7-5m7 12 8-6"/></g></svg>';
   el('span','机器、原料',means);money(el('strong','',means),paid.means+'枚');money(el('small','',means),'炉子'+paid.tools+' + 原料燃料'+paid.inputs+'枚');
   const labor=button('','spending-labor',()=>spendingNote=spendingNote==='labor'?null:'labor',row);labor.className='value-spending-card';labor.setAttribute('aria-expanded',String(spendingNote==='labor'));labor.setAttribute('aria-label','工资：'+paid.labor+'枚。查看资本分类');
   const contract=el('span','',labor,'value-spending-contract');contract.setAttribute('aria-hidden','true');contract.innerHTML='<svg viewBox="0 0 64 74"><g fill="white" stroke="#777" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5h34l10 11-1 51-43 2ZM44 5v13h11M20 28h24M20 36h24M20 44h15M23 55l4-5 3 5 5-3 7 4"/></g></svg>';
   el('span','工资',labor);money(el('strong','',labor),paid.labor+'枚');money(el('small','',labor),a.workers+'人 · 每人3枚');
   if(spendingNote){const note=el('div','',box,'value-spending-note');note.setAttribute('role','status');el('p',spendingNote==='means'?'生产资料 → 不变资本 c。其价值随耗用转移到产品中。':'购买劳动力 → 可变资本 v。活劳动创造新价值；不是买下人。',note);el('small','按《资本论》分类；图中是现金付款，未测算价值量。',note);}
  }
  function comparison(box,a){if(!previousRun)return;const b=previousRun,changes=bakeryChanges(b,a),names={machine:'机器',orders:'订单',price:'售价',plan:'排班',pace:'劳动节奏'};
   const table=el('table','',box,'value-comparison');const caption=el('caption',changes.length===1?'只改'+names[changes[0]]:'这次改变了'+changes.length+'项条件',table);caption.dataset.changed=changes.join(',');
   const head=el('thead','',table),tr=el('tr','',head);['','上次','这次'].forEach(t=>{const th=el('th',t,tr);th.setAttribute('scope','col');});
   const body=el('tbody','',table);[
    ['人数 / 每人工时',b.workers+'人 / '+b.hours+'小时',a.workers+'人 / '+a.hours+'小时'],
    ['工资总额',b.wages+'枚',a.wages+'枚'],
    ['出炉 / 卖出',b.output+' / '+b.sold+'个',a.output+' / '+a.sold+'个'],
    ['经营利润',b.profit+'枚',a.profit+'枚']
   ].forEach(row=>{const r=el('tr','',body),label=el('th',row[0],r);label.setAttribute('scope','row');money(el('td','',r),row[1]);money(el('td','',r),row[2]);});
  }
  function paymentScene(a){
   const path=el('div','',desk,'value-payment-path');path.setAttribute('role','group');path.setAttribute('aria-label','点心买家、你、面包店的实际持币与商品');
   const labels={guest:'点心买家',maker:'你',bakery:'面包店'};
   ['guest','maker','bakery'].forEach((id,i)=>{
    if(i){const arrow=el('span','→',path,'value-payment-arrow');arrow.setAttribute('aria-hidden','true');}
    const cell=el('div','',path,'value-payment-node');cell.dataset.wallet=id;cell.dataset.tokens=String(a.accounts[id]);cell.dataset.snack=String(a.goods[id].snack);cell.dataset.dinner=String(a.goods[id].dinner);cell.dataset.received=String(a.stage===(i===1?1:i===2?2:-1));
    el('span',labels[id],cell);el('strong','₿ '+a.accounts[id],cell);
    const bag=el('div','',cell,'value-payment-goods');
    if(a.goods[id].snack){const snack=el('span','',bag,'value-snack');snack.setAttribute('role','img');snack.setAttribute('aria-label','一份点心');snack.innerHTML='<svg viewBox="0 0 50 42" aria-hidden="true"><path d="M5 15Q6 6 25 6Q44 5 45 15L41 34H9Z" fill="#fff" stroke="#777" stroke-width="2.2" stroke-linejoin="round"/><path d="m14 13 3 8m9-9 1 8m9-7-2 8M9 27h33" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round"/></svg>';}
    if(a.goods[id].dinner)image(root.TRUST_ASSETS.bakery.bread,'一份晚饭',bag);
    if(!a.goods[id].snack&&!a.goods[id].dinner){const empty=el('span','—',bag);empty.setAttribute('aria-label','还没有商品');}
   });
   el('p',a.blocked?'店家不收。币还在，晚饭没买到。':a.stage===0?'先卖点心，换来付款用的币。':a.stage===1?'币到手了，晚饭还没到。':'币换走了，晚饭换来了。',desk,'value-result');
   if(a.stage<2){
    choices(desk,[['accept','店家愿意收币'],['refuse','店家不收币']],payAccepts?'accept':'refuse',id=>{payAccepts=id==='accept';if(payStep===2)payStep=1;});
    button(a.stage===0?'卖点心，收2份币 →':'付2份币，买晚饭 →','pay-step',()=>payStep=a.stage+1,desk);
   }else button('从同一起点，再换个条件 ↺','pay-reset',()=>payStep=0,desk);
   el('small','付款等待：'+(a.network==='improved'?'假设缩短':'原样'),desk,'value-payment-status');
   const d=el('details','',desk,'value-notes');el('summary','这两笔付款',d);
   a.entries.forEach(e=>el('p',e.why+'：'+labels[e.from]+' → '+labels[e.to]+' · '+e.amount+'份币',d));
   if(!a.entries.length)el('p','尚未成交。',d);
   el('p','本场合计仍为2份币、1份点心、1份晚饭。币在三人间转移，不是凭空增发。这里没有现实支付、真实行情或链上交易。',d);
  }
  function draw(){
   desk.replaceChildren();desk.dataset.page=String(page);const titles=['钱是中转站，还是终点？','炉子跑得快，回款跟得上吗？','AI更能干，使用费就更贵？','买它，是为了什么？'];
   const heading=el('h3',titles[page],desk);heading.tabIndex=-1;
   if(page===0){
    el('p','你养鸡，想换今天的晚饭。面包店不收鸡蛋，只收钱。',desk,'value-prompt');
    const path=el('div','',desk,'value-path');['鸡蛋 C','金币 M','晚饭 C₁'].forEach(function(x,i){const n=el('span',x,path,i<=swap?'arrived':'waiting');if(i<2)el('i','→',path);});
    const scene=el('div','',desk,'value-scene');image(root.TRUST_ASSETS.bakery.bread,'想换来的面包',scene);
    el('p',swap===0?'先卖点鸡蛋。':swap===1?'钱到手了。别把晚饭忘了。':'换来晚饭，今天这趟交换到此为止。',desk,'value-result');
    if(swap<2)button(swap===0?'卖鸡蛋，收到2枚':'付2枚，买晚饭','swap',()=>swap++,desk);
    sources(desk,[{title:'这条路径说明什么？',pages:[
     '通常写 C—M—C。这里用 C₁ 区分最后买到的不同使用价值；目的在满足需要，而不是货币必须增加。示意设定鸡蛋买家原有2枚，钱交给养鸡人，再交给面包卖家，鸡蛋与面包各转移一次。没有凭空新增金币。',
     '雇员不是拿走店里的面包去出售。他出售劳动力、取得工资，再购买生活资料。本页养鸡者拥有自己的鸡蛋，不能拿这条商品路径直接冒充雇员的产权。',
     '使用价值是具体用途，不等于抽象的“社会善”。交换价值首先表现为商品之间的交换比例；价值在马克思理论中与社会必要劳动时间有关，价格是货币表现，可能偏离价值。售价、收入、节约成本和利润不是交换价值的四个别名。'
    ]}]);
   }
   if(page===1){
    const a=bakery(plan),scene=el('div','',desk,'value-scene');image(plan.machine==='old'?root.TRUST_ASSETS.bakery.emptyOldOven:root.TRUST_ASSETS.bakery.newOven,plan.machine==='old'?'老烤炉':'新烤炉',scene);
    facts(scene,[['这批能做',a.output+'个'],['人数 / 每人工时',a.workers+'人 / '+a.hours+'小时']]);
    spendingBoard(a);
    const setup=el(ran?'details':'div','',desk,ran?'value-notes value-setup':'value-setup');if(ran)el('summary','改机器、排班和订单，再试一批',setup);
    choices(setup,[['old','老炉'],['new','换快炉']],plan.machine,id=>{plan={...plan,machine:id,plan:'keep'};ran=false;});
    if(plan.machine==='new')choices(setup,[['keep','照常干'],['rest','缩时不减薪'],['cut','减一人'],['expand','添炉招两人']],plan.plan,id=>{plan={...plan,plan:id};ran=false;});
    const conditions=el('details','',setup,'value-notes');conditions.open=conditionsOpen;conditions.ontoggle=function(){if(conditions.isConnected)conditionsOpen=conditions.open;};el('summary','换订单和竞争条件',conditions);
    choices(conditions,[['6','6份订单'],['12','12份订单'],['24','24份订单']],String(plan.orders),id=>{plan={...plan,orders:Number(id)};ran=false;});
    choices(conditions,[['3','售价3枚'],['2','同行跟进，试卖2枚']],String(plan.price),id=>{plan={...plan,price:Number(id)};ran=false;});
    choices(conditions,[['normal','正常节奏'],['hurry','催快一点']],plan.pace,id=>{plan={...plan,pace:id};ran=false;});
    money(el('p','',setup,'value-caption'),'本次订单'+a.orders+'份 · 单价'+a.price+'枚');
    button(ran?'重算同一批':'付款、开炉、卖货 →','run',()=>{const result=bakery(plan);if(!lastRun||bakeryChanges(lastRun,result).length){previousRun=lastRun;lastRun=result;}ran=true;},setup);
    if(ran){
     const out=el('section','',desk,'value-receipt');out.setAttribute('role','status');out.dataset.profit=String(a.profit);
     const tray=el('div','',out,'value-bread-tray');tray.setAttribute('aria-hidden','true');for(let i=0;i<a.output;i++){const loaf=image(root.TRUST_ASSETS.bakery.bread,'',tray);loaf.dataset.sold=String(i<a.sold);loaf.style.setProperty('--loaf-i',String(i));}
     if(!previousRun)facts(out,[['卖出 / 剩下',a.sold+' / '+a.unsold+'个'],['销售收入',a.revenue+'枚'],['经营利润',a.profit+'枚']]);
     const effect=plan.pace==='hurry'?'这回多做，靠的是催人。':plan.plan==='rest'?'工资没减，少干半天。':plan.plan==='cut'?'少一份工资，也少一人的收入。':plan.plan==='expand'?'机器更省工，人手却从2人增到4人。':'';
     el('p',effect||(a.unsold?'多做了，不等于多卖了。':a.profit>0?'卖完了，这批也赚到了。':'忙一趟，不一定赚一趟。'),out,'value-result');
     comparison(out,lastRun);
     ledger(out,a);
    }
    sources(desk,[{title:'钱、货、利润分开',pages:[
     '所有数值都是本实验假设。店里72枚、顾客72枚，其他账户起点0；每次从相同起点重算，不继承15枚演示或街区账本。顾客有足额预算，订单是条件，不是由这一页家庭工资内生决定。旧炉6枚，新炉12枚；两名工人每人每天工资3枚，原料燃料每个面包1枚。',
     '旧炉两人6小时做6个；新炉两人6小时做12个。缩时方案两人3小时做6个、工资不减；减员方案一人6小时做6个；扩产方案两台炉、四人6小时做24个。催快另设每人每6小时多做2个，劳动强度和技术效率不是同一变量，未估计健康代价或长期可持续性。',
     '旧炉本批折旧1枚，新炉每台2枚，未售面包当晚报损，所以本批原料全部进入费用。利润＝销售收入－原料燃料－工资－折旧。购机款是现金支出而不是再扣一次当期费用；期末机器账面存量仍在。店里现金变化不等于利润。这里不直接用经营利润代替剩余价值。',
     'M—C—M₁：这里的M₁对应通常写法M′，资本以回到更多货币为目标，但实际可能亏损。生产企业中间要展开买生产资料、买劳动力、生产、销售，不是仅靠低买高卖。机器和剩货不算已经实现的货币收益。机器尚未用完，这一批的现金余额不是整个预付资本循环的增殖量。',
     '老炉/新炉的购置成交价是设备的交换表现；面包售价是产品的交换表现，不能混成一种东西。同行跟进不自动降价，本页的2枚是主动设定的竞争条件。技术普及对社会必要劳动时间、价值与价格的影响，不能仅用一家店的账来证明。'
    ]},{title:'钱投向了什么：c 与 v',pages:[
     '购买烤炉、原料与燃料，属于投向生产资料的资本，即不变资本c；购买劳动力的部分为可变资本v，通常表现为工资支付。劳动者本人不是一笔资本。“可变”不是工资经常改，“不变”不是机器永远不更新。',
     '在马克思价值理论中，生产资料的价值随耗用转移到产品中；机器可提高实物效率，却不在使用过程中独立创造新增价值。劳动力的使用即活劳动，在劳动过程中创造新价值。这是理论分类，本页现金账没有计算严格的c、v、s价值量。',
     '固定/流动与不变/可变是不同分类：机器通常是固定的不变资本，原料是流动的不变资本；购买劳动力的资本为流动部分。文稿32:25把“固定资本与可变资本”并列，本作不照搬。',
     '独立价值例题：忽略周转等差异，设s/v＝1。c＝80、v＝20、s＝20，p′＝s/(c＋v)＝20%；改为c＝180、v＝20、s＝20，p′＝10%。若c＝80、v＝20而s增至30，则p′＝30%。条件变化可以抵消原方向；利润率与利润总量不同。这些不是面包店的现金或现实预测。',
     '谁有权换炉、裁员、定排班，取决于产权、合同、劳动法与协商。本页假设老板提出方案且能在该批执行，不代表现实企业毫无约束。机器化与劳动强化可能并存，《资本论》第一卷第15章已经讨论，并非马克思“没有想到”。'
    ]}]);
   }
   if(page===2){
    const a=aiRun;
    const scene=el('div','',desk,'value-scene');const screen=el('div','AI',scene,'value-screen');screen.setAttribute('aria-label','同一项辅助服务');
    facts(scene,a?[['你的余额',a.accounts.user+'枚'],['服务商收到',a.accounts.provider+'枚']]:[['你的预算','2枚']]);
    choices(desk,[['1','使用费1枚'],['4','使用费4枚']],String(ai.price),id=>{if(ai.price!==Number(id)){ai={...ai,price:Number(id)};aiRun=null;}});
    choices(desk,[['5','原功能：辅助5项'],['10','改进：辅助10项']],String(ai.tasks),id=>{if(ai.tasks!==Number(id)){ai={...ai,tasks:Number(id)};aiRun=null;}});
    button(a?'从同一起点再做 ↺':'做这批任务 →','ai-run',()=>{aiRun=service(ai);},desk);
    if(a){
     const result=el('section','',desk,'value-receipt');result.dataset.testid='value-ai-result';result.dataset.assisted=String(a.assisted);result.setAttribute('role','status');
     el('p',a.affordable?'核对完成，这批用了'+a.minutes+'分钟。':'付不起，只能自己做：50分钟。',result,'value-result');ledger(result,a);
    }
    sources(desk,[{title:'服务、用途与使用权',pages:[
     '假想服务，无真实品牌性能数据。人工做10项，每项5分钟；服务辅助一项需1分钟生成、1分钟人工核对，未覆盖的仍人工完成。功能5/10和收费1/4为独立设定，合格交付标准相同。每次起点用户有2枚、服务商0枚；点做任务且买得起才付款，不赊账。改选项不是成交，重试也不累计扣费。',
     '同一服务帮助完成并核对任务，是它的具体用途，即使用价值。使用费是其交易价格，不直接当作严格价值量；标价不是已经收到的钱。实际销售收入来自本次付款，未计服务商研发、算力、运维或用户培训，所以不计算利润，也不推算失业率和工资。',
     '服务使用权不等于模型、数据或算力所有权；一次变便宜也不等于产权已经公有化。开源许可证、部署成本和订阅条件各不相同。本页不调用模型、不发送数据，也不把任务自动化比例当作岗位替代比例。',
     '文稿2023年的幕后劳动追问，与2026年的AGI叙事追问提醒我们：核对实际完成了什么，不以“未来全自动”代替眼下交付。它们提供问题，不证明此处虚构的时间参数或未来AGI可行性。'
    ]}]);
   }
   if(page===3){
    const scene=el('div','',desk,'value-scene');el('div','₿',scene,'value-screen');
    choices(desk,[['pay','我想用它付款'],['resell','我想以后卖贵些']],intent,id=>{intent=id;settled=false;});
    choices(desk,[['same','付款功能不变'],['improved','假设付款等待缩短']],coin.network,id=>{coin={...coin,network:id};settled=false;});
    if(intent==='pay'){
     paymentScene(payment({network:coin.network,step:payStep,accepts:payAccepts}));
    }else if(intent==='resell'){
     choices(desk,[['12','预期有人按12接手'],['8','预期只肯按8接手']],String(coin.offer),id=>{coin={...coin,offer:Number(id)};settled=false;});
     if(!settled)el('p','买入10份需100枚。',desk,'value-caption');
     button('按这个假设成交，看回款','settle',()=>settled=true,desk);
     if(settled){const a=resale(coin);facts(desk,[['转售收入',a.proceeds+'枚'],['退出交易费',a.fee+'枚'],['最终现金',a.accounts.trader+'枚'],['差额',a.profit+'枚']]);
      el('p','付款功能'+(coin.network==='same'?'没变':'改善了')+'，转售却'+(a.profit>0?'赚了。':'亏了。'),desk,'value-result');ledger(desk,a);}
    }
    sources(desk,[{title:'为什么文稿在这里提比特币？',pages:[
     '依据文稿17:35—19:58的顺序，本作将其读作“钱从交换手段变成追求目标”的强调例子，不是所有持币者动机的调查。你可以同时看重支付与转售；也可能技术改善而价格下降。此处选择表示你的场景目标，不替现实参与者贴好坏标签。',
     '付款实验：点心买家原有2份币，你有1份点心，面包店有1份晚饭。先卖点心收2份币，再在店家接受时付2份币买晚饭；拒收时币和晚饭均不转移。份数不是实际BTC数量或市价，本场忽略费用、兑换及确认风险；等待缩短是独立反事实设定，不改变币和商品数量。',
     '另一本转售账：转售者100枚、原持有人0枚、接手者160枚、服务方0枚；买10份，每份10枚，再按每份8或12枚卖出，退出费2枚，入场不收费用。全部是假想成交，不用实时行情，不建议投资。报价在成交前不是收入，用户可改条件重试。两种目的的账本独立，不把币份数当成金币。',
     '比特币网络、持有的币、矿机和挖矿服务不是同一对象。白皮书提出点对点电子支付目标，并讨论算力、电力和激励；它不证明现价合理，也不决定比特币在马克思价值理论中的无争议分类。本页用货币→资产→货币类比增殖目的，不宣称资产就是通常生产商品。',
     '差价有支付对手方，不直接等于全社会新增财富或生产中的剩余价值；有人获利也不能单独证明他制造了危机。现实还涉及交易失败、价格与托管风险、税费、能源等，本页未模拟，不能据此判断比特币没有用途或必然升值。',
     '回到技术方向：当预期转售收益变动而功能不变，投资理由也可能改变。投入资源是在改善用途、扩大可及性，还是争取转售差价？本页提出这个问题，不用预设答案替代对实际研发与资源配置的研究。'
    ]}]);
   }
   const nav=el('nav','',desk,'value-navigation');nav.setAttribute('aria-label','用途与回款实验切换');const back=button('← 上一个','back',()=>{page--;},nav);back.disabled=page===0;el('span',(page+1)+' / 4',nav);
   const next=button(page===3?'回到开头 ↩':'下一个 →','next',()=>{page=page===3?0:page+1;},nav);next.className='secondary';
  }
  draw();return desk;
 }
 root.ValueJourney={bakery,service,resale,payment,valueRate,spending,bakeryChanges,mount};
})(window);
