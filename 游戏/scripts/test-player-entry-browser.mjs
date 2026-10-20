import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readOpeningGuide,chooseBattleMove} from './prologue-battle-browser-gestures.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url)),remote=process.env.GAME_TEST_URL;
const current=await fs.readFile(path.join(root,'offline/技术红利去了哪里.html'));
const manifest=JSON.parse(await fs.readFile(path.join(root,'build/hosted/hosting-manifest.json'),'utf8'));
const out=process.env.GAME_TEST_OUTPUT||path.join(root,'outputs/player-entry');await fs.mkdir(out,{recursive:true});
const key='technology-dividend:prologue:v1',errors=[],results=[];
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());let server;
async function frames(page){const host=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await host.locator('body[data-ready="true"]').waitFor();await host.locator('#prologue-battle').waitFor();return {host,battle:await(await host.locator('#prologue-battle').elementHandle()).contentFrame()};}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).battle,key);
const ready=(page,day)=>page.waitForFunction(({key,day})=>{const s=JSON.parse(localStorage.getItem(key)).battle;return s?.state.world.day===day&&s.view==='choose';},{key,day});
async function enter(page,url){let response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});if(remote&&response.status()===404)response=(await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:120000}),page.getByText(/^确[认定]访问$/).click()]))[0];return response;}
async function openBattle(page){const host=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await host.locator('body[data-ready="true"]').waitFor();await host.waitForFunction(()=>!document.body.dataset.transition);await host.locator('#dots button[data-stage="2"]').click();return (await frames(page)).battle;}
async function noUpdate(battle){assert.equal(await battle.locator('#detail[open]').count(),0);assert.equal(await battle.locator('#equipment-start,#upgrade-course').count(),0);assert.doesNotMatch(await battle.locator('body').innerText(),/第二幕分成上下篇了|保留旧账，开始上下幕|切换上下幕版/);}
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const response=await enter(page,remote||pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href);
  if(remote)assert.equal(createHash('sha256').update(await response.body()).digest('hex'),manifest.index_sha256);
  let battle=await openBattle(page);await battle.locator('#opening-guide[open]').waitFor();await noUpdate(battle);assert.equal(await battle.locator('[data-opening-page]').count(),5);await readOpeningGuide(battle);
  await chooseBattleMove(battle,'hold');await battle.waitForFunction(()=>!document.querySelector('#restart').disabled);await battle.locator('#advance').click();await ready(page,1);const before=await saved(page);
  await page.reload();({battle}=await frames(page));await battle.locator('body[data-mode="steady"]').waitFor();await noUpdate(battle);assert.equal(await battle.locator('#opening-guide[open]').count(),0);assert.deepEqual(await saved(page),before);
  await battle.locator('#opening-help').click();await readOpeningGuide(battle);await noUpdate(battle);assert.deepEqual(await saved(page),before);
  await battle.locator('#console').screenshot({path:path.join(out,`${width}-entry.png`)});
  results.push({kind:'fresh-and-refresh',width,normalOpeningPages:5,noUpdatePrompt:true,oneRealDayPlayed:true,currentLedgerPreserved:true,helpReadOnly:true});await context.close();console.log(`PASS fresh entry and refresh ${width}: no update dialog`);
 }
 if(!remote&&process.env.GAME_PREVIOUS_HTML){
  const old=await fs.readFile(process.env.GAME_PREVIOUS_HTML);server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(req.url==='/old'?old:current);});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await enter(page,url+'/old');let battle=await openBattle(page);await readOpeningGuide(battle);await chooseBattleMove(battle,'wage-down');await battle.waitForFunction(()=>!document.querySelector('#restart').disabled);await battle.locator('#advance').click();await ready(page,1);const before=await saved(page);
  assert.equal(before.state.splitActs,true);await enter(page,url);({battle}=await frames(page));await battle.locator('body[data-mode="steady"]').waitFor();await noUpdate(battle);assert.equal(await battle.locator('#opening-guide[open]').count(),0);assert.deepEqual(await saved(page),before,'Current release progress remains exactly the same across builds');
  results.push({kind:'current-release-upgrade',oldSHA256:createHash('sha256').update(old).digest('hex'),noUpdatePrompt:true,noNewTutorial:true,currentLedgerPreserved:true,pendingWagePreserved:true,noStateInjection:true});await context.close();console.log('PASS actual previous release -> new build: progress preserved without a prompt');
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({date:'2026-10-19',entry:remote?'CloudBase':'standalone',sourceSHA256:manifest.source_sha256,indexSHA256:manifest.index_sha256,results,errors},null,2)+'\n');
}finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
