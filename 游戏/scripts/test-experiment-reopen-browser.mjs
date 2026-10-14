/** Actual menus, completed experiments, continuation and explicit reset.
 * No state dispatch, snapshots or clocks are injected into the game. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {chooseCondition} from './assumption-browser-gestures.mjs';
import {beginAutomation,arrangeAll} from './automation-browser-gestures.mjs';
import {moveCalendarPiece,openCalendarWorkspace} from './time-calendar-browser-gestures.mjs';
import {moveCare,runCare} from './care-routing-browser-gestures.mjs';
import {moveFreight,finishFreight} from './space-freight-browser-gestures.mjs';
import {moveNetwork,runNetwork} from './platform-network-browser-gestures.mjs';
import {moveCouncil,arrangeCouncil,payCouncil,voteCouncil} from './sharing-council-browser-gestures.mjs';
import {beginProduction,productionFinish,productionBack} from './council-production-browser-gestures.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile('build/index.html'),out='outputs/experiment-reopen-qa',offline=pathToFileURL(process.cwd()+'/offline/技术红利去了哪里.html').href;
assert(bytes.equals(await fs.readFile('offline/技术红利去了哪里.html')));
await fs.mkdir(out,{recursive:true});const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/`,browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
const specs=[
 ['automation','labour','technology',null,'保留回执，再挪挪人 ↺','结果为什么不同？ →','.automation-arrangement'],
 ['time','labour','technology','calendar','保留回执，再排一周 ↺','时间归谁？ →','.time-calendar'],
 ['space','needs','needsTechnology','freight','保留回执，再接一单 ↺','订单会一直来吗？ →','.space-freight'],
 ['services','needs','needsTechnology','care','保留回执，继续安排 ↺','谁还在门外？ →','.care-routing'],
 ['concentration','ownership','ownershipTechnology','network','保留回执，再接一次 ↺','一起生产，谁拿钥匙？ →','.platform-network'],
 ['sharing','ownership','ownershipTechnology','council','保留回执，重新分配 ↺','机器省下了什么，谁拿到了？ →','.sharing-council'],
];
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROLOGUE_STORAGE_KEY);
async function frame(page){const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();return f;}
try{for(const width of [1280,390,320]){
 const method=width===1280?'mouse':width===390?'touch':'keyboard',height=width===1280?900:width===390?844:568;
 const context=await browser.newContext({viewport:{width,height},hasTouch:width===390,reducedMotion:'reduce'});
 await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||width===320&&u===offline)return r.continue();external.push(u);return r.abort();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(width===320?offline:url);let f=await frame(page);
 const press=async locator=>{if(method==='keyboard')await locator.press('Enter');else if(method==='touch')await locator.tap();else await locator.click();};
 const button=name=>f.getByRole('button',{name,exact:true});
 await press(f.locator('#chapter-toggle'));await press(f.locator('[data-chapter="automation"]'));await press(button('回到假设目录 ↩'));
 for(const [branch,group,field,child,again,conclude,board] of specs){
  await chooseCondition(f,group);await press(f.locator('[data-branch="'+branch+'"]'));
  const state=async()=>{const p=(await saved(page))[field];return child?p[child]:p;};
  const runCalendar=async()=>{await press(button('照这样，过一周 →'));await f.locator('.calendar-result[data-stale="false"]').waitFor();};
  const runAI=async()=>{await press(f.getByTestId('automation-run'));await f.locator('[data-testid="technology-result"][data-stale="false"]').waitFor();};
  const councilRound=async mode=>{if((await state()).mode!==mode)await moveCouncil(page,f,'mode:'+mode,'charter');await arrangeCouncil(page,f);await payCouncil(page,f);await moveCouncil(page,f,'ballot','divide');await voteCouncil(page,f);await beginProduction(page,f);await productionFinish(page,f);};
  if(branch==='automation'){await beginAutomation(f);await runAI();await arrangeAll(f,'time');await runAI();}
  if(branch==='time'){await press(button('试着安排一周 →'));await runCalendar();for(const day of [2,3,4])await moveCalendarPiece(page,f,'day:'+day,'rest');await runCalendar();}
  if(branch==='services'){await press(button('安排这一期 →'));await f.locator(board).waitFor();await page.waitForFunction(key=>!!JSON.parse(localStorage.getItem(key)).needsTechnology.care,PROLOGUE_STORAGE_KEY);await runCare(page,f);await moveCare(page,f,'tool','socket');await runCare(page,f);}
  if(branch==='space'){await press(button('准备第一批材料 →'));await finishFreight(page,f);await press(button('换个条件再试 ↺'));await moveFreight(page,f,'contract:12','book');await finishFreight(page,f);}
  if(branch==='concentration'){await press(button('先接上技术 →'));await f.locator(board).waitFor();await page.waitForFunction(key=>!!JSON.parse(localStorage.getItem(key)).ownershipTechnology.network,PROLOGUE_STORAGE_KEY);for(const rule of ['locked','portable']){if((await state()).rule!==rule)await moveNetwork(page,f,'rule:'+rule,'contract');await runNetwork(page,f);await moveNetwork(page,f,'shop:0','B');await runNetwork(page,f);}}
  if(branch==='sharing'){await press(button('看看这笔钱 →'));await f.locator(board).waitFor();await page.waitForFunction(key=>!!JSON.parse(localStorage.getItem(key)).ownershipTechnology.council,PROLOGUE_STORAGE_KEY);await councilRound('bonus');await productionBack(page,f);await councilRound('coop');}
  await press(button(conclude));await f.locator('[class$="-conclusion"]').waitFor();const completed=await state(),past=structuredClone(completed.trials),shifts=completed.productionTrials;
  assert.equal(completed.phase,'conclusion');assert(past.length>=2);assert.equal(await f.locator('.experiment-reset[open]').count(),0);
  await press(button(again));await f.locator(board).waitFor();const reopened=await state();assert.equal(reopened.phase,'lab');assert.deepEqual(reopened.trials,past);if(shifts)assert.deepEqual(reopened.productionTrials,shifts);
  if(['automation','time','services'].includes(branch)){assert.deepEqual(reopened.run,completed.run);assert.equal(await f.locator(branch==='automation'?'.automation-plan[open]':branch==='time'?'.calendar-workspace[open]':'.care-adjustments[open]').count(),1,'return opens the editable workbench');}
  if(branch==='space')assert.equal(reopened.history.length,0);
  if(['space','concentration','sharing'].includes(branch)){
   const fold=f.locator(branch==='space'?'.freight-past-trials':branch==='concentration'?'.network-past-trials':'.council-past-trials');assert.equal(await fold.getAttribute('open'),null);await press(fold.locator(':scope > summary'));assert((await fold.innerText()).length>40);assert.deepEqual(await state(),reopened,'viewing old receipts never pays');await press(fold.locator(':scope > summary'));
  }
  await page.screenshot({path:`${out}/${width}-${branch}-reopened.png`,fullPage:true});
  await page.reload();f=await frame(page);await f.locator(board).waitFor();assert.deepEqual(await state(),reopened,'refresh preserves editable continuation and previous actual receipts');
  if(branch==='automation'){await arrangeAll(f,'expand');await runAI();}
  if(branch==='time'){await openCalendarWorkspace(page,f);await press(f.getByTestId('calendar-contract'));assert.deepEqual((await state()).run,reopened.run);await runCalendar();}
  if(branch==='services'){await moveCare(page,f,'voucher:0','person:4',method);assert.deepEqual((await state()).run,reopened.run);await runCare(page,f);}
  if(branch==='space'){await press(f.locator('.freight-equipment > summary'));await f.locator('#freight-capacity').fill('4');await f.locator('#freight-capacity').dispatchEvent('change');await finishFreight(page,f,true);}
  if(branch==='concentration'){await moveNetwork(page,f,'rule:joint','contract',method);await runNetwork(page,f);await moveNetwork(page,f,'shop:0','B',method);await runNetwork(page,f);}
  if(branch==='sharing'){await moveCouncil(page,f,'mode:minority','charter',method);await councilRound('minority');}
  const after=await state();assert.deepEqual(after.trials.slice(0,past.length),past,'a new actual experiment appends without erasing prior distinct results');assert.equal(after.trials.length,past.length+1);if(shifts)assert.deepEqual(after.productionTrials.slice(0,shifts.length),shifts);
  await press(button(conclude));await f.locator('[class$="-conclusion"]').waitFor();await press(f.locator('[class$="-conclusion"] > .street-bounds > summary'));await press(f.locator('.experiment-reset > summary'));const clear=button('清空本分支，重新开局');assert.equal(await clear.isVisible(),true);
  const beforeClear=await saved(page);await press(clear);await page.waitForFunction(({key,field})=>JSON.parse(localStorage.getItem(key))[field].phase==='intro',{key:PROLOGUE_STORAGE_KEY,field});const cleared=await saved(page);assert.equal(cleared[field][child],undefined);for(const prior of specs.filter(s=>s[2]!==field))if(beforeClear[prior[2]])assert.deepEqual(cleared[prior[2]],beforeClear[prior[2]],'explicit reset cannot clear sibling branch');for(const [id,archive]of Object.entries(beforeClear.branchArchive??{}))if(id!==branch)assert.deepEqual(cleared.branchArchive[id],archive,'explicit reset cannot clear archived sibling branch');
  await page.reload();f=await frame(page);assert.equal((await saved(page))[field].phase,'intro');await press(button('回到假设目录 ↩'));
  assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));results.push({width,height,branch,continuationInput:method,offline:width===320,priorReceipts:past.length,actualNewComparison:true,refresh:true,readOnlyOldReceipts:true,explicitScopedReset:true});console.log(`Continuation checked: ${width} ${branch}`);
 }
 await context.close();
}
assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile('build/index.html')));const report={checkedAt:new Date().toISOString(),buildSHA256:createHash('sha256').update(bytes).digest('hex'),results,errors,external};await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});throw e;
}finally{await browser.close();await new Promise(r=>server.close(r));}
