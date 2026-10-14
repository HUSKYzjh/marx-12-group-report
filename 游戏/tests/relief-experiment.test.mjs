import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPrologue,prologueReducer as reduce,restorePrologue,PROLOGUE_STAGES} from '../lib/prologue-state.ts';
import {RELIEF_ROUTES} from '../lib/crisis-model.ts';
import {reliefFrame,EPILOGUE_DELAYS,EPILOGUE_QUOTE,PROLOGUE_ASSUMPTIONS} from '../lib/relief-experiment.ts';

const start=()=>reduce(initialPrologue(),{type:'JUMP_STAGE',stage:4});
function finish(s,route){for(const a of [{type:'CHOOSE_RELIEF',route},{type:'RELIEF_ADVANCE',expectedPhase:'ready'},{type:'RELIEF_ADVANCE',expectedPhase:'improved'},{type:'RELIEF_CONDITION',sustained:true},{type:'RELIEF_COMPLETE'},{type:'RELIEF_MENU'}]){s=reduce(s,a);assert.deepEqual(restorePrologue(JSON.stringify(s)),s);}return s;}
test('each remedy changes visible outcomes after its operation, then exposes a condition',()=>{
 for(const route of RELIEF_ROUTES){
  assert.equal(reliefFrame(route,'ready',false).unsold,10);
  assert.equal(reliefFrame(route,'improved',false).unsold,0);
  const stress=reliefFrame(route,'stress',false);assert.equal(stress.unsold,10);
  assert.equal(stress.output,route==='investment'?60:50);
  assert.equal(reliefFrame(route,'compare',true).unsold,0);
  assert.equal(reliefFrame(route,'done',false).unsold,10);
 }
});
test('visiting every route cannot unlock the end; repeats cannot duplicate completion',()=>{
 let s=start();for(const route of RELIEF_ROUTES)s=reduce(s,{type:'CHOOSE_RELIEF',route});
 assert.equal(s.reliefVisited.length,3);assert.deepEqual(s.reliefCompleted,[]);assert.strictEqual(reduce(s,{type:'FINISH_RELIEF'}),s);
 for(const route of RELIEF_ROUTES){s=finish(s,route);if(s.reliefCompleted.length<3)assert.strictEqual(reduce(s,{type:'FINISH_RELIEF'}),s);}
 assert.deepEqual(s.reliefCompleted,[...RELIEF_ROUTES]);s=finish(s,'consumption');assert.equal(s.reliefCompleted.length,3);
});
test('the epilogue, slower doubt, skip and premise list are ordered and refresh-safe',()=>{
 let s=start();const endDot=PROLOGUE_STAGES.findIndex(s=>s.scene==='epilogue'),listDot=PROLOGUE_STAGES.findIndex(s=>s.scene==='assumptions');
 assert.strictEqual(reduce(s,{type:'JUMP_STAGE',stage:endDot}),s);assert.strictEqual(reduce(s,{type:'JUMP_STAGE',stage:listDot}),s);
 for(const route of RELIEF_ROUTES)s=finish(s,route);s=reduce(s,{type:'FINISH_RELIEF'});assert.equal(s.scene,'epilogue');assert.equal(s.epilogueBeat,0);
 assert(EPILOGUE_DELAYS[1]>EPILOGUE_DELAYS[0]);assert.match(EPILOGUE_QUOTE,/落了片白茫茫大地真干净/);assert(!EPILOGUE_QUOTE.includes('大地的'));
 assert.strictEqual(reduce(s,{type:'SHOW_ASSUMPTIONS'}),s);assert.strictEqual(reduce(s,{type:'EPILOGUE_NEXT',expectedBeat:1}),s);
 for(const beat of [0,1,2]){s=reduce(s,{type:'EPILOGUE_NEXT',expectedBeat:beat});assert.equal(s.epilogueBeat,beat+1);assert.deepEqual(restorePrologue(JSON.stringify(s)),s);}
 s=reduce(s,{type:'SHOW_ASSUMPTIONS'});assert.equal(s.scene,'assumptions');assert.deepEqual(restorePrologue(JSON.stringify(s)),s);
 assert(PROLOGUE_ASSUMPTIONS.every(s=>s.scope&&s.ifs.length>=2));assert(new Set(PROLOGUE_ASSUMPTIONS.flatMap(s=>s.ifs.map(i=>i.id))).size===8);
});
test('saved visits migrate without inventing completed experiments; invalid proofs are rejected',()=>{
 let s=reduce(start(),{type:'CHOOSE_RELIEF',route:'consumption'});const old={...s,reliefSustained:true};for(const k of ['reliefPhase','reliefTested','reliefCompleted','epilogueBeat'])delete old[k];
 const migrated=restorePrologue(old);assert.deepEqual(migrated.reliefVisited,['consumption']);assert.deepEqual(migrated.reliefCompleted,[]);assert.equal(migrated.reliefPhase,'ready');
 for(const invalid of [{...s,reliefPhase:'done',reliefTested:3},{...s,reliefTested:2},{...s,reliefCompleted:['exports']},{...s,scene:'epilogue'},{...s,epilogueBeat:4},{...s,reliefPhase:'compare',reliefTested:0}])assert.deepEqual(restorePrologue(invalid),initialPrologue());
});
