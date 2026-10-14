/** Optional competition extension: real gestures, no storage/reducer/clock injection. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {pressureState,pressureRun,pressureReady,pressureMove,assertPressureFeedback} from './pressure-browser-gestures.mjs';
import {restorePressureStory} from '../lib/competitive-pressure.ts';
import {pressureMoney,rewindPressure} from '../public/assets/market-duel/pressure-model.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),{loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html')),file=path.join(root,'offline/技术红利去了哪里.html');assert(bytes.equals(await fs.readFile(file)));
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(file).href,out=path.join(root,'outputs/main-pressure-qa');await fs.mkdir(out,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
const frame=async page=>{const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();return f;};
async function fits(f){assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await f.locator('.competitive-pressure [data-pressure-person]').count(),11);assert.equal(await f.locator('.piece-ghost').count(),0);const hit=await f.locator('.competitive-pressure button:visible').evaluateAll(ns=>ns.map(n=>({label:n.getAttribute('aria-label')||n.textContent,w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height})));assert.deepEqual(hit.filter(n=>n.w<43||n.h<43),[]);}
async function continueUntil(page,f,day){await f.getByTestId('pressure-continue').click();await f.locator('.competitive-pressure[data-day="'+day+'"]').waitFor();await pressureReady(f);if(day<9)assert.equal(await f.getByTestId('pressure-continue').innerText(),'照此安排，继续营业 ▷');assert.equal((await pressureState(page)).world.day,day);}
try{for(const spec of [{width:1280,method:'mouse',choice:'hold'},{width:390,method:'touch',choice:'price'},{width:320,method:'keyboard',choice:'follow',offline:true}]){
 const context=await browser.newContext({viewport:{width:spec.width,height:1100},hasTouch:spec.method==='touch',reducedMotion:spec.width===1280?'no-preference':'reduce'});context.setDefaultTimeout(30000);await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||spec.offline&&u===offline)return r.continue();external.push(u);return r.abort();});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(spec.offline?offline:url);let f=await frame(page);
 await f.locator('#chapter-toggle').click();await f.locator('[data-chapter="automation"]').click();assert.equal(await f.locator('.technology-report').count(),0);await f.locator('summary').filter({hasText:'另做一个竞争延伸实验'}).click();await f.getByRole('button',{name:'去看看隔壁的低价 →',exact:true}).click();await pressureReady(f);assert.equal((await pressureState(page)).world.day,0);assert.equal(await f.locator('[data-pressure-piece]').count(),0);await fits(f);await page.screenshot({path:path.join(out,spec.width+'-opening.png'),fullPage:true});
 if(spec.width===1280){await f.getByTestId('pressure-run').click();await f.locator('.pressure-payday').first().waitFor();assert.deepEqual((await f.locator('.pressure-payday').evaluateAll(ns=>ns.map(n=>Number(n.dataset.paid)))).sort(),[1,1,2,2,2,2]);assert.equal((await pressureState(page)).world.day,1,'receipts animate only after one settlement');await f.locator('.competitive-pressure:not([data-moving])').waitFor();assert.equal(await f.locator('.pressure-payday').count(),0);}else await pressureRun(page,f);
 const initial=await pressureState(page);assert.equal(initial.world.history[0].sold[0],0);assert(initial.world.history[0].visits.some(v=>v.person===0&&v.shop===1));
 const source=f.locator('[data-pressure-piece="price"]');await source.focus();await page.keyboard.press('Enter');await f.locator('.competitive-pressure[data-revision="'+(initial.revision+1)+'"]').waitFor();assert.deepEqual((await pressureState(page)).world,initial.world);assert.equal((await pressureState(page)).draft,'price');assert.equal(await f.locator('[data-pressure-piece="price"]').getAttribute('aria-pressed'),'true');await f.getByRole('button',{name:'撤回草稿 ↶',exact:true}).click();await f.locator('.competitive-pressure[data-revision="'+(initial.revision+2)+'"]').waitFor();assert.equal((await pressureState(page)).draft,'hold');
 if(spec.choice!=='hold'){await pressureMove(page,f,spec.choice,'counter',spec.method);assert.deepEqual((await pressureState(page)).world,initial.world);await pressureRun(page,f);}while((await pressureState(page)).world.day<9)await pressureRun(page,f);
 let finished=await pressureState(page);assert.deepEqual(restorePressureStory(finished),finished);assert.equal(pressureMoney(finished.world),120);await fits(f);await page.screenshot({path:path.join(out,spec.width+'-first-ending.png'),fullPage:true});
 const originalFinished=structuredClone(finished);
 if(spec.choice==='hold'){
  await f.getByRole('button',{name:'翻回第4天',exact:true}).click();await f.locator('.competitive-pressure[data-day="3"]').waitFor();const stopped=(await pressureState(page)).world;
  await f.getByRole('button',{name:'回到第二天，试着跟进 ↶',exact:true}).click();await f.locator('.competitive-pressure[data-day="1"]').waitFor();const retry=await pressureState(page);assert.equal(retry.draft,'follow');assert.deepEqual(retry.reference,stopped);assert.deepEqual(retry.paths.at(-1),stopped);assert.equal(pressureMoney(retry.world),120);await pressureRun(page,f);assert.equal((await pressureState(page)).world.firms[0].workers.length,2);while((await pressureState(page)).world.day<9)await pressureRun(page,f);finished=await pressureState(page);
 }
 const first=structuredClone(finished);await f.getByRole('button',{name:'重新开局，换一条路 ↺',exact:true}).click();await f.locator('.competitive-pressure[data-day="0"]').waitFor();assert.deepEqual((await pressureState(page)).paths.at(-1),first.world);
 console.log('Second path begins: '+spec.width);await pressureRun(page,f);await pressureMove(page,f,'follow','counter',spec.method);console.log('Follow placed: '+spec.width);await continueUntil(page,f,2);
 if(spec.width===390){
  await f.getByTestId('pressure-continue').click();
  // Match the pause action, not a recycled test-id that becomes Start at a checkpoint.
  // UI automation can take longer than a day on a busy machine; the invariant is
  // no more settlements after the actual pause, not an exact reaction time.
  await f.getByRole('button',{name:'暂停营业 Ⅱ',exact:true}).click();await pressureReady(f);
  const paused=await pressureState(page);assert(paused.world.day>=3&&paused.world.day<7);
  await page.waitForTimeout(900);assert.deepEqual(await pressureState(page),paused,'pause prevents another real settlement');await page.reload();f=await frame(page);await pressureReady(f);assert.deepEqual(await pressureState(page),paused);assert.equal(await f.getByTestId('pressure-continue').innerText(),'照此安排，继续营业 ▷');
 }
 await continueUntil(page,f,5);await continueUntil(page,f,7);assert.equal((await pressureState(page)).world.history.at(-1).shortOfMoney,2);assert((await f.locator('.pressure-consequence').innerText()).includes('人来了，钱不够'));await continueUntil(page,f,9);finished=await pressureState(page);assert.equal(finished.world.history[8].shortOfMoney,4);assert.equal(await f.locator('.pressure-jobless .pressure-peep>img').count(),0);await page.screenshot({path:path.join(out,spec.width+'-following-ending.png'),fullPage:true});
 await f.getByRole('button',{name:'如果买不起的人有保障？ →',exact:true}).click();await f.locator('.competitive-pressure[data-stage="support"]').waitFor();let s=await pressureState(page);assert.deepEqual(s.world,rewindPressure(finished.world,7));assert.deepEqual(s.reference,finished.world);const before=structuredClone(s.world);
 for(const [coin,person]of [2,3,6,7].entries())await pressureMove(page,f,'coin:'+coin,'wallet:'+person,spec.method);assert.deepEqual((await pressureState(page)).world,before);assert.deepEqual((await pressureState(page)).coins,[2,3,6,7]);
 await pressureMove(page,f,'coin:0','fund',spec.method);assert.equal((await pressureState(page)).coins[0],null);await pressureMove(page,f,'coin:0','wallet:2',spec.method);s=await pressureState(page);await page.reload();f=await frame(page);await pressureReady(f);assert.deepEqual(await pressureState(page),s);await fits(f);await page.screenshot({path:path.join(out,spec.width+'-support-draft.png'),fullPage:true});
 for(let i=0;i<3;i++){
  if(i===0&&spec.width===1280){
   await f.getByTestId('pressure-run').click();await f.locator('.pressure-payday[data-support-paid="1"]').first().waitFor();
   assert.equal(await f.locator('.pressure-payday[data-support-paid="1"]').count(),4);
   assert.equal((await pressureState(page)).world.day,7,'support animation never pays twice');await pressureReady(f);await assertPressureFeedback(page,f);
  }else await pressureRun(page,f);
  s=await pressureState(page);const r=s.world.history.at(-1);assert.deepEqual(r.support.paid,[2,3,6,7]);assert.equal(r.action,finished.world.history[r.day-1].action);assert.equal(r.shortOfMoney,0);assert.equal(pressureMoney(s.world),120);
 }
 const protectedRun=structuredClone(s);
 await f.getByRole('button',{name:'翻回第7天',exact:true}).click();await f.locator('.competitive-pressure[data-day="6"]').waitFor();
 for(const [coin,person]of [0,1,4,5].entries())await pressureMove(page,f,'coin:'+coin,'wallet:'+person,spec.method);
 for(let i=0;i<3;i++)await pressureRun(page,f);
 const untargeted=await pressureState(page);assert.equal(untargeted.world.history.at(-1).shortOfMoney,4);assert.equal(untargeted.world.history.at(-1).support.remaining,0);assert.equal(pressureMoney(untargeted.world),120);
 assert((await f.locator('.pressure-consequence>p').innerText()).includes('仍有4人有货却买不起'));await page.screenshot({path:path.join(out,spec.width+'-support-other-recipients.png'),fullPage:true});
 await f.getByRole('button',{name:'翻回第7天',exact:true}).click();await f.locator('.competitive-pressure[data-day="6"]').waitFor();
 for(const [coin,person]of [2,3,6,7].entries())await pressureMove(page,f,'coin:'+coin,'wallet:'+person,spec.method);
 for(let i=0;i<3;i++)await pressureRun(page,f);s=await pressureState(page);assert.deepEqual(s.world,protectedRun.world,'same allocation replays the same receipts');
 assert.equal(s.world.history.at(-1).support.remaining,0);assert(s.world.history.at(-1).stock.reduce((a,b)=>a+b,0)>0);await fits(f);await page.screenshot({path:path.join(out,spec.width+'-support-ending.png'),fullPage:true});await f.getByRole('button',{name:'这局说明了什么？ →',exact:true}).click();await f.getByTestId('technology-report').waitFor();await page.reload();f=await frame(page);await f.getByTestId('technology-report').waitFor();assert.equal((await pressureState(page)).phase,'conclusion');assert.deepEqual(restorePressureStory(await pressureState(page)),await pressureState(page));assert.equal(await f.locator('.street-bounds[open],.technology-report[open]').count(),0);
 results.push({...spec,firstStoppedDay:originalFinished.world.history.find(r=>r.closed[0])?.day,stoppedDayRetry:spec.choice==='hold',automaticCheckpoints:[2,5,7,9],actualReceiptTrace:true,followMoneyPoor:4,supportMoneyPoor:0,finiteBudgetUsed:12,supportStock:s.world.history.at(-1).stock,draftsUnpaid:true,refund:true,refresh:true,allPeopleVisible:true});await context.close();console.log('Main pressure checked: '+spec.width+' '+spec.method);
 }assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html')))&&bytes.equals(await fs.readFile(file)));await fs.writeFile(path.join(out,'report.json'),JSON.stringify({checkedAt:new Date().toISOString(),buildSHA256:createHash('sha256').update(bytes).digest('hex'),results,errors,external},null,2)+'\n');
}catch(e){for(const context of browser.contexts())for(const page of context.pages()){await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});console.error(await pressureState(page).catch(()=>null));}throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}
