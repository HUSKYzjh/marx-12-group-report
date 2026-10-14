import test from 'node:test';
import assert from 'node:assert/strict';
import {initialAutomation,automationReducer,restoreAutomation,automationRunAccount} from '../lib/automation-experiment.ts';
import {initialTimeCalendar,timeCalendarReducer,restoreTimeCalendar,calendarAccount} from '../lib/time-calendar.ts';
import {initialCareRouting,careRoutingReducer,restoreCareRouting,careRoutingAccount} from '../lib/care-routing.ts';
import {initialSpaceFreight,freightReducer,restoreSpaceFreight,freightAccount,freightCanLoad} from '../lib/space-freight.ts';
import {initialPlatformNetwork,platformNetworkReducer,restorePlatformNetwork,networkTrialAccount} from '../lib/platform-network.ts';
import {initialSharingCouncil,sharingCouncilReducer,restoreSharingCouncil,councilTrialAccount} from '../lib/sharing-council.ts';
import {productionAccount} from '../lib/council-production.ts';
import {initialPrologue,prologueReducer,restorePrologue} from '../lib/prologue-state.ts';

// Conclusions are reached by actual legal actions, not phase-edited fixtures.
function build(reduce,initial,play){let s=initial;const actions=[];const step=a=>{actions.push(a);s=reduce(s,a);return s;};step({type:'BEGIN'});play(step,()=>s);step({type:'CONCLUDE'});assert.equal(s.phase,'conclusion');return {s,actions};}
const specs=[
 {branch:'automation',open:'OPEN_TECHNOLOGY',edit:'TECHNOLOGY',field:'technology',reduce:automationReducer,restore:restoreAutomation,initial:initialAutomation,again:()=>({type:'REOPEN'}),receipt:s=>(s.trials??[]).map(automationRunAccount),build:()=>build(automationReducer,initialAutomation(),step=>{step({type:'RUN'});step({type:'MODE',mode:'time'});step({type:'RUN'});})},
 {branch:'time',open:'OPEN_TECHNOLOGY',edit:'TECHNOLOGY',field:'technology',core:'CALENDAR',child:'calendar',reduce:timeCalendarReducer,restore:restoreTimeCalendar,initial:initialTimeCalendar,again:()=>({type:'REOPEN'}),receipt:s=>s.trials.map(calendarAccount),build:()=>build(timeCalendarReducer,initialTimeCalendar(),step=>{step({type:'RUN'});step({type:'PLACE_DAY',from:2,to:'rest'});step({type:'RUN'});})},
 {branch:'services',open:'OPEN_NEEDS',edit:'NEEDS',field:'needsTechnology',core:'CARE',child:'care',reduce:careRoutingReducer,restore:restoreCareRouting,initial:initialCareRouting,again:s=>({type:'REOPEN',expectedRevision:s.revision}),receipt:s=>s.trials.map(careRoutingAccount),build:()=>build(careRoutingReducer,initialCareRouting(),(step,get)=>{step({type:'RUN',expectedRevision:get().revision});step({type:'TOOL',enabled:true});step({type:'RUN',expectedRevision:get().revision});})},
 {branch:'space',open:'OPEN_NEEDS',edit:'NEEDS',field:'needsTechnology',core:'FREIGHT',child:'freight',reduce:freightReducer,restore:restoreSpaceFreight,initial:()=>initialSpaceFreight(true),again:()=>({type:'RETRY'}),receipt:s=>s.trials.map(r=>freightAccount(r)),build:()=>build(freightReducer,initialSpaceFreight(true),(step,get)=>{
   const run=()=>{for(let r=0;r<3;r++){step({type:'PRODUCE',expectedRound:r});let slot=0;for(const id of freightAccount(get(),get().pending).available)if(freightCanLoad(get(),id))step({type:'LOAD',crate:id,slot:slot++});step({type:'LAUNCH',expectedRound:r});}};
   run();step({type:'RETRY'});step({type:'CONTRACT',order:12});run();
 })},
 {branch:'concentration',open:'OPEN_OWNERSHIP',edit:'OWNERSHIP',field:'ownershipTechnology',core:'NETWORK',child:'network',reduce:platformNetworkReducer,restore:restorePlatformNetwork,initial:initialPlatformNetwork,again:()=>({type:'RETRY'}),receipt:s=>s.trials.map(networkTrialAccount),build:()=>build(platformNetworkReducer,initialPlatformNetwork(),(step,get)=>{
   for(const rule of ['locked','portable']){if(get().rule!==rule)step({type:'CONDITION',rule});step({type:'OPERATE',expectedRevision:get().revision});step({type:'CONNECT',shop:0,to:'B'});step({type:'OPERATE',expectedRevision:get().revision});}
 })},
 {branch:'sharing',open:'OPEN_OWNERSHIP',edit:'OWNERSHIP',field:'ownershipTechnology',core:'COUNCIL',child:'council',reduce:sharingCouncilReducer,restore:restoreSharingCouncil,initial:()=>initialSharingCouncil(true,true),again:()=>({type:'RETRY'}),receipt:s=>({votes:s.trials.map(councilTrialAccount),shifts:s.productionTrials.map(t=>productionAccount(t.production))}),build:()=>build(sharingCouncilReducer,initialSharingCouncil(true,true),(step,get)=>{
   for(const mode of ['bonus','coop']){if(get().mode!==mode){step({type:'PRODUCTION_BACK'});step({type:'CONDITION',mode});}for(let roll=0;roll<6;roll++)step({type:'ROLL',roll,to:roll});step({type:'DISTRIBUTE',expectedRevision:get().revision});step({type:'BALLOT',to:'divide'});step({type:'VOTE',expectedRevision:get().revision});step({type:'PRODUCTION_BEGIN'});for(let i=0;i<3;i++)step({type:'PRODUCTION_RUN',expectedRevision:get().revision});}
 })},
];

for(const spec of specs){
 test(spec.branch+': conclusion continuation keeps actual receipts and is phase-safe',()=>{
  const {s}=spec.build(),old=structuredClone(s),actual=spec.receipt(s),action=spec.again(s),next=spec.reduce(s,action);
  assert.equal(next.phase,'lab');assert.deepEqual(next.trials,s.trials);assert.deepEqual(spec.receipt(next),actual);assert.deepEqual(s,old,'never mutate completed receipts');
  assert.equal(spec.reduce(next,action),next,'a delayed duplicate cannot restart the next comparison');assert.equal(spec.reduce(spec.initial(),action).phase,'intro');
  assert.deepEqual(spec.restore(next),next,'valid continuation survives refresh without a schema migration');
  if(['automation','time','services'].includes(spec.branch))assert.deepEqual(next.run,s.run,'the last actual result remains visible while editing');
  if(spec.branch==='space'){assert.equal(next.stage,'planning');assert.equal(next.history.length,0);assert.equal(freightAccount(next).moneyAfter,156);assert.equal(next.order,s.order);}
  if(spec.branch==='concentration'){assert.equal(next.history.length,0);assert.deepEqual(next.routes,['A','A','A']);assert.equal(next.rule,s.rule);}
  if(spec.branch==='sharing'){assert.equal(next.step,'money');assert.equal(next.paid,null);assert.equal(next.production,undefined);assert.deepEqual(next.productionTrials,s.productionTrials);assert.equal(councilTrialAccount(s.run).moneyAfter,88);}
 });
 test(spec.branch+': real host continuation, sibling navigation and explicit reset stay separate',()=>{
  const {actions}=spec.build();let s=prologueReducer(initialPrologue(),{type:'NAVIGATE_CHAPTER',chapter:'automation'});s=prologueReducer(s,{type:'BACK_ASSUMPTIONS'});s=prologueReducer(s,{type:spec.open,branch:spec.branch});
  const act=a=>{s=prologueReducer(s,{type:spec.edit,action:spec.core?{type:spec.core,action:a}:a});};
  for(const a of actions)act(a);const parent=s[spec.field],old=structuredClone(parent),child=spec.child?parent[spec.child]:parent;assert.equal(parent.phase,'conclusion');
  act(spec.again(child));const next=structuredClone(s[spec.field]);assert.equal(next.phase,'lab');assert.deepEqual(spec.receipt(spec.child?next[spec.child]:next),spec.receipt(child));assert.deepEqual(restorePrologue(JSON.stringify(s)),s);
  s=prologueReducer(s,{type:'BACK_ASSUMPTIONS'});s=prologueReducer(s,{type:spec.open,branch:spec.branch});assert.deepEqual(s[spec.field],next,'re-entering returns to the editable plan, not intro');
  s=prologueReducer(s,{type:spec.edit,action:{type:'RESTART'}});assert.equal(s[spec.field].phase,'intro');assert.equal(s[spec.field][spec.child],undefined);assert.deepEqual(old,parent);
  s=prologueReducer(s,{type:'BACK_ASSUMPTIONS'});s=prologueReducer(restorePrologue(JSON.stringify(s)),{type:spec.open,branch:spec.branch});assert.equal(s[spec.field].phase,'intro','archived conclusion cannot resurrect cleared receipts');
 });
}

test('care reopening invalidates stale actions without paying or running the unchanged plan',()=>{
 const spec=specs.find(s=>s.branch==='services'),{s}=spec.build(),next=careRoutingReducer(s,spec.again(s));
 assert.equal(careRoutingReducer(next,{type:'RUN',expectedRevision:s.revision}),next);
 assert.equal(careRoutingReducer(next,{type:'RUN',expectedRevision:next.revision}),next);
 assert.equal(careRoutingReducer(next,{type:'COVER',people:[4],expectedRevision:s.revision}),next);
 assert.equal(careRoutingReducer(s,{type:'REOPEN',expectedRevision:s.revision-1}),s);
});

test('continuing or clearing care never changes any of five completed sibling experiments',()=>{
 let s=prologueReducer(initialPrologue(),{type:'NAVIGATE_CHAPTER',chapter:'automation'});s=prologueReducer(s,{type:'BACK_ASSUMPTIONS'});const completed={};
 for(const spec of specs){s=prologueReducer(s,{type:spec.open,branch:spec.branch});for(const a of spec.build().actions)s=prologueReducer(s,{type:spec.edit,action:spec.core?{type:spec.core,action:a}:a});completed[spec.branch]=structuredClone(s[spec.field]);s=prologueReducer(s,{type:'BACK_ASSUMPTIONS'});}
 const care=specs.find(v=>v.branch==='services');s=prologueReducer(s,{type:care.open,branch:care.branch});const action=care.again(s.needsTechnology.care);
 s=prologueReducer(s,{type:'NEEDS',action:{type:'CARE',action}});assert.equal(s.needsTechnology.phase,'lab');
 s=prologueReducer(s,{type:'NEEDS',action:{type:'RESTART'}});s=prologueReducer(s,{type:'BACK_ASSUMPTIONS'});
 for(const spec of specs.filter(v=>v!==care)){s=prologueReducer(restorePrologue(JSON.stringify(s)),{type:spec.open,branch:spec.branch});assert.deepEqual(s[spec.field],completed[spec.branch]);s=prologueReducer(s,{type:'BACK_ASSUMPTIONS'});}
 s=prologueReducer(s,{type:care.open,branch:care.branch});assert.equal(s.needsTechnology.phase,'intro');assert.equal(s.prologueStatus,'notStarted');assert.deepEqual(s.reliefCompleted,[],'comparison controls never fabricate preceding-story completion');
});
