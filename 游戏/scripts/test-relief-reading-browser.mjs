import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url)),remote=process.env.GAME_TEST_URL,out=process.env.GAME_TEST_OUTPUT||path.join(root,'outputs/relief-reading');
const manifest=JSON.parse(await fs.readFile(path.join(root,'build/hosted/hosting-manifest.json'),'utf8')),key='technology-dividend:prologue:v1',results=[],errors=[];
assert.equal(createHash('sha256').update(await fs.readFile(path.join(root,'offline/技术红利去了哪里.html'))).digest('hex'),manifest.source_sha256);
await fs.mkdir(out,{recursive:true});const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
try{
 for(const [width,height] of [[320,568],[390,844],[1280,900]]){
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',hasTouch:width<600}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  let response=await page.goto(remote||pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,{waitUntil:'domcontentloaded',timeout:120000});
  if(remote&&response.status()===404)response=(await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:120000}),page.getByText(/^确[认定]访问$/).click()]))[0];
  if(remote)assert.equal(createHash('sha256').update(await response.body()).digest('hex'),manifest.index_sha256);
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  async function frame(){const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);return f;}
  let host=await frame();await host.locator('#dots button[data-stage="4"]').click();await host.getByTestId('relief-reading-menu').waitFor();
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).scene==='relief',key);const initial=await saved();assert.deepEqual(initial.remedyLabs,{});assert.equal(initial.reliefReadingFinished,false);
  assert.equal(await host.locator('.remedy-card').count(),3);assert.equal(await host.locator('[data-gesture-target],.remedy-battle,.remedy-flow,.mortgage-entry,.remedy-counter,input,select:not(#chapter-select)').count(),0);
  await host.locator('main').screenshot({path:path.join(out,`${width}-menu.png`)});
  const routes=[['consumption','增加消费',/加收入与借钱有什么不同/],['investment','增加投资',/替换旧设备/],['exports','增加出口',/出口额与净出口有什么不同/]];
  for(const [index,[id,title,distinct]] of routes.entries()){
   await host.locator(`.remedy-card[data-route="${id}"]`).click();const dialog=host.getByRole('dialog',{name:title,exact:true});await dialog.waitFor();
   const text=await dialog.innerText();assert.match(text,distinct);assert.match(text,/为什么可能有效/);assert.match(text,/局限在哪里/);assert.match(text,/不等于改变生产资料的占有关系/);assert.equal(await dialog.locator('input,select,[draggable=true],[data-gesture-target]').count(),0);assert.equal(await dialog.locator('button').count(),2);assert.equal(await dialog.locator('section').count(),4);
   await page.waitForTimeout(150);const box=await dialog.boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+2);
   assert.equal(await host.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(await saved(),initial);
   await page.screenshot({path:path.join(out,`${width}-${id}.png`)});
   if(index===0){await page.keyboard.press('Escape');}
   else if(index===1){await dialog.getByRole('button',{name:'关闭解释',exact:true}).click();}
   else{await dialog.getByRole('button',{name:'返回三张药方',exact:true}).click();}
   await host.getByRole('dialog').waitFor({state:'detached'});assert.equal(await host.locator('.remedy-card').count(),3);assert.deepEqual(await saved(),initial);
   assert.equal(await page.evaluate(()=>document.body.style.overflow==='hidden'),false);
  }
  await page.reload({waitUntil:'domcontentloaded'});host=await frame();await host.getByTestId('relief-reading-menu').waitFor();assert.deepEqual(await saved(),initial);
  await host.getByRole('button',{name:'继续故事 →',exact:true}).click();await host.locator('body[data-scene=epilogue]').waitFor();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).scene==='epilogue',key);
  const continued=await saved();assert(continued.reliefReadingFinished);for(const field of ['reliefCompleted','reliefVisited','remedyLabs','street','battle'])assert.deepEqual(continued[field],initial[field]);
  await page.reload({waitUntil:'domcontentloaded'});host=await frame();await host.locator('body[data-scene=epilogue]').waitFor();assert.deepEqual(await saved(),continued);
  await host.getByRole('button',{name:'看完这一段',exact:true}).click();await host.getByRole('button',{name:'换个条件，会怎样？ →',exact:true}).click();await host.locator('body[data-scene=assumptions]').waitFor();
  await page.reload({waitUntil:'domcontentloaded'});host=await frame();await host.locator('body[data-scene=assumptions]').waitFor();await host.locator('#dots button[data-stage="4"]').click();await host.getByTestId('relief-reading-menu').waitFor();assert.equal(await host.locator('.remedy-card').count(),3);assert.deepEqual((await saved()).remedyLabs,{});
  results.push({width,height,threeDistinctExplanationDialogs:true,noPolicyGameControls:true,readingDoesNotChangeState:true,allThreeCloseMethods:true,modalWithinViewport:true,refresh:true,continuationWithoutTrials:true,noInventedAccounts:true,researchAndReturn:true,noStateInjection:true});console.log(`PASS ${width}: three explanations → close/refresh → epilogue without trials → research → return`);await ctx.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({date:'2026-10-20',sourceSHA256:manifest.source_sha256,indexSHA256:manifest.index_sha256,results,errors},null,2)+'\n');
}catch(e){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw e;}finally{await browser.close();}
