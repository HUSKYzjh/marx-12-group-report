import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialRemedy,remedyReducer as act,remedyAccounts,restoreRemedy,REMEDY_MODES} from '../lib/remedy-lab.ts';
import {prologueReducer as reduce,restorePrologue} from '../lib/prologue-state.ts';
import {legacyRemedyPrologue as initialPrologue} from './helpers/legacy-remedy.mjs';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});
const ui=window.RemedyFeedback,rewind=(s,n)=>act(s,{type:'REPLAY',fromRound:n,expectedPlan:JSON.stringify(s)});
function played(route,n,mode=REMEDY_MODES[route][0]){let s=initialRemedy(route);for(let i=0;i<n;i++)s=act(s,{type:'PLACE',mode,expectedRound:i});return s;}

test('a played first or second turn can be changed immediately without losing old receipts or inventing later turns',()=>{
 for(const route of Object.keys(REMEDY_MODES))for(const turns of [1,2])for(let from=0;from<turns;from++){
  const s=played(route,turns),old=structuredClone(s),before=remedyAccounts(s),next=rewind(s,from),after=remedyAccounts(next);
  assert.deepEqual(s,old);assert.deepEqual(next.history,s.history.slice(0,from));assert.deepEqual(next.archives,[{history:s.history,comparisons:[]}]);
  assert.deepEqual(after.reports,before.reports.slice(0,from));assert.deepEqual(after.archives[0].reports,before.reports);
  assert.equal(after.archives[0].thirdBaseline,null);assert.equal(after.archives[0].canContinue,false);assert.equal(after.canContinue,false);
  assert.deepEqual(restoreRemedy(next,route),next);assert.strictEqual(rewind(s,turns),s);
 }
});

test('early comparisons use only equally observed turns and never fabricate a third-period baseline',()=>{
 const s=played('consumption',2,'credit');let next=rewind(s,0);
 next=act(next,{type:'PLACE',mode:'raise',expectedRound:0});let p=ui.path(remedyAccounts(next));assert.equal(p.rounds,1);assert.equal(p.before.round,1);assert.equal(p.after.round,1);assert.equal(p.cash,-10);
 next=act(next,{type:'PLACE',mode:'raise',expectedRound:1});p=ui.path(remedyAccounts(next));assert.equal(p.rounds,2);assert.equal(p.before.stock,12);assert.equal(p.after.stock,0);assert.equal(p.cash,-8);
 next=act(next,{type:'PLACE',mode:'raise',expectedRound:2});assert.equal(ui.path(remedyAccounts(next)),null,'two old turns cannot stand in for an observed full three-turn path');
 let late=rewind(s,1);late=act(late,{type:'PLACE',mode:'raise',expectedRound:1});assert.equal(remedyAccounts(late).display.repayment,12,'changing turn two still owes the loan from turn one');
 assert.deepEqual(late.history.slice(0,1),s.history.slice(0,1));
});

test('every finite partial/full arrangement can be archived, while partial shock records remain invalid',()=>{
 const archives=[];for(let length=1;length<=3;length++)for(let code=0;code<8**length;code++){
  let choice=code;const history=[];for(let i=0;i<length;i++){history.push({mode:choice%8<4?'raise':'credit',dose:choice%4,outlook:'normal'});choice=Math.floor(choice/8);}archives.push({history,comparisons:[]});
 }
 const s={...initialRemedy('consumption'),archives};assert.equal(archives.length,584);assert.deepEqual(restoreRemedy(s,'consumption'),s);
 const bad=structuredClone(s);bad.archives[0].comparisons.push({mode:'raise',dose:2,outlook:'adverse'});assert.equal(restoreRemedy(bad,'consumption'),null);
 assert.equal(restoreRemedy({...s,archives:[...archives,archives[0]]},'consumption'),null);
});

test('partial archives cannot complete a remedy, unlock a short story path or change other routes on refresh',()=>{
 let p=reduce(initialPrologue(),{type:'JUMP_STAGE',stage:4});p=reduce(p,{type:'CHOOSE_RELIEF',route:'consumption'});
 for(let n=0;n<2;n++)p=reduce(p,{type:'REMEDY',action:{type:'PLACE',mode:'credit',expectedRound:n}});
 p=reduce(p,{type:'REMEDY',action:{type:'REPLAY',fromRound:0,expectedPlan:JSON.stringify(p.remedyLabs.consumption)}});
 assert.equal(p.remedyLabs.consumption.archives[0].history.length,2);assert.deepEqual(restorePrologue(p),p);
 assert.strictEqual(reduce(p,{type:'RELIEF_WRAP'}),p);assert.strictEqual(reduce(p,{type:'FINISH_RELIEF_SAMPLE'}),p);assert.deepEqual(p.reliefCompleted,[]);
 const money=remedyAccounts(p.remedyLabs.consumption).opening.cash;assert.equal(money.shop,60);assert.equal(money.households,0);
});

test('only actual new moves or alternative third-turn trials animate; draft, rewind, reopening and refresh do not pay twice',()=>{
 const wrap=s=>({route:s.route,history:s.history,comparisons:s.comparisons}),start=played('consumption',0),first=played('consumption',1,'credit'),second=played('consumption',2,'credit'),third=played('consumption',3,'credit');
 assert.equal(ui.didOperate(null,wrap(second)),false);assert.equal(ui.didOperate(wrap(start),wrap(first)),true);assert.equal(ui.didOperate(wrap(first),wrap(second)),true);
 assert.equal(ui.didOperate(wrap(second),wrap(rewind(second,1))),false);assert.equal(ui.didOperate(wrap(second),wrap(second)),false);assert.equal(ui.didOperate(wrap(second),wrap(act(second,{type:'DOSE',delta:1}))),false);
 assert.equal(ui.didOperate(wrap(second),wrap(played('investment',2))),false);assert.equal(ui.didOperate(wrap(third),wrap(act(third,{type:'COMPARE',outlook:'adverse'}))),true);
});
