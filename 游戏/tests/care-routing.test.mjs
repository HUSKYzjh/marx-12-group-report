import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialCareRouting,carePlan,careRoutingReducer as reduce,careRoutingAccount as account,restoreCareRouting} from '../lib/care-routing.ts';
import {initialNeeds,needsReducer,restoreNeeds,careAccount} from '../lib/needs-experiment.ts';
import {initialPrologue,prologueReducer,restorePrologue} from '../lib/prologue-state.ts';
const begin=()=>reduce(initialCareRouting(),{type:'BEGIN'});
const run=s=>reduce(s,{type:'RUN',expectedRevision:s.revision});
function cover(s,ids=Array.from({length:12},(_,i)=>i)){for(const id of ids)s=reduce(s,{type:'VOUCHER',voucher:id,person:id});return s;}
function train(s){for(const w of [2,3]){s=reduce(s,{type:'TRAIN',certificate:w-2,person:w});s=reduce(s,{type:'WORKER',worker:w,slot:w});}return s;}
test('four legacy conditions reconcile with individually assigned people and finite payment',()=>{
 let s=begin();for(const mode of ['selfpay','assist','cover','both']){
  let p=begin();if(['assist','both'].includes(mode))p=reduce(p,{type:'TOOL',enabled:true});if(['cover','both'].includes(mode))p=cover(p);if(mode==='both')p=train(p);
  const a=account(p),old=careAccount(mode);for(const key of ['staff','capacity','eligible','served','unmet','unused','wages','training','setup','inputs','receipts','firm','publicFunds','households','supplier','moneyAfter'])assert.equal(a[key],old[key],key+' '+mode);
  assert.equal(a.workerFunds,old.workers);s=run({...s,...carePlan(p),revision:s.revision+1});assert.deepEqual(restoreCareRouting(s),s);
 }
 assert.equal(s.trials.length,4);assert.equal(reduce(s,{type:'CONCLUDE'}).phase,'conclusion');
});
test('untrained workers cannot enter jobs; real training and slots are individual and reversible',()=>{
 let s=begin();assert.strictEqual(reduce(s,{type:'WORKER',worker:2,slot:2}),s);assert.strictEqual(reduce(s,{type:'WORKER',worker:1,slot:0}),s);
 s=reduce(s,{type:'TRAIN',certificate:0,person:2});s=reduce(s,{type:'WORKER',worker:2,slot:2});assert.equal(account(s).capacity,6);assert.equal(account(s).training,2);assert.equal(account(s).wages,6);
 assert.strictEqual(reduce(s,{type:'TRAIN',certificate:1,person:2}),s);assert.strictEqual(reduce(s,{type:'TRAIN',certificate:0,person:0}),s);
 s=reduce(s,{type:'TRAIN',certificate:0,person:null});assert.deepEqual(s.slots,[0,1,null,null]);assert.equal(account(s).training,0);
 s=reduce(s,{type:'WORKER',worker:0,slot:'bench'});assert.equal(account(s).capacity,2);s=reduce(s,{type:'WORKER',worker:0,slot:3});assert.deepEqual(s.slots,[null,1,null,0]);
});
test('a voucher authorizes a specific payment, never adds coins to a wallet or pays waiting people',()=>{
 let s=cover(begin(),[4,5,6,7]);let a=account(s);assert.equal(a.served,4);assert.equal(a.publicFunds,24);assert(a.people.slice(4,8).every(p=>p.reason==='capacity'&&p.cash===1));
 s=reduce(s,{type:'TOOL',enabled:true});a=account(s);assert.equal(a.served,6);assert.equal(a.publicFunds,20);assert.equal(a.people[4].cash,1);assert.equal(a.people[4].covered,true);assert.equal(a.people[6].reason,'capacity');
 const publicTransfers=a.transfers.filter(t=>t.from==='public');assert.equal(publicTransfers.length,2);assert(publicTransfers.every(t=>t.amount===2));
 const moved=reduce(s,{type:'VOUCHER',voucher:4,person:8});assert.equal(moved.vouchers[4],8);assert.strictEqual(reduce(moved,{type:'VOUCHER',voucher:5,person:8}),moved);assert.equal(reduce(moved,{type:'VOUCHER',voucher:4,person:null}).vouchers[4],null);
 assert.equal(account(s).moneyAfter,68);assert.equal(a.people.reduce((n,p)=>n+p.initial,0),24);
});
test('one completed coverage stroke forms one finite draft edit and preserves executed accounts',()=>{
 const before=run(begin()),people=[4,5,6,7,8,9,10,11];
 const painted=reduce(before,{type:'COVER',people,expectedRevision:before.revision});
 assert.equal(painted.revision,before.revision+1);assert.deepEqual(painted.vouchers,[...people,null,null,null,null]);
 assert.deepEqual(painted.run,before.run);assert.deepEqual(painted.trials,before.trials);assert.deepEqual(painted.queue,before.queue);
 assert.equal(account(painted.run).publicFunds,24,'painting is not a payment');
 assert.deepEqual(restoreCareRouting(painted),painted);
 const sequential=people.reduce((s,id,voucher)=>reduce(s,{type:'VOUCHER',voucher,person:id}),before);
 assert.deepEqual(carePlan(painted),carePlan(sequential));
 const duplicate=reduce(painted,{type:'COVER',people:[4,5],expectedRevision:painted.revision});assert.strictEqual(duplicate,painted);
 const full=reduce(painted,{type:'COVER',people:[5,0,1,2,3],expectedRevision:painted.revision});
 assert.deepEqual(full.vouchers,[...people,0,1,2,3]);assert.equal(new Set(full.vouchers).size,12);
 assert.strictEqual(reduce(full,{type:'COVER',people:[0],expectedRevision:full.revision}),full);
 const completed=run(train(reduce(painted,{type:'TOOL',enabled:true})));
 assert.equal(account(completed.run).served,12);assert.equal(account(completed.run).publicFunds,8,'wealthier people still pay themselves');assert.equal(account(completed.run).moneyAfter,68);
});
test('invalid or stale strokes are rejected atomically, without moving the queue or partial coverage',()=>{
 const s=run(begin());
 for(const people of [[],[4,4],[4,-1],[4,12],[4,2.5],[4,'5'],Array.from({length:13},(_,i)=>i)])assert.strictEqual(reduce(s,{type:'COVER',people,expectedRevision:s.revision}),s);
 assert.strictEqual(reduce(s,{type:'COVER',people:[4],expectedRevision:s.revision-1}),s);
 assert.strictEqual(reduce(s,{type:'COVER',people:null,expectedRevision:s.revision}),s);
 const edited=reduce(s,{type:'TOOL',enabled:true});assert.strictEqual(reduce(edited,{type:'COVER',people:[4,5],expectedRevision:s.revision}),edited);
 for(const mask of [0,1,21,255,4095]){
  const people=Array.from({length:12},(_,id)=>id).filter(id=>mask&(1<<id)),next=reduce(s,{type:'COVER',people,expectedRevision:s.revision});
  assert.equal(account(next).moneyAfter,68);assert.equal(account(next).people.length,12);assert.deepEqual(next.run,s.run);assert(next.vouchers.filter(id=>id!==null).length<=12);
 }
});
test('all payment subsets and staffing/training/device combinations conserve money and finite needs',()=>{
 const template=train(begin());for(let mask=0;mask<4096;mask++){
  const p={...carePlan(template),tool:true,vouchers:Array.from({length:12},(_,i)=>mask&(1<<i)?i:null)},a=account(p);
  assert.equal(a.moneyAfter,68);assert.equal(a.people.length,12);assert.equal(a.workers.length,4);assert.equal(a.served,a.people.filter(p=>p.served).length);assert.equal(a.served+a.unmet,12);assert.equal(a.unused+a.served,a.capacity);
  for(const key of ['firm','publicFunds','households','workerFunds','supplier'])assert(Number.isSafeInteger(a[key])&&a[key]>=0,key);
  assert.equal(a.publicFunds,24-a.people.filter(p=>p.covered&&p.served).length*2);assert.equal(a.inputs,a.served);
 }
 for(let trained=0;trained<4;trained++)for(let crew=0;crew<16;crew++)for(const tool of [false,true]){
  const training=[trained&1?2:null,trained&2?3:null],slots=Array.from({length:4},(_,i)=>crew&(1<<i)&& (i<2||training.includes(i))?i:null);
  for(const vouchers of [Array(12).fill(null),Array.from({length:12},(_,i)=>i<4?i:null),Array.from({length:12},(_,i)=>i>=4?i:null),Array.from({length:12},(_,i)=>i)]){
   const p={training,slots,tool,vouchers},a=account(p);assert.equal(a.moneyAfter,68);assert(a.capacity<=12);assert(a.firm>=0);
  }
 }
});
test('drafts and repeated events cannot rewrite executed service; comparable trials are actual runs',()=>{
 let s=begin();assert.strictEqual(reduce(s,{type:'CONCLUDE'}),s);const first=run(s);assert.equal(first.trials.length,1);assert.strictEqual(reduce(first,{type:'RUN',expectedRevision:s.revision}),first);assert.strictEqual(run(first),first);
 const changed=reduce(first,{type:'TOOL',enabled:true});assert.deepEqual(changed.run,first.run);assert.deepEqual(changed.trials,first.trials);assert.strictEqual(reduce(changed,{type:'CONCLUDE'}),changed);
 const second=run(changed);assert.equal(second.trials.length,2);assert.equal(account(second.run).unused,2);assert.equal(reduce(second,{type:'CONCLUDE'}).phase,'conclusion');
 let equivalent=reduce(first,{type:'WORKER',worker:0,slot:'bench'});equivalent=reduce(equivalent,{type:'WORKER',worker:0,slot:3});equivalent=run(equivalent);assert.equal(equivalent.trials.length,1,'swapping identical roles is not a new economic condition');
});
test('save restore clones valid plans and rejects money/qualification/history forgeries',()=>{
 const s=run(cover(train(reduce(begin(),{type:'TOOL',enabled:true}))));assert.deepEqual(restoreCareRouting(JSON.parse(JSON.stringify(s))),s);
 const restored=restoreCareRouting(s);restored.slots[0]=null;assert.equal(s.slots[0],0);
 for(const mutate of [p=>{p.slots=[2,1,null,null];p.training[0]=null;},p=>p.vouchers[1]=p.vouchers[0],p=>p.training=[2,2],p=>p.revision=-1,p=>p.run.vouchers[1]=p.run.vouchers[0],p=>p.trials.push(p.trials[0]),p=>p.phase='intro']){
  const bad=structuredClone(s);mutate(bad);assert.equal(restoreCareRouting(bad),null);
 }
 assert.throws(()=>account({...carePlan(begin()),slots:[2,1,null,null]}));
 assert.deepEqual(restoreCareRouting({...s,firm:1000000}),s,'derived cash cannot be supplied by a save');
});
test('new care entry preserves old records and is restored through the authoritative prologue',()=>{
 let legacy=needsReducer(initialNeeds('services'),{type:'BEGIN'});legacy=needsReducer(legacy,{type:'CARE_RUN'});assert.strictEqual(needsReducer(legacy,{type:'CARE',action:{type:'BEGIN'}}),legacy);assert.deepEqual(restoreNeeds(legacy),legacy);
 let s=prologueReducer(initialPrologue(),{type:'NAVIGATE_CHAPTER',chapter:'needs'});s=prologueReducer(s,{type:'BACK_ASSUMPTIONS'});s=prologueReducer(s,{type:'OPEN_NEEDS',branch:'services'});
 s=prologueReducer(s,{type:'NEEDS',action:{type:'CARE',action:{type:'BEGIN'}}});assert.equal(s.needsTechnology.care.phase,'lab');
 s=prologueReducer(s,{type:'NEEDS',action:{type:'CARE',action:{type:'RUN',expectedRevision:0}}});assert.deepEqual(restorePrologue(JSON.stringify(s)),s);
 const t=s.needsTechnology;assert.strictEqual(needsReducer(t,{type:'CARE_RUN'}),t);assert.equal(restoreNeeds({...t,freight:{}}),null);
});
test('clinical documentation trial is separate from nurse demand and teaching capacity',()=>{
 const e=JSON.parse(fs.readFileSync(new URL('../data/needs-evidence.json',import.meta.url),'utf8')),r=e.clinicalExample;
 assert(e.sources.some(s=>s.id===r.source&&s.branch==='services'));assert.match(r.population,/not nurses/);assert.match(r.endpoint,/not total/);assert.deepEqual(r.nablaVsControl.ci95Percent,[-17.2,-1.8]);assert.equal(r.daxVsControl.p,0.66);assert.match(r.limits,/No direct calibration/);
 assert.equal(e.observations.length,19);assert.equal(account({...carePlan(begin()),tool:true}).capacity,6,'capacity remains an explicit teaching assumption');
});
