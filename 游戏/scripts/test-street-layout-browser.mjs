import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {initialPrologue,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {STREET_VERSION,createStreetGame,createStreetStory,streetReducer,streetMoney} from '../lib/street-game.ts';
import {build} from 'esbuild';
import {legacyStreetGame} from '../tests/fixtures/street-legacy.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const machineBundle=await build({entryPoints:[path.join(root,'lib/machine-experiment.ts')],bundle:true,write:false,platform:'node',format:'cjs'}),machineModule={exports:{}};
new Function('require','module','exports',machineBundle.outputFiles[0].text)(createRequire(import.meta.url),machineModule,machineModule.exports);
const {initialMachine,MACHINE_STORAGE_KEY}=machineModule.exports;
const bytes=await fs.readFile(path.join(root,'build/index.html'));
const output=path.join(root,'outputs/street-layout-qa');await fs.mkdir(output,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(req.url==='/favicon.ico'?204:200,{'Content-Type':'text/html; charset=utf-8'});res.end(req.url==='/favicon.ico'?undefined:bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/';
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
const errors=[],external=[],results=[];
async function ready(context,saved,offline=false){
 await context.route('**/*',route=>{if(route.request().url().startsWith(url)||route.request().url().startsWith('file:'))return route.continue();external.push(route.request().url());return route.abort();});
 await context.addInitScript(({saved,key})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{saved,key:PROLOGUE_STORAGE_KEY});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(offline?pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href:url);
 const f=await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);return {page,f};
}
try{
 for(const width of [1280,601,390,320]){
  const context=await browser.newContext({viewport:{width,height:1100},reducedMotion:'reduce'});
  const saved=initialPrologue();saved.scene='street';saved.street=createStreetGame(5);
  const {page,f}=await ready(context,saved,width===320);
  assert.equal(await f.locator('.street-shop').count(),6);assert.equal(await f.locator('.street-team').count(),6);assert.equal(await f.locator('.street-firm-metrics svg').count(),18);
  await f.locator('#street-run').click();await f.waitForFunction(()=>window.__trustStage.street.game.world.round===1&&window.__trustStage.street.time===8);
  await f.locator('.street-person[aria-label="查看bakery-0的心声"]').click();
  const thought=await f.evaluate(()=>({text:document.querySelector('.street-thought').textContent,balance:document.querySelector('.street-person-balance').textContent,items:[...document.querySelectorAll('.street-shopping-list li')].map(n=>({kind:n.dataset.kind,outcome:n.dataset.outcome})),person:window.__trustStage.street.game.world.people.find(p=>p.id==='bakery-0')}));
  assert(thought.balance.includes(String(thought.person.cash/100)));assert(thought.text.includes('第1天想买'));assert.deepEqual(thought.items,thought.person.shopping.items.map(({kind,outcome})=>({kind,outcome})));
  await page.screenshot({path:path.join(output,width+'-thought.png'),fullPage:true});
  await f.getByRole('button',{name:'看钱包 →',exact:true}).click();assert(await f.locator('.street-wallet-lines').isVisible());
  await f.getByRole('button',{name:'关闭心声',exact:true}).click();
  const geometry=await f.evaluate(()=>{
   const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
   const stage=window.__trustStage.street;
   return {page:document.documentElement.scrollWidth,viewport:innerWidth,
    stores:[...document.querySelectorAll('.street-shop')].map(rect),teams:[...document.querySelectorAll('.street-team')].map(rect),
    touch:[...document.querySelectorAll('.street-person,#street-run,#street-continuous,.street-speed input')].filter(n=>!n.hidden).map(rect),
    data:[...document.querySelectorAll('.street-firm-metrics')].map(n=>({id:n.dataset.firm,values:[...n.querySelectorAll('output')].map(x=>Number(x.textContent)),rect:rect(n)})),
    expected:stage.game.world.firms.map(n=>({id:n.id,values:[n.stock,n.workers.length,n.cash/100]}))};
  });
  assert(geometry.page<=geometry.viewport+1);
  assert.deepEqual(geometry.data.map(({id,values})=>({id,values})).sort((a,b)=>a.id.localeCompare(b.id)),geometry.expected.sort((a,b)=>a.id.localeCompare(b.id)));
  const boxes=[...geometry.stores,...geometry.teams];
  const intersects=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;
  boxes.forEach((a,i)=>{assert(a.x>=0&&a.right<=geometry.viewport);boxes.slice(i+1).forEach(b=>assert(!intersects(a,b),'shop/staff outlines overlap'));});
  const topology=await f.evaluate(()=>{const p={};document.querySelectorAll('.street-shop').forEach(n=>{const r=n.getBoundingClientRect();p[n.dataset.firm]={x:r.x+r.width/2,y:r.y+r.height/2};});return p;});
  assert(topology.clothes.x<topology.ovens.x&&topology.ovens.x<topology.cars.x);
  assert(Math.abs(topology.clothes.y-topology.cars.y)<1);assert(Math.abs(topology.clothes.y-topology.ovens.y)<1);
  assert(topology.clothes.y<topology.bakery.y&&topology.rival.x<topology.bakery.x&&topology.inputs.x>topology.bakery.x);
  geometry.touch.forEach((a,i)=>{assert(a.w>=44&&a.h>=44&&a.x>=0&&a.right<=geometry.viewport);geometry.touch.slice(i+1).forEach(b=>assert(!intersects(a,b),'stationary person targets overlap'));});
  await page.screenshot({path:path.join(output,width+'-street.png'),fullPage:true});
  const slider=f.getByRole('slider',{name:'营业速度'});await slider.fill('4');await slider.dispatchEvent('input');
  await f.locator('#street-continuous').click();await f.waitForFunction(()=>window.__trustStage.street.game.world.round>=4);
  await f.locator('#street-continuous').click();await f.waitForFunction(()=>window.__trustStage.street.time===8);
  const stopped=await f.evaluate(()=>window.__trustStage.street.game.world.round);await page.waitForTimeout(650);assert.equal(await f.evaluate(()=>window.__trustStage.street.game.world.round),stopped);assert.equal(await f.locator('#street-continuous').getAttribute('aria-pressed'),'false');
  assert.equal(await f.evaluate(()=>window.__trustStage.street.game.world.initialMoney),streetMoney(saved.street.world));
  const played=await f.evaluate(()=>window.__trustStage.street.game);
  await page.reload();const reloaded=await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();await reloaded.locator('body[data-ready="true"]').waitFor();
  assert.deepEqual(await reloaded.evaluate(()=>window.__trustStage.street.game),played);
  results.push({width,round:stopped,stores:6,counters:18,noOverlap:true,continuousStopped:true});await context.close();
 }
 // Retired populations are never drawn, even when saved at a conclusion.
 for(const width of [390,320])for(const phase of ['intro','social']){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),saved=initialPrologue();saved.scene='street';saved.bakeryWage=3;saved.bakeryCommitted=true;saved.street=legacyStreetGame();saved.street.phase=phase;
  saved.street.checkpoint=structuredClone(saved.street.world);saved.street.report=streetReducer(createStreetGame(),{type:'ROUND',expectedRound:0}).report;saved.street.history=[saved.street.report];
  const machine={individual:initialMachine()},machineJSON=JSON.stringify(machine);
  await context.addInitScript(({key,value})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,value);},{key:MACHINE_STORAGE_KEY,value:machineJSON});
  const {page,f}=await ready(context,saved,width===320);page.on('dialog',()=>assert.fail('Retired-version selector must not be shown'));
  assert.equal(await f.locator('.street-person:visible').count(),20);assert.deepEqual(await f.evaluate(()=>window.__trustStage.street.game),createStreetStory());
  assert.equal(await f.getByRole('button',{name:'从15人的小街重新开始',exact:true}).count(),0);assert(!(await f.locator('body').innerText()).includes('27人'));
  const persisted=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROLOGUE_STORAGE_KEY);
  assert.equal(persisted.bakeryWage,3);assert.equal(persisted.bakeryCommitted,true);assert.deepEqual(persisted.street,createStreetStory());
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),MACHINE_STORAGE_KEY),machineJSON);
  await page.screenshot({path:path.join(output,width+'-retired-'+phase+'.png'),fullPage:true});
  await f.locator('#street-run').click();await f.waitForFunction(()=>window.__trustStage.street.game.world.round===1&&window.__trustStage.street.time===8);
  const played=await f.evaluate(()=>window.__trustStage.street.game);assert.equal(played.world.people.length,20);assert.equal(played.wage,5);assert.equal(played.version,STREET_VERSION);
  await page.reload();const restored=await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();await restored.locator('body[data-ready="true"]').waitFor();
  assert.equal(await restored.locator('.street-person:visible').count(),20);assert.deepEqual(await restored.evaluate(()=>window.__trustStage.street.game),played);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),MACHINE_STORAGE_KEY),machineJSON);
  results.push({width,retiredPhase:phase,automaticRestart:true,population:20,newProgressSurvivesRefresh:true,firstActAndMachinePreserved:true});await context.close();
 }
 // Failed payroll must stop continuous mode rather than repeatedly retrying.
 const context=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'});
 const saved=initialPrologue();saved.scene='street';saved.street=createStreetGame(5);saved.street.world.firms[0].cash=0;saved.street.world.initialMoney=streetMoney(saved.street.world);
 const {page,f}=await ready(context,saved);await f.locator('#street-continuous').click();await f.waitForFunction(()=>Boolean(window.__trustStage.street.game.message));await f.waitForFunction(()=>!window.__trustStage.street.auto);
 assert.equal(await f.evaluate(()=>window.__trustStage.street.game.world.round),0);assert.equal(await f.locator('#street-continuous').getAttribute('aria-pressed'),'false');await page.screenshot({path:path.join(output,'390-blocked.png'),fullPage:true});await context.close();
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await fs.writeFile(path.join(output,'report.json'),JSON.stringify({results,payrollStop:true,errors,external},null,2));console.log(JSON.stringify({passed:results.length+1,errors,external},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
