/** Real consumption play: two visible choices, funded shopping and an intact bill. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {remedyAccounts} from '../lib/remedy-lab.ts';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url)),bytes=await fs.readFile(path.join(root,'build/index.html')),out=path.join(root,'outputs/relief-qa');
const server=http.createServer((_,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href;
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),results=[],errors=[],external=[];
const read=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),PROLOGUE_STORAGE_KEY);
const button=(f,id)=>f.locator('[data-gesture-target="'+id+'"]');
async function frame(p){const f=await(await p.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);return f;}
async function round(f,n){await f.waitForFunction(n=>document.querySelector('.remedy-scene')?.dataset.round===String(n),n);}
async function still(f){await f.waitForFunction(()=>!document.querySelector('.remedy-message')?.dataset.cashStep);}
async function layout(f){
 assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.equal(await f.locator('.remedy-status').count(),2);assert.equal(await f.locator('.remedy-cash-status,.remedy-guess,[data-gesture-packet],.remedy-forecast-portrait').count(),0);
 assert.equal(await f.locator('.remedy-battle .remedy-tools').count(),0);assert.equal(await f.locator('.remedy-consumption-tools').evaluate(n=>n.open),false);
 const rects=await f.evaluate(()=>{
  const s=document.querySelector('.remedy-scene').getBoundingClientRect();
  return [...document.querySelectorAll('.remedy-scene .remedy-status,.remedy-scene>.remedy-bill,.remedy-buyers>.remedy-person,.remedy-producer')].map(n=>{
   const r=n.getBoundingClientRect();return {kind:n.className.baseVal??n.className,x:r.x-s.x,y:r.y-s.y,w:r.width,h:r.height,inside:r.x>=s.x-1&&r.y>=s.y-1&&r.right<=s.right+1&&r.bottom<=s.bottom+1};
  });
 });
 for(const r of rects)assert(r.inside,JSON.stringify(r));
 for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
  const a=rects[i],b=rects[j],overlap=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1;
  assert(!overlap,JSON.stringify({a,b}));
 }
 for(const b of await f.locator('.gesture-zone:visible').all())assert((await b.boundingBox()).height>=44);
}
try{
 await fs.mkdir(out,{recursive:true});
 for(const spec of [{width:320,keyboard:true},{width:390,touch:true,offline:true,reduced:true},{width:1280}]){
  const ctx=await browser.newContext({viewport:{width:spec.width,height:960},hasTouch:!!spec.touch,reducedMotion:spec.reduced?'reduce':'no-preference'});
  await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||spec.offline&&u===offline)return r.continue();external.push(u);return r.abort();});
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(spec.offline?offline:url);let f=await frame(p);
  await f.locator('#dots [data-stage="4"]').click();await f.locator('.remedy-card[data-route=consumption]').click();await f.locator('.remedy-consumption').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);
  assert.match(await f.locator('#readout').innerText(),/想多卖一点，先让顾客买得起/);await layout(f);
  const play=async id=>{const b=button(f,id);if(spec.keyboard)await b.press('Enter');else if(spec.touch)await b.tap();else await b.click();};
  await play('credit');await round(f,1);const narrative=await f.locator('.remedy-message').textContent();
  if(!spec.reduced){
   await f.waitForFunction(()=>document.querySelector('.remedy-message')?.dataset.cashStep==='borrow');
   assert.equal(await f.locator('.remedy-wallet').getAttribute('data-wallet'),'30');assert.equal(await f.locator('.remedy-message').textContent(),narrative);assert(await f.getByTestId('remedy-bill').isVisible());
  }
  await still(f);assert.equal(await f.locator('.remedy-shopping-status').getAttribute('data-bought'),'30');assert.match(await f.getByTestId('remedy-bill').textContent(),/下回合还\s*12/);await layout(f);
  await play('credit');await round(f,2);await still(f);const a=remedyAccounts((await read(p)).remedyLabs.consumption);
  assert.equal(a.display.repayment,12);assert.equal(await f.locator('.remedy-shopping-status').getAttribute('data-bought'),'18');assert.equal(await f.locator('.remedy-pressure-status>.remedy-meter').getAttribute('aria-valuenow'),'12');assert.match(await f.locator('.remedy-message').textContent(),/先还12.*买到18.*下回合底薪减半/);await layout(f);
  await p.screenshot({path:path.join(out,'consumption-focus-'+spec.width+'-second-loan.png'),fullPage:true});
  // Draft controls are secondary and read-only; actual money remains available in the ledger.
  const frozen=(await read(p)).remedyLabs.consumption;await f.locator('.remedy-consumption-tools>summary').click();await f.getByRole('button',{name:'增加药方力度',exact:true}).click();
  assert.deepEqual((await read(p)).remedyLabs.consumption.history,frozen.history);assert.equal(await f.locator('.remedy-shopping-status').getAttribute('data-bought'),'18');
  await f.getByRole('button',{name:'减少药方力度',exact:true}).click();await f.locator('.remedy-consumption-tools>summary').click();
  await f.getByRole('button',{name:'从第1回合重打，保留原记录',exact:true}).click();await round(f,0);await play('raise');await round(f,1);await still(f);
  assert.equal(await f.getByTestId('remedy-bill').count(),0);assert.equal(await f.locator('.remedy-shopping-status').getAttribute('data-bought'),'30');assert.match(await f.locator('.remedy-message').textContent(),/靠工资买齐.*没有新借款/);await layout(f);
  await p.screenshot({path:path.join(out,'consumption-focus-'+spec.width+'-wages.png'),fullPage:true});
  await play('raise');await round(f,2);await play('raise');await round(f,3);await still(f);assert.match(await f.locator('.remedy-message').textContent(),/底薪减半/);
  await play('raise');await round(f,4);await still(f);await layout(f);assert.equal(await f.locator('.remedy-fourth-retry').evaluate(n=>n.open),false);
  const ledger=f.locator('.remedy-records>.remedy-receipt').first();await ledger.locator('summary').click();assert.match(await ledger.textContent(),/生产账户余额.*余额不是利润/);
  // Restoration canonicalizes object-key order; decisions, arrays and all
  // account inputs must stay equal, not merely stringify in the same order.
  const saved=await read(p);await p.reload();f=await frame(p);assert.deepEqual(await read(p),saved);await round(f,4);await layout(f);
  results.push({width:spec.width,offline:!!spec.offline,stableNarrative:true,purchaseMeterAndStockCount:true,actualLoanThenRepayment:true,raisesWithoutDebt:true,readOnlySettingsAndRefresh:true,actorsAndBillsDoNotOverlap:true});console.log('PASS focused consumption '+spec.width);await ctx.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html'))));
 const report={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,passed:true,results,errors,external};await fs.writeFile(path.join(out,'consumption-focus-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(out,'consumption-focus-failure-'+p.viewportSize().width+'.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await browser.close();await new Promise(r=>server.close(r));}
