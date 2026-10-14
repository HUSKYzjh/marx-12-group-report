/** Combine independently completed full-story viewports, never partial paths. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'outputs/complete-story-qa');
const bytes=await fs.readFile(path.join(root,'build/index.html'));assert(bytes.equals(await fs.readFile(path.join(root,'offline/技术红利去了哪里.html'))));
const hash=createHash('sha256').update(bytes).digest('hex'),results=[],reports=[];
for(const width of [1280,390]){
 const source='report-'+width+'.json',r=JSON.parse(await fs.readFile(path.join(out,source),'utf8'));assert.equal(r.buildSHA256,hash);assert.deepEqual(r.errors,[]);assert.deepEqual(r.external,[]);assert.equal(r.results.length,1);
 const row=r.results[0];assert.equal(row.width,width);assert.equal(row.freshStart,true);assert.equal(row.stateInjection,false);assert.equal(row.offline,width===390);assert.equal(row.allReportsOpened,true);assert.equal(row.allBranchesRetained,true);assert.equal(row.homeReturn,true);assert.equal(row.refresh,true);assert.deepEqual(row.branches,['automation','time','space','services','concentration','sharing','policy','prices']);
 assert.equal(row.battleStages,3);assert.equal(row.sixShopRounds,1);assert.equal(row.forcedBankruptcy,false);
 results.push(row);reports.push({source,checkedAt:r.checkedAt});
}
const report={checkedAt:new Date().toISOString(),buildSHA256:hash,results,errors:[],external:[],reports};
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log('Both current full-story paths independently completed: '+hash);
