import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPressure,pressureRound,pressureMoney} from '../public/assets/market-duel/pressure-model.mjs';
import {pressureFeedback} from '../public/assets/market-duel/pressure-feedback.mjs';
test('feedback uses actual money, never changes the world or counts stock-out as poverty',()=>{
 let s=initialPressure();assert.deepEqual(pressureFeedback(s).unpaid,[6,7]);assert.equal(pressureFeedback(s).checkpoint,null);
 for(let i=0;i<9;i++){
  s=pressureRound(s,i===0?'hold':'follow');const before=structuredClone(s),f=pressureFeedback(s),r=s.history.at(-1);
  assert.deepEqual(s,before);assert.equal(pressureMoney(s),120);assert.equal(f.poor.length,r.shortOfMoney);
  assert.equal(f.cashChange,r.cashAfter[0]-r.cashBefore[0]);assert.equal(f.wages,r.wages[0]+r.wages[1]);
  if(i===1){assert.equal(f.checkpoint,'fired');assert.deepEqual(f.fired,[2,3]);assert.equal(f.wages,4);assert.equal(f.initialWages,10);assert(f.message.includes('少发了6'));assert.equal(f.poor.length,0);}
  if(i===6){assert.equal(f.checkpoint,'poor');assert.deepEqual(f.poor.slice().sort((a,b)=>a-b),[6,7]);assert(f.savings.filter(p=>[6,7].includes(p.id)).every(p=>p.opening===6&&p.current===0));assert(f.savings.filter(p=>[2,3].includes(p.id)).every(p=>p.current===1),'later layoffs have savings for longer');}
  if(i===7)assert.equal(f.checkpoint,null,'continuing poverty is not another first event');
  if(i===8){assert.equal(f.checkpoint,'end');assert.deepEqual(f.poor.slice().sort((a,b)=>a-b),[2,3,6,7]);}
 }
});
test('holding arrangements reaches a cash event before the final day; sale-only is not layoffs',()=>{
 let held=initialPressure(),priced=initialPressure();
 for(let i=0;i<9;i++){
  held=pressureRound(held,'hold');priced=pressureRound(priced,i===0?'hold':'price');
  if(i===2)assert.equal(pressureFeedback(held).checkpoint,'closed');
  if(i===3)assert.notEqual(pressureFeedback(held).checkpoint,'closed');
  assert.deepEqual(pressureFeedback(priced).fired,[]);
 }
});

test('support feedback describes actual recipients and purchases, not a preset happy ending',()=>{
 let baseline=initialPressure();for(let i=0;i<6;i++)baseline=pressureRound(baseline,i===0?'hold':'follow');
 for(const recipients of [[],[0,1,4,5],[2,3,6,7]]){
  let world=structuredClone(baseline);
  for(let day=7;day<=9;day++){
   world=pressureRound(world,'hold',{support:recipients});const before=structuredClone(world),r=world.history.at(-1),f=pressureFeedback(world);
   assert.deepEqual(world,before);assert.equal(f.poor.length,r.shortOfMoney);assert.equal(pressureMoney(world),120);
   assert(f.message.includes(recipients.length?'保障发给了4人':'没有发出保障'));
   assert(!f.message.includes('工资省下了'));
   if(r.shortOfMoney)assert(f.message.includes('仍有'+r.shortOfMoney+'人有货却买不起'));
   else assert(f.message.includes('11人都买到了面包'));
  }
  assert.equal(world.history.at(-1).shortOfMoney,recipients.includes(6)?0:4);
 }
});
