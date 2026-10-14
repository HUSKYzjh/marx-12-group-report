import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPlatformNetwork,platformNetworkReducer as reduce,networkAccount as account,networkTrialAccount,restorePlatformNetwork} from '../lib/platform-network.ts';
import {initialOwnership,ownershipReducer,restoreOwnership,platformAccount} from '../lib/ownership-experiment.ts';
const begin=()=>reduce(initialPlatformNetwork(),{type:'BEGIN'});
const run=s=>reduce(s,{type:'OPERATE',expectedRevision:s.revision});
const wire=(s,shop,to)=>reduce(s,{type:'CONNECT',shop,to});
test('all prior one-shop migrations reconcile, without requiring that shop to move',()=>{
 for(const rule of ['locked','portable','joint'])for(let fee=0;fee<=6;fee++){
  if(rule==='joint'&&fee!==1)continue;
  const a=account(rule,fee,[['A','A','A'],['B','A','A']]),old=platformAccount(rule,fee,2);
  for(const key of ['shops','platform','alternative','buyers','workers','supplier','migration','moneyBefore','moneyAfter'])assert.deepEqual(a[key],old[key]);
 }
});
test('enumerate every routing subset and fee: funds, goods, migration and maintenance follow actual endpoints',()=>{
 for(const rule of ['locked','portable','joint'])for(let fee=0;fee<=6;fee++)for(const x of ['A','B',null])for(const y of ['A','B',null])for(const z of ['A','B',null]){
  if(rule==='joint'&&fee!==1)continue;const routes=[x,y,z],a=account(rule,fee,[['A','A','A'],routes]),n=routes.filter(e=>e!==null).length,moved=routes.filter(e=>e==='B').length;
  assert.equal(a.moneyAfter,156);assert.equal(a.workers,12+4*n);assert.equal(a.buyers,48-8*n);assert.equal(a.sold,12+4*n);assert.equal(a.migration,moved*(rule==='locked'?6:1));
  assert.equal(a.periods[1].maintenanceA,routes.filter(e=>e==='A').length);assert.equal(a.periods[1].maintenanceB,moved);
  assert([a.platform,a.alternative,a.buyers,a.workers,a.supplier,...a.shops].every(v=>Number.isInteger(v)&&v>=0));
  const balances={A:12,B:12,buyers:72,workers:0,supplier:0,'shop-0':20,'shop-1':20,'shop-2':20};for(const t of a.transfers){assert(balances[t.from]>=t.amount);balances[t.from]-=t.amount;balances[t.to]+=t.amount;}
  assert.deepEqual([balances['shop-0'],balances['shop-1'],balances['shop-2']],a.shops);assert.equal(balances.A,a.platform);assert.equal(balances.B,a.alternative);
  for(const p of a.periods){
   const receipts=a.transfers.filter(t=>t.day===p.day),sum=(kind,to)=>receipts.filter(t=>t.kind===kind&&(to===undefined||t.to===to)).reduce((n,t)=>n+t.amount,0);
   assert.deepEqual(p.payments,{sales:sum('sale'),wages:sum('wage'),inputs:sum('inputs'),accessA:sum('access','A'),accessB:sum('access','B'),migration:sum('migration'),maintenance:sum('maintenance')});
   assert.equal(p.closing.reduce((n,x)=>n+x,0)-p.before.reduce((n,x)=>n+x,0),p.payments.sales-p.payments.wages-p.payments.inputs-p.payments.accessA-p.payments.accessB-p.payments.migration);
  }
 }
});

test('visible period payments distinguish fees, maintenance and moving, not a cumulative or quoted charge',()=>{
 const moved=account('locked',3,[['A','A','A'],['B','A','A']]);
 assert.deepEqual(moved.periods[0].payments,{sales:24,wages:12,inputs:6,accessA:9,accessB:0,migration:0,maintenance:3});
 assert.deepEqual(moved.periods[1].payments,{sales:24,wages:12,inputs:6,accessA:6,accessB:2,migration:6,maintenance:3});
 const idle=account('joint',1,[['A','A','A'],[null,null,null]]);
 assert.deepEqual(idle.periods[1].payments,{sales:0,wages:0,inputs:0,accessA:0,accessB:0,migration:0,maintenance:0});
 assert.equal(idle.periods[0].payments.accessA,idle.periods[0].payments.maintenance);
});

test('private at-cost access and member control can have equal payments without being the same ownership rule',()=>{
 const privateCost=account('portable',1,[['A','A','A'],['A','A','A']]),joint=account('joint',1,[['A','A','A'],['A','A','A']]);
 for(const k of ['shops','platform','alternative','buyers','workers','supplier','transfers','periods','moneyAfter'])assert.deepEqual(privateCost[k],joint[k]);
 assert.equal(privateCost.rule,'portable');assert.equal(joint.rule,'joint');
 assert.deepEqual(privateCost.shops,[22,22,22]);
});
test('stay, all migrate, and disconnect are meaningful alternatives, not a forced crisis',()=>{
 assert.deepEqual(account('locked',3,[['A','A','A'],['A','A','A']]).shops,[18,18,18]);
 assert.deepEqual(account('locked',3,[['A','A','A'],['B','B','B']]).shops,[13,13,13]);
 assert.deepEqual(account('portable',3,[['A','A','A'],['B','B','B']]).shops,[18,18,18]);
 assert.deepEqual(account('joint',1,[['A','A','A'],['A','A','A']]).shops,[22,22,22]);
 const idle=account('locked',3,[['A','A','A'],[null,null,null]]);assert.deepEqual(idle.shops,[19,19,19]);assert.equal(idle.workers,12);assert.equal(idle.sold,12);
});
test('pickup-equivalent noops, reversible drafts, stale operations and condition lock preserve first ledger',()=>{
 let s=begin();assert.strictEqual(wire(s,0,'B'),s);s=run(s);const first=account(s.rule,s.fee,s.history);
 assert.strictEqual(reduce(s,{type:'FEE',fee:5}),s);assert.strictEqual(reduce(s,{type:'CONDITION',rule:'portable'}),s);assert.strictEqual(reduce(s,{type:'OPERATE',expectedRevision:s.revision-1}),s);
 s=wire(s,2,'B');s=wire(s,0,null);assert.deepEqual(account(s.rule,s.fee,s.history),first);assert.equal(s.trials.length,0);s=wire(s,0,'A');s=wire(s,2,'A');assert.deepEqual(s.routes,['A','A','A']);
 s=run(s);assert.equal(s.trials.length,1);assert.strictEqual(run(s),s);assert.strictEqual(wire(s,0,'B'),s);assert.strictEqual(reduce(s,{type:'CONCLUDE'}),s);
 s=reduce(s,{type:'RETRY'});s=wire(run(s),0,'B');s=run(s);assert.equal(s.trials.length,2);assert.equal(reduce(s,{type:'CONCLUDE'}).phase,'conclusion');
});
test('same aggregate routes do not inflate observed evidence; comparison replay starts from finite original money',()=>{
 let s=wire(run(begin()),0,'B');s=run(s);s=reduce(s,{type:'RETRY'});s=wire(run(s),2,'B');s=run(s);assert.equal(s.trials.length,1);assert.deepEqual(s.trials[0].routes,['A','A','B']);
 s=reduce(s,{type:'CONDITION',rule:'portable'});assert.equal(s.history.length,0);assert.equal(account(s.rule,s.fee,s.history).moneyAfter,156);assert.equal(s.trials.length,1);s=wire(run(s),1,'B');s=run(s);assert.equal(s.trials.length,2);assert.deepEqual(s.trials.map(p=>networkTrialAccount(p).migration),[6,1]);
});
test('restore validates histories, drafts, signatures and conclusions; derived money is never trusted',()=>{
 let s=wire(run(begin()),1,'B');for(const state of [initialPlatformNetwork(),begin(),s,run(s)])assert.deepEqual(restorePlatformNetwork(state),state);
 s=run(s);const restored=restorePlatformNetwork({...s,moneyAfter:999,shops:[999,999,999]});assert.deepEqual(restored,s);restored.routes[0]='B';assert.notDeepEqual(restored.routes,s.routes);
 for(const bad of [{...s,history:[['B','A','A'],s.routes]},{...s,routes:['A','A','A']},{...s,trials:[]},{...s,trials:[...s.trials,...s.trials]},{...s,phase:'conclusion'},{...s,revision:-1},{...s,rule:'joint',fee:3}])assert.equal(restorePlatformNetwork(bad),null);
 assert.throws(()=>account('joint',3,[]));assert.throws(()=>account('locked',3,[['A','A','A'],['bad','A','B']]));
});
test('nested ownership model opens only fresh intros and preserves existing legacy play',()=>{
 let t=initialOwnership();t=ownershipReducer(t,{type:'NETWORK',action:{type:'BEGIN'}});assert(t.network);assert.deepEqual(restoreOwnership(t),t);
 t=ownershipReducer(t,{type:'NETWORK',action:{type:'OPERATE',expectedRevision:0}});t=ownershipReducer(t,{type:'NETWORK',action:{type:'CONNECT',shop:2,to:'B'}});assert.equal(t.round,1);assert.deepEqual(restoreOwnership(t),t);
 assert.strictEqual(ownershipReducer(t,{type:'OPERATE',expectedRound:1}),t);assert.equal(restoreOwnership({...t,round:0}),null);
 const old=ownershipReducer(initialOwnership(),{type:'BEGIN'});assert.strictEqual(ownershipReducer(old,{type:'NETWORK',action:{type:'BEGIN'}}),old);assert.deepEqual(restoreOwnership(old),old);
 assert.strictEqual(ownershipReducer(initialOwnership('sharing'),{type:'NETWORK',action:{type:'BEGIN'}}).network,undefined);
});

test('next wiring keeps paid results, other shops and fee; execution compares the same finite opening wallets',()=>{
 let s=run(wire(run(begin()),0,'B')),paid=account(s.rule,s.fee,s.history),old=structuredClone(s.trials);
 assert.strictEqual(reduce(s,{type:'COMPARE',expectedRevision:s.revision}),s);
 s=reduce(s,{type:'NEXT_RULE',rule:'portable'});
 assert.deepEqual(s.proposal,{rule:'portable',fee:3,routes:['B','A','A']});assert.deepEqual(account(s.rule,s.fee,s.history),paid);assert.deepEqual(s.trials,old);
 assert.deepEqual(restorePlatformNetwork(s),s);assert.strictEqual(reduce(s,{type:'COMPARE',expectedRevision:s.revision-1}),s);
 s=reduce(s,{type:'COMPARE',expectedRevision:s.revision});assert.equal(s.proposal,undefined);assert.equal(s.trials.length,2);assert.deepEqual(account(s.rule,s.fee,s.history).shops,[18,18,18]);assert.equal(account(s.rule,s.fee,s.history).moneyAfter,156);
 const last=structuredClone(s.trials),routes=s.routes.slice();s=reduce(s,{type:'NEXT_CONNECT',shop:0,to:'A'});
 assert.deepEqual(s.routes,routes);assert.deepEqual(s.proposal.routes,['A','A','A']);assert.deepEqual(s.trials,last);
 s=reduce(s,{type:'COMPARE',expectedRevision:s.revision});assert.deepEqual(account(s.rule,s.fee,s.history).shops,[18,18,18]);assert.equal(s.trials.length,3);assert.deepEqual(restorePlatformNetwork(s),s);
});

test('next fee and key changes do not silently reset routing; joint access must fund maintenance',()=>{
 let s=run(wire(run(begin()),2,null));s=reduce(s,{type:'NEXT_FEE',fee:1});assert.deepEqual(s.proposal.routes,['A','A',null]);
 s=reduce(s,{type:'NEXT_RULE',rule:'joint'});assert.deepEqual(s.proposal,{rule:'joint',fee:1,routes:['A','A',null]});assert.strictEqual(reduce(s,{type:'NEXT_FEE',fee:0}),s);
 s=reduce(s,{type:'NEXT_RULE',rule:'portable'});assert.equal(s.proposal.fee,1);assert.deepEqual(s.proposal.routes,['A','A',null]);
 s=reduce(s,{type:'COMPARE',expectedRevision:s.revision});assert.deepEqual(account(s.rule,s.fee,s.history).shops,[22,22,21]);assert.equal(account(s.rule,s.fee,s.history).workers,20);
 for(const action of [{type:'NEXT_CONNECT',shop:3,to:'A'},{type:'NEXT_CONNECT',shop:0,to:'bad'},{type:'NEXT_FEE',fee:7},{type:'NEXT_RULE',rule:'bad'}])assert.strictEqual(reduce(s,action),s);
 for(const early of [initialPlatformNetwork(),begin(),run(begin())])for(const action of [{type:'NEXT_CONNECT',shop:0,to:'B'},{type:'NEXT_FEE',fee:1},{type:'NEXT_RULE',rule:'joint'},{type:'COMPARE',expectedRevision:early.revision}])assert.strictEqual(reduce(early,action),early);
});

test('reversible and equivalent prospective arrangements cannot manufacture new evidence',()=>{
 let s=run(wire(run(begin()),0,'B'));const old=structuredClone(s),trialCount=s.trials.length;
 s=reduce(s,{type:'NEXT_CONNECT',shop:0,to:'A'});s=reduce(s,{type:'NEXT_CONNECT',shop:0,to:'B'});assert.equal(s.proposal,undefined);assert.deepEqual(s.trials,old.trials);assert.strictEqual(reduce(s,{type:'COMPARE',expectedRevision:s.revision}),s);
 s=reduce(s,{type:'NEXT_CONNECT',shop:0,to:'A'});s=reduce(s,{type:'NEXT_CONNECT',shop:2,to:'B'});s=reduce(s,{type:'COMPARE',expectedRevision:s.revision});assert.equal(s.trials.length,trialCount);
 assert.deepEqual(s.routes,['A','A','B']);assert.equal(reduce(s,{type:'CONCLUDE'}).phase,'lab');
});

test('prospective restore rejects forged or impossible drafts, clones routes and bridges ownership without changing paid phase',()=>{
 let s=run(run(begin()));s=reduce(s,{type:'NEXT_CONNECT',shop:1,to:'B'});const restored=restorePlatformNetwork({...s,proposal:{...s.proposal,shops:[999,999,999]}});assert.deepEqual(restored,s);restored.proposal.routes[0]='B';assert.notDeepEqual(restored.proposal,s.proposal);
 for(const bad of [{...s,proposal:{...s.proposal,rule:'joint',fee:3}},{...s,proposal:{rule:s.rule,fee:s.fee,routes:s.routes}},{...s,proposal:{...s.proposal,routes:['A']}},{...begin(),proposal:s.proposal}])assert.equal(restorePlatformNetwork(bad),null);
 let t=ownershipReducer(initialOwnership(),{type:'NETWORK',action:{type:'BEGIN'}});for(let i=0;i<2;i++)t=ownershipReducer(t,{type:'NETWORK',action:{type:'OPERATE',expectedRevision:t.network.revision}});
 t=ownershipReducer(t,{type:'NETWORK',action:{type:'NEXT_CONNECT',shop:1,to:'B'}});assert.equal(t.round,2);assert.equal(t.platformMode,'locked');assert.deepEqual(restoreOwnership(t),t);
 t=ownershipReducer(t,{type:'NETWORK',action:{type:'COMPARE',expectedRevision:t.network.revision}});assert.deepEqual(restoreOwnership(t),t);
 const ended=reduce(t.network,{type:'CONCLUDE'});assert.equal(ended.phase,'conclusion');assert.strictEqual(reduce(ended,{type:'NEXT_CONNECT',shop:0,to:'B'}),ended);
});
