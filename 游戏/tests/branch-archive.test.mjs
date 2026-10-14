import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPrologue,prologueReducer as reduce,restorePrologue} from '../lib/prologue-state.ts';

const specs=[
 {branch:'automation',open:'OPEN_TECHNOLOGY',edit:'TECHNOLOGY',field:'technology',actions:[{type:'BEGIN'},{type:'ASSIGN',person:0,mode:'time'},{type:'RUN'}]},
 {branch:'time',open:'OPEN_TECHNOLOGY',edit:'TECHNOLOGY',field:'technology',core:'CALENDAR',child:'calendar',actions:[{type:'BEGIN'},{type:'PLACE_DAY',from:2,to:'rest'},{type:'RUN'}]},
 {branch:'space',open:'OPEN_NEEDS',edit:'NEEDS',field:'needsTechnology',core:'FREIGHT',child:'freight',actions:[{type:'BEGIN'},{type:'CONTRACT',order:12},{type:'PRODUCE',expectedRound:0}]},
 {branch:'services',open:'OPEN_NEEDS',edit:'NEEDS',field:'needsTechnology',core:'CARE',child:'care',actions:[{type:'BEGIN'},{type:'WORKER',worker:0,slot:'bench'},{type:'RUN'}]},
 {branch:'concentration',open:'OPEN_OWNERSHIP',edit:'OWNERSHIP',field:'ownershipTechnology',core:'NETWORK',child:'network',actions:[{type:'BEGIN'},{type:'OPERATE'}]},
 {branch:'sharing',open:'OPEN_OWNERSHIP',edit:'OWNERSHIP',field:'ownershipTechnology',core:'COUNCIL',child:'council',actions:[{type:'BEGIN'},...Array.from({length:6},(_,roll)=>({type:'ROLL',roll,to:roll})),{type:'DISTRIBUTE'},{type:'BALLOT',to:'divide'},{type:'VOTE'}]},
 {branch:'policy',open:'OPEN_RULES',edit:'RULES',field:'marketRules',core:'DEMAND',child:'demand',actions:[{type:'BEGIN'},{type:'LOAN',person:0,enabled:true},{type:'FUND'}]},
 {branch:'prices',open:'OPEN_RULES',edit:'RULES',field:'marketRules',core:'PRESERVATION',child:'workbench',actions:[{type:'BEGIN'},{type:'PRICE',price:1},{type:'RUN'}]},
];
const browsing=()=>reduce(reduce(initialPrologue(),{type:'NAVIGATE_CHAPTER',chapter:'automation'}),{type:'BACK_ASSUMPTIONS'});
function operate(s,spec){
 s=reduce(s,{type:spec.open,branch:spec.branch});
 for(const draft of spec.actions){
  const child=spec.child?s[spec.field][spec.child]:null;
  const action={...draft,...(child?{expectedRevision:child.revision}:{})};
  const next=reduce(s,{type:spec.edit,action:spec.core?{type:spec.core,action}:action});
  assert.notDeepEqual(next[spec.field],s[spec.field],`${spec.branch} really executes ${draft.type}`);s=next;
 }
 return s;
}

test('all eight real if cores retain drafts, payments and histories across siblings and refresh',()=>{
 let s=browsing();const snapshots={};
 for(const spec of specs){s=operate(s,spec);snapshots[spec.branch]=structuredClone(s[spec.field]);s=reduce(s,{type:'BACK_ASSUMPTIONS'});assert.deepEqual(restorePrologue(JSON.stringify(s)),s);}
 for(const spec of specs){s=reduce(restorePrologue(JSON.stringify(s)),{type:spec.open,branch:spec.branch});assert.deepEqual(s[spec.field],snapshots[spec.branch]);s=reduce(s,{type:'BACK_ASSUMPTIONS'});}
 assert.equal(Object.keys(s.branchArchive).length,8);assert.equal(s.reliefCompleted.length,0);assert.equal(s.prologueStatus,'notStarted');
});

test('explicit restart resets only that experiment; a stale saved copy cannot resurrect its old payments',()=>{
 let s=operate(browsing(),specs[0]);const oldAI=structuredClone(s.technology);s=reduce(s,{type:'BACK_ASSUMPTIONS'});
 s=operate(s,specs[1]);const calendar=structuredClone(s.technology);s=reduce(s,{type:'BACK_ASSUMPTIONS'});
 s=reduce(s,{type:'OPEN_TECHNOLOGY',branch:'automation'});assert.deepEqual(s.technology,oldAI);
 s=reduce(s,{type:'TECHNOLOGY',action:{type:'RESTART'}});assert.equal(s.technology.phase,'intro');assert.equal(s.technology.run,null);
 s=reduce(s,{type:'BACK_ASSUMPTIONS'});s=reduce(s,{type:'OPEN_TECHNOLOGY',branch:'time'});assert.deepEqual(s.technology,calendar);
 s=reduce(s,{type:'BACK_ASSUMPTIONS'});s=reduce(s,{type:'OPEN_TECHNOLOGY',branch:'automation'});assert.equal(s.technology.phase,'intro');assert.equal(s.technology.run,null);
});

test('legacy snapshots gain no invented history and preserve their current actual run',()=>{
 const old=operate(browsing(),specs[0]);delete old.branchArchive;
 let s=restorePrologue(old);assert.deepEqual(s.branchArchive,{});assert.deepEqual(s.technology,old.technology);
 s=reduce(s,{type:'BACK_ASSUMPTIONS'});s=operate(s,specs[1]);s=reduce(s,{type:'BACK_ASSUMPTIONS'});s=reduce(s,{type:'OPEN_TECHNOLOGY',branch:'automation'});assert.deepEqual(s.technology,old.technology);
});

test('archive restores by actual branch validator, rejects wrong keys and impossible funded records',()=>{
 let s=browsing();for(const spec of specs){s=operate(s,spec);s=reduce(s,{type:'BACK_ASSUMPTIONS'});}s=reduce(s,{type:'OPEN_TECHNOLOGY',branch:'automation'});
 for(const archive of [null,[],{notAChapter:s.technology},{automation:s.branchArchive.time},{automation:{...s.technology,rate:100}},{policy:{...s.branchArchive.policy,demand:{...s.branchArchive.policy.demand,revision:-1}}}])assert.equal(restorePrologue({...s,branchArchive:archive}).scene,'opening');
 const restored=restorePrologue(s);assert.deepEqual(restored,s);s.branchArchive.automation.allocations[0]='cut';assert.equal(restored.branchArchive.automation.allocations[0],'time');
});

test('scene gates and malformed branch opens cannot fabricate history or preceding-story completion',()=>{
 const home=initialPrologue();for(const spec of specs)assert.equal(reduce(home,{type:spec.open,branch:spec.branch}),home);
 const s=browsing();assert.equal(reduce(s,{type:'OPEN_NEEDS',branch:'prices'}),s);assert.deepEqual(s.branchArchive,{});
});

test('platform next-wiring draft and old paid account survive a sibling visit and refresh, without executing on navigation',()=>{
 let s=operate(browsing(),specs[4]);
 const act=action=>{s=reduce(s,{type:'OWNERSHIP',action:{type:'NETWORK',action:{...action,expectedRevision:s.ownershipTechnology.network.revision}}});};
 act({type:'CONNECT',shop:0,to:'B'});act({type:'OPERATE'});act({type:'NEXT_RULE',rule:'portable'});const pending=structuredClone(s.ownershipTechnology);
 s=reduce(s,{type:'BACK_ASSUMPTIONS'});s=operate(s,specs[5]);const sibling=structuredClone(s.ownershipTechnology);s=reduce(s,{type:'BACK_ASSUMPTIONS'});
 s=restorePrologue(JSON.stringify(s));s=reduce(s,{type:'OPEN_OWNERSHIP',branch:'concentration'});assert.deepEqual(s.ownershipTechnology,pending);assert.equal(s.ownershipTechnology.network.trials.length,1);
 act({type:'COMPARE'});assert.equal(s.ownershipTechnology.network.trials.length,2);assert.equal(s.ownershipTechnology.network.rule,'portable');
 s=reduce(s,{type:'BACK_ASSUMPTIONS'});s=reduce(s,{type:'OPEN_OWNERSHIP',branch:'sharing'});assert.deepEqual(s.ownershipTechnology,sibling);
});
