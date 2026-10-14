import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialRemedy,remedyReducer as act,remedyAccounts,REMEDY_MODES} from '../lib/remedy-lab.ts';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});
const cue=(route,r)=>JSON.parse(JSON.stringify(window.RemedyFeedback.moveCue(route,r)));
test('six battle cries describe actual funded policies, without adding a score or a victory',()=>{
 assert.equal(cue('consumption',null),null);
 const names={raise:'加工资！',credit:'先借钱！',expand:'扩建产线！',replace:'换掉旧机器！',single:'押一个大客户！',diverse:'分散找客户！'};
 for(const route of Object.keys(REMEDY_MODES))for(const mode of REMEDY_MODES[route]){
  const s=act(initialRemedy(route),{type:'PLACE',mode,expectedRound:0}),before=JSON.stringify(s),r=remedyAccounts(s).display;
  assert.deepEqual(cue(route,r),{text:names[mode],kind:'move'});assert.equal(JSON.stringify(s),before);
 }
});
test('zero-dose and stopped production cannot masquerade as a successful move',()=>{
 for(const route of Object.keys(REMEDY_MODES))for(const mode of REMEDY_MODES[route]){
  let s={...initialRemedy(route),dose:0};s=act(s,{type:'PLACE',mode,expectedRound:0});const r=remedyAccounts(s).display;
  assert.deepEqual(cue(route,r),{text:'照常经营！',kind:'idle'});
  assert.deepEqual(cue(route,{...r,made:0}),{text:'本期停工…',kind:'idle'});
 }
});
test('all real funded periods and alternative trials keep move cries tied to actual receipts',()=>{
 for(const route of Object.keys(REMEDY_MODES))for(const dose of [0,1,2,3])for(let bits=0;bits<8;bits++)for(const outlook of ['normal','adverse','supported']){
  let s={...initialRemedy(route),dose};
  for(let n=0;n<4;n++){
   s=act(s,{type:'PLACE',mode:REMEDY_MODES[route][bits>>(n%3)&1],expectedRound:Math.min(n,3),outlook:n<2?'normal':outlook});
   const r=remedyAccounts(s).display,frozen=JSON.stringify(r),v=cue(route,r);
   const base=outlook==='adverse'&&n>=2?10:outlook==='supported'&&n>=2?30:20;
   if(v.kind==='move'){
    assert(r.made>0);if(route==='consumption')assert(r.control.mode==='credit'?r.payments.some(p=>p.reason==='借款'&&p.amount>0):r.wages>base);
    if(route==='investment')assert(r.investment>0);if(route==='exports')assert(r.exports>0);
   }
   assert(Array.from(v.text).length<=7);assert(!/赢|胜|利润|危机/.test(v.text));assert.equal(JSON.stringify(r),frozen);
  }
 }
});
