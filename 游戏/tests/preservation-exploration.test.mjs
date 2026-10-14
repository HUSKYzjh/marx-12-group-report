import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPreservation,preservationReducer as reduce,preservationAccount,restorePreservation} from '../lib/preservation-workbench.ts';
import {preservationExploration} from '../lib/preservation-exploration.ts';
const setup=(price=2,cold=false,efficient=false,bake=true)=>({price,cold,efficient,bake});
const act=(s,a)=>reduce(s,{...a,expectedRevision:s.revision});
function arrange(s,p){s=act(s,{type:'PRICE',price:p.price});for(const tool of ['cold','efficient'])s=act(s,{type:'CONNECT',tool,enabled:p[tool]});if(s.flexibleBake&&s.day===2)s=act(s,{type:'BAKE',enabled:p.bake});return s;}
function finish(s){s=act(s,{type:'RUN'});s=act(s,{type:'NEXT'});return act(s,{type:'RUN'});}
function trial(first=setup(),second=first){let s=act(initialPreservation(true),{type:'BEGIN'});s=arrange(s,first);s=act(s,{type:'RUN'});s=act(s,{type:'NEXT'});s=arrange(s,second);return act(s,{type:'RUN'});}
test('questions and dated meals use actual receipts, not unexecuted settings',()=>{
 let s=act(initialPreservation(true),{type:'BEGIN'});assert.equal(preservationExploration(s),null);s=arrange(s,setup(1,true,true));s=act(s,{type:'RUN'});assert.equal(preservationExploration(s),null);s=act(s,{type:'NEXT'});assert.equal(preservationExploration(s),null);s=act(s,{type:'RUN'});const before=structuredClone(s),e=preservationExploration(s);assert.deepEqual(e.days.map(x=>x.bought),[2,2]);assert.match(e.question,/店里却少了6枚/,'an unnecessary cold cabinet has an actual purchase cost');assert.equal(preservationAccount(s).firm,44);assert.deepEqual(s,before);assert.deepEqual(preservationExploration(restorePreservation(s)),e);
});
test('moving the result switch retains both proposals but pays nothing and rewrites no receipt',()=>{
 const old=trial(setup(2,true));const saved=structuredClone(old),a=preservationAccount(old);assert.equal(a.stock,12);assert.equal(a.night.kept.length,6);assert.equal(preservationExploration(old).oldSold,6);assert.match(preservationExploration(old).question,/旧面包卖完，又剩了新的/);assert.match(preservationExploration(old).question,/第二天不开炉/);
 let s=act(old,{type:'REPLAN_BAKE',enabled:false});assert.equal(s.day,1);assert.equal(s.step,'arrange');assert.deepEqual(s.history,[]);assert.deepEqual(s.draft,old.history[0]);assert.deepEqual(s.nextDraft,{...old.history[1],bake:false});assert.deepEqual(s.trials,old.trials);assert.equal(preservationAccount(s).firm,50);assert.equal(preservationAccount(s).equipment,0);assert.equal(preservationAccount(s).moneyAfter,62);assert.deepEqual(restorePreservation(s),s);assert.deepEqual(old,saved);assert.equal(preservationExploration(s),null);
 s=act(s,{type:'RUN'});assert.equal(preservationAccount(s).equipment,6);assert.deepEqual(restorePreservation(s),s);s=act(s,{type:'NEXT'});assert.equal(s.draft.bake,false);assert.equal(s.nextDraft,undefined);s=act(s,{type:'RUN'});const b=preservationAccount(s),e=preservationExploration(s);assert.deepEqual(b.periods[0],a.periods[0]);assert.equal(b.periods[1].produced.length,0);assert.equal(b.periods[1].wages,6);assert.equal(b.firm,42);assert.equal(b.stock,0);assert.equal(e.oldSold,6);assert.match(e.question,/吃够/);assert.deepEqual(e.days.map(x=>x.bought),[1,1]);assert.equal(e.comparison.field,'bake');assert.match(e.comparison.text,/新做24→12，卖出12→12/);assert.match(e.comparison.text,/28→42/);assert.deepEqual(s.trials[0],saved.history);
});
test('dated price change preserves the other day and does not claim all goals improve',()=>{
 const old=trial(setup(2,true),setup(2,true,false,false));let s=act(old,{type:'REPLAN_PRICE',day:2,price:1});assert.deepEqual(s.draft,old.history[0]);assert.deepEqual(s.nextDraft,{...old.history[1],price:1});s=finish(s);const e=preservationExploration(s),a=preservationAccount(s);assert.equal(e.comparison.field,'price');assert.equal(e.comparison.day,2);assert.equal(a.firm,36);assert.deepEqual(e.days.map(x=>x.bought),[1,1]);assert.match(e.comparison.text,/42→36/);assert.match(e.comparison.text,/卖出12→12/);
 s=act(s,{type:'REPLAN_PRICE',day:1,price:1});assert.equal(s.draft.price,1);assert.equal(s.nextDraft.price,1);s=finish(s);assert.equal(preservationExploration(s).comparison.day,1);
});
test('cold and efficiency comparisons require exactly one dated change, not a mode label',()=>{
 let s=trial();s=act(s,{type:'REPLAN'});s=act(s,{type:'CONNECT',tool:'cold',enabled:true});s=finish(s);let e=preservationExploration(s);assert.equal(e.comparison.field,'cold');assert.equal(e.comparison.day,1);assert.match(e.comparison.text,/坏掉6→0，最终剩货6→12/);assert.equal(s.history[1].cold,false);
 s=act(s,{type:'REPLAN'});s=act(s,{type:'CONNECT',tool:'efficient',enabled:true});s=finish(s);e=preservationExploration(s);assert.equal(e.comparison.field,'efficient');assert.match(e.comparison.text,/原料支出24→15/);
 s=act(s,{type:'REPLAN'});s=act(s,{type:'PRICE',price:1});s=act(s,{type:'CONNECT',tool:'cold',enabled:false});s=finish(s);assert.equal(preservationExploration(s).comparison,null,'two changed inputs do not become a single causal claim');
});
test('late cold cannot resurrect yesterday, stopping an unprotected batch does not feed anyone',()=>{
 const late=trial(setup(),setup(2,true));const a=preservationAccount(late);assert.equal(a.spoiled,6);assert.equal(a.night.kept.length,0);assert.match(preservationExploration(late).question,/什么时候接上/);
 let s=act(late,{type:'REPLAN_BAKE',enabled:false});s=finish(s);assert.equal(preservationAccount(s).periods[1].sold,0);assert.deepEqual(preservationExploration(s).days.map(x=>x.bought),[1,0]);assert.match(preservationExploration(s).question,/拿什么卖/);
});
test('stale, identical, impossible and legacy proposals cannot mint trials or paid days',()=>{
 const s=trial();for(const a of [{type:'REPLAN',expectedRevision:s.revision-1},{type:'REPLAN_BAKE',enabled:true},{type:'REPLAN_BAKE',enabled:'off'},{type:'REPLAN_PRICE',day:2,price:2},{type:'REPLAN_PRICE',day:3,price:1},{type:'REPLAN_PRICE',day:1,price:0}])assert.equal(reduce(s,{expectedRevision:s.revision,...a}),s);
 const draft=act(s,{type:'REPLAN'});assert.equal(act(draft,{type:'REPLAN'}),draft);assert.equal(act(draft,{type:'REPLAN_BAKE',enabled:false}),draft);assert.equal(draft.trials.length,1);assert.equal(act(draft,{type:'CONCLUDE'}),draft);
 for(const mutate of [x=>x.nextDraft.price=0,x=>x.nextDraft.bake='off',x=>x.day=2,x=>x.phase='intro',x=>x.trials=[]]){const bad=structuredClone(draft);mutate(bad);assert.equal(restorePreservation(bad),null);}
 let legacy=finish(act(initialPreservation(),{type:'BEGIN'}));assert.equal(act(legacy,{type:'REPLAN_BAKE',enabled:false}),legacy);legacy=act(legacy,{type:'REPLAN_PRICE',day:2,price:1});assert.equal(legacy.flexibleBake,undefined);assert.equal(legacy.nextDraft.bake,undefined);assert.deepEqual(restorePreservation(legacy),legacy);legacy=finish(legacy);assert.equal(preservationExploration(legacy).comparison.field,'price');
 let concluded=act(s,{type:'REPLAN_PRICE',day:2,price:1});concluded=finish(concluded);concluded=act(concluded,{type:'CONCLUDE'});assert.equal(act(concluded,{type:'REPLAN'}),concluded);assert.equal(preservationExploration(concluded),null);
 const fresh=act(draft,{type:'RUN'});const night=act(fresh,{type:'NEXT'});assert.equal(act(night,{type:'NEXT'}),night);assert.equal(night.nextDraft,undefined);assert.equal(act(s,{type:'RETRY'}).nextDraft,undefined);
});
