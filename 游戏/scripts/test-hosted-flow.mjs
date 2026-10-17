import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {hostedTestServer} from './hosted-test-server.mjs';
import {readOpeningGuide} from './prologue-battle-browser-gestures.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url));
const remote=process.env.GAME_TEST_URL;
const server=remote?null:await hostedTestServer(path.join(root,'build/hosted'));
const url=remote||server.url,origin=new URL(url).origin;
const out=process.env.GAME_TEST_OUTPUT||path.join(root,'outputs/hosted-flow',remote?'online':'local');await fs.mkdir(out,{recursive:true});
const fontSet=JSON.parse(await fs.readFile(path.join(root,'build/hosted/web-fonts.json'),'utf8'));
const hosted=JSON.parse(await fs.readFile(path.join(root,'build/hosted/hosting-manifest.json'),'utf8'));
const rare=fontSet.parts.slice(1).flatMap(p=>p.ranges).find(([a])=>a>=0x4e00&&a<=0x9fff)[0];
const sample='饥馑的盛宴。皱眉、鼓腮：照护与排班。'+String.fromCodePoint(rare);
function findNode(n,id){if(n.attributes?.some((a,i)=>a==='id'&&n.attributes[i+1]===id))return n;for(const child of [...(n.children||[]),...(n.contentDocument?[n.contentDocument]:[])]){const hit=findNode(child,id);if(hit)return hit;}}
async function fonts(page,frame,family){
 await frame.evaluate(async({sample,family})=>{const p=document.createElement('p');p.id='hosted-font-diagnostic';p.textContent=sample;p.style.cssText=`font:20px ${family};`;document.querySelector('main').append(p);await document.fonts.load(`20px ${family}`,sample);await document.fonts.ready;},{sample,family});
 const session=await page.context().newCDPSession(page);await session.send('DOM.enable');await session.send('CSS.enable');
 const {root:document}=await session.send('DOM.getDocument',{depth:-1,pierce:true});const n=findNode(document,'hosted-font-diagnostic');assert(n);
 const {fonts}=await session.send('CSS.getPlatformFontsForNode',{nodeId:n.nodeId});assert(fonts.length&&fonts.every(f=>f.isCustomFont),'Every specimen glyph must use the bundled font: '+JSON.stringify(fonts));
 await frame.locator('#hosted-font-diagnostic').evaluate(n=>n.remove());await session.detach();return fonts;
}
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),results=[],errors=[];
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:width===390?667:900},hasTouch:width===390,reducedMotion:width===390?'reduce':'no-preference'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());});
  page.on('response',r=>{if(r.url().startsWith(origin+'/runtime-assets/')&&r.status()>=400)errors.push('Missing runtime asset '+r.status()+': '+r.url());});
  let response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
  if(remote&&response.status()===404)response=(await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:120000}),page.getByText(/^确[认定]访问$/).click()]))[0];
  assert.equal(response.status(),200);
  assert.equal(await page.locator(`script[src="${hosted.javascript}"]`).count(),1,'The tested page must use the current optimized entry');
  const stage=async()=>{const frame=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await frame.locator('body[data-ready="true"]').waitFor();return frame;};
  const settled=frame=>frame.waitForFunction(()=>!document.body.dataset.transition);
  let frame=await stage();await settled(frame);const originalStage=await frame.evaluateHandle(()=>window.__trustStage);
  const start=await frame.getByRole('button',{name:'开始 →',exact:true}).boundingBox();assert(start.y+start.height<=page.viewportSize().height);
  const before=await page.evaluate(()=>localStorage.getItem('technology-dividend:prologue:v1'));
  const mainFonts=await fonts(page,frame,'WorkshopHand');assert.equal(await page.evaluate(()=>localStorage.getItem('technology-dividend:prologue:v1')),before);
  await frame.getByRole('button',{name:'开始 →',exact:true}).click();await frame.locator('body[data-scene="bakery"]').waitFor();await settled(frame);
  await frame.locator('#bakery-skip').click();await frame.locator('body[data-scene="bakery-upgrade"]').waitFor();await settled(frame);
  await frame.locator('#bakery-skip').click();await frame.getByRole('button',{name:'给厨师减少1枚',exact:true}).click();await frame.getByRole('button',{name:'就这样分 →',exact:true}).click();
  await frame.getByRole('button',{name:'若是再买些烤炉呢 →',exact:true}).click();await frame.locator('body[data-scene="bakery-expansion"]').waitFor();await settled(frame);
  await frame.getByRole('button',{name:'看完这一段',exact:true}).click();await frame.locator('#expansion-next').click();await frame.locator('#prologue-battle').waitFor();await settled(frame);
  let battle=await(await frame.locator('#prologue-battle').elementHandle()).contentFrame();await readOpeningGuide(battle);
  const battleFonts=await fonts(page,battle,'Workshop');
  const key='technology-dividend:prologue:v1';await page.waitForFunction(key=>!!JSON.parse(localStorage.getItem(key)).battle,key);
  await battle.locator('[data-move="hold"]').click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).battle.state.world.day===1,key);
  await battle.waitForFunction(()=>!document.querySelector('#restart').disabled);
  const snapshot=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).battle,key);
  await page.screenshot({path:path.join(out,`${width}-battle.png`)});
  for(const f of [page,frame,battle])assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No frame overflows horizontally');
  await frame.getByRole('button',{name:'返回首页',exact:true}).click();await frame.locator('body[data-scene="opening"]').waitFor();await settled(frame);
  assert(await frame.evaluate(stage=>stage===window.__trustStage,originalStage),'Persistent stage survives return home');
  assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).battle,key),snapshot,'Returning home preserves battle');
  for(const id of ['automation','needs','ownership','rules','machine']){
    await frame.locator('#chapter-toggle').click();await frame.locator(`[data-chapter="${id}"]`).click();await frame.locator(`#chapter-list [data-chapter="${id}"][aria-current="page"]`).waitFor({state:'attached'});await settled(frame);
  }
  assert(await frame.locator('#notes').isVisible(),'Appendix explanation remains available');
  await frame.locator('#chapter-toggle').click();await frame.locator('[data-chapter="prologue"]').click();await settled(frame);
  assert(await frame.locator('#notes').isHidden(),'Prologue explanation remains removed');
  await page.reload();frame=await stage();await settled(frame);
  assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).battle,key),snapshot,'Reload preserves the real played round');
  await frame.getByRole('button',{name:'返回首页',exact:true}).click();await frame.locator('body[data-scene="opening"]').waitFor();await settled(frame);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await frame.getByRole('button',{name:'开始 →',exact:true}).click();await frame.waitForFunction(()=>document.body.dataset.transition==='chapter');
  await page.emulateMedia({reducedMotion:'reduce'});await frame.locator('body[data-scene="bakery"]').waitFor();await settled(frame);
  await frame.locator('#chapter-toggle').click();await frame.locator('[data-chapter="automation"]').click();
  await frame.locator('#chapter-toggle').click();await frame.locator('[data-chapter="needs"]').click();
  await frame.locator('#chapter-list [data-chapter="needs"][aria-current="page"]').waitFor({state:'attached'});await settled(frame);
  assert.equal(await frame.locator('body').getAttribute('data-scene'),'needs-technology');
  results.push({width,firstAct:true,battleFirstTurn:true,homeAndChapters:true,reload:true,motionToggleDuringTransition:true,rapidChapterNavigation:true,noStateInjection:true,noOverflow:true,mainFonts,battleFonts,rareSampleCodepoint:rare});
  console.log('PASS hosted flow + complete-font specimen: '+width);await context.close();
 }
 assert.deepEqual(errors,[]);
 const standalone=await fs.readFile(path.join(root,'offline/技术红利去了哪里.html'),'utf8');
 const full=Buffer.from(standalone.match(/data:font\/woff2;base64,([A-Za-z0-9+/=]+)/)[1],'base64');
 assert.equal(createHash('sha256').update(full).digest('hex'),fontSet.source_sha256,'The offline font remains complete and unchanged');
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({date:'2026-10-17',entry:remote?'CloudBase':'local hosted files',indexSha256:hosted.index_sha256,javascript:hosted.javascript,sourceFontSha256:fontSet.source_sha256,completeFontMappings:fontSet.covered_codepoints,results,errors},null,2)+'\n');
}finally{await browser.close();await server?.close();}
