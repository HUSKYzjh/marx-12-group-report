import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSpaceFreight,freightReducer as step,freightAccount,freightCanLoad,restoreSpaceFreight} from '../lib/space-freight.ts';
import {freightExploration as probe} from '../lib/freight-exploration.ts';
const balanced=['power','air','structure','power','air','structure'];
function trial({order=12,capacity=6,mixes=[balanced,balanced,balanced],renew=false}={}){
 let s=step(initialSpaceFreight(true),{type:'BEGIN'});
 s=step(s,{type:'CAPACITY',capacity});s=step(s,{type:'CONTRACT',order});
 for(let r=0;r<3;r++){
  if(renew&&freightAccount(s).need===0)s=step(s,{type:'MAINTENANCE'});
  for(let slot=0;slot<capacity;slot++)s=step(s,{type:'PLAN',slot,kind:mixes[r][slot]??null});
  s=step(s,{type:'PRODUCE',expectedRound:r});let slot=0;
  for(const id of freightAccount(s,s.pending).available)if(freightCanLoad(s,id))s=step(s,{type:'LOAD',crate:id,slot:slot++});
  s=step(s,{type:'LAUNCH',expectedRound:r});
 }
 return s;
}
function compare(s,previous){return {...s,trials:[...previous.map(p=>p.trials.at(-1)),s.trials.at(-1)]};}

test('only completed real construction has a challenge, not a blueprint draft or uniform legacy record',()=>{
 let s=trial({order:4}),before=structuredClone(s);assert.match(probe(s).prompt,/4组单.*不留剩货/);assert.deepEqual(s,before);
 assert.deepEqual(probe(restoreSpaceFreight(s)),probe(s));s=step(s,{type:'RETRY'});assert.equal(probe(s),null);
 s=step(s,{type:'PLAN',slot:0,kind:'air'});assert.equal(probe(s),null);s=step(s,{type:'PRODUCE',expectedRound:0});assert.equal(probe(s),null);
 assert.equal(probe(initialSpaceFreight()),null);
});

test('wrong goods with funds, depleted authorization, and completed maintenance ask different feasible questions',()=>{
 const wrong=trial({mixes:Array(3).fill(Array(6).fill('power'))});assert.equal(freightAccount(wrong).authorization,32);assert.equal(probe(wrong).focusKind,'power');assert.match(probe(wrong).prompt,/能源件.*只换图纸/);
 const full=trial();assert.match(probe(full).prompt,/少做一点.*维护/);
 const maintained=trial({renew:true});assert.match(probe(maintained).prompt,/只做建设.*工人/);
 const paced=trial({order:4,mixes:[['power','air'],['structure','power'],[]]});assert.equal(freightAccount(paced).stock,0);assert.match(probe(paced).prompt,/仓库空了.*订单补足/);
 const empty=trial({mixes:[[],[],[]]});assert.match(probe(empty).prompt,/三期.*能住人的一间/);
 // At the minimum capacity, the question does not demand four impossible homes.
 const small=trial({capacity:2,mixes:Array(3).fill(['power','air'])});assert.match(probe(small).prompt,/配出一间/);assert.doesNotMatch(probe(small).prompt,/四间/);
});

test('maintenance comparison requires the same programme, capacity, initial order and pre-renewal delivery',()=>{
 const base=trial(),maintained=trial({renew:true});let s=compare(maintained,[base]);assert.match(probe(s).comparison,/收款多24枚.*工资.*不变/);
 s=compare(base,[maintained]);assert.match(probe(s).comparison,/不接维护单.*少24枚/);
 const changedCapacity=trial({capacity:4,mixes:Array(3).fill(['power','air','structure','power'])});assert.equal(probe(compare(maintained,[changedCapacity])).comparison,null);
 const changedOrder=trial({order:4});assert.equal(probe(compare(maintained,[changedOrder])).comparison,null);
 const changedProduction=trial({mixes:[balanced,balanced,[]]});assert.equal(probe(compare(maintained,[changedProduction])).comparison,null,'different last-period production is not an order-only comparison');
});

test('a recipe/delivery comparison names equal output but does not claim every shipment decision is controlled',()=>{
 const wrong=trial({mixes:Array(3).fill(Array(6).fill('power'))}),right=trial();
 const s=compare(right,[wrong]);assert.match(probe(s).comparison,/同样每期产量.*图纸与交货搭配.*多4间.*14组变为6组/);
 assert.equal(probe(compare(trial({order:4}),[wrong])).comparison,null);
});

test('producing less with exactly the same delivery shows the wage tradeoff, not free welfare',()=>{
 const over=trial({order:4}),paced=trial({order:4,mixes:[['power','air','structure','power'],[],[]]});
 const a=freightAccount(over),b=freightAccount(paced);assert.equal(a.sold,b.sold);assert.equal(a.habitats,b.habitats);assert.equal(a.moneyAfter,b.moneyAfter);
 assert.match(probe(compare(paced,[over])).comparison,/同样各期交货.*少14组.*少28枚/);
 assert.match(probe(compare(over,[paced])).comparison,/多14组.*多28枚/);
 const differentTiming=trial({order:4,mixes:[['power','air'],['structure','power'],[]]});
 assert.equal(probe(compare(differentTiming,[over])).comparison,null,'equal aggregate delivery hides different timings');
});

test('successful zero-stock alternatives are possible; inspection and retry never change the experiment ledger',()=>{
 for(const s of [trial({renew:true}),trial({mixes:[balanced,balanced,[]]}),trial({order:4,mixes:[['power','air','structure','power'],[],[]]})]){
  const before=JSON.stringify(s),account=freightAccount(s);assert.equal(account.stock,0);assert.equal(account.moneyAfter,156);probe(s);assert.equal(JSON.stringify(s),before);
  assert.equal(probe(step(s,{type:'RETRY'})),null);assert.deepEqual(freightAccount(s),account);
 }
});
