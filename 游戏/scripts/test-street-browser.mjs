import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {initialPrologue,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {createStreetGame} from '../lib/street-game.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html'));
const offline=path.join(root,'offline/技术红利去了哪里.html');assert(bytes.equals(await fs.readFile(offline)));
const output=path.join(root,'outputs/street-qa');await fs.mkdir(output,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(req.url==='/favicon.ico'?204:200,{'Content-Type':'text/html; charset=utf-8'});res.end(req.url==='/favicon.ico'?undefined:bytes);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/';const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
const errors=[],external=[],results=[];
async function settled(f){await f.waitForFunction(()=>!document.body.dataset.transition);}
async function snapshot(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROLOGUE_STORAGE_KEY);}
async function round(f){const before=await f.evaluate(()=>window.__trustStage.street.game.world.round);await f.locator('#street-run').click();await f.waitForFunction(n=>window.__trustStage.street.game.world.round===n+1,before);await f.waitForFunction(()=>window.__trustStage.street.time===8);}
async function openManagement(f){if(!await f.locator('.street-management').evaluate(e=>e.open))await f.locator('.street-management summary').click();}
async function finishManagement(f){await f.waitForFunction(()=>window.__trustStage.street.time===8);}
try{
 for(const spec of [{width:1280},{width:390,reduced:true},{width:320,reduced:true,offline:true}]){
  const name=spec.width+(spec.offline?'-offline':'');const context=await browser.newContext({viewport:{width:spec.width,height:1000},hasTouch:spec.width<600,reducedMotion:spec.reduced?'reduce':'no-preference'});
  await context.route('**/*',route=>{if(route.request().url().startsWith(url)||(spec.offline&&route.request().url()===pathToFileURL(offline).href))return route.continue();external.push(route.request().url());return route.abort();});
  const saved=initialPrologue();saved.scene='bakery-expansion';saved.bakeryWage=4;saved.bakeryCommitted=true;
  // This suite exercises an already-saved free experiment. Fresh entrances
  // now use the guided story, covered by test-street-story-browser.mjs.
  saved.street=createStreetGame(4);
  await context.addInitScript(({saved,key})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{saved,key:PROLOGUE_STORAGE_KEY});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));await page.goto(spec.offline?pathToFileURL(offline).href:url);
  let f=await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();await settled(f);
  await f.getByRole('button',{name:'看完这一段',exact:true}).click();await f.locator('#expansion-next').click();await f.locator('body[data-scene="street"]').waitFor();await settled(f);
  assert.equal(await f.locator('#heading').textContent(),'第二幕·面包卖给谁？');assert(!(await f.locator('#notes').isVisible()));
  assert.equal((await snapshot(page)).street.wage,4);assert.equal(await f.locator('.street-person:visible').count(),15);
  await page.screenshot({path:path.join(output,name+'-intro.png'),fullPage:true});
  await f.locator('#street-run').click();await f.waitForFunction(()=>Number(document.body.dataset.streetRound)===1);
  if(!spec.reduced){
   await f.locator('#street-pause').click();const time=await f.evaluate(()=>window.__trustStage.street.time);await page.waitForTimeout(150);assert.equal(await f.evaluate(()=>window.__trustStage.street.time),time);
   const money=(await snapshot(page)).street.world;await f.getByRole('slider',{name:'营业速度'}).fill('4');await f.getByRole('slider',{name:'营业速度'}).dispatchEvent('input');assert.deepEqual((await snapshot(page)).street.world,money);
   await f.getByRole('slider',{name:'营业速度'}).fill('1');await f.getByRole('slider',{name:'营业速度'}).dispatchEvent('input');
   await f.locator('#street-pause').click();await f.waitForFunction(()=>window.__trustStage.street.time>1);await f.locator('#street-pause').click();await page.screenshot({path:path.join(output,name+'-transactions.png'),fullPage:true});await f.locator('#street-finish').click();
  }
  await f.waitForFunction(()=>window.__trustStage.street.time===8);await f.getByRole('button',{name:'再看看别家 →',exact:true}).click();
  await f.getByRole('button',{name:'增加每人每轮工资',exact:true}).click();await f.waitForFunction(()=>window.__trustStage.street.game.wage===5);
  await f.getByRole('button',{name:'减少每人每轮工资',exact:true}).click();await f.waitForFunction(()=>window.__trustStage.street.game.wage===4);
  await f.getByRole('button',{name:'减少每个面包售价',exact:true}).click();await f.waitForFunction(()=>window.__trustStage.street.game.price===2);
  await f.getByRole('button',{name:'增加每个面包售价',exact:true}).click();await f.waitForFunction(()=>window.__trustStage.street.game.price===3);
  await f.getByRole('button',{name:'只邻店试试',exact:true}).click();await f.getByRole('button',{name:'再添炉，还是多招人？ →',exact:true}).click();
  await openManagement(f);await f.getByRole('button',{name:'添一台炉 · 24枚',exact:true}).click();await f.waitForFunction(()=>window.__trustStage.street.game.world.firms[0].machines===3);
  await finishManagement(f);await openManagement(f);await f.getByRole('button',{name:'招一位厨师',exact:true}).click();await f.waitForFunction(()=>window.__trustStage.street.game.world.firms[0].workers.length===3);await finishManagement(f);
  await openManagement(f);await f.getByRole('button',{name:'少雇一位厨师…',exact:true}).click();await f.getByRole('button',{name:'算了，先不裁',exact:true}).click();assert.equal((await snapshot(page)).street.world.firms[0].workers.length,3);
  await openManagement(f);await f.getByRole('button',{name:'少雇一位厨师…',exact:true}).click();await f.getByRole('button',{name:'确认少雇一位',exact:true}).click();await f.waitForFunction(()=>window.__trustStage.street.game.world.firms[0].workers.length===2);await finishManagement(f);
  assert.equal((await snapshot(page)).street.world.firms[0].machines,3);const dismissed=(await snapshot(page)).street.report.dismissed[0];await round(f);
  assert(!(await snapshot(page)).street.report.transactions.some(t=>t.to===dismissed&&t.kind==='wage'));
  await f.locator('.street-person[aria-label="查看'+dismissed+'的心声"]').click();await f.getByRole('button',{name:'看钱包 →',exact:true}).click();assert(await f.locator('.street-wallet-lines').isVisible());await f.getByRole('button',{name:'关闭心声',exact:true}).click();
  await page.screenshot({path:path.join(output,name+'-street.png'),fullPage:true});
  await openManagement(f);await f.getByRole('button',{name:'招一位厨师',exact:true}).click();await f.waitForFunction(()=>window.__trustStage.street.game.world.firms[0].workers.length===3);await finishManagement(f);
  assert.equal((await snapshot(page)).street.world.people.find(p=>p.id===dismissed).job,'bakery');assert.equal((await snapshot(page)).street.world.firms[0].machines,3);await round(f);
  const before=(await snapshot(page)).street.world;await f.getByRole('button',{name:'返回首页',exact:true}).click();await f.getByRole('button',{name:'转到第二幕·面包卖给谁？',exact:true}).click();await settled(f);assert.deepEqual((await snapshot(page)).street.world,before);
  await page.reload();f=await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();await settled(f);assert.deepEqual((await snapshot(page)).street.world,before);assert.equal(await f.evaluate(()=>window.__trustStage.street.time),8);
  const bounds=await f.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth,buttons:[...document.querySelectorAll('.street-knob button,.street-person')].filter(b=>!b.hidden).map(b=>{const r=b.getBoundingClientRect();return {w:r.width,h:r.height,left:r.left,right:r.right};})}));assert(bounds.page<=bounds.viewport+1);assert(bounds.buttons.every(b=>b.w>=44&&b.h>=44&&b.left>=0&&b.right<=bounds.viewport));
  await f.getByRole('button',{name:'回看这条街 →',exact:true}).click();await f.waitForFunction(()=>document.body.dataset.streetPhase==='social');assert(!(await f.locator('#notes').isVisible()));
  await page.screenshot({path:path.join(output,name+'-social.png'),fullPage:true});await f.getByRole('button',{name:'再看一层 →',exact:true}).click();await f.waitForFunction(()=>document.body.dataset.streetPhase==='private');
  await f.getByRole('button',{name:'再看一层 →',exact:true}).click();await f.waitForFunction(()=>document.body.dataset.streetPhase==='overproduction');await f.getByRole('button',{name:'再看一层 →',exact:true}).click();
  await f.waitForFunction(()=>document.body.dataset.streetPhase==='limits');await f.locator('#notes').waitFor({state:'visible'});await f.locator('#notes > summary').click();assert.equal(await f.locator('.street-limit').count(),5);
  await page.screenshot({path:path.join(output,name+'-limits.png'),fullPage:true});await f.getByRole('button',{name:'继续看煤矿父女的故事 →',exact:true}).click();await f.locator('body[data-scene="ending"]').waitFor();
  results.push({name,round:before.round,conserved:before.initialMoney,bounds});await context.close();
 }
 // A genuine inventory branch, driven with real controls rather than forced stock.
 const context=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'});
 await context.route('**/*',route=>{if(route.request().url().startsWith(url))return route.continue();external.push(route.request().url());return route.abort();});
 const saved=initialPrologue();saved.scene='street';saved.street=createStreetGame(3);
 await context.addInitScript(({saved,key})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{saved,key:PROLOGUE_STORAGE_KEY});
 const page=await context.newPage();page.on('pageerror',e=>errors.push('inventory: '+e.message));await page.goto(url);const f=await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();await round(f);
 await f.getByRole('button',{name:'再看看别家 →',exact:true}).click();await f.getByRole('button',{name:'全部跟进',exact:true}).click();await f.getByRole('button',{name:'再添炉，还是多招人？ →',exact:true}).click();await openManagement(f);
 await f.getByRole('button',{name:'添一台炉 · 24枚',exact:true}).click();await f.waitForFunction(()=>window.__trustStage.street.game.world.firms[0].machines===3);await openManagement(f);await f.getByRole('button',{name:'招一位厨师',exact:true}).click();await f.waitForFunction(()=>window.__trustStage.street.game.world.firms[0].workers.length===3);
 for(let i=1;i<16;i++)await round(f);
 const inventory=(await snapshot(page)).street.report;assert(inventory.stock>0);assert.equal(inventory.produced,18);assert(await f.locator('.street-hint').filter({hasText:'剩'}).isVisible());await page.screenshot({path:path.join(output,'390-inventory.png'),fullPage:true});
 await openManagement(f);await f.getByRole('button',{name:'少排一班',exact:true}).click();await round(f);const shifted=(await snapshot(page)).street;assert.equal(shifted.report.working,2);assert.equal(shifted.world.firms[0].workers.length,3);
 await f.getByRole('button',{name:'回看这条街 →',exact:true}).click();await f.waitForFunction(()=>document.body.dataset.streetPhase==='social');
 await f.getByRole('button',{name:'再看一层 →',exact:true}).click();await f.waitForFunction(()=>document.body.dataset.streetPhase==='private');await f.getByRole('button',{name:'再看一层 →',exact:true}).click();await f.waitForFunction(()=>document.body.dataset.streetPhase==='overproduction');assert((await f.locator('#readout').textContent()).includes('生产过剩'));
 await page.screenshot({path:path.join(output,'390-inventory-explanation.png'),fullPage:true});results.push({name:'390-inventory',round:shifted.world.round,stock:inventory.stock,sold:inventory.sold,shiftWorking:shifted.report.working});await context.close();
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await fs.writeFile(path.join(output,'report.json'),JSON.stringify({results,errors,external},null,2));console.log(JSON.stringify({passed:results.length,errors,external},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
