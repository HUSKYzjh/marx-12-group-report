import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readOpeningGuide,chooseBattleMove} from './prologue-battle-browser-gestures.mjs';
import {profitReview} from '../public/assets/market-duel/profit-challenge.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url)),remote=process.env.GAME_TEST_URL;
const manifest=JSON.parse(await fs.readFile(path.join(root,'build/hosted/hosting-manifest.json'),'utf8'));
const out=process.env.GAME_TEST_OUTPUT||path.join(root,'outputs/profit-challenge');await fs.mkdir(out,{recursive:true});
const key='technology-dividend:prologue:v1',results=[],errors=[];
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
try{
 for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:width===320?568:900},hasTouch:width<600,reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  let response=await page.goto(remote||pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,{waitUntil:'domcontentloaded',timeout:120000});
  if(remote&&response.status()===404)response=(await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:120000}),page.getByText(/^确[认定]访问$/).click()]))[0];
  if(remote)assert.equal(createHash('sha256').update(await response.body()).digest('hex'),manifest.index_sha256);
  let host=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await host.locator('body[data-ready="true"]').waitFor();await host.waitForFunction(()=>!document.body.dataset.transition);
  await host.locator('#dots button[data-stage="2"]').click();let battle=await(await host.locator('#prologue-battle').elementHandle()).contentFrame();await readOpeningGuide(battle);
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).battle,key);
  async function ready(mode,day){await page.waitForFunction(({key,mode,day})=>{const s=JSON.parse(localStorage.getItem(key)).battle;return s.state.mode===mode&&s.state.world.day===day&&s.view==='choose';},{key,mode,day});}
  async function play(move){
   const s=await saved(),day=s.state.world.day+1;await chooseBattleMove(battle,move);
   await page.waitForFunction(({key,day})=>JSON.parse(localStorage.getItem(key)).battle.state.world.day===day,{key,day});await battle.waitForFunction(()=>!document.querySelector('#restart').disabled);
   if(s.state.mode==='social'){
    const r=(await saved()).state.world.history.at(-1);assert.match(await battle.locator('#message').innerText(),new RegExp('工资支出 '+r.wages[0]+' 枚 · 卖出 '+r.sold[0]+' 个'));
   }
   await battle.locator('#advance').click();await ready(s.state.mode==='social'&&day===9?'done':s.state.mode,day);
  }
  await ready('steady',0);for(let i=0;i<3;i++)await play('hold');await battle.locator('#next-scene').click();await ready('waves',0);for(let i=0;i<5;i++)await play('hold');
  await battle.locator('#next-scene').click();await ready('social',0);
  const start=await saved();assert.equal(start.state.profitChallenge,true);assert.equal(start.state.world.shops[0].cash,36);assert.equal(start.state.world.history.length,0);
  assert.equal(await battle.locator('[data-trace]').count(),0);assert.doesNotMatch(await battle.locator('body').innerText(),/需求，从哪里来|追一笔钱|追踪阿/);
  assert.deepEqual(await battle.locator('#moves>[data-move]').evaluateAll(ns=>ns.map(n=>n.dataset.move)),['hold']);
  assert.equal(await battle.locator('.profit-more').count(),0);assert(await battle.locator('#steady-goal').isVisible());assert.match(await battle.locator('#steady-goal').innerText(),/同样省工资，还能多赚吗/);
  await battle.locator('#console').screenshot({path:path.join(out,`${width}-choices.png`)});
  assert(await battle.locator('[data-move="wage-up"]').isVisible());assert.deepEqual(await saved(),start,'Reading the available adjustments is read-only');
  await play('wage-down');assert.equal((await saved()).state.world.history[0].wages[0],6);assert.equal((await saved()).state.world.shops[0].pending.wage,1);
  await play('price-down');const record=await saved();assert.equal(record.state.world.history[1].wages[0],3);
  await page.reload();host=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await host.locator('#prologue-battle').waitFor();battle=await(await host.locator('#prologue-battle').elementHandle()).contentFrame();await battle.locator('body[data-mode="social"]').waitFor();assert.deepEqual(await saved(),record,'Refresh preserves wage plan, cash and actual receipts');
  for(let day=2;day<9;day++)await play('hold');const state=(await saved()).state,review=profitReview(state.world);
  assert.deepEqual(await battle.locator('#comparison .outcome-figure b').allTextContents(),[review.actual.wages+' ',review.actual.sold+' 个',(review.actual.gain>=0?'+':'')+review.actual.gain+' ']);
  assert.match(await battle.locator('#ending-copy').innerText(),new RegExp(String(Math.abs(review.difference))));assert.match(await battle.locator('#steady-maximum').innerText(),/51/);
  await battle.locator('#ending').screenshot({path:path.join(out,`${width}-review.png`)});
  for(const f of [page,host,battle])assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await battle.locator('#retry').click();await ready('social',0);assert.equal((await saved()).state.world.shops[0].cash,36);assert.equal(await battle.locator('[data-trace]').count(),0);
  results.push({width,sourcePageRemoved:true,freshOpeningCash:36,noAutomaticTrade:true,categories:3,directChoices:1,optionalToolsReadOnly:true,payrollToday:6,payrollTomorrow:3,actualReview:review,refresh:true,retry:true,noOverflow:true,noStateInjection:true});console.log(`PASS profit challenge ${width}: no tracing, 3 categories and direct business, payroll 6 -> 3, actual review and fresh replay`);await context.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({date:'2026-10-19',entry:remote?'CloudBase':'standalone',sourceSHA256:manifest.source_sha256,indexSHA256:manifest.index_sha256,results,errors},null,2)+'\n');
}catch(error){for(const c of browser.contexts())for(const page of c.pages())await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw error;}finally{await browser.close();}
