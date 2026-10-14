import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {preservationAccount} from '../lib/preservation-workbench.ts';
export async function workbenchState(page){
 // Clicking the frame posts an action to the host. Saving follows the host
 // reducer; a visible intro button is not proof that this save has completed.
 await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||'null')?.marketRules?.branch==='prices'&&!!JSON.parse(localStorage.getItem(key)||'null')?.marketRules?.workbench,PROLOGUE_STORAGE_KEY);
 return page.evaluate(key=>JSON.parse(localStorage.getItem(key)).marketRules.workbench,PROLOGUE_STORAGE_KEY);
}
export async function openWorkbench(page,f){
 const workspace=f.locator('.preservation-workspace');if(await workspace.getAttribute('open')!==null)return;
 const before=await workbenchState(page);await workspace.locator(':scope > summary').click();await f.locator('.preservation-workspace[open]').waitFor();
 if(JSON.stringify(await workbenchState(page))!==JSON.stringify(before))throw Error('Opening preservation workspace changed production or cash');
}
async function settled(page,f,before){await page.waitForFunction(({key,r})=>JSON.parse(localStorage.getItem(key)).marketRules.workbench.revision>r,{key:PROLOGUE_STORAGE_KEY,r:before.revision});const s=await workbenchState(page);if(s.phase==='lab')await f.locator('[data-testid="preservation-board"][data-revision="'+s.revision+'"]').waitFor();return s;}
export async function moveWorkbench(page,f,id,to,method='keyboard'){
 await openWorkbench(page,f);
 const before=await workbenchState(page),from=f.locator('[data-preservation-piece="'+id+'"]'),dest=f.locator('[data-preservation-target="'+to+'"] > .preservation-destination');
 if(method==='keyboard'){await from.focus();await page.keyboard.press('Enter');await dest.focus();await page.keyboard.press('Enter');}
 else{
  await from.scrollIntoViewIfNeeded();await dest.scrollIntoViewIfNeeded();const a=await from.boundingBox(),b=await dest.boundingBox(),x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
  if(method==='touch'){const session=await page.context().newCDPSession(page);if(y<0||y>page.viewportSize().height){await from.scrollIntoViewIfNeeded();const p=await from.boundingBox();await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x+p.width/2,y:p.y+p.height/2}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await dest.scrollIntoViewIfNeeded();const q=await dest.boundingBox();await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:q.x+q.width/2,y:q.y+q.height/2}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=10;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/10,y:y+(ty-y)*i/10}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}await session.detach();}
  else if(y<0||y>page.viewportSize().height){await from.scrollIntoViewIfNeeded();await from.click();await dest.scrollIntoViewIfNeeded();await dest.click();}
  else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:12});await page.mouse.up();}
 }
 try{return await settled(page,f,before);}catch(e){throw new Error('Workbench gesture failed '+id+' → '+to+' ('+method+') '+await f.locator('.preservation-hint').innerText(),{cause:e});}
}
export async function workbenchButton(page,f,name){const s=await workbenchState(page),b=f.getByRole('button',{name,exact:true});if(name==='同样的钱，换个安排 ↺'&&!await b.isVisible()){await f.locator('[data-preservation-book]>summary').click();if(JSON.stringify(await workbenchState(page))!==JSON.stringify(s))throw Error('Opening the reset drawer executed production');}await b.click();return settled(page,f,s);}
export async function arrangeWorkbench(page,f,config,method='keyboard'){
 let s=await workbenchState(page);if(s.draft.price!==config.price)await moveWorkbench(page,f,'price:'+config.price,'counter',method);
 for(const tool of ['efficient','cold']){s=await workbenchState(page);if(s.draft[tool]!==config[tool])await moveWorkbench(page,f,'tool:'+tool,(config[tool]?'socket:':'unplug:')+tool,method);}
 s=await workbenchState(page);if(s.flexibleBake&&s.day===2&&s.draft.bake!==(config.bake!==false))await moveWorkbench(page,f,'bake','oven:'+(config.bake===false?'off':'hot'),method);
}
export async function workbenchTrial(page,f,first,second=first,method='keyboard'){
 await arrangeWorkbench(page,f,first,method);await workbenchButton(page,f,'按今天的安排营业 →');await workbenchButton(page,f,'关灯，过一晚 →');await arrangeWorkbench(page,f,second,method);await workbenchButton(page,f,'按今天的安排营业 →');return preservationAccount(await workbenchState(page));
}
