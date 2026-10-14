import assert from 'node:assert/strict';
import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
export const pressureState=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).technology.pressure,PROLOGUE_STORAGE_KEY);
export async function pressureReady(f){await f.getByTestId('competitive-pressure').waitFor();await f.waitForFunction(()=>!document.querySelector('.competitive-pressure')?.dataset.moving&&!document.body.dataset.transition);}
export async function assertPressureFeedback(page,f){
 const s=await pressureState(page),r=s.world.history.at(-1);if(!r)return;
 const trace=await f.locator('.pressure-trace').innerText();assert(trace.includes('有货却买不起 '+r.shortOfMoney+'人'),'feedback must match the current purchase receipts');
 if(r.support){const message=await f.locator('.pressure-consequence>p').innerText();assert(message.includes(r.support.paid.length?'保障发给了'+r.support.paid.length+'人':'没有发出保障'));assert(!message.includes('工资省下了'));}
}
export async function pressureRun(page,f){const s=await pressureState(page);await f.getByTestId('pressure-run').click();await page.waitForFunction(({key,revision})=>JSON.parse(localStorage.getItem(key)).technology.pressure.revision>revision,{key:PROLOGUE_STORAGE_KEY,revision:s.revision});await f.locator('.competitive-pressure[data-revision="'+(s.revision+1)+'"]').waitFor();await pressureReady(f);await assertPressureFeedback(page,f);}
export async function pressureMove(page,f,id,to,method='tap'){
 await pressureReady(f);const before=await pressureState(page),source=f.locator('[data-pressure-piece="'+id+'"]'),region=f.locator('[data-pressure-target="'+to+'"]'),destination=to.startsWith('wallet:')?region.locator('.pressure-wallet'):region;
 if(id==='price'||id==='follow'){
  await source.scrollIntoViewIfNeeded();
  if(method==='keyboard'){await source.focus();await page.keyboard.press('Enter');}
  else if(method==='touch'){const a=await source.boundingBox(),session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x+a.width/2,y:a.y+a.height/2}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}
  else await source.click();
  await page.waitForFunction(({key,revision})=>JSON.parse(localStorage.getItem(key)).technology.pressure.revision>revision,{key:PROLOGUE_STORAGE_KEY,revision:before.revision});await pressureReady(f);return;
 }
 if(method==='keyboard'){await source.focus();await page.keyboard.press('Enter');await destination.focus();await page.keyboard.press('Enter');}
 else if(method==='tap'){await source.click();await destination.click();}
 else{
  await source.scrollIntoViewIfNeeded();await destination.scrollIntoViewIfNeeded();const a=await source.boundingBox(),b=await destination.boundingBox();assert(a&&b);const x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
  assert(y>=0&&y<page.viewportSize().height&&ty>=0&&ty<page.viewportSize().height,'source and target must both be in the real viewport');
  if(method==='touch'){const session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=12;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/12,y:y+(ty-y)*i/12}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}
  else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:12});await page.mouse.up();}
 }
 await page.waitForFunction(({key,revision})=>JSON.parse(localStorage.getItem(key)).technology.pressure.revision>revision,{key:PROLOGUE_STORAGE_KEY,revision:before.revision});await f.locator('.competitive-pressure[data-revision="'+(before.revision+1)+'"]').waitFor();await pressureReady(f);
}
