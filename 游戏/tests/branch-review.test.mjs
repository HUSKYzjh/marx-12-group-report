import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPrologue,prologueReducer,restorePrologue} from '../lib/prologue-state.ts';
import {branchReviews,BRANCH_CONNECTIONS} from '../lib/branch-review.ts';
import {assumptionObservations} from '../lib/assumption-observations.ts';
import {IF_BRANCHES} from '../lib/assumption-route-progress.ts';
import {initialAutomation,automationReducer} from '../lib/automation-experiment.ts';
import {initialTimeCalendar,timeCalendarReducer} from '../lib/time-calendar.ts';
import {initialSpaceFreight,freightReducer,freightAccount} from '../lib/space-freight.ts';
import {initialCareRouting,careRoutingReducer} from '../lib/care-routing.ts';
import {initialPlatformNetwork,platformNetworkReducer} from '../lib/platform-network.ts';
import {initialSharingCouncil,sharingCouncilReducer} from '../lib/sharing-council.ts';
import {initialPublicDemand,publicDemandReducer,publicDemandAccount} from '../lib/public-demand.ts';
import {initialPreservation,preservationReducer} from '../lib/preservation-workbench.ts';
const apply=(s,reduce,a)=>reduce(s,{...a,...('revision'in s?{expectedRevision:s.revision}:{})});
function whole(branch,core){
 const s=initialPrologue();
 if(branch==='automation')s.technology=core;
 else if(branch==='time')s.technology={...initialAutomation('time'),phase:core.phase,calendar:core};
 else if(['space','services'].includes(branch))s.needsTechnology={branch,phase:core.phase,[branch==='space'?'freight':'care']:core};
 else if(['concentration','sharing'].includes(branch))s.ownershipTechnology={branch,phase:core.phase,[branch==='concentration'?'network':'council']:core};
 else s.marketRules={branch,phase:core.phase,[branch==='policy'?'demand':'workbench']:core};
 return s;
}
function freightRun(s){for(let i=0;i<3;i++){
 s=freightReducer(s,{type:'PRODUCE',expectedRound:i});const a=freightAccount(s,s.pending),wanted={...a.wanted};let slot=0;
 for(const crate of a.crates)if(slot<a.loadLimit&&wanted[crate.kind]>0){s=freightReducer(s,{type:'LOAD',crate:crate.id,slot:slot++});wanted[crate.kind]--;}
 s=freightReducer(s,{type:'LAUNCH',expectedRound:i});
 }return s;}
function demandRun(s){for(let day=1;day<=2;day++){
 s=apply(s,publicDemandReducer,{type:'FUND'});
 if(day===2){if(s.loans[0])s=apply(s,publicDemandReducer,{type:'REPAY',person:0});s=apply(s,publicDemandReducer,{type:'SHOP'});}
 const a=publicDemandAccount(s),who=a.periods.at(-1).purchases.findIndex(n=>n<2);
 if(who>=0&&a.inventory.length)s=publicDemandReducer(s,{type:'MATCH',bread:a.inventory[0],person:who});
 s=apply(s,publicDemandReducer,{type:'DELIVER_BATCH'});s=apply(s,publicDemandReducer,{type:'NEXT'});
 }return s;}
function councilRun(s){for(let roll=0;roll<6;roll++)s=sharingCouncilReducer(s,{type:'ROLL',roll,to:roll});s=apply(s,sharingCouncilReducer,{type:'DISTRIBUTE'});s=sharingCouncilReducer(s,{type:'BALLOT',to:'divide'});return apply(s,sharingCouncilReducer,{type:'VOTE'});}
function preservationRun(s){s=apply(s,preservationReducer,{type:'RUN'});s=apply(s,preservationReducer,{type:'NEXT'});return apply(s,preservationReducer,{type:'RUN'});}

const fixtures={
 automation(){let s=automationReducer(initialAutomation(),{type:'BEGIN'});s=automationReducer(s,{type:'RUN'});const first=s;s=automationReducer(s,{type:'MODE',mode:'time'});return [first,automationReducer(s,{type:'RUN'})];},
 time(){let s=timeCalendarReducer(initialTimeCalendar(),{type:'BEGIN'});s=timeCalendarReducer(s,{type:'RUN'});const first=s;s=timeCalendarReducer(s,{type:'FLIP_CONTRACT'});return [first,timeCalendarReducer(s,{type:'RUN'})];},
 space(){let s=freightRun(freightReducer(initialSpaceFreight(true),{type:'BEGIN'}));const first=s;s=freightReducer(s,{type:'RETRY'});s=freightReducer(s,{type:'CONTRACT',order:12});return [first,freightRun(s)];},
 services(){let s=careRoutingReducer(initialCareRouting(),{type:'BEGIN'});s=apply(s,careRoutingReducer,{type:'RUN'});const first=s;s=careRoutingReducer(s,{type:'TOOL',enabled:true});return [first,apply(s,careRoutingReducer,{type:'RUN'})];},
 concentration(){let s=platformNetworkReducer(initialPlatformNetwork(),{type:'BEGIN'});s=apply(s,platformNetworkReducer,{type:'OPERATE'});s=platformNetworkReducer(s,{type:'CONNECT',shop:0,to:'B'});s=apply(s,platformNetworkReducer,{type:'OPERATE'});const first=s;s=platformNetworkReducer(s,{type:'NEXT_RULE',rule:'portable'});return [first,apply(s,platformNetworkReducer,{type:'COMPARE'})];},
 sharing(){let s=councilRun(sharingCouncilReducer(initialSharingCouncil(true),{type:'BEGIN'}));const first=s;s=sharingCouncilReducer(s,{type:'CONDITION',mode:'coop'});return [first,councilRun(s)];},
 policy(){let s=demandRun(publicDemandReducer(initialPublicDemand(true),{type:'BEGIN'}));const first=s;s=publicDemandReducer(s,{type:'RETRY'});s=publicDemandReducer(s,{type:'LOAN',person:0,enabled:true});return [first,demandRun(s)];},
 prices(){let s=preservationRun(preservationReducer(initialPreservation(true),{type:'BEGIN'}));const first=s;s=preservationReducer(s,{type:'RETRY'});s=apply(s,preservationReducer,{type:'CONNECT',tool:'cold',enabled:true});return [first,preservationRun(s)];},
};
for(const branch of IF_BRANCHES)test(branch+': compare two real completed receipts, preserving old results and state',()=>{
 const [first,second]=fixtures[branch](),before=whole(branch,first),after=whole(branch,second),copy=structuredClone(after);
 const a=branchReviews(before)[branch],b=branchReviews(after)[branch];
 assert(a);assert.equal(a.receipts,1);assert.equal(a.previous,null);
 assert(b);assert.equal(b.receipts,2);assert.deepEqual(b.previous,assumptionObservations(before)[branch]);assert.deepEqual(b.latest,assumptionObservations(after)[branch]);assert.deepEqual(after,copy);
 assert(IF_BRANCHES.includes(b.connection.next));assert.notEqual(b.connection.next,branch);assert(b.arrangements.latest.length>10);assert(b.arrangements.previous.length>10);assert.equal(a.arrangements.latest,b.arrangements.previous);
});
test('unplayed routes and incomplete trials have no fabricated review',()=>{assert.deepEqual(branchReviews(initialPrologue()),{});const s=whole('space',freightReducer(initialSpaceFreight(true),{type:'BEGIN'}));assert.deepEqual(branchReviews(s),{});});
test('shared-budget transition compares only receipts using the same funding arrangement',()=>{
 let s=demandRun(publicDemandReducer(initialPublicDemand(),{type:'BEGIN'}));s=publicDemandReducer(s,{type:'SHARED_BEGIN'});s=demandRun(s);
 const r=branchReviews(whole('policy',s)).policy;assert(r);assert.equal(r.receipts,1);assert.equal(r.previous,null);
});
test('related route is optional, conclusion-only, archives actual history and survives reload',()=>{
 let s=prologueReducer(initialPrologue(),{type:'NAVIGATE_CHAPTER',chapter:'automation'});
 assert.equal(prologueReducer(s,{type:'OPEN_RELATED',branch:'time'}),s);
 for(const action of [{type:'BEGIN'},{type:'RUN'},{type:'MODE',mode:'time'},{type:'RUN'},{type:'CONCLUDE'}])s=prologueReducer(s,{type:'TECHNOLOGY',action});
 assert.equal(s.technology.phase,'conclusion');const recorded=structuredClone(s.technology);
 assert.equal(prologueReducer(s,{type:'OPEN_RELATED',branch:'unknown'}),s);
 s=prologueReducer(s,{type:'OPEN_RELATED',branch:BRANCH_CONNECTIONS.automation.next});assert.equal(s.technology.branch,'time');assert.equal(s.technology.phase,'intro');assert.deepEqual(s.branchArchive.automation,recorded);
 assert.equal(s.epilogueBeat,0);assert.equal(s.reliefCompleted.length,0);
 s=restorePrologue(JSON.stringify(s));assert(s);assert.deepEqual(s.branchArchive.automation,recorded);
 s=prologueReducer(s,{type:'BACK_ASSUMPTIONS'});s=prologueReducer(s,{type:'OPEN_TECHNOLOGY',branch:'automation'});assert.deepEqual(s.technology,recorded);
});
