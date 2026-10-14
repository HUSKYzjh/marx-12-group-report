/** A card must not dodge a pointer on its lower edge, including touch-layout QA. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(new URL('../build/index.html',import.meta.url)),server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),results=[],errors=[];
try{
 for(const spec of [{width:320,reduced:true},{width:390,reduced:true},{width:390},{width:1280}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:960},reducedMotion:spec.reduced?'reduce':'no-preference',hasTouch:spec.width<600}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/');
  const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();await f.locator('#dots [data-stage="4"]').click();await f.locator('.remedy-card').first().waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);
  await page.waitForFunction(k=>!!localStorage.getItem(k),PROLOGUE_STORAGE_KEY);
  assert.equal(await f.locator('.remedy-card').count(),3);assert.equal(await f.locator('.remedy-encounter-shelf').count(),1);
  assert.match(await f.locator('.remedy-encounter-shelf').getAttribute('aria-label'),/示意.*不是本次库存/);
  for(const route of ['consumption','investment','exports']){
   const n=f.locator('.remedy-card[data-route='+route+']');assert.equal(await n.locator('[data-adviser='+route+']').count(),1);
   assert(Array.from(await n.locator('.remedy-card-promise').innerText()).length<=9);assert.equal(await n.locator('.remedy-card-progress').innerText(),'→');
   assert.match(await n.getAttribute('aria-label'),/试这张处方/);assert.equal(await n.locator('button,a').count(),0,'one card is one decision, no dialogue confirmation');
   const art=await n.locator('.remedy-card-art').boundingBox(),bounds=await n.boundingBox();assert(art.x>=bounds.x&&art.x+art.width<=bounds.x+bounds.width&&art.y>=bounds.y&&art.y+art.height<=bounds.y+bounds.height,'the person stays inside their choice');
  }
  assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await fs.mkdir(new URL('../outputs/relief-qa/',import.meta.url),{recursive:true});await page.screenshot({path:fileURLToPath(new URL('../outputs/relief-qa/advisers-'+spec.width+'-'+(spec.reduced?'reduced':'normal')+'.png',import.meta.url)),fullPage:true});
  const before=await page.evaluate(k=>localStorage.getItem(k),PROLOGUE_STORAGE_KEY),card=f.locator('.remedy-card[data-route=investment]');await card.scrollIntoViewIfNeeded();const box=await card.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height-1);
  const sample=await card.evaluate(async n=>{const data=[];for(let i=0;i<36;i++){await new Promise(r=>requestAnimationFrame(r));const b=n.getBoundingClientRect();data.push({y:b.y,height:b.height,transform:getComputedStyle(n).transform,hovered:n.matches(':hover')});}return data;});
  const drift=Math.max(...sample.map(r=>r.y))-Math.min(...sample.map(r=>r.y));console.log(JSON.stringify({width:spec.width,reduced:!!spec.reduced,drift,sample:sample.slice(0,8)}));assert(drift<.5,'the card itself must stay still at a lower-edge hover');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),PROLOGUE_STORAGE_KEY),before);
  const edge={x:box.width/2,y:box.height-2};if(spec.width<600)await card.tap({position:edge});else await card.click({position:edge});
  await f.locator('[data-gesture-target=expand]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);assert.equal(await f.locator('.remedy-scene').getAttribute('data-round'),'0');
  await f.getByRole('button',{name:'先看看别的处方 ↩',exact:true}).click();await f.locator('.remedy-card').first().waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);
  await f.locator('.remedy-card[data-route=investment]').press('Enter');await f.locator('[data-gesture-target=expand]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);
  const saved=await page.evaluate(k=>localStorage.getItem(k),PROLOGUE_STORAGE_KEY);await f.locator('[data-gesture-target=expand]').click();await f.locator('.remedy-scene[data-round="1"]').waitFor();await page.waitForFunction(({key,saved})=>localStorage.getItem(key)!==saved,{key:PROLOGUE_STORAGE_KEY,saved});
  const operated=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).remedyLabs,PROLOGUE_STORAGE_KEY);
  await f.getByRole('button',{name:'先看看别的处方 ↩',exact:true}).click();await f.locator('.remedy-card').first().waitFor();assert.equal(await f.locator('.remedy-card[data-route=investment] .remedy-card-progress').innerText(),'接着玩 →');
  assert.deepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).remedyLabs,PROLOGUE_STORAGE_KEY),operated);
  await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k))?.reliefRoute===null,PROLOGUE_STORAGE_KEY);
  await page.reload();const refreshed=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await refreshed.locator('body[data-ready=true]').waitFor();assert.equal(await refreshed.locator('.remedy-card[data-route=investment] .remedy-card-progress').innerText(),'接着玩 →');
  results.push({width:spec.width,reduced:!!spec.reduced,drift,edgeClick:true,noHoverPayment:true,keyboardChoice:true,actualResume:true,refresh:true});await context.close();
 }
 assert.deepEqual(errors,[]);const report={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,passed:true,results,errors};await fs.writeFile(new URL('../outputs/relief-qa/remedy-menu-hover-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();await new Promise(r=>server.close(r));}
