import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPrologue,prologueReducer as reduce,restorePrologue,canSampleRelief,reliefEndingAccessible} from '../lib/prologue-state.ts';
import {REMEDY_MODES,initialRemedy} from '../lib/remedy-lab.ts';

const start=()=>reduce(initialPrologue(),{type:'JUMP_STAGE',stage:4});
function trial(s,route){
 if(!s.remedyLabs[route])s={...s,remedyLabs:{...s.remedyLabs,[route]:initialRemedy(route)}};
 s=reduce(s,{type:'CHOOSE_RELIEF',route});
 for(let n=0;n<3;n++)s=reduce(s,{type:'REMEDY',action:{type:'PLACE',mode:REMEDY_MODES[route][0],expectedRound:n}});
 s=reduce(s,{type:'REMEDY',action:{type:'COMPARE',outlook:'adverse'}});
 return reduce(s,{type:'REMEDY',action:{type:'PLACE',mode:REMEDY_MODES[route][1],expectedRound:3,outlook:'adverse'}});
}
test('one real completed response permits an explicit shorter story path without completing other remedies',()=>{
 for(const route of Object.keys(REMEDY_MODES)){
  let s=trial(start(),route);
  assert.strictEqual(reduce(s,{type:'FINISH_RELIEF_SAMPLE'}),s,'cannot leave directly from an uncollected trial');
  s=reduce(s,{type:'RELIEF_WRAP'});assert(canSampleRelief(s));assert(!reliefEndingAccessible(s));
  assert.strictEqual(reduce(s,{type:'FINISH_RELIEF'}),s,'the original three-route path still needs all three');
  assert.strictEqual(reduce(s,{type:'JUMP_STAGE',stage:5}),s,'eligible does not mean the player selected the shorter path');
  const records=structuredClone(s.remedyLabs);s=reduce(s,{type:'FINISH_RELIEF_SAMPLE'});
  assert.equal(s.scene,'epilogue');assert(s.reliefSampled);assert(reliefEndingAccessible(s));
  assert.deepEqual(s.reliefCompleted,[route]);assert.deepEqual(s.reliefVisited,[route]);assert.deepEqual(s.remedyLabs,records);
  assert.deepEqual(restorePrologue(s),s);assert.strictEqual(reduce(s,{type:'SHOW_ASSUMPTIONS'}),s);
  s=reduce(s,{type:'EPILOGUE_REVEAL'});s=reduce(s,{type:'SHOW_ASSUMPTIONS'});assert.equal(s.scene,'assumptions');assert.deepEqual(restorePrologue(JSON.stringify(s)),s);
  s=reduce(s,{type:'OPEN_TECHNOLOGY',branch:'automation'});assert.equal(s.scene,'technology');assert.deepEqual(restorePrologue(s),s);
  s=reduce(s,{type:'JUMP_STAGE',stage:4});assert.equal(s.scene,'relief');assert.deepEqual(s.reliefCompleted,[route]);
 }
});
test('visits, draft choices, fake completion flags and legacy animation-only completion cannot grant the shorter path',()=>{
 let s=start();for(const route of Object.keys(REMEDY_MODES))s=reduce(s,{type:'CHOOSE_RELIEF',route});s=reduce(s,{type:'RELIEF_MENU'});
 for(const bad of [s,{...s,reliefCompleted:['consumption']},{...s,reliefCompleted:['consumption'],reliefTested:3}]){
  assert(!canSampleRelief(bad));assert.strictEqual(reduce(bad,{type:'FINISH_RELIEF_SAMPLE'}),bad);
  assert.equal(restorePrologue({...bad,reliefSampled:true}).scene,'opening');
 }
 const old=structuredClone(initialPrologue());delete old.reliefSampled;assert.deepEqual(restorePrologue(old),initialPrologue());
 assert.equal(restorePrologue({...initialPrologue(),reliefSampled:'true'}).scene,'opening');
});
test('replay and reset revoke only their own completed trial, not another actual trial',()=>{
 for(const type of ['REPLAY','RESTART']){
  let s=reduce(trial(start(),'consumption'),{type:'RELIEF_WRAP'});s=reduce(s,{type:'FINISH_RELIEF_SAMPLE'});s=reduce(s,{type:'JUMP_STAGE',stage:4});
  s=reduce(s,{type:'CHOOSE_RELIEF',route:'consumption'});s=reduce(s,{type:'REMEDY',action:type==='REPLAY'?{type,fromRound:0,expectedPlan:JSON.stringify(s.remedyLabs.consumption)}:{type}});
  assert.deepEqual(s.reliefCompleted,[]);assert(!s.reliefSampled);assert(!reliefEndingAccessible(s));assert.deepEqual(restorePrologue(s),s);
  s=reduce(trial(s,'exports'),{type:'RELIEF_WRAP'});s=reduce(s,{type:'FINISH_RELIEF_SAMPLE'});s=reduce(s,{type:'JUMP_STAGE',stage:4});
  s=reduce(s,{type:'CHOOSE_RELIEF',route:'investment'});s=reduce(s,{type:'REMEDY',action:{type:'RESTART'}});
  assert.deepEqual(s.reliefCompleted,['exports']);assert(s.reliefSampled);assert(reliefEndingAccessible(s));assert.deepEqual(restorePrologue(s),s);
 }
});
