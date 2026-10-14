import test from 'node:test';
import assert from 'node:assert/strict';
import {createStreetCampaign,streetReducer,streetMoney,restoreStreetGame} from '../lib/street-game.ts';
const step=(g,a)=>streetReducer(g,a);
const round=g=>step(g,{type:'ROUND',expectedRound:g.world.round});
function ack(g){while(g.tutorial.pending.length)g=step(g,{type:'ACK_NOTICE',id:g.tutorial.pending[0].id});return g;}

test('new opening funds are distinct, industrial firms highest and rival richer',()=>{
 const g=createStreetCampaign(),cash=g.world.firms.map(f=>f.cash);assert.equal(new Set(cash).size,6);assert(cash[1]>cash[0]);assert(cash[3]>Math.max(...cash.filter((_,i)=>i!==3)));assert(Math.min(cash[3],cash[4])>Math.max(cash[0],cash[1],cash[2]));assert.equal(cash.reduce((sum,n)=>sum+n,0),62400);assert.equal(streetMoney(g.world),g.world.initialMoney);
 assert.deepEqual(Object.fromEntries(g.world.firms.map(f=>[f.id,f.cash/100])),{bakery:72,rival:84,clothes:60,cars:204,ovens:156,inputs:48});
 assert(g.world.firms.every(f=>f.stock===0&&f.cash>=3*f.wage*f.workers.length),'each shop opens without stock and can fund three payrolls');
 assert.equal(g.world.initialMoney,76800);
});
test('only pristine v12 campaign funds migrate; played and custom balances survive',()=>{
 const oldCash={bakery:72,rival:96,clothes:84,cars:180,ovens:144,inputs:48};
 const old=createStreetCampaign();old.version=12;
 for(const f of old.world.firms)f.cash=oldCash[f.id]*100;
 old.world.initialMoney=streetMoney(old.world);
 const restored=restoreStreetGame(old),fresh=createStreetCampaign();
 assert.deepEqual(restored.world,fresh.world);assert.deepEqual(restored.world.people,old.world.people);
 assert.equal(streetMoney(restored.world),streetMoney(old.world));assert.equal(restored.serial,old.serial+1);
 assert.deepEqual(restoreStreetGame(restored),restored);
 const custom=structuredClone(old);custom.world.firms[0].cash-=100;custom.world.firms[1].cash+=100;
 assert.deepEqual(restoreStreetGame(custom).world,custom.world);
 const played=round(old),playedRestored=restoreStreetGame(played);
 assert.deepEqual(playedRestored.world,played.world);assert.deepEqual(playedRestored.report,played.report);
 assert.deepEqual(playedRestored.books,played.books);assert.deepEqual(playedRestored.checkpoint,played.checkpoint);
 assert.deepEqual(step(playedRestored,{type:'BEGIN_CAMPAIGN'}).world,fresh.world);
});
test('first day profit reconciles assets, not cash; manufacturing wages include depreciation',()=>{
 const g=round(createStreetCampaign()),a=g.report.accounts;assert.equal(a.sales,3600);assert.equal(a.wages,1000);assert.equal(a.materialsUsed,300);assert.equal(a.depreciation,400);assert.equal(a.costOfSales,1700);assert.equal(a.fixedCosts,400);assert.equal(a.netProfit,1500);
 assert.equal(a.retained,a.netProfit-a.ownerDraw);assert.equal(a.closingAssets-a.openingAssets,a.retained);assert.notEqual(a.netProfit,g.report.cashChange*100);assert.equal(g.tutorial.pending[0].id,'first-day');assert.deepEqual(restoreStreetGame(g),g);
 assert.deepEqual(round(g),g);assert.deepEqual(step(g,{type:'ACK_NOTICE',id:'first-stock'}),g);assert.equal(ack(g).tutorial.pending.length,0);
});
test('purchase updates capital not expenses, first notices survive reload and do not repeat',()=>{
 let g=ack(round(createStreetCampaign()));const savedDay=structuredClone(g.history[0]),before=g.world.initialMoney;
 g=step(g,{type:'STORY_EXPAND'});assert.equal(g.world.firms[0].machines,3);assert.equal(g.world.firms[0].workers.length,3);assert.equal(g.books.ovens.length,3);assert.equal(g.report.accounts.netProfit,0);assert.deepEqual(g.history[0],savedDay);assert.equal(g.tutorial.pending[0].id,'first-oven');assert.equal(g.tutorial.pending[0].rows[0][1],2400);assert.deepEqual(restoreStreetGame(g),g);
 g=ack(g);for(const type of ['ROUND','STORY_COMPETE','OTHERS_FOLLOW','ROUND','ROUND','ROUND','ROUND']){g=type==='ROUND'?round(g):step(g,{type});g=ack(g);}
 g=step(g,{type:'STORY_SANDBOX'});for(let i=0;i<20;i++){const next=round(g);if(next.world.round===g.world.round)break;g=ack(next);assert.equal(streetMoney(g.world),before);const a=g.report.accounts;assert.equal(a.closingAssets-a.openingAssets,a.netProfit-a.ownerDraw);assert.equal(g.tutorial.pending.length,0);}
 assert(g.tutorial.seen.includes('first-stock'));assert.equal(g.tutorial.seen.filter(id=>id==='first-day').length,1);
});
test('retry restores book values and corrupt notice/book data never runs',()=>{
 let g=ack(round(createStreetCampaign()));g=ack(step(g,{type:'STORY_EXPAND'}));const book=structuredClone(g.books);g=ack(round(g));g=step(g,{type:'RETRY'});assert.deepEqual(g.books,book);g=ack(round(g));assert(Number.isSafeInteger(g.report.accounts.netProfit));
 const bad=structuredClone(g);bad.books.stockValue=-100;assert.equal(restoreStreetGame(bad).world.round,0);
 const badNotice=structuredClone(g);badNotice.tutorial.seen=['invented'];assert.equal(restoreStreetGame(badNotice).world.round,0);
});
