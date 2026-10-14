import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createDuelServer} from './serve-market-duel.mjs';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const server=createDuelServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
try{
 const page=await browser.newPage({viewport:{width:1200,height:650}});
 await page.goto(`http://127.0.0.1:${server.address().port}/assets/market-duel/battle.html`);await page.locator('.owner').first().waitFor();
 // Asset QA only: enlarged contact sheet, not fabricated gameplay results.
 await page.evaluate(async()=>{
  const {customerMarkup}=await import('./customer-art.mjs'),atlas={};
  for(const n of ['body','face','face_nervous','hatguy','trust'])atlas[n]=await (await fetch(n==='trust'?'../trust/iterated_peep.json':`../wbwwb-source/${n}.json`)).json();
  document.body.innerHTML='<h1 style="text-align:center">同一条街 · 顾客服饰</h1><div id="sheet" style="display:grid;grid-template-columns:repeat(11,1fr);gap:5px;padding:20px"></div>';
  for(const working of [true,false])for(let id=0;id<11;id++){
   const box=document.createElement('div');box.style='text-align:center';
   box.innerHTML=customerMarkup(atlas,id,{working:working&&id<8,worried:!working})+`<p>${id<4?'自家员工':id<8?'邻店员工':id===8?'自家老板':id===9?'邻店老板':'原料商'}<br>${id<8&&!working?'待业':working?'购物':'没买成'}</p>`;
   box.querySelector('.street-person').style='width:85px;height:150px';document.querySelector('#sheet').append(box);
  }
 });
 await page.evaluate(()=>Promise.all([...document.querySelectorAll('svg image')].map(n=>new Promise(resolve=>{const im=new Image();im.onload=im.onerror=resolve;im.src=n.getAttribute('href');}))));
 await fs.mkdir('outputs/shop-course-qa',{recursive:true});await page.screenshot({path:'outputs/shop-course-qa/customer-clothes.png',fullPage:true});
}finally{await browser.close();await new Promise(r=>server.close(r));}
