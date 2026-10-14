import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {initialPrologue,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html'));
const output=path.join(root,'outputs/bakery-sequence-qa');await fs.mkdir(output,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(req.url==='/favicon.ico'?204:200,{'Content-Type':'text/html; charset=utf-8'});res.end(req.url==='/favicon.ico'?undefined:bytes);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/';
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());const errors=[],external=[],cases=[];
try{
 for(const width of [1280,390,320])for(const committed of [false,true]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.route('**/*',r=>{if(r.request().url().startsWith(url)||r.request().url().startsWith('file:'))return r.continue();external.push(r.request().url());return r.abort();});
  const saved=initialPrologue();saved.scene='bakery-upgrade';saved.bakeryCommitted=committed;
  await context.addInitScript(({saved,key})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{saved,key:PROLOGUE_STORAGE_KEY});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(width===320?pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href:url);
  const f=await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);
  assert.equal(await f.locator('#bakery-caption').textContent(),'换上了新的烤炉。');assert.equal(await f.evaluate(()=>window.__trustStage.bakery.sample.baked),0);
  await f.getByRole('button',{name:'下一步 →',exact:true}).click();assert.equal(await f.locator('#bakery-caption').textContent(),'烤出了更多面包。');
  await f.getByRole('button',{name:'下一步 →',exact:true}).click();assert.equal(await f.evaluate(()=>window.__trustStage.bakery.sample.baked),12);
  await f.getByRole('button',{name:'下一步 →',exact:true}).click();assert.equal(await f.locator('#bakery-caption').textContent(),'更多面包，装上了车。');
  await f.getByRole('button',{name:'下一步 →',exact:true}).click();assert.equal(await f.locator('#bakery-caption').textContent(),'这次共卖了15枚金币。');
  await page.screenshot({path:path.join(output,width+'-'+committed+'-sale.png'),fullPage:true});
  await f.getByRole('button',{name:'下一步 →',exact:true}).click();assert.equal(await f.evaluate(()=>window.__trustStage.bakery.sample.paid),15);
  await f.getByRole('button',{name:'下一步 →',exact:true}).click();
  if(!committed){assert.equal(await f.locator('#bakery-caption').textContent(),'这次，给厨师分多少？');assert(await f.locator('#upgrade-choices').isVisible());await f.getByRole('button',{name:'就这样分 →',exact:true}).click();}
  assert.equal(await f.locator('#bakery-caption').textContent(),'厨师分到5枚，老板留下10枚。');
  const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROLOGUE_STORAGE_KEY);assert.equal(stored.bakeryWage,5);assert.equal(stored.bakeryCommitted,true);
  await f.getByRole('button',{name:'重播 ↺',exact:true}).click();assert.equal(await f.locator('#bakery-caption').textContent(),'换上了新的烤炉。');
  cases.push({width,committed,sequence:true,replayCaption:true});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await fs.writeFile(path.join(output,'report.json'),JSON.stringify({cases,errors,external},null,2));console.log(JSON.stringify({passed:cases.length,errors,external},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
