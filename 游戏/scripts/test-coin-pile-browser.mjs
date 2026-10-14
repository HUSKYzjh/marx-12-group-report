import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {initialPrologue,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html'));
const offline=path.join(root,'offline/技术红利去了哪里.html');assert(bytes.equals(await fs.readFile(offline)));
const output=path.join(root,'outputs/coin-pile-qa');await fs.mkdir(output,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(req.url==='/favicon.ico'?204:200,{'Content-Type':'text/html; charset=utf-8'});res.end(req.url==='/favicon.ico'?undefined:bytes);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/';
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
const errors=[],external=[],cases=[];
try{
  for(const spec of [{width:1280},{width:390,reduced:true},{width:320,reduced:true,offline:true}]){
    const name=spec.width+(spec.offline?'-offline':'');
    const context=await browser.newContext({viewport:{width:spec.width,height:900},reducedMotion:spec.reduced?'reduce':'no-preference'});
    await context.route('**/*',route=>{if(route.request().url().startsWith(url)||(spec.offline&&route.request().url()===pathToFileURL(offline).href))return route.continue();external.push(route.request().url());return route.abort();});
    const saved={...initialPrologue(),scene:'bakery-expansion',bakeryWage:4,bakeryCommitted:true};
    await context.addInitScript(({saved,key})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{saved,key:PROLOGUE_STORAGE_KEY});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
    await page.goto(spec.offline?pathToFileURL(offline).href:url);
    const frame=await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();
    await frame.locator('body[data-ready="true"]').waitFor();
    await frame.waitForFunction(()=>window.__trustStage?.expansion?.graphics.visible&&!document.body.dataset.transition);
    const snapshots=[];
    for(const time of [0,9.1,16.4]){
      const sample=await frame.evaluate(time=>{
        const e=window.__trustStage.expansion;e.seek(time);
        const bounds=e.gold.getBounds();
        return {cash:e.sample.cash,height:e.pile.height,coins:e.pile.coins.length,
          loose:e.gold.children.length-1,bounds:{x:bounds.x,y:bounds.y,right:bounds.x+bounds.width,bottom:bounds.y+bounds.height},width:e.width};
      },time);
      snapshots.push(sample);assert.equal(sample.loose,5);
      assert(sample.bounds.x>sample.width*.74&&sample.bounds.right<sample.width);
      assert(sample.bounds.y>170&&sample.bounds.bottom<340);
      assert.equal(await frame.locator('#expansion-question').isVisible(),false);
      await page.screenshot({path:path.join(output,name+'-'+time+'.png'),fullPage:true});
    }
    assert(snapshots[2].height>snapshots[0].height&&snapshots[2].coins>snapshots[0].coins);
    await frame.getByRole('button',{name:'看完这一段',exact:true}).click();
    await frame.locator('#expansion-question').waitFor({state:'visible'});
    await frame.getByRole('button',{name:'重播 ↺',exact:true}).click();
    assert.equal(await frame.locator('#expansion-question').isVisible(),false);
    assert((await frame.evaluate(()=>window.__trustStage.expansion.pile.height))<snapshots[2].height);
    assert(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    cases.push({name,stableStacks:true,sourceLooseCoins:5,pileGrowth:true,noClipping:true,replay:true});
    await context.close();console.log('PASS '+name);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({status:'PASS',cases,errors,external,builtSha256:createHash('sha256').update(bytes).digest('hex'),date:new Date().toISOString()},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
