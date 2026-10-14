import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialRemedy,remedyReducer as act,remedyAccounts} from '../lib/remedy-lab.ts';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});
const timeline=r=>JSON.parse(JSON.stringify(window.RemedyFeedback.householdTimeline(r)));
const step=(event,story,r)=>JSON.parse(JSON.stringify(window.RemedyFeedback.householdStep(event,story,r)));
function trial(mode){let s=initialRemedy('consumption');for(let n=0;n<3;n++)s=act(s,{type:'PLACE',mode,expectedRound:n});return s;}
test('cash story follows funded wages, old bills, new credit, and household purchases in ledger order',()=>{
 let s=act(initialRemedy('consumption'),{type:'PLACE',mode:'credit',expectedRound:0});let t=timeline(remedyAccounts(s).display);
 assert.deepEqual(t.events.map(e=>[e.kind,e.amount,e.balance]),[['wages',20,20],['borrow',10,30],['shopping',30,0]]);
 s=act(s,{type:'PLACE',mode:'credit',expectedRound:1});t=timeline(remedyAccounts(s).display);
 assert.deepEqual(t.events.map(e=>[e.kind,e.amount,e.balance]),[['wages',20,20],['repay',12,8],['borrow',10,18],['shopping',18,0]]);
 assert.equal(t.wanted,30);assert.equal(t.bought,18);assert.equal(t.opening,0);assert.equal(t.closing,0);
});
test('wage moves and stopped credit do not invent loans or erase actually unpaid bills',()=>{
 let s=act(trial('credit'),{type:'COMPARE',outlook:'adverse'});let t=timeline(remedyAccounts(s).display);
 assert.deepEqual(t.events.map(e=>[e.kind,e.amount,e.balance]),[['wages',10,10],['repay',10,0],['shopping',0,0]]);
 assert(!t.events.some(e=>e.kind==='borrow'));assert.equal(t.bought,0);
 s=act(s,{type:'PLACE',mode:'raise',expectedRound:3,outlook:'adverse'});t=timeline(remedyAccounts(s).display);
 assert.deepEqual(t.events.map(e=>[e.kind,e.amount,e.balance]),[['wages',20,20],['repay',12,8],['shopping',8,0]]);
 assert(!t.events.some(e=>e.kind==='borrow'));assert.equal(timeline(remedyAccounts(trial('raise')).display).bought,30);
});
test('all arrangements reconstruct integer nonnegative wallets without changing actual records',()=>{
 for(let bits=0;bits<8;bits++)for(let dose=0;dose<4;dose++)for(const outlook of ['normal','adverse','supported']){
  let s=initialRemedy('consumption');while(s.dose!==dose)s=act(s,{type:'DOSE',delta:Math.sign(dose-s.dose)});
  for(let n=0;n<3;n++)s=act(s,{type:'PLACE',mode:bits&(1<<n)?'credit':'raise',expectedRound:n});s=act(s,{type:'COMPARE',outlook});
  const before=structuredClone(s),a=remedyAccounts(s);
  for(const r of a.reports.concat(a.comparisons)){
   const t=timeline(r),previous=a.reports[r.round-2]?.world??a.opening;
   assert.equal(t.opening,previous.cash.households);assert.equal(t.closing,r.world.cash.households);assert.equal(t.events.at(-1).balance,t.closing);
   assert.equal(t.bought,r.payments.filter(p=>p.reason==='家庭购物').reduce((n,p)=>n+p.amount,0));
   assert(t.events.every(e=>Number.isInteger(e.balance)&&e.balance>=0&&Number.isInteger(e.amount)&&e.amount>=0));
  }
  assert.deepEqual(s,before);
 }
});
test('zero purchases distinguish unfilled shopping lists from a claimed financial collapse',()=>{
 assert.equal(timeline(null).events.length,0);
 const r=remedyAccounts(trial('raise')).display,synthetic={...r,payments:[],world:{...r.world,cash:{...r.world.cash,households:9}}};
 const t=timeline(synthetic);assert.equal(t.opening,9);assert.equal(t.closing,9);assert.equal(t.bought,0);assert.match(t.events[0].text,/买到0份/);
 assert(!/没钱|破产|崩溃|贷款/.test(t.events[0].text),'an unfilled list alone cannot diagnose the cause');
});

test('expressions follow the funded transfer stage; a fully paid shopping bag is not mistaken for poverty',()=>{
 const r=remedyAccounts(act(initialRemedy('consumption'),{type:'PLACE',mode:'credit',expectedRound:0})).display,t=timeline(r);
 assert.deepEqual(t.events.map(e=>step(e,t,r)),[{mood:'worried',wallet:20,cue:'工资到手'},{mood:'happy',wallet:30,cue:'再借一点'},{mood:'happy',wallet:0,cue:'买到30份'}]);
 const second=act(act(initialRemedy('consumption'),{type:'PLACE',mode:'credit',expectedRound:0}),{type:'PLACE',mode:'credit',expectedRound:1}),r2=remedyAccounts(second).display,t2=timeline(r2);
 assert.deepEqual(t2.events.map(e=>step(e,t2,r2).wallet),[20,8,18,0]);assert(t2.events.every(e=>step(e,t2,r2).mood==='worried'));
 assert.equal(step({kind:'wages',balance:9,amount:9},{wanted:30},{...r,sold:0,stock:0}).mood,'ready','no supplied goods alone is not insufficient money');
});

test('all actual transfer stages use short cues and existing wallet balances without modifying receipts',()=>{
 for(let bits=0;bits<8;bits++)for(const dose of [0,1,2,3])for(const outlook of ['normal','adverse','supported']){
  let s={...initialRemedy('consumption'),dose};for(let n=0;n<3;n++)s=act(s,{type:'PLACE',mode:bits>>n&1?'credit':'raise',expectedRound:n,outlook:n===2?outlook:'normal'});
  const saved=JSON.stringify(s),a=remedyAccounts(s);for(const r of a.reports){const t=timeline(r);for(const e of t.events){const view=step(e,t,r);assert.equal(view.wallet,e.balance);assert(Array.from(view.cue).length<=12);assert(['ready','worried','happy'].includes(view.mood));if(e.kind==='shopping')assert.equal(view.mood,window.RemedyFeedback.householdMood(r));}}
  assert.equal(JSON.stringify(s),saved);
 }
});
