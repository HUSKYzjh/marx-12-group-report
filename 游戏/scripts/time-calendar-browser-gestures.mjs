export async function openCalendarWorkspace(page,f){
 const workspace=f.locator('.calendar-workspace');if(await workspace.getAttribute('open')!==null)return;
 const before=await page.evaluate(()=>localStorage.getItem('technology-dividend:prologue:v1'));
 await workspace.locator(':scope > summary').click();await f.locator('.calendar-workspace[open]').waitFor();
 if(await page.evaluate(()=>localStorage.getItem('technology-dividend:prologue:v1'))!==before)throw Error('Opening calendar workbench changed accounts or arrangements');
}
export async function moveCalendarPiece(page,f,id,to,method='keyboard'){
 await openCalendarWorkspace(page,f);
 const from=f.locator('[data-calendar-piece="'+id+'"]'),destination=f.locator('[data-calendar-target="'+to+'"] > :is(.calendar-date,.calendar-destination)');
 if(method==='keyboard'){await from.focus();await page.keyboard.press('Enter');await destination.focus();await page.keyboard.press('Enter');}
 else{
 await from.scrollIntoViewIfNeeded();await destination.scrollIntoViewIfNeeded();const a=await from.boundingBox(),b=await destination.boundingBox();
 const x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
 if(method==='touch'){
  const session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=10;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/10,y:y+(ty-y)*i/10}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
 }else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:12});await page.mouse.up();}
 }
 const placedId=id.startsWith('day:')&&to.startsWith('day:')?to:id;
 await f.locator('[data-calendar-target="'+to+'"] [data-calendar-piece="'+placedId+'"]').waitFor();
}
export async function calendarPaidRest(page,f){for(const day of [2,3,4])await moveCalendarPiece(page,f,'day:'+day,'rest');}

/** The visible retry desk uses its own selectors; old paid art isn't draggable. */
export async function moveCalendarNextPiece(page,f,id,to,method='keyboard',invalid=false){
 const quick=f.getByTestId('calendar-next');await quick.waitFor();
 const from=quick.locator('[data-calendar-next-piece="'+id+'"]'),target=quick.locator('[data-calendar-next-target="'+to+'"]'),destination=target.locator(':scope > :is(.calendar-date,.calendar-destination)');
 const before=await page.evaluate(()=>localStorage.getItem('technology-dividend:prologue:v1'));
 const uncommitted=async()=>{if(before!==await page.evaluate(()=>localStorage.getItem('technology-dividend:prologue:v1')))throw Error('Picking up or moving a retry piece changed the plan');if(await from.count()!==1)throw Error('Motion ghost duplicates the real retry piece');};
 if(method==='keyboard'){await from.focus();await page.keyboard.press('Enter');await uncommitted();await destination.focus();await page.keyboard.press('Enter');}
 else{
  await destination.scrollIntoViewIfNeeded();await from.scrollIntoViewIfNeeded();const a=await from.boundingBox(),b=await destination.boundingBox();
  const x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
  if(method==='touch'){const session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=10;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/10,y:y+(ty-y)*i/10}]});await uncommitted();await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}
  else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:12});await uncommitted();await page.mouse.up();}
 }
 if(invalid){if(before!==await page.evaluate(()=>localStorage.getItem('technology-dividend:prologue:v1')))throw Error('Invalid retry date changed the plan');}
 else{const placed=id.startsWith('day:')&&to.startsWith('day:')?to:id;await f.locator('[data-calendar-next-target="'+to+'"] [data-calendar-next-piece="'+placed+'"]').waitFor();}
}
