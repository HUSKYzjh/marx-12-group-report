/** Two independent conditional experiments. Coins and people never come from
 * the street economy. Authorization is not new money; care capacity is assumed,
 * not a measured effect of AI. Derived accounts are replayed, not stored. */
import {initialSpaceFreight,freightReducer,restoreSpaceFreight,type SpaceFreight,type FreightAction} from './space-freight.ts';
import {initialCareRouting,careRoutingReducer,restoreCareRouting,type CareRouting,type CareRoutingAction} from './care-routing.ts';
export const NEEDS_BRANCHES=['space','services'] as const;
export type NeedsBranch=typeof NEEDS_BRANCHES[number];
export const SPACE_MODES=['wish','contract','renew'] as const;
export type SpaceMode=typeof SPACE_MODES[number];
export const SPACE_CAPACITIES=[2,4,6] as const;
export const CARE_MODES=['selfpay','assist','cover','both'] as const;
export type CareMode=typeof CARE_MODES[number];
export type NeedsState={branch:NeedsBranch;phase:'intro'|'lab'|'conclusion';capacity:number;spaceMode:SpaceMode;careMode:CareMode;round:number;seen:number;careRun:CareMode|null;freight?:SpaceFreight;care?:CareRouting};
export function initialNeeds(branch:NeedsBranch='space'):NeedsState{return {branch,phase:'intro',capacity:6,spaceMode:'wish',careMode:'selfpay',round:0,seen:0,careRun:null};}
export type NeedsAction={type:'BEGIN'}|{type:'CAPACITY';capacity:number}|{type:'SPACE_MODE';mode:SpaceMode}|{type:'SHIP';expectedRound:number}|{type:'CARE_MODE';mode:CareMode}|{type:'CARE_RUN'}|{type:'CONCLUDE'}|{type:'RESTART'}|{type:'FREIGHT';action:FreightAction}|{type:'CARE';action:CareRoutingAction};
export function needsReducer(s:NeedsState,a:NeedsAction):NeedsState{
 if(!a||typeof a!=='object')return s;
 if(a.type==='CARE'){
  if(s.branch!=='services'||!s.care&&(s.phase!=='intro'||a.action?.type!=='BEGIN'))return s;
  const before=s.care??initialCareRouting(),care=careRoutingReducer(before,a.action);if(care===before)return s;
  return {...s,phase:care.phase,capacity:6,round:0,seen:0,spaceMode:'wish',careMode:'selfpay',careRun:null,care};
 }
 if(a.type==='FREIGHT'){
  if(s.branch!=='space'||!s.freight&&(s.phase!=='intro'||a.action?.type!=='BEGIN'))return s;
  const before=s.freight??initialSpaceFreight(true),freight=freightReducer(before,a.action);if(freight===before)return s;
  return {...s,phase:freight.phase,capacity:freight.capacity,round:freight.history.length,seen:0,spaceMode:'wish',careMode:'selfpay',careRun:null,freight};
 }
 if(s.freight)return a.type==='RESTART'?initialNeeds('space'):s;
 if(s.care)return a.type==='RESTART'?initialNeeds('services'):s;
 switch(a.type){
  case 'BEGIN':return s.phase==='intro'?{...s,phase:'lab'}:s;
  case 'CAPACITY':return s.phase==='lab'&&s.branch==='space'&&SPACE_CAPACITIES.includes(a.capacity as 2|4|6)&&a.capacity!==s.capacity?{...s,capacity:a.capacity,round:0,seen:0}:s;
  case 'SPACE_MODE':return s.phase==='lab'&&s.branch==='space'&&SPACE_MODES.includes(a.mode)&&a.mode!==s.spaceMode?{...s,spaceMode:a.mode,round:0}:s;
  case 'SHIP':{
   if(s.phase!=='lab'||s.branch!=='space'||s.round>=3||a.expectedRound!==s.round)return s;
   const round=s.round+1;return {...s,round,seen:round===3?s.seen|(1<<SPACE_MODES.indexOf(s.spaceMode)):s.seen};
  }
  case 'CARE_MODE':return s.phase==='lab'&&s.branch==='services'&&CARE_MODES.includes(a.mode)?{...s,careMode:a.mode}:s;
  case 'CARE_RUN':return s.phase==='lab'&&s.branch==='services'?{...s,careRun:s.careMode,seen:s.seen|(1<<CARE_MODES.indexOf(s.careMode))}:s;
  case 'CONCLUDE':return s.phase==='lab'&&(s.branch==='space'?s.seen===7&&s.round===3:s.seen===15&&s.careRun!==null)?{...s,phase:'conclusion'}:s;
  case 'RESTART':return initialNeeds(s.branch);
  default:return s;
 }
}
export function restoreNeeds(v:unknown):NeedsState|null{
 if(!v||typeof v!=='object')return null;const s=v as NeedsState;
 if(!NEEDS_BRANCHES.includes(s.branch)||!['intro','lab','conclusion'].includes(s.phase)||!SPACE_CAPACITIES.includes(s.capacity as 2|4|6)||!SPACE_MODES.includes(s.spaceMode)||!CARE_MODES.includes(s.careMode)||!Number.isInteger(s.round)||s.round<0||s.round>3||!Number.isInteger(s.seen)||s.seen<0||s.seen>(s.branch==='space'?7:15)||s.careRun!==null&&!CARE_MODES.includes(s.careRun))return null;
 if(s.care!==undefined){
  const care=restoreCareRouting(s.care);if(s.branch!=='services'||s.freight!==undefined||!care||s.phase!==care.phase||s.capacity!==6||s.round!==0||s.seen!==0||s.spaceMode!=='wish'||s.careMode!=='selfpay'||s.careRun!==null)return null;
  return {branch:'services',phase:s.phase,capacity:6,spaceMode:'wish',careMode:'selfpay',round:0,seen:0,careRun:null,care};
 }
 if(s.freight!==undefined){
  const freight=restoreSpaceFreight(s.freight);if(s.branch!=='space'||!freight||s.phase!==freight.phase||s.capacity!==freight.capacity||s.round!==freight.history.length||s.seen!==0||s.spaceMode!=='wish'||s.careMode!=='selfpay'||s.careRun!==null)return null;
  return {branch:'space',phase:s.phase,capacity:s.capacity,spaceMode:'wish',careMode:'selfpay',round:s.round,seen:0,careRun:null,freight};
 }
 if(s.branch==='space'&&(s.careRun!==null||s.round===3&&!(s.seen&(1<<SPACE_MODES.indexOf(s.spaceMode)))))return null;
 if(s.branch==='services'&&(s.round!==0||s.careRun===null&&s.seen!==0||s.careRun!==null&&!(s.seen&(1<<CARE_MODES.indexOf(s.careRun)))))return null;
 if(s.phase==='intro'&&(s.round!==0||s.seen!==0||s.careRun!==null)||s.phase==='conclusion'&&(s.branch==='space'?s.seen!==7||s.round!==3:s.seen!==15||s.careRun===null))return null;
 return {branch:s.branch,phase:s.phase,capacity:s.capacity,spaceMode:s.spaceMode,careMode:s.careMode,round:s.round,seen:s.seen,careRun:s.careRun};
}
export function spaceAccount(capacity:number,mode:SpaceMode,round:number){
 if(!SPACE_CAPACITIES.includes(capacity as 2|4|6)||!SPACE_MODES.includes(mode)||!Number.isInteger(round)||round<0||round>3)throw new Error('Invalid space scenario');
 let firm=60,buyer=96,workers=0,supplier=0,stock=0,need=12,authorization=mode==='wish'?16:48,delivered=0,renewed=false;
 const periods=[];
 for(let day=1;day<=round;day++){
  let newOrder=0;
  if(mode==='renew'&&need===0&&!renewed){need=6;authorization+=24;renewed=true;newOrder=6;}
  const opening=firm,produced=Math.min(capacity,Math.floor(firm/3)),wages=produced*2,inputs=produced;
  firm-=wages+inputs;workers+=wages;supplier+=inputs;stock+=produced;
  const sold=Math.min(stock,need,Math.floor(authorization/4),Math.floor(buyer/4)),receipts=sold*4;
  firm+=receipts;buyer-=receipts;authorization-=receipts;stock-=sold;need-=sold;delivered+=sold;
  periods.push({day,opening,produced,wages,inputs,sold,receipts,stock,need,newOrder,closing:firm,cashChange:firm-opening});
 }
 return {capacity,mode,round,firm,buyer,workers,supplier,stock,need,authorization,delivered,renewed,periods,moneyBefore:156,moneyAfter:firm+buyer+workers+supplier};
}
export function careAccount(mode:CareMode){
 if(!CARE_MODES.includes(mode))throw new Error('Invalid care scenario');
 const covered=mode==='cover'||mode==='both',assisted=mode==='assist'||mode==='both',staff=mode==='both'?4:2;
 const capacity=staff*(assisted?3:2),eligible=covered?12:4,served=Math.min(capacity,eligible),unmet=12-served;
 const wages=staff*2,inputs=served,setup=assisted?2:0,training=mode==='both'?4:0,receipts=served*2;
 const households=24-(covered?0:receipts),publicFunds=24-(covered?receipts:0),firm=20-wages-inputs-setup-training+receipts,workers=wages+training,supplier=inputs+setup;
 return {mode,covered,assisted,staff,capacity,eligible,served,unmet,unused:capacity-served,wages,inputs,setup,training,receipts,households,publicFunds,firm,workers,supplier,cashChange:firm-20,moneyBefore:68,moneyAfter:firm+households+publicFunds+workers+supplier,
  people:Array.from({length:12},(_,i)=>({id:i,wallet:i<4?4:1,served:i<served,affordable:covered||i<4}))};
}
