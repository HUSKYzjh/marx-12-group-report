import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {initialSharingCouncil,sharingCouncilReducer as reduce,councilTrialAccount} from '../lib/sharing-council.ts';
import {productionAccount} from '../lib/council-production.ts';
const cases=[
 {name:'same_machine_all_work',mode:'bonus',amounts:[2,2,2,2,2,2],ballot:'divide',jobs:Array(6).fill('work')},
 {name:'same_machine_paid_rest',mode:'bonus',amounts:[2,2,2,2,2,2],ballot:'divide',jobs:['work','work','work','paid-rest','paid-rest','paid-rest']},
 {name:'same_machine_no_wage',mode:'bonus',amounts:[2,2,2,2,2,2],ballot:'divide',jobs:['work','work','work','unpaid','unpaid','unpaid']},
 {name:'tie_keeps_old_oven',mode:'coop',amounts:[2,2,2,2,2,2],ballot:'divide',jobs:Array(6).fill('work')},
 {name:'divide_keeps_old_oven',mode:'coop',amounts:[0,2,2,2,2,4],ballot:'divide',jobs:Array(6).fill('work')},
 {name:'members_invest_then_rest',mode:'coop',amounts:[2,4,3,1,1,1],ballot:'invest',jobs:['work','work','work','paid-rest','paid-rest','paid-rest']},
];
const results=cases.map(c=>{
 let s=reduce(initialSharingCouncil(true,true),{type:'BEGIN'});s=reduce(s,{type:'CONDITION',mode:c.mode});s=reduce(s,{type:'LOOSE',enabled:true});let coin=0;
 for(const [id,n]of c.amounts.entries())for(let i=0;i<n;i++)s=reduce(s,{type:'COIN',coin:coin++,to:id});s=reduce(s,{type:'DISTRIBUTE',expectedRevision:s.revision});s=reduce(s,{type:'BALLOT',to:c.ballot});s=reduce(s,{type:'VOTE',expectedRevision:s.revision});const decision=councilTrialAccount(s.run);s=reduce(s,{type:'PRODUCTION_BEGIN'});
 for(const [person,job]of c.jobs.entries())s=reduce(s,{type:'PRODUCTION_ASSIGN',person,job});for(let i=0;i<3;i++)s=reduce(s,{type:'PRODUCTION_RUN',expectedRevision:s.revision});const a=productionAccount(s.production);
 return {...c,decision:decision.outcome,equipmentPaid:decision.equipmentSupplier,seed:s.production.seed,output:a.produced,sold:a.sold,stock:a.stock.length,work:a.work,paidRest:a.paidRest,wages:a.wages,closing:a.wallets,poorByShift:a.shifts.map(r=>r.workerPoor),moneyAfter:a.moneyAfter,shifts:a.shifts};
});
const codeHashes={};for(const file of ['lib/council-production.ts','lib/sharing-council.ts'])codeHashes[file]=createHash('sha256').update(await fs.readFile(file)).digest('hex');
const report={kind:'teaching_model',empirical:false,scope:'same 88 funded coins; actual council outcome followed by three closed-account bread shifts; not a ranking of countries or enterprises',codeHashes,results};
const file=path.resolve('outputs/council-production-analysis/analysis.json'),json=JSON.stringify(report,null,2)+'\n';
if(process.argv.includes('--check')){if(await fs.readFile(file,'utf8')!==json)throw new Error('Production analysis is stale');console.log('Council production analysis matches actual reducers.');}
else{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,json);console.log(JSON.stringify(results.map(({name,decision,output,sold,stock,work,paidRest,wages,poorByShift,moneyAfter})=>({name,decision,output,sold,stock,work,paidRest,wages,poorByShift,moneyAfter}))));}
