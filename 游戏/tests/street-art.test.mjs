import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('industry artwork is self-contained pencil SVG with product-specific detail',()=>{
 for(const name of ['clothes','cars','inputs','oven-empty']){
  const svg=read('public/assets/street/'+name+'.svg');assert(svg.includes('viewBox="0 0 310 260"'));assert((svg.match(/<path/g)||[]).length>=6);assert(svg.includes('#626262'));assert(!/<script|<foreignObject|<image|href=/.test(svg));
 }
 const oven=read('public/assets/street/oven-empty.svg');assert(oven.includes('data-part="empty-rack"'));assert(!oven.includes('#bcaa88'));assert(!/bread|loaf|面包/.test(oven));
});
test('street uses empty oven products but baking ovens keep their original working image',()=>{
 const stage=read('lib/street-stage.js');assert(stage.includes("id==='ovens'?textures.emptyOven"));assert(stage.includes("id==='bakery'||id==='rival'?textures.newOven"));assert(stage.includes('obj=sprite(textures.emptyOven)'));
 const build=read('scripts/build-portable.mjs');assert(build.includes('(?:bakery|street)'));
 const ctx={window:{}};vm.runInNewContext(read('lib/street-art.js'),ctx);for(const kind of ['clothes','cars','inputs','ovens'])assert(ctx.window.StreetArt.icon(kind).startsWith('<svg'));
 const coin=ctx.window.StreetArt.icon('cash');assert(coin.includes('/assets/trust/iterated_coin.png'));assert(coin.includes('viewBox="10 10 102 102"'));assert.equal(typeof ctx.window.StreetArt.decorateMoney,'function');
});
