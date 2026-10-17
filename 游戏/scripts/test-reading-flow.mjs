import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {hostedTestServer} from './hosted-test-server.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url)),baseline=!!process.env.GAME_TEXT_BASELINE;
const remote=process.env.GAME_TEST_URL;
const server=remote?null:await hostedTestServer(path.join(root,'build/hosted'));
const out=process.env.GAME_TEST_OUTPUT||path.join(root,'outputs/reading-flow');await fs.mkdir(out,{recursive:true});
const manifest=JSON.parse(await fs.readFile(path.join(root,'build/hosted/hosting-manifest.json'),'utf8'));
const key='technology-dividend:prologue:v1',results=[],errors=[];
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
const words=text=>text.replace(/\s/g,'').length;
try{
 for(const [width,height] of [[320,568],[390,667],[1280,900]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<600,reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().includes('/runtime-assets/')&&r.status()>=400)errors.push(`Asset ${r.status()}: ${r.url()}`);});
  let response=await page.goto(remote||server.url,{waitUntil:'domcontentloaded',timeout:120000});
  if(remote&&response.status()===404)response=(await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:120000}),page.getByText(/^确[认定]访问$/).click()]))[0];
  assert.equal(response.status(),200);
  assert.equal(createHash('sha256').update(await response.body()).digest('hex'),manifest.index_sha256);
  const frame=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();
  await frame.locator('body[data-ready="true"]').waitFor();await frame.waitForFunction(()=>!document.body.dataset.transition);
  await frame.locator('#dots button').nth(2).click();
  const battle=await(await frame.locator('#prologue-battle').elementHandle()).contentFrame();
  await battle.locator('#opening-guide[open]').waitFor();
  const press=locator=>width<600?locator.tap():locator.click();
  await page.screenshot({path:path.join(out,`${width}-opening.png`)});
  const guidePages=[];
  if(baseline){
   while(true){guidePages.push(await battle.locator('[data-opening-page]:visible').innerText());if(!await battle.locator('#opening-next').isVisible())break;await press(battle.locator('#opening-next'));}
  }else{
   await page.keyboard.press('Escape');assert(await battle.locator('#opening-guide').evaluate(n=>n.open));
   for(let step=0;step<5;step++){
    assert.equal(await battle.locator('[data-opening-page]:visible').count(),1);
    assert.equal(await battle.locator('#opening-progress').innerText(),`${step+1} / 5`);
    assert.equal(await battle.locator('#opening-start').isVisible(),step===4,'Start appears only after the fifth page');
    const button=battle.locator(step===4?'#opening-start':'#opening-next');
    const box=await button.boundingBox();
    assert(box.width>=44&&box.height>=44&&box.y>=0&&box.y+box.height<=height,'Navigation is inside the real viewport');
    guidePages.push(await battle.locator('[data-opening-page]:visible').innerText());
    await page.screenshot({path:path.join(out,`${width}-guide-${step+1}.png`)});
    if(step<4)await press(button);
   }
  }
  await press(battle.locator('#opening-start'));
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).battle?.openingRead===true,key);
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).battle,key);
  const initial=await saved();assert.equal(initial.state.world.day,0);assert.equal(initial.state.world.shops[0].cash,36);
  const chooseWords=words(await battle.locator('main').innerText());
  await page.screenshot({path:path.join(out,`${width}-choose.png`)});
  if(!baseline){
   // Important decision information remains reachable without blocking play.
   await press(battle.locator('#opening-help'));
   await press(battle.locator('#opening-next'));
   assert.equal(await battle.locator('[data-opening-rule="buy"] td').innerText().then(t=>t.match(/^\d+/)[0]),'10');
   await press(battle.locator('#opening-next'));
   assert.match(await battle.locator('[data-opening-rule="upgrade"]').innerText(),/8/);
   assert.match(await battle.locator('[data-opening-rule="fire"]').innerText(),/1/);
   // A returning player can close the reopened instructions at any page.
   await press(battle.locator('#opening-close'));
   assert.equal(await battle.locator('#opening-guide').evaluate(n=>n.open),false);
   assert.deepEqual(await saved(),initial,'Consulting a price table never starts a paid turn');
   await press(battle.locator('#opening-help'));
   while(await battle.locator('#opening-next').isVisible())await press(battle.locator('#opening-next'));
   await battle.locator('.opening-extra').first().locator('summary').click();
   assert.match(await battle.locator('.opening-extra').first().innerText(),/36/);
   assert.match(await battle.locator('.opening-extra').first().innerText(),/11/);
   assert.match(await battle.locator('.opening-timing').innerText(),/下回合/);
   await press(battle.locator('#opening-close'));
   assert(await battle.locator('#choose-label').isHidden());
   assert(await battle.locator('.player-status .level').isHidden());
   await press(battle.locator('[data-move="hold"]'));
   await battle.waitForFunction(()=>!document.querySelector('#restart').disabled&&document.querySelector('#advance').offsetHeight>0);
   assert.equal((await saved()).state.world.shops[0].cash,43);
   assert.equal((await saved()).state.world.day,1);
   assert.match(await battle.locator('#subline').innerText(),/7/);
   assert(await battle.locator('#receipt').isVisible());
   await page.screenshot({path:path.join(out,`${width}-result.png`)});
   for(const f of [page,frame,battle])assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.reload();const resumed=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();
   await resumed.locator('body[data-ready="true"]').waitFor();
   const resumedBattle=await(await resumed.locator('#prologue-battle').elementHandle()).contentFrame();
   await resumedBattle.locator('#advance').waitFor();assert.equal(await resumedBattle.locator('#opening-guide').evaluate(n=>n.open),false);
  }
  results.push({width,height,requiredPages:guidePages.length,requiredBodyCharacters:guidePages.reduce((n,t)=>n+words(t),0),chooseCharacters:chooseWords,openingReadWithoutPayment:true,...(!baseline?{fivePagesRequired:true,startOnFinalPageOnly:true,priceReferenceAccessible:true,closeReopenedGuide:true,receiptCorrect:true,reload:true,noOverflow:true}:{})});
  console.log(`PASS ${baseline?'baseline':'five-page opening'} ${width}: ${guidePages.length} required page(s), ${chooseWords} playing-screen characters`);
  await context.close();
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({date:'2026-10-17',baseline,entry:remote?'online':'local',indexSha256:manifest.index_sha256,results,errors},null,2)+'\n');
}finally{await browser.close();await server?.close();}
