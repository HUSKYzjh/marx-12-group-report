/** Finite care resources, specific people and actual payment. This is an
 * independent teaching period, not clinical advice or measured AI capacity.
 * Training is planned in the draft and completed before service on RUN. */
export type CarePlan={slots:(number|null)[];training:(number|null)[];vouchers:(number|null)[];tool:boolean;queue?:number[]};
export type CareRouting=CarePlan & {phase:'intro'|'lab'|'conclusion';revision:number;run:CarePlan|null;trials:CarePlan[]};
export type CareRoutingAction={type:'BEGIN'}|{type:'REOPEN';expectedRevision:number}|{type:'WORKER';worker:number;slot:number|'bench'}|{type:'TRAIN';certificate:number;person:number|null}|{type:'VOUCHER';voucher:number;person:number|null}|{type:'COVER';people:number[];expectedRevision:number}|{type:'TOOL';enabled:boolean}|{type:'QUEUE';person:number;position:number}|{type:'RUN';expectedRevision:number}|{type:'CONCLUDE'};
export const careQueue=(s:CarePlan):number[]=>s.queue?.slice()??Array.from({length:12},(_,i)=>i);
export const carePlan=(s:CarePlan):CarePlan=>({slots:s.slots.slice(),training:s.training.slice(),vouchers:s.vouchers.slice(),tool:s.tool,...(s.queue?{queue:s.queue.slice()}:{})});
export function initialCareRouting():CareRouting{return {phase:'intro',revision:0,slots:[0,1,null,null],training:[null,null],vouchers:Array(12).fill(null),tool:false,queue:Array.from({length:12},(_,i)=>i),run:null,trials:[]};}
const range=(v:unknown,max:number)=>Number.isInteger(v)&&Number(v)>=0&&Number(v)<max;
function uniqueArray(v:unknown,size:number,max:number,min=0):v is (number|null)[]{return Array.isArray(v)&&v.length===size&&v.every(n=>n===null||range(n,max)&&n>=min)&&new Set(v.filter(n=>n!==null)).size===v.filter(n=>n!==null).length;}
function validPlan(v:unknown):v is CarePlan{
 if(!v||typeof v!=='object')return false;const s=v as CarePlan;
 return typeof s.tool==='boolean'&&uniqueArray(s.slots,4,4)&&uniqueArray(s.training,2,4,2)&&uniqueArray(s.vouchers,12,12)&&s.slots.every(w=>w===null||w<2||s.training.includes(w))&&(s.queue===undefined||Array.isArray(s.queue)&&s.queue.length===12&&s.queue.every(id=>range(id,12))&&new Set(s.queue).size===12);
}
const signature=(p:CarePlan)=>[p.slots.filter(n=>n!==null).length,p.tool,p.training.filter(n=>n!==null).length,p.vouchers.filter((n):n is number=>n!==null).sort((a,b)=>a-b).join(','),careQueue(p).join(',')].join('|');
export function careRoutingReducer(s:CareRouting,a:CareRoutingAction):CareRouting{
 if(!a||typeof a!=='object')return s;
 if(a.type==='BEGIN')return s.phase==='intro'?{...s,phase:'lab'}:s;
 if(a.type==='REOPEN')return s.phase==='conclusion'&&s.run&&s.trials.length>=2&&a.expectedRevision===s.revision?{...s,phase:'lab',revision:s.revision+1}:s;
 if(s.phase!=='lab')return s;
 function changed(p:CarePlan):CareRouting{return {...s,...p,revision:s.revision+1};}
 switch(a.type){
  case 'QUEUE':{
   if(!range(a.person,12)||!range(a.position,12))return s;const queue=careQueue(s),from=queue.indexOf(a.person);if(from===a.position)return s;
   queue.splice(from,1);queue.splice(a.position,0,a.person);return changed({...carePlan(s),queue});
  }
  case 'WORKER':{
   if(!range(a.worker,4)||a.slot!=='bench'&&!range(a.slot,4))return s;
   const before=s.slots.indexOf(a.worker),slots=s.slots.slice();
   if(a.slot==='bench'){if(before<0)return s;slots[before]=null;}
   else{if(slots[a.slot]!==null||a.worker>=2&&!s.training.includes(a.worker))return s;if(before>=0)slots[before]=null;slots[a.slot]=a.worker;}
   return changed({...carePlan(s),slots});
  }
  case 'TRAIN':{
   if(!range(a.certificate,2)||a.person!==null&&(!range(a.person,4)||a.person<2)||s.training[a.certificate]===a.person||a.person!==null&&s.training.includes(a.person))return s;
   const training=s.training.slice();training[a.certificate]=a.person;
   const slots=s.slots.map(w=>w!==null&&w>=2&&!training.includes(w)?null:w);
   return changed({...carePlan(s),training,slots});
  }
  case 'VOUCHER':{
   if(!range(a.voucher,12)||a.person!==null&&!range(a.person,12)||s.vouchers[a.voucher]===a.person||a.person!==null&&s.vouchers.includes(a.person))return s;
   const vouchers=s.vouchers.slice();vouchers[a.voucher]=a.person;return changed({...carePlan(s),vouchers});
  }
  case 'COVER':{
   // One completed stroke is one draft edit, not a series of payments.
   if(a.expectedRevision!==s.revision||!Array.isArray(a.people)||!a.people.length||a.people.length>12||a.people.some(id=>!range(id,12))||new Set(a.people).size!==a.people.length)return s;
   const vouchers=s.vouchers.slice(),people=a.people.filter(id=>!vouchers.includes(id));
   if(!people.length||people.length>vouchers.filter(id=>id===null).length)return s;
   for(const id of people)vouchers[vouchers.indexOf(null)]=id;
   return changed({...carePlan(s),vouchers});
  }
  case 'TOOL':return typeof a.enabled==='boolean'&&a.enabled!==s.tool?changed({...carePlan(s),tool:a.enabled}):s;
  case 'RUN':{
   if(a.expectedRevision!==s.revision||s.run&&JSON.stringify(carePlan(s))===JSON.stringify(s.run))return s;
   const run=carePlan(s),trials=[...s.trials.filter(r=>signature(r)!==signature(run)),run].slice(-12);return {...s,run,trials,revision:s.revision+1};
  }
  case 'CONCLUDE':return s.run&&s.trials.length>=2?{...s,phase:'conclusion'}:s;
  default:return s;
 }
}
export function careRoutingAccount(p:CarePlan){
 if(!validPlan(p))throw new Error('Invalid care plan');
 const staff=p.slots.filter((w):w is number=>w!==null),capacity=staff.length*(p.tool?3:2),setup=p.tool?2:0,training=p.training.filter(w=>w!==null).length*2,wages=staff.length*2;
 const workers=Array.from({length:4},(_,id)=>({id,working:staff.includes(id),trained:id<2||p.training.includes(id),income:(staff.includes(id)?2:0)+(p.training.includes(id)?2:0)}));
 let firm=20-wages-training-setup,publicFunds=24,supplier=setup,served=0,receipts=0,inputs=0;
 const transfers:{from:string;to:string;amount:number;kind:string}[]=[];
 workers.forEach(w=>{if(w.working)transfers.push({from:'firm',to:'worker-'+w.id,amount:2,kind:'wage'});if(p.training.includes(w.id))transfers.push({from:'firm',to:'worker-'+w.id,amount:2,kind:'training'});});
 if(setup)transfers.push({from:'firm',to:'supplier',amount:setup,kind:'tool'});
 const people=Array.from({length:12},(_,id)=>({id,initial:id<4?4:1,cash:id<4?4:1,covered:p.vouchers.includes(id),affordable:p.vouchers.includes(id)||id<4,served:false,reason:'money' as 'served'|'capacity'|'money',position:careQueue(p).indexOf(id)}));
 const queue=careQueue(p);queue.forEach(id=>{
  const initial=id<4?4:1,covered=p.vouchers.includes(id),affordable=covered||initial>=2;
  const used=affordable&&served<capacity,reason=used?'served':affordable?'capacity':'money';let cash=initial;
  if(used){served++;receipts+=2;inputs++;firm+=1;supplier++;if(covered)publicFunds-=2;else cash-=2;transfers.push({from:covered?'public':'person-'+id,to:'firm',amount:2,kind:'service'});transfers.push({from:'firm',to:'supplier',amount:1,kind:'material'});}
  Object.assign(people[id],{cash,covered,affordable,served:used,reason});
 });
 const households=people.reduce((n,p)=>n+p.cash,0),workerFunds=workers.reduce((n,w)=>n+w.income,0);
 return {staff:staff.length,capacity,eligible:people.filter(p=>p.affordable).length,served,unmet:12-served,unused:capacity-served,wages,training,setup,inputs,receipts,firm,publicFunds,households,workerFunds,supplier,people,workers,transfers,queue,moneyBefore:68,moneyAfter:firm+publicFunds+households+workerFunds+supplier};
}
export function restoreCareRouting(v:unknown):CareRouting|null{
 if(!validPlan(v))return null;const s=v as CareRouting;
 if(!['intro','lab','conclusion'].includes(s.phase)||!Number.isSafeInteger(s.revision)||s.revision<0||s.run!==null&&!validPlan(s.run)||!Array.isArray(s.trials)||s.trials.length>12||s.trials.some(r=>!validPlan(r))||new Set(s.trials.map(signature)).size!==s.trials.length)return null;
 if(s.run===null&&s.trials.length||s.run!==null&&(!s.trials.length||JSON.stringify(carePlan(s.trials.at(-1)!))!==JSON.stringify(carePlan(s.run)))||s.phase==='intro'&&(s.run!==null||s.trials.length||s.revision!==0||JSON.stringify({...carePlan(s),queue:careQueue(s)})!==JSON.stringify(carePlan(initialCareRouting())))||s.phase==='conclusion'&&(!s.run||s.trials.length<2))return null;
 return {...carePlan(s),phase:s.phase,revision:s.revision,run:s.run?carePlan(s.run):null,trials:s.trials.map(carePlan)};
}
