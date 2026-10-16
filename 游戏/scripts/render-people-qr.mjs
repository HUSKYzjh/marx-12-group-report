import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../分享/',import.meta.url));
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
try {
  const page=await browser.newPage({viewport:{width:1440,height:1580},deviceScaleFactor:1});
  await page.goto(pathToFileURL(path.join(root,'群像二维码.html')).href);
  await page.evaluate(()=>document.fonts.ready);
  assert(await page.evaluate(()=>Array.from(document.images).every(img=>img.complete&&img.naturalWidth>0)));
  await page.locator('.card').screenshot({path:path.join(root,'试玩二维码-面包工坊群像.png')});
} finally {await browser.close();}
