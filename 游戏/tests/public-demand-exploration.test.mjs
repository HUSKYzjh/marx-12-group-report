import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPublicDemand,publicDemandReducer as reduce,publicDemandAccount as account,restorePublicDemand} from '../lib/public-demand.ts';
import {publicDemandExploration as probe} from '../lib/public-demand-exploration.ts';
const commit=(s,type,extra={})=>reduce(s,{type,expectedRevision:s.revision,...extra});
const begin=()=>reduce(initialPublicDemand(true),{type:'BEGIN'});
function finish(s){for(let day=1;day<=2;day++){s=commit(s,'FUND');if(s.step==='repay'){for(let i=0;i<6;i++)if(s.loanPaid[i])s=commit(s,'REPAY',{person:i});s=commit(s,'SHOP');}s=commit(s,'NEXT');}return s;}
const withLoan=()=>reduce(begin(),{type:'LOAN',person:0,enabled:true});
const plan=(s,roll,to)=>reduce(s,{type:'INCOME',roll,to});
test('a completed borrower receives dated food and payment receipts, never fabricated progress',()=>{
 let s=withLoan();assert.equal(probe(s),null);s=commit(s,'FUND');assert.equal(probe(s),null);s=commit(s,'NEXT');s=commit(s,'FUND');s=commit(s,'REPAY',{person:0});s=commit(s,'SHOP');assert.equal(probe(s),null);s=commit(s,'NEXT');
 const saved=structuredClone(s),p=probe(s);assert.equal(p.focusPerson,0);assert.match(p.question,/今天吃了2个，明天只有0个/);assert.equal(p.editRoll,0);assert.equal(p.editWasPaid,false);
 assert.deepEqual(p.personDays.map(x=>[x.bought,x.provided,x.walletAfterShopping]),[[2,0,1],[0,0,0]]);
 assert.deepEqual(p.repayment,{person:0,amount:2,walletBefore:2,walletAfter:0,debtAfter:1});
 assert.deepEqual(s,saved);assert.deepEqual(probe(restorePublicDemand(s)),p);
});
test('moving the result paper starts a same-origin unpaid proposal; prior transfers remain unchanged',()=>{
 let s=plan(withLoan(),0,{person:0,day:1});s=finish(s);const paid=structuredClone(s);
 const next=commit(s,'REPLAN_INCOME',{roll:0,to:{person:0,day:2}});
 assert.equal(next.day,1);assert.equal(next.step,'fund');assert.equal(next.run,null);assert.equal(next.loanPaid,null);assert.equal(next.incomePaid,null);assert.equal(next.machinePaid,null);assert.deepEqual(next.loans,s.run.loans);
 assert.deepEqual(next.income[0],{person:0,day:2});assert.deepEqual(next.income.slice(1),s.run.income.slice(1));assert.deepEqual(next.deliveries,[]);assert.deepEqual(next.trials,s.trials);
 assert.equal(account(next).publicFund,32);assert.equal(account(next).lender,40);assert.equal(account(next).debtTotal,0);assert.deepEqual(account(next).repayments,[]);assert.equal(account(next).moneyAfter,148);
 assert.deepEqual(s,paid);assert.deepEqual(restorePublicDemand(next),next);assert.equal(probe(next),null);
 const done=finish(next),p=probe(done);assert.equal(p.comparison.kind,'income-timing');assert.match(p.comparison.text,/只挪一份钱的日期/);assert.deepEqual(account(done).periods.map(x=>x.purchases[0]),[2,0]);assert.equal(account(done).debt[0],0);
});
test('one added support may clear debt without buying two meals: the question never promises a cure',()=>{
 const first=finish(withLoan());let next=commit(first,'REPLAN_INCOME',{roll:0,to:{person:0,day:2}});next=finish(next);
 const p=probe(next);assert.equal(p.comparison.kind,'income-amount');assert.match(p.comparison.text,/最后欠1 → 0枚/);assert.equal(p.personDays[1].bought,0);assert.equal(p.repayment.walletAfter,1);assert.match(p.question,/提前/);
 assert.equal(account(next).moneyAfter,148);
});
test('one borrower and one capital order are matched only if income and actual meal orders agree',()=>{
 const first=finish(begin());let second=commit(first,'REPLAN');second=reduce(second,{type:'LOAN',person:4,enabled:true});second=finish(second);assert.equal(probe(second).comparison.kind,'credit');assert.equal(probe(second).comparison.person,4);
 let capital=commit(first,'REPLAN');capital=reduce(capital,{type:'MACHINE',enabled:true});capital=finish(capital);const p=probe(capital);assert.equal(p.comparison.kind,'capital');assert.match(p.question,/多做6个/);assert.match(p.comparison.text,/产出24 → 30个，剩货12 → 18个/);
 let mixed=commit(first,'REPLAN');mixed=reduce(mixed,{type:'MACHINE',enabled:true});mixed=reduce(mixed,{type:'LOAN',person:0,enabled:true});mixed=finish(mixed);assert.equal(probe(mixed).comparison,null);
});
test('paper identity is not an economic change; changed procurement prevents a single-cause claim',()=>{
 const first=finish(plan(begin(),0,{person:0,day:1}));let same=commit(first,'REPLAN');same=plan(same,0,null);same=plan(same,4,{person:0,day:1});same=finish(same);assert.equal(same.trials.length,1);assert.equal(probe(same).comparison,null);
 let next=commit(first,'REPLAN_INCOME',{roll:0,to:{person:0,day:2}});next=commit(next,'FUND');const bread=account(next).inventory[0];next=reduce(next,{type:'MATCH',bread,person:1});next=commit(next,'DELIVER',{person:1});next=commit(next,'NEXT');next=commit(next,'FUND');next=commit(next,'NEXT');assert.equal(probe(next).comparison,null);
});
test('replanning rejects stale and impossible drafts and cannot change a current or concluded trial',()=>{
 const initial=withLoan();assert.equal(commit(initial,'REPLAN'),initial);const s=finish(plan(plan(initial,0,{person:0,day:1}),1,{person:0,day:1}));
 for(const action of [{type:'REPLAN',expectedRevision:s.revision-1},{type:'REPLAN_INCOME',expectedRevision:s.revision,roll:0,to:{person:0,day:1}},{type:'REPLAN_INCOME',expectedRevision:s.revision,roll:2,to:{person:0,day:1}},{type:'REPLAN_INCOME',expectedRevision:s.revision,roll:-1,to:{person:0,day:2}}])assert.equal(reduce(s,action),s);
 let next=finish(commit(s,'REPLAN_INCOME',{roll:0,to:{person:0,day:2}}));next=reduce(next,{type:'CONCLUDE'});assert.equal(probe(next),null);assert.equal(commit(next,'REPLAN'),next);
});
test('completed public meals are retained as evidence, not silently replayed when resetting a proposal',()=>{
 let s=commit(begin(),'FUND');s=reduce(s,{type:'MATCH',bread:account(s).inventory[0],person:0});s=commit(s,'DELIVER',{person:0});s=commit(s,'NEXT');s=commit(s,'FUND');s=commit(s,'NEXT');
 const next=commit(s,'REPLAN');assert.deepEqual(next.deliveries,[]);assert.deepEqual(next.trials[0].deliveries,s.run.deliveries);assert.equal(account(next).publicFund,32);assert.equal(account(next).periods[0].publicSold,0);assert.equal(account(next).moneyAfter,148);
});
