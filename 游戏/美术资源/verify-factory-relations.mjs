import assert from 'node:assert/strict';
import {factoryRelationKinds,factoryRelationPlan,factoryMarkup} from '../public/assets/workshop-v6/factory-relations.mjs';
import {sampleScenarios} from '../public/assets/workshop-v6/trust-kit.mjs';

let combinations=0;
for(const s of Object.values(sampleScenarios))for(const kind of factoryRelationKinds){
 const p=factoryRelationPlan(kind,s),html=factoryMarkup(kind,s);
 assert.equal((html.match(/data-node="worker-/g)||[]).length,2);
 assert.equal((html.match(/data-node="machine"/g)||[]).length,1);
 assert(html.includes(s.upgraded?'machine-new-v1.png':'machine-old-v1.png'));
 assert(!html.includes('undefined')&&!html.includes('NaN'));
 if(kind==='ownership')assert.deepEqual(p.targets,['machine']);
 else assert.deepEqual(p.targets,['worker-a','worker-b']);
 if(kind==='payment'){assert.equal(p.wage,s.wage);assert.equal(s.wages,2*p.wage);assert(p.note.includes(`工资总额${s.wages}`));}
 if(kind==='control')assert(p.note.includes(`${s.hours}小时`));
 combinations++;
}
assert.throws(()=>factoryRelationPlan('__proto__',sampleScenarios.old));
assert.throws(()=>factoryRelationPlan('payment',{wage:-1}));
console.log(JSON.stringify({result:'PASS',combinations,workersPerScene:2,machinesPerScene:1,negativeChecks:2,scope:'Relation targets and model-linked labels; layout checked in browser'},null,2));
