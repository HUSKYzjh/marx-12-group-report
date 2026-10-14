import test from 'node:test';
import assert from 'node:assert/strict';
import {STREET_VERSION,createStreetGame,createStreetStory,createShoppingPlan,discretionaryProbability,extraBreadProbability,breadWanted,streetReducer,streetFirm,streetPerson,streetMoney,assertStreetWorld,restoreStreetGame} from '../lib/street-game.ts';
import {initialPrologue,prologueReducer,restorePrologue} from '../lib/prologue-state.ts';
import {legacyStreetGame} from './fixtures/street-legacy.mjs';
const next=g=>streetReducer(g,{type:'ROUND',expectedRound:g.world.round});
test('all current goods use whole-coin quotes, input packs and whole-coin price buttons',()=>{
 let g=createStreetGame();assert.equal(g.price,3);assert(g.world.firms.every(f=>f.price%100===0));
 g=streetReducer(g,{type:'PRICE',delta:-1});assert.equal(g.price,2);g=streetReducer(g,{type:'PRICE',delta:-1});assert.equal(g.price,1);g=streetReducer(g,{type:'PRICE',delta:-1});assert.equal(g.price,1);
 for(let i=0;i<4;i++)g=streetReducer(g,{type:'PRICE',delta:1});assert.equal(g.price,4);assert.equal(streetReducer(g,{type:'PRICE',delta:.5}),g);
 g=next(g);for(const t of g.report.transactions){if(['bread','clothes','car','inputs','new-oven','replacement'].includes(t.kind))assert(Number.isInteger(t.amount));if(t.kind==='inputs'){assert.equal(t.quantity%4,0);assert.equal(t.amount,t.quantity/4);}}
 assert(g.world.people.every(p=>p.shopping.items.every(i=>i.price%100===0)));
});

test('every new transfer, including owner budgets, is whole coins; fresh balances stay whole',()=>{
 for(const wage of [3,5,7])for(const price of [1,3,4]){
  let g=createStreetGame(wage);g.price=price;
  for(let i=0;i<48;i++){g=next(g);assert(g.report.transactions.every(t=>Number.isInteger(t.amount)));assert([...g.world.firms,...g.world.people].every(p=>p.cash%100===0));assert.equal(streetMoney(g.world),g.world.initialMoney);}
 }
});

test('old sub-coin balances survive exactly but new transactions never move fractional coins',()=>{
 let g=next(createStreetGame());g.world.firms[0].cash-=41;streetPerson(g.world,'bakery-owner').cash+=41;
 const saved=structuredClone(g),restored=restoreStreetGame(g);assert.deepEqual(restored.world,saved.world);
 const ids=[...g.world.firms,...g.world.people].map(p=>[p.id,p.cash%100]);
 for(let i=0;i<8;i++){g=next(g);assert(g.report.transactions.every(t=>Number.isInteger(t.amount)));assert.deepEqual([...g.world.firms,...g.world.people].map(p=>[p.id,p.cash%100]),ids);assert.equal(streetMoney(g.world),saved.world.initialMoney);}
});
test('v1 fractional quotes migrate without rounding wealth or rewriting completed transactions',()=>{
 const legacy=next(createStreetGame());legacy.version=1;legacy.price=2.5;for(const w of [legacy.world,legacy.checkpoint]){streetFirm(w,'bakery').price=250;streetFirm(w,'rival').price=250;streetFirm(w,'inputs').price=25;}
 for(const p of legacy.world.people)p.shopping.items[0].price=250;
 const untouched=structuredClone(legacy),migrated=restoreStreetGame(legacy);
 assert.deepEqual(legacy,untouched);assert.equal(migrated.version,STREET_VERSION);assert.equal(migrated.price,3);assert.equal(migrated.world.round,1);
 assert.deepEqual(migrated.world.people,legacy.world.people);assert.deepEqual(migrated.report,legacy.report);assert.deepEqual(migrated.history,legacy.history);
 assert.equal(streetMoney(migrated.world),streetMoney(legacy.world));assert.equal(streetFirm(migrated.world,'inputs').price,100);
 assert.deepEqual(restoreStreetGame(migrated),migrated);assert(next(migrated).world.people.every(p=>p.shopping.items.every(i=>i.price%100===0)));
 const fresh=createStreetGame();fresh.version=1;fresh.price=2.5;streetFirm(fresh.world,'rival').price=250;assert.equal(restoreStreetGame(fresh).world.people[0].shopping.items[0].price,300);
});
test('v2 saves cannot restore fractional current prices',()=>{
 let g=next(createStreetGame());g.price=2.5;assert.equal(restoreStreetGame(g).world.round,0);
 g=next(createStreetGame());streetFirm(g.world,'cars').price=4050;assert.equal(restoreStreetGame(g).world.round,0);
});
test('all 20 people attempt essential bread, including zero-cash people and owners',()=>{
 let g=createStreetGame();assert.equal(g.world.people.length,20);assert.equal(g.world.people.filter(p=>p.job).length,10);assert.equal(g.world.people.filter(p=>!p.job&&!p.owner).length,4);for(const p of g.world.people)assert.equal(p.shopping.items[0].kind,'bread');
 for(let round=1;round<=8;round++){g=next(g);for(const p of g.world.people){const s=p.shopping;assert.equal(s.round,round);assert.equal(s.items[0].kind,'bread');assert.equal(s.items[0].probability,1);assert.equal(s.items[0].quantity,p.bread);assert.notEqual(s.items[0].outcome,'planned');}}
 assert.equal(streetPerson(g.world,'available-0').shopping.items[0].outcome,'money');
});

test('one essential loaf is certain to be wanted; additional desire decays and stays fixed for a person/day',()=>{
 assert(extraBreadProbability(2)>extraBreadProbability(3));assert.equal(extraBreadProbability(4),0);
 const counts=[0,0,0,0];for(let i=0;i<20000;i++){const wanted=breadWanted('sample-'+i,7);assert(wanted>=1&&wanted<=3);counts[wanted]++;assert.equal(breadWanted('sample-'+i,7),wanted);}
 const second=counts[2]+counts[3];assert(second/20000>.73&&second/20000<.77);assert(counts[3]/second>.33&&counts[3]/second<.37);assert(second>counts[3]);
 let g=createStreetGame();for(let i=0;i<24;i++){g=next(g);for(const p of g.world.people){assert.equal(p.shopping.items[0].probability,1);assert.equal(p.shopping.items[0].wantedQuantity,breadWanted(p.id,g.world.round));assert(p.bread<=p.shopping.items[0].wantedQuantity);}}
});

test('bread price never exceeds chef daily wage; cutting wage also caps the next quote without rewriting old purchases',()=>{
 let g=createStreetGame();g=streetReducer(g,{type:'PRICE',delta:1});assert.equal(g.price,4);
 g=streetReducer(g,{type:'WAGE',delta:-1});g=streetReducer(g,{type:'WAGE',delta:-1});assert.equal(g.wage,3);assert.equal(g.price,3);assert.equal(streetReducer(g,{type:'PRICE',delta:1}).price,3);
 g=next(g);assert(streetFirm(g.world,'bakery').price<=streetFirm(g.world,'bakery').wage);
 const old=structuredClone(g);old.version=5;old.price=4;const restored=restoreStreetGame(old);assert.equal(restored.price,3);assert.deepEqual(restored.world,old.world);assert.deepEqual(restored.report,old.report);assert.equal(streetReducer(restored,{type:'RETRY'}).price,3);
 const direct=next({...createStreetGame(3),price:4});assert.equal(streetFirm(direct.world,'bakery').price,300);
});
test('essential bread pass precedes all optional purchases, results match actual funded ledger',()=>{
 const g=next(createStreetGame());const tx=g.report.transactions;let optional=false;
 for(const t of tx){if(t.kind==='clothes'||t.kind==='car')optional=true;if(t.kind==='bread'&&optional)assert(g.world.people.find(p=>p.id===t.from).bread>=2,'only optional extra loaves follow discretionary purchases');}
 for(const p of g.world.people){const s=p.shopping,spent=tx.filter(t=>t.from===p.id).reduce((n,t)=>n+Math.round(t.amount*100),0),covered=tx.filter(t=>t.to===p.id&&t.kind==='owner-purchase').reduce((n,t)=>n+Math.round(t.amount*100),0);assert.equal(s.cashBefore+covered-spent,p.cash);
  for(const item of s.items){const records=tx.filter(t=>t.from===p.id&&t.kind===item.kind);assert.equal(item.quantity,records.reduce((n,t)=>n+t.quantity,0));assert.equal(item.outcome==='bought',records.length>0);}
 }
 assert.equal(streetMoney(g.world),g.world.initialMoney);
});
test('discretionary chance is lower for expensive goods and same draw is monotonic in price',()=>{
 assert(discretionaryProbability(800)>discretionaryProbability(4000));let shirts=0,cars=0;
 for(let i=0;i<5000;i++){const cheap=createShoppingPlan('sample-'+i,7,0,{bread:250,clothes:800,car:4000});const costly=createShoppingPlan('sample-'+i,7,0,{bread:250,clothes:8000,car:40000});
  shirts+=Number(cheap.items.some(i=>i.kind==='clothes'));cars+=Number(cheap.items.some(i=>i.kind==='car'));
  for(const item of costly.items)assert(cheap.items.some(i=>i.kind===item.kind));
  assert.deepEqual(createShoppingPlan('sample-'+i,7,0,{bread:250,clothes:800,car:4000}),cheap);
 }
 assert(shirts>1500&&shirts<1850);assert(cars>350&&cars<550);assert(cars<shirts);
});
test('cash and stock failures are explicit; purchase intention does not create money',()=>{
 const poor=next(createStreetGame());assert.equal(streetPerson(poor.world,'available-0').shopping.items[0].outcome,'money');
 let g=createStreetGame();g.shifts=0;streetFirm(g.world,'rival').ovenAges=Array(streetFirm(g.world,'rival').machines).fill(12);g=next(g);
 const rich=streetPerson(g.world,'bakery-owner');assert.equal(rich.shopping.items[0].outcome,'stock');assert.equal(rich.bread,0);assert.equal(streetMoney(g.world),g.world.initialMoney);
});
test('legacy shopping-less save survives, and invalid shopping data resets only street',()=>{
 let g=next(createStreetGame());for(const p of g.world.people)delete p.shopping;
 const restored=restoreStreetGame(g);assert.deepEqual(restored,g);assert(next(restored).world.people.every(p=>p.shopping?.round===2));
 g=next(createStreetGame());g.world.people[0].shopping.items[0].probability=.5;assert.equal(restoreStreetGame(g).world.round,0);
});
test('street has funded inputs, differentiated wages and finite conserved money',()=>{
 for(const wage of [3,5,7])for(const price of [1,3,4])for(const response of ['none','rival','some','all']){
  let g=createStreetGame(wage);g.price=price;g.response=response;
  for(let i=0;i<48;i++){
   const before=g.world;g=next(g);assertStreetWorld(g.world);assert.equal(streetMoney(g.world),before.initialMoney);
   // A depleted firm may block opening. No repeated accounting of the last
   // completed day's production, sales or spoilage when no day has elapsed.
   if(g.world.round===before.round){assert.deepEqual(g.world,before);assert(g.message);break;}
   for(const id of ['bakery','rival']){const old=streetFirm(before,id),f=streetFirm(g.world,id),expired=before.batches.filter(b=>b.firm===id&&g.world.round-b.round>=3).reduce((n,b)=>n+b.quantity,0);assert.equal(f.stock,old.stock+f.produced-f.sold-expired);}
   if(i===0)assert(g.report.transactions.some(t=>t.kind==='inputs'&&t.from==='bakery'&&t.to==='inputs'&&t.amount===3));
  }
 }
});
test('a continuous staffed no-inventory path exists; low wages do not force a crisis',()=>{
 let g=createStreetGame(3);g.price=2;g.shifts=1;for(let i=0;i<16;i++){g=next(g);assert.equal(g.report.stock,0);assert.equal(g.report.working,1);assert.equal(g.report.sold,g.report.produced);}
});
test('oven purchase and hiring are separate funded actions, productive next period',()=>{
 let g=next(createStreetGame());g.phase='manage';const before=streetFirm(g.world,'bakery');g=streetReducer(g,{type:'BUY_OVEN'});
 assert.equal(streetFirm(g.world,'bakery').machines,3);assert.equal(streetFirm(g.world,'bakery').workers.length,2);assert.equal(g.world.round,1);assert.equal(g.report.produced,12);assert.equal(g.report.cashChange,-24);
 assert(g.report.transactions.some(t=>t.to==='ovens'&&t.amount===24));
 g=streetReducer(g,{type:'HIRE'});assert.equal(streetFirm(g.world,'bakery').workers.length,3);assert.equal(g.report.produced,12);
 g=next(g);assert.equal(g.report.produced,18);assert.equal(g.report.working,3);assert.equal(before.machines,2);
});
test('dismissed person keeps savings, gets funded severance, can shop and be rehired with same oven',()=>{
 let g=next(createStreetGame());g.phase='manage';const saved=streetPerson(g.world,'bakery-1').cash;
 assert.equal(streetReducer(g,{type:'LAYOFF'}),g);g=streetReducer(g,{type:'PREVIEW_LAYOFF'});g=streetReducer(g,{type:'LAYOFF'});
 assert.equal(streetPerson(g.world,'bakery-1').cash,saved+500);assert.equal(streetPerson(g.world,'bakery-1').job,null);assert.equal(streetFirm(g.world,'bakery').machines,2);
 assert.equal(g.report.cashChange,-5);g=next(g);assert.equal(g.report.produced,6);assert(!g.report.transactions.some(t=>t.to==='bakery-1'&&t.kind==='wage'));assert(g.report.transactions.some(t=>t.from==='bakery-1'&&t.kind==='bread'));
 g=streetReducer(g,{type:'HIRE'});assert.equal(streetPerson(g.world,'bakery-1').job,'bakery');assert.equal(g.report.investment,0);g=next(g);assert.equal(g.report.produced,12);
});

test('repeated hiring reuses a finite resident pool without creating people, needs or money',()=>{
 let g=createStreetGame();for(let i=0;i<3;i++)g=next(g);g.phase='manage';const ids=g.world.people.map(p=>p.id),money=streetMoney(g.world);
 for(let i=0;i<2;i++){g=streetReducer(g,{type:'BUY_OVEN'});const before=structuredClone(g.world);g=streetReducer(g,{type:'HIRE'});
  assert.deepEqual(g.world.people.map(p=>p.id),ids);assert.equal(streetMoney(g.world),money);
  assert.deepEqual(g.world.people.map(p=>p.cash),before.people.map(p=>p.cash));
  assert.equal(g.world.people.filter(p=>!p.job&&!p.owner).length,3-i);
 }
 for(let i=0;i<10;i++)g=streetReducer(g,{type:'HIRE'});
 assert.equal(streetFirm(g.world,'bakery').workers.length,4);assert.equal(g.world.people.length,20);
 const before=g.world;g=next(g);assert.equal(g.world.people.length,20);assert.equal(streetMoney(g.world),money);
 assert.equal(g.world.people.filter(p=>p.shopping.items[0].kind==='bread').length,20);
 assert(g.world.people.every(p=>p.bread<=3));assert(before.people.every(p=>g.world.people.some(q=>q.id===p.id)));
});
test('fewer shifts preserve jobs; some neighbor layoffs do not remove people or ovens',()=>{
 let g=next(createStreetGame());g.phase='manage';g=streetReducer(g,{type:'SHIFTS',delta:-1});g=next(g);
 assert.equal(g.report.working,1);assert.equal(streetFirm(g.world,'bakery').workers.length,2);assert.equal(g.report.wageBill,5);
 const population=g.world.people.length,car=streetFirm(g.world,'cars').workers.length;g=streetReducer(g,{type:'OTHER_LAYOFFS'});
 assert.equal(g.world.people.length,population);assert.equal(g.report.dismissed.length,2);assert.equal(streetFirm(g.world,'cars').workers.length,car);
});
test('insufficient cash blocks planned payroll and new equipment without overdraft or automatic firing',()=>{
 let g=createStreetGame();g.phase='manage';streetFirm(g.world,'bakery').cash=500;g.world.initialMoney=streetMoney(g.world);
 const b=streetReducer(g,{type:'BUY_OVEN'});assert.equal(b.world,g.world);assert(b.message);const r=next(g);assert.equal(r.world.round,0);assert.equal(streetFirm(r.world,'bakery').workers.length,2);assert(r.message.includes('还差'));
});
test('wage comparisons keep price, initial wealth and capacity identical; responses retain differences',()=>{
 const base=createStreetGame();let none={...base,wage:3,response:'none'},all={...base,wage:3,response:'all'};none=next(none);all=next(all);
 assert.equal(streetFirm(none.world,'clothes').wage,600);assert.equal(streetFirm(all.world,'clothes').wage,400);assert.equal(streetFirm(all.world,'cars').wage,400);
 assert.equal(none.report.produced,all.report.produced);assert.equal(streetFirm(none.world,'bakery').price,streetFirm(all.world,'bakery').price);assert.equal(none.world.initialMoney,all.world.initialMoney);
});
test('no double-period from duplicate buttons; exact deterministic replay with one changed condition',()=>{
 let g=createStreetGame();const a={type:'ROUND',expectedRound:0};g=streetReducer(g,a);assert.equal(streetReducer(g,a),g);
 const actual=g.world;g=streetReducer(g,{type:'RETRY'});assert.equal(g.world.round,0);g=next(g);assert.deepEqual(g.world,actual);
});
test('funded expansion creates inventory; cheap prices can clear it without forcing unlimited demand',()=>{
 let base=next(createStreetGame());base.phase='manage';base=streetReducer(base,{type:'BUY_OVEN'});base=streetReducer(base,{type:'HIRE'});
 assert.equal(streetFirm(base.world,'bakery').workers.length,3);
 base=next(base);base=next({...base,wage:3,response:'all'});base=next({...base,wage:3,response:'all'}); // Owners can now fund purchases too; observe several actual days.
 const low=next({...base,wage:3,price:3,response:'all'}),cheap=next({...base,wage:3,price:1,response:'all'}),high=next({...base,wage:7,price:3,response:'all'});
 assert(low.report.stock>0);assert.equal(cheap.report.stock,0);assert.equal(low.report.produced,18);assert.equal(high.report.produced,18);
 assert(high.world.people.reduce((n,p)=>n+p.cash,0)>low.world.people.reduce((n,p)=>n+p.cash,0));
});
test('valid restore preserves the committed period, damaged data resets only the street',()=>{
 let s=initialPrologue();s.bakeryWage=4;s.allocationPlans.A={laborShare:70,retainedShare:30};s=prologueReducer(s,{type:'JUMP_STAGE',stage:2});s=prologueReducer(s,{type:'STREET',action:{type:'ROUND',expectedRound:0}});
 assert.deepEqual(restorePrologue(JSON.stringify(s)),s);assert.equal(s.street.wage,5);
 const bad=structuredClone(s);bad.street.world.people[0].cash=-1;const repaired=restorePrologue(bad);assert.equal(repaired.street.world.round,0);assert.equal(repaired.allocationPlans.A.laborShare,70);
 assert.equal(restoreStreetGame({}).world.round,0);s.street.phase='limits';s=prologueReducer(s,{type:'SHOW_ENDING'});assert.equal(restorePrologue(s).scene,'ending');
});
test('refresh and navigation preserve archived six-shop work without running another day',()=>{
 let s=initialPrologue();s.scene='bakery-expansion';s=prologueReducer(s,{type:'EXPANSION_CONTINUE'});assert.equal(s.scene,'street');s=prologueReducer(s,{type:'STREET',action:{type:'ROUND',expectedRound:0}});const world=s.street.world;
 assert.deepEqual(prologueReducer(s,{type:'JUMP_STAGE',stage:2}).street.world,world);assert.deepEqual(restorePrologue(s).street.world,world);
 s=prologueReducer(s,{type:'SHOW_HOME'});s=prologueReducer(s,{type:'JUMP_STAGE',stage:2});assert.deepEqual(s.street.world,world);assert.equal(s.battle,null);assert.equal(streetMoney(s.street.world),s.street.world.initialMoney);
});

test('explicit legacy street initialization starts at wage five; archive browsing preserves adjustments',()=>{
 for(const wage of [3,4,5,6,7]){
  const base={...initialPrologue(),bakeryWage:wage};
  const entrances=[prologueReducer({...base,scene:'street'},{type:'STREET',action:{type:'WAGE',delta:0}}),restorePrologue({...base,scene:'street',street:{}})];
  for(const s of entrances){assert.equal(s.street.wage,5);assert.equal(streetFirm(s.street.world,'bakery').wage,500);assert.equal(s.bakeryWage,wage);}
  let adjusted=prologueReducer(entrances[0],{type:'STREET',action:{type:'WAGE',delta:-1}});assert.equal(adjusted.street.wage,4);
  assert.equal(restorePrologue(adjusted).street.wage,4);adjusted=prologueReducer(adjusted,{type:'SHOW_HOME'});adjusted=prologueReducer(adjusted,{type:'JUMP_STAGE',stage:2});assert.equal(adjusted.street.wage,4);
 }
});

test('twenty-person street has ten workers; valid funded saves survive',()=>{
 const small=next(createStreetGame());assert.equal(small.world.people.filter(p=>p.job).length,10);assert.equal(streetFirm(small.world,'cars').produced,2);assert.equal(streetFirm(small.world,'ovens').produced,1);
 for(const version of [2,3,4,5,STREET_VERSION]){const old={...small,version,wage:4},untouched=structuredClone(old),restored=restoreStreetGame(old);
  assert.equal(restored.version,STREET_VERSION);assert.equal(restored.world.people.length,20);assert.equal(restored.wage,4);assert.deepEqual(restored.world,old.world);assert.deepEqual(restored.report,old.report);assert.deepEqual(restored.history,old.history);assert.deepEqual(old,untouched);
  const resumed=next(restored);assert.equal(resumed.world.people.length,20);assert.equal(streetMoney(resumed.world),old.world.initialMoney);
 }
});

test('retired population resets to twenty at every phase and cannot reappear from old checkpoints',()=>{
 for(const version of [1,2,3,STREET_VERSION])for(const phase of ['intro','own','neighbors','manage','social','private','overproduction','limits']){
  const old=legacyStreetGame();old.version=version;old.phase=phase;old.wage=3;old.checkpoint=structuredClone(old.world);
  const untouched=structuredClone(old),restored=restoreStreetGame(old);
  assert.throws(()=>assertStreetWorld(old.world),/Invalid population/);assert.deepEqual(old,untouched);
  assert.deepEqual(restored,createStreetStory());assert.equal(next(restored).world.people.length,20);assert.deepEqual(restoreStreetGame(restored),restored);
 }
 const old=next(createStreetGame());old.checkpoint=legacyStreetGame().world;assert.deepEqual(restoreStreetGame(old),createStreetStory());
});

test('retiring old street clears only second-act progress, never first-act or chapter choices',()=>{
 const saved=initialPrologue();saved.bakeryWage=3;saved.bakeryCommitted=true;saved.scene='street';saved.allocationPlans.A={laborShare:70,retainedShare:30};saved.reliefVisited=['consumption'];saved.street=legacyStreetGame();saved.street.phase='social';
 // The saved report is deliberately present: do not leave an old conclusion or
 // transaction history attached to the new world.
 saved.street.report=next(createStreetGame()).report;saved.street.history=[saved.street.report];
 const untouched=structuredClone(saved),restored=restorePrologue(saved);
 assert.deepEqual(saved,untouched);assert.deepEqual(restored,{...saved,street:createStreetStory()});
 assert.deepEqual(restorePrologue(JSON.stringify(restored)),restored);
});

test('explicit street restart resets this act to twenty people without erasing first-act choices',()=>{
 const saved=initialPrologue();saved.bakeryWage=3;saved.bakeryCommitted=true;saved.scene='street';saved.street=next(createStreetGame());saved.street.phase='manage';
 const reset=prologueReducer(saved,{type:'STREET',action:{type:'RESTART'}});assert.equal(reset.bakeryWage,3);assert.equal(reset.bakeryCommitted,true);assert.deepEqual(reset.allocationPlans,saved.allocationPlans);
 assert.equal(reset.street.world.people.length,20);assert.equal(reset.street.world.round,0);assert.equal(reset.street.wage,5);assert.equal(reset.street.report,null);assert.equal(reset.street.checkpoint,null);assert.deepEqual(reset.street.history,[]);assert.equal(saved.street.world.round,1);
});
