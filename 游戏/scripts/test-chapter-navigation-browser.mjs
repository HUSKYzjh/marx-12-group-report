/** Actual menu clicks in fresh desktop/mobile contexts, without injected game state. */
import assert from 'node:assert/strict';
import {beginAutomation} from './automation-browser-gestures.mjs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {STORY_CHAPTERS,PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {MACHINE_STORAGE_KEY} from '../lib/machine-experiment.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile(path.join(root,'build/index.html'));
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
const errors=[],results=[],scenes={prologue:'bakery',machine:'machine',automation:'technology',needs:'needs-technology',ownership:'ownership-technology',rules:'market-rules'};
const chapter=id=>STORY_CHAPTERS.find(c=>c.id===id);
async function frame(page){const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor();return f;}
async function settled(f,scene){await f.locator('body[data-scene="'+scene+'"]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);}
async function jump(page,f,chapter){
  await f.locator('#chapter-toggle').click();const button=f.locator('[data-chapter="'+chapter.id+'"]');
  assert(await button.isEnabled());await button.click();await settled(f,scenes[chapter.id]);
  assert.equal(await f.locator('#chapter').innerText(),chapter.title);assert.equal(await f.locator('#chapter-menu').getAttribute('open'),null);
  assert.equal(await button.getAttribute('aria-current'),'page');
  assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const s=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROLOGUE_STORAGE_KEY);
  assert.deepEqual(s.reliefCompleted,[]);assert.equal(s.epilogueBeat,0);assert.equal(s.prologueStatus,'notStarted');
}
try{
  for(const width of [1280,390]){
    const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<600});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);let f=await frame(page);await settled(f,'opening');
    // Each implemented chapter must be reachable without playing the prologue first.
    await f.locator('#chapter-toggle').click();
    assert.deepEqual(await f.locator('#chapter-list [data-chapter]').allTextContents(),STORY_CHAPTERS.map(c=>c.title));
    assert.equal(await f.locator('#chapter-list li:last-child').getAttribute('class'),'chapter-appendix');
    await f.locator('#chapter-toggle').click();
    const order=[...STORY_CHAPTERS,...STORY_CHAPTERS.slice().reverse()];
    for(const chapter of order){await jump(page,f,chapter);await page.reload();f=await frame(page);await settled(f,scenes[chapter.id]);assert.equal(await f.locator('#chapter').innerText(),chapter.title);}
    await jump(page,f,chapter('automation'));await beginAutomation(f);
    await f.getByRole('button',{name:'按这个安排，做一周 →',exact:true}).click();await f.locator('[data-testid="technology-result"]').waitFor();
    const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).technology,PROLOGUE_STORAGE_KEY);
    await jump(page,f,chapter('machine'));
    await f.getByRole('button',{name:'去工厂 →',exact:true}).click();
    for(const answer of ['会更多','会跟着涨','能早些走'])await f.getByRole('button',{name:answer,exact:true}).click();
    await f.getByRole('button',{name:'换上新机器 →',exact:true}).click();
    await f.getByRole('button',{name:'试试别的约定 →',exact:true}).waitFor();
    const appendixBefore=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),MACHINE_STORAGE_KEY);
    await jump(page,f,chapter('rules'));await jump(page,f,chapter('automation'));
    assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).technology,PROLOGUE_STORAGE_KEY),before);
    await jump(page,f,chapter('machine'));await page.reload();f=await frame(page);await settled(f,'machine');
    assert.equal(await f.locator('#chapter').innerText(),chapter('machine').title);
    // Result's continuation intentionally appears after the production animation.
    await f.getByRole('button',{name:'试试别的约定 →',exact:true}).waitFor({state:'visible'});
    assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),MACHINE_STORAGE_KEY),appendixBefore);
    await jump(page,f,chapter('automation'));
    await f.locator('#previous-stage').click();await settled(f,'assumptions');await page.reload();f=await frame(page);await settled(f,'assumptions');
    assert(await f.locator('#dots button[data-stage="5"]').isDisabled());
    await f.locator('#dots button[data-stage="0"]').click();await settled(f,'opening');
    assert(await f.locator('#dots button[data-stage="6"]').isDisabled());
    results.push({width,mainChapterOrder:STORY_CHAPTERS.slice(0,5).map(c=>c.id),appendix:'machine',refresh:true,experimentProgressPreserved:true,appendixTrialPreserved:true,storyNotFalselyCompleted:true});console.log('Chapter navigation passed: '+width+'px');await context.close();
  }
  assert.deepEqual(errors,[]);const out=path.join(root,'outputs/chapter-navigation');await fs.mkdir(out,{recursive:true});
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify({checkedAt:new Date().toISOString(),buildSHA256:createHash('sha256').update(bytes).digest('hex'),results,errors},null,2)+'\n');
}finally{await browser.close();await new Promise(r=>server.close(r));}
