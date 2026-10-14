import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {initialPrologue,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {createStreetStory,streetReducer} from '../lib/street-game.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html'));
const offline=path.join(root,'offline/技术红利去了哪里.html');assert(bytes.equals(await fs.readFile(offline)));
const output=path.join(root,'outputs/street-entrance-qa');await fs.mkdir(output,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(req.url==='/favicon.ico'?204:200,{'Content-Type':'text/html; charset=utf-8'});res.end(req.url==='/favicon.ico'?undefined:bytes);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/';
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
async function frame(page){const f=await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();await f.waitForFunction(()=>Boolean(window.__trustStage));return f;}
try{
 for(const spec of [{width:1280},{width:390},{width:320,reduced:true,offline:true}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:1100},hasTouch:spec.width<600,reducedMotion:spec.reduced?'reduce':'no-preference'});
  await context.route('**/*',r=>{if(r.request().url().startsWith(url)||spec.offline&&r.request().url()===pathToFileURL(offline).href)return r.continue();external.push(r.request().url());return r.abort();});
  const old=streetReducer(createStreetStory(),{type:'ROUND',expectedRound:0});
  const saved={...initialPrologue(),scene:'bakery-expansion',bakeryWage:7,bakeryCommitted:true,street:old};
  await context.addInitScript(({saved,key})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{saved,key:PROLOGUE_STORAGE_KEY});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(spec.offline?pathToFileURL(offline).href:url);let f=await frame(page);
  await f.locator('#expansion-skip').click();await f.locator('#expansion-next').waitFor({state:'visible'});
  await page.screenshot({path:path.join(output,spec.width+'-before.png'),fullPage:true});
  await f.locator('#expansion-next').click();
  if(!spec.reduced){
   await f.waitForFunction(()=>document.body.dataset.transition==='street-camera'&&window.__trustStage.street.entrance>.12&&window.__trustStage.street.entrance<.65);
   const early=await f.evaluate(()=>{const r=document.querySelector('.street-camera').getBoundingClientRect();return {width:r.width,progress:window.__trustStage.street.entrance,inert:window.__trustStage.street.overlay.inert,world:JSON.stringify(window.__trustStage.street.game.world)};});
   assert(early.inert);assert(early.progress<1);await page.screenshot({path:path.join(output,spec.width+'-pullback.png'),fullPage:true});
   await f.waitForFunction(()=>!document.body.dataset.transition&&window.__trustStage.street.entrance===1);
   const after=await f.evaluate(()=>({world:JSON.stringify(window.__trustStage.street.game.world),width:document.querySelector('.street-own.street-shop').getBoundingClientRect().width}));
   assert.equal(early.world,after.world);assert(after.width<early.width);assert.equal(await f.locator('.street-camera').count(),0);
  }else{await f.waitForFunction(()=>window.__trustStage.street.graphics.visible);assert.equal(await f.locator('.street-camera').count(),0);}
  let g=await f.evaluate(()=>window.__trustStage.street.game);
  assert.deepEqual(g.world,createStreetStory().world);assert.equal(g.report,null);assert.equal(g.history.length,0);assert.equal(g.wage,5);assert.equal(g.story.beat,'opening');
  for(const firm of g.world.firms){assert.deepEqual(await f.locator('.street-firm-metrics[data-firm="'+firm.id+'"] output').allTextContents(),['0',String(firm.workers.length),String(firm.cash/100)]);}
  assert.equal(await f.locator('.street-shop').count(),6);assert.equal(await f.locator('.street-person:visible').count(),20);
  assert.equal(await f.getByRole('button',{name:'开门营业 →',exact:true}).isEnabled(),true);
  const bounds=await f.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth,inert:window.__trustStage.street.overlay.inert,opacities:[...document.querySelectorAll('.street-shop')].map(e=>getComputedStyle(e).opacity)}));
  assert(bounds.page<=bounds.viewport+1);assert.equal(bounds.inert,false);assert(bounds.opacities.every(a=>a==='1'));
  await page.screenshot({path:path.join(output,spec.width+'-street.png'),fullPage:true});
  await f.getByRole('button',{name:'开门营业 →',exact:true}).click();await f.waitForFunction(()=>window.__trustStage.street.time===8&&window.__trustStage.street.game.world.round===1);
  g=await f.evaluate(()=>window.__trustStage.street.game);await page.reload();f=await frame(page);await f.waitForFunction(()=>window.__trustStage.street.game?.world.round===1);assert.deepEqual(await f.evaluate(()=>window.__trustStage.street.game),g);
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).bakeryWage,PROLOGUE_STORAGE_KEY),7);
  results.push({width:spec.width,resetEconomy:true,cinematic:!spec.reduced,refreshPreserved:true,sixShops:true,bounds});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await fs.writeFile(path.join(output,'report.json'),JSON.stringify({results,errors,external},null,2));console.log(JSON.stringify({passed:results.length,errors,external},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
