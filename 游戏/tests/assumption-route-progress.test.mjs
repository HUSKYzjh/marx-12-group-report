import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPrologue,prologueReducer,restorePrologue} from '../lib/prologue-state.ts';
import {assumptionRouteProgress,IF_BRANCHES} from '../lib/assumption-route-progress.ts';

const specs=[
 ['automation','OPEN_TECHNOLOGY','TECHNOLOGY','technology',null],
 ['time','OPEN_TECHNOLOGY','TECHNOLOGY','technology','CALENDAR'],
 ['space','OPEN_NEEDS','NEEDS','needsTechnology','FREIGHT'],
 ['services','OPEN_NEEDS','NEEDS','needsTechnology','CARE'],
 ['concentration','OPEN_OWNERSHIP','OWNERSHIP','ownershipTechnology','NETWORK'],
 ['sharing','OPEN_OWNERSHIP','OWNERSHIP','ownershipTechnology','COUNCIL'],
 ['policy','OPEN_RULES','RULES','marketRules','DEMAND'],
 ['prices','OPEN_RULES','RULES','marketRules','PRESERVATION'],
];
function experiment(spec){
 const [branch,open,edit,field,core]=spec;
 let s=prologueReducer(initialPrologue(),{type:'NAVIGATE_CHAPTER',chapter:'automation'});
 s=prologueReducer(s,{type:'BACK_ASSUMPTIONS'});s=prologueReducer(s,{type:open,branch});
 const step=a=>{s=prologueReducer(s,{type:edit,action:core?{type:core,action:a}:a});};
 const state=()=>core?s[field][{CALENDAR:'calendar',FREIGHT:'freight',CARE:'care',NETWORK:'network',COUNCIL:'council',DEMAND:'demand',PRESERVATION:'workbench'}[core]]:s[field];
 return {step,state,get:()=>s,set:v=>s=v};
}
test('a new or merely visited route is not a played receipt or a completion score',()=>{
 const s=initialPrologue(),before=structuredClone(s),signs=assumptionRouteProgress(s);
 assert.equal(Object.keys(signs).length,8);assert(IF_BRANCHES.every(b=>signs[b].kind==='new'&&signs[b].receipts===0));assert.deepEqual(s,before);
 for(const spec of specs){const e=experiment(spec);assert.equal(assumptionRouteProgress(e.get())[spec[0]].kind,'new');e.step({type:'BEGIN'});assert.equal(assumptionRouteProgress(e.get())[spec[0]].kind,'draft');assert.equal(assumptionRouteProgress(e.get())[spec[0]].receipts,0);}
});
for(const spec of specs)test(spec[0]+': only real execution produces a receipt; reset overrides the old archive',()=>{
 const e=experiment(spec),branch=spec[0];e.step({type:'BEGIN'});
 if(branch==='automation'){e.step({type:'ASSIGN',person:0,mode:'time'});assert.equal(assumptionRouteProgress(e.get())[branch].receipts,0);e.step({type:'RUN'});}
 if(branch==='time'){e.step({type:'PLACE_DAY',from:4,to:'rest'});assert.equal(assumptionRouteProgress(e.get())[branch].receipts,0);e.step({type:'RUN'});}
 if(branch==='services'){e.step({type:'VOUCHER',voucher:0,person:4});assert.equal(assumptionRouteProgress(e.get())[branch].receipts,0);e.step({type:'RUN',expectedRevision:e.state().revision});}
 if(branch==='space'){e.step({type:'CONTRACT',order:12});for(let i=0;i<3;i++){e.step({type:'PRODUCE',expectedRound:i});e.step({type:'LAUNCH',expectedRound:i});if(i===0)assert.equal(assumptionRouteProgress(e.get())[branch].label,'这轮已开始 · 接着做');}}
 if(branch==='concentration'){e.step({type:'CONNECT',shop:0,to:'B'});assert.equal(assumptionRouteProgress(e.get())[branch].receipts,0);for(let i=0;i<2;i++)e.step({type:'OPERATE',expectedRevision:e.state().revision});}
 if(branch==='sharing'){for(let i=0;i<6;i++)e.step({type:'ROLL',roll:i,to:i});assert.equal(assumptionRouteProgress(e.get())[branch].receipts,0);e.step({type:'DISTRIBUTE',expectedRevision:e.state().revision});e.step({type:'BALLOT',to:'divide'});e.step({type:'VOTE',expectedRevision:e.state().revision});}
 if(branch==='policy'){for(let i=0;i<2;i++){e.step({type:'FUND',expectedRevision:e.state().revision});e.step({type:'NEXT',expectedRevision:e.state().revision});if(i===0)assert.equal(assumptionRouteProgress(e.get())[branch].receipts,0);}}
 if(branch==='prices'){e.step({type:'CONNECT',tool:'cold',enabled:true,expectedRevision:e.state().revision});assert.equal(assumptionRouteProgress(e.get())[branch].receipts,0);e.step({type:'RUN',expectedRevision:e.state().revision});assert.equal(assumptionRouteProgress(e.get())[branch].receipts,0);e.step({type:'NEXT',expectedRevision:e.state().revision});e.step({type:'RUN',expectedRevision:e.state().revision});}
 const actual=structuredClone(e.get());assert.deepEqual(assumptionRouteProgress(actual)[branch],{kind:'receipt',receipts:1,label:'已有 1 份回执 · 接着试'});assert.deepEqual(assumptionRouteProgress(restorePrologue(JSON.stringify(actual)))[branch],assumptionRouteProgress(actual)[branch]);
 e.set(prologueReducer(e.get(),{type:'BACK_ASSUMPTIONS'}));const other=specs.find(v=>v[0]!==branch);e.set(prologueReducer(e.get(),{type:other[1],branch:other[0]}));assert.deepEqual(assumptionRouteProgress(e.get())[branch],assumptionRouteProgress(actual)[branch]);
 e.set(prologueReducer(e.get(),{type:'BACK_ASSUMPTIONS'}));e.set(prologueReducer(e.get(),{type:spec[1],branch}));e.set(prologueReducer(e.get(),{type:spec[2],action:{type:'RESTART'}}));assert.equal(assumptionRouteProgress(e.get())[branch].kind,'new');assert.equal(assumptionRouteProgress(e.get())[branch].receipts,0);assert(e.get().branchArchive[branch],'the active reset must override this older archived result');
});
test('a conclusion flag alone does not invent results; legacy saves keep a distinct record sign',()=>{
 const s=initialPrologue();s.technology={branch:'automation',phase:'conclusion',rate:60,mode:'cut',seen:0,run:null};assert.equal(assumptionRouteProgress(s).automation.receipts,0);
 s.technology.run={mode:'cut',rate:60};assert.equal(assumptionRouteProgress(s).automation.kind,'legacy');assert.equal(assumptionRouteProgress(s).automation.receipts,0);
});
