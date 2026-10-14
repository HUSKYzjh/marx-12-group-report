import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile('build/index.html'),out='outputs/battle-enclosures-qa';
assert(bytes.equals(await fs.readFile('offline/技术红利去了哪里.html')));await fs.mkdir(out,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port, browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],results=[];
// Test the actual concave SVG fill, not merely its rectangular bounding box.
const contourClearance=()=>{
 const failures=[];
 for(const zone of document.querySelectorAll('.shop-zone')){
  const path=zone.querySelector('.shop-outline path'),inverse=path.getScreenCTM().inverse();
  for(const n of zone.querySelectorAll('.status,.crew .street-person,.figures .owner,.figures .oven,.figures .bread-rack,.bubble')){
   if(!n.getClientRects().length)continue;
   const r=n.getBoundingClientRect(),pad=8;
   for(const x of [r.left-pad,(r.left+r.right)/2,r.right+pad])for(const y of [r.top-pad,(r.top+r.bottom)/2,r.bottom+pad]){
    if(!path.isPointInFill(new DOMPoint(x,y).matrixTransform(inverse)))failures.push({zone:zone.className,part:n.className,x,y});
   }
  }
 }
 return failures;
};
try{for(const width of (process.argv.includes('--narrow')?[320]:process.argv.includes('--mobile')?[390,320]:[1280,390,320])){
 const guideHeight=process.argv.includes('--short-screen')?568:1050;
 const context=await browser.newContext({viewport:{width,height:guideHeight},reducedMotion:'reduce',hasTouch:width===390}),page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
 await page.goto(url);const host=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await host.locator('body[data-ready="true"]').waitFor();await host.locator('#dots button[data-stage="2"]').click();
 const frame=await(await host.locator('#prologue-battle').elementHandle()).contentFrame();await frame.locator('[data-move="hold"]').waitFor();
 const press=async locator=>{if(width===390)await locator.tap();else if(width===320){await locator.focus();await page.keyboard.press('Enter');}else await locator.click();};
 await frame.locator('#opening-guide[open]').waitFor();
 assert((await frame.locator('#opening-guide').innerText()).includes('开门先花 11'));
 assert.equal(await frame.locator('#opening-guide .opening-moves p').count(),6);
 assert(!(await frame.locator('#opening-start').isVisible()),'start is only on the last page');
 assert(!(await frame.locator('#opening-close').isVisible()),'fresh game cannot skip instructions');
 const beforeGuide=await page.evaluate(()=>JSON.stringify(localStorage));
 await page.keyboard.press('Escape');assert(await frame.locator('#opening-guide').isVisible());
 const guideFits=async step=>{
  assert.equal(await frame.locator('[data-opening-page]:visible').count(),1,'only one short page at a time');
  assert.equal(await frame.locator('#opening-progress').innerText(),`${step+1} / 5`);
  const guideBounds=await frame.locator('#opening-guide').boundingBox();assert(guideBounds.width<=width,'guide fits narrow screen');
  assert(guideBounds.y>=-1&&guideBounds.y+guideBounds.height<=guideHeight+1,'whole guide is visible in the actual outer viewport');
  assert(await frame.locator('#opening-guide').evaluate(n=>n.scrollHeight<=n.clientHeight+1),'guide needs no inner scrolling');
  assert(await frame.locator(step===4?'#opening-start':'#opening-next').evaluate(n=>n.getBoundingClientRect().height>=44),'next button is touch-friendly');
  await page.screenshot({path:`${out}/${width}-opening-${step+1}.png`,fullPage:true});
 };
 await guideFits(0);await press(frame.locator('#opening-next'));await guideFits(1);
 assert((await frame.locator('#opening-guide').innerText()).includes('12 位顾客'));
 await press(frame.locator('#opening-back'));await guideFits(0);
 await press(frame.locator('#opening-next'));await press(frame.locator('#opening-next'));await guideFits(2);
 assert((await frame.locator('#opening-guide').innerText()).includes('不附送厨师'));
 assert(!(await frame.locator('#opening-start').isVisible()));
 await press(frame.locator('#opening-next'));await guideFits(3);
 assert((await frame.locator('#opening-guide').innerText()).includes('解聘'));
 await press(frame.locator('#opening-next'));await guideFits(4);
 assert((await frame.locator('#opening-guide').innerText()).includes('新炉到货，用工调整生效'));
 await page.keyboard.press('Escape');assert(await frame.locator('#opening-guide').isVisible());
 await press(frame.locator('#opening-start'));
 assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),beforeGuide,'reading the guide never starts a paid round');
 if(guideHeight!==1050)await page.setViewportSize({width,height:1050});
 const check=async phase=>{
  for(const f of [page,host,frame])assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no overflow '+width+' '+phase);
  assert.deepEqual(await frame.evaluate(contourClearance),[],'8px breathing room inside actual contour '+width+' '+phase);
  const layout=await frame.evaluate(()=>{
   const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
   return {shops:[...document.querySelectorAll('.shop-zone')].map(n=>({zone:rect(n),status:rect(n.querySelector('.status')),figures:rect(n.querySelector('.figures')),crew:rect(n.querySelector('.crew')),children:[...n.querySelectorAll('.crew .street-person,.figures .owner,.figures .oven')].map(rect)})),street:rect(document.querySelector('#customer-gate')),customers:[...document.querySelectorAll('.customer')].map(rect),console:rect(document.querySelector('#console')),signal:rect(document.querySelector('#market-signal')),moves:[...document.querySelectorAll('.move')].map(rect)};
  });
  const inside=(r,b)=>r.x>=b.x-1&&r.right<=b.right+1&&r.y>=b.y-1&&r.bottom<=b.bottom+1;
  for(const s of layout.shops){assert(inside(s.status,s.zone),'status in shop');assert(inside(s.figures,s.zone),'oven and owner in shop');for(const r of s.children)assert(inside(r,s.zone),'all crew fit');}
  const [rival,player]=layout.shops;assert(rival.zone.bottom<=layout.street.y+1);assert(layout.street.bottom<=player.zone.y+1);
  for(const c of layout.customers)assert(c.y>=rival.zone.bottom-1&&c.bottom<=player.zone.y+1,'customers between businesses');
  if(await frame.locator('#console').isVisible()){assert(inside(layout.signal,layout.console),'demand in lower console');assert(layout.console.y>=player.zone.bottom-1);}
  if(layout.moves.length>=7){assert(Math.abs(layout.moves[0].y-layout.moves[1].y)<1);assert(layout.moves[2].y>=layout.moves[0].bottom-1);for(const m of layout.moves)assert(m.width>=44&&m.height>=44);}
  await page.screenshot({path:`${out}/${width}-${phase}.png`,fullPage:true});return layout;
 };
 await check('opening');
 // Idle motion is visual only: it must not advance the clock or change saved accounts.
 await page.emulateMedia({reducedMotion:'no-preference'});
 const saved=await page.evaluate(()=>JSON.stringify(localStorage));
 const idleState=()=>[...document.querySelectorAll('.market-pedestrian')].map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y}));
 const before=await frame.evaluate(idleState);assert.equal(before.length,12);
 await page.waitForTimeout(650);
 const after=await frame.evaluate(idleState);assert(after.some((p,i)=>Math.abs(p.x-before[i].x)+Math.abs(p.y-before[i].y)>1));
 assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),saved,'idle never changes saved economy');
 assert(await frame.evaluate(()=>{const g=document.querySelector('.crowd-field').getBoundingClientRect(),street=document.querySelector('#customer-gate').getBoundingClientRect();return g.height>street.height+100&&[...document.querySelectorAll('.market-pedestrian')].every(n=>{const r=n.getBoundingClientRect();return r.left>=g.left&&r.right<=g.right&&r.top>=g.top&&r.bottom<=g.bottom;});}),'idle people use the expanded street field');
 const crowdClear=()=>[...document.querySelectorAll('.market-pedestrian')].every(n=>{
  const r=n.getBoundingClientRect();return [...document.querySelectorAll('.shop-outline path')].every(path=>{
   const inverse=path.getScreenCTM().inverse();return [r.left-6,(r.left+r.right)/2,r.right+6].every(x=>[r.top-6,(r.top+r.bottom)/2,r.bottom+6].every(y=>!path.isPointInFill(new DOMPoint(x,y).matrixTransform(inverse))));
  });
 });
 assert(await frame.evaluate(crowdClear),'walkers avoid both actual shop contours');
 await page.waitForTimeout(1800);assert(await frame.evaluate(crowdClear),'walkers still avoid the shops after taking longer routes');
 await page.screenshot({path:`${out}/${width}-idle.png`,fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});
 const still=await frame.evaluate(idleState);await page.waitForTimeout(200);assert.deepEqual(await frame.evaluate(idleState),still,'reduced motion shows static pedestrians');
 let walked=false;
 const play=async()=>{
  const watch=width===1280&&!walked;
  const dayBefore=await frame.locator('#turn').innerText();
  const mode=await frame.locator('body').getAttribute('data-mode'),waves=mode==='waves',market=['steady','waves'].includes(mode);
  const expected=waves?[12,20,20,6,12][Number(dayBefore)-1]:12;
  const previous=waves?[12,12,20,20,6][Number(dayBefore)-1]:12;
  if(market)assert.equal(await frame.locator('.market-pedestrian').count(),previous,'waiting crowd equals previous demand');
  const flow=width===1280&&waves&&expected!==previous;
  if(watch||flow)await page.emulateMedia({reducedMotion:'no-preference'});
  await press(frame.locator('[data-move="hold"]'));
  if(flow){
   await frame.locator(`#customer-gate[data-flow="${expected>previous?'entering':'leaving'}"]`).waitFor();
   assert.equal(await frame.locator(expected>previous?'[data-entering]':'[data-leaving]').count(),Math.abs(expected-previous));
   await page.screenshot({path:`${out}/${width}-flow-${dayBefore}.png`,fullPage:true});
  }
  assert.equal(await frame.locator('#confirm').count(),0,'one click executes the strategy');
  if(watch){
   await frame.locator('.fighter.lunge').waitFor();await page.waitForTimeout(160);
   assert.deepEqual(await frame.evaluate(contourClearance),[],'actual lunge stays inside its contour');
   await frame.locator('.traveller').first().waitFor();
   assert(await frame.locator('.market-pedestrian').first().evaluate(n=>getComputedStyle(n).opacity==='0'),'no duplicates while shopping');
   const origins=await frame.evaluate(()=>{const gate=document.querySelector('.crowd-field').getBoundingClientRect(),console=document.querySelector('#console').getBoundingClientRect();return {gate:{left:gate.left,right:gate.right,top:gate.top,bottom:gate.bottom},consoleTop:console.top,people:[...document.querySelectorAll('.traveller')].map(n=>({x:parseFloat(n.style.left),y:parseFloat(n.style.top)}))};});
   assert.equal(origins.people.length,12);for(const p of origins.people){assert(p.x>=origins.gate.left&&p.x<=origins.gate.right);assert(p.y>=origins.gate.top&&p.y<=origins.gate.bottom);assert(p.y<origins.consoleTop);}
   walked=true;
  }
  await frame.locator('#advance:not([hidden]),#next-scene:visible').first().waitFor();await frame.waitForFunction(()=>!document.querySelector('#restart').disabled);
  assert.equal(await frame.locator('#turn').innerText(),dayBefore,'one click completes only the displayed day');
  assert.equal(await frame.locator('.narration h1,.narration p,.narration button').count(),0,'left panel has no report or navigation');
  assert.equal(await frame.locator('.command-area #round-report:visible').count(),1,'single report on right');
  assert.equal(await frame.locator('.command-area #advance:visible').count(),1,'advance on right');
  await page.screenshot({path:`${out}/${width}-result.png`,fullPage:true});
  assert.equal(await frame.locator('.traveller').count(),0);
  if(market)assert.equal(await frame.locator('.market-pedestrian').count(),expected,'settled crowd equals actual demand, including unsatisfied visitors');
  if(watch||flow)await page.emulateMedia({reducedMotion:'reduce'});
 };
 for(let i=0;i<3;i++){
  await play();
  if(i===0){
   const beforeReview=await page.evaluate(()=>JSON.stringify(localStorage));
   await press(frame.locator('#opening-help'));assert.equal(await frame.locator('#opening-progress').innerText(),'1 / 5');
   assert(await frame.locator('#opening-close').isVisible());await press(frame.locator('#opening-next'));await press(frame.locator('#opening-close'));
   assert(!(await frame.locator('#opening-guide').isVisible()));
   await press(frame.locator('#opening-help'));await page.keyboard.press('Escape');assert(!(await frame.locator('#opening-guide').isVisible()));
   assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),beforeReview,'review never changes a settled round');
  }
  await press(frame.locator('#advance'));
 }await press(frame.locator('#next-scene'));
 for(let i=0;i<5;i++){await play();await press(frame.locator('#advance'));}await press(frame.locator('#next-scene'));await frame.locator('body[data-mode="source"]').waitFor();await check('customers');
 for(const id of await frame.locator('[data-trace]').evaluateAll(ns=>ns.map(n=>n.dataset.trace)))await press(frame.locator(`[data-trace="${id}"]`));
 await frame.locator('#money-route path.shopping').waitFor();await page.screenshot({path:`${out}/${width}-money-route.png`,fullPage:true});
 await press(frame.locator('#advance'));await frame.locator('body[data-mode="social"]').waitFor();await check('social');
 await play();await press(frame.locator('#advance'));await check('next-day');
 results.push({width,integrated:true,fourPageGuide:true,guideBackAndReview:true,guideNeverPays:true,twoEnclosures:true,centralCustomers:true,demandInConsole:true,equipmentCommands:true,allCrewFit:true,actualWageTrace:true,animatedGateVerified:walked});await context.close();
 }assert.deepEqual(errors,[]);assert(bytes.equals(await fs.readFile('build/index.html')));await fs.writeFile(out+'/report.json',JSON.stringify({buildSHA256:createHash('sha256').update(bytes).digest('hex'),results,errors},null,2));console.log(JSON.stringify({results,errors}));
}catch(e){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}
