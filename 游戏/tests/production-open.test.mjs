import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRemedy,remedyReducer as act,remedyAccounts,restoreRemedy,remedyMoney} from '../lib/remedy-lab.ts';
import {initialPrologue,prologueReducer as reduce,restorePrologue,canSampleRelief} from '../lib/prologue-state.ts';
const start=route=>initialRemedy(route,true);
const day=(s,mode=s.mode,dose=2,outlook='normal')=>act(s,{type:'DAY',mode,dose,outlook,expectedRound:s.history.length,expectedPlan:JSON.stringify(s)});
test('new investment and export sessions use real open days, with no three/four-day limit',()=>{
 for(const route of ['investment','exports']){
  let s=start(route);for(let n=0;n<60;n++)s=day(s);
  const a=remedyAccounts(s);assert.equal(s.flow,'production-open');assert.equal(a.reports.length,60);assert.equal(a.display.round,60);assert(a.canContinue);assert(a.reports.every(r=>r.control.outlook==='normal'&&r.wages===20));assert.deepEqual(restoreRemedy(s,route),s);
 }
});
test('investment today buys tomorrow capacity, whose upkeep survives changing the next decision',()=>{
 let s=day(start('investment'));let a=remedyAccounts(s),r=a.display;assert.equal(r.made,50);assert.equal(r.investment,10);assert.equal(r.capacity,10);assert.equal(r.stock,0);assert.equal(r.world.cash.buyers,110);
 s=day(s,'expand',0);r=remedyAccounts(s).display;assert.equal(r.made,60);assert.equal(r.capacity,10);assert.equal(r.upkeep,2);assert.equal(r.investment,0);assert.equal(r.wages,20);
 s=day(s,'replace');r=remedyAccounts(s).display;assert.equal(r.made,60);assert.equal(r.capacity,10);assert.equal(r.upkeep,2);assert.equal(r.world.efficiency,2);
 s=day(s,'replace',0);r=remedyAccounts(s).display;assert.equal(r.costs,15);assert.equal(r.capacity,10);
});
test('replacement is not expansion; an actual downstream order can absorb goods without a mandatory crisis',()=>{
 const expand=day(start('investment'),'expand'),replace=day(start('investment'),'replace');
 const e=remedyAccounts(day(expand)).display,p=remedyAccounts(day(replace,'replace')).display;
 assert.equal(e.made,60);assert.equal(p.made,50);assert.equal(p.capacity,0);assert(p.stock<e.stock);
 const supported=remedyAccounts(day(expand,'expand',2,'supported')).display;assert.equal(supported.stock,0);assert.equal(supported.preorders,8);assert.equal(supported.control.outlook,'supported');
 assert.equal(supported.preorders,supported.payments.filter(p=>p.reason==='已落实的下游订单').reduce((n,p)=>n+p.amount,0));
});
test('normal export orders do not shrink at day two or three; diversification has actual costs and conditional resilience',()=>{
 let s=start('exports');for(let n=0;n<8;n++)s=day(s);
 const a=remedyAccounts(s);assert(a.reports.every(r=>r.exports===10&&r.stock===0&&r.exportQuota===15&&r.transport===2));
 const diverse=remedyAccounts(day(start('exports'),'diverse')).display;assert.equal(diverse.exports,10);assert.equal(diverse.transport,4);
 const one=remedyAccounts(day(start('exports'),'single',2,'adverse')).display,many=remedyAccounts(day(start('exports'),'diverse',2,'adverse')).display;
 assert.equal(one.exports,0);assert.equal(one.transport,0);assert.equal(many.exports,5);assert.equal(many.transport,3);assert(many.stock<one.stock);
});
test('foreign and investment budgets are actual finite wallets, not date-triggered crises or magically renewed money',()=>{
 let s=start('exports');for(let n=0;n<12;n++)s=day(s);assert.equal(remedyAccounts(s).display.world.cash.foreign,0);
 s=day(s);const r=remedyAccounts(s).display;assert.equal(r.exports,0);assert.equal(r.transport,0);assert.equal(r.control.outlook,'normal');assert.equal(r.made,50);
 let smaller=start('exports');for(let n=0;n<13;n++)smaller=day(smaller,'single',1);assert.equal(remedyAccounts(smaller).display.exports,5);assert.equal(remedyAccounts(smaller).display.world.cash.foreign,55,'same date, different actually spent budget');
 let i=start('investment');for(let n=0;n<13;n++)i=day(i);const v=remedyAccounts(i).display;assert.equal(v.world.cash.buyers,0);assert.equal(v.investment,0);assert.equal(v.capacity,120);
});
test('extra conditions affect the chosen day only; they do not clear delivered capacity, spending or stocks',()=>{
 for(const route of ['investment','exports']){
  let s=day(start(route));s=day(s,s.mode,2,'adverse');const shock=remedyAccounts(s).display;s=day(s);const ordinary=remedyAccounts(s).display;
  assert.equal(ordinary.control.outlook,'normal');assert.equal(shock.control.outlook,'adverse');assert(ordinary.capacity>=shock.capacity);assert.equal(ordinary.stock,shock.stock+ordinary.made-ordinary.sold);
 }
});
test('all routes reject wrong modes, stale days and old turn actions without spending',()=>{
 for(const route of ['investment','exports']){
  const s=start(route),command={type:'DAY',mode:s.mode,expectedRound:0,expectedPlan:JSON.stringify(s)},next=act(s,command);assert.strictEqual(act(next,command),next);
  for(const a of [{...command,mode:'credit'},{...command,dose:4},{...command,outlook:'storm'},{type:'PLACE',mode:s.mode,expectedRound:0},{type:'COMPARE',outlook:'adverse'},{type:'FOLLOWUP',mode:s.mode,expectedPlan:JSON.stringify(s)}])assert.strictEqual(act(s,a),s);
  const edited=act(next,{type:'DOSE',delta:1});assert.deepEqual(remedyAccounts(edited).reports,remedyAccounts(next).reports);
 }
});
test('old ledgers migrate only on an explicit action, remain byte-equivalent as reports, and current runs archive separately',()=>{
 for(const route of ['investment','exports']){
  let old=initialRemedy(route);for(let n=0;n<3;n++)old=act(old,{type:'PLACE',mode:old.mode,expectedRound:n});old=act(old,{type:'COMPARE',outlook:'adverse'});const before=remedyAccounts(old);
  let s=act(old,{type:'OPEN_FLOW'});assert.deepEqual(remedyAccounts(s).archives[0].reports,before.reports);assert.deepEqual(remedyAccounts(s).archives[0].comparisons,before.comparisons);
  for(let n=0;n<6;n++)s=day(s);const actual=remedyAccounts(s).reports;
  s=act(s,{type:'REPLAY',fromRound:0,expectedPlan:JSON.stringify(s)});assert.equal(s.history.length,0);assert.equal(s.archives.length,2);assert.deepEqual(remedyAccounts(s).archives[1].reports,actual);assert.deepEqual(restoreRemedy(s,route),s);
  assert.equal(restoreRemedy({...s,flow:'consumption-open'},route),null);assert.equal(restoreRemedy({...s,followups:[]},route),null);
 }
});
test('real trade, not a forced adverse result or fixed number of days, allows returning to the story',()=>{
 for(const route of ['investment','exports']){
  let s=reduce(initialPrologue(),{type:'JUMP_STAGE',stage:4});s=reduce(s,{type:'CHOOSE_RELIEF',route});assert.equal(s.remedyLabs[route].flow,'production-open');assert.strictEqual(reduce(s,{type:'RELIEF_WRAP'}),s);
  const lab=s.remedyLabs[route];s=reduce(s,{type:'REMEDY',action:{type:'DAY',mode:lab.mode,expectedRound:0,expectedPlan:JSON.stringify(lab)}});assert.equal(s.reliefPhase,'compare');assert.equal(s.reliefTested,3);assert.deepEqual(restorePrologue(s),s);
  s=reduce(s,{type:'RELIEF_WRAP'});assert(canSampleRelief(s));assert.deepEqual(s.reliefCompleted,[route]);s=reduce(s,{type:'FINISH_RELIEF_SAMPLE'});assert.equal(s.scene,'epilogue');assert.deepEqual(restorePrologue(s),s);
 }
});
test('mixed long paths conserve every wallet and good; unsupported derived cash is never trusted on reload',()=>{
 for(const route of ['investment','exports']){
  let s=start(route),stock=0;
  for(let n=0;n<50;n++){
   s=day(s,route==='investment'?(n%2?'replace':'expand'):(n%2?'diverse':'single'),n%4,n%7===0?'adverse':n%11===0?'supported':'normal');const r=remedyAccounts(s).display;
   assert.equal(remedyMoney(r.world),420);assert.equal(r.stock,stock+r.made-r.sold);stock=r.stock;assert(Object.values(r.world.cash).every(v=>Number.isInteger(v)&&v>=0));assert.equal(r.cashChange,r.payments.reduce((n,p)=>n+(p.to==='shop'?p.amount:0)-(p.from==='shop'?p.amount:0),0));
  }
  assert.deepEqual(restoreRemedy({...s,cash:999999},route),s);
 }
});
