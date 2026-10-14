import test from 'node:test';
import assert from 'node:assert/strict';
import {createStreetStory,createStreetGame,streetReducer as reduce,streetFirm as firm,streetMoney,restoreStreetGame,assertStreetWorld} from '../lib/street-game.ts';
const round=g=>reduce(g,{type:'ROUND',expectedRound:g.world.round});
function dayFour(){let g=createStreetStory();for(const type of ['ROUND','STORY_EXPAND','ROUND','STORY_COMPETE','ROUND','ROUND'])g=reduce(g,{type,expectedRound:g.world.round});return g;}

test('twenty people, ten jobs, four waiting residents; no money or population minted by hiring',()=>{
 let g=createStreetStory();assert.equal(g.world.people.length,20);assert.equal(g.world.people.filter(p=>p.job).length,10);assert.equal(g.world.people.filter(p=>!p.job&&!p.owner).length,4);
 const money=streetMoney(g.world),ids=g.world.people.map(p=>p.id);g=round(g);g=reduce(g,{type:'STORY_EXPAND'});
 assert.deepEqual(g.world.people.map(p=>p.id),ids);assert.equal(streetMoney(g.world),money);assert.equal(g.world.people.filter(p=>!p.job&&!p.owner).length,3);
});

test('inventory pays visible whole-coin holding costs to the supplier, with a conserved ledger',()=>{
 const g=round(dayFour()),c=g.report.storageCharges.find(c=>c.firm==='bakery');assert.equal(c.stock,14);assert.equal(c.due,3);assert.equal(c.paid,3);
 assert(g.report.transactions.some(t=>t.from==='bakery'&&t.to==='inputs'&&t.kind==='storage'&&t.amount===3));
 const balance=g.report.transactions.reduce((n,t)=>n+(t.to==='bakery'?t.amount:0)-(t.from==='bakery'?t.amount:0),0);assert.equal(balance,g.report.cashChange);
 assert.equal(streetMoney(g.world),g.world.initialMoney);assertStreetWorld(g.world);
});

test('rival waits, then cuts one coin, then fires only if poor sales persist; severance precedes wage pass',()=>{
 let g=dayFour();assert.equal(g.report.rivalDecision,undefined);g=round(g);assert.equal(g.report.rivalDecision,undefined);
 g=round(g);assert.equal(g.report.rivalDecision,undefined);g=round(g);assert.equal(g.report.rivalDecision.kind,'wage-cut');assert.equal(firm(g.world,'rival').wage,300);assert.equal(firm(g.world,'rival').workers.length,2);
 const before=structuredClone(g);g=round(g);assert.equal(g.world.round,8);assert.equal(g.report.rivalDecision.kind,'layoff');const id=g.report.rivalDecision.person;
 assert.equal(firm(g.world,'rival').workers.length,1);assert.equal(firm(g.world,'rival').produced,12);assert.equal(g.world.people.find(p=>p.id===id).job,null);assert(g.story.dismissed.includes(id));
 assert(g.report.transactions.some(t=>t.kind==='severance'&&t.to===id&&t.amount===5));assert(!g.report.transactions.some(t=>t.kind==='wage'&&t.to===id));
 assert(g.world.people.find(p=>p.id===id).shopping.items[0].kind==='bread');assert.equal(g.world.people.length,20);assert.equal(streetMoney(g.world),before.world.initialMoney);
 assert.deepEqual(restoreStreetGame(g),g);const retried=reduce(g,{type:'RETRY'});assert.deepEqual(retried.world,before.world);const replay=round(retried);assert.deepEqual(replay.world,g.world);assert.deepEqual(replay.report,g.report);assert.deepEqual(replay.story,g.story);
 assert.equal(round(g),g); // Optional observation day does not become unlimited autoplay.
});

test('no surplus means no automatic cut; a one-day surplus resets when it clears',()=>{
 let g=createStreetGame();firm(g.world,'rival').price=100;for(let i=0;i<8;i++){g=round({...g,price:1,shifts:1});assert.equal(firm(g.world,'rival').stock,0);assert.equal(g.report.rivalDecision,undefined);}
 let p=round(round(dayFour()));assert.equal(firm(p.world,'rival').rivalPolicy.pressureDays,1);
 const f=firm(p.world,'rival');f.stock=0;f.sold=f.produced;p.world.batches=p.world.batches.filter(b=>b.firm!=='rival');p=round(p);
 assert.equal(firm(p.world,'rival').rivalPolicy.pressureDays,0);assert.equal(p.report.rivalDecision,undefined);
});

test('layoff is not free, cannot remove the final worker and cannot happen twice via manual imitation',()=>{
 let g=round(round(round(dayFour()))),f=firm(g.world,'rival');f.cash=400;g.world.initialMoney=streetMoney(g.world);const blocked=round(g);
 assert.equal(firm(blocked.world,'rival').workers.length,2);assert.equal(blocked.report.rivalDecision,undefined);
 g=round(round(round(round(dayFour()))));g=reduce(g,{type:'STORY_SANDBOX'});const remaining=firm(g.world,'rival').workers[0];g=reduce(g,{type:'OTHER_LAYOFFS'});assert.deepEqual(firm(g.world,'rival').workers,[remaining]);
 for(let i=0;i<3;i++){g=round(g);assert.deepEqual(firm(g.world,'rival').workers,[remaining]);}assertStreetWorld(g.world);
});

test('unpaid holding costs carry forward; repayment does not create or destroy money',()=>{
 let g=createStreetGame();const car=firm(g.world,'cars');car.cash=0;car.stock=2;g.world.initialMoney=streetMoney(g.world);g=round(g);
 let charge=g.report.storageCharges.find(c=>c.firm==='cars');assert.equal(charge.due,2);assert.equal(charge.paid,0);assert.equal(firm(g.world,'cars').storageDebt,2);
 firm(g.world,'bakery').cash-=500;firm(g.world,'cars').cash+=500;g=round(g);charge=g.report.storageCharges.find(c=>c.firm==='cars');assert.equal(charge.due,4);assert.equal(charge.paid,4);assert.equal(firm(g.world,'cars').storageDebt,0);assert.equal(streetMoney(g.world),g.world.initialMoney);
});

test('discounts reduce holding costs without requiring a crisis or an empty shelf',()=>{
 const base=dayFour(),normal=round(base),cheap=round({...base,price:1});assert.equal(normal.report.stock,14);assert.equal(cheap.report.stock,0);assert(cheap.report.sold>normal.report.sold);
 assert((cheap.report.storageCharges.find(c=>c.firm==='bakery')?.paid||0)<normal.report.storageCharges.find(c=>c.firm==='bakery').paid);assert.equal(cheap.report.rivalDecision,undefined);
});

test('played fifteen-person saves gain five zero-cash waiting residents, preserving old money and checkpoints',()=>{
 const old=createStreetGame();const added=['clothes-1','cars-1','inputs-1','available-2','available-3'];old.world.people=old.world.people.filter(p=>!added.includes(p.id));for(const f of old.world.firms){f.workers=f.workers.filter(id=>!added.includes(id));f.machines=f.workers.length;f.ovenAges=Array(f.machines).fill(0);}old.world.initialMoney=streetMoney(old.world);
 let played=round(old);played.version=7;const before=structuredClone(played),migrated=restoreStreetGame(played);assert.equal(migrated.world.people.length,20);assert.equal(migrated.checkpoint.people.length,20);
 assert.deepEqual(migrated.world.firms,before.world.firms);assert.deepEqual(migrated.world.people.slice(0,15),before.world.people);assert(migrated.world.people.slice(15).every(p=>p.cash===0&&p.job===null));assert.equal(streetMoney(migrated.world),before.world.initialMoney);assert.deepEqual(migrated.report,before.report);assert.deepEqual(played,before);assert.deepEqual(restoreStreetGame(migrated),migrated);
});

test('invalid autonomous-policy, storage debt and report values cannot enter the economy',()=>{
 const g=round(round(dayFour()));for(const value of [-1,NaN,1.5]){const bad=structuredClone(g);firm(bad.world,'rival').rivalPolicy.pressureDays=value;assert.deepEqual(restoreStreetGame(bad),createStreetStory());}
 const bad=structuredClone(g);firm(bad.world,'cars').storageDebt=-1;assert.deepEqual(restoreStreetGame(bad),createStreetStory());const badReport=structuredClone(g);badReport.report.storageCharges[0].paid=100000;assert.deepEqual(restoreStreetGame(badReport),createStreetStory());
});
