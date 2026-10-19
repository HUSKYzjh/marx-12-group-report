import * as legacy from './course-legacy.mjs';
import {SIMPLE_RULE,simpleRules,simpleWorld,simpleMoves,simpleIssue,simpleRound,simpleCapacity,simpleRival} from './simple-consequences.mjs';
import {equipmentWorld,equipmentMoves,equipmentIssue,equipmentRound,equippedCapacity,readyShop,equipmentRival,batchUpgrade} from './equipment-model.mjs';
import {rivalMove,capacity,money} from './battle-model.mjs';
export const {MODES,TITLES,LENGTHS}=legacy;
const old=s=>s.version===2,copy=s=>structuredClone(s);
export const initialCourse=(batch=true,profitChallenge=true,splitActs=profitChallenge,simplified=false,externalOnly=false)=>({version:3,mode:'steady',world:simplified?simpleWorld():equipmentWorld(false,batch),archive:{},traced:[],...(profitChallenge?{profitChallenge:true}:{}),...(splitActs?{splitActs:true}:{}),...(externalOnly?{externalOnly:true}:{})});
export function adoptEquipmentCourse(previous,batch=true,profitChallenge=true,splitActs=profitChallenge,simplified=false,externalOnly=false){const valid=previous?.version===2?legacy.restoreCourse(previous):restoreCourse(previous);if(!valid)throw Error('Invalid previous course');return {...initialCourse(batch,profitChallenge,splitActs,simplified,externalOnly),previousCourse:valid};}
export const finished=s=>legacy.finished(s);
const wagesAllowed=s=>s.mode==='social'||s.splitActs&&s.mode==='steady';
const worldFor=(s,social=false)=>simpleRules(s.world)?simpleWorld(social):equipmentWorld(social,batchUpgrade(s.world));
const roundFor=(s,w,a,mode=s.mode)=>simpleRules(w)?simpleRound(w,a,mode,!!wagesAllowed({...s,mode})):equipmentRound(w,a,mode,!!wagesAllowed({...s,mode}));
export const courseMoves=s=>old(s)?legacy.courseMoves(s):simpleRules(s.world)?simpleMoves(s.world,!!wagesAllowed(s)):equipmentMoves(s.world,!!wagesAllowed(s));
export const courseIssue=(s,a)=>old(s)?legacy.courseIssue(s,a):simpleRules(s.world)?simpleIssue(s.world,a,s.mode==='social',!!wagesAllowed(s)):equipmentIssue(s.world,a,s.mode==='social',!!wagesAllowed(s));
export const courseRival=s=>old(s)?rivalMove(s.world):simpleRules(s.world)?simpleRival():equipmentRival(s.world);
export const courseCapacity=(s,f)=>old(s)?(['social','source','done'].includes(s.mode)?capacity(f):f.nextQuantity):simpleRules(s.world)?simpleCapacity(f):equippedCapacity(readyShop(f));
export function courseRound(s,action){
 if(old(s))return legacy.courseRound(s,action);
 if(!['steady','waves','social'].includes(s.mode)||finished(s)||courseIssue(s,action))throw Error('Unavailable course move');
 return {...copy(s),world:roundFor(s,s.world,action)};
}
export function nextCourse(s){
 if(old(s))return legacy.nextCourse(s);
 const out=copy(s);
 if(s.mode==='steady'&&finished(s)){out.archive.steady=copy(s.world);out.mode='waves';out.world=worldFor(s);}
 else if(s.mode==='waves'&&finished(s)){out.archive.waves=copy(s.world);out.mode=s.externalOnly?'done':s.profitChallenge?'social':'source';if(!s.externalOnly)out.world=s.profitChallenge?worldFor(s,true):equipmentRound(equipmentWorld(true,batchUpgrade(s.world)),'hold','social');out.traced=[];}
 else if(s.mode==='source'&&s.traced.length===2)out.mode='social';
 else if(s.mode==='social'&&finished(s))out.mode='done';
 else throw Error('Not ready for next scene');return out;
}
// A saved old tracing page can opt into the new challenge without losing its ledger.
export function beginProfitChallenge(s){
 if(s.version!==3||s.mode!=='source')throw Error('Not an old source page');
 let out=adoptEquipmentCourse(s,batchUpgrade(s.world));
 for(const r of s.archive.steady.history)out=courseRound(out,r.action);
 out=nextCourse(out);for(const r of s.archive.waves.history)out=courseRound(out,r.action);
 return nextCourse(out);
}
export function crossCustomers(s){
 if(old(s))return legacy.crossCustomers(s);
 if(!['source','social','done'].includes(s.mode))return [];
 const r=s.world.history[0];
 if(!r)return [];
 return [0,1].map(employer=>r.visits.find(v=>v.bought&&v.shop!==employer&&r.receipts.some(p=>p.reason==='工资'&&p.from==='f'+employer&&p.to==='p'+v.id))?.id).filter(id=>id!==undefined);
}
export function traceCustomer(s,id){if(old(s))return legacy.traceCustomer(s,id);if(s.mode!=='source'||!crossCustomers(s).includes(id))throw Error('Not a paid cross-shop trace');const out=copy(s);if(!out.traced.includes(id))out.traced.push(id);return out;}
export function retryScene(s){
 if(old(s))return legacy.retryScene(s);
 const out=copy(s);
 if(s.externalOnly&&s.mode==='done'){out.mode='waves';out.world=worldFor(s);delete out.archive.waves;}
 else if(s.mode==='steady'||s.mode==='waves')out.world=worldFor(s);
 else if(['social','done'].includes(s.mode)){out.mode='social';out.world=s.profitChallenge?worldFor(s,true):equipmentRound(equipmentWorld(true,batchUpgrade(s.world)),'hold','social');}
 return out;
}
export function undoCourse(s){
 if(old(s))return legacy.undoCourse(s);
 if(!s.world.day||['source','done'].includes(s.mode)||!s.profitChallenge&&s.mode==='social'&&s.world.day<=1)return s;
 return {...copy(s),world:s.world.history.slice(0,-1).reduce((w,r)=>roundFor(s,w,r.action),worldFor(s,s.mode==='social'))};
}
export function restoreCourse(saved){
 if(saved?.version===2)return legacy.restoreCourse(saved);
 try{
  if(saved?.version!==3||!MODES.includes(saved.mode))return null;
  if(saved.externalOnly!==undefined&&(saved.externalOnly!==true||!saved.splitActs||!simpleRules(saved.world)||!['steady','waves','done'].includes(saved.mode)))return null;
  if(saved.profitChallenge!==undefined&&saved.profitChallenge!==true)return null;
  if(saved.splitActs!==undefined&&(saved.splitActs!==true||!saved.profitChallenge))return null;
  if(saved.world?.upgradeRule!==undefined&&saved.world.upgradeRule!=='whole-shop-v1')return null;
  if(saved.world?.ruleSet!==undefined&&saved.world.ruleSet!==SIMPLE_RULE)return null;
  const batch=batchUpgrade(saved.world),simplified=simpleRules(saved.world);
  let s=saved.previousCourse?adoptEquipmentCourse(saved.previousCourse,batch,!!saved.profitChallenge,!!saved.splitActs,simplified,!!saved.externalOnly):initialCourse(batch,!!saved.profitChallenge,!!saved.splitActs,simplified,!!saved.externalOnly);
  const play=world=>{for(const r of world.history)s=courseRound(s,r.action);};
  if(saved.mode==='steady')play(saved.world);
  else{play(saved.archive.steady);s=nextCourse(s);if(saved.mode==='waves')play(saved.world);else{play(saved.archive.waves);s=nextCourse(s);if(saved.externalOnly){if(saved.mode!=='done')return null;}else if(saved.profitChallenge){if(saved.mode==='source')return null;play(saved.world);if(saved.mode==='done')s=nextCourse(s);}else{for(const id of saved.traced)s=traceCustomer(s,id);if(saved.mode!=='source'){s=nextCourse(s);for(const r of saved.world.history.slice(1))s=courseRound(s,r.action);if(saved.mode==='done')s=nextCourse(s);}}}}
  return JSON.stringify(s)===JSON.stringify(saved)?s:null;
 }catch{return null;}
}
export function auditCourse(s){if(!s.externalOnly&&['source','social','done'].includes(s.mode)&&money(s.world)!==120)throw Error('Social ledger mismatch');return s;}

// Preserve every old ledger, while continuing the external-demand acts in place.
// The finite-wallet experiment now has its own six-firm scene in the parent.
export function externalDemandCourse(saved){
 if(saved.externalOnly)return saved;
 if(!simpleRules(saved.world))throw Error('Expected immediate-rule course');
 let s=adoptEquipmentCourse(saved,true,true,true,true,true);
 const play=world=>{for(const r of world.history)s=courseRound(s,r.action);};
 if(saved.mode==='steady')play(saved.world);
 else{play(saved.archive.steady);s=nextCourse(s);play(saved.mode==='waves'?saved.world:saved.archive.waves);if(saved.mode!=='waves')s=nextCourse(s);}
 return s;
}
