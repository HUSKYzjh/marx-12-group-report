import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPrologue,prologueReducer as reduce,restorePrologue} from '../lib/prologue-state.ts';
import {initialCourse,courseRound,nextCourse} from '../public/assets/market-duel/course-model.mjs';
const snapshot=state=>({state,view:'result'});
function completedCourse(){
 let c=initialCourse();for(let i=0;i<3;i++)c=courseRound(c,'hold');c=nextCourse(c);
 for(let i=0;i<5;i++)c=courseRound(c,'hold');c=nextCourse(c);
 for(let i=0;i<9;i++)c=courseRound(c,'hold');return nextCourse(c);
}

test('legacy six-shop shortcut now opens the third act and preserves both ledgers',()=>{
 let s=reduce(initialPrologue(),{type:'JUMP_STAGE',stage:2});
 assert.strictEqual(reduce(s,{type:'OPEN_STREET_SANDBOX'}),s);
 s=reduce(s,{type:'SAVE_BATTLE',snapshot:snapshot(completedCourse())});const battle=structuredClone(s.battle);
 s=reduce(s,{type:'OPEN_STREET_SANDBOX'});assert.equal(s.scene,'street-economy');assert.equal(s.streetMode,'battle');
 assert.equal(s.street.world.people.length,20);assert.equal(s.street.world.firms.length,6);assert.equal(s.street.world.round,0);
 assert.equal(s.street.world.firms.find(f=>f.id==='cars').cash,20400);assert.equal(s.street.world.firms[0].cash,7200);
 assert(s.street.books);assert.equal(s.street.campaign,undefined);assert.equal(s.street.tutorial,undefined);
 s=reduce(s,{type:'STREET',action:{type:'ROUND',expectedRound:0}});assert.equal(s.street.world.round,1);assert.deepEqual(s.battle,battle);
 assert.deepEqual(restorePrologue(s),s);const street=structuredClone(s.street);
 s=reduce(s,{type:'JUMP_STAGE',stage:2});assert.equal(s.streetMode,'battle');assert.deepEqual(s.street,street);
 s=reduce(s,{type:'OPEN_STREET_SANDBOX'});assert.deepEqual(s.street,street);
 s=reduce(s,{type:'STREET',action:{type:'ROUND',expectedRound:1}});s=reduce(s,{type:'STREET',action:{type:'EXPLAIN'}});assert.equal(reduce(s,{type:'FINISH_STREET_ECONOMY'}).scene,'ending');
 const migrated=restorePrologue({...s,scene:'street',streetMode:'sandbox'});assert.equal(migrated.scene,'street-economy');assert.deepEqual(migrated.street,s.street);
 assert.equal(restorePrologue({...s,street:null}).streetMode,'battle');
});
test('first act hands off to a fresh battle without inheriting its demonstration cash',()=>{
 const before={...initialPrologue(),scene:'bakery-expansion',bakeryWage:7,bakeryCommitted:true,battle:snapshot(courseRound(initialCourse(),'hold'))};
 const after=reduce(before,{type:'EXPANSION_CONTINUE'});
 assert.equal(after.scene,'street');assert.equal(after.battle,null);assert.equal(after.street,null);assert.equal(after.bakeryWage,7);assert.equal(after.bakeryCommitted,true);
 assert.deepEqual(restorePrologue(after),after);
});
test('second-act save, refresh and navigation preserve progress; invalid data cannot finish',()=>{
 let s=reduce(initialPrologue(),{type:'JUMP_STAGE',stage:2});const battle=snapshot(courseRound(initialCourse(),'hold'));
 s=reduce(s,{type:'SAVE_BATTLE',snapshot:battle});assert.deepEqual(s.battle,battle);assert.deepEqual(restorePrologue(JSON.stringify(s)),s);
 const back=reduce(reduce(s,{type:'JUMP_STAGE',stage:1}),{type:'JUMP_STAGE',stage:2});assert.deepEqual(back.battle,battle);
 assert.strictEqual(reduce(s,{type:'FINISH_BATTLE'}),s);
 const bad=structuredClone(battle);bad.state.world.shops[0].cash+=1000;assert.strictEqual(reduce(s,{type:'SAVE_BATTLE',snapshot:bad}),s);
 const restored=restorePrologue({...s,battle:bad,bakeryWage:4});assert.equal(restored.battle,null);assert.equal(restored.bakeryWage,4);assert.equal(restored.scene,'street');
 const first=reduce(s,{type:'JUMP_STAGE',stage:1});assert.strictEqual(reduce(first,{type:'SAVE_BATTLE',snapshot:battle}),first);
});
test('only a completed three-part battle reaches the story, summary and remedies',()=>{
 let course=initialCourse();for(let i=0;i<3;i++)course=courseRound(course,'hold');course=nextCourse(course);
 for(let i=0;i<5;i++)course=courseRound(course,'hold');course=nextCourse(course);
 for(let i=0;i<9;i++)course=courseRound(course,'hold');course=nextCourse(course);
 let s=reduce(initialPrologue(),{type:'JUMP_STAGE',stage:2});s=reduce(s,{type:'SAVE_BATTLE',snapshot:snapshot(course)});s=reduce(s,{type:'FINISH_BATTLE'});
 assert.equal(s.scene,'ending');assert.deepEqual(restorePrologue(s),s);
 s=reduce(s,{type:'SHOW_ALL'});s=reduce(s,{type:'SHOW_STREET_SUMMARY'});assert.equal(s.scene,'street-summary');s=reduce(s,{type:'SHOW_RELIEF'});assert.equal(s.scene,'relief');
 assert.equal(s.battle.state.mode,'done');assert.equal(s.street,null);
});
