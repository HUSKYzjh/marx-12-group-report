// A CommonJS package with no `default` export, like Playwright's require entry.
module.exports = { chromium: { launch: () => 'commonjs-runtime' } };
