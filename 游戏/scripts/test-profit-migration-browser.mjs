import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readOpeningGuide,chooseBattleMove} from './prologue-battle-browser-gestures.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url));
if(!process.env.GAME_PREVIOUS_HTML)throw Error('Set GAME_PREVIOUS_HTML to the actual preceding standalone build.');
const old=await fs.readFile(process.env.GAME_PREVIOUS_HTML),current=await fs.readFile(path.join(root,'offline/技术红利去了哪里.html'));
const out=process.env.GAME_TEST_OUTPUT||path.join(root,'outputs/profit-migration');await fs.mkdir(out,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(req.url==='/old'?old:current);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port,key='technology-dividend:prologue:v1',errors=[];
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 const frames=async()=>{const host=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await host.locator('body[data-ready="true"]').waitFor();await host.locator('#prologue-battle').waitFor();return {host,battle:await(await host.locator('#prologue-battle').elementHandle()).contentFrame()};};
 await page.goto(url+'/old');let host=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await host.locator('body[data-ready="true"]').waitFor();await host.waitForFunction(()=>!document.body.dataset.transition);await host.locator('#dots button[data-stage="2"]').click();let {battle}=await frames();await readOpeningGuide(battle);
 const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).battle,key);
 const ready=async(mode,day)=>page.waitForFunction(({key,mode,day})=>{const s=JSON.parse(localStorage.getItem(key)).battle;return s.state.mode===mode&&s.state.world.day===day&&s.view==='choose';},{key,mode,day});
 for(const [mode,days] of [['steady',3],['waves',5]]){
  await ready(mode,0);for(let day=1;day<=days;day++){await chooseBattleMove(battle,'hold');await page.waitForFunction(({key,day})=>JSON.parse(localStorage.getItem(key)).battle.state.world.day===day,{key,day});await battle.waitForFunction(()=>!document.querySelector('#restart').disabled);await battle.locator('#advance').click();await ready(mode,day);}await battle.locator('#next-scene').click();
 }
 await ready('source',1);const previous=await saved();assert.equal(await battle.locator('[data-trace]').count(),2);
 // The same origin keeps the actual old save. No fixture or state is injected.
 await page.goto(url);({battle}=await frames());await battle.locator('#start-profit').waitFor();assert.equal(await battle.locator('[data-trace]').count(),0);assert.deepEqual(await saved(),previous,'Loading new presentation does not rewrite the old ledger');
 await battle.locator('#start-profit').click();await ready('social',0);const fresh=await saved();assert.equal(fresh.state.world.shops[0].cash,36);assert.equal(fresh.state.profitChallenge,true);assert.deepEqual(fresh.state.previousCourse,previous.state);assert.deepEqual(fresh.state.archive,previous.state.archive);
 await page.reload();({battle}=await frames());await battle.locator('body[data-mode="social"]').waitFor();assert.deepEqual(await saved(),fresh);await battle.locator('#old-record').click();await battle.locator('#detail[open]').waitFor();assert.match(await battle.locator('#detail-copy').innerText(),/第1天/);
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({date:'2026-10-18',oldSHA256:createHash('sha256').update(old).digest('hex'),sourceSHA256:createHash('sha256').update(current).digest('hex'),oldPageActuallyPlayed:true,noStateInjection:true,oldLedgerUnchangedUntilChoice:true,oldLedgerArchived:true,firstTwoScenesPreserved:true,newOpeningCash:36,refresh:true,oldRecordOpened:true,errors},null,2)+'\n');console.log('PASS actual old tracing save -> replacement challenge, original accounts and refresh preserved');
}finally{await browser.close();await new Promise(r=>server.close(r));}
