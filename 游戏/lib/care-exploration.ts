import {careRoutingAccount,type CareRouting} from './care-routing.ts';

/** Questions follow executed outcomes, never the unexecuted next arrangement.
 * They invite a test, not a compulsory recipe, score or extra transaction. */
export function careExploration(s:CareRouting){
 if(!s.run)return null;
 const actual=careRoutingAccount(s.run),previous=s.trials.length>1?careRoutingAccount(s.trials.at(-2)!):null;
 const money=actual.people.find(p=>p.reason==='money'),waiting=actual.people.find(p=>p.reason==='capacity');
 let prompt:string,focusPerson:number|null=null;
 if(actual.unmet===0){
  prompt=actual.people.some(p=>p.served&&p.covered&&p.initial>=2)
   ?'十二个人都用上了。能少用一张代付凭证吗？'
   :'十二个人都用上了。换一张代付凭证，结果还一样吗？';
 }else if(actual.capacity===0){
  prompt='还没有人上岗。排一个合格的人，能让谁用上？';
 }else if(actual.unused>0&&money){
  focusPerson=money.id;prompt='还有'+actual.unused+'个空位。不加人手，能让小'+(money.id+1)+'用上吗？';
 }else if(waiting){
  focusPerson=waiting.id;prompt='小'+(waiting.id+1)+'已能付钱。只换次序，他能用上吗？';
 }else if(money){
  focusPerson=money.id;prompt='同样'+actual.capacity+'个服务位，能让小'+(money.id+1)+'用上吗？';
 }else prompt='同样的人手，换一种安排，会怎样？';
 let fundingFeedback:string|null=null;
 // The same people received the same amount of service; who paid changed.
 // Comparing funds alone would hide an exchange of beneficiaries or capacity.
 if(previous&&actual.capacity===previous.capacity&&actual.people.every((p,i)=>p.served===previous.people[i].served)){
  const publicChange=previous.publicFunds-actual.publicFunds;
  const homeChange=previous.households-actual.households;
  if(publicChange&&homeChange===-publicChange)fundingFeedback='公共'+(publicChange>0?'多':'少')+'付'+Math.abs(publicChange)+'枚，家里'+(homeChange>0?'多':'少')+'付'+Math.abs(homeChange)+'枚。人没少用上，换了付款人。';
 }
 return {prompt,focusPerson,fundingFeedback,finishLabel:actual.unmet===0?'都用上了，为什么？ →':'谁还在门外？ →'};
}
