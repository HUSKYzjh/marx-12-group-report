import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url)),bytes=await fs.readFile(path.join(root,'build/index.html')),out=path.join(root,'outputs/manuscript-qa');await fs.mkdir(out,{recursive:true});
const sha256=createHash('sha256').update(bytes).digest('hex');assert(bytes.equals(await fs.readFile(path.join(root,'offline/技术红利去了哪里.html'))));
const server=http.createServer((_,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href;
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),results=[],errors=[],external=[];
async function frame(p){const f=await(await p.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);return f;}
const saved=p=>p.evaluate(k=>localStorage.getItem(k),PROLOGUE_STORAGE_KEY);
try{
 for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width===390,reducedMotion:'reduce'});await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||u===offline)return r.continue();external.push(u);return r.abort();});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(width===390?offline:url);let f=await frame(p);
  await f.locator('#dots [data-stage="3"]').click();await f.waitForFunction(()=>!document.body.dataset.transition);assert.equal(await f.getByTestId('ownership-permissions').count(),0,'permission controls should not compete with the two definitions');await p.screenshot({path:path.join(out,'summary-'+width+'.png'),fullPage:true});await f.locator('.ownership-permission-entry>summary').click();await f.getByTestId('ownership-permissions').waitFor();const original=await saved(p),permissions=f.getByTestId('ownership-permissions');
  await permissions.locator('[data-permission-action=operate]').press('Enter');assert.equal(await permissions.locator('[role=status]').getAttribute('data-allowed'),'true');
  assert.equal(await f.locator('.street-summary-gains').innerText(),'劳动分工提高生产效率，市场竞争推动改进，自由贸易扩大交换范围');assert(await f.locator('.street-summary-gains').isVisible());
  await permissions.locator('[data-permission-action=schedule]').press('Enter');assert.equal(await permissions.locator('[role=status]').getAttribute('data-allowed'),'false');
  await permissions.locator('[data-permission-role=owner]').click();await permissions.locator('[data-permission-action=schedule]').press('Enter');assert.equal(await permissions.locator('[role=status]').getAttribute('data-allowed'),'true');assert.equal(await f.locator('[data-diagram=private-ownership]').getAttribute('data-focus-role'),'owner');assert.equal(await saved(p),original,'permission sketch must not spend money or alter save');
  assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:path.join(out,'permissions-'+width+'.png'),fullPage:true});
  // Real chapter navigation; no injected state or invented earlier completion.
  await f.locator('#chapter-toggle').click();await f.locator('[data-chapter=automation]').click();await f.locator('.hidden-work-entry').waitFor();const before=await saved(p);
  await f.locator('.hidden-work-entry>summary').click();const desk=f.getByTestId('hidden-work');await desk.waitFor();assert.equal(await desk.getAttribute('data-minutes'),'12');
  await desk.getByRole('button',{name:'这批全交给系统',exact:true}).press('Enter');assert.equal(await desk.getAttribute('data-ready'),'1');assert.equal(await desk.getAttribute('data-minutes'),'3');assert.match(await desk.locator('[role=status]').textContent(),/人工 0/);
  assert.equal(await desk.getByRole('button',{name:'这批全交给系统',exact:true}).evaluate(n=>n===document.activeElement),true);
  assert.equal(await desk.locator('.hidden-work-promise').getAttribute('open'),null);assert.equal(await desk.getByTestId('promise-audit').count(),0);
  await desk.locator('.hidden-work-promise>summary').click();
  const act=async name=>{const b=desk.getByRole('button',{name,exact:true});if(width===390)await b.tap();else await b.press('Enter');};
  await act('验收今天这批');const audit=desk.getByTestId('promise-audit');assert.equal(await audit.getAttribute('data-saved'),'unknown');assert.match(await audit.innerText(),/不能拿未完成/);
  for(let i=0;i<3;i++){await act('宣传再大胆一点');assert.equal(await desk.getAttribute('data-ready'),'1');assert.equal(await desk.getAttribute('data-minutes'),'3');assert.equal(await audit.getAttribute('data-saved'),'unknown');assert.equal(await desk.locator('.hidden-work-promise').getAttribute('open'),'');assert.equal(await desk.getByRole('button',{name:'宣传再大胆一点',exact:true}).evaluate(n=>n===document.activeElement),true);}
  assert.equal(await desk.locator('.hidden-work-poster').getAttribute('data-claim'),'0');assert.equal(await saved(p),before);await p.screenshot({path:path.join(out,'promise-incomplete-'+width+'.png'),fullPage:true});
  await desk.getByRole('button',{name:'请人收尾',exact:true}).click();assert.equal(await desk.getAttribute('data-ready'),'3');assert.equal(await desk.getAttribute('data-minutes'),'10');assert.match(await desk.locator('.hidden-work-result').textContent(),/人工 7/);assert.equal(await audit.getAttribute('data-saved'),'2');assert.match(await audit.innerText(),/本实验没有这些资料/);
  await desk.getByRole('button',{name:'只自动处理重复订单',exact:true}).click();assert.equal(await desk.getAttribute('data-ready'),'3');assert.equal(await desk.getAttribute('data-minutes'),'9');assert.equal(await saved(p),before,'optional task experiment is page-local');
  assert.equal(await audit.getAttribute('data-saved'),'3');for(const b of await desk.locator('button:visible').all())assert((await b.boundingBox()).height>=44);assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:path.join(out,'hidden-work-'+width+'.png'),fullPage:true});
  await p.reload();f=await frame(p);await f.locator('.hidden-work-entry>summary').click();assert.equal(await f.getByTestId('hidden-work').getAttribute('data-minutes'),'12');assert.equal(await f.getByTestId('promise-audit').count(),0);
  results.push({width,offline:width===390,permissions:true,hiddenWork:true,promiseAudit:true,noInjectedSave:true,keyboardFocus:true,saveUnchanged:true});console.log('PASS manuscript interactions',width);await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html'))));await fs.writeFile(path.join(out,'report.json'),JSON.stringify({passed:true,sha256,results,errors,external},null,2));
}catch(e){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(out,'failure-'+p.viewportSize().width+'.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await browser.close();await new Promise(r=>server.close(r));}
