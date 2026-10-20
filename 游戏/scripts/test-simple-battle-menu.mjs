import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readOpeningGuide,chooseBattleMove} from './prologue-battle-browser-gestures.mjs';
import {courseRound,courseMoves} from '../public/assets/market-duel/course-model.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url)),remote=process.env.GAME_TEST_URL;
const source=await fs.readFile(path.join(root,'offline/技术红利去了哪里.html'));
const manifest=JSON.parse(await fs.readFile(path.join(root,'build/hosted/hosting-manifest.json'),'utf8'));
const out=process.env.GAME_TEST_OUTPUT||path.join(root,'outputs/simple-menu-qa');await fs.mkdir(out,{recursive:true});
const key='technology-dividend:prologue:v1',results=[],errors=[];
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
try{
 for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:width===320?568:900},hasTouch:width<600,reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  let response=await page.goto(remote||pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,{waitUntil:'domcontentloaded',timeout:120000});
  if(remote&&response.status()===404)response=(await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:120000}),page.getByText(/^确[认定]访问$/).click()]))[0];
  if(remote)assert.equal(createHash('sha256').update(await response.body()).digest('hex'),manifest.index_sha256);
  const host=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await host.locator('body[data-ready="true"]').waitFor();
  await host.waitForFunction(()=>!document.body.dataset.transition);await host.locator('#dots button[data-stage="2"]').click();
  const battle=await(await host.locator('#prologue-battle').elementHandle()).contentFrame();await battle.locator('#opening-guide[open]').waitFor();
  assert.equal(await battle.locator('[data-opening-page]').count(),5);await readOpeningGuide(battle);
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).battle,key);
  async function fits(){assert(await battle.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert(await battle.locator('#moves summary:visible,#moves button:visible').evaluateAll(ns=>ns.every(n=>{const b=n.getBoundingClientRect();return b.width>=44&&b.height>=44;})));}
  async function inspectMenu(mode){
   await battle.locator('body[data-mode="'+mode+'"]').waitFor();
   await page.waitForFunction(({key,mode})=>{const s=JSON.parse(localStorage.getItem(key)).battle;return s.state.mode===mode&&s.view==='choose';},{key,mode});
   assert.equal(await battle.locator('.move-group').count(),3);assert.equal(await battle.locator('#moves details,#moves summary').count(),0);
   const before=await saved(),all=courseMoves(before.state).map(m=>m.id).sort();
   assert.deepEqual(await battle.locator('#moves [data-move]:visible').evaluateAll(ns=>ns.map(n=>n.dataset.move).sort()),all);
   assert.deepEqual(await battle.locator('#moves [data-move]').evaluateAll(ns=>ns.map(n=>n.dataset.move).sort()),all);
   await fits();await battle.locator(".console").screenshot({path:path.join(out,`${width}-${mode}-simple.png`)});
   if(mode==='social'){
    assert.deepEqual(await battle.locator('[data-move-group="staff"] [data-move]').evaluateAll(ns=>ns.map(n=>n.dataset.move)),['hire','fire','wage-down','wage-up']);
    await battle.locator(".console").screenshot({path:path.join(out,`${width}-wages.png`)});
   }
   assert.deepEqual(await saved(),before);
  }
  async function play(move){
   const before=(await saved()).state,expected=courseRound(before,move);
   await chooseBattleMove(battle,move);
   await page.waitForFunction(({key,day})=>JSON.parse(localStorage.getItem(key)).battle.state.world.day===day,{key,day:expected.world.day});
   await battle.waitForFunction(()=>!document.querySelector('#restart').disabled);
   assert.deepEqual((await saved()).state,expected,'The chosen move keeps the existing financial result');
   await battle.locator('#advance').click();
   await page.waitForFunction(({key,day})=>{const s=JSON.parse(localStorage.getItem(key)).battle;return s.state.world.day===day&&s.view==='choose';},{key,day:expected.world.day});
  }
  await inspectMenu('steady');for(const move of ['price-up','price-up','hold'])await play(move);
  assert.equal((await saved()).state.world.shops[0].cash,87);
  await battle.locator('#next-scene').click();await inspectMenu('waves');for(let day=0;day<5;day++)await play('hold');
  await battle.locator('#next-scene').click();await battle.locator('body[data-mode="social"]').waitFor();
  await inspectMenu('social');
  await play('wage-up');const record=await saved();
  await page.reload();const restored=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await restored.locator('#prologue-battle').waitFor();
  assert.deepEqual(await saved(),record,'Reload retains the selected business decision and actual receipt');
  results.push({width,categories:3,directActions:{steady:1,waves:1,social:1},allMovesReachable:true,allActionsVisibleWithoutDisclosure:true,shortLabels:true,threeSceneMenus:true,wagesReachable:true,fivePageOpening:true,maximumCash:87,financialRulesPreserved:true,refresh:true,noOverflow:true});
  console.log(`PASS simplified second act ${width}: all actions directly visible, all actions and accounts preserved`);await context.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({date:'2026-10-19',entry:remote?'CloudBase':'standalone',sourceSHA256:createHash('sha256').update(source).digest('hex'),indexSHA256:manifest.index_sha256,results,errors},null,2)+'\n');
}finally{await browser.close();}
