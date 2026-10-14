import test from 'node:test';
import assert from 'node:assert/strict';
import {createStreetGame,streetReducer,streetFirm,streetMoney,restoreStreetGame,STREET_ADAPTATION_RULES} from '../lib/street-game.ts';
const run=g=>streetReducer(g,{type:'ROUND',expectedRound:g.world.round});
function pressure(id){
 const g={...createStreetGame(),phase:'manage'},f=streetFirm(g.world,id),rule=STREET_ADAPTATION_RULES[id];
 g.world.round=10;f.stock=rule.stock;f.produced=0;f.sold=0;f.cash=10000;
 f.firmPolicy={pressureDays:rule.days-1,clearDays:0};g.world.initialMoney=streetMoney(g.world);
 return g;
}
test('each non-bread enterprise acts on its own turnover window; raw supplier cannot discount below one coin',()=>{
 for(const id of ['clothes','cars','ovens','inputs']){
  const g=pressure(id),before=structuredClone(g.world),next=run(g),d=next.report.firmDecisions.find(d=>d.firm===id);
  assert(d,id+' acts');assert.equal(d.kind,id==='inputs'?'wage-cut':'price-cut');
  assert.equal(d.round,11);assert.equal(next.world.people.length,20);assert.equal(streetMoney(next.world),before.initialMoney);
  assert.equal(streetFirm(next.world,'bakery').wage,500);assert.equal(streetFirm(next.world,'bakery').price,300);
  assert.deepEqual(restoreStreetGame(next),next);
  const replay=run(streetReducer(next,{type:'RETRY'}));assert.deepEqual(replay.world,next.world);assert.deepEqual(replay.report,next.report);
 }
});
test('one poor day is not enough, and yesterday is observed before today is reset',()=>{
 for(const id of ['clothes','cars','ovens','inputs']){
  const g=pressure(id),f=streetFirm(g.world,id);f.firmPolicy.pressureDays=0;
  const next=run(g);assert(!next.report.firmDecisions.some(d=>d.firm===id));assert.equal(streetFirm(next.world,id).firmPolicy.pressureDays,1);
 }
 const g=pressure('cars');streetFirm(g.world,'cars').sold=1;
 assert(!run(g).report.firmDecisions.some(d=>d.firm==='cars'));
});
test('cooldown, cost floor and whole-coin quotes constrain repeated adjustment',()=>{
 let g=pressure('cars'),f=streetFirm(g.world,'cars');f.firmPolicy.lastKind='price-cut';f.firmPolicy.lastActionRound=10;
 assert(!run(g).report.firmDecisions.some(d=>d.firm==='cars'));
 g=pressure('clothes');f=streetFirm(g.world,'clothes');f.price=700;
 const next=run(g);assert.equal(next.report.firmDecisions.find(d=>d.firm==='clothes').kind,'wage-cut');assert.equal(streetFirm(next.world,'clothes').price,700);
 for(const x of next.world.firms){assert.equal(x.price%100,0);assert(x.price>=100);assert(x.wage>=300);}
});
test('layoffs pay real severance before payroll and never remove the last employee',()=>{
 for(const id of ['clothes','cars','inputs']){
  const g=pressure(id),f=streetFirm(g.world,id);f.firmPolicy.lastKind='wage-cut';f.firmPolicy.lastActionRound=8;
  const fired=f.workers.at(-1),next=run(g),d=next.report.firmDecisions.find(d=>d.firm===id);
  assert.equal(d.kind,'layoff');assert.equal(d.person,fired);assert.equal(streetFirm(next.world,id).workers.length,1);
  assert.equal(next.world.people.find(p=>p.id===fired).job,null);assert(next.report.dismissed.includes(fired));
  assert(next.report.transactions.some(t=>t.kind==='severance'&&t.from===id&&t.to===fired&&t.amount===5));
  assert(!next.report.transactions.some(t=>t.kind==='wage'&&t.to===fired));assert.equal(streetMoney(next.world),g.world.initialMoney);
  const poor=pressure(id);streetFirm(poor.world,id).cash=400;streetFirm(poor.world,id).firmPolicy={pressureDays:20,clearDays:0,lastKind:'wage-cut',lastActionRound:8};poor.world.initialMoney=streetMoney(poor.world);
  assert(!run(poor).report.firmDecisions.some(d=>d.firm===id&&d.kind==='layoff'));
 }
 const g=pressure('ovens'),f=streetFirm(g.world,'ovens');f.firmPolicy={pressureDays:20,clearDays:0,lastKind:'wage-cut',lastActionRound:8};
 assert.equal(streetFirm(run(g).world,'ovens').workers.length,1);
});
test('recovery can refill a funded vacancy using an existing resident, or restore wages; never mints money',()=>{
 for(const kind of ['hire','wage-rise']){
  const g=pressure('clothes'),f=streetFirm(g.world,'clothes');f.stock=0;f.sold=2;f.produced=2;f.storageDebt=0;
  f.firmPolicy={pressureDays:0,clearDays:kind==='hire'?2:4,lastKind:kind==='hire'?'layoff':'wage-cut',lastActionRound:8,wageCeiling:500};f.wage=500;
  if(kind==='hire'){const id=f.workers.pop();g.world.people.find(p=>p.id===id).job=null;}
  const ids=g.world.people.map(p=>p.id),next=run(g),d=next.report.firmDecisions.find(d=>d.firm==='clothes');
  assert.equal(d.kind,kind);assert.deepEqual(next.world.people.map(p=>p.id),ids);assert.equal(streetMoney(next.world),g.world.initialMoney);
  if(kind==='hire'){assert.equal(streetFirm(next.world,'clothes').workers.length,2);assert(next.report.hired.includes(d.person));}
  else assert.equal(streetFirm(next.world,'clothes').wage,600);
 }
});
test('v8 balances and checkpoints survive migration; corrupted automatic policy or events cannot restore',()=>{
 let old=run(createStreetGame());old.version=8;const next=restoreStreetGame(old);assert.deepEqual(next.world,old.world);assert.deepEqual(next.checkpoint,old.checkpoint);assert.equal(next.world.round,1);
 const valid=run(pressure('cars'));
 for(const corrupt of [g=>g.world.firms[3].firmPolicy.lastActionRound=49,g=>g.world.firms[3].firmPolicy.wageCeiling=301,g=>g.report.firmDecisions[0].firm='bakery',g=>g.report.firmDecisions[0].value=1.5,g=>g.report.firmDecisions[0].round=48,g=>g.report.firmDecisions.push(g.report.firmDecisions[0])]){const g=structuredClone(valid);corrupt(g);assert.equal(restoreStreetGame(g).world.round,0);}
});
