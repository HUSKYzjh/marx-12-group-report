/** Play actual turns; upcoming-condition dialogue must survive current cash beats. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {remedyAccounts} from '../lib/remedy-lab.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),bytes=await fs.readFile(path.join(root,'build/index.html'));
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const server=http.createServer((_,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,output=path.join(root,'outputs/relief-qa');await fs.mkdir(output,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),results=[],errors=[],external=[];
const save=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),PROLOGUE_STORAGE_KEY);
const settled=f=>f.waitForFunction(()=>!document.body.dataset.transition);
const cashDone=f=>f.waitForFunction(()=>!document.querySelector('.remedy-message')?.dataset.cashStep);
async function frame(page){const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();await settled(f);return f;}
async function play(page,f,route,mode,n){
 await settled(f);await f.waitForFunction(mode=>{const b=document.querySelector('[data-gesture-target="'+mode+'"]');return b&&!b.disabled;},mode);await f.locator('[data-gesture-target="'+mode+'"]').click();
 await page.waitForFunction(({key,route,n,mode})=>{const lab=JSON.parse(localStorage.getItem(key)).remedyLabs[route],last=lab.comparisons.at(-1)??lab.history.at(-1);return lab.history.length===n&&last?.mode===mode;},{key:PROLOGUE_STORAGE_KEY,route,n,mode});
 await f.locator('.remedy-scene[data-round="'+n+'"]').waitFor();
}
function contained(inner,outer){for(const [a,b,sign] of [['left','left',1],['top','top',1],['right','right',-1],['bottom','bottom',-1]])assert(sign*(inner[a]-outer[b])>=-.6,JSON.stringify({inner,outer,a}));}
try{
 for(const spec of [{width:320},{width:390,offline:true,reduced:true},{width:1280}])for(const route of ['consumption','investment','exports']){
  const context=await browser.newContext({viewport:{width:spec.width,height:960},reducedMotion:spec.reduced?'reduce':'no-preference',hasTouch:spec.width<600});
  await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||spec.offline&&u===offline)return r.continue();external.push(u);return r.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(spec.offline?offline:url);let f=await frame(page);
  await f.locator('#dots [data-stage="4"]').click();await f.locator('.remedy-card').first().waitFor();await settled(f);await f.locator('.remedy-card[data-route="'+route+'"]').click();await f.locator('.gesture-zone').first().waitFor();await settled(f);
  const [first,other]={consumption:['credit','raise'],investment:['expand','replace'],exports:['single','diverse']}[route];
  await play(page,f,route,first,1);await cashDone(f);await play(page,f,route,first,2);
  await f.locator('.remedy-forecast').waitFor();const challenge=f.getByTestId('remedy-challenge'),quote=await challenge.textContent();assert.match(quote,/下一招.*试一次逆风/s);
  if(route==='consumption'&&!spec.reduced){
   await f.waitForFunction(()=>document.querySelector('.remedy-message').dataset.cashStep==='repay');assert.equal(await challenge.textContent(),quote,'current repayment cannot erase the upcoming condition');assert.equal(await f.locator('.remedy-cash-cue').innerText(),'先还账单');
   await page.screenshot({path:path.join(output,'forecast-'+spec.width+'-wallet.png'),fullPage:true});
  }
  await cashDone(f);await settled(f);const saved=await save(page),accounts=remedyAccounts(saved.remedyLabs[route]);assert.equal(accounts.riskSeen,false);assert.equal(accounts.canContinue,false);assert.equal(await f.getByTestId('remedy-impact').count(),0);
  const geometry=await f.locator('.remedy-narration').evaluate(n=>({outer:n.getBoundingClientRect().toJSON(),portrait:n.querySelector('.remedy-forecast-portrait').getBoundingClientRect().toJSON(),bubble:n.querySelector('.remedy-message').getBoundingClientRect().toJSON()}));contained(geometry.portrait,geometry.outer);contained(geometry.bubble,geometry.outer);assert(geometry.portrait.right<=geometry.bubble.left);assert((await f.locator('.remedy-battle').boundingBox()).height<620);assert.equal(await f.locator('.gesture-zones>button').count(),2);assert.equal(await f.locator('.remedy-voice').count(),1);assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:path.join(output,'forecast-'+spec.width+'-'+route+'.png'),fullPage:true});
  for(const outlook of ['normal','supported','adverse']){
   if(!await f.locator('.remedy-tools').evaluate(n=>n.open))await f.locator('.remedy-tools>summary').click();await f.getByTestId('remedy-prepare-'+outlook).click();
   await page.waitForFunction(({key,route,outlook})=>JSON.parse(localStorage.getItem(key)).remedyLabs[route].thirdOutlook===outlook,{key:PROLOGUE_STORAGE_KEY,route,outlook});await settled(f);
   assert.equal(await f.getByTestId('remedy-challenge').getAttribute('data-outlook'),outlook);assert.deepEqual(remedyAccounts((await save(page)).remedyLabs[route]),accounts,'choosing a future condition must not operate or falsify a receipt');
  }
  const beforeRefresh=(await save(page)).remedyLabs[route];await page.reload();f=await frame(page);await f.getByTestId('remedy-challenge').waitFor();assert.equal(await f.locator('.remedy-message[data-cash-step]').count(),0);assert.deepEqual((await save(page)).remedyLabs[route],beforeRefresh);
  await play(page,f,route,first,3);await cashDone(f);await f.locator('.remedy-battle[data-beat=respond]').waitFor();assert.equal(await f.locator('.remedy-forecast').count(),0);assert(await f.getByTestId('remedy-impact').isVisible());assert.equal(remedyAccounts((await save(page)).remedyLabs[route]).canContinue,false);
  await play(page,f,route,other,3);await cashDone(f);await f.locator('.remedy-battle[data-beat=free]').waitFor();await settled(f);assert(remedyAccounts((await save(page)).remedyLabs[route]).canContinue);assert.deepEqual((await save(page)).remedyLabs[route].history.slice(0,2),saved.remedyLabs[route].history);
  await f.getByRole('button',{name:'收下这张处方的教训 →',exact:true}).click();await f.locator('.remedy-card').first().waitFor();await settled(f);await page.waitForFunction(({key,route})=>JSON.parse(localStorage.getItem(key)).reliefCompleted.includes(route),{key:PROLOGUE_STORAGE_KEY,route});assert.equal(await f.locator('.remedy-card[data-route="'+route+'"] .remedy-card-progress').innerText(),'再试 ↺');assert.equal(await f.locator('.remedy-forecast').count(),0);
  results.push({width:spec.width,route,reduced:!!spec.reduced,offline:!!spec.offline,forecastNotReceipt:true,cashDoesNotHideForecast:true,noExtraMove:true,actualCounter:true,completedRetry:true,refresh:true});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html'))));
 const report={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,passed:true,results,errors,external};await fs.writeFile(path.join(output,'remedy-forecast-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){for(const ctx of browser.contexts())for(const p of ctx.pages())await p.screenshot({path:path.join(output,'forecast-failure-'+p.viewportSize().width+'.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await browser.close();await new Promise(r=>server.close(r));}
