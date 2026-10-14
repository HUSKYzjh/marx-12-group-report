/** Two-period, integer-wallet teaching experiments, not empirical calibration.
 * Public purchases, income transfers and credit have different funding and rights.
 * Physical spoilage, unsold inventory and operating cash surplus are separate. */
import {initialPublicDemand,publicDemandReducer,restorePublicDemand,type PublicDemand,type DemandAction} from './public-demand.ts';
import {initialPreservation,preservationReducer,restorePreservation,type PreservationWorkbench,type PreservationAction} from './preservation-workbench.ts';
export const RULE_BRANCHES=['policy','prices'] as const;
export type RuleBranch=typeof RULE_BRANCHES[number];
export const POLICY_MODES=['alone','public','loan','income'] as const;
export const PRICE_MODES=['ordinary','efficient','cold','both'] as const;
export type PolicyMode=typeof POLICY_MODES[number];
export type PriceMode=typeof PRICE_MODES[number];
export type RuleState={branch:RuleBranch;phase:'intro'|'lab'|'conclusion';policyMode:PolicyMode;priceMode:PriceMode;income:number;price:number;round:0|1|2;seen:number;demand?:PublicDemand;workbench?:PreservationWorkbench};
export function initialRules(branch:RuleBranch='policy'):RuleState{return {branch,phase:'intro',policyMode:'alone',priceMode:'ordinary',income:0,price:2,round:0,seen:0};}
export type RuleAction={type:'BEGIN'}|{type:'MODE';mode:PolicyMode|PriceMode}|{type:'PRICE'|'INCOME';delta:-1|1}|{type:'OPERATE';expectedRound:number}|{type:'CONCLUDE'}|{type:'RESTART'}|{type:'DEMAND';action:DemandAction}|{type:'PRESERVATION';action:PreservationAction};
export function rulesReducer(s:RuleState,a:RuleAction):RuleState{
 if(!a||typeof a!=='object')return s;
 if(a.type==='PRESERVATION'){
  if(s.branch!=='prices'||s.demand||!s.workbench&&s.phase!=='intro')return s;
  const old=s.workbench??initialPreservation(true),workbench=preservationReducer(old,a.action);if(old===workbench)return s;
  return {...s,workbench,phase:workbench.phase,round:workbench.history.length as 0|1|2,seen:0};
 }
 if(a.type==='DEMAND'){
  if(s.branch!=='policy'||!s.demand&&s.phase!=='intro')return s;
  const old=s.demand??initialPublicDemand(true),demand=publicDemandReducer(old,a.action);if(old===demand)return s;
  return {...s,demand,phase:demand.phase,round:demand.step==='result'?2:demand.day===2?1:0,seen:0};
 }
 if(s.demand||s.workbench)return a.type==='RESTART'?initialRules(s.branch):s;
 switch(a.type){
  case 'BEGIN':return s.phase==='intro'?{...s,phase:'lab'}:s;
  case 'MODE':{
   if(s.phase!=='lab')return s;
   if(s.branch==='policy'&&POLICY_MODES.includes(a.mode as PolicyMode))return {...s,policyMode:a.mode as PolicyMode,round:0};
   if(s.branch==='prices'&&PRICE_MODES.includes(a.mode as PriceMode))return {...s,priceMode:a.mode as PriceMode,round:0};return s;
  }
  case 'PRICE':case 'INCOME':{
   const key=a.type==='PRICE'?'price':'income',min=key==='price'?1:0,max=key==='price'?3:4;
   if(s.phase!=='lab'||(key==='price'?s.branch!=='prices':s.branch!=='policy')||![-1,1].includes(a.delta)||s[key]+a.delta<min||s[key]+a.delta>max)return s;
   return {...s,[key]:s[key]+a.delta,round:0,seen:0};
  }
  case 'OPERATE':{
   if(s.phase!=='lab'||s.round===2||s.round!==a.expectedRound)return s;
   const i=s.branch==='policy'?POLICY_MODES.indexOf(s.policyMode):PRICE_MODES.indexOf(s.priceMode),round=(s.round+1) as 1|2;
   return {...s,round,seen:round===2?s.seen|(1<<i):s.seen};
  }
  case 'CONCLUDE':return s.phase==='lab'&&s.seen===15&&s.round===2?{...s,phase:'conclusion'}:s;
  case 'RESTART':return initialRules(s.branch);
  default:return s;
 }
}
export function restoreRules(value:unknown):RuleState|null{
 if(!value||typeof value!=='object')return null;const s=value as RuleState;
 if(!RULE_BRANCHES.includes(s.branch)||!['intro','lab','conclusion'].includes(s.phase)||!POLICY_MODES.includes(s.policyMode)||!PRICE_MODES.includes(s.priceMode)||!Number.isInteger(s.income)||s.income<0||s.income>4||!Number.isInteger(s.price)||s.price<1||s.price>3||![0,1,2].includes(s.round)||!Number.isInteger(s.seen)||s.seen<0||s.seen>15)return null;
 if(s.demand!==undefined&&s.workbench!==undefined)return null;
 if(s.workbench!==undefined){const workbench=restorePreservation(s.workbench);return workbench&&s.branch==='prices'&&s.phase===workbench.phase&&s.round===workbench.history.length&&s.seen===0?{branch:s.branch,phase:s.phase,policyMode:s.policyMode,priceMode:s.priceMode,income:s.income,price:s.price,round:s.round,seen:s.seen,workbench}:null;}
 if(s.demand!==undefined){const demand=restorePublicDemand(s.demand);return demand&&s.branch==='policy'&&s.phase===demand.phase&&s.round===(demand.step==='result'?2:demand.day===2?1:0)&&s.seen===0?{branch:s.branch,phase:s.phase,policyMode:s.policyMode,priceMode:s.priceMode,income:s.income,price:s.price,round:s.round,seen:s.seen,demand}:null;}
 const i=s.branch==='policy'?POLICY_MODES.indexOf(s.policyMode):PRICE_MODES.indexOf(s.priceMode);
 if(s.round===2&&!(s.seen&(1<<i))||s.phase==='intro'&&(s.round!==0||s.seen!==0)||s.phase==='conclusion'&&(s.round!==2||s.seen!==15))return null;
 return {branch:s.branch,phase:s.phase,policyMode:s.policyMode,priceMode:s.priceMode,income:s.income,price:s.price,round:s.round,seen:s.seen};
}
export function policyAccount(mode:PolicyMode,income:number,round:number){
 if(!POLICY_MODES.includes(mode)||!Number.isInteger(income)||income<0||income>4||![0,1,2].includes(round))throw new Error('Invalid policy experiment');
 let firm=40,publicFund=32,lender=40,employer=24,supplier=0,stock=0,debt=Array(6).fill(0),wallets=Array(6).fill(2);
 const periods=[];
 for(let day=1;day<=round;day++){
  firm-=12;supplier+=6;wallets=wallets.map(w=>w+1);stock+=12;
  const extra=mode==='income'?2:mode==='loan'&&day===2?income:0;
  employer-=6*extra;wallets=wallets.map(w=>w+extra);
  if(mode==='loan'&&day===1){lender-=12;wallets=wallets.map(w=>w+2);debt=debt.map(()=>3);}
  let repaid=0;if(mode==='loan'&&day===2)wallets=wallets.map((w,i)=>{const paid=Math.min(w,debt[i]);debt[i]-=paid;repaid+=paid;return w-paid;});lender+=repaid;
  const purchases=wallets.map(w=>Math.min(2,Math.floor(w/2)));const privateSold=purchases.reduce((a,b)=>a+b,0);wallets=wallets.map((w,i)=>w-purchases[i]*2);firm+=privateSold*2;stock-=privateSold;
  const publicSold=mode==='public'?Math.min(stock,6,Math.floor(publicFund/2)):0;publicFund-=publicSold*2;firm+=publicSold*2;stock-=publicSold;
  periods.push({day,produced:12,privateSold,publicSold,sold:privateSold+publicSold,stock,receipts:(privateSold+publicSold)*2,operatingCash:(privateSold+publicSold)*2-12,repaid,extraIncome:6*extra,wallets:wallets.slice(),purchases,debt:debt.reduce((a,b)=>a+b,0)});
 }
 return {mode,income,round,firm,publicFund,lender,employer,supplier,stock,wallets,debt:debt.reduce((a,b)=>a+b,0),periods,moneyBefore:148,moneyAfter:firm+publicFund+lender+employer+supplier+wallets.reduce((a,b)=>a+b,0)};
}
export function priceAccount(mode:PriceMode,price:number,round:number){
 if(!PRICE_MODES.includes(mode)||!Number.isInteger(price)||price<1||price>3||![0,1,2].includes(round))throw new Error('Invalid price experiment');
 const efficient=mode==='efficient'||mode==='both',cold=mode==='cold'||mode==='both',upgrade=(efficient?6:0)+(cold?6:0),inputs=efficient?3:12;
 let firm=50,supplier=0,equipment=0,stock=0,spoiled=0,wallets=Array(6).fill(2);const periods=[];
 for(let day=1;day<=round;day++){
  const lost=day===2&&!cold?stock:0;spoiled+=lost;stock-=lost;
  if(day===1){firm-=upgrade;equipment+=upgrade;}
  firm-=6+inputs;supplier+=inputs;wallets=wallets.map(w=>w+1);stock+=12;
  const purchases=wallets.map(w=>Math.min(2,Math.floor(w/price))),sold=purchases.reduce((a,b)=>a+b,0),receipts=sold*price;
  wallets=wallets.map((w,i)=>w-purchases[i]*price);stock-=sold;firm+=receipts;
  const storage=cold&&stock>0?2:0;firm-=storage;supplier+=storage;
  periods.push({day,produced:12,sold,receipts,stock,lost,storage,inputs,wages:6,upgrade:day===1?upgrade:0,operatingCash:receipts-6-inputs-storage,wallets:wallets.slice(),purchases});
 }
 return {mode,price,round,firm,supplier,equipment,stock,spoiled,upgrade:round?upgrade:0,wallets,periods,moneyBefore:62,moneyAfter:firm+supplier+equipment+wallets.reduce((a,b)=>a+b,0)};
}
