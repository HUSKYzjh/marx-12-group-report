import {chooseCondition} from './assumption-browser-gestures.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {initialPrologue,prologueReducer as reduce,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {policyAccount,priceAccount} from '../lib/market-rules-experiment.ts';
import {publicDemandAccount} from '../lib/public-demand.ts';
import {preservationAccount} from '../lib/preservation-workbench.ts';
import {workbenchTrial,workbenchButton,workbenchState} from './preservation-browser-gestures.mjs';
import {demandBenchmark,demandButton,demandState,moveDemand,fundDemand,endDemandDay,repayDemand} from './public-demand-browser-gestures.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),{loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html')),server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,out=path.join(root,'outputs/market-rules-qa');await fs.mkdir(out,{recursive:true});
let saved=reduce(initialPrologue(),{type:'JUMP_STAGE',stage:4});for(const route of ['consumption','investment','exports'])for(const a of [{type:'CHOOSE_RELIEF',route},{type:'RELIEF_ADVANCE',expectedPhase:'ready'},{type:'RELIEF_ADVANCE',expectedPhase:'improved'},{type:'RELIEF_CONDITION',sustained:true},{type:'RELIEF_COMPLETE'},{type:'RELIEF_MENU'}])saved=reduce(saved,a);for(const a of [{type:'FINISH_RELIEF'},{type:'EPILOGUE_REVEAL'},{type:'SHOW_ASSUMPTIONS'}])saved=reduce(saved,a);
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
async function frame(page){const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();return f;}
async function fits(f){assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert(await f.locator('.rules-modes button').evaluateAll(nodes=>nodes.every(n=>{const range=document.createRange();range.selectNodeContents(n);const text=range.getBoundingClientRect(),box=n.getBoundingClientRect();return text.width<=box.width+1&&text.height<=box.height+1;})));assert.deepEqual(await f.locator('#readout,#controls').evaluateAll(nodes=>nodes.flatMap(el=>{const walker=document.createTreeWalker(el,4),bad=[];let n;while((n=walker.nextNode()))if(n.nodeValue.includes('枚')&&!n.parentElement.closest('.money-spoken-unit,svg'))bad.push(n.nodeValue);return bad;})),[]);}
async function enter(f,branch){await chooseCondition(f,'boundaries');await f.locator('button[data-branch="'+branch+'"]').click();await f.getByRole('button',{name:'开门试试 →',exact:true}).click();}
async function state(f){return f.evaluate(()=>JSON.parse(parent.localStorage.getItem('technology-dividend:prologue:v1')).marketRules);}
async function account(f){const t=await state(f);return t.workbench?preservationAccount(t.workbench):t.demand?publicDemandAccount(t.demand):t.branch==='policy'?policyAccount(t.policyMode,t.income,t.round):priceAccount(t.priceMode,t.price,t.round);}
try{for(const spec of [{width:1280},{width:390,offline:true}]){
 const context=await browser.newContext({viewport:{width:spec.width,height:1000},reducedMotion:spec.offline?'reduce':'no-preference'});await context.route('**/*',r=>{if(r.request().url().startsWith(url)||spec.offline&&r.request().url()===offline)return r.continue();external.push(r.request().url());return r.abort();});await context.addInitScript(({key,saved})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{key:PROLOGUE_STORAGE_KEY,saved});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(spec.offline?offline:url);let f=await frame(page);await enter(f,'policy');
 for(const [mode,sold] of [['alone',[6,6]],['public',[12,12]],['loan',[12,0]],['income',[12,12]]]){
  if(mode!=='alone')await demandButton(page,f,'回到同一起点，换个安排 ↺');await demandBenchmark(page,f,mode);
  assert.deepEqual((await account(f)).periods.map(p=>p.sold),sold);assert.equal(await f.locator('.demand-person').count(),6);assert.equal((await account(f)).moneyAfter,148);await fits(f);
  if(mode==='loan'){assert.equal((await account(f)).debtTotal,6);await page.screenshot({path:path.join(out,spec.width+'-loan.png'),fullPage:true});}
 }
 await f.getByRole('button',{name:'谁付款，谁承受下一期？ →',exact:true}).click();await f.locator('.rules-conclusion').waitFor();
 await f.locator('[data-testid="rules-report"] > summary').click();assert((await f.locator('.technology-report-body').innerText()).includes('生产社会化'));await fits(f);await page.screenshot({path:path.join(out,spec.width+'-policy-report.png'),fullPage:true});
 await f.getByRole('button',{name:'再换条件 ↺',exact:true}).click();await f.getByRole('button',{name:'开门试试 →',exact:true}).click();for(let i=0;i<6;i++)await moveDemand(page,f,'loan:'+i,'loan:'+i);for(let i=0;i<12;i++)await moveDemand(page,f,'income:'+i,'income:'+Math.floor(i/2)+':2');await fundDemand(page,f);await endDemandDay(page,f);await fundDemand(page,f);await repayDemand(page,f);await endDemandDay(page,f);assert.equal((await account(f)).debtTotal,0);assert.equal((await account(f)).periods[1].sold,6);assert.equal((await demandState(page)).step,'result');
 await f.getByRole('button',{name:'回到假设目录 ↩',exact:true}).click();await enter(f,'prices');
 for(const price of [2,1])for(const mode of ['ordinary','efficient','cold','both']){if((await workbenchState(page)).step==='result')await workbenchButton(page,f,'同样的钱，换个安排 ↺');await workbenchTrial(page,f,{price,efficient:['efficient','both'].includes(mode),cold:['cold','both'].includes(mode)});await fits(f);const a=await account(f),old=priceAccount(mode,price,2);for(const k of ['firm','stock','spoiled','moneyAfter'])assert.equal(a[k],old[k]);if(mode==='cold'&&price===2)await page.screenshot({path:path.join(out,spec.width+'-cold.png'),fullPage:true});if(mode==='efficient'&&price===1)await page.screenshot({path:path.join(out,spec.width+'-efficient.png'),fullPage:true});}
 await page.reload();f=await frame(page);assert.equal((await workbenchState(page)).trials.length,8);await workbenchButton(page,f,'这次为什么不同？ →');await f.locator('.rules-conclusion').waitFor();await f.locator('[data-testid="rules-report"] > summary').click();await fits(f);
 const retained=await state(f);await f.getByRole('button',{name:'回到假设目录 ↩',exact:true}).click();await f.locator('#chapter-toggle').click();await f.locator('button[data-chapter="rules"]').click();await f.locator('.rules-conclusion').waitFor();assert.deepEqual(await state(f),retained);await f.locator('#previous-stage').click();await f.locator('.prologue-assumptions').waitFor();
 results.push({...spec,actualOperations:true,integerWallets:true,refresh:true,offline:true,overflow:false,parameterReset:true,conditionalImprovement:true});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({checkedAt:new Date().toISOString(),buildSHA256:createHash('sha256').update(bytes).digest('hex'),results,errors,external},null,2)+'\n');console.log(JSON.stringify(results,null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
