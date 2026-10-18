import {initialCourse,courseRound} from './course-model.mjs';

// Three-day cash-return challenge under the current whole-shop rules.
// Tests enumerate every legal path whenever these reference scores change.
export const STEADY_CHALLENGE={days:3,opening:36,baselineGain:21,maxGain:51};
const eligible=s=>s?.version===3&&s.mode==='steady'&&s.world?.upgradeRule==='whole-shop-v1';
export function restoreSteadyBest(value){
 try{
  if(!value||value.version!==1||Object.keys(value).some(k=>!['version','actions'].includes(k))||!Array.isArray(value.actions)||value.actions.length!==3)return null;
  let s=initialCourse();for(const action of value.actions){if(typeof action!=='string')return null;s=courseRound(s,action);}
  return {version:1,actions:value.actions.slice()};
 }catch{return null;}
}
export function steadyBestGain(best){
 const valid=restoreSteadyBest(best);if(!valid)return null;
 return valid.actions.reduce((s,a)=>courseRound(s,a),initialCourse()).world.shops[0].cash-STEADY_CHALLENGE.opening;
}
export function rememberSteadyBest(best,s){
 if(!eligible(s)||s.world.day!==3)return best;
 const candidate=restoreSteadyBest({version:1,actions:s.world.history.map(r=>r.action)});
 if(!candidate)return best;
 const previous=steadyBestGain(best),gain=s.world.shops[0].cash-STEADY_CHALLENGE.opening;
 return previous===null||gain>previous?candidate:best;
}
export function steadyChallenge(s){
 if(!eligible(s))return null;
 const r=s.world.history.at(-1),gain=s.world.shops[0].cash-STEADY_CHALLENGE.opening;
 let hint='多卖几个，还是每个多赚一点？';
 if(r){
  const hints={
   'price-up':'提价以后，少卖了吗？',
   'price-down':'多卖了吗？再看看每个少收了多少。',
   buy:'炉子明天到，人手够用吗？',
   upgrade:'换炉先花钱，还剩几天回本？',
   hire:'多一位厨师，能多卖几个？',
   fire:'省下的工资，抵得上少卖的面包吗？',
   'wage-down':'明天少付工资，销量会跟着变吗？',
   'wage-up':'明天多付工资，先看看本店的成本。',
   hold:s.world.shops[0].price===5?'售价已到上限，看看销量和开销。':r.sold[0]===(s.world.history.at(-2)?.sold[0]??6)?'销量没变，换个售价会怎样？':'多卖的钱，扣掉新增开销还剩多少？',
  };hint=hints[r.action]||hint;
 }
 return {gain,hint,baselineGain:STEADY_CHALLENGE.baselineGain,maxGain:STEADY_CHALLENGE.maxGain,
  complete:s.world.day===3,atMaximum:gain===STEADY_CHALLENGE.maxGain};
}
