/** Isolated UI QA: actual fourth-act entry, no fabricated remedy results. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {remedyAccounts} from '../lib/remedy-lab.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html')),server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href;
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],testedWidths=[];
const output=path.join(root,'outputs/relief-qa');await fs.mkdir(output,{recursive:true});
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROLOGUE_STORAGE_KEY);
async function frame(page){const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();return f;}
async function settled(f){await f.waitForFunction(()=>!document.body.dataset.transition);}
async function changed(page,f,before){await page.waitForFunction(({key,before})=>localStorage.getItem(key)!==before,{key:PROLOGUE_STORAGE_KEY,before});await settled(f);}
async function click(page,f,name){const before=JSON.stringify(await saved(page));await f.getByRole('button',{name,exact:true}).click();await changed(page,f,before);}
async function place(page,f,mode,method){
 // This suite also retains the optional original-condition and legacy path.
 const lab=(await saved(page)).remedyLabs[(await saved(page)).reliefRoute];
 if(lab.history.length===2&&(lab.thirdOutlook??'adverse')!=='normal'){if(!await f.locator('.remedy-tools').evaluate(n=>n.open))await f.locator('.remedy-tools>summary').click();await click(page,f,'按原条件经营');}
 const counter=f.locator('details.remedy-counter');if(await counter.count()&&!await counter.evaluate(n=>n.open))await counter.locator('summary').first().click();
 if(!await f.locator('.remedy-tools').evaluate(n=>n.open))await f.locator('.remedy-tools>summary').click();
 const before=JSON.stringify(await saved(page)),packet=f.locator('[data-gesture-packet]'),target=f.locator('[data-gesture-target="'+mode+'"]');
 await f.waitForFunction(()=>!document.querySelector('[data-gesture-packet]').disabled);
 if(method==='drag'){
  await packet.scrollIntoViewIfNeeded();await target.scrollIntoViewIfNeeded();const a=await packet.boundingBox(),b=await target.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:14});await page.mouse.up();
 }else if(method==='keyboard'){await packet.focus();await packet.press('Enter');await target.focus();await target.press('Enter');}
 else {await packet.tap();await target.tap();}
 await changed(page,f,before);
}
async function result(page,f,route){
 const account=remedyAccounts((await saved(page)).remedyLabs[route]),r=account.display;
 const path=account.reports.slice(0,r.round-1).concat(r);let streak=0;
 if(r.cashChange)for(let i=path.length-1;i>=0&&Math.sign(path[i].cashChange)===Math.sign(r.cashChange);i--)streak++;
 const mood=!r.cashChange?'ready':r.cashChange>0?(streak>1?'delighted':'pleased'):(streak>1?'distressed':'worried');
 assert.equal(await f.locator('.remedy-producer').getAttribute('data-mood'),mood);
 assert.equal(await f.locator('.remedy-producer').getAttribute('data-streak'),String(streak));
 assert.equal(await f.locator('.remedy-producer>.remedy-person').getAttribute('data-expression'),mood);
 assert.equal(await f.locator('.remedy-owner-face').count(),mood==='ready'?0:1);
 assert.equal(await f.locator('.remedy-producer>.remedy-person').evaluate(n=>getComputedStyle(n).animationName),'none','reduced-motion QA must retain faces without movement');
 assert.equal(await f.locator('[data-testid="remedy-tally"]').innerText(),'本期 '+(r.newStock?(r.newStock>0?'＋':'−')+Math.abs(r.newStock)+'份':'不变'));
 assert.match(await f.locator('[data-testid="remedy-tally"]').getAttribute('title'),new RegExp('做出'+r.made+'份，卖出'+r.sold+'份'));
 assert(await f.locator('[data-testid="remedy-feedback"]').isVisible());
 assert.equal(await f.locator('.remedy-voice,.remedy-prompt').count(),1,'one full-width transcript must replace the duplicated side narration and prompt');
 assert.equal(await f.locator('.remedy-commands>.remedy-prompt').count(),0);assert.equal(await f.locator('.remedy-turn').count(),0);
 const transcript=await f.locator('.remedy-narration').boundingBox(),arena=await f.locator('.remedy-console').boundingBox();assert(transcript.width>=arena.width*.95,'the message must not be squeezed into the old narrow side column');
 assert.equal(await f.locator('.remedy-effect,.remedy-goods,.remedy-comparison-values').count(),0,'duplicated results must be removed');
 const meters=await f.getByRole('meter').evaluateAll(nodes=>nodes.map(n=>({label:n.getAttribute('aria-label'),value:Number(n.getAttribute('aria-valuenow'))})));
 assert.deepEqual(meters,[{label:'待售库存',value:r.stock},{label:'生产账户',value:r.world.cash.shop}]);
 const incoming=await f.locator('.remedy-battle').getAttribute('data-beat')==='incoming';assert.equal(await f.locator('.remedy-commands .gesture-zones>button').count(),incoming?0:2);
 for(const replay of await f.locator('.remedy-replay').all()){assert.equal(await replay.evaluate(n=>getComputedStyle(n).whiteSpace),'nowrap');const box=await replay.boundingBox();assert(box.height>=44&&box.height<48,'replay controls must stay one line with a full touch target');}
 if(r.round===1){const prompt=await f.locator('.remedy-prompt').innerText();if(route==='consumption'&&r.debt)assert(prompt.includes('先还旧账'));if(route==='investment'&&r.control.mode==='expand')assert(prompt.includes(r.stock?r.stock+'份':'下回合开工'));if(route==='exports'&&r.control.mode==='single')assert(prompt.includes(r.exportSupplyShortfall?'货不够':r.lostExports?'少买了':'明天也接吗'));}
 if(r.round===2)assert.match(await f.getByTestId('remedy-challenge').innerText(),/试一次逆风|第三招|试一次顺风/);
 if(route==='consumption'){const purchases=r.payments.filter(p=>p.reason==='家庭购物').reduce((sum,p)=>sum+p.amount,0),basket=r.control.outlook==='supported'?40:30,wanted=Math.min(basket,r.sold+r.stock),expression=purchases<wanted?'worried':wanted<basket?'ready':'happy';assert.deepEqual(await f.locator('.remedy-buyers>.remedy-person').evaluateAll(nodes=>nodes.map(n=>n.dataset.expression)),[expression,expression]);
  assert.equal(await f.locator('.remedy-bank').getAttribute('aria-label'),'银行余额 '+r.world.cash.bank+'枚');
  assert.equal(await f.locator('.remedy-flow').isVisible(),false,'the generic parcel cluster must not cover the bank or money arrows');
  const flow=f.locator('.remedy-bank-flow');assert.equal(await flow.count(),r.borrowed||r.repayment?1:0);
  if(await flow.count()){assert.equal(await flow.getAttribute('data-borrowed'),String(r.borrowed));assert.equal(await flow.getAttribute('data-repaid'),String(r.repayment));assert.equal(await flow.locator('animateMotion').count(),0,'reduced-motion setting must retain only static, funded arrows');}
 }
 if(route==='investment'){
  const before=account.reports[r.round-2]?.world??account.opening,groups=f.locator('.remedy-machine-groups');
  assert.equal(await groups.getAttribute('data-active-capacity'),String(before.capacity));assert.equal(await groups.getAttribute('data-pending-capacity'),String(r.capacity-before.capacity));
  assert.equal(await f.locator('.remedy-machine-pending').count(),r.investment?1:0);
  if(r.investment){const button=f.locator('.remedy-machine-pending');assert.equal(await button.getAttribute('data-effect'),r.capacity>before.capacity?'capacity':r.world.efficiency>before.efficiency?'cost':'none');const box=await button.boundingBox();assert(box.height>=44);assert.equal(await button.evaluate(n=>getComputedStyle(n).animationName),'none');}
  const inventoryClips=await f.locator('.remedy-scene').evaluate(scene=>{const a=scene.querySelector('.remedy-pressure-status').getBoundingClientRect();return [...scene.querySelectorAll('.remedy-machine-live,.remedy-machine-pending')].filter(n=>{const b=n.getBoundingClientRect();return b.width&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}).map(n=>n.className);});assert.deepEqual(inventoryClips,[],'investment equipment must not overlap the inventory panel either');
 }
 if(route==='exports'){
  const network=f.locator('.remedy-export-network');assert.equal(await network.getAttribute('data-shipped'),String(r.exports));assert.equal(await network.getAttribute('data-transport'),String(r.transport));assert.equal(await network.getAttribute('data-quota'),String(r.exportQuota));assert.equal(await network.getAttribute('data-mode'),r.control.mode);assert.equal(await f.locator('.remedy-flow').isVisible(),false,'domestic transactions must not look like completed exports');
  assert.equal(await network.locator('animateMotion').count(),0);assert.equal(await network.locator('.remedy-export-stop').count(),r.control.dose&&r.exportQuota===0?1:0);assert.equal(await network.locator('.remedy-export-customer[data-connected="true"]').count(),r.control.dose&&r.exportQuota?(r.control.mode==='single'?1:3):0);assert((await network.boundingBox()).height>=44);
  if(r.round===1){const before=JSON.stringify(await saved(page));await network.click();assert.equal(JSON.stringify(await saved(page)),before);await f.waitForFunction(()=>!document.querySelector('.remedy-export-network').dataset.checked);}
  const blocked=await network.evaluate(n=>{const b=n.getBoundingClientRect();return [...n.closest('.remedy-scene').querySelectorAll('.remedy-status,.remedy-leftovers')].filter(s=>{const a=s.getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}).map(s=>s.className);});assert.deepEqual(blocked,[],'export map and caption must have their own space');
 }
 const consoleBounds=await f.locator('.remedy-console').boundingBox(),commandBounds=await f.locator('.remedy-commands').boundingBox();assert(commandBounds.x>consoleBounds.x+consoleBounds.width*.25);
 assert.equal(await f.locator('.remedy-narration button').count(),0);
 const blockedFaces=await f.locator('.remedy-scene').evaluate(scene=>{const bill=scene.querySelector('.remedy-bill');if(!bill)return [];const a=bill.getBoundingClientRect();return [...scene.querySelectorAll('.remedy-buyers>.remedy-person')].filter(n=>{const b=n.getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}).map(n=>n.dataset.expression);});assert.deepEqual(blockedFaces,[],'the bill must have its own space, never cover a customer');
 const collisions=await f.locator('.remedy-scene').evaluate(scene=>{const cash=scene.querySelector('.remedy-cash-status').getBoundingClientRect();return [...scene.querySelectorAll('.remedy-buyers .remedy-person,.remedy-machines img,.remedy-machine-pending,.remedy-install-clock,.remedy-sea,.remedy-bill')].filter(n=>{const b=n.getBoundingClientRect();return b.left<cash.right&&b.right>cash.left&&b.bottom>cash.top+1&&b.top<cash.bottom;}).map(n=>n.className.baseVal??n.className);});assert.deepEqual(collisions,[],'buyers, bills and equipment must not overlap the cash panel');
 const clipped=await f.locator('.remedy-commands').evaluate(parent=>{const box=parent.getBoundingClientRect();return [...parent.querySelectorAll('button')].filter(n=>{const b=n.getBoundingClientRect();return b.width&&(b.left<box.left-1||b.right>box.right+1);}).map(n=>n.getAttribute('aria-label')||n.textContent);});assert.deepEqual(clipped,[],'all commands must fit inside the right console');
 const overflow=await f.evaluate(()=>[...document.querySelectorAll('main *')].filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.right>innerWidth+1;}).slice(0,15).map(n=>({class:n.className,text:n.textContent?.slice(0,45),right:n.getBoundingClientRect().right,width:n.getBoundingClientRect().width})));
 assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),JSON.stringify(overflow));assert.equal(await f.locator('.gesture-ghost').count(),0);
}
async function shot(page,name){await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});}
try{
 for(const spec of [{width:320},{width:390,offline:true},{width:1280}].filter(s=>!process.env.REMEDY_QA_WIDTH||s.width===Number(process.env.REMEDY_QA_WIDTH))){
  testedWidths.push(spec.width);
  const context=await browser.newContext({viewport:{width:spec.width,height:960},hasTouch:spec.width<600,reducedMotion:'reduce'});
  await context.route('**/*',r=>{if(r.request().url().startsWith(url)||spec.offline&&r.request().url()===offline)return r.continue();external.push(r.request().url());return r.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(spec.offline?offline:url);let f=await frame(page);
  await f.locator('#dots [data-stage="4"]').click();await f.locator('.remedy-card').first().waitFor();await settled(f);
  assert(await f.locator('#dots [data-stage="5"]').isDisabled());await shot(page,spec.width+'-menu');
  for(const [route,mode,alternative,condition,risk] of [
   ['consumption','credit','raise','如果收入也增长？ →','如果工资少了一半？ →'],
   ['investment','expand','replace','如果下游订单落实？ →','如果设备买家少下单？ →'],
   ['exports','single','diverse','如果海外订单稳定？ →','如果大客户停单？ →']]){
   const before=JSON.stringify(await saved(page));await f.locator('.remedy-card[data-route="'+route+'"]').click();await changed(page,f,before);
   assert.equal((await saved(page)).remedyLabs[route].history.length,0);assert.equal((await saved(page)).reliefCompleted.includes(route),false);
   await shot(page,spec.width+'-'+route+'-opening');
   assert.equal(await f.locator('[data-gesture-packet]').isVisible(),false,'drag is optional, not a required second step');
   const openingHeight=(await f.locator('.remedy-battle').boundingBox()).height;assert(openingHeight<570,'the default arena and moves must stay compact');
   await f.locator('.remedy-tools>summary').click();
   await click(page,f,'增加药方力度');assert.equal((await saved(page)).remedyLabs[route].dose,3);await click(page,f,'减少药方力度');
   const packet=f.locator('[data-gesture-packet]');await packet.focus();await packet.press('Enter');await packet.press('Escape');assert.equal(await packet.getAttribute('aria-pressed'),'false');
   if(spec.width===1280){await packet.scrollIntoViewIfNeeded();const a=await packet.boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(a.x-20,a.y+a.height/2,{steps:8});await page.mouse.up();await packet.press('Escape');assert.equal((await saved(page)).remedyLabs[route].history.length,0);assert.equal(await f.locator('.gesture-ghost').count(),0);}
   for(let round=0;round<3;round++){
    await place(page,f,mode,spec.width<600?'tap':round===1?'keyboard':'drag');await result(page,f,route);assert.equal((await saved(page)).remedyLabs[route].history.length,round+1);
    if(round===0){const actual=await f.locator('[data-testid="remedy-tally"]').innerText();await click(page,f,'增加药方力度');assert.equal(await f.locator('[data-testid="remedy-tally"]').innerText(),actual);await click(page,f,'减少药方力度');await f.locator('.remedy-tools>summary').click();await shot(page,spec.width+'-'+route+'-first');}
    if(round===1){await shot(page,spec.width+'-'+route+'-second');const snapshot=(await saved(page)).remedyLabs[route];await page.reload();f=await frame(page);await settled(f);assert.deepEqual((await saved(page)).remedyLabs[route],snapshot);}
   }
   assert.equal(await f.getByRole('button',{name:'收下这张处方的教训 →',exact:true}).count(),0);
   const history=(await saved(page)).remedyLabs[route].history;
   assert.equal(await f.locator('.remedy-battle').getAttribute('data-beat'),'incoming');assert(await f.getByTestId('remedy-reply').isVisible());assert((await f.getByTestId('remedy-reply').innerText()).includes('同一个第三回合'));assert.equal((await saved(page)).remedyLabs[route].comparisons.length,0);const replyButton=f.getByTestId('remedy-reply').getByRole('button');assert.equal(await replyButton.evaluate(n=>getComputedStyle(n).whiteSpace),'nowrap');assert((await replyButton.boundingBox()).height<60,'the short reply action must not wrap into multiple lines');await shot(page,spec.width+'-'+route+'-incoming');
   await click(page,f,risk);await result(page,f,route);assert.deepEqual((await saved(page)).remedyLabs[route].history,history);
   assert.equal(await f.locator('.remedy-battle').getAttribute('data-beat'),'respond');assert(await f.getByTestId('remedy-impact').isVisible());assert(await f.locator('[data-gesture-target="'+alternative+'"]').isVisible(),'the response moves must be visible without an extra expand step');
   if(route==='consumption'){assert((await f.locator('[data-testid="remedy-feedback"]').innerText()).includes('工资薄了'));assert.equal(await f.locator('.remedy-bill').getAttribute('data-stopped'),'true');}
   if(route==='exports')assert.equal(await f.locator('.remedy-export-stop').count(),1);await shot(page,spec.width+'-'+route+'-risk');
   const counterBefore=JSON.stringify(await saved(page));await f.locator('[data-gesture-target="'+alternative+'"]').click();await changed(page,f,counterBefore);await result(page,f,route);
   const counterResult=remedyAccounts((await saved(page)).remedyLabs[route]).display;assert.equal(counterResult.control.outlook,'adverse');assert.equal(counterResult.control.mode,alternative);assert.deepEqual((await saved(page)).remedyLabs[route].history,history);assert((await f.locator('[data-testid="remedy-comparison"]').innerText()).includes('改了招式 ·'));await shot(page,spec.width+'-'+route+'-counter');
   assert.equal(await f.locator('.remedy-battle').getAttribute('data-beat'),'free');assert.equal(remedyAccounts((await saved(page)).remedyLabs[route]).comparisonSeen,false,'favourable conditions are not required to continue after a real response');assert(await f.getByRole('button',{name:'收下这张处方的教训 →',exact:true}).isVisible());
   await page.reload();f=await frame(page);await settled(f);assert.equal(await f.locator('.remedy-battle').getAttribute('data-beat'),'free');await shot(page,spec.width+'-'+route+'-counter-ready');
   for(const button of await f.locator('.remedy-conditions button').all())assert.equal(await button.isVisible(),false);const conditionsBefore=JSON.stringify(await saved(page));await f.locator('.remedy-conditions>summary').click();assert.equal(JSON.stringify(await saved(page)),conditionsBefore);
   await click(page,f,condition);await result(page,f,route);assert.deepEqual((await saved(page)).remedyLabs[route].history,history);for(const button of await f.locator('.remedy-conditions button').all())assert.equal(await button.isVisible(),false);await shot(page,spec.width+'-'+route+'-free');await f.locator('.remedy-conditions>summary').click();
   if(route==='investment'){await click(page,f,'原条件');const equal=await f.locator('.remedy-message').innerText();assert(equal.includes('下期产能更少'),'equal stock and cash must not hide delayed capacity');await shot(page,spec.width+'-'+route+'-delayed-effect');}
   // A player can change an earlier decision, not just patch the third turn.
   const originalRun=structuredClone((await saved(page)).remedyLabs[route]),from=route==='consumption'?0:1;
   await click(page,f,'从第'+(from+1)+'回合重打，保留原记录');let replayed=(await saved(page)).remedyLabs[route];assert.deepEqual(replayed.history,history.slice(0,from));assert.deepEqual(replayed.archives,[{history:originalRun.history,comparisons:originalRun.comparisons}]);assert.equal(await f.locator('.remedy-battle').getAttribute('data-beat'),'play');
   const oldAccount=remedyAccounts(originalRun),newAccount=remedyAccounts(replayed);assert.deepEqual(newAccount.display?.world??newAccount.opening,from?oldAccount.reports[from-1].world:oldAccount.opening);assert.deepEqual(newAccount.archives[0].comparisons,oldAccount.comparisons);
   const readOnly=JSON.stringify(await saved(page));await f.locator('.remedy-path-records>summary').click();await f.locator('.remedy-path-records>details>summary').first().click();await f.locator('.remedy-path-records .remedy-receipt').first().waitFor();assert.equal(JSON.stringify(await saved(page)),readOnly);await shot(page,spec.width+'-'+route+'-original-records');
   await page.reload();f=await frame(page);await settled(f);assert.deepEqual((await saved(page)).remedyLabs[route],replayed);
   for(let n=from;n<3;n++){await place(page,f,alternative,spec.width<600?'tap':'keyboard');await result(page,f,route);}
   replayed=(await saved(page)).remedyLabs[route];assert.equal(await f.getByTestId('remedy-comparison').getAttribute('data-kind'),'path');assert((await f.getByTestId('remedy-comparison').innerText()).includes('整局重打'));assert((await f.getByTestId('remedy-comparison').getAttribute('aria-label')).includes('账户'));assert.equal(await f.locator('.remedy-comparison-result').count(),0);assert.deepEqual(replayed.archives[0],{history:originalRun.history,comparisons:originalRun.comparisons});
   if(route==='consumption')assert.equal(remedyAccounts(replayed).thirdBaseline.debt,0);if(route==='investment')assert.equal(remedyAccounts(replayed).thirdBaseline.capacity,10);await shot(page,spec.width+'-'+route+'-replayed');
   assert.equal(await f.getByRole('button',{name:'收下这张处方的教训 →',exact:true}).count(),0,'old-run observations cannot complete a new arrangement');await click(page,f,risk);await place(page,f,mode,spec.width<600?'tap':'keyboard');await result(page,f,route);assert.equal(remedyAccounts((await saved(page)).remedyLabs[route]).comparisonSeen,false);
   await click(page,f,'收下这张处方的教训 →');assert.equal((await saved(page)).reliefRoute,null);assert((await saved(page)).reliefCompleted.includes(route));
   const re=JSON.stringify(await saved(page));await f.locator('.remedy-card[data-route="'+route+'"]').click();await changed(page,f,re);assert.equal((await saved(page)).remedyLabs[route].history.length,3);
   await f.locator('.remedy-receipt>summary').click();await click(page,f,'清空这张处方的记录 ↺');await place(page,f,alternative,spec.width<600?'tap':'drag');await result(page,f,route);
   if(route==='consumption')assert.equal(remedyAccounts((await saved(page)).remedyLabs[route]).display.debt,0);
   if(route==='investment')assert.equal(remedyAccounts((await saved(page)).remedyLabs[route]).display.capacity,0);
   await f.locator('.remedy-receipt>summary').click();await click(page,f,'从相同起点再试 ↺');
   const directBefore=JSON.stringify(await saved(page));await f.locator('[data-gesture-target="'+mode+'"]').dblclick({delay:90});await changed(page,f,directBefore);assert.equal((await saved(page)).remedyLabs[route].history.length,1);await result(page,f,route);
   const ledgerBefore=JSON.stringify(await saved(page));await f.locator('.remedy-receipt>summary').click();assert(await f.locator('.remedy-receipt').evaluate(n=>n.open));assert.equal(JSON.stringify(await saved(page)),ledgerBefore);await f.locator('.remedy-receipt>summary').click();
   assert(!(await saved(page)).reliefCompleted.includes(route),'clearing the only actual record must revoke its completed mark');
   for(let n=1;n<3;n++){await place(page,f,mode,spec.width<600?'tap':'keyboard');await result(page,f,route);}
   await click(page,f,risk);await place(page,f,alternative,spec.width<600?'tap':'keyboard');await result(page,f,route);await click(page,f,'收下这张处方的教训 →');
   assert((await saved(page)).reliefCompleted.includes(route),'the fresh arrangement must be actually completed again, not promoted using the deleted old record');
   const returnBefore=JSON.stringify(await saved(page));await f.locator('.remedy-card[data-route="'+route+'"]').click();await changed(page,f,returnBefore);
   await click(page,f,'收下这张处方的教训 →');console.log('PASS '+spec.width+' '+route+': incoming, response, counter and favourable trial');
  }
  assert.equal((await saved(page)).reliefCompleted.length,3);await click(page,f,'继续故事 →');await click(page,f,'看完这一段');await click(page,f,'换个条件，会怎样？ →');
  assert.equal((await saved(page)).scene,'assumptions');assert.equal(await f.locator('.assumption-if').count(),8);assert.equal(await f.locator('.assumption-model li').count(),8);
  await click(page,f,'听听下一句话');assert((await f.locator('.assumption-speech').innerText()).includes('更大的市场'));await click(page,f,'听听下一句话');assert((await f.locator('.assumption-speech').innerText()).includes('all you need'));await f.locator('.assumption-model>summary').click();assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await shot(page,spec.width+'-assumptions');await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 await fs.writeFile(path.join(output,'remedy-battle-report.json'),JSON.stringify({sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,widths:testedWidths,passed:true,checks:['compact default arena with optional dosage and coupon','one feedback line without duplicated result blocks','next-turn prompt follows actual debt, stock, capacity and orders','household face follows household purchases rather than total sales','three-period actual ledger','incoming reply is visible without automatically changing conditions or money','response moves are visible without an extra unfold step','favourable comparison leads to folded optional conditions and single-click continuation','adverse and supported third-period comparisons','same-condition counter-move preserves original history','comparison identifies changes in mode, dosage and conditions','earlier-turn replay retains old receipts and original prefix wallets','old record inspection is read-only and lazy','replay and archives survive reload without copying old completion into the new trial','whole-path comparison shows actual remaining goods and cash','replay buttons stay one line with 44px touch targets','pointer drag, touch placement and keyboard','direct move and physical double click settles once','meter values match actual stock and cash','all move buttons fit inside the right console','ledger inspection cannot operate','single-click completion, refresh, restart and epilogue gate'],errors,external},null,2));
 console.log('PASS: same-shock countermoves allow continuation without a mandatory favourable trial; optional adverse/support comparisons, pointer/touch/keyboard, refresh/replay, gates, layouts '+testedWidths.join('/')+', no external dependencies.');
}catch(error){for(const context of browser.contexts())for(const page of context.pages())await shot(page,'failure-'+page.viewportSize().width);throw error;}
finally{await browser.close();await new Promise(r=>server.close(r));}
