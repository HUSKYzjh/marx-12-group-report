import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {initialPrologue,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {createStreetStory} from '../lib/street-game.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html')),offline=path.join(root,'offline/技术红利去了哪里.html');
const output=path.join(root,'outputs/street-inspector-qa');await fs.mkdir(output,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
const game=f=>f.evaluate(()=>window.__trustStage.street.game);
const settled=f=>f.waitForFunction(()=>window.__trustStage.street.time===8&&!document.body.dataset.transition);
async function click(f,name){const b=f.getByRole('button',{name,exact:true}),action=await b.getAttribute('data-street-action'),before=JSON.stringify(await game(f));await b.click();if(action)await f.waitForFunction(before=>JSON.stringify(window.__trustStage.street.game)!==before,before);await settled(f);}
try{
 for(const spec of [{width:1280},{width:775},{width:390,offline:true},{width:320}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:960},reducedMotion:'reduce'});
  await context.route('**/*',r=>{if(r.request().url().startsWith(url)||spec.offline&&r.request().url()===pathToFileURL(offline).href)return r.continue();external.push(r.request().url());return r.abort();});
  await context.addInitScript(({key,saved})=>{if(window===top)localStorage.setItem(key,JSON.stringify(saved));},{key:PROLOGUE_STORAGE_KEY,saved:{...initialPrologue(),scene:'street',street:createStreetStory()}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(spec.offline?pathToFileURL(offline).href:url);
  const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();await settled(f);
  const before=await game(f);
  for(const firm of ['bakery','rival','clothes','cars','ovens','inputs']){
   const entry=f.locator('.street-shop-hit[data-firm="'+firm+'"]');await entry.click({position:{x:10,y:15}});
   const modal=f.getByRole('dialog',{name:/面包店|服装店|车厂|烤炉厂|原料和仓储/});await modal.waitFor();
   assert.equal(await f.locator('.shop-ledger-shade').getAttribute('data-firm'),firm);
   await f.getByRole('tab',{name:'成本怎么算'}).click();assert((await f.locator('.shop-ledger-panel:visible').innerText()).includes('工资 + 需买原料'));
   if(firm==='bakery'){
    // A classic desktop scrollbar disappearing changes iframe width. Reproduce
    // that resize explicitly even on headless systems with overlay scrollbars.
    await page.setViewportSize({width:spec.width+16,height:960});await f.waitForFunction(()=>window.__trustStage.viewportWidth===innerWidth);
    assert.equal(await modal.isVisible(),true,'shop ledger must survive the scrollbar-width resize');
    assert.equal(await f.getByRole('tab',{name:'成本怎么算'}).getAttribute('aria-selected'),'true');
    await page.setViewportSize({width:spec.width,height:960});await f.waitForFunction(()=>window.__trustStage.viewportWidth===innerWidth);
    assert.equal(await modal.isVisible(),true,'shop ledger must also survive resizing back');
   }
   assert((await f.locator('.shop-ledger-panel:visible').innerText()).includes('房租、税费'));
   const bounds=await modal.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=spec.width+1);
   assert.equal(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   await page.keyboard.press('Escape');assert.equal(await modal.isVisible(),false);assert.equal(await entry.evaluate(n=>n===document.activeElement),true);
  }
  assert.deepEqual(await game(f),before);
  await click(f,'开门营业 →');await click(f,'添炉、招人 →');
  await f.locator('.street-shop-hit[data-firm="bakery"]').click({position:{x:10,y:15}});
  await f.getByRole('tab',{name:'钱的去向'}).click();let text=await f.locator('.shop-ledger-panel:visible').textContent();assert(text.includes('关门时现金'));assert(text.includes('83枚'));assert(text.includes('59枚'));assert(text.includes('购置烤炉'));assert(await f.locator('.shop-ledger-panel:visible .money-coin').count()>0);
  await page.screenshot({path:path.join(output,spec.width+'-cash.png'),fullPage:true});await click(f,'关闭店铺账本');
  await click(f,'多做些，再开门 →');await click(f,'看看邻店怎么做 →');await click(f,'两家一起开门 →');await click(f,'再开一天 →');await click(f,'用这个办法，开一天 →');
  const g=await game(f);await f.locator('.street-shop-hit[data-firm="bakery"]').click({position:{x:10,y:15}});
  await f.getByRole('tab',{name:'成本怎么算'}).click();assert((await f.locator('.shop-ledger-panel:visible').textContent()).includes('3枚 / 3枚'));await page.screenshot({path:path.join(output,spec.width+'-costs.png'),fullPage:true});
  await f.getByRole('tab',{name:'店里现在'}).click();await f.locator('.shop-ledger-staff summary').click();assert.equal(await f.locator('.shop-ledger-employee').count(),3);
  await f.getByRole('button',{name:'查看bakery-0的钱包',exact:true}).click();assert.equal(await f.locator('.shop-ledger-shade').isVisible(),false);assert.equal(await f.locator('.street-thought').isVisible(),true);await click(f,'关闭心声');assert.deepEqual(await game(f),g);
  await click(f,'先不裁，再开一天 →');await click(f,'继续自由经营');
  const round=(await game(f)).world.round;await f.getByRole('button',{name:'持续营业',exact:true}).click();await f.waitForFunction(round=>window.__trustStage.street.game.world.round>round,round);
  await f.locator('.street-shop-hit[data-firm="bakery"]').click({position:{x:10,y:15}});assert.equal(await f.evaluate(()=>window.__trustStage.street.auto),false);
  const paused=await game(f);await f.getByRole('tab',{name:'钱的去向'}).click();await page.screenshot({path:path.join(output,spec.width+'-paused.png')});assert.deepEqual(await game(f),paused);await click(f,'关闭店铺账本');assert.equal(await f.getByRole('button',{name:'持续营业',exact:true}).getAttribute('aria-pressed'),'false');
  results.push({width:spec.width,shops:6,readonly:true,managementCashSeparated:true,storageCorrect:true,personLink:true,offline:!!spec.offline});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await fs.writeFile(path.join(output,'report.json'),JSON.stringify({results,errors,external},null,2));console.log(JSON.stringify({passed:results.length,errors,external}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
