import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {chooseCondition} from './assumption-browser-gestures.mjs';
import {moveCalendarPiece,openCalendarWorkspace} from './time-calendar-browser-gestures.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url)),bytes=await fs.readFile(path.join(root,'build/index.html')),sha256=createHash('sha256').update(bytes).digest('hex'),out=path.join(root,'outputs/production-purpose-qa');await fs.mkdir(out,{recursive:true});
const server=http.createServer((_,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href;
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),results=[],errors=[],external=[];
async function frame(p){const f=await(await p.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);return f;}
const saved=p=>p.evaluate(k=>localStorage.getItem(k),PROLOGUE_STORAGE_KEY);
try{
 for(const width of [320,390,1280]){
  const method=width===320?'keyboard':width===390?'touch':'mouse',context=await browser.newContext({viewport:{width,height:900},hasTouch:width===390,reducedMotion:width===1280?'no-preference':'reduce'});
  await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||u===offline)return r.continue();external.push(u);return r.abort();});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(width===390?offline:url);let f=await frame(p);
  await f.locator('#chapter-toggle').click();await f.locator('[data-chapter=automation]').click();await f.getByRole('button',{name:'回到假设目录 ↩',exact:true}).click();
  await chooseCondition(f,'labour');await f.locator('[data-branch=time]').click();await f.getByRole('button',{name:'试着安排一周 →',exact:true}).click();
  assert.equal(await f.locator('.production-purpose-entry').count(),0,'not another required step before play');
  await f.getByRole('button',{name:'照这样，过一周 →',exact:true}).click();await f.locator('.calendar-result[data-stale=false]').waitFor();
  await openCalendarWorkspace(p,f);for(const day of [2,3,4])await moveCalendarPiece(p,f,'day:'+day,'rest',method);
  await f.getByRole('button',{name:'照这样，过一周 →',exact:true}).click();await f.locator('.calendar-result[data-stale=false]').waitFor();
  await f.getByRole('button',{name:'时间归谁？ →',exact:true}).click();await f.locator('.production-purpose-entry').waitFor();
  assert.deepEqual(await f.locator('.calendar-comparisons>span').evaluateAll(ns=>ns.map(n=>Number(n.dataset.personalWorkDays))),[5,2],'same income summaries still expose changed personal work days');
  assert.equal(await f.getByTestId('production-purpose').count(),0,'folded and unmounted by default');const original=await saved(p);
  await f.getByTestId('technology-report').locator(':scope>summary').click();const reader=f.getByTestId('research-reader');assert.equal(await reader.locator('.research-paragraph').count(),1);assert.equal(await reader.getAttribute('data-topic'),'1');assert((await reader.locator('.research-paragraph').innerText()).length<900);
  const topic=reader.getByRole('combobox',{name:'选择资料主题'});await topic.selectOption({label:'阿面的这一周：日期也有意义'});assert.equal(await reader.getAttribute('data-page'),'0');await reader.getByRole('button',{name:'下一段 →',exact:true}).press('Enter');assert.equal(await reader.getAttribute('data-page'),'1');await reader.getByRole('button',{name:'← 上一段',exact:true}).press('Enter');assert.equal(await reader.getAttribute('data-page'),'0');
  await topic.selectOption({label:'来源'});assert(await reader.locator('a[href^="https://"]').count()>0);
  await topic.selectOption({label:'原始来源（逐条）'});const sourceCount=Number(await reader.getAttribute('data-page-count'));assert.equal(sourceCount,6);for(let i=0;i<sourceCount;i++){assert.equal(await reader.locator('.research-paragraph').count(),1);assert.match(await reader.locator('.research-paragraph').innerText(),/读取范围：/);assert.equal(await reader.locator('a[href^="https://"]').count(),i===3?2:1);if(i<sourceCount-1)await reader.getByRole('button',{name:'下一段 →',exact:true}).click();}
  await topic.selectOption({label:'文稿背景（逐篇）'});assert.equal(await reader.getAttribute('data-page'),'0');for(const [i,date] of ['2020-12-12','2021-02-02','2023-04-14','2024-05-18','2026-02-20'].entries()){const words=await reader.locator('.research-paragraph').innerText();assert(words.startsWith(date));assert.match(words,/机器稿未逐句听校/);assert.equal(await reader.locator('.research-paragraph').count(),1);assert.equal(await reader.locator('a[href^="https://www.bilibili.com/video/"]').count(),1);if(i<4){const b=reader.getByRole('button',{name:'下一段 →',exact:true});if(method==='keyboard')await b.press('Enter');else if(method==='touch')await b.tap();else await b.click();}}await p.screenshot({path:path.join(out,'manuscript-'+width+'.png'),fullPage:true});
  await topic.selectOption({label:'原始来源（逐条）'});assert.equal(await reader.getAttribute('data-page'),'0');assert.equal(await saved(p),original,'reading and paging cannot mutate calendar history');assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));for(const b of await reader.locator('button:visible,select').all())assert((await b.boundingBox()).height>=44);await p.screenshot({path:path.join(out,'reader-'+width+'.png'),fullPage:true});await f.getByTestId('technology-report').locator(':scope>summary').click();
  await f.locator('.production-purpose-entry>summary').click();let desk=f.getByTestId('production-purpose');await desk.waitFor();
  assert.equal(await desk.getAttribute('data-machine'),'old');assert.equal(await desk.getAttribute('data-energy'),'12');
  assert.match(await desk.locator('.production-purpose-energy').innerText(),/每份 2 格 · 总共 12 格/);
  const act=async id=>{const b=desk.locator('[data-purpose-action="'+id+'"]');if(method==='keyboard')await b.press('Enter');else if(method==='touch')await b.tap();else await b.click();};
  await act('upgrade');assert.equal(await desk.getAttribute('data-output'),'18');assert.equal(await desk.getAttribute('data-energy'),'18');assert.equal(await desk.getAttribute('data-stock'),'12');
  assert.match(await desk.locator('.production-purpose-energy').innerText(),/每份 1 格 · 总共 18 格/);
  assert.equal(await desk.locator('[data-purpose-action=full]').evaluate(n=>n===document.activeElement),true,'upgrade transfers keyboard focus to a real next control');
  assert.equal(await desk.locator('.production-purpose-tray img').count(),18);assert.equal(await desk.locator('img[data-sold=false]').count(),12);
  assert.equal(await desk.locator('.production-purpose-cells [data-used=true]').count(),18);
  const animation=await desk.locator('.production-purpose-tray img').first().evaluate(n=>getComputedStyle(n).animationName);assert.equal(animation==='none',width!==1280);
  await p.screenshot({path:path.join(out,'full-'+width+'.png'),fullPage:true});
  await act('enough');assert.equal(await desk.getAttribute('data-output'),'6');assert.equal(await desk.getAttribute('data-energy'),'6');assert.equal(await desk.getAttribute('data-hours'),'1');assert.equal(await desk.getAttribute('data-stock'),'0');assert.equal(await desk.locator('.production-purpose-clock .free').count(),2);
  assert.match(await desk.locator('[role=status]').innerText(),/腾出2小时/);await p.screenshot({path:path.join(out,'enough-'+width+'.png'),fullPage:true});
  await desk.getByText('如果订单变多呢？',{exact:true}).click();await act('orders');assert.equal(await desk.getAttribute('data-orders'),'18');assert.equal(await desk.getAttribute('data-output'),'6');assert.equal(await desk.getAttribute('data-unfilled'),'12');
  assert.equal(await desk.locator('[data-purpose-action=orders]').evaluate(n=>n===document.activeElement),true);assert.equal(await desk.locator('details').first().getAttribute('open'),'');
  await act('enough');assert.equal(await desk.getAttribute('data-sold'),'18');assert.equal(await desk.getAttribute('data-stock'),'0');assert.equal(await desk.getAttribute('data-energy'),'18');assert.match(await desk.locator('[role=status]').innerText(),/都有人要/);
  await act('orders');assert.equal(await desk.getAttribute('data-orders'),'6');assert.equal(await desk.getAttribute('data-stock'),'12');
  assert.equal(await saved(p),original,'experiment never alters the actual calendar or money');
  await desk.getByText('假设、来源与边界',{exact:true}).click();assert.match(await desk.innerText(),/不是电价或碳排放/);assert.match(await desk.innerText(),/不是对反弹效应大小的估计/);
  for(const b of await desk.locator('button:visible').all())assert((await b.boundingBox()).height>=44);
  assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const oven=await desk.locator('.production-purpose-oven').boundingBox(),goods=await desk.locator('.production-purpose-goods').boundingBox();assert(oven.x+oven.width<=goods.x);assert(goods.x+goods.width<=width+1);
  await p.screenshot({path:path.join(out,'limits-'+width+'.png'),fullPage:true});
  await act('reset');assert.equal(await desk.getAttribute('data-machine'),'old');assert.equal(await desk.getAttribute('data-orders'),'6');assert.equal(await saved(p),original);
  await act('upgrade');await p.reload();f=await frame(p);assert.deepEqual(JSON.parse(await saved(p)),JSON.parse(original),'restore may normalise key order, never values');await f.locator('.production-purpose-entry>summary').click();desk=f.getByTestId('production-purpose');assert.equal(await desk.getAttribute('data-machine'),'old');
  await f.getByRole('button',{name:'回到假设目录 ↩',exact:true}).click();await chooseCondition(f,'labour');await f.locator('[data-branch=time]').click();await f.locator('.production-purpose-entry>summary').click();assert.equal(await f.getByTestId('production-purpose').getAttribute('data-machine'),'old');
  results.push({width,method,offline:width===390,realCalendarConclusion:true,oneSourceAtATime:sourceCount,fiveManuscriptsPaged:true,efficientUnitButHigherTotal:true,matchedOrdersReduceEnergy:true,expandedDemand:true,saveUnchanged:true,refresh:true});console.log('PASS production purpose',width);await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html'))));assert(bytes.equals(await fs.readFile(path.join(root,'offline/技术红利去了哪里.html'))));
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({passed:true,sha256,results,errors,external},null,2));
}catch(e){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(out,'failure-'+p.viewportSize().width+'.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await browser.close();await new Promise(r=>server.close(r));}
