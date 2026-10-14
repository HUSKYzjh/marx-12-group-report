import {chooseCondition} from './assumption-browser-gestures.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {initialPrologue,prologueReducer as reduce,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {arrangeAll,beginAutomation} from './automation-browser-gestures.mjs';
import {calendarPaidRest} from './time-calendar-browser-gestures.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html'));
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/';
const offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href;
const out=path.join(root,'outputs/automation-qa');await fs.mkdir(out,{recursive:true});
let saved=reduce(initialPrologue(),{type:'JUMP_STAGE',stage:4});
for(const route of ['consumption','investment','exports'])for(const action of [{type:'CHOOSE_RELIEF',route},{type:'RELIEF_ADVANCE',expectedPhase:'ready'},{type:'RELIEF_ADVANCE',expectedPhase:'improved'},{type:'RELIEF_CONDITION',sustained:true},{type:'RELIEF_COMPLETE'},{type:'RELIEF_MENU'}])saved=reduce(saved,action);
for(const action of [{type:'FINISH_RELIEF'},{type:'EPILOGUE_REVEAL'},{type:'SHOW_ASSUMPTIONS'}])saved=reduce(saved,action);
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
async function frame(page){const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();return f;}
try{
 for(const spec of [{width:1280},{width:390,offline:true}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',r=>{if(r.request().url().startsWith(url)||spec.offline&&r.request().url()===offline)return r.continue();external.push(r.request().url());return r.abort();});
  await context.addInitScript(({key,saved})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{key:PROLOGUE_STORAGE_KEY,saved});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(spec.offline?offline:url);let f=await frame(page);
  await chooseCondition(f,'labour');
  await f.locator('[data-branch="automation"]').click();
  await beginAutomation(f);
  assert.equal(await f.locator('[data-testid="technology-result"]').count(),0);
  for(const [mode,income,unsold] of [['cut',16,24],['expand',40,72],['time',40,0],['share',40,0]]){
   await arrangeAll(f,mode);await f.getByRole('button',{name:'按这个安排，做一周 →',exact:true}).click();
   await f.locator('[data-testid="technology-result"][data-mode="'+mode+'"]').waitFor();
   assert.equal(await f.locator('.automation-payout').count(),10);assert.equal(await f.locator('.automation-payout .money-coin').count(),10);
   assert.equal(await f.locator('.automation-payout').evaluateAll(nodes=>nodes.reduce((sum,n)=>sum+Number(n.dataset.income),0)),income);
   assert.equal(await f.locator('[data-testid="technology-report"]').count(),0);
   assert((await f.locator('.technology-stats').innerText()).includes('留下 '+unsold));
   assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(mode==='cut')await page.screenshot({path:path.join(out,spec.width+'-cut.png'),fullPage:true});
   if(mode==='time')await page.screenshot({path:path.join(out,spec.width+'-time.png'),fullPage:true});
   await page.reload();f=await frame(page);assert.equal(await f.locator('[data-testid="technology-result"]').getAttribute('data-mode'),mode);
  }
  await f.getByRole('button',{name:'结果为什么不同？ →',exact:true}).click();
  await f.locator('.technology-conclusion').waitFor();assert((await f.locator('.technology-conclusion').innerText()).includes('谁得到时间和收入'));
  await f.locator('[data-testid="technology-report"] > summary').click();
  assert((await f.locator('.technology-report-body').innerText()).includes('5,172'));
  assert((await f.locator('.technology-report-body').innerText()).includes('28.8%'));
  assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await f.getByRole('button',{name:'回到假设目录 ↩',exact:true}).click();
  await chooseCondition(f,'labour');await f.locator('[data-branch="time"]').click();
  await f.getByRole('button',{name:'试着安排一周 →',exact:true}).click();await f.locator('.time-calendar').waitFor();
  await f.getByRole('button',{name:'照这样，过一周 →',exact:true}).click();
  assert.equal(await f.locator('[data-testid="technology-report"]').count(),0);
  // The range is a real control; changed capacity must invalidate mixed comparisons.
  await f.locator('.calendar-capability > summary').click();await f.locator('#calendar-rate').fill('80');await f.locator('#calendar-rate').dispatchEvent('change');
  await f.getByRole('button',{name:'照这样，过一周 →',exact:true}).click();await f.locator('.calendar-result[data-stale="false"]').waitFor();
  assert.equal(await f.getByRole('button',{name:'时间归谁？ →',exact:true}).count(),0);
  await calendarPaidRest(page,f);await f.getByRole('button',{name:'照这样，过一周 →',exact:true}).click();await f.locator('.calendar-result[data-stale="false"]').waitFor();
  await f.getByRole('button',{name:'时间归谁？ →',exact:true}).click();await f.locator('.technology-conclusion').waitFor();
  await f.locator('[data-testid="technology-report"] > summary').click();assert((await f.locator('.technology-report-body').innerText()).includes('0.491'));
  results.push({width:spec.width,offline:!!spec.offline,branches:2,automationModes:4,timeCalendar:true,refresh:true,moneyIcons:10});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({results,errors,external},null,2));console.log(JSON.stringify({passed:results.length,results,errors,external}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
