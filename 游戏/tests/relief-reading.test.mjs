import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPrologue,prologueReducer as reduce,restorePrologue,reliefEndingAccessible} from '../lib/prologue-state.ts';
import {initialRemedy} from '../lib/remedy-lab.ts';
const menu=()=>reduce(initialPrologue(),{type:'JUMP_STAGE',stage:4});

test('explanation continuation reaches the epilogue and research without fabricating trials or accounts',()=>{
 const before=menu(),after=reduce(before,{type:'FINISH_RELIEF_READING'});
 assert.equal(after.scene,'epilogue');assert.equal(after.reliefReadingFinished,true);assert(reliefEndingAccessible(after));
 for(const key of ['reliefVisited','reliefCompleted','remedyLabs','street','battle'])assert.deepEqual(after[key],before[key]);
 assert.equal(after.reliefSampled,false);assert.deepEqual(restorePrologue(after),after);
 let s=reduce(after,{type:'EPILOGUE_REVEAL'});s=reduce(s,{type:'SHOW_ASSUMPTIONS'});assert.equal(s.scene,'assumptions');assert.deepEqual(restorePrologue(JSON.stringify(s)),s);
 s=reduce(s,{type:'OPEN_TECHNOLOGY',branch:'automation'});assert.equal(s.scene,'technology');assert.deepEqual(restorePrologue(s),s);
 const home=initialPrologue();assert.strictEqual(reduce(home,{type:'FINISH_RELIEF_READING'}),home);
});

test('old saved policy games retain their actual records when continuing through explanations',()=>{
 let s={...menu(),remedyLabs:{investment:initialRemedy('investment')}};
 s=reduce(s,{type:'CHOOSE_RELIEF',route:'investment'});s=reduce(s,{type:'REMEDY',action:{type:'PLACE',mode:'expand',expectedRound:0}});
 assert.equal(s.remedyLabs.investment.history.length,1);
 const old=structuredClone(s);delete old.reliefReadingFinished;const restored=restorePrologue(old);
 assert.equal(restored.scene,'relief');assert.equal(restored.reliefReadingFinished,false);assert.deepEqual(restored.remedyLabs,s.remedyLabs);
 const after=reduce(restored,{type:'FINISH_RELIEF_READING'});assert.deepEqual(after.remedyLabs,s.remedyLabs);assert.deepEqual(after.reliefCompleted,s.reliefCompleted);assert.deepEqual(after.reliefVisited,s.reliefVisited);assert.equal(after.reliefRoute,null);assert.deepEqual(restorePrologue(after),after);
});

test('reading progress validates its type and never invents it while restoring old saves',()=>{
 const old=menu();delete old.reliefReadingFinished;assert.equal(restorePrologue(old).reliefReadingFinished,false);
 for(const value of ['yes',1,{},null])assert.deepEqual(restorePrologue({...menu(),reliefReadingFinished:value}),initialPrologue());
 assert.equal(restorePrologue({...menu(),scene:'epilogue'}).scene,'opening');
});
