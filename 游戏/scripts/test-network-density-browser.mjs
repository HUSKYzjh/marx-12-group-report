import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Isolated browser contexts only; never change the user's stored choices.
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { loadPlaywright, browserLaunchOptions } = createRequire(import.meta.url)('./playwright-runtime.cjs');
const bytes = await fs.readFile(path.join(root, 'build/index.html'));
const offline = path.join(root, 'offline/技术红利去了哪里.html');
assert(bytes.equals(await fs.readFile(offline)));
const output = path.join(root, 'outputs/network-density-qa');
await fs.mkdir(output, { recursive: true });
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(bytes);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const cases = [], errors = [], external = [];
const activated = [];
let browser;
try {
  browser = await loadPlaywright().chromium.launch(browserLaunchOptions());
  for (const spec of [
    { width: 1280 }, { width: 390 }, { width: 320 },
    { width: 390, reduced: true }, { width: 1280, offline: true },
  ]) {
    const name = `${spec.width}${spec.reduced ? '-reduced' : spec.offline ? '-offline' : ''}`;
    const context = await browser.newContext({ viewport: { width: spec.width, height: 900 },
      hasTouch: spec.width < 600, isMobile: spec.width < 600,
      reducedMotion: spec.reduced ? 'reduce' : 'no-preference' });
    let expectedTarget = null;
    await context.route('**/*', async route => {
      const address = route.request().url();
      if (address.startsWith(url) || /^(file:|data:|blob:|about:)/.test(address)) await route.continue();
      else if (address === expectedTarget) {
        activated.push(address);
        await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Intercepted official link</title>' });
      } else { external.push(address); await route.abort(); }
    });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(`${name}: ${e.message}`));
    await page.goto(spec.offline ? pathToFileURL(offline).href : url);
    const frame = await (await page.getByTestId('trust-frame').elementHandle()).contentFrame();
    await frame.locator('body[data-ready="true"][data-scene="opening"]').waitFor();
    await frame.waitForFunction(() => window.__trustStage?.splashNetwork);
    await frame.evaluate(() => document.fonts.ready);
    const brands = await frame.locator('.production-symbol[data-logo="true"]').count();
    assert.equal(brands, 35);
    const anchors = await frame.locator('.production-symbols a').evaluateAll(elements => elements.map(e => ({
      id: e.dataset.productionSymbol, href: e.href, target: e.target, rel: e.rel, svg: Boolean(e.querySelector('svg path')),
    })));
    assert.equal(anchors.length, 36);
    assert.equal(new Set(anchors.map(e => e.id)).size, 36);
    anchors.forEach(e => { assert(e.svg && e.href.startsWith('https:') && e.target === '_blank' && e.rel.includes('noopener')); });
    const samples = await frame.evaluate(async reduced => {
      const result = [];
      for (let i = 0; i <= (reduced ? 4 : 20); i++) {
        const graph = window.__trustStage.splashNetwork, density = graph._localDensities();
        const rates = graph.edges.filter(e => ProductionNetwork.canForm(graph._distance(e), graph.restLength))
          .map(e => graph._bondRates(e, density));
        let minGap = Infinity, titleSafe = true, boundarySafe = true, longRangePairs = 0;
        const stage = window.__trustStage, canvas = stage.app.view.getBoundingClientRect();
        const titleRects = [], walker = document.createTreeWalker(document.getElementById('heading'), NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          if (!walker.currentNode.textContent.trim()) continue;
          const range = document.createRange(); range.selectNodeContents(walker.currentNode);
          titleRects.push(...range.getClientRects());
        }
        const titleVisualClear = stage.splashNodes.every(item => {
          let box;
          if (item.element) box = item.element.querySelector('.production-icon').getBoundingClientRect();
          else {
            const b = item.graphics.getBounds(), scale = canvas.width / stage.width;
            box = { left: canvas.left + b.x * scale, top: canvas.top + b.y * scale,
              right: canvas.left + (b.x + b.width) * scale, bottom: canvas.top + (b.y + b.height) * scale };
          }
          return titleRects.every(t => box.right <= t.left || box.left >= t.right || box.bottom <= t.top || box.top >= t.bottom);
        });
        const r = graph.exclusion;
        for (const [index, n] of graph.nodes.entries()) {
          boundarySafe &&= n.x >= n.radius && n.x <= graph.width - n.radius && n.y >= n.radius && n.y <= graph.height - n.radius;
          titleSafe &&= n.x <= r.x - n.radius || n.x >= r.x + r.width + n.radius || n.y <= r.y - n.radius || n.y >= r.y + r.height + n.radius;
          for (let j = index + 1; j < graph.nodes.length; j++) {
            const other = graph.nodes[j];
            const distance = Math.hypot(n.x - other.x, n.y - other.y);
            minGap = Math.min(minGap, distance - n.radius - other.radius);
            if (distance > graph.restLength * 3 && graph._sameSymbolForce(n, other, distance) > 0) longRangePairs++;
          }
        }
        result.push({ time: graph._time, stats: { ...graph.stats }, nodes: graph.nodes.length,
          density: Array.from(density), minGap, titleSafe, titleVisualClear, boundarySafe, longRangePairs,
          geometry: { exclusion: { ...graph.exclusion }, wallReach: graph._wallReach,
            topWallReach: graph._topWallReach, titleReach: graph._titleReach },
          formRange: [Math.min(...rates.map(r => r.form)), Math.max(...rates.map(r => r.form))],
          breakRange: [Math.min(...rates.map(r => r.break)), Math.max(...rates.map(r => r.break))],
          overflow: document.documentElement.scrollWidth > innerWidth + 1 });
        if (i < (reduced ? 4 : 20)) await new Promise(resolve => setTimeout(resolve, 500));
      }
      return result;
    }, Boolean(spec.reduced));
    for (const sample of samples) {
      assert.equal(sample.nodes, spec.width <= 600 ? 72 : 136);
      assert(sample.titleSafe && sample.boundarySafe && !sample.overflow);
      assert(sample.titleVisualClear, 'visible icons do not cover the actual title text');
      assert.equal(sample.geometry.topWallReach, spec.width <= 600 ? 10 : 18);
      assert.equal(sample.geometry.wallReach, spec.width <= 600 ? 20 : 38);
      assert.equal(sample.geometry.titleReach, spec.width <= 600 ? 7 : 14);
      assert(sample.minGap >= -.1);
      assert(sample.longRangePairs > 0, 'identical symbols repel beyond the usual 3X range');
      assert(sample.formRange[0] >= .6 && sample.formRange[1] <= 3);
      assert(sample.breakRange[0] >= .2 && sample.breakRange[1] <= 1.6);
      assert(sample.formRange[1] - sample.formRange[0] > .05, 'local areas have distinct probabilities');
    }
    // Exercise every official anchor once on desktop; intercept first requests
    // instead of visiting owners' sites or modifying the user's browser.
    if (spec.width === 1280 && !spec.offline) {
      for (const anchor of anchors) {
        expectedTarget = anchor.href;
        await frame.locator(`a[data-production-symbol="${anchor.id}"]`).focus();
        const opened = page.waitForEvent('popup');
        await page.keyboard.press('Enter');
        const popup = await opened;
        await popup.waitForLoadState('domcontentloaded');
        assert.equal(popup.url(), anchor.href);
        assert.equal(await popup.evaluate(() => window.opener), null);
        await popup.close();
      }
      expectedTarget = null;
    }
    const first = samples[0], last = samples.at(-1);
    if (spec.reduced) assert.deepEqual(last, first, 'reduced-motion graph remains static');
    else {
      assert(last.time > first.time);
      assert(last.stats.formed + last.stats.broken > first.stats.formed + first.stats.broken);
      assert.notDeepEqual(last.density, first.density, 'density responds to moving symbols');
    }
    await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
    cases.push({ name, brands, anchors, samples });
    console.log(`PASS ${name}: ${JSON.stringify({ stats: last.stats, form: last.formRange, break: last.breakRange })}`);
    await context.close();
  }
  assert.deepEqual(errors, []); assert.deepEqual(external, []); assert.equal(activated.length, 36);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({
    buildBytes: bytes.length, buildSha256: createHash('sha256').update(bytes).digest('hex'),
    cases, errors, external, activated, testedAt: new Date().toISOString(),
  }, null, 2));
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
