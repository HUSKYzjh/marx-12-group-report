import test from 'node:test';
import assert from 'node:assert/strict';
import {initialAutomation,automationReducer as reduce,automationAccount,automationArrangementAccount,automationRunAccount,restoreAutomation,AUTOMATION_RATES,AUTOMATION_MODES} from '../lib/automation-experiment.ts';
import {initialPrologue,prologueReducer,restorePrologue} from '../lib/prologue-state.ts';

test('uniform task placements reconcile with all original rate/mode comparisons',()=>{
 for(const rate of AUTOMATION_RATES)for(const mode of AUTOMATION_MODES){
  const mixed=automationArrangementAccount(rate,Array(rate/10).fill(mode),mode),original=automationAccount(rate,mode);
  for(const key of ['jobs','workDays','output','sold','unsold','wages','transfer','householdIncome','firmAfter','moneyAfter'])assert.equal(mixed[key],original[key],rate+' '+mode+' '+key);
 }
});

test('uniform saved runs expose the same actual people as equivalent individual plans, without rewriting saved history',()=>{
 for(const rate of AUTOMATION_RATES)for(const mode of AUTOMATION_MODES){
  const run={rate,mode},saved=structuredClone(run),actual=automationRunAccount(run),equivalent=automationArrangementAccount(rate,Array(rate/10).fill(mode),mode);
  assert.deepEqual(run,saved);assert.deepEqual(actual,equivalent);
  assert.equal(actual.households.reduce((n,p)=>n+p.days,0),actual.laborDays);
  actual.households.forEach((p,id)=>{assert.equal(p.allocation,id<10-rate/10?'work':mode);assert.equal(p.days,p.allocation==='work'||p.allocation==='expand'?5:0);assert.equal(p.bought,p.income);});
 }
});
test('every mixed allocation at sixty percent reconciles wages, output, customers and finite money',()=>{
 for(let code=0;code<4**6;code++){
  let n=code;const plan=Array.from({length:6},()=>{const m=AUTOMATION_MODES[n%4];n=Math.floor(n/4);return m;});
  const a=automationArrangementAccount(60,plan);assert.equal(a.moneyAfter,108);assert.equal(a.households.length,10);
  assert.equal(a.households.reduce((n,p)=>n+p.income,0),a.wages+a.transfer);assert.equal(a.households.reduce((n,p)=>n+p.bought,0)+8,a.sold);
  assert.equal(a.output,a.sold+a.unsold);assert.equal(a.output,48+plan.filter(m=>m==='expand').length*12);
  for(const key of ['wages','transfer','sold','unsold','output','firmAfter'])assert(Number.isSafeInteger(a[key])&&a[key]>=0);
 }
 const a=automationArrangementAccount(60,['time','share','time','share','time','time']);assert.equal(a.jobs,8);assert.equal(a.wages,32);assert.equal(a.transfer,8);assert.equal(a.unsold,0);
 assert.throws(()=>automationArrangementAccount(60,['time']));assert.throws(()=>automationArrangementAccount(60,Array(6).fill('unknown')));
});
test('moving a single person changes only the draft; running pays the actual mixed arrangement',()=>{
 let s=reduce(initialAutomation(),{type:'BEGIN'});s=reduce(s,{type:'RUN'});const old=structuredClone(s.run);
 s=reduce(s,{type:'ASSIGN',person:0,mode:'time'});assert.deepEqual(s.run,old);assert.equal(s.trials.length,1);
 assert.equal(automationRunAccount(s.run).unsold,24);assert.equal(reduce(s,{type:'CONCLUDE'}),s);
 s=reduce(s,{type:'RUN'});assert.equal(s.run.mode,'mixed');assert.equal(automationRunAccount(s.run).unsold,20);assert.equal(automationRunAccount(s.run).householdIncome,20);
 assert.equal(s.trials.length,2);assert.equal(reduce(s,{type:'CONCLUDE'}).phase,'conclusion');assert.deepEqual(restoreAutomation(s),s);
 const repeated=reduce(s,{type:'RUN'});assert.deepEqual(repeated,s);assert.equal(repeated.trials.length,2);
 for(const person of [-1,6,1.2])assert.equal(reduce(s,{type:'ASSIGN',person,mode:'time'}),s);
 assert.equal(reduce(s,{type:'ASSIGN',person:0,mode:'unknown'}),s);
});
test('capability keeps receipts but starts a separate comparison; permutations do not forge a new observation',()=>{
 let s=reduce(initialAutomation(),{type:'BEGIN'});s=reduce(s,{type:'ASSIGN',person:0,mode:'time'});s=reduce(s,{type:'RUN'});
 s=reduce(s,{type:'ASSIGN',person:0,mode:'cut'});s=reduce(s,{type:'ASSIGN',person:1,mode:'time'});s=reduce(s,{type:'RUN'});
 assert.equal(s.trials.length,1);assert.equal(reduce(s,{type:'CONCLUDE'}),s);assert.deepEqual(restoreAutomation(s),s);
 const previous=structuredClone(s.trials);s=reduce(s,{type:'RATE',rate:80});assert.deepEqual(s.trials,previous);assert.equal(s.allocations,undefined);assert.equal(s.run,null);assert.equal(s.seen,0);
 s=reduce(s,{type:'ASSIGN',person:7,mode:'share'});s=reduce(s,{type:'RUN'});assert.equal(s.run.allocations.length,8);assert.deepEqual(restoreAutomation(s),s);
 const zero=reduce(reduce(reduce(initialAutomation(),{type:'BEGIN'}),{type:'RATE',rate:0}),{type:'RUN'});assert.equal(reduce(zero,{type:'CONCLUDE'}).phase,'conclusion');
});
test('old records survive, mixed records are validated and restored without aliasing',()=>{
 const old={branch:'automation',phase:'conclusion',rate:60,mode:'share',seen:15,run:{mode:'share',rate:60}};assert.deepEqual(restoreAutomation(old),old);
 let s=reduce(initialAutomation(),{type:'BEGIN'});s=reduce(s,{type:'ASSIGN',person:2,mode:'share'});s=reduce(s,{type:'RUN'});
 const saved=structuredClone(s),restored=restoreAutomation(saved);saved.run.allocations[0]='time';assert.equal(restored.run.allocations[0],'cut');
 assert.equal(restoreAutomation({...s,allocations:['share']}),null);assert.equal(restoreAutomation({...s,run:{...s.run,mode:'cut'}}),null);
 assert.equal(restoreAutomation({...s,trials:[...s.trials,...s.trials]}),null);assert.equal(restoreAutomation({...s,phase:'conclusion'}),null);
 const time=reduce(initialAutomation('time'),{type:'BEGIN'});assert.equal(reduce(time,{type:'ASSIGN',person:0,mode:'share'}),time);
 let p=prologueReducer(initialPrologue(),{type:'NAVIGATE_CHAPTER',chapter:'automation'});
 p=prologueReducer(p,{type:'TECHNOLOGY',action:{type:'BEGIN'}});p=prologueReducer(p,{type:'TECHNOLOGY',action:{type:'ASSIGN',person:0,mode:'time'}});p=prologueReducer(p,{type:'TECHNOLOGY',action:{type:'RUN'}});
 assert.equal(p.technology.run.mode,'mixed');assert.deepEqual(restorePrologue(JSON.stringify(p)),p);
});
