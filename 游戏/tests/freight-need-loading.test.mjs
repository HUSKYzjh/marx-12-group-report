import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSpaceFreight,freightReducer as step,freightAccount,freightNeedSlot,restoreSpaceFreight,FREIGHT_KINDS} from '../lib/space-freight.ts';
const load=(s,crate,kind)=>step(s,{type:'LOAD_FOR_NEED',crate,kind,expectedRound:s.history.length});
const lab=()=>step(initialSpaceFreight(true),{type:'BEGIN'});

test('matching a need reserves cargo, never pays or builds; mismatch, duplicate and stale drops do nothing',()=>{
 let s=step(lab(),{type:'PRODUCE',expectedRound:0});const original=s,a=freightAccount(s,s.pending);
 assert.equal(freightNeedSlot(s,0,'power'),0);assert.equal(load(s,0,'air'),s);
 assert.equal(load(s,999,'power'),s);assert.equal(load(s,0,'unknown'),s);
 assert.equal(step(s,{type:'LOAD_FOR_NEED',crate:0,kind:'power',expectedRound:1}),s);
 s=load(s,0,'power');assert.equal(s.cargo[0],0);assert.deepEqual(freightAccount(s,s.pending),a);
 assert.equal(load(s,0,'power'),s);assert.equal(freightNeedSlot(s,0,'power'),null);
 s=step(s,{type:'UNLOAD',slot:0});assert.deepEqual(s,original);
 for(const crate of a.crates)s=load(s,crate.id,crate.kind);
 assert.equal(s.cargo.filter(id=>id!==null).length,4);assert.equal(load(s,4,'air'),s);
 assert.equal(freightAccount(s,s.pending).habitats,0);assert.equal(freightAccount(s,s.pending).buyer,96);
 s=step(s,{type:'LAUNCH',expectedRound:0});assert.equal(freightAccount(s).habitats,1);assert.equal(freightAccount(s).buyer,80);
 s=step(s,{type:'PRODUCE',expectedRound:1});assert.equal(load(s,4,'air'),s,'a wish with no signed payment does not sell');
 assert.deepEqual(restoreSpaceFreight(s),s);
});

test('manual unloading leaves a reusable free slot; construction-only targets do not change legacy freight',()=>{
 let s=step(lab(),{type:'PRODUCE',expectedRound:0});s=load(s,0,'power');s=load(s,1,'air');s=step(s,{type:'UNLOAD',slot:0});
 assert.equal(freightNeedSlot(s,2,'structure'),0);s=load(s,2,'structure');assert.deepEqual(s.cargo.slice(0,2),[2,1]);
 let old=step(initialSpaceFreight(),{type:'BEGIN'});old=step(old,{type:'PRODUCE',expectedRound:0});assert.equal(load(old,0,'power'),old);
 assert.equal(load(lab(),0,'power').stage,'planning');
});

test('all six-position recipes give exactly the same funded deliveries through need targets and manual cargo',()=>{
 for(let recipe=0;recipe<729;recipe++)for(const order of [4,12]){
  let s=step(lab(),{type:'CONTRACT',order}),code=recipe;
  for(let slot=0;slot<6;slot++){s=step(s,{type:'PLAN',slot,kind:FREIGHT_KINDS[code%3]});code=Math.floor(code/3);}
  let manual=structuredClone(s),matched=structuredClone(s);
  for(let round=0;round<3;round++){
   manual=step(manual,{type:'PRODUCE',expectedRound:round});matched=step(matched,{type:'PRODUCE',expectedRound:round});
   for(const crate of freightAccount(matched,matched.pending).crates){
    const slot=freightNeedSlot(matched,crate.id,crate.kind);matched=load(matched,crate.id,crate.kind);
    if(slot!==null)manual=step(manual,{type:'LOAD',crate:crate.id,slot});
   }
   assert.deepEqual(matched,manual);manual=step(manual,{type:'LAUNCH',expectedRound:round});matched=step(matched,{type:'LAUNCH',expectedRound:round});
   assert.deepEqual(matched,manual);assert.equal(freightAccount(matched).moneyAfter,156);assert.deepEqual(restoreSpaceFreight(matched),matched);
  }
 }
});
