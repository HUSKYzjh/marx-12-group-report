import {chooseBattleMove} from './prologue-battle-browser-gestures.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url)),bytes=await fs.readFile(path.join(root,'build/index.html')),out=path.join(root,'outputs/bakery-time-qa');await fs.mkdir(out,{recursive:true});
const server=http.createServer((_,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href;
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),results=[],errors=[],external=[];
async function frame(p){const f=await(await p.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);return f;}
const saved=p=>p.evaluate(k=>localStorage.getItem(k),PROLOGUE_STORAGE_KEY);
try{
 for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<600,reducedMotion:width<600?'reduce':'no-preference'});await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||u===offline)return r.continue();external.push(u);return r.abort();});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(width===390?offline:url);let f=await frame(p);
  await f.getByRole('button',{name:'开始 →',exact:true}).click();await f.locator('body[data-scene=bakery]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);
  await f.locator('#bakery-skip').click();await f.locator('body[data-scene=bakery-upgrade]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);
  await f.locator('#bakery-skip').click();await f.locator('#upgrade-confirm').click();await f.getByTestId('bakery-time').waitFor();await f.waitForFunction(()=>window.__trustStage.bakery.sample.showBalances);
  const original=await saved(p),desk=f.getByTestId('bakery-time');assert.equal(await f.evaluate(()=>window.__trustStage.bakery.sample.paid),15);
  await desk.locator('[data-time-plan=more]').press('Enter');assert.equal(await desk.getAttribute('data-loaves'),'12');assert.equal(await desk.getAttribute('data-hours'),'6');assert.equal(await desk.locator('.bakery-time-tray img').count(),12);assert.equal(await desk.locator('[data-time-plan=more]').evaluate(n=>n===document.activeElement),true);
  await desk.locator('[data-time-plan=rest]').click();assert.equal(await desk.getAttribute('data-loaves'),'8');assert.equal(await desk.getAttribute('data-hours'),'4');assert.equal(await desk.locator('.free').count(),2);assert.equal(await saved(p),original);assert.equal(await f.evaluate(()=>window.__trustStage.bakery.sample.paid),15);
  assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));for(const b of await desk.locator('button').all())assert((await b.boundingBox()).height>=44);
  await desk.locator('.bakery-time-tray img').last().evaluate(n=>Promise.all(n.parentNode.getAnimations({subtree:true}).map(a=>a.finished)));
  await p.screenshot({path:path.join(out,'time-'+width+'.png'),fullPage:true});
  await f.getByRole('button',{name:'重播 ↺',exact:true}).click();assert.equal(await desk.isVisible(),false);await f.locator('#bakery-skip').click();await desk.waitFor();
  await p.reload();f=await frame(p);if(width<600)await f.locator('#bakery-skip').click();await f.getByTestId('bakery-time').waitFor();assert.equal(await f.getByTestId('bakery-time').getAttribute('data-plan'),null,'local counterfactual resets; actual wage retained');
  await f.getByRole('button',{name:'再买些烤炉 →',exact:true}).click();await f.locator('body[data-scene=bakery-expansion]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);await f.locator('#expansion-skip').click();await f.locator('#expansion-next').click();await f.locator('body[data-scene=street]').waitFor();
  const battle=await(await f.locator('#prologue-battle').elementHandle()).contentFrame();await battle.locator('#opening-guide[open]').waitFor();
  for(let i=0;i<4;i++)await battle.locator('#opening-next').click();await battle.locator('#opening-start').click();
  await chooseBattleMove(battle,'upgrade');await battle.locator('#receipt').waitFor();assert.equal(await battle.locator('#oven-report').count(),0,'paying is not delivery');await battle.locator('#advance').click();await battle.locator('[data-move=hold]').click();await battle.locator('#oven-report').waitFor();
  const account=await saved(p);await battle.locator('#oven-report').press('Enter');const report=battle.getByTestId('oven-receipt');await report.waitFor();assert.match(await report.textContent(),/6 个.*12 个/s);assert.match(await report.textContent(),/相邻两天/);assert.equal(await saved(p),account);assert(await battle.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert(await battle.evaluate(()=>{const h=document.getElementById('detail-title'),b=document.getElementById('detail-close').getBoundingClientRect(),r=document.createRange();r.selectNodeContents(h);return [...r.getClientRects()].every(a=>a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom);}), 'title text must avoid close button');
  await p.screenshot({path:path.join(out,'oven-report-'+width+'.png'),fullPage:true});await battle.locator('#detail-close').click();
  await p.reload();f=await frame(p);const restored=await(await f.locator('#prologue-battle').elementHandle()).contentFrame();await restored.locator('#oven-report').waitFor();await restored.locator('#oven-report').click();await restored.getByTestId('oven-receipt').waitFor();
  results.push({width,offline:width===390,realFirstAct:true,plansReadOnly:true,replayHidden:true,reloadReset:true,expansionPreserved:true,actualDeliveryReport:true,oldLedgerUnchanged:true});console.log('PASS time and oven report',width);await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html'))));await fs.writeFile(path.join(out,'report.json'),JSON.stringify({passed:true,builtSha256:createHash('sha256').update(bytes).digest('hex'),results,errors,external},null,2));
}catch(e){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(out,'failure-'+p.viewportSize().width+'.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await browser.close();await new Promise(r=>server.close(r));}
