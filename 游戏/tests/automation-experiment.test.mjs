import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {initialAutomation,automationReducer as reduce,automationAccount,restoreAutomation,AUTOMATION_RATES,AUTOMATION_MODES} from '../lib/automation-experiment.ts';
import {initialPrologue,prologueReducer,restorePrologue} from '../lib/prologue-state.ts';
test('automation comparisons conserve money and finite households across every rate',()=>{
 for(const rate of AUTOMATION_RATES)for(const mode of AUTOMATION_MODES){const a=automationAccount(rate,mode);
  assert.equal(a.moneyBefore,108);assert.equal(a.moneyAfter,108);assert.equal(a.households.length,10);
  assert.equal(a.households.reduce((n,p)=>n+p.income,0),a.householdIncome);
  assert.equal(a.households.reduce((n,p)=>n+p.bought,0)+a.ownerPurchases,a.sold);
  assert.equal(a.output,a.sold+a.unsold);assert.equal(a.firmAfter,100+a.cashSurplus);
  for(const key of ['jobs','output','sold','unsold','wages','transfer','householdIncome','firmAfter','moneyAfter'])assert(Number.isSafeInteger(a[key])&&a[key]>=0,key);
 }
 const cut=automationAccount(60,'cut'),expand=automationAccount(60,'expand'),time=automationAccount(60,'time'),share=automationAccount(60,'share');
 assert.deepEqual([cut.jobs,cut.householdIncome,cut.sold,cut.unsold],[4,16,24,24]);
 assert.deepEqual([expand.output,expand.sold,expand.unsold],[120,48,72]);
 assert.deepEqual([time.jobs,time.workDays,time.unsold],[10,2,0]);assert.equal(share.transfer,24);assert.equal(share.unsold,0);
 assert.throws(()=>automationAccount(100,'cut'));assert.throws(()=>automationAccount(60,'mystery'));
});
test('selecting is not observing; results stay tied to last run; changed capability restarts comparison',()=>{
 let s=initialAutomation();assert.strictEqual(reduce(s,{type:'RUN'}),s);s=reduce(s,{type:'BEGIN'});
 s=reduce(s,{type:'MODE',mode:'time'});assert.equal(s.seen,0);assert.strictEqual(reduce(s,{type:'CONCLUDE'}),s);
 for(const mode of AUTOMATION_MODES){s=reduce(s,{type:'MODE',mode});s=reduce(s,{type:'RUN'});assert.deepEqual(restoreAutomation(JSON.parse(JSON.stringify(s))),s);}
 assert.equal(s.seen,15);const selected=reduce(s,{type:'MODE',mode:'time'});assert.equal(selected.run.mode,'share');
 const completed=reduce(s,{type:'CONCLUDE'});assert.equal(completed.phase,'conclusion');assert.deepEqual(restoreAutomation(completed),completed);
 s=reduce(s,{type:'RATE',rate:80});assert.equal(s.seen,0);assert.equal(s.run,null);assert.strictEqual(reduce(s,{type:'CONCLUDE'}),s);
 assert.equal(restoreAutomation({...s,seen:15}),null);assert.equal(restoreAutomation({...completed,seen:7}),null);
 assert.deepEqual(reduce(s,{type:'UNKNOWN'}),s);
});
test('if chapters respect the actual prologue gate and persist return and report branch',()=>{
 let s=initialPrologue();assert.strictEqual(prologueReducer(s,{type:'OPEN_TECHNOLOGY',branch:'automation'}),s);
 s=prologueReducer(s,{type:'JUMP_STAGE',stage:4});
 for(const route of ['consumption','investment','exports'])for(const a of [{type:'CHOOSE_RELIEF',route},{type:'RELIEF_ADVANCE',expectedPhase:'ready'},{type:'RELIEF_ADVANCE',expectedPhase:'improved'},{type:'RELIEF_CONDITION',sustained:true},{type:'RELIEF_COMPLETE'},{type:'RELIEF_MENU'}])s=prologueReducer(s,a);
 for(const a of [{type:'FINISH_RELIEF'},{type:'EPILOGUE_REVEAL'},{type:'SHOW_ASSUMPTIONS'},{type:'OPEN_TECHNOLOGY',branch:'time'},{type:'TECHNOLOGY',action:{type:'BEGIN'}},{type:'TECHNOLOGY',action:{type:'RUN'}}]){s=prologueReducer(s,a);assert.deepEqual(restorePrologue(JSON.stringify(s)),s);}
 assert.equal(s.technology.branch,'time');assert.equal(s.technology.run.mode,'time');s=prologueReducer(s,{type:'BACK_ASSUMPTIONS'});assert.equal(s.scene,'assumptions');
 const next=prologueReducer(s,{type:'OPEN_TECHNOLOGY',branch:'automation'});assert.equal(next.technology.run,null);
 assert.equal(restorePrologue({...next,technology:{...next.technology,rate:100}}).scene,'opening');
});
test('empirical observations retain denominators; generated scenario analysis is separate',async()=>{
 const runtime=await fs.readFile(new URL('../lib/trust-stage.js',import.meta.url),'utf8');assert.match(runtime,/var ids = \[[^\n]*'technology'/);
 const data=JSON.parse(await fs.readFile(new URL('../data/automation-evidence.json',import.meta.url),'utf8'));
 const analysis=JSON.parse(await fs.readFile(new URL('../outputs/automation-research/analysis.json',import.meta.url),'utf8'));
 assert.equal(data.observations.length,14);assert.equal(new Set(data.observations.map(r=>r.id)).size,14);
 for(const r of data.observations)assert(data.sources.some(s=>s.id===r.source)&&r.unit&&r.measure&&(r.year||r.period));
 assert(Math.abs(analysis.findings.chinaProductionCAGRPercent-28.8085)<.001);assert.equal(analysis.findings.femaleMinusMaleOccupationalExposurePP,13);
 assert.equal(analysis.scenarios.length,20);assert.equal(analysis.scenarios.find(r=>r.rate===60&&r.mode==='cut').unsold,24);
 assert.equal(data.observations.find(r=>r.id==='qje-agents').value,5172);assert.equal(data.observations.find(r=>r.id==='qje-productivity').value,15);
});
