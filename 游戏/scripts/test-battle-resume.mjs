import {chooseBattleMove} from './prologue-battle-browser-gestures.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {hostedTestServer} from './hosted-test-server.mjs';
import {readOpeningGuide,completeBattle} from './prologue-battle-browser-gestures.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url));
const remote=process.env.GAME_TEST_URL;
const server=remote?null:await hostedTestServer(process.env.GAME_TEST_DIRECTORY||path.join(root,'build/hosted'));
const url=remote||server.url,key='technology-dividend:prologue:v1';
const hosted=JSON.parse(await fs.readFile(path.join(root,'build/hosted/hosting-manifest.json'),'utf8'));
const out=process.env.GAME_TEST_OUTPUT||path.join(root,'outputs/battle-resume');await fs.mkdir(out,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),results=[],errors=[];
async function stage(page){
 const frame=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();
 await frame.locator('body[data-ready="true"]').waitFor();
 await frame.waitForFunction(()=>!document.body.dataset.transition);
 return frame;
}
async function battleFor(frame){
 await frame.locator('#prologue-battle').waitFor();
 const battle=await(await frame.locator('#prologue-battle').elementHandle()).contentFrame();
 await battle.locator('#chapter-title').waitFor();
 return battle;
}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).battle,key);
async function waitSaved(page,day){await page.waitForFunction(({key,day})=>JSON.parse(localStorage.getItem(key)).battle?.state.world.day===day,{key,day});}
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:width===390?667:900},hasTouch:width===390,reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  let response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
  if(remote&&response.status()===404)response=(await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:120000}),page.getByText(/^确[认定]访问$/).click()]))[0];
  assert.equal(response.status(),200);
  assert.equal(createHash('sha256').update(await response.body()).digest('hex'),hosted.index_sha256,'The live entry must match the tested build');
  assert.equal(await page.locator(`script[src="${hosted.javascript}"]`).count(),1);
  let frame=await stage(page);
  // Use the real chapter/act navigation; do not construct or inject game state.
  await frame.getByRole('button',{name:'开始 →',exact:true}).click();
  await frame.locator('body[data-scene="bakery"]').waitFor();
  await frame.waitForFunction(()=>!document.body.dataset.transition);
  await frame.locator('#dots button').nth(2).click();
  let battle=await battleFor(frame);
  await battle.locator('#opening-guide[open]').waitFor();
  await battle.press('body','Escape');assert(await battle.locator('#opening-guide').evaluate(n=>n.open));
  await readOpeningGuide(battle);
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).battle?.openingRead===true,key);
  assert.equal((await saved(page)).state.world.day,0);
  await page.reload();frame=await stage(page);battle=await battleFor(frame);
  assert.equal(await battle.locator('#opening-guide').evaluate(n=>n.open),false,'Day-zero resume must not repeat a completed guide');
  await battle.locator('#opening-help').click();
  await battle.locator('#opening-close').click();
  assert.equal(await battle.locator('#opening-guide').evaluate(n=>n.open),false,'Returning players can close a voluntary guide');

  // A slow, visible animation must not delay durable settlement.
  await page.emulateMedia({reducedMotion:'no-preference'});
  await battle.locator('[data-move="hold"]').click();await waitSaved(page,1);
  assert(await battle.locator('#restart').isDisabled(),'The turn must already be saved while the presentation is busy');
  const first=await saved(page);assert.equal(first.state.world.shops[0].cash,43);
  await page.reload();frame=await stage(page);battle=await battleFor(frame);
  assert.deepEqual(await saved(page),first,'Refreshing mid-animation settles exactly once');
  assert(await battle.locator('#advance').isVisible());
  await battle.locator('#undo').click();await waitSaved(page,0);
  assert.equal((await saved(page)).state.world.shops[0].cash,36);
  assert.equal(await battle.locator('#opening-guide').evaluate(n=>n.open),false);

  // An interrupted Web Animation is cosmetic: accounts and controls recover.
  await battle.locator('[data-move="hold"]').click();await waitSaved(page,1);
  await battle.waitForFunction(()=>document.querySelector('.traveller')!==null);
  await battle.evaluate(()=>document.getAnimations().forEach(animation=>animation.cancel()));
  await battle.waitForFunction(()=>!document.querySelector('#restart').disabled);
  assert(await battle.locator('#advance').isVisible());
  assert.equal((await saved(page)).state.world.history.length,1);
  await battle.locator('#undo').click();await waitSaved(page,0);

  await chooseBattleMove(battle,'buy');await waitSaved(page,1);
  const investment=await saved(page);
  await frame.getByRole('button',{name:'返回首页',exact:true}).click();
  await frame.locator('body[data-scene="opening"]').waitFor();
  await frame.waitForFunction(()=>!document.body.dataset.transition);
  await frame.getByRole('button',{name:'开始 →',exact:true}).click();
  await frame.locator('body[data-scene="bakery"]').waitFor();
  await frame.waitForFunction(()=>!document.body.dataset.transition);
  await frame.locator('#dots button').nth(2).click();battle=await battleFor(frame);
  assert.deepEqual(await saved(page),investment,'Leaving mid-animation preserves the actual investment and pending delivery');
  assert(await battle.locator('#advance').isVisible());
  await page.emulateMedia({reducedMotion:'reduce'});
  await battle.locator('#restart').click();await waitSaved(page,0);
  assert.equal(await battle.locator('#opening-guide').evaluate(n=>n.open),false,'Replay resets accounts without forcing familiar rules');
  assert.equal((await saved(page)).state.world.shops[0].cash,36);

  // Reopen the optional guide, then play all three parts to the next story act.
  await battle.locator('#opening-help').click();
  battle=await completeBattle(page,frame,key);
  assert.equal((await saved(page)).state.mode,'done');
  await battle.locator('#next-scene').click();
  await frame.locator('body[data-scene="ending"]').waitFor();
  await page.screenshot({path:path.join(out,`${width}-ending.png`)});
  results.push({width,firstGuideRequired:true,dayZeroResume:true,voluntaryGuideClose:true,midAnimationReload:true,exactlyOnceSettlement:true,undo:true,cancelledAnimationRecovery:true,chapterLeaveDuringInvestment:true,replayWithoutRepeatedGuide:true,completeThreePartBattle:true,noStateInjection:true});
  console.log(`PASS battle resume + complete course: ${width}`);await context.close();
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({date:'2026-10-17',url,indexSha256:hosted.index_sha256,javascript:hosted.javascript,results,errors},null,2)+'\n');
}finally{await browser.close();await server?.close();}
