import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../',import.meta.url));
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
try{
  const page=await browser.newPage({viewport:{width:1080,height:1540},deviceScaleFactor:1});
  await page.goto(pathToFileURL(path.join(root,'分享/分享卡.html')).href);
  await page.evaluate(()=>document.fonts.ready);
  assert(await page.evaluate(()=>Array.from(document.images).every(image=>image.complete&&image.naturalWidth>0)));
  await page.locator('.card').screenshot({path:path.join(root,'分享/试玩分享卡.png')});
  await page.locator('.qr').screenshot({path:path.join(root,'分享/试玩二维码-手绘配色.png')});
  console.log('Share card and styled QR rendered at 1080px / 574px.');
}finally{await browser.close();}
