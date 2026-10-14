import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ATLASES,MOTIONS,PROPS,sampleMotion} from '../public/assets/character-lab/motions.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p));
const parse=p=>JSON.parse(read(p).toString('utf8').replace(/^\uFEFF/,''));
const manifest=parse('public/assets/wbwwb-source/provenance.json');
assert.equal(manifest.commit,'7c68c7e44e66b5be95ebd07d22391de707090397');
assert.equal(manifest.files.length,55);
for(const file of manifest.files){
  const b=read(file.path);assert.equal(b.length,file.bytes,file.path);
  assert.equal(createHash('sha256').update(b).digest('hex'),file.sha256,file.path);
  assert.equal(createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex'),file.gitBlobSha,file.path);
  assert(!/blood|gore|weapon|\.mp3$|\.ogg$|laptop|pixi\.min|howler/i.test(file.path));
  if(file.width){assert.equal(b.readUInt32BE(16),file.width);assert.equal(b.readUInt32BE(20),file.height);}
}
const trustRecords=parse('public/assets/trust-source/provenance.json').files;
for(const name of ['iterated_peep.png','iterated_peep.json','iterated_coin.png','iterated_coin.json']){
  const record=trustRecords.find(r=>r.path==='public/assets/trust/'+name);assert(record);
  assert.equal(createHash('sha256').update(read('public/assets/trust/'+name)).digest('hex'),record.sha256);
}
const atlases=new Map();let frames=0;
for(const a of ATLASES){
  const relative=path.posix.normalize('public/assets/character-lab/'+a.path);
  const j=parse(relative+'.json'),b=read(relative+'.png');const width=b.readUInt32BE(16),height=b.readUInt32BE(20);
  assert.equal(j.meta.size.w,width);assert.equal(j.meta.size.h,height);
  for(const data of Object.values(j.frames)){
    const f=data.frame;assert(f.x>=0&&f.y>=0&&f.w>0&&f.h>0&&f.x+f.w<=width&&f.y+f.h<=height);
    assert(!data.rotated);frames++;
  }
  atlases.set(a.id,Object.values(j.frames));
}
assert.equal(new Set(MOTIONS.map(m=>m.id)).size,MOTIONS.length);
for(const prop of PROPS){
  const relative=path.posix.normalize('public/assets/character-lab/'+prop.path);
  assert(manifest.files.some(f=>f.path===relative),'prop has original source record: '+prop.id);
}
for(const m of MOTIONS){
  assert(fs.existsSync(path.join(root,m.source)));
  for(const shape of [0,1]) for(let i=0;i<=120;i++){
    const s=sampleMotion(m.id,m.seconds*i/60,{shape,intensity:1.5,hat:13,mirror:!!(i%2)});
    for(const l of s.layers)assert(atlases.get(l.atlas)?.[l.frame],`${m.id}: ${l.atlas} ${l.frame}`);
    for(const key of ['x','y','rotation','sx','sy','scale'])assert(Number.isFinite(s[key]));
  }
}
assert.equal(sampleMotion('trust-laugh',.5).layers[1].frame,10);
assert.equal(sampleMotion('trust-grin',.5).layers[1].frame,11);
assert(sampleMotion('trust-laugh',.02).y<0);
assert.equal(Math.abs(sampleMotion('trust-laugh',.02,{intensity:0}).y),0);
assert.equal(sampleMotion('wb-shocked',5).layers[1].frame,22);
assert.equal(sampleMotion('wb-calm',5).layers[1].frame,6);
assert.equal(sampleMotion('wb-help',20).layers[0].frame,110);
assert.throws(()=>sampleMotion('unknown',0));
const html=read('public/assets/character-lab/index.html').toString();assert(!/src="https?:|vendor\/|pixi|howler/i.test(html));
console.log(JSON.stringify({result:'PASS',pinnedWbFiles:manifest.files.length,originalTrustFiles:4,atlasGroups:ATLASES.length,atlasFrames:frames,motionRecipes:MOTIONS.length,propImages:PROPS.length,audioFiles:0,upstreamGameScriptsExecuted:0},null,2));
