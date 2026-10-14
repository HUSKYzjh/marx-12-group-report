import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {initialPrologue,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {streetMoney} from '../lib/street-game.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),{loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html')),server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[];
const output=path.join(root,'outputs/street-briefing-qa');await fs.mkdir(output,{recursive:true});
async function clickAction(f,name){const before=JSON.stringify(await f.evaluate(()=>window.__trustStage.street.game));await f.getByRole('button',{name,exact:true}).click();await f.waitForFunction(before=>JSON.stringify(window.__trustStage.street.game)!==before,before);await f.waitForFunction(()=>window.__trustStage.street.time===8&&!document.body.dataset.transition);}
async function acknowledge(f){const id=await f.evaluate(()=>window.__trustStage.street.game.tutorial.pending[0].id);await f.getByRole('button',{name:'明白了 →',exact:true}).click();await f.waitForFunction(id=>window.__trustStage.street.game.tutorial.seen.includes(id),id);await f.locator('#street-briefing').waitFor({state:'detached'});}
try{
 for(const spec of [{width:1280},{width:390,offline:true}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:960},reducedMotion:'reduce'}),offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href;
  await context.route('**/*',r=>{if(r.request().url().startsWith(url)||spec.offline&&r.request().url()===offline)return r.continue();external.push(r.request().url());return r.abort();});
  await context.addInitScript(({key,saved})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{key:PROLOGUE_STORAGE_KEY,saved:{...initialPrologue(),scene:'street'}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(spec.offline?offline:url);
  let f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();
  await clickAction(f,'开门营业 →');let modal=f.getByRole('dialog',{name:'第一天的钱，怎么算？',exact:true});await modal.waitFor();
  assert((await modal.innerText()).includes('净利润'));assert((await modal.textContent()).includes('19枚'));assert((await modal.innerText()).includes('老板个人取用'));assert.equal(await f.locator('main').evaluate(n=>n.inert),true);
  assert.equal(await modal.locator('.shop-ledger-row').count(),6);assert(!(await modal.innerText()).includes('坏掉与保管费用'));assert((await modal.innerText()).includes('其中：厨师工资'));
  assert.equal(await modal.locator('.money-unit .money-coin').count(),6);
  assert(await modal.locator('.money-coin image').first().getAttribute('href').then(h=>h.startsWith('data:image/png;base64,')));
  await modal.evaluate(n=>StreetArt.decorateMoney(n));assert.equal(await modal.locator('.money-unit .money-coin').count(),6,'refreshing a receipt must not duplicate its coins');
  let g=await f.evaluate(()=>window.__trustStage.street.game);assert.equal(streetMoney(g.world),g.world.initialMoney);assert.equal(g.tutorial.pending[0].id,'first-day');
  await page.screenshot({path:path.join(output,spec.width+'-first-day.png'),fullPage:true});
  await page.reload();f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();try{await f.getByRole('dialog',{name:'第一天的钱，怎么算？',exact:true}).waitFor();}catch(e){console.log(await f.evaluate(()=>({round:window.__trustStage.street.game.world.round,tutorial:window.__trustStage.street.game.tutorial,time:window.__trustStage.street.time,entrance:window.__trustStage.street.entrance,briefing:document.getElementById('street-briefing')?.outerHTML,body:document.body.dataset})));await page.screenshot({path:path.join(output,spec.width+'-reload-failure.png'),fullPage:true});throw e;}
  await acknowledge(f);assert.equal(await f.locator('main').evaluate(n=>n.inert),false);
  await clickAction(f,'添炉、招人 →');modal=f.getByRole('dialog',{name:'新烤炉，付钱了。',exact:true});await modal.waitFor();assert((await modal.textContent()).includes('24枚'));await acknowledge(f);
  for(const name of ['多做些，再开门 →','看看邻店怎么做 →','两家一起开门 →','再开一天 →']){
   await clickAction(f,name);
   if(await f.evaluate(()=>window.__trustStage.street.game.tutorial.pending.length)){
    modal=f.getByRole('dialog',{name:'没卖完，也要花钱。',exact:true});await modal.waitFor();assert((await modal.innerText()).includes('本轮保管费'));assert.equal(await modal.locator('.shop-ledger-row').count(),2);await page.screenshot({path:path.join(output,spec.width+'-stock.png'),fullPage:true});await acknowledge(f);
   }
  }
  g=await f.evaluate(()=>window.__trustStage.street.game);assert.equal(g.tutorial.seen.length,3);assert.equal(g.tutorial.pending.length,0);assert.equal(streetMoney(g.world),g.world.initialMoney);
  await f.locator('.street-shop-hit[data-firm="bakery"]').click({position:{x:10,y:15}});await f.getByRole('tab',{name:'钱的去向',exact:true}).click();assert((await f.locator('.shop-ledger-panel:visible').innerText()).includes('本轮利润'));
  await f.getByRole('button',{name:'关闭店铺账本'}).click();await page.reload();f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();assert.equal(await f.locator('#street-briefing').count(),0);assert.deepEqual((await f.evaluate(()=>window.__trustStage.street.game)).tutorial,g.tutorial);
  assert.deepEqual(await f.locator('.street-knob > span').allTextContents(),['工资','售价']);
  assert.equal(await f.locator('.street-knob output .money-coin').count(),2);
  await f.locator('.street-person[data-person="bakery-0"]').click();assert(await f.locator('.street-thought .money-coin').count()>=2);
  await page.screenshot({path:path.join(output,spec.width+'-coin-wallet.png'),fullPage:true});await f.getByRole('button',{name:'关闭心声',exact:true}).click();
  await page.screenshot({path:path.join(output,spec.width+'-short-controls.png'),fullPage:true});
  await clickAction(f,'用这个办法，开一天 →');await clickAction(f,'先不裁，再开一天 →');await clickAction(f,'回看这条街 →');
  for(let i=0;i<3;i++)await clickAction(f,'再看一层 →');
  assert.equal((await f.evaluate(()=>window.__trustStage.street.game)).phase,'limits');
  const bounds=f.locator('.street-bounds');assert.equal(await bounds.getAttribute('open'),null);assert(!(await f.locator('#readout').innerText()).includes('政府、信贷'));
  await bounds.locator('summary').click();assert((await bounds.innerText()).includes('不能直接代指社会主义国家'));assert((await bounds.innerText()).includes('一次剩货不等于全面危机'));
  await bounds.locator('summary').click();await page.screenshot({path:path.join(output,spec.width+'-short-ending.png'),fullPage:true});
  assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log('PASS: new funds, three first-time receipts, profit accounts, reload, desktop and offline mobile');
}finally{await browser.close();await new Promise(r=>server.close(r));}
