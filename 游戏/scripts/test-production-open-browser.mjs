/** Actual new investment/export play, one-day challenges and old-save opt-in. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {initialPrologue,prologueReducer as reduce,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {initialRemedy,remedyReducer,remedyAccounts} from '../lib/remedy-lab.ts';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url)),bytes=await fs.readFile(path.join(root,'build/index.html')),out=path.join(root,'outputs/production-open-qa');await fs.mkdir(out,{recursive:true});
const server=http.createServer((_,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href;
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),results=[],errors=[],external=[];
const read=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),PROLOGUE_STORAGE_KEY);
async function frame(p){const f=await(await p.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);return f;}
async function settled(f,n){await f.waitForFunction(n=>document.querySelector('.remedy-scene')?.dataset.round===String(n),n);}
async function layout(f){
 assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await f.locator('.remedy-track,.remedy-fourth,.remedy-guess').count(),0);
 for(const b of await f.locator('.remedy-open button:visible').all())assert((await b.boundingBox()).height>=44);
 const boxes=await f.evaluate(()=>{const s=document.querySelector('.remedy-scene').getBoundingClientRect();return [...document.querySelectorAll('.remedy-scene .remedy-status,.remedy-producer,.remedy-equipment-buyer,.remedy-machine-groups,.remedy-export-network')].map(n=>{const r=n.getBoundingClientRect();return {kind:n.className.baseVal??n.className,x:r.x,y:r.y,w:r.width,h:r.height,inside:r.x>=s.x-1&&r.y>=s.y-1&&r.right<=s.right+1&&r.bottom<=s.bottom+1};});});
 for(const b of boxes)assert(b.inside,JSON.stringify(b));for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert(!(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1),JSON.stringify({a,b}));}
}
async function readExplanation(page,f,route,width){
 const original=await read(page),summary=f.getByText('这个实验说明什么？',{exact:true});await summary.click();const reader=f.getByTestId('research-reader'),topic=reader.getByRole('combobox',{name:'选择资料主题'});
 assert.equal(await topic.locator('option:checked').textContent(),'这招在试什么？');assert.equal(await reader.locator('.research-paragraph').count(),1);
 for(const title of ['钱与货从哪里来？','哪些限制要记住？','原始来源（逐条）']){
  await topic.selectOption({label:title});assert.equal(await reader.getAttribute('data-page'),'0');const count=Number(await reader.getAttribute('data-page-count'));assert.equal(count,title==='原始来源（逐条）'?6:2);
  for(let i=0;i<count;i++){assert.equal(await reader.locator('.research-paragraph').count(),1);const words=await reader.locator('.research-paragraph').innerText();assert(words.length<400);if(title==='原始来源（逐条）'){assert.equal(await reader.locator('a[href^="https://"]').count(),1);assert.match(words,/读取范围：/);}if(i<count-1)await reader.getByRole('button',{name:'下一段 →',exact:true}).click();}
 }
 await topic.selectOption({label:'这招在试什么？'});assert.deepEqual(await read(page),original,'reading assumptions and sources must not operate a day');assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));for(const b of await reader.locator('button:visible,select').all())assert((await b.boundingBox()).height>=44);await page.screenshot({path:path.join(out,'explanation-'+route+'-'+width+'.png'),fullPage:true});await summary.click();
}
try{
 for(const width of [320,390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:1000},hasTouch:width===390,reducedMotion:width<600?'reduce':'no-preference'});await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||u===offline)return r.continue();external.push(u);return r.abort();});
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(width===390?offline:url);let f=await frame(p);await f.locator('#dots [data-stage="4"]').click();
  const play=async mode=>{const b=f.locator('[data-gesture-target="'+mode+'"]');if(width===320)await b.press('Enter');else if(width===390)await b.tap();else await b.click();};
  const challenge=async value=>{await f.locator('.remedy-consumption-tools>summary').click();await f.getByLabel('下一天的额外条件').selectOption(value);};
  await f.locator('[data-route=investment]').click();await f.locator('.remedy-open[data-flow=production-open]').waitFor();await layout(f);await readExplanation(p,f,'investment',width);
  await play('expand');await settled(f,1);let a=remedyAccounts((await read(p)).remedyLabs.investment);assert.equal(a.display.made,50);assert.equal(a.display.capacity,10);assert.match(await f.locator('.remedy-open-consequence').textContent(),/60/);await layout(f);
  await f.getByRole('button',{name:'先不添设备',exact:true}).click();await settled(f,2);a=remedyAccounts((await read(p)).remedyLabs.investment);assert.equal(a.display.made,60);assert.equal(a.display.capacity,10);assert.equal(a.display.upkeep,2);
  await play('replace');await settled(f,3);await play('replace');await settled(f,4);a=remedyAccounts((await read(p)).remedyLabs.investment);assert.equal(a.display.capacity,10);assert(a.display.world.efficiency>0);await layout(f);await p.screenshot({path:path.join(out,'investment-'+width+'.png'),fullPage:true});
  const before=(await read(p)).remedyLabs.investment.history;await challenge('adverse');await f.getByLabel('增加药方力度').click();assert.equal(await f.getByLabel('下一天的额外条件').inputValue(),'adverse');assert.deepEqual((await read(p)).remedyLabs.investment.history,before);
  await play('expand');await settled(f,5);assert.equal(remedyAccounts((await read(p)).remedyLabs.investment).display.control.outlook,'adverse');await play('replace');await settled(f,6);assert.equal(remedyAccounts((await read(p)).remedyLabs.investment).display.control.outlook,'normal');
  const saved=await read(p);await p.reload();f=await frame(p);await settled(f,6);assert.deepEqual((await read(p)).remedyLabs.investment,saved.remedyLabs.investment);
  await f.getByRole('button',{name:'看看其他办法 →',exact:true}).click();await f.locator('.remedy-menu').waitFor();assert.deepEqual((await read(p)).reliefCompleted,['investment']);
  await f.locator('[data-route=exports]').click();await f.locator('.remedy-open[data-flow=production-open]').waitFor();await readExplanation(p,f,'exports',width);
  for(let n=1;n<=8;n++){await play('single');await settled(f,n);assert.equal(remedyAccounts((await read(p)).remedyLabs.exports).display.exports,10);}
  await layout(f);assert.match(await f.getByTestId('remedy-budget').textContent(),/40/);await p.screenshot({path:path.join(out,'exports-stable-'+width+'.png'),fullPage:true});
  await challenge('adverse');await play('single');await settled(f,9);a=remedyAccounts((await read(p)).remedyLabs.exports);assert.equal(a.display.exports,0);assert.equal(a.display.transport,0);assert.equal(await f.locator('.remedy-export-network').getAttribute('data-status'),'stopped');
  await play('single');await settled(f,10);assert.equal(remedyAccounts((await read(p)).remedyLabs.exports).display.exports,10);
  await challenge('adverse');await play('diverse');await settled(f,11);a=remedyAccounts((await read(p)).remedyLabs.exports);assert.equal(a.display.exports,5);assert.equal(a.display.transport,3);await layout(f);await p.screenshot({path:path.join(out,'exports-diverse-'+width+'.png'),fullPage:true});
  await play('single');await settled(f,12);assert.equal(remedyAccounts((await read(p)).remedyLabs.exports).display.control.outlook,'normal');
  await f.getByRole('button',{name:'看看其他办法 →',exact:true}).click();await f.locator('.remedy-menu').waitFor();assert.deepEqual((await read(p)).reliefCompleted,['investment','exports']);await f.getByRole('button',{name:'先继续故事 →',exact:true}).click();await p.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).scene==='epilogue',PROLOGUE_STORAGE_KEY);
  // Existing real records return intact and an explicit reset keeps all 12 days.
  await f.waitForFunction(()=>!document.body.dataset.transition);await f.locator('#dots [data-stage="4"]').click();await f.locator('[data-route=exports]').click();await settled(f,12);await f.locator('.remedy-records>.remedy-receipt').first().locator('summary').click();await f.getByLabel('从头试，保留这次记录').click();await settled(f,0);assert.equal((await read(p)).remedyLabs.exports.archives[0].history.length,12);
  await play('single');await settled(f,1);await f.getByRole('button',{name:'看看其他办法 →',exact:true}).click();await f.locator('.remedy-menu').waitFor();assert.deepEqual((await read(p)).reliefCompleted,['investment','exports']);
  // Shared open UI still shows a genuine loan bill, then a single income-shock cue.
  await f.locator('[data-route=consumption]').click();await f.locator('.remedy-open[data-flow=consumption-open]').waitFor();await readExplanation(p,f,'consumption',width);await play('credit');await settled(f,1);await play('credit');await settled(f,2);let c=remedyAccounts((await read(p)).remedyLabs.consumption);assert.equal(c.display.repayment,12);assert.equal(await f.locator('.remedy-shopping-status').getAttribute('data-bought'),'18');
  await play('raise');await settled(f,3);assert.equal(remedyAccounts((await read(p)).remedyLabs.consumption).display.debt,0);await challenge('adverse');await play('raise');await settled(f,4);assert.equal((await f.locator('.remedy-message').textContent()).split('底薪减半').length-1,1);await play('raise');await settled(f,5);assert.equal(remedyAccounts((await read(p)).remedyLabs.consumption).display.control.outlook,'normal');await layout(f);
  results.push({width,offline:width===390,investmentDays:6,exportDays:12,consumptionDays:5,explanationsPaged:true,sourcesPaged:6,readingLeavesLedgerUnchanged:true,actualDelayedEffects:true,noAutomaticStop:true,explicitShockOnly:true,archive:true,refresh:true});console.log('PASS production open',width);await ctx.close();
 }
 // Old histories use their original contract until the player opts in.
 for(const route of ['investment','exports']){
  const ctx=await browser.newContext({reducedMotion:'reduce'}),p=await ctx.newPage();await p.goto(url);let old=initialRemedy(route);for(let n=0;n<3;n++)old=remedyReducer(old,{type:'PLACE',mode:old.mode,expectedRound:n});old=remedyReducer(old,{type:'COMPARE',outlook:'adverse'});
  const books=remedyAccounts(old);let s={...initialPrologue(),remedyLabs:{[route]:old}};s=reduce(s,{type:'JUMP_STAGE',stage:4});s=reduce(s,{type:'CHOOSE_RELIEF',route});await p.evaluate(({key,s})=>localStorage.setItem(key,JSON.stringify(s)),{key:PROLOGUE_STORAGE_KEY,s});await p.reload();const f=await frame(p);assert.equal((await read(p)).remedyLabs[route].flow,undefined);
  await f.getByRole('button',{name:'开始按天经营 →',exact:true}).click();await settled(f,0);const migrated=remedyAccounts((await read(p)).remedyLabs[route]);assert.deepEqual(migrated.archives[0].reports,books.reports);assert.deepEqual(migrated.archives[0].comparisons,books.comparisons);await ctx.close();results.push({route,legacyOptIn:true,oldLedgerUnchanged:true});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html'))));await fs.writeFile(path.join(out,'report.json'),JSON.stringify({passed:true,sha256:createHash('sha256').update(bytes).digest('hex'),results,errors,external},null,2));
}catch(e){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(out,'failure-'+p.viewportSize().width+'.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await browser.close();await new Promise(r=>server.close(r));}
