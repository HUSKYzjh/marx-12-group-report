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
const output=path.join(root,'outputs/bakery-qa');await fs.mkdir(output,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(req.url==='/favicon.ico'?204:200,{'Content-Type':'text/html; charset=utf-8'});res.end(req.url==='/favicon.ico'?undefined:bytes);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/';
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
const errors=[],external=[],cases=[];
async function settled(frame){await frame.waitForFunction(()=>!document.body.dataset.transition);}
try{
  for(const spec of [{width:1280},{width:390,reduced:true},{width:320,reduced:true,offline:true}]){
    const name=spec.width+(spec.offline?'-offline':'');
    const context=await browser.newContext({viewport:{width:spec.width,height:900},hasTouch:spec.width<600,reducedMotion:spec.reduced?'reduce':'no-preference'});
    await context.route('**/*',route=>{if(route.request().url().startsWith(url)||(spec.offline&&route.request().url()===pathToFileURL(offline).href))return route.continue();external.push(route.request().url());return route.abort();});
    const saved=initialPrologue();saved.allocationPlans.A={laborShare:70,retainedShare:30};
    await context.addInitScript(({saved,key})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{saved,key:PROLOGUE_STORAGE_KEY});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
    await page.goto(spec.offline?pathToFileURL(offline).href:url);
    let frame=await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();
    await frame.locator('body[data-ready="true"]').waitFor();await frame.locator('body[data-scene="opening"]').waitFor();
    assert.equal(await frame.locator('#dots button').count(),7);
    await frame.getByRole('button',{name:'开始 →',exact:true}).click();
    await frame.locator('body[data-scene="bakery"]').waitFor();await settled(frame);
    assert.equal(await frame.locator('#heading').textContent(),'第一幕·更大的烤炉');
    assert.equal(await frame.locator('#bakery-next').count(),0);
    assert.equal(await frame.evaluate(()=>window.__trustStage.bakery.labels.visible),false);
    if(spec.reduced)await frame.getByRole('button',{name:'看完这一幕',exact:true}).click();
    else await frame.waitForFunction(()=>window.__trustStage.bakery.sample.showBalances,null,{timeout:20000});
    assert.deepEqual(await frame.evaluate(()=>{const s=window.__trustStage.bakery.sample;return [s.paid,s.wages,s.boss];}),[10,5,5]);
    await frame.locator('body[data-scene="bakery-upgrade"]').waitFor();await settled(frame);
    assert.equal(await frame.locator('#heading').textContent(),'第一幕·更大的烤炉');
    assert.equal(await frame.locator('#dots button[aria-current="step"]').getAttribute('data-stage'),'1');
    if(spec.reduced)await frame.getByRole('button',{name:'看完这一幕',exact:true}).click();
    else await frame.waitForFunction(()=>window.__trustStage.bakery.sample.phase==='choose',null,{timeout:20000});
    assert(await frame.evaluate(()=>{const b=window.__trustStage.bakery;return b.sample.complete&&b.sample.paid===15&&b.sample.truckLeave===1&&!document.getElementById('upgrade-choices').hidden&&!document.getElementById('upgrade-confirm').disabled;}));
    assert.equal(await frame.locator('#upgrade-choices button').count(),2);
    await frame.evaluate(()=>{Math.random=()=>.01;});
    await frame.getByRole('button',{name:'给厨师减少1枚',exact:true}).click();
    await frame.getByTestId('bakery-wage').filter({hasText:'4枚'}).waitFor();
    assert(await frame.locator('#chef-complaint').isVisible());
    assert(await frame.evaluate(()=>{const e=document.getElementById('chef-complaint');return e.classList.contains('speech-bubble')&&window.__trustStage.bakery.chef.angry.anchor.x===1/3;}));
    await frame.getByRole('button',{name:'就这样分 →',exact:true}).click();
    await frame.waitForFunction(()=>window.__trustStage.bakery.sample.showBalances);
    assert.deepEqual(await frame.evaluate(()=>{const s=window.__trustStage.bakery.sample;return [s.paid,s.wages,s.boss];}),[15,4,11]);
    await page.screenshot({path:path.join(output,name+'-merged-distribution.png'),fullPage:true});
    await frame.getByRole('button',{name:'再买些烤炉 →',exact:true}).click();
    await frame.locator('body[data-scene="bakery-expansion"]').waitFor();await settled(frame);
    assert.equal(await frame.locator('#heading').textContent(),'第一幕·更大的烤炉');
    assert.equal(await frame.locator('#dots button[aria-current="step"]').getAttribute('data-stage'),'1');
    assert.equal(await frame.locator('#expansion-question').isVisible(),false);
    assert(await frame.locator('#expansion-thought').isVisible());
    const first=await frame.evaluate(()=>{const e=window.__trustStage.expansion;return {scale:e.world.scale.x,cash:e.sample.cash,pileHeight:e.pile.height,coins:e.pile.coins.length};});
    await page.screenshot({path:path.join(output,name+'-expansion-thought.png'),fullPage:true});
    if(!spec.reduced){
      await frame.getByRole('button',{name:'暂停',exact:true}).click();
      const time=await frame.evaluate(()=>window.__trustStage.expansion.time);
      await page.waitForTimeout(150);assert.equal(await frame.evaluate(()=>window.__trustStage.expansion.time),time);
      await page.setViewportSize({width:1100,height:900});await page.waitForTimeout(100);
      assert.equal(await frame.evaluate(()=>window.__trustStage.expansion.time),time);
      await frame.getByRole('button',{name:'继续播放',exact:true}).click();
      for(const count of [2,8,32,64]){
        await frame.waitForFunction(n=>{const s=window.__trustStage.expansion.sample;return s.count===n&&s.purchase===1;},count,{timeout:20000});
        await page.screenshot({path:path.join(output,name+'-expansion-'+count+'.png'),fullPage:true});
      }
      await frame.locator('#expansion-question').waitFor({state:'visible',timeout:20000});
    }else{
      const time=await frame.evaluate(()=>window.__trustStage.expansion.time);await page.waitForTimeout(150);
      assert.equal(await frame.evaluate(()=>window.__trustStage.expansion.time),time);
      for(const count of [2,4,8,16,32,64]){
        await frame.getByRole('button',{name:'下一步 →',exact:true}).click();
        assert.equal(await frame.locator('body').getAttribute('data-expansion-count'),String(count));
        if([2,8,64].includes(count))await page.screenshot({path:path.join(output,name+'-expansion-'+count+'.png'),fullPage:true});
      }
      await frame.getByRole('button',{name:'下一步 →',exact:true}).click();
      await frame.locator('#expansion-question').waitFor({state:'visible'});
    }
    const final=await frame.evaluate(()=>{const e=window.__trustStage.expansion;return {count:e.sample.count,visible:e.units.filter(u=>u.graphics.visible).length,scale:e.world.scale.x,cash:e.sample.cash,blur:e.sample.blur,bossTint:e.boss.tint,chefTint:e.units[0].chef.children[0].tint,pileHeight:e.pile.height,coins:e.pile.coins.length,loose:e.pile.coins.filter(c=>c.kind==='loose').length};});
    assert.equal(final.count,64);assert.equal(final.visible,64);assert(final.scale<first.scale&&final.cash>first.cash);assert.equal(final.blur,1);
    assert.equal(final.bossTint,0xffffff);assert.equal(final.chefTint,0xffffff);
    assert(final.pileHeight>first.pileHeight&&final.coins>first.coins);assert.equal(final.loose,5);
    assert.equal(await frame.locator('#expansion-question p').textContent(),'但是，这个过程可以一直持续下去吗？');
    assert.match(await frame.locator('.stage-object canvas').evaluate(e=>getComputedStyle(e).filter),/blur\(5px\)/);
    assert(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:path.join(output,name+'-expansion-question.png'),fullPage:true});
    await frame.getByRole('button',{name:'重播 ↺',exact:true}).click();
    assert.equal(await frame.locator('#expansion-question').isVisible(),false);
    assert.equal(await frame.evaluate(()=>window.__trustStage.expansion.sample.count),1);
    await frame.getByRole('button',{name:'看完这一段',exact:true}).click();
    await frame.getByRole('button',{name:'继续看看 →',exact:true}).click();
    await frame.locator('body[data-scene="street"]').waitFor();await settled(frame);
    assert.equal(await frame.locator('#heading').textContent(),'第二幕·面包卖给谁？');
    const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROLOGUE_STORAGE_KEY);
    assert.equal(stored.bakeryWage,4);assert.equal(stored.bakeryCommitted,true);assert.deepEqual(stored.allocationPlans,saved.allocationPlans);
    await frame.getByRole('button',{name:'返回首页',exact:true}).click();await frame.locator('body[data-scene="opening"]').waitFor();await settled(frame);
    await frame.locator('#dots button').nth(1).click();await frame.locator('body[data-scene="bakery"]').waitFor();await settled(frame);
    assert((await frame.evaluate(()=>window.__trustStage.bakery.time))<1);
    cases.push({name,mergedAct:true,oneNavigationDot:true,expansion:[1,2,4,8,16,32,64],zoomOut:true,goldGrowth:true,blurredQuestion:true,playbackAndResize:true,choicesPreserved:true});
    await context.close();console.log('PASS '+name);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({status:'PASS',cases,errors,external,builtSha256:createHash('sha256').update(bytes).digest('hex'),date:new Date().toISOString()},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
