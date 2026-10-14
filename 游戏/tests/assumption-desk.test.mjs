import test from 'node:test';
import assert from 'node:assert/strict';
import {initialAssumptionDesk,assumptionDeskReducer,restoreAssumptionDesk,CONDITION_GROUPS,ASSUMPTION_DIALOGUE} from '../lib/assumption-desk.ts';
import {initialPrologue,prologueReducer,restorePrologue} from '../lib/prologue-state.ts';
import {PROLOGUE_ASSUMPTIONS} from '../lib/relief-experiment.ts';
const edit=(s,a)=>assumptionDeskReducer(s,{expectedRevision:s.revision,...a});
const browsing=()=>prologueReducer(prologueReducer(initialPrologue(),{type:'NAVIGATE_CHAPTER',chapter:'automation'}),{type:'BACK_ASSUMPTIONS'});
test('dialogue advances once, retains exact conditional reply, and replays without changing selected conditions',()=>{
 let s=initialAssumptionDesk();
 for(let beat=0;beat<3;beat++){const old=s,a={type:'SPEAK',expectedBeat:beat,expectedRevision:s.revision};s=assumptionDeskReducer(s,a);assert.equal(s.beat,beat+1);assert.equal(assumptionDeskReducer(s,a),s);assert.notEqual(s,old);}
 assert.equal(ASSUMPTION_DIALOGUE[3],'那我们来看看，如果这些条件发生改变，会怎样？');
 assert.equal(edit(s,{type:'SPEAK',expectedBeat:3}),s);s=edit(s,{type:'SELECT',group:'labour'});s=edit(s,{type:'REPLAY'});assert.equal(s.beat,0);assert.equal(s.selected,'labour');
});
test('four conditions can be placed, swapped and returned; pickup and stale/invalid actions cannot change state',()=>{
 let s=initialAssumptionDesk();assert.deepEqual(CONDITION_GROUPS,PROLOGUE_ASSUMPTIONS.map(x=>x.id));
 for(const group of CONDITION_GROUPS){const a={type:'SELECT',group,expectedRevision:s.revision};s=assumptionDeskReducer(s,a);assert.equal(s.selected,group);assert.equal(s.beat,3);assert.equal(assumptionDeskReducer(s,a),s);assert.equal(edit(s,{type:'SELECT',group}),s);assert.equal(edit(s,{type:'SELECT',group:'money'}),s);}
 s=edit(s,{type:'SELECT',group:null});assert.equal(s.selected,null);assert.equal(s.beat,3);
});
test('directory actions are scene- and story-gated, not a way to forge progress',()=>{
 let s=initialPrologue(),a={type:'ASSUMPTION_DESK',action:{type:'SELECT',group:'needs',expectedRevision:0}};assert.equal(prologueReducer(s,a),s);
 s={...s,scene:'assumptions'};assert.equal(prologueReducer(s,a),s);
 s=browsing();const before=structuredClone(s);s=prologueReducer(s,a);assert.equal(s.assumptionDesk.selected,'needs');assert.deepEqual(s.reliefCompleted,[]);assert.equal(s.epilogueBeat,0);assert.deepEqual(s.technology,before.technology);assert.equal(s.street,before.street);
});
test('refresh persists view, legacy snapshots get an empty desk and existing played branch accounts survive',()=>{
 let s=browsing();s=prologueReducer(s,{type:'ASSUMPTION_DESK',action:{type:'SELECT',group:'ownership',expectedRevision:0}});
 assert.deepEqual(restorePrologue(JSON.stringify(s)),s);
 const old=structuredClone(s);delete old.assumptionDesk;const restored=restorePrologue(old);assert.deepEqual(restored.assumptionDesk,initialAssumptionDesk());assert.deepEqual(restored.technology,s.technology);assert.deepEqual(restored.reliefCompleted,s.reliefCompleted);
 const withExtra={...s.assumptionDesk,cash:99999,completed:true};assert.deepEqual(restoreAssumptionDesk(withExtra),s.assumptionDesk);
});
test('invalid desk snapshots do not restore invented selections or revisions',()=>{
 for(const bad of [null,[],{beat:4,selected:null,revision:0},{beat:0,selected:'unknown',revision:0},{beat:0,selected:null,revision:-1},{beat:0,selected:null,revision:1.5}])assert.equal(restoreAssumptionDesk(bad),null);
 const s=browsing();s.assumptionDesk={beat:9,selected:null,revision:0};assert.deepEqual(restorePrologue(s),initialPrologue());
});
test('return from a branch keeps its real run and desk; every hypothesis still has two distinct if lines',()=>{
 let s=browsing();s=prologueReducer(s,{type:'ASSUMPTION_DESK',action:{type:'SELECT',group:'labour',expectedRevision:0}});s=prologueReducer(s,{type:'OPEN_TECHNOLOGY',branch:'time'});const chapter=s.technology;s=prologueReducer(s,{type:'BACK_ASSUMPTIONS'});assert.equal(s.assumptionDesk.selected,'labour');assert.equal(s.technology,chapter);
 assert(PROLOGUE_ASSUMPTIONS.every(g=>g.ifs.length===2));assert.equal(new Set(PROLOGUE_ASSUMPTIONS.flatMap(g=>g.ifs.map(x=>x.id))).size,8);
});
