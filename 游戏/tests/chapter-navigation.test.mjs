import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPrologue,prologueReducer as reduce,restorePrologue} from '../lib/prologue-state.ts';

const scenes={prologue:'bakery',automation:'technology',needs:'needs-technology',ownership:'ownership-technology',rules:'market-rules'};
test('chapter menu opens any chapter from a fresh game, without completing prior experiments',()=>{
  const initial=initialPrologue();
  for(const [chapter,scene] of Object.entries(scenes)){
    const s=reduce(initial,{type:'NAVIGATE_CHAPTER',chapter});
    assert.equal(s.scene,scene);assert.deepEqual(restorePrologue(JSON.stringify(s)),s);
    for(const key of ['reliefCompleted','reliefVisited','epilogueBeat','definitionShown','prologueStatus','street','bakeryWage'])assert.deepEqual(s[key],initial[key],key);
  }
  for(const chapter of ['bad','machine',null])assert.strictEqual(reduce(initial,{type:'NAVIGATE_CHAPTER',chapter}),initial);
});
test('research browsing supports the alternate experiments and refresh, preserving chapter results',()=>{
  let s=reduce(initialPrologue(),{type:'NAVIGATE_CHAPTER',chapter:'automation'});
  s=reduce(s,{type:'TECHNOLOGY',action:{type:'BEGIN'}});
  s=reduce(s,{type:'TECHNOLOGY',action:{type:'RUN'}});
  const result=s.technology;
  for(const chapter of ['rules','needs','ownership','automation']){
    s=reduce(s,{type:'NAVIGATE_CHAPTER',chapter});
    s=restorePrologue(JSON.stringify(s));assert.equal(s.scene,scenes[chapter]);assert.deepEqual(s.technology,result);
  }
  s=reduce(s,{type:'BACK_ASSUMPTIONS'});assert.equal(s.scene,'assumptions');assert.deepEqual(restorePrologue(s),s);
  for(const [type,branch] of [['OPEN_TECHNOLOGY','time'],['OPEN_NEEDS','services'],['OPEN_OWNERSHIP','sharing'],['OPEN_RULES','prices']]){
    s=reduce(s,{type,branch});assert.notEqual(s.scene,'assumptions');assert.deepEqual(restorePrologue(s),s);
    s=reduce(s,{type:'BACK_ASSUMPTIONS'});
  }
  assert.deepEqual(s.reliefCompleted,[]);assert.equal(s.epilogueBeat,0);
});
test('chapter browsing does not unlock unfinished story beats or weaken old save validation',()=>{
  const initial=initialPrologue(),browse=reduce(initial,{type:'NAVIGATE_CHAPTER',chapter:'rules'});
  assert.strictEqual(reduce(browse,{type:'JUMP_STAGE',stage:5}),browse);
  assert.equal(reduce(browse,{type:'JUMP_STAGE',stage:6}).scene,'assumptions');
  for(const action of [{type:'SHOW_HOME'},{type:'NAVIGATE_CHAPTER',chapter:'prologue'},{type:'JUMP_STAGE',stage:0}]){
    const returned=reduce(browse,action);assert.equal(returned.chapterBrowsing,false);
    assert.strictEqual(reduce(returned,{type:'JUMP_STAGE',stage:6}),returned);
    assert.deepEqual(restorePrologue(returned),returned);
  }
  assert.deepEqual(restorePrologue({...browse,chapterBrowsing:false}),initial);
  assert.deepEqual(restorePrologue({...browse,chapterBrowsing:'yes'}),initial);
  const legacy={...initial};delete legacy.chapterBrowsing;assert.deepEqual(restorePrologue(legacy),initial);
});
test('opening chapters leaves the existing street accounts and wage decisions intact',()=>{
  let s=reduce(initialPrologue(),{type:'JUMP_STAGE',stage:2});
  s=reduce(s,{type:'STREET',action:{type:'ROUND',expectedRound:0}});
  const street=structuredClone(s.street);
  for(const chapter of Object.keys(scenes)){
    s=reduce(s,{type:'NAVIGATE_CHAPTER',chapter});
    assert.deepEqual(s.street,street);assert.equal(s.bakeryWage,5);
    assert.deepEqual(restorePrologue(s),s);
  }
});
