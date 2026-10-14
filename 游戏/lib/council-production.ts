/** Three short, closed-account shifts after an actual council decision.
 * Fictional parameters, not estimates of AI productivity or household demand. */
export const PRODUCTION_JOBS=['work','paid-rest','unpaid'] as const;
export type ProductionJob=typeof PRODUCTION_JOBS[number];
export type ProductionSeed={fast:boolean;firm:number;workers:number[];owner:number|null;supplier:number;equipmentSupplier:number;buyers:number};
export type CouncilProduction={seed:ProductionSeed;jobs:ProductionJob[];history:{jobs:ProductionJob[]}[]};
export type ProductionTransfer={from:string;to:string;amount:number;reason:string};
const copySeed=(s:ProductionSeed):ProductionSeed=>({fast:s.fast,firm:s.firm,workers:s.workers.slice(),owner:s.owner,supplier:s.supplier,equipmentSupplier:s.equipmentSupplier,buyers:s.buyers});
const jobsValid=(v:unknown):v is ProductionJob[]=>Array.isArray(v)&&v.length===6&&v.every(j=>PRODUCTION_JOBS.includes(j));
function seedValid(s:ProductionSeed){return !!s&&typeof s==='object'&&typeof s.fast==='boolean'&&Array.isArray(s.workers)&&s.workers.length===6&&[s.firm,...s.workers,s.supplier,s.equipmentSupplier,s.buyers,...(s.owner===null?[]:[s.owner])].every(n=>Number.isSafeInteger(n)&&n>=0)&&s.buyers===0&&s.firm+s.workers.reduce((a,b)=>a+b,0)+(s.owner??0)+s.supplier+s.equipmentSupplier===88;}
export function initialCouncilProduction(seed:ProductionSeed):CouncilProduction{
 if(!seedValid(seed))throw new Error('Unfunded production seed');
 return {seed:copySeed(seed),jobs:Array(6).fill('work'),history:[]};
}
export function productionAccount(s:CouncilProduction){
 if(!seedValid(s.seed)||!jobsValid(s.jobs)||!Array.isArray(s.history)||s.history.length>3||s.history.some(r=>!r||!jobsValid(r.jobs)))throw new Error('Invalid production history');
 const wallets:Record<string,number>={firm:s.seed.firm,supplier:s.seed.supplier,equipmentSupplier:s.seed.equipmentSupplier,buyers:s.seed.buyers,...Object.fromEntries(s.seed.workers.map((cash,id)=>['worker-'+id,cash])),...(s.seed.owner===null?{}:{owner:s.seed.owner})};
 const customers=[...Array.from({length:6},(_,id)=>'worker-'+id),'supplier','equipmentSupplier',...(s.seed.owner===null?[]:['owner'])];
 const stock:string[]=[];
 const shifts=s.history.map((r,index)=>{
  const shift=index+1,before={...wallets},openingStock=stock.slice(),receipts:ProductionTransfer[]=[],requestedWork=r.jobs.filter(j=>j==='work').length;
  const plannedOutput=requestedWork*(s.seed.fast?4:2),wageBill=r.jobs.filter(j=>j!=='unpaid').length*2,inputs=plannedOutput/2,opened=wallets.firm>=wageBill+inputs;
  function pay(from:string,to:string,amount:number,reason:string){if(!Number.isSafeInteger(amount)||amount<0||wallets[from]<amount)throw new Error('Unfunded production transfer');if(amount){wallets[from]-=amount;wallets[to]+=amount;receipts.push({from,to,amount,reason});}}
  const paid=Array(6).fill(0) as number[],worked:number[]=[],paidRest:number[]=[];
  if(opened){
   r.jobs.forEach((job,id)=>{if(job!=='unpaid'){pay('firm','worker-'+id,2,job==='work'?'工作工资':'休息工资');paid[id]=2;}if(job==='work')worked.push(id);if(job==='paid-rest')paidRest.push(id);});
   pay('firm','supplier',inputs,'原料');for(let id=0;id<plannedOutput;id++)stock.push(shift+':'+id);
  }
  const visits:{person:string;unit:1|2;success:boolean;reason:'买到了'|'钱不够'|'没有面包';bread?:string}[]=[],bought=Object.fromEntries(customers.map(id=>[id,0]));
  // Each buyer tries one first; only then do those who bought try a second.
  // A fixed, disclosed order makes short-stock rationing reproducible.
  for(const unit of [1,2] as const)for(const person of customers){
   if(unit===2&&!bought[person])continue;
   const success=stock.length>0&&wallets[person]>=2,reason=success?'买到了':stock.length?'钱不够':'没有面包';
   if(success){const bread=stock.shift()!;pay(person,'firm',2,'买面包');bought[person]++;visits.push({person,unit,success,reason,bread});}else visits.push({person,unit,success,reason});
  }
  const hungry=customers.filter(id=>bought[id]===0),workerPoor=Array.from({length:6},(_,id)=>id).filter(id=>visits.some(v=>v.person==='worker-'+id&&v.unit===1&&v.reason==='钱不够'));
  const workerStockOut=Array.from({length:6},(_,id)=>id).filter(id=>visits.some(v=>v.person==='worker-'+id&&v.unit===1&&v.reason==='没有面包'));
  const sold=Object.values(bought).reduce((a,b)=>a+b,0),made=opened?plannedOutput:0;
  if(Object.values(wallets).some(n=>!Number.isSafeInteger(n)||n<0)||Object.values(wallets).reduce((a,b)=>a+b,0)!==88||openingStock.length+made!==sold+stock.length||new Set(stock).size!==stock.length)throw new Error('Broken production accounts');
  return {shift,jobs:r.jobs.slice(),before,after:{...wallets},openingStock,made,sold,stock:stock.slice(),opened,inputs:opened?inputs:0,required:wageBill+inputs,paid,worked,paidRest,bought,visits,receipts,hungry,workerPoor,workerStockOut};
 });
 const nextOutput=s.jobs.filter(j=>j==='work').length*(s.seed.fast?4:2),nextWages=s.jobs.filter(j=>j!=='unpaid').length*2,nextRequired=nextWages+nextOutput/2;
 return {fast:s.seed.fast,shift:shifts.length,shifts,wallets,workers:Array.from({length:6},(_,id)=>wallets['worker-'+id]),stock,produced:shifts.reduce((n,r)=>n+r.made,0),sold:shifts.reduce((n,r)=>n+r.sold,0),wages:shifts.reduce((n,r)=>n+r.paid.reduce((a,b)=>a+b,0),0),work:shifts.reduce((n,r)=>n+r.worked.length,0),paidRest:shifts.reduce((n,r)=>n+r.paidRest.length,0),nextOutput,nextWages,nextRequired,canOpen:wallets.firm>=nextRequired,moneyAfter:Object.values(wallets).reduce((a,b)=>a+b,0)};
}
export function assignProduction(s:CouncilProduction,person:number,job:ProductionJob):CouncilProduction{
 if(s.history.length===3||!Number.isInteger(person)||person<0||person>5||!PRODUCTION_JOBS.includes(job)||s.jobs[person]===job)return s;
 const jobs=s.jobs.slice();jobs[person]=job;return {...s,jobs};
}
export function runProduction(s:CouncilProduction):CouncilProduction{
 if(s.history.length===3)return s;const next={...s,history:[...s.history,{jobs:s.jobs.slice()}]};productionAccount(next);return next;
}
export function restoreCouncilProduction(v:unknown,seed:ProductionSeed):CouncilProduction|null{
 try{if(!v||typeof v!=='object'||!seedValid(seed))return null;const s=v as CouncilProduction;if(JSON.stringify(s.seed)!==JSON.stringify(copySeed(seed))||!jobsValid(s.jobs)||!Array.isArray(s.history)||s.history.length>3||s.history.some(r=>!r||!jobsValid(r.jobs))||s.history.length===3&&JSON.stringify(s.jobs)!==JSON.stringify(s.history[2].jobs))return null;
  const result={seed:copySeed(seed),jobs:s.jobs.slice(),history:s.history.map(r=>({jobs:r.jobs.slice()}))};productionAccount(result);return result;
 }catch{return null;}
}
