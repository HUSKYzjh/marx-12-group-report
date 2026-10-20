import test from 'node:test';
import assert from 'node:assert/strict';
import {initialCourse,courseRound,nextCourse,finished,restoreCourse,undoCourse,courseIssue,courseMoves,adoptEquipmentCourse} from '../public/assets/market-duel/course-model.mjs';
import {equipmentWorld,equipmentIssue,equipmentRound} from '../public/assets/market-duel/equipment-model.mjs';
import {coursePart} from '../public/assets/market-duel/course-parts.mjs';
const lower=()=>{let s=initialCourse();for(let i=0;i<3;i++)s=courseRound(s,'hold');return nextCourse(s);};
test('upper act uses fixed external demand, permitting next-day wage cuts without reducing the order book',()=>{
 let s=initialCourse();assert.equal(s.splitActs,true);assert.equal(coursePart(s).id,'upper');assert.equal(courseIssue(s,'wage-down'),'');
 const start=structuredClone(s);s=courseRound(s,'wage-down');assert.equal(s.world.history[0].wages[0],6);assert.deepEqual(undoCourse(s),start);
 s=courseRound(s,'hold');assert.equal(s.world.history[1].wages[0],3);s=courseRound(s,'hold');
 assert.deepEqual(s.world.history.map(r=>r.demand),[12,12,12]);assert.deepEqual(s.world.history.map(r=>r.sold[0]),[6,6,6]);assert.equal(s.world.shops[0].cash,63);assert(!s.world.people);assert.deepEqual(restoreCourse(s),s);
});
test('payroll controls do not apply the lower-act raw-material discount to upper-act affordability',()=>{
 const w=equipmentWorld();w.shops[0].cash=20;
 assert(equipmentIssue(w,'buy',false,true));assert.equal(equipmentIssue(w,'buy',true,true),'');
 assert.throws(()=>equipmentRound(w,'buy','steady',true),/Unavailable/);
});
test('lower act introduces external fluctuations first and income feedback second, with separate accounts',()=>{
 let s=lower();assert.equal(coursePart(s).id,'lower');assert.equal(s.mode,'waves');assert.match(coursePart(s).phase,/客流波动/);assert.equal(s.world.shops[0].cash,36);assert(courseIssue(s,'wage-down'));
 while(!finished(s))s=courseRound(s,'hold');assert.deepEqual(s.world.history.map(r=>r.demand),[12,20,20,6,12]);
 s=nextCourse(s);assert.equal(s.mode,'social');assert.equal(coursePart(s).id,'lower');assert.match(coursePart(s).phase,/收入与购买力/);assert.equal(s.world.day,0);assert.equal(s.world.shops[0].cash,36);assert.equal(s.world.people.length,10);assert.equal(courseIssue(s,'wage-down'),'');assert.deepEqual(restoreCourse(s),s);
});
test('previous profit-only and original tracing records replay unchanged until an explicit archive-and-restart',()=>{
 for(const profit of [false,true]){
  let old=initialCourse(true,profit,false);old=courseRound(old,'price-up');assert.equal(courseMoves(old).some(m=>m.id==='wage-down'),false);assert.deepEqual(restoreCourse(old),old);
  const fresh=adoptEquipmentCourse(old);assert.equal(fresh.splitActs,true);assert.deepEqual(fresh.previousCourse,old);assert.equal(fresh.world.day,0);assert.deepEqual(restoreCourse(fresh),fresh);
 }
 const invalid=initialCourse();invalid.splitActs='true';assert.equal(restoreCourse(invalid),null);
});
