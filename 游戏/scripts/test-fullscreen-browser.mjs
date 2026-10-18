import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url));
const url=process.env.GAME_TEST_URL||pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href;
const out=process.env.GAME_TEST_OUTPUT||path.join(root,'outputs/fullscreen-qa');
await fs.mkdir(out,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
const errors=[];
try{
  const page=await browser.newPage({viewport:{width:1920,height:948},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
  if(process.env.GAME_TEST_URL&&response.status()===404){
    assert((await page.locator('body').innerText()).includes('页面访问提示'));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:120000}),page.getByText(/^确[认定]访问$/).click()]);
  }
  const frame=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();
  await frame.locator('body[data-ready="true"][data-scene="opening"]').waitFor();
  await frame.waitForFunction(()=>!document.body.dataset.transition);
  const saved=()=>page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
  await frame.getByRole('button',{name:'全屏 ⛶',exact:true}).click();
  await page.waitForFunction(()=>document.fullscreenElement===document.documentElement);
  await frame.getByRole('button',{name:'退出全屏 ⛶',exact:true}).waitFor();
  await frame.getByRole('button',{name:'开始 →',exact:true}).click();
  await frame.locator('body[data-scene="bakery"]').waitFor();
  await frame.waitForFunction(()=>!document.body.dataset.transition);
  await page.waitForFunction(()=>Object.values(localStorage).some(value=>value.includes('"scene":"bakery"')));
  const before=await saved();
  await frame.getByRole('button',{name:'退出全屏 ⛶',exact:true}).click();
  await page.waitForFunction(()=>!document.fullscreenElement);
  assert.deepEqual(await saved(),before,'Exiting fullscreen preserves saved game state');
  assert.equal(await frame.locator('body').getAttribute('data-scene'),'bakery');
  await frame.getByRole('button',{name:'全屏 ⛶',exact:true}).click();
  await page.waitForFunction(()=>!!document.fullscreenElement);
  // Browser / OS exit must also update the control without recreating the frame.
  await page.evaluate(()=>document.exitFullscreen());
  await frame.getByRole('button',{name:'全屏 ⛶',exact:true}).waitFor();
  assert.deepEqual(await saved(),before,'External fullscreen exit preserves saved game state');
  await frame.getByRole('button',{name:'返回首页',exact:true}).click();
  await frame.locator('body[data-scene="opening"]').waitFor();
  await frame.waitForFunction(()=>!document.body.dataset.transition);
  await frame.waitForFunction(()=>Math.abs(document.querySelector('footer').getBoundingClientRect().bottom-parent.innerHeight)<1);
  const box=await frame.getByRole('button',{name:'开始 →',exact:true}).boundingBox();
  assert(box.y>=0&&box.y+box.height<=948,'Start remains in view after entering and exiting fullscreen');
  const about=frame.locator('footer>details>summary');
  await about.click();
  await frame.locator('footer>details[open]').waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight),'Expanded credits scroll naturally');
  await about.click();
  await frame.waitForFunction(()=>Math.abs(document.querySelector('footer').getBoundingClientRect().bottom-parent.innerHeight)<1);
  await page.screenshot({path:path.join(out,'desktop-1920x948.png')});
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,'fullscreen-report.json'),JSON.stringify({date:'2026-10-18',entry:process.env.GAME_TEST_URL?'CloudBase':'standalone',actualFullscreen:true,buttonExit:true,externalExit:true,progressPreserved:true,creditsScroll:true,footerFits:true,errors},null,2)+'\n');
  console.log('PASS actual fullscreen entry, button / browser exit, progress, credits and viewport fill');
}finally{await browser.close();}
