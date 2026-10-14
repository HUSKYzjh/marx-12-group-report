import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {initialCourse,courseRound} from '../public/assets/market-duel/course-model.mjs';
import {EQUIPMENT_COST} from '../public/assets/market-duel/equipment-model.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile('build/index.html'),out='outputs/opening-guide-qa',key='technology-dividend:prologue:v1';
await fs.mkdir(out,{recursive:true});
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/`,browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],results=[];
try{
 for(const [width,height,touch] of [[1280,900,false],[390,844,true],[320,568,false]]){
  const ctx=await browser.newContext({viewport:{width,height},hasTouch:touch,reducedMotion:'reduce'}),page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  const host=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();
  await host.locator('body[data-ready="true"]').waitFor();
  const keyboard=width===320;
  const press=locator=>touch?locator.tap():keyboard?locator.press('Enter'):locator.click();
  await press(host.locator('#dots button[data-stage="2"]'));
  const battle=await(await host.locator('#prologue-battle').elementHandle()).contentFrame();
  await battle.locator('#opening-guide[open]').waitFor();
  await page.waitForFunction(key=>!!JSON.parse(localStorage.getItem(key)).battle,key);
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).battle,key),initial=await saved();
  assert.deepEqual(initial.state,initialCourse());
  assert.equal(await battle.evaluate(()=>[...document.querySelectorAll('[data-opening-art]')].every(image=>image.complete&&image.naturalWidth>0)),true,'illustrations load inside the offline embed');
  const firstDay=courseRound(initial.state,'hold').world.history[0];
  assert.equal(firstDay.wages[0],6);assert.equal(firstDay.made[0],6);
  assert((await battle.locator('[data-opening-page="0"]').innerText()).includes('重新开账'),'explain why this fresh battle differs from act one');
  assert((await battle.locator('[data-opening-page="0"]').innerText()).includes('每人 2'),'per-person daily wage is explicit');
  assert.equal(firstDay.after[0]-firstDay.before[0],7,'opening arithmetic matches actual first-day settlement');
  await battle.locator('#opening-next').press('Escape');
  assert.equal(await battle.locator('#opening-guide[open]').count(),1);
  assert.equal(await battle.locator('#opening-close:visible').count(),0);
  await page.screenshot({path:`${out}/${width}-cost.png`,fullPage:true});
  for(let step=0;step<5;step++){
   assert.equal(await battle.locator('#opening-progress').innerText(),`${step+1} / 5`);
   assert.equal(await battle.locator('[data-opening-page]:visible').count(),1);
   assert.equal(await battle.locator('.opening-topics [aria-current="step"]').innerText(),['成本','售价','机器','人手','生效时间'][step]);
   assert.deepEqual(await saved(),initial,'reading must not charge or play');
   assert(await battle.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const box=await battle.locator('#opening-guide').boundingBox();
   assert(box.y>=0&&box.y+box.height<=height+1,'dialog fits the actual viewport');
   const navigation=battle.locator(step===4?'#opening-start':'#opening-next');
   assert(await navigation.evaluate(n=>n.getBoundingClientRect().height>=44));
   if(step===1){
    const copy=await battle.locator('[data-opening-page="1"]').innerText();
    for(const label of ['调高／调低售价','照常营业'])assert(copy.includes(label));
    assert.equal(await battle.locator('#opening-sold').innerText(),'6');
    assert.equal(await battle.locator('#opening-sold-more').isDisabled(),true);
    for(let sold=5;sold>=0;sold--){
     await press(battle.locator('#opening-sold-less'));
     assert.equal(await battle.locator('#opening-sold').innerText(),String(sold));
     const text=await battle.locator('#opening-example-result').innerText();
     assert(text.includes('花掉\n12'));
     assert(text.includes(sold===4?'店里没变':sold<4?'店里少':'店里多'));
     assert.deepEqual(await saved(),initial,'trial sales never charge or play a round');
    }
    assert.equal(await battle.locator('#opening-sold-less').isDisabled(),true);
    await page.screenshot({path:`${out}/${width}-trial-loss.png`,fullPage:true});
    for(let i=0;i<6;i++)await press(battle.locator('#opening-sold-more'));
    assert((await battle.locator('#opening-example-result').innerText()).includes('花掉\n11'));
    await page.screenshot({path:`${out}/${width}-price.png`,fullPage:true});
   }
   if(step===2){
    const copy=await battle.locator('[data-opening-page="2"]').innerText();
    for(const label of ['购置机器','升级新机'])assert(copy.includes(label));
    assert(copy.includes(`购置机器 · ${EQUIPMENT_COST.buy}`));assert(copy.includes(`升级新机 · ${EQUIPMENT_COST.upgrade}`));
    await page.screenshot({path:`${out}/${width}-strategies.png`,fullPage:true});
   }
   if(step===3){
    const copy=await battle.locator('[data-opening-page="3"]').innerText();
    for(const label of ['招工','解聘','补偿'])assert(copy.includes(label));
    await page.screenshot({path:`${out}/${width}-staff.png`,fullPage:true});
   }
   if(step===4){
    assert.equal(await battle.locator('#opening-start').innerText(),'去选第一招 →');
    assert((await battle.locator('[data-opening-page="4"]').innerText()).includes('点下策略，就直接营业'));
    assert.equal(await battle.locator('.opening-extra').getAttribute('open'),null,'secondary stock rule is collapsed');
    await press(battle.locator('.opening-extra summary'));
    assert((await battle.locator('.opening-extra').innerText()).includes('第三天坏掉'));
    assert.deepEqual(await saved(),initial,'opening optional stock rules must not play');
    await press(battle.locator('.opening-extra summary'));
   }
   if(step<4){
    await battle.locator('#opening-guide').evaluate(n=>{n.scrollTop=n.scrollHeight;});
    await press(battle.locator('#opening-next'));
    assert.equal(await battle.locator('#opening-guide').evaluate(n=>n.scrollTop),0,'new page starts at its heading');
   }
  }
  await press(battle.locator('#opening-back'));
  assert.equal(await battle.locator('#opening-progress').innerText(),'4 / 5');
  await press(battle.locator('#opening-next'));
  await page.screenshot({path:`${out}/${width}-timing.png`,fullPage:true});
  await press(battle.locator('#opening-start'));
  assert.deepEqual(await saved(),initial,'starting guide only dismisses it');
  assert.equal(await battle.locator('#opening-guide[open]').count(),0);
  await press(battle.locator('[data-move="hold"]'));
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).battle.state.world.day===1,key);
  await battle.waitForFunction(()=>!document.querySelector('#restart').disabled);
  const played=await saved();
  assert.deepEqual(played.state,courseRound(initial.state,'hold'));
  await press(battle.locator('#opening-help'));
  await battle.locator('#opening-guide[open]').waitFor();
  assert.equal(await battle.locator('#opening-close:visible').count(),1);
  await press(battle.locator('#opening-next'));
  await press(battle.locator('#opening-close'));
  assert.deepEqual(await saved(),played,'review is view-only');
  await press(battle.locator('#restart'));
  await battle.locator('#opening-guide[open]').waitFor();
  assert.equal(await battle.locator('#opening-progress').innerText(),'1 / 5');
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).battle.state.world.day===0,key);
  results.push({width,height,touch,keyboard,fivePages:true,back:true,readingDoesNotPay:true,trialSalesDoNotPay:true,trialSalesIncludeStorage:true,startDoesNotPlay:true,firstDayMatchesModel:true,allStrategies:true,offlineIllustrations:true,review:true,restartShowsGuide:true,noHorizontalOverflow:true});
  console.log(`opening guide ${width} passed`);await ctx.close();
 }
 assert.deepEqual(errors,[]);assert(bytes.equals(await fs.readFile('build/index.html')));
 const report={sha256:createHash('sha256').update(bytes).digest('hex'),results,errors};
 await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});throw e;
}finally{await browser.close();await new Promise(r=>server.close(r));}
