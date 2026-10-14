/** Actual pointer/touch/keyboard placement. Does not inject reducers or saves. */
export async function moveCondition(page,f,id,to='desk',method='tap'){
 const from=f.locator('[data-assumption-piece="'+id+'"]'),destination=f.locator('[data-assumption-target="'+to+'"] > button');
 if(method==='keyboard'){await from.focus();await page.keyboard.press('Enter');await destination.focus();await page.keyboard.press('Enter');}
 else if(method==='tap'){await from.click();await destination.click();}
 else{
  await from.scrollIntoViewIfNeeded();await destination.scrollIntoViewIfNeeded();const a=await from.boundingBox(),b=await destination.boundingBox();
  const x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
  if(method==='touch'){
   const session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=12;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/12,y:y+(ty-y)*i/12}]});
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
  }else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:12});await page.mouse.up();}
 }
 await f.locator('[data-assumption-target="'+to+'"] [data-assumption-piece="'+id+'"]').waitFor();
}
export async function chooseCondition(f,id){
 if(await f.locator('[data-assumption-target="desk"] [data-assumption-piece="'+id+'"]').count())return;
 await f.locator('[data-assumption-piece="'+id+'"]').click();await f.getByRole('button',{name:'放到实验桌',exact:true}).click();
 await f.locator('[data-assumption="'+id+'"]:visible').waitFor();
}
