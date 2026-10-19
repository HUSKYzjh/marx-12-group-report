import test from 'node:test';
import assert from 'node:assert/strict';
import {createStreetCampaign,streetReducer as act,streetFirm,streetMoney,restoreStreetGame} from '../lib/street-game.ts';
import {streetContradiction} from '../lib/street-contradiction.ts';
import {initialPrologue,prologueReducer} from '../lib/prologue-state.ts';
const fresh=()=>{const g=createStreetCampaign();delete g.campaign;delete g.tutorial;g.phase='manage';return g;};
const run=g=>act(g,{type:'ROUND',expectedRound:g.world.round});
function followed(){let g=run(fresh());g=act(g,{type:'EXPAND_STREET'});g=run(g);g=act(g,{type:'FOLLOW_EXPANSION'});return run(g);}
test('funded expansion raises own output, creates actual supplier income and recruits existing residents',()=>{
 let g=run(fresh());const before=structuredClone(g.world);g=act(g,{type:'EXPAND_STREET'});
 assert.equal(g.world.round,1);assert.equal(streetFirm(g.world,'bakery').machines,3);assert.equal(streetFirm(g.world,'bakery').workers.length,3);
 assert.equal(streetFirm(g.world,'bakery').cash,before.firms[0].cash-2400);assert(g.report.transactions.some(t=>t.from==='bakery'&&t.to==='ovens'&&t.amount===24));
 assert.equal(streetMoney(g.world),76800);assert.equal(g.world.people.length,20);assert.deepEqual(restoreStreetGame(g),g);
 g=run(g);assert.equal(g.report.produced,18);assert.equal(g.report.sold,18);
 const poor=run(fresh());streetFirm(poor.world,'bakery').cash=0;poor.world.initialMoney=streetMoney(poor.world);const world=structuredClone(poor.world);assert.deepEqual(act(poor,{type:'EXPAND_STREET'}).world,world);
});
test('independent funded follow-up produces actual stocks alongside unmet needs without inventing people or goods',()=>{
 const g=followed(),a=streetContradiction(g).actual;
 assert.equal(a.produced,36);assert.equal(a.sold,33);assert.equal(a.breadStock,3);assert(a.breadUnaffordable>0);assert(a.needsWithStock>0);
 assert.equal(g.world.people.length,20);assert.equal(streetMoney(g.world),76800);assert(a.suppliers.length>=2);assert(a.crossPurchases.length);
 const after=act(g,{type:'FOLLOW_EXPANSION'});assert.deepEqual(after.world,g.world);assert.equal(after.report.transactions.length,0);
 assert.deepEqual(restoreStreetGame(g),g);
});
test('matched wage response comparison changes only the declared condition, reconciles ledgers and never rewrites the actual day',()=>{
 let g=followed();g=act(g,{type:'WAGE',delta:-1});g=run(g);const saved=structuredClone(g),e=streetContradiction(g),c=e.comparison;
 assert.deepEqual(g,saved);assert.equal(c.own.ownWages,c.follow.ownWages);assert.equal(c.own.produced,c.follow.produced);
 assert.equal(c.own.wageTotal,38);assert.equal(c.follow.wageTotal,33);assert.equal(c.own.breadStock,6);assert.equal(c.follow.breadStock,7);
 assert.equal(c.own.ownCashChange,20);assert.equal(c.follow.ownCashChange,17);
 assert.equal(e.actual.breadStock,6);assert(e.repeatedOwnStock);assert.deepEqual(restoreStreetGame(g),g);
 const retry=act(g,{type:'RETRY'});const follow=run({...retry,wage:4,response:'cut'});assert.equal(streetContradiction(follow).actual.breadStock,7);assert.equal(streetMoney(follow.world),76800);assert.deepEqual(restoreStreetGame(follow),follow);
});
test('selling out remains possible; unbought stock, no-stock refusals and money refusals are distinct',()=>{
 const baseline=run(fresh()),a=streetContradiction(baseline).actual;assert.equal(a.breadStock,0);assert.equal(a.breadUnaffordable,4);
 const g=followed(),saved=structuredClone(g),cheap=run({...g,price:1});assert(cheap.world.firms[0].stock<run(g).world.firms[0].stock);assert.deepEqual(g,saved);
 const review=act(g,{type:'EXPLAIN'}),back=act(review,{type:'MANAGE'});assert.equal(back.phase,'manage');assert.deepEqual(back.world,g.world);
});
test('the story follows actual trading and a review, not a paid investment receipt or a one-day skip',()=>{
 const finish=s=>prologueReducer(s,{type:'FINISH_STREET_ECONOMY'});
 let s={...initialPrologue(),scene:'street-economy',street:run(fresh())};assert.equal(finish(s),s);
 s={...s,street:run(s.street)};assert.equal(finish(s),s);
 const reviewed=prologueReducer(s,{type:'STREET',action:{type:'EXPLAIN'}});assert.equal(finish(reviewed).scene,'ending');
 const invested={...s,street:act(s.street,{type:'EXPAND_STREET'})};const premature=prologueReducer(invested,{type:'STREET',action:{type:'EXPLAIN'}});assert.equal(finish(premature),premature);
});
