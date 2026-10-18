import {chooseBattleMove} from './prologue-battle-browser-gestures.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import * as legacy from '../public/assets/market-duel/course-legacy.mjs';
import {readOpeningGuide} from './prologue-battle-browser-gestures.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const fontUri='data:font/woff2;base64,'+(await fs.readFile('public/assets/fonts/workshop-hand.woff2')).toString('base64');
const bytes=await fs.readFile(process.env.GAME_TEST_SOURCE||'build/index.html'),embed=(await fs.readFile('lib/generated/battle-embed.html','utf8')).replaceAll('__WORKSHOP_FONT_URL__',fontUri),out=process.env.GAME_TEST_OUTPUT||'outputs/equipment-course-qa',key='technology-dividend:prologue:v1';
const old=legacy.courseRound(legacy.initialCourse(),'more');
await fs.mkdir(out,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(req.url==='/legacy'?embed.replace('/*BATTLE_SNAPSHOT*/null',JSON.stringify({state:old,view:'result'})):bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port,browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],results=[];
try{
 for(const width of [1280,320]){
  const ctx=await browser.newContext({viewport:{width,height:1050},reducedMotion:'reduce'}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);const host=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await host.locator('body[data-ready="true"]').waitFor();await host.locator('#dots button[data-stage="2"]').click();const f=await(await host.locator('#prologue-battle').elementHandle()).contentFrame();
  await readOpeningGuide(f);
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).battle,key);
  const play=async action=>{
   const turn=Number(await f.locator('#turn').innerText()),mode=await f.locator('body').getAttribute('data-mode');
   await page.waitForFunction(({key,turn,mode})=>{const s=JSON.parse(localStorage.getItem(key)).battle;return s.state.mode===mode&&s.state.world.day===turn-1&&s.view==='choose';},{key,turn,mode});
   await chooseBattleMove(f,action);await page.waitForFunction(({key,turn})=>JSON.parse(localStorage.getItem(key)).battle.state.world.day===turn,{key,turn});
   await f.waitForFunction(()=>!document.querySelector('#restart').disabled);assert.equal(await f.locator('#round-report:visible').count(),1);assert.equal(await f.locator('#advance:visible').count(),1);await f.locator('#advance').click();
   await page.waitForFunction(({key,turn})=>{const s=JSON.parse(localStorage.getItem(key)).battle;return s.state.world.day===turn&&s.view==='choose';},{key,turn});
  };
  for(const a of ['buy','hire','hire'])await play(a);await f.locator('#next-scene').click();
  for(const a of ['buy','hire','hire','hold'])await play(a);
  assert.equal((await saved()).state.world.shops[0].workers.length,5);assert.equal(await f.locator('#crew-0 .street-person').count(),5);assert.equal(await f.locator('#crew-0 [data-hat-stripe]').count(),0);assert((await f.locator('#stats-0').innerText()).includes('2旧炉'));
  assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(await f.evaluate(()=>{const zone=document.querySelector('.player-zone'),path=zone.querySelector('path'),inv=path.getScreenCTM().inverse(),bad=[];for(const n of zone.querySelectorAll('.crew .street-person,.status,.oven-count')){const r=n.getBoundingClientRect();for(const x of [r.left-5,r.right+5])for(const y of [r.top-5,r.bottom+5])if(!path.isPointInFill(new DOMPoint(x,y).matrixTransform(inv)))bad.push(n.className);}return bad;}),[]);
  await page.screenshot({path:`${out}/${width}-five-workers.png`,fullPage:true});
  const record=await saved();await page.reload();const host2=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await host2.locator('#prologue-battle').waitFor();assert.deepEqual(await saved(),record);
  await ctx.close();results.push({width,paidOven:true,delayedRecruitment:true,fiveWorkersFit:true,recruitedUniformCorrect:true,refresh:true});
 }
 const ctx=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'});await ctx.addInitScript(()=>window.addEventListener('message',e=>{if(e.data?.app==='feast-battle'&&e.data.type==='save')window.testSnapshot=e.data.snapshot;}));const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url+'/legacy');
 await page.locator('#equipment-start').waitFor();assert.deepEqual(await page.evaluate(()=>window.testSnapshot.state),old);await page.locator('#equipment-start').click();await readOpeningGuide(page);await page.waitForFunction(()=>window.testSnapshot?.state.version===3);assert.deepEqual(await page.evaluate(()=>window.testSnapshot.state.previousCourse),old);await page.locator('#old-record').click();assert((await page.locator('#detail-copy').innerText()).includes('原规则保存'));await page.screenshot({path:out+'/legacy-retained.png',fullPage:true});await ctx.close();
 assert.deepEqual(errors,[]);assert(bytes.equals(await fs.readFile(process.env.GAME_TEST_SOURCE||'build/index.html')));const report={sha256:createHash('sha256').update(bytes).digest('hex'),results,legacyMigration:true,errors};await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){for(const ctx of browser.contexts())for(const page of ctx.pages())await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}
