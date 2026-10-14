import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createDuelServer} from './serve-market-duel.mjs';
import {restoreCourse} from '../public/assets/market-duel/course-model.mjs';
import {ownerEmotion} from '../public/assets/market-duel/owner-art.mjs';
import {readOpeningGuide} from './prologue-battle-browser-gestures.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs'),server=createDuelServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port,out=path.resolve('outputs/shop-course-qa'),key='feast-shop-course-v2';await fs.mkdir(out,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],results=[];
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const widths=process.argv.includes('--mobile')?[390,320]:[1280,390,320],layoutOnly=process.argv.includes('--layout-only');
try{for(const width of widths){
 const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width===390,reducedMotion:width===1280?'no-preference':'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});await page.goto(origin+'/assets/market-duel/battle.html');await page.locator('[data-move="hold"]').waitFor();
 const press=async loc=>{if(width===390)await loc.tap();else if(width===320){await loc.focus();await page.keyboard.press('Enter');}else await loc.click();};
 await readOpeningGuide(page,press);
 const fits=async()=>{
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no overflow '+width);
  const state=(await saved(page)).state;
  for(const id of [0,1]){
   const owner=page.locator(`#figures-${id} .owner`);
   assert.equal(await owner.getAttribute('data-character'),id?'square-parted-hair':'round-monocle');
   assert.equal(await owner.getAttribute('data-mood'),ownerEmotion(state.world.history,id).mood);
  }
  if(await page.locator('#street-panel').isVisible()){
   const crowd=await page.locator('#street-panel').boundingBox(),upper=await page.locator('#figures-1').boundingBox(),lower=await page.locator('#figures-0').boundingBox();
   assert(crowd.y>=upper.y+upper.height,'customers below the rival '+width);
   assert(crowd.y+crowd.height<=lower.y,'customers above the player '+width);
  }
 };
 const idle=async()=>page.waitForFunction(()=>!document.querySelector('#restart').disabled);
 const play=async action=>{const before=(await saved(page)).state;await press(page.locator(`[data-move="${action}"]`));if(width===1280&&before.mode==='steady'&&before.world.day===0){await page.locator('#banner').waitFor({state:'visible'});assert.equal((await saved(page)).state.world.day,0);}await page.waitForFunction(({key,day})=>JSON.parse(localStorage.getItem(key)).state.world.day===day+1,{key,day:before.world.day});await idle();const now=(await saved(page)).state;assert.deepEqual(restoreCourse(now),now);await fits();};
 await fits();await page.screenshot({path:path.join(out,width+'-steady.png'),fullPage:true});assert.equal((await saved(page)).state.world.day,0);
 for(let i=0;i<3;i++){await play('hold');if(i<2)await press(page.locator('#advance'));}assert.equal((await saved(page)).state.world.shops[0].cash,51);await page.screenshot({path:path.join(out,width+'-steady-result.png'),fullPage:true});
 await press(page.locator('#advance'));await press(page.locator('#next-scene'));assert.equal((await saved(page)).state.mode,'waves');assert.equal((await saved(page)).state.world.shops[0].cash,36);
 for(const [i,action]of ['hold','hold','more','hold','hold'].entries()){await play(action);if(i===2){const r=(await saved(page)).state.world.history.at(-1);assert.equal(r.made[0],6);assert.equal(r.scheduled[0],10);}if(i===3){const w=(await saved(page)).state.world;assert.equal(w.history.at(-1).demand,6);assert.equal(w.history.at(-1).made[0],10);await page.screenshot({path:path.join(out,width+'-delay.png'),fullPage:true});await press(page.locator('#receipt'));assert((await page.locator('#detail-copy').innerText()).includes('工资'));await press(page.locator('#detail-close'));await page.reload();await page.locator('#advance').waitFor();assert.deepEqual((await saved(page)).state.world,w);}if(i<4)await press(page.locator('#advance'));}
 await press(page.locator('#advance'));await press(page.locator('#next-scene'));assert.equal((await saved(page)).state.mode,'source');assert(await page.locator('#advance').isHidden());
 const targets=await page.locator('[data-trace]').evaluateAll(ns=>ns.map(n=>n.dataset.trace));for(const id of targets){await press(page.locator(`[data-trace="${id}"]`));await page.locator('#money-route path.shopping').waitFor();}
 assert.equal((await saved(page)).state.traced.length,2);if(width<700){const button=await page.locator('#advance').boundingBox(),copy=await page.locator('#subline').boundingBox();assert(button.y>=copy.y+copy.height,'trace continuation clears the sentence');}await page.screenshot({path:path.join(out,width+'-wage-route.png'),fullPage:true});if(layoutOnly){results.push({width,scope:'first two stages and wage trace layout only',fixedProfitable:true,delayedProduction:true,bothWageRoutes:true,noOverflow:true});await context.close();continue;}const paid=(await saved(page)).state.world;await page.reload();await page.locator('#advance').waitFor();assert.deepEqual((await saved(page)).state.world,paid);await press(page.locator('#advance'));assert.equal((await saved(page)).state.mode,'social');assert.deepEqual((await saved(page)).state.world,paid);
 for(const a of ['price','labor','oven','labor','hold','hold','hold','hold']){await play(a);await press(page.locator('#advance'));}assert.equal((await saved(page)).state.world.day,9);await press(page.locator('#next-scene'));assert.equal((await saved(page)).state.mode,'done');await page.screenshot({path:path.join(out,width+'-ending.png'),fullPage:true});await press(page.locator('#rules-open'));assert((await page.locator('#detail-copy').innerText()).includes('工资是许多家庭'));await press(page.locator('#detail-close'));await press(page.locator('#retry'));assert.equal((await saved(page)).state.world.day,1);await play('price');await press(page.locator('#undo'));assert.equal((await saved(page)).state.world.day,1);assert.deepEqual(restoreCourse((await saved(page)).state),(await saved(page)).state);await fits();
 results.push({width,input:width===390?'touch':width===320?'keyboard':'mouse',fixedProfitable:true,delayedProduction:true,bothWageRoutes:true,sourceNoDoublePay:true,allThreeStages:true,refresh:true,rewind:true,stateInjection:false});await context.close();
}assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,layoutOnly?'report-layout.json':widths.length===3?'report.json':'report-mobile.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));}catch(e){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}
