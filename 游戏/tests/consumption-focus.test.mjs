import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialRemedy,remedyReducer as act,remedyAccounts} from '../lib/remedy-lab.ts';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});
const focus=s=>JSON.parse(JSON.stringify(window.ConsumptionFocus(remedyAccounts(s))));
const play=(s,mode,outlook='normal')=>act(s,{type:'PLACE',mode,expectedRound:s.history.length,outlook});
test('consumption foregrounds actual household purchases and the next bill, not total sales or an empty closing wallet',()=>{
 let s=initialRemedy('consumption');assert.deepEqual(focus(s),{bought:0,wanted:30,due:0,debt:0,repayment:0,line:'想多卖一点，先让顾客买得起。'});
 s=play(s,'credit');assert.equal(focus(s).bought,30);assert.equal(focus(s).due,12);assert.equal(focus(s).line,'明天还有账单。','the meter already says how much was bought; the voice adds only the delayed cost');
 s=play(s,'credit');const a=remedyAccounts(s);assert.equal(a.display.sold,38);assert.equal(a.display.world.cash.households,0);
 assert.equal(focus(s).bought,18);assert.equal(focus(s).repayment,12);assert.match(focus(s).line,/工资先还账/);
});
test('raises can meet the shopping list without new debt; a zero dose does not fake an improvement',()=>{
 const s=play(initialRemedy('consumption'),'raise');assert.equal(focus(s).bought,30);assert.equal(focus(s).due,0);assert.equal(focus(s).line,'没有新借款。');
 const zero=play({...initialRemedy('consumption'),dose:0},'raise');assert.equal(focus(zero).bought,20);assert.match(focus(zero).line,/钱不够/);
});
test('the second-turn prompt explains the purchase drop before announcing the next condition',()=>{
 let s=play(play(initialRemedy('consumption'),'credit'),'credit'),r=remedyAccounts(s).display;
 assert.equal(window.ConsumptionForecast(r,'adverse'),'先还12枚，买到18份。下回合底薪减半。');
 assert.match(window.ConsumptionForecast(r,'normal'),/先还12.*买到18.*照常经营/);
 s=play(play(initialRemedy('consumption'),'raise'),'raise');r=remedyAccounts(s).display;
 assert.equal(window.ConsumptionForecast(r,'supported'),'这回买到30份。下回合收入涨了。');
});
test('stress is explicitly named; the fourth turn retains the old bill instead of declaring the policy a universal failure',()=>{
 let s=initialRemedy('consumption');for(let n=0;n<3;n++)s=play(s,'credit',n===2?'adverse':'normal');
 assert.equal(focus(s).bought,0);assert.equal(focus(s).debt,2);assert.match(focus(s).line,/底薪减半.*旧账没还完/);
 s=act(s,{type:'FOLLOWUP',mode:'raise',expectedPlan:JSON.stringify(s)});assert.equal(focus(s).repayment,3);assert.equal(focus(s).bought,17);assert.equal(focus(s).debt,0);assert.match(focus(s).line,/底薪减半.*工资先还账/);
});
test('every finite consumption path reports only existing funded purchases, including supply shortage, and stays read-only',()=>{
 for(let bits=0;bits<8;bits++)for(const dose of [0,1,2,3])for(const outlook of ['normal','supported','adverse']){
  let s={...initialRemedy('consumption'),dose};for(let n=0;n<3;n++)s=play(s,['credit','raise'][bits>>n&1],n===2?outlook:'normal');
  const a=remedyAccounts(s),r=a.display,before=JSON.stringify(s),f=focus(s);
  assert.equal(f.bought,r.payments.filter(p=>p.reason==='家庭购物'&&p.from==='households').reduce((n,p)=>n+p.amount,0));
  assert.equal(f.wanted,outlook==='supported'?40:30);assert.equal(f.due,r.debt?r.debt+Math.ceil(r.debt/5):0);assert.equal(JSON.stringify(s),before);
  assert(Array.from(f.line).length<=32,f.line);assert(!/必然|赢|崩溃|金融危机/.test(f.line));
 }
 const f=window.ConsumptionFocus({display:{...remedyAccounts(play(initialRemedy('consumption'),'raise')).display,sold:0,stock:0,payments:[],world:{cash:{households:0}},debt:0,repayment:0}});
 assert.match(f.line,/货没备够/);assert(!/有钱/.test(f.line));
});
