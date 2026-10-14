import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialRemedy,remedyReducer as act,remedyAccounts,REMEDY_MODES} from '../lib/remedy-lab.ts';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});
const {nextGuess,gradeGuess}=window.RemedyFeedback;
const clean=x=>JSON.parse(JSON.stringify(x));

test('optional guesses cycle through two concrete outcomes and cancellation without accepting unrelated targets',()=>{
 for(const [target,a,b]of [['stock','empty','left'],['cash','up','not-up']]){
  assert.equal(nextGuess(target),a);assert.equal(nextGuess(target,a),b);assert.equal(nextGuess(target,b),undefined);
 }
 for(const target of ['debt','__proto__','constructor',null])assert.equal(nextGuess(target),undefined);
});

test('an opening is not an observed result; malformed reports and guesses cannot manufacture a verdict',()=>{
 for(const r of [null,{}, {stock:1.5,cashChange:1},{stock:-1,cashChange:1},{stock:0,cashChange:NaN}])assert.equal(gradeGuess({stock:'empty'},r),null);
 const r={stock:0,cashChange:0};assert.equal(gradeGuess({},r),null);assert.equal(gradeGuess({stock:'up',cash:'empty'},r),null);
});

test('same successful sales can produce different wallet effects; predictions never alter the funded account',()=>{
 for(const route of Object.keys(REMEDY_MODES)){
  let s=initialRemedy(route);s=act(s,{type:'PLACE',mode:s.mode,expectedRound:0});const r=remedyAccounts(s).display,before=structuredClone(r);
  assert.deepEqual(clean(gradeGuess({stock:'empty',cash:'up'},r)).checks.map(c=>c.matched),[true,true]);assert.deepEqual(r,before);
  s=act(s,{type:'PLACE',mode:s.mode,expectedRound:1});const second=remedyAccounts(s).display;
  assert.deepEqual(clean(gradeGuess({stock:'empty',cash:'not-up'},second)).checks.map(c=>c.matched),[false,false]);
 }
 const r={stock:0,cashChange:-1};assert.deepEqual(clean(gradeGuess({stock:'empty',cash:'up'},r)).checks.map(c=>c.matched),[true,false]);
});

test('zero change is not growth and an empty shelf does not imply that goods were produced or needs met',()=>{
 const r={stock:0,cashChange:0,made:0,sold:0};const g=clean(gradeGuess({stock:'empty',cash:'not-up'},r));
 assert.deepEqual(g.checks.map(c=>c.actual),['empty','not-up']);assert(g.checks.every(c=>c.matched));assert.equal(g.won,undefined);assert.equal(g.profit,undefined);
});

test('a third-period countermove is judged on its own period account change, not the difference from another timeline',()=>{
 let s=initialRemedy('exports');for(let n=0;n<2;n++)s=act(s,{type:'PLACE',mode:'single',expectedRound:n});
 s=act(s,{type:'PLACE',mode:'diverse',expectedRound:2,outlook:'normal'});const before=remedyAccounts(s).display;
 s=act(s,{type:'PLACE',mode:'single',expectedRound:3,outlook:'normal'});const after=remedyAccounts(s).display;
 assert(after.world.cash.shop<before.world.cash.shop);assert(after.cashChange>0);
 assert.equal(gradeGuess({cash:'up'},after).checks[0].matched,true);assert.equal(gradeGuess({cash:'not-up'},after).checks[0].matched,false);
});

test('all real mode/dose/condition results produce grades for the chosen prediction only, with no grade in the save or gate',()=>{
 for(const route of Object.keys(REMEDY_MODES))for(const mode of REMEDY_MODES[route])for(const dose of [0,1,2,3])for(const outlook of ['normal','adverse','supported']){
  let s={...initialRemedy(route),dose};for(let n=0;n<3;n++)s=act(s,{type:'PLACE',mode,expectedRound:n,outlook:n===2?outlook:'normal'});
  const account=remedyAccounts(s),saved=JSON.stringify(s),r=account.display;
  for(const [target,choice]of [['stock','empty'],['stock','left'],['cash','up'],['cash','not-up']]){
   const g=gradeGuess({[target]:choice},r);assert.equal(g.checks.length,1);assert.equal(g.checks[0].target,target);assert.equal(JSON.stringify(s),saved);
  }
  assert.equal(account.canContinue,false);assert.equal(s.guess,undefined);
 }
});
