import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialRemedy,remedyReducer as act,remedyAccounts,REMEDY_MODES} from '../lib/remedy-lab.ts';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});
const {isEcho}=window.RemedyFeedback;
const primary={consumption:'credit',investment:'expand',exports:'single'};
function play(s,mode,outlook='normal'){return act(s,{type:'PLACE',mode,expectedRound:s.history.length,outlook});}

test('repeating a strategy in the first two periods is a new operating period, never an echo',()=>{
 for(const route of Object.keys(primary)){
  let s=initialRemedy(route);
  for(let n=0;n<3;n++){
   assert.equal(isEcho(s,primary[route],n===2?'adverse':'normal'),false);
   s=play(s,primary[route],n===2?'adverse':'normal');
   assert.equal(s.history.length,n+1);
  }
  assert.equal(isEcho(s,primary[route],'adverse'),true);
 }
});

test('only an exact match to the current third trial is an echo; draft modes are not receipts',()=>{
 for(const route of Object.keys(primary)){
  const mode=primary[route],other=REMEDY_MODES[route].find(m=>m!==mode);
  let s=initialRemedy(route);for(let n=0;n<3;n++)s=play(s,mode,n===2?'adverse':'normal');
  const frozen=JSON.stringify(s),accounts=JSON.stringify(remedyAccounts(s));
  assert.equal(isEcho(s,mode,'adverse'),true);
  assert.equal(isEcho(s,other,'adverse'),false);
  for(const outlook of ['normal','supported'])assert.equal(isEcho(s,mode,outlook),false);
  assert.equal(isEcho(act(s,{type:'DOSE',delta:1}),mode,'adverse'),false);
  assert.equal(isEcho(act(s,{type:'MODE',mode:other}),other,'adverse'),false);
  assert.equal(isEcho(act(s,{type:'MODE',mode:other}),mode,'adverse'),true);
  assert.equal(JSON.stringify(s),frozen);assert.equal(JSON.stringify(remedyAccounts(s)),accounts);
  assert.equal(remedyAccounts(s).canContinue,false,'the hint is not a countermove');
 }
});

test('a different real response moves the marker; an earlier trial remains revisitable',()=>{
 for(const route of Object.keys(primary)){
  const mode=primary[route],other=REMEDY_MODES[route].find(m=>m!==mode);
  let s=initialRemedy(route);for(let n=0;n<3;n++)s=play(s,mode,n===2?'adverse':'normal');
  const prefix=structuredClone(s.history);s=play(s,other,'adverse');
  assert.equal(isEcho(s,mode,'adverse'),false);assert.equal(isEcho(s,other,'adverse'),true);
  assert.equal(remedyAccounts(s).canContinue,true);assert.deepEqual(s.history,prefix);
  s=play(s,mode,'adverse');assert.equal(isEcho(s,mode,'adverse'),true);assert.equal(isEcho(s,other,'adverse'),false);
  assert.equal(s.comparisons.length,2);assert.deepEqual(s.history,prefix);
 }
});

test('archives and incomplete replays cannot manufacture a current trial',()=>{
 assert.equal(isEcho(null,'credit','adverse'),false);
 let s=initialRemedy('consumption');for(let n=0;n<3;n++)s=play(s,'credit',n===2?'adverse':'normal');
 s=act(s,{type:'REPLAY',fromRound:2,expectedPlan:JSON.stringify(s)});
 assert.equal(s.history.length,2);assert.equal(isEcho(s,'credit','adverse'),false);
 const before=structuredClone(s);assert.equal(remedyAccounts(s).canContinue,false);assert.deepEqual(s,before);
});
