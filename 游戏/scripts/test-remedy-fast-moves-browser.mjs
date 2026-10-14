/** Consecutive real inputs, with no animation wait or injected game state. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {remedyAccounts} from '../lib/remedy-lab.ts';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const build=new URL('../build/index.html',import.meta.url),bytes=await fs.readFile(build);
const server=http.createServer((_,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(fileURLToPath(new URL('../offline/技术红利去了哪里.html',import.meta.url))).href;
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),results=[],errors=[];
const modes={consumption:['credit','raise'],investment:['expand','replace'],exports:['single','diverse']};
const read=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),PROLOGUE_STORAGE_KEY);
async function waitRound(f,round){await f.waitForFunction(n=>document.querySelector('.remedy-scene')?.dataset.round===String(n),round);}
async function unlocked(f){assert.deepEqual(await f.locator('.gesture-zone').evaluateAll(nodes=>nodes.map(n=>n.disabled)),[false,false],'a new receipt unlocks immediately, even while animation is playing');}
try{
 for(const spec of [{width:320,keyboard:true},{width:390,touch:true,offline:true,reduced:true},{width:1280}])for(const route of Object.keys(modes)){
  const ctx=await browser.newContext({viewport:{width:spec.width,height:960},hasTouch:!!spec.touch,reducedMotion:spec.reduced?'reduce':'no-preference'}),p=await ctx.newPage();
  p.on('pageerror',e=>errors.push(e.message));await p.goto(spec.offline?offline:url);
  const f=await(await p.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();
  await f.locator('#dots [data-stage="4"]').click();await f.locator('.remedy-card').first().waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);
  await f.locator('.remedy-card[data-route="'+route+'"]').click();await f.locator('.gesture-zone').first().waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);
  const [first,other]=modes[route],target=mode=>f.locator('[data-gesture-target="'+mode+'"]');
  if(spec.keyboard){
   await target(first).focus();await p.keyboard.down('Enter');await waitRound(f,1);await unlocked(f);
   const before=JSON.stringify(await read(p));await target(other).focus();await p.keyboard.down('Enter');await p.keyboard.up('Enter');
   assert.equal(JSON.stringify(await read(p)),before,'holding Enter across replacement cannot spend twice');
   await target(other).press('Enter');
  }else{
   // dblclick generates two native clicks, including a second click after the
   // first receipt may already have replaced the clicked move card.
   await target(first).dblclick({delay:80});await waitRound(f,1);await unlocked(f);
   assert.equal((await read(p)).remedyLabs[route].history.length,1,'a double-click settles exactly once');
   if(spec.touch)await target(other).tap();else await target(other).click();
  }
  await waitRound(f,2);await unlocked(f);
  if(spec.keyboard)await target(first).press('Enter');else if(spec.touch)await target(first).tap();else await target(first).click();
  await waitRound(f,3);await unlocked(f);
  const receipt=(await read(p)).remedyLabs[route];assert.equal(receipt.history.length,3);assert.equal(remedyAccounts(receipt).canContinue,false);
  if(spec.keyboard)await target(other).press('Enter');else if(spec.touch)await target(other).tap();else await target(other).click();
  await p.waitForFunction(({key,route})=>JSON.parse(localStorage.getItem(key))?.remedyLabs[route]?.comparisons.length===1,{key:PROLOGUE_STORAGE_KEY,route});
  await f.waitForFunction(mode=>document.querySelector('[data-gesture-target="'+mode+'"]')?.dataset.echo==='true',other);await unlocked(f);
  const lab=(await read(p)).remedyLabs[route];assert.deepEqual(lab.history,receipt.history);assert(remedyAccounts(lab).canContinue);
  const frozen=JSON.stringify(await read(p));if(spec.keyboard)await target(other).press('Enter');else if(spec.touch)await target(other).tap();else await target(other).click();
  assert.equal(JSON.stringify(await read(p)),frozen,'repeating the displayed same-period trial is read-only');
  const amounts=remedyAccounts(lab).display.world.cash;for(const amount of Object.values(amounts))assert(Number.isInteger(amount)&&amount>=0);
  results.push({width:spec.width,route,offline:!!spec.offline,reduced:!!spec.reduced,input:spec.keyboard?'keyboard':spec.touch?'touch':'mouse',receiptUnlocksImmediately:true,nativeRepeatSettlesOnce:true,fourConsecutiveMoves:true,echoReadOnly:true});
  await ctx.close();
 }
 assert.deepEqual(errors,[]);assert(bytes.equals(await fs.readFile(build)));assert(bytes.equals(await fs.readFile(new URL('../offline/技术红利去了哪里.html',import.meta.url))));
 const report={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,passed:true,results,errors};
 await fs.writeFile(new URL('../outputs/relief-qa/remedy-fast-moves-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();await new Promise(r=>server.close(r));}
