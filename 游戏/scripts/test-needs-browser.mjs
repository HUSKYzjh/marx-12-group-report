import {chooseCondition} from './assumption-browser-gestures.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {initialPrologue,prologueReducer as reduce,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {moveFreight,finishFreight} from './space-freight-browser-gestures.mjs';
import {moveCare,runCare,coverCare,trainCare} from './care-routing-browser-gestures.mjs';
import {careRoutingAccount} from '../lib/care-routing.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html'));const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,out=path.join(root,'outputs/needs-qa');await fs.mkdir(out,{recursive:true});
let saved=reduce(initialPrologue(),{type:'JUMP_STAGE',stage:4});for(const route of ['consumption','investment','exports'])for(const a of [{type:'CHOOSE_RELIEF',route},{type:'RELIEF_ADVANCE',expectedPhase:'ready'},{type:'RELIEF_ADVANCE',expectedPhase:'improved'},{type:'RELIEF_CONDITION',sustained:true},{type:'RELIEF_COMPLETE'},{type:'RELIEF_MENU'}])saved=reduce(saved,a);for(const a of [{type:'FINISH_RELIEF'},{type:'EPILOGUE_REVEAL'},{type:'SHOW_ASSUMPTIONS'}])saved=reduce(saved,a);
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
async function frame(page){const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();return f;}
async function fits(f){assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
try{for(const spec of [{width:1280},{width:390,offline:true}]){
 const context=await browser.newContext({viewport:{width:spec.width,height:1000},reducedMotion:spec.offline?'reduce':'no-preference'});await context.route('**/*',r=>{if(r.request().url().startsWith(url)||spec.offline&&r.request().url()===offline)return r.continue();external.push(r.request().url());return r.abort();});await context.addInitScript(({key,saved})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{key:PROLOGUE_STORAGE_KEY,saved});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(spec.offline?offline:url);let f=await frame(page);
 await chooseCondition(f,'needs');await f.locator('[data-branch="space"]').click();await f.getByRole('button',{name:'准备第一批材料 →',exact:true}).click();
 assert.equal(await f.getByRole('button',{name:'这些结果说明什么？ →',exact:true}).count(),0);
 for(const [mode,left] of [['wish',14],['contract',6],['renew',0]]){
   if(mode!=='wish'){await f.getByRole('button',{name:'换个条件再试 ↺',exact:true}).click();if(mode==='contract')await moveFreight(page,f,'contract:12','book');}
   await finishFreight(page,f,mode==='renew');assert((await f.locator('.freight-final').innerText()).includes('剩下 '+left));assert(await f.locator('#readout .money-coin').count()>=1);await fits(f);await page.screenshot({path:path.join(out,spec.width+'-'+mode+'.png'),fullPage:true});await page.reload();f=await frame(page);assert.equal(await f.locator('.space-freight').getAttribute('data-round'),'3');
 }
  await f.getByRole('button',{name:'订单会一直来吗？ →',exact:true}).click();assert((await f.locator('.needs-conclusion').innerText()).includes('不会让付款订单自动续上'));
 await f.locator('[data-testid="needs-report"] > summary').click();assert((await f.locator('.technology-report-body').innerText()).includes('34亿美元'));await fits(f);
 await f.getByRole('button',{name:'回到假设目录 ↩',exact:true}).click();await chooseCondition(f,'needs');await f.locator('[data-branch="services"]').click();await f.getByRole('button',{name:'安排这一期 →',exact:true}).click();
 for(const [mode,served] of [['selfpay',4],['assist',4],['cover',4],['both',12]]){
  if(mode==='assist'||mode==='both')await moveCare(page,f,'tool','socket');
  if(mode==='cover'){await moveCare(page,f,'tool','resources');await coverCare(page,f);}
  if(mode==='both')await trainCare(page,f);
  const care=await runCare(page,f);assert.equal(careRoutingAccount(care.run).served,served);assert.equal(await f.locator('.care-patient').count(),12);assert.equal(await f.locator('.care-observer[data-served="true"]').count(),served);await fits(f);await page.screenshot({path:path.join(out,spec.width+'-'+mode+'.png'),fullPage:true});await page.reload();f=await frame(page);assert.equal(await f.locator('[data-testid="care-routing-result"][data-stale="false"]').count(),1);
 }
 await f.getByRole('button',{name:'都用上了，为什么？ →',exact:true}).click();await f.locator('[data-testid="needs-report"] > summary').click();assert((await f.locator('.technology-report-body').innerText()).includes('94.65%'));await fits(f);
 await f.getByRole('button',{name:'回到假设目录 ↩',exact:true}).click();await f.locator('#chapter-toggle').click();await f.locator('[data-chapter="needs"]').click();await f.locator('body[data-scene="needs-technology"]').waitFor();
 // Chapter navigation resumes the current branch; it must not clear care results.
 assert.equal(await f.locator('.needs-conclusion').count(),1);
 await f.getByRole('button',{name:'回到假设目录 ↩',exact:true}).click();await chooseCondition(f,'needs');await f.locator('[data-branch="space"]').click();
 // Explicitly switching to space begins a fresh freight experiment.
 await f.getByRole('button',{name:'准备第一批材料 →',exact:true}).click();await f.locator('.freight-equipment > summary').click();await f.locator('#freight-capacity').fill('2');await f.locator('#freight-capacity').dispatchEvent('change');assert.equal(await f.getByRole('button',{name:'订单会一直来吗？ →',exact:true}).count(),0);assert.equal(await f.locator('.space-freight').getAttribute('data-round'),'0');
 results.push({width:spec.width,offline:!!spec.offline,spacePolicies:3,spacePeriods:9,careModes:4,refresh:true,coinIcons:true,motion:spec.offline?'reduced':'normal'});await context.close();
}assert.deepEqual(errors,[]);assert.deepEqual(external,[]);const report={checkedAt:new Date().toISOString(),buildSHA256:createHash('sha256').update(bytes).digest('hex'),results,errors,external};await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:results.length,...report}));}
finally{await browser.close();await new Promise(r=>server.close(r));}
