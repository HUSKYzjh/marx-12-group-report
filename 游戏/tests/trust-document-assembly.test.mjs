import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../lib/trust-document.ts',import.meta.url),'utf8');
const emitted=[...source.matchAll(/\$\{script\((\w+)\)\}/g)].map(match=>match[1]);

test('every imported classic stage helper is installed, rather than only imported as text',()=>{
 const imports=[...source.matchAll(/import (\w+) from '[^']+\.js\?raw';/g)].map(match=>match[1]);
 for(const name of imports){
  // Only sprite constructors are deliberately sliced out of the original sims.
  const installed={iterated:'peepSource',splash:'splashSource'}[name]??name;
  assert.equal(emitted.filter(entry=>entry===installed).length,1,installed+' must be emitted exactly once');
 }
 assert(emitted.indexOf('streetBriefing')<emitted.indexOf('streetUI'));
 assert(emitted.indexOf('councilProductionUI')<emitted.indexOf('sharingCouncilUI'));
 assert.equal(emitted.at(-1),'runtime','interactive runtime starts only after all helper definitions');
});

test('the emitted street briefing script exposes the function used on first street entry',async()=>{
 assert(emitted.includes('streetBriefing'));
 const context={window:{}};
 vm.runInNewContext(await fs.readFile(new URL('../lib/street-briefing.js',import.meta.url),'utf8'),context);
 assert.equal(typeof context.window.installStreetBriefing,'function');
 // Empty notices must also install safely before the first complete street day.
 const scene={time:8,entrance:1,graphics:{visible:false},game:null};
 context.window.installStreetBriefing({game:{tutorial:{pending:[]}},scene});
 assert.equal(typeof scene.onChange,'function');
 assert.doesNotThrow(()=>scene.onChange({complete:true}));
});
