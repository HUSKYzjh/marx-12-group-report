import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createStreetGame,streetReducer,streetMoney,streetOwnerFunds,restoreStreetGame} from '../lib/street-game.ts';
const round=g=>streetReducer(g,{type:'ROUND',expectedRound:g.world.round});
const c={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../lib/street-ledger.js',import.meta.url),'utf8'),c);vm.runInNewContext(fs.readFileSync(new URL('../lib/street-presentation.js',import.meta.url),'utf8'),c);
test('owner purchases receive an exact funded shortfall, immediately spent; no worker can use company cash',()=>{
 let g=createStreetGame();const before=streetMoney(g.world);g=round(round(g));const tx=g.report.transactions;
 assert(tx.some(t=>t.kind==='owner-purchase'&&t.from==='bakery'));
 for(let i=0;i<tx.length;i++){const t=tx[i];if(t.kind!=='owner-purchase')continue;
  const p=g.world.people.find(p=>p.id===t.to);assert.equal(p.owner,t.from);const purchase=tx[i+1];assert.equal(purchase.from,p.id);assert(['bread','clothes','car'].includes(purchase.kind));assert.equal(purchase.quantity,1);assert(t.amount>0&&Number.isInteger(t.amount));
 }
 assert.equal(streetMoney(g.world),before);
 for(const p of g.world.people){assert.equal(c.window.StreetPresentation.ownerFunds(p,g.world),streetOwnerFunds(g.world,p));if(!p.owner)assert.equal(streetOwnerFunds(g.world,p),0);}
 const d=c.window.StreetLedger.inspect(g,'bakery');assert(d.day.flows.rows.some(r=>r.kind==='owner-purchase'&&r.label==='老板个人消费代付'));
 const spent=tx.filter(t=>t.from==='bakery'&&t.kind==='owner-purchase').reduce((n,t)=>n+t.amount*100,0);assert.equal(d.day.flows.rows.find(r=>r.kind==='owner-purchase').amount,spent);
 assert.deepEqual(restoreStreetGame(g),g);const retried=streetReducer(g,{type:'RETRY'});assert.deepEqual(round(retried).world,g.world);
});
test('payroll reserves, whole coins and the actual owner bind access to company cash',()=>{
 const g=createStreetGame(),f=g.world.firms[0],owner=g.world.people.find(p=>p.owner==='bakery');
 f.cash=f.wage*f.workers.length*3+250;assert.equal(streetOwnerFunds(g.world,owner),200);
 f.cash=f.wage*f.workers.length*3-1;assert.equal(streetOwnerFunds(g.world,owner),0);
 assert.equal(streetOwnerFunds(g.world,g.world.people[0]),0);
});
test('missing stock and money failure never trigger a company withdrawal; old v9 accounts are not rewritten',()=>{
 let g=createStreetGame();const f=g.world.firms.find(f=>f.id==='clothes');f.stock=0;f.cash=0;g.world.initialMoney=streetMoney(g.world);g=round(g);
 const tx=g.report.transactions;for(let i=0;i<tx.length;i++)if(tx[i].kind==='owner-purchase')assert(tx[i+1].quantity===1&&tx[i+1].amount>0);
 assert(g.world.people.some(p=>p.shopping.items.some(i=>i.outcome==='money')));
 const old=structuredClone(g);old.version=9;const restored=restoreStreetGame(old);assert.deepEqual(restored.world,old.world);assert.deepEqual(restored.report,old.report);assert.deepEqual(restored.checkpoint,old.checkpoint);
});
