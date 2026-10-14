import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {initialSharingCouncil,sharingCouncilReducer as reduce,councilTrialAccount,restoreSharingCouncil} from '../lib/sharing-council.ts';
const cases=[
 {name:'bonusEqual',mode:'bonus',amounts:[2,2,2,2,2,2],ballot:'divide'},
 {name:'minorityEqual',mode:'minority',amounts:[2,2,2,2,2,2],ballot:'divide'},
 {name:'coopEqual',mode:'coop',amounts:[2,2,2,2,2,2],ballot:'divide'},
 {name:'coopDifferentRecipients',mode:'coop',amounts:[0,2,2,2,2,4],ballot:'divide'},
 {name:'coopNeedsMetInvest',mode:'coop',amounts:[2,4,3,1,1,1],ballot:'invest'},
 {name:'coopNeedsMetPlayerDivide',mode:'coop',amounts:[2,4,3,1,1,1],ballot:'divide'},
];
const scenarios=cases.map(spec=>{
 let s=reduce(initialSharingCouncil(true),{type:'BEGIN'});s=reduce(s,{type:'CONDITION',mode:spec.mode});s=reduce(s,{type:'LOOSE',enabled:true});
 let coin=0;for(const [person,n]of spec.amounts.entries())for(let i=0;i<n;i++)s=reduce(s,{type:'COIN',coin:coin++,to:person});
 assert.equal(coin,12);s=reduce(s,{type:'DISTRIBUTE',expectedRevision:s.revision});s=reduce(s,{type:'BALLOT',to:spec.ballot});s=reduce(s,{type:'VOTE',expectedRevision:s.revision});
 assert.deepEqual(restoreSharingCouncil(s),s);const account=councilTrialAccount(s.run);assert.equal(account.moneyAfter,88);
 const wallets={firm:40,buyers:48,supplier:0,owner:0,equipmentSupplier:0,...Object.fromEntries(Array.from({length:6},(_,id)=>['worker-'+id,0]))};
 for(const p of account.transfers){assert(Number.isInteger(p.amount)&&wallets[p.from]>=p.amount);wallets[p.from]-=p.amount;wallets[p.to]+=p.amount;}
 return {...spec,record:s.run,account,wallets};
});
const report={kind:'teaching_model',empirical:false,scope:'first distribution and vote only; three subsequent bread shifts are separately analysed in council-production-analysis',sourceSHA256:createHash('sha256').update(await fs.readFile(new URL('../lib/sharing-council.ts',import.meta.url))).digest('hex'),assumptions:['six fictional people; wage 2; first and second allocations 12 each','shoe 4, rent 6, household goods 5 are unpurchased fictional budget goals','first three choose investment when the first paid budget meets their goal; two fixed investment preferences; player chooses own ballot','preferences may change; formal decision weights do not depend on income','bonus 0 worker/1 owner; minority 1 worker/7 owner; coop 1 member/no outside owner','this report stops at the vote; it does not estimate efficiency, financing or competitive market outcomes'],scenarios};
const file=new URL('../outputs/council-personal-analysis/analysis.json',import.meta.url),json=JSON.stringify(report,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(await fs.readFile(file,'utf8'),json);else{await fs.mkdir(new URL('../outputs/council-personal-analysis/',import.meta.url),{recursive:true});await fs.writeFile(file,json);}
console.log(JSON.stringify(scenarios.map(({name,account:a})=>({name,outcome:a.outcome,divideVotes:a.divideVotes,investVotes:a.investVotes,workerIncome:a.workers,firm:a.firm,money:a.moneyAfter}))));
