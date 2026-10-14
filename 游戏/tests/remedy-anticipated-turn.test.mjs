import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialRemedy,remedyReducer as act,remedyAccounts,restoreRemedy,remedyMoney,REMEDY_MODES} from '../lib/remedy-lab.ts';
import {prologueReducer as reduce,restorePrologue} from '../lib/prologue-state.ts';
import {legacyRemedyPrologue as initialPrologue} from './helpers/legacy-remedy.mjs';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});
const ui=window.RemedyFeedback;
function prefix(route,mode=REMEDY_MODES[route][0]){let s=initialRemedy(route);for(let n=0;n<2;n++)s=act(s,{type:'PLACE',mode,expectedRound:n});return s;}

test('third actual adverse turn equals the old funded stress trial without storing an unplayed normal turn',()=>{
 for(const route of Object.keys(REMEDY_MODES)){
  const two=prefix(route),mode=two.mode,before=remedyAccounts(two);
  assert.equal(ui.beat(before),'anticipate');assert.equal(before.riskSeen,false);
  const third=act(two,{type:'PLACE',mode,expectedRound:2,outlook:'adverse'}),a=remedyAccounts(third);
  const legacy=act(act(two,{type:'PLACE',mode,expectedRound:2}),{type:'COMPARE',outlook:'adverse'});
  assert.deepEqual(a.display,remedyAccounts(legacy).display);assert.deepEqual(a.reports.slice(0,2),before.reports);
  assert.equal(third.comparisons.length,0);assert.equal(a.reports[2].control.outlook,'adverse');assert.deepEqual(a.thirdBaseline,a.display);
  assert.equal(ui.beat(a),'respond');assert.equal(a.canContinue,false);assert.equal(remedyMoney(a.display.world),420);
 }
});

test('changing the announced condition changes only a draft, never money, history, animation or completion',()=>{
 for(const route of Object.keys(REMEDY_MODES))for(const outlook of ['normal','supported','adverse']){
  const two=prefix(route),prepared=act(two,{type:'PREPARE_OUTLOOK',outlook});
  assert.deepEqual(remedyAccounts(prepared),remedyAccounts(two));assert.deepEqual(restoreRemedy(prepared,route),prepared);
  assert.equal(ui.didOperate(two,prepared),false);assert.equal(prepared.history.length,2);
  const third=act(prepared,{type:'OPERATE',expectedRound:2});assert.equal(third.history[2].outlook,outlook);assert.equal(third.thirdOutlook,undefined);
 }
 const first=act(initialRemedy('consumption'),{type:'PLACE',mode:'credit',expectedRound:0});
 for(const a of [{type:'PREPARE_OUTLOOK',outlook:'adverse'},{type:'OPERATE',expectedRound:1,outlook:'adverse'},{type:'PLACE',mode:'credit',expectedRound:1,outlook:'supported'}])assert.strictEqual(act(first,a),first);
});

test('one actually different same-condition counter is enough; identical moves and drafts are not',()=>{
 for(const route of Object.keys(REMEDY_MODES)){
  const first=REMEDY_MODES[route][0],other=REMEDY_MODES[route][1],third=act(prefix(route),{type:'PLACE',mode:first,expectedRound:2,outlook:'adverse'});
  assert.equal(remedyAccounts(act(third,{type:'PLACE',mode:first,expectedRound:3,outlook:'adverse'})).canContinue,false);
  assert.equal(remedyAccounts(act(third,{type:'MODE',mode:other})).canContinue,false);
  const reply=act(third,{type:'PLACE',mode:other,expectedRound:3,outlook:'adverse'}),a=remedyAccounts(reply),p=ui.comparison(a);
  assert(a.responseSeen&&a.canContinue);assert.equal(reply.history.length+reply.comparisons.length,4);assert.deepEqual(reply.history,third.history);
  assert.deepEqual(p.before,a.thirdBaseline);assert.deepEqual(Array.from(p.changes),['mode']);assert.deepEqual(restoreRemedy(reply,route),reply);
 }
});

test('original and supported conditions remain actual choices rather than fabricated baselines',()=>{
 for(const route of Object.keys(REMEDY_MODES)){
  const two=prefix(route),normal=act(two,{type:'PLACE',mode:two.mode,expectedRound:2,outlook:'normal'}),support=act(two,{type:'PLACE',mode:two.mode,expectedRound:2,outlook:'supported'});
  assert.equal(ui.beat(remedyAccounts(normal)),'incoming');assert.equal(remedyAccounts(support).comparisonSeen,true);assert.equal(remedyAccounts(support).canContinue,false);
  assert.equal(remedyAccounts(act(support,{type:'COMPARE',outlook:'adverse'})).canContinue,true);
 }
});

test('replaying the third condition preserves its real prefix, debt and records and labels changed conditions',()=>{
 const third=act(prefix('consumption','credit'),{type:'PLACE',mode:'credit',expectedRound:2,outlook:'adverse'});
 const rewind=act(third,{type:'REPLAY',fromRound:2,expectedPlan:JSON.stringify(third)});
 assert.equal(rewind.thirdOutlook,'adverse');assert.equal(remedyAccounts(rewind).riskSeen,false);
 assert.deepEqual(remedyAccounts(rewind).reports,remedyAccounts(third).reports.slice(0,2));assert.deepEqual(restoreRemedy(rewind,'consumption'),rewind);
 const normal=act(rewind,{type:'PLACE',mode:'credit',expectedRound:2,outlook:'normal'}),p=ui.path(remedyAccounts(normal));
 assert.deepEqual(Array.from(p.steps,s=>({round:s.round,fields:Array.from(s.fields)})),[{round:3,fields:['outlook']}]);
 assert.equal(remedyAccounts(normal).display.repayment,12);assert.equal(remedyAccounts(normal).canContinue,false);
 const early=act(third,{type:'REPLAY',fromRound:0,expectedPlan:JSON.stringify(third)});assert.equal(early.thirdOutlook,undefined);
});

test('all 1608 finite played paths restore; only turn three permits a different condition',()=>{
 const archives=[],choices=REMEDY_MODES.consumption.flatMap(mode=>[0,1,2,3].map(dose=>({mode,dose,outlook:'normal'})));
 for(const a of choices){archives.push({history:[a],comparisons:[]});for(const b of choices){archives.push({history:[a,b],comparisons:[]});for(const c of choices)for(const outlook of ['normal','adverse','supported'])archives.push({history:[a,b,{...c,outlook}],comparisons:[]});}}
 assert.equal(archives.length,1608);const s={...initialRemedy('consumption'),archives};assert.deepEqual(restoreRemedy(s,'consumption'),s);
 assert.equal(restoreRemedy({...s,archives:[...archives,archives[0]]},'consumption'),null);
 const two=prefix('consumption');for(const bad of [{...two,thirdOutlook:'magic'},{...initialRemedy('consumption'),thirdOutlook:'adverse'},{...two,history:two.history.map(c=>({...c,outlook:'adverse'}))}])assert.equal(restoreRemedy(bad,'consumption'),null);
});

test('host gates use actual stress/counter evidence and survive refresh without promoting previews',()=>{
 let p=reduce(initialPrologue(),{type:'JUMP_STAGE',stage:4});p=reduce(p,{type:'CHOOSE_RELIEF',route:'consumption'});
 for(let n=0;n<2;n++)p=reduce(p,{type:'REMEDY',action:{type:'PLACE',mode:'credit',expectedRound:n}});
 p=reduce(p,{type:'REMEDY',action:{type:'PREPARE_OUTLOOK',outlook:'adverse'}});assert.deepEqual(restorePrologue(p),p);assert.strictEqual(reduce(p,{type:'RELIEF_WRAP'}),p);
 p=reduce(p,{type:'REMEDY',action:{type:'PLACE',mode:'credit',expectedRound:2,outlook:'adverse'}});assert.deepEqual(restorePrologue(p),p);assert.strictEqual(reduce(p,{type:'RELIEF_WRAP'}),p);
 p=reduce(p,{type:'REMEDY',action:{type:'PLACE',mode:'raise',expectedRound:3,outlook:'adverse'}});assert.deepEqual(restorePrologue(p),p);
 p=reduce(p,{type:'RELIEF_WRAP'});assert.deepEqual(p.reliefCompleted,['consumption']);assert.equal(reduce(p,{type:'FINISH_RELIEF_SAMPLE'}).scene,'epilogue');
});

test('all 4608 mixed-condition paths retain finite integer wallets, actual supply and debt conservation',()=>{
 for(const route of Object.keys(REMEDY_MODES)){
  const choices=REMEDY_MODES[route].flatMap(mode=>[0,1,2,3].map(dose=>({mode,dose,outlook:'normal'})));
  for(const a of choices)for(const b of choices)for(const c of choices)for(const outlook of ['normal','adverse','supported']){
   const lab={...initialRemedy(route),history:[a,b,{...c,outlook}]},account=remedyAccounts(lab);let stock=0;
   for(const r of account.reports){assert.equal(remedyMoney(r.world),420);assert(Object.values(r.world.cash).every(n=>Number.isInteger(n)&&n>=0));assert.equal(r.stock,stock+r.made-r.sold);assert(r.payments.every(p=>Number.isInteger(p.amount)&&p.amount>0));stock=r.stock;}
   assert.equal(account.riskSeen,outlook==='adverse');assert.equal(account.comparisonSeen,outlook==='supported');assert.equal(account.canContinue,false);
  }
 }
});
