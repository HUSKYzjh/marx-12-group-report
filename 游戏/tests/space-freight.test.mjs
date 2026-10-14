import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSpaceFreight,freightReducer as step,freightAccount,restoreSpaceFreight,FREIGHT_CAPACITIES} from '../lib/space-freight.ts';
import {initialNeeds,needsReducer,restoreNeeds,spaceAccount} from '../lib/needs-experiment.ts';
const lab=()=>step(initialSpaceFreight(),{type:'BEGIN'});
function load(s,n=6){const a=freightAccount(s,s.pending);for(let i=0;i<Math.min(n,a.available.length,a.loadLimit);i++)s=step(s,{type:'LOAD',crate:a.available[i],slot:i});return s;}
function finish(s,renew=false){for(let r=s.history.length;r<3;r++){if(renew&&freightAccount(s).need===0)s=step(s,{type:'MAINTENANCE'});s=step(s,{type:'PRODUCE',expectedRound:r});s=load(s);s=step(s,{type:'LAUNCH',expectedRound:r});}return s;}
function reconcile(s){const a=freightAccount(s,s.pending??null),wallets={firm:60,buyer:96,workers:0,supplier:0};for(const t of a.transfers){assert(Number.isInteger(t.amount)&&t.amount>0);assert(wallets[t.from]>=t.amount);wallets[t.from]-=t.amount;wallets[t.to]+=t.amount;}for(const key of Object.keys(wallets))assert.equal(a[key],wallets[key]);assert.equal(a.moneyAfter,156);assert.equal(a.produced,a.sold+a.stock);assert.equal(new Set(a.available).size,a.stock);return a;}
test('physical freight reconciles all original uniform order/capacity comparisons',()=>{
 for(const capacity of FREIGHT_CAPACITIES)for(const [order,renew,mode] of [[4,false,'wish'],[12,false,'contract'],[12,true,'renew']]){
  let s=step(step(lab(),{type:'CAPACITY',capacity}),{type:'CONTRACT',order});s=step(s,{type:'QUANTITY',quantity:capacity});s=finish(s,renew);const actual=reconcile(s),old=spaceAccount(capacity,mode,3);
  for(const key of ['firm','buyer','workers','supplier','stock','delivered','authorization'])assert.equal(actual[key],old[key]-(key==='delivered'?actual.maintenanceDelivered:0),key);
  assert.deepEqual(restoreSpaceFreight(s),s);
 }
});
test('production pays actual costs; loading/unloading only moves owned goods, launch sells once',()=>{
 let s=step(lab(),{type:'PRODUCE',expectedRound:0});const a=reconcile(s);assert.equal(a.stock,6);assert.equal(a.firm,42);assert.equal(a.buyer,96);assert.equal(a.workers,12);
 const before=structuredClone(s);s=step(s,{type:'LOAD',crate:0,slot:2});assert.deepEqual(reconcile(s),a);assert.strictEqual(step(s,{type:'LOAD',crate:0,slot:2}),s);s=step(s,{type:'LOAD',crate:0,slot:3});assert.equal(s.cargo[2],null);assert.equal(s.cargo[3],0);s=step(s,{type:'UNLOAD',slot:3});assert.deepEqual(s,before);
 s=load(s,4);assert.strictEqual(step(s,{type:'LOAD',crate:4,slot:4}),s);s=step(s,{type:'LAUNCH',expectedRound:0});assert.equal(reconcile(s).buyer,80);assert.equal(reconcile(s).stock,2);assert.strictEqual(step(s,{type:'LAUNCH',expectedRound:0}),s);assert.strictEqual(step(s,{type:'PRODUCE',expectedRound:0}),s);
});
test('zero new production can deliver existing inventory; reduced production is a no-overstock counterexample',()=>{
 let s=step(lab(),{type:'PRODUCE',expectedRound:0});s=load(s,2);s=step(s,{type:'LAUNCH',expectedRound:0});s=step(s,{type:'QUANTITY',quantity:0});s=step(s,{type:'PRODUCE',expectedRound:1});s=load(s,2);s=step(s,{type:'LAUNCH',expectedRound:1});assert.equal(reconcile(s).stock,2);
 s=step(lab(),{type:'QUANTITY',quantity:2});for(let r=0;r<3;r++){if(r===2)s=step(s,{type:'QUANTITY',quantity:0});s=step(s,{type:'PRODUCE',expectedRound:r});s=load(s);s=step(s,{type:'LAUNCH',expectedRound:r});}const a=reconcile(s);assert.equal(a.stock,0);assert.equal(a.sold,4);assert.equal(a.firm,64);
});
test('maintenance is a separately authorized, paid order after construction, never automatic infinite demand',()=>{
 let s=step(lab(),{type:'CONTRACT',order:12});assert.strictEqual(step(s,{type:'MAINTENANCE'}),s);
 for(let r=0;r<2;r++){s=load(step(s,{type:'PRODUCE',expectedRound:r}));s=step(s,{type:'LAUNCH',expectedRound:r});}assert.equal(reconcile(s).need,0);assert.equal(reconcile(s).authorization,0);
 s=step(s,{type:'MAINTENANCE'});assert.equal(reconcile(s).authorization,24);assert.equal(reconcile(s).buyer,48);assert.strictEqual(step(s,{type:'MAINTENANCE'}),s);s=finish(s);const a=reconcile(s);assert.equal(a.sold,18);assert.equal(a.maintenanceDelivered,6);assert.equal(a.firm,78);assert.equal(a.buyer,24);assert.strictEqual(step(s,{type:'MAINTENANCE'}),s);
});
test('all quantities, contract sizes and capacity preserve actual budgets and causal goods',()=>{
 for(const capacity of FREIGHT_CAPACITIES)for(const order of [4,12])for(let q0=0;q0<=capacity;q0++)for(let q1=0;q1<=capacity;q1++)for(let q2=0;q2<=capacity;q2++)for(const wants of [[6,6,6],[0,3,6],[2,1,0]]){
  let s=step(step(lab(),{type:'CAPACITY',capacity}),{type:'CONTRACT',order});for(const [r,q] of [q0,q1,q2].entries()){if(freightAccount(s).need===0&&r===2)s=step(s,{type:'MAINTENANCE'});s=step(s,{type:'QUANTITY',quantity:q});s=step(s,{type:'PRODUCE',expectedRound:r});reconcile(s);s=load(s,wants[r]);reconcile(s);s=step(s,{type:'LAUNCH',expectedRound:r});reconcile(s);}assert.deepEqual(restoreSpaceFreight(s),s);
 }
});
test('comparison requires two completed actual attempts; drafts and swaps cannot manufacture evidence',()=>{
 let s=lab();assert.strictEqual(step(s,{type:'CONCLUDE'}),s);s=finish(s);assert.equal(s.trials.length,1);assert.strictEqual(step(s,{type:'CONCLUDE'}),s);s=step(s,{type:'RETRY'});assert.equal(s.history.length,0);assert.equal(s.trials.length,1);s=finish(s);assert.equal(s.trials.length,1);
 s=step(step(s,{type:'RETRY'}),{type:'CONTRACT',order:12});s=finish(s,true);assert.equal(s.trials.length,2);s=step(s,{type:'CONCLUDE'});assert.equal(s.phase,'conclusion');assert.deepEqual(restoreSpaceFreight(s),s);
});
test('corrupt cargo, unfunded delivery and forged completion cannot restore; old branch snapshots remain intact',()=>{
 const s=load(step(lab(),{type:'PRODUCE',expectedRound:0})),snapshot=structuredClone(s);assert.deepEqual(restoreSpaceFreight(s),s);
 for(const edit of [p=>p.cargo[1]=p.cargo[0],p=>p.cargo[0]=99,p=>p.maintenanceAt=0,p=>p.pending=8,p=>p.quantity=0,p=>p.history.push({produced:0,shipped:[10]}),p=>p.trials.push({...p,history:[]})]){const bad=structuredClone(s);edit(bad);assert.equal(restoreSpaceFreight(bad),null);}assert.deepEqual(s,snapshot);
 const begin={type:'FREIGHT',action:{type:'BEGIN'}},newState=needsReducer(initialNeeds(),begin);assert.deepEqual(restoreNeeds(newState),newState);assert.strictEqual(needsReducer(newState,{type:'SHIP',expectedRound:0}),newState);
 const old=needsReducer(initialNeeds(),{type:'BEGIN'});assert.strictEqual(needsReducer(old,begin),old);assert.deepEqual(restoreNeeds(old),old);const care=initialNeeds('services');assert.strictEqual(needsReducer(care,begin),care);
});
