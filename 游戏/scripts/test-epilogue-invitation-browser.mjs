import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url)),remote=process.env.GAME_TEST_URL,out=process.env.GAME_TEST_OUTPUT||path.join(root,'outputs/epilogue-invitation');
const m=JSON.parse(await fs.readFile(path.join(root,'build/hosted/hosting-manifest.json'),'utf8')),key='technology-dividend:prologue:v1',repo='https://github.com/HUSKYzjh/feast-of-hunger',profile='https://github.com/HUSKYzjh',results=[],errors=[];
const avatarManifest=JSON.parse(await fs.readFile(path.join(root,'public/assets/author/provenance.json'),'utf8'));
assert.equal(createHash('sha256').update(await fs.readFile(path.join(root,'offline/技术红利去了哪里.html'))).digest('hex'),m.source_sha256);
await fs.mkdir(out,{recursive:true});const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
try{
 for(const [width,height] of [[320,568],[390,844],[1280,900]]){
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  let response=await page.goto(remote||pathToFileURL(path.join(root,'offline/技术红利去了哪里.html')).href,{waitUntil:'domcontentloaded',timeout:120000});
  if(remote&&response.status()===404)response=(await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:120000}),page.getByText(/^确[认定]访问$/).click()]))[0];
  if(remote)assert.equal(createHash('sha256').update(await response.body()).digest('hex'),m.index_sha256);
  async function frame(){const f=await(await page.getByTestId('trust-frame').elementHandle()).contentFrame();await f.locator('body[data-ready=true]').waitFor();await f.waitForFunction(()=>!document.body.dataset.transition);return f;}
  let host=await frame();const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  await host.locator('#dots button[data-stage="4"]').click();await host.getByRole('button',{name:'继续故事 →',exact:true}).click();await host.locator('body[data-scene=epilogue]').waitFor();await host.getByRole('button',{name:'看完这一段',exact:true}).click();
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).epilogueBeat===3,key);
  const before=await saved(),url=page.url(),name='敬请期待后续章节，或者现实...',trigger=host.getByRole('button',{name,exact:true});await trigger.waitFor();
  assert.equal(await host.getByRole('button',{name:'换个条件，会怎样？ →',exact:true}).count(),0);await page.screenshot({path:path.join(out,`${width}-ending.png`)});
  for(const method of ['escape','close','confirm','github']){
   await trigger.click();const dialog=host.getByTestId('epilogue-future-dialog');await dialog.waitFor();
   assert.equal(await dialog.locator('h2').innerText(),'后续真没有啦。实在做不完啦TAT');assert.equal(await dialog.locator('p').innerText(),'可以关注我的github：后续感兴趣可以继续提PR');
   const link=dialog.getByRole('link',{name:'github',exact:true}),repository=dialog.getByRole('link',{name:'游戏开源仓库：feast-of-hunger ↗',exact:true});assert.equal(await link.getAttribute('href'),profile);assert.equal(await link.getAttribute('target'),'_blank');assert.equal(await repository.getAttribute('href'),repo);assert.equal(await repository.getAttribute('target'),'_blank');
   const avatar=dialog.getByRole('img',{name:'HUSKYzjh 的 GitHub 头像',exact:true});await avatar.evaluate(img=>img.decode());const src=await avatar.getAttribute('src');let avatarBytes;if(remote){const url=new URL(src,remote);assert.equal(url.origin,new URL(remote).origin);const response=await ctx.request.get(url.href);assert(response.ok());avatarBytes=await response.body();}else{assert.match(src,/^data:image\/png;base64,/);avatarBytes=Buffer.from(src.split(',')[1],'base64');}assert.equal(createHash('sha256').update(avatarBytes).digest('hex'),avatarManifest.sha256);
   assert.equal(page.url(),url);assert.deepEqual(await saved(),before);assert.equal(await host.locator('body').getAttribute('data-scene'),'epilogue');assert.equal(ctx.pages().length,1);
   await page.waitForTimeout(100);const box=await dialog.boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+2);
   assert.equal(await dialog.locator('.relief-explanation-body').evaluate(n=>n.scrollHeight>n.clientHeight+2),false);
   assert.equal(await host.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
   if(method==='escape'){await page.screenshot({path:path.join(out,`${width}-dialog.png`)});await page.keyboard.press('Escape');}
   if(method==='close')await dialog.getByRole('button',{name:'关闭提示',exact:true}).click();
   if(method==='confirm')await dialog.getByRole('button',{name:'好吧 TAT',exact:true}).click();
   if(method==='github'){
    await ctx.route(profile+'**',route=>route.fulfill({status:200,contentType:'text/html',body:'<title>GitHub link destination verified</title>'}));
    for(const [target,destination] of [[link,profile],[repository,repo]]){const popupPromise=ctx.waitForEvent('page');await target.click();const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');assert.equal(popup.url(),destination);await popup.close();}
    assert.equal(page.url(),url);assert.deepEqual(await saved(),before);await dialog.getByRole('button',{name:'好吧 TAT',exact:true}).click();
   }
   await dialog.waitFor({state:'detached'});assert.deepEqual(await saved(),before);assert.equal(await trigger.evaluate(n=>document.activeElement===n),true);assert.equal(await page.evaluate(()=>document.body.style.overflow==='hidden'),false);
  }
  await page.reload({waitUntil:'domcontentloaded'});host=await frame();await host.getByRole('button',{name,exact:true}).waitFor();assert.deepEqual(await saved(),before);
  results.push({width,height,exactButtonAndDialogCopy:true,noAutomaticNavigation:true,noNewTabUntilGithubClicked:true,githubProfileAndStandaloneRepository:true,avatarMatchesOriginalBytes:true,threeCloseMethods:true,focusRestored:true,modalWithinViewport:true,fullStateUnchanged:true,refreshPreservesEnding:true,noStateInjection:true});console.log(`PASS ${width}: avatar → profile / standalone repository → close → refresh`);await ctx.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({date:'2026-10-20',sourceSHA256:m.source_sha256,indexSHA256:m.index_sha256,results,errors},null,2)+'\n');
}catch(e){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw e;}finally{await browser.close();}
