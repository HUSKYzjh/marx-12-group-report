import test from 'node:test';
import assert from 'node:assert/strict';
import {initialMatch,matchReducer,restoreMatch} from '../lib/technology-match.ts';
import {initialAutomation,automationReducer,restoreAutomation} from '../lib/automation-experiment.ts';
import {initialDuel,currentOffer,settleDuel,restoreDuel,moneyTotal,offerIssue} from '../public/assets/market-duel/model.mjs';
import {initialPrologue,prologueReducer,restorePrologue} from '../lib/prologue-state.ts';
const run=s=>matchReducer(s,{type:'RUN'});
function ready(){return run(run(initialMatch()));}
test('installing costs actual money; freed workers keep their identity and cash',()=>{
 const start=ready();for(const plan of ['more','rest','cut','share']){
  const s=run(matchReducer(start,{type:'PLAN',plan})),h=s.world.history[2],r=h.report;
  assert.equal(r.receipts.find(p=>p.reason==='安装自动控制').amount,8);
  assert.equal(r.made[0],plan==='more'?12:6);
  assert.equal(r.work.filter(p=>p.person<4&&p.income>0).length,plan==='cut'?2:4);
  assert.equal(r.work.filter(p=>p.person<4&&p.days).length,plan==='more'?4:2);
  assert.equal(moneyTotal(s.world),120);assert.equal(s.world.people.length,11);assert.deepEqual(restoreMatch(s),s);
  const wallets=Object.fromEntries([...h.before.firms.map(f=>['f'+f.id,f.cash]),...h.before.people.map(p=>['p'+p.id,p.cash])]);
  for(const p of r.receipts){assert(wallets[p.from]>=p.amount);wallets[p.from]-=p.amount;wallets[p.to]+=p.amount;}
  for(const p of s.world.people)assert.equal(p.cash,wallets['p'+p.id]);
 }
});
test('machine plans have real private tradeoffs rather than four balances of 104',()=>{
 const start=ready(),out=['more','rest','cut','share'].map(plan=>run(matchReducer(start,{type:'PLAN',plan})).world);
 assert(new Set(out.map(s=>s.firms[0].cash)).size>=2);
 assert.deepEqual(out[1].history.at(-1).report.work.map(p=>p.income),out[3].history.at(-1).report.work.map(p=>p.income));
 assert.notEqual(out[1].history.at(-1).report.work[2].kind,out[3].history.at(-1).report.work[2].kind);
});
test('rival copies yesterday, not the current hidden machine plan',()=>{
 const base=ready(),cut=run(matchReducer(base,{type:'PLAN',plan:'cut'})),rest=run(matchReducer(base,{type:'PLAN',plan:'rest'}));
 assert.deepEqual(cut.world.history[2].offers[1],rest.world.history[2].offers[1]);assert.equal(cut.world.firms[1].robot,false);
 assert.equal(run(cut).world.history[3].offers[1].automation,'cut');assert.equal(run(rest).world.history[3].offers[1].automation,'rest');
});
test('six days, rewind and same-funded imitation replay do not overwrite the first path',()=>{
 let s=ready();s=matchReducer(s,{type:'PLAN',plan:'cut'});while(s.world.day<6)s=run(s);
 const original=structuredClone(s),all=matchReducer(s,{type:'COMPARE'});
 assert.equal(moneyTotal(all.synchronous),120);assert.equal(all.synchronous.version,2);assert.deepEqual(all.world,s.world);
 assert.deepEqual(restoreMatch(all),all);
 const back=matchReducer(all,{type:'REWIND',day:3});assert.equal(back.world.day,2);assert.deepEqual(back.reference,s.world);
 const same=run(matchReducer(back,{type:'PLAN',plan:'cut'}));assert.deepEqual(same.world.history[2],s.world.history[2]);
 const different=run(matchReducer(back,{type:'PLAN',plan:'rest'}));assert.notDeepEqual(different.world.history[2],s.world.history[2]);assert.deepEqual(s,original);
});
test('old v1 games replay without new robot fields',()=>{
 let s=initialDuel();for(let i=0;i<6;i++)s=settleDuel(s,currentOffer(s));assert.deepEqual(restoreDuel(s),s);assert(!('robot' in s.firms[0]));
});
test('early machine moves, invalid drafts, unfunded operations and forged restore are refused',()=>{
 const s=initialMatch();assert.equal(matchReducer(s,{type:'PLAN',plan:'cut'}),s);assert.equal(matchReducer(s,{type:'SET',field:'price',value:1}),s);
 assert.equal(matchReducer(s,{type:'SET',field:'wage',value:0}),s);assert.equal(matchReducer(s,{type:'CONCLUDE'}),s);
 const draft=structuredClone(s);draft.draft.automation='cut';assert.equal(restoreMatch(draft),null);
 const bad=ready();bad.world.firms[0].cash++;bad.world.people[0].cash--;assert.equal(restoreMatch(bad),null);
 const loaded=ready();assert(offerIssue(loaded.world,{...loaded.draft,wage:4,ovens:3}));
});
test('automation integrates new match, while already played legacy arrangements remain intact',()=>{
 const legacy=automationReducer(automationReducer(initialAutomation(),{type:'BEGIN'}),{type:'RUN'}),saved=restoreAutomation(legacy);assert.deepEqual(saved,legacy);
 assert.equal(automationReducer(legacy,{type:'MATCH',action:{type:'BEGIN'}}),legacy);
 let s=automationReducer(initialAutomation(),{type:'MATCH',action:{type:'BEGIN'}});s=automationReducer(s,{type:'MATCH',action:{type:'RUN'}});
 assert.equal(s.match.world.day,1);assert.deepEqual(restoreAutomation(s),s);
 assert.equal(automationReducer(initialAutomation('time'),{type:'MATCH',action:{type:'BEGIN'}}).branch,'time');
});
test('branch archive retains the actual new duel across another if line and refresh',()=>{
 let s=prologueReducer(initialPrologue(),{type:'NAVIGATE_CHAPTER',chapter:'automation'});
 s=prologueReducer(s,{type:'TECHNOLOGY',action:{type:'MATCH',action:{type:'BEGIN'}}});
 s=prologueReducer(s,{type:'TECHNOLOGY',action:{type:'MATCH',action:{type:'RUN'}}});const played=s.technology;
 s=prologueReducer(s,{type:'OPEN_TECHNOLOGY',branch:'time'});s=restorePrologue(JSON.stringify(s));
 s=prologueReducer(s,{type:'OPEN_TECHNOLOGY',branch:'automation'});assert.deepEqual(s.technology,played);
});
