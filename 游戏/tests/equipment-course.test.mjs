import test from 'node:test';
import assert from 'node:assert/strict';
import * as c from '../public/assets/market-duel/course-model.mjs';
import * as old from '../public/assets/market-duel/course-legacy.mjs';
import {equipmentWorld,equipmentRound,equippedCapacity,readyShop,vacantWorkers,equipmentIssue} from '../public/assets/market-duel/equipment-model.mjs';
function waves(){let s=c.initialCourse(true,false);for(let i=0;i<3;i++)s=c.courseRound(s,'hold');return c.nextCourse(s);}
function source(){let s=waves();for(let i=0;i<5;i++)s=c.courseRound(s,'hold');return c.nextCourse(s);}
test('explicit business strategies replace abstract output changes',()=>{
 assert.deepEqual(c.courseMoves(c.initialCourse()).map(m=>m.id),['price-down','price-up','buy','upgrade','hire','fire','wage-down','wage-up','hold']);
 let s=c.initialCourse();for(let i=1;i<=3;i++){s=c.courseRound(s,'hold');assert.equal(s.world.shops[0].cash,36+7*i);}assert.deepEqual(c.restoreCourse(s),s);
});
test('new oven is paid now, delivered tomorrow, and needs extra hands',()=>{
 let s=waves(),b=c.courseRound(s,'buy');assert.equal(b.world.shops[0].ovens,1);assert.equal(b.world.shops[0].pending.ovens,2);assert.equal(b.world.history.at(-1).made[0],6);assert(b.world.history.at(-1).receipts.some(p=>p.reason==='订购普通炉'&&p.amount===10));
 let h=c.courseRound(b,'hire');assert.equal(h.world.shops[0].ovens,2);assert.equal(h.world.history.at(-1).made[0],6);assert.deepEqual(h.world.shops[0].pending.workers,[0,1,2,3]);
 let arrive=c.courseRound(h,'hold');assert.equal(arrive.world.history.at(-1).made[0],8);assert.equal(arrive.world.shops[0].workers.length,4);assert.deepEqual(c.undoCourse(arrive),h);assert.deepEqual(c.restoreCourse(arrive),arrive);
});
test('upgrade and dismissal have distinct delayed physical effects',()=>{
 let w=equipmentRound(equipmentWorld(),'upgrade','waves');assert.equal(w.history[0].made[0],0);assert.equal(w.shops[0].fastOvens,0);
 w=equipmentRound(w,'fire','waves');assert.equal(w.history.at(-1).made[0],12);assert.equal(w.shops[0].workers.length,3);assert.equal(w.history.at(-1).wages[0],6);assert(w.history.at(-1).receipts.some(p=>p.reason==='解聘补偿'&&p.amount===2));
 w=equipmentRound(w,'hold','waves');assert.equal(w.shops[0].workers.length,2);assert.equal(w.history.at(-1).wages[0],4);assert.equal(w.history.at(-1).made[0],12);
 let ordinary=equipmentRound(equipmentWorld(),'fire','waves');ordinary=equipmentRound(ordinary,'hold','waves');assert.equal(ordinary.history.at(-1).made[0],4);
});
test('price changes today; recruitment cannot create people or duplicate hires',()=>{
 let w=equipmentWorld();assert.deepEqual(vacantWorkers(w),[3,7]);w=equipmentRound(w,'price-up','waves');assert.equal(w.shops[0].price,4);w=equipmentRound(w,'price-down','waves');assert.equal(w.shops[0].price,3);
 w=equipmentRound(w,'hire','waves');w=equipmentRound(w,'hire','waves');assert.deepEqual(readyShop(w.shops[0]).workers,[0,1,2,3,7]);assert.equal(vacantWorkers(w).length,0);assert(equipmentIssue(w,'hire'));
 const broke=equipmentWorld();broke.shops[0].cash=12;assert(equipmentIssue(broke,'upgrade'));assert(equipmentIssue(broke,'buy'));
});
test('source follows actually paid salaries, not unemployed characters',()=>{
 let s=source();assert.equal(s.world.shops.reduce((n,f)=>n+f.workers.length,0),6);assert.equal(c.crossCustomers(s).length,2);
 for(const id of c.crossCustomers(s)){const r=s.world.history[0];assert(r.receipts.some(p=>p.reason==='工资'&&p.to==='p'+id));assert.notEqual(r.visits.find(v=>v.id===id).shop,Math.floor(id/4));s=c.traceCustomer(s,id);}
 const next=c.nextCourse(s);assert.deepEqual(next.world,s.world);assert.deepEqual(c.restoreCourse(next),next);
});
test('100 varied full paths conserve money, validate records and survive replay',()=>{
 for(let seed=1;seed<=100;seed++){
  let s=c.initialCourse(true,false),rng=seed;
  const play=()=>{const moves=c.courseMoves(s).filter(m=>!c.courseIssue(s,m.id));rng=(Math.imul(rng,1664525)+1013904223)>>>0;s=c.courseRound(s,moves[rng%moves.length].id);
   const w=s.world,total=w.shops.reduce((n,f)=>n+f.cash,0)+(w.outside??w.supplier+w.people.reduce((n,p)=>n+p.cash,0));assert.equal(total,s.mode==='social'?120:2072);
   for(const f of w.shops){assert(Number.isInteger(f.cash)&&f.cash>=0);assert(equippedCapacity(readyShop(f))>=0);}assert.deepEqual(c.restoreCourse(s),s);
  };
  while(!c.finished(s))play();s=c.nextCourse(s);while(!c.finished(s))play();s=c.nextCourse(s);for(const id of c.crossCustomers(s))s=c.traceCustomer(s,id);s=c.nextCourse(s);while(!c.finished(s))play();s=c.nextCourse(s);assert.deepEqual(c.restoreCourse(s),s);assert.deepEqual(c.restoreCourse(c.retryScene(s)),c.retryScene(s));
  const forged=structuredClone(s);forged.world.shops[0].cash++;assert.equal(c.restoreCourse(forged),null);
 }
});
test('old accounts retained with exact rules, never silently recalculated',()=>{
 const previous=old.courseRound(old.initialCourse(),'more');assert.deepEqual(c.restoreCourse(previous),previous);let s=c.adoptEquipmentCourse(previous);assert.deepEqual(s.previousCourse,previous);assert.equal(s.world.day,0);s=c.courseRound(s,'buy');assert.deepEqual(c.restoreCourse(s),s);assert.deepEqual(s.previousCourse,previous);
 const forged=structuredClone(s);forged.world.shops[0].pending.ovens++;assert.equal(c.restoreCourse(forged),null);
});
