import test from 'node:test';
import assert from 'node:assert/strict';
import {createStreetStory,createStreetGame,streetReducer as reduce,streetFirm as firm,streetMoney,streetCapacity,restoreStreetGame,assertStreetWorld} from '../lib/street-game.ts';
import {initialPrologue,prologueReducer,restorePrologue} from '../lib/prologue-state.ts';
const round=g=>reduce(g,{type:'ROUND',expectedRound:g.world.round});
function pressure(){let g=round(createStreetStory());g=reduce(g,{type:'STORY_EXPAND'});g=round(g);g=reduce(g,{type:'STORY_COMPETE'});g=round(g);return round(g);}

test('empty counters, actual staffed teams and small reserves at opening; old funded progress is preserved',()=>{
 const g=createStreetStory();assert.deepEqual(g.world.firms.map(f=>f.stock),[0,0,0,0,0,0]);
 assert.deepEqual(g.world.firms.map(f=>f.workers.length),[2,1,2,2,1,2]);assert.deepEqual(g.world.firms.map(f=>f.cash/100),[60,60,24,32,32,16]);
 assert.equal(streetMoney(g.world),36800);assert(g.world.people.every(p=>p.cash===(p.job||p.owner?900:0)));assertStreetWorld(g.world);
 const old=round(g);old.version=6;firm(old.world,'bakery').cash+=18000;old.world.initialMoney=streetMoney(old.world);
 assert.deepEqual(restoreStreetGame(old).world,old.world);assert.deepEqual(restoreStreetGame(old).history,old.history);
});

test('untouched v6 opening adopts smaller reserves without requiring home navigation',()=>{
 const old=createStreetStory();old.version=6;let index=0;
 old.world.people=old.world.people.filter(p=>!['clothes-1','cars-1','inputs-1','available-2','available-3'].includes(p.id));
 for(const f of old.world.firms){f.workers=f.workers.filter(id=>old.world.people.some(p=>p.id===id));f.machines=f.workers.length;f.ovenAges=Array(f.machines).fill(0);}
 for(const f of old.world.firms){f.cash=24000;f.stock=f.id==='inputs'?64:0;for(const id of f.workers){old.world.people.find(p=>p.id===id).cash=(12+index%5*3)*100;index++;}old.world.people.find(p=>p.owner===f.id).cash=1200;index++;}
 old.world.initialMoney=streetMoney(old.world);assert.equal(old.world.initialMoney,162900);
 const restored=restoreStreetGame(old);assert.deepEqual(restored.world,createStreetStory().world);assert.equal(restored.serial,old.serial+1);
 assert.equal(old.world.firms[0].cash,24000);
 const custom=structuredClone(old);custom.world.firms[0].cash+=100;custom.world.initialMoney+=100;const migrated=restoreStreetGame(custom).world;assert.deepEqual(migrated.firms,custom.world.firms);assert.deepEqual(migrated.people.slice(0,15),custom.world.people);assert.equal(streetMoney(migrated),custom.world.initialMoney);assert.equal(migrated.people.length,20);
});

test('guided story is six actual periods in five clear steps; inventory is computed, never inserted',()=>{
 let g=createStreetStory();const original=structuredClone(g),ids=g.world.people.map(p=>p.id),money=streetMoney(g.world);
 g=round(g);assert.equal(g.story.beat,'expand');assert.equal(g.report.produced,12);assert.equal(g.report.sold,12);
 const before=g;g=reduce(g,{type:'STORY_EXPAND'});assert.equal(g.world.round,1);assert.equal(g.story.beat,'lead');assert.equal(g.report.investment,24);assert.equal(g.report.hired.length,1);
 assert.equal(firm(g.world,'bakery').cash,firm(before.world,'bakery').cash-2400);assert.equal(firm(g.world,'ovens').cash,firm(before.world,'ovens').cash+2400);
 g=round(g);assert.equal(g.story.beat,'rival');assert.equal(g.report.produced,18);assert.equal(g.report.sold,18);
 const prior=g;g=reduce(g,{type:'STORY_COMPETE'});assert.equal(g.world.round,2);assert.equal(firm(g.world,'rival').workers.length,2);assert.equal(firm(g.world,'rival').cash,firm(prior.world,'rival').cash-4800);assert.equal(streetCapacity(firm(g.world,'rival')),18);
 g=round(g);assert.equal(g.story.beat,'pressure');assert.equal(g.story.pressureRounds,1);assert.equal(firm(g.world,'rival').produced,18);assert.equal(firm(g.world,'rival').stock,4);assert.equal(g.report.stock,6);
 g=round(g);assert.equal(g.story.beat,'adjust');assert.equal(g.report.stock,9);assert.equal(firm(g.world,'rival').stock,8);assert.equal(g.world.round,4);
 g=round(g);assert.equal(g.story.beat,'layoff');g=round(g);assert.equal(g.story.beat,'review');assert.equal(g.world.round,6);assert.equal(g.report.rivalDecision,undefined);
 assert.deepEqual(g.world.people.map(p=>p.id),ids);assert.equal(streetMoney(g.world),money);assert.deepEqual(original,createStreetStory());assertStreetWorld(g.world);
});

test('guided investments cannot double-pay or double-hire; story gates prevent runaway continuous rounds',()=>{
 let g=round(createStreetStory());assert.equal(round(g),g);g=reduce(g,{type:'STORY_EXPAND'});assert.equal(reduce(g,{type:'STORY_EXPAND'}),g);
 g=round(g);assert.equal(round(g),g);g=reduce(g,{type:'STORY_COMPETE'});assert.equal(reduce(g,{type:'STORY_COMPETE'}),g);
 g=round(round(round(round(g))));assert.equal(g.story.beat,'review');assert.equal(g.report.rivalDecision,undefined);g=round(g);assert.equal(g.world.round,7);assert.equal(g.report.rivalDecision.kind,'wage-cut');g=round(g);assert.equal(g.world.round,8);assert.equal(g.report.rivalDecision.kind,'layoff');assert.equal(round(g),g);
});

test('failed guided purchase is atomic; it cannot leave a paid oven without a hire',()=>{
 let g=round(createStreetStory());firm(g.world,'bakery').cash=2400;g.world.initialMoney=streetMoney(g.world);const before=structuredClone(g.world);
 const failed=reduce(g,{type:'STORY_EXPAND'});assert.deepEqual(failed.world,before);assert.equal(failed.story.beat,'expand');assert(failed.message);
});

test('price relief sells more and reduces accumulated stock; wage changes affect wallets and sales',()=>{
 const base=pressure(),money=streetMoney(base.world);
 const full=round(base),cheap=round({...base,price:1}),cut=round({...base,wage:3,response:'all'}),high=round({...base,wage:7,response:'all'});
 assert(full.report.stock>0);assert(cheap.report.stock<full.report.stock);assert(cheap.report.sold>full.report.sold);assert((cheap.report.storageCharges.find(c=>c.firm==='bakery')?.paid||0)<full.report.storageCharges.find(c=>c.firm==='bakery').paid);assert(high.world.people.reduce((n,p)=>n+p.cash,0)>cut.world.people.reduce((n,p)=>n+p.cash,0));
 // Lower opening savings make affordability visible, but neither extra wages
 // nor discounts force a full person to want unlimited bread.
 assert.notDeepEqual(high.report.transactions,cut.report.transactions); // More wages need not mechanically clear more stock.
 for(const g of [full,cheap,cut,high]){assert.equal(g.story.beat,'layoff');assert.equal(streetMoney(g.world),money);assertStreetWorld(g.world);}
});

test('layoff preserves people and savings; next period has no wage for dismissed residents',()=>{
 let g=round({...pressure(),wage:3,response:'all'});const before=structuredClone(g.world);
 g=reduce(g,{type:'PREVIEW_LAYOFF'});const preview=g;g=reduce(g,{type:'CANCEL_LAYOFF'});assert.deepEqual(g.world,preview.world);
 g=reduce(g,{type:'PREVIEW_LAYOFF'});g=reduce(g,{type:'LAYOFF'});const id=g.report.dismissed[0];assert.equal(g.world.people.find(p=>p.id===id).cash,before.people.find(p=>p.id===id).cash+500);
 g=reduce(g,{type:'OTHER_LAYOFFS'});const dismissed=[...g.story.dismissed];assert.equal(dismissed.length,3);assert.equal(g.world.people.length,20);
 g=round(g);assert.equal(g.story.beat,'review');assert(g.report.produced<18);for(const id of dismissed){assert(!g.report.transactions.some(t=>t.kind==='wage'&&t.to===id));assert(g.world.people.find(p=>p.id===id).shopping.items[0].kind==='bread');}
 assert.equal(streetMoney(g.world),before.initialMoney);
});

test('legacy street records survive refresh and chapter browsing as archives',()=>{
 let g=createStreetStory();for(const type of ['ROUND','STORY_EXPAND','ROUND','STORY_COMPETE','ROUND','ROUND','ROUND','PREVIEW_LAYOFF','LAYOFF','ROUND']){
  g=reduce(g,{type,expectedRound:g.world.round});assert.deepEqual(restoreStreetGame(JSON.parse(JSON.stringify(g))),g);
  const saved={...initialPrologue(),scene:'street',bakeryWage:3,street:g};assert.deepEqual(restorePrologue(JSON.stringify(saved)),saved);
  assert.deepEqual(prologueReducer(saved,{type:'JUMP_STAGE',stage:2}).street,g);
  const home=prologueReducer(saved,{type:'SHOW_HOME'}),back=prologueReducer(home,{type:'JUMP_STAGE',stage:2});
  assert.deepEqual(back.street,g);assert.equal(back.battle,null);assert.equal(back.bakeryWage,3);
 }
});

test('first act to second now opens the battle without overwriting archived six-shop accounts',()=>{
 const previous=pressure(),saved={...initialPrologue(),scene:'bakery-expansion',bakeryWage:7,bakeryCommitted:true,street:previous};
 const entered=prologueReducer(saved,{type:'EXPANSION_CONTINUE'});
 assert.equal(entered.scene,'street');assert.deepEqual(entered.street,previous);assert.equal(entered.battle,null);
 assert.equal(entered.bakeryWage,7);assert.deepEqual(saved.street,previous); // first act and old object are not mutated
 assert.deepEqual(restorePrologue(JSON.stringify(entered)),entered);
});

test('retry restores the same market condition and story beat; repeat and sandbox never reset the world',()=>{
 const base=pressure(),actual=round(base),retry=reduce(actual,{type:'RETRY'});assert.equal(retry.story.beat,'adjust');assert.deepEqual(retry.world,base.world);assert.deepEqual(round(retry).world,actual.world);
 const review=round(actual),repeat=reduce(review,{type:'STORY_REPEAT'});assert.equal(repeat.story.beat,'adjust');assert.deepEqual(repeat.world,review.world);
 const sandbox=reduce(review,{type:'STORY_SANDBOX'});assert.equal(sandbox.story,undefined);assert.equal(sandbox.phase,'manage');assert.deepEqual(sandbox.world,review.world);
});

test('existing fifteen-person sandbox saves survive; starting the story resets only the street on request',()=>{
 const old=round(createStreetGame());old.version=4;const restored=restoreStreetGame(old);assert.deepEqual(restored.world,old.world);assert.equal(restored.story,undefined);
 const saved={...initialPrologue(),scene:'street',bakeryWage:4,bakeryCommitted:true,street:restored};const started=prologueReducer(saved,{type:'STREET',action:{type:'BEGIN_STORY'}});
 assert.equal(started.bakeryWage,4);assert.equal(started.bakeryCommitted,true);assert.equal(started.street.story.beat,'opening');assert.equal(started.street.world.round,0);assert.equal(started.street.wage,5);assert.deepEqual(saved.street.world,old.world);
});

test('invalid fast-oven capacities or story stages cannot create infinite output on restore',()=>{
 const g=pressure();for(const q of [-1,0,18,Infinity]){const bad=structuredClone(g);firm(bad.world,'rival').ovenCapacities[1]=q;assert.equal(restoreStreetGame(bad).world.round,0);}
 const bad=structuredClone(g);bad.story.pressureRounds=100;assert.equal(restoreStreetGame(bad).world.round,0);
});

test('with fewer workers the faster usable oven runs first; replacing it still costs forty-eight',()=>{
 let g=pressure();g=reduce(g,{type:'OTHER_LAYOFFS'});const rival=firm(g.world,'rival');assert.equal(rival.workers.length,1);assert.equal(streetCapacity(rival),12);
 const ages=[...rival.ovenAges];g=round(g);assert.equal(firm(g.world,'rival').produced,12);assert.equal(firm(g.world,'rival').ovenAges[0],ages[0]);assert.equal(firm(g.world,'rival').ovenAges[1],ages[1]+1);
 firm(g.world,'rival').ovenAges[1]=12;firm(g.world,'ovens').stock=1;g=round(g);const tx=g.report.transactions.find(t=>t.kind==='replacement'&&t.from==='rival');assert.equal(tx.amount,48);assert.equal(firm(g.world,'rival').ovenCapacities[1],12);assert.equal(firm(g.world,'rival').ovenAges[1],0);assertStreetWorld(g.world);
});
