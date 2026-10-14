import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {initialPublicDemand,publicDemandReducer as reduce,publicDemandAccount as account,restorePublicDemand} from '../lib/public-demand.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const commit=(s,type,extra={})=>reduce(s,{type,expectedRevision:s.revision,...extra});
function run({id,machine=false,food=false,income=false,loan=false,recover=false}){
 let s=reduce(initialPublicDemand(true),{type:'BEGIN'});
 if(machine)s=reduce(s,{type:'MACHINE',enabled:true});
 if(loan)for(let person=0;person<6;person++)s=reduce(s,{type:'LOAN',person,enabled:true});
 if(income)for(let day=1;day<=2;day++)for(let person=0;person<6;person++)s=reduce(s,{type:'INCOME',roll:(day-1)*6+person,to:{person,day}});
 if(recover)for(let roll=0;roll<12;roll++)s=reduce(s,{type:'INCOME',roll,to:{person:Math.floor(roll/2),day:2}});
 for(let day=1;day<=2;day++){
  assert(account(s).canFund,id+' must be funded');s=commit(s,'FUND');
  if(s.step==='repay'){for(let person=0;person<6;person++)if(s.loanPaid[person])s=commit(s,'REPAY',{person});s=commit(s,'SHOP');}
  if(food){for(let person=0;person<6;person++){const a=account(s);if(a.periods.at(-1).purchases[person]>=2||2*(s.orders.filter(Boolean).length+1)>a.publicFund)continue;const bread=a.inventory.find(id=>!s.orders.includes(id));s=reduce(s,{type:'MATCH',bread,person});}if(s.orders.some(Boolean))s=commit(s,'DELIVER_BATCH');}
  s=commit(s,'NEXT');
 }
 assert.deepEqual(restorePublicDemand(s),s);const a=account(s);assert.equal(a.moneyAfter,148);assert.equal(a.stock+a.periods.reduce((n,p)=>n+p.sold,0),a.periods.reduce((n,p)=>n+p.produced,0));
 return {id,trial:s.run,produced:a.periods.map(p=>p.produced),sold:a.periods.map(p=>p.sold),publicProvided:a.periods.map(p=>p.provided),stock:a.stock,publicRemaining:a.publicFund,firm:a.firm,debt:a.debtTotal,machineOwner:a.machineOwner,transfers:a.transfers,totalCash:a.moneyAfter};
}
const cases=[{id:'ordinary'},{id:'food',food:true},{id:'income',income:true},{id:'loan',loan:true},{id:'loan-income',loan:true,recover:true},{id:'machine',machine:true},{id:'machine-food',machine:true,food:true}].map(run);
const codeHashes={};for(const file of ['lib/public-demand.ts','lib/market-rules-experiment.ts'])codeHashes[file]=createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex');
const report={kind:'teaching_model',empirical:false,scope:'Two independently replayed dates and one shared existing public budget; not macroeconomic calibration.',codeHashes,assumptions:['148 existing coins; 32 public coins shared by income, food and equipment.','Six people each want at most two loaves per date; private price two coins.','Equipment costs 12, belongs to the private bakery, increases only date-two output from 12 to 18.','Fixed wage one per person/date; inputs one coin per two loaves.','Additional income is a funded transfer, not automatically a new job.','No taxes, new borrowing by government, currency creation, depreciation, spoilage or demand outside these people.','Other employer cash remains private; public procurement alone does not change a country system.'],cases};
const file=path.join(root,'outputs/public-budget-analysis/analysis.json');
if(process.argv.includes('--check')){assert.deepEqual(JSON.parse(await fs.readFile(file,'utf8')),report);console.log('Reproduced seven shared-budget teaching scenarios; 148 coins conserved.');}
else{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(report,null,2)+'\n');for(const r of cases)console.log(r.id+': made '+r.produced.join('/')+', sold '+r.sold.join('/')+', stock '+r.stock+', public '+r.publicRemaining+', debt '+r.debt);}
