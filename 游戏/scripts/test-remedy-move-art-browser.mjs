/** Actual card hits and route-specific drag/tap/keyboard moves; no injected save. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {remedyAccounts} from '../lib/remedy-lab.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),bytes=await fs.readFile(path.join(root,'build/index.html'));
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const server=http.createServer((_,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,out=path.join(root,'outputs/relief-qa');await fs.mkdir(out,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),results=[],errors=[],external=[];
const saved=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),PROLOGUE_STORAGE_KEY);
const settled=f=>f.waitForFunction(()=>!document.body.dataset.transition);
async function frame(p){const f=await(await p.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();await settled(f);return f;}
async function press(node,spec){if(spec.keyboard)await node.press('Enter');else if(spec.width<600)await node.tap();else await node.click();}
async function changed(p,f,before){await p.waitForFunction(({key,before})=>localStorage.getItem(key)!==before,{key:PROLOGUE_STORAGE_KEY,before});await settled(f);}
const target=(f,mode)=>f.locator('[data-gesture-target="'+mode+'"]');
async function ready(f,mode){await f.waitForFunction(mode=>{const b=document.querySelector('[data-gesture-target="'+mode+'"]');return b&&!b.disabled;},mode);}
function inside(a,b){return a.x>=b.x-1&&a.y>=b.y-1&&a.x+a.width<=b.x+b.width+1&&a.y+a.height<=b.y+b.height+1;}
function overlap(a,b){return Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));}
async function shelfCheck(f,r){
 const shelf=f.locator('.remedy-scene:not(.remedy-preview-scene) .remedy-leftovers'),caption=shelf.locator('.remedy-shelf-caption');
 const state=!r?'ready':r.stock?'stocked':r.made&&r.sold?'cleared':r.sold?'old-cleared':'idle';
 assert.equal(await shelf.getAttribute('data-state'),state);
 assert.equal(await shelf.locator(':scope>span').count(),Math.min(18,Math.ceil((r?.stock??0)/3)),'only actual stock creates pile glyphs');
 if(state==='stocked'){assert.equal(await caption.count(),0);return;}
 assert.equal(await caption.textContent(),{ready:'待开工',cleared:'卖完！','old-cleared':'旧货卖完',idle:r?.made?'货架空了':'没开工'}[state]);
 assert(inside(await caption.boundingBox(),await shelf.boundingBox()));
 for(const block of await f.locator('.remedy-scene:not(.remedy-preview-scene) .remedy-status,.remedy-scene:not(.remedy-preview-scene) .remedy-buyers').all())assert(overlap(await caption.boundingBox(),await block.boundingBox())<1,'shelf mark does not cover accounts or buyers');
 if(r)assert.equal(await shelf.getAttribute('aria-label'),'本期做'+r.made+'份、卖'+r.sold+'份，待售库存'+r.stock+'份。');
}
async function layout(f){
 const buttons=await f.locator('.gesture-zone').all(),box=await f.locator('.remedy-commands').boundingBox(),battle=await f.locator('.remedy-battle').boundingBox();assert.equal(buttons.length,2);
 for(const button of buttons){const b=await button.boundingBox(),art=await button.locator('.remedy-move-art').boundingBox(),name=await button.locator('.remedy-move-name').boundingBox(),hint=await button.locator('small').boundingBox();assert(b.height>=44);assert(inside(b,box));assert(inside(art,b));assert(inside(name,b));assert(inside(hint,b));assert(overlap(art,name)<1);assert(overlap(art,hint)<1);assert.equal(await button.locator('.remedy-move-art svg').count(),1);assert.equal(await button.locator('.remedy-move-art').getAttribute('aria-hidden'),'true');assert.equal(await button.getAttribute('title'),null,'no additional long hover tooltip');for(const phrase of await button.locator('.remedy-hint-part').all()){assert.equal(await phrase.evaluate(n=>getComputedStyle(n).whiteSpace),'nowrap');assert(inside(await phrase.boundingBox(),hint),'short phrases remain intact and inside their hint');}}
 assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));return {height:battle.height,fullWidth:box.width/battle.width};
}
try{
 for(const spec of [{width:320,keyboard:true},{width:390,offline:true,reduced:true},{width:1280}])for(const route of ['consumption','investment','exports']){
  const ctx=await browser.newContext({viewport:{width:spec.width,height:960},reducedMotion:spec.reduced?'reduce':'no-preference',hasTouch:spec.width<600});await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||spec.offline&&u===offline)return r.continue();external.push(u);return r.abort();});
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(spec.offline?offline:url);const f=await frame(p);await f.locator('#dots [data-stage="4"]').click();await f.locator('.remedy-card').first().waitFor();await settled(f);await f.locator('.remedy-card[data-route="'+route+'"]').click();await f.locator('.gesture-zone').first().waitFor();await settled(f);
  const [first,other]={consumption:['credit','raise'],investment:['expand','replace'],exports:['single','diverse']}[route],name={consumption:'收支安排',investment:'设备订单',exports:'海外订单'}[route];
  const opening=await layout(f);await shelfCheck(f,null);assert(opening.height<570);assert(opening.fullWidth>.95);assert.equal(await f.locator('.gesture-zone small').count(),2);assert.equal(await f.locator('[data-gesture-packet]').isVisible(),false);await p.screenshot({path:path.join(out,'moves-'+spec.width+'-'+route+'-opening.png'),fullPage:true});
  let before=JSON.stringify(await saved(p));if(spec.width===1280){await target(f,first).hover();assert.equal(JSON.stringify(await saved(p)),before);assert.equal(await target(f,first).locator('.remedy-move-motion').evaluate(n=>getComputedStyle(n).animationName),'remedy-move-ready');}
  // Touch/mouse deliberately hit the drawing, not the text; keyboard hits its parent button.
  await ready(f,first);await press(spec.keyboard?target(f,first):target(f,first).locator('.remedy-move-art'),spec);await changed(p,f,before);assert.equal((await saved(p)).remedyLabs[route].history.length,1);assert.equal((await saved(p)).remedyLabs[route].history[0].mode,first);
  for(const button of await f.locator('.gesture-zone').all())assert(await button.isEnabled(),'new host receipt unlocks both moves without waiting for the animation');
  assert.equal(await f.locator('.remedy-settings').getAttribute('aria-busy'),null);
  const cry=f.locator('.remedy-move-cue');assert.equal(await cry.count(),spec.reduced?0:1);
  if(!spec.reduced){
   assert.equal(await cry.textContent(),{credit:'先借钱！',expand:'扩建产线！',single:'押一个大客户！'}[first]);assert.equal(await cry.getAttribute('aria-hidden'),'true');
   assert.equal(await cry.evaluate(n=>getComputedStyle(n).animationName),'remedy-cry');
   // The producer steps forward. Read its rectangle and the child's rectangle
   // in one browser sample, not on different frames of the same animation.
   const geometry=await cry.evaluate(n=>{const rect=x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};return {cry:rect(n),producer:rect(n.closest('.remedy-producer')),statuses:[...document.querySelectorAll('.remedy-status')].map(rect),fits:n.scrollWidth<=n.clientWidth+1};});
   assert(inside(geometry.cry,geometry.producer),JSON.stringify(geometry));assert(geometry.fits,'battle cry fits even the narrowest phone');
   for(const status of geometry.statuses)assert(overlap(geometry.cry,status)<1,'cry stays out of the accounts');
   if(spec.width===320&&route==='consumption'||spec.width===1280&&route==='exports')await p.screenshot({path:path.join(out,'moves-'+spec.width+'-'+route+'-cast.png'),fullPage:true});
  }
  await layout(f);
  await f.waitForFunction(()=>!document.querySelector('.remedy-message')?.dataset.cashStep);
  if(!spec.reduced){await f.waitForFunction(()=>getComputedStyle(document.querySelector('.remedy-move-cue')).visibility==='hidden');assert.equal(await f.locator('.remedy-producer .remedy-scene-label').evaluate(n=>Number(getComputedStyle(n).opacity)),1,'producer label returns without a confirmation');}
  const firstReport=remedyAccounts((await saved(p)).remedyLabs[route]).display;await shelfCheck(f,firstReport);assert.equal(await f.locator('.remedy-leftovers').getAttribute('data-state'),'cleared');
  assert.equal(await f.locator('.remedy-shelf-caption').evaluate(n=>getComputedStyle(n).animationName),spec.reduced?'none':'remedy-clear-stamp');
  if(route==='consumption'){assert.equal(firstReport.debt,10,'clear stock does not erase the real bill');await f.waitForFunction(()=>{const n=document.querySelector('.remedy-bill');return n&&getComputedStyle(n).display!=='none'&&Number(getComputedStyle(n).opacity)>.99;});assert.match(await f.locator('.remedy-bill').textContent(),/下期还 12枚/);}if(route==='investment')assert.equal(firstReport.capacity,10,'clear stock does not cancel next-period capacity');
  const prompt=await f.locator('.remedy-message').textContent();if(route==='consumption')assert.match(prompt,/卖完了.*旧账12/);if(route==='investment')assert.match(prompt,/卖完了.*下回合开工.*多做10份/);
  await p.screenshot({path:path.join(out,'moves-'+spec.width+'-'+route+'-first-hit.png'),fullPage:true});
  await f.locator('.remedy-tools>summary').click();const packet=f.getByRole('button',{name:'拿起'+name,exact:true});assert.equal(await packet.isVisible(),true);await ready(f,other);before=JSON.stringify(await saved(p));await press(packet,spec);assert.equal(await packet.getAttribute('aria-pressed'),'true');assert.equal(JSON.stringify(await saved(p)),before);await packet.press('Escape');assert.equal(await packet.getAttribute('aria-pressed'),'false');assert.equal(JSON.stringify(await saved(p)),before);
  if(spec.width===1280){await packet.scrollIntoViewIfNeeded();const a=await packet.boundingBox(),b=await target(f,other).boundingBox();await p.mouse.move(a.x+a.width/2,a.y+a.height/2);await p.mouse.down();await p.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:14});await p.mouse.up();}
  else {await press(packet,spec);await press(target(f,other),spec);}
  await changed(p,f,before);assert.equal((await saved(p)).remedyLabs[route].history.length,2);assert.equal((await saved(p)).remedyLabs[route].history[1].mode,other);await layout(f);
  for(const mode of [first,other]){await ready(f,mode);before=JSON.stringify(await saved(p));await press(spec.keyboard?target(f,mode):target(f,mode).locator('.remedy-move-art'),spec);await changed(p,f,before);}
  let lab=(await saved(p)).remedyLabs[route];assert.equal(lab.history.length,3);assert.equal(lab.comparisons.length,1);assert(remedyAccounts(lab).canContinue);const next=f.getByRole('button',{name:'收下这张处方的教训 →',exact:true}),n=await next.boundingBox(),b=await f.locator('.remedy-battle').boundingBox();assert(n.x>b.x+b.width*.25,'continue stays on the right');await f.waitForFunction(()=>!document.querySelector('.remedy-message')?.dataset.cashStep);
  assert.equal(await f.locator('details.remedy-counter,.remedy-counter>summary,.remedy-links').count(),0,'no folded moves or duplicated exit after a response');await layout(f);for(const button of await f.locator('.gesture-zone').all())assert(await button.isVisible());assert.equal(await f.locator('.remedy-conditions').evaluate(n=>n.open),false);assert.equal(await f.getByTestId('remedy-comparison').isVisible(),false);assert.equal(await f.locator('.remedy-next').count(),1);const freeHeight=(await f.locator('.remedy-battle').boundingBox()).height;await p.screenshot({path:path.join(out,'moves-'+spec.width+'-'+route+'-counter.png'),fullPage:true});
  // A fifth optional move is immediately available, with no expand step. It is
  // another third-period trial, not a newly invented fourth operating day.
  before=JSON.stringify(await saved(p));await ready(f,first);await press(target(f,first),spec);await changed(p,f,before);lab=(await saved(p)).remedyLabs[route];assert.equal(lab.history.length,3);assert.equal(lab.comparisons.length,2);assert.equal(lab.comparisons.at(-1).mode,first);assert(remedyAccounts(lab).canContinue);await layout(f);
  before=JSON.stringify(await saved(p));await press(f.locator('.remedy-conditions>summary'),spec);assert.equal(JSON.stringify(await saved(p)),before);assert(await f.getByTestId('remedy-comparison').isVisible());await f.getByTestId('remedy-comparison').press('Enter');await f.locator('.remedy-preview-scene').waitFor();assert.equal(JSON.stringify(await saved(p)),before);await f.getByTestId('remedy-comparison').press('Escape');assert.equal(JSON.stringify(await saved(p)),before);await f.waitForFunction(()=>!document.querySelector('.remedy-preview-scene'));
  await press(f.locator('.remedy-conditions .remedy-operate button').nth(1),spec);await changed(p,f,before);lab=(await saved(p)).remedyLabs[route];assert.equal(lab.history.length,3);assert.equal(lab.comparisons.length,3);assert.equal(lab.comparisons.at(-1).outlook,'supported');assert.equal(await f.locator('.remedy-conditions').evaluate(n=>n.open),false);for(const button of await f.locator('.gesture-zone').all())assert(await button.isVisible());
  before=JSON.stringify(await saved(p));await p.reload();const reloaded=await frame(p);assert.equal(JSON.stringify(await saved(p)),before);await shelfCheck(reloaded,remedyAccounts((await saved(p)).remedyLabs[route]).display);assert.equal(await reloaded.locator('.remedy-scene').getAttribute('data-animate'),'false');assert.equal(await reloaded.locator('.remedy-move-cue').count(),0,'refresh does not replay a move');assert.equal(await reloaded.locator('.remedy-counter').evaluate(n=>n.tagName),'DIV');assert.equal(await reloaded.locator('.remedy-conditions').evaluate(n=>n.open),false);for(const button of await reloaded.locator('.gesture-zone').all())assert(await button.isVisible());
  const retry=reloaded.getByRole('button',{name:'从第一回合重打，保留这次账目',exact:true}),retryBox=await retry.boundingBox(),nextBox=await reloaded.locator('.remedy-next').boundingBox();
  assert(retryBox.height>=44);assert(nextBox.height>=44);assert.equal(overlap(retryBox,nextBox),0);assert(inside(retryBox,await reloaded.locator('.remedy-rematch').boundingBox()));assert(inside(nextBox,await reloaded.locator('.remedy-rematch').boundingBox()));assert(nextBox.x>retryBox.x);assert.equal(await reloaded.locator('.remedy-next').textContent(),'换张处方 →');
  await press(retry,spec);await changed(p,reloaded,before);const replay=(await saved(p)).remedyLabs[route];assert.equal(replay.history.length,0);assert.equal(replay.comparisons.length,0);assert.equal(replay.archives.length,1);assert.deepEqual(replay.archives[0],{history:lab.history,comparisons:lab.comparisons});assert.equal(await reloaded.locator('.remedy-scene').getAttribute('data-round'),'0');assert.match(await reloaded.locator('.remedy-message').textContent(),/换个开局/);assert.equal(await reloaded.locator('.remedy-next').count(),0);await layout(reloaded);
  // A different first move starts a funded new run; it does not silently retain
  // the old debt, installed capacity, completion gate, or a fictional fourth day.
  before=JSON.stringify(await saved(p));await ready(reloaded,other);await press(target(reloaded,other),spec);await changed(p,reloaded,before);const played=(await saved(p)).remedyLabs[route];assert.equal(played.history.length,1);assert.equal(played.history[0].mode,other);assert.deepEqual(played.archives[0],replay.archives[0]);assert.equal(remedyAccounts(played).canContinue,false);assert.equal(remedyAccounts(played).display.world.round,1);
  if(route==='consumption')assert.equal(remedyAccounts(played).display.debt,0);if(route==='investment')assert.equal(remedyAccounts(played).display.capacity,0);await reloaded.waitForFunction(()=>!document.querySelector('.remedy-message')?.dataset.cashStep);await p.screenshot({path:path.join(out,'moves-'+spec.width+'-'+route+'-rematch.png'),fullPage:true});
  before=JSON.stringify(await saved(p));await p.reload();await frame(p);assert.equal(JSON.stringify(await saved(p)),before);
  results.push({width:spec.width,route,reduced:!!spec.reduced,offline:!!spec.offline,keyboard:!!spec.keyboard,opening,freeHeight,shelfUsesActualProductionAndStock:true,clearancePreservesCarryover:true,refreshDoesNotRestamp:true,receiptUnlocksMoves:true,briefMoveCryFits:true,reducedMotionSkipsCry:true,refreshDoesNotReplayMove:true,artHitSettlesOnce:true,routeSpecificPiece:true,pickupAndCancelReadOnly:true,optionalPlacement:spec.keyboard?'keyboard':spec.width<600?'tap':'drag',fourRealMoves:true,immediateFifthMove:true,combinedToolsReadOnly:true,actualChangedCondition:true,singleExit:true,rightContinue:true,refresh:true,optionalRematchPreservesReceipts:true,differentOpeningResetsOnlyCurrentRun:true});await ctx.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html'))));const report={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,passed:true,results,errors,external};await fs.writeFile(path.join(out,'remedy-move-art-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(out,'moves-failure-'+p.viewportSize().width+'.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await browser.close();await new Promise(r=>server.close(r));}
