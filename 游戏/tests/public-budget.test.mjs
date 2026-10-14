import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPublicDemand,publicDemandReducer as reduce,publicDemandAccount as account,demandTrialAccount,restorePublicDemand} from '../lib/public-demand.ts';

const commit=(s,type,extra={})=>reduce(s,{type,expectedRevision:s.revision,...extra});
const begin=()=>reduce(initialPublicDemand(true),{type:'BEGIN'});
const income=(s,roll,person,day)=>reduce(s,{type:'INCOME',roll,to:{person,day}});
function deliver(s,person){const bread=account(s).inventory.find(id=>!s.orders.includes(id));s=reduce(s,{type:'MATCH',bread,person});return commit(s,'DELIVER',{person});}
function verify(a){
 assert.equal(a.moneyAfter,148);
 assert.equal(a.stock+a.periods.reduce((n,p)=>n+p.sold,0),a.periods.reduce((n,p)=>n+p.produced,0));
 const cash={firm:40,publicFund:32,lender:40,employer:24,supplier:0,...Object.fromEntries(Array.from({length:6},(_,i)=>['person-'+i,2]))};
 for(const t of a.transfers){assert(Number.isInteger(t.amount)&&t.amount>0);assert(cash[t.from]>=t.amount);cash[t.from]-=t.amount;cash[t.to]+=t.amount;}
 for(const key of Object.keys(cash))assert.equal(cash[key],a[key]??a.wallets[Number(key.slice(7))]);
 assert(a.periods.every(p=>p.purchases.every((n,i)=>n+p.provided[i]<=2)));
 assert.deepEqual(a.periods.map(p=>p.produced),a.machine?[12,18].slice(0,a.periods.length):Array(a.periods.length).fill(12));
}
test('income, meals and private equipment compete for the same real public budget',()=>{
 let s=begin();s=reduce(s,{type:'MACHINE',enabled:true});for(let i=0;i<12;i++)s=income(s,i,Math.floor(i/2),1);
 assert.equal(account(s).plannedCost,36);assert.equal(account(s).publicFund,32);assert.equal(account(s).canFund,false);assert.equal(commit(s,'FUND'),s);
 for(let i=6;i<12;i++)s=reduce(s,{type:'INCOME',roll:i,to:null});
 assert.equal(account(s).plannedCost,24);s=commit(s,'FUND');assert.equal(account(s).publicFund,8);assert.equal(account(s).employer,24);
 assert.equal(account(s).transfers.filter(t=>t.kind==='equipment').length,1);assert.equal(account(s).machineOwner,'private-bakery');verify(account(s));
 assert.equal(reduce(s,{type:'MACHINE',enabled:false}),s);assert.deepEqual(restorePublicDemand(s),s);
});
test('equipment is paid once, does not change already produced bread and only accelerates tomorrow',()=>{
 let s=begin();s=reduce(s,{type:'MACHINE',enabled:true});assert.equal(account(s).machine,false);assert.equal(account(s).periods[0].produced,12);
 s=commit(s,'FUND');assert.equal(account(s).publicFund,20);assert.equal(account(s).periods[0].produced,12);
 s=commit(s,'NEXT');assert.equal(account(s).periods[1].produced,18);assert.equal(account(s).machine,true);assert.equal(reduce(s,{type:'MACHINE',enabled:false}),s);
 s=commit(s,'FUND');s=commit(s,'NEXT');assert.equal(account(s).stock,18);assert.equal(account(s).publicFund,20);assert.equal(account(s).transfers.filter(t=>t.kind==='equipment').length,1);verify(account(s));
 assert.deepEqual(restorePublicDemand(s),s);assert.deepEqual(demandTrialAccount(s.run).periods,account(s).periods);
});
test('food orders leave people fed, capital orders expand output but reduce funded coverage',()=>{
 function run(machine){let s=begin();if(machine)s=reduce(s,{type:'MACHINE',enabled:true});for(let day=1;day<=2;day++){s=commit(s,'FUND');for(let i=0;i<6&&account(s).publicFund>=2;i++)s=deliver(s,i);s=commit(s,'NEXT');}verify(account(s));return s;}
 const food=run(false),machine=run(true);assert.deepEqual(account(food).periods.map(p=>p.sold),[12,12]);assert.equal(account(food).stock,0);assert.equal(account(food).publicFund,8);
 assert.deepEqual(account(machine).periods.map(p=>p.sold),[12,10]);assert.equal(account(machine).stock,8);assert.equal(account(machine).publicFund,0);assert.deepEqual(account(machine).periods[1].provided,[1,1,1,1,0,0]);
 assert.equal(commit(machine,'DELIVER',{person:5}),machine);assert.deepEqual(restorePublicDemand(machine),machine);
});
test('one physical tray delivers only matched loaves, pays each order once and rejects stale drops',()=>{
 let s=commit(begin(),'FUND');const before=account(s),revision=s.revision;
 assert.equal(commit(s,'DELIVER_BATCH'),s);for(let i=0;i<6;i++)s=reduce(s,{type:'MATCH',bread:before.inventory[i],person:i});
 assert.equal(account(s).publicFund,32);assert.equal(account(s).stock,6);assert.equal(reduce(s,{type:'DELIVER_BATCH',expectedRevision:revision}),s);
 const delivered=commit(s,'DELIVER_BATCH');assert.equal(account(delivered).publicFund,20);assert.equal(account(delivered).stock,0);assert.equal(delivered.deliveries.length,6);assert.equal(commit(delivered,'DELIVER_BATCH'),delivered);verify(account(delivered));
 s=commit(delivered,'NEXT');for(let i=0;i<6;i++)s=income(s,i,i,2);s=commit(s,'FUND');assert.equal(account(s).publicFund,8);assert.equal(account(s).stock,0);assert.deepEqual(restorePublicDemand(s),s);
});
test('future income is an unpaid draft, not a guarantee after todays spending',()=>{
 let s=begin();s=reduce(s,{type:'MACHINE',enabled:true});for(let i=0;i<6;i++)s=income(s,i,i,1);for(let i=6;i<12;i++)s=income(s,i,i-6,2);
 s=commit(s,'FUND');assert.equal(account(s).publicFund,8);s=commit(s,'NEXT');assert.equal(account(s).plannedCost,12);assert.equal(account(s).canFund,false);const cash=account(s).publicFund;
 assert.equal(commit(s,'FUND'),s);assert.equal(account(s).publicFund,cash);assert.equal(reduce(s,{type:'INCOME',roll:0,to:null}),s);
 for(let i=10;i<12;i++)s=reduce(s,{type:'INCOME',roll:i,to:null});s=commit(s,'FUND');s=commit(s,'NEXT');assert.equal(account(s).publicFund,0);assert.equal(account(s).stock,8);verify(account(s));
});
test('borrowing may repay successfully, but income is paid by the declared source',()=>{
 let s=begin();for(let i=0;i<6;i++)s=reduce(s,{type:'LOAN',person:i,enabled:true});for(let i=0;i<12;i++)s=income(s,i,Math.floor(i/2),2);
 s=commit(s,'FUND');s=commit(s,'NEXT');s=commit(s,'FUND');for(let i=0;i<6;i++)s=commit(s,'REPAY',{person:i});s=commit(s,'SHOP');s=commit(s,'NEXT');
 assert.equal(account(s).debtTotal,0);assert.equal(account(s).publicFund,8);assert.equal(account(s).employer,24);assert.deepEqual(account(s).periods.map(p=>p.sold),[12,6]);verify(account(s));
});
test('old records retain old funding; switching creates an explicit independent comparison',()=>{
 let old=reduce(initialPublicDemand(),{type:'BEGIN'});for(let day=1;day<=2;day++){for(let i=0;i<6;i++)old=income(old,(day-1)*6+i,i,day);old=commit(old,'FUND');old=commit(old,'NEXT');}
 const saved=structuredClone(old);assert.equal(account(old).employer,0);assert.equal(account(old).publicFund,32);assert.deepEqual(restorePublicDemand(old),old);
 let next=reduce(old,{type:'SHARED_BEGIN'});assert.equal(next.sharedBudget,true);assert.equal(next.trials.length,1);assert.equal(account(next).publicFund,32);assert.equal(account(next).employer,24);assert.deepEqual(old,saved);
 for(let i=0;i<2;i++){next=commit(next,'FUND');next=commit(next,'NEXT');}assert.equal(next.trials.length,2);assert.equal(account(next).canConclude,false);assert.equal(reduce(next,{type:'CONCLUDE'}),next);
 next=reduce(next,{type:'RETRY'});next=reduce(next,{type:'MACHINE',enabled:true});for(let i=0;i<2;i++){next=commit(next,'FUND');next=commit(next,'NEXT');}assert.equal(account(next).canConclude,true);next=reduce(next,{type:'CONCLUDE'});assert.deepEqual(restorePublicDemand(next),next);
});
test('restore rejects fabricated machines, overspending, mixed funding and illegal new receipts',()=>{
 const s=commit(reduce(begin(),{type:'MACHINE',enabled:true}),'FUND');
 for(const mutate of [x=>x.machinePaid=false,x=>delete x.sharedBudget,x=>x.machineDraft=false,x=>x.machinePaid=1,x=>x.trials.push({loans:Array(6).fill(false),income:Array(12).fill({person:0,day:1}),deliveries:[],sharedBudget:true,machine:true})]){const bad=structuredClone(s);mutate(bad);assert.equal(restorePublicDemand(bad),null);}
 assert.deepEqual(restorePublicDemand({...s,publicFund:999,machineOwner:'public'}),s);
 const trial={loans:Array(6).fill(false),income:Array.from({length:12},(_,i)=>({person:Math.floor(i/2),day:1})),deliveries:[],sharedBudget:true,machine:true};assert.throws(()=>demandTrialAccount(trial));
});

test('retry from the actual shared-budget conclusion keeps every completed comparison',()=>{
 let s=begin();for(let i=0;i<2;i++){s=commit(s,'FUND');s=commit(s,'NEXT');}s=reduce(s,{type:'RETRY'});s=reduce(s,{type:'MACHINE',enabled:true});for(let i=0;i<2;i++){s=commit(s,'FUND');s=commit(s,'NEXT');}s=reduce(s,{type:'CONCLUDE'});assert.equal(s.phase,'conclusion');const again=reduce(s,{type:'RETRY'});assert.equal(again.phase,'lab');assert.equal(again.sharedBudget,true);assert.deepEqual(again.trials,s.trials);assert.equal(account(again).publicFund,32);assert.deepEqual(restorePublicDemand(again),again);
});
