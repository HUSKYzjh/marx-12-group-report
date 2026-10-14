import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BASIC_CONTRADICTION, ENDING_PAIRS, PROLOGUE_STORAGE_KEY } from '../lib/prologue-state.ts';

// Test the delivered, offline document, including its real original-engine iframe.
// Do not connect to, change, or clear the user's own browser session.
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const { loadPlaywright, browserLaunchOptions } = require('./playwright-runtime.cjs');
const { chromium } = loadPlaywright();
const output = path.join(root, 'outputs/trust-qa');
await fs.mkdir(output, { recursive: true });
const document = await fs.readFile(path.join(root, 'build/index.html'));
const buildBytes = document.length, buildSha256 = createHash('sha256').update(document).digest('hex');
const server = http.createServer((req, res) => {
  if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(document);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const cases = [], snapshots = [], runtimeErrors = [], externalRequests = [], writeRequests = [], transitionEvidence = [];
let browser, latestPage;

const button = (frame, name) => frame.getByRole('button', { name, exact: true });
const record = name => { cases.push(name); console.log(`PASS ${name}`); };
const numberIn = value => new RegExp(`(?:^|\\D)${value}(?:\\D|$)`);
const scene = (frame, name) => frame.locator(`body[data-scene="${name}"]`).waitFor();
const machinePhase = (frame, name) => frame.locator(`body[data-machine-phase="${name}"]`).waitFor();
async function settled(frame) {
  await frame.waitForFunction(() => !document.body.hasAttribute('data-transition')
    && document.querySelector('main')?.getAttribute('aria-busy') !== 'true'
    && (typeof Tween === 'undefined' || !Tween.hasActiveTweens()), null, { timeout: 6000 });
}
async function click(frame, name) { await settled(frame); await button(frame, name).click(); }
async function attachedFrame(page) {
  await page.locator('iframe[data-testid="trust-frame"]').waitFor();
  const handle = await page.locator('iframe[data-testid="trust-frame"]').elementHandle();
  const frame = await handle.contentFrame();
  assert(frame, 'The original-engine iframe must have a browsing context');
  await frame.locator('body[data-ready="true"]').waitFor();
  await frame.locator('#slideshow canvas').waitFor();
  return frame;
}
async function contextPage(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options });
  const page = await context.newPage();
  latestPage = page;
  observe(page);
  await page.goto(url);
  return { context, page, frame: await attachedFrame(page) };
}
function observe(page, permittedURL = url) {
  latestPage = page;
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('request', request => {
    const address = request.url();
    if (!address.startsWith(permittedURL) && !/^(?:data:|blob:|about:)/.test(address)) externalRequests.push(address);
    if (!['GET', 'HEAD'].includes(request.method())) writeRequests.push(`${request.method()} ${address}`);
  });
}
async function screenshot(page, name, intermediate = false) {
  const child = page.frames().find(frame => frame !== page.mainFrame() && frame.url() === 'about:srcdoc');
  if (!intermediate && child && await child.evaluate(() => typeof Tween !== 'undefined' && typeof Tween.hasActiveTweens === 'function')) {
    // Playwright's CSS-animation switch does not settle original TweenJS canvas motion.
    await settled(child);
    await child.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }
  const filename = `${name}.png`;
  await page.screenshot({ path: path.join(output, filename), fullPage: true, animations: intermediate ? 'allow' : 'disabled' });
  snapshots.push(filename);
  console.log(`SCREENSHOT ${filename}`);
}
async function noOverflow(page, frame) {
  for (const [scope, context] of [['host', page], ['original-engine frame', frame]]) {
    const bounds = await context.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert(bounds.scrollWidth <= bounds.width + 1, `${scope} horizontal overflow: ${JSON.stringify(bounds)}`);
  }
  const canvas = await frame.locator('#slideshow canvas').evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return { x: bounds.x, width: bounds.width, height: bounds.height, intrinsicWidth: element.width, intrinsicHeight: element.height };
  });
  assert(canvas && canvas.width > 0 && canvas.height > 0, 'The stage must be visibly sized');
  const frameWidth = await frame.evaluate(() => innerWidth);
  assert(canvas.x >= -1 && canvas.x + canvas.width <= frameWidth + 1, 'The canvas must fit the frame width');
  assert(Math.abs(canvas.width / canvas.height - canvas.intrinsicWidth / canvas.intrinsicHeight) < .01,
    'The original canvas composition must be scaled proportionally, not stretched');
  const vertical = await frame.evaluate(() => {
    const children = [...document.body.children].filter(element => ['HEADER', 'MAIN', 'FOOTER'].includes(element.tagName));
    return { viewport: innerHeight, content: Math.max(...children.map(element => element.getBoundingClientRect().bottom)) };
  });
  assert(vertical.viewport - vertical.content <= 120, `Iframe height feedback leaves excessive empty space: ${JSON.stringify(vertical)}`);
}
async function headingSpace(frame) {
  const positions = await frame.evaluate(() => {
    const heading = document.getElementById('heading').getBoundingClientRect();
    const introduction = document.getElementById('situation');
    const situation = introduction.getBoundingClientRect();
    return { headingBottom: heading.bottom, situationTop: situation.top,
      introductionVisible: getComputedStyle(introduction).display !== 'none' && situation.height > 0 };
  });
  if (!positions.introductionVisible) return;
  assert(positions.headingBottom <= positions.situationTop + 1, `Title and introduction collide: ${JSON.stringify(positions)}`);
}
async function typography(frame) {
  const sizes = await frame.evaluate(() => {
    const bodySize = getComputedStyle(document.body).fontSize;
    const heading = document.getElementById('heading');
    const titleSize = getComputedStyle(heading).fontSize;
    const selector = '#situation, #controls > button, #controls .choice, #controls .secondary, '
      + '#controls output, #controls output strong, .company-share, .retained-share, '
      + '[data-metric], [data-metric] strong, [data-metric] span, #readout .definition, #readout .dialogue span';
    const text = [...document.querySelectorAll(selector)].filter(element => {
      const bounds = element.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0 && element.textContent.trim();
    }).map(element => ({ label: element.textContent.trim(), size: getComputedStyle(element).fontSize }));
    const emphasis = [...heading.querySelectorAll('strong')].map(element => getComputedStyle(element).fontSize);
    return { bodySize, titleSize, text, emphasis };
  });
  for (const item of sizes.text) assert.equal(item.size, sizes.bodySize,
    `Core copy, controls and real numerical metrics share one body size: ${JSON.stringify(item)}`);
  for (const size of sizes.emphasis) assert.equal(size, sizes.titleSize, 'Title emphasis must not create an additional font size');
}
async function stageIdentity(frame, initialize = false) {
  const same = await frame.evaluate(initialize => {
    const stage = window.slideshow?.objects?.stage || window.__trustStage;
    if (!stage) return false;
    if (initialize) { window.__qaTrustStage = stage; window.__qaTrustPeople = stage.people.slice(); return stage.people.length === 13; }
    return stage === window.__qaTrustStage && stage.people.length === 13
      && stage.people.every((person, index) => person === window.__qaTrustPeople[index]);
  }, initialize);
  assert(same, 'Ordinary slides must retain the stage and all thirteen semantic person objects');
}
async function semanticPeople(frame, focus) {
  await settled(frame);
  const actors = await frame.evaluate(() => {
    const stage = window.slideshow.objects.stage;
    return stage.people.map((person, index) => ({ index, visible: person.graphics.visible,
      hat: person.hat.currentFrame, hatVisible: person.hat.visible, original: person instanceof IteratedPeep }));
  });
  const snapshot = await saved(frame);
  const firm = 'ABCD'.indexOf(await frame.locator('body').getAttribute('data-firm'));
  const customer = 'ABCD'.indexOf(snapshot?.customerFirmId || await frame.locator('body').getAttribute('data-firm'));
  const visible = focus === 'allocation' ? [firm, firm + 4] : focus === 'customers' ? [customer]
    : focus === 'cooperation' ? [firm, 10, 11, 12] : focus === 'ownership' ? [firm, firm + 4, 10, 11, 12] : [8, 9];
  assert.deepEqual(actors.filter(actor => actor.visible).map(actor => actor.index), visible.sort((a, b) => a - b),
    `Visible semantic identities in ${focus}`);
  for (const actor of actors) assert(actor.original);
  if (focus !== 'ending') assert.equal(actors[focus === 'customers' ? customer : firm].hat, 12,
    'The same company worker retains the same hat across the prologue');
  await stageIdentity(frame);
}
async function fontLoaded(frame) {
  const font = await frame.evaluate(async () => {
    await document.fonts.ready;
    const loaded = await document.fonts.load('20px "WorkshopHand"', '工人机器');
    return { count: loaded.length, loaded: [...document.fonts].some(face => /WorkshopHand/.test(face.family) && face.status === 'loaded') };
  });
  assert(font.count > 0 && font.loaded, 'The delivered embedded handwriting must actually load');
}
async function traceStart(frame, lock = null) {
  await frame.evaluate(lock => {
    if (window.__qaTrace) window.__qaTrace.active = false;
    const trace = { active: true, samples: [], lock: lock && { ...lock, attempted: 0 } }; window.__qaTrace = trace;
    function capture() {
      const scratch = document.getElementById('scene-scratch'), worker = window.slideshow.objects.stage.people[0];
      trace.samples.push({ phase: document.body.dataset.transition || 'none', scene: document.body.dataset.scene,
        busy: document.querySelector('main').getAttribute('aria-busy') === 'true',
        scratch: getComputedStyle(scratch).display, background: scratch.style.backgroundPosition,
        opacity: Number(getComputedStyle(document.getElementById('heading')).opacity),
        workerX: worker.graphics.x, workerY: worker.graphics.y, link: window.slideshow.objects.stage.linkProgress.value });
      if (trace.lock && !trace.lock.attempted && document.body.dataset.scene === trace.lock.scene
        && document.body.dataset.transition === trace.lock.phase) {
        const target = [...document.querySelectorAll('button')].find(element =>
          element.getAttribute('aria-label') === trace.lock.label || element.textContent === trace.lock.label);
        if (target) { trace.lock.attempted++; target.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
      }
    }
    const observer = new MutationObserver(capture); trace.observer = observer;
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-transition', 'data-scene'] });
    function tick() { if (!trace.active) return; capture(); requestAnimationFrame(tick); } tick();
  }, lock);
}
async function traceStop(frame, label, kind, expectedScenes = []) {
  await settled(frame);
  const result = await frame.evaluate(() => {
    window.__qaTrace.active = false; window.__qaTrace.observer.disconnect();
    return { samples: window.__qaTrace.samples, lock: window.__qaTrace.lock };
  });
  const trace = result.samples;
  if (result.lock) assert.equal(result.lock.attempted, 1, 'The lock probe actually dispatched input during the intermediate scene');
  const phases = [...new Set(trace.map(sample => sample.phase))];
  if (kind === 'chapter') {
    assert(phases.includes('chapter'), 'Normal chapter transition has a real intermediate cover');
    assert(trace.some(sample => sample.phase === 'chapter' && sample.scratch === 'block'));
    assert(new Set(trace.filter(sample => sample.phase === 'chapter').map(sample => sample.background)).size > 1,
      'The original scratch atlas changes frames, not only a transition flag');
    for (const name of expectedScenes) assert(trace.some(sample => sample.phase === 'chapter' && sample.scene === name),
      `The scratch cover visibly spans ${name}`);
  } else if (kind === 'small') {
    for (const phase of ['out', 'in', 'settling']) assert(phases.includes(phase), `Small transition exposes ${phase}`);
    assert(trace.some(sample => sample.opacity > 0 && sample.opacity < 1), 'Text really fades through intermediate opacity');
    const points = trace.map(sample => sample.workerX), low = Math.min(...points), high = Math.max(...points);
    assert(high - low > 100 && points.some(value => value > low + 2 && value < high - 2),
      'The original worker moves through intermediate coordinates, not an instant redraw');
    assert(trace.some(sample => sample.link > 0 && sample.link < 1), 'Relationship lines grow through intermediate progress');
  } else assert.deepEqual(phases, ['none'], 'Reduced motion bypasses chapter covers and fades entirely');
  for (const sample of trace) if (sample.phase !== 'none') assert(sample.busy, 'The main region is input-locked during transitions');
  transitionEvidence.push({ label, kind, phases, lockedInput: result.lock, samples: trace });
}
async function startWithTransitionCheck(frame, page) {
  // The in-frame observer fires during the cover, even when a screenshot round trip outlasts it.
  await traceStart(frame, { scene: 'allocation', phase: 'chapter', label: '给工人增加10个百分点' });
  await button(frame, '开始 →').click();
  await frame.locator('body[data-transition="chapter"]').waitFor();
  await screenshot(page, 'desktop-chapter-opening-allocation', true);
  await scene(frame, 'allocation');
  await traceStop(frame, 'opening → allocation cover and locked allocation input', 'chapter', ['opening', 'allocation']);
  assert.equal((await frame.getByTestId('labor-share').textContent()).trim(), '50%');
}
async function saved(frame) {
  return frame.evaluate(key => JSON.parse(localStorage.getItem(key)), PROLOGUE_STORAGE_KEY);
}
async function expressions(frame, shareValue) {
  const actors = await frame.evaluate(() => [0, 4].map(index => window.slideshow.objects.stage.people[index]).map(actor => ({
    originalInstance: actor instanceof IteratedPeep, face: actor.face.currentFrame,
    brow: actor.eyebrows.currentFrame, browsVisible: actor.eyebrows.visible, resting: actor.restingFace,
  })));
  const workerMood = shareValue <= 20 ? -2 : shareValue <= 40 ? -1 : shareValue === 50 ? 0 : shareValue <= 70 ? 1 : 2;
  for (const [index, mood] of [workerMood, -workerMood].entries()) {
    const actor = actors[index];
    assert(actor.originalInstance, 'Both characters must be actual original IteratedPeep instances');
    if (Math.abs(mood) === 2) {
      assert.equal(actor.face, mood > 0 ? 8 : 9, 'Extreme original facial frames must face in opposite directions');
      assert.equal(actor.resting, false); assert.equal(actor.browsVisible, false);
    } else {
      assert([1, 2].includes(actor.face), 'Mild/neutral characters may show original resting or blink frame');
      assert.equal(actor.resting, true); assert.equal(actor.browsVisible, mood !== 0);
      if (mood) assert.equal(actor.brow, mood > 0 ? 4 : 5);
    }
  }
}
async function coinAllocation(frame, value) {
  await frame.waitForFunction(() => !Tween.hasActiveTweens(), null, { timeout: 5000 });
  const coins = await frame.evaluate(() => {
    const stage = window.slideshow.objects.stage;
    return { count: stage.coins.filter(coin => coin.visible).length,
      worker: stage.coins.filter(coin => coin.visible && coin.x < stage.width / 2).length };
  });
  assert.equal(coins.count, 10, 'The allocation has ten visible original atlas coins');
  assert.equal(coins.worker, value / 10, 'A visible coin represents ten percentage points and follows the allocation');
}
async function share(frame, target) {
  const current = Number((await frame.getByTestId('labor-share').textContent()).replace('%', ''));
  assert(Number.isInteger(current) && current >= 0 && current <= 100, `Invalid initial share ${current}`);
  const name = target > current ? '给工人增加10个百分点' : '给工人减少10个百分点';
  for (let value = current; value !== target; value += target > current ? 10 : -10) {
    await click(frame, name);
    await frame.getByTestId('labor-share').filter({ hasText: `${value + (target > current ? 10 : -10)}%` }).waitFor();
  }
  assert.equal((await frame.getByTestId('labor-share').textContent()).trim(), `${target}%`);
  if (await frame.getByTestId('retained-share').count())
    assert.equal((await frame.getByTestId('retained-share').textContent()).trim(), `${100 - target}%`);
}
async function companies(frame, target = 70, testLock = false, page) {
  // The main story asks for one decision, not the same task four times.
  // Other company decisions are NPC context; optional switching is tested separately.
  await share(frame, target);
  await semanticPeople(frame, 'allocation');
  if (testLock) await traceStart(frame, { scene: 'network', phase: 'in', label: '多分一些' });
  await click(frame, '看看谁来买 →');
  await scene(frame, 'network');
  if (testLock) {
    await screenshot(page, 'desktop-allocation-customers-transition', true);
    await traceStop(frame, 'allocation → customers move, fade and locked what-if input', 'small');
  }
  await settled(frame);
  if (testLock) assert.equal((await saved(frame)).demoActive, false, 'A covered/fading scene rejects further actions');
  await semanticPeople(frame, 'customers');
  await stageIdentity(frame);
}
async function optionalCompanySwitching(frame) {
  await share(frame, 70);
  await frame.locator('#notes > summary').click();
  await click(frame, 'B · 手机公司'); await frame.locator('body[data-firm="B"]').waitFor();
  await semanticPeople(frame, 'allocation');
  assert.equal((await frame.getByTestId('labor-share').textContent()).trim(), '50%');
  await share(frame, 30);
  await click(frame, 'A · 汽车公司'); await frame.locator('body[data-firm="A"]').waitFor();
  assert.equal((await frame.getByTestId('labor-share').textContent()).trim(), '70%');
  await click(frame, 'B · 手机公司'); await frame.locator('body[data-firm="B"]').waitFor();
  assert.equal((await frame.getByTestId('labor-share').textContent()).trim(), '30%');
  await share(frame, 50);
  await click(frame, 'A · 汽车公司'); await frame.locator('body[data-firm="A"]').waitFor();
  await frame.locator('#notes > summary').click(); await stageIdentity(frame);
}
async function network(frame, page, prefix, reloadComparisons = false) {
  const personal = (await saved(frame))?.allocationPlans;
  async function preserved() {
    if (personal) assert.deepEqual((await saved(frame)).allocationPlans, personal,
      'Comparisons and supply interruption must retain every personal allocation');
  }
  async function compare(label, expected) {
    await click(frame, label);
    await frame.locator('#readout').filter({ hasText: `工人拿到${expected}%` }).waitFor();
    await settled(frame);
    await button(frame, label).and(frame.locator('button[aria-pressed="true"]')).waitFor();
    assert.equal((await saved(frame))?.demoLaborShare, expected);
    await preserved(); await semanticPeople(frame, 'customers');
    assert.equal(await frame.evaluate(() => window.slideshow.objects.stage.coins.filter(coin => coin.visible).length),
      expected / 10, 'The independent comparison visibly changes the money available to this worker');
    await noOverflow(page, frame);
  }
  await compare('少分一些', 20);
  if (prefix) await screenshot(page, `${prefix}-customers-20`);
  if (reloadComparisons) {
    await page.reload(); frame = await attachedFrame(page); await stageIdentity(frame, true);
    await frame.locator('#readout').filter({ hasText: '工人拿到20%' }).waitFor();
    assert.equal((await saved(frame)).demoActive, true); await preserved();
  }
  await compare('多分一些', 80);
  if (prefix) await screenshot(page, `${prefix}-customers-80`);
  if (reloadComparisons) {
    await page.reload(); frame = await attachedFrame(page); await stageIdentity(frame, true);
    await frame.locator('#readout').filter({ hasText: '工人拿到80%' }).waitFor();
    assert.equal((await saved(frame)).demoLaborShare, 80); await preserved();
  }
  await click(frame, '还原分法');
  const active = (await saved(frame))?.customerFirmId || 'A';
  const original = personal?.[active]?.laborShare || 70;
  await frame.locator('#readout').filter({ hasText: `按你的分法：这一笔，工人拿到${original}%` }).waitFor();
  assert.equal((await saved(frame))?.demoActive, false); await preserved();
  await click(frame, '再看怎么生产 →');
  await frame.locator('body[data-relation="cooperation"]').waitFor();
  await semanticPeople(frame, 'cooperation');
  await noOverflow(page, frame);
  assert.equal(await frame.evaluate(() => window.slideshow.objects.stage.machine.visible), true,
    'The original old machine is present in the cooperation stage');
  const links = await frame.evaluate(() => window.slideshow.objects.stage.paths.length);
  assert.equal(links, 4, 'Each necessary supplier has a distinct link to production');
  if (prefix) await screenshot(page, `${prefix}-cooperation`);
  await click(frame, '暂停零件供货');
  await frame.locator('#readout').filter({ hasText: '零件没送来，这件东西还做不完。' }).waitFor();
  await settled(frame);
  assert.equal(await frame.evaluate(() => window.slideshow.objects.stage.people[11].graphics.alpha), .25);
  assert.equal(await frame.evaluate(() => window.slideshow.objects.stage.paths.length), links - 1);
  assert.equal(await frame.locator('[data-metric]').count(), 0, 'Supply interruption does not invent numerical production results');
  assert.equal((await saved(frame))?.workPaused, true); await preserved();
  await noOverflow(page, frame);
  if (prefix) await screenshot(page, `${prefix}-cooperation-paused`);
  if (reloadComparisons) {
    await page.reload(); frame = await attachedFrame(page); await stageIdentity(frame, true);
    assert.equal((await saved(frame)).workPaused, true);
    assert.equal(await frame.evaluate(() => window.slideshow.objects.stage.people[11].graphics.alpha), .25);
    assert.equal(await frame.evaluate(() => window.slideshow.objects.stage.paths.length), links - 1);
    await preserved();
  }
  await click(frame, '恢复零件供货');
  await frame.locator('#readout').filter({ hasText: '接成一条线' }).waitFor(); await settled(frame);
  assert.equal(await frame.evaluate(() => window.slideshow.objects.stage.people[11].graphics.alpha), 1);
  assert.equal(await frame.evaluate(() => window.slideshow.objects.stage.paths.length), links);
  assert.equal((await saved(frame))?.workPaused, false); await preserved();
  await click(frame, '看看谁作主 →');
  await frame.locator('body[data-relation="ownership"]').waitFor();
  await semanticPeople(frame, 'ownership');
  await noOverflow(page, frame);
  assert.equal(await frame.evaluate(() => window.slideshow.objects.stage.machine.visible), true);
  if (prefix) await screenshot(page, `${prefix}-ownership`);
  await click(frame, '继续 →');
  await scene(frame, 'concept');
  await settled(frame); await stageIdentity(frame);
  assert.equal(await frame.evaluate(() => window.slideshow.objects.stage.machine.visible), true);
  assert((await frame.locator('body').textContent()).includes(BASIC_CONTRADICTION));
  return frame;
}
async function ending(frame, page, prefix, testTransition = false) {
  if (testTransition) await traceStart(frame);
  await click(frame, '继续 →');
  if (testTransition) {
    await frame.locator('body[data-transition="chapter"]').waitFor();
    await screenshot(page, 'desktop-chapter-concept-ending', true);
    await scene(frame, 'ending');
    await traceStop(frame, 'concept → coal ending scratch cover', 'chapter', ['concept', 'ending']);
  } else await scene(frame, 'ending');
  await semanticPeople(frame, 'ending');
  for (let index = 0; index < ENDING_PAIRS.length; index++) {
    await frame.locator('#readout').filter({ hasText: ENDING_PAIRS[index].daughter }).waitFor();
    await typography(frame);
    const text = await frame.locator('body').textContent();
    assert(text.includes(ENDING_PAIRS[index].daughter), 'Daughter dialogue must retain the supplied wording');
    assert(text.includes(ENDING_PAIRS[index].father), 'Father dialogue must retain the supplied wording');
    await noOverflow(page, frame);
    assert.equal(await button(frame, '个人 →').count(), 0, 'The ending must not repeat role selection');
    assert.equal(await button(frame, '企业 →').count(), 0, 'The ending must not repeat role selection');
    if (prefix) await screenshot(page, `${prefix}-ending-${index + 1}`);
    if (index < ENDING_PAIRS.length - 1) await click(frame, '继续听 →');
  }
  assert.equal(await frame.locator('#controls > button').count(), 1, 'The final dialogue has exactly one next step');
  await click(frame, '换个位置 →');
  await scene(frame, 'routes');
  await settled(frame); await stageIdentity(frame);
  assert.equal((await saved(frame))?.entrance, null, 'Reading the ending never silently chooses a role');
  assert.equal(await button(frame, '我是工人 →').count(), 1);
  assert.equal(await button(frame, '我是老板 →').count(), 1);
  await noOverflow(page, frame);
}
async function machine(frame, entrance = 'individual') {
  if (await frame.locator('body').getAttribute('data-scene') === 'routes') {
    await click(frame, entrance === 'enterprise' ? '我是老板 →' : '我是工人 →');
    await scene(frame, 'machine'); await settled(frame);
    const view = await frame.evaluate(() => JSON.parse(localStorage.getItem('technology-dividend:active-view:v1')));
    assert.equal(view?.entrance, entrance, 'The active-view snapshot retains the one selected role');
    assert.equal(view?.view, 'experiment');
    assert.equal(await frame.locator('body').getAttribute('data-role'), entrance === 'enterprise' ? 'producer' : 'worker',
      'One route choice starts the selected role immediately');
    assert.equal(await button(frame, '我是工人 →').count(), 0);
    assert.equal(await button(frame, '我是老板 →').count(), 0);
  }
  const start = button(frame, '去看看新机器 →');
  if (await start.count() && await start.isVisible()) await click(frame, '去看看新机器 →');
  await click(frame, '去工厂 →');
  await machinePhase(frame, 'predict'); await typography(frame);
  await click(frame, '会更多');
  await click(frame, '会跟着涨');
  await click(frame, '能早些走');
  await click(frame, '换上新机器 →');
  await machinePhase(frame, 'result');
  await settled(frame);
  const metrics = async () => {
    const values = {};
    for (const name of ['products', 'wages', 'hours'])
      values[name] = (await frame.locator(`[data-metric="${name}"]`).textContent()).replace(/\s+/g, ' ').trim();
    return values;
  };
  const result = await metrics();
  assert.match(result.products, numberIn(16)); assert.match(result.wages, numberIn(4)); assert.match(result.hours, numberIn(8));
  await click(frame, '试试别的约定 →');
  await machinePhase(frame, 'compare');
  await settled(frame); await click(frame, '加薪');
  await button(frame, '加薪').and(frame.locator('button[aria-pressed="true"]')).waitFor();
  assert.match((await metrics()).wages, numberIn(6));
  await click(frame, '缩时');
  await button(frame, '缩时').and(frame.locator('button[aria-pressed="true"]')).waitFor();
  const shorter = await metrics();
  assert.match(shorter.products, numberIn(8)); assert.match(shorter.wages, numberIn(4)); assert.match(shorter.hours, numberIn(4));
  await click(frame, '照旧');
  await button(frame, '照旧').and(frame.locator('button[aria-pressed="true"]')).waitFor();
  assert.deepEqual(await metrics(), result);
  await click(frame, '缩时');
  await button(frame, '缩时').and(frame.locator('button[aria-pressed="true"]')).waitFor();
}

try {
  browser = await chromium.launch(browserLaunchOptions());
  const { context, page, frame: initialFrame } = await contextPage();
  let frame = initialFrame;
  const engines = await frame.evaluate(() => ({
    pixi: typeof PIXI === 'object', slides: typeof Slideshow === 'function',
    peep: typeof IteratedPeep === 'function', tween: typeof Tween === 'object' || typeof Tween === 'function',
  }));
  assert.deepEqual(engines, { pixi: true, slides: true, peep: true, tween: true });
  await stageIdentity(frame, true);
  assert.equal(await frame.evaluate(() => window.slideshow.objects.stage.app.renderer instanceof PIXI.CanvasRenderer), true,
    'The offline build must use real Pixi CanvasRenderer without relaxing CSP for WebGL eval');
  assert.notEqual(await button(frame, '开始 →').evaluate(element => getComputedStyle(element).color), 'rgb(255, 255, 255)',
    'Original white/outlined button art must not hide its label with white text');
  await fontLoaded(frame);
  await screenshot(page, 'desktop-opening');
  await headingSpace(frame);
  await startWithTransitionCheck(frame, page); await stageIdentity(frame);
  assert((await frame.locator('body').textContent()).includes('你们的产品上个季度销量不错'));
  await typography(frame);
  await share(frame, 0);
  await expressions(frame, 0);
  assert(await button(frame, '给工人减少10个百分点').isDisabled());
  await screenshot(page, 'desktop-share-0');
  await coinAllocation(frame, 0);
  for (let value = 10; value <= 100; value += 10) {
    await share(frame, value); await expressions(frame, value);
    if (value === 50) { await screenshot(page, 'desktop-share-50'); await coinAllocation(frame, value); }
  }
  assert(await button(frame, '给工人增加10个百分点').isDisabled());
  await screenshot(page, 'desktop-share-100');
  await coinAllocation(frame, 100);
  await noOverflow(page, frame);
  record('Real Pixi CanvasRenderer, Slideshow, IteratedPeep and Tween; 11 allocations, five opposite facial bands, both limits, uniform body typography');
  await optionalCompanySwitching(frame);
  record('Company switching is optional in details and preserves each independent choice');
  await companies(frame, 70, true, page);
  const personal = (await saved(frame)).allocationPlans;
  assert.deepEqual(Object.values(personal).map(plan => plan.laborShare), [70, 50, 50, 50]);
  await screenshot(page, 'desktop-network');
  await page.reload(); frame = await attachedFrame(page);
  assert.deepEqual((await saved(frame)).allocationPlans, personal);
  await stageIdentity(frame, true);
  record('One-company main decision, unchanged NPC plans and reload persistence');
  frame = await network(frame, page, 'desktop', true); await screenshot(page, 'desktop-concept');
  await ending(frame, page, 'desktop', true);
  assert.deepEqual((await saved(frame)).allocationPlans, personal);
  record('Persistent semantic actors, real chapter/fade transitions and input locks, independent 20/80 comparisons and supply pause with reload, exact definition and dialogue, one role choice');
  await machine(frame, 'enterprise'); await noOverflow(page, frame); await typography(frame);
  assert.equal(await frame.locator('body').getAttribute('data-role'), 'producer');
  await screenshot(page, 'desktop-machine-compare');
  await page.reload(); frame = await attachedFrame(page);
  assert.match((await frame.locator('[data-metric="hours"]').textContent()), numberIn(4));
  assert.deepEqual((await saved(frame)).allocationPlans, personal);
  await click(frame, '返回 →'); await scene(frame, 'routes'); await settled(frame);
  record('New-machine predictions, unchanged/pay/time contracts, machine reload and return');
  await context.close();

  for (const width of [390, 320]) {
    const { context: mobileContext, page: mobile, frame: mobileFrame } = await contextPage({
      viewport: { width, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1,
    });
    await stageIdentity(mobileFrame, true); await noOverflow(mobile, mobileFrame);
    await fontLoaded(mobileFrame);
    await screenshot(mobile, `mobile-${width}-opening`);
    await headingSpace(mobileFrame);
    await click(mobileFrame, '开始 →'); await scene(mobileFrame, 'allocation'); await settled(mobileFrame);
    await share(mobileFrame, 100); await noOverflow(mobile, mobileFrame); await typography(mobileFrame);
    await coinAllocation(mobileFrame, 100);
    await screenshot(mobile, `mobile-${width}-allocation`);
    await coinAllocation(mobileFrame, 100);
    await mobileFrame.locator('#notes > summary').click();
    await coinAllocation(mobileFrame, 100); await stageIdentity(mobileFrame);
    await mobileFrame.locator('#notes > summary').click();
    await coinAllocation(mobileFrame, 100);
    await companies(mobileFrame); await noOverflow(mobile, mobileFrame);
    await screenshot(mobile, `mobile-${width}-network`);
    await network(mobileFrame, mobile, `mobile-${width}`); await noOverflow(mobile, mobileFrame); await typography(mobileFrame);
    await screenshot(mobile, `mobile-${width}-concept`);
    await ending(mobileFrame, mobile, `mobile-${width}`);
    await machine(mobileFrame); await noOverflow(mobile, mobileFrame); await typography(mobileFrame);
    assert.equal(await mobileFrame.locator('body').getAttribute('data-role'), 'worker');
    await screenshot(mobile, `mobile-${width}-machine`);
    await click(mobileFrame, '返回 →'); await scene(mobileFrame, 'routes'); await settled(mobileFrame);
    await mobileContext.close(); record(`${width}px complete touch journey without horizontal overflow`);
  }

  const { context: reducedContext, page: reduced, frame: reducedFrame } = await contextPage({ reducedMotion: 'reduce' });
  assert.equal(await reducedFrame.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
  await stageIdentity(reducedFrame, true);
  await traceStart(reducedFrame);
  await button(reducedFrame, '开始 →').focus(); await reduced.keyboard.press('Enter');
  await scene(reducedFrame, 'allocation');
  await traceStop(reducedFrame, 'reduced-motion opening bypasses scratch and fades', 'reduced');
  await button(reducedFrame, '给工人增加10个百分点').focus(); await reduced.keyboard.press('Space');
  await reducedFrame.getByTestId('labor-share').filter({ hasText: '60%' }).waitFor();
  assert.equal((await reducedFrame.getByTestId('labor-share').textContent()).trim(), '60%');
  await traceStart(reducedFrame);
  await companies(reducedFrame);
  await traceStop(reducedFrame, 'reduced-motion allocation to customers bypasses fades and motion', 'reduced');
  await network(reducedFrame, reduced);
  await ending(reducedFrame, reduced, 'reduced-motion'); await machine(reducedFrame);
  await noOverflow(reduced, reducedFrame); await reducedContext.close();
  record('Keyboard controls and complete reduced-motion journey');

  const fileURL = pathToFileURL(path.join(root, 'offline', '技术红利去了哪里.html')).href;
  const fileContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const filePage = await fileContext.newPage(); observe(filePage, fileURL);
  await filePage.goto(fileURL);
  const fileFrame = await attachedFrame(filePage);
  await stageIdentity(fileFrame, true);
  await click(fileFrame, '开始 →'); await scene(fileFrame, 'allocation'); await settled(fileFrame); await share(fileFrame, 0);
  assert(await button(fileFrame, '给工人减少10个百分点').isDisabled());
  await share(fileFrame, 100); await coinAllocation(fileFrame, 100); await noOverflow(filePage, fileFrame);
  await screenshot(filePage, 'file-offline-allocation'); await fileContext.close();
  record('Actual file:// standalone document decodes offline iframe, original sprites and controls');

  const noStorageContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await noStorageContext.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'getItem', { value: () => { throw new Error('Storage unavailable in QA'); } });
    Object.defineProperty(Storage.prototype, 'setItem', { value: () => { throw new Error('Storage unavailable in QA'); } });
  });
  const noStoragePage = await noStorageContext.newPage(); observe(noStoragePage);
  await noStoragePage.goto(url); const noStorageFrame = await attachedFrame(noStoragePage);
  await stageIdentity(noStorageFrame, true);
  await click(noStorageFrame, '开始 →'); await scene(noStorageFrame, 'allocation'); await settled(noStorageFrame); await share(noStorageFrame, 0);
  await share(noStorageFrame, 100);
  assert(await button(noStorageFrame, '给工人增加10个百分点').isDisabled());
  assert.match(await noStorageFrame.locator('#save-status').textContent(), /本机保存不可用/);
  await noOverflow(noStoragePage, noStorageFrame); await screenshot(noStoragePage, 'storage-disabled-allocation');
  await noStorageContext.close(); record('Disabled localStorage still permits both allocation limits');

  assert.deepEqual(runtimeErrors, []); assert.deepEqual(externalRequests, []); assert.deepEqual(writeRequests, []);
  const report = { date: new Date().toISOString(), status: 'PASS', browser: 'Headless Edge', url,
    buildBytes, buildSha256,
    cases, screenshots: snapshots, transitionEvidence, runtimeErrors, externalRequests, writeRequests,
    scope: 'Built source-based original-engine prologue and worker/producer first machine experiment; not seven-role completion or public hosting' };
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, transitionEvidence: transitionEvidence.map(({ samples, ...trace }) => ({
    ...trace, sampleCount: samples.length,
  })) }, null, 2));
} catch (error) {
  if (latestPage && !latestPage.isClosed()) {
    try { await screenshot(latestPage, 'failure'); } catch { /* keep the original diagnostic */ }
  }
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ date: new Date().toISOString(), status: 'FAIL',
    buildBytes, buildSha256,
    error: error.stack || String(error), cases, screenshots: snapshots, transitionEvidence, runtimeErrors, externalRequests, writeRequests }, null, 2));
  throw error;
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
