import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import atlases from '../public/assets/workshop-v6/trust-frames.mjs';
import {sampleScenarios,person,machine,products,income,timeRuler,ledger,sourceSamples,relation,relationSymbol,relationTypes,line} from '../public/assets/workshop-v6/trust-kit.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p));
const provenance=JSON.parse(read('public/assets/trust-source/provenance.json'));
for(const item of provenance.files){const data=read(item.path);assert.equal(data.length,item.bytes,item.path);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),item.sha256,item.path);assert.equal(crypto.createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex'),item.gitBlobSha,`${item.path}: pinned repository blob differs`);if(item.width){assert.equal(data.readUInt32BE(16),item.width);assert.equal(data.readUInt32BE(20),item.height);}}
let frameCount=0;
for(const [name,atlas]of Object.entries(atlases)){const match=provenance.files.find(i=>i.path.endsWith(`/${name}.json`));const actual=JSON.parse(read(match.path).toString('utf8').replace(/^\uFEFF/,''));assert.deepEqual(atlas,actual,`Stale frame definition: ${name}`);const png=provenance.files.find(i=>i.path.endsWith(`/${name}.png`));assert.equal(atlas.meta.size.w,png.width);assert.equal(atlas.meta.size.h,png.height);for(const {frame:f}of Object.values(atlas.frames)){assert(f.x>=0&&f.y>=0&&f.w>0&&f.h>0&&f.x+f.w<=png.width&&f.y+f.h<=png.height);frameCount++;}}
const kit=read('public/assets/workshop-v6/trust-kit.mjs').toString();
const css=read('public/assets/workshop-v6/trust-kit.css').toString();
const entry=read('public/assets/workshop-v6/index.html').toString();
assert(!/art-kit\.(mjs|css)|specimen\.css|src="\.\/specimen\.mjs/.test(entry),'Rejected entry dependency');
assert(!/<path\b|\.svg['"`]/.test(kit),'New kit must use image crops, not rejected path artwork');
assert(css.includes('button_short.png')&&css.includes('0 -125px')&&css.includes('0 -250px'),'Original button states missing');
let scenarios=0;for(const s of Object.values(sampleScenarios)){const markup=person(13)+person(15)+products(s.products)+income(s.wage)+timeRuler(s.hours)+ledger(s);assert(!markup.includes('undefined'));assert.equal(s.wages,2*s.wage);assert.equal(s.revenue,3*s.products);scenarios++;}
assert.throws(()=>products(-1));assert.throws(()=>products(33));assert.throws(()=>income(1.5));assert.throws(()=>timeRuler(9));assert.throws(()=>person(99));
for(const [label,,render]of sourceSamples){assert(render().length>0,label);}
const customMachines=['old','new'].map(kind=>{
 const file=`machine-${kind}-v1.png`,data=read(`public/assets/workshop-v6/${file}`);
 assert.equal(data.readUInt32BE(16),1774);assert.equal(data.readUInt32BE(20),887);
 assert.equal(data[25],6,'Machines must be RGBA PNGs');
 assert(machine(kind==='new').includes(file));
 return crypto.createHash('sha256').update(data).digest('hex');
});
assert.notEqual(customMachines[0],customMachines[1],'Old/new machines must be distinct images');
assert(!machine(false).includes('×1')&&!machine(true).includes('×2'));
for(const kind of Object.keys(relationTypes)){
 assert(relation(kind).includes(relationTypes[kind].label));
 assert(relationSymbol(kind).includes(`tr-symbol-${kind}`));
 assert(!relation(kind).includes('undefined'));
}
assert.throws(()=>relation('invalid'));assert.throws(()=>relationSymbol('__proto__'));
assert(line().includes('preserveAspectRatio="none"'));
const relationCss=read('public/assets/workshop-v6/relation-marks.css').toString();
assert(relationCss.includes('rotate(90deg)')&&relationCss.includes('rotate(-90deg)'));
assert(entry.includes('relation-marks.css')&&entry.includes('aria-live="polite"'));
console.log(JSON.stringify({result:'PASS',originalFiles:provenance.files.length,pinnedGitBlobsMatched:provenance.files.length,pngs:provenance.files.filter(i=>i.width).length,atlasFrames:frameCount,scenarios,negativeChecks:5,sourceSampleGroups:sourceSamples.length,rejectedSvgDependencies:0,scope:'Source integrity and renderer inputs; browser visual QA is separate'},null,2));
