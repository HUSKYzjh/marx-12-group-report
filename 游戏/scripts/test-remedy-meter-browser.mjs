/** Real turns and measured gauge travel; no synthetic economic state. */
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
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),bytes=await fs.readFile(path.join(project,'build/index.html'));
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(project,'offline/技术红利去了哪里.html')).href;
const output=path.join(project,'outputs/relief-qa');await fs.mkdir(output,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),results=[],errors=[],external=[];
const save=p=>p.evaluate(k=>localStorage.getItem(k),PROLOGUE_STORAGE_KEY);
async function frame(p){const f=await(await p.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();return f;}
async function gauges(p,f,route,reduced){
 const saved=await save(p),a=remedyAccounts(JSON.parse(saved).remedyLabs[route]),r=a.display,before=r.round>1?a.reports[r.round-2].world:a.opening;
 const metrics=await f.locator('.remedy-scene:not(.remedy-preview-scene) .remedy-meter').evaluateAll(nodes=>nodes.map(n=>{
  const fill=n.firstElementChild,animation=fill.getAnimations().find(a=>a.animationName==='remedy-meter-settle'),track=n.getBoundingClientRect().width;
  const widths=[];if(animation){animation.pause();for(const time of [0,325,650]){animation.currentTime=time;widths.push(parseFloat(getComputedStyle(fill).width));}animation.finish();}
  return {name:n.getAttribute('aria-label'),start:Number(n.dataset.start),value:Number(n.getAttribute('aria-valuenow')),max:Number(n.getAttribute('aria-valuemax')),track,widths,animation:!!animation,final:parseFloat(getComputedStyle(fill).width)};
 }));
 for(const m of metrics){const cash=m.name==='生产账户',start=cash?before.cash.shop:before.stock,end=cash?r.world.cash.shop:r.stock;
  assert.equal(m.start,start);assert.equal(m.value,end);assert(m.max>=Math.max(start,end));assert.equal(m.animation,!reduced);
  const close=(actual,expected)=>assert(Math.abs(actual-expected)<1.5,JSON.stringify({actual,expected,m}));
  if(m.animation){close(m.widths[0],m.track*start/m.max);close(m.widths[2],m.track*end/m.max);assert(m.widths[1]>=Math.min(m.widths[0],m.widths[2])-.1&&m.widths[1]<=Math.max(m.widths[0],m.widths[2])+.1);}
  close(m.final,m.track*end/m.max);
 }
 const impacts=await f.locator('.remedy-scene:not(.remedy-preview-scene) .remedy-turn-delta').evaluateAll(nodes=>nodes.map(n=>{
  const value=n.firstElementChild,animation=value.getAnimations()[0],poses=[],sizes=[];
  if(animation){animation.pause();const timing=animation.effect.getComputedTiming();for(const fraction of [0,.35,1]){animation.currentTime=timing.delay+timing.duration*fraction;const m=new DOMMatrix(getComputedStyle(value).transform),b=value.getBoundingClientRect(),a=n.parentElement.getBoundingClientRect();poses.push({a:m.a,b:m.b,x:m.e,y:m.f});sizes.push({inside:b.left>=a.left&&b.right<=a.right&&b.top>=a.top&&b.bottom<=a.bottom});}animation.finish();}
  return {kind:n.dataset.kind,direction:n.dataset.direction,amount:Number(value.dataset.amount),text:n.textContent,description:n.getAttribute('aria-label'),animation:getComputedStyle(value).animationName,poses,sizes};
 }));
 assert.equal(impacts.length,2);
 for(const impact of impacts){const amount=impact.kind==='cash'?r.cashChange:r.newStock;assert.equal(impact.amount,amount);assert.equal(impact.direction,amount>0?'grow':amount<0?'shrink':'steady');
  const name=reduced||!amount?'none':amount<0?'remedy-delta-drop':impact.kind==='stock'?'remedy-stock-hit':'remedy-cash-hit';assert.equal(impact.animation,name);
  assert.equal(impact.poses.length,name==='none'?0:3);if(impact.poses.length){assert.notDeepEqual(impact.poses[0],impact.poses[1],'the impact must actually move');assert(impact.sizes.every(s=>s.inside),'impact number stays inside its own status card');}
  if(impact.kind==='stock')assert.match(impact.description,new RegExp('做出'+r.made+'份，卖出'+r.sold+'份'));
 }
 assert.equal(await save(p),saved,'presentation sampling must not move money or complete another turn');return {metrics,impacts};
}
try{
 for(const spec of [{width:320},{width:390,reduced:true,offline:true},{width:1280}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:960},reducedMotion:spec.reduced?'reduce':'no-preference'});
  await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||spec.offline&&u===offline)return r.continue();external.push(u);return r.abort();});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(spec.offline?offline:url);let f=await frame(p);
  await f.locator('#dots [data-stage="4"]').click();await f.locator('.remedy-card').first().waitFor();
  for(const [route,mode,counter] of [['consumption','credit','raise'],['investment','expand','replace'],['exports','single','diverse']]){
   await f.waitForFunction(()=>!document.body.dataset.transition);await f.locator('.remedy-card[data-route="'+route+'"]').click();await f.locator('.remedy-scene[data-round="0"]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);
   const opening=await f.locator('.remedy-cash-status .remedy-meter').evaluate(n=>({max:Number(n.getAttribute('aria-valuemax')),value:Number(n.getAttribute('aria-valuenow')),width:n.firstElementChild.getBoundingClientRect().width/n.getBoundingClientRect().width}));
   assert.equal(opening.max,120);assert.equal(opening.value,60);assert(Math.abs(opening.width-.5)<.02);assert.equal(await f.locator('.remedy-meter[data-start]').count(),0);
   assert.equal(await f.locator('.remedy-turn-delta').count(),0,'unplayed entry cannot display an invented hit');
   const turns=[];for(let round=1;round<=4;round++){
    const selected=round===4?counter:mode;await f.waitForFunction(m=>!document.querySelector('[data-gesture-target="'+m+'"]').disabled,selected);
    const old=await save(p);await f.locator('[data-gesture-target="'+selected+'"]').click();await p.waitForFunction(({key,old})=>localStorage.getItem(key)!==old,{key:PROLOGUE_STORAGE_KEY,old});await f.locator('.remedy-scene[data-round="'+Math.min(round,3)+'"]').waitFor();
    turns.push(await gauges(p,f,route,!!spec.reduced));
   }
   const saved=await save(p),played=JSON.parse(saved).remedyLabs[route];assert.equal(played.history.length,3);assert.equal(played.history[2].outlook,'adverse');assert.equal(played.comparisons.length,1);
   await p.screenshot({path:path.join(output,'meter-'+spec.width+'-'+route+'.png'),fullPage:true});await p.reload();f=await frame(p);await f.locator('.remedy-scene[data-round="3"][data-animate=false]').waitFor();
   assert.equal(await f.locator('.remedy-meter>span').evaluateAll(ns=>ns.some(n=>n.getAnimations().some(a=>a.animationName==='remedy-meter-settle'))),false);assert.equal(await save(p),saved);
   assert.equal(await f.locator('.remedy-delta-value').evaluateAll(ns=>ns.some(n=>n.getAnimations().length)),false);
   await f.locator('.remedy-conditions>summary').click();assert.equal(await save(p),saved);await f.getByTestId('remedy-comparison').press('Enter');await f.locator('.remedy-preview-scene').waitFor();assert.equal(await f.locator('.remedy-preview-scene .remedy-meter>span').evaluateAll(ns=>ns.some(n=>n.getAnimations().some(a=>a.animationName==='remedy-meter-settle'))),false);await f.getByTestId('remedy-comparison').press('Escape');assert.equal(await save(p),saved);
   assert.equal(await f.locator('.remedy-delta-value').evaluateAll(ns=>ns.some(n=>n.getAnimations().length)),false,'read-only peeks must not replay a hit');
   assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));results.push({width:spec.width,route,reduced:!!spec.reduced,offline:!!spec.offline,opening,turns,actualPeriodPrefix:true,refreshAndPeekStatic:true,readOnlyPresentation:true,fourExecutions:true});
   await f.getByRole('button',{name:'收下这张处方的教训 →',exact:true}).click();await f.locator('.remedy-card').first().waitFor();
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(project,'build/index.html'))));
 const report={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,passed:true,results,errors,external};await fs.writeFile(path.join(output,'remedy-meter-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({sha256:report.sha256,bytes:report.bytes,passed:true,cases:results.length}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
