import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createDuelServer} from './serve-market-duel.mjs';
import {moneyTotal,restoreDuel} from '../public/assets/market-duel/model.mjs';
const require=createRequire(import.meta.url),{loadPlaywright,browserLaunchOptions}=require('./playwright-runtime.cjs');
const server=createDuelServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port;
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
const out=path.resolve('outputs/market-duel-qa');await fs.mkdir(out,{recursive:true});
const files=['index.html','model.mjs','game.mjs','style.css'];
const fileHashes=Object.fromEntries(await Promise.all(files.map(async name=>[name,createHash('sha256').update(await fs.readFile(path.resolve('public/assets/market-duel',name))).digest('hex')])));
const results=[],errors=[],external=[];
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('feast-market-duel-v1')));
async function selectWage(page,value,method){
 const from=page.locator('[data-piece="wage:'+value+'"]'),to=page.locator('#wage-bag');
 if(method==='keyboard'){await from.focus();await page.keyboard.press('Enter');await to.focus();await page.keyboard.press('Enter');}
 else{
  await from.scrollIntoViewIfNeeded();const a=await from.boundingBox();const b=await to.boundingBox();const x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
  if(method==='touch'){assert(y>=0&&y<=900&&ty>=0&&ty<=900);const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=12;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/12,y:y+(ty-y)*i/12}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:12});await page.mouse.up();}
 }
 await page.waitForFunction(v=>JSON.parse(localStorage.getItem('feast-market-duel-v1')).draft.wage===v,value);
}
async function run(page){const before=(await saved(page)).state.day;await page.locator('#submit').click();await page.waitForFunction(day=>JSON.parse(localStorage.getItem('feast-market-duel-v1')).state.day===day+1,before);assert.equal(moneyTotal((await saved(page)).state),120);}
try{
 for(const spec of [{width:1280,method:'mouse'},{width:390,method:'touch'},{width:320,method:'keyboard'}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:900},hasTouch:spec.method==='touch',reducedMotion:spec.method==='keyboard'?'reduce':'no-preference'});const page=await context.newPage();page.on('pageerror',e=>errors.push({width:spec.width,message:e.message}));page.on('request',r=>{if(!r.url().startsWith(url))external.push(r.url());});
  await page.goto(url);await page.locator('[data-person="0"]').waitFor();await page.locator('#begin').click();
  const before=(await saved(page)).state;await selectWage(page,1,spec.method);assert.deepEqual((await saved(page)).state,before,'draft not paid');await page.reload();await page.locator('[data-person="0"]').waitFor();assert.equal((await saved(page)).draft.wage,1);
  await page.locator('[data-person="0"]').click();assert(await page.locator('#person-wallet').innerText());assert((await page.locator('#person-wish').innerText()).includes('每天先试买一个'));await page.keyboard.press('Escape');
  await run(page);assert.equal((await saved(page)).state.history[0].offers[1].wage,2);await page.locator('#price').click();await run(page);
  // A new oven is another actual object. Keyboard pick/place keeps this test
  // distinct from the actual mouse/touch salary drag verified above.
  await page.locator('#new-oven').focus();await page.keyboard.press('Enter');await page.locator('[data-drop="oven"]').focus();await page.keyboard.press('Enter');const draft=(await saved(page)).draft;assert.equal(draft.ovens,2);await run(page);
  const buy=(await saved(page)).state.history[2].report.receipts.find(r=>r.reason==='添烤炉');assert.equal(buy.amount,8);
  while((await saved(page)).state.day<6){await selectWage(page,1,'keyboard');await run(page);}
  await page.locator('#ending').waitFor({state:'visible'});const original=(await saved(page)).state;assert.deepEqual(restoreDuel(original),original);
  await page.screenshot({path:path.join(out,spec.width+'-ending.png'),fullPage:true});await page.locator('#everyone').click();assert.deepEqual((await saved(page)).state,original,'alternate world never pays from current world');assert.equal(moneyTotal((await saved(page)).allPath),120);await page.reload();await page.locator('#ending').waitFor({state:'visible'});assert.deepEqual((await saved(page)).state,original);
  await page.locator('#retry-last').click();assert.equal((await saved(page)).state.day,5);await selectWage(page,2,'keyboard');await run(page);assert.deepEqual((await saved(page)).reference,original,'past path preserved');
  await page.locator('[aria-label="翻回第2天"]').click();assert.equal((await saved(page)).state.day,1);assert.equal((await saved(page)).reference.day,6);assert.equal(moneyTotal((await saved(page)).state),120);
  while((await saved(page)).state.day<6){await selectWage(page,1,'keyboard');await run(page);}
  await page.locator('#opponents button').nth(1).click();assert.equal((await saved(page)).state.strategy,'bargain');assert.equal((await saved(page)).state.day,0);assert.equal(moneyTotal((await saved(page)).state),120);
  const current=(await saved(page)).state;await page.locator('[data-piece="wage:3"]').focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');await page.locator('#wage-bag').click();assert.deepEqual((await saved(page)).state,current);
  const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);if(!fits){await page.screenshot({path:path.join(out,spec.width+'-overflow.png'),fullPage:true});console.log(await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,outside:[...document.querySelectorAll('*')].map(n=>({tag:n.tagName,id:n.id,cls:String(n.className),right:n.getBoundingClientRect().right,text:n.textContent.slice(0,30)})).filter(n=>n.right>innerWidth+1)})));}assert(fits,'no horizontal overflow at '+spec.width);await page.screenshot({path:path.join(out,spec.width+'-play.png'),fullPage:true});
  results.push({width:spec.width,method:spec.method,actualSalaryDrag:spec.method!=='keyboard',days:6,ovenBought:true,funded:true,rewind:true,refresh:true,separateCounterfactual:true,stateInjection:false});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);for(const name of files)assert.equal(createHash('sha256').update(await fs.readFile(path.resolve('public/assets/market-duel',name))).digest('hex'),fileHashes[name],'prototype changed while QA was running');await fs.writeFile(path.join(out,'report.json'),JSON.stringify({checkedAt:new Date().toISOString(),scope:'independent two-shop prototype, not the whole story',fileHashes,results,errors,external},null,2));console.log(JSON.stringify({results,errors,external}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
