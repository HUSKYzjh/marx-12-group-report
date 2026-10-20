import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readOpeningGuide,chooseBattleMove} from './prologue-battle-browser-gestures.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url)),out=process.env.GAME_TEST_OUTPUT||path.join(root,'outputs/course-rules'),remote=process.env.GAME_TEST_URL;
const manifest=JSON.parse(await fs.readFile(path.join(root,'build/hosted/hosting-manifest.json'),'utf8')),key='technology-dividend:prologue:v1',errors=[],results=[];
await fs.mkdir(out,{recursive:true});const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
try{
 for(const [width,height] of [[320,568],[390,844],[1280,900]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',hasTouch:width<600}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  let response=await page.goto(remote||pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,{waitUntil:'domcontentloaded',timeout:120000});
  if(remote&&response.status()===404)response=(await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:120000}),page.getByText(/^确[认定]访问$/).click()]))[0];
  if(remote)assert.equal(createHash('sha256').update(await response.body()).digest('hex'),manifest.index_sha256);
  async function hostFrame(){const frame=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await frame.locator('body[data-ready=true]').waitFor();await frame.waitForFunction(()=>!document.body.dataset.transition);return frame;}
  let host=await hostFrame();await host.locator('#dots button[data-stage="2"]').click();let battle=await(await host.locator('#prologue-battle').elementHandle()).contentFrame();await readOpeningGuide(battle);await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).battle.openingRead===true,key);
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).battle,key);
  async function rules(label,daily,upper){
   const before=await saved();await battle.locator('#rules-open').click();await battle.locator('#detail[open]').waitFor();
   const panel=battle.getByTestId('course-rules'),copy=await panel.innerText();assert.match(copy,new RegExp(upper?'固定客流.*3天':'波动客流.*5天'));assert.match(copy,new RegExp('＝'+daily+'枚／天'));assert.equal(copy.includes('调工资：'),upper);assert.doesNotMatch(copy,/11人|120枚|下幕通过钱包/);
   assert.match(copy,/收入＝实际卖出 × 售价/);assert.match(copy,/资金净增＝收入－每日开支－当天购炉款/);
   await page.screenshot({path:path.join(out,`${width}-${label}.png`)});
   await panel.locator('summary').click();const all=await panel.innerText();assert.match(all,/六家厂商、20人/);assert.match(all,/购炉前须同时付得起/);assert.match(all,/同价轮流优先/);
   await panel.locator('summary').click();const box=await battle.locator('#detail').boundingBox();assert(box.y>=0&&box.y+box.height<=height+2);assert.equal(await battle.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
   await page.keyboard.press('Escape');await battle.locator('#detail[open]').waitFor({state:'detached'});assert.deepEqual(await saved(),before);
  }
  async function play(move){const before=await saved(),day=before.state.world.day;await chooseBattleMove(battle,move);await page.waitForFunction(({key,day})=>JSON.parse(localStorage.getItem(key)).battle.state.world.day===day+1,{key,day});await battle.waitForFunction(()=>!document.querySelector('#restart').disabled);await battle.locator('#advance').click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).battle.view==='choose',key);return (await saved()).state;}
  await rules('fixed',11,true);let s=await play('wage-down');assert.equal(s.world.history.at(-1).wages[0],3);await rules('wage-cut',8,true);
  s=await play('expand');assert.equal(s.world.shops[0].workers.length,4);assert.equal(s.world.history.at(-1).wages[0],4);assert.equal(s.world.history.at(-1).made[0],12);await rules('expanded',9,true);
  await play('hold');await battle.locator('#next-scene').click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).battle.state.mode==='waves',key);
  await rules('waves',11,false);s=await play('upgrade');assert.equal(s.world.history.at(-1).wages[0],6);assert.equal(s.world.history.at(-1).made[0],12);await rules('fast-oven',11,false);
  const previous=await saved();await page.reload({waitUntil:'domcontentloaded'});host=await hostFrame();battle=await(await host.locator('#prologue-battle').elementHandle()).contentFrame();await battle.locator('#rules-open').waitFor();assert.deepEqual(await saved(),previous);await rules('refreshed',11,false);
  results.push({width,height,contextualRules:true,actualDailyCosts:[11,8,9,11],upgradeKeepsPayroll:true,readingDoesNotMutateState:true,refreshPreservesState:true,modalWithinViewport:true,noStateInjection:true});console.log(`PASS ${width}: contextual rules, funded consequences, current costs, close and refresh`);await context.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({date:'2026-10-20',sourceSHA256:manifest.source_sha256,indexSHA256:manifest.index_sha256,results,errors},null,2)+'\n');
}catch(e){for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw e;}finally{await browser.close();}
