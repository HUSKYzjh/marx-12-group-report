export async function moveFreight(page,f,id,to,method='keyboard'){
 const from=f.locator('[data-freight-piece="'+id+'"]'),destination=f.locator('[data-freight-target="'+to+'"] > button').first();
 const manifest=f.locator('details.freight-ship');
 if(await manifest.count()&&(to.startsWith('hold:')||await from.evaluate(n=>!!n.closest('details.freight-ship')))&&!await manifest.evaluate(n=>n.open))await manifest.locator('summary').click();
 if(method==='keyboard'){await from.focus();await page.keyboard.press('Enter');await destination.focus();await page.keyboard.press('Enter');}
 else{
  await from.scrollIntoViewIfNeeded();await destination.scrollIntoViewIfNeeded();const a=await from.boundingBox(),b=await destination.boundingBox();const x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
  const fits=y>=0&&y<=page.viewportSize().height&&ty>=0&&ty<=page.viewportSize().height;
  if(method==='touch'){const session=await page.context().newCDPSession(page);
   if(!fits){await from.scrollIntoViewIfNeeded();const p=await from.boundingBox();await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x+p.width/2,y:p.y+p.height/2}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await destination.scrollIntoViewIfNeeded();const q=await destination.boundingBox();await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:q.x+q.width/2,y:q.y+q.height/2}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else{await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=10;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/10,y:y+(ty-y)*i/10}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}await session.detach();}
  else if(!fits){await from.scrollIntoViewIfNeeded();await from.click();await destination.scrollIntoViewIfNeeded();await destination.click();}
  else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:12});await page.mouse.up();}
 }
 if(to.startsWith('hold:')||to==='store')await f.locator('[data-freight-target="'+to+'"] [data-freight-piece="'+id+'"]').waitFor({state:'attached'});
 else if(to.startsWith('site:'))await f.locator('.freight-ship [data-freight-piece="'+id+'"]').waitFor({state:'attached'});
 else if(id.startsWith('blueprint:'))await f.locator('[data-freight-target="'+to+'"] > button[data-kind="'+id.slice(10)+'"]').waitFor();
 else if(id==='maintenance')await f.locator('.freight-orderbook').filter({hasText:'维护6组'}).waitFor();
 else await f.locator('.freight-orderbook > span').filter({hasText:'已签 '+id.split(':')[1]+'组'}).waitFor();
}
export async function loadFreight(page,f,method='keyboard'){
 const limit=await f.locator('.freight-orderbook small').first().innerText();const n=Number(limit.match(/还收\s*(\d+)/)[1]);
 const construction=await f.locator('.space-freight[data-construction="true"]').count();for(let slot=0;slot<n;slot++){const from=f.locator('.freight-warehouse [data-freight-piece]'+(construction?'[data-loadable="true"]':'')).first();if(!await from.count())break;const id=await from.getAttribute('data-freight-piece'),kind=await from.getAttribute('data-kind');await moveFreight(page,f,id,construction?'site:'+kind:'hold:'+slot,method);}
}
export async function programFreight(page,f,recipe,method='keyboard'){
 const count=await f.locator('[data-freight-target^="machine:"]').count();
 for(let slot=0;slot<count;slot++){
  const expected=recipe[slot]||'',node=f.locator('[data-freight-target="machine:'+slot+'"] > button').first();if(await node.getAttribute('data-kind')===expected)continue;
  if(expected)await moveFreight(page,f,'blueprint:'+expected,'machine:'+slot,method);
  else{const clear=f.getByRole('button',{name:'停用生产位'+(slot+1),exact:true});if(method==='keyboard'){await clear.focus();await page.keyboard.press('Enter');}else if(method==='touch')await clear.tap();else await clear.click();await f.locator('[data-freight-target="machine:'+slot+'"] > button[data-kind=""]').waitFor();}
 }
}
export async function finishFreight(page,f,renew=false,method='keyboard'){
 for(let round=0;round<3;round++){
  if(renew&&await f.locator('[data-freight-piece="maintenance"]').count())await moveFreight(page,f,'maintenance','book',method);
  await f.getByRole('button',{name:'开工 →',exact:true}).click();await f.locator('.space-freight[data-stage="loading"]').waitFor();await loadFreight(page,f,method);
  const sail=f.getByRole('button',{name:'发船 →',exact:true});if(await sail.count())await sail.click();else await f.getByRole('button',{name:'结束这一期 →',exact:true}).click();
  await f.locator('.space-freight[data-round="'+(round+1)+'"]').waitFor();
 }
}
