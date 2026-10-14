/** Fresh pages, actual gestures, persisted dialogue and every conditional route. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {ASSUMPTION_DIALOGUE} from '../lib/assumption-desk.ts';
import {PROLOGUE_ASSUMPTIONS,PROLOGUE_MODEL_ASSUMPTIONS,PROLOGUE_REASONING} from '../lib/relief-experiment.ts';
import {moveCondition} from './assumption-browser-gestures.mjs';
import {beginAutomation} from './automation-browser-gestures.mjs';
import {checkAssumptionCardLayout} from './assumption-card-layout.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),{loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html')),server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});
assert(bytes.equals(await fs.readFile(path.join(root,'offline/技术红利去了哪里.html'))),'online and offline artifacts must match before QA');
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,out=path.join(root,'outputs/assumption-desk-qa');await fs.mkdir(out,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROLOGUE_STORAGE_KEY);
async function frame(page){const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();return f;}
async function ready(f){await f.locator('.assumption-desk').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);}
async function fits(f){assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert(await f.locator('.assumption-desk button').evaluateAll(ns=>ns.filter(n=>n.getClientRects().length).every(n=>{const b=n.getBoundingClientRect();return b.width>=44&&b.height>=44;})));assert.equal(await f.locator('[data-assumption-piece]').count(),4);assert.equal(await f.locator('.piece-ghost').count(),0);}
try{for(const width of [1280,390,320]){
 const method=width===1280?'mouse':width===390?'touch':'keyboard',context=await browser.newContext({viewport:{width,height:1100},hasTouch:width===390,reducedMotion:width===1280?'no-preference':'reduce'});
 await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||width===320&&u===offline)return r.continue();external.push(u);return r.abort();});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(width===320?offline:url);let f=await frame(page);
 await f.locator('#chapter-toggle').click();await f.locator('[data-chapter="automation"]').click();await f.getByRole('button',{name:'回到假设目录 ↩',exact:true}).click();await ready(f);
 const opening=await saved(page);assert.equal(opening.assumptionDesk.beat,0);assert.deepEqual(opening.reliefCompleted,[]);assert.equal(await f.locator('.assumption-if:visible').count(),0);assert.equal(await f.locator('.assumption-if').count(),8);assert.equal(await f.locator('.assumption-model').getAttribute('open'),null);assert.equal(await f.locator('.assumption-hint').innerText(),'一张条件，两种改法。拿起来，放到桌上。');assert.deepEqual(await f.locator('.assumption-tag > span:last-child').allTextContents(),PROLOGUE_ASSUMPTIONS.map(g=>g.label));await fits(f);await page.screenshot({path:path.join(out,width+'-opening.png'),fullPage:true});
 for(let beat=0;beat<3;beat++){
  assert((await f.locator('.assumption-speech').innerText()).includes(ASSUMPTION_DIALOGUE[beat]));await f.getByRole('button',{name:'听听下一句话',exact:true}).click();await f.waitForFunction(beat=>document.querySelector('.assumption-speech').textContent.includes(beat),ASSUMPTION_DIALOGUE[beat+1]);
 }
 assert.equal(await f.locator('.assumption-speech').innerText(),ASSUMPTION_DIALOGUE[3]);assert.equal((await saved(page)).assumptionDesk.beat,3);
 await page.reload();f=await frame(page);await ready(f);assert.equal((await saved(page)).assumptionDesk.beat,3);
 const beforePickup=await saved(page);await f.locator('[data-assumption-piece="needs"]').focus();await page.keyboard.press('Enter');assert.deepEqual(await saved(page),beforePickup);await page.keyboard.press('Escape');assert.equal(await f.locator('[data-assumption-piece="needs"]').getAttribute('aria-pressed'),'false');
 if(width===1280){const piece=f.locator('[data-assumption-piece="needs"]');await piece.scrollIntoViewIfNeeded();let b=await piece.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(20,130,{steps:10});await page.mouse.up();assert.deepEqual(await saved(page),beforePickup);assert.equal(await f.locator('.piece-ghost').count(),0);
  b=await piece.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+20,b.y+b.height/2+15,{steps:6});await page.keyboard.press('Escape');await page.mouse.up();assert.deepEqual(await saved(page),beforePickup);
 }
 const visited=[];
 for(const group of PROLOGUE_ASSUMPTIONS){
  await moveCondition(page,f,group.id,'desk',method);assert.equal((await saved(page)).assumptionDesk.selected,group.id);assert.equal(await f.locator('.assumption-if:visible').count(),2);await fits(f);assert.equal(await f.locator('.assumption-group:visible .assumption-premise small').innerText(),'刚才实验的条件');assert.equal(await f.locator('.assumption-group:visible .assumption-premise span').innerText(),group.title);assert.deepEqual(await f.locator('.assumption-if:visible .assumption-fork-play').allTextContents(),group.ifs.map(b=>b.play));
  await checkAssumptionCardLayout(f);
  const arranged=await saved(page),other=PROLOGUE_ASSUMPTIONS.find(g=>g.id!==group.id).id;await moveCondition(page,f,other,'tray','keyboard');assert.deepEqual(await saved(page),arranged);await moveCondition(page,f,group.id,'desk','keyboard');assert.deepEqual(await saved(page),arranged);
  assert.equal(await f.locator('[data-assumption="'+group.id+'"] details').getAttribute('open'),null);
  await page.screenshot({path:path.join(out,width+'-'+group.id+'.png'),fullPage:true});
  const placed=(await saved(page)).assumptionDesk;await page.reload();f=await frame(page);await ready(f);assert.deepEqual((await saved(page)).assumptionDesk,placed);
  for(const branch of group.ifs){
   await f.locator('[data-branch="'+branch.id+'"]').click();const scene=['automation','time'].includes(branch.id)?'technology':['space','services'].includes(branch.id)?'needs-technology':['concentration','sharing'].includes(branch.id)?'ownership-technology':'market-rules';await f.locator('body[data-scene="'+scene+'"]').waitFor();visited.push(branch.id);
   if(branch.id==='automation'){await beginAutomation(f);await f.getByTestId('automation-run').click();await f.getByTestId('technology-result').waitFor();assert((await saved(page)).technology.run);assert.equal((await saved(page)).technology.pressure,undefined);}
   await f.getByRole('button',{name:'回到假设目录 ↩',exact:true}).click();await ready(f);assert.equal((await saved(page)).assumptionDesk.selected,group.id);const sign=f.locator('[data-branch="'+branch.id+'"]');assert.equal(await sign.getAttribute('data-progress'),branch.id==='automation'?'receipt':'new');assert.equal(await sign.locator('.assumption-fork-progress').innerText(),branch.id==='automation'?'已有 1 份回执 · 接着试':'动手试试 →');
   await checkAssumptionCardLayout(f);
  }
 }
 const ai=(await saved(page)).branchArchive.automation;assert(ai.run);
 await moveCondition(page,f,'labour','desk',method);await f.locator('[data-branch="automation"]').click();await f.getByTestId('technology-result').waitFor();assert.deepEqual((await saved(page)).technology,ai);assert.equal(await f.getByTestId('automation-handoff').count(),0);
 await page.reload();f=await frame(page);await f.getByTestId('technology-result').waitFor();assert.deepEqual((await saved(page)).technology,ai);await f.getByRole('button',{name:'回到假设目录 ↩',exact:true}).click();await ready(f);await moveCondition(page,f,'boundaries','desk',method);
 const beforeReplay=await saved(page);await f.getByRole('button',{name:'再听听争论 ↺',exact:true}).click();await f.getByRole('button',{name:'听听下一句话',exact:true}).waitFor();const replayed=await saved(page);assert.equal(replayed.assumptionDesk.beat,0);assert.equal(replayed.assumptionDesk.selected,'boundaries');
 for(const key of ['street','technology','needsTechnology','ownershipTechnology','marketRules','remedyLabs','branchArchive'])assert.deepEqual(replayed[key],beforeReplay[key]);
 await moveCondition(page,f,'boundaries','tray',method);assert.equal((await saved(page)).assumptionDesk.selected,null);assert.equal(await f.locator('.assumption-if:visible').count(),0);await fits(f);
 const beforeReasoning=await saved(page);await f.locator('.assumption-model>summary').click();assert.equal(await f.locator('.assumption-model li:visible').count(),8);
 assert.deepEqual(await f.locator('.assumption-reasoning').evaluateAll(ns=>ns.map(n=>n.dataset.reasoning)),['relation','sale','feedback']);
 assert.equal(await f.locator('.assumption-reasoning-definition').textContent(),'资本主义社会基本矛盾：生产社会化与生产资料资本主义私人占有之间的矛盾。');
 assert.equal(await f.locator('.assumption-reasoning[data-reasoning="sale"] .assumption-reasoning-note').textContent(),PROLOGUE_REASONING.sale.note);
 assert.equal(await f.locator('.assumption-reasoning[data-reasoning="feedback"] .assumption-reasoning-note').textContent(),PROLOGUE_REASONING.feedback.note);
 assert.equal(await f.locator('.assumption-reasoning-source a').getAttribute('href'),PROLOGUE_REASONING.source.url);
 assert.deepEqual(await saved(page),beforeReasoning,'reading the causal conditions neither runs the economy nor changes any branch');
 assert(await f.locator('.assumption-reasoning-part').evaluateAll(ns=>ns.every(n=>n.scrollWidth<=n.clientWidth+1)),'every step remains readable at the viewport width');
 assert.deepEqual(await f.locator('.assumption-model li').allTextContents(),[...PROLOGUE_MODEL_ASSUMPTIONS]);
 assert((await f.locator('.assumption-model').innerText()).includes('不是从几轮积压就能证明的历史定律'));
 await page.screenshot({path:path.join(out,width+'-ledger.png'),fullPage:true});
 assert.equal(await f.locator('.assumption-parameters').getAttribute('open'),null);await f.locator('.assumption-parameters>summary').click();const parameters=await f.locator('.assumption-parameters').innerText();for(const words of ['人口固定20人','心愿按人物与日期固定','净利润＝销售收入','政府购买、信贷、外部市场未模拟','私人雇佣企业街区不能直接代指社会主义国家'])assert(parameters.includes(words));assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.deepEqual((await saved(page)).reliefCompleted,[]);assert.equal((await saved(page)).epilogueBeat,0);results.push({width,method,offline:width===320,visited,dialoguePersisted:true,conditionsPersisted:true,equalQuestionCards:true,conditionalActionHints:true,reasoningReadOnly:true,definitionAndSaleConditionsSeparate:true,reasoningStepsFit:true});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html')))&&bytes.equals(await fs.readFile(path.join(root,'offline/技术红利去了哪里.html'))),'artifact changed while QA was running; these results cannot certify one build');const report={checkedAt:new Date().toISOString(),builtSha256:createHash('sha256').update(bytes).digest('hex'),results,errors,external};await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();await new Promise(r=>server.close(r));}
