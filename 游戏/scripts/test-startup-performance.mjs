import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {hostedTestServer} from './hosted-test-server.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url));
const output=process.env.GAME_PERF_OUTPUT||path.join(root,'outputs/startup-performance');await fs.mkdir(output,{recursive:true});
const baseline=process.env.GAME_BASELINE_HTML||path.join(root,'offline/技术红利去了哪里.html');
const server=await hostedTestServer(path.join(root,'build/hosted'),{baseline,instrument:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
const samples=[],errors=[];
async function stage(page){const frame=await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();await frame.locator('body[data-ready="true"][data-scene="opening"]').waitFor({timeout:90000});return frame;}
try{
 for(const width of [390,1280])for(const edition of ['baseline','hosted']){
  const context=await browser.newContext({viewport:{width,height:width===390?667:900}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');
  const requests=new Map();let transferred=0;
  cdp.on('Network.requestWillBeSent',e=>requests.set(e.requestId,e.request.url));
  cdp.on('Network.loadingFinished',e=>{if(requests.get(e.requestId)?.startsWith(server.url))transferred+=e.encodedDataLength;});
  const url=server.url+(edition==='baseline'?'baseline.html':'');
  const started=performance.now();await page.goto(url,{waitUntil:'domcontentloaded'});let frame=await stage(page);
  const readyMs=performance.now()-started;
  const pack=await frame.evaluate(()=>performance.getEntriesByName('opening-layout').map(e=>e.duration));
  const coldBytes=transferred;
  const startAt=performance.now();await frame.getByRole('button',{name:'开始 →',exact:true}).click();await frame.locator('body[data-scene="bakery"]').waitFor();await frame.waitForFunction(()=>!document.body.dataset.transition);
  const startToActMs=performance.now()-startAt;
  const returnAt=performance.now();await frame.getByRole('button',{name:'返回首页',exact:true}).click();await frame.locator('body[data-scene="opening"]').waitFor();await frame.waitForFunction(()=>!document.body.dataset.transition);
  const returnHomeMs=performance.now()-returnAt;
  const after=await frame.evaluate(()=>performance.getEntriesByName('opening-layout').map(e=>e.duration));
  if(edition==='hosted'){assert.equal(pack.length,1,'Exactly one layout during first opening');assert.equal(after.length,1,'Returning home reuses the layout');}
  transferred=0;const reloadAt=performance.now();await page.reload();frame=await stage(page);const warmReadyMs=performance.now()-reloadAt,warmBytes=transferred;
  if(edition==='hosted')assert(warmBytes<coldBytes/4,'Cached assets must reduce repeat-transfer bytes');
  samples.push({width,edition,readyMs,startToActMs,returnHomeMs,warmReadyMs,coldBytes,warmBytes,initialLayouts:pack,layoutsAfterReturn:after});
  console.log(JSON.stringify(samples.at(-1)));await context.close();
 }
 assert.deepEqual(errors,[]);
 for(const width of [390,1280]){
  const before=samples.find(x=>x.width===width&&x.edition==='baseline'),after=samples.find(x=>x.width===width&&x.edition==='hosted');
  assert(after.coldBytes<before.coldBytes*.5,'The first load must transfer less than half the baseline');
  // With no historical baseline supplied, both editions share the optimized
  // layout code; that mode compares delivery and caching, not a CPU speed race.
  if(before.initialLayouts.length>after.initialLayouts.length)assert(after.initialLayouts.reduce((a,b)=>a+b,0)<before.initialLayouts.reduce((a,b)=>a+b,0),'Initial layout computation must decrease');
 }
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify({date:'2026-10-17',scope:'Same-machine local HTTP comparison; no mobile network or hardware speed claim.',samples,errors},null,2)+'\n');
}finally{await browser.close();await server.close();}
