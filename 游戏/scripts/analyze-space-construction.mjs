/** Generated teaching results, not NASA measurements or company microdata. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {initialSpaceFreight,freightReducer as step,freightAccount,freightCanLoad} from '../lib/space-freight.ts';
const balanced=['power','air','structure','power','air','structure'];
const schedules={
 small:{order:4,recipes:[balanced,balanced,balanced]},
 full:{order:12,recipes:[balanced,balanced,balanced]},
 maintenance:{order:12,recipes:[balanced,balanced,balanced],renew:true},
 wrongKind:{order:12,recipes:Array.from({length:3},()=>Array(6).fill('power'))},
 recover:{order:12,recipes:[Array(6).fill('power'),['air','structure','air','structure'],['air','structure','air','structure']]},
 pacedSmall:{order:4,recipes:[['power','air'],['structure','power'],[]]},
 stopAfterBase:{order:12,recipes:[balanced,balanced,[]]},
};
const result={kind:'teaching_model',empirical:false,sourceSHA256:createHash('sha256').update(await fs.readFile(new URL('../lib/space-freight.ts',import.meta.url))).digest('hex'),assumptions:{money:156,firm:60,buyer:96,capacity:6,periods:3,salePerPart:4,wagePerPart:2,inputPerPart:1,habitats:4,partsPerHabitat:{power:1,air:1,structure:1},instantAssembly:true},cases:{}};
for(const [name,c] of Object.entries(schedules)){
 let s=step(initialSpaceFreight(true),{type:'BEGIN'});s=step(s,{type:'CONTRACT',order:c.order});
 for(const [round,recipe] of c.recipes.entries()){
  if(c.renew&&freightAccount(s).need===0)s=step(s,{type:'MAINTENANCE'});
  for(let slot=0;slot<6;slot++)s=step(s,{type:'PLAN',slot,kind:recipe[slot]??null});
  s=step(s,{type:'PRODUCE',expectedRound:round});let slot=0;for(const id of freightAccount(s,s.pending).available)if(freightCanLoad(s,id))s=step(s,{type:'LOAD',crate:id,slot:slot++});
  s=step(s,{type:'LAUNCH',expectedRound:round});
 }
 const a=freightAccount(s);assert.equal(a.moneyAfter,156);const wallets={firm:60,buyer:96,workers:0,supplier:0};for(const t of a.transfers){assert(wallets[t.from]>=t.amount);wallets[t.from]-=t.amount;wallets[t.to]+=t.amount;}for(const id of Object.keys(wallets))assert.equal(a[id],wallets[id]);
 result.cases[name]={...c,produced:a.produced,sold:a.sold,stock:a.stock,habitable:a.habitats,unmetParts:a.need,paymentAuthorizationLeft:a.authorization,wallets,maintenanceParts:a.maintenanceDelivered,remainingGoods:a.crates,history:s.history,periods:a.periods};
}
assert.equal(result.cases.wrongKind.habitable,0);assert.equal(result.cases.full.habitable,4);assert.equal(result.cases.small.habitable,1);assert.equal(result.cases.maintenance.stock,0);assert.equal(result.cases.recover.stock,2);assert.equal(result.cases.stopAfterBase.stock,0);
const file=path.resolve('outputs/space-construction-analysis/analysis.json'),text=JSON.stringify(result,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(await fs.readFile(file,'utf8'),text,'regenerate the construction analysis');else{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,text);}
console.log(JSON.stringify({file,kind:result.kind,cases:Object.fromEntries(Object.entries(result.cases).map(([n,r])=>[n,{produced:r.produced,sold:r.sold,stock:r.stock,habitable:r.habitable,firm:r.wallets.firm}]))}));
