import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {POLICY_MODES,PRICE_MODES,initialRules,rulesReducer as reduce,restoreRules,policyAccount,priceAccount} from '../lib/market-rules-experiment.ts';
import {initialPrologue,prologueReducer as pReduce,restorePrologue} from '../lib/prologue-state.ts';
test('every policy condition preserves finite wallets and separate debt; public delivery does not double private demand',()=>{
 for(const mode of POLICY_MODES)for(let income=0;income<=4;income++)for(let round=0;round<=2;round++){
  const a=policyAccount(mode,income,round);assert.equal(a.moneyAfter,148);for(const v of [a.firm,a.publicFund,a.lender,a.employer,a.supplier,a.stock,a.debt,...a.wallets])assert(Number.isInteger(v)&&v>=0);
  for(const p of a.periods){assert(p.privateSold+p.publicSold<=12);assert(p.purchases.every(n=>n<=2));assert.equal(p.receipts,p.sold*2);}
 }
 assert.deepEqual(POLICY_MODES.map(m=>policyAccount(m,0,2).periods.map(p=>p.sold)),[[6,6],[12,12],[12,0],[12,12]]);
 assert.equal(policyAccount('public',0,2).publicFund,8);assert.equal(policyAccount('income',0,2).employer,0);assert.equal(policyAccount('loan',0,2).debt,6);assert.equal(policyAccount('loan',1,2).debt,0);assert.equal(policyAccount('loan',3,2).periods[1].sold,6);assert.throws(()=>policyAccount('loan',5,2));
});
test('lower prices can sell everything yet lose money; cost savings and preservation are distinct, costs paid not minted',()=>{
 for(const mode of PRICE_MODES)for(let price=1;price<=3;price++)for(let round=0;round<=2;round++){
  const a=priceAccount(mode,price,round);assert.equal(a.moneyAfter,62);for(const v of [a.firm,a.supplier,a.equipment,a.stock,a.spoiled,...a.wallets])assert(Number.isInteger(v)&&v>=0);
  assert.equal(a.stock+a.spoiled+a.periods.reduce((s,p)=>s+p.sold,0),round*12);
  for(const p of a.periods)assert.equal(p.operatingCash,p.receipts-p.wages-p.inputs-p.storage);
 }
 const normal=priceAccount('ordinary',1,2),efficient=priceAccount('efficient',1,2),cold=priceAccount('cold',2,2);
 assert(normal.periods.every(p=>p.sold===12&&p.operatingCash===-6));assert(efficient.periods.every(p=>p.operatingCash===3));assert.equal(efficient.firm,50);assert.equal(cold.spoiled,0);assert.equal(cold.stock,12);assert.equal(cold.firm,28);assert.throws(()=>priceAccount('ordinary',1.5,2));
});
test('both periods required; stale events ignored; parameter changes reset comparison and restoration validates gates',()=>{
 for(const branch of ['policy','prices']){let s=initialRules(branch);assert.strictEqual(reduce(s,{type:'OPERATE',expectedRound:0}),s);s=reduce(s,{type:'BEGIN'});
  for(const mode of branch==='policy'?POLICY_MODES:PRICE_MODES){s=reduce(s,{type:'MODE',mode});let before=s.seen;s=reduce(s,{type:'OPERATE',expectedRound:0});assert.equal(s.seen,before);assert.strictEqual(reduce(s,{type:'OPERATE',expectedRound:0}),s);assert.strictEqual(reduce(s,{type:'CONCLUDE'}),s);s=reduce(s,{type:'OPERATE',expectedRound:1});assert.deepEqual(restoreRules(s),s);}
  assert.equal(reduce(s,{type:'CONCLUDE'}).phase,'conclusion');s=reduce(s,{type:branch==='policy'?'INCOME':'PRICE',delta:1});assert.equal(s.round,0);assert.equal(s.seen,0);assert.equal(restoreRules({...s,phase:'conclusion'}),null);assert.equal(restoreRules({...s,round:2}),null);assert.strictEqual(reduce(s,{type:'MODE',mode:'magic'}),s);assert.strictEqual(reduce(s,null),s);
 }
});
test('new branches respect prologue gates, refresh, and stored accounts are never trusted',()=>{
 let p=initialPrologue();assert.strictEqual(pReduce(p,{type:'OPEN_RULES',branch:'policy'}),p);p=pReduce(p,{type:'JUMP_STAGE',stage:4});
 for(const route of ['consumption','investment','exports'])for(const a of [{type:'CHOOSE_RELIEF',route},{type:'RELIEF_ADVANCE',expectedPhase:'ready'},{type:'RELIEF_ADVANCE',expectedPhase:'improved'},{type:'RELIEF_CONDITION',sustained:true},{type:'RELIEF_COMPLETE'},{type:'RELIEF_MENU'}])p=pReduce(p,a);
 for(const a of [{type:'FINISH_RELIEF'},{type:'EPILOGUE_REVEAL'},{type:'SHOW_ASSUMPTIONS'},{type:'OPEN_RULES',branch:'policy'},{type:'RULES',action:{type:'BEGIN'}},{type:'RULES',action:{type:'OPERATE',expectedRound:0}}])p=pReduce(p,a);
 assert.equal(p.scene,'market-rules');assert.deepEqual(restorePrologue({...p,computedCash:999999}),p);assert.equal(restorePrologue({...p,epilogueBeat:2}).scene,'opening');p=pReduce(p,{type:'BACK_ASSUMPTIONS'});assert.equal(p.scene,'assumptions');p=pReduce(p,{type:'OPEN_RULES',branch:'prices'});assert.equal(p.marketRules.branch,'prices');assert.equal(restorePrologue({...p,marketRules:null}).scene,'opening');
});
test('evidence counts, strict type boundaries, reports and completed if links are consistent',async()=>{
 const e=JSON.parse(await fs.readFile(new URL('../data/market-rules-evidence.json',import.meta.url)));assert.equal(e.observations.length,22);assert.equal(e.sources.length,9);for(const r of e.observations)assert(e.sources.some(s=>s.id===r.source));
 for(const [branch,file] of [['policy','07_公共订单信用与技术方向.txt'],['prices','08_降价工艺与保鲜.txt']]){
  const report=await fs.readFile(new URL('../docs/研究报告/'+file,import.meta.url),'utf8');
  assert(report.includes('来源与读取范围'),'standalone reports need their own sources, not only UI links');
  for(const source of e.sources.filter(s=>s.branch===branch)){
   assert(report.includes(source.url),'missing standalone source: '+source.id);
   if(source.publication_url)assert(report.includes(source.publication_url),'missing publication-status source: '+source.id);
  }
 }
 const analysis=JSON.parse(await fs.readFile(new URL('../outputs/market-rules-research/analysis.json',import.meta.url)));assert.equal(Object.keys(analysis.findings).length,5);assert.equal(analysis.teachingScenarios.policy.length+analysis.teachingScenarios.prices.length,20);
 const ui=await fs.readFile(new URL('../lib/relief-ui.js',import.meta.url),'utf8');assert.match(ui,/OPEN_RULES/);assert.doesNotMatch(ui,/仍在制作/);const runtime=await fs.readFile(new URL('../lib/trust-stage.js',import.meta.url),'utf8');assert.match(runtime,/renderMarketRules/);
});
