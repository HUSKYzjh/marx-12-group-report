import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {sharedFontBootstrap} from '../scripts/shared-font-bootstrap.mjs';

test('embedded font bytes are decoded once into one shared, local object URL',async()=>{
 const original=Buffer.from([0,1,254,255,87,79,70,50]),calls=[];
 const source=sharedFontBootstrap('data:font/woff2;base64,'+original.toString('base64'));
 const context={atob:x=>Buffer.from(x,'base64').toString('binary'),Uint8Array,Blob,URL:{createObjectURL:blob=>{calls.push(blob);return 'blob:https://local.example/only-font';}}};
 vm.runInNewContext(source,context);
 assert.equal(calls.length,1);assert.equal(calls[0].type,'font/woff2');assert(Buffer.from(await calls[0].arrayBuffer()).equals(original));assert.equal(context.__WORKSHOP_FONT_URI__,'blob:https://local.example/only-font');
 assert.equal(source.match(/data:font\/woff2;base64,/g).length,1);assert(!('encoded' in context));assert(!('raw' in context));assert(!('bytes' in context));
});
test('the font bootstrap rejects a remote URL, preventing accidental external font dependencies',()=>{
 assert.throws(()=>sharedFontBootstrap('https://fonts.example/font.woff2'),/embedded WOFF2/);
});
