import {chooseCondition} from './assumption-browser-gestures.mjs';
/** Fresh branch entry and genuine mouse, CDP touch and keyboard manipulation. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {careRoutingAccount} from '../lib/care-routing.ts';
import {careState,moveCare,runCare,coverCare,trainCare,openCareWorkspace,openCareEquipment} from './care-routing-browser-gestures.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),{loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html')),server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,out=path.join(root,'outputs/care-routing-qa');await fs.mkdir(out,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
async function frame(page){const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();return f;}
try{for(const width of [1280,390,320]){
 const method=width===1280?'mouse':width===390?'touch':'keyboard',context=await browser.newContext({viewport:{width,height:1150},hasTouch:width===390,reducedMotion:width===1280?'no-preference':'reduce'});await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||width===320&&u===offline)return r.continue();external.push(u);return r.abort();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(width===320?offline:url);let f=await frame(page);
 await f.locator('#chapter-toggle').click();await f.locator('[data-chapter="needs"]').click();await f.getByRole('button',{name:'回到假设目录 ↩',exact:true}).click();await chooseCondition(f,'needs');await f.locator('[data-branch="services"]').click();await f.getByRole('button',{name:'安排这一期 →',exact:true}).click();await f.locator('.care-routing').waitFor();
 assert.equal(await f.locator('[data-needs-mode]').count(),0);assert.equal(await f.locator('.care-patient').count(),12);assert.equal(await f.locator('.care-worker').count(),4);assert.equal(await f.locator('.care-voucher').count(),12);
 assert.equal(await f.locator('.care-equipment-drawer[open]').count(),0,'first attempt is not a wall of engineering objects');
 assert.equal(await f.locator('.care-worker:visible').count(),0);assert((await f.locator('.care-hint').innerText()).includes('小5'));
 assert.equal(await f.locator('[data-person="4"]').getAttribute('data-focus-person'),'true');
 const initialBox=await f.locator('.care-routing').boundingBox();assert(initialBox.height<1050,'queue-first initial workbench fits a short phone page');
 const initialState=await careState(page);await openCareEquipment(page,f);assert.deepEqual(await careState(page),initialState,'all tools remain available before the first run');
 await f.locator('.care-equipment-drawer > summary').click();assert.deepEqual(await careState(page),initialState);
 assert(await f.locator('[data-care-piece]').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).every(n=>{const b=n.getBoundingClientRect();return b.width>=44&&b.height>=44;})));assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,width+'-draft.png'),fullPage:true});
 let baseline=await runCare(page,f);assert.equal(careRoutingAccount(baseline.run).served,4);assert.equal(careRoutingAccount(baseline.run).publicFunds,24);
 assert.equal(await f.locator('.care-adjustments[open]').count(),0);
 assert.equal(await f.locator('.care-observer:visible').count(),12);assert(!(await f.locator('.care-worker').first().isVisible()));
 const resultBox=await f.getByTestId('care-routing-result').boundingBox(),workspaceBox=await f.locator('.care-adjustments').boundingBox();assert(resultBox.y+resultBox.height<=workspaceBox.y,'results precede the folded workbench');
 assert(resultBox.height<=600,'result fits one classroom screen, not two screens of setup');
 await f.locator('[data-care-result-person="4"]').click();assert((await f.locator('.care-result-inspection').innerText()).includes('付不起'));assert.deepEqual(await careState(page),baseline);
 await openCareWorkspace(page,f);await f.locator('.care-result-review:not([open])').waitFor();
 assert.equal(await f.locator('.care-observer:visible').count(),0,'editing shows one primary set of twelve, not a duplicate result queue');assert.equal(await f.locator('.care-patient:visible').count(),12);
 assert((await f.locator('.care-queue-title').innerText()).includes('下一次安排'));assert((await f.locator('[data-person="0"] .care-wallet').innerText()).includes('4'),'draft starts with four coins, not last paid wallet of two');
 const resultBeforeReview=await f.locator('.care-stats').innerText();await f.locator('.care-result-review > summary').click();assert.equal(await f.locator('.care-observer:visible').count(),12);await f.locator('[data-care-result-person="0"]').click();assert((await f.locator('.care-result-inspection').innerText()).includes('剩2'));assert.equal(await f.locator('.care-stats').innerText(),resultBeforeReview);assert.deepEqual(await careState(page),baseline,'both folds and old wallet inspection are read-only');
 await f.locator('.care-result-review > summary').click();await page.screenshot({path:path.join(out,width+'-next-arrangement.png'),fullPage:true});
 await f.locator('.care-adjustments > summary').click();await f.locator('.care-result-review[open]').waitFor();assert.equal(await f.locator('.care-patient:visible').count(),0);assert.deepEqual(await careState(page),baseline);
 await page.keyboard.press('Escape');await moveCare(page,f,'voucher:0','person:4',method);const funded=await runCare(page,f);assert.equal(careRoutingAccount(funded.run).people[4].reason,'capacity');assert((await f.locator('.care-result-change').innerText()).includes('小5有人代付了，还是没排到'));
 await moveCare(page,f,'visitor:4','person:0',method);const shifted=await careState(page);assert.deepEqual(shifted.run,funded.run);assert.deepEqual(shifted.vouchers,funded.vouchers);assert.equal(await f.locator('[data-testid="care-routing-result"]').getAttribute('data-stale'),'true');
 const reordered=await runCare(page,f),ra=careRoutingAccount(reordered.run);assert.equal(ra.people[4].served,true);assert.equal(ra.people[3].reason,'capacity');assert.equal(ra.served,4);assert.equal(ra.publicFunds,22);assert.equal(ra.moneyAfter,68);assert((await f.locator('.care-result-change').innerText()).includes('小5用上了，小4开始等'));await f.locator('[data-care-result-person="3"]').click();assert((await f.locator('.care-result-inspection').innerText()).includes('人手不够'));assert.deepEqual(await careState(page),reordered);await page.screenshot({path:path.join(out,width+'-queue-choice.png'),fullPage:true});
 await page.reload();f=await frame(page);await f.locator('.care-routing').waitFor();assert.deepEqual(await careState(page),reordered);await moveCare(page,f,'visitor:4','person:3',method);await moveCare(page,f,'voucher:0','funding',method);baseline=await runCare(page,f);assert.deepEqual(baseline.queue,Array.from({length:12},(_,i)=>i));
 if(width===1280){
  await openCareEquipment(page,f);
  const piece=f.locator('[data-care-piece="worker:2"]'),b=await piece.boundingBox(),dest=await f.locator('[data-care-target="slot:2"]').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(dest.x+dest.width/2,dest.y+dest.height/2,{steps:10});await page.mouse.up();assert.deepEqual(await careState(page),baseline);assert.equal(await f.locator('.piece-ghost').count(),0);
  await piece.focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');assert.deepEqual(await careState(page),baseline);assert.equal(await piece.getAttribute('aria-pressed'),'false');
 }
 await moveCare(page,f,'tool','socket',method);assert.deepEqual((await careState(page)).run,baseline.run);assert.equal(await f.locator('[data-testid="care-routing-result"]').getAttribute('data-stale'),'true');assert.equal(await f.locator('[data-testid="care-routing-result"]').getAttribute('data-running'),null);const aided=await runCare(page,f);assert.equal(careRoutingAccount(aided.run).served,4);assert.equal(careRoutingAccount(aided.run).unused,2);assert((await f.locator('.care-result-change').innerText()).includes('能力多了2位，实际用上的人数没变'));
 await coverCare(page,f,method,[4,5]);const mixed=await runCare(page,f),ma=careRoutingAccount(mixed.run);assert.equal(ma.served,6);assert.equal(ma.publicFunds,20);assert.equal(ma.people[4].cash,1);assert.equal(ma.people[6].reason,'money');await page.screenshot({path:path.join(out,width+'-partial-payment.png'),fullPage:true});
 await moveCare(page,f,'voucher:0','funding',method);assert.equal((await careState(page)).vouchers[0],null);assert.deepEqual((await careState(page)).run,mixed.run);await coverCare(page,f,method);await moveCare(page,f,'tool','resources',method);const paid=await runCare(page,f);assert.equal(careRoutingAccount(paid.run).served,4);assert.equal(careRoutingAccount(paid.run).unmet,8);
 await moveCare(page,f,'tool','socket',method);await trainCare(page,f,method);assert.deepEqual((await careState(page)).run,paid.run);const draft=await careState(page);await page.reload();f=await frame(page);await f.locator('.care-routing').waitFor();assert.deepEqual(await careState(page),draft);
 const complete=await runCare(page,f),a=careRoutingAccount(complete.run);assert.equal(a.served,12);assert.equal(a.moneyAfter,68);assert.equal(a.publicFunds,0);assert((await f.locator('.care-funding > .care-destination').textContent()).replace(/\s/g,'').includes('本次起点24'));assert.equal(await f.locator('.care-patient[data-served]').count(),0,'plans never pretend to be completed service');assert.equal(await f.locator('.care-observer[data-served="true"]').count(),12);assert.equal(await f.locator('.care-worker').count(),4);assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,width+'-complete.png'),fullPage:true});
 assert.equal(await f.locator('.care-adjustments[open]').count(),0);assert.equal(await f.locator('.care-observer[data-served="true"]:visible').count(),12);
 assert((await f.locator('.care-hint').innerText()).includes('十二个人都用上了'),'a solved arrangement invites a new comparison, not a fictional unmet person');
 assert((await f.locator('.care-hint').innerText()).includes('能少用一张代付凭证吗？'));
 assert.equal(await f.getByRole('button',{name:'谁还在门外？ →',exact:true}).count(),0);
 assert((await f.locator('.care-result-change').innerText()).includes('多服务 8 人'));
 await page.reload();f=await frame(page);await f.getByTestId('care-routing-result').waitFor();assert.deepEqual(await careState(page),complete);assert.equal(await f.locator('.care-adjustments[open]').count(),0);
 // Accept the invitation by moving one real slip, not by changing a mode or state.
 const richSlip=complete.vouchers.indexOf(0);assert(richSlip>=0);
 await moveCare(page,f,'voucher:'+richSlip,'funding',method);
 assert.deepEqual((await careState(page)).run,complete.run,'moving a slip does not pre-pay or rewrite the last trial');
 assert(!(await f.locator('.care-result-change').innerText()).includes('公共少付'));
 const paymentProbe=await runCare(page,f),probe=careRoutingAccount(paymentProbe.run);
 assert.equal(probe.served,12);assert.equal(probe.capacity,a.capacity);assert.equal(probe.publicFunds,a.publicFunds+2);assert.equal(probe.households,a.households-2);assert.equal(probe.moneyAfter,68);
 assert((await f.locator('.care-result-change').innerText()).replace(/\s/g,'').includes('公共少付2'));
 assert((await f.locator('.care-result-change').innerText()).replace(/\s/g,'').includes('家里多付2'));
 const probeBefore=await careState(page);await f.locator('[data-care-result-person="0"]').click();assert((await f.locator('.care-result-inspection').innerText()).includes('自己付款'));assert.deepEqual(await careState(page),probeBefore);
 await page.screenshot({path:path.join(out,width+'-payment-probe.png'),fullPage:true});
 await page.reload();f=await frame(page);await f.getByTestId('care-routing-result').waitFor();assert.deepEqual(await careState(page),paymentProbe);
 // Removing a planned training assignment returns that specific worker to standby.
 await moveCare(page,f,'training:0','resources',method);const removed=await careState(page);assert.equal(removed.slots.includes(2),false);assert.deepEqual(removed.run,paymentProbe.run);await moveCare(page,f,'training:0','worker:2',method);await moveCare(page,f,'worker:2','slot:2',method);
 await f.getByRole('button',{name:'都用上了，为什么？ →',exact:true}).click();await f.locator('.needs-conclusion').waitFor();assert.equal(await f.locator('[data-testid="needs-report"]').count(),1);await page.screenshot({path:path.join(out,width+'-conclusion.png'),fullPage:true});await page.reload();f=await frame(page);assert.equal((await careState(page)).phase,'conclusion');
 assert(await f.locator('#dots button').evaluateAll(ns=>{const bs=ns.map(n=>n.getBoundingClientRect());return bs.length===7&&bs.every(b=>b.width>=44&&b.height>=44&&Math.abs(b.top-bs[0].top)<1);}),'all seven navigation dots retain 44px targets on one row');
 results.push({width,method,offline:width===320,served:[4,4,6,4,12,12],publicFunds:probe.publicFunds,people:12,workers:4,money:a.moneyAfter,refresh:true,resultsFirst:true,queueFirst:true,initialHeight:initialBox.height,allToolsAvailableBeforeRun:true,viewOnlyFold:true,resultWalletInspection:true,draftKeepsPreviousRun:true,queueChangedBeneficiary:true,identityChangeExplained:true,unusedCapacityExplained:true,reorderKeptCapacity:4,reorderPublicFunds:22,sevenDotsOneRow:true,solvedQuestionFollowsActualResult:true,oneSlipProbe:true,publicPaysLess:2,householdsPayMore:2});await context.close();console.log('Care queue checked: '+width+' '+method);
}assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html')))&&bytes.equals(await fs.readFile(path.join(root,'offline/技术红利去了哪里.html'))),'artifact changed during QA');const report={checkedAt:new Date().toISOString(),buildSHA256:createHash('sha256').update(bytes).digest('hex'),results,errors,external};await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
catch(error){for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
finally{await browser.close();await new Promise(r=>server.close(r));}
