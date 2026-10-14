import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createStreetGame,streetReducer,streetCapacity} from '../lib/street-game.ts';
const c={window:{}};vm.runInNewContext(readFileSync(new URL('../lib/street-ledger.js',import.meta.url),'utf8'),c);const ledger=c.window.StreetLedger;
const run=g=>streetReducer(g,{type:'ROUND',expectedRound:g.world.round});
test('all shops expose real staff, integer quotes and a read-only budget',()=>{
 const g=createStreetGame(),before=JSON.stringify(g);
 for(const f of g.world.firms){const d=ledger.inspect(g,f.id);assert.equal(d.staff.length,f.workers.length);assert.equal(d.cash,f.cash);assert.equal(d.stock,0);assert.equal(d.price,f.price);assert.equal(d.wage,f.wage);assert.equal(d.day,null);assert.equal(d.estimate.capacity,streetCapacity(f));assert(Number.isInteger(d.estimate.materials));assert.equal(d.estimate.packs,Math.ceil(Math.max(0,d.estimate.raw-f.inputs)/4));}
 assert.equal(JSON.stringify(g),before);
 const ours=ledger.inspect(g,'bakery');assert.equal(ours.estimate.wages,1000);assert.equal(ours.estimate.materials,300);assert.equal(ours.estimate.capacity,12);
});
test('every shop opening + net payments reconciles with closing cash',()=>{
 let g=createStreetGame();for(let day=0;day<8;day++){g=run(g);for(const f of g.world.firms){const d=ledger.inspect(g,f.id);assert.equal(d.day.opening+d.day.flows.net,f.cash);assert.equal(d.day.closing,f.cash);assert.equal(d.day.flows.incoming-d.day.flows.outgoing,d.day.flows.net);assert.equal(d.staff.reduce((n,p)=>n+p.paid,0),d.day.flows.rows.find(r=>r.kind==='wage'&&r.direction==='out')?.amount||0);}}
});
test('day ledger is retained after buying equipment; current cash is not invented day cash',()=>{
 let g=run(createStreetGame()),closing=g.world.firms[0].cash;
 g=streetReducer({...g,phase:'manage'},{type:'BUY_OVEN'});const d=ledger.inspect(g,'bakery');assert.equal(d.day.closing,closing);assert.equal(d.cash,closing-2400);assert.equal(d.management.outgoing,2400);assert(d.management.rows.some(r=>r.kind==='new-oven'));
});
test('new wage and price show as pending; recorded actual payroll stays unchanged',()=>{
 let g=run(createStreetGame());g=streetReducer(g,{type:'WAGE',delta:-1});g=streetReducer(g,{type:'PRICE',delta:-1});const d=ledger.inspect(g,'bakery');assert(d.pending);assert.equal(d.wage,400);assert.equal(d.price,200);assert.equal(d.lastWage,500);assert.equal(d.lastPrice,300);assert.equal(d.staff[0].paid,500);
});
test('storage payment is an expense here and service revenue for the supplier',()=>{
 let g=createStreetGame();for(let i=0;i<6;i++)g=run(g);
 const d=ledger.inspect(g,'bakery'),supplier=ledger.inspect(g,'inputs');assert(d.storage);assert.equal(d.day.flows.rows.find(r=>r.kind==='storage').amount,d.storage.paid*100);assert(supplier.day.flows.rows.some(r=>r.kind==='storage'&&r.direction==='in'));assert.equal(supplier.holdingUnit,0);
});
test('history without a matching snapshot never fabricates opening or closing balances',()=>{
 let g=run(createStreetGame());g.checkpoint=null;const d=ledger.inspect(g,'cars');assert.equal(d.day.opening,null);assert.equal(d.day.closing,null);assert.equal(d.cash,g.world.firms.find(f=>f.id==='cars').cash);g.history=[];g.report=null;assert.equal(ledger.inspect(g,'cars').day,null);
});
test('legacy fractional cashflows remain exact and returned records are detached',()=>{
 const g=createStreetGame();g.world.round=2;g.report={management:false,round:2,transactions:[{from:'bakery',to:'inputs',kind:'inputs',amount:1.25,quantity:4}],storageCharges:[{firm:'bakery',stock:3,due:1,paid:1}]};
 const d=ledger.inspect(g,'bakery');assert.equal(d.day.flows.outgoing,125);d.storage.paid=9;d.staff[0].cash=0;assert.equal(g.report.storageCharges[0].paid,1);assert.equal(g.world.people.find(p=>p.id==='bakery-0').cash,900);
});
