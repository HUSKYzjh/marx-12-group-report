import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialRemedy,remedyReducer as act,remedyAccounts,restoreRemedy,remedyMoney,REMEDY_MODES} from '../lib/remedy-lab.ts';
import {prologueReducer as reduce,restorePrologue} from '../lib/prologue-state.ts';
import {legacyRemedyPrologue as initialPrologue} from './helpers/legacy-remedy.mjs';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});
const ui=window.RemedyFeedback;
function three(route,mode,outlook='adverse'){let s=initialRemedy(route);for(let n=0;n<3;n++)s=act(s,{type:'PLACE',mode,expectedRound:n,outlook:n===2?outlook:'normal'});return s;}
const follow=(s,mode)=>act(s,{type:'FOLLOWUP',mode,expectedPlan:JSON.stringify(s)});

test('the default response is an actual fourth period, not an alternate third period',()=>{
 const cases=[['consumption','credit','raise',55],['investment','expand','replace',79],['exports','single','diverse',20]];
 for(const [route,first,response,stock] of cases){
  const s=three(route,first),third=remedyAccounts(s).display,next=follow(s,response),a=remedyAccounts(next),r=a.display;
  assert.equal(r.round,4);assert.equal(r.world.round,4);assert.equal(r.stock,stock);assert.equal(r.stock-r.newStock,third.stock);
  assert.deepEqual(next.history,s.history);assert.deepEqual(next.comparisons,[]);assert.equal(next.followups.length,1);assert.deepEqual(a.followupBase,third);
  assert.equal(a.canContinue,true);assert.equal(a.responseSeen,true);assert.deepEqual(restoreRemedy(next,route),next);
  assert.equal(JSON.stringify(restoreRemedy(next,route)),JSON.stringify(next),'refresh preserves the serialized decision record too');
  assert.equal(ui.beat(a),'free');assert.equal(ui.comparison(a),null,'turn four is not compared as though it were another turn three');
  assert.deepEqual(JSON.parse(JSON.stringify(ui.meterOpening(a))),{stock:third.stock,cash:third.world.cash.shop});
  assert.match(ui.message(route,a,false),/^第4回合：/);assert.equal(remedyMoney(r.world),420);
 }
});
test('old debts and the third-turn installed capacity actually reach the response turn',()=>{
 const credit=three('consumption','credit'),c3=remedyAccounts(credit).display,c4=remedyAccounts(follow(credit,'raise')).display;
 assert.equal(c3.debt,2);assert.equal(c4.repayment,3);assert.equal(c4.debt,0);assert.equal(c4.wages,20);assert.equal(c4.stock,55);
 const expand=three('investment','expand'),a=remedyAccounts(follow(expand,'replace')),r=a.display;
 assert.equal(a.followupBase.capacity,25);assert.equal(r.made,75);assert.equal(r.capacity,25);assert.equal(r.costs,20);
 assert.equal(ui.investmentState(a).activeCapacity,25);assert.equal(ui.investmentState(a).activeEfficiency,0);assert.equal(ui.investmentState(a).saving,1);
 const export4=remedyAccounts(follow(three('exports','single'),'diverse')).display;
 assert.equal(export4.exports,5);assert.equal(export4.transport,3);assert.equal(export4.world.cash.foreign,100);
});
test('sticking with the same strategy is a legitimate played response; no forced bad switch',()=>{
 for(const [route,mode] of [['consumption','credit'],['investment','replace'],['exports','diverse']]){
  const s=three(route,mode);assert.equal(remedyAccounts(s).canContinue,false);const next=follow(s,mode),a=remedyAccounts(next);
  assert.equal(a.display.round,4);assert(a.canContinue);assert.equal(ui.isEcho(next,mode,'adverse'),true);
  assert.strictEqual(follow(next,mode),next);assert.equal(next.followups.length,1);
 }
});
test('optional fourth-turn retries have the same actual third-period base, not a fifth payment',()=>{
 for(const route of Object.keys(REMEDY_MODES)){
  const [first,other]=REMEDY_MODES[route],s=three(route,first),one=follow(s,first),firstReceipt=structuredClone(remedyAccounts(one).display),two=follow(one,other),a=remedyAccounts(two),result=ui.comparison(a);
  assert.equal(a.display.round,4);assert.equal(two.followups.length,2);assert.deepEqual(a.followups[0],firstReceipt);assert.deepEqual(a.followupBases[0],a.followupBases[1]);
  assert.equal(result.fourth,true);assert.strictEqual(result.before,a.followups[0]);assert.strictEqual(result.after,a.display);assert.match(ui.comparisonLabel(result),/第4回合.*前三回合不变/);
  const frozen=JSON.stringify(two),old=ui.previousView(a,result);assert.strictEqual(old.display,result.before);assert.equal(old.followupBase.world.round,3);assert.equal(JSON.stringify(two),frozen);
  assert.equal(remedyMoney(a.display.world),420);assert.equal(ui.didOperate(one,two),true);assert.equal(ui.didOperate(two,act(two,{type:'DOSE',delta:-1})),false);
  assert.strictEqual(act(two,{type:'COMPARE',outlook:'normal'}),two);assert.strictEqual(act(two,{type:'PLACE',mode:first,expectedRound:3,outlook:'adverse'}),two);
 }
});
test('a previously played adverse third trial, not an unplayed condition, can be the fourth-turn base',()=>{
 let s=three('investment','expand','normal');assert.strictEqual(follow(s,'replace'),s);
 s=act(s,{type:'COMPARE',outlook:'adverse'});const a=remedyAccounts(follow(s,'replace'));
 assert.equal(a.reports[2].capacity,30);assert.equal(a.followupBase.capacity,25);assert.equal(a.display.made,75);
 assert.equal(ui.investmentState(a).activeCapacity,25);assert.deepEqual(restoreRemedy(follow(s,'replace'),'investment'),follow(s,'replace'));
});
test('replay archives all actual fourth trials, revokes only this completion and safely restores',()=>{
 let p=reduce(initialPrologue(),{type:'JUMP_STAGE',stage:4});p=reduce(p,{type:'CHOOSE_RELIEF',route:'consumption'});
 for(let n=0;n<3;n++)p=reduce(p,{type:'REMEDY',action:{type:'PLACE',mode:'credit',expectedRound:n,outlook:n===2?'adverse':'normal'}});
 assert.strictEqual(reduce(p,{type:'RELIEF_WRAP'}),p);
 p=reduce(p,{type:'REMEDY',action:{type:'FOLLOWUP',mode:'credit',expectedPlan:JSON.stringify(p.remedyLabs.consumption)}});
 assert.deepEqual(restorePrologue(p),p);const lab=p.remedyLabs.consumption;
 p=reduce(p,{type:'RELIEF_WRAP'});assert.equal(p.reliefCompleted.length,1);assert.deepEqual(restorePrologue(p),p);
 p=reduce(p,{type:'CHOOSE_RELIEF',route:'consumption'});p=reduce(p,{type:'REMEDY',action:{type:'REPLAY',fromRound:2,expectedPlan:JSON.stringify(lab)}});
 const replay=p.remedyLabs.consumption;assert.equal(replay.history.length,2);assert.equal(replay.followups,undefined);assert.deepEqual(replay.archives[0].followups,lab.followups);
 assert.equal(remedyAccounts(replay).archives[0].followups[0].round,4);assert.equal(remedyAccounts(replay).canContinue,false);assert.equal(p.reliefCompleted.length,0);assert.deepEqual(restorePrologue(p),p);
});
test('malformed, stale or invented fourth-turn records cannot create a played turn',()=>{
 const s=three('exports','single'),next=follow(s,'diverse');
 assert.strictEqual(act(next,{type:'FOLLOWUP',mode:'single',expectedPlan:JSON.stringify(s)}),next);
 for(const bad of [[],[...next.followups,...next.followups],[{base:{mode:'diverse',dose:3,outlook:'adverse'},control:next.followups[0].control}],[{base:next.followups[0].base,control:{...next.followups[0].control,outlook:'supported'}}]])assert.equal(restoreRemedy({...s,followups:bad},'exports'),null);
 const dirty=structuredClone(next);dirty.followups[0].world={cash:{shop:999}};dirty.followups[0].control.cash=999;
 assert.deepEqual(restoreRemedy(dirty,'exports'),next);
});
test('every finite same-condition response and retry conserves money and its real prefix',()=>{
 for(const route of Object.keys(REMEDY_MODES))for(let bits=0;bits<8;bits++)for(const dose of [0,1,2,3])for(const response of REMEDY_MODES[route]){
  let s={...initialRemedy(route),dose};for(let n=0;n<3;n++)s=act(s,{type:'PLACE',mode:REMEDY_MODES[route][bits>>n&1],expectedRound:n,outlook:n===2?'adverse':'normal'});
  s=follow(s,response);const a=remedyAccounts(s),r=a.display,before=a.followupBase;assert.equal(r.round,4);assert.equal(r.stock-r.newStock,before.stock);assert.equal(remedyMoney(r.world),420);assert.deepEqual(restoreRemedy(s,route),s);
  for(const wallet of Object.keys(before.world.cash))assert.equal(r.world.cash[wallet],before.world.cash[wallet]+r.payments.reduce((n,p)=>n+(p.to===wallet?p.amount:0)-(p.from===wallet?p.amount:0),0));
  assert.equal(ui.shelfState(r).kind==='cleared',r.stock===0&&r.made>0&&r.sold>0);
  const cue=ui.moveCue(route,r);if(cue.kind==='move')assert(r.made>0);assert(!/赢|危机/.test(cue.text));
 }
});
