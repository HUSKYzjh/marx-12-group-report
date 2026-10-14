/** Fast entry-layout gate before the longer, operated fourth-act regression. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(new URL('../build/index.html',import.meta.url));
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),results=[],errors=[];
const output=new URL('../outputs/relief-qa/',import.meta.url);await fs.mkdir(output,{recursive:true});
try{
 for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:960},reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/');
  const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();
  await f.locator('#dots [data-stage="4"]').click();await f.locator('.remedy-card').first().waitFor();
  for(const route of ['investment','exports','consumption']){
   await f.waitForFunction(()=>!document.body.dataset.transition);await f.locator('.remedy-card[data-route="'+route+'"]').click();
   await f.locator('.remedy-scene[data-route="'+route+'"] .remedy-status').first().waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);
   const height=(await f.locator('.remedy-battle').boundingBox()).height,hints=await f.locator('.gesture-zone small').allTextContents();
   assert(height<570,JSON.stringify({width,route,height,hints}));assert.equal(await f.locator('.remedy-scene').getAttribute('data-round'),'0');
   assert.equal(await f.locator('.remedy-voice').count(),1);assert.equal(await f.locator('.gesture-zones>button').count(),2);
   assert.equal(await f.locator('[data-gesture-packet]:visible').count(),0);assert.equal(await f.locator('.remedy-bank-flow').count(),0);
   assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   for(const button of await f.locator('.gesture-zones>button').all())assert((await button.boundingBox()).height>=44);
   results.push({width,route,height,hints});
   await page.screenshot({path:path.join(fileURLToPath(output),'entry-'+width+'-'+route+'.png'),fullPage:true});
   await f.getByRole('button',{name:'先看看别的处方 ↩',exact:true}).click();await f.locator('.remedy-card').first().waitFor();
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);
 const report={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,passed:true,results,errors};
 await fs.writeFile(new URL('remedy-entry-report.json',output),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();await new Promise(r=>server.close(r));}
