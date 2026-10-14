/** Read-only diagram QA entered through the actual stage button. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html'));
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',out=path.join(root,'outputs/ownership-diagram-qa');await fs.mkdir(out,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
try{
 for(const width of [1280,390,320]){
  const offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href;
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||width===320&&u===offline)return r.continue();external.push(u);return r.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(width===320?offline:url);
  const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();
  await f.locator('#dots button[data-stage="3"]').click();await f.locator('body[data-scene="street-summary"]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);await f.evaluate(()=>document.fonts.ready);
  const diagram=f.locator('[data-diagram="private-ownership"]');assert.equal(await diagram.getAttribute('role'),'img');assert((await diagram.getAttribute('aria-label')).includes('拥有店和机器'));
  assert.equal(await diagram.locator('[data-role="worker"]').count(),2);assert.equal(await diagram.locator('[data-role="owner"]').count(),1);assert.equal(await diagram.locator('[data-role="owned-machine"]').count(),1);
  assert.equal(await diagram.locator('[data-symbol="property-key"]').count(),1);assert.equal(await diagram.locator('[data-relation="ownership"]').count(),1);assert.equal(await diagram.locator('[data-relation="control"]').count(),1);
  assert.deepEqual(await diagram.locator('[data-decision] text').allTextContents(),['定工资','定用工','添机器']);
  // A nested SVG's bounding rect can include clipped sprite-sheet geometry.
  // Verify its viewport size and clipping rather than that painted-content bbox.
  const cropped=await diagram.locator('[data-role] svg').evaluateAll(nodes=>nodes.map(n=>({viewport:n.width.baseVal.value,css:getComputedStyle(n).width,expected:Number(n.getAttribute('width')),overflow:getComputedStyle(n).overflow})));
  assert.equal(cropped.length,5);for(const n of cropped){assert.equal(n.viewport,n.expected);assert(['auto',n.expected+'px'].includes(n.css),JSON.stringify({width,n}));assert.equal(n.overflow,'hidden');}
  const labels=await diagram.locator('text').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect(),box=n.ownerSVGElement.getBoundingClientRect();return {text:n.textContent,left:b.left-box.left,right:box.right-b.right,top:b.top-box.top,bottom:box.bottom-b.bottom,size:parseFloat(getComputedStyle(n).fontSize)*box.width/400};}));
  for(const n of labels){assert(n.left>=0&&n.right>=0&&n.top>=0&&n.bottom>=0,JSON.stringify({width,n}));assert(n.size>=13,JSON.stringify({width,n}));}
  assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await f.locator('.street-summary-panels>section').count(),2);
  await page.screenshot({path:path.join(out,width+'.png'),fullPage:true});results.push({width,offline:width===320,labels});
  await f.getByRole('button',{name:'还有什么办法？ →',exact:true}).click();await f.locator('.remedy-card').first().waitFor();await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({results,errors,external},null,2));console.log('PASS: ownership, control, workers, readable labels and navigation at 1280 / 390 / offline 320.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
