import test from 'node:test';
import assert from 'node:assert/strict';
import {initialCourse,courseRound,nextCourse,finished,courseIssue} from '../public/assets/market-duel/course-model.mjs';
import {wavesReview,socialReview} from '../public/assets/market-duel/course-review.mjs';
function waves(batch=true){let s=initialCourse(batch);while(!finished(s))s=courseRound(s,'hold');return nextCourse(s);}
function play(s,actions){for(const action of actions){assert.equal(courseIssue(s,action),'');s=courseRound(s,action);}return s;}
test('five-day review uses its own opening and the same ordinary-business baseline',()=>{
 for(const batch of [true,false]){
  const baseline=play(waves(batch),Array(5).fill('hold'));
  assert.deepEqual(wavesReview(baseline),{gain:baseline.world.shops[0].cash-36,baselineGain:baseline.world.shops[0].cash-36,difference:0,stock:baseline.world.shops[0].bread.length,spoiled:baseline.world.history.reduce((n,r)=>n+r.spoiled[0],0),demand:[12,20,20,6,12]});
  for(const actions of [['price-up','price-up','hold','hold','hold'],['upgrade','hold','hold','hold','hold'],['buy','hold','hire','hold','hold']]){
   const s=play(waves(batch),actions),before=structuredClone(s),r=wavesReview(s);
   assert.equal(r.gain,s.world.history.reduce((n,h)=>n+h.after[0]-h.before[0],0));
   assert.equal(r.difference,r.gain-wavesReview(baseline).gain);assert.equal(r.stock,s.world.history.at(-1).stock[0]);assert.deepEqual(s,before);
  }
 }
});
test('unfinished rounds and other independent scenes do not disclose a five-day result',()=>{
 assert.equal(wavesReview(initialCourse()),null);let s=waves();assert.equal(wavesReview(s),null);
 for(let i=0;i<4;i++){s=courseRound(s,'hold');assert.equal(wavesReview(s),null);}
 s=courseRound(s,'hold');assert(wavesReview(s));assert.equal(wavesReview(nextCourse(s)),null);
});
test('social ending distinguishes unsold goods, unaffordable goods and no remaining goods without inventing sales',()=>{
 assert.equal(socialReview({history:[]}),null);
 const record={stock:[0,0],poor:0,wages:[0,0],stopped:[true,true],made:[0,0],sold:[0,0]};
 let result=socialReview({history:[record]});assert.match(result.title,/没有剩货/);assert(!result.title.includes('卖完'));assert.equal(result.stopped,1);
 result=socialReview({history:[{...record,stock:[3,0],poor:0}]});assert.match(result.title,/剩下面包/);
 result=socialReview({history:[{...record,stock:[3,0],poor:2,wages:[6,2],installing:[true,false]}]});assert.match(result.title,/买不起/);assert.equal(result.poor,2);assert.equal(result.wages,8);assert.equal(result.stopped,0);
});
