import test from 'node:test';
import assert from 'node:assert/strict';
import {MOTIONS,ATLASES,TRUST_HATS,PROPS,sampleMotion} from '../public/assets/character-lab/motions.mjs';
test('character library distinguishes atlas frames from complete action recipes',()=>{
  assert.equal(ATLASES.length,20);assert.equal(MOTIONS.length,24);
  assert.equal(new Set(MOTIONS.map(m=>m.id)).size,24);
});
test('Trust laugh, unused grin and dizzy faces are distinct resources',()=>{
  assert.equal(sampleMotion('trust-laugh',.4).layers[1].frame,10);
  assert.equal(sampleMotion('trust-grin',.4).layers[1].frame,11);
  assert(sampleMotion('trust-dizzy',.4).layers[1].frame>=18);
  assert(sampleMotion('trust-laugh',.01).y<0);
});
test('once-only facial transitions stop at their intended final frame',()=>{
  assert.equal(sampleMotion('wb-shocked',100).layers[1].frame,22);
  assert.equal(sampleMotion('wb-calm',100).layers[1].frame,6);
  assert.equal(sampleMotion('wb-angry',100).layers[1].frame,10);
  assert.equal(sampleMotion('wb-hat',100).layers.find(l=>l.atlas==='hat').frame,15);
  assert.equal(sampleMotion('wb-help',100).layers[0].frame,110);
});
test('full-body animation recipes never get a second generic body',()=>{
  for(const id of ['wb-help','wb-protest','wb-happy','wb-crazy-walk','wb-crazy-shout']){
    assert.equal(sampleMotion(id,.2).layers.length,1);
    assert.notEqual(sampleMotion(id,.2).layers[0].atlas,'body');
  }
});
test('head shapes, special face anchors, mirroring and zero amplitude remain independent',()=>{
  assert.equal(sampleMotion('wb-walk',.2,{shape:1}).layers[0].frame,1);
  assert.equal(sampleMotion('wb-smug',.2).layers[1].anchorY,1.25);
  assert.equal(sampleMotion('wb-angry',.2).layers[1].anchorX,1/3);
  assert.equal(sampleMotion('wb-shout',.2).layers[1].anchorX,1/3);
  assert.equal(sampleMotion('trust-laugh',.2,{intensity:0}).y===0,true);
  assert.equal(sampleMotion('trust-laugh',.2,{mirror:true}).sx,-sampleMotion('trust-laugh',.2).sx);
});
test('samples are deterministic and unknown actions fail explicitly',()=>{
  for(const m of MOTIONS)assert.deepEqual(sampleMotion(m.id,.33),sampleMotion(m.id,.33));
  assert.throws(()=>sampleMotion('unknown',0),RangeError);
});
test('hat labels include all six source frames and layers match original display order',()=>{
  assert.deepEqual(TRUST_HATS.map(h=>h.frame),[12,13,14,15,16,17]);
  assert.deepEqual(TRUST_HATS.map(h=>h.label),['红色帽','蓝色帽','深色帽','粉色帽','黄色帽','格纹帽']);
  for(const h of TRUST_HATS)assert.deepEqual(sampleMotion('trust-grin',.2,{hat:h.frame}).layers.map(l=>l.frame),[0,h.frame,11]);
  assert.deepEqual(sampleMotion('wb-hat',.2).layers.map(l=>l.atlas),['hat','body','face']);
});
test('four prop resources use unique local source paths',()=>{
  assert.equal(PROPS.length,4);assert.equal(new Set(PROPS.map(p=>p.path)).size,4);
  for(const p of PROPS)assert(p.path.startsWith('../wbwwb-source/')&&p.path.endsWith('.png'));
});
