import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSharingCouncil,sharingCouncilReducer as reduce,councilPreferences,councilAccount,councilTrialAccount,restoreSharingCouncil} from '../lib/sharing-council.ts';
import {initialOwnership,ownershipReducer} from '../lib/ownership-experiment.ts';
const begin=()=>reduce(initialSharingCouncil(true),{type:'BEGIN'});
function distribute(counts,mode='coop'){
 let s=reduce(begin(),{type:'CONDITION',mode});s=reduce(s,{type:'LOOSE',enabled:true});
 let coin=0;for(const [id,n]of counts.entries())for(let j=0;j<n;j++)s=reduce(s,{type:'COIN',coin:coin++,to:id===6?'owner':id});
 assert.equal(coin,12);return reduce(s,{type:'DISTRIBUTE',expectedRevision:s.revision});
}
const vote=(s,to='divide')=>{s=reduce(s,{type:'BALLOT',to});return reduce(s,{type:'VOTE',expectedRevision:s.revision});};
test('new entry gives named wishes; legacy snapshots keep independently editable opinions',()=>{
 const fresh=ownershipReducer(initialOwnership('sharing'),{type:'COUNCIL',action:{type:'BEGIN'}});assert.equal(fresh.council.personal,true);
 let old=reduce(initialSharingCouncil(),{type:'BEGIN'});for(let i=0;i<6;i++)old=reduce(old,{type:'ROLL',roll:i,to:i});old=reduce(old,{type:'DISTRIBUTE',expectedRevision:old.revision});
 old=reduce(old,{type:'OPINION',person:0,to:'invest'});assert.equal(old.others[0],'invest');assert.deepEqual(restoreSharingCouncil(old),old);assert.equal(old.personal,undefined);
});
test('same total distribution, different recipients and real reasons change the vote, not its weight',()=>{
 const equal=vote(distribute([2,2,2,2,2,2])),defer=vote(distribute([0,2,2,2,2,4]));
 const a=councilTrialAccount(equal.run),b=councilTrialAccount(defer.run);
 assert.equal(a.firstWorkers,b.firstWorkers);assert.equal(a.firstWorkers,12);assert.equal(a.workers,24);assert.equal(a.outcome,'hold');assert.equal(b.outcome,'divide');assert.equal(b.workers,36);
 assert.deepEqual(a.people.map(p=>p.votes),[1,1,1,1,1,1]);assert.deepEqual(b.people.map(p=>p.votes),[1,1,1,1,1,1]);
 assert.equal(a.people[0].beforeBallotIncome,4);assert.equal(a.people[0].gap,0);assert.equal(a.people[0].preference,'invest');assert.equal(b.people[0].beforeBallotIncome,2);assert.equal(b.people[0].gap,2);assert.equal(b.people[0].preference,'divide');
 assert.equal(a.moneyAfter,88);assert.equal(b.moneyAfter,88);assert.equal(b.people[0].income,4);assert.equal(b.people[0].gap,2,'later distribution does not rewrite the reason for the past vote');
});
test('no secret proxy votes, no preference changes from uncommitted coins, no repeated payout',()=>{
 let s=begin();const old=s.others.slice();for(let i=0;i<6;i++)s=reduce(s,{type:'ROLL',roll:i,to:i});assert.deepEqual(s.others,old);assert.equal(councilAccount(s.mode,s.paid,null,s.others,true).firstWorkers,0);
 s=reduce(s,{type:'DISTRIBUTE',expectedRevision:s.revision});assert.deepEqual(s.others,['invest','divide','divide','invest','invest']);
 assert.equal(reduce(s,{type:'OPINION',person:0,to:'divide'}),s);assert.equal(reduce(s,{type:'ROLL',roll:0,to:1}),s);
 const voted=vote(s);assert.equal(reduce(voted,{type:'VOTE',expectedRevision:voted.revision}),voted);assert.deepEqual(restoreSharingCouncil(voted),voted);
});
test('bonuses and minority rights cannot purchase decision weights, even when opinions change',()=>{
 for(const mode of ['bonus','minority']){
  const s=vote(distribute([2,4,3,1,1,1],mode)),a=councilTrialAccount(s.run);
  assert.deepEqual(s.others,Array(5).fill('invest'));assert.equal(a.outcome,'invest');assert.equal(a.equipmentSupplier,12);
  assert.equal(a.ownerVotes,mode==='bonus'?1:7);assert.deepEqual(a.people.map(p=>p.votes),Array(6).fill(mode==='bonus'?0:1));assert.equal(a.moneyAfter,88);
 }
});
test('identity matters to personal comparisons; moving equivalent coin identities does not add a trial',()=>{
 let s=vote(distribute([2,2,2,2,2,2]));s=reduce(s,{type:'RETRY'});for(const [roll,id]of [0,1,2,3,5,4].entries())s=reduce(s,{type:'ROLL',roll,to:id});s=reduce(s,{type:'DISTRIBUTE',expectedRevision:s.revision});s=vote(s);assert.equal(s.trials.length,1,'same recipient amounts');
 s=reduce(s,{type:'RETRY'});for(const [roll,id]of [5,1,2,3,4,5].entries())s=reduce(s,{type:'ROLL',roll,to:id});s=reduce(s,{type:'DISTRIBUTE',expectedRevision:s.revision});s=vote(s);assert.equal(s.trials.length,2);assert.deepEqual(restoreSharingCouncil(s),s);
});
test('actual first-payment profiles conserve funded coins and restore throughout',()=>{
 for(let a=0;a<=12;a++)for(let b=0;b<=12-a;b++)for(const mode of ['bonus','minority','coop']){
  const s=vote(distribute([a,b,12-a-b,0,0,0])),run={...s.run,mode},account=councilTrialAccount(run);
  assert.deepEqual(run.others,councilPreferences(run.allocation));assert.equal(account.moneyAfter,88);
  const wallets={firm:40,buyers:48,supplier:0,owner:0,equipmentSupplier:0,...Object.fromEntries(Array.from({length:6},(_,id)=>['worker-'+id,0]))};
  for(const t of account.transfers){assert(Number.isInteger(t.amount)&&wallets[t.from]>=t.amount);wallets[t.from]-=t.amount;wallets[t.to]+=t.amount;}assert.equal(wallets.firm,account.firm);assert.deepEqual(restoreSharingCouncil(s),s);
 }
});
test('restore rejects fabricated motives, mixed rules and flags without rewriting paid histories',()=>{
 const s=vote(distribute([2,2,2,2,2,2]));
 for(const mutate of [x=>x.personal=false,x=>delete x.personal,x=>x.others[0]='divide',x=>delete x.run.personal,x=>x.trials[0].others[0]='divide',x=>x.paid[0]=1]){const bad=structuredClone(s);mutate(bad);assert.equal(restoreSharingCouncil(bad),null);}
 const copy=restoreSharingCouncil(s);copy.run.allocation[0]=1;assert.notDeepEqual(copy.run.allocation,s.run.allocation);
 assert.throws(()=>councilAccount('coop',s.paid,'divide',Array(5).fill('divide'),true));
});
