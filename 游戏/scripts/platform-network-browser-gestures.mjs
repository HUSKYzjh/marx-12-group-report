import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import assert from 'node:assert/strict';
export const networkState=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).ownershipTechnology.network,PROLOGUE_STORAGE_KEY);
export async function openNetworkWorkspace(page,f){
 const workspace=f.locator('.network-workspace');if(await workspace.getAttribute('open')!==null)return;
 const before=await networkState(page);await workspace.locator(':scope > summary').click();await f.locator('.network-workspace[open]').waitFor();
 if(JSON.stringify(await networkState(page))!==JSON.stringify(before))throw new Error('Opening the network changed routes or accounts');
}
export async function moveNetwork(page,f,id,to,method='keyboard'){
 await openNetworkWorkspace(page,f);
 const from=f.locator('[data-network-piece="'+id+'"]'),dest=f.locator('[data-network-target="'+to+'"] > .network-destination');
 if(method==='keyboard'){await from.focus();await page.keyboard.press('Enter');await dest.focus();await page.keyboard.press('Enter');}
 else{
  await from.scrollIntoViewIfNeeded();await dest.scrollIntoViewIfNeeded();const a=await from.boundingBox(),b=await dest.boundingBox(),x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
  if(method==='touch'){const session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=10;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/10,y:y+(ty-y)*i/10}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}
  else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:12});await page.mouse.up();}
 }
 try{await page.waitForFunction(({key,id,to})=>{const s=JSON.parse(localStorage.getItem(key)).ownershipTechnology.network;return id.startsWith('rule:')?s.rule===id.slice(5):s.routes[Number(id.slice(5))]===(to==='unplug'?null:to);},{key:PROLOGUE_STORAGE_KEY,id,to});}catch(e){await page.screenshot({path:'outputs/platform-network-qa/failed-gesture.png',fullPage:true});console.error({id,to,method,from:await from.boundingBox(),dest:await dest.boundingBox(),state:await networkState(page),hint:await f.locator('.network-hint').innerText()});throw e;}
 if(id.startsWith('shop:'))await f.locator('[data-network-target="'+to+'"] [data-network-piece="'+id+'"]').waitFor();else await f.getByRole('button',{name:'本次条件：'+{locked:'资料锁定',portable:'资料可搬',joint:'成员共有平台'}[id.slice(5)],exact:true}).waitFor();
}
export async function runNetwork(page,f){
 const s=await networkState(page);await f.getByRole('button',{name:s.history.length===0?'先营业一期 →':'按连线，再营业 →',exact:true}).click();await f.locator('[data-testid="network-board"][data-round="'+(s.history.length+1)+'"]').waitFor();await page.waitForFunction(({key,revision})=>JSON.parse(localStorage.getItem(key)).ownershipTechnology.network.revision>revision,{key:PROLOGUE_STORAGE_KEY,revision:s.revision});return networkState(page);
}
export async function moveNetworkNext(page,f,id,to,method='keyboard',motionShot=null){
 const desk=f.locator('.network-next');await desk.waitFor({state:'visible'});
 if(id.startsWith('rule:')&&await desk.locator('.network-next-rules').getAttribute('open')===null)await desk.locator('.network-next-rules > summary').click();
 const before=await networkState(page),from=desk.locator('[data-network-next-piece="'+id+'"]'),dest=desk.locator('[data-network-next-target="'+to+'"] > .network-destination');
 if(method==='keyboard'){await from.focus();await page.keyboard.press('Enter');assert.deepEqual(await networkState(page),before);await dest.focus();await page.keyboard.press('Enter');}
 else{
  await from.scrollIntoViewIfNeeded();await dest.scrollIntoViewIfNeeded();const a=await from.boundingBox(),b=await dest.boundingBox(),x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
  assert(x>=0&&y>=0&&tx>=0&&ty>=0&&y<page.viewportSize().height&&ty<page.viewportSize().height,'both ends of the actual gesture fit the viewport');
  let touch;if(method==='touch'){touch=await page.context().newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});}else{await page.mouse.move(x,y);await page.mouse.down();}
  for(let i=1;i<=10;i++){const point={x:x+(tx-x)*i/10,y:y+(ty-y)*i/10};if(touch)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point]});else await page.mouse.move(point.x,point.y);}
  assert.deepEqual(await networkState(page),before,'pickup and next-cable motion never pay or mutate the proposal');
  assert.equal(await f.locator('[data-network-next-piece="'+id+'"]').count(),1,'the drag ghost is not a second real piece');
  if(id.startsWith('shop:'))assert(await desk.locator('.network-wires path[data-pulling]').evaluate(p=>{const q=p.getPointAtLength(p.getTotalLength()),screen=new DOMPoint(q.x,q.y).matrixTransform(p.getScreenCTM()),ghost=document.querySelector('.network-next-ghost');return Math.abs(screen.x-parseFloat(ghost.style.left))<2&&Math.abs(screen.y-parseFloat(ghost.style.top))<2;}),'the proposed cable tip follows the actual pointer');
  if(motionShot)await page.screenshot({path:motionShot,fullPage:true});
  if(touch){await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();}else await page.mouse.up();
 }
 await page.waitForFunction(({key,id,to})=>{const s=JSON.parse(localStorage.getItem(key)).ownershipTechnology.network,d=s.proposal??s;return id.startsWith('rule:')?d.rule===id.slice(5):d.routes[Number(id.slice(5))]===(to==='unplug'?null:to);},{key:PROLOGUE_STORAGE_KEY,id,to});
 const after=await networkState(page);for(const field of ['rule','fee','routes','history','trials'])assert.deepEqual(after[field],before[field],'prospective manipulation does not rewrite '+field);
 assert.equal(await f.locator('.network-next-ghost,[data-pulling]').count(),0);return after;
}
export async function compareNetworkNext(page,f){
 const before=await networkState(page);assert(before.proposal);await f.locator('[data-network-compare]').click();
 await page.waitForFunction(({key,revision})=>{const s=JSON.parse(localStorage.getItem(key)).ownershipTechnology.network;return s.revision>revision&&!s.proposal;},{key:PROLOGUE_STORAGE_KEY,revision:before.revision});
 const s=await networkState(page);assert.equal(s.history.length,2);assert.deepEqual(s.routes,before.proposal.routes);assert.equal(s.rule,before.proposal.rule);assert.equal(s.fee,before.proposal.fee);return s;
}
