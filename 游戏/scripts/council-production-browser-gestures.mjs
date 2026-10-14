import assert from 'node:assert/strict';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {councilState} from './sharing-council-browser-gestures.mjs';
export async function beginProduction(page,f){const s=await councilState(page);await f.getByRole('button',{name:s.production?'继续刚才的排班 →':'带着这个决定，开下一班 →',exact:true}).click();await f.getByTestId('council-production').waitFor();return councilState(page);}
export async function moveProduction(page,f,person,job,method='keyboard'){
 await openProductionWorkspace(page,f);
 const before=await councilState(page);if(before.production.jobs[person]===job)return before;
 const source=f.locator('[data-testid="council-production"] [data-council-piece="person:'+person+'"]'),target=f.locator('[data-production-target="'+job+'"] > .production-destination');
 if(method==='keyboard'){await source.focus();await page.keyboard.press('Enter');await target.focus();await page.keyboard.press('Enter');}
 else if(method==='tap'){await source.click();await target.click();}
 else{await source.scrollIntoViewIfNeeded();await target.scrollIntoViewIfNeeded();const a=await source.boundingBox(),b=await target.boundingBox();assert(a&&b);const x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
  const fits=y>=0&&y<page.viewportSize().height&&ty>=0&&ty<page.viewportSize().height;
  if(method==='touch'){const session=await page.context().newCDPSession(page);
   if(!fits){await source.scrollIntoViewIfNeeded();const p=await source.boundingBox();await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x+p.width/2,y:p.y+p.height/2}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await target.scrollIntoViewIfNeeded();const q=await target.boundingBox();await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:q.x+q.width/2,y:q.y+q.height/2}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else{await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=12;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/12,y:y+(ty-y)*i/12}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}await session.detach();}
  else if(!fits){await source.scrollIntoViewIfNeeded();await source.click();await target.scrollIntoViewIfNeeded();await target.click();}
  else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:12});await page.mouse.up();}
 }
 await page.waitForFunction(({key,person,job})=>JSON.parse(localStorage.getItem(key)).ownershipTechnology.council.production.jobs[person]===job,{key:PROLOGUE_STORAGE_KEY,person,job});await f.locator('[data-production-target="'+job+'"] [data-council-piece="person:'+person+'"]').waitFor();return councilState(page);
}
export async function openProductionWorkspace(page,f){const n=f.locator('.production-workspace');if(await n.getAttribute('open')!==null)return;const before=await councilState(page);await n.locator(':scope > summary').click();await f.locator('.production-workspace[open]').waitFor();assert.deepEqual(await councilState(page),before,'opening executed schedule is view-only');}
export async function productionRun(page,f){const s=await councilState(page),shift=s.production.history.length;await f.getByTestId('production-run').click();await page.waitForFunction(({key,shift})=>JSON.parse(localStorage.getItem(key)).ownershipTechnology.council.production.history.length===shift+1,{key:PROLOGUE_STORAGE_KEY,shift});await f.locator('[data-testid="council-production"][data-shift="'+(shift+1)+'"]').waitFor();return councilState(page);}
export async function productionFinish(page,f){while((await councilState(page)).production.history.length<3)await productionRun(page,f);return councilState(page);}
export async function productionBack(page,f){await f.getByRole('button',{name:'回看刚才的分配与表决 ↩',exact:true}).click();await f.locator('[data-testid="council-board"][data-step="result"]').waitFor();return councilState(page);}
