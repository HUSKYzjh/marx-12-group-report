/** Operate actual moves; observe the cash story, never inject game state or clocks. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),bytes=await fs.readFile(path.join(root,'build/index.html'));
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href;
const output=path.join(root,'outputs/relief-qa');await fs.mkdir(output,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
const save=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),PROLOGUE_STORAGE_KEY);
async function observe(f){await f.evaluate(()=>{
 window.__cashStory=[];window.__cashObserver?.disconnect();
 window.__cashObserver=new MutationObserver(()=>{const m=document.querySelector('.remedy-message[data-cash-step]');if(!m)return;
  const stamp=m.closest('.remedy-narration').querySelector('.remedy-impact');
  const scene=document.querySelector('.remedy-scene'),wallet=scene.querySelector('.remedy-wallet'),face=scene.querySelector('.remedy-buyers>.remedy-person'),entry={kind:m.dataset.cashStep,amount:Number(m.dataset.amount),wallet:Number(m.dataset.wallet),round:Number(scene.dataset.round),stampHidden:!stamp||getComputedStyle(stamp).display==='none',shownWallet:Number(wallet.dataset.wallet),walletVisible:!wallet.hidden,mood:face.dataset.expression,cue:m.dataset.forecast==='true'?wallet.querySelector('.remedy-cash-cue').textContent.trim():m.textContent.trim(),walletRect:wallet.getBoundingClientRect().toJSON(),statusRects:[...scene.querySelectorAll('.remedy-status')].map(n=>n.getBoundingClientRect().toJSON())};
  if(JSON.stringify(entry)!==JSON.stringify(window.__cashStory.at(-1)))window.__cashStory.push(entry);
 });window.__cashObserver.observe(document.querySelector('#readout'),{subtree:true,attributes:true,childList:true,characterData:true});
 });}
async function settled(f){await f.waitForFunction(()=>!document.body.dataset.transition);}
async function storyDone(f){await f.waitForFunction(()=>{const m=document.querySelector('.remedy-message');return m&&!m.dataset.cashStep;});}
async function move(page,f,mode,n){await f.waitForFunction(mode=>{const b=document.querySelector('[data-gesture-target="'+mode+'"]');return b&&!b.disabled;},mode);await f.locator('[data-gesture-target="'+mode+'"]').click();await f.locator('.remedy-scene[data-round="'+n+'"]').waitFor();await settled(f);assert.equal((await save(page)).remedyLabs.consumption.history.length,n);}
async function check(f,expected,round){await storyDone(f);const events=await f.evaluate(round=>window.__cashStory.filter(e=>round===undefined||e.round===round),round);assert.deepEqual(events.map(({kind,amount,wallet})=>[kind,amount,wallet]),expected);for(const e of events){assert(e.stampHidden);assert(e.walletVisible);assert.equal(e.shownWallet,e.wallet);assert(Array.from(e.cue).length<=12,e.cue);assert.equal(e.mood,(e.kind==='shopping'?e.amount>=30:e.wallet>=30)?'happy':'worried');for(const r of e.statusRects)assert(e.walletRect.right<=r.left||e.walletRect.left>=r.right||e.walletRect.bottom<=r.top||e.walletRect.top>=r.bottom,'wallet must not cover a status box');}assert.equal(await f.locator('.remedy-wallet').isVisible(),false);assert.equal(await f.locator('.remedy-message[data-cash-step]').count(),0);assert.equal(await f.locator('.remedy-sequence-symbol').count(),0);if(await f.locator('.remedy-impact').count())assert(await f.locator('.remedy-impact').isVisible(),'the actual condition must return after the last cash event');assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
try{
 for(const spec of [{width:320},{width:390,offline:true,reduced:true},{width:1280}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:960},reducedMotion:spec.reduced?'reduce':'no-preference',hasTouch:spec.width<600});
  await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||spec.offline&&u===offline)return r.continue();external.push(u);return r.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(spec.offline?offline:url);
  const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();
  await f.locator('#dots [data-stage="4"]').click();await f.locator('.remedy-card').first().waitFor();await settled(f);await f.locator('.remedy-card[data-route=consumption]').click();await f.locator('[data-gesture-target=credit]').waitFor();await settled(f);
  await observe(f);await move(page,f,'credit',1);
  if(spec.reduced){assert.equal(await f.locator('.remedy-message[data-cash-step]').count(),0);assert.equal(await f.locator('.remedy-bank-flow animateMotion').count(),0);assert.match(await f.locator('.remedy-message').innerText(),/先还旧账/);}
  else {await f.waitForFunction(()=>{const m=document.querySelector('.remedy-message');return m.dataset.cashStep==='borrow'&&m.dataset.wallet==='30';});await page.screenshot({path:path.join(output,'cash-story-'+spec.width+'-borrow.png'),fullPage:true});await check(f,[['wages',20,20],['borrow',10,30],['shopping',30,0]]);}
  const first=await save(page);await f.locator('.remedy-receipt>summary').click();const replay=f.getByRole('button',{name:'重看本轮收支 ↺',exact:true});assert((await replay.boundingBox()).height>=44);
  await observe(f);await replay.press('Enter');assert.deepEqual(await save(page),first,'replaying a receipt cannot pay, produce or progress');
  if(spec.reduced){await f.locator('.remedy-message[data-cash-step=summary]').waitFor();assert.equal(await f.locator('.remedy-message').innerText(),'买到30份 · 清单30份');assert.match(await f.locator('.remedy-message').getAttribute('title'),/工资20.*借款10.*买到30/s);assert.equal(await f.locator('.remedy-wallet').getAttribute('data-wallet'),'0');assert.equal(await f.locator('.remedy-wallet').isVisible(),true);assert.equal(await f.locator('.remedy-sequence-symbol').count(),0);await storyDone(f);}
  else await check(f,[['wages',20,20],['borrow',10,30],['shopping',30,0]]);
  await observe(f);await replay.click();assert(await f.locator('[data-gesture-target=credit]').isEnabled(),'replaying cannot hold up the next move');assert.equal(await f.locator('.remedy-message[data-cash-step]').count(),1);await f.locator('.remedy-receipt>summary').click();await move(page,f,'credit',2);
  if(!spec.reduced){await f.waitForFunction(()=>{const m=document.querySelector('.remedy-message');return m.dataset.cashStep==='repay'&&m.dataset.wallet==='8';});await page.screenshot({path:path.join(output,'cash-story-'+spec.width+'-bill.png'),fullPage:true});await check(f,[['wages',20,20],['repay',12,8],['borrow',10,18],['shopping',18,0]],2);}
  else {await f.waitForTimeout(2500);assert.equal(await f.locator('.remedy-message[data-cash-step]').count(),0);assert.match(await f.locator('.remedy-message').innerText(),/试一次逆风.*旧账/s);}
  if(!await f.locator('.remedy-tools').evaluate(n=>n.open))await f.locator('.remedy-tools>summary').click();await f.getByTestId('remedy-prepare-normal').click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).remedyLabs.consumption.thirdOutlook==='normal',PROLOGUE_STORAGE_KEY);await settled(f);assert.equal((await save(page)).remedyLabs.consumption.thirdOutlook,'normal');
  await observe(f);await move(page,f,'credit',3);await storyDone(f);await f.getByRole('button',{name:'如果工资少了一半？ →',exact:true}).click();await f.getByTestId('remedy-impact').waitFor();
  if(!spec.reduced)await check(f,[['wages',20,20],['repay',12,8],['borrow',10,18],['shopping',18,0],['wages',10,10],['repay',10,0],['shopping',0,0]]);
  assert.equal(await f.locator('.remedy-bill').getAttribute('data-stopped'),'true');assert.equal(await f.locator('.remedy-bank-flow [data-payment=borrow]').count(),0);
  await observe(f);const before=(await save(page)).remedyLabs.consumption.history;await f.waitForFunction(()=>!document.querySelector('[data-gesture-target=raise]').disabled);await f.locator('[data-gesture-target=raise]').click();await f.locator('.remedy-battle[data-beat=free]').waitFor();
  if(!spec.reduced){await page.screenshot({path:path.join(output,'cash-story-'+spec.width+'-counter.png'),fullPage:true});await check(f,[['wages',20,20],['repay',12,8],['shopping',8,0]]);}assert.deepEqual((await save(page)).remedyLabs.consumption.history,before);
  const normalRecords=await save(page);await f.locator('.remedy-receipt>summary').click();await f.getByRole('button',{name:'重看本轮收支 ↺',exact:true}).click();await f.getByRole('button',{name:'收下这张处方的教训 →',exact:true}).click();await f.locator('.remedy-card').first().waitFor();
  await f.waitForTimeout(2500);assert.equal(await f.locator('.remedy-message,.remedy-sequence-symbol').count(),0,'an old replay cannot overwrite the menu');assert.deepEqual((await save(page)).remedyLabs,normalRecords.remedyLabs);
  await f.locator('.remedy-card[data-route=consumption]').click();await settled(f);await storyDone(f);const savedRun=(await save(page)).remedyLabs.consumption;await page.reload();const restored=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await restored.locator('body[data-ready=true]').waitFor();await storyDone(restored);assert.deepEqual((await save(page)).remedyLabs.consumption,savedRun);
  results.push({width:spec.width,offline:!!spec.offline,reduced:!!spec.reduced,fundedSequence:true,stagedFaces:!spec.reduced,staticReducedSummary:!!spec.reduced,actualVisibleWallet:true,shortCues:true,stampReturnsAfterCash:true,readOnlyReplay:true,replayAllowsNextMove:true,staleReplayCancelled:true,refresh:true});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html'))),'build changed during QA');
 const report={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,passed:true,results,errors,external};await fs.writeFile(path.join(output,'remedy-household-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){for(const ctx of browser.contexts())for(const p of ctx.pages())await p.screenshot({path:path.join(output,'cash-story-failure-'+p.viewportSize().width+'.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await browser.close();await new Promise(r=>server.close(r));}
