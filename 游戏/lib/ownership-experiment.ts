/** Conditional, integer-coin experiments. No empirical parameter calibration.
 * Collaboration, income rights and control rights are deliberately separate.
 * Accounts are replayed from fixed wallets; no money is minted on mode changes. */
import {initialPlatformNetwork,platformNetworkReducer,restorePlatformNetwork,type PlatformNetwork,type NetworkAction} from './platform-network.ts';
import {initialSharingCouncil,sharingCouncilReducer,restoreSharingCouncil,type SharingCouncil,type CouncilAction} from './sharing-council.ts';
export const OWNERSHIP_BRANCHES=['concentration','sharing'] as const;
export type OwnershipBranch=typeof OWNERSHIP_BRANCHES[number];
export const PLATFORM_MODES=['locked','portable','joint'] as const;
export type PlatformMode=typeof PLATFORM_MODES[number];
export const SHARE_MODES=['bonus','minority','coop'] as const;
export type ShareMode=typeof SHARE_MODES[number];
export type Ballot='divide'|'invest';
export type OwnershipState={branch:OwnershipBranch;phase:'intro'|'lab'|'conclusion';platformMode:PlatformMode;fee:number;round:0|1|2;shareMode:ShareMode;ballot:Ballot;seen:number;run:{mode:ShareMode;ballot:Ballot}|null;network?:PlatformNetwork;council?:SharingCouncil};
export function initialOwnership(branch:OwnershipBranch='concentration'):OwnershipState{return {branch,phase:'intro',platformMode:'locked',fee:3,round:0,shareMode:'bonus',ballot:'divide',seen:0,run:null};}
export type OwnershipAction={type:'BEGIN'}|{type:'PLATFORM_MODE';mode:PlatformMode}|{type:'FEE';delta:-1|1}|{type:'OPERATE';expectedRound:number}|{type:'SHARE_MODE';mode:ShareMode}|{type:'BALLOT';ballot:Ballot}|{type:'VOTE'}|{type:'CONCLUDE'}|{type:'RESTART'}|{type:'NETWORK';action:NetworkAction}|{type:'COUNCIL';action:CouncilAction};
export function ownershipReducer(s:OwnershipState,a:OwnershipAction):OwnershipState{
 if(!a||typeof a!=='object')return s;
 if(a.type==='COUNCIL'){
  if(s.branch!=='sharing'||!s.council&&(s.phase!=='intro'||a.action?.type!=='BEGIN'))return s;
  const before=s.council??initialSharingCouncil(true,true),council=sharingCouncilReducer(before,a.action);if(council===before)return s;
  return {...s,phase:council.phase,shareMode:council.mode,ballot:council.ballot??'divide',round:0,seen:0,run:null,council};
 }
 if(s.council)return a.type==='RESTART'?initialOwnership('sharing'):s;
 if(a.type==='NETWORK'){
  if(s.branch!=='concentration'||!s.network&&(s.phase!=='intro'||a.action?.type!=='BEGIN'))return s;
  const before=s.network??initialPlatformNetwork(),network=platformNetworkReducer(before,a.action);if(network===before)return s;
  return {...s,phase:network.phase,platformMode:network.rule,fee:network.fee,round:network.history.length as 0|1|2,seen:0,run:null,network};
 }
 if(s.network)return a.type==='RESTART'?initialOwnership('concentration'):s;
 switch(a.type){
  case 'BEGIN':return s.phase==='intro'?{...s,phase:'lab'}:s;
  case 'PLATFORM_MODE':return s.phase==='lab'&&s.branch==='concentration'&&PLATFORM_MODES.includes(a.mode)&&a.mode!==s.platformMode?{...s,platformMode:a.mode,round:0}:s;
  case 'FEE':return s.phase==='lab'&&s.branch==='concentration'&&s.platformMode!=='joint'&&[-1,1].includes(a.delta)&&s.fee+a.delta>=0&&s.fee+a.delta<=6?{...s,fee:s.fee+a.delta,round:0,seen:0}:s;
  case 'OPERATE':{
   if(s.phase!=='lab'||s.branch!=='concentration'||s.round===2||s.round!==a.expectedRound)return s;
   const round=(s.round+1) as 1|2;return {...s,round,seen:round===2?s.seen|(1<<PLATFORM_MODES.indexOf(s.platformMode)):s.seen};
  }
  case 'SHARE_MODE':return s.phase==='lab'&&s.branch==='sharing'&&SHARE_MODES.includes(a.mode)?{...s,shareMode:a.mode}:s;
  case 'BALLOT':return s.phase==='lab'&&s.branch==='sharing'&&['divide','invest'].includes(a.ballot)?{...s,ballot:a.ballot}:s;
  case 'VOTE':return s.phase==='lab'&&s.branch==='sharing'?{...s,run:{mode:s.shareMode,ballot:s.ballot},seen:s.seen|(1<<SHARE_MODES.indexOf(s.shareMode))}:s;
  case 'CONCLUDE':return s.phase==='lab'&&s.seen===7&&(s.branch==='concentration'?s.round===2:s.run!==null)?{...s,phase:'conclusion'}:s;
  case 'RESTART':return initialOwnership(s.branch);
  default:return s;
 }
}
export function restoreOwnership(value:unknown):OwnershipState|null{
 if(!value||typeof value!=='object')return null;const s=value as OwnershipState;
 if(!OWNERSHIP_BRANCHES.includes(s.branch)||!['intro','lab','conclusion'].includes(s.phase)||!PLATFORM_MODES.includes(s.platformMode)||!SHARE_MODES.includes(s.shareMode)||!['divide','invest'].includes(s.ballot)||!Number.isInteger(s.fee)||s.fee<0||s.fee>6||![0,1,2].includes(s.round)||!Number.isInteger(s.seen)||s.seen<0||s.seen>7)return null;
 if(s.run!==null&&(!s.run||!SHARE_MODES.includes(s.run.mode)||!['divide','invest'].includes(s.run.ballot)))return null;
 if(s.council!==undefined){
  const council=restoreSharingCouncil(s.council);if(!council||s.network!==undefined||s.branch!=='sharing'||s.phase!==council.phase||s.shareMode!==council.mode||s.ballot!==(council.ballot??'divide')||s.round!==0||s.seen!==0||s.run!==null)return null;
  return {branch:s.branch,phase:s.phase,platformMode:s.platformMode,fee:s.fee,round:0,shareMode:s.shareMode,ballot:s.ballot,seen:0,run:null,council};
 }
 if(s.network!==undefined){
  const network=restorePlatformNetwork(s.network);if(!network||s.branch!=='concentration'||s.phase!==network.phase||s.platformMode!==network.rule||s.fee!==network.fee||s.round!==network.history.length||s.seen!==0||s.run!==null)return null;
  return {branch:s.branch,phase:s.phase,platformMode:s.platformMode,fee:s.fee,round:s.round,shareMode:s.shareMode,ballot:s.ballot,seen:0,run:null,network};
 }
 if(s.branch==='concentration'&&(s.run!==null||s.round===2&&!(s.seen&(1<<PLATFORM_MODES.indexOf(s.platformMode)))))return null;
 if(s.branch==='sharing'&&(s.round!==0||s.run===null&&s.seen!==0||s.run!==null&&!(s.seen&(1<<SHARE_MODES.indexOf(s.run.mode)))))return null;
 if(s.phase==='intro'&&(s.round!==0||s.seen!==0||s.run!==null)||s.phase==='conclusion'&&(s.seen!==7||(s.branch==='concentration'?s.round!==2:s.run===null)))return null;
 return {branch:s.branch,phase:s.phase,platformMode:s.platformMode,fee:s.fee,round:s.round,shareMode:s.shareMode,ballot:s.ballot,seen:s.seen,run:s.run?{mode:s.run.mode,ballot:s.run.ballot}:null};
}
export function platformAccount(mode:PlatformMode,fee:number,round:number){
 if(!PLATFORM_MODES.includes(mode)||!Number.isInteger(fee)||fee<0||fee>6||![0,1,2].includes(round))throw new Error('Invalid platform scenario');
 const charge=mode==='joint'?1:fee,migration=mode==='locked'?6:1;
 let shops=[20,20,20],platform=12,alternative=12,buyers=72,workers=0,supplier=0;
 const periods=[];
 for(let day=1;day<=round;day++){
  const before=shops.slice(),switching=day===2?migration:0,fees=day===1?[charge,charge,charge]:[2,charge,charge];
  for(let i=0;i<3;i++){
   const costs=4+2+fees[i]+(i===0?switching:0);
   if(shops[i]<costs)throw new Error('Scenario cannot pay without overdraft');
   shops[i]-=costs;workers+=4;supplier+=2+(i===0?switching:0);
   if(day===2&&i===0)alternative+=fees[i];else platform+=fees[i];
   // Twelve units each day, paid by an explicitly funded outside customer.
   shops[i]+=8;buyers-=8;
  }
  const platformMaintenance=day===1?3:2,alternativeMaintenance=day===2?1:0;
  platform-=platformMaintenance;alternative-=alternativeMaintenance;supplier+=platformMaintenance+alternativeMaintenance;
  periods.push({day,before,fees,switching,wages:12,inputs:6,maintenance:3,sold:12,receipts:24,closing:shops.slice()});
 }
 return {mode,fee:charge,round,migration:round===2?migration:0,shops,platform,alternative,buyers,workers,supplier,periods,control:mode==='joint'?'三家成员店共同决定':'服务商决定',moneyBefore:156,moneyAfter:shops.reduce((a,b)=>a+b,0)+platform+alternative+buyers+workers+supplier};
}
export function sharingAccount(mode:ShareMode,ballot:Ballot){
 if(!SHARE_MODES.includes(mode)||!['divide','invest'].includes(ballot))throw new Error('Invalid sharing scenario');
 // A hypothetical constitution comparison, not a free conversion of ownership.
 // Six existing workers receive wages, then a first distribution of 12 coins.
 const firstWorkers=mode==='minority'?6:12,firstOwner=12-firstWorkers;
 const workerBallots:Ballot[]=['divide','divide','divide','invest','invest',ballot];
 const ownerVotes=mode==='bonus'?1:mode==='minority'?7:0,workerWeight=mode==='bonus'?0:1;
 const divideVotes=workerBallots.filter(v=>v==='divide').length*workerWeight,investVotes=ownerVotes+workerBallots.filter(v=>v==='invest').length*workerWeight;
 const outcome=divideVotes===investVotes?'hold':divideVotes>investVotes?'divide':'invest';
 const extraWorkers=outcome==='divide'?12:0,equipment=outcome==='invest'?12:0;
 const firm=64-12-extraWorkers-equipment,workers=12+firstWorkers+extraWorkers,owner=firstOwner,supplier=12,equipmentSupplier=equipment,buyers=0;
 return {mode,ballot,ownerVotes,workerWeight,workerBallots,divideVotes,investVotes,outcome,firstWorkers,firstOwner,extraWorkers,equipment,firm,workers,owner,supplier,equipmentSupplier,buyers,produced:12,sold:12,receipts:48,wages:12,inputs:12,cashSurplus:24,moneyBefore:88,moneyAfter:firm+workers+owner+supplier+equipmentSupplier+buyers,
  people:workerBallots.map((v,i)=>({id:i,ballot:v,votes:workerWeight,income:2+firstWorkers/6+extraWorkers/6}))};
}
