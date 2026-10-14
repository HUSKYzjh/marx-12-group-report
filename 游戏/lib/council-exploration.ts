/** Questions follow an actual ballot. Comparisons hold the named recipients,
 * their opinions and the charter apart. This view never pays or awards progress. */
import {councilTrialAccount,type SharingCouncil,type CouncilTrial} from './sharing-council.ts';

const amounts=(p:CouncilTrial)=>Array.from({length:7},(_,id)=>p.allocation.filter(to=>to===(id===6?'owner':id)).length);
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const outcome={divide:'分给大家',invest:'添机器',hold:'暂缓'} as const;

export function councilExploration(s:SharingCouncil){
 if(s.phase!=='lab'||s.step!=='result'||!s.personal||!s.run)return null;
 const run=s.run,a=councilTrialAccount(run);
 const dissent=a.people.filter(p=>p.preference==='divide').length;
 let prompt:string,focusPerson:number|null=null,focusAuthority=false;
 if(a.ownerVotes&&dissent){
  prompt=dissent+'人想再分，决定却是添机器。只换章程呢？';focusAuthority=true;
 }else if(a.outcome==='hold'){
  const marginal=a.people.slice(0,5).find(p=>p.target!==null&&(p.gap===1||p.beforeBallotIncome===p.target));
  if(marginal){focusPerson=marginal.id;prompt=marginal.name+'的'+(marginal.id===0?'鞋钱':marginal.id===1?'房租':'家用')+(marginal.gap===1?'只差一枚':'刚刚够')+'。只挪一枚钱，表决会变吗？';}
  else prompt='三比三，钱先留着。重新分钱，谁会改主意？';
 }else if(a.people.every(p=>p.preference==='invest')){
  prompt='大家都想添机器。意见一致，就能看出票权差别吗？';
 }else if(a.outcome==='divide'){
  prompt='钱又分到六人手里。只改第一笔的收款人，意见还一样吗？';
 }else prompt='机器买到了。省下的力气，能换成带薪休息吗？';

 let comparison:string|null=null,changed:'charter'|'distribution'|'own-ballot'|null=null;
 // Retained receipts are deduplicated; call it the preceding RECEIPT, not
 // necessarily the preceding execution. Never search older convenient pairs.
 const previous=s.trials.at(-2);
 if(previous?.personal){
  const b=councilTrialAccount(previous),equalMoney=same(amounts(previous),amounts(run)),equalOthers=same(previous.others,run.others),equalOwn=previous.ballot===run.ballot;
  const result=a.outcome===b.outcome?'仍是'+outcome[a.outcome!]:'决定从'+outcome[b.outcome!]+'变为'+outcome[a.outcome!];
  if(previous.mode!==run.mode&&equalMoney&&equalOthers&&equalOwn){
   changed='charter';comparison='同样分钱、同样意见：只换章程，'+result+'；你的决定票从'+b.workerWeight+'变为'+a.workerWeight+'。';
  }else if(previous.mode===run.mode&&!equalMoney&&equalOwn){
   const names=a.people.slice(0,5).filter((p,id)=>p.preference!==b.people[id].preference).map(p=>p.name);
   changed='distribution';comparison='同一章程、你的意见没改：只重分第一笔，'+(names.length?names.join('、')+'改了主意':'五人的打算没变')+'；'+result+'。';
  }else if(previous.mode===run.mode&&equalMoney&&equalOthers&&!equalOwn){
   changed='own-ballot';comparison='分钱、章程和其他五人的意见不变：你改投'+outcome[run.ballot]+'，'+result+'。';
  }
 }
 return {prompt,focusPerson,focusAuthority,comparison,changed};
}
