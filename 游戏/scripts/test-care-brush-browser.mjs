import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {careRoutingAccount} from '../lib/care-routing.ts';
import {careState,runCare,moveCare,trainCare,openCareWorkspace} from './care-routing-browser-gestures.mjs';
import {chooseCondition} from './assumption-browser-gestures.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile('build/index.html'),out='outputs/care-brush-qa';await fs.mkdir(out,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/`,offline=pathToFileURL(path.resolve('offline/技术红利去了哪里.html')).href;
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),results=[],errors=[],external=[];
const frame=async page=>{const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();return f;};
async function keypress(page,n){await n.focus();await page.keyboard.press('Enter');}
async function stroke(page,f,method,ids,ending='commit'){
 const points=[];
 await f.locator('.care-patients').scrollIntoViewIfNeeded();
 for(const id of ids){const box=await f.locator('.care-patient[data-person="'+id+'"] .care-patient-button').boundingBox();points.push({x:box.x+box.width/2,y:box.y+box.height/2});}
 const session=method==='touch'?await page.context().newCDPSession(page):null;
 const begin=points[0];
 if(session)await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[begin]});else{await page.mouse.move(begin.x,begin.y);await page.mouse.down();}
 for(const p of points.slice(1))if(session)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p]});else await page.mouse.move(p.x,p.y);
 if(ending==='escape')await page.keyboard.press('Escape');
 if(ending==='cancel'&&session)await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 else if(session)await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();
 await session?.detach();
}
try{for(const [width,method] of [[1280,'mouse'],[390,'touch'],[320,'keyboard']]){
 const context=await browser.newContext({viewport:{width,height:method==='touch'?844:method==='keyboard'?568:900},hasTouch:method==='touch',reducedMotion:method==='mouse'?'no-preference':'reduce'});
 await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||width===320&&u===offline)return r.continue();external.push(u);return r.abort();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(width===320?offline:url);let f=await frame(page);
 await f.locator('#chapter-toggle').click();await f.locator('[data-chapter="needs"]').click();await f.getByRole('button',{name:'回到假设目录 ↩',exact:true}).click();await chooseCondition(f,'needs');await f.locator('[data-branch="services"]').click();await f.getByRole('button',{name:'安排这一期 →',exact:true}).click();await f.locator('.care-routing').waitFor();
 assert.equal(await f.locator('.care-single-vouchers[open]').count(),0);assert.equal(await f.locator('.care-voucher:visible').count(),0);
 assert.equal(await f.locator('.care-equipment-drawer[open]').count(),0);assert.equal(await f.locator('.care-worker:visible').count(),0);
 const initialWorkbench=await f.locator('.care-routing').boundingBox();assert(initialWorkbench.height<1050,'queue and first useful action appear before engineering');
 assert.equal(await f.locator('.care-payment-brush:visible').count(),1);assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:`${out}/${width}-initial.png`,fullPage:true});
 const baseline=await runCare(page,f);assert.equal(careRoutingAccount(baseline.run).served,4);await openCareWorkspace(page,f);
 const arm=async()=>method==='keyboard'?keypress(page,f.locator('.care-payment-brush')):method==='touch'?f.locator('.care-payment-brush').tap():f.locator('.care-payment-brush').click();
 const selected=()=>f.locator('.care-patient[data-paint-selected]').count();
 // Tap/keyboard previews do not change the stored draft, result or queue.
 await arm();await keypress(page,f.locator('[data-person="4"] .care-patient-button'));assert.equal(await selected(),1);assert.deepEqual(await careState(page),baseline);
 await keypress(page,f.locator('[data-person="4"] .care-patient-button'));assert.equal(await selected(),0);
 await keypress(page,f.locator('[data-person="5"] .care-patient-button'));await page.keyboard.press('Escape');assert.equal(await selected(),0);assert.deepEqual(await careState(page),baseline);
 if(method!=='keyboard'){
  // Natural one-stroke pickup must not insert controls and move its destinations.
  await f.locator('.care-payment-brush').scrollIntoViewIfNeeded();
  const origin=await f.locator('.care-payment-brush').boundingBox(),before=await f.locator('[data-person="0"]').boundingBox(),start={x:origin.x+origin.width/2,y:origin.y+origin.height/2};
  const pickup=method==='touch'?await context.newCDPSession(page):null;
  if(pickup){await pickup.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});await pickup.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+12,y:start.y}]});}
  else{await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+12,start.y);}
  await f.locator('.care-payment-brush[aria-pressed="true"]').waitFor();
  const during=await f.locator('[data-person="0"]').boundingBox();assert(Math.abs(during.y-before.y)<1,'direct pickup must not shift the people');assert.equal(await f.locator('.care-brush-actions:visible').count(),0);
  await page.keyboard.press('Escape');if(pickup){await pickup.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pickup.detach();}else await page.mouse.up();
  assert.deepEqual(await careState(page),baseline);assert.equal(await f.locator('.care-payment-brush').getAttribute('aria-pressed'),'false','releasing after Escape must not pick up the cancelled brush again');
  await arm();await stroke(page,f,method,[4,7],method==='touch'?'cancel':'escape');
  assert.equal(await selected(),0);assert.deepEqual(await careState(page),baseline,'cancelled stroke must not commit');
 }
 // One fast stroke covers eight people; repeated passage never duplicates them.
 await arm();
 if(method==='keyboard'){
  for(const id of [4,5,6,7,8,9,10,11])await keypress(page,f.locator('[data-person="'+id+'"] .care-patient-button'));
  assert.equal(await selected(),8);assert.deepEqual(await careState(page),baseline);await keypress(page,f.getByRole('button',{name:'就帮这些人 →',exact:true}));
 }else{
  // Hold before releasing, so the authoritative saved draft can be checked.
  await f.locator('.care-patients').scrollIntoViewIfNeeded();const points=[];
  for(const id of [4,7,4,7,11,8]){const b=await f.locator('[data-person="'+id+'"] .care-patient-button').boundingBox();points.push({x:b.x+b.width/2,y:b.y+b.height/2});}
  const session=method==='touch'?await context.newCDPSession(page):null,p=points[0];
  if(session)await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});else{await page.mouse.move(p.x,p.y);await page.mouse.down();}
  for(const point of points.slice(1))if(session)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point]});else await page.mouse.move(point.x,point.y);
  // CDP acknowledges dispatch before every coalesced touchmove is rendered.
  // Wait for real visual feedback, without releasing or changing the draft.
  await f.waitForFunction(()=>document.querySelectorAll('.care-patient[data-paint-selected]').length===8);
  assert.equal(await selected(),8,'fast motion selects intermediate cells once');assert.deepEqual(await careState(page),baseline,'motion is not a payment or committed edit');
  await page.screenshot({path:`${out}/${width}-preview.png`,fullPage:true});
  if(session){await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}else await page.mouse.up();
 }
 await f.locator('.care-payment-brush').filter({hasText:'4份'}).waitFor();const covered=await careState(page);
 assert.equal(covered.revision,baseline.revision+1,'a group is one atomic draft edit');assert.deepEqual(covered.vouchers.filter(n=>n!==null).sort((a,b)=>a-b),[4,5,6,7,8,9,10,11]);assert.deepEqual(covered.run,baseline.run);assert.deepEqual(covered.queue,baseline.queue);assert.deepEqual(covered.trials,baseline.trials);
 assert.equal(careRoutingAccount(covered.run).publicFunds,24);assert.equal(await f.locator('.care-patient[data-paint-selected]').count(),0);
 await page.reload();f=await frame(page);await f.locator('.care-routing').waitFor();assert.deepEqual(await careState(page),covered);
 // Single-card return/replacement still works after the group operation.
 await moveCare(page,f,'voucher:0','funding',method);await moveCare(page,f,'voucher:0','person:4',method);
 await moveCare(page,f,'tool','socket',method);await trainCare(page,f,method);const done=await runCare(page,f),a=careRoutingAccount(done.run);
 assert.equal(a.served,12);assert.equal(a.publicFunds,8,'only the eight publicly covered services are paid');assert.equal(a.moneyAfter,68);assert.equal(a.people[4].cash,1);
 assert.equal(await f.locator('.care-adjustments[open]').count(),0);await page.screenshot({path:`${out}/${width}-served.png`,fullPage:true});
 // Finite resources: group selection can use all remaining slips, not create more.
 await openCareWorkspace(page,f);await arm();for(const id of [0,1,2,3])await keypress(page,f.locator('[data-person="'+id+'"] .care-patient-button'));
 assert.deepEqual(await careState(page),done);await keypress(page,f.getByRole('button',{name:'就帮这些人 →',exact:true}));await f.locator('.care-payment-brush:disabled').waitFor();
 const full=await careState(page);assert.equal(full.vouchers.length,12);assert.equal(new Set(full.vouchers).size,12);assert.deepEqual(full.run,done.run);
 assert.equal(await f.locator('.care-single-vouchers:visible').count(),0);assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 results.push({width,height:method==='touch'?844:method==='keyboard'?568:900,method,offline:width===320,queueFirst:true,initialHeight:initialWorkbench.height,previewOnly:true,cancel:true,atomicGroup:8,fastMotionDeduplicated:method!=='keyboard',directPickupDoesNotShiftPeople:method!=='keyboard',singleCardStillWorks:true,finiteVouchers:12,served:12,publicFunds:8,money:68,refresh:true});console.log(`Care brush ${width} ${method} passed`);await context.close();
}
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile('build/index.html'))&&bytes.equals(await fs.readFile('offline/技术红利去了哪里.html')));
 const report={checkedAt:new Date().toISOString(),buildSHA256:createHash('sha256').update(bytes).digest('hex'),results,errors,external};await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){for(const ctx of browser.contexts())for(const page of ctx.pages())await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}
