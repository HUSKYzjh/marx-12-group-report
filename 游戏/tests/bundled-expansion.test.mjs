import test from 'node:test';
import assert from 'node:assert/strict';
import {initialCourse,courseMoves,courseIssue,courseRound,restoreCourse,undoCourse,nextCourse,finished} from '../public/assets/market-duel/course-model.mjs';
import {simpleCapacity} from '../public/assets/market-duel/simple-consequences.mjs';
import {courseMenu} from '../public/assets/market-duel/course-menu.mjs';
const fresh=()=>initialCourse(true,true,true,true);
test('one expansion pays for one oven and recruits one real worker in the same turn',()=>{
 const start=fresh(),s=courseRound(start,'expand'),shop=s.world.shops[0],r=s.world.history[0];
 assert.equal(shop.ovens,2);assert.equal(shop.workers.length,4);assert.deepEqual(r.hired,[3]);assert.equal(r.made[0],12);assert.equal(r.wages[0],8);assert.equal(shop.pending,null);assert.equal(r.stopped[0],false);assert.equal(r.installing[0],false);
 assert.equal(r.receipts.filter(p=>p.from==='f0'&&p.reason==='订购普通炉').reduce((n,p)=>n+p.amount,0),10);assert.equal(shop.cash,31);assert.deepEqual(restoreCourse(s),s);assert.deepEqual(undoCourse(s),start);
 const menu=courseMenu(courseMoves(start));assert(menu.groups.find(g=>g.id==='equipment').moves.some(m=>m.id==='expand'));assert(!courseMoves(start).some(m=>['buy','hire','fire'].includes(m.id)));
});
test('the button discloses actual payroll and funding includes the recruited worker today',()=>{
 let s=fresh();assert.match(courseMoves(s).find(m=>m.id==='expand').hint,/工资\+2枚/);
 s.world.shops[0].cash=22;s.world.outside+=14;assert.match(courseIssue(s,'expand'),/需23枚/);assert.throws(()=>courseRound(s,'expand'),/Unavailable/);
 s.world.shops[0].cash++;s.world.outside--;assert.equal(courseIssue(s,'expand'),'');const w=courseRound(s,'expand').world;assert.equal(w.history[0].wages[0],8);
 const low=courseRound(fresh(),'wage-down');assert.match(courseMoves(low).find(m=>m.id==='expand').hint,/工资\+1枚/);assert.equal(courseRound(low,'expand').world.history[1].wages[0],4);
});
test('expansion and upgrade each add six capacity in either order, with no double staffing',()=>{
 for(const actions of [['expand','upgrade'],['upgrade','expand']]){
  let s=fresh();for(const a of actions)s=courseRound(s,a);assert.equal(simpleCapacity(s.world.shops[0]),18);assert.equal(s.world.shops[0].workers.length,4);assert.equal(s.world.shops[0].ovens,2);assert.equal(s.world.shops[0].fastOvens,1);assert.deepEqual(restoreCourse(s),s);
 }
 let s=fresh();s=courseRound(s,'expand');s=courseRound(s,'expand');assert.deepEqual(s.world.shops[0].workers,[0,1,2,3,7]);assert.equal(simpleCapacity(s.world.shops[0]),18);assert(courseIssue(s,'expand'));
});
test('the recruited worker receives actual same-day wages in the purchasing-power stage',()=>{
 let s=fresh();for(let mode=0;mode<2;mode++){while(!finished(s))s=courseRound(s,'hold');s=nextCourse(s);}
 s=courseRound(s,'expand');const r=s.world.history[0];assert(r.receipts.some(p=>p.from==='f0'&&p.to==='p3'&&p.amount===2&&p.reason==='工资'));assert.equal(r.wages[0],8);assert.equal(r.made[0],12);assert.deepEqual(restoreCourse(s),s);
});
