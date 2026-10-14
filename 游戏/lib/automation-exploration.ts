/** Questions and matched comparisons of paid runs, never of the draft.
 * This view does not award progress or change people, goods or payments. */
import {automationAllocations,automationRunAccount,type AutomationState} from './automation-experiment.ts';

const change=(delta:number,unit:string)=>delta===0?'不变':(delta>0?'多':'少')+Math.abs(delta)+unit;
export function automationExploration(s:AutomationState){
 if(s.branch!=='automation'||s.phase!=='lab'||s.calendar||s.match||s.pressure||!s.run||s.run.rate!==s.rate)return null;
 const run=s.run,a=automationRunAccount(run),base=10-run.rate/10;
 if(!run.rate)return null; // No freed person exists in this condition.
 const name=(id:number)=>'小'+(id-base+1);
 const cut=a.households.find(p=>p.allocation==='cut'),extra=a.households.find(p=>p.allocation==='expand'),shared=a.households.find(p=>p.allocation==='share');
 let prompt:string,focusPerson:number;
 if(cut){focusPerson=cut.id;prompt=name(cut.id)+'这周没饭钱。只挪他，销量会跟着变吗？';}
 else if(extra){focusPerson=extra.id;prompt='人人有收入，面包却留下了。只让'+name(extra.id)+'少做货呢？';}
 else if(shared){focusPerson=shared.id;prompt=name(shared.id)+'有饭钱，却没在册。改成带薪休息，账和身份一样吗？';}
 else{focusPerson=base;prompt='面包卖完了。只让'+name(base)+'继续做货，会怎样？';}
 let comparison:string|null=null;
 const previous=(s.trials??[]).filter(r=>r.rate===run.rate).at(-2);
 if(previous){
  const before=automationAllocations(previous),after=automationAllocations(run),different=after.flatMap((m,i)=>m!==before[i]?[i]:[]);
  // Two or more edits are not a single-person causal contrast, even if the
  // aggregate mode counts happen to have moved by one.
  if(different.length===1){
   const id=base+different[0],b=automationRunAccount(previous),person=a.households[id],old=b.households[id];
   const prefix='机器没换，只改'+name(id)+'：';
   if(a.householdIncome!==b.householdIncome)comparison=prefix+'收入'+change(a.householdIncome-b.householdIncome,'枚')+'，卖出'+change(a.sold-b.sold,'份')+'；剩货'+change(a.unsold-b.unsold,'份')+'。';
   else if(a.output!==b.output)comparison=prefix+'收入不变，'+(person.days<old.days?'少上':'多上')+Math.abs(person.days-old.days)+'天；'+(a.output<b.output?'少做':'多做')+Math.abs(a.output-b.output)+'份，'+(a.unsold<b.unsold?'少剩':'多剩')+Math.abs(a.unsold-b.unsold)+'份。';
   else comparison=prefix+'收入和产销不变；改领'+(person.allocation==='share'?'分享':'工资')+'，在册'+change(a.jobs-b.jobs,'人')+'。';
  }
 }
 return {prompt,focusPerson,comparison};
}

/** A future name-card, not a new payment or an edit to the paid receipt.
 * Keep a single edited identity in focus even if the old question named
 * someone else. Multiple edits must never be labelled a one-person trial. */
export function automationRehearsal(s:AutomationState){
 const probe=automationExploration(s);
 if(!probe||!s.run)return null;
 const before=automationAllocations(s.run),draft=automationAllocations(s);
 const changed=draft.flatMap((mode,i)=>mode!==before[i]?[i]:[]);
 const base=10-s.rate/10,person=changed.length===1?changed[0]:probe.focusPerson-base;
 return {person,id:base+person,name:'小'+(person+1),mode:draft[person],previousMode:before[person],changedPeople:changed.length};
}
