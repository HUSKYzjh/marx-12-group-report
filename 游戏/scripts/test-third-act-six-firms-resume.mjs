import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readOpeningGuide,chooseBattleMove,completeBattle} from './prologue-battle-browser-gestures.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url)),out=process.env.GAME_TEST_OUTPUT||path.join(root,'outputs/third-act-resume');
assert(process.env.GAME_PREVIOUS_HTML);await fs.mkdir(out,{recursive:true});
const old=await fs.readFile(process.env.GAME_PREVIOUS_HTML),current=await fs.readFile(path.join(root,'offline/技术红利去了哪里.html'));
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(req.url==='/old'?old:current);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port,key='technology-dividend:prologue:v1',errors=[],results=[];
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
try{
 for(const scenario of ['fixed-day-one','wallet-day-one','six-firm-sandbox']){
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  async function hostFrame(){const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);return f;}
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  await page.goto(url+'/old');let host=await hostFrame();await host.locator('#dots button[data-stage="2"]').click();let battle;
  if(scenario==='six-firm-sandbox'){
   battle=await completeBattle(page,host,key);await battle.locator('#open-six').click();await host.locator('body[data-street-mode=sandbox]').waitFor();
   await host.locator('#street-run').click();await host.locator('#street-run:not(:disabled)').waitFor();assert.equal((await saved()).street.world.round,1);
  }else{
   battle=await(await host.locator('#prologue-battle').elementHandle()).contentFrame();await readOpeningGuide(battle);
   const turn=async move=>{const day=(await saved()).battle.state.world.day;await chooseBattleMove(battle,move);await page.waitForFunction(({key,day})=>JSON.parse(localStorage.getItem(key)).battle.state.world.day===day+1,{key,day});await battle.waitForFunction(()=>!document.querySelector('#restart').disabled);await battle.locator('#advance').click();await page.waitForFunction(({key,day})=>{const s=JSON.parse(localStorage.getItem(key)).battle;return s.view==='choose'&&s.state.world.day===day+1;},{key,day});};
   if(scenario==='wallet-day-one'){
    for(let i=0;i<3;i++)await turn('hold');await battle.locator('#next-scene').click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).battle.state.mode==='waves',key);
    for(let i=0;i<5;i++)await turn('hold');await battle.locator('#next-scene').click();
    await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).battle.state.mode==='social',key);
   }
   await turn('wage-down');
  }
  const before=await saved();await page.goto(url+'/current');host=await hostFrame();
  if(scenario==='six-firm-sandbox'){
   await host.locator('body[data-scene="street-economy"]').waitFor();const after=await saved();assert.deepEqual(after.street,before.street);assert.deepEqual(after.battle,before.battle);assert.equal(after.streetMode,'battle');
  }else{
   battle=await(await host.locator('#prologue-battle').elementHandle()).contentFrame();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).battle.state.externalOnly===true,key);
   const after=await saved();assert.deepEqual(after.battle.state.previousCourse,before.battle.state);assert.equal(await battle.locator('#opening-guide[open]').count(),0);
   assert.doesNotMatch(await battle.locator('body').innerText(),/第二幕分成上下篇了|切换上下幕版/);
   if(scenario==='fixed-day-one'){assert.deepEqual(after.battle.state.world,before.battle.state.world);assert.equal(after.battle.state.world.day,1);}
   else{assert.equal(after.battle.state.mode,'done');assert.deepEqual(after.battle.state.archive.waves,before.battle.state.archive.waves);await battle.locator('#next-scene').click();await host.locator('body[data-scene="street-economy"]').waitFor();assert.equal((await saved()).street.world.round,0);}
  }
  const migrated=await saved();await page.reload();host=await hostFrame();
  if(scenario==='fixed-day-one')await host.locator('#prologue-battle').waitFor();
  assert.deepEqual((await saved()).battle,migrated.battle);assert.deepEqual((await saved()).street,migrated.street);
  results.push({scenario,actualPreviousBuildPlayed:true,transactionsPreserved:true,refresh:true,noStateInjection:true});console.log(`PASS previous build: ${scenario}`);await context.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({date:'2026-10-19',oldSHA256:createHash('sha256').update(old).digest('hex'),sourceSHA256:createHash('sha256').update(current).digest('hex'),results,errors},null,2)+'\n');
}finally{await browser.close();await new Promise(r=>server.close(r));}
