/** Actual exported-order preflight before the full fourth-act regression. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {remedyAccounts} from '../lib/remedy-lab.ts';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(new URL('../build/index.html',import.meta.url));
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(fileURLToPath(new URL('../offline/技术红利去了哪里.html',import.meta.url))).href;
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),results=[],errors=[];
const output=new URL('../outputs/relief-qa/',import.meta.url);await fs.mkdir(output,{recursive:true});
try{
 for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:960},hasTouch:width<600,reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(width===390?offline:url);
  const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();
  await f.locator('#dots [data-stage="4"]').click();await f.locator('.remedy-card[data-route="exports"]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);await f.locator('.remedy-card[data-route="exports"]').click();await f.waitForFunction(()=>!document.body.dataset.transition);
  async function shot(name){await page.screenshot({path:fileURLToPath(new URL('export-'+width+'-'+name+'.png',output)),fullPage:true});}
  async function check(status){
   await page.waitForFunction(key=>{try{return !!JSON.parse(localStorage.getItem(key))?.remedyLabs?.exports;}catch{return false;}},PROLOGUE_STORAGE_KEY);
   const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROLOGUE_STORAGE_KEY),r=remedyAccounts(saved.remedyLabs.exports).display,n=f.locator('.remedy-export-network');
   assert.equal(await n.getAttribute('data-status'),status);assert.equal(await n.getAttribute('data-shipped'),String(r?.exports??0));assert.equal(await n.getAttribute('data-transport'),String(r?.transport??0));assert.equal(await n.locator('animateMotion').count(),0);assert.equal(await f.locator('.remedy-flow').isVisible(),false);
   const overlaps=await n.evaluate(n=>{const b=n.getBoundingClientRect();return [...n.closest('.remedy-scene').querySelectorAll('.remedy-status,.remedy-leftovers')].filter(s=>{const a=s.getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}).map(s=>s.className);});assert.deepEqual(overlaps,[],JSON.stringify({width,status,network:await n.boundingBox(),cash:await f.locator('.remedy-cash-status').boundingBox()}));assert((await n.boundingBox()).height>=44);assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const people=n.locator('.remedy-export-customer'),expected=r?.control.mode==='single'?1:3;
   assert.equal(await people.count(),expected);assert.equal(await n.getAttribute('data-customers'),String(expected));
   for(const person of await people.all()){
    assert.equal(await person.getAttribute('viewBox'),'0 0 120 140','keep the full original person rather than crop the head');
    const box=await person.boundingBox();assert(box.height>=25&&box.width>=20,JSON.stringify({width,status,box}));
   }
   const track=f.locator('.remedy-track');assert.deepEqual((await track.locator('li').allTextContents()).map(t=>t.trim()),['1','2','3']);
   assert.equal(await track.locator('li[aria-current]').count(),1);assert.equal(await track.locator('li[aria-current]').innerText(),String(Math.min(3,(r?.round??0)+1)));
   for(const replay of await track.locator('button').all()){const box=await replay.boundingBox();assert(box.width>=44&&box.height>=44);assert.match(await replay.getAttribute('aria-label'),/从第[123]回合重打，保留原记录/);}
   await n.scrollIntoViewIfNeeded();const box=await f.locator('.remedy-commands').boundingBox(),question=await f.locator('.remedy-message').textContent();await n.click();assert.equal(await f.locator('.remedy-message').getAttribute('data-inspecting'),'true');const during=await f.locator('.remedy-commands').boundingBox();for(const k of ['x','y','width','height'])assert(Math.abs(box[k]-during[k])<1,JSON.stringify({status,k,box,during}));assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROLOGUE_STORAGE_KEY),saved);await f.waitForFunction(q=>document.querySelector('.remedy-message').textContent===q,question);const restored=await f.locator('.remedy-commands').boundingBox();for(const k of ['x','y','width','height'])assert(Math.abs(box[k]-restored[k])<1);return saved;
  }
  async function send(button){const prior=await page.evaluate(key=>localStorage.getItem(key),PROLOGUE_STORAGE_KEY);if(width<600)await button.tap();else await button.click();await page.waitForFunction(({key,prior})=>localStorage.getItem(key)!==prior,{key:PROLOGUE_STORAGE_KEY,prior});}
  async function move(mode,round){await f.waitForFunction(mode=>!document.querySelector('[data-gesture-target="'+mode+'"]').disabled,mode);await send(f.locator('[data-gesture-target="'+mode+'"]'));await f.locator('.remedy-scene[data-round="'+round+'"]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);}
  await check('ready');await shot('opening');await move('single',1);const actual=await check('traded');await shot('first');
  await f.getByRole('button',{name:'看看本期出口',exact:true}).click();assert.match(await f.locator('.remedy-message').innerText(),/跑腿/);assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROLOGUE_STORAGE_KEY),actual);await f.waitForFunction(()=>!document.querySelector('.remedy-export-network').dataset.checked);
  await move('single',2);await check('reduced');await f.locator('.remedy-tools>summary').click();await send(f.getByTestId('remedy-prepare-normal'));await move('single',3);await check('reduced');await send(f.getByRole('button',{name:'如果大客户停单？ →',exact:true}));await f.getByTestId('remedy-impact').waitFor();await check('stopped');assert.equal(await f.locator('.remedy-export-stop').count(),1);await shot('stop');
  await move('diverse',3);await f.locator('.remedy-export-network[data-mode="diverse"]').waitFor();await check('reduced');assert.equal(await f.locator('.remedy-export-customer[data-connected="true"]').count(),3);assert.equal(await f.locator('.remedy-export-stop').count(),0);await shot('response');
  await page.reload();const refreshed=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await refreshed.locator('body[data-ready="true"]').waitFor();assert.equal(await refreshed.locator('.remedy-export-network').getAttribute('data-shipped'),'5');assert.equal(await refreshed.locator('.remedy-export-network').getAttribute('data-transport'),'3');results.push({width,offline:width===390,passed:true,noConsoleShift:true,explicitNormalThirdTurn:true});await context.close();
 }
 assert.deepEqual(errors,[]);const report={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,passed:true,results,errors};await fs.writeFile(new URL('remedy-export-report.json',output),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();await new Promise(r=>server.close(r));}
