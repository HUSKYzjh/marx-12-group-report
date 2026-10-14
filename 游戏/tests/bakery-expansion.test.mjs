import test from 'node:test';
import assert from 'node:assert/strict';
import '../lib/bakery-expansion.js';
import {initialPrologue,prologueReducer as reduce,restorePrologue,PROLOGUE_STAGES} from '../lib/prologue-state.ts';
const {sample,duration}=globalThis.BakeryExpansionTimeline;

test('money forms stable uneven stacks and loose source coins, not a filled cone',()=>{
  const {coinPile}=globalThis.BakeryExpansionTimeline;
  const small=coinPile(11),large=coinPile(767);
  assert.deepEqual(coinPile(767),large);
  assert(large.height>small.height&&large.coins.length>small.coins.length);
  assert.equal(large.coins.filter(c=>c.kind==='loose').length,5);
  assert.equal(coinPile(0).coins.filter(c=>c.alpha>0).length,0);
  for(const cash of [0,8,11,40,200,767,1e12])for(const c of coinPile(cash).coins){
    assert(c.width>c.height&&c.alpha>=0&&c.alpha<=1);
    assert(Math.abs(c.x)+c.width/2<=66);
    assert([c.x,c.y,c.rotation].every(Number.isFinite));
  }
  for(const cash of [-1,NaN,Infinity])assert.throws(()=>coinPile(cash),RangeError);
});
test('the three internal bakery phases share a single public act and preserve choices',()=>{
  assert.equal(PROLOGUE_STAGES.length,7);
  assert.equal(PROLOGUE_STAGES.filter(s=>s.label.startsWith('第一幕')).length,1);
  let s={...initialPrologue(),scene:'bakery-upgrade',bakeryWage:4};
  assert.strictEqual(reduce(s,{type:'OPEN_BAKERY_EXPANSION'}),s);
  s=reduce(reduce(s,{type:'CONFIRM_BAKERY_WAGE'}),{type:'OPEN_BAKERY_EXPANSION'});
  assert.equal(s.scene,'bakery-expansion');assert.equal(s.bakeryWage,4);
  assert.deepEqual(restorePrologue(s),s);
  assert.deepEqual(reduce(s,{type:'EXPANSION_CONTINUE'}).allocationPlans,s.allocationPlans);
});
test('doubling reaches 64 ovens and chefs; cash first pays for investment, then sales net of wages and inputs',()=>{
  for(let wage=3;wage<=7;wage++){
    let cash=15-wage;
    for(let r=0;r<6;r++){
      const start=sample(2+r*2.4,wage),end=sample(2+r*2.4+2.399,wage),count=2**(r+1);
      assert.equal(start.count,count);assert(Math.abs(start.cashBefore-cash)<1e-8);
      const expected=cash-count+count*(15-wage-4);
      assert(Math.abs(end.cash-expected)<1e-8);cash=expected;
    }
    const end=sample(duration,wage);assert.equal(end.count,64);assert.equal(end.cash,cash);
    assert.equal(end.question,true);assert.equal(end.blur,1);assert.equal(end.complete,true);
    for(let i=0;i<=1840;i++){const s=sample(i/100,wage);assert(s.cash>=0&&Number.isFinite(s.cash));assert(s.purchase>=0&&s.purchase<=1&&s.sales>=0&&s.sales<=1);}
  }
});
test('blur precedes the final question, and invalid pay is rejected',()=>{
  assert.equal(sample(16.5,5).question,false);assert(sample(17.5,5).blur>0);
  assert.equal(sample(18,5).question,true);assert.equal(sample(0,5).count,1);
  assert.deepEqual(sample(100,5),sample(duration,5));
  for(const wage of [0,8,4.2,NaN])assert.throws(()=>sample(2,wage),RangeError);
});

test('boss has one stable comic line per doubling, also visible at reduced-motion checkpoints',()=>{
 const {bossLines,checkpoints}=globalThis.BakeryExpansionTimeline;
 assert.equal(bossLines.length,6);assert.equal(new Set(bossLines).size,6);
 assert.equal(sample(0,5).bossLineIndex,-1);
 for(let i=0;i<6;i++)for(const wage of [3,5,7]){
  const s=sample(checkpoints[i+1],wage);assert.equal(s.bossLineIndex,i);assert.equal(s.bossLine,bossLines[i]);assert.equal(s.count,2**(i+1));
  assert.equal(sample(2+i*2.4+.2,wage).bossLine,bossLines[i]);
 }
 assert.equal(sample(16.5,5).bossLine,'');assert.equal(sample(duration,5).bossLine,'');assert.equal(sample(0,5).bossLineIndex,-1);
});
