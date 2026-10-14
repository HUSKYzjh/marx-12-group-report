import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
export const careState=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).needsTechnology.care,PROLOGUE_STORAGE_KEY);
export async function openCareWorkspace(page,f){
 const workspace=f.locator('.care-adjustments');
 if(await workspace.getAttribute('open')===null){
  const before=await careState(page);await workspace.locator(':scope > summary').click();
  await f.locator('.care-adjustments[open]').waitFor();
  if(JSON.stringify(await careState(page))!==JSON.stringify(before))throw new Error('Opening the care workspace changed the accounts');
 }
}
export async function openCareEquipment(page,f){
 await openCareWorkspace(page,f);
 const drawer=f.locator('.care-equipment-drawer');
 if(await drawer.getAttribute('open')===null){
  const before=await careState(page);await drawer.locator(':scope > summary').click();
  await f.locator('.care-equipment-drawer[open]').waitFor();
  if(JSON.stringify(await careState(page))!==JSON.stringify(before))throw new Error('Opening care equipment changed the draft or accounts');
 }
}
export async function moveCare(page,f,id,to,method='keyboard'){
 await openCareWorkspace(page,f);
 if(id==='tool'||id.startsWith('worker:')||id.startsWith('training:'))await openCareEquipment(page,f);
 if(id.startsWith('voucher:')){
  const singles=f.locator('.care-single-vouchers');
  if(await singles.locator('[data-care-piece="'+id+'"]').count()&&await singles.getAttribute('open')===null){await singles.locator(':scope > summary').click();await f.locator('.care-single-vouchers[open]').waitFor();}
 }
 const prior=await careState(page),queuePosition=id.startsWith('visitor:')?(prior.queue||Array.from({length:12},(_,i)=>i)).indexOf(Number(to.split(':')[1])):null;
 const from=f.locator('[data-care-piece="'+id+'"]'),dest=f.locator('[data-care-target="'+to+'"] > '+(to.startsWith('worker:')?'.care-qualification':to.startsWith('slot:')?'.care-position-button':to.startsWith('person:')?'.care-patient-button':'.care-destination'));
 if(method==='keyboard'){await from.focus();await page.keyboard.press('Enter');await dest.focus();await page.keyboard.press('Enter');}
 else{
  await from.scrollIntoViewIfNeeded();await dest.scrollIntoViewIfNeeded();const a=await from.boundingBox(),b=await dest.boundingBox();const x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
  if(method==='touch'){
   const session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=10;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/10,y:y+(ty-y)*i/10}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
  }else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:12});await page.mouse.up();}
 }
 await page.waitForFunction(({key,id,to,queuePosition})=>{
  const s=JSON.parse(localStorage.getItem(key)).needsTechnology.care,n=Number(id.split(':')[1]);if(id==='tool')return s.tool===(to==='socket');if(id.startsWith('visitor:'))return s.queue.indexOf(n)===queuePosition;if(id.startsWith('worker:'))return to==='bench'?!s.slots.includes(n):s.slots[Number(to.split(':')[1])]===n;if(id.startsWith('training:'))return s.training[n]===(to==='resources'?null:Number(to.split(':')[1]));return s.vouchers[n]===(to==='funding'?null:Number(to.split(':')[1]));
 },{key:PROLOGUE_STORAGE_KEY,id,to,queuePosition});
 // Wait for the authoritative host message to become visible as well as saved.
 if(id.startsWith('visitor:'))await f.locator('[data-queue-position="'+queuePosition+'"] [data-care-piece="'+id+'"]').waitFor();else await f.locator('[data-care-target="'+to+'"] [data-care-piece="'+id+'"]').waitFor();
}
export async function runCare(page,f){
 const before=await careState(page);await f.getByRole('button',{name:'照这样，服务一期 →',exact:true}).click();await f.locator('[data-testid="care-routing-result"][data-stale="false"]').waitFor();await page.waitForFunction(({key,revision})=>JSON.parse(localStorage.getItem(key)).needsTechnology.care.revision>revision,{key:PROLOGUE_STORAGE_KEY,revision:before.revision});await f.locator('.care-adjustments:not([open])').waitFor();return careState(page);
}
export async function coverCare(page,f,method='keyboard',ids=Array.from({length:12},(_,i)=>i)){
 for(const i of ids){const s=await careState(page);if(!s.vouchers.includes(i)){const vi=s.vouchers.indexOf(null);await moveCare(page,f,'voucher:'+vi,'person:'+i,method);}}
}
/** The accessible equivalent of one brush stroke; no reducer/save injection. */
export async function coverCareBatch(page,f,ids=Array.from({length:12},(_,i)=>i)){
 await openCareWorkspace(page,f);const prior=await careState(page),people=ids.filter(id=>!prior.vouchers.includes(id));if(!people.length)return;
 await f.locator('.care-payment-brush').focus();await page.keyboard.press('Enter');
 for(const id of people){await f.locator('[data-person="'+id+'"] .care-patient-button').focus();await page.keyboard.press('Enter');}
 if(JSON.stringify(await careState(page))!==JSON.stringify(prior))throw new Error('Coverage preview changed the draft or accounts');
 await f.getByRole('button',{name:'就帮这些人 →',exact:true}).focus();await page.keyboard.press('Enter');
 await f.waitForFunction(revision=>Number(document.querySelector('.care-routing').dataset.revision)===revision+1,prior.revision);
 const next=await careState(page);if(people.some(id=>!next.vouchers.includes(id)))throw new Error('Committed coverage is missing a selected person');
}
export async function trainCare(page,f,method='keyboard'){
 for(const i of [2,3]){const s=await careState(page);if(!s.training.includes(i))await moveCare(page,f,'training:'+s.training.indexOf(null),'worker:'+i,method);if(!s.slots.includes(i))await moveCare(page,f,'worker:'+i,'slot:'+s.slots.indexOf(null),method);}
}
