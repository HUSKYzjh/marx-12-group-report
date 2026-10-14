import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import assert from 'node:assert/strict';
import {councilTrialAccount} from '../lib/sharing-council.ts';
import {councilExploration} from '../lib/council-exploration.ts';
export const councilState=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).ownershipTechnology.council,PROLOGUE_STORAGE_KEY);
export async function moveCouncil(page,f,id,to,method='keyboard'){
 if(id.startsWith('mode:')){const before=await councilState(page),folder=f.locator('.council-charter-folder');if(await folder.getAttribute('open')===null)await folder.locator('summary').click();assert.deepEqual(await councilState(page),before,'opening the paper folder is not a financial action');
  const source=f.locator('[data-council-piece="'+id+'"]'),destination=f.locator('[data-council-target="'+to+'"] > .council-destination'),layoutY=()=>destination.evaluate(n=>n.getBoundingClientRect().top+n.ownerDocument.defaultView.scrollY),beforeY=await layoutY();await source.focus();await page.keyboard.press('Enter');assert(Math.abs(beforeY-await layoutY())<1,'picking up a charter must not move its destination in the document');await page.keyboard.press('Escape');assert.deepEqual(await councilState(page),before,'pickup and cancellation do not replace the charter');
 }
 const from=f.locator('[data-council-piece="'+id+'"]'),dest=f.locator('[data-council-target="'+to+'"] > .council-destination');
 if(method==='keyboard'){await from.focus();await page.keyboard.press('Enter');await dest.focus();await page.keyboard.press('Enter');}
 else{await from.scrollIntoViewIfNeeded();await dest.scrollIntoViewIfNeeded();const a=await from.boundingBox(),b=await dest.boundingBox(),x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
  const fits=y>=0&&y<page.viewportSize().height&&ty>=0&&ty<page.viewportSize().height;
  if(method==='touch'){const session=await page.context().newCDPSession(page);
   if(!fits){await from.scrollIntoViewIfNeeded();const p=await from.boundingBox();await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x+p.width/2,y:p.y+p.height/2}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await dest.scrollIntoViewIfNeeded();const q=await dest.boundingBox();await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:q.x+q.width/2,y:q.y+q.height/2}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else{await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=10;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/10,y:y+(ty-y)*i/10}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}await session.detach();}
  else if(!fits){await from.scrollIntoViewIfNeeded();await from.click();await dest.scrollIntoViewIfNeeded();await dest.click();}
  else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:12});await page.mouse.up();}
 }
 await page.waitForFunction(({key,id,to})=>{const s=JSON.parse(localStorage.getItem(key)).ownershipTechnology.council;if(id.startsWith('mode:'))return s.mode===id.slice(5);if(id==='ballot')return s.ballot===(to==='hand'?null:to);if(id.startsWith('opinion:'))return s.others[Number(id.slice(8))]===to;const first=Number(id.split(':')[1])*(id.startsWith('roll:')?2:1),who=to==='bank'?null:to==='owner'?'owner':Number(to.split(':')[1]);return s.allocation[first]===who&&(!id.startsWith('roll:')||s.allocation[first+1]===who);},{key:PROLOGUE_STORAGE_KEY,id,to});
 if(id.startsWith('mode:'))await f.locator('[data-testid="council-board"][data-mode="'+id.slice(5)+'"]').waitFor();else await f.locator('[data-council-target="'+to+'"] [data-council-piece="'+id+'"]').waitFor();
}
export async function arrangeCouncil(page,f,method='keyboard',minority=false){
 if(minority){await f.getByRole('button',{name:'拆开零钱',exact:true}).click();await f.locator('[data-council-piece="coin:0"]').waitFor();for(let i=0;i<12;i++)await moveCouncil(page,f,'coin:'+i,i<6?'wallet:'+i:'owner',method);}
 else for(let i=0;i<6;i++){const s=await councilState(page);if(s.allocation[i*2]!==i)await moveCouncil(page,f,'roll:'+i,'wallet:'+i,method);}
}
export async function arrangeCouncilAmounts(page,f,amounts,method='keyboard'){
 if(amounts.length!==6||amounts.some(n=>!Number.isInteger(n)||n<0)||amounts.reduce((a,b)=>a+b,0)!==12)throw new Error('Invalid recipient amounts');
 const current=await councilState(page),loose=current.loose||amounts.some(n=>n%2);if(loose&&!current.loose){await f.getByRole('button',{name:'拆开零钱',exact:true}).click();await f.locator('[data-council-piece="coin:0"]').waitFor();}
 let piece=0;for(const [person,n]of amounts.entries())for(let j=0;j<n/(loose?1:2);j++){const id=piece++,s=await councilState(page);if(s.allocation[id*(loose?1:2)]!==person)await moveCouncil(page,f,(loose?'coin:':'roll:')+id,'wallet:'+person,method);}
}
export async function payCouncil(page,f){const s=await councilState(page);await f.getByRole('button',{name:'照这样分，发到手 →',exact:true}).click();await f.locator('[data-testid="council-board"][data-step="ballot"]').waitFor();await page.waitForFunction(({key,revision})=>JSON.parse(localStorage.getItem(key)).ownershipTechnology.council.revision>revision,{key:PROLOGUE_STORAGE_KEY,revision:s.revision});return councilState(page);}
export async function voteCouncil(page,f){const s=await councilState(page);await f.getByRole('button',{name:'开票，照结果办 →',exact:true}).click();await f.locator('[data-testid="council-board"][data-step="result"]').waitFor();await page.waitForFunction(({key,revision})=>JSON.parse(localStorage.getItem(key)).ownershipTechnology.council.revision>revision,{key:PROLOGUE_STORAGE_KEY,revision:s.revision});const actual=await councilState(page);await checkCouncilResult(f,actual);return actual;}
export async function checkCouncilResult(f,s){
 const a=councilTrialAccount(s.run),p=councilExploration(s);assert.equal(await f.locator('.council-bank').count(),0);assert.equal(await f.locator('.council-hand').count(),0);
 assert.equal(await f.locator('.council-income-records').getAttribute('open'),null,'post-vote wallets are secondary, not duplicate primary data');assert.equal(await f.locator('.council-result .relief-caption').count(),0,'do not repeat the two visible ballot tallies');
 for(const [to,expected]of [['divide',a.divideVotes],['invest',a.investVotes]]){
  const cell=f.locator('[data-council-target="'+to+'"]');assert.equal(await cell.locator('[data-decision-paper]').count(),expected);assert.equal(await cell.locator('[data-deciding-votes]').evaluateAll(ns=>ns.reduce((n,node)=>n+Number(node.dataset.decidingVotes),0)),expected);assert.equal(await cell.locator('.council-box-tally').innerText(),expected+'票');
 }
 assert.equal(await f.locator('.owner-vote [data-decision-paper]').count(),a.ownerVotes);assert.equal(await f.locator('.council-no-vote').count(),a.workerWeight?0:6);
 if(p){assert.equal(await f.getByTestId('council-question').textContent(),p.prompt);const comparison=f.getByTestId('council-comparison');assert.equal(await comparison.count(),p.comparison?1:0);if(p.comparison){assert.equal(await comparison.textContent(),p.comparison);assert.equal(await comparison.getAttribute('data-matched'),p.changed);}if(p.focusPerson!==null)assert.equal(await f.locator('.council-fixed-vote[data-probe-focus]').getAttribute('data-council-voter'),String(p.focusPerson));if(p.focusAuthority)assert.equal(await f.locator('.owner-vote[data-probe-focus]').count(),1);}
}
