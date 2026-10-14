const path = require('node:path');

// Keep this boundary CommonJS: some VM/REPL loaders cannot synthesize the
// default export used by playwright-core/index.mjs when it imports index.js.
function loadPlaywright(modulesDirectory = process.env.PROLOGUE_PLAYWRIGHT_MODULES) {
  const target = modulesDirectory ? path.join(path.resolve(modulesDirectory), 'playwright') : 'playwright';
  let runtime;
  try {
    runtime = require(target);
  } catch (cause) {
    throw new Error(
      `Cannot load Playwright from ${target}. Set PROLOGUE_PLAYWRIGHT_MODULES to the node_modules directory containing Playwright. ${cause.message}`,
      { cause },
    );
  }
  if (typeof runtime?.chromium?.launch !== 'function') {
    throw new TypeError(`Invalid Playwright runtime at ${target}: chromium.launch is missing.`);
  }
  return runtime;
}

function browserLaunchOptions(env = process.env) {
  // An explicit executable also works in REPLs without ProgramFiles variables.
  return env.PROLOGUE_BROWSER_EXECUTABLE
    ? { headless: true, executablePath: env.PROLOGUE_BROWSER_EXECUTABLE }
    : { headless: true, channel: env.PROLOGUE_BROWSER_CHANNEL || 'msedge' };
}

module.exports = { loadPlaywright, browserLaunchOptions };
