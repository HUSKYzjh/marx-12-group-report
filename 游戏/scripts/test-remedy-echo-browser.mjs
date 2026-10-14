/** Real repeated input, never fabricated save data or forced clocks. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {remedyAccounts} from '../lib/remedy-lab.ts';
const observe=process.argv.includes('--observe'),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),bytes=await fs.readFile(path.join(root,'build/index.html'));
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const server=http.createServer((_,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,output=path.join(root,'outputs/relief-qa');await fs.mkdir(output,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
const save=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),PROLOGUE_STORAGE_KEY);
const settled=f=>f.waitForFunction(()=>!document.body.dataset.transition);
async function frame(p){const f=await(await p.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();await settled(f);return f;}
async function press(node,spec){if(spec.keyboard)await node.press('Enter');else if(spec.width<600)await node.tap();else await node.click();}
async function move(p,f,route,mode,n,spec){
 const before=JSON.stringify((await save(p)).remedyLabs[route]);
 await settled(f);const node=f.locator('[data-gesture-target="'+mode+'"]');await f.waitForFunction(mode=>{const b=document.querySelector('[data-gesture-target="'+mode+'"]');return b&&!b.disabled;},mode);await press(node,spec);
 await p.waitForFunction(({key,route,n,mode,before})=>{const lab=JSON.parse(localStorage.getItem(key)).remedyLabs[route],last=lab.comparisons.at(-1)??lab.history.at(-1);return JSON.stringify(lab)!==before&&lab.history.length===n&&last?.mode===mode;},{key:PROLOGUE_STORAGE_KEY,route,n,mode,before});await f.locator('.remedy-scene[data-round="'+n+'"]').waitFor();await settled(f);
}
const geometry=f=>f.locator('.gesture-zone').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));
function stable(before,after){for(let i=0;i<before.length;i++)for(const k of ['x','y','width','height'])assert(Math.abs(before[i][k]-after[i][k])<1,JSON.stringify({k,before,after}));}
try{
 for(const spec of observe?[{width:320,reduced:true}]:[{width:320,keyboard:true},{width:390,reduced:true,offline:true},{width:1280}])for(const route of observe?['investment']:['consumption','investment','exports']){
  const context=await browser.newContext({viewport:{width:spec.width,height:960},reducedMotion:spec.reduced?'reduce':'no-preference',hasTouch:spec.width<600});
  await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||spec.offline&&u===offline)return r.continue();external.push(u);return r.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(spec.offline?offline:url);let f=await frame(page);
  await f.locator('#dots [data-stage="4"]').click();await f.locator('.remedy-card').first().waitFor();await settled(f);await f.locator('.remedy-card[data-route="'+route+'"]').click();await f.locator('.gesture-zone').first().waitFor();
  const [first,other]={consumption:['credit','raise'],investment:['expand','replace'],exports:['single','diverse']}[route];
  for(let n=1;n<=3;n++){await move(page,f,route,first,n,spec);if(!observe&&n<3)assert.equal(await f.locator('.remedy-echo-marker').count(),0,'same strategy on a genuinely later period must remain a real move');}
  await f.waitForFunction(()=>!document.querySelector('.remedy-message').dataset.cashStep);await f.locator('.remedy-battle[data-beat=respond]').waitFor();
  await page.evaluate(()=>{window.__remedyObserved=[];window.addEventListener('message',e=>{if(e.data?.app==='trust-adaptation'&&e.data.type==='action'&&e.data.action?.type==='REMEDY')window.__remedyObserved.push(e.data.action.action);});});
  if(!observe)await press(f.locator('.remedy-guess[data-guess-target=stock]'),spec);
  const before=await save(page),shape=await geometry(f),question=await f.locator('.remedy-message').textContent();await f.waitForFunction(mode=>!document.querySelector('[data-gesture-target="'+mode+'"]').disabled,first);
  if(observe){
   await press(f.locator('[data-gesture-target="'+first+'"]'),spec);await f.waitForFunction(mode=>!document.querySelector('[data-gesture-target="'+mode+'"]').disabled,first);await settled(f);
   const after=await save(page);console.log(JSON.stringify({observe:true,route,comparisonsBefore:before.remedyLabs[route].comparisons.length,comparisonsAfter:after.remedyLabs[route].comparisons.length,cashBefore:remedyAccounts(before.remedyLabs[route]).display.world.cash.shop,cashAfter:remedyAccounts(after.remedyLabs[route]).display.world.cash.shop,messageBefore:question,messageAfter:await f.locator('.remedy-message').textContent(),canContinue:remedyAccounts(after.remedyLabs[route]).canContinue,buttonsEnabled:await f.locator('.gesture-zone').evaluateAll(ns=>ns.every(n=>!n.disabled))}));await context.close();continue;
  }
  assert.equal(await f.locator('[data-gesture-target="'+first+'"] .remedy-echo-marker').innerText(),'刚才');assert.equal(await f.locator('[data-gesture-target="'+other+'"] .remedy-echo-marker').count(),0);
  assert(await f.locator('.gesture-zones').evaluate(n=>getComputedStyle(n).overflow==='visible'),'the above-border marker must not be clipped by the move grid');
  for(let i=0;i<2;i++){await press(f.locator('[data-gesture-target="'+first+'"]'),spec);await f.locator('.remedy-message[data-inspecting=true]').waitFor();assert.match(await f.locator('.remedy-message').innerText(),/试过.*换招.*分量/);assert.deepEqual(await save(page),before);assert.deepEqual(await page.evaluate(()=>window.__remedyObserved),[]);assert.equal(await f.locator('.gesture-zone').evaluateAll(ns=>ns.every(n=>!n.disabled)),true);assert.equal(await f.locator('.remedy-guess[data-guess-target=stock]').getAttribute('data-state'),'draft');assert.equal(await f.locator('.remedy-guess[data-guess-target=stock]').getAttribute('data-choice'),'empty');stable(shape,await geometry(f));}
  await page.screenshot({path:path.join(output,'echo-'+spec.width+'-'+route+'.png'),fullPage:true});await f.waitForFunction(()=>!document.querySelector('.remedy-message').dataset.inspecting);assert.equal(await f.locator('.remedy-message').textContent(),question);stable(shape,await geometry(f));
  await press(f.locator('[data-gesture-target="'+first+'"]'),spec);await move(page,f,route,other,3,spec);await f.locator('.remedy-battle[data-beat=free]').waitFor();assert(remedyAccounts((await save(page)).remedyLabs[route]).canContinue);await f.waitForFunction(()=>!document.querySelector('.remedy-message').dataset.cashStep);assert.equal(await f.locator('.remedy-guess[data-guess-target=stock]').getAttribute('data-state'),'revealed');const actual=(await save(page)).remedyLabs[route];assert.equal(actual.comparisons.length,1,'one different actual reply, no repeated baseline in the save');
  await page.reload();f=await frame(page);assert.equal(await f.locator('.remedy-counter>summary').count(),0);assert(await f.locator('[data-gesture-target="'+other+'"]').isVisible());assert.equal(await f.locator('[data-gesture-target="'+other+'"] .remedy-echo-marker').innerText(),'刚才');
  if(!await f.locator('.remedy-tools').evaluate(n=>n.open))await f.locator('.remedy-tools>summary').click();await press(f.getByRole('button',{name:'增加药方力度',exact:true}),spec);await page.waitForFunction(({key,route})=>JSON.parse(localStorage.getItem(key)).remedyLabs[route].dose===3,{key:PROLOGUE_STORAGE_KEY,route});await settled(f);assert.equal(await f.locator('.remedy-echo-marker').count(),0,'a different proposed dose is not the same trial');
  assert.deepEqual(remedyAccounts((await save(page)).remedyLabs[route]),remedyAccounts(actual));await move(page,f,route,other,3,spec);const changed=(await save(page)).remedyLabs[route];assert.equal(changed.comparisons.length,2);assert.equal(changed.comparisons.at(-1).dose,3);assert.deepEqual(changed.history,before.remedyLabs[route].history);assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  results.push({width:spec.width,route,offline:!!spec.offline,reduced:!!spec.reduced,keyboard:!!spec.keyboard,repeatedLaterPeriodsAllowed:true,currentTrialReadOnly:true,noRepeatCommand:true,noButtonLock:true,stable:true,immediateCounter:true,actualDoseChange:true,refresh:true});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html'))));
 if(!observe){const report={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,passed:true,results,errors,external};await fs.writeFile(path.join(output,'remedy-echo-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
}catch(e){for(const ctx of browser.contexts())for(const p of ctx.pages())await p.screenshot({path:path.join(output,'echo-failure-'+p.viewportSize().width+'.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await browser.close();await new Promise(r=>server.close(r));}
