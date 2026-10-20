import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url)),remote=process.env.GAME_TEST_URL,out=process.env.GAME_TEST_OUTPUT||path.join(root,'outputs/street-contradiction');
await fs.mkdir(out,{recursive:true});const m=JSON.parse(await fs.readFile(path.join(root,'build/hosted/hosting-manifest.json'),'utf8')),errors=[],results=[],key='technology-dividend:prologue:v1';
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
try{
 for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<600,reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  let response=await page.goto(remote||pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,{waitUntil:'domcontentloaded',timeout:120000});
  if(remote&&response.status()===404)response=(await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:120000}),page.getByText(/^确[认定]访问$/).click()]))[0];
  if(remote)assert.equal(createHash('sha256').update(await response.body()).digest('hex'),m.index_sha256);
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  async function frame(){const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);return f;}
  let host=await frame();await host.locator('#dots button[data-stage="3"]').click();await host.locator('body[data-scene=street-economy]').waitFor();
  async function round(){const day=(await saved()).street.world.round;await host.locator('#street-run').click();await page.waitForFunction(({key,day})=>JSON.parse(localStorage.getItem(key)).street.world.round===day+1,{key,day});await host.locator('#street-run:not(:disabled)').waitFor();const s=(await saved()).street;assert.equal(s.world.people.length,20);assert.equal(s.world.firms.length,6);assert.equal(s.world.firms.reduce((n,f)=>n+f.cash,0)+s.world.people.reduce((n,p)=>n+p.cash,0),76800);return s;}
  assert.equal(await host.getByRole('button',{name:'继续看故事 →',exact:true}).count(),0);assert(await host.locator('[data-street-action=EXPAND_STREET]').isDisabled());
  let g=await round();assert.equal(g.report.produced,12);assert.equal(g.report.sold,12);assert.equal(await host.getByRole('button',{name:'继续看故事 →',exact:true}).count(),0);
  await host.locator('[data-street-action=EXPAND_STREET]').click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).street.world.firms[0].machines===3,key);g=(await saved()).street;assert.equal(g.report.investment,24);assert.equal(g.world.firms[0].workers.length,3);
  g=await round();assert.equal(g.report.produced,18);assert.equal(g.report.sold,18);
  await host.locator('[data-street-action=FOLLOW_EXPANSION]').click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).street.world.firms.find(f=>f.id==='rival').machines===2,key);
  g=await round();assert.equal(g.world.firms.filter(f=>['bakery','rival'].includes(f.id)).reduce((n,f)=>n+f.stock,0),3);assert.match(await host.getByTestId('street-evidence').innerText(),/出炉 36 → 卖出 33 → 剩 3/);
  assert.equal(g.world.people.filter(p=>p.shopping?.items[0].outcome==='money').length,2);
  await host.getByRole('button',{name:'减少每人每轮工资',exact:true}).click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).street.wage===4,key);g=await round();assert.equal(g.report.wageBill,12);const actual=structuredClone(g);
  await host.locator('main').screenshot({path:path.join(out,`${width}-real-surplus.png`)});
  await host.getByRole('button',{name:'收摊：看看矛盾在哪里 →',exact:true}).click();await host.getByRole('dialog').waitFor();await page.screenshot({path:path.join(out,`${width}-popup-collapsed.png`)});await host.locator('.street-review-details summary').click();await host.getByTestId('street-wage-comparison').waitFor();
  const modal=host.getByRole('dialog');assert.match(await modal.innerText(),/一家付出的工资，也是别家顾客的购买力/);assert.match(await modal.innerText(),/本轮面包：出炉/);
  const bounds=await modal.boundingBox();assert(bounds.width<=width&&bounds.height<=900);await page.screenshot({path:path.join(out,`${width}-popup.png`)});
  if(width===320){await page.setViewportSize({width,height:660});await modal.waitFor();await page.waitForTimeout(300);const short=await modal.boundingBox();assert(short.y>=0&&short.y+short.height<=661);assert.equal(await modal.evaluate(n=>n.open),true);await page.screenshot({path:path.join(out,'320-short-popup.png')});await page.setViewportSize({width,height:900});}
  const review=await host.locator('#readout').innerText();assert.match(review,/生产社会化/);assert.match(review,/生产资料的资本主义私人占有/);assert.match(review,/资本主义基本矛盾/);assert.match(review,/相对有支付能力需求的过剩/);assert.match(review,/38/);assert.match(review,/33/);
  const rows=await host.getByTestId('street-wage-comparison').locator('tbody tr').allTextContents();assert(rows.some(r=>r.includes('20')&&r.includes('17')));assert(rows.some(r=>r.includes('38')&&r.includes('33')));assert(rows.some(r=>r.includes('6')&&r.includes('7')));
  assert.deepEqual((await saved()).street.world,actual.world);await host.locator('main').screenshot({path:path.join(out,`${width}-contradiction-review.png`)});
  await page.reload({waitUntil:'domcontentloaded'});host=await frame();await host.getByRole('dialog').waitFor();await page.screenshot({path:path.join(out,`${width}-popup-collapsed.png`)});await host.locator('.street-review-details summary').click();await host.getByTestId('street-wage-comparison').waitFor();assert.deepEqual((await saved()).street.world,actual.world);
  await page.keyboard.press('Escape');await host.locator('#street-run').waitFor();assert.deepEqual((await saved()).street.world,actual.world);
  await host.getByRole('button',{name:'收摊：看看矛盾在哪里 →',exact:true}).click();await host.getByRole('dialog').waitFor();await host.getByRole('button',{name:'回到街上，换个办法',exact:true}).click();await host.locator('#street-run').waitFor();assert.deepEqual((await saved()).street.world,actual.world);
  await host.getByRole('button',{name:'如果别家也降薪',exact:true}).click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).street.response==='cut',key);await round();
  const final=(await saved()).street;await host.getByRole('button',{name:'收摊：看看矛盾在哪里 →',exact:true}).click();await host.getByRole('button',{name:'继续看故事 →',exact:true}).click();await host.locator('body[data-scene=ending]').waitFor();assert.equal(await host.getByTestId('family-story-boundary').count(),0);
  await host.getByRole('button',{name:'继续听 →',exact:true}).click();await host.getByRole('button',{name:'继续听 →',exact:true}).click();await host.getByRole('button',{name:'再看看这条街 →',exact:true}).click();await host.locator('body[data-scene=street-summary]').waitFor();
  await host.locator('#dots button[data-stage="4"]').click();await host.locator('body[data-scene=relief]').waitFor();assert.deepEqual((await saved()).street.world,final.world);
  assert.equal(await host.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  results.push({width,realInitialSale:12,realExpandedSale:18,followedProduction:36,followedSales:33,followedStock:3,unaffordableBread:2,matchedWages:[38,33],matchedOwnCashChanges:[20,17],matchedStocks:[6,7],people:20,money:76800,refresh:true,comparisonDoesNotMutateLedger:true,canReturnToManagement:true,storyAndFourthActContinue:true,noUpdateDisclaimer:true,noStateInjection:true});console.log(`PASS ${width}: funded competition → actual surplus and unmet needs → matched wage response → story`);await context.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({date:'2026-10-19',sourceSHA256:m.source_sha256,indexSHA256:m.index_sha256,results,errors},null,2)+'\n');
}catch(e){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw e;}finally{await browser.close();}
