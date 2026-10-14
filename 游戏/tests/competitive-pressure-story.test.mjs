import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPressureStory,pressureStoryReducer,restorePressureStory,supportRemaining} from '../lib/competitive-pressure.ts';
import {initialAutomation,automationReducer,restoreAutomation} from '../lib/automation-experiment.ts';
import {initialPressure,pressureRound,pressureMoney,rewindPressure,restorePressure} from '../public/assets/market-duel/pressure-model.mjs';
const act=(s,a)=>pressureStoryReducer(s,a),run=s=>act(s,{type:'RUN',revision:s.revision});
test('first cash stop allows a funded second-day retry, without playing a long losing route',()=>{
 let s=initialPressureStory();assert.equal(act(s,{type:'TRY_FOLLOW'}),s);
 s=run(s);assert.equal(act(s,{type:'TRY_FOLLOW'}),s);s=run(run(s));assert.equal(s.world.day,3);assert(s.world.history.at(-1).closed[0]);
 const original=structuredClone(s),retry=act(s,{type:'TRY_FOLLOW'});
 assert.equal(retry.world.day,1);assert.equal(retry.draft,'follow');assert.deepEqual(retry.world,rewindPressure(original.world,2));assert.deepEqual(retry.reference,original.world);assert.deepEqual(retry.paths.at(-1),original.world);assert.deepEqual(restorePressureStory(retry),retry);
 const followed=run(retry);assert.equal(followed.world.day,2);assert.deepEqual(followed.world.firms[0].workers,[0,1]);assert.equal(pressureMoney(followed.world),120);assert.equal(act(followed,{type:'TRY_FOLLOW'}),followed);
});
function followed(){let s=run(initialPressureStory());s=act(s,{type:'DRAFT',choice:'follow'});while(s.world.day<9)s=run(s);return s;}
test('drafts do not pay; stale run messages cannot settle twice',()=>{
 let s=initialPressureStory();assert.equal(act(s,{type:'DRAFT',choice:'follow'}),s);s=run(s);const old=s,chosen=act(s,{type:'DRAFT',choice:'follow'});
 assert.deepEqual(chosen.world,old.world);const next=run(chosen);assert.equal(next.world.day,2);assert.equal(act(next,{type:'RUN',revision:chosen.revision}),next);assert.equal(next.world.firms[0].workers.length,2);assert.deepEqual(restorePressureStory(next),next);
});
test('income comparison forks the actual sixth-day world, preserving decisions and people',()=>{
 const original=followed();let s=act(original,{type:'SUPPORT'});assert.equal(s.world.day,6);assert.deepEqual(s.world,rewindPressure(original.world,7));assert.deepEqual(s.reference,original.world);
 for(const [coin,person]of [2,3,6,7].entries())s=act(s,{type:'COIN',coin,person});assert.deepEqual(s.world,rewindPressure(original.world,7));
 for(let i=0;i<3;i++){s=run(s);const r=s.world.history.at(-1);assert.deepEqual(r.support.paid,[2,3,6,7]);assert.equal(r.action,original.world.history[r.day-1].action);assert.equal(r.shortOfMoney,0);assert.equal(pressureMoney(s.world),120);assert.deepEqual(restorePressureStory(s),s);}
 assert.equal(original.world.history.at(-1).shortOfMoney,4);assert.equal(supportRemaining(s),0);assert(s.world.history.at(-1).stock.reduce((a,b)=>a+b,0)>0,'support does not eliminate excess capacity');
 assert.equal(s.world.people.length,11);assert.deepEqual(s.world.firms.map(f=>f.workers),original.world.firms.map(f=>f.workers));assert.deepEqual(restorePressureStory(act(s,{type:'CONCLUDE'})),act(s,{type:'CONCLUDE'}));
});
test('four real coins can be reassigned, not duplicated, and payments come from the supplier',()=>{
 let s=act(followed(),{type:'SUPPORT'});const before=structuredClone(s.world);s=act(s,{type:'COIN',coin:0,person:2});assert.equal(act(s,{type:'COIN',coin:1,person:2}),s);assert.equal(act(s,{type:'COIN',coin:4,person:1}),s);assert.equal(act(s,{type:'COIN',coin:1,person:8}),s);assert.deepEqual(s.world,before);
 s=act(s,{type:'COIN',coin:0,person:null});assert.equal(s.coins[0],null);s=act(s,{type:'COIN',coin:1,person:6});s=run(s);const r=s.world.history.at(-1);assert.deepEqual(r.support.paid,[6]);assert.deepEqual(r.receipts.filter(x=>x.reason==='收入保障'),[{from:'p10',to:'p6',amount:1,reason:'收入保障'}]);assert.equal(supportRemaining(s),11);
 const wallets=Object.fromEntries([...r.before.firms.map(f=>['f'+f.id,f.cash]),...r.before.people.map(p=>['p'+p.id,p.cash])]);for(const p of r.receipts){assert(wallets[p.from]>=p.amount);wallets[p.from]-=p.amount;wallets[p.to]+=p.amount;}assert.equal(pressureMoney(s.world),120);
});
test('core rejects early, oversized, duplicate and invalid support requests',()=>{
 const early=initialPressure();for(const support of [[2],[-1],[8],[2,2],[0,1,2,3,4]])assert.throws(()=>pressureRound(early,'hold',{support}));
 let w=early;for(let i=0;i<6;i++)w=pressureRound(w,i===0?'hold':'follow');const next=pressureRound(w,'hold',{support:[]});assert.deepEqual(next.history.at(-1).support.paid,[]);assert.deepEqual(restorePressure(next),next);
});
test('rewind and restart preserve real paths; restore rejects forged policy and funding',()=>{
 const original=followed();let s=act(original,{type:'SUPPORT'});s=act(s,{type:'COIN',coin:0,person:2});s=run(s);assert.equal(act(s,{type:'REWIND',day:6}),s);const back=act(s,{type:'REWIND',day:7});assert.equal(back.world.day,6);assert.deepEqual(run(back).world,s.world);
 const again=act(s,{type:'RESTART'});assert.equal(again.world.day,0);assert.deepEqual(again.paths.at(-1),s.world);assert.deepEqual(restorePressureStory(again),again);
 for(const mutate of [x=>x.coins=[2,2,null,null],x=>x.world.people[2].cash++,x=>x.reference.history[6].action='price',x=>x.world.history[6].support.remaining=12,x=>x.stage='competition']){const bad=structuredClone(s);mutate(bad);assert.equal(restorePressureStory(bad),null);}
 const forged=initialPressureStory();forged.world=pressureRound(initialPressure(),'follow');forged.revision=1;assert.equal(restorePressureStory(forged),null);forged.world=initialPressure(18);assert.equal(restorePressureStory(forged),null);
});
test('main automation archive validates new pressure records without overwriting legacy entries',()=>{
 let s=automationReducer(initialAutomation(),{type:'PRESSURE',action:{type:'BEGIN'}});assert(s.pressure);s=automationReducer(s,{type:'PRESSURE',action:{type:'RUN',revision:0}});assert.deepEqual(restoreAutomation(s),s);assert.equal(automationReducer(s,{type:'MATCH',action:{type:'BEGIN'}}),s);assert.equal(automationReducer(initialAutomation('time'),{type:'PRESSURE',action:{type:'BEGIN'}}).pressure,undefined);
 const bad=structuredClone(s);bad.phase='intro';assert.equal(restoreAutomation(bad),null);assert.deepEqual(restoreAutomation(initialAutomation()),initialAutomation());
});
