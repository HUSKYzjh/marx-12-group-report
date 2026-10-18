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
const out=process.env.GAME_TEST_OUTPUT||path.join(root,'outputs/bundled-expansion');await fs.mkdir(out,{recursive:true});
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
  await ready('steady',0);
  assert.equal((await saved()).state.splitActs,true);assert.equal((await saved()).state.world.ruleSet,'immediate-consequences-v1');
  assert.equal(await battle.locator('[data-move=hire],[data-move=fire],[data-move=buy]').count(),0);assert.doesNotMatch(await battle.locator('#moves').innerText(),/明天|停工/);
  assert.equal(await battle.locator('#moves details,#moves summary').count(),0);
  assert.match(await battle.locator('[data-move=expand]').innerText(),/工资\+2枚/);
  await play('expand');let expanded=(await saved()).state.world;assert.equal(expanded.shops[0].ovens,2);assert.equal(expanded.shops[0].workers.length,4);assert.equal(expanded.history[0].made[0],12);assert.equal(expanded.history[0].wages[0],8);assert.equal(expanded.shops[0].pending,null);assert.equal(expanded.history[0].stopped[0],false);
  await play('expand');expanded=(await saved()).state.world;assert.equal(expanded.shops[0].ovens,3);assert.equal(expanded.shops[0].workers.length,5);assert.equal(expanded.history[1].made[0],18);assert.equal(expanded.history[1].wages[0],10);assert(await battle.locator('[data-move=expand]').isDisabled());
  await battle.locator('#battle-frame').screenshot({path:path.join(out,`${width}-expanded-five-workers.png`)});
  await battle.locator('#restart').click();await ready('steady',0);
  assert.match(await battle.locator('#course-parts').innerText(),/上幕 · 需求固定/);
  assert.equal(await battle.locator('[data-course-part=upper]').getAttribute('aria-current'),'step');
  assert.match(await battle.locator('#part-context').innerText(),/每天12位顾客/);
  assert.deepEqual(await battle.locator('#moves>[data-move]').evaluateAll(ns=>ns.map(n=>n.dataset.move)),['hold']);
  await battle.locator('#console').screenshot({path:path.join(out,`${width}-upper-choices.png`)});
  for(const move of ['price-up','price-up','wage-down'])await play(move);
  const upper=(await saved()).state.world;
  assert.deepEqual(upper.history.map(r=>r.demand),[12,12,12]);
  assert.deepEqual(upper.history.map(r=>r.wages[0]),[6,6,3]);
  assert.deepEqual(upper.history.map(r=>r.sold[0]),[6,6,6]);
  assert.equal(upper.shops[0].cash,90);
  assert.match(await battle.locator('#next-scene').innerText(),/进入下幕/);
  assert.match(await battle.locator('#steady-maximum').innerText(),/54/);
  await battle.locator('#ending').screenshot({path:path.join(out,`${width}-upper-review.png`)});
  await battle.locator('#next-scene').click();await ready('waves',0);
  assert.equal(await battle.locator('[data-course-part=lower]').getAttribute('aria-current'),'step');
  assert.match(await battle.locator('#part-context').innerText(),/第一步 · 客流波动/);
  assert.equal((await saved()).state.world.shops[0].cash,36);
  assert.equal(await battle.locator('[data-move=wage-down]').count(),0);
  await battle.locator('#course-parts').screenshot({path:path.join(out,`${width}-lower-traffic.png`)});
  for(let i=0;i<5;i++)await play('hold');
  assert.deepEqual((await saved()).state.world.history.map(r=>r.demand),[12,20,20,6,12]);
  assert.match(await battle.locator('#next-scene').innerText(),/买家的钱也会变/);
  await battle.locator('#next-scene').click();await ready('social',0);
  assert.match(await battle.locator('#part-context').innerText(),/第二步 · 收入与购买力/);
  const start=await saved();assert.equal(start.state.profitChallenge,true);assert.equal(start.state.world.shops[0].cash,36);assert.equal(start.state.world.history.length,0);
  assert.equal(await battle.locator('[data-trace]').count(),0);assert.doesNotMatch(await battle.locator('body').innerText(),/需求，从哪里来|追一笔钱|追踪阿/);
  assert.deepEqual(await battle.locator('#moves>[data-move]').evaluateAll(ns=>ns.map(n=>n.dataset.move)),['hold']);
  assert.equal(await battle.locator('.profit-more').count(),0);assert(await battle.locator('#steady-goal').isVisible());assert.match(await battle.locator('#steady-goal').innerText(),/同样省工资，还能多赚吗/);
  await battle.locator('#console').screenshot({path:path.join(out,`${width}-choices.png`)});
  assert(await battle.locator('[data-move="wage-up"]').isVisible());assert.deepEqual(await saved(),start,'Reading the available adjustments is read-only');
  await play('expand');assert.equal((await saved()).state.world.history[0].wages[0],8);assert((await saved()).state.world.history[0].receipts.some(p=>p.from==='f0'&&p.to==='p3'&&p.amount===2&&p.reason==='工资'));assert.equal((await saved()).state.world.shops[0].workers.length,4);
  await play('wage-down');const record=await saved();assert.equal(record.state.world.history[1].wages[0],4);assert.equal(record.state.world.shops[0].wage,1);assert.equal(record.state.world.shops[0].pending,null);
  await page.reload();host=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await host.locator('#prologue-battle').waitFor();battle=await(await host.locator('#prologue-battle').elementHandle()).contentFrame();await battle.locator('body[data-mode="social"]').waitFor();assert.deepEqual(await saved(),record,'Refresh preserves wage plan, cash and actual receipts');
  await play('upgrade');assert.equal((await saved()).state.world.history[2].made[0],18);for(let day=3;day<9;day++)await play('hold');const state=(await saved()).state,review=profitReview(state.world);assert(state.world.shops.every(shop=>shop.pending===null&&shop.debt===0&&shop.workers.length===shop.ovens+2));assert(!state.world.history.flatMap(r=>r.receipts).some(p=>/保管|补偿/.test(p.reason)));assert(state.world.history.every(r=>r.spoiled.every(n=>n===0)));
  assert.deepEqual(await battle.locator('#comparison .outcome-figure b').allTextContents(),[review.actual.wages+' ',review.actual.sold+' 个',(review.actual.gain>=0?'+':'')+review.actual.gain+' ']);
  assert.match(await battle.locator('#ending-copy').innerText(),new RegExp(String(Math.abs(review.difference))));assert.match(await battle.locator('#steady-maximum').innerText(),/54/);
  await battle.locator('#ending').screenshot({path:path.join(out,`${width}-review.png`)});
  assert.match(await battle.locator('#ending h2').innerText(),/这次，省下的钱留住了吗/);
  for(const f of [page,host,battle])assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  let retry=false,storyContinues=false;
  if(width===1280&&process.env.GAME_TEST_STORY==='1'){
   await battle.locator('#next-scene').click();await host.locator('body[data-scene="ending"]').waitFor();assert.equal((await saved()).state.mode,'done');storyContinues=true;
  }else{
   await battle.locator('#retry').click();await ready('social',0);assert.equal((await saved()).state.world.shops[0].cash,36);assert.equal(await battle.locator('[data-trace]').count(),0);retry=true;
  }
  results.push({width,splitActs:true,fixedUpper:{demand:12,wages:[6,6,3],sold:[6,6,6],cash:90,maximumGain:54},lowerTraffic:[12,20,20,6,12],sourcePageRemoved:true,freshOpeningCash:36,noAutomaticTrade:true,categoriesPerStage:{upper:3,traffic:2,income:3},directChoices:1,optionalToolsReadOnly:true,bundledExpansion:{cost:10,workers:[3,4,5],capacities:[6,12,18],payroll:[6,8,10],socialNewWorkerPaid:true},payrollToday:8,payrollTomorrow:4,instantUpgrade:true,noDowntime:true,noStorageFees:true,noCompensation:true,actualReview:review,refresh:true,retry,storyContinues,noOverflow:true,noStateInjection:true});console.log(`PASS bundled expansion ${width}: immediate wage and upgrade consequences, actual review, refresh and ${storyContinues?'story continuation':'fresh replay'}`);await context.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({date:'2026-10-19',entry:remote?'CloudBase':'standalone',sourceSHA256:manifest.source_sha256,indexSHA256:manifest.index_sha256,results,errors},null,2)+'\n');
}catch(error){for(const c of browser.contexts())for(const page of c.pages())await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw error;}finally{await browser.close();}
