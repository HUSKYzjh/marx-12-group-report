import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {initialNeeds,needsReducer as reduce,restoreNeeds,spaceAccount,careAccount,SPACE_MODES,SPACE_CAPACITIES,CARE_MODES} from '../lib/needs-experiment.ts';
import {initialPrologue,prologueReducer,restorePrologue} from '../lib/prologue-state.ts';
test('space purchase authorization and real payment, not unlimited physical needs, determine inventory',()=>{
 for(const cap of SPACE_CAPACITIES)for(const mode of SPACE_MODES)for(let round=0;round<=3;round++){
  const a=spaceAccount(cap,mode,round);assert.equal(a.moneyAfter,156);
  for(const key of ['firm','buyer','workers','supplier','stock','need','authorization','delivered'])assert(Number.isSafeInteger(a[key])&&a[key]>=0,key);
  assert.equal(a.periods.reduce((n,p)=>n+p.produced,0),a.delivered+a.stock);
  assert.equal(a.workers,2*(a.stock+a.delivered));assert.equal(a.supplier,a.stock+a.delivered);
  assert.equal(a.buyer,96-4*a.delivered);assert.equal(a.firm,60-3*(a.stock+a.delivered)+4*a.delivered);
  assert(a.delivered<=(a.renewed?18:12));assert.equal(a.need,(a.renewed?18:12)-a.delivered);
 }
 assert.deepEqual(SPACE_MODES.map(m=>spaceAccount(6,m,3).stock),[14,6,0]);
 assert.deepEqual(SPACE_MODES.map(m=>spaceAccount(6,m,3).firm),[22,54,78]);
 const slow=spaceAccount(2,'renew',3);assert.equal(slow.renewed,false);assert.equal(slow.delivered,6);
 assert.throws(()=>spaceAccount(8,'renew',3));assert.throws(()=>spaceAccount(6,'renew',4));
});
test('care distinguishes affordability, capacity, and actual service; finite funds pay all costs',()=>{
 for(const mode of CARE_MODES){const a=careAccount(mode);assert.equal(a.moneyBefore,68);assert.equal(a.moneyAfter,68);assert.equal(a.people.length,12);assert.equal(a.people.filter(p=>p.served).length,a.served);assert.equal(a.people.filter(p=>p.affordable).length,a.eligible);assert.equal(a.served+a.unmet,12);assert.equal(a.unused+a.served,a.capacity);for(const key of ['firm','households','publicFunds','workers','supplier'])assert(Number.isSafeInteger(a[key])&&a[key]>=0);}
 assert.deepEqual(CARE_MODES.map(m=>careAccount(m).served),[4,4,4,12]);assert.equal(careAccount('assist').unused,2);assert.equal(careAccount('cover').publicFunds,16);assert.equal(careAccount('both').publicFunds,0);assert.throws(()=>careAccount('unknown'));
});
test('space observation requires three operations per arrangement; stale clicks cannot ship twice',()=>{
 let s=initialNeeds();assert.strictEqual(reduce(s,{type:'SHIP',expectedRound:0}),s);s=reduce(s,{type:'BEGIN'});
 for(const mode of SPACE_MODES){s=reduce(s,{type:'SPACE_MODE',mode});assert.equal(s.round,0);const seen=s.seen;assert.strictEqual(reduce(s,{type:'CONCLUDE'}),s);for(let r=0;r<3;r++){s=reduce(s,{type:'SHIP',expectedRound:r});assert.strictEqual(reduce(s,{type:'SHIP',expectedRound:r}),s);assert.deepEqual(restoreNeeds(JSON.parse(JSON.stringify(s))),s);if(r<2)assert.equal(s.seen,seen);}}
 assert.equal(s.seen,7);const done=reduce(s,{type:'CONCLUDE'});assert.equal(done.phase,'conclusion');assert.deepEqual(restoreNeeds(done),done);
 s=reduce(s,{type:'CAPACITY',capacity:4});assert.equal(s.seen,0);assert.equal(s.round,0);assert.strictEqual(reduce(s,{type:'CONCLUDE'}),s);assert.equal(restoreNeeds({...done,round:1}),null);assert.strictEqual(reduce(s,null),s);
});
test('care selection is not completion; last run stays tied to actual operated condition',()=>{
 let s=reduce(initialNeeds('services'),{type:'BEGIN'});s=reduce(s,{type:'CARE_MODE',mode:'both'});assert.equal(s.seen,0);assert.equal(s.careRun,null);
 for(const mode of CARE_MODES){s=reduce(s,{type:'CARE_MODE',mode});s=reduce(s,{type:'CARE_RUN'});assert.deepEqual(restoreNeeds(s),s);}
 const selected=reduce(s,{type:'CARE_MODE',mode:'selfpay'});assert.equal(selected.careRun,'both');assert.equal(reduce(s,{type:'CONCLUDE'}).phase,'conclusion');assert.equal(restoreNeeds({...s,careRun:null}),null);assert.equal(restoreNeeds({...s,seen:1}),null);
});
test('both needs entries require genuine prologue gate and survive refresh without forging accounts',()=>{
 let s=initialPrologue();assert.strictEqual(prologueReducer(s,{type:'OPEN_NEEDS',branch:'space'}),s);
 s=prologueReducer(s,{type:'JUMP_STAGE',stage:4});
 for(const route of ['consumption','investment','exports'])for(const action of [{type:'CHOOSE_RELIEF',route},{type:'RELIEF_ADVANCE',expectedPhase:'ready'},{type:'RELIEF_ADVANCE',expectedPhase:'improved'},{type:'RELIEF_CONDITION',sustained:true},{type:'RELIEF_COMPLETE'},{type:'RELIEF_MENU'}])s=prologueReducer(s,action);
 for(const action of [{type:'FINISH_RELIEF'},{type:'EPILOGUE_REVEAL'},{type:'SHOW_ASSUMPTIONS'},{type:'OPEN_NEEDS',branch:'space'},{type:'NEEDS',action:{type:'BEGIN'}},{type:'NEEDS',action:{type:'SHIP',expectedRound:0}}]){s=prologueReducer(s,action);assert.deepEqual(restorePrologue(JSON.stringify(s)),s);}
 assert.equal(s.scene,'needs-technology');assert.equal(s.needsTechnology.round,1);assert.equal(restorePrologue({...s,reliefCompleted:[]}).scene,'opening');
 s=prologueReducer(s,{type:'BACK_ASSUMPTIONS'});s=prologueReducer(s,{type:'OPEN_NEEDS',branch:'services'});assert.equal(s.needsTechnology.branch,'services');assert.equal(s.needsTechnology.phase,'intro');assert.equal(restorePrologue({...s,needsTechnology:{...s.needsTechnology,seen:32}}).scene,'opening');
});
test('source rows label forecasts and reading limitations; empirical and teaching analyses are separate',async()=>{
 const data=JSON.parse(await fs.readFile(new URL('../data/needs-evidence.json',import.meta.url),'utf8'));
 const analysis=JSON.parse(await fs.readFile(new URL('../outputs/needs-research/analysis.json',import.meta.url),'utf8'));
 assert.equal(data.observations.length,19);assert.equal(new Set(data.observations.map(o=>o.id)).size,19);for(const r of data.observations)assert(data.sources.some(s=>s.id===r.source)&&r.kind&&r.measure&&r.unit&&r.year);
 assert.equal(data.observations.find(r=>r.id==='who-shortage-2030').kind,'projection');assert.equal(data.observations.find(r=>r.id==='cn-moon-target').kind,'target');
 assert.equal(Object.keys(analysis.findings).length,8);assert.equal(analysis.teachingScenarios.space.length,9);assert.equal(analysis.teachingScenarios.care.length,4);assert(Math.abs(analysis.findings.nurseDensityCountryGroupRatio-3.69)<.01);
 const runtime=await fs.readFile(new URL('../lib/trust-stage.js',import.meta.url),'utf8');assert.match(runtime,/var ids = \[[^\n]*'needs-technology'/);
});
