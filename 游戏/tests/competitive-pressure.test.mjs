import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPressure,pressureRound,pressureMoney,restorePressure,rewindPressure,pressureIssue} from '../public/assets/market-duel/pressure-model.mjs';
test('fixed undercutting rival has real funding and displaced people remain in the world',()=>{
 let s=initialPressure();assert.equal(pressureMoney(s),120);assert.equal(s.people.length,11);assert.deepEqual(s.firms[1].workers,[4,5]);assert.equal(s.people[10].cash,8);
 s=pressureRound(s,'hold');const r=s.history[0];assert.equal(r.sold[0],0);assert.equal(r.sold[1],11);assert.equal(r.paid[6],0);assert.equal(s.people[6].cash,5);assert.equal(s.people[0].cash,7);
 assert(r.visits.some(v=>v.person===0&&v.shop===1&&v.success));assert.equal(pressureMoney(s),120);
});
test('cost of keeping wages, price-only response, and following layoffs have distinct actual paths',()=>{
 const paths={};for(const action of ['hold','price','follow']){let s=pressureRound(initialPressure(),'hold');for(let day=1;day<9;day++)s=pressureRound(s,action);paths[action]=s;assert.deepEqual(restorePressure(s),s);}
 assert.equal(paths.hold.history.find(r=>r.closed[0]).day,3);
 assert(paths.price.history[1].sold[0]>paths.hold.history[1].sold[0]);assert.equal(paths.price.firms[0].workers.length,4);
 assert.equal(paths.follow.firms[0].workers.length,2);assert.equal(paths.follow.history[1].made[0],12);
 assert(paths.follow.history[1].receipts.some(r=>r.reason==='换快速烤炉'&&r.amount===8));
 assert.equal(paths.follow.history[8].shortOfMoney,4);assert.equal(paths.follow.history[8].stockOut,0);assert(paths.follow.history.some(r=>r.shortOfMoney>0&&r.stock[0]+r.stock[1]>0));
 assert(paths.follow.people[2].cash===0&&paths.follow.people[3].cash===0);assert.equal(paths.follow.history[1].shortOfMoney,0,'savings delay the effect; no instant scripted missing customers');
});
test('every receipt is integer and funded, stock is physical and not counted as sold',()=>{
 for(let seed=0;seed<16;seed++)for(const action of ['hold','price','follow']){
  let s=initialPressure(seed);for(let day=0;day<9;day++){
   s=pressureRound(s,day===0?'hold':action);const r=s.history.at(-1),wallets=Object.fromEntries([...r.before.firms.map(f=>['f'+f.id,f.cash]),...r.before.people.map(p=>['p'+p.id,p.cash])]);
   for(const p of r.receipts){assert(Number.isInteger(p.amount)&&wallets[p.from]>=p.amount);wallets[p.from]-=p.amount;wallets[p.to]+=p.amount;}
   for(const f of s.firms){assert.equal(wallets['f'+f.id],f.cash);assert.equal(r.before.firms[f.id].bread.length-r.spoiled[f.id]+r.made[f.id],r.sold[f.id]+r.stock[f.id]);}
   assert.equal(pressureMoney(s),120);assert.equal(s.people.length,11);assert.equal(r.fed+r.shortOfMoney+r.stockOut,11);
  }
 }
});
test('rewind uses the same people and seed; restore rejects forged wallets or history',()=>{
 let s=initialPressure();for(let i=0;i<6;i++)s=pressureRound(s,i===0?'hold':'follow');
 const back=rewindPressure(s,3),next=pressureRound(back,s.history[2].action);assert.deepEqual(next.history[2],s.history[2]);assert.equal(back.day,2);
 const bad=structuredClone(s);bad.people[0].cash++;bad.people[10].cash--;assert.equal(restorePressure(bad),null);assert(pressureIssue(back,'follow')!==undefined);
 assert.throws(()=>pressureRound(s,'cheat'));assert.throws(()=>rewindPressure(s,0));
});
