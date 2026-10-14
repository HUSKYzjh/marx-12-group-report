import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {initialOwnership,ownershipReducer as reduce,restoreOwnership,PLATFORM_MODES,SHARE_MODES,platformAccount,sharingAccount} from '../lib/ownership-experiment.ts';
import {initialPrologue,prologueReducer,restorePrologue} from '../lib/prologue-state.ts';
test('every platform fee conserves wallets, does not silently cut wages, and charges real migration and upkeep',()=>{
 for(let fee=0;fee<=6;fee++)for(const mode of PLATFORM_MODES)for(let round=0;round<=2;round++){
  const a=platformAccount(mode,fee,round);assert.equal(a.moneyAfter,a.moneyBefore);assert.equal(a.workers,round*12);assert.equal(a.buyers,72-round*24);for(const amount of [...a.shops,a.platform,a.alternative,a.buyers,a.workers,a.supplier])assert(Number.isSafeInteger(amount)&&amount>=0);
  assert.equal(a.periods.length,round);if(round===2){assert.equal(a.migration,mode==='locked'?6:1);assert.equal(a.periods[1].fees[0],2);}
 }
 assert.deepEqual(PLATFORM_MODES.map(mode=>platformAccount(mode,3,2).shops[0]),[13,18,20]);
 assert.equal(platformAccount('joint',0,2).platform,12);assert.equal(platformAccount('locked',0,2).platform,7);
 assert.throws(()=>platformAccount('locked',1.5,2));assert.throws(()=>platformAccount('locked',7,2));assert.throws(()=>platformAccount('no',3,2));
});
test('equal first income can coexist with unequal rights; player vote really matters and ties hold cash',()=>{
 for(const mode of SHARE_MODES)for(const ballot of ['divide','invest']){const a=sharingAccount(mode,ballot);assert.equal(a.moneyAfter,88);assert.equal(a.people.length,6);assert.equal(a.people.reduce((sum,p)=>sum+p.income,0),a.workers);for(const key of ['firm','workers','owner','supplier','equipmentSupplier'])assert(Number.isSafeInteger(a[key])&&a[key]>=0);}
 assert.equal(sharingAccount('bonus','divide').firstWorkers,sharingAccount('coop','divide').firstWorkers);
 assert.deepEqual(SHARE_MODES.map(mode=>sharingAccount(mode,'divide').outcome),['invest','invest','divide']);
 const tied=sharingAccount('coop','invest');assert.equal(tied.outcome,'hold');assert.equal(tied.firm,52);assert.equal(tied.equipment,0);assert.equal(tied.workers,24);
 assert.equal(sharingAccount('minority','divide').ownerVotes,7);assert.equal(sharingAccount('bonus','divide').people[5].votes,0);assert.throws(()=>sharingAccount('coop','no'));
});
test('platform selection is not observation; both operation steps required; changed fees reset comparison',()=>{
 let s=initialOwnership();assert.strictEqual(reduce(s,{type:'OPERATE',expectedRound:0}),s);s=reduce(s,{type:'BEGIN'});
 for(const mode of PLATFORM_MODES){s=reduce(s,{type:'PLATFORM_MODE',mode});const seen=s.seen;s=reduce(s,{type:'OPERATE',expectedRound:0});assert.equal(s.seen,seen);assert.strictEqual(reduce(s,{type:'OPERATE',expectedRound:0}),s);assert.strictEqual(reduce(s,{type:'CONCLUDE'}),s);s=reduce(s,{type:'OPERATE',expectedRound:1});assert.deepEqual(restoreOwnership(s),s);}
 assert.equal(reduce(s,{type:'CONCLUDE'}).phase,'conclusion');assert.strictEqual(reduce(s,{type:'FEE',delta:1}),s);
 s=reduce(s,{type:'PLATFORM_MODE',mode:'locked'});s=reduce(s,{type:'FEE',delta:1});assert.equal(s.round,0);assert.equal(s.seen,0);assert.strictEqual(reduce(s,{type:'FEE',delta:4}),s);assert.strictEqual(reduce(s,null),s);
 assert.equal(restoreOwnership({...s,seen:8}),null);assert.equal(restoreOwnership({...s,round:2}),null);
});
test('share selection and casting do not mark comparison complete until a real vote; displayed run is stable',()=>{
 let s=reduce(initialOwnership('sharing'),{type:'BEGIN'});s=reduce(s,{type:'SHARE_MODE',mode:'coop'});s=reduce(s,{type:'BALLOT',ballot:'invest'});assert.equal(s.seen,0);assert.equal(s.run,null);
 for(const mode of SHARE_MODES){s=reduce(s,{type:'SHARE_MODE',mode});s=reduce(s,{type:'VOTE'});assert.deepEqual(restoreOwnership(s),s);}
 const changed=reduce(s,{type:'BALLOT',ballot:'divide'});assert.equal(changed.run.ballot,'invest');assert.equal(reduce(s,{type:'CONCLUDE'}).phase,'conclusion');assert.equal(restoreOwnership({...s,run:null}),null);assert.equal(restoreOwnership({...s,phase:'intro'}),null);
});
test('both ownership branches respect prologue gate and persist without stored ledger trust',()=>{
 let s=initialPrologue();assert.strictEqual(prologueReducer(s,{type:'OPEN_OWNERSHIP',branch:'sharing'}),s);s=prologueReducer(s,{type:'JUMP_STAGE',stage:4});
 for(const route of ['consumption','investment','exports'])for(const a of [{type:'CHOOSE_RELIEF',route},{type:'RELIEF_ADVANCE',expectedPhase:'ready'},{type:'RELIEF_ADVANCE',expectedPhase:'improved'},{type:'RELIEF_CONDITION',sustained:true},{type:'RELIEF_COMPLETE'},{type:'RELIEF_MENU'}])s=prologueReducer(s,a);
 for(const a of [{type:'FINISH_RELIEF'},{type:'EPILOGUE_REVEAL'},{type:'SHOW_ASSUMPTIONS'},{type:'OPEN_OWNERSHIP',branch:'concentration'},{type:'OWNERSHIP',action:{type:'BEGIN'}},{type:'OWNERSHIP',action:{type:'OPERATE',expectedRound:0}}]){s=prologueReducer(s,a);assert.deepEqual(restorePrologue(JSON.stringify(s)),s);}
 assert.equal(s.scene,'ownership-technology');assert.equal(restorePrologue({...s,reliefCompleted:[]}).scene,'opening');assert.equal(restorePrologue({...s,ownershipTechnology:{...s.ownershipTechnology,fee:10}}).scene,'opening');
 s=prologueReducer(s,{type:'BACK_ASSUMPTIONS'});s=prologueReducer(s,{type:'OPEN_OWNERSHIP',branch:'sharing'});assert.equal(s.ownershipTechnology.phase,'intro');assert.equal(s.ownershipTechnology.branch,'sharing');
});
test('evidence marks bounds, goals, self reports and abstract-only reading; analysis separates teaching',async()=>{
 const data=JSON.parse(await fs.readFile(new URL('../data/ownership-evidence.json',import.meta.url),'utf8')),analysis=JSON.parse(await fs.readFile(new URL('../outputs/ownership-research/analysis.json',import.meta.url),'utf8'));
 assert.equal(data.observations.length,17);assert.equal(data.sources.length,15);for(const r of data.observations)assert(data.sources.some(s=>s.id===r.source)&&r.kind&&r.measure&&r.unit&&r.year);
 assert.equal(data.regulatoryChecked,'2026-10-07');assert.equal(data.regulatoryEvents.length,2);assert.deepEqual(analysis.regulatoryEvents,data.regulatoryEvents);assert.equal(analysis.sourceCount,15);assert.equal(analysis.numericObservationCount,17);
 for(const event of data.regulatoryEvents){assert(data.sources.some(s=>s.id===event.source)&&event.date&&event.scope);assert.equal(event.value,undefined);}
 assert.equal(data.regulatoryEvents[1].kind,'investigation-opened');assert.match(data.regulatoryEvents[1].scope,/no final designation/);
 assert.equal(data.observations.find(o=>o.id==='frontier-industry').kind,'lower-bound');assert.equal(data.observations.find(o=>o.id==='cn-devices-target').kind,'target-lower-bound');assert.match(data.sources.find(s=>s.id==='nber2025').access,/403/);
 assert.equal(Object.keys(analysis.findings).length,7);assert.equal(analysis.teachingScenarios.platform.length,15);assert.equal(analysis.teachingScenarios.sharing.length,6);assert(Math.abs(analysis.findings.huaweiReportedRDRevenuePercent-21.83)<.01);assert.deepEqual(analysis.findings.ukIaaSTwoProviderPublishedBand,[70,90]);assert.equal(analysis.findings.publishedBandsMinimumGapPercentagePoints,10);
 const runtime=await fs.readFile(new URL('../lib/trust-stage.js',import.meta.url),'utf8');assert.match(runtime,/var ids = \[[^\n]*'ownership-technology'/);
});
