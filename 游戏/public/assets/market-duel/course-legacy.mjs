import {initialBattle, round as wageRound, moves as wageMoves, moveIssue as wageIssue, money} from './battle-model.mjs';

export const MODES = ['steady', 'waves', 'source', 'social', 'done'];
export const TITLES = {steady:'第一场 · 恒定的客流数', waves:'第二场 · 慢了一拍', source:'需求，从哪里来？', social:'第三场 · 顾客也要领工资', done:'两家店，一条街'};
export const LENGTHS = {steady:3, waves:5, social:9};
const clone = s => structuredClone(s);
function market() {return {day:0, outside:2000, shops:[0,1].map(id => ({id,cash:36,price:3,wage:2,workers:[id*4,id*4+1,id*4+2,id*4+3], quantity:6,nextQuantity:6,bread:[],debt:0})), history:[]};}
export function initialCourse() {return {version:2,mode:'steady',world:market(),archive:{},traced:[]};}
export const finished = s => s.mode === 'done' || (LENGTHS[s.mode] && s.world.day === LENGTHS[s.mode]);
export function courseMoves(s) {
  if(s.mode === 'social') return wageMoves(s.world);
  const f=s.world.shops[0], q=f.nextQuantity;
  return [
    {id:'price',name:f.price===3?'降价抢客':'恢复原价',icon:'tag',hint:`售价 ${f.price} → ${f.price===3?2:3} 金币 · 立即`,detail:'价签可以马上换。便宜能抢客，每个也少收一块。'},
    {id:'more',name:'多做一点',icon:'oven',hint:`明天做 ${Math.min(14,q+4)} 个`,detail:`今天这批已经进炉。新安排从明天开始：${q} → ${Math.min(14,q+4)} 个。`},
    {id:'less',name:'少做一点',icon:'bread',hint:`明天做 ${Math.max(2,q-4)} 个`,detail:`今天这批收不回来了。明天改做 ${Math.max(2,q-4)} 个，工资照付。`},
    {id:'hold',name:'照常营业',icon:'people',hint:'沿用现有安排',detail:'价格不改，明天继续按同样的数量备料。'},
  ];
}
export function courseIssue(s,a) {
  if(s.mode==='social') return wageIssue(s.world,a);
  const q=s.world.shops[0].nextQuantity;
  return a==='more'&&q===14?'现有场地一天最多做 14 个。':a==='less'&&q===2?'先保留最小的一炉。':'';
}
function marketRound(input,action,mode) {
  const w=clone(input), before=clone(input.shops), f=w.shops[0];
  const actual=mode==='steady'?12:[12,20,20,6,12][w.day];
  // Quantity was committed the previous day. Prices can react immediately.
  const committed=w.shops.map(f=>f.nextQuantity);
  if(action==='price')f.price=f.price===3?2:3;
  if(action==='more')f.nextQuantity=Math.min(14,f.nextQuantity+4);
  if(action==='less')f.nextQuantity=Math.max(2,f.nextQuantity-4);
  const r={day:++w.day,action,demand:actual,heard:input.history.at(-1)?.demand??12,committed,scheduled:w.shops.map(f=>f.nextQuantity),before:before.map(f=>f.cash),receipts:[],made:[0,0],sold:[0,0],spoiled:[0,0],stopped:[false,false],visits:[],wages:[0,0],poor:0};
  const outgoing=(f,n,reason)=>{if(f.cash<n)throw new Error('Unfunded market payment');f.cash-=n;w.outside+=n;r.receipts.push({from:'f'+f.id,to:'outside',amount:n,reason});};
  for(const f of w.shops){
    const fresh=f.bread.filter(b=>w.day-b.day<2);r.spoiled[f.id]=f.bread.length-fresh.length;f.bread=fresh;
    f.quantity=committed[f.id];const payroll=8,raw=Math.ceil(f.quantity/2),cost=payroll+raw+2+f.debt;
    if(f.cash<cost){r.stopped[f.id]=true;continue;}
    outgoing(f,f.debt,'补付保管');f.debt=0;outgoing(f,payroll,'工资');r.wages[f.id]=payroll;outgoing(f,raw,'原料');outgoing(f,2,'老板生活费');
    r.made[f.id]=f.quantity;for(let j=0;j<f.quantity;j++)f.bread.push({id:`${mode}:${w.day}:${f.id}:${j}`,day:w.day});
  }
  // This is explicitly an external order book, not a household-income model.
  for(let id=0;id<actual;id++){
    const preferred=(id+w.day)%2;
    const sellers=w.shops.filter(f=>f.bread.length).sort((a,b)=>a.price-b.price||(a.id===preferred?-1:1));const seller=sellers[0];
    if(seller){if(w.outside<seller.price)throw new Error('Outside buyers unfunded');w.outside-=seller.price;seller.cash+=seller.price;r.receipts.push({from:'outside',to:'f'+seller.id,amount:seller.price,reason:'买面包'});const loaf=seller.bread.shift();r.sold[seller.id]++;r.visits.push({id,shop:seller.id,bought:true,bread:loaf.id});}
    else r.visits.push({id,shop:preferred,bought:false,reason:'卖完了'});
  }
  for(const f of w.shops){const due=Math.ceil(f.bread.length/6),paid=Math.min(f.cash,due);outgoing(f,paid,'保管');f.debt+=due-paid;}
  r.after=w.shops.map(f=>f.cash);r.stock=w.shops.map(f=>f.bread.length);r.missed=r.visits.filter(v=>!v.bought).length;w.history.push(r);
  if(w.outside+w.shops.reduce((v,f)=>v+f.cash,0)!==2072)throw new Error('Market ledger mismatch');return w;
}
export function courseRound(s,action){
  if(!['steady','waves','social'].includes(s.mode)||finished(s)||!courseMoves(s).some(m=>m.id===action)||courseIssue(s,action))throw new Error('Unavailable course move');
  const out=clone(s);out.world=s.mode==='social'?wageRound(s.world,action):marketRound(s.world,action,s.mode);return out;
}
export function nextCourse(s){
  const out=clone(s);
  if(s.mode==='steady'&&finished(s)){out.archive.steady=clone(s.world);out.mode='waves';out.world=market();}
  else if(s.mode==='waves'&&finished(s)){out.archive.waves=clone(s.world);out.mode='source';out.world=wageRound(initialBattle(),'hold');out.traced=[];}
  else if(s.mode==='source'&&s.traced.length===2){out.mode='social';}
  else if(s.mode==='social'&&finished(s)){out.mode='done';}
  else throw new Error('Not ready for next scene');return out;
}
export function crossCustomers(s){
  if(!['source','social','done'].includes(s.mode))return [];
  const r=s.world.history[0];
  return [0,1].map(employer=>r.visits.find(v=>v.id>=employer*4&&v.id<employer*4+4&&v.bought&&v.shop!==employer)?.id).filter(id=>id!==undefined);
}
export function traceCustomer(s,id){if(s.mode!=='source'||!crossCustomers(s).includes(id))throw new Error('Not a cross-shop trace');const out=clone(s);if(!out.traced.includes(id))out.traced.push(id);return out;}
export function retryScene(s){const out=clone(s);if(s.mode==='steady'||s.mode==='waves')out.world=market();else if(['social','done'].includes(s.mode)){out.mode='social';out.world=wageRound(initialBattle(),'hold');}else return out;return out;}
export function undoCourse(s){if(!s.world.day||s.mode==='source'||s.mode==='done')return s;const out=clone(s),actions=s.world.history.slice(0,-1).map(r=>r.action);if(s.mode==='social'){if(actions.length<1)return s;out.world=actions.reduce((w,a)=>wageRound(w,a),initialBattle());}else out.world=actions.reduce((w,a)=>marketRound(w,a,s.mode),market());return out;}
export function restoreCourse(saved){
  try{
    if(saved?.version!==2||!MODES.includes(saved.mode))return null;
    let s=initialCourse();
    const play=(world)=>{for(const r of world.history)s=courseRound(s,r.action);};
    if(saved.mode==='steady')play(saved.world);
    else{play(saved.archive.steady);s=nextCourse(s);if(saved.mode==='waves')play(saved.world);else{play(saved.archive.waves);s=nextCourse(s);for(const id of saved.traced)s=traceCustomer(s,id);if(saved.mode!=='source'){s=nextCourse(s);for(const r of saved.world.history.slice(1))s=courseRound(s,r.action);if(saved.mode==='done')s=nextCourse(s);}}}
    return JSON.stringify(s)===JSON.stringify(saved)?s:null;
  }catch{return null;}
}
export function auditCourse(s){if(['source','social','done'].includes(s.mode)&&money(s.world)!==120)throw new Error('Social ledger mismatch');return s;}
