import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {freightAccount} from '../lib/space-freight.ts';
import {freightExploration} from '../lib/freight-exploration.ts';
import {moveFreight,loadFreight,finishFreight,programFreight} from './space-freight-browser-gestures.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),{loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html')),server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,out=path.join(root,'outputs/space-freight-qa');await fs.mkdir(out,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).needsTechnology.freight,PROLOGUE_STORAGE_KEY);
async function actualOutcome(page,f){
 const s=await state(page),a=freightAccount(s),last=a.periods.at(-1);
 assert.equal(await f.locator('[data-testid="freight-settlement"]').getAttribute('data-actual-round'),String(last.round));
 assert.deepEqual(await f.locator('[data-delivered-crate]').evaluateAll(ns=>ns.map(n=>Number(n.dataset.deliveredCrate))),s.history.at(-1).shipped);
 assert((await f.locator('.freight-settlement').innerText()).includes('收到 '+last.receipts));
 if(s.stage!=='finished'){
  assert(await f.evaluate(()=>document.querySelector('.freight-settlement').compareDocumentPosition(document.querySelector('.freight-documents'))&Node.DOCUMENT_POSITION_FOLLOWING));return;
 }
 assert.equal(await f.locator('.freight-ship,.freight-hold,.freight-program,.freight-documents').count(),0,'no completed empty editor above actual outcome');
 const probe=freightExploration(s),clean=text=>text.replace(/枚|\s/g,'');assert.equal(clean(await f.locator('[data-testid="freight-challenge"]').innerText()),clean(probe.prompt));
 if(probe.comparison)assert.equal(clean(await f.locator('.freight-probe-comparison').innerText()),clean(probe.comparison));else assert.equal(await f.locator('.freight-probe-comparison').count(),0);
 assert.equal(await f.locator('[data-probe-focus="true"]').count(),probe.focusKind?1:0);
 assert.equal(await f.locator('[data-built-resident]').count(),a.habitats);
 assert.equal(await f.locator('[data-preview-part]').count(),0,'completed outcome is not projected goods');
 assert.deepEqual((await f.locator('[data-stored-crate]').evaluateAll(ns=>ns.map(n=>Number(n.dataset.storedCrate)))).sort((x,y)=>x-y),a.available.slice().sort((x,y)=>x-y));
 assert.equal(await f.locator('.freight-production-log').getAttribute('open'),null);
 assert.equal(await f.locator('[data-logged-round]').count(),3);
 const before=await state(page);await f.locator('.freight-production-log summary').click();assert.deepEqual(await state(page),before,'viewing executed production never pays');await f.locator('.freight-production-log summary').click();
 if(a.stock){await f.locator('[data-stored-crate]').first().click();assert.deepEqual(await state(page),before,'inspecting inventory does not sell it');assert((await f.locator('.freight-stock-inspection').innerText()).includes('仍归工厂'));}
 assert(await f.locator('[data-stored-crate]').evaluateAll(ns=>ns.every(n=>{const b=n.getBoundingClientRect();return b.width>=44&&b.height>=44;})));
 assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
}
async function frame(page){const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();return f;}
async function rejectNeed(page,f,id,to,method){
 const before=await state(page),from=f.locator('[data-freight-piece="'+id+'"]'),target=f.locator('[data-freight-target="'+to+'"] > button');
 await from.scrollIntoViewIfNeeded();await target.scrollIntoViewIfNeeded();
 const a=await from.boundingBox(),b=await target.boundingBox(),x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
 if(method==='keyboard'){await from.focus();await page.keyboard.press('Enter');const after=await target.boundingBox();assert.equal(after.y,b.y,'pickup instructions do not move the need');await target.focus();await page.keyboard.press('Enter');}
 else{
  assert(y>=0&&y<page.viewportSize().height&&ty>=0&&ty<page.viewportSize().height,'both physical drag endpoints must be in view');
  const cdp=method==='touch'?await page.context().newCDPSession(page):null;
  if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:(x+tx)/2,y:(y+ty)/2}]});}
  else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move((x+tx)/2,(y+ty)/2,{steps:5});}
  assert.equal(await f.locator('.piece-ghost').count(),1);assert.equal(await f.locator('.piece-ghost [data-freight-piece],.piece-ghost[data-freight-piece]').count(),0,'drag ghost is not another owned part');assert.deepEqual(await state(page),before,'motion does not change cargo or money');
  assert.equal((await target.boundingBox()).y,b.y,'dragging instructions do not move the need');
  if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx,y:ty}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  else{await page.mouse.move(tx,ty,{steps:6});await page.mouse.up();}
 }
 assert.deepEqual(await state(page),before);assert.equal(await f.locator('.piece-ghost').count(),0);
 const text=await f.locator('.freight-hint').innerText();await page.keyboard.press('Escape');return text;
}
try{for(const width of [1280,390,320]){
 const height=width===1280?900:width===390?844:568;
 const method=width===1280?'mouse':width===390?'touch':'keyboard',context=await browser.newContext({viewport:{width,height},hasTouch:width===390,reducedMotion:width===1280?'no-preference':'reduce'});await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||width===320&&u===offline)return r.continue();external.push(u);return r.abort();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(width===320?offline:url);let f=await frame(page);
 await f.locator('#chapter-toggle').click();await f.locator('[data-chapter="needs"]').click();await f.getByRole('button',{name:'准备第一批材料 →',exact:true}).click();await f.locator('.space-freight').waitFor();
 assert.equal(await f.locator('[data-needs-mode]').count(),0);assert.equal(await f.locator('.freight-hold').count(),6);await page.screenshot({path:path.join(out,width+'-planning.png'),fullPage:true});
 const start=await state(page);assert.equal(start.construction,true);const initialAccount=freightAccount(start);await moveFreight(page,f,'blueprint:air','machine:0',method);assert.equal((await state(page)).plan[0],'air');assert.deepEqual(freightAccount(await state(page)),initialAccount);await moveFreight(page,f,'blueprint:power','machine:0',method);assert.deepEqual(await state(page),start);
 await f.getByRole('button',{name:'开工 →',exact:true}).click();await f.locator('.space-freight[data-stage="loading"]').waitFor();const paid=await state(page),paidAccount=freightAccount(paid,paid.pending);assert.equal(paidAccount.firm,42);assert.equal(paidAccount.buyer,96);assert.equal(paidAccount.stock,6);
 assert.equal(await f.locator('[data-freight-target^="site:"]').count(),3);assert.equal(await f.locator('details.freight-ship').getAttribute('open'),null);
 assert(await f.locator('.freight-need-button').evaluateAll(ns=>ns.every(n=>{const b=n.getBoundingClientRect();return b.width>=44&&b.height>=44;})));
 assert.equal(await rejectNeed(page,f,'crate:0','site:air',method),'能源件不能代替供气件。');await page.screenshot({path:path.join(out,width+'-needs-loading.png'),fullPage:true});
 assert(await f.locator('.freight-crate').evaluateAll(nodes=>nodes.every(n=>{const b=n.getBoundingClientRect();return b.width>=44&&b.height>=44;})));
 if(width===1280){const from=f.locator('[data-freight-piece="crate:0"]');const b=await from.boundingBox(),target=await f.locator('.freight-orderbook').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:10});await page.mouse.up();assert.deepEqual(await state(page),paid);assert.equal(await f.locator('.piece-ghost').count(),0);await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+25,b.y+b.height/2+20,{steps:5});await page.keyboard.press('Escape');await page.mouse.up();assert.deepEqual(await state(page),paid);}
 await moveFreight(page,f,'crate:0','site:power',method);assert.deepEqual(freightAccount(await state(page),(await state(page)).pending),paidAccount);assert.equal(await f.locator('details.freight-ship').getAttribute('open'),null);
 assert.equal(await f.locator('[data-preview-part="power"]').count(),1);assert.equal(await f.locator('.freight-preview').getAttribute('data-extra-homes'),'0');
 await moveFreight(page,f,'crate:0','store',method);assert.deepEqual(await state(page),paid);assert.equal(await f.locator('[data-preview-part]').count(),0);
 await loadFreight(page,f,method);const loaded=await state(page);assert.equal(loaded.cargo.filter(n=>n!==null).length,4);assert.equal(freightAccount(loaded,loaded.pending).buyer,96);await page.screenshot({path:path.join(out,width+'-loaded.png'),fullPage:true});
 assert.equal(await rejectNeed(page,f,'crate:4','site:air',method),'这船已经装够了。');assert.equal(await f.locator('details.freight-ship').getAttribute('open'),null);
 assert.equal(await f.locator('.freight-preview').getAttribute('data-extra-homes'),'1');assert.equal(freightAccount(loaded,loaded.pending).habitats,0);
 await moveFreight(page,f,'crate:2','store',method);assert.equal(await f.locator('.freight-preview').getAttribute('data-extra-homes'),'0');
 await moveFreight(page,f,'crate:2','hold:2',method);assert.equal(await f.locator('.freight-preview').getAttribute('data-extra-homes'),'1');assert.deepEqual(await state(page),loaded);
 assert((await f.locator('.freight-factory > button').innerText()).includes('仓库 · 2组'));
 await page.reload();f=await frame(page);await f.locator('.space-freight').waitFor();assert.deepEqual(await state(page),loaded);
 await f.getByRole('button',{name:'发船 →',exact:true}).click();await f.locator('.space-freight[data-round="1"]').waitFor();assert.equal(freightAccount(await state(page)).buyer,80);
 assert.equal(await f.locator('[data-preview-part]').count(),0);assert.equal(freightAccount(await state(page)).habitats,1);await actualOutcome(page,f);
 for(let r=1;r<3;r++){await f.getByRole('button',{name:'开工 →',exact:true}).click();await f.locator('.space-freight[data-stage="loading"]').waitFor();assert.equal((await state(page)).cargo.filter(n=>n!==null).length,0);if(r===1)assert.equal(await rejectNeed(page,f,'crate:4','site:air',method),'基地有需要，但这单的付款用完了。');await f.getByRole('button',{name:'结束这一期 →',exact:true}).click();await f.locator('.space-freight[data-round="'+(r+1)+'"]').waitFor();}
 assert.equal(freightAccount(await state(page)).stock,14);assert.equal(await f.getByRole('button',{name:'订单会一直来吗？ →',exact:true}).count(),0);
 assert.equal(freightAccount(await state(page)).habitats,1);await actualOutcome(page,f);await page.screenshot({path:path.join(out,width+'-limited-order.png'),fullPage:true});
 await f.getByRole('button',{name:'换个条件再试 ↺',exact:true}).click();await moveFreight(page,f,'contract:12','book',method);await programFreight(page,f,Array(6).fill('power'),method);await finishFreight(page,f,false,method);const mismatched=freightAccount(await state(page));assert.equal(mismatched.authorization,32);assert.equal(mismatched.habitats,0);assert.equal(mismatched.sold,4);assert.equal(mismatched.stock,14);await actualOutcome(page,f);assert((await f.locator('.freight-stock-inspection').innerText()).includes('不再需要这种货'));await page.screenshot({path:path.join(out,width+'-wrong-goods.png'),fullPage:true});
 await f.getByRole('button',{name:'换个条件再试 ↺',exact:true}).click();await finishFreight(page,f,false,method);assert.equal(freightAccount(await state(page)).stock,6);assert.equal(freightAccount(await state(page)).habitats,4);assert.equal((await state(page)).trials.length,3);
 await f.getByRole('button',{name:'换个条件再试 ↺',exact:true}).click();await f.locator('.space-freight[data-stage="planning"][data-round="0"]').waitFor();assert.equal(await f.locator('[data-testid="freight-challenge"],.freight-probe-comparison').count(),0);await finishFreight(page,f,true,method);const renewed=await state(page),a=freightAccount(renewed);assert.equal(a.stock,0);assert.equal(a.sold,18);assert.equal(a.moneyAfter,156);assert.equal(renewed.trials.length,4);assert.equal(await f.locator('.space-freight > .freight-period').innerText(),'三期结束');assert.match(freightExploration(renewed).comparison,/收款多24枚.*工资.*不变/);await actualOutcome(page,f);await page.screenshot({path:path.join(out,width+'-finished.png'),fullPage:true});assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.reload();f=await frame(page);await f.locator('[data-testid="freight-outcome"]').waitFor();assert.deepEqual(await state(page),renewed);await actualOutcome(page,f);
 await f.getByRole('button',{name:'换个条件再试 ↺',exact:true}).click();await moveFreight(page,f,'contract:4','book',method);
 for(let r=0;r<3;r++){await programFreight(page,f,r===0?['power','air','structure','power']:[],method);assert.equal(await f.locator('[data-testid="freight-challenge"],.freight-probe-comparison').count(),0);await f.getByRole('button',{name:r===0?'开工 →':'这期不开工 →',exact:true}).click();await f.locator('.space-freight[data-stage="loading"]').waitFor();if(r===0){await loadFreight(page,f,method);await f.getByRole('button',{name:'发船 →',exact:true}).click();}else{assert.equal(await f.locator('.space-freight').getAttribute('data-producing'),null);await f.getByRole('button',{name:'结束这一期 →',exact:true}).click();}await f.locator('.space-freight[data-round="'+(r+1)+'"]').waitFor();}
 const paced=freightAccount(await state(page));assert.equal(paced.stock,0);assert.equal(paced.sold,4);assert.equal(paced.need,8);assert.equal(paced.firm,64);assert.equal(paced.workers,8);assert.match(freightExploration(await state(page)).comparison,/同样各期交货.*少14组.*少28枚/);await actualOutcome(page,f);await page.screenshot({path:path.join(out,width+'-paced.png'),fullPage:true});
 const conclude=f.getByRole('button',{name:'订单会一直来吗？ →',exact:true});assert(await conclude.evaluate(b=>{const r=document.createRange();r.selectNodeContents(b);const t=r.getBoundingClientRect(),box=b.getBoundingClientRect();return t.top>=box.top&&t.bottom<=box.bottom&&t.left>=box.left&&t.right<=box.right;}));await conclude.click();await f.locator('.needs-conclusion').waitFor();assert.equal(await f.locator('[data-testid="needs-report"]').count(),1);await page.reload();f=await frame(page);assert.equal((await state(page)).phase,'conclusion');
 results.push({width,height,method,offline:width===320,trials:5,stocks:[14,6,0],unwantedStock:mismatched.stock,unwantedGoodsBuyerHasFunds:mismatched.authorization,unwantedGoodsHabitable:0,pacedStock:0,pacedUnmetNeed:8,money:156,actualCrates:true,blueprintsDoNotSpend:true,refresh:true,actualOutcomeFirst:true,noEmptyFinishedEditor:true,executedLogViewOnly:true,inventoryInspectionDoesNotSell:true,actualOutcomeChallenges:true,matchedMaintenanceComparison:true,matchedDeliveryWageTradeoff:true,draftsHaveNoNewResult:true,typedNeedLoading:true,collapsedCargoInspection:true,mismatchAndFundsRejectionDoNotCommit:true,needTargetsStableDuringPickup:true,actualPointerGhostNotGoods:method!=='keyboard'});console.log('space freight '+width+' passed');await context.close();
}assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html'))));assert(bytes.equals(await fs.readFile(path.join(root,'offline/技术红利去了哪里.html'))));const report={checkedAt:new Date().toISOString(),buildSHA256:createHash('sha256').update(bytes).digest('hex'),results,errors,external};await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
catch(e){for(const c of browser.contexts())for(const p of c.pages()){await p.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});console.error(await state(p).catch(()=>null));}throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}
