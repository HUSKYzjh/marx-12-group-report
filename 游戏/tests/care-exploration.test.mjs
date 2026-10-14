import test from 'node:test';
import assert from 'node:assert/strict';
import {initialCareRouting,careRoutingReducer as edit,careRoutingAccount as account,restoreCareRouting} from '../lib/care-routing.ts';
import {careExploration} from '../lib/care-exploration.ts';
const start=()=>edit(initialCareRouting(),{type:'BEGIN'});
const run=s=>edit(s,{type:'RUN',expectedRevision:s.revision});
function full(){let s=start();s=edit(s,{type:'TOOL',enabled:true});for(let id=2;id<4;id++){s=edit(s,{type:'TRAIN',certificate:id-2,person:id});s=edit(s,{type:'WORKER',worker:id,slot:id});}return edit(s,{type:'COVER',people:Array.from({length:12},(_,i)=>i),expectedRevision:s.revision});}

test('questions are read-only actual observations, not new drafts, payouts or trial counts',()=>{
 let s=start();assert.equal(careExploration(s),null);s=run(s);const before=structuredClone(s),q=careExploration(s);
 assert.equal(q.focusPerson,4);assert.match(q.prompt,/同样4个服务位/);assert.equal(q.finishLabel,'谁还在门外？ →');
 assert.deepEqual(s,before);const changed=edit(s,{type:'TOOL',enabled:true});assert.deepEqual(careExploration(changed),q,'a plugged draft does not claim spare actual capacity');
});

test('every person-specific invitation refers to a real, reachable bottleneck',()=>{
 let s=run(edit(start(),{type:'TOOL',enabled:true}));assert.match(careExploration(s).prompt,/还有2个空位/);assert.equal(careExploration(s).focusPerson,4);
 s=edit(s,{type:'VOUCHER',voucher:0,person:4});s=run(s);assert.equal(account(s.run).people[4].served,true);
 let queued=edit(start(),{type:'VOUCHER',voucher:0,person:4});queued=run(queued);assert.equal(careExploration(queued).focusPerson,4);assert.match(careExploration(queued).prompt,/已能付钱。只换次序/);
 queued=edit(queued,{type:'QUEUE',person:4,position:0});queued=run(queued);assert.equal(account(queued.run).served,4);assert.equal(account(queued.run).people[4].served,true);assert.equal(account(queued.run).people[3].served,false);
 let empty=start();empty=edit(empty,{type:'WORKER',worker:0,slot:'bench'});empty=edit(empty,{type:'WORKER',worker:1,slot:'bench'});empty=run(empty);
 assert.equal(careExploration(empty).focusPerson,null);assert.match(careExploration(empty).prompt,/排一个合格的人/);assert.doesNotMatch(careExploration(empty).prompt,/同样0个/);
});

test('a solved experiment offers a feasible one-slip probe without inventing unmet people',()=>{
 let s=run(full());const before=account(s.run),q=careExploration(s);assert.equal(before.served,12);assert.match(q.prompt,/少用一张/);assert.equal(q.focusPerson,null);assert.equal(q.finishLabel,'都用上了，为什么？ →');
 const next=edit(s,{type:'VOUCHER',voucher:s.vouchers.indexOf(0),person:null});assert.deepEqual(next.run,s.run);assert.equal(careExploration(next).fundingFeedback,null);
 s=run(next);const after=account(s.run);assert.equal(after.served,12);assert.equal(after.capacity,before.capacity);assert.equal(after.publicFunds,before.publicFunds+2);assert.equal(after.households,before.households-2);assert.equal(after.moneyAfter,68);
 assert.equal(careExploration(s).fundingFeedback,'公共少付2枚，家里多付2枚。人没少用上，换了付款人。');
 s=edit(s,{type:'VOUCHER',voucher:s.vouchers.indexOf(null),person:0});s=run(s);assert.equal(careExploration(s).fundingFeedback,'公共多付2枚，家里少付2枚。人没少用上，换了付款人。');
});

test('minimal coverage does not demand an impossible saving; swapping a needed slip can reveal a loss',()=>{
 let s=full();for(let id=0;id<4;id++)s=edit(s,{type:'VOUCHER',voucher:s.vouchers.indexOf(id),person:null});s=run(s);
 assert.equal(account(s.run).served,12);assert.match(careExploration(s).prompt,/换一张代付凭证/);assert.doesNotMatch(careExploration(s).prompt,/少用/);
 const voucher=s.vouchers.indexOf(4);s=edit(s,{type:'VOUCHER',voucher,person:0});s=run(s);
 assert.equal(account(s.run).served,11);assert.equal(careExploration(s).focusPerson,4);assert.equal(careExploration(s).fundingFeedback,null,'losing a beneficiary is not a costless change of payer');assert.equal(careExploration(s).finishLabel,'谁还在门外？ →');
});

test('reopening and restoring retain the question’s real baseline; changing capacity is not a payment-only finding',()=>{
 let s=run(start());s=edit(s,{type:'TOOL',enabled:true});s=run(s);assert.equal(careExploration(s).fundingFeedback,null);
 s=edit(s,{type:'CONCLUDE'});const before=careExploration(s);assert.deepEqual(careExploration(edit(s,{type:'REOPEN',expectedRevision:s.revision})),before);
 assert.deepEqual(careExploration(restoreCareRouting(JSON.parse(JSON.stringify(s)))),before);
});
