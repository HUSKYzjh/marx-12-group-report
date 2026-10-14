/** Click real buyer/device characters; inspect without purchasing or extra turns. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {remedyAccounts} from '../lib/remedy-lab.ts';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),bytes=await fs.readFile(path.join(root,'build/index.html'));
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,out=path.join(root,'outputs/relief-qa');await fs.mkdir(out,{recursive:true});
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
const save=p=>p.evaluate(k=>localStorage.getItem(k),PROLOGUE_STORAGE_KEY);
async function frame(p){const f=await(await p.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();return f;}
async function geometry(f){
 const buyer=f.getByTestId('remedy-equipment-buyer'),b=await buyer.boundingBox(),scene=await f.locator('.remedy-scene:not(.remedy-preview-scene)').boundingBox();assert(b.width>=44&&b.height>=44);assert(b.x>=scene.x&&b.x+b.width<=scene.x+scene.width+1);
 const figures=await f.locator('.remedy-equipment-buyer,.remedy-machine-live,.remedy-machine-pending').all();
 const status=await f.locator('.remedy-status,.remedy-leftovers').all();for(const fig of figures){const a=await fig.boundingBox();for(const box of status){const z=await box.boundingBox();const overlap=Math.max(0,Math.min(a.x+a.width,z.x+z.width)-Math.max(a.x,z.x))*Math.max(0,Math.min(a.y+a.height,z.y+z.height)-Math.max(a.y,z.y));assert(overlap<1,JSON.stringify({a,z}));}}
 assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));return {width:b.width,height:b.height,noStatusOrShelfOverlap:true};
}
async function check(p,f,reduced){
 const saved=await save(p),a=remedyAccounts(JSON.parse(saved).remedyLabs.investment),r=a.display,paid=r?r.payments.filter(p=>p.from==='buyers'&&p.to==='shop').reduce((n,p)=>n+p.amount,0):0;
 const before=r?a.reports[r.round-2]?.world??a.opening:a.opening,kind=before.efficiency?'upgraded':'old';assert.equal(await f.locator('.remedy-machine-groups').getAttribute('data-active-efficiency'),String(before.efficiency));
 const kinds=await f.locator('.remedy-machine-live .remedy-machines img').evaluateAll(nodes=>nodes.map(n=>n.dataset.machineKind));assert.equal(kinds.length,Math.min(3,1+Math.ceil(before.capacity/10)));assert.equal(kinds[0],kind);assert(kinds.slice(1).every(k=>k==='addition'));
 assert(await f.locator('.remedy-producer>.remedy-oven').evaluate((n,kind)=>n.src===(kind==='old'?window.TRUST_ASSETS.bakery.emptyOldOven:window.TRUST_ASSETS.street.emptyOven),kind),'the main machine uses this period equipment, not pending equipment');
 const waiting=f.locator('.remedy-machine-pending');if(await waiting.count()){assert.equal(await waiting.getAttribute('data-mode'),r.control.mode);assert.equal(await waiting.locator('.remedy-machine-outgoing').count(),r.control.mode==='replace'?1:0);assert.equal(await waiting.locator('.remedy-install-clock').isVisible(),true);assert(await waiting.locator('.remedy-machine-arriving').evaluate(n=>n.src===window.TRUST_ASSETS.street.emptyOven));}
 assert.equal(await f.getByTestId('remedy-equipment-buyer').getAttribute('data-orders'),String(paid));const size=await geometry(f),question=await f.locator('.remedy-message').textContent();await f.getByTestId('remedy-equipment-buyer').scrollIntoViewIfNeeded();
 const original={commands:await f.locator('.remedy-commands').boundingBox(),battle:await f.locator('.remedy-battle').boundingBox()};
 async function stable(){for(const [selector,key]of [['.remedy-commands','commands'],['.remedy-battle','battle']]){const box=await f.locator(selector).boundingBox();for(const metric of ['x','y','width','height'])assert(Math.abs(box[metric]-original[key][metric])<1,JSON.stringify({key,metric,original:original[key],box}));}}
 await f.getByTestId('remedy-equipment-buyer').click();const quote=await f.locator('.remedy-message').innerText();assert.match(quote,r?new RegExp('买'+paid+'份'):/还没下单/);assert.equal(await save(p),saved);await stable();assert.equal(await f.locator('.remedy-message').getAttribute('data-inspecting'),'true');
 const pending=f.getByRole('button',{name:'检查待安装设备',exact:true});if(await pending.count()){
  await pending.click();assert.match(await f.locator('.remedy-message').innerText(),/下期|设备到了/);assert.equal(await f.getByTestId('remedy-equipment-buyer').getAttribute('data-checked'),null);await stable();
  await f.getByTestId('remedy-equipment-buyer').click();assert.equal(await f.locator('.remedy-message').innerText(),quote);assert.equal(await pending.getAttribute('data-checked'),null);await stable();
 }
 await f.waitForFunction(q=>document.querySelector('.remedy-message').textContent===q,question);assert.equal(await f.locator('[data-checked]').count(),0);assert.equal(await save(p),saved);assert.equal(await f.locator('.remedy-message').getAttribute('data-inspecting'),null);await stable();
 if(r?.round===3){assert.equal(await f.getByTestId('remedy-equipment-buyer').getAttribute('data-status'),'less');const person=f.getByTestId('remedy-equipment-buyer').locator('.remedy-person'),animated=await f.getByTestId('remedy-equipment-buyer').getAttribute('data-animate')==='true';
  if(reduced||!animated)assert.equal(await person.evaluate(n=>getComputedStyle(n).animationName),'none');
  else {const movement=await person.evaluate(n=>{const a=n.getAnimations().find(a=>a.animationName==='remedy-wince');if(!a)return null;a.pause();const timing=a.effect.getComputedTiming();a.currentTime=timing.delay;const start=new DOMMatrix(getComputedStyle(n).transform).e;a.currentTime=timing.delay+timing.duration/4;const end=new DOMMatrix(getComputedStyle(n).transform).e;a.finish();return {start,end};});assert(movement&&Math.abs(movement.end-movement.start)>2,'the buyer must actually shake, not merely carry an animation class');}
 }
 return {orders:paid,size,readOnly:true,inspectionRestoresSingleQuestion:true,noConsoleShift:true};
}
try{
 for(const spec of [{width:320},{width:390,reduced:true,offline:true},{width:1280}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:960},reducedMotion:spec.reduced?'reduce':'no-preference'});
  await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||spec.offline&&u===offline)return r.continue();external.push(u);return r.abort();});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(spec.offline?offline:url);let f=await frame(p);await f.locator('#dots [data-stage="4"]').click();await f.locator('.remedy-card').first().waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);await f.locator('.remedy-card[data-route=investment]').click();await f.locator('.remedy-scene[data-round="0"]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);
  const checks=[await check(p,f,!!spec.reduced)];for(let n=1;n<=4;n++){
   const mode=n===4?'replace':'expand';await f.waitForFunction(m=>!document.querySelector('[data-gesture-target="'+m+'"]').disabled,mode);const before=await save(p);await f.locator('[data-gesture-target="'+mode+'"]').click();await p.waitForFunction(({key,before})=>localStorage.getItem(key)!==before,{key:PROLOGUE_STORAGE_KEY,before});await f.locator('.remedy-scene[data-round="'+Math.min(n,3)+'"]').waitFor();checks.push(await check(p,f,!!spec.reduced));
   if(n===2||n===3||n===4)await p.screenshot({path:path.join(out,'buyer-'+spec.width+'-round'+n+'.png'),fullPage:true});
  }
  const saved=await save(p);await p.reload();f=await frame(p);await f.locator('.remedy-scene[data-animate=false]').waitFor();await check(p,f,!!spec.reduced);assert.equal(await save(p),saved);
  await f.locator('.remedy-conditions>summary').click();assert.equal(await save(p),saved);await f.getByTestId('remedy-comparison').press('Enter');const old=f.locator('.remedy-preview-scene');await old.waitFor();assert.equal(await old.getByTestId('remedy-equipment-buyer').isDisabled(),true);assert.equal(await old.getByTestId('remedy-equipment-buyer').getAttribute('data-orders'),'13');await f.getByTestId('remedy-comparison').press('Escape');assert.equal(await save(p),saved);
  await f.locator('.remedy-receipt>summary').click();await f.getByRole('button',{name:'从相同起点再试 ↺',exact:true}).click();await f.locator('.remedy-scene[data-round="0"]').waitFor();await f.locator('.remedy-tools>summary').click();for(let n=0;n<2;n++)await f.getByRole('button',{name:'减少药方力度',exact:true}).click();await f.locator('[data-gesture-target=expand]').click();await f.locator('.remedy-scene[data-round="1"]').waitFor();assert.equal(await f.getByTestId('remedy-equipment-buyer').getAttribute('data-orders'),'15');assert.equal(await f.locator('.remedy-machine-pending').count(),0);await check(p,f,!!spec.reduced);
  const current=JSON.parse(await save(p));assert.equal(current.remedyLabs.investment.history.length,1);assert.equal(current.remedyLabs.investment.history[0].dose,0);assert.equal(current.reliefCompleted.includes('investment'),false);
  await f.getByRole('button',{name:'从第1回合重打，保留原记录',exact:true}).click();await f.locator('.remedy-scene[data-round="0"]').waitFor();if(!await f.locator('.remedy-tools').evaluate(n=>n.open))await f.locator('.remedy-tools>summary').click();for(let n=0;n<2;n++){const prior=await save(p);await f.getByRole('button',{name:'增加药方力度',exact:true}).click();await p.waitForFunction(({key,prior})=>localStorage.getItem(key)!==prior,{key:PROLOGUE_STORAGE_KEY,prior});}
  for(let n=1;n<=2;n++){await f.waitForFunction(()=>!document.querySelector('[data-gesture-target=replace]').disabled);const prior=await save(p);await f.locator('[data-gesture-target=replace]').click();await p.waitForFunction(({key,prior})=>localStorage.getItem(key)!==prior,{key:PROLOGUE_STORAGE_KEY,prior});await f.locator('.remedy-scene[data-round="'+n+'"]').waitFor();await check(p,f,!!spec.reduced);const account=remedyAccounts(JSON.parse(await save(p)).remedyLabs.investment);assert.equal(account.display.made,50);assert.equal(account.display.capacity,0);assert.equal(account.display.costs,n===1?15:13);await p.screenshot({path:path.join(out,'buyer-'+spec.width+'-replacement'+n+'.png'),fullPage:true});}
  assert.equal(await f.locator('.remedy-machine-live .remedy-machines img').count(),1);assert.equal(await f.locator('.remedy-machine-live .remedy-machines img').getAttribute('data-machine-kind'),'upgraded');assert.equal(await f.locator('.remedy-machine-outgoing').count(),1);assert.equal(JSON.parse(await save(p)).reliefCompleted.includes('investment'),false);
  results.push({width:spec.width,reduced:!!spec.reduced,offline:!!spec.offline,checks,distinctExpansionAndReplacement:true,delayedEquipmentArt:true,replacementWithoutExtraCapacity:true,refreshReadOnly:true,peekReadOnly:true,zeroExtraKeepsOriginalOrders:true});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile(path.join(root,'build/index.html'))));
 const report={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,passed:true,results,errors,external};await fs.writeFile(path.join(out,'remedy-buyer-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({sha256:report.sha256,bytes:report.bytes,passed:true,cases:results.length}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
