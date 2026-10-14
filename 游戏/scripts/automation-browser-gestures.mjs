/** Tap/keyboard-equivalent placement through real controls, never reducer injection. */
export async function beginAutomation(frame,page,method='click'){
 const from=frame.getByRole('button',{name:'拿起这批任务',exact:true}),to=frame.getByRole('button',{name:'交给自动化设备',exact:true});
 if(method==='keyboard'){await from.focus();await page.keyboard.press('Enter');await to.focus();await page.keyboard.press('Enter');}
 else if(method==='click'){await from.click();await to.click();}
 else{
  await from.scrollIntoViewIfNeeded();await to.scrollIntoViewIfNeeded();const a=await from.boundingBox(),b=await to.boundingBox(),x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
  if(method==='touch'){
   const session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=10;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/10,y:y+(ty-y)*i/10}]});
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
  }else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:12});await page.mouse.up();}
 }
 await frame.locator('.automation-arrangement').waitFor();
}
export async function arrangeAll(frame,mode){
 await frame.locator('.automation-arrangement').waitFor();
 await editAutomation(frame);
 const ids=await frame.locator('.piece-person').evaluateAll((nodes,target)=>nodes.filter(n=>n.closest('[data-piece-target]').dataset.pieceTarget!==target).map(n=>n.dataset.piece),mode);
 for(const id of ids){
  await frame.locator('[data-piece="'+id+'"]').click();
  await frame.locator('[data-piece-target="'+mode+'"] .piece-destination').click();
  await frame.locator('[data-piece-target="'+mode+'"] [data-piece="'+id+'"]').waitFor();
 }
}
export async function editAutomation(frame){
 const collapsed=frame.locator('details.automation-plan:not([open]) > summary');
 if(await collapsed.count())await collapsed.click();
}
