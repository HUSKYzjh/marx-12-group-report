import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPreservation,preservationReducer as reduce,preservationAccount, preservationTrialAccount,restorePreservation} from '../lib/preservation-workbench.ts';
import {initialRules,rulesReducer,restoreRules,priceAccount,PRICE_MODES} from '../lib/market-rules-experiment.ts';
const start=()=>reduce(initialPreservation(),{type:'BEGIN'});
const run=s=>reduce(s,{type:'RUN',expectedRevision:s.revision});
const next=s=>reduce(s,{type:'NEXT',expectedRevision:s.revision});
function setup(s,p){s=reduce(s,{type:'PRICE',price:p.price,expectedRevision:s.revision});for(const tool of ['efficient','cold'])s=reduce(s,{type:'CONNECT',tool,enabled:p[tool],expectedRevision:s.revision});return s;}
const configs=Array.from({length:12},(_,i)=>({price:1+i%3,efficient:!!(Math.floor(i/3)&1),cold:!!(Math.floor(i/3)&2)}));
function invariant(a){assert.equal(a.moneyAfter,62);assert([a.firm,a.supplier,a.equipment,...a.wallets].every(n=>Number.isSafeInteger(n)&&n>=0));const sold=a.periods.flatMap(p=>p.bought.flat());const goods=[...sold,...a.inventory,...a.spoiledIDs];assert.equal(new Set(goods).size,goods.length);assert.equal(goods.length,12*a.periods.length);assert(a.periods.every(p=>p.purchases.length===6&&p.purchases.every(n=>n>=0&&n<=2)));assert(a.transfers.every(t=>Number.isInteger(t.amount)));}
test('all 144 dated price and wiring combinations conserve money and every loaf',()=>{
 for(const first of configs)for(const second of configs){let s=setup(start(),first);s=run(s);const paid=preservationAccount(s),day=structuredClone(paid.periods[0]);invariant(paid);assert.deepEqual(restorePreservation(s),s);s=next(s);invariant(preservationAccount(s));s=setup(s,second);assert.deepEqual(preservationAccount(s).periods[0],day);s=run(s);const a=preservationAccount(s);invariant(a);assert.deepEqual(a.periods[0],day);assert.deepEqual(a,preservationTrialAccount(s.history));assert.deepEqual(restorePreservation(s),s);}
});
test('twelve uniform legacy benchmarks reconcile without forced mode buttons',()=>{
 for(const mode of PRICE_MODES)for(const price of [1,2,3]){const p={price,efficient:['efficient','both'].includes(mode),cold:['cold','both'].includes(mode)},a=preservationTrialAccount([p,p]),old=priceAccount(mode,price,2);for(const k of ['firm','supplier','equipment','stock','spoiled','upgrade','wallets','moneyAfter'])assert.deepEqual(a[k],old[k],mode+' '+price+' '+k);for(let i=0;i<2;i++)for(const k of ['sold','receipts','stock','storage','inputs','wages','upgrade','operatingCash','wallets','purchases'])assert.deepEqual(a.periods[i][k],old.periods[i][k]);}
});
test('late cold storage never revives spoiled goods; unplugging does not undo last night',()=>{
 let s=run(start());assert.equal(preservationAccount(s).stock,6);s=next(s);assert.equal(preservationAccount(s).spoiled,6);assert.equal(preservationAccount(s).stock,0);s=setup(s,{price:2,efficient:false,cold:true});assert.equal(preservationAccount(s).equipment,0);s=run(s);const late=preservationAccount(s);assert.equal(late.spoiled,6);assert.equal(late.stock,6);assert(late.inventory.every(id=>id.startsWith('2:')));assert.equal(late.equipment,6);
 s=run(setup(start(),{price:2,efficient:false,cold:true}));s=next(s);assert.equal(preservationAccount(s).stock,6);const savedNight=structuredClone(preservationAccount(s).night);s=setup(s,{price:2,efficient:false,cold:false});s=run(s);const early=preservationAccount(s);assert.equal(early.spoiled,0);assert.equal(early.equipment,6);assert(early.periods[1].bought.flat().every(id=>id.startsWith('1:')),'old-first sale');assert.equal(early.stock,12);assert.equal(early.periods[1].storage,0);assert.deepEqual(early.night,savedNight);assert.equal(early.night.kept.length,6);assert(early.night.kept.every(id=>id.startsWith('1:')));
});
test('pickup, price and wiring drafts do not purchase equipment or pay twice',()=>{
 let s=start();const before=preservationAccount(s);s=setup(s,{price:1,efficient:true,cold:true});assert.deepEqual(preservationAccount(s),before);s=run(s);assert.equal(preservationAccount(s).equipment,12);assert.deepEqual(run(s),s);assert.deepEqual(reduce(s,{type:'PRICE',price:3,expectedRevision:s.revision}),s);s=next(s);const paid=preservationAccount(s);s=setup(s,{price:1,efficient:false,cold:false});assert.deepEqual(preservationAccount(s),paid);s=setup(s,{price:1,efficient:true,cold:true});s=run(s);assert.equal(preservationAccount(s).equipment,12);assert.equal(preservationAccount(s).periods[1].upgrade,0);
});
test('cheap alone loses cash; appropriate efficiency improves affordability, cold is not extra demand',()=>{
 const p=(price,efficient=false,cold=false)=>({price,efficient,cold});const normal=preservationTrialAccount([p(2),p(2)]),cold=preservationTrialAccount([p(2,false,true),p(2,false,true)]),cheap=preservationTrialAccount([p(1),p(1)]),efficient=preservationTrialAccount([p(1,true),p(1,true)]);
 assert.deepEqual(normal.periods.map(p=>p.sold),cold.periods.map(p=>p.sold));assert.equal(cold.stock,12);assert.equal(cold.spoiled,0);assert.equal(cold.firm,28);assert.equal(cheap.stock,0);assert.equal(cheap.firm,38);assert(cheap.periods.every(p=>p.operatingCash===-6));assert.equal(efficient.firm,50);assert(efficient.periods.every(p=>p.purchases.every(n=>n===2)));assert.equal(efficient.spoiled,0);
});
test('two actual different runs unlock explanation; drafts and repeated same run do not',()=>{
 let s=run(next(run(start())));assert.equal(s.trials.length,1);assert.deepEqual(reduce(s,{type:'CONCLUDE'}),s);s=reduce(s,{type:'RETRY'});assert.equal(preservationAccount(s).firm,50);s=run(next(run(s)));assert.equal(s.trials.length,1);s=reduce(s,{type:'RETRY'});s=setup(s,{price:1,efficient:true,cold:false});s=run(next(run(s)));assert.equal(s.trials.length,2);s=reduce(s,{type:'CONCLUDE'});assert.equal(s.phase,'conclusion');assert.deepEqual(restorePreservation(s),s);
});
test('revision guard and strict restoration preserve history, reject impossible dates and strip fake cash',()=>{
 let s=start();const stale=s.revision;s=setup(s,{price:1,efficient:true,cold:false});assert.deepEqual(reduce(s,{type:'RUN',expectedRevision:stale}),s);assert.deepEqual(reduce(s,{type:'CONNECT',tool:'cold',enabled:true,expectedRevision:stale}),s);s=next(run(s));assert.deepEqual(restorePreservation({...s,firm:999}),s);
 for(const mutate of [x=>x.day=1,x=>x.history=[],x=>x.step='result',x=>x.draft.price=0,x=>x.trials.push([x.draft]),x=>x.phase='conclusion']){const bad=structuredClone(s);mutate(bad);assert.equal(restorePreservation(bad),null);}
});
test('new price branch owns dated workbench; played legacy records remain legacy until explicit restart',()=>{
 let r=initialRules('prices');r=rulesReducer(r,{type:'PRESERVATION',action:{type:'BEGIN'}});assert.equal(r.workbench.phase,'lab');assert.deepEqual(restoreRules(r),r);assert.deepEqual(rulesReducer(r,{type:'PRICE',delta:1}),r);r=rulesReducer(r,{type:'PRESERVATION',action:{type:'RUN',expectedRevision:r.workbench.revision}});assert.equal(r.round,1);assert.deepEqual(restoreRules(r),r);assert.equal(restoreRules({...r,branch:'policy'}),null);assert.equal(restoreRules({...r,demand:{}}),null);
 let old=rulesReducer(initialRules('prices'),{type:'BEGIN'});old=rulesReducer(old,{type:'OPERATE',expectedRound:0});assert.deepEqual(restoreRules(old),old);assert.deepEqual(rulesReducer(old,{type:'PRESERVATION',action:{type:'BEGIN'}}),old);assert.equal(rulesReducer(old,{type:'RESTART'}).phase,'intro');
});

test('a saved batch can replace tomorrow production without deleting wages or demand',()=>{
 const day2=s=>next(run(s));const normal={price:2,efficient:false,cold:false};
 const plans=[];
 for(const cold of [false,true])for(const bake of [false,true]){
  let s=reduce(initialPreservation(true),{type:'BEGIN'});s=setup(s,{...normal,cold});s=day2(s);
  const paidYesterday=structuredClone(preservationAccount(s));s=reduce(s,{type:'BAKE',enabled:bake,expectedRevision:s.revision});
  assert.deepEqual(preservationAccount(s),paidYesterday,'moving the oven switch is only a draft');s=run(s);const a=preservationAccount(s);
  assert.equal(a.moneyAfter,62);assert.equal(a.periods[1].wages,6);assert(a.wallets.every(n=>Number.isSafeInteger(n)&&n>=0));assert.equal(a.periods[1].produced.length,bake?12:0);assert.equal(a.periods[1].inputs,bake?12:0);
  const goods=[...a.periods.flatMap(p=>p.bought.flat()),...a.inventory,...a.spoiledIDs];assert.equal(new Set(goods).size,goods.length);assert.equal(goods.length,a.periods.reduce((n,p)=>n+p.produced.length,0));assert.deepEqual(restorePreservation(s),s);
  plans.push({cold,bake,firm:a.firm,sold:a.periods.map(p=>p.sold),stock:a.stock,spoiled:a.spoiled});
 }
 assert.deepEqual(plans,[
  {cold:false,bake:false,firm:38,sold:[6,0],stock:0,spoiled:6},
  {cold:false,bake:true,firm:38,sold:[6,6],stock:6,spoiled:6},
  {cold:true,bake:false,firm:42,sold:[6,6],stock:0,spoiled:0},
  {cold:true,bake:true,firm:28,sold:[6,6],stock:12,spoiled:0},
 ]);
});

test('oven switch cannot rewrite day one or become an unexecuted receipt',()=>{
 let s=reduce(initialPreservation(true),{type:'BEGIN'});assert.equal(reduce(s,{type:'BAKE',enabled:false,expectedRevision:s.revision}),s);
 s=next(run(s));const first=structuredClone(s.history[0]),r=s.revision;s=reduce(s,{type:'BAKE',enabled:false,expectedRevision:r});assert.deepEqual(s.history[0],first);assert.equal(reduce(s,{type:'BAKE',enabled:true,expectedRevision:r}),s);
 s=run(s);assert.equal(run(s),s);assert.equal(reduce(s,{type:'BAKE',enabled:true,expectedRevision:s.revision}),s);
 for(const mutate of [x=>x.history[0].bake=false,x=>delete x.flexibleBake,x=>x.draft.bake='off',x=>x.history[1].bake=true]){const bad=structuredClone(s);mutate(bad);assert.equal(restorePreservation(bad),null);}
 const retry=reduce(s,{type:'RETRY'});assert.equal(retry.flexibleBake,true);assert.equal(retry.draft.bake,true);assert.equal(preservationAccount(retry).firm,50);assert.deepEqual(retry.trials,s.trials);
});

test('explicit new workbench from a legacy ending retains completed comparisons',()=>{
 let old=run(next(run(start())));old=reduce(old,{type:'RETRY'});old=setup(old,{price:1,efficient:true,cold:false});old=run(next(run(old)));old=reduce(old,{type:'CONCLUDE'});const snapshot=structuredClone(old);
 let s=reduce(old,{type:'PLANNED_BEGIN'});assert.equal(s.phase,'lab');assert.equal(s.flexibleBake,true);assert.deepEqual(s.trials,old.trials);assert.deepEqual(old,snapshot);assert.deepEqual(restorePreservation(s),s);
 s=next(run(s));s=reduce(s,{type:'BAKE',enabled:false,expectedRevision:s.revision});s=run(s);s=reduce(s,{type:'CONCLUDE'});assert.equal(s.phase,'conclusion');const again=reduce(s,{type:'RETRY'});assert.equal(again.phase,'lab');assert.deepEqual(again.trials,s.trials);assert.deepEqual(restorePreservation(again),again);
});
