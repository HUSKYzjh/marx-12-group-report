/** Real open-day UI; legacy save migration; phone, keyboard and offline play. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {initialPrologue,prologueReducer as reduce,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {initialRemedy,remedyReducer,remedyAccounts} from '../lib/remedy-lab.ts';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url)),bytes=await fs.readFile(path.join(root,'build/index.html')),out=path.join(root,'outputs/relief-qa');
const server=http.createServer((_,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href;
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),results=[],errors=[],external=[];
const read=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),PROLOGUE_STORAGE_KEY);
async function frame(p){const f=await(await p.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);return f;}
async function settled(f,n){await f.waitForFunction(n=>document.querySelector('.remedy-scene')?.dataset.round===String(n),n);await f.waitForFunction(()=>!document.querySelector('.remedy-message')?.dataset.cashStep);}
async function layout(f){
 assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');
 assert.equal(await f.locator('.remedy-forecast-portrait,.remedy-round-track,.remedy-guess').count(),0);
 const rects=await f.evaluate(()=>{const s=document.querySelector('.remedy-scene').getBoundingClientRect();return [...document.querySelectorAll('.remedy-scene .remedy-status,.remedy-scene>.remedy-bill,.remedy-buyers>.remedy-person,.remedy-producer')].map(n=>{const r=n.getBoundingClientRect();return {kind:n.className.baseVal??n.className,x:r.x-s.x,y:r.y-s.y,w:r.width,h:r.height,inside:r.x>=s.x-1&&r.y>=s.y-1&&r.right<=s.right+1&&r.bottom<=s.bottom+1};});});
 for(const r of rects)assert(r.inside,JSON.stringify(r));
 for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];assert(!(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1),JSON.stringify({a,b}));}
 for(const b of await f.locator('.remedy-open button:visible').all())assert((await b.boundingBox()).height>=44,'short tap target');
}
try{
 await fs.mkdir(out,{recursive:true});
 for(const spec of [{width:320,keyboard:true},{width:390,touch:true,offline:true,reduced:true},{width:1280}]){
  const ctx=await browser.newContext({viewport:{width:spec.width,height:960},hasTouch:!!spec.touch,reducedMotion:spec.reduced?'reduce':'no-preference'});
  await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||spec.offline&&u===offline)return r.continue();external.push(u);return r.abort();});
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(spec.offline?offline:url);let f=await frame(p);
  await f.locator('#dots [data-stage="4"]').click();await f.locator('.remedy-card[data-route=consumption]').click();await f.locator('.remedy-open').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);await layout(f);
  const play=async mode=>{const b=f.locator('[data-gesture-target="'+mode+'"]');if(spec.keyboard)await b.press('Enter');else if(spec.touch)await b.tap();else await b.click();};
  await play('credit');await settled(f,1);assert.equal(await f.locator('.remedy-shopping-status').getAttribute('data-bought'),'30');assert.match(await f.getByTestId('remedy-bill').textContent(),/12/);
  await play('credit');await settled(f,2);assert.equal(await f.locator('.remedy-shopping-status').getAttribute('data-bought'),'18');assert.match(await f.locator('.remedy-message').textContent(),/先还12.*买到18/);assert(!/减半/.test(await f.locator('.remedy-message').textContent()));await layout(f);
  await p.screenshot({path:path.join(out,'consumption-open-'+spec.width+'-loan2.png'),fullPage:true});
  // A drafted challenge survives changing dose, but changes no recorded day.
  const history=structuredClone((await read(p)).remedyLabs.consumption.history);await f.locator('.remedy-consumption-tools>summary').click();await f.getByLabel('下一天的额外条件').selectOption('adverse');await f.getByLabel('增加药方力度').click();
  assert.equal(await f.getByLabel('下一天的额外条件').inputValue(),'adverse');assert.deepEqual((await read(p)).remedyLabs.consumption.history,history);
  // Choose normal instead; no challenge is required. Restore the ordinary dose.
  await f.locator('.remedy-consumption-tools>summary').click();await f.getByLabel('下一天的额外条件').selectOption('normal');await f.getByLabel('减少药方力度').click();
  for(let n=3;n<=6;n++){await play('raise');await settled(f,n);}
  let saved=await read(p),a=remedyAccounts(saved.remedyLabs.consumption);assert.equal(a.reports.length,6);assert(a.reports.every(r=>r.wages>=20&&r.control.outlook==='normal'));assert.equal(a.display.debt,0);assert.equal(await f.locator('.remedy-shopping-status').getAttribute('data-bought'),'30');await layout(f);
  await p.screenshot({path:path.join(out,'consumption-open-'+spec.width+'-raise6.png'),fullPage:true});
  await p.reload();f=await frame(p);await settled(f,6);assert.deepEqual((await read(p)).remedyLabs.consumption,saved.remedyLabs.consumption);
  await f.getByRole('button',{name:'看看其他办法 →',exact:true}).click();await f.locator('.remedy-menu').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);assert.deepEqual((await read(p)).reliefCompleted,['consumption']);await f.getByRole('button',{name:'先继续故事 →',exact:true}).click();await p.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).scene==='epilogue',PROLOGUE_STORAGE_KEY);
  // Return and explicitly run one optional shock; the following day defaults normal.
  await f.waitForFunction(()=>!document.body.dataset.transition);await f.locator('#dots [data-stage="4"]').click();await f.locator('.remedy-card[data-route=consumption]').click();await f.locator('.remedy-open').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);await f.locator('.remedy-consumption-tools>summary').click();await f.getByLabel('下一天的额外条件').selectOption('adverse');await play('raise');await settled(f,7);assert.equal(remedyAccounts((await read(p)).remedyLabs.consumption).display.control.outlook,'adverse');await play('raise');await settled(f,8);assert.equal(remedyAccounts((await read(p)).remedyLabs.consumption).display.control.outlook,'normal');
  // Restart is explicit and archives all real days, never deleting older records.
  await f.locator('.remedy-records>.remedy-receipt').first().locator('summary').click();await f.getByLabel('从头试，保留这次记录').click();await settled(f,0);saved=await read(p);assert.equal(saved.remedyLabs.consumption.archives[0].history.length,8);assert.deepEqual(saved.reliefCompleted,[]);
  await play('raise');await settled(f,1);await f.getByRole('button',{name:'看看其他办法 →',exact:true}).click();await f.locator('.remedy-menu').waitFor();assert.deepEqual((await read(p)).reliefCompleted,['consumption'],'one actual trade is enough; no fixed minimum days');
  results.push({width:spec.width,offline:!!spec.offline,days:8,refresh:true,optionalShock:true,archive:true,earlyExit:true});console.log('PASS open-day UI',spec.width);await ctx.close();
 }
 // Existing old save is not silently recomputed. Opt-in conversion keeps old books.
 const ctx=await browser.newContext(),p=await ctx.newPage();let old=initialRemedy('consumption');old=remedyReducer(old,{type:'PLACE',mode:'credit',expectedRound:0});const oldReport=remedyAccounts(old).display;
 let saved={...initialPrologue(),remedyLabs:{consumption:initialRemedy('consumption')}};saved=reduce(saved,{type:'JUMP_STAGE',stage:4});saved=reduce(saved,{type:'CHOOSE_RELIEF',route:'consumption'});saved=reduce(saved,{type:'REMEDY',action:{type:'PLACE',mode:'credit',expectedRound:0}});
 await p.goto(url);await p.evaluate(({key,saved})=>localStorage.setItem(key,JSON.stringify(saved)),{key:PROLOGUE_STORAGE_KEY,saved});await p.reload();const f=await frame(p);await f.getByRole('button',{name:'开始按天经营 →'}).click();await settled(f,0);const converted=(await read(p)).remedyLabs.consumption;assert.equal(converted.flow,'consumption-open');assert.deepEqual(remedyAccounts(converted).archives[0].display,oldReport);results.push({legacyMigration:true,oldReceiptUnchanged:true});await ctx.close();
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html'))));const report={sha256:createHash('sha256').update(bytes).digest('hex'),passed:true,results,errors,external};await fs.writeFile(path.join(out,'consumption-open-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(out,'consumption-open-failure-'+p.viewportSize().width+'.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await browser.close();await new Promise(r=>server.close(r));}
