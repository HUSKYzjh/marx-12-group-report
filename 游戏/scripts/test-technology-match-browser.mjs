import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {restoreMatch} from '../lib/technology-match.ts';
import {moneyTotal} from '../public/assets/market-duel/model.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const file=path.resolve('build/index.html'),bytes=await fs.readFile(file),hash=createHash('sha256').update(bytes).digest('hex'),out=path.resolve('outputs/technology-match-qa');
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.resolve('offline/技术红利去了哪里.html')).href;
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];await fs.mkdir(out,{recursive:true});
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).technology.match,PROLOGUE_STORAGE_KEY);
async function frame(page){const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();return f;}
async function run(page,f){const day=(await saved(page)).world.day;await f.getByTestId('match-run').click();await page.waitForFunction(({key,day})=>JSON.parse(localStorage.getItem(key)).technology.match.world.day===day+1,{key:PROLOGUE_STORAGE_KEY,day});await f.locator('[data-testid="technology-match"][data-day="'+(day+1)+'"]').waitFor();}
async function plan(page,f,target,method){
 const from=f.locator('[data-piece="freed"]'),to=f.getByRole('button',{name:'放到'+target,exact:true});
 if(method==='keyboard'){await from.focus();await page.keyboard.press('Enter');await to.focus();await page.keyboard.press('Enter');}
 else{await from.scrollIntoViewIfNeeded();await to.scrollIntoViewIfNeeded();const a=await from.boundingBox(),b=await to.boundingBox(),x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
  if(method==='mouse'){await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:10});await page.mouse.up();}
  else{const session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=12;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/12,y:y+(ty-y)*i/12}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}
 }
 await page.waitForFunction(({key,target})=>JSON.parse(localStorage.getItem(key)).technology.match.draft.automation===target,{key:PROLOGUE_STORAGE_KEY,target:{'不再排班':'cut','带薪休息':'rest'}[target]});
}
try{for(const spec of [{width:1280,method:'mouse'},{width:390,method:'touch'},{width:320,method:'keyboard'}]){
 const context=await browser.newContext({viewport:{width:spec.width,height:1100},hasTouch:spec.method==='touch',reducedMotion:spec.width===1280?'no-preference':'reduce'});
 await context.route('**/*',r=>{if(r.request().url().startsWith(url)||spec.width===320&&r.request().url()===offline)return r.continue();external.push(r.request().url());return r.abort();});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(spec.width===320?offline:url);let f=await frame(page);
 await f.locator('#chapter-toggle').click();await f.locator('[data-chapter="automation"]').click();await f.getByRole('button',{name:'和隔壁试六天 →',exact:true}).click();await f.getByTestId('technology-match').waitFor();
 assert.equal((await saved(page)).world.day,0);await run(page,f);await run(page,f);
 const before=(await saved(page)).world;await f.getByTestId('connect-automation').click();await plan(page,f,'不再排班',spec.method);assert.deepEqual((await saved(page)).world,before,'moving people does not pay or install');
 await page.reload();f=await frame(page);await f.getByTestId('technology-match').waitFor();assert.equal((await saved(page)).draft.automation,'cut');await run(page,f);
 let s=await saved(page);assert.equal(s.world.firms[0].robot,true);assert.equal(s.world.firms[1].robot,false);assert.equal(s.world.history[2].report.receipts.find(p=>p.reason==='安装自动控制').amount,8);
 await f.locator('[data-match-person="2"]').click();assert((await f.locator('.match-thoughts').innerText()).includes('这天收到 0'));await f.getByRole('button',{name:'收起 ×',exact:true}).click();
 await page.screenshot({path:path.join(out,spec.width+'-machine.png'),fullPage:true});await run(page,f);assert.equal((await saved(page)).world.firms[1].automation,'cut');while((await saved(page)).world.day<6)await run(page,f);
 const original=await saved(page);assert.deepEqual(restoreMatch(original),original);await f.getByRole('button',{name:'隔壁照做，会怎样？ →',exact:true}).click();await page.waitForFunction(key=>!!JSON.parse(localStorage.getItem(key)).technology.match.synchronous,PROLOGUE_STORAGE_KEY);s=await saved(page);assert.deepEqual(s.world,original.world);assert.equal(moneyTotal(s.synchronous),120);
 await f.getByRole('button',{name:'翻回第3天',exact:true}).click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).technology.match.world.day===2,PROLOGUE_STORAGE_KEY);await f.getByTestId('connect-automation').click();await plan(page,f,'带薪休息',spec.method);await run(page,f);s=await saved(page);assert.deepEqual(s.reference,original.world);assert.equal(s.world.history[2].report.work[2].income,2);assert.equal(s.world.history[2].report.work[2].days,0);
 while((await saved(page)).world.day<6)await run(page,f);await f.getByRole('button',{name:'这局说明了什么？ →',exact:true}).click();await f.getByTestId('technology-report').waitFor();assert.equal(await f.locator('.technology-report[open]').count(),0);await f.locator('.technology-report>summary').click();assert((await f.locator('.technology-report-body').innerText()).includes('当前六天短局'));
 const played=await saved(page);await page.reload();f=await frame(page);await f.getByTestId('technology-match').waitFor();assert.deepEqual(await saved(page),played);await f.getByRole('button',{name:'回到假设目录 ↩',exact:true}).click();await f.locator('.assumption-desk').waitFor();
 await f.locator('#chapter-toggle').click();await f.locator('[data-chapter="automation"]').click();await f.getByTestId('technology-match').waitFor();assert.deepEqual(await saved(page),played);
 assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'fits '+spec.width);await page.screenshot({path:path.join(out,spec.width+'-ending.png'),fullPage:true});
 results.push({...spec,offline:spec.width===320,days:6,machinePaid:true,realFreedWorkerMove:true,delayedRival:true,separateComparison:true,rewind:true,refresh:true,stateInjection:false});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(file))&&bytes.equals(await fs.readFile(path.resolve('offline/技术红利去了哪里.html'))),'build changed during QA');await fs.writeFile(path.join(out,'report.json'),JSON.stringify({checkedAt:new Date().toISOString(),buildSHA256:hash,results,errors,external},null,2));console.log(JSON.stringify({buildSHA256:hash,results,errors,external}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
