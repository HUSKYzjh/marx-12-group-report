import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {initialAutomation,automationReducer as ai,canConcludeAutomation,automationCurrentTrials,automationRunAccount,restoreAutomation} from '../lib/automation-experiment.ts';
import {initialTimeCalendar,timeCalendarReducer as cal,calendarCurrentTrials,canConcludeCalendar,calendarAccount,restoreTimeCalendar} from '../lib/time-calendar.ts';
import {initialPrologue,prologueReducer,restorePrologue} from '../lib/prologue-state.ts';
import {assumptionRouteProgress} from '../lib/assumption-route-progress.ts';

function aiPair(){let s=ai(initialAutomation(),{type:'BEGIN'});s=ai(s,{type:'RUN'});s=ai(s,{type:'ASSIGN',person:0,mode:'time'});return ai(s,{type:'RUN'});}
function calPair(){let s=cal(initialTimeCalendar(),{type:'BEGIN'});s=cal(s,{type:'RUN'});s=cal(s,{type:'PLACE_DAY',from:2,to:'rest'});return cal(s,{type:'RUN'});}

test('calendar research describes retained capability groups and unpaid retry drafts, not deleted comparisons',async()=>{
 const report=await fs.readFile(new URL('../docs/研究报告/02_新机器与闲暇.txt',import.meta.url),'utf8');
 assert(report.includes('保留已执行回执，按原能力分组'));
 assert(report.includes('只有重新过完一周才发工资、买面包并生成回执'));
 assert(!report.includes('变更机器能力会清空跨能力对照'));
 const old=calPair(),draft=cal(old,{type:'RATE',rate:80});assert.deepEqual(draft.trials,old.trials);assert.equal(draft.run,null);assert(!canConcludeCalendar(draft));
});

test('changing either capability neither erases paid records nor executes the new draft',()=>{
 for(const [s,reduce,restore,ready,current,account] of [[aiPair(),ai,restoreAutomation,canConcludeAutomation,automationCurrentTrials,automationRunAccount],[calPair(),cal,restoreTimeCalendar,canConcludeCalendar,calendarCurrentTrials,calendarAccount]]){
  assert(ready(s));const history=structuredClone(s.trials),accounts=history.map(account),changed=reduce(s,{type:'RATE',rate:80});
  assert.equal(changed.run,null);assert.deepEqual(changed.trials,history);assert.deepEqual(changed.trials.map(account),accounts);assert.equal(current(changed).length,0);assert(!ready(changed));assert.equal(reduce(changed,{type:'CONCLUDE'}),changed);
  assert.deepEqual(restore(changed),changed);const once=reduce(changed,{type:'RUN'});assert.equal(current(once).length,1);assert(!ready(once),'two old records are not two observations of the new machine');assert.deepEqual(once.trials.slice(0,2),history);
 }
});

test('two distinct same-capability arrangements unlock; across-capability deltas do not',()=>{
 let s=ai(aiPair(),{type:'RATE',rate:80});s=ai(s,{type:'RUN'});s=ai(s,{type:'ASSIGN',person:0,mode:'share'});s=ai(s,{type:'RUN'});assert(canConcludeAutomation(s));assert.equal(s.trials.length,4);assert.deepEqual(automationCurrentTrials(s).map(r=>r.rate),[80,80]);assert.deepEqual(restoreAutomation(s),s);
 let c=cal(calPair(),{type:'RATE',rate:80});c=cal(c,{type:'RUN'});c=cal(c,{type:'FLIP_CONTRACT'});c=cal(c,{type:'RUN'});assert(canConcludeCalendar(c));assert.equal(c.trials.length,4);assert.deepEqual(calendarCurrentTrials(c).map(r=>r.rate),[80,80]);assert.deepEqual(restoreTimeCalendar(c),c);
});

test('returning to a previous capability retains its group but still requires executing the present draft',()=>{
 for(const [s,reduce,ready,current] of [[aiPair(),ai,canConcludeAutomation,automationCurrentTrials],[calPair(),cal,canConcludeCalendar,calendarCurrentTrials]]){
  let changed=reduce(s,{type:'RATE',rate:80});changed=reduce(changed,{type:'RUN'});changed=reduce(changed,{type:'RATE',rate:60});
  assert.equal(current(changed).length,2);assert.equal(changed.run,null);assert(!ready(changed));const executed=reduce(changed,{type:'RUN'});assert(ready(executed));assert.equal(executed.trials.filter(r=>r.rate===80).length,1);
 }
});

test('zero capability is neutral, records survive and no unseen allocations are fabricated',()=>{
 let s=ai(aiPair(),{type:'RATE',rate:0});assert.equal(s.trials.length,2);assert(!canConcludeAutomation(s));s=ai(s,{type:'RUN'});assert(canConcludeAutomation(s));assert.equal(automationRunAccount(s.run).unsold,0);s=ai(s,{type:'MODE',mode:'share'});assert.deepEqual(restoreAutomation(s),s);
 let c=cal(calPair(),{type:'RATE',rate:0});assert.equal(c.trials.length,2);assert(!canConcludeCalendar(c));c=cal(c,{type:'RUN'});assert(canConcludeCalendar(c));assert.deepEqual(restoreTimeCalendar(c),c);
});

test('legacy receipts migrate only their actual last run, not every bit in a progress mask',()=>{
 const old={branch:'automation',phase:'lab',rate:60,mode:'share',seen:15,run:{mode:'share',rate:60}};
 const changed=ai(old,{type:'RATE',rate:80});assert.equal(changed.trials.length,1);assert.equal(changed.trials[0].mode,'share');assert.deepEqual(automationRunAccount(changed.trials[0]),automationRunAccount(old.run));assert.deepEqual(restoreAutomation(changed),changed);
 const rerun=ai({...old,mode:'cut'},{type:'RUN'});assert.equal(rerun.trials.length,2);assert.equal(rerun.trials[0].mode,'share');assert.deepEqual(restoreAutomation(rerun),rerun);
});

test('save restoration clones all groups and rejects malformed rates, duplicates and mismatched last records',()=>{
 for(const [s,reduce,restore] of [[aiPair(),ai,restoreAutomation],[calPair(),cal,restoreTimeCalendar]]){
  const changed=reduce(reduce(s,{type:'RATE',rate:80}),{type:'RUN'}),saved=structuredClone(changed),copy=restore(saved);assert(copy);saved.trials[0].rate=20;assert.equal(copy.trials[0].rate,60);
  for(const edit of [v=>v.trials.push(v.trials[0]),v=>v.trials[0].rate=100,v=>v.run.rate=60,v=>v.trials.reverse()]){const bad=structuredClone(changed);edit(bad);assert.equal(restore(bad),null);}
 }
});

test('history limits apply per capability, not globally; another group is not evicted by new trials',()=>{
 let s=ai(aiPair(),{type:'RATE',rate:80});for(let n=0;n<24;n++){s=ai(s,{type:'MODE',mode:'cut'});for(let person=0;person<n%8;person++)s=ai(s,{type:'ASSIGN',person,mode:'time'});for(let person=n%8;person<8;person++)s=ai(s,{type:'ASSIGN',person,mode:n<8?'cut':n<16?'share':'expand'});s=ai(s,{type:'RUN'});}
 assert.equal(s.trials.filter(r=>r.rate===60).length,2);assert.equal(automationCurrentTrials(s).length,12);assert.deepEqual(restoreAutomation(s),s);
 let c=cal(calPair(),{type:'RATE',rate:80});for(let n=0;n<16;n++){for(let day=1;day<5;day++)c=cal(c,{type:'PLACE_DAY',from:day,to:n&(1<<(day-1))?day:'rest'});c=cal(c,{type:'RUN'});}
 assert.equal(c.trials.filter(r=>r.rate===60).length,2);assert.equal(calendarCurrentTrials(c).length,12);assert.deepEqual(restoreTimeCalendar(c),c);
});

test('chapter save and directory counts retain genuine receipts after a capability edit and reset stays scoped',()=>{
 for(const [branch,s] of [['automation',aiPair()],['time',{branch:'time',phase:'lab',rate:60,mode:'time',seen:0,run:null,calendar:calPair()}]]){
  let p={...prologueReducer(initialPrologue(),{type:'NAVIGATE_CHAPTER',chapter:'automation'}),technology:s};p=prologueReducer(p,{type:'TECHNOLOGY',action:branch==='time'?{type:'CALENDAR',action:{type:'RATE',rate:80}}:{type:'RATE',rate:80}});
  assert.equal(assumptionRouteProgress(p)[branch].receipts,2);assert.deepEqual(restorePrologue(JSON.stringify(p)),p);
  const other=structuredClone(p.branchArchive);p=prologueReducer(p,{type:'TECHNOLOGY',action:{type:'RESTART'}});assert.equal(assumptionRouteProgress(p)[branch].receipts,0);assert.deepEqual(p.branchArchive,other);
 }
});
