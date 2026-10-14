import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {MOTIONS,ATLASES,TRUST_HATS,PROPS} from '../public/assets/character-lab/motions.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const out=path.join(root,'outputs/character-lab-qa');await fs.mkdir(out,{recursive:true});
const url='http://127.0.0.1:3016/assets/character-lab/index.html';
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
const cases=[],errors=[],external=[];
try{
  for(const spec of [{width:1100},{width:390},{width:320},{width:390,reduced:true}]){
    const name=spec.width+(spec.reduced?'-reduced':'');
    const context=await browser.newContext({viewport:{width:spec.width,height:900},hasTouch:spec.width<600,reducedMotion:spec.reduced?'reduce':'no-preference'});
    await context.route('**/*',route=>{if(route.request().url().startsWith('http://127.0.0.1:3016/'))return route.continue();external.push(route.request().url());return route.abort();});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
    await page.goto(url);await page.locator('body[data-ready="true"]').waitFor();
    assert.equal(await page.locator('#motion option').count(),MOTIONS.length);assert.equal(await page.locator('#atlas option').count(),ATLASES.length);
    if(spec.reduced){
      assert.equal(await page.locator('#play').textContent(),'播放');
      const still=await page.locator('#stage').evaluate(c=>c.toDataURL());await page.waitForTimeout(200);
      assert.equal(await page.locator('#stage').evaluate(c=>c.toDataURL()),still);
    }
    const exercised=[];
    for(const m of MOTIONS){
      await page.locator('#motion').selectOption(m.id);
      if(await page.locator('#play').textContent()==='播放')await page.locator('#play').click();
      await page.waitForTimeout(160);
      const sample=await page.evaluate(()=>({id:window.__characterLab.sample.id,time:window.__characterLab.sample.time,
        drawn:document.getElementById('stage').getContext('2d').getImageData(0,0,720,320).data.some((v,i)=>i%4!==3&&v<200)}));
      assert.equal(sample.id,m.id);assert(sample.time>0);assert(sample.drawn,m.id+' has visible original artwork');
      if(await page.locator('#play').textContent()==='暂停')await page.locator('#play').click();
      exercised.push(m.id);
    }
    await page.locator('[data-motion="trust-laugh"]').click();await page.waitForTimeout(90);await page.locator('#play').click();
    const paused=await page.locator('#stage').evaluate(c=>c.toDataURL());await page.waitForTimeout(160);
    assert.equal(await page.locator('#stage').evaluate(c=>c.toDataURL()),paused,'pause freezes artwork');
    const oldSign=await page.evaluate(()=>Math.sign(window.__characterLab.sample.sx));await page.locator('#mirror').click();
    assert.equal(await page.evaluate(()=>Math.sign(window.__characterLab.sample.sx)),-oldSign);
    await page.locator('#intensity').evaluate(e=>{e.value='0';e.dispatchEvent(new Event('input',{bubbles:true}));});
    assert.equal(await page.evaluate(()=>Math.abs(window.__characterLab.sample.y)),0);
    await page.locator('#intensity').evaluate(e=>{e.value='1';e.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.screenshot({path:path.join(out,name+'-laugh.png'),fullPage:true});
    assert.equal(await page.locator('#hat option').count(),7);
    for(const h of TRUST_HATS){
      await page.locator('#hat').selectOption(String(h.frame));
      assert.equal(await page.locator('#hat option:checked').textContent(),h.label);
      assert.deepEqual(await page.evaluate(()=>window.__characterLab.sample.layers.map(l=>l.frame)),[0,h.frame,10]);
    }
    await page.screenshot({path:path.join(out,name+'-hat.png'),fullPage:true});
    await page.locator('#hat').selectOption('-1');
    await page.locator('[data-tab="atlas"]').click();await page.locator('#atlas').selectOption('helping');
    assert.equal(await page.locator('#frame').getAttribute('max'),'111');
    await page.locator('#frame-next').click();assert.equal(await page.locator('#frame-output').textContent(),'1 / 111');
    await page.locator('#frame').focus();await page.locator('#frame').press('End');assert.equal(await page.locator('#frame-output').textContent(),'111 / 111');
    assert(await page.locator('#frame-next').isDisabled());
    for(const atlas of ATLASES){await page.locator('#atlas').selectOption(atlas.id);assert(await page.locator('#frame-output').textContent());}
    await page.locator('[data-tab="gallery"]').click();assert.equal(await page.locator('#gallery .sample').count(),MOTIONS.length);
    await page.screenshot({path:path.join(out,name+'-gallery.png'),fullPage:true});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.locator('#gallery .sample').filter({hasText:'伸手帮忙'}).click();
    await page.waitForTimeout(250);assert.equal(await page.locator('#motion').inputValue(),'wb-help');
    await page.locator('#play').click();await page.locator('#time').focus();await page.locator('#time').press('End');
    assert.equal(await page.evaluate(()=>window.__characterLab.sample.layers[0].frame),110);
    await page.screenshot({path:path.join(out,name+'-help.png'),fullPage:true});
    await page.locator('#restart').click();await page.waitForTimeout(160);
    assert.equal(await page.locator('#play').textContent(),'暂停');
    assert((await page.evaluate(()=>window.__characterLab.sample.layers[0].frame))<110);
    await page.locator('[data-tab="props"]').click();
    assert.equal(await page.locator('#props img').count(),PROPS.length);
    assert(await page.locator('#props').evaluate(e=>[...e.querySelectorAll('img')].every(img=>img.complete&&img.naturalWidth>0)));
    assert.deepEqual(await page.locator('#props img').evaluateAll(imgs=>imgs.map(img=>img.alt)),PROPS.map(p=>p.label));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const hiddenTime=await page.evaluate(()=>window.__characterLab.state.time);await page.waitForTimeout(160);
    assert.equal(await page.evaluate(()=>window.__characterLab.state.time),hiddenTime,'other tabs suspend motion clock');
    await page.screenshot({path:path.join(out,name+'-props.png'),fullPage:true});
    cases.push({name,motionsExercised:exercised.length,atlasesInspected:ATLASES.length,hatsChecked:TRUST_HATS.length,propsShown:PROPS.length,noHorizontalOverflow:true,pauseAndMirror:true,restartAndTabSuspension:true});
    await context.close();console.log('PASS '+name);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify({cases,errors,external,testedAt:new Date().toISOString(),scope:'Isolated resource preview; game flow not changed'},null,2));
}finally{await browser.close();}
