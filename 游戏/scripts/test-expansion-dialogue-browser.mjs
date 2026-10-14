import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {initialPrologue,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import '../lib/bakery-expansion.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html')),out=path.join(root,'outputs/expansion-dialogue-qa');await fs.mkdir(out,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(req.url==='/favicon.ico'?204:200,{'Content-Type':'text/html; charset=utf-8'});res.end(req.url==='/favicon.ico'?undefined:bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],cases=[];
try{
 for(const width of [1280,390,320]){
  const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'});
  await context.route('**/*',r=>{if(r.request().url().startsWith(url)||r.request().url().startsWith('file:'))return r.continue();external.push(r.request().url());return r.abort();});
  const saved=initialPrologue();saved.scene='bakery-expansion';saved.bakeryCommitted=true;saved.bakeryWage=4;
  await context.addInitScript(({saved,key})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{saved,key:PROLOGUE_STORAGE_KEY});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(width===320?pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href:url);
  const f=await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);
  assert(await f.locator('#expansion-thought').isVisible());
  for(let i=0;i<6;i++){
   await f.getByRole('button',{name:'下一步 →',exact:true}).click();assert.equal(await f.locator('#expansion-thought').textContent(),globalThis.BakeryExpansionTimeline.bossLines[i]);assert.equal(await f.locator('body').getAttribute('data-expansion-count'),String(2**(i+1)));
   const geometry=await f.evaluate(()=>{const bubble=document.getElementById('expansion-thought'),b=bubble.getBoundingClientRect(),c=document.querySelector('.stage-object canvas').getBoundingClientRect(),stage=window.__trustStage,scale=c.width/stage.width,boss=stage.expansion.boss.getBounds();return {right:b.right,left:b.left,top:b.top,bottom:b.bottom,headX:c.left+(boss.x+boss.width/2)*scale,headY:c.top+boss.y*scale,tailX:b.left+parseFloat(getComputedStyle(bubble).getPropertyValue('--expansion-tail-x'))+8,page:document.documentElement.scrollWidth,viewport:innerWidth,animation:getComputedStyle(bubble).animationName,units:stage.expansion.units.filter(u=>u.graphics.visible).map(u=>{const r=u.graphics.getBounds();return {left:c.left+r.x*scale,right:c.left+(r.x+r.width)*scale,top:c.top+r.y*scale,bottom:c.top+(r.y+r.height)*scale};})};});
   assert(geometry.left>=0&&geometry.right<=geometry.viewport&&geometry.page<=geometry.viewport+1);assert(Math.abs(geometry.tailX-geometry.headX)<2,'tail must point to boss head');assert(geometry.headY-geometry.bottom>=12&&geometry.headY-geometry.bottom<=16,'bubble must stay close to boss');assert.equal(geometry.animation,'none');
   geometry.units.forEach(u=>assert(Math.min(geometry.right,u.right)-Math.max(geometry.left,u.left)<=1||Math.min(geometry.bottom,u.bottom)-Math.max(geometry.top,u.top)<=1,'bubble overlaps production'));
   if(i===2)await page.screenshot({path:path.join(out,width+'-hiring-bubble.png'),fullPage:true});
  }
  if(width===390){const time=await f.evaluate(()=>window.__trustStage.expansion.time);await page.setViewportSize({width:601,height:950});await f.waitForFunction(()=>window.__trustStage.width===960);
   const resized=await f.evaluate(()=>{const e=window.__trustStage,c=document.querySelector('.stage-object canvas').getBoundingClientRect(),bubble=document.getElementById('expansion-thought'),b=bubble.getBoundingClientRect(),boss=e.expansion.boss.getBounds(),scale=c.width/e.width;return {time:e.expansion.time,tail:b.left+parseFloat(getComputedStyle(bubble).getPropertyValue('--expansion-tail-x'))+8,head:c.left+(boss.x+boss.width/2)*scale,gap:c.top+boss.y*scale-b.bottom};});
   assert.equal(resized.time,time);assert(Math.abs(resized.tail-resized.head)<2);assert(resized.gap>=12&&resized.gap<=16);await page.screenshot({path:path.join(out,'601-resized-alignment.png'),fullPage:true});
  }
  await f.getByRole('button',{name:'下一步 →',exact:true}).click();assert.equal(await f.locator('#expansion-thought').isVisible(),false);assert(await f.locator('#expansion-question').isVisible());
  await f.getByRole('button',{name:'重播 ↺',exact:true}).click();assert.equal(await f.locator('#expansion-thought').textContent(),'我可以买更多的机器，赚更多钱。');
  const snapshot=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROLOGUE_STORAGE_KEY);assert.equal(snapshot.bakeryWage,4);assert.equal(snapshot.bakeryCommitted,true);
  cases.push({width,lines:6,noOverlap:true,replay:true,choicesPreserved:true});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({cases,errors,external},null,2));console.log(JSON.stringify({passed:cases.length,errors,external},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
