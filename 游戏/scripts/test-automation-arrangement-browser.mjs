import assert from 'node:assert/strict';
import {beginAutomation,editAutomation} from './automation-browser-gestures.mjs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {automationExploration,automationRehearsal} from '../lib/automation-exploration.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),{loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html')),server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,out=path.join(root,'outputs/automation-arrangement-qa');await fs.mkdir(out,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).technology,PROLOGUE_STORAGE_KEY);
async function frame(page){const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();return f;}
async function assign(page,f,id,mode,method){
 await editAutomation(f);
 const from=f.locator('[data-piece="'+id+'"]'),to=f.locator('[data-piece-target="'+mode+'"] .piece-destination');
 if(method==='keyboard'){await from.focus();await page.keyboard.press('Enter');await to.focus();await page.keyboard.press('Enter');}
 else{
  await from.scrollIntoViewIfNeeded();await to.scrollIntoViewIfNeeded();const a=await from.boundingBox(),b=await to.boundingBox();
  const x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
  if(method==='touch'){
   const session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/8,y:y+(ty-y)*i/8}]});
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
  }else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:12});assert.equal(await f.locator('.piece-ghost').count(),1);await page.mouse.up();}
 }
 await f.locator('[data-piece-target="'+mode+'"] [data-piece="'+id+'"]').waitFor();assert.equal((await state(page)).allocations[id],mode);
 assert.equal(await f.locator('.piece-ghost').count(),0);
}
async function nextAssignment(page,f,mode,method){
 const before=await state(page),next=automationRehearsal(before),from=f.locator('[data-automation-next-piece="'+next.person+'"]'),to=f.locator('[data-automation-next-target="'+mode+'"] .automation-next-destination');
 assert.equal(await f.locator('details.automation-plan').getAttribute('open'),null,'the small retrial does not require opening all six people');
 await from.scrollIntoViewIfNeeded();await to.scrollIntoViewIfNeeded();const a=await from.boundingBox(),b=await to.boundingBox(),x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
 if(method==='keyboard'){await from.focus();await page.keyboard.press('Enter');assert.deepEqual(await state(page),before);await to.focus();await page.keyboard.press('Enter');}
 else if(method==='touch'){
  const session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=10;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/10,y:y+(ty-y)*i/10}]});
  assert.deepEqual(await state(page),before,'a held name-card has not changed the draft or paid anyone');assert.equal(await f.locator('[data-automation-next-piece]').count(),1,'ghosts cannot become another real person');
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
 }else{
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:10});assert.deepEqual(await state(page),before);assert.equal(await f.locator('.automation-next-ghost').count(),1);assert.equal(await f.locator('[data-automation-next-piece]').count(),1);await page.mouse.up();
 }
 await f.locator('[data-automation-next-target="'+mode+'"] [data-automation-next-piece="'+next.person+'"]').waitFor();
 const after=await state(page);assert.equal(after.allocations[next.person],mode);assert.deepEqual(after.run,before.run);assert.deepEqual(after.trials,before.trials);assert.equal(await f.locator('.piece-ghost').count(),0);
 assert.equal(await f.locator('details.automation-plan').getAttribute('open'),null);assert.equal(await f.getByTestId('automation-rehearsal').getAttribute('data-changed-people'),'1');
 const snapshot=after;await page.reload();f=await frame(page);assert.deepEqual(await state(page),snapshot);assert.equal(await f.locator('details.automation-plan').getAttribute('open'),null,'refresh keeps the one-person draft compact');
 await f.locator('[data-automation-next-target="'+mode+'"] [data-automation-next-piece="'+next.person+'"]').waitFor();return f;
}
async function run(page,f,unsold){const shortcut=f.getByTestId('automation-retrial-run');await (await shortcut.count()?shortcut:f.getByRole('button',{name:'按这个安排，做一周 →',exact:true})).click();await f.locator('[data-testid="technology-result"][data-stale="false"]').waitFor();assert((await f.locator('.technology-stats').innerText()).includes('留下 '+unsold));assert.equal(await f.locator('details.automation-plan').getAttribute('open'),null);
 assert(await f.locator('.automation-arrangement').evaluate(n=>!!(n.querySelector('.automation-outcome').compareDocumentPosition(n.querySelector('.automation-plan'))&Node.DOCUMENT_POSITION_FOLLOWING)),'actual outcomes precede even the closed planner');
 assert.equal(await f.locator('.automation-payout').count(),10);assert.equal(await f.locator('.automation-payout:visible').count(),1,'only the real focal person occupies the main result');assert.equal(await f.locator('.automation-other-people').getAttribute('open'),null);
 const observation=await f.locator('.automation-payout').evaluateAll(ns=>ns.map(n=>({id:Number(n.dataset.person),income:Number(n.dataset.income),bought:Number(n.dataset.bought),days:Number(n.dataset.workDays),allocation:n.dataset.allocation})).sort((a,b)=>a.id-b.id)),saved=await state(page),allocations=saved.run.allocations??Array(saved.rate/10).fill(saved.run.mode);
 assert.deepEqual(observation,Array.from({length:10},(_,id)=>{const allocation=id<10-saved.rate/10?'work':allocations[id-(10-saved.rate/10)],income=allocation==='cut'?0:4;return {id,income,bought:income,days:allocation==='work'||allocation==='expand'?5:0,allocation};}));
 assert.equal(await f.locator('.automation-payout [data-expression="happy"]').count(),observation.filter(p=>p.bought===4).length);
 assert.equal(await f.locator('.automation-payout [data-expression="worried"]').count(),observation.filter(p=>p.bought===0).length);
 const probe=automationExploration(saved);assert.equal(await f.getByTestId('automation-question').innerText(),probe.prompt);
 assert.equal(await f.locator('[data-automation-person="'+probe.focusPerson+'"] [data-probe-focus="true"]').count(),1);
 if(probe.comparison){const contrast=f.getByTestId('automation-contrast');assert.equal(await contrast.getAttribute('data-matched'),'true');assert.equal((await contrast.innerText()).replace(/枚|\s/g,''),probe.comparison.replace(/枚|\s/g,''));}
 assert.equal(await f.locator('[data-automation-next-piece]').count(),1);assert.equal(await f.locator('[data-automation-next-target]').count(),4);assert.equal(await f.getByTestId('automation-retrial-run').count(),0,'an unchanged plan does not invite a duplicate paid receipt');
}
async function inspect(page,f,id,method,expected){const before=await state(page),b=f.locator('[data-automation-person="'+id+'"]'),others=f.locator('.automation-other-people');if(!await b.isVisible())await others.locator('summary').click();await b.scrollIntoViewIfNeeded();if(method==='keyboard'){await b.focus();await page.keyboard.press('Enter');}else if(method==='touch')await b.tap();else await b.click();assert.equal(await b.getAttribute('aria-expanded'),'true');assert((await f.locator('.automation-person-thought').innerText()).includes(expected));assert.deepEqual(await state(page),before,'observing a real person does not pay, buy or change the plan');await f.locator('.automation-thought-close').click();assert.equal(await b.getAttribute('aria-expanded'),'false');assert.deepEqual(await state(page),before);if(await others.getAttribute('open')!==null)await others.locator('summary').click();}
try{for(const width of [1280,390,320]){
 const context=await browser.newContext({viewport:{width,height:1050},hasTouch:width<600,reducedMotion:width===1280?'no-preference':'reduce'});await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||width===320&&u===offline)return r.continue();external.push(u);return r.abort();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(width===320?offline:url);let f=await frame(page);
 await f.locator('#chapter-toggle').click();await f.locator('[data-chapter="automation"]').click();
 await f.getByTestId('automation-handoff').waitFor();assert(!(await f.getByRole('button',{name:'去看看隔壁的低价 →',exact:true}).isVisible()));
 await page.screenshot({path:path.join(out,width+'-handoff.png'),fullPage:true});
 await f.getByRole('button',{name:'拿起这批任务',exact:true}).click();assert.equal((await state(page)).phase,'intro');await page.keyboard.press('Escape');assert.equal((await state(page)).phase,'intro');
 await beginAutomation(f,page,width===1280?'mouse':width===390?'touch':'keyboard');assert.equal((await state(page)).pressure,undefined);
 await f.locator('.automation-arrangement').waitFor();
 assert.equal(await f.locator('.automation-place-art').count(),4,'four physical places, not four text-only policy buttons');
 assert.equal(await f.locator('.piece-person').count(),6);assert.equal(await f.locator('[data-mode]').count(),0);assert.equal(await f.locator('[data-testid="technology-result"]').count(),0);
 assert.equal(await f.locator('.piece-person [data-expression="worried"]').count(),6);
 assert(await f.locator('.piece-person .technology-peep').evaluateAll(ns=>ns.every(n=>{const b=n.getBoundingClientRect();return b.width>=38&&b.height>=57&&n.querySelector('svg').viewBox.baseVal.width===72&&n.querySelector('svg').viewBox.baseVal.height===108;})));
 const touchAreas=await f.locator('.piece-person').evaluateAll(nodes=>nodes.map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));assert(touchAreas.every(a=>a.width>=44&&a.height>=44));
 await page.screenshot({path:path.join(out,width+'-draft.png'),fullPage:true});await run(page,f,24);const previous=structuredClone((await state(page)).run);
 await inspect(page,f,4,width===390?'touch':width===1280?'mouse':'keyboard','饭钱可没接上');await page.screenshot({path:path.join(out,width+'-first-result.png'),fullPage:true});
 if(width===1280){
  await editAutomation(f);
  const before=await state(page),piece=f.locator('[data-piece="1"]');await piece.scrollIntoViewIfNeeded();let b=await piece.boundingBox();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(16,110,{steps:8});await page.mouse.up();assert.deepEqual(await state(page),before);assert.equal(await f.locator('.piece-ghost').count(),0);assert.equal(await piece.getAttribute('aria-pressed'),'false');
  b=await piece.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+25,b.y+b.height/2+20,{steps:5});await page.keyboard.press('Escape');await page.mouse.up();assert.deepEqual(await state(page),before);assert.equal(await piece.getAttribute('aria-pressed'),'false');assert.equal(await f.locator('.piece-ghost').count(),0);
 }
 if(await f.locator('.automation-plan[open]').count())await f.locator('.automation-plan > summary').click();
 const quickBefore=await state(page),card=f.locator('[data-automation-next-piece]');await card.focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');assert.equal(await card.getAttribute('aria-pressed'),'false');assert.deepEqual(await state(page),quickBefore);
 const oldQuestion=await f.getByTestId('automation-question').innerText();f=await nextAssignment(page,f,'time',width===390?'touch':width===1280?'mouse':'keyboard');assert.deepEqual((await state(page)).run,previous);assert.equal(await f.getByTestId('automation-question').innerText(),oldQuestion,'a draft cannot invent a new result question');assert.equal(await f.locator('[data-testid="technology-result"]').getAttribute('data-stale'),'true');assert.equal(await f.locator('[data-testid="technology-result"]').getAttribute('data-running'),null);assert.equal(await f.locator('[data-automation-person="4"]').getAttribute('data-income'),'0','new draft cannot rewrite last week');await run(page,f,20);await inspect(page,f,4,'keyboard','这周轮休');
 assert((await f.getByTestId('automation-contrast').innerText()).includes('收入多4'));assert((await f.getByTestId('automation-contrast').innerText()).includes('卖出多4'));
 for(const [id,mode] of [[1,'share'],[2,'time'],[3,'share'],[4,'time'],[5,'time']])await assign(page,f,id,mode,'keyboard');
 await run(page,f,0);assert.equal((await state(page)).run.mode,'mixed');assert.equal(await f.locator('.automation-payout').evaluateAll(nodes=>nodes.reduce((n,p)=>n+Number(p.dataset.income),0)),40);assert.equal((await state(page)).trials.length,3);
 assert.equal(await f.locator('.piece-person [data-expression="steady"]').count(),6);assert.equal(await f.locator('.piece-person [data-expression="worried"]').count(),0);
 assert((await f.locator('.automation-income').innerText()).includes('10 / 10'));assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await inspect(page,f,5,'keyboard','能不能决定下一步');assert.equal(await f.locator('[data-automation-person="5"]').getAttribute('data-work-days'),'0');assert.equal(await f.locator('[data-automation-person="5"]').getAttribute('data-allocation'),'share');
 await page.screenshot({path:path.join(out,width+'-mixed.png'),fullPage:true});const saved=await state(page);await page.reload();f=await frame(page);await f.locator('[data-testid="technology-result"]').waitFor();assert.deepEqual(await state(page),saved);
 const conclude=f.getByRole('button',{name:'结果为什么不同？ →',exact:true});
 assert(await conclude.evaluate(b=>{const r=document.createRange();r.selectNodeContents(b);const text=r.getBoundingClientRect(),box=b.getBoundingClientRect();return text.top>=box.top&&text.bottom<=box.bottom&&text.left>=box.left&&text.right<=box.right;}));
 await conclude.click();await f.locator('.technology-conclusion').waitFor();assert.equal(await f.locator('[data-testid="technology-report"]').count(),1);
 const beforeCapability=await state(page);await f.getByRole('button',{name:'保留回执，再挪挪人 ↺',exact:true}).click();assert.deepEqual((await state(page)).trials,beforeCapability.trials);assert.deepEqual((await state(page)).run,beforeCapability.run);assert.equal(await f.locator('.automation-plan').getAttribute('open'),'');await f.locator('.automation-capability > summary').click();await f.locator('#automation-rate').fill('80');await f.locator('#automation-rate').dispatchEvent('change');assert.equal(await f.locator('.piece-person').count(),8);assert.equal((await state(page)).run,null);assert.deepEqual((await state(page)).trials,beforeCapability.trials);
 assert.equal(await f.locator('[data-receipt-rate="60"]').getAttribute('data-receipt-count'),'3');assert.equal(await f.getByRole('button',{name:'结果为什么不同？ →',exact:true}).count(),0);
 const changed=await state(page);await f.locator('.automation-past-trials > summary').click();assert((await f.locator('[data-receipt-rate="60"]').innerText()).includes('卖出48'));assert.deepEqual(await state(page),changed,'reading old capability receipts does not execute a draft');await page.screenshot({path:path.join(out,width+'-old-capability.png'),fullPage:true});
 await run(page,f,32);assert.equal(await f.getByTestId('automation-contrast').count(),0,'do not compare different machines as if only allocation changed');assert.equal(await f.getByRole('button',{name:'结果为什么不同？ →',exact:true}).count(),0);assert.deepEqual((await state(page)).trials.slice(0,3),beforeCapability.trials);
 await assign(page,f,0,'time',width===390?'touch':width===1280?'mouse':'keyboard');await run(page,f,28);assert((await f.getByTestId('automation-contrast').innerText()).includes('机器没换'));assert.equal(await f.getByRole('button',{name:'结果为什么不同？ →',exact:true}).count(),1);
 assert.equal(await f.locator('[data-receipt-rate="60"]').getAttribute('data-receipt-count'),'3');assert.equal(await f.locator('[data-receipt-rate="80"]').getAttribute('data-receipt-count'),'2');await f.locator('.automation-past-trials > summary').click();await page.screenshot({path:path.join(out,width+'-grouped-capabilities.png'),fullPage:true});
 const grouped=await state(page);await page.reload();f=await frame(page);assert.deepEqual(await state(page),grouped);await editAutomation(f);await f.locator('.automation-capability > summary').click();await f.locator('#automation-rate').fill('60');await f.locator('#automation-rate').dispatchEvent('change');assert.equal((await state(page)).run,null);assert.deepEqual((await state(page)).trials,grouped.trials);assert.equal(await f.getByRole('button',{name:'结果为什么不同？ →',exact:true}).count(),0);await run(page,f,24);assert.equal((await state(page)).trials.length,5);
 for(let id=0;id<6;id++)await assign(page,f,id,'time','keyboard');await run(page,f,0);assert.equal(await f.getByTestId('automation-contrast').getAttribute('data-matched'),'false');
 f=await nextAssignment(page,f,'expand',width===1280?'mouse':width===390?'touch':'keyboard');await run(page,f,12);assert((await f.getByTestId('automation-question').innerText()).includes('人人有收入'));assert((await f.getByTestId('automation-contrast').innerText()).includes('多做12份'));await page.screenshot({path:path.join(out,width+'-one-person-extra.png'),fullPage:true});
 f=await nextAssignment(page,f,'time',width===1280?'mouse':width===390?'touch':'keyboard');await run(page,f,0);assert((await f.getByTestId('automation-contrast').innerText()).includes('少做12份'));
 f=await nextAssignment(page,f,'share',width===1280?'mouse':width===390?'touch':'keyboard');await run(page,f,0);assert((await f.getByTestId('automation-question').innerText()).includes('账和身份'));assert((await f.getByTestId('automation-contrast').innerText()).includes('在册少1人'));await page.screenshot({path:path.join(out,width+'-one-person-share.png'),fullPage:true});
 assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const final=await state(page);await page.reload();f=await frame(page);assert.deepEqual(await state(page),final);assert.equal(await f.getByTestId('automation-question').innerText(),automationExploration(final).prompt);
 results.push({width,offline:width===320,input:width===1280?'mouse':width===390?'touch':'keyboard',taskHandoff:true,physicalPlaces:4,outcomeBeforePlanner:true,actualPeople:10,personInspectionViewOnly:true,actualExpressions:true,draftDoesNotRewriteOutcome:true,foldedPlanAfterRun:true,baselineUnsold:24,mixedUnsold:0,people:10,income:40,refresh:true,capabilityGroups:[{rate:60,receipts:3},{rate:80,receipts:2}],capabilityEditPreservesPaidRecords:true,oldReceiptInspectionIsViewOnly:true,sameCapabilityConclusionGate:true,returnToCapabilityStillRequiresRun:true,actualQuestionAndFocus:true,draftDoesNotRewriteQuestion:true,onePersonExtraStock:12,onePersonPayRestComparison:true,onePersonShareIdentityComparison:true,multipleEditsNotSingleCause:true,finalTrialCount:final.trials.length});await context.close();console.log('Automation arrangements and capability receipts checked: '+width);
 }assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html')))&&bytes.equals(await fs.readFile(path.join(root,'offline/技术红利去了哪里.html'))),'artifact changed during QA');const report={checkedAt:new Date().toISOString(),buildSHA256:createHash('sha256').update(bytes).digest('hex'),results,errors,external};await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();await new Promise(r=>server.close(r));}
