/** Optional bets made through real buttons, graded only against actual accounts. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {remedyAccounts} from '../lib/remedy-lab.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),bytes=await fs.readFile(path.join(root,'build/index.html'));
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,output=path.join(root,'outputs/relief-qa');await fs.mkdir(output,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
const save=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),PROLOGUE_STORAGE_KEY);
async function frame(p){const f=await(await p.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();return f;}
async function settled(f){await f.waitForFunction(()=>!document.body.dataset.transition);}
async function click(l,key){if(key)await l.press('Enter');else await l.click();}
async function send(p,f,l,key){const before=JSON.stringify(await save(p));await click(l,key);await p.waitForFunction(({key,before})=>localStorage.getItem(key)!==before,{key:PROLOGUE_STORAGE_KEY,before});await settled(f);}
const guess=(f,target)=>f.locator('.remedy-guess[data-guess-target="'+target+'"]');
async function pick(f,target,choice,key){const b=guess(f,target);for(let n=0;n<3;n++){if(await b.getAttribute('data-choice')===choice)return;await click(b,key);}assert.equal(await b.getAttribute('data-choice'),choice);}
async function move(p,f,mode,key){await f.waitForFunction(mode=>!document.querySelector('[data-gesture-target="'+mode+'"]').disabled,mode);await send(p,f,f.locator('[data-gesture-target="'+mode+'"]'),key);await f.waitForFunction(()=>!document.querySelector('.remedy-message').dataset.cashStep);}
async function checkGrade(p,f,route,choices){const r=remedyAccounts((await save(p)).remedyLabs[route]).display;
 for(const [target,choice]of Object.entries(choices)){const b=guess(f,target),actual=target==='stock'?(r.stock===0?'empty':'left'):(r.cashChange>0?'up':'not-up');assert.equal(await b.getAttribute('data-state'),'revealed');assert.equal(await b.getAttribute('data-actual'),actual);assert.equal(await b.getAttribute('data-matched'),String(choice===actual));assert.match(await b.getAttribute('aria-label'),/刚才猜.*实际/);}
 assert.equal(Object.values(r.world.cash).reduce((a,b)=>a+b,0),420);assert(!JSON.stringify((await save(p)).remedyLabs[route]).includes('guess'));
}
async function geometry(f){return f.locator('.remedy-status').evaluateAll(cards=>cards.map(card=>{
 const button=card.querySelector('.remedy-guess'),b=button.getBoundingClientRect(),c=card.getBoundingClientRect();
 const title=card.querySelector(':scope>span'),range=document.createRange();range.selectNodeContents(title);const t=range.getBoundingClientRect();
 const strong=card.querySelector(':scope>strong'),numbers=[...strong.querySelectorAll('.money-coin')].map(n=>n.getBoundingClientRect()),walker=document.createTreeWalker(strong,NodeFilter.SHOW_TEXT);
 for(let n=walker.nextNode();n;n=walker.nextNode()){if(n.parentElement.closest('.money-spoken-unit'))continue;range.selectNodeContents(n);numbers.push(...range.getClientRects());}
 const hit=r=>r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top;
 return {width:b.width,height:b.height,inside:b.left>=c.left&&b.right<=c.right&&b.top>=c.top&&b.bottom<=c.bottom,titleOverlap:hit(t),numberOverlap:numbers.some(hit),x:b.x,y:b.y};
}));}
try{
 for(const spec of [{width:320,key:true},{width:390,offline:true,reduced:true},{width:1280}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:960},reducedMotion:spec.reduced?'reduce':'no-preference',hasTouch:spec.width<600});
  await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||spec.offline&&u===offline)return r.continue();external.push(u);return r.abort();});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(spec.offline?offline:url);let f=await frame(p);await f.locator('#dots [data-stage="4"]').click();await f.locator('.remedy-card').first().waitFor();await settled(f);
  for(const [route,first,counter]of [['consumption','credit','raise'],['investment','expand','replace'],['exports','single','diverse']]){
   await send(p,f,f.locator('.remedy-card[data-route="'+route+'"]'),spec.key);await guess(f,'stock').waitFor();const initial=await save(p);
   const boxes=await geometry(f);for(const b of boxes){assert(b.width>=44&&b.height>=44&&b.inside);assert(!b.titleOverlap&&!b.numberOverlap,JSON.stringify({spec,route,b}));}
   assert((await f.locator('.remedy-battle').boundingBox()).height<570);
   for(const [target,a,b]of [['stock','empty','left'],['cash','up','not-up']]){await click(guess(f,target),spec.key);assert.equal(await guess(f,target).getAttribute('data-choice'),a);await click(guess(f,target),spec.key);assert.equal(await guess(f,target).getAttribute('data-choice'),b);await click(guess(f,target),spec.key);assert.equal(await guess(f,target).getAttribute('data-state'),'idle');}
   assert.deepEqual(await save(p),initial,'guessing is not an economic or saved action');
   await pick(f,'cash','up',spec.key);await f.locator('.remedy-receipt>summary').first().click();await click(f.getByRole('button',{name:'从相同起点再试 ↺',exact:true}),spec.key);await f.waitForFunction(()=>document.querySelector('.remedy-guess[data-guess-target=cash]').dataset.state==='idle');assert.deepEqual(await save(p),initial,'resetting the unchanged opening clears only the prediction');
   await pick(f,'stock','empty',spec.key);await pick(f,'cash','up',spec.key);await move(p,f,first,spec.key);await checkGrade(p,f,route,{stock:'empty',cash:'up'});
   assert.equal(await guess(f,'stock').getAttribute('data-matched'),'true');assert.equal(await guess(f,'cash').getAttribute('data-matched'),'true');
   const b0=await geometry(f);if(!spec.reduced)await p.waitForTimeout(450);const b1=await geometry(f);assert.deepEqual(b1,b0,'only the verdict drawing moves, not its click area');
   const saved1=await save(p);await f.locator('.remedy-receipt>summary').first().click();if(route==='consumption'){await f.getByRole('button',{name:'重看本轮收支 ↺',exact:true}).click();await f.waitForFunction(()=>!document.querySelector('.remedy-message').dataset.cashStep);}assert.deepEqual(await save(p),saved1);await checkGrade(p,f,route,{stock:'empty',cash:'up'});await f.locator('.remedy-receipt>summary').first().click();
   await pick(f,'stock','empty',spec.key);await pick(f,'cash','not-up',spec.key);await move(p,f,first,spec.key);await checkGrade(p,f,route,{stock:'empty',cash:'not-up'});
   assert.equal(await guess(f,'stock').getAttribute('data-matched'),'false');assert.equal(await guess(f,'cash').getAttribute('data-matched'),'false');
   await p.screenshot({path:path.join(output,'prediction-'+spec.width+'-'+route+'-result.png'),fullPage:true});
   await pick(f,'stock','left',spec.key);const saved2=await save(p);await f.locator('.remedy-tools>summary').click();await send(p,f,f.getByTestId('remedy-prepare-normal'),spec.key);assert.equal(await guess(f,'stock').getAttribute('data-choice'),'left');assert.equal(await guess(f,'cash').getAttribute('data-revealing'),'false');
   assert.deepEqual(remedyAccounts((await save(p)).remedyLabs[route]),remedyAccounts(saved2.remedyLabs[route]));
   await p.reload();f=await frame(p);await settled(f);assert.equal(await guess(f,'stock').getAttribute('data-state'),'idle');assert.equal(await guess(f,'cash').getAttribute('data-state'),'idle');assert.equal((await save(p)).remedyLabs[route].history.length,2);assert.equal(await f.locator('.remedy-scene').getAttribute('data-animate'),'false');
   await f.locator('.remedy-tools>summary').click();await send(p,f,f.getByTestId('remedy-prepare-adverse'),spec.key);
   await pick(f,'stock','left',spec.key);await pick(f,'cash','not-up',spec.key);await move(p,f,first,spec.key);await checkGrade(p,f,route,{stock:'left',cash:'not-up'});assert.equal(remedyAccounts((await save(p)).remedyLabs[route]).canContinue,false);
   // The same-period counter needs no bet. Old verdicts must not be regraded.
   await move(p,f,counter,spec.key);for(const target of ['stock','cash'])assert.equal(await guess(f,target).getAttribute('data-state'),'idle');const done=(await save(p)).remedyLabs[route];assert.equal(done.history.length+done.comparisons.length,4);assert(remedyAccounts(done).canContinue);
   await pick(f,'cash','up',spec.key);await send(p,f,f.getByRole('button',{name:'从第1回合重打，保留原记录',exact:true}),spec.key);assert.equal(await guess(f,'cash').getAttribute('data-state'),'idle');assert.equal((await save(p)).remedyLabs[route].history.length,0);assert.equal((await save(p)).remedyLabs[route].archives.length,1);
   assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));results.push({width:spec.width,route,offline:!!spec.offline,keyboard:!!spec.key,geometry:boxes,correctAndWrongPredictions:true,optional:true,readOnlyReceipt:true,draftConditionDoesNotSettle:true,refreshClearsOnlyPrediction:true,rewindClearsPrediction:true,unchangedOpeningResetClearsPrediction:true,fourActualExecutions:true});
   await send(p,f,f.getByRole('button',{name:'先看看别的处方 ↩',exact:true}),spec.key);await f.locator('.remedy-card').first().waitFor();
  }await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html'))));const report={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,passed:true,results,errors,external};await fs.writeFile(path.join(output,'remedy-prediction-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(output,'prediction-failure-'+p.viewportSize().width+'.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await browser.close();await new Promise(r=>server.close(r));}
