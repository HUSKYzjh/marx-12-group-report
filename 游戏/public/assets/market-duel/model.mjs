// Short, closed two-bakery teaching model. This is not the six-shop economy,
// a calibrated forecast, a profit measure, or a proof of inevitable crisis.
export const TOTAL_COINS = 120;
export const DAYS = 6;
export const STRATEGIES = {
  mirror: {name:'学人精',rule:'照着你上一天的工资和售价学。第一天照旧。'},
  bargain: {name:'抢客王',rule:'有剩货就尝试降价；资金紧时尝试少发工资。'},
  steady: {name:'老熟人',rule:'有余力时发3金币工资；不足时尽量保住原工资。'},
};
const clone = value => structuredClone(value);
const integer = value => Number.isInteger(value) && value >= 0;
export function initialDuel(strategy='mirror',seed=17) {
  if(!STRATEGIES[strategy] || !integer(seed)) throw new Error('Invalid start');
  return {version:1,seed,strategy,day:0,
    firms:[0,1].map(id=>({id,cash:36,wage:2,price:3,ovens:1,bread:[],debt:0})),
    people:Array.from({length:11},(_,id)=>({id,cash:id<8?6:0,home:id<8?Math.floor(id/4):id<10?id-8:null,role:id<8?'worker':id<10?'owner':'supplier'})),
    history:[]};
}
export const AUTOMATION_PLANS=['off','more','rest','cut','share'];
// A separate version keeps all previously played version-1 paths replayable.
export function initialTechnologyDuel(strategy='mirror',seed=17){
 const s=initialDuel(strategy,seed);s.version=2;
 for(const f of s.firms){f.robot=false;f.automation='off';}
 return s;
}
const production=o=>6*o.ovens*(o.automation==='more'?2:1);
const workersPaid=o=>o.automation==='cut'||o.automation==='share'?2:4;
export const moneyTotal = s => s.firms.reduce((n,f)=>n+f.cash,0)+s.people.reduce((n,p)=>n+p.cash,0);
export function currentOffer(s,id=0) {
  const f=s.firms[id];return {wage:f.wage,price:f.price,ovens:f.ovens,...(s.version===2?{automation:f.automation}:{})};
}
export function offerCost(s,offer,id=0) {
  const f=s.firms[id];return workersPaid(offer)*offer.wage+(offer.automation==='share'?2*offer.wage:0)+Math.ceil(production(offer)/4)+8*(offer.ovens-f.ovens)+f.debt+(s.version===2&&!f.robot&&offer.automation!=='off'?8:0);
}
function validOfferShape(s,offer,id=0) {
  const f=s?.firms?.[id];return !!f&&!!offer&&[offer.wage,offer.price,offer.ovens].every(Number.isInteger)&&offer.wage>=1&&offer.wage<=4&&offer.price>=1&&offer.price<=4&&offer.ovens>=f.ovens&&offer.ovens<=Math.min(3,f.ovens+1)&&
   (s.version===2?AUTOMATION_PLANS.includes(offer.automation)&&(!f.robot||offer.automation!=='off')&&(s.day>=2||offer.automation==='off'):offer.automation===undefined);
}
export function offerIssue(s,offer,id=0) {
  const f=s?.firms?.[id];
  if(!validOfferShape(s,offer,id)) return '这张安排不成立。';
  if(offerCost(s,offer,id)>f.cash) return '按这个安排，今天付不起工资和开炉的钱。';
  return '';
}
function affordable(s,preferred,id) {
  if(!offerIssue(s,preferred,id))return preferred;
  const f=s.firms[id];
  for(let wage=Math.min(preferred.wage,f.wage);wage>=1;wage--) {
    const p={...preferred,wage,ovens:f.ovens};if(!offerIssue(s,p,id))return p;
  }
  // Installing is a funded purchase, not compulsory when a rival copies it.
  if(s.version===2&&!f.robot&&preferred.automation!=='off')return affordable(s,{...preferred,automation:'off',ovens:f.ovens},id);
  return null; // A shutdown is visible, not an unannounced subsidy or wage payment.
}
export function rivalOffer(s) {
  const old=currentOffer(s,1),f=s.firms[1];
  if(s.strategy==='mirror') {
    const last=s.history.at(-1)?.offers[0];
    return affordable(s,last?{...old,wage:last.wage,price:last.price,...(s.version===2?{automation:last.automation==='off'&&f.robot?f.automation:last.automation}:{})}:old,1);
  }
  if(s.strategy==='bargain')return affordable(s,{...old,price:Math.max(1,f.price-(f.bread.length>0?1:0)),wage:Math.max(1,f.wage-(f.cash<4*f.wage*3?1:0))},1);
  return affordable(s,{...old,wage:f.cash>=4*3*3?3:f.wage},1);
}
function accounts(s,key) {
  return key[0]==='f'?s.firms[Number(key.slice(1))]:s.people[Number(key.slice(1))];
}
function pay(s,from,to,amount,reason,receipts) {
  if(!integer(amount))throw new Error('Non-integer payment');
  const a=accounts(s,from),b=accounts(s,to);
  if(a.cash<amount)throw new Error('Unfunded payment');
  if(!amount)return;
  a.cash-=amount;b.cash+=amount;receipts.push({from,to,amount,reason});
}
// Deterministic preference: rewinding cannot reroll customers or turn order.
function noise(s,id,salt=0) {
  let n=(s.seed+id*7919+s.day*104729+salt*3253)>>>0;
  n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;
}
function snapshot(s) { const {history:_,...base}=s;return clone(base); }
export function settleDuel(input,offer,{everyone=false,allowClosed=false}={}) {
  if(input.day>=DAYS)throw new Error('The match has ended');
  if(!validOfferShape(input,offer))throw new Error('Invalid offer');
  const issue=offerIssue(input,offer);
  if(issue&&!allowClosed)throw new Error(issue);
  const mine=issue?null:offer;
  const otherRequested=everyone?{...offer,ovens:Math.min(3,input.firms[1].ovens+(offer.ovens>input.firms[0].ovens?1:0))}:null;
  const other=everyone?affordable(input,otherRequested,1):rivalOffer(input);
  const offers=[mine,other],s=clone(input),before=snapshot(input),receipts=[];
  s.day++;
  const report={day:s.day,offers:clone(offers),requested:clone(offer),everyone,
    made:[0,0],sold:[0,0],spoiled:[0,0],stock:[0,0],income:[0,0],costs:[0,0],
    closed:offers.map(o=>!o),cashBefore:input.firms.map(f=>f.cash),
    visits:[],receipts,people:[],fed:0,wantedExtra:0};
  if(s.version===2)report.work=Array.from({length:8},(_,id)=>({person:id,days:0,income:0,kind:'stopped'}));
  for(let id=0;id<2;id++) {
    const f=s.firms[id],o=offers[id];
    const fresh=f.bread.filter(b=>s.day-b.day<2);
    report.spoiled[id]=f.bread.length-fresh.length;f.bread=fresh;
    if(!o){
      // Changing a price on already-existing stock costs no payroll. A stopped
      // day does NOT issue the requested wage or buy the requested oven.
      const wanted=id===0?offer:everyone?otherRequested:currentOffer(input,1);
      f.price=wanted.price;continue;
    }
    if(f.debt){pay(s,'f'+id,'p10',f.debt,'补付保管款',receipts);f.debt=0;}
    if(o.ovens>f.ovens)pay(s,'f'+id,'p10',8*(o.ovens-f.ovens),'添烤炉',receipts);
    if(s.version===2){
     if(!f.robot&&o.automation!=='off')pay(s,'f'+id,'p10',8,'安装自动控制',receipts);
     f.robot=f.robot||o.automation!=='off';f.automation=o.automation;
    }
    f.wage=o.wage;f.price=o.price;f.ovens=o.ovens;
    for(const [j,p] of s.people.filter(p=>p.role==='worker'&&p.home===id).entries()){
     const freed=s.version===2&&o.automation!=='off'&&o.automation!=='more'&&j>=2;
     const kind=freed?o.automation:'work',income=kind==='cut'?0:o.wage;
     if(income)pay(s,'f'+id,'p'+p.id,income,kind==='share'?'机器收益分享':'工资',receipts);
     if(s.version===2)report.work[p.id]={person:p.id,days:freed?0:1,income,kind};
    }
    const amount=Math.ceil(production(o)/4);pay(s,'f'+id,'p10',amount,'开炉原料与燃料',receipts);report.costs[id]+=amount;
    report.made[id]=production(o);
    for(let j=0;j<production(o);j++)f.bread.push({id:`${s.day}:${id}:${j}`,day:s.day});
    pay(s,'f'+id,'p'+(id+8),Math.min(2,f.cash),'老板取生活费',receipts);
  }
  const customers=s.people.map(p=>({id:p.id,bought:0,extra:noise(s,p.id,23)<0.7,visits:[]}));
  const order=[...customers].sort((a,b)=>noise(s,a.id,51)-noise(s,b.id,51));
  // Everyone first tries one essential bread. Extra wants do not jump the queue.
  for(let portion=0;portion<2;portion++)for(const c of order) {
    if(portion===1&&(!c.extra||c.bought===0))continue;
    if(portion===1)report.wantedExtra++;
    const p=s.people[c.id],preference=noise(s,p.id,71)<0.5?0:1;
    const sellers=s.firms.filter(f=>f.bread.length).sort((a,b)=>a.price-b.price||(a.id===preference?-1:1));
    const seller=sellers.find(f=>f.price<=p.cash);
    const attempted=seller??sellers[0];
    if(!attempted){c.visits.push({person:c.id,shop:preference,success:false,reason:'卖完了',portion});continue;}
    const visit={person:c.id,shop:attempted.id,success:!!seller,reason:seller?'买到了':'钱不够',portion,price:attempted.price};
    c.visits.push(visit);
    if(seller) {
      const bread=seller.bread.shift();visit.bread=bread.id;
      pay(s,'p'+p.id,'f'+seller.id,seller.price,'买面包',receipts);c.bought++;
      report.sold[seller.id]++;report.income[seller.id]+=seller.price;
    }
  }
  report.people=customers.map(c=>({...c,cash:s.people[c.id].cash}));
  report.fed=customers.filter(c=>c.bought>0).length;
  report.visits=order.flatMap(c=>c.visits);
  for(const f of s.firms) {
    report.stock[f.id]=f.bread.length;
    const due=Math.ceil(f.bread.length/6),paid=Math.min(due,f.cash);
    pay(s,'f'+f.id,'p10',paid,'剩货保管',receipts);f.debt+=due-paid;
    report.costs[f.id]+=paid;
  }
  report.cashAfter=s.firms.map(f=>f.cash);
  report.cashChange=report.cashAfter.map((cash,id)=>cash-report.cashBefore[id]);
  report.cashFlow=report.cashChange.map((n,id)=>n+receipts.filter(r=>r.from==='f'+id&&r.reason==='老板取生活费').reduce((sum,r)=>sum+r.amount,0));
  s.history.push({before,offers:clone(offers),requested:clone(offer),report});
  assertDuel(s);
  return s;
}
export function rewindDuel(s,day) {
  if(!Number.isInteger(day)||day<1||day>s.history.length)throw new Error('Invalid rewind');
  const out={...clone(s.history[day-1].before),history:clone(s.history.slice(0,day-1))};assertDuel(out);return out;
}
export function replayEveryone(s) {
  let out=s.version===2?initialTechnologyDuel(s.strategy,s.seed):initialDuel(s.strategy,s.seed);
  for(const h of s.history){
    // Replay the purchase action, not an absolute number of already-owned
    // ovens: a cash-constrained alternate path may have missed that purchase.
    const offer={...h.requested,ovens:Math.min(3,out.firms[0].ovens+(h.requested.ovens>h.before.firms[0].ovens?1:0))};
    out=settleDuel(out,offer,{everyone:true,allowClosed:true});
  }
  return out;
}
export function assertDuel(s) {
  if(![1,2].includes(s.version)||!STRATEGIES[s.strategy]||!integer(s.seed)||!integer(s.day)||s.day>DAYS||s.history.length!==s.day||s.firms.length!==2||s.people.length!==11||moneyTotal(s)!==TOTAL_COINS)throw new Error('Invalid world');
  const breadIds=new Set();
  s.firms.forEach((f,id)=>{
    if(f.id!==id||![f.cash,f.debt].every(integer)||!Number.isInteger(f.wage)||f.wage<1||f.wage>4||!Number.isInteger(f.price)||f.price<1||f.price>4||!Number.isInteger(f.ovens)||f.ovens<1||f.ovens>3)throw new Error('Invalid firm');
    if(s.version===2&&(typeof f.robot!=='boolean'||!AUTOMATION_PLANS.includes(f.automation)||f.robot===(f.automation==='off')))throw new Error('Invalid technology');
    if(s.version===1&&(f.robot!==undefined||f.automation!==undefined))throw new Error('Unexpected technology');
    for(const b of f.bread){if(typeof b.id!=='string'||!integer(b.day)||b.day<1||b.day>s.day||breadIds.has(b.id))throw new Error('Invalid bread');breadIds.add(b.id);}
  });
  s.people.forEach((p,id)=>{if(p.id!==id||!integer(p.cash)||p.role!==(id<8?'worker':id<10?'owner':'supplier')||p.home!==(id<8?Math.floor(id/4):id<10?id-8:null))throw new Error('Invalid person');});
  return s;
}
// Restore by deterministic replay, not by accepting arbitrary wallet totals.
export function restoreDuel(value) {
  try {
    assertDuel(value);
    let out=value.version===2?initialTechnologyDuel(value.strategy,value.seed):initialDuel(value.strategy,value.seed);
    for(const h of value.history) {
      if(!h?.report||JSON.stringify(snapshot(out))!==JSON.stringify(h.before))return null;
      out=settleDuel(out,h.requested,{everyone:!!h.report.everyone,allowClosed:true});
    }
    return JSON.stringify(out)===JSON.stringify(value)?out:null;
  }catch{return null;}
}
