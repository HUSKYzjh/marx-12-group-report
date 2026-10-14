import {PROLOGUE_STORAGE_KEY} from '../lib/prologue-state.ts';
import {publicDemandAccount} from '../lib/public-demand.ts';
import {publicDemandExploration} from '../lib/public-demand-exploration.ts';
import assert from 'node:assert/strict';
export const demandState=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).marketRules.demand,PROLOGUE_STORAGE_KEY);
export async function arrangeIncomeGroup(page,f,people,day,method='keyboard'){
 const before=await demandState(page);
 const press=async n=>{if(method==='keyboard'){await n.focus();await page.keyboard.press('Enter');}else if(method==='touch')await n.tap();else await n.click();};
 await press(f.locator('[data-income-day="'+day+'"]'));
 await press(f.locator('[data-income-brush]'));
 if(method==='keyboard'){
  for(const id of people)await press(f.locator('[data-income-person="'+id+'"]'));
  await press(f.getByRole('button',{name:'就给这些人安排 →',exact:true}));
 }else{
  await f.locator('.demand-people').scrollIntoViewIfNeeded();
  const points=[];for(const id of people){const b=await f.locator('[data-income-person="'+id+'"]').boundingBox();points.push({x:b.x+b.width/2,y:b.y+b.height/2});}
  const session=method==='touch'?await page.context().newCDPSession(page):null,p=points[0];
  if(session)await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});else{await page.mouse.move(p.x,p.y);await page.mouse.down();}
  for(const point of points.slice(1))if(session)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point]});else await page.mouse.move(point.x,point.y);
  // A one-person pointer selection is a tap, so it needs the explicit confirmation.
  if(session){await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}else await page.mouse.up();
  if(people.length===1)await press(f.getByRole('button',{name:'就给这些人安排 →',exact:true}));
 }
 await page.waitForFunction(({key,r})=>JSON.parse(localStorage.getItem(key)).marketRules.demand.revision>r,{key:PROLOGUE_STORAGE_KEY,r:before.revision});
 const s=await demandState(page);await f.locator('[data-testid="demand-board"][data-revision="'+s.revision+'"]').waitFor();return s;
}
export async function moveDemand(page,f,id,to,method='keyboard'){
 const before=await demandState(page),from=f.locator('[data-demand-piece="'+id+'"]'),dest=f.locator('[data-demand-target="'+to+'"] > .demand-destination');
 if(await f.locator('.demand-borrowing').count()&&((id.startsWith('loan:')&&await from.isHidden())||to==='lender'&&await dest.isHidden()))await f.locator('.demand-borrowing > summary').click();
 if(await f.locator('.demand-income-singles').count()&&(id.startsWith('income:')||to.startsWith('income:'))&&await f.locator('.demand-income-singles').getAttribute('open')===null)await f.locator('.demand-income-singles > summary').click();
 if(method==='keyboard'){await from.focus();await page.keyboard.press('Enter');await dest.focus();await page.keyboard.press('Enter');}
 else{await from.scrollIntoViewIfNeeded();await dest.scrollIntoViewIfNeeded();const a=await from.boundingBox(),b=await dest.boundingBox(),x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
  const viewport=page.viewportSize(),bothVisible=x>=0&&x<=viewport.width&&tx>=0&&tx<=viewport.width&&y>=0&&y<=viewport.height&&ty>=0&&ty<=viewport.height;
  if(method==='touch'){const session=await page.context().newCDPSession(page);if(!bothVisible){await from.scrollIntoViewIfNeeded();const p=await from.boundingBox();await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x+p.width/2,y:p.y+p.height/2}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await dest.scrollIntoViewIfNeeded();const q=await dest.boundingBox();await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:q.x+q.width/2,y:q.y+q.height/2}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=10;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/10,y:y+(ty-y)*i/10}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}await session.detach();}
  else if(!bothVisible){await from.scrollIntoViewIfNeeded();await from.click();await dest.scrollIntoViewIfNeeded();await dest.click();}
  else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:12});await page.mouse.up();}
 }
 try{await page.waitForFunction(({key,r})=>JSON.parse(localStorage.getItem(key)).marketRules.demand.revision>r,{key:PROLOGUE_STORAGE_KEY,r:before.revision});}catch(e){const diag={from:await from.boundingBox(),to:await dest.boundingBox(),hint:await f.locator('.demand-hint').innerText(),viewport:page.viewportSize()};throw new Error('Demand move failed: '+id+' → '+to+' ('+method+') '+JSON.stringify(diag),{cause:e});}const s=await demandState(page);await f.locator('[data-testid="demand-board"][data-revision="'+s.revision+'"]').waitFor();return s;
}
export async function demandButton(page,f,name){const before=await demandState(page);const button=f.getByRole('button',{name,exact:true});if(name==='回到同一起点，换个安排 ↺'&&await button.isHidden())await f.locator('[data-demand-book] > summary').click();await button.click();await page.waitForFunction(({key,r})=>JSON.parse(localStorage.getItem(key)).marketRules.demand.revision>r,{key:PROLOGUE_STORAGE_KEY,r:before.revision});const s=await demandState(page);if(s.phase==='lab')await f.locator('[data-testid="demand-board"][data-revision="'+s.revision+'"]').waitFor();return s;}
export const fundDemand=(page,f)=>demandButton(page,f,'签好，去买今天的面包 →');
export async function endDemandDay(page,f){const s=await demandState(page),next=await demandButton(page,f,s.day===1?'收店，过到明天 →':'收店，看两天的结果 →');if(next.step==='result')await checkDemandQuestion(page,f,next);return next;}
export async function checkDemandQuestion(page,f,s=undefined){
 s??=await demandState(page);const p=publicDemandExploration(s);if(!p)return;
 assert.equal(await f.getByTestId('demand-question').textContent(),p.question);
 assert.equal(await f.locator('.demand-person-story').getAttribute('data-person'),String(p.focusPerson));
 assert.equal(await f.locator('[data-demand-book]').getAttribute('open'),null,'duplicate wallet and procurement records start folded');
 for(const day of p.personDays){const cell=f.locator('[data-probe-day="'+day.day+'"]');assert.equal(await cell.locator('.demand-probe-meal img').count(),day.bought+day.provided);assert((await cell.textContent()).includes('收店还剩'+day.walletAfterShopping));assert.equal(await cell.locator('.demand-probe-income').textContent(),'当日支持款共'+day.income+'枚');}
 assert.equal(await f.locator('.demand-probe-comparison').count(),p.comparison?1:0);
 if(p.comparison){assert.equal(await f.locator('.demand-probe-comparison').getAttribute('data-comparison'),p.comparison.kind);assert.equal(await f.locator('.demand-probe-comparison').textContent(),p.comparison.text);}
 return p;
}
export async function repayDemand(page,f,method='keyboard'){const s=await demandState(page);for(let i=0;i<6;i++)if(s.loanPaid[i]&&!s.reviewed[i])await moveDemand(page,f,'due:'+i,'lender',method);return demandButton(page,f,'去买今天的面包 →');}
export async function deliverDemand(page,f,person,method='keyboard'){const s=await demandState(page),a=publicDemandAccount(s),id=a.inventory.find(id=>!s.orders.includes(id));await moveDemand(page,f,'bread:'+id,'order:'+person,method);return moveDemand(page,f,'order:'+person,'canteen',method);}
export async function demandBenchmark(page,f,kind,method='keyboard'){
 if(kind==='loan')for(let i=0;i<6;i++)await moveDemand(page,f,'loan:'+i,'loan:'+i,method);
 if(kind==='income')for(let day=1;day<=2;day++)await arrangeIncomeGroup(page,f,[0,1,2,3,4,5],day,method);
 for(let day=1;day<=2;day++){await fundDemand(page,f);if(day===2&&kind==='loan')await repayDemand(page,f,method);if(kind==='public')for(let i=0;i<6;i++)await deliverDemand(page,f,i,method);await endDemandDay(page,f);}
 return publicDemandAccount(await demandState(page));
}
