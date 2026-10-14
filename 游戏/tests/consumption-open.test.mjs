import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRemedy,remedyReducer as act,remedyAccounts,restoreRemedy,remedyMoney} from '../lib/remedy-lab.ts';
import {initialPrologue,prologueReducer as reduce,restorePrologue,canSampleRelief} from '../lib/prologue-state.ts';
const start=()=>initialRemedy('consumption',true);
const day=(s,mode='raise',dose=2,outlook='normal')=>act(s,{type:'DAY',mode,dose,outlook,expectedRound:s.history.length,expectedPlan:JSON.stringify(s)});
const shopping=r=>r.payments.filter(p=>p.reason==='家庭购物').reduce((n,p)=>n+p.amount,0);

test('consumption has no four-day boundary or programmed wage cut',()=>{
 let s=start();for(let i=0;i<80;i++)s=day(s);
 const a=remedyAccounts(s);assert.equal(a.reports.length,80);assert.equal(a.display.round,80);
 assert(a.reports.every(r=>r.wages===30&&r.control.outlook==='normal'&&shopping(r)===30&&r.stock===0&&r.debt===0&&r.made===50));
 assert(a.reports.every(r=>r.world.cash.shop===60&&remedyMoney(r.world)===420));
 assert.deepEqual(restoreRemedy(JSON.parse(JSON.stringify(s)),'consumption'),s);
});
test('loans leave an actual next-day bill without an external income shock',()=>{
 let s=day(start(),'credit');let r=remedyAccounts(s).display;
 assert.equal(shopping(r),30);assert.equal(r.borrowed,10);assert.equal(r.debt,10);
 s=day(s,'credit');r=remedyAccounts(s).display;
 assert.equal(r.wages,20);assert.equal(r.repayment,12);assert.equal(shopping(r),18);assert.equal(r.stock,12);assert.equal(r.control.outlook,'normal');
 assert.equal(r.world.cash.shop,68);assert.equal(remedyMoney(r.world),420);
});
test('switching to wages does not erase yesterday loan; subsequent income can sustain shopping',()=>{
 let s=day(start(),'credit');s=day(s,'raise');let r=remedyAccounts(s).display;
 assert.equal(r.repayment,12);assert.equal(r.debt,0);assert.equal(shopping(r),18);
 s=day(s,'raise');r=remedyAccounts(s).display;assert.equal(shopping(r),30);assert.equal(r.repayment,0);assert.equal(r.debt,0);
});
test('ordinary trade is a valid comparison, not a compulsory failure',()=>{
 let s=start();for(let i=0;i<12;i++)s=day(s,'raise',0);
 const a=remedyAccounts(s);assert(a.canContinue);assert(a.reports.every(r=>r.made===50&&shopping(r)===20&&r.world.cash.shop===60));
 assert.equal(a.display.stock,120);assert.equal(a.riskSeen,false);
});
test('an income shock only happens when explicitly requested, applies to that day, and never clears debt',()=>{
 let s=day(start(),'credit');s=day(s,'credit',2,'adverse');let r=remedyAccounts(s).display;
 assert.equal(r.wages,10);assert.equal(r.repayment,10);assert.equal(r.debt,2);assert.equal(r.borrowed,0);assert(r.creditStopped);
 s=day(s,'raise');r=remedyAccounts(s).display;assert.equal(r.wages,30);assert.equal(r.control.outlook,'normal');assert.equal(r.repayment,3);
});
test('duplicate clicks, draft edits and obsolete turn protocol cannot create another day',()=>{
 const s=start(),command={type:'DAY',mode:'credit',expectedRound:0,expectedPlan:JSON.stringify(s)},next=act(s,command);
 assert.strictEqual(act(next,command),next);
 assert.strictEqual(act(next,{type:'PLACE',mode:'raise',expectedRound:1}),next);
 assert.strictEqual(act(next,{type:'COMPARE',outlook:'adverse'}),next);
 const edited=act(next,{type:'DOSE',delta:1});assert.deepEqual(remedyAccounts(edited).display,remedyAccounts(next).display);
});
test('restart preserves a read-only archive with its own old or new accounting contract',()=>{
 const legacy={...initialRemedy('consumption'),history:[{mode:'credit',dose:2,outlook:'normal'},{mode:'credit',dose:2,outlook:'normal'}]};
 const old=remedyAccounts(legacy).reports;let s=act(legacy,{type:'OPEN_FLOW'});
 assert.equal(s.flow,'consumption-open');assert.deepEqual(remedyAccounts(s).archives[0].reports,old);
 s=day(s);const original=remedyAccounts(s).reports;
 s=act(s,{type:'REPLAY',fromRound:0,expectedPlan:JSON.stringify(s)});
 assert.equal(s.history.length,0);assert.equal(remedyAccounts(s).canContinue,false);
 assert.deepEqual(remedyAccounts(s).archives[1].reports,original);assert.deepEqual(restoreRemedy(s,'consumption'),s);
 assert.equal(restoreRemedy({...s,flow:'unknown'},'consumption'),null);
 assert.equal(restoreRemedy(s,'investment'),null);
});
test('real observed trade opens the story exit without a fixed count, an adverse event or a required failure',()=>{
 let s=reduce(initialPrologue(),{type:'JUMP_STAGE',stage:4});s=reduce(s,{type:'CHOOSE_RELIEF',route:'consumption'});
 assert.equal(s.remedyLabs.consumption.flow,'consumption-open');assert(!canSampleRelief(s));
 assert.strictEqual(reduce(s,{type:'RELIEF_WRAP'}),s);
 const lab=s.remedyLabs.consumption;
 s=reduce(s,{type:'REMEDY',action:{type:'DAY',mode:'raise',expectedRound:0,expectedPlan:JSON.stringify(lab)}});
 assert.equal(s.reliefPhase,'compare');assert.equal(remedyAccounts(s.remedyLabs.consumption).riskSeen,false);
 assert.deepEqual(restorePrologue(s),s);s=reduce(s,{type:'RELIEF_WRAP'});assert(canSampleRelief(s));
 s=reduce(s,{type:'FINISH_RELIEF_SAMPLE'});assert.equal(s.scene,'epilogue');assert.deepEqual(s.reliefCompleted,['consumption']);assert.deepEqual(restorePrologue(s),s);
 s=reduce(s,{type:'JUMP_STAGE',stage:4});s=reduce(s,{type:'CHOOSE_RELIEF',route:'consumption'});
 for(let i=1;i<7;i++){const lab=s.remedyLabs.consumption;s=reduce(s,{type:'REMEDY',action:{type:'DAY',mode:'raise',expectedRound:i,expectedPlan:JSON.stringify(lab)}});}
 assert.equal(s.remedyLabs.consumption.history.length,7);assert.deepEqual(restorePrologue(s),s);
 s=reduce(s,{type:'REMEDY',action:{type:'REPLAY',fromRound:0,expectedPlan:JSON.stringify(s.remedyLabs.consumption)}});assert(!canSampleRelief(s));assert(!s.reliefSampled);
});
test('mixed choices and optional conditions conserve every integer wallet and physical stock',()=>{
 let s=start(),stock=0;
 for(let i=0;i<45;i++){
  s=day(s,i%3?'raise':'credit',i%4,i%7===0?'adverse':i%11===0?'supported':'normal');
  const r=remedyAccounts(s).display;assert.equal(r.stock,stock+r.made-r.sold);stock=r.stock;
  assert.equal(remedyMoney(r.world),420);assert(Object.values(r.world.cash).every(n=>Number.isInteger(n)&&n>=0));
 }
 assert.deepEqual(restoreRemedy(s,'consumption'),s);
});
