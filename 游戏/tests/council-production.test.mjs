import test from 'node:test';
import assert from 'node:assert/strict';
import {initialCouncilProduction,assignProduction,runProduction,productionAccount,restoreCouncilProduction,PRODUCTION_JOBS} from '../lib/council-production.ts';
import {initialSharingCouncil,sharingCouncilReducer as reduce,councilProductionSeed,councilCanConclude,restoreSharingCouncil} from '../lib/sharing-council.ts';
const seed={fast:true,firm:40,workers:Array(6).fill(4),owner:null,supplier:12,equipmentSupplier:12,buyers:0};
const run3=s=>{for(let i=0;i<3;i++)s=runProduction(s);return s;};
function schedule(jobs){let s=initialCouncilProduction(seed);for(const [id,job]of jobs.entries())s=assignProduction(s,id,job);return run3(s);}
function ballot(mode='bonus',enable=true){let s=reduce(initialSharingCouncil(true,enable),{type:'BEGIN'});s=reduce(s,{type:'CONDITION',mode});for(let i=0;i<6;i++)s=reduce(s,{type:'ROLL',roll:i,to:i});s=reduce(s,{type:'DISTRIBUTE',expectedRevision:s.revision});s=reduce(s,{type:'BALLOT',to:'divide'});return reduce(s,{type:'VOTE',expectedRevision:s.revision});}
const turn=s=>reduce(s,{type:'PRODUCTION_RUN',expectedRevision:s.revision});
test('paid machine, equal wages, different schedules give real time, output and purchasing consequences',()=>{
 const all=productionAccount(schedule(Array(6).fill('work'))),rest=productionAccount(schedule(['work','work','work','paid-rest','paid-rest','paid-rest'])),cut=productionAccount(schedule(['work','work','work','unpaid','unpaid','unpaid']));
 assert.deepEqual([all.produced,all.work,all.paidRest,all.wages,all.stock.length,all.wallets.firm],[72,18,0,36,30,52]);
 assert.deepEqual([rest.produced,rest.work,rest.paidRest,rest.wages,rest.stock.length,rest.wallets.firm],[36,9,9,36,0,58]);
 assert.deepEqual([cut.produced,cut.work,cut.paidRest,cut.wages,cut.stock.length,cut.wallets.firm],[36,9,0,18,5,66]);
 assert.equal(cut.shifts[0].workerPoor.length,0);assert.deepEqual(cut.shifts[2].workerPoor,[3,4,5]);assert.equal(rest.shifts[2].workerPoor.length,0);
 for(const a of [all,rest,cut])assert.equal(a.moneyAfter,88);
});
test('all 729 schedules with old or funded new equipment keep integer funded payments and real bread',()=>{
 for(const fast of [false,true])for(let code=0;code<729;code++){
  let n=code,s=initialCouncilProduction({...seed,fast});for(let id=0;id<6;id++){s=assignProduction(s,id,PRODUCTION_JOBS[n%3]);n=Math.floor(n/3);}s=run3(s);const a=productionAccount(s);
  for(const r of a.shifts){const wallets={...r.before};for(const t of r.receipts){assert(Number.isInteger(t.amount)&&wallets[t.from]>=t.amount);wallets[t.from]-=t.amount;wallets[t.to]+=t.amount;}assert.deepEqual(wallets,r.after);assert.equal(r.openingStock.length+r.made,r.sold+r.stock.length);assert(new Set(r.stock).size===r.stock.length);}
  assert.equal(a.moneyAfter,88);assert.equal(a.workers.length,6);assert.deepEqual(restoreCouncilProduction(s,s.seed),s);
 }
});

test('two all-paid rest shifts can exhaust the next opening budget without fabricating a third paid shift',()=>{
 let s=initialCouncilProduction(seed);for(let id=0;id<6;id++)s=assignProduction(s,id,'paid-rest');s=runProduction(runProduction(s));
 assert.equal(productionAccount(s).wallets.firm,16);for(let id=0;id<6;id++)s=assignProduction(s,id,'work');s=runProduction(s);
 const a=productionAccount(s),last=a.shifts[2];assert.equal(last.opened,false);assert.equal(last.required,24);assert.deepEqual(last.jobs,Array(6).fill('work'));assert.deepEqual(last.worked,[]);assert.deepEqual(last.paidRest,[]);assert.deepEqual(last.paid,Array(6).fill(0));assert.equal(a.work,0);assert.equal(a.paidRest,12);assert.equal(a.wages,24);assert.equal(a.moneyAfter,88);assert.deepEqual(restoreCouncilProduction(s,s.seed),s);
});
test('draft jobs, paused shifts, stopped production and retries do not invent wages or erase old bread',()=>{
 let s=initialCouncilProduction(seed);const before=productionAccount(s);s=assignProduction(s,3,'unpaid');assert.deepEqual(productionAccount(s).wallets,before.wallets);s=runProduction(s);const old=structuredClone(s.history);s=assignProduction(s,3,'paid-rest');assert.deepEqual(s.history,old);
 const poorSeed={...seed,firm:0,supplier:52},stopped=productionAccount(runProduction(initialCouncilProduction(poorSeed)));assert.equal(stopped.shifts[0].opened,false);assert.equal(stopped.produced,0);assert.equal(stopped.wages,0);assert.equal(stopped.moneyAfter,88);
 const done=run3(initialCouncilProduction(seed));assert.equal(runProduction(done),done);assert.equal(assignProduction(done,0,'unpaid'),done);assert.equal(assignProduction(s,6,'unpaid'),s);
 for(const mutate of [v=>v.seed.workers[0]++,v=>v.seed.fast=false,v=>v.jobs[0]='magic',v=>v.history.push({jobs:['work']}),v=>v.jobs[0]='unpaid']){const bad=structuredClone(done);mutate(bad);assert.equal(restoreCouncilProduction(bad,seed),null);}
});
test('next shifts inherit actual vote wallets and equipment; old personal snapshots are not upgraded',()=>{
 const legacy=ballot('bonus',false);assert.equal(legacy.productionEnabled,undefined);assert.equal(reduce(legacy,{type:'PRODUCTION_BEGIN'}),legacy);assert.deepEqual(restoreSharingCouncil(legacy),legacy);
 let s=ballot();const actualSeed=councilProductionSeed(s.run);assert(actualSeed.fast);s=reduce(s,{type:'PRODUCTION_BEGIN'});assert.deepEqual(s.production.seed,actualSeed);assert.deepEqual(restoreSharingCouncil(s),s);
 s=reduce(s,{type:'PRODUCTION_ASSIGN',person:3,job:'paid-rest'});assert.equal(s.production.history.length,0);const revision=s.revision;s=turn(s);assert.equal(reduce(s,{type:'PRODUCTION_RUN',expectedRevision:revision}),s);assert.deepEqual(restoreSharingCouncil(s),s);
 s=reduce(s,{type:'PRODUCTION_BACK'});const saved=structuredClone(s.production);s=reduce(s,{type:'PRODUCTION_BEGIN'});assert.deepEqual(s.production,saved);while(s.production.history.length<3)s=turn(s);assert.equal(s.productionTrials.length,1);assert(!councilCanConclude(s));
 const first=structuredClone(s.productionTrials[0]);s=reduce(s,{type:'PRODUCTION_RETRY'});assert.deepEqual(s.productionTrials[0],first);assert.deepEqual(s.production.seed,actualSeed);while(s.production.history.length<3)s=turn(s);assert.equal(s.productionTrials.length,2);
 s=reduce(s,{type:'PRODUCTION_BACK'});s=reduce(s,{type:'CONDITION',mode:'coop'});assert.equal(s.production,undefined);assert.equal(s.productionTrials.length,2);
 for(let i=0;i<6;i++)s=reduce(s,{type:'ROLL',roll:i,to:i});s=reduce(s,{type:'DISTRIBUTE',expectedRevision:s.revision});s=reduce(s,{type:'BALLOT',to:'divide'});s=reduce(s,{type:'VOTE',expectedRevision:s.revision});s=reduce(s,{type:'PRODUCTION_BEGIN'});assert(!s.production.seed.fast,'tie is not a bought machine');while(s.production.history.length<3)s=turn(s);assert(councilCanConclude(s));s=reduce(s,{type:'CONCLUDE'});assert.equal(s.phase,'conclusion');assert.deepEqual(restoreSharingCouncil(s),s);
});
test('restoration refuses unpaid machines, incomplete fabricated comparisons and forged provenance',()=>{
 let s=reduce(ballot(),{type:'PRODUCTION_BEGIN'});while(s.production.history.length<3)s=turn(s);
 for(const mutate of [v=>v.production.seed.fast=false,v=>v.production.seed.firm++,v=>v.productionTrials[0].production.history.pop(),v=>delete v.productionEnabled,v=>v.productionTrials.push(v.productionTrials[0]),v=>v.step='money',v=>v.phase='conclusion',v=>v.production={}]){const bad=structuredClone(s);mutate(bad);assert.equal(restoreSharingCouncil(bad),null);}
});
