import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {initialPrologue,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {createStreetStory,streetReducer} from '../lib/street-game.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html')),output=path.join(root,'outputs/street-portraits-qa');await fs.mkdir(output,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],results=[];
let expanded=createStreetStory();for(const type of ['ROUND','STORY_EXPAND','ROUND','STORY_COMPETE','ROUND','ROUND'])expanded=streetReducer(expanded,{type,expectedRound:expanded.world.round});
let dismissed=streetReducer(expanded,{type:'PREVIEW_LAYOFF'});dismissed=streetReducer(dismissed,{type:'LAYOFF'});dismissed=streetReducer(dismissed,{type:'OTHER_LAYOFFS'});
try{
 for(const width of [1280,601,390,320])for(const [pose,game] of [['opening',createStreetStory()],['expanded',expanded],['dismissed',dismissed]]){
  const context=await browser.newContext({viewport:{width,height:1100},reducedMotion:'reduce'});
  await context.route('**/*',r=>r.request().url().startsWith(url)||r.request().url().startsWith('file:')?r.continue():r.abort());
  const saved={...initialPrologue(),scene:'street',street:game};await context.addInitScript(({saved,key})=>{if(window===top)localStorage.setItem(key,JSON.stringify(saved));},{saved,key:PROLOGUE_STORAGE_KEY});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(width===320?pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href:url);
  const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();await f.waitForFunction(()=>window.__trustStage.street.game&&window.__trustStage.street.time===8&&!document.body.dataset.transition);
  const proof=await f.evaluate(()=>{
   const s=window.__trustStage.street,overlay=document.querySelector('.street-hotspots').getBoundingClientRect(),actors=s.graphics.children[3].children;
   return s.game.world.people.filter(p=>!p.owner).map(p=>{
    const index=s.game.world.people.findIndex(q=>q.id===p.id),actor=actors[index],b=actor.getLocalBounds(),team=document.querySelector(p.job?'.street-team[data-firm="'+p.job+'"]':'.street-waiting').getBoundingClientRect();
    const roster=p.job?s.game.world.firms.find(f=>f.id===p.job).workers:s.game.world.people.filter(p=>!p.job&&!p.owner).map(p=>p.id),cols=p.job?Math.max(1,Math.min(roster.length,Math.floor(team.width/52))):s.waitingCols;
    return {id:p.id,lastRow:Math.floor(roster.indexOf(p.id)/cols)===Math.floor((roster.length-1)/cols),headwear:document.querySelector('.street-person[data-person="'+p.id+'"]').dataset.headwear,
     art:{left:overlay.left+(actor.x+b.x*actor.scale.x)*s.ratio,top:overlay.top+(actor.y+b.y*actor.scale.y)*s.ratio,right:overlay.left+(actor.x+(b.x+b.width)*actor.scale.x)*s.ratio,bottom:overlay.top+(actor.y+(b.y+b.height)*actor.scale.y)*s.ratio},
     frame:{left:team.left,top:team.top,right:team.right,bottom:team.bottom}};
   });
  });
  for(const {id,lastRow,art,frame} of proof){assert(art.left>=frame.left+3,id+' left');assert(art.top>=frame.top+3,id+' hat top');assert(art.right<=frame.right-3,id+' right');assert(art.bottom<=frame.bottom-3,id+' feet');if(lastRow)assert(frame.bottom-art.bottom<12,id+' feet should rest near the lower border');}
  assert.equal(await f.locator('.street-person:visible').count(),20);assert.equal(await f.locator('.street-person[data-firm="waiting"]:not([data-headwear="none"])').count(),0);
  await page.screenshot({path:path.join(output,width+'-'+pose+'.png'),fullPage:true});results.push({width,pose,proof});await context.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'report.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({passed:results.length,errors}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
