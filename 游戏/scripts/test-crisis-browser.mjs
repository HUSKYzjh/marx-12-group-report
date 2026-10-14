import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  initialPrologue,
  PROLOGUE_STORAGE_KEY,
  ENDING_PAIRS,
} from '../lib/prologue-state.ts';

// Real clicks in disposable contexts only. Never attach to a personal profile.
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const {
  loadPlaywright,
  browserLaunchOptions,
} = require('./playwright-runtime.cjs');
const { chromium } = loadPlaywright();
const output = path.join(root, 'outputs/crisis-prologue-qa');
await fs.mkdir(output, { recursive: true });
const document = await fs.readFile(path.join(root, 'build/index.html'));
const offlinePath = path.join(root, 'offline/技术红利去了哪里.html');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const buildBytes = document.length,
  buildSha256 = hash(document);
assert.equal(
  hash(await fs.readFile(offlinePath)),
  buildSha256,
  'Offline artifact equals tested build',
);
const server = http.createServer((req, res) => {
  if (req.url === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(document);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const cases = [],
  screenshots = [],
  checkpoints = [],
  marketEvidence = [],
  reliefEvidence = [];
const runtimeErrors = [],
  externalRequests = [],
  writeRequests = [];
let browser,
  latestPage,
  realClicks = 0,
  reloads = 0;
const close = (actual, expected) =>
  assert(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const record = (name) => {
  cases.push(name);
  console.log(`PASS ${name}`);
};
const button = (frame, name) =>
  frame.getByRole('button', { name, exact: true });

async function settled(frame) {
  await frame.waitForFunction(
    () =>
      !document.body.hasAttribute('data-transition') &&
      document.querySelector('main')?.getAttribute('aria-busy') !== 'true' &&
      !Tween.hasActiveTweens(),
    null,
    { timeout: 8000 },
  );
}
async function attachedFrame(page) {
  await page.getByTestId('trust-frame').waitFor();
  const handle = await page.getByTestId('trust-frame').elementHandle();
  assert(handle, 'Original-engine iframe exists');
  const frame = await handle.contentFrame();
  assert(frame, 'Original-engine iframe has a browsing context');
  await frame.locator('body[data-ready="true"]').waitFor();
  await frame.waitForFunction(
    () => window.__crisisPayload && window.slideshow?.objects?.stage,
  );
  await settled(frame);
  await frame.evaluate(async () => {
    await document.fonts.ready;
  });
  return frame;
}
async function open(spec) {
  const context = await browser.newContext({
    viewport: { width: spec.width, height: spec.height },
    isMobile: spec.width < 600,
    hasTouch: spec.width < 600,
    reducedMotion: spec.reduced ? 'reduce' : 'no-preference',
  });
  await context.addInitScript(() => {
    window.__crisisMessageCount = 0;
    window.addEventListener('message', (event) => {
      if (
        event.data?.app === 'trust-adaptation' &&
        event.data.type === 'state'
      ) {
        window.__crisisPayload = event.data.payload;
        window.__crisisMessageCount++;
      }
    });
  });
  const page = await context.newPage();
  latestPage = page;
  const permitted = spec.offline ? pathToFileURL(offlinePath).href : url;
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('request', (request) => {
    if (
      !request.url().startsWith(permitted) &&
      !/^(?:data:|blob:|about:)/.test(request.url())
    )
      externalRequests.push(request.url());
    if (!['GET', 'HEAD'].includes(request.method()))
      writeRequests.push(`${request.method()} ${request.url()}`);
  });
  await page.goto(permitted);
  const frame = await attachedFrame(page);
  assert.equal(
    await frame.evaluate(
      () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    ),
    spec.reduced,
  );
  assert.deepEqual(
    await saved(frame),
    initialPrologue(),
    'Fresh isolated context starts with no inherited choices',
  );
  await actorIdentity(frame, true);
  // Prime Pixi 4's Tab-activated layer before real pointer interactions. Its
  // empty legacy overlay must never hide this game's native DOM controls.
  await frame.locator('#heading').focus();
  await page.keyboard.press('Tab');
  const keyboardLayer = await frame.evaluate(() => {
    const div = window.slideshow.objects.stage.app.renderer.plugins.accessibility.div;
    return { pointerEvents: getComputedStyle(div).pointerEvents, maxWidth: getComputedStyle(div).maxWidth };
  });
  assert.deepEqual(keyboardLayer, { pointerEvents: 'none', maxWidth: '0px' });
  return { context, page, frame, spec };
}
async function saved(frame) {
  return frame.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    PROLOGUE_STORAGE_KEY,
  );
}
async function payload(frame) {
  return frame.evaluate(() => window.__crisisPayload);
}
async function click(frame, name) {
  await settled(frame);
  const before = await frame.evaluate(() => window.__crisisMessageCount);
  await button(frame, name).click();
  realClicks++;
  await frame.waitForFunction(
    (count) => window.__crisisMessageCount > count,
    before,
  );
  await settled(frame);
}
async function scene(frame, expected, attributes = {}) {
  await frame.locator(`body[data-scene="${expected}"]`).waitFor();
  for (const [name, value] of Object.entries(attributes))
    assert.equal(
      await frame.locator('body').getAttribute(`data-${name}`),
      String(value),
    );
  const data = await payload(frame),
    snapshot = await saved(frame);
  assert.deepEqual(
    snapshot,
    data.prologue,
    'Saved state matches the state sent to the original stage',
  );
  assert.equal(
    data.section === 'machine' ? 'machine' : snapshot.scene,
    expected,
  );
}
async function actorIdentity(frame, reset = false) {
  const result = await frame.evaluate((reset) => {
    const stage = window.slideshow.objects.stage;
    if (reset) window.__crisisActors = { stage, people: stage.people.slice() };
    const saved = window.__crisisActors;
    return {
      count: stage.people.length,
      sameStage: stage === saved.stage,
      samePeople: stage.people.every((person, i) => person === saved.people[i]),
      native: stage.people.every((person) => person instanceof IteratedPeep),
    };
  }, reset);
  assert.deepEqual(
    result,
    { count: 13, sameStage: true, samePeople: true, native: true },
    'Scene changes preserve all thirteen original actor objects',
  );
  return result;
}
async function reducedStable(frame) {
  const result = await frame.evaluate(
    () =>
      new Promise((resolve) => {
        const stage = window.slideshow.objects.stage;
        const samples = [];
        function sample() {
          samples.push({
            active: Tween.hasActiveTweens(),
            transition: document.body.dataset.transition || null,
            people: stage.people.map((person) => [
              person.graphics.x,
              person.graphics.y,
              person.graphics.rotation,
              person.graphics.scale.x,
              person.graphics.scale.y,
            ]),
          });
          if (samples.length < 5) requestAnimationFrame(sample);
          else resolve(samples);
        }
        requestAnimationFrame(sample);
      }),
  );
  for (const sample of result) {
    assert.equal(
      sample.active,
      false,
      'Reduced motion has no ongoing Tween animation',
    );
    assert.equal(
      sample.transition,
      null,
      'Reduced motion has no chapter fade or cover',
    );
    assert.deepEqual(
      sample.people,
      result[0].people,
      'Reduced-motion actor placement is stable',
    );
  }
}
async function checkpoint(run, name, capture = true) {
  const { page, frame, spec } = run;
  await settled(frame);
  const sizes = {};
  for (const [label, target] of [
    ['host', page],
    ['iframe', frame],
  ]) {
    sizes[label] = await target.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    assert(
      sizes[label].scrollWidth <= sizes[label].width + 1,
      `${spec.label}/${name}: ${label} has no horizontal overflow: ${JSON.stringify(sizes[label])}`,
    );
  }
  const actors = await actorIdentity(frame);
  let targets = [];
  if (spec.width < 600) {
    targets = await frame.locator('button, summary').evaluateAll((elements) =>
      elements
        .filter(
          (element) =>
            element.getClientRects().length &&
            getComputedStyle(element).visibility !== 'hidden' &&
            (!element.closest('details:not([open])') ||
              element.closest('details:not([open])').querySelector(':scope > summary')?.contains(element)),
        )
        .map((element) => {
          const box = element.getBoundingClientRect();
          return {
            name:
              element.getAttribute('aria-label') || element.textContent.trim(),
            width: box.width,
            height: box.height,
          };
        }),
    );
    for (const target of targets)
      assert(
        target.width >= 44 && target.height >= 44,
        `${spec.label}/${name}: touch target is at least 44×44: ${JSON.stringify(target)}`,
      );
  }
  if (spec.reduced) await reducedStable(frame);
  checkpoints.push({
    label: spec.label,
    name,
    sizes,
    actors,
    targets,
    reducedStable: spec.reduced,
  });
  if (capture) {
    const filename = `${spec.label}-${name}.png`;
    await page.screenshot({
      path: path.join(output, filename),
      fullPage: true,
      animations: 'disabled',
    });
    screenshots.push(filename);
    console.log(`SCREENSHOT ${filename}`);
  }
}
async function notes(frame, open) {
  if (
    (await frame.locator('#notes').evaluate((element) => element.open)) !== open
  ) {
    await frame.locator('#notes > summary').click();
    realClicks++;
  }
}
async function reload(run, expected, attrs) {
  const before = await saved(run.frame);
  await run.page.reload();
  reloads++;
  run.frame = await attachedFrame(run.page);
  await actorIdentity(run.frame, true);
  await scene(run.frame, expected, attrs);
  assert.deepEqual(
    await saved(run.frame),
    before,
    'Reload restores all choices and the selected branch',
  );
}
async function metricValues(frame) {
  return frame
    .locator('.market-metrics > div')
    .evaluateAll((cells) =>
      Object.fromEntries(
        cells.map((cell) => [
          cell.querySelector('span').textContent,
          Number(cell.querySelector('strong').textContent),
        ]),
      ),
    );
}
async function marketCheck(run, share, cuts, mode = 'all') {
  const { frame } = run;
  await scene(frame, 'market', { 'market-mode': mode, 'market-cuts': cuts });
  const data = await payload(frame),
    account = data.market;
  assert.equal(account.laborShare, share);
  assert.equal(account.cuts, cuts);
  assert.equal(account.mode, mode);
  if (mode === 'single') {
    const expected = [
      account.firm.sales,
      account.firm.wages,
      account.firm.receiptsMinusWages,
    ];
    const rows = await frame
      .locator('.market-comparison tbody tr')
      .evaluateAll((rows) =>
        rows.map((row) =>
          Array.from(row.querySelectorAll('td'), (cell) =>
            Number(cell.textContent),
          ),
        ),
      );
    assert.deepEqual(
      rows.map((row) => row[0]),
      [10, 5, 5],
    );
    rows.forEach((row, index) =>
      close(row[1], Math.round(expected[index] * 100) / 100),
    );
    assert.match(await frame.locator('#readout').textContent(), /不是净利润/);
  } else {
    assert.deepEqual(await metricValues(frame), {
      工人消费: Math.round(account.workerDemand * 100) / 100,
      老板消费: 5,
      设备订单: 15,
    });
    if (account.unsold > 0) {
      const expected = String(Math.round(account.unsold * 100) / 100);
      assert(
        (await frame.locator('#readout').textContent()).includes(
          `剩${cuts ? '' : '下'}${expected}份`,
        ),
      );
    }
  }
  marketEvidence.push({ label: run.spec.label, share, mode, cuts, account });
  return account;
}
async function baseline() {
  const run = await open({
    label: 'baseline-50',
    width: 1280,
    height: 900,
    reduced: true,
  });
  await click(run.frame, '开始 →');
  await click(run.frame, '看完这一幕');
  await click(run.frame, '下一幕 →');
  assert.equal(
    (await run.frame.getByTestId('labor-share').textContent()).trim(),
    '5份',
  );
  await click(run.frame, '先看我这家 →');
  await click(run.frame, '其他老板也这样做呢？ →');
  const account = await marketCheck(run, 50, 0);
  assert.deepEqual(
    [
      account.output,
      account.workerDemand,
      account.ownerDemand,
      account.investmentDemand,
      account.demand,
      account.unsold,
    ],
    [50, 20, 5, 15, 40, 10],
  );
  await checkpoint(run, '50-output-40-orders-10-unsold');
  await run.context.close();
  record(
    'Fresh default: output50 / wages20 / owner5 / investment15 / orders40 / unsold10',
  );
}
async function journey(spec) {
  const run = await open(spec);
  await checkpoint(run, 'opening');
  await click(run.frame, '开始 →');
  await click(run.frame, '看完这一幕');
  await click(run.frame, '下一幕 →');
  await scene(run.frame, 'allocation');
  assert.equal(
    (await run.frame.getByTestId('labor-share').textContent()).trim(),
    '5份',
  );
  await click(run.frame, '工资减少1份');
  await click(run.frame, '工资减少1份');
  assert.equal(
    (await run.frame.getByTestId('labor-share').textContent()).trim(),
    '3份',
  );
  const choices = (await saved(run.frame)).allocationPlans;
  assert.deepEqual(
    Object.values(choices).map((plan) => plan.laborShare),
    [30, 50, 50, 50],
  );
  await checkpoint(run, 'allocation-3');
  await click(run.frame, '先看我这家 →');
  const single = await marketCheck(run, 30, 0, 'single');
  assert(single.firm.receiptsMinusWages > 5);
  await checkpoint(run, 'market-single');
  await click(run.frame, '其他老板也这样做呢？ →');
  const all = await marketCheck(run, 30, 0);
  assert(all.firm.sales < single.firm.sales);
  close(all.unsold, 18);
  await checkpoint(run, 'market-all');
  await click(run.frame, '各家都少开工 →');
  const cut1 = await marketCheck(run, 30, 1);
  await checkpoint(run, 'market-cut-1');
  await click(run.frame, '再少开工一次 →');
  const cut2 = await marketCheck(run, 30, 2);
  assert(
    cut2.workerDemand < cut1.workerDemand &&
      cut1.workerDemand < all.workerDemand,
  );
  assert(cut2.sold < cut1.sold && cut1.sold < all.sold);
  close(cut2.inventory, all.unsold + cut1.unsold + cut2.unsold);
  await checkpoint(run, 'market-cut-2');
  await reload(run, 'market', { 'market-mode': 'all', 'market-cuts': 2 });
  await marketCheck(run, 30, 2);
  await checkpoint(run, 'market-cut-2-reloaded', false);
  await click(run.frame, '每家只发2份');
  const low = await marketCheck(run, 20, 0);
  close(low.unsold, 22);
  assert.deepEqual((await saved(run.frame)).allocationPlans, choices);
  await checkpoint(run, 'market-low-wages');
  await click(run.frame, '每家发8份');
  const high = await marketCheck(run, 80, 0);
  close(high.unsold, 0);
  close(high.unfilled, 2);
  assert.equal(
    (await run.frame.locator('#heading').textContent()).trim(),
    '这一次，真的卖完了。',
  );
  assert.equal(await button(run.frame, '各家都少开工 →').count(), 0);
  assert.equal(await button(run.frame, '再少开工一次 →').count(), 0);
  assert.deepEqual((await saved(run.frame)).allocationPlans, choices);
  await checkpoint(run, 'market-high-clears');
  await notes(run.frame, true);
  await click(run.frame, '还原我的方案');
  await marketCheck(run, 30, 0);
  assert.equal((await saved(run.frame)).marketDemoShare, null);
  assert.deepEqual((await saved(run.frame)).allocationPlans, choices);
  await checkpoint(run, 'market-restored-notes');
  await notes(run.frame, false);
  // Reach the main continuation with the user's original allocation restored.
  await click(run.frame, '各家都少开工 →');
  await click(run.frame, '再少开工一次 →');
  await click(run.frame, '为什么会互相影响？ →');
  await scene(run.frame, 'network', { relation: 'cooperation' });
  await click(run.frame, '暂停零件供货');
  assert.equal((await saved(run.frame)).workPaused, true);
  await checkpoint(run, 'cooperation-paused');
  await notes(run.frame, true);
  await checkpoint(run, 'cooperation-notes');
  await notes(run.frame, false);
  await click(run.frame, '恢复零件供货');
  assert.equal((await saved(run.frame)).workPaused, false);
  await click(run.frame, '看看谁作主 →');
  await scene(run.frame, 'network', { relation: 'ownership' });
  await click(run.frame, '继续 →');
  await scene(run.frame, 'concept');
  assert.equal((await saved(run.frame)).definitionShown, true);
  await checkpoint(run, 'concept');
  await click(run.frame, '继续 →');
  await scene(run.frame, 'ending');
  for (const [index, pair] of ENDING_PAIRS.entries()) {
    assert.match(
      await run.frame.locator('#readout').textContent(),
      new RegExp(pair.daughter),
    );
    assert(
      (await run.frame.locator('#readout').textContent()).includes(pair.father),
    );
    assert.equal((await saved(run.frame)).endingPairIndex, index);
    if (index < 2) await click(run.frame, '继续听 →');
  }
  await checkpoint(run, 'coal-ending');
  await click(run.frame, '有没有别的出路？ →');
  await scene(run.frame, 'relief', { 'relief-route': 'menu' });
  await checkpoint(run, 'relief-menu');
  for (const [route, label, condition] of [
    ['consumption', '增加消费 →', '试试：下期工资也增加'],
    ['investment', '增加投资 →', '试试：下游消费也多10份'],
    ['exports', '增加出口 →', '试试：海外订单持续'],
  ]) {
    await click(run.frame, label);
    await scene(run.frame, 'relief', { 'relief-route': route });
    let account = (await payload(run.frame)).relief;
    assert.deepEqual(
      [
        account.output,
        account.demand,
        account.sold,
        account.unsold,
        account.nextUnsold,
      ],
      [50, 50, 50, 0, 10],
    );
    assert.deepEqual(await metricValues(run.frame), {
      这期卖出: 50,
      下期卖出: route === 'investment' ? 50 : 40,
      下期剩下: 10,
    });
    assert.deepEqual((await saved(run.frame)).allocationPlans, choices);
    reliefEvidence.push({ label: spec.label, ...account });
    await checkpoint(run, `relief-${route}-once`);
    await click(run.frame, condition);
    account = (await payload(run.frame)).relief;
    close(account.nextUnsold, 0);
    assert.equal(account.sustained, true);
    assert.deepEqual(await metricValues(run.frame), {
      这期卖出: 50,
      下期卖出: route === 'investment' ? 60 : 50,
      下期剩下: 0,
    });
    reliefEvidence.push({ label: spec.label, ...account });
    await checkpoint(run, `relief-${route}-continued`);
    if (route === 'investment') {
      await reload(run, 'relief', { 'relief-route': route });
      assert.equal((await saved(run.frame)).reliefSustained, true);
      close((await payload(run.frame)).relief.nextUnsold, 0);
      await checkpoint(run, 'relief-investment-reloaded', false);
    }
    await click(run.frame, '还原原来的条件 ↺');
    close((await payload(run.frame)).relief.nextUnsold, 10);
    await click(run.frame, '换条路比较 →');
    await scene(run.frame, 'relief', { 'relief-route': 'menu' });
  }
  assert.deepEqual((await saved(run.frame)).reliefVisited, [
    'consumption',
    'investment',
    'exports',
  ]);
  await click(run.frame, '带着这个问题，继续 →');
  await scene(run.frame, 'routes');
  assert.equal((await saved(run.frame)).entrance, null);
  await checkpoint(run, 'roles');
  await click(run.frame, '我是工人 →');
  await scene(run.frame, 'machine', {
    role: 'worker',
    'machine-phase': 'quote',
  });
  await notes(run.frame, true);
  await click(run.frame, '← 回到入口');
  await scene(run.frame, 'routes');
  await click(run.frame, '我是老板 →');
  await scene(run.frame, 'machine', {
    role: 'producer',
    'machine-phase': 'quote',
  });
  await click(run.frame, '去工厂 →');
  await click(run.frame, '会更多');
  await click(run.frame, '会跟着涨');
  await click(run.frame, '能早些走');
  await click(run.frame, '换上新机器 →');
  await scene(run.frame, 'machine', { 'machine-phase': 'result' });
  await click(run.frame, '试试别的约定 →');
  await click(run.frame, '缩时');
  assert.equal(
    await run.frame.locator('[data-metric="hours"] strong').textContent(),
    '4',
  );
  assert.equal(
    await run.frame.locator('[data-metric="products"] strong').textContent(),
    '8',
  );
  await checkpoint(run, 'machine-still-works');
  await click(run.frame, '返回 →');
  await scene(run.frame, 'routes');
  assert.deepEqual((await saved(run.frame)).allocationPlans, choices);
  await run.context.close();
  record(
    `${spec.label}: real-click full journey, cut and relief reloads, three conditional routes, roles and original machine`,
  );
}

try {
  browser = await chromium.launch(browserLaunchOptions());
  await baseline();
  for (const spec of [
    { label: 'desktop-1280-normal', width: 1280, height: 900, reduced: false },
    { label: 'mobile-390-normal', width: 390, height: 844, reduced: false },
    { label: 'mobile-320-reduced', width: 320, height: 740, reduced: true },
    {
      label: 'file-offline-reduced',
      width: 1280,
      height: 900,
      reduced: true,
      offline: true,
    },
  ])
    await journey(spec);
  assert.deepEqual(runtimeErrors, []);
  assert.deepEqual(externalRequests, []);
  assert.deepEqual(writeRequests, []);
  record(
    'No runtime errors, console errors, external requests or write requests',
  );
  const report = {
    date: new Date().toISOString(),
    status: 'PASS',
    browser: 'Isolated headless Chromium/Edge',
    buildBytes,
    buildSha256,
    cases,
    caseCount: cases.length,
    realClicks,
    reloads,
    screenshotCount: screenshots.length,
    screenshots,
    checkpointCount: checkpoints.length,
    checkpoints,
    marketEvidence,
    reliefEvidence,
    runtimeErrors,
    externalRequests,
    writeRequests,
    scope:
      'New crisis prologue full real-click journeys, default baseline, original actors, preserved allocations and existing machine handoff',
  };
  await fs.writeFile(
    path.join(output, 'report.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        status: report.status,
        buildBytes,
        buildSha256,
        caseCount: cases.length,
        realClicks,
        reloads,
        screenshotCount: screenshots.length,
        checkpointCount: checkpoints.length,
        marketChecks: marketEvidence.length,
        reliefChecks: reliefEvidence.length,
        runtimeErrors,
        externalRequests,
        writeRequests,
      },
      null,
      2,
    ),
  );
} catch (error) {
  if (latestPage && !latestPage.isClosed()) {
    try {
      await latestPage.screenshot({
        path: path.join(output, 'failure.png'),
        fullPage: true,
      });
      screenshots.push('failure.png');
    } catch {}
  }
  await fs.writeFile(
    path.join(output, 'report.json'),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        status: 'FAIL',
        buildBytes,
        buildSha256,
        error: error.stack || String(error),
        cases,
        realClicks,
        reloads,
        screenshots,
        checkpoints,
        marketEvidence,
        reliefEvidence,
        runtimeErrors,
        externalRequests,
        writeRequests,
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
