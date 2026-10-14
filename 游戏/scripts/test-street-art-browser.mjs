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
const bytes=await fs.readFile(path.join(root,'build/index.html')),output=path.join(root,'outputs/street-art-qa');await fs.mkdir(output,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
let grown=createStreetStory();for(const type of ['ROUND','STORY_EXPAND','ROUND','STORY_COMPETE','ROUND','ROUND'])grown=streetReducer(grown,{type,expectedRound:grown.world.round});
try{
 for(const width of [1280,390,320])for(const [pose,game] of [['opening',createStreetStory()],['grown',grown]]){
  const context=await browser.newContext({viewport:{width,height:1100},reducedMotion:'reduce'});
  await context.route('**/*',r=>{if(r.request().url().startsWith(url)||r.request().url().startsWith('file:'))return r.continue();external.push(r.request().url());return r.abort();});
  const saved={...initialPrologue(),scene:'street',street:game};await context.addInitScript(({saved,key})=>{if(window===top)localStorage.setItem(key,JSON.stringify(saved));},{saved,key:PROLOGUE_STORAGE_KEY});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(width===320?pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href:url);
  const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();await f.waitForFunction(()=>window.__trustStage.street.game&&!document.body.dataset.transition);
  const art=await f.evaluate(()=>{
   const scene=window.__trustStage.street,overlay=document.querySelector('.street-hotspots').getBoundingClientRect(),groups=scene.graphics.children[2].children;
   return ['clothes','cars','inputs','ovens'].map(id=>{
    const group=groups.find(g=>g.name==='street-shop-'+id),sprite=group.children[0],svg=atob(sprite.texture.baseTexture.source.src.split(',')[1]),orig=sprite.texture.orig,frame=document.querySelector('.street-shop[data-firm="'+id+'"]').getBoundingClientRect();
    // Pixi 4.4.3 Sprite.getLocalBounds mistakenly uses anchor.x for maxY.
    // These untrimmed SVG textures have exact orig dimensions; use both anchors.
    const b={x:-orig.width*sprite.anchor.x,y:-orig.height*sprite.anchor.y,width:orig.width,height:orig.height};
    return {id,name:sprite.name,local:{x:b.x,y:b.y,width:b.width,height:b.height,sx:sprite.scale.x,sy:sprite.scale.y,xpos:sprite.x,ypos:sprite.y,anchorX:sprite.anchor.x,anchorY:sprite.anchor.y,ratio:scene.ratio},paths:(svg.match(/<path/g)||[]).length,emptyRack:svg.includes('data-part="empty-rack"'),bread:svg.includes('#bcaa88'),
     bounds:{left:overlay.left+(sprite.x+b.x*sprite.scale.x)*scene.ratio,top:overlay.top+(sprite.y+b.y*sprite.scale.y)*scene.ratio,right:overlay.left+(sprite.x+(b.x+b.width)*sprite.scale.x)*scene.ratio,bottom:overlay.top+(sprite.y+(b.y+b.height)*sprite.scale.y)*scene.ratio},
     frame:{left:frame.left,top:frame.top,right:frame.right,bottom:frame.bottom}};
   });
  });
  for(const item of art){assert(item.paths>=6);assert(item.bounds.left>=item.frame.left+2);assert(item.bounds.top>=item.frame.top+2);assert(item.bounds.right<=item.frame.right-2);assert(item.bounds.bottom<item.frame.bottom-25,JSON.stringify({width,pose,item}));}
  const oven=art.find(a=>a.id==='ovens');assert.equal(oven.name,'empty-oven');assert(oven.emptyRack);assert.equal(oven.bread,false);assert.deepEqual(await f.evaluate(()=>window.__trustStage.street.game.world),game.world);
  await page.screenshot({path:path.join(output,width+'-'+pose+'.png'),fullPage:true});results.push({width,pose,art});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await fs.writeFile(path.join(output,'report.json'),JSON.stringify({results,errors,external},null,2));console.log(JSON.stringify({passed:results.length,errors,external}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
