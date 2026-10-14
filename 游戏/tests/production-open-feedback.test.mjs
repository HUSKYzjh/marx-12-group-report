import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialRemedy,remedyReducer as act,remedyAccounts} from '../lib/remedy-lab.ts';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});const ui=window.RemedyFeedback;
const day=(s,mode=s.mode,dose=2,outlook='normal')=>act(s,{type:'DAY',mode,dose,outlook,expectedRound:s.history.length,expectedPlan:JSON.stringify(s)});
test('open day four is a real successor, not a fourth-turn alternative of day three',()=>{
 let s=initialRemedy('investment',true);for(let n=0;n<4;n++)s=day(s);
 const a=remedyAccounts(s),before=JSON.stringify(a),v=ui.investmentState(a);assert.equal(v.activeCapacity,30);assert.equal(v.pendingCapacity,10);assert.equal(v.nextCapacity,40);assert.equal(ui.meterOpening(a).cash,a.reports[2].world.cash.shop);assert.equal(JSON.stringify(a),before);
});
test('actual lack of customer cash is not labelled as a date-driven order cancellation',()=>{
 let s=initialRemedy('exports',true);for(let n=0;n<13;n++)s=day(s);const r=remedyAccounts(s).display,v=ui.exportState(r);assert.equal(v.status,'unfunded');assert.match(ui.exportCheck(v),/现款/);assert.match(ui.line('exports',r),/现款/);assert(!ui.line('exports',r).includes('下次吧'));
 const shock=remedyAccounts(day(initialRemedy('exports',true),'single',2,'adverse')).display;assert.equal(ui.exportState(shock).status,'stopped');assert.equal(shock.exports,0);
});
test('investment and export feedback remains read-only and uses real receipts throughout long paths',()=>{
 for(const route of ['investment','exports']){
  let s=initialRemedy(route,true);for(let n=0;n<30;n++){
   s=day(s,route==='investment'?(n%2?'expand':'replace'):(n%2?'single':'diverse'),n%4,n%9===0?'adverse':'normal');const a=remedyAccounts(s),before=JSON.stringify(a);
   if(route==='investment'){const v=ui.investmentState(a);assert.equal(v.bought,a.display.investment);assert.equal(v.activeCapacity,a.reports.at(-2)?.capacity??0);}else{const v=ui.exportState(a.display);assert.equal(v.shipped,a.display.exports);assert.equal(v.transport,a.display.transport);assert(Array.from(ui.exportCheck(v)).length<=32);}
   assert.equal(JSON.stringify(a),before);
  }
 }
});
