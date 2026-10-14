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
} from '../lib/prologue-state.ts';
import {
  OFFICIAL_PRODUCTION_LINKS,
  PRODUCTION_LINKS,
} from '../lib/production-links.ts';

// A scoped regression check for the opening artwork. Always launch an isolated
// browser; never attach to or change the user's own browser/storage.
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const {
  loadPlaywright,
  browserLaunchOptions,
} = require('./playwright-runtime.cjs');
const { chromium } = loadPlaywright();
const output = path.join(root, 'outputs/opening-tools-qa');
await fs.mkdir(output, { recursive: true });
const document = await fs.readFile(path.join(root, 'build/index.html'));
const offlinePath = path.join(root, 'offline/技术红利去了哪里.html');
const offlineDocument = await fs.readFile(offlinePath);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const buildBytes = document.length,
  buildSha256 = hash(document);
assert.equal(
  hash(offlineDocument),
  buildSha256,
  'Offline deliverable matches the tested build',
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
  compositionEvidence = [],
  transitionEvidence = [],
  pointerEvidence = [],
  networkEvidence = [],
  hoverEvidence = [],
  focusResizeEvidence = [],
  pauseEvidence = [],
  linkEvidence = [],
  symbolEvidence = [];
const runtimeErrors = [],
  externalRequests = [],
  writeRequests = [];
const expectedExternalRequests = [];
const officialTargets = {
  chatgpt: 'https://chatgpt.com/', gemini: 'https://gemini.google.com/', claude: 'https://claude.ai/',
  longi: 'https://www.longi.com/en/', sungrow: 'https://www.sungrowpower.com/en',
  abbott: 'https://www.abbott.com/', merck: 'https://www.merck.com/',
  airbus: 'https://www.airbus.com/', spacex: 'https://www.spacex.com/',
  abb: 'https://global.abb/', bosch: 'https://www.bosch.com/',
  nvidia: 'https://www.nvidia.com/', amd: 'https://www.amd.com/',
  arm: 'https://www.arm.com/', intel: 'https://www.intel.com/',
  huawei: 'https://www.huawei.com/', samsung: 'https://www.samsung.com/',
  siemens: 'https://www.siemens.com/', linux: 'https://www.kernel.org/',
  ubuntu: 'https://ubuntu.com/', blender: 'https://www.blender.org/',
  arduino: 'https://www.arduino.cc/', raspberrypi: 'https://www.raspberrypi.com/',
  pytorch: 'https://pytorch.org/', tensorflow: 'https://www.tensorflow.org/',
  wikipedia: 'https://www.wikipedia.org/',
  codex: 'https://openai.com/codex/',
  deepseek: 'https://www.deepseek.com/',
  unitree: 'https://www.unitree.com/cn/',
  xiaomi: 'https://www.mi.com/shop',
  tesla: 'https://www.tesla.cn/',
  dji: 'https://www.dji.com/cn',
  // Cross-checked against the source/licensing agent's official-site reads,
  // not generated from the same application constant that we are testing.
  github: 'https://github.com/',
  python: 'https://www.python.org/',
  git: 'https://git-scm.com/',
  rust: 'https://rust-lang.org/',
};
assert.deepEqual(
  OFFICIAL_PRODUCTION_LINKS,
  officialTargets,
  'All intended destinations match independently verified official URLs',
);
let browser, latestPage;
const record = (name) => {
  cases.push(name);
  console.log(`PASS ${name}`);
};
async function settled(frame) {
  await frame.waitForFunction(
    () =>
      !document.body.hasAttribute('data-transition') &&
      document.querySelector('main')?.getAttribute('aria-busy') !== 'true' &&
      !Tween.hasActiveTweens(),
    null,
    { timeout: 6000 },
  );
}
async function open(width, reduced, offline = false) {
  const context = await browser.newContext({
    viewport: { width, height: width < 600 ? 844 : 900 },
    isMobile: width < 600,
    hasTouch: width < 600,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  let expectedTarget = null;
  const permitted = offline ? pathToFileURL(offlinePath).href : url;
  // Context-level interception catches the FIRST request from a new tab. No
  // external page, asset, sign-in or analytics is fetched during this QA.
  await context.route('**/*', async (route) => {
    const address = route.request().url();
    if (
      address.startsWith(permitted) ||
      /^(?:data:|blob:|about:|file:)/.test(address)
    ) {
      await route.continue();
      return;
    }
    if (address === expectedTarget) expectedExternalRequests.push(address);
    else externalRequests.push(address);
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><link rel="icon" href="data:,"><title>Official destination intercepted by QA</title><p>Navigation verified without contacting the external site.</p>',
    });
  });
  context.on('page', (target) => {
    target.on('pageerror', (error) => runtimeErrors.push(error.message));
    target.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(message.text());
    });
  });
  context.on('request', (request) => {
    if (!['GET', 'HEAD'].includes(request.method()))
      writeRequests.push(`${request.method()} ${request.url()}`);
  });
  const page = await context.newPage();
  latestPage = page;
  await page.goto(permitted);
  await page.getByTestId('trust-frame').waitFor();
  const handle = await page.getByTestId('trust-frame').elementHandle();
  assert(handle, 'Original-engine iframe exists');
  const frame = await handle.contentFrame();
  assert(frame, 'Original-engine iframe has a browsing context');
  await frame
    .locator('body[data-ready="true"][data-scene="opening"]')
    .waitFor();
  await settled(frame);
  await frame.evaluate(async () => {
    await document.fonts.ready;
  });
  await frame.evaluate(() => {
    const stage = window.slideshow.objects.stage;
    window.__openingLinkActors = { stage, people: stage.people.slice() };
  });
  return {
    context,
    page,
    frame,
    width,
    expectTarget: (target) => {
      expectedTarget = target;
    },
  };
}
async function screenshot(page, name) {
  const filename = `${name}.png`;
  await page.screenshot({
    path: path.join(output, filename),
    fullPage: true,
    animations: 'disabled',
  });
  screenshots.push(filename);
  console.log(`SCREENSHOT ${filename}`);
}
async function bounds(page, frame) {
  for (const [label, target] of [
    ['host', page],
    ['iframe', frame],
  ]) {
    const dimensions = await target.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    assert(
      dimensions.scrollWidth <= dimensions.width + 1,
      `${label} must not overflow horizontally: ${JSON.stringify(dimensions)}`,
    );
  }
  const composition = await frame.evaluate(() => {
    const stage = window.slideshow.objects.stage,
      canvas = stage.app.view.getBoundingClientRect();
    const heading = document.getElementById('heading').getBoundingClientRect();
    const start = document
      .querySelector('#controls > button')
      .getBoundingClientRect();
    return {
      width: innerWidth,
      height: innerHeight,
      canvas: {
        x: canvas.x,
        y: canvas.y,
        width: canvas.width,
        height: canvas.height,
      },
      stageWidth: stage.width,
      stageHeight: stage.app.renderer.height / stage.app.renderer.resolution,
      heading: {
        x: heading.x,
        y: heading.y,
        width: heading.width,
        height: heading.height,
      },
      start: {
        x: start.x,
        y: start.y,
        width: start.width,
        height: start.height,
      },
    };
  });
  assert(
    composition.canvas.x >= -1 &&
      composition.canvas.x + composition.canvas.width <= composition.width + 1,
  );
  assert(
    composition.heading.y + composition.heading.height <= composition.start.y,
    'Opening title and start button must not overlap',
  );
  return composition;
}
async function composition(frame, layout, label) {
  const evidence = await frame.evaluate(() => {
    const stage = window.slideshow.objects.stage;
    stage.app.renderer.render(stage.app.stage);
    const describe = (item) => {
      const g = item.graphics,
        box = g.getBounds(),
        base = g.texture?.baseTexture;
      return {
        kind: item.kind || 'person',
        visible: g.worldVisible,
        alpha: g.worldAlpha,
        bounds: { x: box.x, y: box.y, width: box.width, height: box.height },
        sprite: g instanceof PIXI.Sprite,
        drawn: g instanceof PIXI.Graphics,
        embeddedImageLoaded: base
          ? base.hasLoaded && (base.source?.src || '').startsWith('data:image/')
          : null,
      };
    };
    return {
      people: stage.splashPeople.map(describe),
      tools: stage.splashTools.map(describe),
      edges: stage.splashEdges.length,
      title: document.getElementById('heading').textContent,
      separateMachineTextures:
        stage.splashTools.find((tool) => tool.kind === 'old').graphics
          .texture !==
        stage.splashTools.find((tool) => tool.kind === 'new').graphics.texture,
    };
  });
  assert(evidence.people.length > 0, 'Opening retains people alongside tools');
  for (const kind of ['old', 'new', 'gear', 'conveyor', 'wrench', 'flywheel', 'motor'])
    assert(
      evidence.tools.some((tool) => tool.kind === kind),
      `The shared network retains ${kind}`,
    );
  assert(
    evidence.edges > 0,
    'Mixed artwork retains production-chain connections',
  );
  assert(
    evidence.separateMachineTextures,
    'Old and new machines retain distinct embedded artwork',
  );
  assert.equal(
    evidence.title.replace(/\s/g, ''),
    '技术红利归谁？',
    'Opening title remains unchanged for user selection',
  );
  const overlaps = (a, b) =>
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
  const scale = layout.canvas.width / layout.stageWidth;
  for (const item of [...evidence.people, ...evidence.tools]) {
    assert(
      item.visible && item.alpha > 0.2,
      `${item.kind} must be visibly rendered`,
    );
    const b = item.bounds;
    item.screenBounds = {
      x: layout.canvas.x + b.x * scale,
      y: layout.canvas.y + b.y * scale,
      width: b.width * scale,
      height: b.height * scale,
    };
    assert(
      !overlaps(item.screenBounds, layout.heading),
      `${item.kind} does not collide with the title`,
    );
    assert(
      item.screenBounds.x >= layout.canvas.x - 1 &&
        item.screenBounds.y >= layout.canvas.y - 1 &&
        item.screenBounds.x + item.screenBounds.width <=
          layout.canvas.x + layout.canvas.width + 1 &&
        item.screenBounds.y + item.screenBounds.height <=
          layout.canvas.y + layout.canvas.height + 1,
      `${item.kind} remains fully inside the canvas`,
    );
    if (item.kind !== 'person') {
      if (['old', 'new'].includes(item.kind)) {
        assert(
          item.sprite && item.embeddedImageLoaded,
          `${item.kind} is a loaded embedded machine sprite`,
        );
        assert(
          item.screenBounds.width >= 30 && item.screenBounds.height >= 15,
          `${item.kind} remains larger than a small text glyph on mobile`,
        );
      } else
        assert(item.drawn, `${item.kind} is an authored code-drawn tool icon`);
    }
  }
  compositionEvidence.push({ label, layout, ...evidence });
}
async function productionSymbols(frame, label) {
  const result = await frame.evaluate(() => {
    const box = (element) => {
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    const map = document.querySelector('.production-map');
    const faces = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .filter((rule) => rule instanceof CSSFontFaceRule)
      .map((rule) => ({
        family: rule.style.fontFamily,
        embedded: /data:/.test(rule.style.src),
      }));
    return {
      mapVisible: !map.hidden && map.getClientRects().length > 0,
      heading: box(document.getElementById('heading')),
      start: box(document.querySelector('#controls > button')),
      footer: box(document.querySelector('footer')),
      map: box(map),
      hint: {
        text: document.querySelector('.production-hint').textContent,
        box: box(document.querySelector('.production-hint')),
      },
      faces,
      fontLoaded: document.fonts.check('16px WorkshopHand'),
      items: Array.from(
        map.querySelectorAll('[data-production-symbol]'),
        (item) => ({
          id: item.dataset.productionSymbol,
          networkId: item.dataset.networkId,
          duplicate: item.dataset.duplicate === 'true',
          logo: item.dataset.logo === 'true',
          ariaHidden: item.getAttribute('aria-hidden'),
          tag: item.tagName,
          href: item.getAttribute('href'),
          target: item.getAttribute('target'),
          rel: item.getAttribute('rel'),
          name: item.getAttribute('aria-label'),
          title: item.title,
          tabIndex: item.tabIndex,
          text: item.querySelector('.production-symbol-name').textContent,
          svg: item.querySelector('svg')?.outerHTML,
          svgCount: item.querySelectorAll('svg').length,
          remoteAssets: item.querySelectorAll('image,img,script,iframe').length,
          box: box(item),
          icon: box(item.querySelector('.production-icon')),
          caption: box(item.querySelector('.production-symbol-name')),
          captionOpacity: Number(getComputedStyle(item.querySelector('.production-symbol-name')).opacity),
        }),
      ),
    };
  });
  const overlaps = (a, b) =>
    a.x < b.x + b.width - 0.5 &&
    a.x + a.width > b.x + 0.5 &&
    a.y < b.y + b.height - 0.5 &&
    a.y + a.height > b.y + 0.5;
  const inside = (a, b) =>
    a.x >= b.x - 1 &&
    a.y >= b.y - 1 &&
    a.x + a.width <= b.x + b.width + 1 &&
    a.y + a.height <= b.y + b.height + 1;
  assert(result.mapVisible, 'The production symbol map is visible on opening');
  const originals = result.items.filter((item) => !item.duplicate);
  const duplicates = result.items.filter((item) => item.duplicate);
  assert.equal(new Set(result.items.map((item) => item.networkId)).size, result.items.length,
    'Each DOM drawing has a unique physics identity, including repeated types');
  assert.deepEqual(
    originals.map((item) => item.id).sort(),
    PRODUCTION_LINKS.map((item) => item.id).sort(),
  );
  assert(duplicates.length > 0, 'Non-link symbols recur within the dense network');
  assert.equal(
    new Set(originals.map((item) => item.svg)).size,
    PRODUCTION_LINKS.length,
    'Every base symbol has distinct embedded artwork',
  );
  assert(
    result.hint.text.includes('点带箭头的符号，去官网看看'),
    'Visible text explains which symbols are clickable',
  );
  for (const item of result.items) {
    const source = PRODUCTION_LINKS.find((symbol) => symbol.id === item.id);
    assert(source, `Known symbol type ${item.id}`);
    assert(item.text.startsWith(source.label));
    assert.equal(item.logo, Boolean(source.logo));
    assert.equal(item.svgCount, 1);
    assert.equal(item.remoteAssets, 0);
    assert(
      inside(item.icon, item.box) && inside(item.box, result.map),
      `${label}/${item.networkId}: small icon and node remain inside the map`,
    );
    assert(
      item.icon.width >= 24 && item.icon.width <= 37 && item.icon.height >= (source.href ? 24 : 22) && item.icon.height <= 37,
      `${label}/${item.networkId}: illustrations use the smaller visual scale`,
    );
    assert.equal(item.captionOpacity, 0, 'Resting labels stay hidden so the network remains legible');
    for (const other of [
      result.heading,
      result.start,
      result.footer,
      result.hint.box,
    ])
      assert(
        !overlaps(item.box, other),
        `${label}/${item.id}: symbol does not overlap title, action, hint or footer`,
      );
    if (source.href) {
      assert(!item.duplicate, 'External destinations are never repeated');
      assert.equal(item.networkId, item.id);
      assert(item.box.width >= 44 && item.box.height >= 44,
        `${label}/${item.id}: interactive target remains at least 44×44`);
      assert.equal(item.tag, 'A');
      assert.equal(item.href, officialTargets[item.id]);
      assert.equal(item.target, '_blank');
      assert.deepEqual(item.rel.split(/\s+/).sort(), [
        'noopener',
        'noreferrer',
      ]);
      assert(
        item.name.includes(source.label) && item.name.includes('新标签页'),
      );
      assert(item.text.endsWith('↗'));
      assert.equal(item.tabIndex, 0);
    } else {
      assert.equal(item.tag, 'DIV');
      assert.equal(item.href, null);
      assert.equal(item.tabIndex, -1);
      assert(item.box.width >= 26 && item.box.width <= 36);
      if (item.duplicate) {
        assert.notEqual(item.networkId, item.id);
        assert.equal(item.ariaHidden, 'true', 'Repeated decorations do not duplicate accessible content');
        assert.equal(item.svg, originals.find((original) => original.id === item.id).svg);
      }
    }
  }
  assert(
    result.fontLoaded &&
      result.faces.some(
        (face) => /WorkshopHand/.test(face.family) && face.embedded,
      ),
    'The hand font is loaded and self-contained',
  );
  symbolEvidence.push({ label, ...result });
}
async function activateOfficialLinks(run, label) {
  const { context, page, frame, expectTarget } = run;
  const parentURL = page.url();
  const before = await frame.evaluate(
    (key) => localStorage.getItem(key),
    PROLOGUE_STORAGE_KEY,
  );
  assert.deepEqual(JSON.parse(before), initialPrologue());
  assert.deepEqual(
    externalRequests,
    [],
    'Rendering the opening sends no automatic external requests',
  );
  for (const [index, [id, target]] of Object.entries(
    officialTargets,
  ).entries()) {
    const anchor = frame.locator(`a[data-production-symbol="${id}"]`);
    const networkId = await anchor.getAttribute('data-network-id');
    assert(networkId, 'Official link maps to a unique network node');
    const useTouch = run.width < 600 && id === 'dji';
    const hit = await anchor.evaluate((element) => {
      const box = element.getBoundingClientRect(),
        target = document.elementFromPoint(
          box.x + box.width / 2,
          box.y + box.height / 2,
        );
      return {
        valid: element.contains(target),
        hitTag: target?.tagName,
        hitClass: target?.getAttribute('class'),
        hitId: target?.id,
        hitHTML: target?.outerHTML.slice(0, 350),
        box: { x: box.x, y: box.y, width: box.width, height: box.height },
        scrollY,
        viewHeight: innerHeight,
        bodyScene: document.body.dataset.scene,
        transition: document.body.dataset.transition,
      };
    });
    assert(
      hit.valid,
      `${label}/${id}: link center must receive real pointer input: ${JSON.stringify(hit)}`,
    );
    expectTarget(target);
    let focus = null,
      clickPoint = null;
    if (index === 0) {
      await frame.locator('body').click({ position: { x: 3, y: 3 } });
      let focused = false;
      for (let step = 0; step < 16; step++) {
        await page.keyboard.press('Tab');
        focused = await anchor.evaluate(
          (element) => element === document.activeElement,
        );
        if (focused) break;
      }
      assert(
        focused,
        'Keyboard tab navigation reaches the Codex official link',
      );
      focus = await anchor.evaluate((element) => ({
        visible: element.matches(':focus-visible'),
        outlineStyle: getComputedStyle(element).outlineStyle,
        outlineWidth: parseFloat(getComputedStyle(element).outlineWidth),
      }));
      assert(
        focus.visible &&
          focus.outlineStyle !== 'none' &&
          focus.outlineWidth >= 2,
        'Keyboard link focus is visibly outlined',
      );
      // Exercise a real viewport change while the DOM link retains focus.
      // A rebuilt physics model must restore the same link's pinned state.
      const resizeTrace = [];
      for (const width of [run.width >= 900 ? 768 : run.width + 12, run.width]) {
        await page.setViewportSize({ width, height: run.width < 600 ? 844 : 900 });
        await frame.waitForFunction(({ width, id }) => {
          const stage = window.slideshow.objects.stage;
          const node = stage.splashNetwork.nodes.find((entry) => entry.id === id);
          return innerWidth === width && stage.width === width && node?.pinned &&
            document.activeElement?.dataset.networkId === id;
        }, { width, id: networkId });
        resizeTrace.push(await frame.evaluate(() => ({
          width: innerWidth,
          focused: document.activeElement?.dataset.networkId,
          nodeCount: window.slideshow.objects.stage.splashNetwork.nodes.length,
          pinned: window.slideshow.objects.stage.splashNetwork.nodes.find((node) => node.id === document.activeElement?.dataset.networkId)?.pinned,
        })));
      }
      focusResizeEvidence.push({ label, id: networkId, resizeTrace });
      await bounds(page, frame);
      await screenshot(page, `${label}-keyboard-link-focus`);
    } else {
      // Scroll the fixed stage, then approach the moving target with a real
      // pointer. Waiting for the unhovered link itself to stop is inappropriate.
      await frame.locator('.stage-object').scrollIntoViewIfNeeded();
      const box = await anchor.boundingBox();
      assert(box);
      clickPoint = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      await page.mouse.move(clickPoint.x, clickPoint.y);
    }
    await frame.waitForFunction(
      (id) =>
        window.slideshow.objects.stage.splashNetwork.nodes.find(
          (node) => node.id === id,
        )?.pinned,
      networkId,
    );
    const pinned = await frame.evaluate(
      (id) =>
        new Promise((resolve) => {
          const stage = window.slideshow.objects.stage,
            element = document.querySelector(
              `[data-network-id="${id}"]`,
            ),
            box = element.getBoundingClientRect(),
            point = { x: box.x + box.width / 2, y: box.y + box.height / 2 },
            samples = [];
          function capture() {
            const node = stage.splashNetwork.nodes.find(
                (node) => node.id === id,
              ),
              current = element.getBoundingClientRect(),
              caption = element.querySelector('.production-symbol-name'),
              captionBox = caption.getBoundingClientRect(),
              canvas = stage.app.view.getBoundingClientRect();
            samples.push({
              x: current.x,
              y: current.y,
              pinned: node.pinned,
              captionOpacity: Number(getComputedStyle(caption).opacity),
              captionInside: captionBox.left >= canvas.left - 1 && captionBox.top >= canvas.top - 1 &&
                captionBox.right <= canvas.right + 1 && captionBox.bottom <= canvas.bottom + 1,
              captionSide: element.dataset.captionSide,
              captionAlign: element.dataset.captionAlign,
              reachable: element.contains(
                document.elementFromPoint(point.x, point.y),
              ),
            });
            if (samples.length < 12) setTimeout(capture, 100);
            else resolve(samples);
          }
          capture();
        }),
      networkId,
    );
    for (const sample of pinned) {
      assert(
        sample.pinned && sample.reachable,
        `${label}/${id}: hover/focus keeps the intended link available`,
      );
      assert(sample.captionOpacity === 1 && sample.captionInside,
        `${label}/${id}: active name tooltip is visible and stays within the canvas`);
      assert(
        Math.hypot(sample.x - pinned[0].x, sample.y - pinned[0].y) < 0.5,
        `${label}/${id}: a hovered or focused link does not move away`,
      );
    }
    hoverEvidence.push({
      label,
      id,
      reason: index === 0 ? 'focus' : 'hover',
      samples: pinned,
    });
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      index === 0
        ? page.keyboard.press('Enter')
        : useTouch ? page.touchscreen.tap(clickPoint.x, clickPoint.y) : page.mouse.click(clickPoint.x, clickPoint.y),
    ]);
    await popup.waitForURL(target);
    await popup.waitForLoadState('domcontentloaded');
    assert.equal(
      await popup.evaluate(() => window.opener),
      null,
      'Official tab has no access to the game opener',
    );
    assert.equal(popup.url(), target);
    assert.equal(
      page.url(),
      parentURL,
      'Opening a link keeps the game URL unchanged',
    );
    assert.equal(
      await frame.evaluate(
        (key) => localStorage.getItem(key),
        PROLOGUE_STORAGE_KEY,
      ),
      before,
      'Opening an official site preserves the exact stored game state',
    );
    assert.equal(
      await frame.locator('body').getAttribute('data-scene'),
      'opening',
    );
    const native = await frame.evaluate(() => {
      const original = window.__openingLinkActors,
        stage = window.slideshow.objects.stage;
      return (
        stage === original.stage &&
        stage.people.length === 13 &&
        stage.people.every(
          (person, i) =>
            person === original.people[i] && person instanceof IteratedPeep,
        )
      );
    });
    assert(
      native,
      'External links never reconstruct or replace the thirteen game actors',
    );
    linkEvidence.push({
      label,
      id,
      target,
      method: index === 0 ? 'Tab + Enter' : useTouch ? 'touch tap' : 'click',
      focus,
      newTab: true,
      opener: null,
      parentPreserved: true,
    });
    await popup.close();
    expectTarget(null);
    await page.bringToFront();
    await page.mouse.move(2, 2);
    for (let step = 0; step < Object.keys(officialTargets).length + 8; step++) {
      await page.keyboard.press('Tab');
      if (
        await frame.evaluate(() =>
          document.activeElement.matches('#controls button'),
        )
      )
        break;
    }
    await frame.waitForFunction(
      (id) =>
        !window.slideshow.objects.stage.splashNetwork.nodes.find(
          (node) => node.id === id,
        )?.pinned,
      networkId,
    );
  }
}
async function networkSamples(frame, durationMs) {
  return frame.evaluate(
    (durationMs) =>
      new Promise((resolve) => {
        const samples = [],
          stage = window.slideshow.objects.stage,
          started = performance.now();
        const rect = (element) => {
          const b = element.getBoundingClientRect();
          return { x: b.x, y: b.y, width: b.width, height: b.height };
        };
        function capture() {
          const graph = stage.splashNetwork,
            canvas = rect(stage.app.view),
            scale = canvas.width / stage.width;
          samples.push({
            time: performance.now() - started,
            restLength: graph.restLength,
            stats: { ...graph.stats },
            totalEdgePairs: graph.edges.length,
            initialBondCount: graph.initialBondCount,
            canvas,
            heading: rect(document.getElementById('heading')),
            width: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            nodes: graph.nodes.map((n, index) => {
              const render = stage.splashNodes[index],
                g = render.graphics;
              let bounds;
              if (render.element) bounds = rect(render.element);
              else {
                const b = g.getBounds();
                bounds = {
                  x: canvas.x + b.x * scale,
                  y: canvas.y + b.y * scale,
                  width: b.width * scale,
                  height: b.height * scale,
                };
              }
              return {
                id: n.id,
                renderId: render.id,
                elementId: render.element?.dataset.networkId ?? null,
                kind: render.kind,
                category: render.element
                  ? 'symbol'
                  : stage.splashPeople.includes(render) ||
                      stage.splashPeople.some((person) => person.graphics === g)
                    ? 'person'
                    : 'tool',
                x: n.x,
                y: n.y,
                vx: n.vx,
                vy: n.vy,
                radius: n.radius,
                pinned: n.pinned,
                bounds,
              };
            }),
            // Inactive alpha-zero pairs are not rendered. The dense graph has
            // thousands of them; do not send 300 duplicate full graphs through
            // the browser protocol. Pure model tests cover those pair rules.
            edges: graph.edges.filter((edge) => edge.bonded || edge.alpha > 0).map((edge) => ({
              a: edge.a,
              b: edge.b,
              bonded: edge.bonded,
              alpha: edge.alpha,
            })),
          });
          if (performance.now() - started < durationMs)
            setTimeout(capture, 100);
          else resolve(samples);
        }
        capture();
      }),
    durationMs,
  );
}
function inspectNetwork(samples, label, dynamic) {
  assert(samples.length > 1);
  const first = samples[0],
    last = samples.at(-1),
    displacement = {},
    categories = new Set(),
    mixedEdges = new Set(),
    fading = new Set();
  assert.equal(first.nodes.length, first.width <= 600 ? 72 : first.width < 900 ? 92 : 136,
    `${label}: node density is twice the previous opening`);
  assert.equal(first.initialBondCount, Math.ceil(first.nodes.length * .62),
    `${label}: initial links grow with doubled node density`);
  const overlap = (a, b) =>
    Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const collisions = new Map();
  let maxCollisionRun = 0;
  for (const [index, sample] of samples.entries()) {
    assert(Number.isFinite(sample.restLength) && sample.restLength > 0);
    assert(
      sample.scrollWidth <= sample.width + 1,
      `${label}: dynamic graph never expands the iframe`,
    );
    const byId = new Map(sample.nodes.map((node) => [node.id, node]));
    assert.equal(
      byId.size,
      sample.nodes.length,
      'Every physics node has a unique identity',
    );
    for (const [i, node] of sample.nodes.entries()) {
      assert.equal(
        node.id,
        node.renderId,
        'Every visible node uses the same shared physics array',
      );
      if (node.category === 'symbol') assert.equal(node.elementId, node.id,
        'Repeated symbol types are bound by unique data-network-id');
      categories.add(node.category);
      for (const key of ['x', 'y', 'vx', 'vy', 'radius'])
        assert(
          Number.isFinite(node[key]),
          `${label}/${node.id}: ${key} is finite`,
        );
      assert(node.radius > 0);
      const b = node.bounds,
        c = sample.canvas;
      assert(
        b.x >= c.x - 1 &&
          b.y >= c.y - 1 &&
          b.x + b.width <= c.x + c.width + 1 &&
          b.y + b.height <= c.y + c.height + 1,
        `${label}/${node.id}: rendered node remains within canvas at ${sample.time.toFixed(0)}ms: ${JSON.stringify({ b, c })}`,
      );
      assert(
        overlap(b, sample.heading) < 1,
        `${label}/${node.id}: node avoids the central title at ${sample.time.toFixed(0)}ms`,
      );
      const start = first.nodes.find((other) => other.id === node.id);
      displacement[node.id] = Math.max(
        displacement[node.id] || 0,
        Math.hypot(node.x - start.x, node.y - start.y),
      );
      for (const other of sample.nodes.slice(i + 1)) {
        const key = [node.id, other.id].sort((a, b) => String(a).localeCompare(String(b))).join('|');
        const shared = overlap(node.bounds, other.bounds);
        const severe =
          shared >
          0.3 *
            Math.min(
              node.bounds.width * node.bounds.height,
              other.bounds.width * other.bounds.height,
            );
        const count = severe ? (collisions.get(key) || 0) + 1 : 0;
        collisions.set(key, count);
        maxCollisionRun = Math.max(maxCollisionRun, count);
        assert(
          count < 15,
          `${label}: ${key} remain substantially overlapped for 1.5 seconds`,
        );
      }
    }
    const pairs = new Set();
    for (const edge of sample.edges) {
      const a =
        typeof edge.a === 'number' ? sample.nodes[edge.a] : byId.get(edge.a);
      const b =
        typeof edge.b === 'number' ? sample.nodes[edge.b] : byId.get(edge.b);
      assert(
        a && b && a.id !== b.id,
        'Edges connect two distinct nodes in the shared graph',
      );
      const key = [a.id, b.id].sort((a, b) => String(a).localeCompare(String(b))).join('|');
      assert(!pairs.has(key), 'An unordered pair has only one edge');
      pairs.add(key);
      assert.equal(typeof edge.bonded, 'boolean');
      assert(Number.isFinite(edge.alpha) && edge.alpha >= 0 && edge.alpha <= 1);
      if (edge.alpha > 0.05 && a.category !== b.category) mixedEdges.add(key);
      if (edge.alpha > 0.01 && edge.alpha < 0.99) fading.add(key);
    }
    for (const counter of ['formed', 'broken']) {
      assert(
        Number.isInteger(sample.stats[counter]) && sample.stats[counter] >= 0,
      );
      if (index)
        assert(sample.stats[counter] >= samples[index - 1].stats[counter]);
    }
  }
  assert.deepEqual(
    [...categories].sort((a, b) => String(a).localeCompare(String(b))),
    ['person', 'symbol', 'tool'],
    'People, machines and contemporary symbols share one graph',
  );
  if (dynamic) {
    for (const category of categories)
      assert(
        first.nodes.some(
          (node) => node.category === category && displacement[node.id] > 2,
        ),
        `${label}: ${category} participates in actual motion`,
      );
    assert(
      last.stats.formed > first.stats.formed,
      `${label}: real-time evolution forms at least one new bond in 30 seconds`,
    );
    assert(
      last.stats.broken > first.stats.broken,
      `${label}: real-time evolution breaks at least one bond in 30 seconds`,
    );
    assert(
      fading.size > 0,
      'Edges have intermediate opacity during gradual changes',
    );
  } else {
    assert(
      Object.values(displacement).every((distance) => distance < 0.01),
      `${label}: reduced or paused network is stationary`,
    );
    assert.deepEqual(last.stats, first.stats);
    assert.deepEqual(last.edges, first.edges);
  }
  assert(
    mixedEdges.size > 0,
    `${label}: visible edges connect different types, rather than separate rows`,
  );
  return {
    label,
    durationMs: last.time,
    sampleCount: samples.length,
    nodeCount: first.nodes.length,
    initialBondCount: first.initialBondCount,
    totalEdgePairs: first.totalEdgePairs,
    maxCollisionRun,
    first: { nodes: first.nodes, stats: first.stats },
    last: { nodes: last.nodes, stats: last.stats },
    displacement,
    mixedEdges: [...mixedEdges],
    fadingEdges: [...fading],
  };
}
async function observeNetwork(frame, label, reduced) {
  console.log(
    `OBSERVE ${label}: ${reduced ? 'static reduced-motion' : '30-second mixed network'}`,
  );
  const samples = await networkSamples(frame, reduced ? 1500 : 30000);
  try {
    networkEvidence.push(inspectNetwork(samples, label, !reduced));
  } catch (error) {
    await fs.writeFile(path.join(output, `${label}-network-failure.json`), JSON.stringify({ buildSha256, samples }));
    throw error;
  }
}
async function reducedStable(frame) {
  const samples = await frame.evaluate(
    () =>
      new Promise((resolve) => {
        const result = [],
          stage = window.slideshow.objects.stage;
        function capture() {
          result.push({
            tweens: Tween.hasActiveTweens(),
            people: stage.splashPeople.map((person) => {
              const g = person.graphics;
              return [g.x, g.y, g.rotation];
            }),
          });
          if (result.length < 5) requestAnimationFrame(capture);
          else resolve(result);
        }
        requestAnimationFrame(capture);
      }),
  );
  for (const sample of samples) {
    assert.equal(sample.tweens, false);
    assert.deepEqual(sample.people, samples[0].people);
  }
  assert.equal(
    await frame
      .locator('a.production-symbol .production-icon')
      .first()
      .evaluate((element) => getComputedStyle(element).transitionDuration),
    '0s',
  );
}
async function pointerBounds(page, frame, layout, label) {
  const host = await page.getByTestId('trust-frame').boundingBox();
  const evidence = [];
  for (const side of ['left', 'right']) {
    const x = side === 'left' ? 1 : layout.canvas.width - 1;
    await page.mouse.move(
      host.x + layout.canvas.x + x,
      host.y + layout.canvas.y + (65 * layout.canvas.width) / layout.stageWidth,
    );
    const samples = await frame.evaluate(
      () =>
        new Promise((resolve) => {
          const samples = [],
            stage = window.slideshow.objects.stage;
          const tick = () => {
            const mouse = stage.app.renderer.plugins.interaction.mouse.global;
            samples.push({
              mouse: { x: mouse.x, y: mouse.y },
              people: stage.splashPeople.map((person) => {
                const b = person.graphics.getBounds();
                return {
                  x: b.x,
                  y: b.y,
                  width: b.width,
                  height: b.height,
                  rotation: person.graphics.rotation,
                };
              }),
            });
            if (samples.length < 20) requestAnimationFrame(tick);
            else resolve(samples);
          };
          requestAnimationFrame(tick);
        }),
    );
    for (const sample of samples)
      for (const b of sample.people) {
        assert(
          b.x >= -0.1 &&
            b.y >= -0.1 &&
            b.x + b.width <= layout.stageWidth + 0.1 &&
            b.y + b.height <= layout.stageHeight + 0.1,
          `${label} ${side}: rotating/repelling person remains entirely inside the canvas`,
        );
      }
    assert(
      samples.some((sample) =>
        sample.people.some(
          (person, i) =>
            Math.abs(person.x - samples[0].people[i].x) > 0.01 ||
            Math.abs(person.rotation - samples[0].people[i].rotation) > 0.0001,
        ),
      ),
      'Original people still move while being constrained to the canvas',
    );
    evidence.push({
      side,
      sampleCount: samples.length,
      first: samples[0],
      last: samples.at(-1),
    });
  }
  pointerEvidence.push({ label, samples: evidence });
  await page.mouse.move(
    host.x + layout.canvas.x + layout.canvas.width / 2,
    host.y + layout.canvas.y + layout.canvas.height / 2,
  );
}
async function enterAllocation(frame, reduced, label) {
  await frame.evaluate(() => {
    const stage = window.slideshow.objects.stage;
    window.__openingQA = { stage, people: stage.people.slice(), samples: [] };
    function capture() {
      const phase = document.body.dataset.transition || 'none';
      window.__openingQA.samples.push({
        phase,
        scene: document.body.dataset.scene,
        busy:
          document.querySelector('main').getAttribute('aria-busy') === 'true',
        scratch:
          document.getElementById('scene-scratch').style.backgroundPosition,
      });
    }
    const observer = new MutationObserver(capture);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-transition', 'data-scene'],
    });
    window.__openingQA.observer = observer;
    capture();
  });
  const before = await frame.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    PROLOGUE_STORAGE_KEY,
  );
  assert.deepEqual(
    before,
    initialPrologue(),
    'New isolated context has untouched opening state',
  );
  await frame.getByRole('button', { name: '开始 →', exact: true }).click();
  await frame.locator('body[data-scene="allocation"]').waitFor();
  await settled(frame);
  const result = await frame.evaluate(() => {
    const trace = window.__openingQA,
      stage = window.slideshow.objects.stage;
    trace.observer.disconnect();
    return {
      sameStage: stage === trace.stage,
      samePeople:
        stage.people.length === 13 &&
        stage.people.every((person, index) => person === trace.people[index]),
      splashHidden: !stage.splashLayer.visible,
      visiblePeople: stage.people.flatMap((person, index) =>
        person.graphics.visible ? [index] : [],
      ),
      samples: trace.samples,
    };
  });
  assert(
    result.sameStage && result.samePeople,
    'Opening transition preserves all 13 main actor objects',
  );
  assert(
    result.splashHidden,
    'Opening artwork is hidden after entering allocation',
  );
  assert.equal(
    await frame.locator('.production-map').isVisible(),
    false,
    'The symbol map hides outside opening',
  );
  const tabTrace = [];
  for (let i = 0; i < 14; i++) {
    await frame.page().keyboard.press('Tab');
    const focus = await frame.evaluate(() => ({
      tag: document.activeElement.tagName,
      name:
        document.activeElement.getAttribute('aria-label') ||
        document.activeElement.textContent?.slice(0, 40),
      symbol:
        document.activeElement.closest('.production-map')?.className || null,
    }));
    assert.equal(
      focus.symbol,
      null,
      'Hidden official links are not keyboard focus targets',
    );
    tabTrace.push(focus);
  }
  assert(
    new Set(tabTrace.map((focus) => focus.name)).size >= 3,
    'Post-start keyboard navigation visits multiple real controls',
  );
  assert.deepEqual(
    result.visiblePeople,
    [0, 4],
    'Allocation shows the same worker and owner',
  );
  const after = await frame.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    PROLOGUE_STORAGE_KEY,
  );
  assert.deepEqual(
    after,
    { ...initialPrologue(), scene: 'allocation' },
    'Artwork changes no choices or teaching state',
  );
  assert.equal(
    (await frame.getByTestId('labor-share').textContent()).trim(),
    '5份',
  );
  const paused = await frame.evaluate(
    () =>
      new Promise((resolve) => {
        const graph = window.slideshow.objects.stage.splashNetwork;
        const snapshot = () => ({
          nodes: graph.nodes.map((node) => [
            node.id,
            node.x,
            node.y,
            node.vx,
            node.vy,
          ]),
          edges: graph.edges.map((edge) => [
            edge.a,
            edge.b,
            edge.bonded,
            edge.alpha,
          ]),
          stats: { ...graph.stats },
        });
        const before = snapshot();
        setTimeout(() => resolve({ before, after: snapshot() }), 1200);
      }),
  );
  assert.deepEqual(
    paused.after,
    paused.before,
    'Leaving the opening pauses its network simulation',
  );
  pauseEvidence.push({ label, paused: true });
  const phases = [...new Set(result.samples.map((sample) => sample.phase))];
  if (reduced)
    assert.deepEqual(
      phases,
      ['none'],
      'Reduced motion bypasses chapter transition',
    );
  else {
    assert(
      phases.includes('chapter'),
      'Normal motion retains chapter scratch transition',
    );
    for (const scene of ['opening', 'allocation'])
      assert(
        result.samples.some(
          (sample) => sample.phase === 'chapter' && sample.scene === scene,
        ),
        'Scratch spans both scenes',
      );
    assert(
      result.samples
        .filter((sample) => sample.phase !== 'none')
        .every((sample) => sample.busy),
      'Transition keeps input locked',
    );
  }
  transitionEvidence.push({ label, ...result, phases, tabTrace });
}
try {
  browser = await chromium.launch(browserLaunchOptions());
  for (const reduced of [false, true])
    for (const width of [320, 390, 1280]) {
      const label = `${width}-${reduced ? 'reduced' : 'normal'}`;
      const run = await open(width, reduced),
        { context, page, frame } = run;
      assert.equal(
        await frame.evaluate(
          () => matchMedia('(prefers-reduced-motion: reduce)').matches,
        ),
        reduced,
      );
      const layout = await bounds(page, frame);
      await composition(frame, layout, label);
      await productionSymbols(frame, label);
      await screenshot(page, `${label}-opening`);
      await observeNetwork(frame, label, reduced);
      await screenshot(page, `${label}-network-observed`);
      if (!reduced) await pointerBounds(page, frame, layout, label);
      else await reducedStable(frame);
      await activateOfficialLinks(run, label);
      await enterAllocation(frame, reduced, label);
      await bounds(page, frame);
      await screenshot(page, `${label}-allocation-map-hidden`);
      await context.close();
      record(
        `${label}: dense mixed network, gradual bonds, ${Object.keys(officialTargets).length} official activations, stable hover, resize/focus, pause and 13 actors`,
      );
    }
  const run = await open(1280, true, true),
    { context, page, frame } = run;
  await composition(frame, await bounds(page, frame), 'file-offline');
  await productionSymbols(frame, 'file-offline');
  await observeNetwork(frame, 'file-offline', true);
  await reducedStable(frame);
  await screenshot(page, 'file-offline-opening');
  await activateOfficialLinks(run, 'file-offline');
  await enterAllocation(frame, true, 'file-offline');
  await screenshot(page, 'file-offline-allocation-map-hidden');
  await context.close();
  record('file:// opening embeds every illustration and starts allocation');
  assert.deepEqual(runtimeErrors, []);
  assert.deepEqual(externalRequests, []);
  assert.deepEqual(writeRequests, []);
  assert.equal(
    expectedExternalRequests.length,
    Object.keys(officialTargets).length * 7,
    'Every official destination is deliberately activated and intercepted in all seven cases',
  );
  const report = {
    date: new Date().toISOString(),
    status: 'PASS',
    browser: 'Headless Edge',
    buildBytes,
    buildSha256,
    cases,
    screenshots,
    compositionEvidence,
    symbolEvidence,
    transitionEvidence,
    pointerEvidence,
    networkEvidence,
    hoverEvidence,
    focusResizeEvidence,
    pauseEvidence,
    linkEvidence,
    runtimeErrors,
    externalRequests,
    expectedExternalRequests,
    writeRequests,
    scope:
      'Unified dynamic opening network, long-run bounds and bond changes, hover/focus pinning and scene pause; official link navigation intercepted without fetching third-party sites; downstream game rules unchanged',
  };
  await fs.writeFile(
    path.join(output, 'report.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        date: report.date,
        status: report.status,
        buildBytes,
        buildSha256,
        cases,
        screenshots,
        pointerChecks: pointerEvidence.length,
        networkChecks: networkEvidence.length,
        hoverChecks: hoverEvidence.length,
        focusResizeChecks: focusResizeEvidence.length,
        pauseChecks: pauseEvidence.length,
        symbolChecks: symbolEvidence.length,
        linkActivations: linkEvidence.length,
        runtimeErrors,
        externalRequests,
        expectedExternalRequestCount: expectedExternalRequests.length,
        writeRequests,
      },
      null,
      2,
    ),
  );
} catch (error) {
  if (latestPage && !latestPage.isClosed()) {
    try {
      await screenshot(latestPage, 'failure');
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
        screenshots,
        compositionEvidence,
        symbolEvidence,
        transitionEvidence,
        pointerEvidence,
        networkEvidence,
        hoverEvidence,
        focusResizeEvidence,
        pauseEvidence,
        linkEvidence,
        runtimeErrors,
        externalRequests,
        expectedExternalRequests,
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
