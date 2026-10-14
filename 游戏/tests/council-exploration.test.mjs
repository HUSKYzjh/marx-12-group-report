import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSharingCouncil,sharingCouncilReducer as reduce,councilTrialAccount,restoreSharingCouncil} from '../lib/sharing-council.ts';
import {councilExploration as probe} from '../lib/council-exploration.ts';

const start=()=>reduce(initialSharingCouncil(true,true),{type:'BEGIN'});
function arrange(s,counts,mode=s.mode){
 s=reduce(s,{type:'CONDITION',mode});s=reduce(s,{type:'LOOSE',enabled:true});
 let coin=0;for(const [id,n]of counts.entries())for(let j=0;j<n;j++)s=reduce(s,{type:'COIN',coin:coin++,to:id===6?'owner':id});
 assert.equal(coin,12);return s;
}
function run(s,ballot='divide'){
 s=reduce(s,{type:'DISTRIBUTE',expectedRevision:s.revision});s=reduce(s,{type:'BALLOT',to:ballot});return reduce(s,{type:'VOTE',expectedRevision:s.revision});
}
const uniform=mode=>run(arrange(start(),[2,2,2,2,2,2],mode));

test('only an actual personal ballot supplies a question; reading never advances or pays',()=>{
 const empty=start(),draft=arrange(empty,[2,2,2,2,2,2]);assert.equal(probe(empty),null);assert.equal(probe(draft),null);
 const paid=reduce(draft,{type:'DISTRIBUTE',expectedRevision:draft.revision});assert.equal(probe(paid),null);
 const s=run(draft),before=structuredClone(s),p=probe(s);assert.match(p.prompt,/3人想再分.*只换章程/);assert(p.focusAuthority);assert.deepEqual(s,before);assert.deepEqual(probe(restoreSharingCouncil(s)),p);
 assert.equal(probe({...s,personal:undefined}),null);assert.equal(probe({...s,step:'production'}),null);assert.equal(probe({...s,phase:'conclusion'}),null);
});

test('replace a physical charter after a result: retain only the legal draft, never paid wallets',()=>{
 let s=uniform('bonus');const old=structuredClone(s),before=councilTrialAccount(s.run);
 s=reduce(s,{type:'RECHARTER',mode:'minority'});
 assert.equal(s.step,'money');assert.equal(s.paid,null);assert.equal(s.ballot,null);assert.equal(s.run,null);assert.equal(probe(s),null);assert.deepEqual(s.allocation,old.run.allocation);assert.deepEqual(s.trials,old.trials);assert.deepEqual(restoreSharingCouncil(s),s);assert.equal(s.production,undefined);
 s=run(s);const a=councilTrialAccount(s.run);assert.equal(a.workers,before.workers);assert.equal(a.moneyAfter,88);assert.equal(s.trials.length,2);assert.equal(probe(s).changed,'charter');assert.match(probe(s).comparison,/同样分钱、同样意见.*仍是添机器.*从0变为1/);
 s=run(reduce(s,{type:'RECHARTER',mode:'coop'}));assert.equal(councilTrialAccount(s.run).outcome,'hold');assert.match(probe(s).comparison,/只换章程.*从添机器变为暂缓/);assert.deepEqual(restoreSharingCouncil(s),s);
});

test('an external owner distribution cannot be silently converted into cooperative member income',()=>{
 const old=run(arrange(start(),[1,1,1,1,1,1,6],'minority')),s=reduce(old,{type:'RECHARTER',mode:'coop'});
 assert.deepEqual(s.allocation,Array(12).fill(null));assert.equal(s.paid,null);assert.deepEqual(s.trials,old.trials);assert.equal(reduce(s,{type:'DISTRIBUTE',expectedRevision:s.revision}),s);assert.deepEqual(restoreSharingCouncil(s),s);
 assert.equal(reduce(old,{type:'RECHARTER',mode:'minority'}),old);assert.equal(reduce(old,{type:'RECHARTER',mode:'invented'}),old);assert.equal(reduce(start(),{type:'RECHARTER',mode:'coop'}).mode,'bonus');
 const voting=reduce(arrange(start(),[2,2,2,2,2,2]),{type:'DISTRIBUTE',expectedRevision:arrange(start(),[2,2,2,2,2,2]).revision});assert.equal(reduce(voting,{type:'RECHARTER',mode:'coop'}),voting);
});

test('tie questions name a genuine one-coin threshold, not an arbitrary actor or an impossible flip',()=>{
 const s=uniform('coop'),p=probe(s);assert.equal(p.focusPerson,0);assert.match(p.prompt,/阿面.*鞋钱刚刚够.*只挪一枚/);
 const away=run(arrange(start(),[5,1,0,2,2,2],'coop'));assert.equal(councilTrialAccount(away.run).outcome,'hold');assert.equal(probe(away).focusPerson,null);assert.doesNotMatch(probe(away).prompt,/一枚/);
 const gap=run(arrange(start(),[1,4,0,2,2,3],'coop'));assert.equal(councilTrialAccount(gap.run).outcome,'hold');assert.equal(probe(gap).focusPerson,0);assert.match(probe(gap).prompt,/只差一枚/);
});

test('actual redistribution can change fictional intentions, not decide vote weights',()=>{
 let s=uniform('coop');s=run(arrange(reduce(s,{type:'RETRY'}),[0,2,2,2,2,4]));
 const p=probe(s);assert.equal(p.changed,'distribution');assert.match(p.comparison,/只重分第一笔.*阿面改了主意.*从暂缓变为分给大家/);assert.match(p.prompt,/只改第一笔的收款人/);assert.equal(councilTrialAccount(s.run).workerWeight,1);
 // Give a different amount without crossing anyone's wish threshold.
 s=run(arrange(reduce(s,{type:'RETRY'}),[0,2,2,1,2,5]));assert.match(probe(s).comparison,/五人的打算没变.*仍是分给大家/);
});

test('a one-coin probe starts from the last actual arrangement, without executing or fabricating a trial',()=>{
 const old=uniform('coop'),before=structuredClone(old),s=reduce(old,{type:'REARRANGE'});
 assert.equal(s.step,'money');assert.equal(s.paid,null);assert.deepEqual(s.allocation,old.run.allocation);assert.deepEqual(s.trials,old.trials);assert.equal(probe(s),null);assert.equal(s.production,undefined);assert.deepEqual(restoreSharingCouncil(s),s);
 let moved=reduce(s,{type:'COIN',coin:0,to:5});assert.deepEqual(moved.trials,before.trials);assert.equal(moved.paid,null);moved=run(moved);assert.equal(councilTrialAccount(moved.run).outcome,'divide');assert.match(probe(moved).comparison,/阿面改了主意.*从暂缓变为分给大家/);assert.deepEqual(old,before);
 assert.equal(reduce(start(),{type:'REARRANGE'}).step,'money');
});

test('changing only your own opinion is separated from charter and money changes',()=>{
 let s=uniform('bonus');s=run(arrange(reduce(s,{type:'RETRY'}),[2,2,2,2,2,2]),'invest');assert.equal(probe(s).changed,'own-ballot');assert.match(probe(s).comparison,/其他五人的意见不变.*你改投添机器.*仍是添机器/);
 let coop=uniform('coop');coop=run(arrange(reduce(coop,{type:'RETRY'}),[2,2,2,2,2,2]),'invest');assert.match(probe(coop).comparison,/从暂缓变为添机器/);
});

test('unanimity is not evidence of equal rights; multiple simultaneous changes get no single-cause claim',()=>{
 let s=run(arrange(start(),[2,4,3,1,1,1],'minority'),'invest');assert.match(probe(s).prompt,/大家都想添机器.*意见一致/);
 s=run(arrange(reduce(s,{type:'CONDITION',mode:'coop'}),[2,2,2,2,2,2]));assert.equal(probe(s).comparison,null);assert.equal(probe(s).changed,null);
 s=run(arrange(reduce(s,{type:'RETRY'}),[2,4,3,1,1,1]),'invest');assert.equal(probe(s).comparison,null);
});

test('receipt matching respects recipients, ignores coin identities and does not search a convenient older run',()=>{
 let s=uniform('bonus');s=run(reduce(s,{type:'RECHARTER',mode:'coop'}));
 const swapped=structuredClone(s);swapped.trials.at(-2).allocation=swapped.trials.at(-2).allocation.slice().reverse();assert.equal(probe(swapped).changed,'charter');
 s=run(arrange(reduce(s,{type:'RETRY'}),[0,2,2,2,2,4]));s=run(arrange(reduce(s,{type:'CONDITION',mode:'minority'}),[2,2,2,2,2,2]));assert.equal(probe(s).comparison,null,'same money exists in older receipt but not the adjacent retained receipt');
});
