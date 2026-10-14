// Upload check: actual first-act controls, battle first turn, save/reload and offline file entry.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
import {readOpeningGuide} from './prologue-battle-browser-gestures.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url));
const file=path.join(root,'offline/技术红利去了哪里.html'),offline=pathToFileURL(file).href;
const bytes=await fs.readFile(file),out=path.join(root,'outputs/upload-qa'),key='technology-dividend:prologue:v1';await fs.mkdir(out,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(req.url==='/favicon.ico'?204:200,{'Content-Type':'text/html; charset=utf-8'});res.end(req.url==='/favicon.ico'?undefined:bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/`,browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],results=[];
try{for(const width of [1280,390]){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:width===1280&&!process.argv.includes('--reduced')?'no-preference':'reduce'}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('request',r=>{if(!r.url().startsWith(url)&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:')&&r.url()!==offline)errors.push('external '+r.url());});
 const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 const stage=async()=>{const f=await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();return f;};
 const settled=async f=>f.waitForFunction(()=>!document.body.dataset.transition);
 await page.goto(width===390?offline:url);let f=await stage();await f.getByRole('button',{name:'开始 →',exact:true}).click();await f.locator('body[data-scene="bakery"]').waitFor();await settled(f);
 await f.locator('#bakery-skip').click();await f.locator('body[data-scene="bakery-upgrade"]').waitFor();await settled(f);
 await f.locator('#bakery-skip').click();await f.getByRole('button',{name:'给厨师减少1枚',exact:true}).click();await f.getByRole('button',{name:'就这样分 →',exact:true}).click();
 await f.getByRole('button',{name:'若是再买些烤炉呢 →',exact:true}).click();await f.locator('body[data-scene="bakery-expansion"]').waitFor();await settled(f);
 await f.getByRole('button',{name:'看完这一段',exact:true}).click();assert(await f.locator('#expansion-question').isVisible());assert.equal((await saved()).bakeryWage,4);
 await page.screenshot({path:`${out}/${width}-first-act.png`,fullPage:true});await f.locator('#expansion-next').click();await f.locator('#prologue-battle').waitFor();await settled(f);
 let battle=await (await f.locator('#prologue-battle').elementHandle()).contentFrame();await battle.locator('[data-move="hold"]').waitFor();
 await readOpeningGuide(battle);
 await page.waitForFunction(key=>!!JSON.parse(localStorage.getItem(key)).battle,key);assert.equal((await saved()).battle.state.world.day,0);assert.equal((await saved()).battle.state.world.shops[0].cash,36);assert.equal((await saved()).street,null);
 const fits=async()=>{for(const frame of [page,f,battle])assert(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no overflow '+width);};await fits();
 await page.screenshot({path:`${out}/${width}-second-act.png`,fullPage:true});
 const play=async action=>{const day=Number(await battle.locator('#turn').innerText()),mode=await battle.locator('body').getAttribute('data-mode');await page.waitForFunction(({key,day,mode})=>{const s=JSON.parse(localStorage.getItem(key)).battle.state;return s.mode===mode&&s.world.day===day-1;},{key,day,mode});await battle.locator(`[data-move="${action}"]`).click();await page.waitForFunction(({key,day,mode})=>{const s=JSON.parse(localStorage.getItem(key)).battle.state;return s.mode===mode&&s.world.day===day;},{key,day,mode});await battle.waitForFunction(()=>!document.querySelector('#restart').disabled);};
 await play('hold');const snapshot=(await saved()).battle;await page.reload();f=await stage();await f.locator('#prologue-battle').waitFor();battle=await (await f.locator('#prologue-battle').elementHandle()).contentFrame();await battle.locator('#advance').waitFor();assert.deepEqual((await saved()).battle,snapshot);assert.equal((await saved()).bakeryWage,4);
 // Public chapter dots, not injected state: leave and return without resetting a battle.
 await f.locator('#dots button[data-stage="1"]').click();await f.locator('body[data-scene="bakery"]').waitFor();await settled(f);await f.locator('#dots button[data-stage="2"]').click();await f.locator('#prologue-battle').waitFor();await settled(f);battle=await (await f.locator('#prologue-battle').elementHandle()).contentFrame();await battle.locator('#advance').waitFor();assert.deepEqual((await saved()).battle,snapshot);
 results.push({width,offline:width===390,firstAct:true,battleFirstTurn:true,refresh:true,navigation:true,noOverflow:true,noStateInjection:true});await context.close();
}assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));}catch(error){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});throw error;}finally{await browser.close();await new Promise(r=>server.close(r));}
