import test from 'node:test';
import assert from 'node:assert/strict';
import {initialCourse,courseRound,nextCourse,restoreCourse,retryScene,externalDemandCourse,auditCourse} from '../public/assets/market-duel/course-model.mjs';
import {initialPrologue,prologueReducer as reduce,restorePrologue,PROLOGUE_STAGES} from '../lib/prologue-state.ts';
import {streetMoney} from '../lib/street-game.ts';
const play=(s,n)=>{for(let i=0;i<n;i++)s=courseRound(s,'hold');return s;};
const completed=()=>nextCourse(play(nextCourse(play(initialCourse(true,true,true,true,true),3)),5));
test('second act stops after three fixed and five variable demand days, with no wallet round',()=>{
 const s=completed();assert.equal(s.mode,'done');assert.equal(s.world.day,5);
 assert.deepEqual(s.world,s.archive.waves);assert.equal(s.archive.steady.day,3);
 assert.deepEqual(s.world.history.map(r=>r.demand),[12,20,20,6,12]);
 assert.deepEqual(restoreCourse(s),s);assert.equal(auditCourse(s),s);
 assert.throws(()=>courseRound(s,'hold'));
 const retry=retryScene(s);assert.equal(retry.mode,'waves');assert.equal(retry.world.day,0);
 assert.deepEqual(restoreCourse(retry),retry);
 const bad=structuredClone(s);bad.world.shops[0].cash++;assert.equal(restoreCourse(bad),null);
 assert.equal(restoreCourse({...s,mode:'social'}),null);
});
test('old fixed, variable and wallet histories remain archived without changing their actual transactions',()=>{
 let old=play(initialCourse(true,true,true,true),1);
 for(const current of [old,play(nextCourse(play(old,2)),2),play(nextCourse(play(nextCourse(play(old,2)),5)),2)]){
  const modern=externalDemandCourse(current);assert.deepEqual(modern.previousCourse,current);
  assert.deepEqual(restoreCourse(modern),modern);
  if(current.mode==='social'){
   assert.equal(modern.mode,'done');assert.deepEqual(modern.archive.waves,current.archive.waves);
   assert.equal(modern.previousCourse.world.history.length,2);
  }else assert.deepEqual(modern.world,current.world);
 }
});
test('third act opens the established six-firm, twenty-person finite-wallet economy and preserves the duel',()=>{
 let s=reduce(initialPrologue(),{type:'JUMP_STAGE',stage:2});
 s=reduce(s,{type:'SAVE_BATTLE',snapshot:{state:completed(),view:'choose',openingRead:true}});
 const battle=structuredClone(s.battle);s=reduce(s,{type:'FINISH_BATTLE'});
 assert.equal(s.scene,'street-economy');assert.equal(PROLOGUE_STAGES[3].scene,s.scene);
 assert.deepEqual(s.street.world.firms.map(f=>f.id),['bakery','rival','clothes','cars','ovens','inputs']);
 assert.equal(s.street.world.people.length,20);assert.equal(s.street.world.round,0);
 assert.equal(streetMoney(s.street.world),s.street.world.initialMoney);
 assert.equal(s.street.world.initialMoney,76800);assert(s.street.books);
 assert.equal(s.street.campaign,undefined);assert.equal(s.street.tutorial,undefined);
 assert.equal(reduce(s,{type:'FINISH_STREET_ECONOMY'}),s);
 for(let i=0;i<3;i++){
  s=reduce(s,{type:'STREET',action:{type:'WAGE',delta:-1}});
  s=reduce(s,{type:'STREET',action:{type:'ROUND',expectedRound:i}});
  assert.equal(s.street.world.round,i+1);
  assert.equal(streetMoney(s.street.world),s.street.world.initialMoney);
  assert.deepEqual(restorePrologue(s),s);assert.deepEqual(s.battle,battle);
 }
 const street=structuredClone(s.street);
 s=reduce(reduce(s,{type:'JUMP_STAGE',stage:2}),{type:'JUMP_STAGE',stage:3});
 assert.deepEqual(s.street,street);assert.deepEqual(s.battle,battle);
 assert.equal(reduce(s,{type:'FINISH_STREET_ECONOMY'}),s);s=reduce(s,{type:'STREET',action:{type:'EXPLAIN'}});s=reduce(s,{type:'FINISH_STREET_ECONOMY'});assert.equal(s.scene,'ending');
 assert.deepEqual(restorePrologue(s),s);
 s=reduce(reduce(s,{type:'SHOW_ALL'}),{type:'SHOW_STREET_SUMMARY'});
 assert.equal(s.scene,'street-summary');s=reduce(s,{type:'SHOW_RELIEF'});assert.equal(s.scene,'relief');
});
test('chapter browsing can enter six firms directly without inventing a completed second act',()=>{
 const s=reduce(initialPrologue(),{type:'JUMP_STAGE',stage:3});assert.equal(s.scene,'street-economy');
 assert.equal(s.battle,null);assert.equal(s.street.world.round,0);assert.deepEqual(restorePrologue(s),s);
});
