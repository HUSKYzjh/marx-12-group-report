import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPublicDemand,publicDemandReducer as reduce,publicDemandAccount as account,demandTrialAccount,restorePublicDemand} from '../lib/public-demand.ts';
import {initialRules,rulesReducer,restoreRules,policyAccount} from '../lib/market-rules-experiment.ts';
import {initialPrologue,prologueReducer,restorePrologue} from '../lib/prologue-state.ts';
const begin=()=>reduce(initialPublicDemand(),{type:'BEGIN'});
const commit=(s,type,extra={})=>reduce(s,{type,expectedRevision:s.revision,...extra});
const fund=s=>commit(s,'FUND');
function shop(s){for(let i=0;i<6;i++)if(s.loanPaid[i])s=commit(s,'REPAY',{person:i});return s.step==='repay'?commit(s,'SHOP'):s;}
function deliver(s,i){s=reduce(s,{type:'MATCH',person:i,bread:account(s).inventory.find(id=>!s.orders.includes(id))});return commit(s,'DELIVER',{person:i});}
function finish(s){s=fund(s);s=commit(s,'NEXT');s=shop(fund(s));return commit(s,'NEXT');}
function verify(a){assert.equal(a.moneyAfter,148);assert.equal(a.stock+a.periods.reduce((n,p)=>n+p.sold,0),12*a.periods.length);for(const v of [a.firm,a.publicFund,a.lender,a.employer,a.supplier,...a.wallets,...a.debt])assert(Number.isInteger(v)&&v>=0);const wallets={firm:40,publicFund:32,lender:40,employer:24,supplier:0,...Object.fromEntries(Array.from({length:6},(_,i)=>['person-'+i,2]))};for(const t of a.transfers){assert(t.amount>0&&Number.isInteger(t.amount));assert(wallets[t.from]>=t.amount);wallets[t.from]-=t.amount;wallets[t.to]+=t.amount;}assert.equal(wallets.firm,a.firm);assert(a.periods.every(p=>p.purchases.every((n,i)=>n+p.provided[i]<=2)));}

test('repayment pictures describe actual transfers, not notes or later shopping',()=>{
 let s=begin();s=reduce(s,{type:'LOAN',person:5,enabled:true});s=reduce(s,{type:'LOAN',person:0,enabled:true});
 assert.deepEqual(account(s).repayments,[]);s=fund(s);s=commit(s,'NEXT');
 s=reduce(s,{type:'INCOME',roll:0,to:{person:0,day:2}});s=reduce(s,{type:'INCOME',roll:1,to:{person:0,day:2}});s=fund(s);
 assert.deepEqual(account(s).repayments,[]);
 // Review in reverse order: the per-person wallet is exact, without inventing
 // a chronological lender balance that is not persisted in this model.
 s=commit(s,'REPAY',{person:5});assert.deepEqual(account(s).repayments,[{person:5,amount:2,walletBefore:2,walletAfter:0,debtAfter:1}]);
 s=commit(s,'REPAY',{person:0});const receipts=account(s).repayments;
 assert.deepEqual(receipts,[{person:0,amount:3,walletBefore:6,walletAfter:3,debtAfter:0},{person:5,amount:2,walletBefore:2,walletAfter:0,debtAfter:1}]);
 s=commit(s,'SHOP');assert.equal(account(s).wallets[0],1);assert.deepEqual(account(s).repayments,receipts,'shopping cannot rewrite the earlier payment wallet');
 assert.deepEqual(account(restorePublicDemand(s)).repayments,receipts);assert.equal(account(s).moneyAfter,148);
 assert.deepEqual(account(restorePublicDemand({...s,repayments:[{person:0,amount:999}],lender:999})).repayments,receipts,'forged presentation receipts are ignored on restore');
 const unchanged=commit(s,'REPAY',{person:0});assert.deepEqual(account(unchanged).repayments,receipts);
 s=commit(s,'NEXT');assert.deepEqual(account(reduce(s,{type:'RETRY'})).repayments,[]);
});

test('drafts cannot pay, production precedes funding, returns and zero-loan days work',()=>{
 const intro=initialPublicDemand();assert.equal(account(intro).stock,0);assert.equal(account(intro).firm,40);let s=begin();assert.equal(account(s).firm,28);assert.deepEqual(account(s).wallets,Array(6).fill(3));assert.equal(account(s).stock,12);
 s=reduce(s,{type:'LOAN',person:2,enabled:true});s=reduce(s,{type:'INCOME',roll:0,to:{person:0,day:2}});assert.equal(account(s).lender,40);assert.equal(account(s).employer,24);assert.equal(account(s).debtTotal,0);
 s=reduce(s,{type:'LOAN',person:2,enabled:false});s=reduce(s,{type:'INCOME',roll:0,to:null});s=finish(s);assert.deepEqual(account(s).periods.map(p=>p.sold),[6,6]);assert.equal(account(s).stock,12);assert.equal(s.trials.length,1);assert.equal(reduce(s,{type:'CONCLUDE'}),s);verify(account(s));assert.deepEqual(restorePublicDemand(s),s);
});
test('signed individual loans mature; payment and remaining debt persist without printing cash',()=>{
 let s=begin();for(let i=0;i<6;i++)s=reduce(s,{type:'LOAN',person:i,enabled:true});s=fund(s);assert.equal(account(s).periods[0].sold,12);assert.equal(account(s).lender,28);assert.equal(account(s).debtTotal,18);assert.equal(commit(s,'FUND'),s);
 s=commit(s,'NEXT');assert.equal(account(s).debtTotal,18);assert.equal(account(s).stock,12);s=fund(s);assert.equal(s.step,'repay');assert.equal(commit(s,'SHOP'),s);const before=account(s);s=commit(s,'REPAY',{person:0});assert.equal(account(s).debt[0],1);assert.equal(account(s).lender,before.lender+2);assert.equal(commit(s,'REPAY',{person:0}),s);s=shop(s);s=commit(s,'NEXT');assert.equal(account(s).debtTotal,6);assert.deepEqual(account(s).periods.map(p=>p.sold),[12,0]);verify(account(s));assert.deepEqual(restorePublicDemand(s),s);
});
test('procurement requires matching and physical delivery; personal use and cash cannot double-count',()=>{
 let s=fund(begin());const before=account(s),id=before.inventory[0];s=reduce(s,{type:'MATCH',bread:id,person:0});assert.deepEqual(account(s),before);assert.equal(commit(s,'NEXT'),s);assert.equal(reduce(s,{type:'MATCH',bread:'2:0',person:1}),s);
 const stale=s.revision;s=reduce(s,{type:'MATCH',bread:id,person:null});assert.equal(reduce(s,{type:'DELIVER',person:0,expectedRevision:stale}),s);s=deliver(s,0);assert.equal(account(s).firm,before.firm+2);assert.equal(account(s).publicFund,30);assert.equal(account(s).periods[0].provided[0],1);assert.equal(account(s).inventory.includes(id),false);assert.equal(commit(s,'DELIVER',{person:0}),s);assert.equal(reduce(s,{type:'MATCH',bread:account(s).inventory[0],person:0}),s);
 for(let i=1;i<6;i++)s=deliver(s,i);s=commit(s,'NEXT');s=fund(s);for(let i=0;i<6;i++)s=deliver(s,i);s=commit(s,'NEXT');assert.equal(account(s).publicFund,8);assert.equal(account(s).stock,0);assert.deepEqual(account(s).periods.map(p=>p.sold),[12,12]);verify(account(s));
});
test('dated income is finite, private purchases can remove need for procurement, no overnight re-payment',()=>{
 let s=begin();for(let day=1;day<=2;day++)for(let i=0;i<6;i++)s=reduce(s,{type:'INCOME',roll:(day-1)*6+i,to:{person:i,day}});s=fund(s);assert.equal(account(s).employer,12);assert.deepEqual(account(s).periods[0].purchases,Array(6).fill(2));assert.equal(account(s).stock,0);assert.equal(reduce(s,{type:'LOAN',person:0,enabled:true}),s);s=commit(s,'NEXT');const before=account(s);assert.equal(reduce(s,{type:'INCOME',roll:0,to:null}),s);assert.equal(reduce(s,{type:'INCOME',roll:6,to:{person:0,day:1}}),s);assert.deepEqual(account(s),before);s=fund(s);assert.equal(account(s).employer,0);s=commit(s,'NEXT');assert.equal(account(s).stock,0);assert.equal(account(s).firm,64);verify(account(s));
});
test('64 borrowing configurations and 729 individually dated income allocations conserve cash and goods',()=>{
 let count=0;for(let mask=0;mask<64;mask++)for(let code=0;code<729;code++){
  const loans=Array.from({length:6},(_,i)=>!!(mask&(1<<i))),income=Array(12).fill(null);let v=code;for(let i=0;i<6;i++){const d=v%3;v=Math.floor(v/3);if(d)income[i]={person:i,day:d};}
  const t={loans,income,deliveries:[]},a=demandTrialAccount(t);verify(a);assert.equal(a.transfers.filter(p=>p.kind==='income').reduce((n,p)=>n+p.amount,0),income.filter(Boolean).length*2);
  const paid=a.transfers.filter(p=>p.kind==='repayment');assert.equal(a.repayments.length,paid.length);
  for(const r of a.repayments){assert(loans[r.person]);assert.equal(r.walletBefore-r.walletAfter,r.amount);assert.equal(r.debtAfter+r.amount,3);assert.equal(a.debt[r.person],r.debtAfter);assert(paid.some(p=>p.from==='person-'+r.person&&p.to==='lender'&&p.amount===r.amount));}
  count++;
 }assert.equal(count,46656);
});
test('combined partial support and reliable next-period income can change both debts and sales',()=>{
 let s=begin();s=reduce(s,{type:'LOAN',person:0,enabled:true});s=reduce(s,{type:'INCOME',roll:0,to:{person:0,day:2}});s=reduce(s,{type:'INCOME',roll:1,to:{person:0,day:2}});s=reduce(s,{type:'INCOME',roll:2,to:{person:1,day:1}});s=fund(s);assert.equal(account(s).periods[0].purchases[0],2);assert.equal(account(s).periods[0].purchases[1],2);assert.equal(reduce(s,{type:'MATCH',bread:account(s).inventory[0],person:0}),s);s=deliver(s,2);s=commit(s,'NEXT');s=shop(fund(s));assert.equal(account(s).debtTotal,0);assert.equal(account(s).periods[1].purchases[0],1);s=deliver(s,0);s=commit(s,'NEXT');assert.equal(account(s).publicFund,28);assert.equal(account(s).employer,18);assert.equal(account(s).lender,41);verify(account(s));assert.deepEqual(restorePublicDemand(s),s);
});
test('same-origin retries retain real comparisons; equal token identities do not inflate evidence',()=>{
 let s=finish(begin()),trial=structuredClone(s.trials[0]);s=reduce(s,{type:'RETRY'});assert.equal(account(s).firm,28);assert.deepEqual(s.trials[0],trial);s=finish(s);assert.equal(s.trials.length,1);s=reduce(s,{type:'RETRY'});s=reduce(s,{type:'LOAN',person:0,enabled:true});s=finish(s);assert.equal(s.trials.length,2);s=reduce(s,{type:'CONCLUDE'});assert.equal(s.phase,'conclusion');assert.deepEqual(restorePublicDemand(s),s);assert.equal(reduce(s,{type:'NEXT',expectedRevision:s.revision}),s);
});
test('restore rejects impossible receipts, future paid income, forged stage and negative money; derived balances stripped',()=>{
 let s=begin();assert.deepEqual(restorePublicDemand(s),s);s=reduce(s,{type:'INCOME',roll:0,to:{person:2,day:2}});s=fund(s);assert.deepEqual(restorePublicDemand(s),s);s=deliver(s,1);assert.deepEqual(restorePublicDemand({...s,firm:99999}),s);
 for(const mutate of [x=>x.deliveries.push({...x.deliveries[0]}),x=>x.orders[0]='2:0',x=>x.incomePaid[0]={person:2,day:2},x=>x.step='result',x=>x.reviewed[0]=true]){const bad=structuredClone(s);mutate(bad);assert.equal(restorePublicDemand(bad),null);}
 const copy=restorePublicDemand(s);copy.income[0].person=5;assert.equal(s.income[0].person,2);assert.equal(restorePublicDemand(null),null);assert.throws(()=>demandTrialAccount({loans:Array(6).fill(false),income:Array(12).fill({person:0,day:1}),deliveries:[]}));
});
test('new rule branch persists independently; played old four-mode records keep their meaning',()=>{
 let r=initialRules('policy');r=rulesReducer(r,{type:'DEMAND',action:{type:'BEGIN'}});assert(r.demand);assert.deepEqual(restoreRules(r),r);assert.equal(rulesReducer(r,{type:'MODE',mode:'loan'}),r);assert.equal(restoreRules({...r,branch:'prices'}),null);assert.equal(restoreRules({...r,phase:'conclusion'}),null);assert.equal(rulesReducer(initialRules('prices'),{type:'DEMAND',action:{type:'BEGIN'}}).demand,undefined);
 let old=rulesReducer(initialRules(),{type:'BEGIN'});old=rulesReducer(old,{type:'OPERATE',expectedRound:0});assert.equal(rulesReducer(old,{type:'DEMAND',action:{type:'BEGIN'}}),old);assert.deepEqual(restoreRules(old),old);assert.equal(policyAccount('loan',0,2).debt,6);
 let p=prologueReducer(initialPrologue(),{type:'NAVIGATE_CHAPTER',chapter:'rules'});p=prologueReducer(p,{type:'RULES',action:{type:'DEMAND',action:{type:'BEGIN'}}});p=prologueReducer(p,{type:'RULES',action:{type:'DEMAND',action:{type:'FUND',expectedRevision:p.marketRules.demand.revision}}});assert.deepEqual(restorePrologue(p),p);const stored=structuredClone(p.marketRules);p=prologueReducer(p,{type:'BACK_ASSUMPTIONS'});p=prologueReducer(p,{type:'NAVIGATE_CHAPTER',chapter:'rules'});assert.deepEqual(p.marketRules,stored);
 assert.deepEqual(restorePublicDemand({...initialPublicDemand(),firm:99999}),initialPublicDemand());
});
