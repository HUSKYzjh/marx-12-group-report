import test from 'node:test';
import assert from 'node:assert/strict';
import {createStreet,streetRound,simulateStreet,moneyTotal} from '../lib/street-market-prototype.ts';
test('price and wage calibration conserves finite cash and physical bread for 64 rounds',()=>{
  for(let wage=3;wage<=7;wage++)for(let price=1;price<=4;price+=.5)for(const imitation of [false,true]){
    const {state,history}=simulateStreet({wage,breadPrice:price,imitation,expand:true,rivalExpand:true},64);
    assert.equal(moneyTotal(state),state.initialMoney);
    assert(history.every(r=>Number.isFinite(r.ours.cash)&&r.ours.cash>=0&&r.stock>=0));
  }
});
test('dismissal preserves household savings and ovens; new workers must be hired and paid',()=>{
  const s=createStreet(),worker=s.buyers.find(b=>b.id==='bakery-1');worker.cash=10000;s.initialMoney=moneyTotal(s);
  const r=streetRound(s,{layoffAt:1,layoffs:1});
  assert.equal(r.report.dismissed,1);assert.equal(r.report.ours.workers,1);assert.equal(r.report.ours.machines,2);
  assert.equal(r.report.ours.produced,6);assert(r.state.buyers.find(b=>b.id===worker.id).cash>0);
  assert(r.transactions.some(t=>t.from===worker.id&&t.kind==='bread'));
  assert(!r.transactions.some(t=>t.to===worker.id&&t.kind==='wage'));
  assert(r.transactions.some(t=>t.to===worker.id&&t.kind==='severance'&&t.amount===5));
  const rehire=streetRound(r.state,{rehire:true});assert.equal(rehire.report.hires,1);assert.equal(rehire.report.ours.workers,2);assert.equal(rehire.report.investments,0);
  assert.equal(s.firms[0].workers.length,2);assert.equal(s.round,0);
});
test('expansion pays the oven maker, hires once, and adds production only next round',()=>{
  const r=streetRound(createStreet(),{expand:true});
  assert.equal(r.report.investments,1);assert.equal(r.report.hires,1);
  assert.equal(r.report.ours.produced,12);assert.equal(r.report.ours.machines,3);
  assert(r.transactions.some(t=>t.kind==='new-oven'&&t.to==='ovens'&&t.amount===24));
  assert.equal(streetRound(r.state).report.ours.produced,18);
});
test('same inputs replay exactly; invalid policies cannot enter the prototype',()=>{
  assert.deepEqual(simulateStreet({wage:4,breadPrice:2},12),simulateStreet({wage:4,breadPrice:2},12));
  for(const policy of [{wage:2},{breadPrice:.5},{breadPrice:NaN},{breadPrice:2.3},{layoffs:-1},{layoffAt:0}])assert.throws(()=>streetRound(createStreet(),policy),RangeError);
});
test('severance sensitivities are funded, and layoffs do not mechanically create inventory',()=>{
  for(const severance of [0,5,10]){
    let s=createStreet();for(let i=0;i<8;i++)s=streetRound(s).state;
    const r=streetRound(s,{layoffAt:9,layoffs:1,severance});
    assert.equal(r.report.dismissed,1);
    assert.equal(r.transactions.filter(t=>t.kind==='severance').reduce((n,t)=>n+t.amount,0),severance);
    assert.equal(moneyTotal(r.state),r.state.initialMoney);
    assert.equal(r.report.ours.stock,0);assert.equal(r.report.ours.produced,6);
  }
  for(const key of ['imitation','expand','rehire'])assert.throws(()=>streetRound(createStreet(),{[key]:'yes'}),TypeError);
});
