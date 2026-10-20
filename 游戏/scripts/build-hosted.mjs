import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {sharedFontBootstrap} from './shared-font-bootstrap.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.resolve(process.env.GAME_HOSTED_OUTPUT||path.join(root,'build/hosted'));
await fs.mkdir(path.join(output,'runtime-assets'),{recursive:true});
const python=process.env.GAME_PYTHON||'python';
const fonts=spawnSync(python,[path.join(root,'scripts/split-web-fonts.py'),'--output',output],{stdio:'inherit'});
if(fonts.error)throw fonts.error;
assert.equal(fonts.status,0,'Font partition preparation failed');
const fontSet=JSON.parse(await fs.readFile(path.join(output,'web-fonts.json'),'utf8'));
assert(fontSet.all_mappings_preserved&&fontSet.covered_codepoints===fontSet.source_codepoints);
const original=await fs.readFile(path.join(root,'offline/技术红利去了哪里.html'),'utf8');
let document=original;
const assets=new Map();
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function asset(bytes,ext){
  const hash=digest(bytes),name=`runtime-assets/${hash.slice(0,20)}.${ext}`;
  await fs.writeFile(path.join(output,name),bytes);assets.set(name,{file:name,bytes:bytes.length,sha256:hash});return '/'+name;
}
const embeddedFont=document.match(/data:font\/woff2;base64,[A-Za-z0-9+/=]+/)?.[0];
assert(embeddedFont,'Expected the complete embedded font in the standalone build');
assert.equal(digest(Buffer.from(embeddedFont.slice(embeddedFont.indexOf(',')+1),'base64')),fontSet.source_sha256,'The offline font differs from the canonical font; rebuild offline first');
const bootstrap=sharedFontBootstrap(embeddedFont);
assert(document.includes(bootstrap),'Standalone font bootstrap changed; refusing a partial rewrite');
document=document.replace(bootstrap,`globalThis.__WORKSHOP_FONT_URI__=${JSON.stringify('/'+fontSet.parts[0].file)};\n`);
let faces=0;
document=document.replace(/@font-face\s*\{[^{}]*__WORKSHOP_FONT_URL__[^{}]*\}/g,face=>{
  faces++;
  const family=face.includes('WorkshopHand')?'WorkshopHand':'Workshop';
  return fontSet.parts.map(part=>{
    const range=part.ranges.map(([a,b])=>'U+'+a.toString(16)+(b===a?'':'-'+b.toString(16))).join(',');
    return `@font-face{font-family:${family};src:url(/${part.file});font-style:normal;font-weight:400;font-display:swap;unicode-range:${range}}`;
  }).join('');
});
assert.equal(faces,2,'Both the main stage and battle stage must use the complete partitioned font');
const matches=[...document.matchAll(/data:(image\/(?:png|jpeg|svg\+xml));base64,([A-Za-z0-9+/=]+)/g)];
const imageURLs=new Map();
for(const [uri,mime,encoded] of matches)if(!imageURLs.has(uri))imageURLs.set(uri,await asset(Buffer.from(encoded,'base64'),mime==='image/png'?'png':mime==='image/jpeg'?'jpg':'svg'));
for(const [uri,url] of imageURLs)document=document.replaceAll(uri,url);
// Every runtime resource stays on the site's origin; no analytics or third-party fetches.
for(const [old,replacement] of [["script-src 'unsafe-inline'","script-src 'self' 'unsafe-inline'"],["style-src 'unsafe-inline'","style-src 'self' 'unsafe-inline'"],["img-src data:","img-src 'self' data:"],["font-src data: blob:","font-src 'self' data: blob:"]]){
  assert(document.includes(old),'Expected CSP directive '+old);document=document.replaceAll(old,replacement);
}
const style=document.match(/<style>([\s\S]*?)<\/style>/);
assert(style);
const cssURL=await asset(Buffer.from(style[1]),'css');
document=document.replace(style[0],`<link rel="preload" href="/${fontSet.parts[0].file}" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="${cssURL}">`);
const script=document.match(/<script>([\s\S]*)<\/script>/);
assert(script);
const jsURL=await asset(Buffer.from(script[1]),'js');
document=document.replace(script[0],`<script src="${jsURL}" defer></script>`);
document=document.replace('<div id="root"></div>','<div id="root"><p role="status" style="margin:20vh auto;text-align:center;color:#666">正在准备面包店…</p></div>');
assert(!/data:font\/woff2;base64,/.test(document),'The hosted entry must not embed the full font');
await fs.writeFile(path.join(output,'index.html'),document);
for(const item of fontSet.parts)assets.set(item.file,{file:item.file,bytes:item.bytes,sha256:item.sha256});
await fs.copyFile(path.join(root,'CREDITS.md'),path.join(output,'CREDITS.md'));
await fs.copyFile(path.join(root,'public/assets/fonts/OFL.txt'),path.join(output,'runtime-assets/OFL.txt'));
const report={built_at:new Date().toISOString(),source_sha256:digest(Buffer.from(original)),standalone_bytes:Buffer.byteLength(original),
  index_bytes:Buffer.byteLength(document),index_sha256:digest(Buffer.from(document)),css:cssURL,javascript:jsURL,
  font:{source_bytes:fontSet.source_bytes,source_codepoints:fontSet.source_codepoints,all_mappings_preserved:true,core_bytes:fontSet.parts[0].bytes,parts:fontSet.parts.length},
  same_origin_only:true,connect_src_none:true,assets:[...assets.values()]};
await fs.writeFile(path.join(output,'hosting-manifest.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({indexBytes:report.index_bytes,standaloneBytes:report.standalone_bytes,coreFontBytes:report.font.core_bytes,assets:assets.size}));
