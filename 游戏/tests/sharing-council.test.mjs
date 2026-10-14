import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSharingCouncil,sharingCouncilReducer as reduce,councilAccount as account,councilTrialAccount,restoreSharingCouncil} from '../lib/sharing-council.ts';
import {initialOwnership,ownershipReducer,restoreOwnership,sharingAccount} from '../lib/ownership-experiment.ts';
const begin=()=>reduce(initialSharingCouncil(),{type:'BEGIN'}),pay=s=>reduce(s,{type:'DISTRIBUTE',expectedRevision:s.revision}),vote=s=>reduce(s,{type:'VOTE',expectedRevision:s.revision});
const equal=s=>{for(let i=0;i<6;i++)s=reduce(s,{type:'ROLL',roll:i,to:i});return s;};
const oldAllocation=mode=>mode==='minority'?[0,1,2,3,4,5,...Array(6).fill('owner')]:Array.from({length:12},(_,i)=>Math.floor(i/2));
test('all six old uniform benchmarks can be arranged with actual coin recipients and counted ballots',()=>{
 for(const mode of ['bonus','minority','coop'])for(const ballot of ['divide','invest']){
  const a=account(mode,oldAllocation(mode),ballot),old=sharingAccount(mode,ballot);
  for(const k of ['firstWorkers','firstOwner','extraWorkers','equipment','firm','workers','owner','supplier','equipmentSupplier','buyers','workerWeight','ownerVotes','divideVotes','investVotes','outcome','moneyAfter'])assert.deepEqual(a[k],old[k]);
  assert.deepEqual(a.people.map(p=>p.income),old.people.map(p=>p.income));
 }
});
function* compositions(total,bins,prefix=[]){if(bins===1){yield [...prefix,total];return;}for(let n=0;n<=total;n++)yield*compositions(total-n,bins-1,[...prefix,n]);}
test('every integer distribution of twelve coins preserves finite funded accounts and cannot buy votes',()=>{
 let checked=0;for(const mode of ['bonus','minority','coop'])for(const counts of compositions(12,mode==='coop'?6:7)){
  const allocation=counts.flatMap((n,i)=>Array(n).fill(i===6?'owner':i));for(const ballot of ['divide','invest']){
   const a=account(mode,allocation,ballot);assert.equal(a.moneyAfter,88);assert.equal(a.firstWorkers+a.firstOwner,12);assert.equal(a.ownerVotes,mode==='bonus'?1:mode==='minority'?7:0);assert(a.people.every(p=>p.votes===(mode==='bonus'?0:1)&&Number.isInteger(p.income)&&p.income>=2));assert([a.firm,a.workers,a.owner,a.supplier,a.equipmentSupplier].every(v=>Number.isInteger(v)&&v>=0));checked++;
  }
 }assert.equal(checked,86632);
});
test('all 64 preference profiles in three constitutions have real majority, tie or minority outcomes',()=>{
 for(const mode of ['bonus','minority','coop'])for(let mask=0;mask<64;mask++){
  const others=Array.from({length:5},(_,i)=>mask&(1<<i)?'invest':'divide'),ballot=mask&32?'invest':'divide',a=account(mode,oldAllocation(mode),ballot,others);
  const divide=[...others,ballot].filter(b=>b==='divide').length*(mode==='bonus'?0:1),invest=6*(mode==='bonus'?0:1)-divide+(mode==='bonus'?1:mode==='minority'?7:0);
  assert.equal(a.divideVotes,divide);assert.equal(a.investVotes,invest);assert.equal(a.outcome,divide===invest?'hold':divide>invest?'divide':'invest');assert.equal(a.moneyAfter,88);
  const balances={firm:40,buyers:48,supplier:0,owner:0,equipmentSupplier:0,...Object.fromEntries(Array.from({length:6},(_,i)=>['worker-'+i,0]))};for(const t of a.transfers){assert(balances[t.from]>=t.amount);balances[t.from]-=t.amount;balances[t.to]+=t.amount;}assert.equal(balances.firm,a.firm);assert.equal(balances.owner,a.owner);assert.deepEqual(a.people.map(p=>p.income),Array.from({length:6},(_,i)=>balances['worker-'+i]));
 }
 const invested=account('coop',oldAllocation('coop'),'invest',Array(5).fill('invest'));assert.equal(invested.equipment,12);assert.equal(invested.extraWorkers,0);
});
test('draft income, splitting, returning coins and opinion changes never alter already paid money',()=>{
 let s=begin();assert.strictEqual(pay(s),s);assert.strictEqual(reduce(s,{type:'BALLOT',to:'divide'}),s);s=reduce(s,{type:'ROLL',roll:0,to:5});assert.equal(account(s.mode,s.paid).workers,12);
 s=reduce(s,{type:'LOOSE',enabled:true});s=reduce(s,{type:'COIN',coin:0,to:0});assert.strictEqual(reduce(s,{type:'LOOSE',enabled:false}),s);s=reduce(s,{type:'COIN',coin:1,to:0});s=reduce(s,{type:'LOOSE',enabled:false});assert.equal(s.loose,false);s=reduce(s,{type:'ROLL',roll:0,to:null});assert.equal(s.allocation[0],null);
 s=pay(equal(s));const paid=s.paid.slice(),a=account(s.mode,s.paid);assert.strictEqual(pay(s),s);assert.strictEqual(reduce(s,{type:'ROLL',roll:1,to:'owner'}),s);assert.strictEqual(reduce(s,{type:'CONDITION',mode:'coop'}),s);
 s=reduce(s,{type:'BALLOT',to:'divide'});s=reduce(s,{type:'BALLOT',to:null});s=reduce(s,{type:'OPINION',person:0,to:'invest'});assert.deepEqual(s.paid,paid);assert.deepEqual(account(s.mode,s.paid),a);assert.equal(s.trials.length,0);assert.strictEqual(vote(s),s);
});
test('same income need not confer same power; outcome is committed once, stale events do not double pay',()=>{
 let s=pay(equal(begin()));s=reduce(s,{type:'BALLOT',to:'divide'});const rev=s.revision;s=vote(s);assert.equal(account(s.mode,s.paid,s.run.ballot).outcome,'invest');assert.strictEqual(vote(s),s);assert.strictEqual(reduce(s,{type:'BALLOT',to:'invest'}),s);assert.strictEqual(reduce(s,{type:'CONCLUDE'}),s);
 s=reduce(s,{type:'CONDITION',mode:'coop'});assert.equal(account(s.mode,s.paid).workers,12);s=pay(equal(s));s=reduce(s,{type:'BALLOT',to:'divide'});assert.strictEqual(reduce(s,{type:'VOTE',expectedRevision:rev}),s);s=vote(s);assert.equal(s.trials.length,2);assert.equal(councilTrialAccount(s.run).outcome,'divide');assert.equal(councilTrialAccount(s.run).workers,36);assert.equal(reduce(s,{type:'CONCLUDE'}).phase,'conclusion');
});
test('cooperative ties retain funds and explicit changed preferences can pass investment',()=>{
 let s=reduce(begin(),{type:'CONDITION',mode:'coop'});assert.strictEqual(reduce(s,{type:'ROLL',roll:0,to:'owner'}),s);s=pay(equal(s));s=reduce(s,{type:'BALLOT',to:'invest'});s=vote(s);assert.equal(councilTrialAccount(s.run).outcome,'hold');assert.equal(councilTrialAccount(s.run).firm,52);
 s=pay(equal(reduce(s,{type:'RETRY'})));s=reduce(s,{type:'OPINION',person:2,to:'invest'});s=reduce(s,{type:'BALLOT',to:'invest'});s=vote(s);assert.equal(councilTrialAccount(s.run).outcome,'invest');assert.equal(councilTrialAccount(s.run).firm,40);assert.equal(councilTrialAccount(s.run).equipmentSupplier,12);
});
test('restoration rejects unpaid outcomes, forged recipients, duplicates and contradictory histories',()=>{
 let s=begin();for(const state of [initialSharingCouncil(),s,equal(s),pay(equal(s))])assert.deepEqual(restoreSharingCouncil(state),state);
 s=reduce(pay(equal(s)),{type:'BALLOT',to:'divide'});s=vote(s);assert.deepEqual(restoreSharingCouncil({...s,workers:999,moneyAfter:999}),s);const copy=restoreSharingCouncil(s);copy.run.allocation[0]='owner';assert.notDeepEqual(copy.run.allocation,s.run.allocation);
 for(const bad of [{...s,paid:null},{...s,step:'money'},{...s,ballot:null},{...s,allocation:Array(12).fill(8)},{...s,mode:'coop',allocation:Array(12).fill('owner')},{...s,others:[]},{...s,trials:[...s.trials,...s.trials]},{...s,phase:'conclusion'},{...s,revision:-1}])assert.equal(restoreSharingCouncil(bad),null);
 assert.throws(()=>account('coop',Array(12).fill('owner'),'divide'));assert.throws(()=>account('bonus',null,'divide'));
});
test('nested state uses the sharing branch only and preserves old played snapshots',()=>{
 let t=initialOwnership('sharing');t=ownershipReducer(t,{type:'COUNCIL',action:{type:'BEGIN'}});assert(t.council);assert.deepEqual(restoreOwnership(t),t);assert.strictEqual(ownershipReducer(t,{type:'VOTE'}),t);assert.equal(restoreOwnership({...t,network:{}}),null);
 const old=ownershipReducer(initialOwnership('sharing'),{type:'BEGIN'});assert.strictEqual(ownershipReducer(old,{type:'COUNCIL',action:{type:'BEGIN'}}),old);assert.deepEqual(restoreOwnership(old),old);assert.strictEqual(ownershipReducer(initialOwnership('concentration'),{type:'COUNCIL',action:{type:'BEGIN'}}).council,undefined);
});
