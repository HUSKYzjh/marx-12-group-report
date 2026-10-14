import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRemedy,remedyReducer as act,remedyAccounts,remedyMoney,REMEDY_INITIAL_MONEY,REMEDY_MODES,restoreRemedy} from '../lib/remedy-lab.ts';
import {initialPrologue,prologueReducer as reduce,restorePrologue} from '../lib/prologue-state.ts';

function run(route,mode,dose=2){let s={...initialRemedy(route),mode,dose};for(let n=0;n<3;n++)s=act(s,{type:'OPERATE',expectedRound:n});return s;}
test('all 1536 three-period arrangements conserve finite integer money and carry inventory',()=>{
 for(const route of Object.keys(REMEDY_MODES)){
  const controls=REMEDY_MODES[route].flatMap(mode=>[0,1,2,3].map(dose=>({mode,dose,outlook:'normal'})));
  for(const a of controls)for(const b of controls)for(const c of controls){
   const s={...initialRemedy(route),history:[a,b,c]},result=remedyAccounts(s);let stock=0,cash=60;
   for(const r of result.reports){
    assert.equal(remedyMoney(r.world),REMEDY_INITIAL_MONEY);
    assert(Object.values(r.world.cash).every(n=>Number.isInteger(n)&&n>=0));
    assert.equal(r.stock,stock+r.made-r.sold);assert.equal(r.cashChange,r.world.cash.shop-cash);
    assert.equal(r.cashChange,r.margin);assert(r.payments.every(p=>Number.isInteger(p.amount)&&p.amount>0));
    const d=r.debtAccount;
    assert.equal(d.openingPrincipal+d.openingInterest+d.interestCharged+d.borrowed-d.principalRepaid-d.interestPaid,r.debt);
    assert.equal(d.principalRepaid+d.interestPaid,r.repayment);
    assert.equal(d.closingPrincipal+d.closingInterest,r.debt);
    assert.equal(r.world.principalDebt,d.closingPrincipal);assert.equal(r.world.interestDebt,d.closingInterest);
    assert(Object.values(d).every(x=>Number.isInteger(x)&&x>=0));
    stock=r.stock;cash=r.world.cash.shop;
   }
  }
 }
});
test('wages can sustain sales; debt supports today but takes purchasing power tomorrow',()=>{
 const wage=remedyAccounts(run('consumption','raise')).reports;
 assert.deepEqual(wage.map(r=>[r.sold,r.stock,r.margin]),[[50,0,5],[50,0,5],[50,0,5]]);
 const credit=remedyAccounts(run('consumption','credit')).reports;
 assert.deepEqual(credit.map(r=>[r.sold,r.repayment,r.debt]),[[50,0,10],[38,12,10],[38,12,10]]);
 const stopped={...run('consumption','credit'),history:[{mode:'credit',dose:2,outlook:'normal'},{mode:'credit',dose:0,outlook:'normal'}]};
 assert.equal(remedyAccounts(stopped).display.debt,0);assert.equal(remedyAccounts(stopped).display.sold,28);
});
test('actual equipment purchases affect next-period capacity, replacement does not force expansion',()=>{
 const expand=remedyAccounts(run('investment','expand')).reports;
 assert.deepEqual(expand.map(r=>[r.made,r.stock,r.upkeep]),[[50,0,0],[60,10,2],[70,30,4]]);
 const replace=remedyAccounts(run('investment','replace')).reports;
 assert(replace.every(r=>r.made===50&&r.stock===0&&r.capacity===0));assert(replace[2].costs<replace[0].costs);
 // The first period has only ten goods left: a fifteen-unit request cannot fabricate five machines.
 assert.equal(remedyAccounts(run('investment','expand',3)).reports[0].investment,10);
});
test('customer concentration loses orders; diversification trades a real fee for resilience',()=>{
 const single=remedyAccounts(run('exports','single')).reports,diverse=remedyAccounts(run('exports','diverse')).reports;
 assert.deepEqual(single.map(r=>r.exports),[10,5,3]);assert.deepEqual(diverse.map(r=>r.exports),[10,10,10]);
 assert(single[2].stock>diverse[2].stock);assert(diverse[0].transport>single[0].transport);
 const short=remedyAccounts(run('exports','single',3)).reports[0];assert.equal(short.exportSupplyShortfall,5);assert.equal(short.exportQuota,15);
});
test('comparisons keep the first two periods fixed, expose changed conditions and preserve original results',()=>{
 for(const [route,mode] of [['consumption','credit'],['investment','expand'],['exports','single']]){
  let s=run(route,mode);const before=remedyAccounts(s),snapshot=structuredClone(before.reports);
  s=act(s,{type:'COMPARE',outlook:'supported'});const after=remedyAccounts(s);
  assert.deepEqual(after.reports,snapshot);assert.deepEqual(after.thirdBaseline,before.display);
  assert(after.display.sold>before.display.sold);assert(after.comparisonSeen);
  assert.equal(remedyMoney(after.display.world),420);
  s=act(s,{type:'COMPARE',outlook:'normal'});assert.deepEqual(remedyAccounts(s).display,before.display);
 }
});
test('placement is atomic, stale operations are ignored and parameter edits do not rewrite executed history',()=>{
 let s=initialRemedy('consumption');const stale={type:'PLACE',mode:'credit',expectedRound:0};s=act(s,stale);
 assert.equal(s.history.length,1);assert.equal(s.history[0].mode,'credit');assert.strictEqual(act(s,stale),s);
 const before=remedyAccounts(s).display;s=act(s,{type:'DOSE',delta:1});s=act(s,{type:'MODE',mode:'raise'});
 assert.deepEqual(remedyAccounts(s).display,before);assert.strictEqual(act(s,{type:'COMPARE',outlook:'supported'}),s);
 assert.strictEqual(act(s,{type:'PLACE',mode:'replace',expectedRound:1}),s);
});
test('restoration reconstructs accounts, discards injected cash and rejects invalid controls',()=>{
 const s=run('consumption','credit');assert.deepEqual(restoreRemedy({...s,cash:999999},'consumption'),s);
 for(const bad of [{...s,dose:1.5},{...s,mode:'expand'},{...s,history:[{mode:'credit',dose:2,outlook:'supported'}]},{...s,comparisons:[{mode:'credit',dose:5,outlook:'normal'}]}])assert.equal(restoreRemedy(bad,'consumption'),null);
});
test('legacy remedy completion requires three periods plus a condition comparison; reload and menu preserve progress',()=>{
 let s=reduce(initialPrologue(),{type:'JUMP_STAGE',stage:4});
 for(const route of Object.keys(REMEDY_MODES)){
  // Explicit saved legacy run: new consumption sessions use the open-day contract.
  s={...s,remedyLabs:{...s.remedyLabs,[route]:initialRemedy(route)}};
  s=reduce(s,{type:'CHOOSE_RELIEF',route});assert.strictEqual(reduce(s,{type:'RELIEF_COMPLETE'}),s);
  for(let n=0;n<3;n++){s=reduce(s,{type:'REMEDY',action:{type:'PLACE',mode:REMEDY_MODES[route][1],expectedRound:n}});assert.deepEqual(restorePrologue(JSON.stringify(s)),s);}
  assert.strictEqual(reduce(s,{type:'RELIEF_COMPLETE'}),s);
  s=reduce(s,{type:'REMEDY',action:{type:'COMPARE',outlook:'supported'}});assert.strictEqual(reduce(s,{type:'RELIEF_COMPLETE'}),s);
  s=reduce(s,{type:'REMEDY',action:{type:'COMPARE',outlook:'adverse'}});s=reduce(s,{type:'RELIEF_COMPLETE'});
  assert(s.reliefCompleted.includes(route));assert.deepEqual(restorePrologue(s),s);
  s=reduce(s,{type:'RELIEF_MENU'});s=reduce(s,{type:'CHOOSE_RELIEF',route});assert.equal(s.remedyLabs[route].history.length,3);
  s=reduce(s,{type:'RELIEF_MENU'});
 }
 assert.equal(reduce(s,{type:'FINISH_RELIEF'}).scene,'epilogue');
});
test('income shock exposes arrears and actual stop in lending, not an automatic universal collapse',()=>{
 let s=run('consumption','credit');s=act(s,{type:'COMPARE',outlook:'adverse'});const r=remedyAccounts(s).display;
 assert.equal(r.wages,10);assert.equal(r.repayment,10);assert.equal(r.arrears,2);assert.equal(r.debt,2);assert.equal(r.borrowed,0);assert(r.creditStopped);assert.equal(r.sold,20);
 const safer=act(run('consumption','raise'),{type:'COMPARE',outlook:'adverse'}),q=remedyAccounts(safer).display;
 assert.equal(q.debt,0);assert(!q.creditStopped);assert.equal(q.sold,40);
});

test('debt details split actual principal and interest, carry unpaid interest and do not pay twice',()=>{
 const normal=remedyAccounts(run('consumption','credit')).reports;
 assert.deepEqual(normal[0].debtAccount,{openingPrincipal:0,openingInterest:0,interestCharged:0,borrowed:10,principalRepaid:0,interestPaid:0,closingPrincipal:10,closingInterest:0});
 assert.deepEqual(normal[1].debtAccount,{openingPrincipal:10,openingInterest:0,interestCharged:2,borrowed:10,principalRepaid:10,interestPaid:2,closingPrincipal:10,closingInterest:0});
 const s={...initialRemedy('consumption',true),history:[{mode:'credit',dose:2,outlook:'normal'},{mode:'credit',dose:2,outlook:'adverse'},{mode:'raise',dose:2,outlook:'normal'}]};
 const rows=remedyAccounts(s).reports;
 assert.deepEqual(rows[1].debtAccount,{openingPrincipal:10,openingInterest:0,interestCharged:2,borrowed:0,principalRepaid:10,interestPaid:0,closingPrincipal:0,closingInterest:2});
 assert.deepEqual(rows[2].debtAccount,{openingPrincipal:0,openingInterest:2,interestCharged:1,borrowed:0,principalRepaid:0,interestPaid:3,closingPrincipal:0,closingInterest:0});
 for(const r of [...normal,...rows]){
  const actual=r.payments.filter(p=>p.reason==='还本付息');
  assert.equal(actual.length,r.repayment?1:0);
  assert.equal(actual.reduce((n,p)=>n+p.amount,0),r.debtAccount.principalRepaid+r.debtAccount.interestPaid);
  assert.equal(remedyMoney(r.world),420);
 }
 assert.deepEqual(restoreRemedy({...s,principalDebt:999,interestDebt:999},'consumption'),s,'derived balances are reconstructed, never imported from the save');
 assert(!JSON.stringify(s).includes('debtAccount'),'the saved contract is still decisions only');
});
test('countermove retains the adverse condition and the first two actual periods',()=>{
 for(const [route,first,next] of [['consumption','credit','raise'],['investment','expand','replace'],['exports','single','diverse']]){
  const original=run(route,first),history=structuredClone(original.history);
  const shocked=act(original,{type:'COMPARE',outlook:'adverse'}),old=remedyAccounts(shocked);
  const changed=act(shocked,{type:'PLACE',mode:next,expectedRound:3,outlook:'adverse'}),after=remedyAccounts(changed);
  assert.deepEqual(changed.history,history);assert.deepEqual(after.reports,old.reports);
  assert.equal(after.display.control.outlook,'adverse');assert.equal(after.display.control.mode,next);
  assert.equal(remedyMoney(after.display.world),420);assert.deepEqual(restoreRemedy(changed,route),changed);
  if(route==='consumption')assert(after.display.sold>old.display.sold);
  if(route==='investment')assert(after.display.capacity<old.display.capacity);
  if(route==='exports')assert(after.display.exports>old.display.exports);
 }
});
test('countermove refuses invented conditions and early shocks; old placement still uses normal conditions',()=>{
 const opening=initialRemedy('consumption');assert.strictEqual(act(opening,{type:'PLACE',mode:'credit',expectedRound:0,outlook:'adverse'}),opening);
 const played=run('consumption','credit');assert.strictEqual(act(played,{type:'PLACE',mode:'raise',expectedRound:3,outlook:'magic'}),played);
 assert.equal(remedyAccounts(act(played,{type:'PLACE',mode:'raise',expectedRound:3})).display.control.outlook,'normal');
});
test('legacy two-condition completion still preserves its actual receipts',()=>{
 let s=reduce(initialPrologue(),{type:'JUMP_STAGE',stage:4});s={...s,remedyLabs:{consumption:initialRemedy('consumption')}};s=reduce(s,{type:'CHOOSE_RELIEF',route:'consumption'});
 assert.strictEqual(reduce(s,{type:'RELIEF_WRAP'}),s);
 for(let n=0;n<3;n++)s=reduce(s,{type:'REMEDY',action:{type:'PLACE',mode:'credit',expectedRound:n}});
 s=reduce(s,{type:'REMEDY',action:{type:'COMPARE',outlook:'adverse'}});assert.strictEqual(reduce(s,{type:'RELIEF_WRAP'}),s);
 s=reduce(s,{type:'REMEDY',action:{type:'COMPARE',outlook:'supported'}});const before=structuredClone(s.remedyLabs),done=reduce(s,{type:'RELIEF_WRAP'});
 assert.equal(done.reliefRoute,null);assert.deepEqual(done.remedyLabs,before);assert.deepEqual(done.reliefCompleted,['consumption']);assert.deepEqual(restorePrologue(done),done);
});
