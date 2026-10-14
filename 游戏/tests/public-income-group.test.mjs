import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPublicDemand,publicDemandReducer as reduce,publicDemandAccount as account,restorePublicDemand} from '../lib/public-demand.ts';
const begin=(shared=true)=>reduce(initialPublicDemand(shared),{type:'BEGIN'});
const group=(s,people,day)=>reduce(s,{type:'INCOME_GROUP',people,day,expectedRevision:s.revision});
const commit=(s,type)=>reduce(s,{type,expectedRevision:s.revision});

test('one brush stroke is one atomic draft using real finite rolls, not cash',()=>{
 for(const shared of [true,false]){
  const before=begin(shared),cash=account(before),after=group(before,[5,2,0],2);
  assert.equal(after.revision,before.revision+1);assert.deepEqual(after.income.slice(0,3),[{person:5,day:2},{person:2,day:2},{person:0,day:2}]);
  assert.deepEqual(account(after),cash);assert.deepEqual(after.incomePaid,before.incomePaid);assert.deepEqual(restorePublicDemand(after),after);
  assert.equal(before.income.filter(Boolean).length,0);
 }
});
test('caps, stale revisions, duplicates, bad people and dates reject the entire group',()=>{
 const s=begin();
 for(const people of [[],[0,0],[-1],[6],[.5],[0,1,2,3,4,5,6]])assert.equal(group(s,people,1),s);
 for(const day of [0,3,'2',null])assert.equal(group(s,[0],day),s);
 assert.equal(reduce(s,{type:'INCOME_GROUP',people:[0],day:1,expectedRevision:s.revision-1}),s);
 let filled=group(group(s,[0],1),[0],1);assert.equal(group(filled,[1,0],1),filled,'not even the eligible member is partly assigned');
 filled=group(group(s,[0,1,2,3,4,5],1),[0,1,2,3,4,5],2);assert.equal(filled.income.length,12);assert.equal(filled.income.filter(Boolean).length,12);assert.equal(group(filled,[0],2),filled);
 assert.equal(account(filled).moneyAfter,148);
});
test('group and singles produce identical plans and actual paid results',()=>{
 let batch=begin(),singles=begin();
 for(const day of [1,2]){batch=group(batch,[0,1,2,3,4,5],day);for(let i=0;i<6;i++)singles=reduce(singles,{type:'INCOME',roll:(day-1)*6+i,to:{person:i,day}});}
 assert.deepEqual(batch.income,singles.income);assert.deepEqual(account(batch),account(singles));
 for(let day=1;day<=2;day++){batch=commit(commit(batch,'FUND'),'NEXT');singles=commit(commit(singles,'FUND'),'NEXT');}
 assert.deepEqual(account(batch),account(singles));assert.deepEqual(account(batch).periods.map(p=>p.sold),[12,12]);assert.equal(account(batch).publicFund,8);
});
test('second-day groups cannot undo paid day one; unaffordable drafts still cannot be signed',()=>{
 let s=group(begin(),[0,1,2,3,4,5],1);s=commit(commit(s,'FUND'),'NEXT');const paid=structuredClone(s.incomePaid),prior=structuredClone(account(s).periods[0]);
 assert.equal(group(s,[0],1),s);s=group(s,[0,1,2,3,4,5],2);assert.deepEqual(s.incomePaid,paid);assert.deepEqual(account(s).periods[0],prior);
 assert.equal(account(s).publicFund,20);s=commit(s,'FUND');assert.equal(account(s).publicFund,8);assert.equal(account(s).employer,24);
 let over=reduce(begin(),{type:'MACHINE',enabled:true});over=group(group(over,[0,1,2,3,4,5],1),[0,1,2,3,4,5],1);
 assert.equal(account(over).plannedCost,36);assert.equal(account(over).publicFund,32);assert.equal(commit(over,'FUND'),over);assert.equal(account(over).moneyAfter,148);
});
