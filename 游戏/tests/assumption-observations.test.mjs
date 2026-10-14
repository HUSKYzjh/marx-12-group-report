import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPrologue,prologueReducer,restorePrologue} from '../lib/prologue-state.ts';
import {assumptionObservations} from '../lib/assumption-observations.ts';
import {assumptionRouteProgress} from '../lib/assumption-route-progress.ts';
import {initialAutomation,automationReducer} from '../lib/automation-experiment.ts';
import {initialTimeCalendar,timeCalendarReducer} from '../lib/time-calendar.ts';
import {initialSpaceFreight,freightReducer,freightAccount} from '../lib/space-freight.ts';
import {initialCareRouting,careRoutingReducer} from '../lib/care-routing.ts';
import {initialPlatformNetwork,platformNetworkReducer} from '../lib/platform-network.ts';
import {initialSharingCouncil,sharingCouncilReducer} from '../lib/sharing-council.ts';
import {initialPublicDemand,publicDemandReducer,publicDemandAccount} from '../lib/public-demand.ts';
import {initialPreservation,preservationReducer} from '../lib/preservation-workbench.ts';
const pairs=o=>o.facts.map(f=>[f.label,f.value,f.unit]);
function whole(branch,core){
 const s=initialPrologue();
 if(branch==='automation')s.technology=core;
 if(branch==='time')s.technology={...initialAutomation('time'),phase:core.phase,rate:core.rate,calendar:core};
 if(['space','services'].includes(branch))s.needsTechnology={branch,phase:core.phase,[branch==='space'?'freight':'care']:core};
 if(['concentration','sharing'].includes(branch))s.ownershipTechnology={branch,phase:core.phase,[branch==='concentration'?'network':'council']:core};
 if(['policy','prices'].includes(branch))s.marketRules={branch,phase:core.phase,[branch==='policy'?'demand':'workbench']:core};
 return s;
}
const apply=(state,reducer,action)=>reducer(state,{...action,...('revision' in state?{expectedRevision:state.revision}:{})});

test('new, legacy, draft and unfinished stories do not fabricate observations',()=>{
 assert.deepEqual(assumptionObservations(initialPrologue()),{});
 for(const [branch,core] of [['automation',initialAutomation()],['time',initialTimeCalendar()],['space',initialSpaceFreight(true)],['services',initialCareRouting()],['concentration',initialPlatformNetwork()],['sharing',initialSharingCouncil(true,true)],['policy',initialPublicDemand(true)],['prices',initialPreservation(true)]]){
  assert.deepEqual(assumptionObservations(whole(branch,core)),{});
 }
 const s=initialPrologue();s.technology={...initialAutomation(),phase:'lab',run:{mode:'cut',rate:60}};
 assert.deepEqual(assumptionObservations(s),{},'an old uniform result keeps its legacy sign, not a new receipt');
});
test('automation facts are actual income, not employment or a changed machine draft',()=>{
 let s=automationReducer(initialAutomation(),{type:'BEGIN'});s=automationReducer(s,{type:'RUN'});
 const original=assumptionObservations(whole('automation',s)).automation;
 assert.deepEqual(pairs(original),[['领到收入',4,'人'],['剩下面包',24,'个']]);
 s=automationReducer(s,{type:'RATE',rate:80});assert.equal(s.run,null);
 assert.deepEqual(assumptionObservations(whole('automation',s)).automation,original);
 s=automationReducer(s,{type:'MODE',mode:'share'});s=automationReducer(s,{type:'RUN'});
 const next=assumptionObservations(whole('automation',s)).automation;
 assert.equal(next.context,'省下80%工时 · 一周');assert.deepEqual(pairs(next),[['领到收入',10,'人'],['剩下面包',0,'个']]);
});
test('calendar shows the same person’s actual free time and income, not a drafted pay contract',()=>{
 let s=timeCalendarReducer(initialTimeCalendar(),{type:'BEGIN'});
 for(const from of [2,3,4])s=timeCalendarReducer(s,{type:'PLACE_DAY',from,to:'rest'});
 s=timeCalendarReducer(s,{type:'RUN'});
 const original=assumptionObservations(whole('time',s)).time;
 assert.equal(original.context,'省下60%工时 · 保周薪');assert.deepEqual(pairs(original),[['阿面有空',3,'天'],['阿面收入',5,'枚']]);
 s=timeCalendarReducer(s,{type:'FLIP_CONTRACT'});assert.deepEqual(assumptionObservations(whole('time',s)).time,original);
 s=timeCalendarReducer(s,{type:'RUN'});assert.equal(assumptionObservations(whole('time',s)).time.facts[1].value,2);
});
test('freight counts complete paired habitats, not delivered crates or the loading preview',()=>{
 let s=freightReducer(initialSpaceFreight(true),{type:'BEGIN'});s=freightReducer(s,{type:'CONTRACT',order:12});
 for(let i=0;i<3;i++){
  s=freightReducer(s,{type:'PRODUCE',expectedRound:i});
  const a=freightAccount(s,s.pending),wanted={...a.wanted};let slot=0;
  for(const crate of a.crates){if(slot>=a.loadLimit)break;if(wanted[crate.kind]>0){s=freightReducer(s,{type:'LOAD',crate:crate.id,slot:slot++});wanted[crate.kind]--;}}
  if(i<2)assert.deepEqual(assumptionObservations(whole('space',s)),{});
  s=freightReducer(s,{type:'LAUNCH',expectedRound:i});
 }
 assert.deepEqual(pairs(assumptionObservations(whole('space',s)).space),[['配齐住舱',4,'间'],['留在厂里',6,'个']]);
 const original=assumptionObservations(whole('space',s));s=freightReducer(s,{type:'RETRY'});s=freightReducer(s,{type:'PLAN',slot:0,kind:'air'});
 assert.deepEqual(assumptionObservations(whole('space',s)),original);
});
test('care distinguishes increased capacity from actual use, and draft vouchers do not provide care',()=>{
 let s=careRoutingReducer(initialCareRouting(),{type:'BEGIN'});s=careRoutingReducer(s,{type:'TOOL',enabled:true});s=apply(s,careRoutingReducer,{type:'RUN'});
 const original=assumptionObservations(whole('services',s));assert.deepEqual(pairs(original.services),[['服务能力',6,'人'],['实际用上',4,'人']]);
 s=careRoutingReducer(s,{type:'VOUCHER',voucher:0,person:4});assert.deepEqual(assumptionObservations(whole('services',s)),original);
 s=apply(s,careRoutingReducer,{type:'RUN'});assert.equal(assumptionObservations(whole('services',s)).services.facts[1].value,5);
});
test('platform shows the executed two-period bill, not the quote for a new connection',()=>{
 let s=platformNetworkReducer(initialPlatformNetwork(),{type:'BEGIN'});s=apply(s,platformNetworkReducer,{type:'OPERATE'});s=platformNetworkReducer(s,{type:'CONNECT',shop:0,to:'B'});assert.deepEqual(assumptionObservations(whole('concentration',s)),{});
 s=apply(s,platformNetworkReducer,{type:'OPERATE'});const original=assumptionObservations(whole('concentration',s));
 assert.deepEqual(pairs(original.concentration),[['付接入费',17,'枚'],['搬资料花',6,'枚']]);
 s=platformNetworkReducer(s,{type:'CONDITION',rule:'portable'});assert.deepEqual(assumptionObservations(whole('concentration',s)),original);
});

test('next platform proposals preserve actual directory observations until their independent comparison has run',()=>{
 let s=platformNetworkReducer(initialPlatformNetwork(),{type:'BEGIN'});s=apply(s,platformNetworkReducer,{type:'OPERATE'});s=platformNetworkReducer(s,{type:'CONNECT',shop:0,to:'B'});s=apply(s,platformNetworkReducer,{type:'OPERATE'});
 const original=assumptionObservations(whole('concentration',s));s=platformNetworkReducer(s,{type:'NEXT_RULE',rule:'portable'});assert.deepEqual(assumptionObservations(whole('concentration',s)),original);
 assert.equal(assumptionRouteProgress(whole('concentration',s)).concentration.receipts,1);
 s=apply(s,platformNetworkReducer,{type:'COMPARE'});assert.deepEqual(pairs(assumptionObservations(whole('concentration',s)).concentration),[['付接入费',17,'枚'],['搬资料花',1,'枚']]);
 assert.equal(assumptionRouteProgress(whole('concentration',s)).concentration.receipts,2);
});
test('sharing money is not automatically a vote or a completed production run',()=>{
 let s=sharingCouncilReducer(initialSharingCouncil(true,true),{type:'BEGIN'});
 for(let roll=0;roll<6;roll++)s=sharingCouncilReducer(s,{type:'ROLL',roll,to:roll});
 s=apply(s,sharingCouncilReducer,{type:'DISTRIBUTE'});assert.deepEqual(assumptionObservations(whole('sharing',s)),{});
 s=sharingCouncilReducer(s,{type:'BALLOT',to:'divide'});s=apply(s,sharingCouncilReducer,{type:'VOTE'});
 const original=assumptionObservations(whole('sharing',s));assert.deepEqual(pairs(original.sharing),[['工人分到',12,'枚'],['每位工人',0,'票']]);
 s=sharingCouncilReducer(s,{type:'CONDITION',mode:'coop'});assert.deepEqual(assumptionObservations(whole('sharing',s)),original);
});
test('public demand reports real delivered food and outstanding debt, not signed or matched orders',()=>{
 let s=publicDemandReducer(initialPublicDemand(true),{type:'BEGIN'});s=publicDemandReducer(s,{type:'LOAN',person:0,enabled:true});
 for(let day=1;day<=2;day++){
  s=apply(s,publicDemandReducer,{type:'FUND'});
  if(day===2){s=apply(s,publicDemandReducer,{type:'REPAY',person:0});s=apply(s,publicDemandReducer,{type:'SHOP'});}
  const a=publicDemandAccount(s);let bread=a.inventory[0];const who=a.periods.at(-1).purchases.findIndex(n=>n<2);
  s=publicDemandReducer(s,{type:'MATCH',bread,person:who});assert.deepEqual(assumptionObservations(whole('policy',s)),{});
  s=apply(s,publicDemandReducer,{type:'DELIVER_BATCH'});s=apply(s,publicDemandReducer,{type:'NEXT'});
 }
 const observation=assumptionObservations(whole('policy',s)).policy;
 // Borrow 2, owe 3 including interest; repay 2 on day two, leaving 1 owed.
 assert.equal(observation.facts[0].value,2);assert.equal(observation.facts[1].value,1);
});
test('preservation summarizes both executed days; rewiring a retry cannot rewrite spoiled bread',()=>{
 let s=preservationReducer(initialPreservation(true),{type:'BEGIN'});s=apply(s,preservationReducer,{type:'RUN'});assert.deepEqual(assumptionObservations(whole('prices',s)),{});
 s=apply(s,preservationReducer,{type:'NEXT'});s=apply(s,preservationReducer,{type:'RUN'});
 const original=assumptionObservations(whole('prices',s));assert.deepEqual(pairs(original.prices),[['坏掉面包',6,'个'],['最后剩下',6,'个']]);
 s=preservationReducer(s,{type:'RETRY'});s=apply(s,preservationReducer,{type:'CONNECT',tool:'cold',enabled:true});assert.deepEqual(assumptionObservations(whole('prices',s)),original);
});
test('actual host archive, refresh and scoped reset preserve observations without view-side mutation',()=>{
 let s=prologueReducer(initialPrologue(),{type:'NAVIGATE_CHAPTER',chapter:'automation'});s=prologueReducer(s,{type:'TECHNOLOGY',action:{type:'BEGIN'}});s=prologueReducer(s,{type:'TECHNOLOGY',action:{type:'RUN'}});
 const expected=assumptionObservations(s),before=structuredClone(s);assert.deepEqual(s,before);assumptionObservations(s);assert.deepEqual(s,before);
 s=prologueReducer(s,{type:'BACK_ASSUMPTIONS'});s=prologueReducer(s,{type:'OPEN_TECHNOLOGY',branch:'time'});assert.deepEqual(assumptionObservations(s),expected);
 s=restorePrologue(JSON.stringify(s));assert(s);assert.deepEqual(assumptionObservations(s),expected);
 s=prologueReducer(s,{type:'BACK_ASSUMPTIONS'});s=prologueReducer(s,{type:'OPEN_TECHNOLOGY',branch:'automation'});s=prologueReducer(s,{type:'TECHNOLOGY',action:{type:'RESTART'}});
 assert(s.branchArchive.automation);assert.deepEqual(assumptionObservations(s),{});assert.equal(assumptionRouteProgress(s).automation.kind,'new');
});
