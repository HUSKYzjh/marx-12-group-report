import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {missingHan,validateFontCoverage,checkFontCoverage} from '../scripts/check-font-coverage.mjs';

test('coverage sees literal, escaped, nested and supplementary Chinese, not ASCII or emoji',()=>{
 const text='皱皱眉\\u76B1\\u{7709}\\\\u9f13\\uD840\\uDC00🙂AI';
 assert.deepEqual(missingHan(text,[[0x76b1,0x76b1]]),['眉','鼓','𠀀']);
 assert.deepEqual(missingHan('ABC123🙂',[]),[]);
});
test('a stale, overlapping or miscounted glyph map cannot pass the build gate',()=>{
 const font=Buffer.from('fixture'),coverage={sha256:createHash('sha256').update(font).digest('hex'),codepoints:2,ranges:[[0x7709,0x7709],[0x9f13,0x9f13]]};
 assert.equal(validateFontCoverage(font,coverage).codepoints,2);
 assert.throws(()=>validateFontCoverage(Buffer.from('other'),coverage),/stale/);
 assert.throws(()=>validateFontCoverage(font,{...coverage,codepoints:3}),/count/);
 assert.throws(()=>validateFontCoverage(font,{...coverage,ranges:[[4,5],[5,6]]}),/ranges/);
});
test('the bundled handwriting retains all upstream mappings and covers the full basic/A Han blocks',async()=>{
 const coverage=JSON.parse(await fs.readFile(new URL('../public/assets/fonts/coverage.json',import.meta.url),'utf8'));
 const provenance=JSON.parse(await fs.readFile(new URL('../public/assets/fonts/provenance.json',import.meta.url),'utf8'));
 assert.equal(coverage.codepoints,47449);
 assert.equal(coverage.codepoints,provenance.codepoints);
 assert.equal(coverage.sha256,provenance.sha256);
 assert.match(provenance.upstream,/LxgwWenKai-Screen\/releases\/download\/v1\.522\/LXGWWenKaiGBScreen\.ttf$/);
 const text=Array.from({length:0x9fff-0x4e00+1},(_,i)=>String.fromCodePoint(0x4e00+i)).join('')+Array.from({length:0x4dbf-0x3400+1},(_,i)=>String.fromCodePoint(0x3400+i)).join('');
 assert.deepEqual(missingHan(text,coverage.ranges),[]);
 const checked=await checkFontCoverage('饥馑的盛宴：皱眉、鼓腮；照护凭证，资料迁移。');
 assert.equal(checked.codepoints,47449);
});
test('unsupported Chinese fails explicitly, instead of silently falling back to a system font',async()=>{
 const coverage=JSON.parse(await fs.readFile(new URL('../public/assets/fonts/coverage.json',import.meta.url),'utf8'));
 const unknown=Array.from({length:0x1000},(_,i)=>String.fromCodePoint(0x30000+i)).find(c=>missingHan(c,coverage.ranges).length);
 assert(unknown);await assert.rejects(checkFontCoverage(unknown),/lacks Chinese glyphs/);
});

test('body copy and hand-drawn controls share the same bundled Chinese family',async()=>{
 const css=await fs.readFile(new URL('../app/trust-stage.css',import.meta.url),'utf8');
 assert.match(css,/--text-font:\s*var\(--hand-font\)/);
 assert.match(css,/body\s*\{\s*font-family:\s*var\(--text-font\)/);
 const notice=await fs.readFile(new URL('../lib/trust-document.ts',import.meta.url),'utf8');
 assert.match(notice,/霞鹜文楷屏幕阅读版 v1\.522/);
 assert(!notice.includes('XIAOLAI FULL CHARACTER COVERAGE'));
});
