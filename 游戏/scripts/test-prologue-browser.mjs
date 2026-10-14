import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { ENDING_PAIRS, PROLOGUE_STORAGE_KEY, BASIC_CONTRADICTION } from '../lib/prologue-state.ts';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const { loadPlaywright, browserLaunchOptions } = require('./playwright-runtime.cjs');
const { chromium } = loadPlaywright();
const output = path.join(root, 'outputs/prologue-qa');
await fs.mkdir(output, { recursive: true });
const html = await fs.readFile(path.join(root, 'build/index.html'));
const server = http.createServer((req, res) => {
  if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
let browser;
try {
  browser = await chromium.launch(browserLaunchOptions());
} catch (error) {
  await new Promise(resolve => server.close(resolve));
  throw error;
}
const errors = [], external = [], cases = [], snapshots = [];
const record = name => { cases.push(name); console.log(`PASS ${name}`); };
async function contextPage(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', req => { if (!req.url().startsWith(url) && !req.url().startsWith('data:')) external.push(req.url()); });
  await page.goto(url);
  await page.locator('main[data-ready="true"]:visible').waitFor();
  return { context, page };
}
const button = (page, name) => page.getByRole('button', { name, exact: true });
async function machinePhase(page, name) { await page.locator(`main[data-machine-phase="${name}"]`).waitFor(); }
async function experiment(page) {
  await button(page, '去看看新机器 →').click(); await machinePhase(page, 'quote');
  await button(page, '去工厂 →').click(); await machinePhase(page, 'predict');
  assert.equal(await page.locator('.ml-results').getAttribute('data-focus'), 'products');
  assert.match(await page.locator('[data-metric="products"]').textContent(), /8/);
  await button(page, '会更多').click();
  assert.equal(await page.locator('.ml-results').getAttribute('data-focus'), 'wages');
  await button(page, '会跟着涨').click();
  assert.equal(await page.locator('.ml-results').getAttribute('data-focus'), 'hours');
  await button(page, '能早些走').click(); await machinePhase(page, 'ready');
  await button(page, '换上新机器 →').click(); await machinePhase(page, 'result');
  const reduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  assert.equal(await page.locator('.ml-machine-body').evaluate(el => getComputedStyle(el).animationName), reduced ? 'none' : 'ml-start');
  assert.equal(await page.locator('.ml-new-box').first().evaluate(el => getComputedStyle(el).animationName), reduced ? 'none' : 'ml-product-out');
  assert.match(await page.locator('[data-metric="products"]').textContent(), /一天做\s*16\s*件/);
  assert.match(await page.locator('[data-metric="wages"]').textContent(), /每人工资\s*4\s*枚/);
  assert.match(await page.locator('[data-metric="hours"]').textContent(), /一天工作\s*8\s*小时/);
  await button(page, '工资、时间，能改吗？ →').click(); await machinePhase(page, 'compare');
  await button(page, '假设谈成加薪').click();
  assert.match(await page.locator('[data-metric="wages"]').textContent(), /每人工资\s*6\s*枚/);
  await button(page, '假设谈成早点下班').click();
  assert.match(await page.locator('[data-metric="products"]').textContent(), /一天做\s*8\s*件/);
  assert.match(await page.locator('[data-metric="wages"]').textContent(), /每人工资\s*4\s*枚/);
  assert.match(await page.locator('[data-metric="hours"]').textContent(), /一天工作\s*4\s*小时/);
  await noOverflow(page);
}
async function scene(page, name) { await page.locator(`main[data-scene="${name}"]`).waitFor(); }
async function screenshot(page, name) {
  const filename = `${name}.png`;
  await page.screenshot({ path: path.join(output, filename), fullPage: true, animations: 'disabled' });
  snapshots.push(filename);
}
async function noOverflow(page) {
  const layout = await page.evaluate(() => ({
    width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll('main *')].filter(el => {
      const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
    }).slice(0, 4).map(el => `${el.tagName}.${el.getAttribute('class') || ''}`),
  }));
  assert(layout.scrollWidth <= layout.width, `Horizontal overflow: ${JSON.stringify(layout)}`);
}
async function saved(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROLOGUE_STORAGE_KEY); }
async function share(page, target) {
  const current = Number((await page.getByTestId('labor-share').textContent()).replace('%', ''));
  for (let n = current; n !== target; n += target > current ? 10 : -10)
    await button(page, target > current ? '给工人多分10个百分点' : '给工人少分10个百分点').click();
  assert.equal(await page.getByTestId('labor-share').textContent(), `${target}%`);
  assert.equal(await page.getByTestId('retained-share').textContent(), `${100 - target}%`);
}
async function finish(page, all = false) {
  await button(page, '看看大家 ↗').click(); await scene(page, 'network');
  await button(page, '不只是买东西 →').click();
  await button(page, '那厂房归谁？ →').click();
  await button(page, '把两件事放在一起 →').click(); await scene(page, 'concept');
  assert.equal(await page.locator('.pg-definition p').textContent(), BASIC_CONTRADICTION);
  await button(page, '再看一个小故事 →').click(); await scene(page, 'ending');
  if (all) await button(page, '一次看完').click();
  else {
    for (let i = 0; i < 3; i++) {
      assert.equal(await page.locator('.pg-dialogue-pair p').first().textContent(), `女儿：${ENDING_PAIRS[i].daughter}`);
      assert.equal(await page.locator('.pg-dialogue-pair p').last().textContent(), `父亲：${ENDING_PAIRS[i].father}`);
      assert.equal(await page.locator('.pg-step').count(), 0);
      if (i < 2) await button(page, '继续 →').click();
    }
  }
}
try {
  const { context, page } = await contextPage();
  await screenshot(page, 'desktop-opening');
  assert.equal(await page.locator('.pg-opening blockquote p').textContent(), '天下熙熙，皆为利来。');
  await button(page, '我来当老板 →').click(); await scene(page, 'allocation');
  assert((await page.locator('.pg-situation').textContent()).includes('你们的产品上个季度销量不错。'));
  await share(page, 0);
  assert(await button(page, '给工人少分10个百分点').isDisabled());
  await screenshot(page, 'desktop-share-0');
  const bands = new Set();
  for (let s = 0; s <= 100; s += 10) {
    if (s) await button(page, '给工人多分10个百分点').click();
    const mood = s <= 20 ? -2 : s <= 40 ? -1 : s === 50 ? 0 : s <= 70 ? 1 : 2;
    const workers = await page.locator('.pg-allocation-scene [data-character-role="worker"]').evaluateAll(els => els.map(e => Number(e.dataset.mood)));
    assert.deepEqual(workers, [mood, mood]);
    assert.equal(Number(await page.locator('.pg-allocation-scene [data-character-role="owner"]').getAttribute('data-mood')), mood === 0 ? 0 : -mood);
    bands.add(mood);
    assert.equal(await page.getByTestId('allocation-coins').getAttribute('data-worker-parts'), String(s / 10));
    assert.equal(await page.locator('.pg-moving-coin').count(), 10);
    if ([50, 100].includes(s)) await screenshot(page, `desktop-share-${s}`);
  }
  assert.equal(bands.size, 5);
  assert.equal(await page.locator('.pg-moving-coin').first().evaluate(el => getComputedStyle(el).transitionDuration), '0.56s');
  assert(await button(page, '给工人多分10个百分点').isDisabled());
  record('11 shares, 5 worker AND owner expressions, both limits');
  for (const [id, name, target] of [['A', '汽车公司', 70], ['B', '手机公司', 30], ['C', '鞋厂', 80], ['D', '面包公司', 20]]) {
    await button(page, `切换到${id}${name}`).click();
    // View-transition callbacks commit asynchronously; read the NEW company.
    await page.locator(`.pg-allocation-scene[data-firm="${id}"]`).waitFor();
    await share(page, target);
  }
  await button(page, '切换到A汽车公司').click();
  await page.locator('.pg-allocation-scene[data-firm="A"]').waitFor();
  assert.equal(await page.getByTestId('labor-share').textContent(), '70%');
  await page.reload(); await scene(page, 'allocation');
  assert.equal(await page.getByTestId('labor-share').textContent(), '70%');
  const personal = (await saved(page)).allocationPlans;
  assert.deepEqual(Object.values(personal).map(p => p.laborShare), [70, 30, 80, 20]);
  record('4 independent companies, switching and reload persistence');
  await button(page, '看看大家 ↗').click(); await scene(page, 'network');
  assert.equal(await page.locator('.pg-firm-card').count(), 4);
  await button(page, '看看D面包公司的工人').click();
  assert.equal(await page.locator('.pg-network-lines > path').count(), 4);
  assert.equal((await saved(page)).customerFirmId, 'D');
  assert.match(await page.locator('.pg-market-source > span').textContent(), /面包公司的工人/);
  assert((await page.locator('.pg-market-source [data-character-role="worker"]').getAttribute('aria-label')).includes('转头看商品'));
  assert.equal(await page.locator('.pg-board-customers [data-character-role="owner"]').count(), 0);
  assert.equal(await page.locator('.pg-board-customers .pg-firm-card footer').count(), 0);
  assert.equal(await page.locator('.pg-drawn-link').first().evaluate(el => getComputedStyle(el).animationName), 'pg-draw-link');
  await screenshot(page, 'desktop-customers');
  await button(page, '如果各家都给工人20%呢？ ↗').click();
  assert.equal(await page.locator('.pg-demo').count(), 1);
  assert.deepEqual((await saved(page)).allocationPlans, personal);
  await page.reload(); await page.locator('.pg-demo').waitFor();
  await button(page, '回到我的分法').click();
  assert.deepEqual((await saved(page)).allocationPlans, personal);
  record('clickable customer links, phase gestures, isolated/reloadable what-if');
  await page.locator('.pg-relation-explorer summary').click();
  for (const [key, name] of [['cooperation', '一起生产'], ['ownership', '归谁所有'], ['control', '谁来安排'], ['payment', '钱分给谁']]) {
    await button(page, name).click();
    await page.locator(`[data-testid="relationship-board"][data-relation="${key}"]`).waitFor();
    assert.equal(await page.getByTestId('relationship-board').getAttribute('data-relation'), key);
    assert.deepEqual((await saved(page)).allocationPlans, personal);
    await screenshot(page, `desktop-${key}`);
    if (key === 'cooperation') assert.equal(await page.locator('.pg-shared-hub').count(), 1);
    if (key === 'ownership') assert.equal(await page.locator('.pg-machine').count(), 4);
  }
  record('cooperation, property, control, allocation/payment use distinct symbols');
  await button(page, '把两件事放在一起 →').click(); await scene(page, 'concept');
  assert.equal(await page.locator('.pg-definition p').textContent(), BASIC_CONTRADICTION);
  assert.equal(await page.locator('.pg-explain[open]').count(), 0);
  await screenshot(page, 'desktop-concept');
  await button(page, '再看一个小故事 →').click();
  for (let i = 0; i < 3; i++) {
    assert.equal(await page.locator('.pg-dialogue-pair p').first().textContent(), `女儿：${ENDING_PAIRS[i].daughter}`);
    assert.equal(await page.locator('.pg-dialogue-pair p').last().textContent(), `父亲：${ENDING_PAIRS[i].father}`);
    await screenshot(page, `desktop-ending-${i + 1}`);
    if (i < 2) await button(page, '继续 →').click();
  }
  assert.equal(await page.locator('.pg-definition').count(), 0);
  assert.deepEqual(await page.locator('.pg-ending-exits button').allTextContents(), ['从个人开始 →', '从公司开始 →', '回头看看']);
  await button(page, '从公司开始 →').click(); await scene(page, 'routes');
  assert.equal((await saved(page)).prologueStatus, 'observed');
  assert.equal((await saved(page)).entrance, 'enterprise');
  assert.deepEqual((await saved(page)).allocationPlans, personal);
  await experiment(page);
  assert.equal(await page.locator('.machine-experiment').getAttribute('data-role'), 'producer');
  await screenshot(page, 'desktop-new-machine-compare');
  await page.reload(); await machinePhase(page, 'compare');
  assert.match(await page.locator('[data-metric="hours"]').textContent(), /一天工作\s*4\s*小时/);
  assert.deepEqual((await saved(page)).allocationPlans, personal);
  await button(page, '回到入口 →').click(); await scene(page, 'routes');
  await page.locator('.pg-route-options button').first().click();
  await button(page, '去看看新机器 →').click(); await machinePhase(page, 'quote');
  assert.equal(await page.locator('.machine-experiment').getAttribute('data-role'), 'worker');
  await button(page, '← 回到入口').click();
  await page.locator('.pg-route-options button').last().click();
  await button(page, '去看看新机器 →').click(); await machinePhase(page, 'compare');
  assert.match(await page.locator('[data-metric="hours"]').textContent(), /一天工作\s*4\s*小时/);
  await button(page, '回到入口 →').click();
  record('new machine: predictions, M1 result, isolated contracts, reload and return');
  await button(page, '继续旧版小工厂 →').click();
  assert(await page.locator('.factory-story').isVisible());
  await button(page, '← 回到序章').click(); assert(await page.locator('.pg-routes').isVisible());
  await button(page, '回头看看').click(); await scene(page, 'allocation');
  assert.deepEqual((await saved(page)).allocationPlans, personal);
  record('definition before exact 3 ending pairs; no concluding lecture; routes/legacy/back work');
  await noOverflow(page);
  await context.close();

  for (const width of [320, 390, 768]) {
    const { context: mobileContext, page: mobile } = await contextPage({ viewport: { width, height: 844 }, isMobile: width < 600, hasTouch: true, deviceScaleFactor: 1 });
    await noOverflow(mobile); await screenshot(mobile, `mobile-${width}-opening`);
    await button(mobile, '我来当老板 →').click(); await share(mobile, 100);
    await noOverflow(mobile); await screenshot(mobile, `mobile-${width}-allocation`);
    await button(mobile, '换一家 →').click();
    await mobile.locator('.pg-allocation-scene[data-firm="B"]').waitFor();
    assert.equal(await mobile.getByTestId('labor-share').textContent(), '50%');
    await button(mobile, '看看大家 ↗').click();
    await noOverflow(mobile); await screenshot(mobile, `mobile-${width}-network`);
    assert.equal(await mobile.locator('.pg-board').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 2);
    assert(await mobile.locator('.pg-network-lines').isVisible());
    assert.equal(await mobile.locator('.pg-network-lines > path').count(), 4);
    await button(mobile, '看看C鞋厂的工人').click();
    await button(mobile, '如果各家都给工人20%呢？ ↗').click();
    await button(mobile, '回到我的分法').click();
    await button(mobile, '不只是买东西 →').click(); await noOverflow(mobile);
    await button(mobile, '那厂房归谁？ →').click(); await noOverflow(mobile);
    await mobile.locator('.pg-relation-explorer summary').click();
    await button(mobile, '谁来安排').click(); await noOverflow(mobile);
    await button(mobile, '钱分给谁').click(); await noOverflow(mobile);
    await button(mobile, '把两件事放在一起 →').click(); await noOverflow(mobile);
    await screenshot(mobile, `mobile-${width}-concept`);
    await button(mobile, '再看一个小故事 →').click();
    await button(mobile, '一次看完').click(); await noOverflow(mobile);
    assert.equal(await mobile.locator('.pg-dialogue-pair').count(), 3);
    await screenshot(mobile, `mobile-${width}-ending-all`);
    await button(mobile, '从个人开始 →').click(); await noOverflow(mobile);
    assert.equal((await saved(mobile)).entrance, 'individual');
    await experiment(mobile);
    assert.equal(await mobile.locator('.machine-experiment').getAttribute('data-role'), 'worker');
    await screenshot(mobile, `mobile-${width}-new-machine`);
    await button(mobile, '回到入口 →').click(); await scene(mobile, 'routes');
    record(`${width}px full touch journey without horizontal overflow`);
    await mobileContext.close();
  }
  const { context: keyContext, page: keys } = await contextPage({ reducedMotion: 'reduce' });
  await keys.evaluate(() => localStorage.setItem('legacy-progress-sentinel', 'keep-this'));
  await button(keys, '我来当老板 →').focus(); await keys.keyboard.press('Enter');
  await button(keys, '给工人多分10个百分点').focus(); await keys.keyboard.press('Space');
  assert.equal(await keys.getByTestId('labor-share').textContent(), '60%');
  assert.equal(await keys.locator('.pg-person-pose').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  assert.equal(await keys.locator('.pg-moving-coin').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  await button(keys, '跳过序章').focus(); await keys.keyboard.press('Enter');
  assert.equal((await saved(keys)).prologueStatus, 'skipped');
  assert.equal(await keys.evaluate(() => localStorage.getItem('legacy-progress-sentinel')), 'keep-this');
  await keyContext.close(); record('keyboard, reduced motion and skipped-path storage isolation');

  const { context: contrastContext, page: contrast } = await contextPage();
  await button(contrast, '我来当老板 →').click(); await share(contrast, 10);
  await button(contrast, '看看大家 ↗').click(); await scene(contrast, 'network');
  await button(contrast, '看看A汽车公司的工人').click();
  await button(contrast, '如果各家都给工人20%呢？ ↗').click();
  assert.match(await contrast.locator('.pg-demo p').textContent(), /反而多拿了/);
  assert.equal((await saved(contrast)).allocationPlans.A.laborShare, 10);
  await button(contrast, '看看B手机公司的工人').click();
  assert.match(await contrast.locator('.pg-demo p').textContent(), /少拿了/);
  await contrastContext.close(); record('20% what-if distinguishes gains from losses without rewriting choices');

  const noStorage = await browser.newContext();
  await noStorage.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'getItem', { value: () => { throw new Error('disabled'); } });
    Object.defineProperty(Storage.prototype, 'setItem', { value: () => { throw new Error('disabled'); } });
  });
  const blocked = await noStorage.newPage();
  blocked.on('pageerror', e => errors.push(e.message));
  await blocked.goto(url); await blocked.locator('[data-ready="true"]').waitFor();
  await button(blocked, '我来当老板 →').click(); await share(blocked, 0); await finish(blocked);
  assert.match(await blocked.locator('.pg-footer').textContent(), /本机保存不可用/);
  await button(blocked, '从个人开始 →').click(); await scene(blocked, 'routes');
  await noStorage.close(); record('disabled storage still allows complete prologue');
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  const report = { date: new Date().toISOString(), status: 'PASS', browser: 'Headless Edge', url,
    cases, screenshots: snapshots, runtimeErrors: errors, externalRequests: external,
    scope: 'Built prologue, worker/producer first M1 experiment, and legacy handoff; not complete seven-role routes or public deployment' };
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
