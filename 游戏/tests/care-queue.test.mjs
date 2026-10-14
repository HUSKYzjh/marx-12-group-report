import test from 'node:test';
import assert from 'node:assert/strict';
import {initialCareRouting,careRoutingReducer as reduce,careRoutingAccount as account,carePlan,careQueue,restoreCareRouting} from '../lib/care-routing.ts';
const begin=()=>reduce(initialCareRouting(),{type:'BEGIN'}),run=s=>reduce(s,{type:'RUN',expectedRevision:s.revision});
function funded(){let s=begin();for(const person of [4,5])s=reduce(s,{type:'VOUCHER',voucher:person-4,person});return s;}

test('one-person care story exposes separate payment, queue and capacity constraints',()=>{
 let s=run(begin());assert.equal(account(s.run).people[4].reason,'money');
 s=reduce(s,{type:'VOUCHER',voucher:0,person:4});s=run(s);
 let a=account(s.run);assert.equal(a.served,4);assert.equal(a.people[4].reason,'capacity');assert.equal(a.publicFunds,24,'unserved voucher is not paid');
 s=reduce(s,{type:'QUEUE',person:4,position:0});s=run(s);
 a=account(s.run);assert.equal(a.served,4);assert.equal(a.people[4].served,true);assert.equal(a.people[3].reason,'capacity');assert.equal(a.publicFunds,22);
 s=reduce(s,{type:'TOOL',enabled:true});s=run(s);
 a=account(s.run);assert.equal(a.capacity,6);assert.equal(a.served,5);assert.equal(a.people[3].served,true);assert.equal(a.people[5].reason,'money');assert.equal(a.unused,1,'equipment cannot fund the other seven people');
 assert.equal(a.moneyAfter,68);assert.deepEqual(restoreCareRouting(s),s);
});

test('the first attempt is not locked to the highlighted person or a prescribed recipe',()=>{
 for(const action of [{type:'TOOL',enabled:true},{type:'QUEUE',person:11,position:0},{type:'WORKER',worker:0,slot:'bench'},{type:'VOUCHER',voucher:0,person:8}]){
  const draft=reduce(begin(),action),played=run(draft);assert.equal(played.trials.length,1);assert.equal(account(played.run).moneyAfter,68);assert.deepEqual(restoreCareRouting(played),played);
 }
});
test('moving a funded person to the front changes the beneficiary, not capacity or population',()=>{
 let s=funded();const before=account(s);assert.deepEqual(before.people.filter(p=>p.served).map(p=>p.id),[0,1,2,3]);assert.equal(before.publicFunds,24);
 s=reduce(s,{type:'QUEUE',person:4,position:0});const after=account(s);assert.deepEqual(after.people.filter(p=>p.served).map(p=>p.id),[0,1,2,4]);assert.equal(after.people[3].reason,'capacity');assert.equal(after.people[4].cash,1);assert.equal(after.publicFunds,22);assert.equal(after.capacity,4);assert.equal(after.served,4);assert.equal(after.moneyAfter,68);
 assert.deepEqual(after.queue,[4,0,1,2,3,5,6,7,8,9,10,11]);assert.deepEqual(after.people.map(p=>p.id),Array.from({length:12},(_,i)=>i));
});
test('queue editing never spends, changes an executed result, adds a resident or removes a payment assignment',()=>{
 let s=run(funded());const record=structuredClone(s.run),transfers=account(record).transfers;s=reduce(s,{type:'QUEUE',person:4,position:0});assert.deepEqual(s.run,record);assert.deepEqual(account(s.run).transfers,transfers);assert.deepEqual(s.vouchers,record.vouchers);assert.equal(s.trials.length,1);
 s=run(s);assert.equal(s.trials.length,2);assert.equal(account(s.run).people[4].served,true);assert.deepEqual(restoreCareRouting(s),s);
 for(const action of [{type:'QUEUE',person:12,position:0},{type:'QUEUE',person:4,position:-1},{type:'QUEUE',person:4,position:12},{type:'QUEUE',person:4,position:0}])assert.strictEqual(reduce(s,action),s);
});
test('payment eligibility, not the mere presence at the front, uses service slots',()=>{
 let s=reduce(begin(),{type:'QUEUE',person:11,position:0});let a=account(s);assert.equal(a.people[11].reason,'money');assert.equal(a.served,4);assert.equal(a.people[0].served,true);
 s=reduce(s,{type:'VOUCHER',voucher:0,person:11});a=account(s);assert.equal(a.people[11].served,true);assert.equal(a.people[3].reason,'capacity');assert.equal(a.publicFunds,22);
});
test('permutations settle in real queue order and reconcile all actual transfers',()=>{
 for(let shift=0;shift<12;shift++)for(const reverse of [false,true])for(const tool of [false,true])for(const all of [false,true]){
  const p=carePlan(begin());p.queue=Array.from({length:12},(_,i)=>(i+shift)%12);if(reverse)p.queue.reverse();p.tool=tool;if(all)p.vouchers=p.queue.slice();const a=account(p),served=p.queue.filter(i=>p.vouchers.includes(i)||i<4).slice(0,a.capacity);
  assert.deepEqual(a.queue.filter(i=>a.people[i].served),served);assert.equal(a.moneyAfter,68);
  const balances={firm:20,public:24,supplier:0,...Object.fromEntries(Array.from({length:12},(_,i)=>['person-'+i,i<4?4:1])),...Object.fromEntries(Array.from({length:4},(_,i)=>['worker-'+i,0]))};
  for(const t of a.transfers){assert(balances[t.from]>=t.amount);balances[t.from]-=t.amount;balances[t.to]+=t.amount;}assert.equal(Object.values(balances).reduce((x,y)=>x+y,0),68);assert.equal(balances.firm,a.firm);assert.equal(balances.public,a.publicFunds);for(const person of a.people)assert.equal(balances['person-'+person.id],person.cash);
 }
});
test('old saves retain original order and no invented move; invalid queues never restore',()=>{
 let s=run(funded());delete s.queue;delete s.run.queue;delete s.trials[0].queue;assert.deepEqual(restoreCareRouting(s),s);assert.deepEqual(careQueue(s),Array.from({length:12},(_,i)=>i));assert(!('queue' in restoreCareRouting(s).run));
 const intro=initialCareRouting();delete intro.queue;assert.deepEqual(restoreCareRouting(intro),intro);
 for(const queue of [[0,0,...Array.from({length:10},(_,i)=>i+2)],Array.from({length:11},(_,i)=>i),Array.from({length:12},(_,i)=>i===11?12:i)])assert.equal(restoreCareRouting({...s,queue}),null);
 const clone=restoreCareRouting(run(funded()));clone.queue.reverse();assert.notDeepEqual(clone.queue,clone.run.queue);
});
