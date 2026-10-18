import test from 'node:test';
import assert from 'node:assert/strict';
import {initialCourse,courseRound,nextCourse,finished,restoreCourse,retryScene,undoCourse,beginProfitChallenge,courseIssue,auditCourse} from '../public/assets/market-duel/course-model.mjs';
import {profitReview} from '../public/assets/market-duel/profit-challenge.mjs';
import {courseMenu} from '../public/assets/market-duel/course-menu.mjs';
const third=(fresh=true)=>{let s=initialCourse(true,fresh);for(let act=0;act<2;act++){while(!finished(s))s=courseRound(s,'hold');s=nextCourse(s);}return s;};
test('new third scene has no tracing gate or hidden first-day transaction',()=>{
 const s=third();assert.equal(s.mode,'social');assert.equal(s.world.day,0);assert.equal(s.world.shops[0].cash,36);assert.equal(s.world.history.length,0);assert.deepEqual(s.traced,[]);assert.deepEqual(restoreCourse(s),s);assert.equal(profitReview(s.world),null);
});
test('wage cut is a decision for tomorrow, with an actual payroll reduction on the following day',()=>{
 const start=third();let s=courseRound(start,'wage-down');assert.equal(s.world.history[0].wages[0],6);assert.equal(s.world.shops[0].pending.wage,1);
 assert.deepEqual(undoCourse(s),start);s=courseRound(s,'hold');assert.equal(s.world.history[1].wages[0],3);assert.equal(s.world.history[1].made[0],6);assert.deepEqual(restoreCourse(s),s);
});
test('review uses sold goods and real wages, compares the entire plan and cannot invent profit from production',()=>{
 let s=third();for(const move of ['wage-down','price-down','hold','hold'])s=courseRound(s,move);
 const before=structuredClone(s),r=profitReview(s.world);assert.deepEqual(s,before);
 assert.equal(r.actual.wages,s.world.history.reduce((n,h)=>n+h.wages[0],0));assert.equal(r.actual.sold,s.world.history.reduce((n,h)=>n+h.sold[0],0));assert.equal(r.actual.gain,s.world.shops[0].cash-36);
 let ordinary=third();for(let i=0;i<s.world.day;i++)ordinary=courseRound(ordinary,'hold');assert.equal(r.ordinary.gain,ordinary.world.shops[0].cash-36);assert.equal(r.difference,r.actual.gain-r.ordinary.gain);
});
test('all nine days, retries, undo and tamper rejection retain audited finances',()=>{
 for(let seed=1;seed<=12;seed++){
  let s=third(),rng=seed;
  while(!finished(s)){rng=(Math.imul(rng,1664525)+1013904223)>>>0;const moves=['wage-down','price-down','upgrade','fire','hold'].filter(a=>!courseIssue(s,a));s=courseRound(s,moves[rng%moves.length]);auditCourse(s);assert.deepEqual(restoreCourse(s),s);}
  s=nextCourse(s);assert.equal(s.mode,'done');assert.deepEqual(restoreCourse(s),s);assert.equal(retryScene(s).world.day,0);assert.equal(retryScene(s).world.shops[0].cash,36);
  const forged=structuredClone(s);forged.world.shops[0].cash++;assert.equal(restoreCourse(forged),null);
 }
});
test('old tracing accounts remain restorable; opting into the replacement archives them and keeps first two scenes',()=>{
 const old=third(false);assert.equal(old.mode,'source');assert.equal(old.world.day,1);assert.deepEqual(restoreCourse(old),old);
 const fresh=beginProfitChallenge(old);assert.equal(fresh.mode,'social');assert.equal(fresh.world.day,0);assert.deepEqual(fresh.archive,old.archive);assert.deepEqual(fresh.previousCourse,old);assert.deepEqual(restoreCourse(fresh),fresh);
 const forged=structuredClone(fresh);forged.profitChallenge=false;assert.equal(restoreCourse(forged),null);
});
test('third scene uses three categories and direct ordinary business without losing any adjustment',async()=>{
 const {courseMoves}=await import('../public/assets/market-duel/course-model.mjs');const moves=courseMoves(third()),menu=courseMenu(moves);
 assert.deepEqual(menu.direct.map(m=>m.id),['hold']);assert.deepEqual(menu.groups.map(g=>g.label),['改售价','换烤炉','人手与工资']);assert.deepEqual([...menu.direct,...menu.groups.flatMap(g=>g.moves)].map(m=>m.id).sort(),moves.map(m=>m.id).sort());
});
