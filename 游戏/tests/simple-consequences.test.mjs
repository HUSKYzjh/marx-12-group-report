import test from 'node:test';
import assert from 'node:assert/strict';
import {initialCourse,courseMoves,courseIssue,courseRound,nextCourse,finished,restoreCourse,undoCourse,retryScene,adoptEquipmentCourse} from '../public/assets/market-duel/course-model.mjs';
import {simpleWorld,simpleRound,SIMPLE_RULE} from '../public/assets/market-duel/simple-consequences.mjs';
import {steadyChallenge,challengeRules,rememberSteadyBest,restoreSteadyBest,steadyBestGain} from '../public/assets/market-duel/steady-challenge.mjs';
import {profitReview} from '../public/assets/market-duel/profit-challenge.mjs';
import {wavesReview} from '../public/assets/market-duel/course-review.mjs';
import {restoreBattleSnapshot} from '../lib/battle-session.ts';
const fresh=()=>initialCourse(true,true,true,true);
const go=actions=>actions.reduce((s,a)=>courseRound(s,a),fresh());
const total=w=>w.shops.reduce((n,s)=>n+s.cash,0)+(w.people?w.supplier+w.people.reduce((n,p)=>n+p.cash,0):w.outside);
const next=s=>{while(!finished(s))s=courseRound(s,'hold');return nextCourse(s);};
test('new actions alter the named parameter today; no separate recruitment or delayed plan is exposed',()=>{
 assert.deepEqual(courseMoves(fresh()).map(m=>m.id),['price-down','price-up','expand','upgrade','wage-down','wage-up','hold']);
 for(const [action,wage,payroll,cash] of [['wage-down',1,3,46],['wage-up',3,9,40]]){
  const s=go([action]);assert.equal(s.world.shops[0].wage,wage);assert.equal(s.world.history[0].wages[0],payroll);assert.equal(s.world.shops[0].cash,cash);assert.equal(s.world.history[0].made[0],6);assert.equal(s.world.shops[0].workers.length,3);assert.equal(s.world.shops[0].pending,null);assert.deepEqual(restoreCourse(s),s);assert.deepEqual(undoCourse(s),fresh());
 }
 assert.equal(go(['price-up']).world.history[0].sold[0],6);assert.equal(go(['price-up']).world.shops[0].price,4);
 assert(courseIssue(fresh(),'hire'));assert(courseIssue(fresh(),'fire'));assert(courseIssue(fresh(),'buy'));
});
test('one eight-coin upgrade doubles capacity immediately without downtime or wage changes',()=>{
 const s=go(['upgrade']),r=s.world.history[0];assert.equal(r.made[0],12);assert.equal(r.wages[0],6);assert.equal(r.stopped[0],false);assert.equal(r.installing[0],false);assert.equal(s.world.shops[0].fastOvens,1);assert.equal(s.world.shops[0].pending,null);assert.equal(s.world.shops[0].workers.length,3);assert.equal(r.receipts.filter(p=>p.from==='f0'&&p.reason==='升级快炉').reduce((n,p)=>n+p.amount,0),8);assert(courseIssue(s,'upgrade'));
 const poor=fresh();poor.world.shops[0].cash=18;poor.world.outside+=18;assert.match(courseIssue(poor,'upgrade'),/需19枚/);assert.throws(()=>courseRound(poor,'upgrade'),/Unavailable/);
});
test('unsold bread carries without storage fees, debt or ageing; it never becomes sales income',()=>{
 let w=simpleWorld();w=simpleRound(w,'upgrade','steady',true);const oldBread=w.shops[0].bread.map(b=>b.id);assert.equal(oldBread.length,6);
 for(let i=0;i<4;i++)w=simpleRound(w,'hold','steady',true);
 assert(w.shops[0].bread.length>0);assert(w.history.every(r=>r.spoiled.every(n=>n===0)));assert(w.shops.every(s=>s.debt===0&&s.pending===null));assert(!w.history.flatMap(r=>r.receipts).some(p=>/保管|补偿/.test(p.reason)));assert.equal(total(w),2072);
 for(const r of w.history)assert.equal(r.receipts.filter(p=>p.to==='f0').reduce((n,p)=>n+p.amount,0),r.sold[0]*3);
});
test('upper-act maximum is re-enumerated for immediate consequences, rather than retaining the old 51',()=>{
 let maximum=-Infinity,count=0,best;
 function visit(s){if(finished(s)){count++;const gain=s.world.shops[0].cash-36;if(gain>maximum){maximum=gain;best=s;}assert.deepEqual(restoreCourse(s),s);return;}for(const m of courseMoves(s))if(!courseIssue(s,m.id))visit(courseRound(s,m.id));}
 visit(fresh());assert.equal(count,305);assert.equal(maximum,54);assert.equal(challengeRules(best).maxGain,54);assert(steadyChallenge(best).atMaximum);assert.equal(go(['hold','hold','hold']).world.shops[0].cash,57);assert.equal(best.world.shops[0].cash,90);
 const record=rememberSteadyBest(null,best);assert.equal(record.version,2);assert.equal(steadyBestGain(record),54);assert.deepEqual(restoreSteadyBest(record),record);assert.deepEqual(restoreBattleSnapshot({state:best,view:'choose',steadyBest:record}),{state:best,view:'choose',steadyBest:record});
 assert.equal(steadyBestGain({version:1,actions:['price-up','price-up','hold']}),51);
});
test('lower stages use the same simple costs, fresh ledgers and matching baselines',()=>{
 let s=next(fresh());assert.equal(s.mode,'waves');assert.equal(s.world.ruleSet,SIMPLE_RULE);assert.equal(s.world.shops[0].cash,36);assert(courseIssue(s,'wage-down'));
 while(!finished(s))s=courseRound(s,'hold');assert.deepEqual(s.world.history.map(r=>r.demand),[12,20,20,6,12]);assert.equal(wavesReview(s).difference,0);assert.deepEqual(restoreCourse(s),s);
 s=nextCourse(s);assert.equal(s.mode,'social');assert.equal(s.world.day,0);const normal=courseRound(s,'hold'),cut=courseRound(s,'wage-down');assert.equal(cut.world.history[0].wages[0],3);assert.equal(cut.world.history[0].made[0],normal.world.history[0].made[0]);
 for(const id of [0,1,2])assert.equal(cut.world.history[0].receipts.find(p=>p.reason==='工资'&&p.to==='p'+id).amount,1);
 assert.equal(total(cut.world),120);assert.equal(profitReview(normal.world).difference,0);assert.equal(profitReview(cut.world).actual.gain,cut.world.shops[0].cash-36);
});
test('varied complete runs conserve money, undo, refresh, retry and reject forged cash',()=>{
 for(let seed=1;seed<=20;seed++){
  let s=fresh(),rng=seed;
  for(const mode of ['steady','waves','social']){
   while(!finished(s)){rng=(Math.imul(rng,1664525)+1013904223)>>>0;const choices=courseMoves(s).filter(m=>!courseIssue(s,m.id));const before=structuredClone(s);s=courseRound(s,choices[rng%choices.length].id);assert.deepEqual(undoCourse(s),before);assert.deepEqual(restoreCourse(s),s);assert.equal(total(s.world),mode==='social'?120:2072);assert(s.world.shops.every(shop=>shop.workers.length===shop.ovens+2&&shop.pending===null));assert.equal(new Set(s.world.shops.flatMap(shop=>shop.workers)).size,s.world.shops.reduce((n,shop)=>n+shop.workers.length,0));}
   s=nextCourse(s);
  }
  assert.equal(s.mode,'done');assert.deepEqual(restoreCourse(s),s);const replay=retryScene(s);assert.equal(replay.world.day,0);assert.equal(replay.world.ruleSet,SIMPLE_RULE);assert.equal(replay.world.shops[0].cash,36);
  const forged=structuredClone(s);forged.world.shops[0].cash++;assert.equal(restoreCourse(forged),null);
 }
});
test('original ledgers retain exact old consequences and archive without being recalculated',()=>{
 const old=courseRound(initialCourse(),'wage-down');assert.equal(old.world.history[0].wages[0],6);assert.deepEqual(restoreCourse(old),old);
 const s=adoptEquipmentCourse(old,true,true,true,true);assert.deepEqual(s.previousCourse,old);assert.equal(s.world.ruleSet,SIMPLE_RULE);assert.deepEqual(restoreCourse(s),s);
 const bad=fresh();bad.world.ruleSet='unknown';assert.equal(restoreCourse(bad),null);
});
