import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreBattleSnapshot} from '../lib/battle-session.ts';
import {initialPrologue,prologueReducer,restorePrologue} from '../lib/prologue-state.ts';
import {initialCourse,courseRound,undoCourse} from '../public/assets/market-duel/course-model.mjs';

test('reading the guide is saved without completing or changing any economic turn',()=>{
 const state=initialCourse(),snapshot={state,view:'choose',openingRead:true};
 const prologue=prologueReducer(prologueReducer(initialPrologue(),{type:'JUMP_STAGE',stage:2}),{type:'SAVE_BATTLE',snapshot});
 assert.deepEqual(prologue.battle,snapshot);
 assert.deepEqual(restorePrologue(JSON.stringify(prologue)),prologue);
 assert.equal(prologue.battle.state.world.day,0);
 assert.deepEqual(prologue.battle.state,initialCourse());
 assert.strictEqual(prologueReducer(prologue,{type:'FINISH_BATTLE'}),prologue);
});

test('legacy saves still restore, while guide metadata cannot forge a ledger or completion',()=>{
 for(const state of [initialCourse(),courseRound(initialCourse(),'hold')]){
  const legacy={state,view:state.world.day?'result':'choose'};
  assert.deepEqual(restoreBattleSnapshot(legacy),legacy);
  for(const openingRead of [true,false])assert.deepEqual(restoreBattleSnapshot({...legacy,openingRead}),{...legacy,openingRead});
  for(const openingRead of ['yes',1,null])assert.equal(restoreBattleSnapshot({...legacy,openingRead}),null);
  const bad=structuredClone({...legacy,openingRead:true});bad.state.world.shops[0].cash+=10;
  assert.equal(restoreBattleSnapshot(bad),null);
 }
});

test('a settled move survives restoration exactly once, and undo restores its initial accounts',()=>{
 const initial=initialCourse(),settled=courseRound(initial,'buy');
 const snapshot=restoreBattleSnapshot({state:settled,view:'result',openingRead:true});
 assert.deepEqual(snapshot.state,settled);
 assert.equal(snapshot.state.world.day,1);
 assert.equal(snapshot.state.world.history.length,1);
 assert.deepEqual(undoCourse(snapshot.state),initial);
 assert.equal(snapshot.openingRead,true);
});
