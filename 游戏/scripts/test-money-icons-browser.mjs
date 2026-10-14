import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {initialPrologue,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {createStreetCampaign} from '../lib/street-game.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html'));
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/';
const offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href;
const output=path.join(root,'outputs/money-icons-qa');await fs.mkdir(output,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[];
async function frame(page){const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();return f;}
async function noVisibleUnits(f,selector){
 const leftovers=await f.locator(selector).evaluateAll(elements=>elements.flatMap(el=>{
  const walker=document.createTreeWalker(el,4),bad=[];let n;
  while((n=walker.nextNode()))if(n.nodeValue.includes('枚')&&!n.parentElement.closest('.money-spoken-unit'))bad.push(n.nodeValue);
  return bad;
 }));assert.deepEqual(leftovers,[]);
}
try{
 for(const spec of [{width:1280},{width:390,offline:true}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:960},reducedMotion:'reduce'});
  await context.route('**/*',r=>{if(r.request().url().startsWith(url)||spec.offline&&r.request().url()===offline)return r.continue();external.push(r.request().url());return r.abort();});
  await context.addInitScript(({key,saved})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{key:PROLOGUE_STORAGE_KEY,saved:{...initialPrologue(),scene:'bakery-upgrade'}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(spec.offline?offline:url);let f=await frame(page);
  await f.getByRole('button',{name:'看完这一幕',exact:true}).click();
  await f.locator('[data-testid="bakery-wage"]').waitFor();
  await f.waitForFunction(()=>document.querySelector('[data-testid="bakery-wage"] .money-coin'));
  assert.equal(await f.locator('[data-testid="bakery-wage"] .money-coin').count(),1);
  assert.equal(await f.locator('[data-testid="bakery-retained"] .money-coin').count(),1);
  await noVisibleUnits(f,'#controls, #readout, #note-content');
  await page.screenshot({path:path.join(output,spec.width+'-split.png'),fullPage:true});
  // Changing a number must restore the icon after the animation replaces text.
  await f.getByRole('button',{name:'给厨师增加1枚',exact:true}).click();
  await f.waitForFunction(()=>document.querySelector('[data-testid="bakery-wage"]').textContent.includes('6'));
  assert.equal(await f.locator('[data-testid="bakery-wage"] .money-coin').count(),1);
  await f.evaluate(()=>window.__trustStage.bakery.seek(7.2));
  await noVisibleUnits(f,'#bakery-caption');assert.equal(await f.locator('#bakery-caption .money-coin').count(),1);
  await f.getByRole('button',{name:'看完这一幕',exact:true}).click();
  await f.getByRole('button',{name:'就这样分 →',exact:true}).click();
  await f.waitForFunction(()=>window.__trustStage.bakery.sample.showBalances);
  const labels=await f.evaluate(()=>window.__trustStage.bakery.labels.children.filter(n=>typeof n.text==='string').map(n=>n.text));
  assert.deepEqual(labels,['厨师 · 6','老板 · 9']);
  await noVisibleUnits(f,'#controls, #readout');
  await page.screenshot({path:path.join(output,spec.width+'-balances.png'),fullPage:true});
  const fixture=await f.evaluate(()=>{
   const holder=document.createElement('div');holder.innerHTML='<button>5枚</button><p>3—7枚；每枚钱；<span>枚</span></p>';
   document.body.appendChild(holder);let clicks=0;holder.querySelector('button').onclick=()=>clicks++;
   StreetArt.decorateMoney(holder);StreetArt.decorateMoney(holder);holder.querySelector('button').click();
   const result={coins:holder.querySelectorAll('.money-coin').length,clicks,spoken:holder.querySelectorAll('.money-spoken-unit').length,amounts:[...holder.querySelectorAll('.money-unit')].map(n=>n.textContent)};holder.remove();return result;
  });assert.deepEqual(fixture,{coins:4,clicks:1,spoken:4,amounts:['5枚','3—7枚','枚','枚']});
  await page.evaluate(({key,saved})=>localStorage.setItem(key,JSON.stringify(saved)),{key:PROLOGUE_STORAGE_KEY,saved:{...initialPrologue(),scene:'street',street:createStreetCampaign()}});
  await page.reload();f=await frame(page);
  const before=await f.evaluate(()=>JSON.stringify(window.__trustStage.street.game));
  await f.locator('.street-shop-hit[data-firm="bakery"]').click({position:{x:10,y:15}});
  for(const tab of ['店里现在','钱的去向','成本怎么算']){
   await f.getByRole('tab',{name:tab,exact:true}).click();await noVisibleUnits(f,'.shop-ledger-dialog');
  }
  assert(await f.locator('.shop-ledger-dialog .money-coin').count()>0);
  assert.equal(await f.evaluate(()=>JSON.stringify(window.__trustStage.street.game)),before);
  await f.getByRole('button',{name:'关闭店铺账本',exact:true}).click();
  await f.locator('.street-person[data-person="bakery-0"]').click();await noVisibleUnits(f,'.street-thought');
  assert(await f.locator('.street-thought .money-coin').count()>0);
  await page.screenshot({path:path.join(output,spec.width+'-wallet.png'),fullPage:true});
  await f.getByRole('button',{name:'关闭心声',exact:true}).click();
  await f.getByRole('button',{name:'开门营业 →',exact:true}).click();
  const receipt=f.getByRole('dialog',{name:'第一天的钱，怎么算？',exact:true});await receipt.waitFor();
  await noVisibleUnits(f,'#street-briefing');assert(await receipt.locator('.money-coin').count()>=6);
  assert(await receipt.locator('.money-coin image').first().getAttribute('href').then(h=>h.startsWith('data:image/png;base64,')));
  assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:path.join(output,spec.width+'-receipt.png'),fullPage:true});
  await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('PASS: shared coin art, changing amounts, wallets, ledgers, receipts, repeat-safe decoration, desktop and offline mobile');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
