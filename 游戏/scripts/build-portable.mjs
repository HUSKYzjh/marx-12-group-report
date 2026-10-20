import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build,transform} from 'esbuild';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import {rawSourcePlugin} from './raw-source.mjs';
import {buildBattleEmbed} from './build-battle-embed.mjs';
import {checkFontCoverage} from './check-font-coverage.mjs';
import {sharedFontBootstrap} from './shared-font-bootstrap.mjs';
await buildBattleEmbed();
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const result=await build({absWorkingDir:root,entryPoints:['portable.tsx'],bundle:true,write:false,minify:true,format:'iife',platform:'browser',target:'es2020',define:{'process.env.NODE_ENV':'"production"'},metafile:true,plugins:[rawSourcePlugin]});
let js=result.outputFiles[0].text;
const cssFile=path.join(root,'app/globals.css');
const compiled=await postcss([tailwindcss({base:root})]).process(await fs.readFile(cssFile,'utf8'),{from:cssFile});
let css=(await transform(compiled.css,{loader:'css',minify:true})).code;
// Reject missing Chinese glyphs in the final code, including the embedded battle.
const fontCoverage=await checkFontCoverage(js+'\n'+css);
console.log(`Handwriting coverage checked: ${fontCoverage.codepoints} characters.`);
// Embed explicitly referenced local artwork and the complete licensed handwriting font.
const assetPattern=/\/(?:(?:assets\/(?:trust|trust-source|workshop-v6|wbwwb-source|author)|evidence)\/[A-Za-z0-9_.-]+\.png|assets\/(?:bakery|street)\/[A-Za-z0-9_.-]+\.svg|assets\/history\/[A-Za-z0-9_.-]+\.jpg|assets\/fonts\/[A-Za-z0-9_.-]+\.woff2)/g;
const assetPaths=new Set([...js.matchAll(assetPattern),...css.matchAll(assetPattern)].map(m=>m[0]));
let sharedFont=null;
for(const assetPath of assetPaths){const mime=assetPath.endsWith('.woff2')?'font/woff2':assetPath.endsWith('.svg')?'image/svg+xml':assetPath.endsWith('.jpg')?'image/jpeg':'image/png';const data=`data:${mime};base64,`+(await fs.readFile(path.join(root,'public',assetPath))).toString('base64');if(assetPath.endsWith('/workshop-hand.woff2')){sharedFont=data;js=js.replaceAll(assetPath,'__WORKSHOP_FONT_URL__');}else js=js.replaceAll(assetPath,data);css=css.replaceAll(assetPath,data);}
if(!sharedFont)throw new Error('Shared handwriting font is missing');
if(/\/assets\/history\/[A-Za-z0-9_.-]+\.jpg/.test(js+css))throw new Error('Unembedded historical photograph');
js=sharedFontBootstrap(sharedFont)+js;
if(/@import\s/.test(css))throw new Error('Unresolved CSS import');
const document=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="饥馑的盛宴：从面包店出发，观察人、生产与分配。序章：厨房内外。故事按章与幕展开。教学模型不替代现实证据。"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data: blob:; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>饥馑的盛宴｜序章：厨房内外</title><style>${css.replaceAll('</style','<\\/style')}</style></head><body><div id="root"></div><noscript>请在浏览器启用JavaScript以进行实验。本作品不上传你的选择。</noscript><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
await fs.mkdir(path.join(root,'offline'),{recursive:true});
await fs.writeFile(path.join(root,'offline','技术红利去了哪里.html'),document);
// Keep the single-file entry for local/offline delivery. build:hosted derives
// the cacheable HTTP edition under build/hosted, never a development server.
await fs.mkdir(path.join(root,'build'),{recursive:true});
await fs.writeFile(path.join(root,'build','index.html'),document);
await fs.writeFile(path.join(root,'offline','bundle-manifest.json'),JSON.stringify({built_at:new Date().toISOString(),bytes:Buffer.byteLength(document),source_modules:Object.keys(result.metafile.inputs),external_runtime_requests:false},null,2));
console.log(`Portable build complete: ${Buffer.byteLength(document)} bytes; no network dependencies.`);
