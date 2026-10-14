import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSpaceFreight,freightReducer as step,freightAccount,freightCanLoad,restoreSpaceFreight,FREIGHT_KINDS} from '../lib/space-freight.ts';
import {initialNeeds,needsReducer,restoreNeeds} from '../lib/needs-experiment.ts';
const lab=()=>step(initialSpaceFreight(true),{type:'BEGIN'});
function plan(s,mix){for(let slot=0;slot<6;slot++)s=step(s,{type:'PLAN',slot,kind:mix[slot]??null});return s;}
function load(s){let slot=0;for(const id of freightAccount(s,s.pending).available){if(freightCanLoad(s,id))s=step(s,{type:'LOAD',crate:id,slot:slot++});}return s;}
function turn(s){const r=s.history.length;s=step(s,{type:'PRODUCE',expectedRound:r});s=load(s);return step(s,{type:'LAUNCH',expectedRound:r});}
function reconcile(s){const a=freightAccount(s,s.pending),wallets={firm:60,buyer:96,workers:0,supplier:0};for(const t of a.transfers){assert(Number.isInteger(t.amount)&&t.amount>0&&wallets[t.from]>=t.amount);wallets[t.from]-=t.amount;wallets[t.to]+=t.amount;}for(const key of Object.keys(wallets))assert.equal(a[key],wallets[key]);assert.equal(a.moneyAfter,156);assert.equal(a.produced,a.sold+a.stock);assert.equal(a.habitats,Math.min(a.built.power,a.built.air,a.built.structure));assert(a.habitats<=4);assert.deepEqual(restoreSpaceFreight(s),s);return a;}

test('blueprints only arrange future work; no wages, goods or payment appear before production',()=>{
 let s=lab(),a=freightAccount(s);s=step(s,{type:'PLAN',slot:0,kind:'air'});assert.equal(s.plan[0],'air');assert.deepEqual(freightAccount(s),a);s=step(s,{type:'PLAN',slot:1,kind:null});assert.equal(s.quantity,5);assert.deepEqual(freightAccount(s),a);
 assert.equal(step(s,{type:'QUANTITY',quantity:0}),s);assert.equal(step(s,{type:'PLAN',slot:6,kind:'air'}),s);assert.equal(step(s,{type:'PLAN',slot:1,kind:'gold'}),s);
 s=step(s,{type:'PRODUCE',expectedRound:0});a=reconcile(s);assert.equal(a.firm,45);assert.equal(a.workers,10);assert.equal(a.buyer,96);assert.deepEqual(a.crates.map(c=>c.kind),['air','structure','power','air','structure']);assert.equal(step(s,{type:'PLAN',slot:0,kind:'power'}),s,'cannot relabel existing goods');
});

test('equal funded deliveries can leave different actual living conditions',()=>{
 let mono=plan(lab(),Array(6).fill('power')),balanced=lab();mono=turn(mono);balanced=turn(balanced);
 const a=reconcile(mono),b=reconcile(balanced);assert.equal(a.sold,4);assert.equal(b.sold,4);assert.equal(a.firm,b.firm);assert.equal(a.habitats,0);assert.equal(b.habitats,1);assert.equal(a.stock,2);assert.equal(b.stock,2);
 assert.deepEqual(a.wanted,{power:0,air:4,structure:4});assert.equal(a.need,8);assert.equal(a.authorization,0,'the unpaid wish is not an order');
});

test('a missing kind cannot be replaced by more unwanted goods, even with purchasing funds',()=>{
 let s=step(plan(lab(),Array(6).fill('power')),{type:'CONTRACT',order:12});s=step(s,{type:'PRODUCE',expectedRound:0});for(let slot=0;slot<4;slot++)s=step(s,{type:'LOAD',crate:slot,slot});
 const before=structuredClone(s);assert.equal(freightCanLoad(s,4),false);assert.equal(step(s,{type:'LOAD',crate:4,slot:4}),s);assert.deepEqual(s,before);s=step(s,{type:'LAUNCH',expectedRound:0});const a=reconcile(s);assert.equal(a.authorization,32);assert.equal(a.buyer,80);assert.equal(a.habitats,0);
 const forged=structuredClone(s);forged.history[0].shipped.push(4);assert.equal(restoreSpaceFreight(forged),null);assert.throws(()=>freightAccount(forged),/Unwanted shipment/);
});

test('later changing production can complete the base without erasing earlier mismatched stock',()=>{
 let s=step(plan(lab(),Array(6).fill('power')),{type:'CONTRACT',order:12});s=turn(s);const first=structuredClone(s.history),old=freightAccount(s).crates;
 s=plan(s,['air','structure','air','structure']);assert.deepEqual(s.history,first);assert.deepEqual(freightAccount(s).crates,old);s=turn(s);assert.equal(reconcile(s).habitats,2);s=turn(s);const a=reconcile(s);
 assert.equal(a.habitats,4);assert.equal(a.delivered,12);assert.equal(a.produced,14);assert.equal(a.stock,2);assert.deepEqual(a.crates.map(c=>c.kind),['power','power']);assert.equal(a.firm,66);
});

test('matching supplies, later paid maintenance, and not producing are real alternatives',()=>{
 let s=step(lab(),{type:'CONTRACT',order:12});s=turn(s);s=turn(s);assert.equal(reconcile(s).habitats,4);s=step(s,{type:'MAINTENANCE'});s=turn(s);const a=reconcile(s);
 assert.equal(a.sold,18);assert.equal(a.stock,0);assert.equal(a.maintenanceDelivered,6);assert.deepEqual(a.serviced,{power:2,air:2,structure:2});assert.equal(a.buyer,24);assert.equal(a.habitats,4);
 let paced=plan(lab(),['power','air','structure',null,null,null]);paced=turn(paced);paced=plan(paced,['power']);paced=turn(paced);paced=plan(paced,[]);paced=turn(paced);const p=reconcile(paced);assert.equal(p.sold,4);assert.equal(p.stock,0);assert.equal(p.habitats,1);assert.equal(p.need,8);
});

test('all 729 six-slot recipes preserve funded payments, types and physical inventories',()=>{
 for(let n=0;n<729;n++)for(const order of [4,12]){let code=n,mix=[];for(let slot=0;slot<6;slot++){mix.push(FREIGHT_KINDS[code%3]);code=Math.floor(code/3);}let s=step(plan(lab(),mix),{type:'CONTRACT',order});for(let r=0;r<3;r++){s=turn(s);reconcile(s);}}
});

test('different actual kinds count as different trials; slot shuffling is not extra evidence',()=>{
 let s=plan(lab(),Array(6).fill('power'));for(let i=0;i<3;i++)s=turn(s);s=step(s,{type:'RETRY'});for(let i=0;i<3;i++)s=turn(s);assert.equal(s.trials.length,2);assert.equal(step(s,{type:'CONCLUDE'}).phase,'conclusion');
 const bad=structuredClone(s);bad.history[0].mix[0]='gold';assert.equal(restoreSpaceFreight(bad),null);const duplicate=structuredClone(s);duplicate.trials.push(structuredClone(duplicate.trials[0]));assert.equal(restoreSpaceFreight(duplicate),null);
 let shuffled=step(lab(),{type:'CONTRACT',order:12});for(let i=0;i<3;i++)shuffled=turn(shuffled);shuffled=plan(step(shuffled,{type:'RETRY'}),['air','structure','power','air','structure','power']);for(let i=0;i<3;i++)shuffled=turn(shuffled);assert.equal(shuffled.trials.length,1,'equivalent recipes and interchangeable slot order cannot create observations');
});

test('new story entry uses construction but old uniform snapshots retain their original rules',()=>{
 const s=needsReducer(initialNeeds(),{type:'FREIGHT',action:{type:'BEGIN'}});assert.equal(s.freight.construction,true);assert.deepEqual(restoreNeeds(s),s);
 let old=step(initialSpaceFreight(),{type:'BEGIN'});old=step(old,{type:'PRODUCE',expectedRound:0});const restored=restoreSpaceFreight(old);assert.deepEqual(restored,old);assert.equal(restored.construction,undefined);assert.equal(restored.plan,undefined);assert.equal(freightAccount(old,old.pending).crates[0].kind,null);
 const forged=structuredClone(old);forged.plan=Array(6).fill('air');assert.equal(restoreSpaceFreight(forged),null);
});
