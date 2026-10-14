import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createDuelServer} from './serve-market-duel.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const server=createDuelServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
try{
 const page=await browser.newPage({viewport:{width:1100,height:680}});
 await page.goto(`http://127.0.0.1:${server.address().port}/assets/market-duel/battle.html`);
 await page.locator('.owner').first().waitFor();
 // Isolated asset contact sheet, not a gameplay or economic-state test.
 await page.evaluate(async()=>{
  const {OWNER_ATLASES,ownerMarkup}=await import('./owner-art.mjs'),atlas={};
  for(const name of [...OWNER_ATLASES,'trust'])atlas[name]=await (await fetch(name==='trust'?'../trust/iterated_peep.json':`../wbwwb-source/${name}.json`)).json();
  document.body.innerHTML='<h1 style="text-align:center">老板表情 · 原尺寸与放大检查</h1><div id="sheet" style="display:grid;grid-template-columns:repeat(5,1fr);gap:25px;padding:30px"></div>';
  for(const id of [0,1])for(const mood of ['neutral','gain','winning','loss','losing']){
   const box=document.createElement('div');box.style='text-align:center';
   box.innerHTML=ownerMarkup(atlas,id,{mood,streak:2,balance:0,label:mood})+`<p>${id?'隔壁':'自家'} · ${mood}</p>`;
   box.querySelector('.owner').style='display:inline-block;width:125px;height:200px';document.querySelector('#sheet').append(box);
  }
 });
 await page.evaluate(()=>Promise.all([...document.querySelectorAll('svg image')].map(n=>new Promise(resolve=>{const im=new Image();im.onload=im.onerror=resolve;im.src=n.getAttribute('href');}))));
 await fs.mkdir('outputs/shop-course-qa',{recursive:true});await page.screenshot({path:'outputs/shop-course-qa/owner-expressions.png',fullPage:true});
}finally{await browser.close();await new Promise(r=>server.close(r));}
