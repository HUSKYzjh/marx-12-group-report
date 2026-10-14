/** Approved discretionary distribution followed by a separate weighted ballot.
 * Three hypothetical constitutions, not an ownership conversion simulator.
 * Every retry is an independent experiment with the same 88 funded coins. */
import {initialCouncilProduction,assignProduction,runProduction,restoreCouncilProduction,productionAccount,type CouncilProduction,type ProductionSeed,type ProductionJob} from './council-production.ts';
export const COUNCIL_MODES=['bonus','minority','coop'] as const;
export type CouncilMode=typeof COUNCIL_MODES[number];
export type CouncilBallot='divide'|'invest';
export type Recipient=number|'owner';
export type CouncilTrial={mode:CouncilMode;allocation:Recipient[];ballot:CouncilBallot;others:CouncilBallot[];personal?:true};
export type ProductionTrial={decision:CouncilTrial;production:CouncilProduction};
export type SharingCouncil={phase:'intro'|'lab'|'conclusion';step:'money'|'ballot'|'result'|'production';mode:CouncilMode;allocation:(Recipient|null)[];loose:boolean;paid:Recipient[]|null;ballot:CouncilBallot|null;others:CouncilBallot[];run:CouncilTrial|null;trials:CouncilTrial[];revision:number;personal?:true;productionEnabled?:true;production?:CouncilProduction;productionTrials?:ProductionTrial[]};
// Fictional, disclosed characters, not an empirical theory of voter behaviour.
export const COUNCIL_PEOPLE=[
 {name:'阿面',wish:'换双鞋',target:4,before:'鞋底开了，先顾眼前吧。',after:'鞋钱够了，下一笔我想添机器。'},
 {name:'小麦',wish:'付房租',target:6,before:'房租还没凑够，我想再分一点。',after:'房租够了，下一笔我想添机器。'},
 {name:'团团',wish:'添家用品',target:5,before:'家里还差些东西，我想再分一点。',after:'家用够了，下一笔我想添机器。'},
 {name:'圆圆',wish:'省些揉面力气',target:null,before:'揉面太累了，我想添机器。',after:'揉面太累了，我想添机器。'},
 {name:'阿青',wish:'学用新机器',target:null,before:'我想学用新机器。',after:'我想学用新机器。'},
 {name:'你',wish:'下一笔由你选择',target:null,before:'收入和票权，分开看看。',after:'收入和票权，分开看看。'},
] as const;
export function councilPreferences(paid:Recipient[]|null):CouncilBallot[]{return COUNCIL_PEOPLE.slice(0,5).map((p,id)=>p.target===null||2+(paid?.filter(to=>to===id).length??0)>=p.target?'invest':'divide');}
export type CouncilAction={type:'BEGIN'}|{type:'CONDITION';mode:CouncilMode}|{type:'RECHARTER';mode:CouncilMode}|{type:'REARRANGE'}|{type:'COIN';coin:number;to:Recipient|null}|{type:'ROLL';roll:number;to:Recipient|null}|{type:'LOOSE';enabled:boolean}|{type:'DISTRIBUTE';expectedRevision:number}|{type:'OPINION';person:number;to:CouncilBallot}|{type:'BALLOT';to:CouncilBallot|null}|{type:'VOTE';expectedRevision:number}|{type:'RETRY'}|{type:'CONCLUDE'}|{type:'PRODUCTION_BEGIN'}|{type:'PRODUCTION_ASSIGN';person:number;job:ProductionJob}|{type:'PRODUCTION_RUN';expectedRevision:number}|{type:'PRODUCTION_RETRY'}|{type:'PRODUCTION_BACK'};
const recipient=(v:unknown):v is Recipient=>v==='owner'||Number.isInteger(v)&&Number(v)>=0&&Number(v)<6;
const allocationValid=(a:unknown,mode:CouncilMode,partial:boolean):a is (Recipient|null)[]=>Array.isArray(a)&&a.length===12&&a.every(v=>partial&&v===null||recipient(v)&&!(mode==='coop'&&v==='owner'));
const othersValid=(v:unknown):v is CouncilBallot[]=>Array.isArray(v)&&v.length===5&&v.every(b=>b==='divide'||b==='invest');
const defaults=():CouncilBallot[]=>['divide','divide','divide','invest','invest'];
const trialValid=(v:unknown):v is CouncilTrial=>!!v&&typeof v==='object'&&COUNCIL_MODES.includes((v as CouncilTrial).mode)&&allocationValid((v as CouncilTrial).allocation,(v as CouncilTrial).mode,false)&&['divide','invest'].includes((v as CouncilTrial).ballot)&&othersValid((v as CouncilTrial).others)&&[(undefined),true].includes((v as CouncilTrial).personal)&&(!(v as CouncilTrial).personal||JSON.stringify((v as CouncilTrial).others)===JSON.stringify(councilPreferences((v as CouncilTrial).allocation)));
const copy=(p:CouncilTrial):CouncilTrial=>({mode:p.mode,allocation:p.allocation.slice(),ballot:p.ballot,others:p.others.slice(),...(p.personal?{personal:true as const}:{})});
const signature=(p:CouncilTrial)=>{const amounts=Array.from({length:6},(_,i)=>p.allocation.filter(v=>v===i).length);return [p.personal?'personal':'legacy',p.mode,p.ballot,p.others.filter(b=>b==='divide').length,p.allocation.filter(v=>v==='owner').length,...(p.personal?amounts:amounts.sort((a,b)=>a-b))].join('|');};
export function initialSharingCouncil(personal=false,production=false):SharingCouncil{return {phase:'intro',step:'money',mode:'bonus',allocation:Array(12).fill(null),loose:false,paid:null,ballot:null,others:defaults(),run:null,trials:[],revision:0,...(personal?{personal:true as const,...(production?{productionEnabled:true as const,productionTrials:[]}: {})}:{})};}
const productionSignature=(t:ProductionTrial)=>signature(t.decision)+'|'+JSON.stringify(t.production.history);
const copyProduction=(p:CouncilProduction):CouncilProduction=>({seed:{...p.seed,workers:p.seed.workers.slice()},jobs:p.jobs.slice(),history:p.history.map(r=>({jobs:r.jobs.slice()}))});
const copyProductionTrial=(t:ProductionTrial):ProductionTrial=>({decision:copy(t.decision),production:copyProduction(t.production)});
export const councilCanConclude=(s:SharingCouncil)=>s.trials.length>=2&&(!s.productionEnabled||Array.isArray(s.production?.history)&&s.production.history.length===3&&Array.isArray(s.productionTrials)&&s.productionTrials.length>=2);
export function sharingCouncilReducer(s:SharingCouncil,a:CouncilAction):SharingCouncil{
 if(!a||typeof a!=='object')return s;
 if(a.type==='BEGIN')return s.phase==='intro'?{...s,phase:'lab'}:s;
 const reset=(mode:CouncilMode)=>{const {production:_production,...base}=s;return {...base,mode,step:'money' as const,allocation:Array(12).fill(null),loose:false,paid:null,ballot:null,others:defaults(),run:null,revision:s.revision+1};};
 if(a.type==='RETRY')return (s.phase==='lab'&&s.step==='result'||s.phase==='conclusion'&&councilCanConclude(s))?{...reset(s.mode),phase:'lab'}:s;
 if(s.phase!=='lab')return s;
 const change=(p:Partial<SharingCouncil>)=>({...s,...p,revision:s.revision+1});
 switch(a.type){
  case 'CONDITION':return COUNCIL_MODES.includes(a.mode)&&s.step!=='ballot'&&s.step!=='production'&&a.mode!==s.mode?reset(a.mode):s;
  case 'RECHARTER':case 'REARRANGE':{
   const mode=a.type==='RECHARTER'?a.mode:s.mode;
   if(s.step!=='result'||!s.run||!COUNCIL_MODES.includes(mode)||a.type==='RECHARTER'&&mode===s.mode)return s;
   const next=reset(mode);
   // Carry the paid arrangement into a NEW, uncommitted proposal, not the
   // previous wallets. No free ownership transfer or extra actual payout.
   // A cooperative has no external owner pocket: in that case redistribute
   // explicitly instead of silently turning the owner's coins into wages.
   return allocationValid(s.run.allocation,mode,false)?{...next,allocation:s.run.allocation.slice(),loose:s.loose}:next;
  }
  case 'COIN':case 'ROLL':{
   if(s.step!=='money'||a.to!==null&&(!recipient(a.to)||s.mode==='coop'&&a.to==='owner'))return s;
   const id=a.type==='COIN'?a.coin:a.roll,max=a.type==='COIN'?12:6;
   if(!Number.isInteger(id)||id<0||id>=max||a.type==='COIN'&&!s.loose||a.type==='ROLL'&&s.loose)return s;
   const ids=a.type==='COIN'?[id]:[id*2,id*2+1],allocation=s.allocation.slice();if(ids.every(i=>allocation[i]===a.to))return s;ids.forEach(i=>allocation[i]=a.to);return change({allocation});
  }
  case 'LOOSE':return s.step==='money'&&typeof a.enabled==='boolean'&&a.enabled!==s.loose&&(a.enabled||s.allocation.every((to,i)=>i%2===0||to===s.allocation[i-1]))?change({loose:a.enabled}):s;
  case 'DISTRIBUTE':return s.step==='money'&&a.expectedRevision===s.revision&&allocationValid(s.allocation,s.mode,false)?change({step:'ballot',paid:s.allocation.slice() as Recipient[],...(s.personal?{others:councilPreferences(s.allocation as Recipient[])}:{})}):s;
  case 'BALLOT':return s.step==='ballot'&&[null,'divide','invest'].includes(a.to)&&a.to!==s.ballot?change({ballot:a.to}):s;
  case 'OPINION':{if(s.personal||s.step!=='ballot'||!Number.isInteger(a.person)||a.person<0||a.person>=5||!['divide','invest'].includes(a.to)||s.others[a.person]===a.to)return s;const others=s.others.slice();others[a.person]=a.to;return change({others});}
  case 'VOTE':{
   if(s.step!=='ballot'||!s.paid||!s.ballot||a.expectedRevision!==s.revision)return s;
   const run:CouncilTrial={mode:s.mode,allocation:s.paid.slice(),ballot:s.ballot,others:s.others.slice(),...(s.personal?{personal:true as const}:{})},trials=[...s.trials.filter(t=>signature(t)!==signature(run)),run].slice(-12);return change({step:'result',run,trials});
  }
  case 'PRODUCTION_BEGIN':return s.productionEnabled&&s.step==='result'&&s.run?change({step:'production',production:s.production??initialCouncilProduction(councilProductionSeed(s.run))}):s;
  case 'PRODUCTION_ASSIGN':{if(s.step!=='production'||!s.production)return s;const production=assignProduction(s.production,a.person,a.job);return production===s.production?s:change({production});}
  case 'PRODUCTION_RUN':{
   if(s.step!=='production'||!s.production||!s.run||s.revision!==a.expectedRevision||s.production.history.length===3)return s;
   const production=runProduction(s.production),trial:ProductionTrial={decision:copy(s.run),production:copyProduction(production)};
   const productionTrials=production.history.length===3?[...(s.productionTrials??[]).filter(t=>productionSignature(t)!==productionSignature(trial)),trial].slice(-12):s.productionTrials;
   return change({production,productionTrials});
  }
  case 'PRODUCTION_RETRY':return s.step==='production'&&s.run&&s.production?.history.length===3?change({production:initialCouncilProduction(councilProductionSeed(s.run))}):s;
  case 'PRODUCTION_BACK':return s.step==='production'?change({step:'result'}):s;
  case 'CONCLUDE':return (s.step==='result'||s.step==='production')&&councilCanConclude(s)?{...s,phase:'conclusion'}:s;
  default:return s;
 }
}
export function councilAccount(mode:CouncilMode,paid:Recipient[]|null,ballot:CouncilBallot|null=null,others:CouncilBallot[]=defaults(),personal=false){
 if(!COUNCIL_MODES.includes(mode)||paid!==null&&!allocationValid(paid,mode,false)||ballot!==null&&!['divide','invest'].includes(ballot)||ballot!==null&&paid===null||!othersValid(others))throw new Error('Invalid council account');
 if(personal&&JSON.stringify(others)!==JSON.stringify(councilPreferences(paid)))throw new Error('Contradictory personal preferences');
 const weights={bonus:{worker:0,owner:1},minority:{worker:1,owner:7},coop:{worker:1,owner:0}}[mode];
 const preferences:CouncilBallot[]=[...others,ballot??'divide'];
 const divideVotes=ballot===null?null:preferences.filter(v=>v==='divide').length*weights.worker,investVotes=ballot===null?null:preferences.filter(v=>v==='invest').length*weights.worker+weights.owner;
 const outcome:CouncilBallot|'hold'|null=divideVotes===null||investVotes===null?null:divideVotes===investVotes?'hold':divideVotes>investVotes?'divide':'invest';
 const firstOwner=paid?paid.filter(v=>v==='owner').length:0,firstWorkers=paid?12-firstOwner:0,extraWorkers=outcome==='divide'?12:0,equipment=outcome==='invest'?12:0;
 const firm=64-(paid?12:0)-extraWorkers-equipment,workers=12+firstWorkers+extraWorkers,owner=firstOwner,supplier=12,equipmentSupplier=equipment;
 const transfers:{from:string;to:string;amount:number;kind:string}[]=[{from:'buyers',to:'firm',amount:48,kind:'sale'},{from:'firm',to:'supplier',amount:12,kind:'inputs'},...Array.from({length:6},(_,i)=>({from:'firm',to:'worker-'+i,amount:2,kind:'wage'}))];
 const people=Array.from({length:6},(_,id)=>{const first=paid?paid.filter(v=>v===id).length:0;if(first)transfers.push({from:'firm',to:'worker-'+id,amount:first,kind:'distribution'});if(extraWorkers)transfers.push({from:'firm',to:'worker-'+id,amount:2,kind:'ballot-distribution'});const character=COUNCIL_PEOPLE[id],gap=character.target===null?null:Math.max(0,character.target-(2+first));return {id,first,income:2+first+extraWorkers/6,votes:weights.worker,preference:preferences[id],...(personal?{name:character.name,wish:character.wish,target:character.target,gap,beforeBallotIncome:2+first,voice:gap===0?character.after:character.before}:{} )};});
 if(firstOwner)transfers.push({from:'firm',to:'owner',amount:firstOwner,kind:'distribution'});if(equipment)transfers.push({from:'firm',to:'equipmentSupplier',amount:12,kind:'investment'});
 return {mode,firstWorkers,firstOwner,extraWorkers,equipment,firm,workers,owner,supplier,equipmentSupplier,buyers:0,people,workerWeight:weights.worker,ownerVotes:weights.owner,divideVotes,investVotes,outcome,produced:12,sold:12,receipts:48,wages:12,inputs:12,cashSurplus:24,transfers,moneyBefore:88,moneyAfter:firm+workers+owner+supplier+equipmentSupplier};
}
export const councilTrialAccount=(p:CouncilTrial)=>councilAccount(p.mode,p.allocation,p.ballot,p.others,!!p.personal);
export function councilProductionSeed(p:CouncilTrial):ProductionSeed{const a=councilTrialAccount(p);return {fast:a.equipment===12,firm:a.firm,workers:a.people.map(person=>person.income),owner:p.mode==='coop'?null:a.owner,supplier:a.supplier,equipmentSupplier:a.equipmentSupplier,buyers:a.buyers};}
export const councilProductionTrials=(s:SharingCouncil)=>(s.productionTrials??[]).map(t=>({mode:t.decision.mode,outcome:councilTrialAccount(t.decision).outcome,...productionAccount(t.production)}));
export function restoreSharingCouncil(v:unknown):SharingCouncil|null{
 if(!v||typeof v!=='object')return null;const s=v as SharingCouncil;
 if(s.personal!==undefined&&s.personal!==true||s.run&&s.run.personal!==s.personal||Array.isArray(s.trials)&&s.trials.some(t=>t?.personal!==s.personal)||s.personal&&s.paid!==null&&(!allocationValid(s.paid,s.mode,false)||JSON.stringify(s.others)!==JSON.stringify(councilPreferences(s.paid))))return null;
 if(!COUNCIL_MODES.includes(s.mode)||!othersValid(s.others)||!['intro','lab','conclusion'].includes(s.phase)||!['money','ballot','result','production'].includes(s.step)||!allocationValid(s.allocation,s.mode,true)||typeof s.loose!=='boolean'||!s.loose&&s.allocation.some((v,i)=>i%2===1&&v!==s.allocation[i-1])||s.paid!==null&&!allocationValid(s.paid,s.mode,false)||![null,'divide','invest'].includes(s.ballot)||s.run!==null&&!trialValid(s.run)||!Array.isArray(s.trials)||s.trials.length>12||s.trials.some(t=>!trialValid(t))||new Set(s.trials.map(signature)).size!==s.trials.length||!Number.isSafeInteger(s.revision)||s.revision<0)return null;
 if(s.step==='money'&&(s.paid!==null||s.ballot!==null||s.run!==null||JSON.stringify(s.others)!==JSON.stringify(defaults()))||s.step!=='money'&&(s.paid===null||JSON.stringify(s.allocation)!==JSON.stringify(s.paid))||s.step==='ballot'&&s.run!==null||['result','production'].includes(s.step)&&(!s.run||!s.ballot||JSON.stringify(copy(s.run))!==JSON.stringify({mode:s.mode,allocation:s.paid,ballot:s.ballot,others:s.others,...(s.personal?{personal:true}:{})})||!s.trials.length||JSON.stringify(copy(s.trials.at(-1)!))!==JSON.stringify(copy(s.run)))||s.phase==='conclusion'&&(!['result','production'].includes(s.step)||!councilCanConclude(s))||s.phase==='intro'&&(s.revision!==0||s.step!=='money'||s.mode!=='bonus'||s.loose||s.allocation.some(v=>v!==null)||s.trials.length))return null;
 if(s.productionEnabled!==undefined&&s.productionEnabled!==true||!s.productionEnabled&&(s.production!==undefined||s.productionTrials!==undefined||s.step==='production')||s.productionEnabled&&(!s.personal||!Array.isArray(s.productionTrials)||s.productionTrials.length>12||s.step==='production'&&!s.production||s.production&&(!s.run||!['result','production'].includes(s.step))||s.phase==='intro'&&s.productionTrials.length))return null;
 const restoredProduction=s.production&&s.run?restoreCouncilProduction(s.production,councilProductionSeed(s.run)):undefined;
 if(s.production&&!restoredProduction)return null;
 const productionTrials:ProductionTrial[]=[];
 for(const t of s.productionTrials??[]){if(!t||!trialValid(t.decision)||t.decision.personal!==s.personal)return null;const production=restoreCouncilProduction(t.production,councilProductionSeed(t.decision));if(!production||production.history.length!==3)return null;productionTrials.push({decision:copy(t.decision),production});}
 if(new Set(productionTrials.map(productionSignature)).size!==productionTrials.length||restoredProduction?.history.length===3&&s.run&&!productionTrials.some(t=>productionSignature(t)===productionSignature({decision:s.run!,production:restoredProduction})))return null;
 return {phase:s.phase,step:s.step,mode:s.mode,allocation:s.allocation.slice(),loose:s.loose,paid:s.paid?s.paid.slice():null,ballot:s.ballot,others:s.others.slice(),run:s.run?copy(s.run):null,trials:s.trials.map(copy),revision:s.revision,...(s.personal?{personal:true as const}:{}),...(s.productionEnabled?{productionEnabled:true as const,productionTrials:productionTrials.map(copyProductionTrial),...(restoredProduction?{production:restoredProduction}:{})}:{})};
}
