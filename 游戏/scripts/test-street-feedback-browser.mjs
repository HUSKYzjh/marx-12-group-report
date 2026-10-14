import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {initialPrologue,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {streetMoney,createStreetStory} from '../lib/street-game.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html')),offline=path.join(root,'offline/技术红利去了哪里.html');assert(bytes.equals(await fs.readFile(offline)));
const output=path.join(root,'outputs/street-feedback-qa');await fs.mkdir(output,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
const game=f=>f.evaluate(()=>window.__trustStage.street.game);
const settled=f=>f.waitForFunction(()=>window.__trustStage.street.time===8&&!document.body.dataset.transition);
async function click(f,name){const button=f.getByRole('button',{name,exact:true}),action=await button.getAttribute('data-street-action'),before=JSON.stringify(await game(f));await button.click();if(action)await f.waitForFunction(before=>JSON.stringify(window.__trustStage.street.game)!==before,before);await settled(f);if(action==='ROUND')await f.locator('.street-story-result').waitFor({state:'visible'});}
try{
 for(const spec of [{width:1280},{width:390,reduced:true},{width:320,reduced:true,offline:true}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:1100},reducedMotion:spec.reduced?'reduce':'no-preference'});
  await context.route('**/*',r=>{if(r.request().url().startsWith(url)||spec.offline&&r.request().url()===pathToFileURL(offline).href)return r.continue();external.push(r.request().url());return r.abort();});
  const saved={...initialPrologue(),scene:'street',street:createStreetStory()};await context.addInitScript(({key,saved})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{key:PROLOGUE_STORAGE_KEY,saved});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(spec.offline?pathToFileURL(offline).href:url);
  let f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();await settled(f);
  assert.equal(await f.locator('.street-person:visible').count(),20);assert.equal(await f.locator('.street-person[data-firm="waiting"]').count(),4);
  await click(f,'开门营业 →');await click(f,'添炉、招人 →');await click(f,'多做些，再开门 →');await click(f,'看看邻店怎么做 →');await click(f,'两家一起开门 →');await click(f,'再开一天 →');
  assert.equal((await game(f)).world.round,4);assert.equal((await game(f)).report.stock,9);assert.equal(await f.locator('.street-reaction').isVisible(),false);
  await click(f,'用这个办法，开一天 →');let g=await game(f);assert.equal(g.report.cashChange,11);assert.equal(g.report.storageCharges.find(c=>c.firm==='bakery').paid,3);assert(!(await f.locator('#readout').innerText()).includes('剩货保管花了'));
  await click(f,'先不裁，再开一天 →');g=await game(f);assert.equal(g.report.rivalDecision,undefined);await click(f,'再开一天，看看邻店 →');g=await game(f);assert.equal(g.report.rivalDecision.kind,'wage-cut');assert.equal(g.world.firms[1].wage,300);assert.equal(await f.locator('.street-reaction').isVisible(),true);assert((await f.locator('.street-reaction').innerText()).includes('少给一枚'));
  const bubbleBounds=await f.locator('.street-reaction').boundingBox();const vw=await f.evaluate(()=>innerWidth);assert(bubbleBounds.x>=0&&bubbleBounds.x+bubbleBounds.width<=vw);
  await page.screenshot({path:path.join(output,spec.width+'-wage-cut.png'),fullPage:true});
  const before=await game(f);await page.reload();f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();await settled(f);assert.deepEqual(await game(f),before);
  await click(f,'看看邻店降薪后的一天 →');g=await game(f);assert.equal(g.world.round,8);assert.equal(g.report.rivalDecision.kind,'layoff');assert.equal(g.world.firms[1].workers.length,1);assert.equal(g.world.firms[1].produced,12);assert.equal(g.world.people.length,20);assert.equal(streetMoney(g.world),g.world.initialMoney);
  const id=g.report.rivalDecision.person;assert(!g.report.transactions.some(t=>t.kind==='wage'&&t.to===id));assert(g.report.transactions.some(t=>t.kind==='severance'&&t.to===id&&t.amount===5));
  assert.equal(await f.locator('.street-person[data-person="'+id+'"]').getAttribute('data-firm'),'waiting');assert.equal(await f.locator('.street-person[data-person="'+id+'"]').getAttribute('data-headwear'),'none');assert.equal(await f.locator('.street-person[data-firm="waiting"]').count(),3);
  assert((await f.locator('.street-reaction').innerText()).includes('少雇一个'));await page.screenshot({path:path.join(output,spec.width+'-layoff.png'),fullPage:true});await click(f,'关闭邻店发言');
  await f.locator('.street-person[data-person="'+id+'"]').click();assert((await f.locator('.street-thought').innerText()).includes('工资'));assert((await f.locator('.street-shopping-list').innerText()).includes('面包'));await page.screenshot({path:path.join(output,spec.width+'-worker.png'),fullPage:true});await click(f,'关闭心声');
  assert((await f.evaluate(()=>document.documentElement.scrollWidth))<=vw+1);await click(f,'回看这条街 →');assert.equal(await f.locator('.street-reaction').isVisible(),false);
  results.push({width:spec.width,people:20,storagePaid:3,cutDay:7,layoffDay:8,severance:5,noIncomeForDismissed:true,refreshPreserved:true,offline:!!spec.offline});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await fs.writeFile(path.join(output,'report.json'),JSON.stringify({results,errors,external},null,2));console.log(JSON.stringify({passed:results.length,errors,external}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
