/** Finite construction orders and tangible freight. Cargo remains the firm's
 * inventory until launch/payment. Animations never advance this ledger. */
export const FREIGHT_CAPACITIES=[2,4,6] as const;
export const FREIGHT_KINDS=['power','air','structure'] as const;
export type FreightKind=typeof FREIGHT_KINDS[number];
export type FreightTurn={produced:number;shipped:number[];mix?:FreightKind[]};
export type FreightRecord={capacity:number;order:4|12;maintenanceAt:number|null;history:FreightTurn[];construction?:true};
export type SpaceFreight=FreightRecord & {phase:'intro'|'lab'|'conclusion';stage:'planning'|'loading'|'finished';quantity:number;pending:number|null;cargo:(number|null)[];trials:FreightRecord[];plan?:(FreightKind|null)[]};
export type FreightAction={type:'BEGIN'}|{type:'CAPACITY';capacity:number}|{type:'QUANTITY';quantity:number}|{type:'PLAN';slot:number;kind:FreightKind|null}|{type:'CONTRACT';order:4|12}|{type:'PRODUCE';expectedRound:number}|{type:'LOAD';crate:number;slot:number}|{type:'LOAD_FOR_NEED';crate:number;kind:FreightKind;expectedRound:number}|{type:'UNLOAD';slot:number}|{type:'LAUNCH';expectedRound:number}|{type:'MAINTENANCE'}|{type:'RETRY'}|{type:'CONCLUDE'};
const balanced:FreightKind[]=['power','air','structure','power','air','structure'];
export function initialSpaceFreight(construction=false):SpaceFreight{return {phase:'intro',stage:'planning',capacity:6,quantity:6,order:4,maintenanceAt:null,history:[],pending:null,cargo:Array(6).fill(null),trials:[],...(construction?{construction:true as const,plan:balanced.slice()}:{} )};}
const copyRecord=(s:FreightRecord):FreightRecord=>({capacity:s.capacity,order:s.order,maintenanceAt:s.maintenanceAt,history:s.history.map(p=>({produced:p.produced,shipped:p.shipped.slice(),...(p.mix?{mix:p.mix.slice()}:{} )})),...(s.construction?{construction:true as const}:{} )});
// Different physical supplies are different experiments, even with equal sales.
const signature=(s:FreightRecord)=>{
 if(!s.construction)return [s.capacity,s.order,s.maintenanceAt,...s.history.flatMap(p=>[p.produced,p.shipped.length])].join('|');
 const kinds=s.history.flatMap(p=>p.mix!);return JSON.stringify([s.capacity,s.order,s.maintenanceAt,...s.history.map(p=>[p.mix!.slice().sort(),p.shipped.map(id=>kinds[id]).sort()])]);
};
function validRecord(s:FreightRecord){return !!s&&(s.construction===undefined||s.construction===true)&&FREIGHT_CAPACITIES.includes(s.capacity as 2|4|6)&&[4,12].includes(s.order)&&(s.maintenanceAt===null||Number.isInteger(s.maintenanceAt)&&s.maintenanceAt>=0&&s.maintenanceAt<3)&&Array.isArray(s.history)&&s.history.length<=3&&s.history.every(p=>p&&Number.isInteger(p.produced)&&p.produced>=0&&p.produced<=s.capacity&&Array.isArray(p.shipped)&&p.shipped.length<=6&&p.shipped.every(id=>Number.isInteger(id)&&id>=0)&&(s.construction?Array.isArray(p.mix)&&p.mix.length===p.produced&&p.mix.every(k=>FREIGHT_KINDS.includes(k)):p.mix===undefined));}
export function freightBatch(s:SpaceFreight):FreightKind[]{return (s.plan??balanced).slice(0,s.capacity).filter((k):k is FreightKind=>k!==null);}
export function freightAccount(s:FreightRecord,pending:number|null=null){
 if(!validRecord(s)||pending!==null&&(!Number.isInteger(pending)||pending<0||pending>s.capacity||s.history.length===3))throw new Error('Invalid freight');
 let firm=60,buyer=96,workers=0,supplier=0,authorization=s.order*4,need=12,delivered=0,serial=0,maintenanceNeed=0,maintenanceDelivered=0;
 let available:number[]=[];const kinds=new Map<number,FreightKind>(),built={power:0,air:0,structure:0},serviced={power:0,air:0,structure:0};const periods:{round:number;produced:number;sold:number;stock:number;wages:number;inputs:number;receipts:number;closing:number;maintenance:boolean;habitats?:number}[]=[],transfers:{from:string;to:string;amount:number;kind:string}[]=[];
 function transfer(from:string,to:string,amount:number,kind:string){if(amount)transfers.push({from,to,amount,kind});}
 function maintain(at:number){if(s.maintenanceAt!==at)return;if(need!==0||s.order!==12||at>=3)throw new Error('Premature renewal');authorization+=24;maintenanceNeed=6;}
 function produce(quantity:number,mix?:FreightKind[]){if(s.construction&&(!mix||mix.length!==quantity||mix.some(k=>!FREIGHT_KINDS.includes(k))))throw new Error('Invalid production mix');if(firm<quantity*3)throw new Error('Unfunded production');firm-=quantity*3;workers+=quantity*2;supplier+=quantity;transfer('firm','workers',quantity*2,'wage');transfer('firm','supplier',quantity,'inputs');for(let i=0;i<quantity;i++){if(mix)kinds.set(serial,mix[i]);available.push(serial++);}}
 for(let i=0;i<s.history.length;i++){
  maintain(i);const p=s.history[i];produce(p.produced,p.mix);
  if(new Set(p.shipped).size!==p.shipped.length||p.shipped.some(id=>!available.includes(id))||p.shipped.length>Math.min(6,need+maintenanceNeed,Math.floor(authorization/4),Math.floor(buyer/4)))throw new Error('Unfunded shipment');
  const sold=p.shipped.length,build=Math.min(need,sold),service=sold-build,receipts=sold*4;
  if(s.construction)for(const id of p.shipped){const k=kinds.get(id)!;if(built[k]<4)built[k]++;else if(s.maintenanceAt!==null&&serviced[k]<2)serviced[k]++;else throw new Error('Unwanted shipment type');}
  available=available.filter(id=>!p.shipped.includes(id));need-=build;maintenanceNeed-=service;delivered+=build;maintenanceDelivered+=service;authorization-=receipts;buyer-=receipts;firm+=receipts;transfer('buyer','firm',receipts,'sale');
  periods.push({round:i+1,produced:p.produced,sold,stock:available.length,wages:p.produced*2,inputs:p.produced,receipts,closing:firm,maintenance:service>0,...(s.construction?{habitats:Math.min(...Object.values(built))}:{} )});
 }
 if(s.maintenanceAt!==null&&s.maintenanceAt>s.history.length)throw new Error('Future renewal');
 maintain(s.history.length);if(pending!==null)produce(pending,s.construction?freightBatch(s as SpaceFreight).slice(0,pending):undefined);
 const loadLimit=Math.min(6,need+maintenanceNeed,Math.floor(authorization/4),Math.floor(buyer/4));
 const wanted={power:4-built.power+(s.maintenanceAt!==null?2-serviced.power:0),air:4-built.air+(s.maintenanceAt!==null?2-serviced.air:0),structure:4-built.structure+(s.maintenanceAt!==null?2-serviced.structure:0)};
 return {firm,buyer,workers,supplier,authorization,need,delivered,maintenanceNeed,maintenanceDelivered,stock:available.length,available,produced:serial,sold:delivered+maintenanceDelivered,loadLimit,renewed:s.maintenanceAt!==null,periods,transfers,moneyBefore:156,moneyAfter:firm+buyer+workers+supplier,built,serviced,wanted,habitats:Math.min(...Object.values(built)),crates:available.map(id=>({id,kind:kinds.get(id)??null})),construction:!!s.construction};
}
export function freightCanLoad(s:SpaceFreight,crate:number){
 const a=freightAccount(s,s.pending);if(!a.available.includes(crate))return false;if(s.cargo.includes(crate))return true;if(s.cargo.filter(id=>id!==null).length>=a.loadLimit)return false;
 if(!s.construction)return true;const k=a.crates.find(c=>c.id===crate)!.kind!;return s.cargo.filter(id=>id!==null&&a.crates.find(c=>c.id===id)?.kind===k).length<a.wanted[k];
}
/** Matching a visible need only reserves the first free cargo position.
 * It neither delivers that part nor assigns it to a fictional resident. */
export function freightNeedSlot(s:SpaceFreight,crate:number,kind:FreightKind):number|null{
 if(!s.construction||s.phase!=='lab'||s.stage!=='loading'||!FREIGHT_KINDS.includes(kind)||s.cargo.includes(crate))return null;
 const a=freightAccount(s,s.pending);
 if(a.crates.find(c=>c.id===crate)?.kind!==kind||!freightCanLoad(s,crate))return null;
 const slot=s.cargo.indexOf(null);return slot<0?null:slot;
}
export function freightReducer(s:SpaceFreight,a:FreightAction):SpaceFreight{
 if(!a||typeof a!=='object')return s;
 if(a.type==='BEGIN')return s.phase==='intro'?{...s,phase:'lab'}:s;
 // Each completed contract is already archived. Start the next independent
 // comparison without deleting its actual shipments or extending its budget.
 if(a.type==='RETRY')return (s.phase==='lab'||s.phase==='conclusion')&&s.stage==='finished'?{...initialSpaceFreight(!!s.construction),phase:'lab',capacity:s.capacity,quantity:s.capacity,order:s.order,trials:s.trials.map(copyRecord)}:s;
 if(s.phase!=='lab')return s;
 switch(a.type){
  case 'CAPACITY':return s.stage==='planning'&&!s.history.length&&FREIGHT_CAPACITIES.includes(a.capacity as 2|4|6)&&a.capacity!==s.capacity?{...s,capacity:a.capacity,quantity:s.construction?s.plan!.slice(0,a.capacity).filter(Boolean).length:Math.min(s.quantity,a.capacity)}:s;
  case 'QUANTITY':return !s.construction&&s.stage==='planning'&&Number.isInteger(a.quantity)&&a.quantity>=0&&a.quantity<=s.capacity&&a.quantity!==s.quantity?{...s,quantity:a.quantity}:s;
  case 'PLAN':{
   if(!s.construction||s.stage!=='planning'||!Number.isInteger(a.slot)||a.slot<0||a.slot>=s.capacity||a.kind!==null&&!FREIGHT_KINDS.includes(a.kind)||s.plan![a.slot]===a.kind)return s;
   const plan=s.plan!.slice();plan[a.slot]=a.kind;return {...s,plan,quantity:plan.slice(0,s.capacity).filter(Boolean).length};
  }
  case 'CONTRACT':return s.stage==='planning'&&!s.history.length&&[4,12].includes(a.order)&&a.order!==s.order?{...s,order:a.order}:s;
  case 'PRODUCE':{
   if(s.stage!=='planning'||s.history.length>=3||a.expectedRound!==s.history.length)return s;
   const n=Math.min(s.quantity,Math.floor(freightAccount(s).firm/3));return {...s,stage:'loading',pending:n};
  }
  case 'LOAD':{
   if(s.stage!=='loading'||!Number.isInteger(a.crate)||!Number.isInteger(a.slot)||a.slot<0||a.slot>=6)return s;
   const current=s.cargo.indexOf(a.crate);
   if(s.cargo[a.slot]!==null||!freightCanLoad(s,a.crate))return s;
   const cargo=s.cargo.slice();if(current>=0)cargo[current]=null;cargo[a.slot]=a.crate;return {...s,cargo};
  }
  case 'LOAD_FOR_NEED':{
   if(a.expectedRound!==s.history.length)return s;
   const slot=freightNeedSlot(s,a.crate,a.kind);
   return slot===null?s:freightReducer(s,{type:'LOAD',crate:a.crate,slot});
  }
  case 'UNLOAD':{
   if(s.stage!=='loading'||!Number.isInteger(a.slot)||a.slot<0||a.slot>=6||s.cargo[a.slot]===null)return s;
   const cargo=s.cargo.slice();cargo[a.slot]=null;return {...s,cargo};
  }
  case 'LAUNCH':{
   if(s.stage!=='loading'||a.expectedRound!==s.history.length||s.pending===null)return s;
   const history=[...s.history,{produced:s.pending,shipped:s.cargo.filter((id):id is number=>id!==null),...(s.construction?{mix:freightBatch(s).slice(0,s.pending)}:{} )}],finished=history.length===3;
   const next={...s,history,stage:finished?'finished' as const:'planning' as const,pending:null,cargo:Array(6).fill(null)};
   if(!finished)return next;
   const run=copyRecord(next),trials=[...s.trials.filter(r=>signature(r)!==signature(run)),run].slice(-12);return {...next,trials};
  }
  case 'MAINTENANCE':return s.stage!=='finished'&&s.order===12&&s.maintenanceAt===null&&freightAccount(s,s.pending).need===0?{...s,maintenanceAt:s.history.length}:s;
  case 'CONCLUDE':return s.stage==='finished'&&s.trials.length>=2?{...s,phase:'conclusion'}:s;
  default:return s;
 }
}
export function restoreSpaceFreight(v:unknown):SpaceFreight|null{
 try{
  if(!v||typeof v!=='object')return null;const s=v as SpaceFreight;
  if(!validRecord(s)||!['intro','lab','conclusion'].includes(s.phase)||!['planning','loading','finished'].includes(s.stage)||!Number.isInteger(s.quantity)||s.quantity<0||s.quantity>s.capacity||!Array.isArray(s.cargo)||s.cargo.length!==6||s.cargo.some(id=>id!==null&&(!Number.isInteger(id)||id<0))||new Set(s.cargo.filter(id=>id!==null)).size!==s.cargo.filter(id=>id!==null).length||!Array.isArray(s.trials)||s.trials.length>12)return null;
  if(s.construction?(!Array.isArray(s.plan)||s.plan.length!==6||s.plan.some(k=>k!==null&&!FREIGHT_KINDS.includes(k))||s.quantity!==freightBatch(s).length):s.plan!==undefined)return null;
  const a=freightAccount(s,s.pending),cargo=s.cargo.filter((id):id is number=>id!==null);
  if(s.pending!==null&&s.pending!==Math.min(s.quantity,Math.floor(freightAccount(s).firm/3)))return null;
  if(s.stage==='loading'?(s.pending===null||cargo.length>a.loadLimit||cargo.some(id=>!a.available.includes(id))):(s.pending!==null||cargo.length!==0))return null;
  if(s.construction&&FREIGHT_KINDS.some(k=>cargo.filter(id=>a.crates.find(c=>c.id===id)?.kind===k).length>a.wanted[k]))return null;
  if(s.stage==='finished'?(s.history.length!==3):(s.history.length===3))return null;
  if(s.trials.some(r=>!validRecord(r)||r.history.length!==3||r.construction!==s.construction)||new Set(s.trials.map(signature)).size!==s.trials.length)return null;
  s.trials.forEach(r=>freightAccount(r));
  if(s.stage==='finished'&&(!s.trials.length||JSON.stringify(copyRecord(s.trials.at(-1)!))!==JSON.stringify(copyRecord(s))))return null;
  if(s.phase==='intro'&&(s.history.length||s.trials.length||s.pending!==null||s.stage!=='planning'||s.maintenanceAt!==null)||s.phase==='conclusion'&&(s.stage!=='finished'||s.trials.length<2))return null;
  return {...copyRecord(s),phase:s.phase,stage:s.stage,quantity:s.quantity,pending:s.pending,cargo:s.cargo.slice(),trials:s.trials.map(copyRecord),...(s.construction?{plan:s.plan!.slice()}:{} )};
 }catch{return null;}
}
