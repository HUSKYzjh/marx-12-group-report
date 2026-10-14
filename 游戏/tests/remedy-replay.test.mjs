import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialRemedy,remedyReducer as act,remedyAccounts,restoreRemedy,remedyMoney,REMEDY_MODES} from '../lib/remedy-lab.ts';
import {prologueReducer as reduce,restorePrologue} from '../lib/prologue-state.ts';
import {legacyRemedyPrologue as initialPrologue} from './helpers/legacy-remedy.mjs';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});
const feedback=window.RemedyFeedback;
function played(route,mode){let s=initialRemedy(route);for(let n=0;n<3;n++)s=act(s,{type:'PLACE',mode,expectedRound:n});return act(act(s,{type:'COMPARE',outlook:'adverse'}),{type:'COMPARE',outlook:'supported'});}
const replay=(s,fromRound)=>act(s,{type:'REPLAY',fromRound,expectedPlan:JSON.stringify(s)});

test('replay preserves every operated old receipt and uses the exact original prefix, never an unpaid new world',()=>{
 for(const route of Object.keys(REMEDY_MODES))for(const from of [0,1,2]){
  const s=played(route,REMEDY_MODES[route][0]),original=structuredClone(s),before=remedyAccounts(s),next=replay(s,from),a=remedyAccounts(next);
  assert.deepEqual(s,original);assert.deepEqual(next.history,s.history.slice(0,from));assert.deepEqual(next.comparisons,[]);assert.deepEqual(next.archives,[{history:s.history,comparisons:s.comparisons}]);
  assert.deepEqual(a.reports,before.reports.slice(0,from));assert.deepEqual(a.archives[0].reports,before.reports);assert.deepEqual(a.archives[0].comparisons,before.comparisons);assert.equal(a.riskSeen,false);assert.equal(a.comparisonSeen,false);
  assert.equal(remedyMoney(a.display?.world??a.opening),420);assert.deepEqual(restoreRemedy(next,route),next);
  if(from===0)assert.equal(a.display,null);else assert.deepEqual(a.display.world,before.reports[from-1].world);
 }
});

test('earlier strategy changes can remove earlier debt or capacity; a late change cannot pretend it never happened',()=>{
 let s=replay(played('consumption','credit'),0);for(let n=0;n<3;n++)s=act(s,{type:'PLACE',mode:'raise',expectedRound:n});const a=remedyAccounts(s),p=feedback.path(a);
 assert.equal(a.thirdBaseline.debt,0);assert.equal(a.thirdBaseline.stock,0);assert.equal(a.archives[0].thirdBaseline.debt,10);assert.equal(a.archives[0].thirdBaseline.stock,24);assert.deepEqual(Array.from(p.steps,s=>s.round),[1,2,3]);assert.equal(p.stock,-24);assert.equal(p.cash,-6);assert.match(feedback.tradeoff(p),/比旧安排：少剩24份，钱少6枚/);
 s=replay(played('investment','expand'),1);s=act(s,{type:'PLACE',mode:'replace',expectedRound:1});s=act(s,{type:'PLACE',mode:'replace',expectedRound:2});assert.equal(remedyAccounts(s).thirdBaseline.capacity,10);assert.equal(remedyAccounts(s).thirdBaseline.made,60);assert.equal(remedyAccounts(s).archives[0].thirdBaseline.capacity,30);
 const late=replay(played('investment','expand'),2);const lateChanged=act(late,{type:'PLACE',mode:'replace',expectedRound:2});assert.equal(remedyAccounts(lateChanged).thirdBaseline.capacity,20);assert.deepEqual(remedyAccounts(lateChanged).reports.slice(0,2),remedyAccounts(lateChanged).archives[0].reports.slice(0,2));
});

test('stale, unplayed, fractional and wrong replay commands are no-ops; duplicate played paths merge records instead of inflating counts',()=>{
 const opening=initialRemedy('exports');assert.strictEqual(replay(opening,0),opening);
 const s=played('exports','single'),snapshot=JSON.stringify(s);for(const fromRound of [-1,3,.5,'0'])assert.strictEqual(act(s,{type:'REPLAY',fromRound,expectedPlan:snapshot}),s);
 assert.strictEqual(act(s,{type:'REPLAY',fromRound:0,expectedPlan:'stale'}),s);
 let next=replay(s,1);assert.strictEqual(act(next,{type:'REPLAY',fromRound:1,expectedPlan:snapshot}),next);
 for(let n=1;n<3;n++)next=act(next,{type:'PLACE',mode:'single',expectedRound:n});next=act(next,{type:'COMPARE',outlook:'normal'});next=replay(next,2);
 assert.equal(next.archives.length,1);assert.equal(next.archives[0].comparisons.length,3);assert.deepEqual(restoreRemedy(next,'exports'),next);assert.equal(feedback.path(remedyAccounts(next)),null);
});

test('archive restoration accepts legacy saves but rejects impossible paths, duplicate archives and injected derived cash',()=>{
 const old=played('consumption','credit');assert.deepEqual(restoreRemedy(old,'consumption'),old);
 const s=replay(old,0);for(const bad of [{...s,archives:[]},{...s,archives:[{history:[],comparisons:[]}]},{...s,archives:[{history:old.history,comparisons:[{mode:'credit',dose:4,outlook:'adverse'}]}]},{...s,archives:[s.archives[0],s.archives[0]]},{...s,archives:[{history:old.history.map(c=>({...c,outlook:'supported'})),comparisons:[]}]}])assert.equal(restoreRemedy(bad,'consumption'),null);
 const forged=structuredClone(s);forged.archives[0].cash=999;forged.archives[0].world={cash:{shop:999}};assert.deepEqual(restoreRemedy(forged,'consumption'),s);
 const cloned=restoreRemedy(s,'consumption');cloned.archives[0].history[0].dose=0;assert.equal(s.archives[0].history[0].dose,2);
});

test('chapter replay retains other experiments, reopens only its own completion gate and survives refresh',()=>{
 let p=reduce(initialPrologue(),{type:'JUMP_STAGE',stage:4});for(const route of Object.keys(REMEDY_MODES)){p=reduce(p,{type:'CHOOSE_RELIEF',route});for(let n=0;n<3;n++)p=reduce(p,{type:'REMEDY',action:{type:'PLACE',mode:REMEDY_MODES[route][0],expectedRound:n}});for(const outlook of ['adverse','supported'])p=reduce(p,{type:'REMEDY',action:{type:'COMPARE',outlook}});p=reduce(p,{type:'RELIEF_WRAP'});}
 p=reduce(p,{type:'CHOOSE_RELIEF',route:'consumption'});const before=structuredClone(p.remedyLabs);p=reduce(p,{type:'REMEDY',action:{type:'REPLAY',fromRound:1,expectedPlan:JSON.stringify(p.remedyLabs.consumption)}});
 assert.deepEqual(p.reliefCompleted,['investment','exports']);assert.deepEqual(p.remedyLabs.investment,before.investment);assert.deepEqual(p.remedyLabs.exports,before.exports);assert.strictEqual(reduce(p,{type:'FINISH_RELIEF'}),p);assert.strictEqual(reduce(p,{type:'RELIEF_WRAP'}),p);assert.deepEqual(restorePrologue(p),p);
 for(let n=1;n<3;n++)p=reduce(p,{type:'REMEDY',action:{type:'PLACE',mode:'raise',expectedRound:n}});assert.strictEqual(reduce(p,{type:'RELIEF_WRAP'}),p);for(const outlook of ['adverse','supported'])p=reduce(p,{type:'REMEDY',action:{type:'COMPARE',outlook}});p=reduce(p,{type:'RELIEF_WRAP'});assert.equal(p.reliefCompleted.length,3);assert.equal(p.remedyLabs.consumption.archives.length,1);assert.deepEqual(restorePrologue(p),p);
});

test('comparison tradeoffs never label the lower-cash route as an unconditional win',()=>{
 for(const [stock,cash,pattern] of [[-1,-1,/少剩1份，钱少1枚/],[-1,0,/少剩1份，钱没变/],[1,1,/多剩1份，钱多1枚/],[0,-1,/剩货一样，钱少1枚/],[0,1,/剩货一样，钱多1枚/],[0,0,/眼前没变/],[1,-1,/多剩1份，钱少1枚/]])assert.match(feedback.tradeoff({stock,cash}),pattern);
});

test('equal stock and cash do not hide a different next-period capacity or unpaid bill',()=>{
 const s=played('investment','expand'),late=replay(s,2),changed=act(late,{type:'PLACE',mode:'replace',expectedRound:2}),result=feedback.path(remedyAccounts(changed));assert.equal(result.stock,0);assert.equal(result.cash,0);assert.equal(result.before.capacity,30);assert.equal(result.after.capacity,20);assert.match(feedback.tradeoff(result),/下期产能少10份/);
 assert.match(feedback.tradeoff({...result,before:result.after,after:result.before}),/下期产能多10份/);
 const stable={stock:0,cash:0,before:{capacity:0,debt:10},after:{capacity:0,debt:15}};assert.match(feedback.tradeoff(stable),/多欠5枚/);assert.match(feedback.tradeoff({...stable,before:stable.after,after:stable.before}),/少欠5枚/);
});
