import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readOpeningGuide,chooseBattleMove} from './prologue-battle-browser-gestures.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url)),remote=process.env.GAME_TEST_URL;
const manifest=JSON.parse(await fs.readFile(path.join(root,'build/hosted/hosting-manifest.json'),'utf8'));
const out=process.env.GAME_TEST_OUTPUT||path.join(root,'outputs/third-act-six-firms');await fs.mkdir(out,{recursive:true});
const key='technology-dividend:prologue:v1',results=[],errors=[];
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
try{
 for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:width===320?568:900},hasTouch:width<600,reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  let response=await page.goto(remote||pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,{waitUntil:'domcontentloaded',timeout:120000});
  if(remote&&response.status()===404)response=(await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:120000}),page.getByText(/^确[认定]访问$/).click()]))[0];
  if(remote)assert.equal(createHash('sha256').update(await response.body()).digest('hex'),manifest.index_sha256);
  async function hostFrame(){const host=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await host.locator('body[data-ready="true"]').waitFor();await host.waitForFunction(()=>!document.body.dataset.transition);return host;}
  let host=await hostFrame();await host.locator('#dots button[data-stage="2"]').click();
  let battle=await(await host.locator('#prologue-battle').elementHandle()).contentFrame();await readOpeningGuide(battle);
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  async function play(move){
   const s=(await saved()).battle,day=s.state.world.day+1;await chooseBattleMove(battle,move);
   await page.waitForFunction(({key,day})=>JSON.parse(localStorage.getItem(key)).battle.state.world.day===day,{key,day});
   await battle.waitForFunction(()=>!document.querySelector('#restart').disabled);await battle.locator('#advance').click();
   await page.waitForFunction(({key,mode,day})=>{const s=JSON.parse(localStorage.getItem(key)).battle;return s.view==='choose'&&s.state.world.day===day&&s.state.mode===mode;},{key,mode:s.state.mode==='waves'&&day===5?'done':s.state.mode,day});
  }
  assert.equal((await saved()).battle.state.externalOnly,true);
  assert.equal(await battle.locator('#moves details').count(),0);
  for(const move of ['price-up','price-up','wage-down'])await play(move);
  assert.equal((await saved()).battle.state.world.shops[0].cash,90);assert.match(await battle.locator('#steady-maximum').innerText(),/54/);
  await battle.locator('#next-scene').click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).battle.state.mode==='waves',key);
  for(const move of ['expand','upgrade','hold','hold','hold'])await play(move);
  const duel=structuredClone((await saved()).battle);
  assert.equal(duel.state.mode,'done');assert.equal(duel.state.world.day,5);assert.equal(duel.state.archive.steady.day,3);
  assert.deepEqual(duel.state.world.history.map(r=>r.demand),[12,20,20,6,12]);
  assert.equal(await battle.locator('#open-six').count(),0);assert.equal(await battle.locator('#street-panel').isVisible(),false);
  assert.match(await battle.locator('#next-scene').innerText(),/第三幕.*六家厂商/);
  assert.match(await battle.locator('#ending-copy').innerText(),/12 → 20 → 20 → 6 → 12/);
  assert.doesNotMatch(await battle.locator('#ending').innerText(),/收入与购买力|工资支出/);
  await battle.locator('#ending').screenshot({path:path.join(out,`${width}-second-act-end.png`)});
  await battle.locator('#next-scene').click();await host.locator('body[data-scene="street-economy"]').waitFor();
  let s=await saved();assert.equal(s.scene,'street-economy');assert.deepEqual(s.battle,duel);
  assert.equal(s.street.world.round,0);assert.equal(s.street.world.firms.length,6);assert.equal(s.street.world.people.length,20);
  assert.equal(s.street.campaign,undefined);assert.equal(s.street.tutorial,undefined);
  assert.equal(await host.locator('.street-shop-hit').count(),6);assert.equal(await host.locator('.street-person').count(),20);
  assert.equal(await host.locator('#dots button[aria-current=step]').getAttribute('data-stage'),'3');
  assert.equal(await host.locator('[data-street-action=BEGIN_CAMPAIGN]').count(),0);
  assert.match(await host.locator('#slideshow').innerText(),/第三幕.*各家的算盘/);
  await host.locator('main').screenshot({path:path.join(out,`${width}-six-firms.png`)});
  const money=w=>w.firms.reduce((n,f)=>n+f.cash,0)+w.people.reduce((n,p)=>n+p.cash,0);
  const initialMoney=s.street.world.initialMoney;assert.equal(initialMoney,76800);assert.equal(money(s.street.world),initialMoney);
  await host.getByRole('button',{name:'减少每人每轮工资',exact:true}).click();
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).street.wage===4,key);assert.equal((await saved()).street.wage,4);
  for(let round=0;round<2;round++){
   await host.locator('#street-run').click();await page.waitForFunction(({key,round})=>JSON.parse(localStorage.getItem(key)).street.world.round===round+1,{key,round});
   await host.locator('#street-run:not(:disabled)').waitFor();s=await saved();assert.equal(money(s.street.world),initialMoney);assert.deepEqual(s.battle,duel);
   assert(s.street.report.transactions.some(t=>t.kind==='wage'&&t.from==='bakery'&&t.amount===4));
   assert(s.street.report.transactions.some(t=>t.kind==='inputs'&&t.to==='inputs'));
  }
  const street=structuredClone(s.street);
  await host.locator('.street-shop-hit[data-firm=inputs]').click();await host.locator('.shop-ledger-shade:not([hidden]) .shop-ledger-dialog').waitFor();
  assert.match(await host.locator('.shop-ledger-shade:not([hidden]) .shop-ledger-dialog').innerText(),/原料|仓储/);await page.keyboard.press('Escape');
  await page.reload({waitUntil:'domcontentloaded'});host=await hostFrame();assert.deepEqual((await saved()).street,street);assert.equal((await saved()).scene,'street-economy');
  await host.locator('#dots button[data-stage="2"]').click();battle=await(await host.locator('#prologue-battle').elementHandle()).contentFrame();await battle.locator('#ending:not([hidden])').waitFor();assert.deepEqual((await saved()).battle,duel);
  await host.locator('#dots button[data-stage="3"]').click();await host.locator('body[data-scene="street-economy"]').waitFor();assert.deepEqual((await saved()).street,street);
  const overflow=await host.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);assert.equal(overflow,false);
  await host.locator('main').screenshot({path:path.join(out,`${width}-finite-wallet-round-two.png`)});
  await host.getByRole('button',{name:'收摊：看看矛盾在哪里 →',exact:true}).click();
  await host.getByRole('button',{name:'继续看故事 →',exact:true}).click();await host.locator('body[data-scene="ending"]').waitFor();
  assert.equal(await host.locator('#dots button[aria-current=step]').getAttribute('data-stage'),'3');
  assert.equal(await host.getByTestId('family-story-boundary').count(),0);
  await host.getByRole('button',{name:'继续听 →',exact:true}).click();await host.getByRole('button',{name:'继续听 →',exact:true}).click();await host.getByRole('button',{name:'再看看这条街 →',exact:true}).click();await host.locator('body[data-scene="street-summary"]').waitFor();
  await host.locator('#dots button[data-stage="4"]').click();await host.locator('body[data-scene="relief"]').waitFor();assert.deepEqual((await saved()).street.world,street.world);
  results.push({width,secondActDays:[3,5],noTwoShopWalletRound:true,upperMaximum:54,thirdActFirms:6,thirdActPeople:20,initialMoney,completedStreetRounds:2,fundedPayroll:true,fundedSupplierPayment:true,moneyConserved:true,duelPreserved:true,refresh:true,actNavigationPreservesLedger:true,storyAndFourthActContinue:true,noHorizontalOverflow:true,noStateInjection:true});
  console.log(`PASS ${width}: 3+5 days → third-act six firms; actual wages, supply, two conserved rounds, refresh, story and fourth act`);await context.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({date:'2026-10-19',entry:remote?'CloudBase':'standalone',sourceSHA256:manifest.source_sha256,indexSHA256:manifest.index_sha256,results,errors},null,2)+'\n');
}catch(error){for(const c of browser.contexts())for(const page of c.pages())await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw error;}finally{await browser.close();}
