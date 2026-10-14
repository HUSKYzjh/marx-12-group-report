import {chooseCondition} from './assumption-browser-gestures.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {initialPrologue,prologueReducer as reduce,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {moveNetwork,runNetwork} from './platform-network-browser-gestures.mjs';
import {moveCouncil,arrangeCouncil,payCouncil,voteCouncil} from './sharing-council-browser-gestures.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html')),server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',offline=pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,out=path.join(root,'outputs/ownership-qa');await fs.mkdir(out,{recursive:true});
let saved=reduce(initialPrologue(),{type:'JUMP_STAGE',stage:4});for(const route of ['consumption','investment','exports'])for(const a of [{type:'CHOOSE_RELIEF',route},{type:'RELIEF_ADVANCE',expectedPhase:'ready'},{type:'RELIEF_ADVANCE',expectedPhase:'improved'},{type:'RELIEF_CONDITION',sustained:true},{type:'RELIEF_COMPLETE'},{type:'RELIEF_MENU'}])saved=reduce(saved,a);for(const a of [{type:'FINISH_RELIEF'},{type:'EPILOGUE_REVEAL'},{type:'SHOW_ASSUMPTIONS'}])saved=reduce(saved,a);
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),errors=[],external=[],results=[];
async function frame(page){const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();return f;}
async function fits(f){assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert(await f.locator('.ownership-modes button').evaluateAll(nodes=>nodes.every(n=>{const range=document.createRange();range.selectNodeContents(n);const text=range.getBoundingClientRect(),box=n.getBoundingClientRect();return text.width<=box.width+1&&text.height<=box.height+1;})));assert.deepEqual(await f.locator('#readout,#controls').evaluateAll(nodes=>nodes.flatMap(el=>{const walker=document.createTreeWalker(el,4),bad=[];let n;while((n=walker.nextNode()))if(n.nodeValue.includes('枚')&&!n.parentElement.closest('.money-spoken-unit,svg'))bad.push(n.nodeValue);return bad;})),[]);}
try{for(const spec of [{width:1280},{width:390,offline:true}]){
 const context=await browser.newContext({viewport:{width:spec.width,height:1000},reducedMotion:spec.offline?'reduce':'no-preference'});await context.route('**/*',r=>{if(r.request().url().startsWith(url)||spec.offline&&r.request().url()===offline)return r.continue();external.push(r.request().url());return r.abort();});await context.addInitScript(({key,saved})=>{if(window===top&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{key:PROLOGUE_STORAGE_KEY,saved});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(spec.offline?offline:url);let f=await frame(page);
 await chooseCondition(f,'ownership');await f.locator('[data-branch="concentration"]').click();await f.getByRole('button',{name:'先接上技术 →',exact:true}).click();
 assert.equal(await f.getByRole('button',{name:'这些结果说明什么？ →',exact:true}).count(),0);
 for(const [mode,cash] of [['locked',13],['portable',18],['joint',20]]){
  if(mode!=='locked')await moveNetwork(page,f,'rule:'+mode,'contract');await runNetwork(page,f);
  await page.reload();f=await frame(page);assert.equal(await f.locator('[data-testid="network-board"]').getAttribute('data-round'),'1');
  await moveNetwork(page,f,'shop:0','B');await runNetwork(page,f);assert((await f.locator('.network-factory').first().innerText()).includes(String(cash)));
  assert.equal(await f.locator('.provider-A .network-authority svg').count(),mode==='joint'?3:1);
  assert(await f.locator('#readout .money-coin').count()>=4);await fits(f);await page.screenshot({path:path.join(out,spec.width+'-'+mode+'.png'),fullPage:true});
 }
 await f.getByRole('button',{name:'一起生产，谁拿钥匙？ →',exact:true}).click();assert((await f.locator('.ownership-conclusion').innerText()).includes('不等于都拿着钥匙'));await f.locator('[data-testid="ownership-report"] > summary').click();assert((await f.locator('.technology-report-body').innerText()).includes('23.06'));await fits(f);
 await f.getByRole('button',{name:'回到假设目录 ↩',exact:true}).click();await chooseCondition(f,'ownership');await f.locator('[data-branch="sharing"]').click();await f.getByRole('button',{name:'看看这笔钱 →',exact:true}).click();
 for(const [mode,outcome] of [['bonus','invest'],['minority','invest'],['coop','divide']]){
  if(mode!=='bonus')await moveCouncil(page,f,'mode:'+mode,'charter');await arrangeCouncil(page,f,'keyboard',mode==='minority');await payCouncil(page,f);await moveCouncil(page,f,'ballot','divide');await voteCouncil(page,f);await f.locator('[data-testid="council-result"][data-outcome="'+outcome+'"]').waitFor();assert.equal(await f.locator('.council-person').count(),6);assert.equal(await f.locator('.council-result').evaluate(n=>getComputedStyle(n).animationName),spec.offline?'none':'council-counted');await fits(f);await page.screenshot({path:path.join(out,spec.width+'-'+mode+'.png'),fullPage:true});await page.reload();f=await frame(page);assert.equal(await f.locator('[data-testid="council-board"]').getAttribute('data-mode'),mode);
 }
 await f.getByRole('button',{name:'同一笔钱，重新安排 ↺',exact:true}).click();await f.locator('[data-testid="council-board"][data-step="money"]').waitFor();await arrangeCouncil(page,f);await payCouncil(page,f);await moveCouncil(page,f,'ballot','invest');await voteCouncil(page,f);await f.locator('[data-testid="council-result"][data-outcome="hold"]').waitFor();assert((await f.locator('.council-outcome').innerText()).includes('三比三'));await fits(f);await page.screenshot({path:path.join(out,spec.width+'-tie.png'),fullPage:true});
 await f.getByRole('button',{name:'拿到钱，也拿到钥匙了吗？ →',exact:true}).click();await f.locator('[data-testid="ownership-report"] > summary').click();assert((await f.locator('.technology-report-body').innerText()).includes('127909'));await fits(f);
 await f.getByRole('button',{name:'回到假设目录 ↩',exact:true}).click();await f.locator('#chapter-toggle').click();await f.locator('[data-chapter="ownership"]').click();await f.locator('body[data-scene="ownership-technology"]').waitFor();await f.locator('.ownership-conclusion').waitFor();await f.getByRole('button',{name:'回到假设目录 ↩',exact:true}).click();await chooseCondition(f,'ownership');await f.locator('[data-branch="concentration"]').click();await f.getByRole('button',{name:'先接上技术 →',exact:true}).click();await f.getByRole('slider',{name:'原入口使用费',exact:true}).fill('4');assert.equal(await f.getByRole('button',{name:'一起生产，谁拿钥匙？ →',exact:true}).count(),0);assert.equal(await f.locator('[data-testid="network-board"]').getAttribute('data-round'),'0');
 results.push({width:spec.width,offline:!!spec.offline,platformModes:3,platformOperations:6,shareModes:3,realPlayerTie:true,refresh:true,coinIcons:true,chapterNavigation:true,motion:spec.offline?'reduced':'normal'});await context.close();
}assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({checkedAt:new Date().toISOString(),buildSha256:createHash('sha256').update(bytes).digest('hex'),results,errors,external},null,2));console.log(JSON.stringify({passed:results.length,results,errors,external}));}
finally{await browser.close();await new Promise(r=>server.close(r));}
