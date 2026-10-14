/** Enter the real second act from a fresh page; no saved-state or clock injection. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {STREET_CAMPAIGN_CASH,streetMoney} from '../lib/street-game.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html'));
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href;
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
try{
 for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:960},reducedMotion:'reduce'});
  await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||width===390&&u===offline)return r.continue();external.push(u);return r.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(width===390?offline:url);
  let f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();
  await f.locator('#dots button[data-stage="2"]').click();await f.locator('body[data-scene="street"]').waitFor();await f.waitForFunction(()=>window.__trustStage.street.time===8&&!document.body.dataset.transition);
  const game=()=>f.evaluate(()=>window.__trustStage.street.game);let g=await game();
  assert.equal(g.world.round,0);assert.equal(g.world.people.length,20);assert(g.world.firms.every(n=>n.stock===0));
  const funds=Object.fromEntries(g.world.firms.map(n=>[n.id,n.cash/100]));assert.deepEqual(funds,STREET_CAMPAIGN_CASH);
  await f.locator('.street-shop-hit[data-firm="cars"]').click({position:{x:10,y:15}});assert((await f.locator('.shop-ledger-dialog').innerText()).includes('204'));await f.getByRole('button',{name:'关闭店铺账本',exact:true}).click();
  assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await f.getByRole('button',{name:'开门营业 →',exact:true}).click();await f.locator('#street-briefing').waitFor();g=await game();
  assert.equal(g.world.round,1);assert.equal(g.report.accounts.netProfit,1500);assert.equal(streetMoney(g.world),g.world.initialMoney);
  const world=structuredClone(g.world);await page.reload();f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();await f.locator('#street-briefing').waitFor();assert.deepEqual((await game()).world,world);
  results.push({width,offline:width===390,funds,firstDayProfit:15,playedWalletsPreserved:true});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log(JSON.stringify({results,errors,external}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
