import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { initialPrologue, PROLOGUE_STORAGE_KEY, PROLOGUE_STAGES } from '../lib/prologue-state.ts';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { loadPlaywright, browserLaunchOptions } = createRequire(import.meta.url)('./playwright-runtime.cjs');
const document = await fs.readFile(path.join(root, 'build/index.html'));
const offlinePath = path.join(root, 'offline/技术红利去了哪里.html');
assert(document.equals(await fs.readFile(offlinePath)));
const output = path.join(root, 'outputs/home-navigation-qa');
await fs.mkdir(output, { recursive: true });
const server = http.createServer((req, res) => {
  res.writeHead(req.url === '/favicon.ico' ? 204 : 200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(req.url === '/favicon.ico' ? undefined : document);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const errors = [], cases = [];
let browser;
const machineKey = 'technology-dividend:machine-experiment:v1';
const viewKey = 'technology-dividend:active-view:v1';
const machine = { version: 1, phase: 'result', questionIndex: 2,
  predictions: { products: 'more', wages: 'same', hours: 'same' }, contract: 'unchanged' };
async function frameFor(page) {
  const frame = await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();
  await frame.locator('body[data-ready="true"]').waitFor();
  await frame.waitForFunction(() => window.__homePayload && window.__trustStage);
  return frame;
}
async function settled(frame) {
  await frame.waitForFunction(() => !document.body.dataset.transition && !Tween.hasActiveTweens());
}
try {
  browser = await loadPlaywright().chromium.launch(browserLaunchOptions());
  for (const spec of [
    { name: 'desktop-allocation-mouse', width: 1280, scene: 'allocation', input: 'click' },
    { name: 'mobile-market-keyboard', width: 390, scene: 'market', input: 'keyboard' },
    { name: 'mobile-machine-touch', width: 320, scene: 'routes', section: 'machine', input: 'tap' },
    { name: 'offline-ending-mouse', width: 1280, scene: 'ending', input: 'click', offline: true },
  ]) {
    const saved = { ...initialPrologue(), scene: spec.scene, marketMode: 'all', marketCuts: 1,
      definitionShown: spec.scene === 'ending' };
    saved.allocationPlans.A = { laborShare: 70, retainedShare: 30 };
    const context = await browser.newContext({ viewport: { width: spec.width, height: 900 },
      hasTouch: spec.width < 600, isMobile: spec.width < 600 });
    await context.addInitScript(({ saved, machine, prologueKey, machineKey, viewKey, section }) => {
      if (window === top && !localStorage.getItem(prologueKey)) {
        localStorage.setItem(prologueKey, JSON.stringify(saved));
        localStorage.setItem(machineKey, JSON.stringify({ individual: machine }));
        localStorage.setItem(viewKey, JSON.stringify({ version: 1, view: section === 'machine' ? 'experiment' : 'prologue', entrance: 'individual' }));
      }
      window.addEventListener('message', e => {
        if (e.data?.app === 'trust-adaptation' && e.data.type === 'state') window.__homePayload = e.data.payload;
      });
    }, { saved, machine, prologueKey: PROLOGUE_STORAGE_KEY, machineKey, viewKey, section: spec.section });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(spec.offline ? pathToFileURL(offlinePath).href : url);
    let frame = await frameFor(page);
    await frame.locator(`body[data-scene="${spec.section || spec.scene}"]`).waitFor();
    const stage = await frame.evaluateHandle(() => window.__trustStage);
    const home = frame.getByRole('button', { name: '返回首页', exact: true });
    const box = await home.boundingBox();
    assert(box.width >= 44 && box.height >= 44);
    if (spec.input === 'keyboard') { await home.focus(); await page.keyboard.press('Enter'); }
    else await home[spec.input]();
    await frame.locator('body[data-scene="opening"]').waitFor();
    await settled(frame);
    assert(await frame.evaluate(stage => stage === window.__trustStage, stage), 'Persistent stage survives home navigation');
    assert.equal(await home.getAttribute('aria-current'), 'step');
    assert.equal(await frame.locator('.production-symbols').isVisible(), true);
    const state = await page.evaluate(({ prologueKey, machineKey, viewKey }) => ({
      prologue: JSON.parse(localStorage.getItem(prologueKey)), machine: JSON.parse(localStorage.getItem(machineKey)), view: JSON.parse(localStorage.getItem(viewKey)),
    }), { prologueKey: PROLOGUE_STORAGE_KEY, machineKey, viewKey });
    assert.deepEqual(state.prologue, { ...saved, scene: 'opening' });
    assert.deepEqual(state.machine.individual, machine);
    assert.equal(state.view.view, 'prologue');
    assert(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: path.join(output, `${spec.name}.png`), fullPage: true });
    await page.reload();
    frame = await frameFor(page);
    await frame.locator('body[data-scene="opening"]').waitFor();
    await frame.getByRole('button', { name: '开始 →', exact: true }).click();
    await frame.locator('body[data-scene="bakery"]').waitFor();await settled(frame);
    await frame.getByRole('button', { name: '看完这一幕', exact: true }).click();
    await frame.locator('body[data-scene="bakery-upgrade"]').waitFor();await settled(frame);
    await frame.getByRole('button',{name:'看完这一幕',exact:true}).click();
    await frame.getByRole('button',{name:'就这样分 →',exact:true}).click();
    await frame.getByRole('button',{name:'再买些烤炉 →',exact:true}).click();
    await frame.locator('body[data-scene="bakery-expansion"]').waitFor();await settled(frame);
    await frame.getByRole('button',{name:'看完这一段',exact:true}).click();
    await frame.getByRole('button',{name:'继续看看 →',exact:true}).click();
    await frame.locator('body[data-scene="allocation"]').waitFor();
    await settled(frame);
    assert.equal(await frame.getByTestId('labor-share').textContent(), '7份');
    async function activate(control) {
      if (spec.input === 'keyboard') { await control.focus(); await page.keyboard.press('Enter'); }
      else await control[spec.input]();
    }
    async function stageAt(index) {
      await frame.locator(`body[data-scene="${PROLOGUE_STAGES[index].scene}"]`).waitFor();
      await settled(frame);
      assert.equal(await frame.locator('#dots button[aria-current="step"]').getAttribute('data-stage'), String(index));
      assert.equal(await frame.locator('#notes').isVisible(), ![0,1].includes(index));
      assert.equal(await frame.locator('#save-status').count(), 0);
      assert.equal(await frame.getByRole('button', { name: '上一阶段', exact: true }).isDisabled(), index === 0);
      assert.equal(await frame.getByRole('button', { name: '下一阶段', exact: true }).isDisabled(), index === PROLOGUE_STAGES.length-1);
      assert(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      const buttons = await frame.locator('#stage-navigation button').evaluateAll(items => items.map(item => {
        const b = item.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height };
      }));
      assert.equal(buttons.length, PROLOGUE_STAGES.length+2);
      for (let i = 0; i < buttons.length; i++) {
        const a = buttons[i];
        assert(a.width >= 44 && a.height >= 44, 'All navigation targets remain easy to tap');
        for (const b of buttons.slice(i + 1)) assert(a.x + a.width <= b.x + .01 || b.x + b.width <= a.x + .01 ||
          a.y + a.height <= b.y + .01 || b.y + b.height <= a.y + .01, 'Navigation targets never overlap');
      }
    }
    for (let index = 0; index < PROLOGUE_STAGES.length; index++) {
      await activate(frame.locator('#dots button').nth(index));
      await stageAt(index);
    }
    await page.reload();
    frame = await frameFor(page);
    await stageAt(PROLOGUE_STAGES.length-1);
    for (let index = PROLOGUE_STAGES.length-2; index >= 0; index--) {
      await activate(frame.getByRole('button', { name: '上一阶段', exact: true }));
      await stageAt(index);
    }
    for (let index = 1; index < PROLOGUE_STAGES.length; index++) {
      await activate(frame.getByRole('button', { name: '下一阶段', exact: true }));
      await stageAt(index);
    }
    // Two deliberate direct jumps during the same transition must end at the
    // last selected chapter, rather than overwriting it with a stale payload.
    await activate(frame.locator('#dots button').nth(3));
    await activate(frame.locator('#dots button').nth(2));
    await stageAt(2);
    assert.equal(await frame.getByTestId('labor-share').textContent(), '7份');
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).individual, machineKey), machine);
    await activate(frame.locator('#dots button').nth(0));
    await stageAt(0);
    await page.screenshot({ path: path.join(output, `${spec.name}-navigation.png`), fullPage: true });
    cases.push(spec.name);
    console.log(`PASS ${spec.name}: ${PROLOGUE_STAGES.length} dots, previous/next, refresh, rapid jumps, uncluttered home and saved choices`);
    await context.close();
  }
  assert.deepEqual(errors, []);
  const report = { status: 'PASS', date: new Date().toISOString(), buildBytes: document.length,
    buildSha256: createHash('sha256').update(document).digest('hex'), cases, errors };
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
