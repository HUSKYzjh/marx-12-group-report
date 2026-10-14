import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {initialPrologue,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {createStreetGame,streetReducer} from '../lib/street-game.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html')),output=path.join(root,'outputs/street-shopping-qa');await fs.mkdir(output,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],results=[];
try{
 for(const spec of [{width:1280},{width:320,offline:true},{width:390,legacy:true}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:1100}}),saved={...initialPrologue(),scene:'street',street:createStreetGame()};
  if(spec.legacy){saved.street=streetReducer(saved.street,{type:'ROUND',expectedRound:0});saved.street.world.firms[0].cash-=41;saved.street.world.people.find(p=>p.id==='bakery-owner').cash+=41;saved.street.report.cash-=.41;saved.street.report.cashChange-=.41;saved.street.report.transactions.push({from:'bakery',to:'bakery-owner',amount:.41,kind:'owner-budget',quantity:0});}
  await context.addInitScript(({saved,key})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{saved,key:PROLOGUE_STORAGE_KEY});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(spec.offline?pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href:url);
  const f=await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);
  assert.equal(await f.locator('.street-firm-metrics output').evaluateAll(nodes=>nodes.every(n=>/^\d+$/.test(n.textContent))),true);
  if(spec.legacy){
   assert.equal(await f.evaluate(()=>window.__trustStage.street.game.world.firms[0].cash),saved.street.world.firms[0].cash);
   await f.locator('.street-person[data-person="bakery-owner"]').click();await f.getByRole('button',{name:'看钱包 →',exact:true}).click();
   const text=await f.locator('.street-thought').innerText();assert(!/\d\.\d/.test(text));assert(text.includes('旧存档零钱'));await f.getByRole('button',{name:'关闭心声',exact:true}).click();
  }
  const targetRound=saved.street.world.round+1;await f.locator('#street-run').click();await f.waitForFunction(round=>window.__trustStage.street.game.world.round===round&&window.__trustStage.street.time<8,targetRound);
  // Deterministic clock sampling in an isolated QA browser, never the user's tab.
  const proof=await f.evaluate(()=>{
   const scene=window.__trustStage.street,g=scene.game,original=JSON.stringify(g),seen={},bad=[],failedFaces=[],overlay=document.querySelector('.street-hotspots').getBoundingClientRect();
   scene.playing=false;
   for(let time=2;time<7.6;time+=.025){scene.time=time;scene.playing=true;scene.render();scene.playing=false;
    document.querySelectorAll('.street-person[data-visit-state="counter"]').forEach(b=>{
     const id=b.dataset.person,firm=b.dataset.visitFirm,box=document.querySelector('.street-shop[data-firm="'+firm+'"]').getBoundingClientRect(),x=overlay.left+Number(b.dataset.feetX),y=overlay.top+Number(b.dataset.feetY);
     (seen[id]??=new Set()).add(firm);if(Math.abs(y-box.bottom)>1||x<box.left||x>box.right)bad.push({id,firm,x,y,bottom:box.bottom});
     if(b.dataset.visitOutcome==='money')failedFaces.push({id,mood:b.dataset.mood});
    });
   }
   scene.time=3.25;scene.playing=true;scene.render();scene.playing=false;
   const wanted=g.world.people.map(p=>({id:p.id,shops:StreetPresentation.visits(p,g.world,g.report).map(v=>v.firm)}));
   return {seen:Object.fromEntries(Object.entries(seen).map(([id,set])=>[id,[...set]])),wanted,bad,failedFaces,unchanged:JSON.stringify(g)===original,integerTrades:g.report.transactions.every(t=>Number.isInteger(t.amount)),integerCounters:[...document.querySelectorAll('.street-firm-metrics output')].every(n=>/^\d+$/.test(n.textContent))};
  });
  assert.deepEqual(proof.bad,[]);assert(proof.unchanged);assert(proof.integerTrades);assert(proof.integerCounters);
  assert(proof.failedFaces.length>0);assert(proof.failedFaces.every(p=>p.mood==='worried'));
  for(const p of proof.wanted)for(const shop of p.shops)assert(proof.seen[p.id]?.includes(shop),'missing actual shop-border visit: '+p.id+' / '+shop);
  await page.screenshot({path:path.join(output,spec.width+'-at-shops.png'),fullPage:true});
  await f.evaluate(()=>{window.__trustStage.street.finish();});
  const home=await f.evaluate(()=>{const overlay=document.querySelector('.street-hotspots').getBoundingClientRect();return [...document.querySelectorAll('.street-person[data-mood="worried"]')].map(p=>{const firm=p.dataset.firm,box=document.querySelector(firm==='waiting'?'.street-waiting':'.street-team[data-firm="'+firm+'"]')||document.querySelector('.street-shop[data-firm="'+firm+'"]'),r=box.getBoundingClientRect();return {id:p.dataset.person,state:p.dataset.visitState,x:overlay.left+Number(p.dataset.feetX),y:overlay.top+Number(p.dataset.feetY),box:{left:r.left,right:r.right,top:r.top,bottom:r.bottom}};});});
  for(const p of home){assert.equal(p.state,'home');if(!p.id.endsWith('-owner'))assert(p.x>=p.box.left&&p.x<=p.box.right&&p.y>=p.box.top&&p.y<=p.box.bottom,'failed shopper did not return to work/waiting area');}
  await f.locator('.street-person[data-person="bakery-owner"]').click();assert(!/\d\.\d/.test(await f.locator('.street-person-balance').innerText()));
  const plan=await f.evaluate(()=>window.__trustStage.street.game.world.people.find(p=>p.id==='bakery-owner').shopping.items[0]);assert((await f.locator('.street-shopping-list').innerText()).includes('想买'+plan.wantedQuantity+'个'));
  await page.screenshot({path:path.join(output,spec.width+'-integer-wallet.png'),fullPage:true});results.push({spec,proof});await context.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'report.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({passed:results.length,errors},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
