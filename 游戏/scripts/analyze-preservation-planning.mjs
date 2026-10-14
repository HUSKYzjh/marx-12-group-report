/** Exact teaching-model replay, not empirical evidence or an optimal-policy claim. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {preservationTrialAccount} from '../lib/preservation-workbench.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const plans=[
 ['ordinary',{},{}],['cold-repeated',{cold:true},{cold:true}],
 ['cold-stop',{cold:true},{cold:true,bake:false}],['no-cold-stop',{}, {bake:false}],
 ['late-cold-stop',{}, {cold:true,bake:false}],
 ['cheap-ordinary',{price:1},{price:1}],['cheap-efficient',{price:1,efficient:true},{price:1,efficient:true}],
 ['cold-cheap-stop',{cold:true},{cold:true,price:1,bake:false}],
];
const setup=x=>({price:2,efficient:false,cold:false,bake:true,...x});
const rows=plans.map(([name,first,second])=>{
 const history=[setup(first),setup(second)],a=preservationTrialAccount(history);
 assert.equal(a.moneyAfter,62);const goods=[...a.inventory,...a.spoiledIDs,...a.periods.flatMap(p=>p.bought.flat())];assert.equal(goods.length,new Set(goods).size);assert.equal(goods.length,a.periods.reduce((n,p)=>n+p.produced.length,0));
 return {name,history,produced:a.periods.map(p=>p.produced.length),sold:a.periods.map(p=>p.sold),purchases:a.periods.map(p=>p.purchases),cash:a.firm,stock:a.stock,spoiled:a.spoiled,wages:a.periods.map(p=>p.wages),inputs:a.periods.map(p=>p.inputs),storage:a.periods.map(p=>p.storage),upgrade:a.upgrade,money:a.moneyAfter};
});
const configs=Array.from({length:12},(_,i)=>setup({price:1+i%3,efficient:!!(Math.floor(i/3)&1),cold:!!(Math.floor(i/3)&2)}));
let checked=0;for(const first of configs)for(const second of configs)for(const bake of [true,false]){
 const a=preservationTrialAccount([first,{...second,bake}]);assert.equal(a.moneyAfter,62);assert([a.firm,a.supplier,a.equipment,...a.wallets].every(n=>Number.isSafeInteger(n)&&n>=0));const goods=[...a.inventory,...a.spoiledIDs,...a.periods.flatMap(p=>p.bought.flat())];assert.equal(goods.length,new Set(goods).size);assert.equal(goods.length,a.periods.reduce((n,p)=>n+p.produced.length,0));checked++;
}
const source='lib/preservation-workbench.ts',report={kind:'teaching_model',empirical:false,modelSHA256:createHash('sha256').update(await fs.readFile(path.join(root,source))).digest('hex'),source,checkedCombinations:checked,rows,limits:['Two days; six customers; one commodity; finite wallets.','Daily wages remain payable even when tomorrow oven is off, by assumed contract.','First loaves before second purchases; no fictional sales or restored spoilage.','Equipment ownership remains private. No tax, credit, outside orders or supplier spending.','Operating cash is not full economic profit; no depreciation or terminal inventory valuation.']};
const dest=path.join(root,'outputs/preservation-planning-analysis/analysis.json');
if(process.argv.includes('--check'))assert.deepEqual(JSON.parse(await fs.readFile(dest,'utf8')),report);
else{await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({checked,rows}));
