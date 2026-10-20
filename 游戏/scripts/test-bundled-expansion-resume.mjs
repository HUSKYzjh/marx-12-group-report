import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readOpeningGuide,chooseBattleMove} from './prologue-battle-browser-gestures.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url)),out=process.env.GAME_TEST_OUTPUT||path.join(root,'outputs/bundled-expansion-resume');
assert(process.env.GAME_PREVIOUS_HTML);await fs.mkdir(out,{recursive:true});
const old=await fs.readFile(process.env.GAME_PREVIOUS_HTML),current=await fs.readFile(path.join(root,'offline/技术红利去了哪里.html'));
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(req.url==='/old'?old:current);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port,key='technology-dividend:prologue:v1',errors=[];
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 const frames=async()=>{const host=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await host.locator('body[data-ready="true"]').waitFor();await host.locator('#prologue-battle').waitFor();return {host,battle:await(await host.locator('#prologue-battle').elementHandle()).contentFrame()};};
 const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).battle,key);
 await page.goto(url+'/old');let host=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await host.locator('body[data-ready="true"]').waitFor();await host.waitForFunction(()=>!document.body.dataset.transition);await host.locator('#dots button[data-stage="2"]').click();let {battle}=await frames();await readOpeningGuide(battle);
 await chooseBattleMove(battle,'wage-down');await battle.waitForFunction(()=>!document.querySelector('#restart').disabled);await battle.locator('#advance').click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).battle.state.world.day===1&&JSON.parse(localStorage.getItem(key)).battle.view==='choose',key);
 const previous=await saved();assert.equal(previous.state.world.history[0].wages[0],3);assert.equal(previous.state.world.shops[0].pending,null);
 await page.goto(url);({battle}=await frames());await battle.locator('body[data-mode="steady"]').waitFor();assert.equal(await battle.locator('#opening-guide[open],#detail[open],#equipment-start,#upgrade-course').count(),0);assert.deepEqual(await saved(),previous);assert(await battle.locator('[data-move=expand]').isVisible());
 await chooseBattleMove(battle,'expand');await battle.waitForFunction(()=>!document.querySelector('#restart').disabled);await battle.locator('#advance').click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).battle.view==='choose'&&JSON.parse(localStorage.getItem(key)).battle.state.world.day===2,key);const expanded=await saved();assert.equal(expanded.state.world.shops[0].workers.length,4);assert.equal(expanded.state.world.history[1].wages[0],4);
 await page.reload();({battle}=await frames());await battle.locator('body[data-mode="steady"]').waitFor();assert.deepEqual(await saved(),expanded);assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({date:'2026-10-19',oldSHA256:createHash('sha256').update(old).digest('hex'),sourceSHA256:createHash('sha256').update(current).digest('hex'),actualPreviousBuildPlayed:true,previousSimpleSaveContinuesExactly:true,noReset:true,noRepeatedGuide:true,noUpdatePrompt:true,newExpansionUsable:true,oldPerPersonWagePreserved:true,refresh:true,noStateInjection:true,errors},null,2)+'\n');console.log('PASS preceding simple-rule save continues exactly, bundled expansion available and refresh preserved');
}finally{await browser.close();await new Promise(r=>server.close(r));}
