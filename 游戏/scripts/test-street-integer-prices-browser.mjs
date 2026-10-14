import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {initialPrologue,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {STREET_VERSION,createStreetGame} from '../lib/street-game.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html')),offline=path.join(root,'offline/技术红利去了哪里.html');
const output=path.join(root,'outputs/street-integer-prices-qa');await fs.mkdir(output,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(req.url==='/favicon.ico'?204:200,{'Content-Type':'text/html; charset=utf-8'});res.end(req.url==='/favicon.ico'?undefined:bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/';const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());const errors=[],external=[],results=[];
try{
 for(const width of [1280,320]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',r=>{if(r.request().url().startsWith(url)||r.request().url().startsWith('file:'))return r.continue();external.push(r.request().url());return r.abort();});
  const saved=initialPrologue();saved.scene='street';saved.street=createStreetGame();saved.street.version=1;saved.street.price=2.5;
  saved.street.world.firms.forEach(f=>{if(['bakery','rival'].includes(f.id))f.price=250;if(f.id==='inputs')f.price=25;});saved.street.world.people.forEach(p=>p.shopping.items[0].price=250);
  await context.addInitScript(({saved,key})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{saved,key:PROLOGUE_STORAGE_KEY});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(width===320?pathToFileURL(offline).href:url);
  const f=await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);
  assert.equal(await f.evaluate(()=>window.__trustStage.street.game.price),3);assert.equal(await f.evaluate(()=>window.__trustStage.street.game.version),STREET_VERSION);
  assert.deepEqual(await f.evaluate(()=>window.__trustStage.street.game.world.people.map(p=>p.cash)),saved.street.world.people.map(p=>p.cash));
  await f.getByRole('button',{name:'减少每个面包售价',exact:true}).click();await f.waitForFunction(()=>window.__trustStage.street.game.price===2);
  await f.getByRole('button',{name:'增加每个面包售价',exact:true}).click();await f.waitForFunction(()=>window.__trustStage.street.game.price===3);
  await f.locator('#street-run').click();await f.waitForFunction(()=>window.__trustStage.street.game.world.round===1&&window.__trustStage.street.time===8);
  const game=await f.evaluate(()=>window.__trustStage.street.game);assert(game.world.firms.every(n=>n.price%100===0));
  game.report.transactions.filter(t=>['bread','clothes','car','inputs'].includes(t.kind)).forEach(t=>{assert(Number.isInteger(t.amount));if(t.kind==='inputs')assert.equal(t.amount,t.quantity/4);});
  await f.locator('.street-person[aria-label="查看bakery-0的心声"]').click();assert((await f.locator('.street-shopping-list').textContent()).includes('面包 · 3枚'));
  await page.screenshot({path:path.join(output,width+'-integer-prices.png'),fullPage:true});results.push({width,defaultPrice:3,step:1,migrated:true,integerTrades:true});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await fs.writeFile(path.join(output,'report.json'),JSON.stringify({results,errors,external},null,2));console.log(JSON.stringify({passed:results.length,errors,external},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
