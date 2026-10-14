// A deliberately bounded competitive-pressure scene, not a universal law.
export const PRESSURE_DAYS=9;
export const PRESSURE_ACTIONS=['hold','price','follow'];
const copy=v=>structuredClone(v);
export function initialPressure(seed=17){
 return {version:1,seed,day:0,
  firms:[{id:0,cash:36,wage:2,price:3,fast:false,workers:[0,1,2,3],bread:[],debt:0},{id:1,cash:28,wage:1,price:1,fast:true,workers:[4,5],bread:[],debt:0}],
  people:Array.from({length:11},(_,id)=>({id,cash:id<8?6:id===10?8:0,home:id<8?Math.floor(id/4):id<10?id-8:null})),history:[]};
}
export const pressureMoney=s=>s.firms.reduce((n,f)=>n+f.cash,0)+s.people.reduce((n,p)=>n+p.cash,0);
function random(s,id,salt){let n=(s.seed+s.day*104729+id*7919+salt*3253)>>>0;n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;}
export function pressurePlan(s,action){
 if(!PRESSURE_ACTIONS.includes(action))throw new Error('Unknown decision');
 const f=s.firms[0];return {wage:action==='follow'?1:f.wage,price:action==='hold'?f.price:1,fast:action==='follow'||f.fast,workers:action==='follow'?[0,1]:f.workers.slice()};
}
const output=p=>p.fast?12:Math.floor(p.workers.length*1.5);
export function pressureCost(s,action){const p=pressurePlan(s,action),f=s.firms[0];return p.workers.length*p.wage+Math.ceil(output(p)/4)+(p.fast&&!f.fast?8:0)+f.debt;}
export function pressureIssue(s,action){return pressureCost(s,action)>s.firms[0].cash?'今天付不起这份安排的工资和原料。':'';}
function wallet(s,id){return id[0]==='f'?s.firms[Number(id.slice(1))]:s.people[Number(id.slice(1))];}
function pay(s,from,to,amount,reason,receipts){if(!Number.isInteger(amount)||amount<0||wallet(s,from).cash<amount)throw new Error('Unfunded payment');if(amount){wallet(s,from).cash-=amount;wallet(s,to).cash+=amount;receipts.push({from,to,amount,reason});}}
export function pressureRound(input,action,{support}={}){
 if(input.day>=PRESSURE_DAYS)throw new Error('Scene has ended');
 if(support!==undefined&&(!Array.isArray(support)||support.length>4||new Set(support).size!==support.length||support.some(id=>!Number.isInteger(id)||id<0||id>7)||input.day<6))throw new Error('Invalid support arrangement');
 const proposed=pressurePlan(input,action),s=copy(input),{history:_,...base}=input,receipts=[];
 s.day++;
 const r={day:s.day,action,before:copy(base),receipts,made:[0,0],sold:[0,0],stock:[0,0],spoiled:[0,0],closed:[false,false],wages:[0,0],visits:[],fed:0,shortOfMoney:0,stockOut:0,cashBefore:input.firms.map(f=>f.cash),walletBefore:input.people.map(p=>p.cash),paid:Array(8).fill(0)};
 if(support!==undefined){
  const spent=input.history.reduce((n,h)=>n+h.receipts.filter(p=>p.reason==='收入保障').reduce((m,p)=>m+p.amount,0),0),budget=Math.max(0,12-spent);
  r.support={requested:support.slice(),paid:[],opening:budget,remaining:budget};
  for(const id of support){if(!r.support.remaining||!s.people[10].cash)break;pay(s,'p10','p'+id,1,'收入保障',receipts);r.support.paid.push(id);r.support.remaining--;}
 }
 for(const f of s.firms){
  const fresh=f.bread.filter(b=>s.day-b.day<2);r.spoiled[f.id]=f.bread.length-fresh.length;f.bread=fresh;
  const p=f.id===0?proposed:{wage:1,price:1,fast:true,workers:[4,5]};
  const cost=p.workers.length*p.wage+Math.ceil(output(p)/4)+(p.fast&&!f.fast?8:0)+f.debt;
  // Even on a stopped day a free price-tag change can sell remaining stock.
  f.price=p.price;
  if(f.cash<cost){r.closed[f.id]=true;continue;}
  if(f.debt){pay(s,'f'+f.id,'p10',f.debt,'补付保管',receipts);f.debt=0;}
  if(p.fast&&!f.fast)pay(s,'f'+f.id,'p10',8,'换快速烤炉',receipts);
  f.fast=p.fast;f.workers=p.workers.slice();f.wage=p.wage;
  for(const id of f.workers){pay(s,'f'+f.id,'p'+id,f.wage,'工资',receipts);r.paid[id]=f.wage;r.wages[f.id]+=f.wage;}
  const made=output(p);pay(s,'f'+f.id,'p10',Math.ceil(made/4),'原料燃料',receipts);r.made[f.id]=made;
  for(let j=0;j<made;j++)f.bread.push({id:s.day+':'+f.id+':'+j,day:s.day});
  pay(s,'f'+f.id,'p'+(f.id+8),Math.min(2,f.cash),'老板生活费',receipts);
 }
 const customers=s.people.map(p=>p.id).sort((a,b)=>random(s,a,51)-random(s,b,51));
 for(const id of customers){
  const p=s.people[id],prefer=random(s,id,71)<.5?0:1;
  const sellers=s.firms.filter(f=>f.bread.length).sort((a,b)=>a.price-b.price||(a.id===prefer?-1:1));
  const seller=sellers.find(f=>f.price<=p.cash),attempt=seller??sellers[0];
  const visit={person:id,shop:attempt?.id??prefer,success:!!seller,reason:seller?'买到了':attempt?'钱不够':'卖完了'};
  if(seller){const bread=seller.bread.shift();visit.bread=bread.id;pay(s,'p'+id,'f'+seller.id,seller.price,'买面包',receipts);r.sold[seller.id]++;r.fed++;}
  else if(attempt)r.shortOfMoney++;else r.stockOut++;
  r.visits.push(visit);
 }
 for(const f of s.firms){r.stock[f.id]=f.bread.length;const due=Math.ceil(f.bread.length/6),amount=Math.min(due,f.cash);pay(s,'f'+f.id,'p10',amount,'保管剩货',receipts);f.debt+=due-amount;}
 r.cashAfter=s.firms.map(f=>f.cash);r.walletAfter=s.people.map(p=>p.cash);s.history.push(r);assertPressure(s);return s;
}
export function assertPressure(s){
 if(s.version!==1||!Number.isInteger(s.seed)||s.seed<0||!Number.isInteger(s.day)||s.day<0||s.day>PRESSURE_DAYS||s.history.length!==s.day||s.firms.length!==2||s.people.length!==11||pressureMoney(s)!==120)throw new Error('Invalid scene');
 const ids=new Set();for(const f of s.firms){if(!Number.isInteger(f.cash)||f.cash<0||!Number.isInteger(f.debt)||f.debt<0)throw new Error('Invalid cash');for(const b of f.bread){if(ids.has(b.id))throw new Error('Duplicated bread');ids.add(b.id);}}
 for(const [id,p]of s.people.entries())if(p.id!==id||!Number.isInteger(p.cash)||p.cash<0)throw new Error('Invalid person');return s;
}
export function rewindPressure(s,day){if(!Number.isInteger(day)||day<1||day>s.day)throw new Error('Invalid date');const out={...copy(s.history[day-1].before),history:copy(s.history.slice(0,day-1))};assertPressure(out);return out;}
export function restorePressure(s){try{assertPressure(s);let out=initialPressure(s.seed);for(const r of s.history)out=pressureRound(out,r.action,r.support?{support:r.support.requested}:{});return JSON.stringify(out)===JSON.stringify(s)?out:null;}catch{return null;}}
