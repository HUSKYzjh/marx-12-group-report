import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url));
const online=process.env.GAME_TEST_URL;
const url=online||pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href;
const out=process.env.GAME_TEST_OUTPUT||path.join(root,'docs/手机首页验收-20261017',online?'online':'local');
await fs.mkdir(out,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
const results=[],errors=[];
async function gameFrame(page){
  const frame=await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();
  await frame.locator('body[data-ready="true"][data-scene="opening"]').waitFor();
  await frame.waitForFunction(()=>!document.body.dataset.transition);
  return frame;
}
async function measure(page,frame){
  const metrics=await frame.evaluate(()=>{
    const stage=window.__trustStage,button=document.querySelector('#controls button'),b=button.getBoundingClientRect();
    const shown=[...document.querySelectorAll('.production-symbol')].filter(e=>getComputedStyle(e).display!=='none');
    const title=document.querySelector('#heading').getBoundingClientRect(),canvas=stage.app.view.getBoundingClientRect();
    return {stageHeight:stage.splashHeight,nodeCount:stage.splashNodes.length,shownSymbols:shown.length,
      modelSymbols:stage.splashNodes.filter(n=>n.element).length,hiddenSymbols:document.querySelectorAll('.production-symbol[hidden]').length,
      iframeNoOverflow:document.documentElement.scrollWidth<=innerWidth+1,
      footerBottom:document.querySelector('footer').getBoundingClientRect().bottom,
      titleFits:title.top>=canvas.top&&title.bottom<=canvas.bottom,
      linkedTargets:shown.filter(e=>e.tagName==='A').every(e=>{const b=e.getBoundingClientRect();return b.width>=44&&b.height>=44;}),
      buttonHeight:b.height,buttonDisabled:button.disabled,scene:document.body.dataset.scene};
  });
  const button=frame.getByRole('button',{name:'开始 →',exact:true}),box=await button.boundingBox();
  const viewport=page.viewportSize();
  assert(box&&box.y>=0&&box.y+box.height<=viewport.height-8,'Start button must be fully within the first screen: '+JSON.stringify({viewport,box}));
  assert(box.x>=0&&box.x+box.width<=viewport.width,'Start button must fit horizontally');
  assert(metrics.buttonHeight>=44&&!metrics.buttonDisabled,'Start action retains its touch target');
  assert(metrics.footerBottom>=viewport.height-1,'Footer must reach the viewport bottom without a white gap');
  if(viewport.height>=390)assert(metrics.footerBottom<=viewport.height+1,'Opening and navigation fit one screen');
  assert.equal(metrics.shownSymbols,metrics.modelSymbols,'Hidden symbols must not remain in the simulation');
  assert(metrics.iframeNoOverflow&&metrics.titleFits&&metrics.linkedTargets,'Title, links and frame fit');
  // Reload can restore the browser's previous offset. The real viewport bounds
  // above still require the whole button to be visible without an extra scroll.
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
  return {...metrics,button:box,viewport};
}
try{
  const viewports=online?[[320,568],[390,667],[390,844],[844,390],[1280,720],[1920,948]]:
    [[320,568],[360,640],[390,667],[390,844],[430,932],[844,390],[568,320],[568,280],[1280,720],[1280,1000],[1366,768],[1920,948],[1920,1080]];
  for(const [width,height] of viewports){
    const context=await browser.newContext({viewport:{width,height},hasTouch:width<1000,reducedMotion:width===390&&height===667?'no-preference':'reduce'});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    try{
      let response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
      if(online&&response.status()===404){
        assert((await page.locator('body').innerText()).includes('页面访问提示'));
        await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:120000}),page.getByText(/^确[认定]访问$/).click()]);
      }
      let frame=await gameFrame(page);
      assert.equal(await page.evaluate(()=>scrollY),0,'A fresh visit starts at the top');
      const metrics=await measure(page,frame);
      await page.screenshot({path:path.join(out,`${width}x${height}.png`)});
      if(width===390&&height===844){
        await page.setViewportSize({width:390,height:568});
        await frame.waitForFunction(previous=>window.__trustStage.splashHeight<previous,metrics.stageHeight);
        const shorter=await measure(page,frame);
        assert(shorter.nodeCount<metrics.nodeCount,'Height-only shrink must reduce the decoration count');
        await page.setViewportSize({width:844,height:390});
        await frame.waitForFunction(()=>window.__trustStage.width===844);
        await measure(page,frame);
        await page.setViewportSize({width,height});
        await frame.waitForFunction(()=>window.__trustStage.width===390&&window.__trustStage.splashViewportHeight===844);
        await measure(page,frame);
        metrics.resizingAndRotation=true;
      }
      await frame.getByRole('button',{name:'开始 →',exact:true}).click();
      await frame.locator('body[data-scene="bakery"]').waitFor();
      await frame.waitForFunction(()=>!document.body.dataset.transition);
      assert(await frame.locator('#notes').isHidden(),'Prologue notes remain removed');
      await frame.getByRole('button',{name:'返回首页',exact:true}).click();
      await frame.locator('body[data-scene="opening"]').waitFor();
      await frame.waitForFunction(()=>!document.body.dataset.transition);
      await measure(page,frame);
      await page.reload();frame=await gameFrame(page);await measure(page,frame);
      results.push({...metrics,startAndHome:true,reload:true});
      console.log(`PASS ${width}x${height}: start in first screen, ${metrics.nodeCount} subjects, canvas ${metrics.stageHeight}px`);
    }catch(e){await page.screenshot({path:path.join(out,`failure-${width}x${height}.png`)}).catch(()=>{});throw e;}
    finally{await context.close();}
  }
  assert.deepEqual(errors,[]);
  const narrow=results.find(r=>r.viewport.width===320),tall=results.find(r=>r.viewport.height===844);
  assert(narrow.nodeCount<tall.nodeCount,'Smaller phones display fewer subjects');
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify({date:'2026-10-18',entry:online?'CloudBase':'standalone',results,errors},null,2)+'\n');
}finally{await browser.close();}
