/** Actual early branching and old-prefix restoration, not fabricated progress. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {remedyAccounts} from '../lib/remedy-lab.ts';
import {verifyRemedyPeek} from './remedy-peek-browser-gestures.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),bytes=await fs.readFile(path.join(root,'build/index.html'));
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,output=path.join(root,'outputs/relief-qa');await fs.mkdir(output,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
const save=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),PROLOGUE_STORAGE_KEY);
async function frame(p){const f=await(await p.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();return f;}
async function settled(f){await f.waitForFunction(()=>!document.body.dataset.transition);}
async function send(p,f,locator,keyboard=false){const before=JSON.stringify(await save(p));if(keyboard)await locator.press('Enter');else await locator.click();await p.waitForFunction(({key,before})=>localStorage.getItem(key)!==before,{key:PROLOGUE_STORAGE_KEY,before});await settled(f);}
async function move(p,f,mode,n,keyboard){await f.waitForFunction(mode=>{const b=document.querySelector('[data-gesture-target="'+mode+'"]');return b&&!b.disabled;},mode);await send(p,f,f.locator('[data-gesture-target="'+mode+'"]'),keyboard);await f.locator('.remedy-scene[data-round="'+n+'"]').waitFor();}
function rewind(f,n){return f.getByRole('button',{name:'从第'+n+'回合重打，保留原记录',exact:true});}
async function staticPrefix(f,n){await f.locator('.remedy-scene[data-round="'+n+'"][data-animate=false]').waitFor();assert.equal(await f.locator('.remedy-message[data-cash-step],.remedy-bank-flow animateMotion').count(),0);}
try{
 for(const spec of [{width:320,keyboard:true},{width:390,offline:true,reduced:true},{width:1280}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:960},reducedMotion:spec.reduced?'reduce':'no-preference',hasTouch:spec.width<600});
  await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||spec.offline&&u===offline)return r.continue();external.push(u);return r.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(spec.offline?offline:url);let f=await frame(page);
  await f.locator('#dots [data-stage="4"]').click();await f.locator('.remedy-card').first().waitFor();await settled(f);
  for(const [route,first,alternative] of [['consumption','credit','raise'],['investment','expand','replace'],['exports','single','diverse']]){
   await send(page,f,f.locator('.remedy-card[data-route="'+route+'"]'),spec.keyboard);await f.locator('.gesture-zones').waitFor();
   assert.equal(await f.locator('.remedy-replay').count(),0);await move(page,f,first,1,spec.keyboard);
   assert.equal(await f.locator('.remedy-replay').count(),1);assert((await rewind(f,1).boundingBox()).height>=44);assert.equal(await rewind(f,2).count(),0);
   await move(page,f,first,2,spec.keyboard);const original=(await save(page)).remedyLabs[route],old=remedyAccounts(original);assert.equal(await f.locator('.remedy-replay').count(),2);assert.equal(await rewind(f,3).count(),0);assert.equal(await f.getByTestId('remedy-reply').count(),0);
   await f.waitForFunction(()=>!document.querySelector('.remedy-message').dataset.cashStep);assert.equal(await f.locator('.remedy-battle').getAttribute('data-beat'),'anticipate');assert.equal(old.riskSeen,false);const defaultChallengeHeight=(await f.locator('.remedy-battle').boundingBox()).height;assert(defaultChallengeHeight<620);await page.screenshot({path:path.join(output,'early-'+spec.width+'-'+route+'-default-challenge.png'),fullPage:true});
   await send(page,f,rewind(f,2),spec.keyboard);await staticPrefix(f,1);let lab=(await save(page)).remedyLabs[route];assert.deepEqual(lab.history,original.history.slice(0,1));assert.deepEqual(lab.archives,[{history:original.history,comparisons:[]}]);assert.deepEqual(remedyAccounts(lab).display.world,old.reports[0].world);
   await page.reload();f=await frame(page);await settled(f);await staticPrefix(f,1);assert.deepEqual((await save(page)).remedyLabs[route],lab);
   const readOnly=await save(page);await f.locator('.remedy-path-records>summary').click();const group=f.locator('.remedy-path-records>details');await group.locator('summary').first().click();assert.match(await group.locator('summary').first().innerText(),/只试到第2回合/);await group.locator('.remedy-receipt').nth(1).waitFor({state:'attached'});assert.equal(await group.locator('.remedy-receipt').count(),2);assert.deepEqual(await save(page),readOnly);await f.locator('.remedy-path-records>summary').click();
   await move(page,f,alternative,2,spec.keyboard);if(!spec.reduced)await f.waitForFunction(()=>!document.querySelector('.remedy-message').dataset.cashStep);
   const a=remedyAccounts((await save(page)).remedyLabs[route]);assert.deepEqual(a.reports[0],old.reports[0]);assert.match(await f.getByTestId('remedy-comparison').innerText(),/前2回合对照.*第2回合/s);assert.equal(a.canContinue,false);assert(!(await save(page)).reliefCompleted.includes(route));
   const pathPeek=await verifyRemedyPeek(page,f,old,{...spec,route},()=>page.screenshot({path:path.join(output,'peek-'+spec.width+'-'+route+'-old-path.png'),fullPage:true}));
   if(route==='consumption')assert.equal(a.display.repayment,12,'the earlier real loan is still due');
   await page.screenshot({path:path.join(output,'early-'+spec.width+'-'+route+'-compare.png'),fullPage:true});
   await send(page,f,rewind(f,1),spec.keyboard);await staticPrefix(f,0);lab=(await save(page)).remedyLabs[route];assert.equal(lab.archives.length,2);assert.equal(remedyAccounts(lab).opening.cash.shop,60);
   await move(page,f,alternative,1,spec.keyboard);await move(page,f,alternative,2,spec.keyboard);const changed=(await save(page)).remedyLabs[route];assert.deepEqual(changed.archives[0].history,original.history);assert.match(await f.getByTestId('remedy-comparison').innerText(),/前2回合对照/);
   await f.locator('.remedy-battle[data-beat=anticipate]').waitFor();await f.waitForFunction(()=>!document.querySelector('.remedy-message').dataset.cashStep);const challenge=f.getByTestId('remedy-challenge');assert.match(await challenge.innerText(),/试一次逆风/);assert.equal(await challenge.getAttribute('data-outlook'),'adverse');assert.equal(await f.getByTestId('remedy-impact').count(),0);
   const prepared=await save(page),beforeDraft=remedyAccounts(prepared.remedyLabs[route]);assert.equal(beforeDraft.riskSeen,false);
   for(const outlook of ['supported','normal','adverse']){
    await f.locator('.remedy-tools>summary').click();await send(page,f,f.getByTestId('remedy-prepare-'+outlook),spec.keyboard);
    const current=(await save(page)).remedyLabs[route];assert.deepEqual(remedyAccounts(current),beforeDraft);assert.equal(current.thirdOutlook,outlook);await staticPrefix(f,2);assert.equal(await f.getByTestId('remedy-challenge').getAttribute('data-outlook'),outlook);assert.equal(await f.getByTestId('remedy-impact').count(),0);
   }
   await page.reload();f=await frame(page);await settled(f);await staticPrefix(f,2);assert.equal(await f.getByTestId('remedy-challenge').getAttribute('data-outlook'),'adverse');assert((await f.locator('.remedy-battle').boundingBox()).height<700,'even an early path comparison must remain compact');assert.equal(await f.locator('.remedy-tools').evaluate(n=>n.open),false);await page.screenshot({path:path.join(output,'early-'+spec.width+'-'+route+'-challenge.png'),fullPage:true});
   await move(page,f,alternative,3,spec.keyboard);await f.locator('.remedy-battle[data-beat=respond]').waitFor();assert.equal(await f.getByTestId('remedy-reply').count(),0);assert.equal(await f.getByTestId('remedy-comparison').count(),0,'a partial original cannot be relabelled a full path');
   assert.equal((await save(page)).remedyLabs[route].history[2].outlook,'adverse');assert.equal((await save(page)).remedyLabs[route].comparisons.length,0);await f.getByTestId('remedy-impact').waitFor();const realBeforeCounter=remedyAccounts((await save(page)).remedyLabs[route]);await move(page,f,first,3,spec.keyboard);await f.locator('.remedy-battle[data-beat=free]').waitFor();
   const done=(await save(page)).remedyLabs[route];assert.equal(done.archives.length,2);assert.equal(done.history.length+done.comparisons.length,4);assert(remedyAccounts(done).canContinue);const turnPeek=await verifyRemedyPeek(page,f,realBeforeCounter,{...spec,route,immediate:route==='consumption'&&!spec.reduced},()=>page.screenshot({path:path.join(output,'peek-'+spec.width+'-'+route+'-old-turn.png'),fullPage:true}));await send(page,f,f.getByRole('button',{name:'收下这张处方的教训 →',exact:true}),spec.keyboard);await f.locator('.remedy-card').first().waitFor();assert((await save(page)).reliefCompleted.includes(route));
   assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));results.push({width:spec.width,route,offline:!!spec.offline,firstAndSecondReplay:true,partialReceipts:true,samePeriodComparison:true,notPrematurelyCompleted:true,noFakeRestorePayment:true,refresh:true,announcedThirdCondition:true,fourActualExecutions:true,defaultChallengeHeight,pathPeek,turnPeek});
  }
  assert.equal((await save(page)).reliefCompleted.length,3);await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html'))));
 const report={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,passed:true,results,errors,external};await fs.writeFile(path.join(output,'remedy-early-replay-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(output,'early-failure-'+p.viewportSize().width+'.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await browser.close();await new Promise(r=>server.close(r));}
