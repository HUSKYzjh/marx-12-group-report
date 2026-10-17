import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const {loadPlaywright,browserLaunchOptions}=createRequire(import.meta.url)('./playwright-runtime.cjs');
const root=fileURLToPath(new URL('../分享/',import.meta.url));
const browser=await loadPlaywright().chromium.launch(browserLaunchOptions());
try {
  for(const name of ['面包烙印','金币票据']) {
    const page=await browser.newPage({viewport:{width:1000,height:1080},deviceScaleFactor:1});
    await page.goto(pathToFileURL(path.join(root,`试玩二维码-${name}.svg`)).href);
    await page.locator('svg').screenshot({path:path.join(root,`试玩二维码-${name}.png`)});
    await page.close();
  }
} finally {await browser.close();}
