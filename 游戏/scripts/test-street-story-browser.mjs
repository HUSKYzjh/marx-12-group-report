import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {initialPrologue,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {createStreetGame,streetMoney} from '../lib/street-game.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html')),offline=path.join(root,'offline/技术红利去了哪里.html');assert(bytes.equals(await fs.readFile(offline)));
const output=path.join(root,'outputs/street-story-qa');await fs.mkdir(output,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(req.url==='/favicon.ico'?204:200,{'Content-Type':'text/html; charset=utf-8'});res.end(req.url==='/favicon.ico'?undefined:bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
const errors=[],external=[],results=[];
async function game(f){return f.evaluate(()=>window.__trustStage.street.game);}
async function settled(f){
 try{await f.waitForFunction(()=>!document.body.dataset.transition&&window.__trustStage.street.time===8);}
 catch(error){const state=await f.evaluate(()=>({transition:document.body.dataset.transition,time:window.__trustStage.street.time,visible:window.__trustStage.street.graphics.visible,beat:window.__trustStage.street.game?.story?.beat}));console.error(JSON.stringify(state,null,2));console.error(errors);throw error;}
}
async function click(f,name){const button=f.getByRole('button',{name,exact:true}),action=await button.getAttribute('data-street-action'),before=JSON.stringify(await game(f));await button.click();if(action&&action!=='BEGIN_STORY')await f.waitForFunction(before=>JSON.stringify(window.__trustStage.street.game)!==before,before);await settled(f);}
try{
 for(const spec of [{width:1280},{width:390,reduced:true},{width:320,reduced:true,offline:true}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:1100},hasTouch:spec.width<600,reducedMotion:spec.reduced?'reduce':'no-preference'});
  await context.route('**/*',r=>{if(r.request().url().startsWith(url)||spec.offline&&r.request().url()===pathToFileURL(offline).href)return r.continue();external.push(r.request().url());return r.abort();});
  const saved={...initialPrologue(),scene:'street',bakeryWage:4,bakeryCommitted:true};
  await context.addInitScript(({saved,key})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{saved,key:PROLOGUE_STORAGE_KEY});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(spec.offline?pathToFileURL(offline).href:url);
  let f=await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();await settled(f);
  assert.equal((await game(f)).story.beat,'opening');assert.equal((await game(f)).wage,5);assert.equal(await f.locator('.street-person:visible').count(),20);
  assert.equal(await f.locator('.street-person[data-firm="waiting"]').count(),4);
  assert.equal(await f.locator('.street-person[data-firm="waiting"]:not([data-headwear="none"])').count(),0);
  assert.equal(await f.locator('#street-continuous').count(),0);assert.equal(await f.locator('.street-knob').count(),0);assert.equal(await f.locator('#notes').isVisible(),false);
  await page.screenshot({path:path.join(output,spec.width+'-opening.png'),fullPage:true});
  await f.locator('#street-run').click();await f.waitForFunction(()=>window.__trustStage.street.game.world.round===1);
  if(!spec.reduced){
   await f.locator('#street-pause').click();const time=await f.evaluate(()=>window.__trustStage.street.time);await page.waitForTimeout(150);assert.equal(await f.evaluate(()=>window.__trustStage.street.time),time);
   assert.equal(await f.getByRole('button',{name:'添炉、招人 →',exact:true}).isEnabled(),false);await f.locator('#street-finish').click();
  }
  await settled(f);assert.equal((await game(f)).report.sold,12);
  await click(f,'添炉、招人 →');assert.equal((await game(f)).world.round,1);assert.equal((await game(f)).world.firms[0].workers.length,3);
  assert.equal(await f.locator('.street-person[data-person="available-0"]').getAttribute('data-headwear'),'chef');
  await click(f,'多做些，再开门 →');assert.equal((await game(f)).report.sold,18);assert.equal((await game(f)).report.stock,0);
  await click(f,'看看邻店怎么做 →');assert.equal((await game(f)).world.firms[1].ovenCapacities[1],12);
  await click(f,'两家一起开门 →');assert.equal((await game(f)).story.beat,'pressure');assert.equal((await game(f)).world.firms[1].stock,5);
  const before=await game(f);await click(f,'转到第二幕·面包卖给谁？');assert.deepEqual(await game(f),before);
  await page.reload();f=await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();await settled(f);assert.deepEqual(await game(f),before);
  await click(f,'再开一天 →');assert.equal((await game(f)).story.beat,'adjust');assert.equal((await game(f)).report.stock,15);assert((await f.locator('.street-whole-result').innerText()).includes('留下29个'));
  await page.screenshot({path:path.join(output,spec.width+'-both-unsold.png'),fullPage:true});
  for(let i=0;i<2;i++)await click(f,'减少每人每轮工资');assert.equal((await game(f)).wage,3);
  assert.equal(await f.getByRole('button',{name:'增加每个面包售价',exact:true}).isEnabled(),false);
  await click(f,'别家也跟着调工资');assert.equal((await game(f)).response,'all');
  await click(f,'用这个办法，开一天 →');assert.equal((await game(f)).story.beat,'layoff');assert((await game(f)).report.stock>2);
  await click(f,'少雇一位厨师…');await click(f,'算了，先不裁');assert.equal((await game(f)).world.firms[0].workers.length,3);
  await click(f,'少雇一位厨师…');await click(f,'确认少雇一位');const dismissed=(await game(f)).report.dismissed[0];assert.equal((await game(f)).world.firms[0].workers.length,2);
  assert.equal(await f.locator('.street-person[data-person="'+dismissed+'"]').getAttribute('data-headwear'),'none');
  await click(f,'再看看另两家也裁员');await click(f,'再开一天，看看影响 →');
  let g=await game(f);assert.equal(g.story.beat,'review');assert.equal(g.world.round,6);assert.equal(g.world.people.length,20);assert.equal(streetMoney(g.world),g.world.initialMoney);
  assert(!g.report.transactions.some(t=>t.kind==='wage'&&g.story.dismissed.includes(t.to)));
  assert.equal(await f.locator('.street-person[data-firm="waiting"]:not([data-headwear="none"])').count(),0);
  await page.screenshot({path:path.join(output,spec.width+'-review.png'),fullPage:true});
  await f.locator('.street-person[data-person="'+dismissed+'"]').click();assert((await f.locator('.street-thought').innerText()).includes('工资'));assert((await f.locator('.street-shopping-list').innerText()).includes('面包'));
  await page.screenshot({path:path.join(output,spec.width+'-dismissed-wallet.png'),fullPage:true});await click(f,'关闭心声');
  const bounds=await f.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth,buttons:[...document.querySelectorAll('#controls button,.street-person')].filter(b=>b.getClientRects().length).map(b=>{const r=b.getBoundingClientRect();return {w:r.width,h:r.height,left:r.left,right:r.right};})}));
  assert(bounds.page<=bounds.viewport+1);assert(bounds.buttons.every(b=>b.w>=44&&b.h>=44&&b.left>=0&&b.right<=bounds.viewport));
  await click(f,'回看这条街 →');assert.equal((await game(f)).phase,'social');assert.equal(await f.locator('#notes').isVisible(),false);
  await click(f,'再看一层 →');assert.equal((await game(f)).phase,'private');await click(f,'再看一层 →');assert.equal((await game(f)).phase,'overproduction');await click(f,'再看一层 →');assert.equal((await game(f)).phase,'limits');assert.equal(await f.locator('#notes').isVisible(),true);
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).bakeryWage,PROLOGUE_STORAGE_KEY),4);
  await click(f,'返回首页');await f.waitForFunction(()=>document.body.dataset.scene==='opening');
  await click(f,'转到第二幕·面包卖给谁？');await f.waitForFunction(()=>document.body.dataset.scene==='street'&&window.__trustStage.street.game.world.round===0);await settled(f);
  assert.equal((await game(f)).world.round,0);assert.equal((await game(f)).wage,5);assert.equal((await game(f)).story.beat,'opening');
  results.push({width:spec.width,rounds:6,firstSales:12,expansionSales:18,fourthDayJointStock:29,people:20,layoffIncomeStops:true,refreshPreserved:true,reentryResets:true,bounds});await context.close();
 }
 // Preserve an old valid free experiment; switching to the story requires UI confirmation.
 {
  const context=await browser.newContext({viewport:{width:390,height:1100},reducedMotion:'reduce'});
  const saved={...initialPrologue(),scene:'street',bakeryWage:3,street:createStreetGame()};saved.street.world.round=1;
  await context.addInitScript(({key,saved})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{key:PROLOGUE_STORAGE_KEY,saved});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);const f=await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();await settled(f);
  assert.equal((await game(f)).story,undefined);page.once('dialog',d=>d.dismiss());await click(f,'开始这幕的五步故事');assert.equal((await game(f)).world.round,1);
  page.once('dialog',d=>d.accept());await click(f,'开始这幕的五步故事');assert.equal((await game(f)).story.beat,'opening');assert.equal((await game(f)).world.round,0);
  await click(f,'开门营业 →');await click(f,'添炉、招人 →');await click(f,'多做些，再开门 →');await click(f,'看看邻店怎么做 →');await click(f,'两家一起开门 →');await click(f,'再开一天 →');
  await click(f,'减少每个面包售价');await click(f,'减少每个面包售价');await click(f,'用这个办法，开一天 →');assert.equal((await game(f)).report.stock,5);assert.equal((await game(f)).report.sold,28);
  await click(f,'先不裁，再开一天 →');assert.equal((await game(f)).story.beat,'review');assert((await f.locator('#readout').innerText()).includes('光把面包做出来，还不够'));
  await page.screenshot({path:path.join(output,'390-price-relief.png'),fullPage:true});await click(f,'继续自由经营');assert.equal((await game(f)).story,undefined);assert.equal((await game(f)).world.round,6);
  results.push({width:390,oldProgressPreserved:true,startConfirmed:true,priceReliefWorks:true,sandboxPreservesLedger:true});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await fs.writeFile(path.join(output,'report.json'),JSON.stringify({results,errors,external},null,2));console.log(JSON.stringify({passed:results.length,errors,external},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
