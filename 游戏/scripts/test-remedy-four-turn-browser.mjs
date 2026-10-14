/** Four actual consecutive turns, optional same-base retry, no injected save. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {remedyAccounts} from '../lib/remedy-lab.ts';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url)),bytes=await fs.readFile(path.join(root,'build/index.html')),out=path.join(root,'outputs/relief-qa');
const server=http.createServer((_,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href;
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),results=[],errors=[],external=[];
const modes={consumption:['credit','raise'],investment:['expand','replace'],exports:['single','diverse']};
const read=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),PROLOGUE_STORAGE_KEY);
const settled=f=>f.waitForFunction(()=>!document.body.dataset.transition);
async function frame(p){const f=await(await p.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();await settled(f);return f;}
async function press(n,spec){if(spec.keyboard)await n.press('Enter');else if(spec.touch)await n.tap();else await n.click();}
const target=(f,mode)=>f.locator('[data-gesture-target="'+mode+'"]');
async function round(f,n){await f.waitForFunction(n=>document.querySelector('.remedy-scene:not(.remedy-preview-scene)')?.dataset.round===String(n),n);}
async function changed(p,before){await p.waitForFunction(({k,before})=>localStorage.getItem(k)!==before,{k:PROLOGUE_STORAGE_KEY,before});}
async function geometry(f){assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));for(const button of await f.locator('.remedy-commands button:visible,.remedy-commands summary:visible').all())assert((await button.boundingBox()).height>=44,'all default commands have usable touch targets');return (await f.locator('.remedy-battle').boundingBox()).height;}
async function data(f,r){
 assert.equal(await f.locator('.remedy-pressure-status>.remedy-meter').getAttribute('aria-valuenow'),String(r.stock));
 if(r.control.mode==='credit'||r.control.mode==='raise'){
  const bought=r.payments.filter(p=>p.reason==='家庭购物'&&p.from==='households').reduce((n,p)=>n+p.amount,0);
  assert.equal(await f.locator('.remedy-cash-status').count(),0,'production cash belongs to the optional ledger');
  assert.equal(await f.locator('.remedy-shopping-status>.remedy-meter').getAttribute('aria-valuenow'),String(bought));
 }else assert.equal(await f.locator('.remedy-cash-status>.remedy-meter').getAttribute('aria-valuenow'),String(r.world.cash.shop));
 assert.equal(await f.locator('.remedy-leftovers').getAttribute('aria-label'),'本期做'+r.made+'份、卖'+r.sold+'份，待售库存'+r.stock+'份。');
}
try{
 await fs.mkdir(out,{recursive:true});
 for(const spec of [{width:320,keyboard:true},{width:390,touch:true,offline:true,reduced:true},{width:1280}])for(const route of Object.keys(modes)){
  const ctx=await browser.newContext({viewport:{width:spec.width,height:960},hasTouch:!!spec.touch,reducedMotion:spec.reduced?'reduce':'no-preference'});
  await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||spec.offline&&u===offline)return r.continue();external.push(u);return r.abort();});
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(spec.offline?offline:url);let f=await frame(p);
  await f.locator('#dots [data-stage="4"]').click();await f.locator('.remedy-card').first().waitFor();await settled(f);await f.locator('.remedy-card[data-route="'+route+'"]').click();await f.locator('.gesture-zone').first().waitFor();await settled(f);
  const [first,other]=modes[route],response=spec.keyboard?first:other;assert.equal(await f.locator('.remedy-track>li').count(),4);const opening=await geometry(f);assert(opening<570);
  for(let n=1;n<=3;n++){
   const before=JSON.stringify(await read(p));await press(target(f,first),spec);await changed(p,before);await round(f,n);assert.equal((await read(p)).remedyLabs[route].history.length,n);
   for(const button of await f.locator('.gesture-zone').all())assert(await button.isEnabled());
  }
  const thirdLab=(await read(p)).remedyLabs[route],third=remedyAccounts(thirdLab).display;
  assert.equal(third.control.outlook,'adverse');assert.equal(thirdLab.followups,undefined);assert.equal(await f.locator('.remedy-track li[aria-current=step]').textContent(),'4');
  assert.equal(await target(f,first).getAttribute('data-echo'),null,'the same move is a valid next turn, not an echo of turn three');
  await data(f,third);await geometry(f);
  // Guessing is optional, and this guess must be checked against turn FOUR.
  if(route!=='consumption')await press(f.locator('[data-guess-target=stock]'),spec);
  const before=JSON.stringify(await read(p));
  if(spec.keyboard){await target(f,response).focus();await p.keyboard.down('Enter');await round(f,4);await f.locator('.remedy-next').focus();await p.keyboard.down('Enter');await p.keyboard.up('Enter');}
  else await target(f,response).dblclick({delay:80});
  await changed(p,before);await round(f,4);
  let lab=(await read(p)).remedyLabs[route],a=remedyAccounts(lab);const r=a.display;
  assert.equal(lab.followups.length,1,'double-click cannot settle twice or click through into the exit');assert.equal(lab.comparisons.length,0);assert.equal((await read(p)).reliefRoute,route);
  assert.equal(r.round,4);assert.equal(r.stock-r.newStock,third.stock);assert.deepEqual(a.followupBase.world,third.world);assert(a.canContinue);
  assert.deepEqual(lab.history,thirdLab.history);await data(f,r);
  if(route==='consumption')assert(r.repayment>=third.debt,'turn four actually pays the prior bill');
  if(route==='investment'){assert.equal(r.made,50+third.capacity);assert.equal(Number(await f.locator('.remedy-machine-groups').getAttribute('data-active-capacity')),third.capacity);}
  if(route==='exports')assert.equal(r.exports,response==='diverse'?5:0);
  if(route!=='consumption')assert.equal(await f.locator('[data-guess-target=stock]').getAttribute('data-actual'),r.stock===0?'empty':'left');
  assert.equal(await f.locator('.remedy-fourth-retry').evaluate(n=>n.open),false);for(const button of await f.locator('.gesture-zone').all())assert.equal(await button.isVisible(),false);
  assert.equal(await f.locator('.remedy-conditions').count(),0,'no mandatory after-battle condition menu');
  const finish=f.getByRole('button',{name:'收下这张处方的教训 →',exact:true}),nextBox=await finish.boundingBox(),battle=await f.locator('.remedy-battle').boundingBox();assert(nextBox.x>battle.x+battle.width*.25);const finishHeight=await geometry(f);assert(finishHeight<=opening+80);
  await f.waitForFunction(()=>!document.querySelector('.remedy-message')?.dataset.cashStep);await p.screenshot({path:path.join(out,'four-turn-'+spec.width+'-'+route+'-finish.png'),fullPage:true});
  let frozen=JSON.stringify(await read(p));await p.reload();f=await frame(p);assert.equal(JSON.stringify(await read(p)),frozen);await round(f,4);assert.equal(await f.locator('.remedy-scene').getAttribute('data-animate'),'false');assert.equal(await f.locator('.remedy-fourth-retry').evaluate(n=>n.open),false);
  await press(f.getByRole('button',{name:'重打第4回合，前三回合不变',exact:true}),spec);assert.equal(await f.locator('.remedy-fourth-retry').evaluate(n=>n.open),true);assert.equal(JSON.stringify(await read(p)),frozen);
  // Repeating this exact fourth trial is a read-only hint, not period five.
  await press(target(f,response),spec);assert.equal(JSON.stringify(await read(p)),frozen);const alternate=response===first?other:first;
  await press(target(f,alternate),spec);await changed(p,frozen);await f.waitForFunction(()=>!document.querySelector('.remedy-fourth-retry').open);
  lab=(await read(p)).remedyLabs[route];a=remedyAccounts(lab);assert.equal(lab.followups.length,2);assert.equal(a.display.round,4);assert.deepEqual(a.followups[0],r);assert.deepEqual(a.followupBases[0].world,a.followupBases[1].world);assert.deepEqual(lab.history,thirdLab.history);
  await data(f,a.display);await geometry(f);frozen=JSON.stringify(await read(p));
  await press(f.locator('.remedy-fourth-retry>summary'),spec);const peek=f.getByTestId('remedy-comparison');assert(await peek.isVisible());await peek.press('Enter');await f.locator('.remedy-preview-scene').waitFor();assert.equal(await f.locator('.remedy-preview-scene').getAttribute('data-round'),'4');assert.equal(JSON.stringify(await read(p)),frozen);await peek.press('Escape');await f.waitForFunction(()=>!document.querySelector('.remedy-preview-scene'));
  await press(f.getByRole('button',{name:'收下这张处方的教训 →',exact:true}),spec);await f.locator('.remedy-card').first().waitFor();await settled(f);assert((await read(p)).reliefCompleted.includes(route));
  const card=f.locator('.remedy-card[data-route="'+route+'"]');assert.equal(await card.getAttribute('data-recorded'),'true');assert.match(await card.getAttribute('aria-label'),new RegExp('剩'+a.display.stock+'份'));
  await press(f.getByRole('button',{name:'先继续故事 →',exact:true}),spec);await p.waitForFunction(k=>JSON.parse(localStorage.getItem(k))?.scene==='epilogue',PROLOGUE_STORAGE_KEY);await settled(f);
  await f.locator('#dots [data-stage="4"]').click();await f.locator('.remedy-card').first().waitFor();await settled(f);await press(f.locator('.remedy-card[data-route="'+route+'"]'),spec);await round(f,4);await settled(f);
  frozen=JSON.stringify(await read(p));await press(f.getByRole('button',{name:'从第1回合重打，保留原记录',exact:true}),spec);await changed(p,frozen);await round(f,0);
  const replay=(await read(p)).remedyLabs[route];assert.equal(replay.followups,undefined);assert.equal(replay.archives[0].followups.length,2);assert.equal((await read(p)).reliefCompleted.includes(route),false);
  frozen=JSON.stringify(await read(p));await p.reload();await frame(p);assert.equal(JSON.stringify(await read(p)),frozen);
  results.push({width:spec.width,route,offline:!!spec.offline,reduced:!!spec.reduced,opening,finishHeight,fourConsecutiveFundedTurns:true,sameStrategyMayRespond:!!spec.keyboard,previousDebtAndEquipmentCarry:true,nativeRepeatCannotClickThrough:true,optionalGuessUsesFourthReceipt:route!=='consumption',consumptionPurchaseFocus:route==='consumption',defaultMovesFoldAfterBattle:true,optionalRetryKeepsThirdBase:true,retryIsNotFifthPeriod:true,oldFourthPeekReadOnly:true,refreshAndArchivePreserveReceipts:true,shortStoryPath:true});console.log('PASS '+spec.width+' '+route);await ctx.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html'))));
 const report={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,passed:true,results,errors,external};await fs.writeFile(path.join(out,'remedy-four-turn-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(out,'four-turn-failure-'+p.viewportSize().width+'.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await browser.close();await new Promise(r=>server.close(r));}
