import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTION_SYMBOLS } from '../lib/production-symbols.ts';
import { PRODUCTION_LINKS, OFFICIAL_PRODUCTION_LINKS } from '../lib/production-links.ts';
import { PRODUCTION_EXTRA_BRANDS, PRODUCTION_EXTRA_TOOLS, PRODUCTION_LOGO_PROVENANCE } from '../lib/production-extra-symbols.ts';
import { PRODUCTION_BRAND_REPLACEMENTS, PRODUCTION_INDUSTRY_BRANDS } from '../lib/production-industry-symbols.ts';
import { PRODUCTION_AI_BRANDS } from '../lib/production-ai-symbols.ts';

test('the production opening has eight distinct, locally drawn and inert SVG symbols', () => {
  assert.deepEqual(PRODUCTION_SYMBOLS.map(symbol => symbol.id),
    ['computer', 'ai', 'codex', 'deepseek', 'unitree', 'xiaomi', 'tesla', 'dji']);
  assert.equal(new Set(PRODUCTION_SYMBOLS.map(symbol => symbol.svgMarkup)).size, 8);
  for (const { label, description, svgMarkup } of PRODUCTION_SYMBOLS) {
    assert(label && description);
    assert.match(svgMarkup, /viewBox="0 0 96 72"/);
    assert.match(svgMarkup, /aria-hidden="true"/);
    const drawing = svgMarkup.replace('xmlns="http://www.w3.org/2000/svg"', '');
    assert.doesNotMatch(drawing, /<script|<foreignObject|<image|\son\w+\s*=|href=|https?:|data:/i);
  }
});

test('only named products or companies have official HTTPS destinations', () => {
  assert.equal(PRODUCTION_LINKS.length, 46);
  assert.equal(PRODUCTION_LINKS.filter(symbol => symbol.href).length, 36);
  for (const symbol of PRODUCTION_LINKS) {
    if (!OFFICIAL_PRODUCTION_LINKS[symbol.id]) assert.equal(symbol.href, null);
    else {
      assert.equal(symbol.href, OFFICIAL_PRODUCTION_LINKS[symbol.id]);
      const destination = new URL(symbol.href);
      assert.equal(destination.protocol, 'https:');
      assert.equal(destination.search, '');
      assert.equal(destination.username, '');
    }
  }
  assert.equal(OFFICIAL_PRODUCTION_LINKS.codex, 'https://openai.com/codex/');
  assert.equal(OFFICIAL_PRODUCTION_LINKS.deepseek, 'https://www.deepseek.com/');
  assert.equal(OFFICIAL_PRODUCTION_LINKS.unitree, 'https://www.unitree.com/cn/');
  assert.equal(OFFICIAL_PRODUCTION_LINKS.xiaomi, 'https://www.mi.com/shop');
  assert.equal(OFFICIAL_PRODUCTION_LINKS.tesla, 'https://www.tesla.cn/');
  assert.equal(OFFICIAL_PRODUCTION_LINKS.dji, 'https://www.dji.com/cn');
});

test('the expanded reusable pool includes safe tool drawings and attributed logo paths', () => {
  assert.equal(PRODUCTION_EXTRA_BRANDS.length, 30);
  assert.equal(PRODUCTION_EXTRA_TOOLS.length, 8);
  assert.equal(new Set(PRODUCTION_LINKS.map(symbol => symbol.id)).size, 46);
  assert.equal(new Set(PRODUCTION_EXTRA_BRANDS.map(symbol => symbol.svgMarkup)).size, 30);
  for (const { svgMarkup } of [...PRODUCTION_EXTRA_BRANDS, ...PRODUCTION_EXTRA_TOOLS, ...PRODUCTION_BRAND_REPLACEMENTS]) {
    assert.match(svgMarkup, /<svg/);
    assert.match(svgMarkup, /viewBox=/);
    const drawing = svgMarkup.replace('xmlns="http://www.w3.org/2000/svg"', '');
    assert.doesNotMatch(drawing, /<script|<foreignObject|<image|\son\w+\s*=|href=|https?:|data:/i);
    for (const [, id] of drawing.matchAll(/url\(#([^)]*)\)/g)) assert(drawing.includes(`id="${id}"`), 'internal SVG references resolve');
  }
  for (const logo of PRODUCTION_EXTRA_BRANDS) {
    assert(logo.href.startsWith('https://'));
    assert(PRODUCTION_LINKS.find(symbol => symbol.id === logo.id).logo);
    const source = PRODUCTION_LOGO_PROVENANCE.find(record => record.id === logo.id);
    assert(source && source.sourceUrl.startsWith('https://'));
    assert.equal(source.officialUrl, logo.href);
  }
});

test('company illustrations are replaced in place and all four requested industries are represented', () => {
  assert.equal(PRODUCTION_BRAND_REPLACEMENTS.length, 5);
  for (const replacement of PRODUCTION_BRAND_REPLACEMENTS) {
    const original = PRODUCTION_SYMBOLS.find(s => s.id === replacement.id);
    const displayed = PRODUCTION_LINKS.find(s => s.id === replacement.id);
    assert(original && displayed.logo);
    assert.notEqual(displayed.svgMarkup, original.svgMarkup);
    assert.equal(displayed.href, OFFICIAL_PRODUCTION_LINKS[replacement.id]);
    assert.equal(PRODUCTION_LINKS.filter(s => s.id === replacement.id).length, 1);
  }
  assert.equal(PRODUCTION_INDUSTRY_BRANDS.length, 8);
  for (const sector of ['solar', 'biomedical', 'aerospace', 'manufacturing']) assert.equal(PRODUCTION_INDUSTRY_BRANDS.filter(s => s.sector === sector).length, 2);
  assert.equal(PRODUCTION_LINKS.filter(s => s.logo).length, 35);
  assert.equal(PRODUCTION_LINKS.find(s => s.id === 'codex').logo, false);
});

test('three AI product logos identify official destinations, not model integrations', () => {
  assert.deepEqual(PRODUCTION_AI_BRANDS.map(s => [s.id, s.href]), [
    ['chatgpt', 'https://chatgpt.com/'],
    ['gemini', 'https://gemini.google.com/'],
    ['claude', 'https://claude.ai/'],
  ]);
  for (const product of PRODUCTION_AI_BRANDS) {
    assert.equal(PRODUCTION_LINKS.filter(s => s.id === product.id).length, 1);
    assert(PRODUCTION_LINKS.find(s => s.id === product.id).logo);
    assert(PRODUCTION_LOGO_PROVENANCE.find(s => s.id === product.id).repositoryLicense === 'MIT');
  }
});
