import {chooseCondition} from './assumption-browser-gestures.mjs';
import {completeBattle} from './prologue-battle-browser-gestures.mjs';
/** Fresh browser contexts. No model snapshots, reducer dispatch or clock injection.
 * Click the actual story from home to all eight conditional conclusions. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {assumptionObservations} from '../lib/assumption-observations.ts';
import {checkAssumptionCardLayout} from './assumption-card-layout.mjs';
import {streetMoney,STREET_CAMPAIGN_CASH} from '../lib/street-game.ts';
import {calendarPaidRest} from './time-calendar-browser-gestures.mjs';
import {moveFreight,finishFreight} from './space-freight-browser-gestures.mjs';
import {moveCare,runCare,coverCareBatch,trainCare} from './care-routing-browser-gestures.mjs';
import {moveNetwork,runNetwork,moveNetworkNext,compareNetworkNext} from './platform-network-browser-gestures.mjs';
import {moveCouncil,arrangeCouncil,payCouncil,voteCouncil} from './sharing-council-browser-gestures.mjs';
import {beginProduction,productionFinish,productionBack} from './council-production-browser-gestures.mjs';
import {demandBenchmark,demandButton,demandState} from './public-demand-browser-gestures.mjs';
import {workbenchTrial,workbenchButton} from './preservation-browser-gestures.mjs';
import {beginAutomation,arrangeAll} from './automation-browser-gestures.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),{loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html')),server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});
assert(bytes.equals(await fs.readFile(path.join(root,'offline/技术红利去了哪里.html'))),'online and offline artifacts must match before QA');
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,out=path.join(root,'outputs/complete-story-qa');await fs.mkdir(out,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
const widthArg=process.argv.find(a=>a.startsWith('--width='));
const selectedWidth=widthArg?Number(widthArg.slice(8)):null;
if(selectedWidth!==null&&![1280,390].includes(selectedWidth))throw new Error('Complete story width must be 1280 or 390');
const specs=[{width:1280},{width:390,offline:true}].filter(s=>selectedWidth===null||s.width===selectedWidth);
const samplePath=process.argv.includes('--sample');
const reportName='report'+(samplePath?'-sample':'')+(selectedWidth===null?'':'-'+selectedWidth)+'.json';
const named=(f,name)=>f.getByRole('button',{name,exact:true}),game=f=>f.evaluate(()=>window.__trustStage.street.game);
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROLOGUE_STORAGE_KEY);
async function frame(page){const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();return f;}
async function settled(f){await f.waitForFunction(()=>!document.body.dataset.transition);}
async function scene(f,name){await f.locator('body[data-scene="'+name+'"]').waitFor();await settled(f);}
async function click(page,f,name){const before=JSON.stringify(await saved(page));await named(f,name).click();await page.waitForFunction(({key,before})=>localStorage.getItem(key)!==before,{key:PROLOGUE_STORAGE_KEY,before});await settled(f);}
async function streetClick(f,locator){const before=JSON.stringify(await game(f));await locator.click();await f.waitForFunction(before=>JSON.stringify(window.__trustStage.street.game)!==before,before);await f.waitForFunction(()=>window.__trustStage.street.time===8&&!document.body.dataset.transition);}
async function fits(f){assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(await f.locator('#readout,#controls,#street-briefing').evaluateAll(nodes=>nodes.flatMap(el=>{const walker=document.createTreeWalker(el,4),bad=[];let n;while((n=walker.nextNode()))if(n.nodeValue.includes('枚')&&!n.parentElement.closest('.money-spoken-unit,svg'))bad.push(n.nodeValue);return bad;})),[]);}
async function checkObservations(page,f){
 const before=await saved(page),actual=assumptionObservations(before),shown=await f.locator('[data-branch-observation]').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>[n.dataset.branchObservation,{context:n.querySelector('.assumption-observation-context').textContent,facts:[...n.querySelectorAll('[data-fact]')].map(f=>({label:f.dataset.fact,value:Number(f.dataset.value)}))}])));
 assert.deepEqual(Object.keys(shown).sort(),Object.keys(actual).sort());
 for(const [branch,record] of Object.entries(actual)){assert.equal(shown[branch].context,record.context);assert.deepEqual(shown[branch].facts,record.facts.map(({label,value})=>({label,value})));}
 await fits(f);await checkAssumptionCardLayout(f);assert.deepEqual(await saved(page),before,'reading actual observations must not execute or edit any story');return Object.keys(actual);
}
async function enter(page,f,group,branch,intro){await chooseCondition(f,group);await f.locator('[data-branch="'+branch+'"]').click();assert.equal(await f.locator('.technology-report').count(),0,'intro must not present the research report');if(branch==='automation')await beginAutomation(f);else await named(f,intro).click();await page.waitForFunction(({key,branch})=>{const s=JSON.parse(localStorage.getItem(key)||'null');return ['technology','needsTechnology','ownershipTechnology','marketRules'].some(k=>s?.[k]?.branch===branch&&s[k].phase==='lab');},{key:PROLOGUE_STORAGE_KEY,branch});assert.equal(await f.locator('.technology-report').count(),0,'play must not present the research report');await fits(f);}
async function reportAndBack(f,selector,expected){
 await f.locator(selector).waitFor();
 if(selector==='[data-testid="technology-report"]'){
 // Read the provenance through the real folded report, then restore its initial presentation.
 await f.locator(selector+'>summary').click();const reader=f.getByTestId('research-reader'),topic=reader.getByRole('combobox',{name:'选择资料主题'});await topic.selectOption({label:'文稿背景（逐篇）'});assert.equal(await reader.getAttribute('data-page-count'),'5');for(const [i,date] of ['2020-12-12','2021-02-02','2023-04-14','2024-05-18','2026-02-20'].entries()){assert.equal(await reader.locator('.research-paragraph').count(),1);const text=await reader.locator('.research-paragraph').innerText();assert(text.includes(date));assert.match(text,/不是学界共识/);assert.match(text,/机器稿未逐句听校/);assert.equal(await reader.locator('a[href^="https://www.bilibili.com/video/"]').count(),1);if(i<4)await reader.getByRole('button',{name:'下一段 →',exact:true}).click();}await topic.selectOption('1');await f.locator(selector+'>summary').click();
 }
 const copy=await f.locator('[class$="-conclusion"] p').evaluateAll(nodes=>nodes.filter(n=>!n.closest('details')).map(n=>n.textContent));assert.equal(copy.length,1,'ending should have one visible conclusion, not a theory essay');assert(copy[0].length<50);
 assert.equal(await f.locator('[class$="-conclusion"] details[open]').count(),0,'extra explanations must start folded');
 await f.locator(selector+'>summary').click();const reader=f.getByTestId('research-reader');assert.equal(await reader.locator('.research-paragraph').count(),1);assert((await reader.locator('.research-paragraph').innerText()).length<900);const text=await reader.evaluate(n=>n.researchText);assert(text.length>1000);assert(text.includes(expected),text.slice(0,90)+'：缺少 '+expected);assert(/现实|过渡|转型|情景/.test(text));assert(text.includes('资本主义')&&text.includes('社会主义'));await fits(f);console.log('Report checked: '+text.split('\n')[0]);await named(f,'回到假设目录 ↩').click();await scene(f,'assumptions');await checkObservations(f.page(),f);}
try{for(const spec of specs){
 const context=await browser.newContext({viewport:{width:spec.width,height:960},hasTouch:spec.width<600,reducedMotion:'reduce'});await context.route('**/*',r=>{if(r.request().url().startsWith(url)||spec.offline&&r.request().url()===offline)return r.continue();external.push(r.request().url());return r.abort();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(spec.offline?offline:url);let f=await frame(page);await scene(f,'opening');assert.equal((await saved(page)).scene,'opening');assert.equal((await saved(page)).reliefCompleted.length,0);
 assert(await f.locator('#dots button[data-stage="5"]').isDisabled());assert(await f.locator('#dots button[data-stage="6"]').isDisabled());await f.locator('#chapter-toggle').click();for(const id of ['automation','needs','ownership','rules'])assert(await f.locator('[data-chapter="'+id+'"]').isEnabled());await f.locator('#chapter-toggle').click();
 await named(f,'开始 →').click();await scene(f,'bakery');await named(f,'看完这一幕').click();await scene(f,'bakery-upgrade');await named(f,'看完这一幕').click();await f.locator('#upgrade-choices').waitFor();await fits(f);
 await named(f,'就这样分 →').click();await f.waitForFunction(()=>window.__trustStage.bakery.sample.showBalances);await named(f,'再买些烤炉 →').click();await scene(f,'bakery-expansion');for(let i=0;i<7;i++)await named(f,'下一步 →').click();await f.locator('#expansion-question').waitFor();assert.equal(await f.evaluate(()=>window.__trustStage.expansion.sample.count),64);await fits(f);
 await named(f,'继续看看 →').click();await scene(f,'street');
 const battle=await completeBattle(page,f,PROLOGUE_STORAGE_KEY),battleRecord=(await saved(page)).battle;
 await page.screenshot({path:path.join(out,spec.width+'-battle.png'),fullPage:true});
 await battle.locator('#open-six').click();await f.locator('body[data-street-mode="sandbox"]').waitFor();
 let g=await game(f);assert.equal(g.world.round,0);assert(g.world.firms.every(x=>x.stock===0));assert.equal(g.world.people.length,20);
 const funds=Object.fromEntries(g.world.firms.map(x=>[x.id,x.cash]));assert.deepEqual(funds,Object.fromEntries(Object.entries(STREET_CAMPAIGN_CASH).map(([id,n])=>[id,n*100])));assert.equal(g.wage,5);
 await streetClick(f,f.locator('#street-run'));g=await game(f);assert.equal(streetMoney(g.world),g.world.initialMoney);assert.equal(g.world.round,1);assert.equal(g.campaign,undefined);
 assert.deepEqual((await saved(page)).battle,battleRecord);await fits(f);await page.screenshot({path:path.join(out,spec.width+'-six-shops.png'),fullPage:true});
 await page.reload();f=await frame(page);await scene(f,'street');assert.equal((await saved(page)).street.world.round,1);
 await named(f,'继续看故事 →').click();await scene(f,'ending');assert((await f.locator('.dialogue').innerText()).includes('家里没钱买面包'));for(const expected of ['我失业了','面包太多']){await named(f,'继续听 →').click();await f.waitForFunction(expected=>document.querySelector('.dialogue').textContent.includes(expected),expected);}await named(f,'再看看这条街 →').click();await scene(f,'street-summary');assert.equal(await f.locator('.street-summary-panels section').count(),2);assert.equal(await f.locator('.street-summary-panels svg[role="img"]').count(),2);assert((await f.locator('.street-summary-definition').innerText()).includes('买得起的需求'));await fits(f);await named(f,'还有什么办法？ →').click();await scene(f,'relief');
 const prescriptions=[['consumption','credit','raise'],['investment','expand','replace'],['exports','single','diverse']];
 for(const [route,mode,counter] of (samplePath?prescriptions.slice(0,1):prescriptions)){
  await f.locator('.remedy-card[data-route="'+route+'"]').click();await settled(f);assert(!(await saved(page)).reliefCompleted.includes(route));
  // Three days are this test's sample, not a game boundary or required shock.
  for(const [n,move] of [mode,mode,counter].entries()){const before=JSON.stringify(await saved(page));await f.locator('[data-gesture-target="'+move+'"]').click();await page.waitForFunction(({key,before})=>localStorage.getItem(key)!==before,{key:PROLOGUE_STORAGE_KEY,before});await settled(f);assert.equal((await saved(page)).remedyLabs[route].history.length,n+1);await fits(f);}
  const trial=(await saved(page)).remedyLabs[route];assert.equal(trial.flow,route==='consumption'?'consumption-open':'production-open');assert(trial.history.every(r=>r.outlook==='normal'));assert.equal(trial.history[2].mode,counter);assert.deepEqual(trial.comparisons,[]);assert.equal(await f.getByTestId('remedy-reply').count(),0);
  await click(page,f,'看看其他办法 →');assert((await saved(page)).reliefCompleted.includes(route));
 }
 if(samplePath){
  const before=await saved(page);assert.deepEqual(before.reliefCompleted,['consumption']);assert.deepEqual(Object.keys(before.remedyLabs),['consumption']);
  assert(await f.locator('#dots [data-stage="5"]').isDisabled());assert((await f.locator('.remedy-final').innerText()).includes('1 / 3'));
  for(const route of ['investment','exports'])assert.equal(await f.locator('.remedy-card[data-route="'+route+'"] .remedy-card-progress').innerText(),'试这张 →');
  await page.screenshot({path:path.join(out,spec.width+'-sample-menu.png'),fullPage:true});
  await click(page,f,'先继续故事 →');await scene(f,'epilogue');assert((await saved(page)).reliefSampled);assert.deepEqual((await saved(page)).remedyLabs,before.remedyLabs);
  await page.reload();f=await frame(page);await scene(f,'epilogue');assert.deepEqual((await saved(page)).reliefCompleted,['consumption']);
  await f.locator('#dots [data-stage="4"]').click();await scene(f,'relief');assert.equal(await f.locator('.remedy-card').count(),3);await f.locator('#dots [data-stage="5"]').click();await scene(f,'epilogue');
 }else await click(page,f,'继续故事 →');
 await scene(f,'epilogue');assert((await f.locator('.epilogue-quote').innerText()).includes('白茫茫大地真干净'));assert(!(await f.locator('.epilogue-doubt').isVisible()));await click(page,f,'下一句 →');assert(!(await f.locator('.epilogue-doubt').isVisible()));await click(page,f,'下一句 →');assert(await f.locator('.epilogue-doubt').isVisible());await click(page,f,'下一句 →');await page.reload();f=await frame(page);await click(page,f,'换个条件，会怎样？ →');await scene(f,'assumptions');assert.equal(await f.locator('.assumption-if').count(),8);const branches=[];
 for(const branch of ['automation','time']){
  await enter(page,f,'labour',branch,'试着安排一周 →');
  if(branch==='automation'){
   await f.getByTestId('automation-run').click();await f.locator('[data-testid="technology-result"][data-stale="false"]').waitFor();assert((await f.locator('.technology-stats').innerText()).includes('留下 24'));
   await arrangeAll(f,'time');await f.getByTestId('automation-run').click();await f.locator('[data-testid="technology-result"][data-stale="false"]').waitFor();assert((await f.locator('.technology-stats').innerText()).includes('留下 0'));assert.equal((await saved(page)).technology.pressure,undefined);
   await page.screenshot({path:path.join(out,spec.width+'-automation-play.png'),fullPage:true});await named(f,'结果为什么不同？ →').click();
  }else{
   await named(f,'照这样，过一周 →').click();await f.locator('.calendar-result[data-stale="false"]').waitFor();await calendarPaidRest(page,f);await named(f,'照这样，过一周 →').click();await f.locator('.calendar-result[data-stale="false"]').waitFor();await page.screenshot({path:path.join(out,spec.width+'-time-play.png'),fullPage:true});await named(f,'时间归谁？ →').click();
  }
  await reportAndBack(f,'[data-testid="technology-report"]','生产社会化');branches.push(branch);
 }
 await enter(page,f,'needs','space','准备第一批材料 →');await finishFreight(page,f);await named(f,'换个条件再试 ↺').click();await moveFreight(page,f,'contract:12','book');await finishFreight(page,f,true);await page.screenshot({path:path.join(out,spec.width+'-space-play.png'),fullPage:true});await named(f,'订单会一直来吗？ →').click();await reportAndBack(f,'[data-testid="needs-report"]','生产社会化');branches.push('space');
  await enter(page,f,'needs','services','安排这一期 →');await runCare(page,f);await moveCare(page,f,'tool','socket');await coverCareBatch(page,f);await trainCare(page,f);await runCare(page,f);await page.screenshot({path:path.join(out,spec.width+'-services-play.png'),fullPage:true});await named(f,'都用上了，为什么？ →').click();await reportAndBack(f,'[data-testid="needs-report"]','生产社会化');branches.push('services');
  await enter(page,f,'ownership','concentration','先接上技术 →');await runNetwork(page,f);await moveNetwork(page,f,'shop:0','B');await runNetwork(page,f);await moveNetworkNext(page,f,'rule:portable','contract');await compareNetworkNext(page,f);await moveNetworkNext(page,f,'shop:0','A');await compareNetworkNext(page,f);await page.screenshot({path:path.join(out,spec.width+'-concentration-play.png'),fullPage:true});await named(f,'一起生产，谁拿钥匙？ →').click();await reportAndBack(f,'[data-testid="ownership-report"]','生产社会化');branches.push('concentration');
 await enter(page,f,'ownership','sharing','看看这笔钱 →');await arrangeCouncil(page,f);await payCouncil(page,f);await moveCouncil(page,f,'ballot','divide');await voteCouncil(page,f);await beginProduction(page,f);await productionFinish(page,f);await productionBack(page,f);await moveCouncil(page,f,'mode:coop','charter');await arrangeCouncil(page,f);await payCouncil(page,f);await moveCouncil(page,f,'ballot','divide');await voteCouncil(page,f);await beginProduction(page,f);await productionFinish(page,f);await page.screenshot({path:path.join(out,spec.width+'-sharing-play.png'),fullPage:true});await named(f,'机器省下了什么，谁拿到了？ →').click();await reportAndBack(f,'[data-testid="ownership-report"]','生产社会化');branches.push('sharing');
 await enter(page,f,'boundaries','policy','开门试试 →');await demandBenchmark(page,f,'alone');await demandButton(page,f,'回到同一起点，换个安排 ↺');await demandBenchmark(page,f,'loan');await page.screenshot({path:path.join(out,spec.width+'-policy-play.png'),fullPage:true});await named(f,'谁付款，谁承受下一期？ →').click();await f.locator('.rules-conclusion').waitFor();const finishedDemand=await demandState(page);await demandButton(page,f,'同样的钱，再换个安排 ↺');assert.deepEqual((await demandState(page)).trials,finishedDemand.trials);assert.equal(await f.locator('.demand-borrowing').getAttribute('open'),null);
 const incomeResult=await demandBenchmark(page,f,'income',spec.width===390?'touch':'mouse');assert.deepEqual(incomeResult.periods.map(p=>p.sold),[12,12]);assert.equal(incomeResult.publicFund,8);assert.equal(incomeResult.moneyAfter,148);await page.screenshot({path:path.join(out,spec.width+'-policy-income.png'),fullPage:true});
 await named(f,'谁付款，谁承受下一期？ →').click();await reportAndBack(f,'[data-testid="rules-report"]','生产社会化');branches.push('policy');
 await enter(page,f,'boundaries','prices','开门试试 →');await workbenchTrial(page,f,{price:2,efficient:false,cold:true});await workbenchButton(page,f,'同样的钱，换个安排 ↺');const savedBatch=await workbenchTrial(page,f,{price:2,efficient:false,cold:true},{price:2,efficient:false,cold:true,bake:false});assert.equal(savedBatch.firm,42);assert.equal(savedBatch.stock,0);assert.equal(savedBatch.periods[1].produced.length,0);assert.equal(savedBatch.periods[1].wages,6);assert(savedBatch.periods[1].bought.flat().every(id=>id.startsWith('1:')));await page.screenshot({path:path.join(out,spec.width+'-prices-play.png'),fullPage:true});await workbenchButton(page,f,'这次为什么不同？ →');await reportAndBack(f,'[data-testid="rules-report"]','生产社会化');branches.push('prices');
 const recorded=await saved(page),expected={...recorded.branchArchive};for(const field of ['technology','needsTechnology','ownershipTechnology','marketRules'])expected[recorded[field].branch]=recorded[field];
 for(const [group,branch,field,bodyScene] of [
  ['labour','automation','technology','technology'],['labour','time','technology','technology'],
  ['needs','space','needsTechnology','needs-technology'],['needs','services','needsTechnology','needs-technology'],
  ['ownership','concentration','ownershipTechnology','ownership-technology'],['ownership','sharing','ownershipTechnology','ownership-technology'],
  ['boundaries','policy','marketRules','market-rules'],['boundaries','prices','marketRules','market-rules'],
 ]){
  await chooseCondition(f,group);await f.locator('[data-branch="'+branch+'"]').click();await scene(f,bodyScene);assert.deepEqual((await saved(page))[field],expected[branch],'revisiting '+branch+' preserves its actual conclusion and history');
  await page.reload();f=await frame(page);await scene(f,bodyScene);assert.deepEqual((await saved(page))[field],expected[branch]);await named(f,'回到假设目录 ↩').click();await scene(f,'assumptions');await checkObservations(page,f);
 }
 assert.deepEqual((await saved(page)).street,recorded.street,'branch return never writes the street accounts');
 await page.reload();f=await frame(page);await scene(f,'assumptions');const observations=await checkObservations(page,f);assert.equal(observations.length,8);
 for(const group of ['labour','needs','ownership','boundaries']){await chooseCondition(f,group);await fits(f);await checkAssumptionCardLayout(f);assert.equal(await f.locator('[data-branch-observation]:visible').count(),2);await page.screenshot({path:path.join(out,spec.width+'-observed-'+group+'.png'),fullPage:true});}
 await page.screenshot({path:path.join(out,spec.width+'-all-if.png'),fullPage:true});await f.locator('#dots button[data-stage="0"]').click();await scene(f,'opening');assert.equal((await saved(page)).reliefCompleted.length,samplePath?1:3);
 const openRemedyRoutes=Object.values((await saved(page)).remedyLabs).filter(l=>l.flow&&l.history.length===3&&l.history.every(r=>r.outlook==='normal')&&l.comparisons.length===0).length;assert.equal(openRemedyRoutes,samplePath?1:3);
 results.push({width:spec.width,offline:!!spec.offline,samplePath,freshStart:true,stateInjection:false,battleStages:3,sixShopRounds:1,forcedBankruptcy:false,openRemedyRoutes,remedyDaysObserved:openRemedyRoutes*3,automaticRemedyShock:false,branches,allReportsOpened:true,allBranchesRetained:true,observedBranches:observations.length,observationsReadOnly:true,homeReturn:true,refresh:true,incomeBrushMethod:spec.width===390?'touch':'mouse',incomeBrushSales:[12,12]});console.log('Complete path: '+spec.width+'px, battle, '+openRemedyRoutes+' open remedy routes, optional sandbox, eight branches.');await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html')))&&bytes.equals(await fs.readFile(path.join(root,'offline/技术红利去了哪里.html'))),'artifact changed while QA was running; these results cannot certify one build');await fs.writeFile(path.join(out,reportName),JSON.stringify({checkedAt:new Date().toISOString(),buildSHA256:createHash('sha256').update(bytes).digest('hex'),results,errors,external},null,2)+'\n');
}catch(error){
 console.error(JSON.stringify({errors,external}));for(const context of browser.contexts())for(const page of context.pages()){await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});console.error(await saved(page).then(s=>({scene:s?.scene,streetRound:s?.street?.world.round})).catch(()=>null));}throw error;
}finally{await browser.close();await new Promise(r=>server.close(r));}
