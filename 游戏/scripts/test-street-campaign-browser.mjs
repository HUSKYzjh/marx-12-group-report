import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {initialPrologue,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {createStreetCampaign,streetMoney} from '../lib/street-game.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html')),server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href;
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
const output=path.join(root,'outputs/street-campaign-qa');await fs.mkdir(output,{recursive:true});
const game=f=>f.evaluate(()=>window.__trustStage.street.game);
const settled=f=>f.waitForFunction(()=>window.__trustStage.street.time===8&&!document.body.dataset.transition);
async function frame(page){const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();await settled(f);return f;}
async function click(f,locator){const before=JSON.stringify(await game(f));await locator.click();await f.waitForFunction(before=>JSON.stringify(window.__trustStage.street.game)!==before,before);await settled(f);}
const named=(f,name)=>f.getByRole('button',{name,exact:true});
async function acknowledge(f,seen){while((await game(f)).tutorial.pending.length){const id=(await game(f)).tutorial.pending[0].id;await f.locator('#street-briefing').waitFor();assert(!seen.has(id),'a first-time receipt repeated');seen.add(id);await click(f,named(f,'明白了 →'));}}
try{
 for(const spec of [{width:1280},{width:390,offline:true}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:960},reducedMotion:'reduce'});
  await context.route('**/*',r=>{if(r.request().url().startsWith(url)||spec.offline&&r.request().url()===offline)return r.continue();external.push(r.request().url());return r.abort();});
  await context.addInitScript(({key,state})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key:PROLOGUE_STORAGE_KEY,state:{...initialPrologue(),scene:'street',street:createStreetCampaign()}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(spec.offline?offline:url);let f=await frame(page),seen=new Set();
  let g=await game(f);assert.equal(g.world.people.length,20);const cash=Object.fromEntries(g.world.firms.map(f=>[f.id,f.cash]));assert(cash.cars>cash.ovens&&cash.rival>cash.bakery);assert(g.world.firms.every(f=>f.stock===0));
  await click(f,named(f,'开门营业 →'));await f.locator('#street-briefing').waitFor();g=await game(f);
  assert.equal(g.report.accounts.sales,3600);assert.equal(g.report.accounts.costOfSales,1700);assert.equal(g.report.accounts.fixedCosts,400);assert.equal(g.report.accounts.netProfit,1500);assert.equal(g.report.accounts.ownerDraw,100);assert.equal(g.report.accounts.retained,1400);
  assert.equal(await f.locator('#street-briefing .shop-ledger-row').count(),7);await page.screenshot({path:path.join(output,spec.width+'-receipt.png'),fullPage:true});
  // A pending notice survives refresh, then never repeats after acknowledgment.
  await page.reload();f=await frame(page);await f.locator('#street-briefing').waitFor();await acknowledge(f,seen);
  await click(f,named(f,'添炉、招人 →'));await f.locator('#street-briefing').waitFor();assert((await f.locator('#street-briefing').textContent()).includes('24枚'));await acknowledge(f,seen);
  await click(f,named(f,'多做些，再开门 →'));await acknowledge(f,seen);
  await click(f,named(f,'看看邻店怎么做 →'));assert.equal((await game(f)).campaign.beat,'others');
  await click(f,named(f,'再看看其他老板 →'));g=await game(f);assert.deepEqual(g.campaign.followed,['clothes','cars','ovens']);assert.equal(g.report.transactions.length,3);assert(g.report.transactions.every(t=>t.amount===24));assert.equal(g.world.people.length,20);
  await f.locator('.street-shop-hit[data-firm="clothes"]').click({position:{x:10,y:15}});assert((await f.locator('.shop-ledger-dialog').textContent()).includes('设备'));await named(f,'关闭店铺账本').click();
  await click(f,named(f,'全街一起开门 →'));await acknowledge(f,seen);
  while((await game(f)).campaign.beat==='pressure'){await click(f,named(f,'全街一起开门 →'));await acknowledge(f,seen);}
  g=await game(f);assert.equal(g.campaign.beat,'decide');assert(g.report.stock>0||g.report.accounts.netProfit<0);
  assert.deepEqual(await f.locator('.street-knob > span').allTextContents(),['工资','售价','开工']);
  await click(f,f.locator('[data-street-action="WAGE"][data-delta="-1"]'));await click(f,f.locator('[data-street-action="PRICE"][data-delta="-1"]'));
  const decisionDay=(await game(f)).world.round;
  for(let i=0;i<45&&!['insolvent','closed'].includes((await game(f)).campaign.beat);i++){
   while(true){g=await game(f);const budget=await f.evaluate(()=>StreetLedger.inspect(window.__trustStage.street.game,'bakery').estimate);if(g.shifts===0||g.world.firms[0].cash>=budget.wages+budget.materials)break;await click(f,f.locator('[data-street-action="SHIFTS"][data-delta="-1"]'));}
   await click(f,named(f,'照这样，开一天 →'));await acknowledge(f,seen);g=await game(f);assert.equal(streetMoney(g.world),g.world.initialMoney);assert.equal(g.world.people.length,20);
   if(i===2){assert.equal(g.campaign.beat,'decide');await page.reload();f=await frame(page);assert.equal((await game(f)).world.round,g.world.round);}
  }
  g=await game(f);assert.equal(g.campaign.beat,'insolvent');assert(g.world.round>decisionDay+3);assert(g.campaign.attempts>3);assert(g.campaign.solvency.shortfall>0);assert.equal(seen.size,3);
  await page.screenshot({path:path.join(output,spec.width+'-insolvent.png'),fullPage:true});
  await click(f,named(f,'变卖设备，关门 →'));g=await game(f);assert.equal(g.campaign.beat,'closed');assert.equal(g.world.firms[0].workers.length,0);assert.equal(streetMoney(g.world),g.world.initialMoney);
  await named(f,'回家 →').click();await f.locator('body[data-scene="ending"]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);
  await named(f,'继续听 →').click();await f.waitForFunction(()=>document.querySelector('.dialogue').textContent.includes('我失业了'));
  await named(f,'继续听 →').click();await f.waitForFunction(()=>document.querySelector('.dialogue').textContent.includes('面包太多'));
  await page.screenshot({path:path.join(output,spec.width+'-family.png'),fullPage:true});
  await named(f,'再看看这条街 →').click();await f.locator('body[data-scene="street-summary"]').waitFor();assert.equal(await f.locator('.street-summary-panels section').count(),2);assert((await f.locator('.street-summary-definition').textContent()).includes('买得起的需求'));
  await page.screenshot({path:path.join(output,spec.width+'-summary.png'),fullPage:true});assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await named(f,'还有什么办法？ →').click();await f.locator('body[data-scene="relief"]').waitFor();assert.equal(await f.locator('[data-route]').count(),3);
  results.push({width:spec.width,offline:!!spec.offline,closedDay:g.world.round,attempts:g.campaign.attempts,receipts:[...seen],people:20});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await fs.writeFile(path.join(output,'report.json'),JSON.stringify({results,errors,external},null,2));console.log(JSON.stringify({passed:results.length,results,errors,external}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
