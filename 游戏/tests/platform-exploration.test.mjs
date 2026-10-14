import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPlatformNetwork,platformNetworkReducer as reduce,restorePlatformNetwork,networkTrialAccount} from '../lib/platform-network.ts';
import {platformExploration as probe} from '../lib/platform-exploration.ts';
const run=s=>reduce(s,{type:'OPERATE',expectedRevision:s.revision});
function complete(s=reduce(initialPlatformNetwork(),{type:'BEGIN'}),routes=['A','A','A']){
 s=run(s);for(let i=0;i<3;i++)s=reduce(s,{type:'CONNECT',shop:i,to:routes[i]});return run(s);
}
function next(s,rule,fee,routes){
 s=reduce(s,{type:'RETRY'});s=reduce(s,{type:'CONDITION',rule});s=reduce(s,{type:'FEE',fee});return complete(s,routes);
}
test('only completed actual periods raise a next question; drafts and inspection do not claim a result',()=>{
 let s=reduce(initialPlatformNetwork(),{type:'BEGIN'});assert.equal(probe(s),null);
 s=run(s);s=reduce(s,{type:'CONNECT',shop:0,to:'B'});assert.equal(probe(s),null);
 s=run(s);const saved=JSON.stringify(s);assert(probe(s).prompt.includes('资料能带走'));assert.equal(probe(s).focusShop,0);assert.equal(probe(s).comparison,null);assert.equal(JSON.stringify(s),saved);
 const restored=restorePlatformNetwork(JSON.parse(saved));assert.deepEqual(probe(restored),probe(s));
 s=reduce(s,{type:'RETRY'});assert.equal(probe(s),null);assert.equal(s.trials.length,1);
});
test('a cheaper quoted fee is a question, never a promised saving; low original fees have no fictional saving',()=>{
 let s=complete();assert(probe(s).prompt.includes('够付搬资料的钱吗'));
 assert.deepEqual(networkTrialAccount(s.trials[0]).shops,[18,18,18]);
 s=next(s,'locked',0,['A','A','A']);assert(!probe(s).prompt.includes('省下'));assert(probe(s).prompt.includes('一共会变多少'));
});
test('same fees and same exact wiring isolate actual migration costs, both directions',()=>{
 let s=complete(undefined,['B','A','B']);s=next(s,'portable',3,['B','A','B']);
 assert.equal(probe(s).comparison,'同样费用、同样搬法：搬资料少付10枚，三店合计多留10枚。');
 s=next(s,'locked',3,['B','A','B']);assert.equal(probe(s).comparison,'同样费用、同样搬法：搬资料多付10枚，三店合计少留10枚。');
});
test('changing fee or shop identity must not masquerade as a migration-only comparison',()=>{
 let s=complete(undefined,['B','A','A']);s=next(s,'portable',2,['B','A','A']);assert.equal(probe(s).comparison,null);
 s=next(s,'portable',3,['A','B','A']);assert.equal(probe(s).comparison,null);
});
test('actual equal private/member flows distinguish control, not cash or a socialist state',()=>{
 let s=complete();s=next(s,'portable',1,['A','A','A']);assert(probe(s).prompt.includes('钱和决定权'));
 s=next(s,'joint',1,['A','A','A']);assert.equal(probe(s).comparison,'两期钱流一样；原入口改由三店共同决定。');assert(probe(s).prompt.includes('私营入口也收1枚'));
 s=next(s,'portable',1,['A','A','A']);assert.equal(probe(s).comparison,'两期钱流一样；原入口仍由服务商决定。');
});
test('stopping looks different to workers: comparison requires the same rule, fee and other connections',()=>{
 let s=complete();s=next(s,'locked',3,['A',null,'A']);const p=probe(s);
 assert.equal(p.focusShop,1);assert(p.prompt.includes('服装厂停用了'));assert.equal(p.comparison,'与上次两期相比：工人工资少4枚，卖出的产品少4件。');
 s=next(s,'locked',3,['A','A','A']);assert.equal(probe(s).comparison,'与上次两期相比：工人工资多4枚，卖出的产品多4件。');
 let mixed=complete(undefined,['B','A','A']);mixed=next(mixed,'locked',3,['A',null,'A']);assert.equal(probe(mixed).comparison,null);
});

test('a direct prospective reroute asks from the old account until executed, then isolates fee and migration changes',()=>{
 let s=complete(undefined,['B','A','A']);s=reduce(s,{type:'NEXT_RULE',rule:'portable'});assert.equal(probe(s).comparison,null);
 s=reduce(s,{type:'COMPARE',expectedRevision:s.revision});assert.equal(probe(s).comparison,'同样费用、同样搬法：搬资料少付5枚，三店合计多留5枚。');
 const old=probe(s);s=reduce(s,{type:'NEXT_CONNECT',shop:0,to:'A'});assert.deepEqual(probe(s),old);
 s=reduce(s,{type:'COMPARE',expectedRevision:s.revision});assert.equal(probe(s).comparison,'只改面包厂的入口：第二期使用费多1枚，搬资料少1枚；两期后店里钱一样多。');
});
