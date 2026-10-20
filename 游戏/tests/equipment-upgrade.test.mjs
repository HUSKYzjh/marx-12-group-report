import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {equipmentWorld,equipmentRound,equipmentIssue,equipmentMoves,upgradeCost} from '../public/assets/market-duel/equipment-model.mjs';
import {initialCourse,courseRound,restoreCourse,undoCourse,retryScene,adoptEquipmentCourse,nextCourse,finished,crossCustomers,traceCustomer} from '../public/assets/market-duel/course-model.mjs';

test('whole-shop investment scales with old ovens, pauses one day and pays wages',()=>{
 for(const social of [false,true])for(const ovens of [1,2,3]){
  const w=equipmentWorld(social);w.shops[0].ovens=ovens;w.shops[0].cash+=30;w.shops[1].cash-=30;const before=structuredClone(w);
  assert.equal(upgradeCost(w.shops[0]),8*ovens);
  assert.match(equipmentMoves(w,social).find(m=>m.id==='upgrade').hint,new RegExp(8*ovens+'金币'));
  const installed=equipmentRound(w,'upgrade',social?'social':'steady'),r=installed.history.at(-1);
  assert.deepEqual(w,before);assert.equal(r.made[0],0);assert.equal(r.wages[0],6);assert.equal(r.stopped[0],true);assert.equal(r.installing[0],true);
  assert.equal(r.receipts.find(p=>p.from==='f0'&&p.reason==='升级快炉').amount,8*ovens);
  assert(!r.receipts.some(p=>p.from==='f0'&&p.reason==='原料'));
  assert.equal(installed.shops[0].fastOvens,0);assert.equal(installed.shops[0].pending.fastOvens,ovens);
  const resumed=equipmentRound(installed,'hold',social?'social':'steady');
  assert.equal(resumed.history.at(-1).installing[0],false);assert(resumed.history.at(-1).made[0]>0);
  assert.equal(resumed.shops[0].fastOvens,ovens);assert(!resumed.history.at(-1).receipts.some(p=>p.from==='f0'&&p.reason==='升级快炉'));
  assert.match(equipmentIssue(resumed,'upgrade',social),/全是快炉/);
 }
});

test('already upgraded ovens are not charged twice; funding includes idle-day wages and arrears',()=>{
 const w=equipmentWorld();w.shops[0].ovens=3;w.shops[0].fastOvens=1;
 assert.equal(upgradeCost(w.shops[0]),16);
 let next=equipmentRound(w,'upgrade','steady');assert.equal(next.shops[0].pending.fastOvens,3);
 assert.equal(next.history.at(-1).receipts.find(p=>p.reason==='升级快炉').amount,16);
 const poor=equipmentWorld();poor.shops[0].ovens=2;poor.shops[0].cash=23;poor.outside+=13;
 const before=structuredClone(poor);assert.match(equipmentIssue(poor,'upgrade'),/需24金币/);
 assert.throws(()=>equipmentRound(poor,'upgrade','steady'));assert.deepEqual(poor,before);
 poor.shops[0].cash++;poor.outside--;assert.equal(equipmentIssue(poor,'upgrade'),'');
 next=equipmentRound(poor,'upgrade','steady');assert.equal(next.shops[0].cash,0);assert.equal(next.history[0].wages[0],6);
 const cashStopped=equipmentRound(next,'hold','steady');assert.equal(cashStopped.history.at(-1).installing[0],false);assert.equal(cashStopped.history.at(-1).stopped[0],true);
 poor.shops[0].debt=1;assert.match(equipmentIssue(poor,'upgrade'),/需25金币/);
});

test('installation can sell existing bread but never bakes a new batch; rival obeys the same pause',()=>{
 let w=equipmentRound(equipmentWorld(),'price-up','steady');assert.equal(w.shops[0].bread.length,0);
 // Two ovens produce surplus on day two; it remains legitimate stock on installation day.
 w=equipmentRound(equipmentWorld(),'buy','steady');w=equipmentRound(w,'hire','steady');w=equipmentRound(w,'hold','steady');
 assert(w.shops[0].bread.length>0);const upgraded=equipmentRound(w,'upgrade','steady'),r=upgraded.history.at(-1);
 assert.equal(r.made[0],0);assert(r.sold[0]>0);assert.equal(r.wages[0],8);
 let social=equipmentRound(equipmentWorld(true),'hold','social');social=equipmentRound(social,'hold','social');
 assert.equal(social.history.at(-1).installing[1],true);assert.equal(social.history.at(-1).made[1],0);assert.equal(social.history.at(-1).wages[1],3);
 social=equipmentRound(social,'hold','social');assert(social.history.at(-1).made[1]>0);
});

test('pre-change v3 records replay exactly; new rules archive old accounts rather than rewriting them',()=>{
 let old=courseRound(initialCourse(false,false),'upgrade');assert.equal(old.world.history[0].made[0],6);assert(!('upgradeRule' in old.world));
 assert.deepEqual(restoreCourse(old),old);assert.deepEqual(undoCourse(old),initialCourse(false,false));assert(!('upgradeRule' in retryScene(old).world));
 let fresh=adoptEquipmentCourse(old);assert.equal(fresh.world.upgradeRule,'whole-shop-v1');assert.deepEqual(fresh.previousCourse,old);
 fresh=courseRound(fresh,'upgrade');assert.equal(fresh.world.history[0].made[0],0);assert.deepEqual(restoreCourse(fresh),fresh);
 assert.deepEqual(undoCourse(fresh).previousCourse,old);
 // Full old courses also retain their archived market and social accounting.
 while(!finished(old))old=courseRound(old,'hold');old=nextCourse(old);
 while(!finished(old))old=courseRound(old,'hold');old=nextCourse(old);
 for(const id of crossCustomers(old))old=traceCustomer(old,id);old=nextCourse(old);
 while(!finished(old))old=courseRound(old,'hold');old=nextCourse(old);assert.deepEqual(restoreCourse(old),old);
 const forged=structuredClone(fresh);forged.world.upgradeRule='invented';assert.equal(restoreCourse(forged),null);
});

test('current guide states an immediate upgrade while old rules stay replayable',()=>{
 const html=readFileSync(new URL('../public/assets/market-duel/battle.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../public/assets/market-duel/course-game.mjs',import.meta.url),'utf8');
 assert.match(html,/一次付8枚/);assert.match(html,/当天生效、不停工/);
 assert.doesNotMatch(ui,/offerUpgrade|equipment-start|第二幕分成上下篇了/);assert.match(ui,/state=adoptEquipmentCourse\(state,true,true,true,true,true\)/);assert.doesNotMatch(html,/upgrade-course/);
 assert.match(ui,/w\.shops\.map\(f=>\{const today=readyShop\(f\)/);
});
