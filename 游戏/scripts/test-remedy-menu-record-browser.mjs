/** Collect real responses, then compare their receipts at the prescription desk. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {remedyAccounts} from '../lib/remedy-lab.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),bytes=await fs.readFile(path.join(root,'build/index.html'));
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const server=http.createServer((_,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,out=path.join(root,'outputs/relief-qa');await fs.mkdir(out,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),results=[],errors=[],external=[];
const saved=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),PROLOGUE_STORAGE_KEY);
const settled=f=>f.waitForFunction(()=>!document.body.dataset.transition);
async function frame(p){const f=await(await p.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();await settled(f);return f;}
async function press(n,spec){if(spec.keyboard)await n.press('Enter');else if(spec.touch)await n.tap();else await n.click();}
async function changed(p,f,before){await p.waitForFunction(({key,before})=>localStorage.getItem(key)!==before,{key:PROLOGUE_STORAGE_KEY,before});await settled(f);}
async function geometry(f){
 assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 for(const card of await f.locator('.remedy-card').all()){
  const b=await card.boundingBox();assert(b.height>=44);
  for(const child of await card.locator('.remedy-card-title,.remedy-card-promise,.remedy-card-art,.remedy-card-progress').all()){
   const a=await child.boundingBox();assert(a.x>=b.x-1&&a.y>=b.y-1&&a.x+a.width<=b.x+b.width+1&&a.y+a.height<=b.y+b.height+1,'card content stays inside');
  }
  const children=await Promise.all((await card.locator('.remedy-card-title,.remedy-card-promise,.remedy-card-art,.remedy-card-progress').all()).map(n=>n.boundingBox()));
  for(let i=0;i<children.length;i++)for(let j=0;j<i;j++){const a=children[i],c=children[j];assert(Math.max(0,Math.min(a.x+a.width,c.x+c.width)-Math.max(a.x,c.x))*Math.max(0,Math.min(a.y+a.height,c.y+c.height)-Math.max(a.y,c.y))<1,'card fields do not overlap');}
 }
}
async function checkReceipt(p,f,route){
 const s=await saved(p),a=remedyAccounts(s.remedyLabs[route]),r=a.display,card=f.locator('.remedy-card[data-route="'+route+'"]');
 assert(s.reliefCompleted.includes(route));assert(a.canContinue);assert.equal(await card.getAttribute('data-recorded'),'true');
 const expected='剩'+r.stock+'份 · '+(route==='consumption'?(r.debt?'下期还'+(r.debt+Math.ceil(r.debt/5))+'枚':'工资'+r.wages+'枚'):
  route==='investment'?(r.control.mode==='expand'?'下期产能'+(50+r.capacity)+'份':'下期开工'+(Math.max(10,15-r.world.efficiency)+Math.ceil(r.capacity/5))+'枚'):'跑腿'+r.transport+'枚');
 assert.equal(await card.locator('.remedy-card-promise').textContent(),expected);
 assert.match(await card.locator('.remedy-card-trial').textContent(),new RegExp({normal:'原条件',adverse:'逆风',supported:'顺风'}[r.control.outlook]));
 assert((await card.getAttribute('aria-label')).includes(expected));
 return {route,stock:r.stock,mode:r.control.mode,outlook:r.control.outlook,summary:expected};
}
try{
 for(const spec of [{width:320,keyboard:true},{width:390,touch:true,offline:true,reduced:true},{width:1280}]){
  const ctx=await browser.newContext({viewport:{width:spec.width,height:960},hasTouch:!!spec.touch,reducedMotion:spec.reduced?'reduce':'no-preference'});
  await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||spec.offline&&u===offline)return r.continue();external.push(u);return r.abort();});
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(spec.offline?offline:url);let f=await frame(p);await f.locator('#dots [data-stage="4"]').click();await f.locator('.remedy-card').first().waitFor();await settled(f);await geometry(f);
  assert.equal(await f.locator('.remedy-card[data-recorded="true"]').count(),0);
  const receipts=[];
  for(const route of ['consumption','investment','exports']){
   await press(f.locator('.remedy-card[data-route="'+route+'"]'),spec);await f.locator('.gesture-zone').first().waitFor();await settled(f);
   const [first,other]={consumption:['credit','raise'],investment:['expand','replace'],exports:['single','diverse']}[route];
   for(const mode of [first,first,first,other]){
    await f.waitForFunction(mode=>{const n=document.querySelector('[data-gesture-target="'+mode+'"]');return n&&!n.disabled;},mode);
    const before=JSON.stringify(await saved(p));await press(f.locator('[data-gesture-target="'+mode+'"]'),spec);await changed(p,f,before);
   }
   if(route==='consumption'){
    // Finish with credit so the menu must retain a real debt, not a stock slogan.
    await f.waitForFunction(()=>!document.querySelector('[data-gesture-target="credit"]').disabled);
    const before=JSON.stringify(await saved(p));await press(f.locator('[data-gesture-target="credit"]'),spec);await changed(p,f,before);
   }
   if(route==='exports'){
    await press(f.locator('.remedy-conditions>summary'),spec);const before=JSON.stringify(await saved(p));await press(f.locator('.remedy-conditions .remedy-operate button').nth(1),spec);await changed(p,f,before);
   }
   await press(f.getByRole('button',{name:'收下这张处方的教训 →',exact:true}),spec);await f.locator('.remedy-card').first().waitFor();await settled(f);await geometry(f);
   receipts.push(await checkReceipt(p,f,route));
  }
  assert.equal(await f.locator('.remedy-card[data-recorded="true"]').count(),3);assert.match(await f.locator('.remedy-encounter p').textContent(),/试过的办法，留下了什么/);
  assert.equal(await f.locator('.remedy-final').count(),0,'no repeated conclusion question');const next=f.getByRole('button',{name:'继续故事 →',exact:true});assert((await next.boundingBox()).height>=44);
  const before=JSON.stringify(await saved(p));await p.screenshot({path:path.join(out,'menu-records-'+spec.width+'.png'),fullPage:true});await p.reload();f=await frame(p);await f.locator('.remedy-card').first().waitFor();assert.equal(JSON.stringify(await saved(p)),before);for(const route of ['consumption','investment','exports'])await checkReceipt(p,f,route);await geometry(f);
  await press(f.getByRole('button',{name:'继续故事 →',exact:true}),spec);await p.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).scene==='epilogue',PROLOGUE_STORAGE_KEY);await settled(f);
  await f.locator('#dots [data-stage="4"]').click();await f.locator('.remedy-card').first().waitFor();await settled(f);for(const route of ['consumption','investment','exports'])await checkReceipt(p,f,route);
  await press(f.locator('.remedy-card[data-route="consumption"]'),spec);await f.locator('.remedy-rematch-start').waitFor();await settled(f);
  const current=await saved(p);await press(f.getByRole('button',{name:'从第一回合重打，保留这次账目',exact:true}),spec);await changed(p,f,JSON.stringify(current));
  await press(f.getByRole('button',{name:'先看看别的处方 ↩',exact:true}),spec);await f.locator('.remedy-card').first().waitFor();await settled(f);
  const fresh=f.locator('.remedy-card[data-route="consumption"]');assert.equal(await fresh.getAttribute('data-recorded'),'false');assert.equal(await fresh.locator('.remedy-card-trial').count(),0);assert.match(await fresh.locator('.remedy-card-promise').textContent(),/先让钱包鼓起来/);assert.equal(await f.locator('.remedy-card[data-recorded="true"]').count(),2);await geometry(f);
  results.push({width:spec.width,offline:!!spec.offline,keyboard:!!spec.keyboard,receipts,actualPayments:true,refreshReadOnly:true,continueReachesEpilogue:true,returnRetainsReceipts:true,rematchDropsOnlyCurrentReceipt:true,noOverlap:true});await ctx.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html'))));
 const report={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,passed:true,results,errors,external};await fs.writeFile(path.join(out,'remedy-menu-record-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(out,'menu-record-failure-'+p.viewportSize().width+'.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await browser.close();await new Promise(r=>server.close(r));}
