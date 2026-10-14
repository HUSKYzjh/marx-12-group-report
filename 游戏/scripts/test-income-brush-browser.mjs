/** Fresh menu entry; group preview never edits the ledger. No model injection. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {publicDemandAccount} from '../lib/public-demand.ts';
import {demandState,moveDemand,demandButton,arrangeIncomeGroup,fundDemand,endDemandDay} from './public-demand-browser-gestures.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile('build/index.html'),out='outputs/income-brush-qa';await fs.mkdir(out,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/`,offline=pathToFileURL(path.resolve('offline/技术红利去了哪里.html')).href;
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),results=[],errors=[],external=[];
const frame=async page=>{const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();return f;};
const people=[0,1,2,3,4,5];
const cash=s=>{const a=publicDemandAccount(s);return {wallets:a.wallets,firm:a.firm,publicFund:a.publicFund,lender:a.lender,employer:a.employer,supplier:a.supplier,total:a.moneyAfter,periods:a.periods,transfers:a.transfers};};
async function keypress(page,n){await n.focus();await page.keyboard.press('Enter');}
async function pointerStroke(page,f,method,ids,ending,preview,direct=false){
 await f.locator('.demand-people').scrollIntoViewIfNeeded();const points=[];
 for(const id of ids){const b=await f.locator('[data-income-person="'+id+'"]').boundingBox();points.push({x:b.x+b.width/2,y:b.y+b.height/2});}
 if(direct){const b=await f.locator('[data-income-brush]').boundingBox();points.unshift({x:b.x+b.width/2,y:b.y+b.height/2});const view=page.viewportSize();assert(points.every(p=>p.x>=0&&p.x<view.width&&p.y>=0&&p.y<view.height),'money and every recipient can be reached without scrolling during a stroke');}
 const session=method==='touch'?await page.context().newCDPSession(page):null,p=points[0];
 if(session)await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});else{await page.mouse.move(p.x,p.y);await page.mouse.down();}
 for(const point of points.slice(1))if(session)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point]});else await page.mouse.move(point.x,point.y);
 if(preview)await preview();
 if(ending==='escape')await page.keyboard.press('Escape');
 if(session){await session.send('Input.dispatchTouchEvent',{type:ending==='cancel'?'touchCancel':'touchEnd',touchPoints:[]});await session.detach();}else await page.mouse.up();
}
try{for(const [width,method] of [[1280,'mouse'],[390,'touch'],[320,'keyboard']]){
 const height=method==='touch'?844:method==='keyboard'?568:900,context=await browser.newContext({viewport:{width,height},hasTouch:method==='touch',reducedMotion:method==='mouse'?'no-preference':'reduce'});
 await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||width===320&&u===offline)return r.continue();external.push(u);return r.abort();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(width===320?offline:url);let f=await frame(page);
 await f.locator('#chapter-toggle').click();await f.locator('[data-chapter="rules"]').click();await f.getByRole('button',{name:'开门试试 →',exact:true}).click();await f.locator('.public-demand').waitFor();
 const baseline=await demandState(page),opening=cash(baseline),arm=async()=>method==='keyboard'?keypress(page,f.locator('[data-income-brush]')):method==='touch'?f.locator('[data-income-brush]').tap():f.locator('[data-income-brush]').click();
 const selected=()=>f.locator('[data-income-person][data-paint-selected]').count();
 assert.equal(await f.locator('.demand-income-singles').getAttribute('open'),null);assert.equal(await f.locator('.income-pocket:visible').count(),0);assert.equal(await f.locator('[data-income-person]').count(),6);
 assert.equal(await f.locator('.demand-income-need').getAttribute('data-price'),'2');assert.equal(await f.locator('.demand-income-need').getAttribute('data-need'),'2');assert.equal(await f.locator('.demand-income-need img').evaluate(n=>n.complete&&n.naturalWidth>0),true);
 assert(await f.locator('[data-income-person]').evaluateAll(ns=>ns.every(n=>n.tagName==='BUTTON'&&n.getBoundingClientRect().width>=44&&n.getBoundingClientRect().height>=44)));
 assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`${out}/${width}-initial.png`,fullPage:true});
 await f.locator('[data-income-day="2"]').click();assert.deepEqual(await demandState(page),baseline);await f.locator('[data-income-day="1"]').click();
 for(let round=0;round<3;round++){
  await arm();await keypress(page,f.locator('[data-income-person="0"]'));assert.equal(await selected(),1);assert.deepEqual(await demandState(page),baseline);
  if(round===0)await keypress(page,f.getByRole('button',{name:'放回去 ↩',exact:true}));
  else if(round===1)await page.keyboard.press('Escape');
  else{await f.locator('[data-income-day="2"]').click();assert.equal(await f.locator('[data-income-brush]').getAttribute('aria-pressed'),'false');await f.locator('[data-income-day="1"]').click();}
  assert.equal(await selected(),0);assert.deepEqual(await demandState(page),baseline);
 }
 if(method!=='keyboard'){
  await f.locator('[data-income-brush]').scrollIntoViewIfNeeded();const b=await f.locator('[data-income-brush]').boundingBox(),old=await f.locator('[data-income-person="0"]').boundingBox(),p={x:b.x+b.width/2,y:b.y+b.height/2},session=method==='touch'?await context.newCDPSession(page):null;
  if(session){await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+12,y:p.y}]});}else{await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+12,p.y);}
  await f.locator('[data-income-brush][aria-pressed="true"]').waitFor();const moved=await f.locator('[data-income-person="0"]').boundingBox();assert(Math.abs(moved.y-old.y)<1,'natural pickup does not move the people');assert.equal(await f.locator('.demand-income-brush-actions:visible').count(),0);
  await page.keyboard.press('Escape');if(session){await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}else await page.mouse.up();assert.deepEqual(await demandState(page),baseline);assert.equal(await f.locator('[data-income-brush]').getAttribute('aria-pressed'),'false','releasing after Escape must not pick the stack up again');
  await arm();await pointerStroke(page,f,method,[0,2],method==='touch'?'cancel':'escape');assert.equal(await selected(),0);assert.deepEqual(await demandState(page),baseline);
 }
 // A fast pass selects intermediate people once; passing back does not double-pay.
 if(method==='keyboard'){
  await arm();
  for(const id of people)await keypress(page,f.locator('[data-income-person="'+id+'"]'));assert.equal(await selected(),6);assert.deepEqual(await demandState(page),baseline);await keypress(page,f.getByRole('button',{name:'就给这些人安排 →',exact:true}));
 }else await pointerStroke(page,f,method,width===1280?[0,5,0,5]:[0,2,0,2,5,3,5],'commit',async()=>{
  await f.waitForFunction(()=>document.querySelectorAll('[data-income-person][data-paint-selected]').length===6);assert.deepEqual(await demandState(page),baseline);assert.equal(await f.locator('.demand-income-brush-actions:visible').count(),0);await page.screenshot({path:`${out}/${width}-preview.png`,fullPage:true});
 },true);
 await f.locator('[data-income-brush]').filter({hasText:'6份'}).waitFor();const first=await demandState(page);assert.equal(first.revision,baseline.revision+1);assert.deepEqual(first.income.slice(0,6).map(x=>x.person).sort(),people);assert(first.income.slice(0,6).every(x=>x.day===1));assert.deepEqual(cash(first),opening);
 assert.equal(await f.locator('.demand-income-singles').getAttribute('open'),null);assert.equal(await f.locator('[data-income-pending-day="1"][data-amount="2"]').count(),6);
 await page.reload();f=await frame(page);assert.deepEqual(await demandState(page),first);assert.equal(await f.locator('.demand-income-singles').getAttribute('open'),null);
 // Reopening a folded single-card editor restores cancellability on the same DOM.
 for(let round=0;round<3;round++){
  await f.locator('.demand-income-singles > summary').click();await keypress(page,f.locator('[data-demand-piece="income:6"]'));assert.equal(await f.locator('[data-demand-piece="income:6"]').getAttribute('aria-pressed'),'true');
  await f.locator('.demand-income-singles > summary').click();await f.waitForFunction(()=>!document.querySelector('.demand-income-singles').open&&document.querySelector('[data-demand-piece="income:6"]').getAttribute('aria-pressed')==='false');assert.deepEqual(await demandState(page),first);
 }
 await moveDemand(page,f,'income:0','employer',method);await moveDemand(page,f,'income:0','income:'+first.income[0].person+':1',method);await f.locator('.demand-income-singles > summary').click();
 const restored=await demandState(page);assert.deepEqual(restored.income,first.income);assert.deepEqual(cash(restored),opening);
 await arrangeIncomeGroup(page,f,people,2,method);const both=await demandState(page);assert.equal(both.income.filter(Boolean).length,12);assert.equal(await f.locator('[data-income-brush]:disabled').count(),1);assert.equal(await f.locator('[data-income-pending-day="2"][data-amount="2"]').count(),6);assert.deepEqual(cash(both),opening);
 await fundDemand(page,f);let a=publicDemandAccount(await demandState(page));assert.equal(a.publicFund,20);assert.equal(a.periods[0].sold,12);assert(a.transfers.filter(t=>t.kind==='private-sale').every(t=>t.amount===2),'visible price matches every actual sale');await endDemandDay(page,f);
 const dayTwo=await demandState(page);assert.equal(await f.locator('[data-income-day="1"]').count(),0);const paid=dayTwo.incomePaid.filter(Boolean);assert.equal(paid.length,6);
 await fundDemand(page,f);const finished=await endDemandDay(page,f);a=publicDemandAccount(finished);assert.deepEqual(a.periods.map(p=>p.sold),[12,12]);assert.equal(a.publicFund,8);assert.equal(a.moneyAfter,148);assert.equal(a.employer,24);await page.screenshot({path:`${out}/${width}-income-result.png`,fullPage:true});
 await page.reload();f=await frame(page);assert.deepEqual(await demandState(page),finished);
 // Repeating a group on the same date uses the remaining rolls, then respects the daily cap.
 await demandButton(page,f,'回到同一起点，换个安排 ↺');await arrangeIncomeGroup(page,f,people,1,method);await arrangeIncomeGroup(page,f,people,1,method);const double=await demandState(page);assert.equal(double.income.length,12);assert.equal(await f.locator('[data-income-pending-day="1"][data-amount="4"]').count(),6);assert.equal(await f.locator('[data-income-brush]:disabled').count(),1);assert.equal(publicDemandAccount(double).publicFund,32);
 await moveDemand(page,f,'machine','bakery-asset',method);const tooMuch=await demandState(page);assert.equal(publicDemandAccount(tooMuch).plannedCost,36);assert(await f.getByRole('button',{name:'签好，去买今天的面包 →',exact:true}).isDisabled());assert.equal(publicDemandAccount(tooMuch).publicFund,32);assert.equal(publicDemandAccount(tooMuch).machine,false);await page.screenshot({path:`${out}/${width}-budget-short.png`,fullPage:true});
 await page.reload();f=await frame(page);assert.deepEqual(await demandState(page),tooMuch);assert(await f.getByRole('button',{name:'签好，去买今天的面包 →',exact:true}).isDisabled());
 assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));results.push({width,height,method,offline:width===320,previewOnly:true,cancel:true,dateChangeCancels:true,atomicGroup:6,fastMotionDeduplicated:method!=='keyboard',directPickupDoesNotShiftPeople:method!=='keyboard',oneStrokeFromSource:method!=='keyboard',singleCardStillWorks:true,reopenCancelCycles:3,finiteRolls:12,dailyCap:4,sharedBudget:true,actualSales:[12,12],publicFunds:8,money:148,refresh:true,stateInjection:false});console.log(`Income brush ${width} ${method} passed`);await context.close();
}
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile('build/index.html'))&&bytes.equals(await fs.readFile('offline/技术红利去了哪里.html')));
 const report={checkedAt:new Date().toISOString(),buildSHA256:createHash('sha256').update(bytes).digest('hex'),results,errors,external};await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){for(const ctx of browser.contexts())for(const page of ctx.pages())await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}
