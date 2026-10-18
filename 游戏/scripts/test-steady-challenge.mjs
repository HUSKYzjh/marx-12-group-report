import {chooseBattleMove} from './prologue-battle-browser-gestures.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {hostedTestServer} from './hosted-test-server.mjs';
import {readOpeningGuide} from './prologue-battle-browser-gestures.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url)),remote=process.env.GAME_TEST_URL;
const server=remote?null:await hostedTestServer(path.join(root,'build/hosted'));
const manifest=JSON.parse(await fs.readFile(path.join(root,'build/hosted/hosting-manifest.json'),'utf8'));
const out=process.env.GAME_TEST_OUTPUT||path.join(root,'outputs/steady-challenge');await fs.mkdir(out,{recursive:true});
const key='technology-dividend:prologue:v1',results=[],errors=[];
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
async function frames(page){
 const host=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();
 await host.locator('body[data-ready="true"]').waitFor();
 await host.locator('#prologue-battle').waitFor();
 const battle=await(await host.locator('#prologue-battle').elementHandle()).contentFrame();
 await battle.locator('#chapter-title').waitFor();return {host,battle};
}
try{
 for(const [width,height] of [[320,568],[390,667],[1280,900]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<600,reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().includes('/runtime-assets/')&&r.status()>=400)errors.push(`Missing asset ${r.status()}: ${r.url()}`);});
  let response=await page.goto(remote||server.url,{waitUntil:'domcontentloaded',timeout:120000});
  if(remote&&response.status()===404)response=(await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:120000}),page.getByText(/^确[认定]访问$/).click()]))[0];
  assert.equal(response.status(),200);assert.equal(createHash('sha256').update(await response.body()).digest('hex'),manifest.index_sha256);
  let host=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await host.locator('body[data-ready="true"]').waitFor();await host.waitForFunction(()=>!document.body.dataset.transition);
  await host.locator('#dots button').nth(2).click();let battle;({host,battle}=await frames(page));
  assert.match(await battle.locator('#chapter-title').innerText(),/恒定的客流数/);
  await battle.locator('#opening-guide[open]').waitFor();assert(await battle.locator('#opening-start').isHidden());
  await readOpeningGuide(battle);
  assert.match(await battle.locator('#steady-goal').innerText(),/赚钱的算盘/);
  assert.doesNotMatch(await battle.locator('#steady-goal').innerText(),/51/,'Do not reveal the optimal score before experimentation');
  await page.screenshot({path:path.join(out,`${width}-goal.png`)});
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).battle,key);
  const play=async(move,day)=>{
   await chooseBattleMove(battle,move);
   await page.waitForFunction(({key,day})=>JSON.parse(localStorage.getItem(key)).battle.state.world.day===day,{key,day});
   await battle.waitForFunction(()=>!document.querySelector('#restart').disabled);
   assert(await battle.locator('#steady-insight').isVisible());
   const snapshot=await saved();assert.equal(snapshot.state.world.history.at(-1).sold[0],6);
   if(day===1&&move==='hold'){
    await battle.locator('#steady-insight').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,`${width}-feedback.png`)});
    await battle.locator('#receipt').click();await battle.locator('#detail[open]').waitFor();
    assert.match(await battle.locator('#detail-copy').innerText(),/资金净增加/);
    assert.match(await battle.locator('#detail-copy').innerText(),/不是完整净利润/);
    const close=await battle.locator('#detail-close').boundingBox();
    assert(close.y>=0&&close.y+close.height<=height,'Receipt close button stays inside the actual screen');
    await battle.locator('#detail-close').click();
   }
   await battle.locator('#advance').click();
  };
  for(let i=1;i<=3;i++)await play('hold',i);
  assert.equal((await saved()).state.world.shops[0].cash,57);
  assert.match(await battle.locator('#comparison').innerText(),/21/);
  assert.match(await battle.locator('#retry').innerText(),/赚更多/);
  await battle.locator('#retry').click();
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).battle.state.world.day===0,key);
  for(const [i,move] of ['price-up','price-up','hold'].entries())await play(move,i+1);
  const best=await saved();assert.equal(best.state.world.shops[0].cash,87);
  assert.match(await battle.locator('#ending-title').innerText(),/最高收益/);
  assert.deepEqual(await battle.locator('#comparison .outcome-figure b').allTextContents(),['+51 ','+21 ','+51 ']);
  await page.screenshot({path:path.join(out,`${width}-maximum.png`)});
  for(const frame of [page,host,battle])assert(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.reload();({host,battle}=await frames(page));
  assert.deepEqual((await saved()).steadyBest,best.steadyBest,'Record survives a real reload');
  assert(await battle.locator('#opening-guide').evaluate(n=>!n.open));
  await battle.locator('#retry').click();
  for(let i=1;i<=3;i++)await play('hold',i);
  assert.deepEqual((await saved()).steadyBest,best.steadyBest,'A lower-scoring replay preserves the record');
  assert.deepEqual(await battle.locator('#comparison .outcome-figure b').allTextContents(),['+21 ','+21 ','+51 ']);
  await battle.locator('#next-scene').click();
  await battle.locator('body[data-mode="waves"]').waitFor();assert(await battle.locator('#steady-goal').isHidden());
  assert.deepEqual((await saved()).steadyBest,best.steadyBest,'The next stage preserves the first-stage record');
  results.push({width,height,fivePageOpening:true,goalVisible:true,actualMoveHints:true,baselineGain:21,maximumGain:51,sameDailySales:6,replayComparison:true,recordSurvivesReload:true,lowerRunPreservesBest:true,nextStageUnblocked:true,noOverflow:true,noStateInjection:true});
  console.log(`PASS steady challenge ${width}: +21 -> +51, record +51 preserved`);await context.close();
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({date:'2026-10-17',entry:remote?'online':'local',indexSha256:manifest.index_sha256,results,errors},null,2)+'\n');
}finally{await browser.close();await server?.close();}
