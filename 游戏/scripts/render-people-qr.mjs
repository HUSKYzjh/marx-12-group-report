import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {writeFile} from 'node:fs/promises';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../分享/',import.meta.url));
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
try {
  const page=await browser.newPage({viewport:{width:1440,height:1580},deviceScaleFactor:1});
  await page.goto(pathToFileURL(path.join(root,'群像二维码.html')).href);
  await page.evaluate(()=>document.fonts.ready);
  assert(await page.evaluate(()=>Array.from(document.images).every(img=>img.complete&&img.naturalWidth>0)));
  const geometry=await page.evaluate(()=>{
    const frame=document.querySelector('.card').getBoundingClientRect();
    const qr=document.querySelector('.qr').getBoundingClientRect();
    return {canvas:{width:frame.width,height:frame.height},qr:{width:qr.width,height:qr.height},
      center_offset:{x:qr.x+qr.width/2-frame.x-frame.width/2,y:qr.y+qr.height/2-frame.y-frame.height/2},
      margins:{left:qr.left-frame.left,right:frame.right-qr.right,top:qr.top-frame.top,bottom:frame.bottom-qr.bottom}};
  });
  assert.equal(geometry.center_offset.x,0,'QR must be horizontally centered in the square.');
  assert.equal(geometry.center_offset.y,0,'QR must be vertically centered in the square.');
  await page.locator('.card').screenshot({path:path.join(root,'试玩二维码-群像居中修正版.png')});
  await page.screenshot({path:path.join(root,'试玩二维码-面包工坊群像.png'),fullPage:true});
  await writeFile(path.join(root,'群像二维码居中校验.json'),JSON.stringify(geometry,null,2)+'\n','utf8');
} finally {await browser.close();}
