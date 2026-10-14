import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialRemedy,remedyReducer as act,remedyAccounts,REMEDY_MODES} from '../lib/remedy-lab.ts';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});
const view=window.RemedyFeedback;

test('third-move forecasts stay short and cannot turn a draft into a crisis or completed turn',()=>{
 for(const route of Object.keys(REMEDY_MODES))for(const dose of [0,1,2,3])for(let bits=0;bits<4;bits++){
  let s={...initialRemedy(route),dose};for(let n=0;n<2;n++)s=act(s,{type:'PLACE',mode:REMEDY_MODES[route][bits>>n&1],expectedRound:n});
  const before=JSON.stringify(s),a=remedyAccounts(s);assert.equal(view.beat(a),'anticipate');
  for(const outlook of ['normal','adverse','supported']){
   const f=view.forecast(route,a.display,outlook);assert(Array.from(f.quote).length<=15,f.quote);assert(Array.from(f.heading).length<=13,f.heading);
   assert.equal(f.mood,outlook==='adverse'?'worried':outlook==='supported'?'happy':'ready');
   assert.match(f.heading,/下一招/);assert(!/必然|战争|崩溃|倒闭|稳赢/.test(f.quote));
   if(route==='consumption'&&outlook==='adverse')assert.equal(f.quote.includes('旧账'),a.display.debt>0);
   assert.equal(JSON.stringify(s),before);assert.equal(remedyAccounts(s).riskSeen,false);assert.equal(remedyAccounts(s).canContinue,false);
  }
 }
});

test('forecast copy separates the future condition from a policy outcome',()=>{
 const f=view.forecast;
 assert.match(f('investment',null,'adverse').quote,/设备客户.*少买/);
 assert.match(f('exports',null,'adverse').quote,/大客户.*不买/);
 assert.match(f('consumption',null,'adverse').quote,/底薪减半/);
 assert(!f('consumption',null,'adverse').quote.includes('旧账'));
 for(const route of Object.keys(REMEDY_MODES))assert.equal(f(route,null,'normal').quote,'第三招，照常开门？');
});

test('the wage forecast describes base pay, not a guaranteed halving of post-policy wages',()=>{
 let lab=initialRemedy('consumption');for(let n=0;n<2;n++)lab=act(lab,{type:'PLACE',mode:'raise',expectedRound:n});
 const before=remedyAccounts(lab).display;assert.equal(before.wages,30);assert.match(view.forecast('consumption',before,'adverse').quote,/底薪/);
 lab=act(lab,{type:'PLACE',mode:'raise',expectedRound:2,outlook:'adverse'});assert.equal(remedyAccounts(lab).display.wages,20,'base 10 plus this funded raise of 10, not half of last period’s 30');
});
