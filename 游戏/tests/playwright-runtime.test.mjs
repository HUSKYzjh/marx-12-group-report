import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { loadPlaywright, browserLaunchOptions } = require('../scripts/playwright-runtime.cjs');
const fixtures = fileURLToPath(new URL('./fixtures/browser-runtime/', import.meta.url));

test('browser tools load a CommonJS runtime without requiring a default export', () => {
  const runtime = loadPlaywright(fixtures);
  assert.equal(runtime.default, undefined);
  assert.equal(runtime.chromium.launch(), 'commonjs-runtime');
});

test('a missing runtime reports the requested location and preserves the cause', () => {
  const absent = fileURLToPath(new URL('./fixtures/nonexistent-runtime/', import.meta.url));
  assert.throws(() => loadPlaywright(absent), error => {
    assert.match(error.message, /PROLOGUE_PLAYWRIGHT_MODULES/);
    assert(error.message.includes(absent));
    assert.equal(error.cause.code, 'MODULE_NOT_FOUND');
    return true;
  });
});

test('browser launch defaults to Edge, with a selectable channel', () => {
  assert.deepEqual(browserLaunchOptions({}), { headless: true, channel: 'msedge' });
  assert.deepEqual(browserLaunchOptions({ PROLOGUE_BROWSER_CHANNEL: 'chrome' }), { headless: true, channel: 'chrome' });
});

test('an explicit browser executable overrides channel discovery in isolated tools', () => {
  assert.deepEqual(browserLaunchOptions({
    PROLOGUE_BROWSER_EXECUTABLE: 'C:/Browsers/msedge.exe',
    PROLOGUE_BROWSER_CHANNEL: 'chrome',
  }), { headless: true, executablePath: 'C:/Browsers/msedge.exe' });
});
