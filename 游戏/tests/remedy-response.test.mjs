import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRemedy,remedyReducer as act,remedyAccounts,REMEDY_MODES,restoreRemedy} from '../lib/remedy-lab.ts';
import {prologueReducer as reduce,restorePrologue} from '../lib/prologue-state.ts';
import {legacyRemedyPrologue as initialPrologue} from './helpers/legacy-remedy.mjs';

function played(route){let s=initialRemedy(route);for(let n=0;n<3;n++)s=act(s,{type:'PLACE',mode:REMEDY_MODES[route][0],expectedRound:n});return s;}

test('same-shock real countermove permits continuation without mandatory favourable conditions',()=>{
 for(const route of Object.keys(REMEDY_MODES)){
  const original=played(route),shock=act(original,{type:'COMPARE',outlook:'adverse'}),reply=act(shock,{type:'PLACE',mode:REMEDY_MODES[route][1],expectedRound:3,outlook:'adverse'});
  assert.equal(remedyAccounts(shock).canContinue,false);const accounts=remedyAccounts(reply);
  assert(accounts.responseSeen);assert(accounts.canContinue);assert.equal(accounts.comparisonSeen,false);assert.deepEqual(reply.history,original.history);
  assert.deepEqual(accounts.reports,remedyAccounts(original).reports);assert.deepEqual(restoreRemedy(reply,route),reply);
 }
});

test('draft edits, unchanged repeated moves and different weather alone cannot fake a response',()=>{
 let s=act(played('consumption'),{type:'COMPARE',outlook:'adverse'});
 for(const a of [{type:'DOSE',delta:-1},{type:'MODE',mode:'credit'},{type:'PLACE',mode:'raise',expectedRound:3,outlook:'normal'},{type:'PLACE',mode:'raise',expectedRound:3,outlook:'adverse'}]){
  const same=act(s,a);assert.equal(remedyAccounts(same).responseSeen,false);assert.equal(remedyAccounts(same).canContinue,false);
 }
 s=act(s,{type:'DOSE',delta:-1});assert.equal(remedyAccounts(s).canContinue,false);
 s=act(s,{type:'PLACE',mode:'raise',expectedRound:3,outlook:'adverse'});assert(remedyAccounts(s).responseSeen,'an actually tested different dose is also a response');
});

test('chapter completion derives from real responses, restores and preserves all receipts',()=>{
 let p=reduce(initialPrologue(),{type:'JUMP_STAGE',stage:4});
 for(const route of Object.keys(REMEDY_MODES)){
  p=reduce(p,{type:'CHOOSE_RELIEF',route});for(let n=0;n<3;n++)p=reduce(p,{type:'REMEDY',action:{type:'PLACE',mode:REMEDY_MODES[route][0],expectedRound:n}});
  p=reduce(p,{type:'REMEDY',action:{type:'COMPARE',outlook:'adverse'}});assert.strictEqual(reduce(p,{type:'RELIEF_WRAP'}),p);
  const forged={...p,reliefPhase:'compare',reliefTested:3};assert.strictEqual(reduce(forged,{type:'RELIEF_WRAP'}),forged,'flags alone do not grant completion');
  p=reduce(p,{type:'REMEDY',action:{type:'PLACE',mode:REMEDY_MODES[route][1],expectedRound:3,outlook:'adverse'}});assert.deepEqual(restorePrologue(p),p);
  const records=structuredClone(p.remedyLabs);p=reduce(p,{type:'RELIEF_WRAP'});assert.equal(p.reliefRoute,null);assert(p.reliefCompleted.includes(route));assert.deepEqual(p.remedyLabs,records);assert.deepEqual(restorePrologue(p),p);
 }
 assert.equal(reduce(p,{type:'FINISH_RELIEF'}).scene,'epilogue');
});

test('old favourable-plus-adverse paths remain valid; archives do not complete a replay',()=>{
 let s=act(played('exports'),{type:'COMPARE',outlook:'supported'});assert.equal(remedyAccounts(s).canContinue,false);
 s=act(s,{type:'COMPARE',outlook:'adverse'});assert(remedyAccounts(s).canContinue);assert.equal(remedyAccounts(s).responseSeen,false);
 s=act(s,{type:'REPLAY',fromRound:2,expectedPlan:JSON.stringify(s)});s=act(s,{type:'PLACE',mode:'single',expectedRound:2});assert.equal(remedyAccounts(s).canContinue,false);assert(remedyAccounts(s).archives[0].canContinue);
});
