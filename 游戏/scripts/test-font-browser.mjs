/** Actual embedded stage fonts; CDP reports glyph providers, not just CSS names.
 * A read-only diagnostic specimen compares old/new fonts without injecting game state.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {chooseCondition} from './assumption-browser-gestures.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes=await fs.readFile('build/index.html'),out='outputs/font-qa';await fs.mkdir(out,{recursive:true});
const old=await fs.readFile('tmp/font-download/workshop-hand-before.woff2');
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/`,offline=pathToFileURL(path.resolve('offline/技术红利去了哪里.html')).href;
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions()),results=[],errors=[],external=[];
const sample='皱眉、鼓腮：饥馑的盛宴。照护、凭证、排班、资料迁移。';
function findNode(n,id){if(n.attributes?.some((a,i)=>a==='id'&&n.attributes[i+1]===id))return n;for(const c of [...(n.children??[]),...(n.shadowRoots??[]),...(n.contentDocument?[n.contentDocument]:[])]){const found=findNode(c,id);if(found)return found;}}
try{for(const width of [1280,390,320]){
 const context=await browser.newContext({viewport:{width,height:width===320?568:900},hasTouch:width===390,reducedMotion:'reduce'});await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||width===320&&u===offline)return r.continue();external.push(u);return r.abort();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(width===320?offline:url,{timeout:90000});
 const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready="true"]').waitFor({timeout:90000});
 await f.locator('#chapter-toggle').click();await f.locator('[data-chapter="needs"]').click();await f.getByRole('button',{name:'回到假设目录 ↩',exact:true}).click();await chooseCondition(f,'needs');await f.locator('[data-branch="services"]').click();await f.getByRole('button',{name:'安排这一期 →',exact:true}).click();await f.locator('.care-routing').waitFor();
 await f.evaluate(async sample=>{await document.fonts.load('20px WorkshopHand',sample);await document.fonts.ready;},sample);
 const saved=await page.evaluate(key=>localStorage.getItem(key),PROLOGUE_STORAGE_KEY);
 await f.evaluate(async({sample,old})=>{
  const face=new FontFace('PreviousWorkshop',`url(data:font/woff2;base64,${old})`);document.fonts.add(await face.load());
  const box=document.createElement('section');box.id='font-diagnostic';box.style.cssText='max-width:700px;margin:20px auto;padding:16px;border:1px dashed #aaa;background:white;color:#333';
  for(const [id,label,font]of [['font-test-old','早期精简字库（缺字对照）','PreviousWorkshop'],['font-test-new','文楷屏幕阅读版 · 完整字库','WorkshopHand']]){
   const title=document.createElement('p');title.textContent=label;title.style.cssText='font:16px sans-serif;margin:16px 0 8px';box.append(title);
   const p=document.createElement('p');p.id=id;p.textContent=sample;p.style.cssText=`font:24px/1.8 ${font},'Microsoft YaHei',sans-serif;margin:0`;box.append(p);
  }
  document.querySelector('main').prepend(box);
 },{sample,old:old.toString('base64')});
 const cdp=await context.newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const {root}=await cdp.send('DOM.getDocument',{depth:-1,pierce:true});
 const glyphs=async id=>{const n=findNode(root,id);assert(n,'missing diagnostic '+id);return(await cdp.send('CSS.getPlatformFontsForNode',{nodeId:n.nodeId})).fonts;};
 const oldFonts=await glyphs('font-test-old'),newFonts=await glyphs('font-test-new');
 assert(oldFonts.some(font=>!font.isCustomFont),'the old specimen must reproduce actual system-font fallback');
 assert(newFonts.length>0&&newFonts.every(font=>font.isCustomFont),'every new specimen glyph must use the bundled font: '+JSON.stringify(newFonts));
 assert(newFonts.reduce((n,font)=>n+font.glyphCount,0)>=sample.length);
 assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await page.evaluate(key=>localStorage.getItem(key),PROLOGUE_STORAGE_KEY),saved,'font inspection is not an economic action');
 await page.screenshot({path:`${out}/${width}-comparison.png`,fullPage:true});
 await f.evaluate(()=>document.getElementById('font-diagnostic').remove());await page.screenshot({path:`${out}/${width}-care.png`,fullPage:true});
 await cdp.detach();results.push({width,offline:width===320,oldFonts,newFonts,noMissingSpecimenGlyphs:true,noHorizontalOverflow:true,inspectionDoesNotChangeSave:true});console.log('Font glyph providers checked: '+width);await context.close();
}
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(bytes.equals(await fs.readFile('build/index.html'))&&bytes.equals(await fs.readFile('offline/技术红利去了哪里.html')));
 await fs.writeFile(out+'/report.json',JSON.stringify({checkedAt:new Date().toISOString(),buildSHA256:createHash('sha256').update(bytes).digest('hex'),results,errors,external},null,2));
}catch(e){for(const ctx of browser.contexts())for(const p of ctx.pages())await p.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}
