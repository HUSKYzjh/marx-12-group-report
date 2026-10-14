import test from 'node:test';
import assert from 'node:assert/strict';
import {CALENDAR_RATES,initialTimeCalendar,calendarAccount,calendarRequiredDays,timeCalendarReducer,restoreTimeCalendar} from '../lib/time-calendar.ts';
import {initialAutomation,automationReducer,restoreAutomation,canConcludeAutomation} from '../lib/automation-experiment.ts';
const step=(s,a)=>timeCalendarReducer(s,a);
const lab=()=>step(initialTimeCalendar(),{type:'BEGIN'});
const rest=s=>[2,3,4].reduce((p,from)=>step(p,{type:'PLACE_DAY',from,to:'rest'}),s);
function reconcile(s){
 const a=calendarAccount(s),wallets={firm:100,owner:10,supplier:0};for(let i=0;i<10;i++)wallets['person-'+i]=0;
 for(const t of a.transfers){assert(Number.isInteger(t.amount)&&t.amount>0);assert(wallets[t.from]>=t.amount);wallets[t.from]-=t.amount;wallets[t.to]+=t.amount;}
 assert.equal(wallets.firm,a.firmAfter);assert.equal(wallets.supplier,a.supplierAfter);assert.equal(wallets.owner,a.ownerAfter);
 for(const p of a.people){assert.equal(wallets['person-'+p.id],p.cash);assert(p.bought<=5);assert.equal(p.income-p.bought,p.cash);}
 assert.equal(a.moneyBefore,110);assert.equal(a.moneyAfter,110);assert.equal(a.people.length,10);assert.equal(a.output,a.sold+a.unsold);assert.equal(a.output,a.days.reduce((n,d)=>n+d.output,0));assert(Number.isInteger(a.output));assert(a.firmAfter>=0);assert.equal(a.wages,a.people.reduce((n,p)=>n+p.income,0));
 return a;
}
test('five days, paid rest, attendance pay and reduced staff have distinct actual results',()=>{
 let s=lab(),a=reconcile(s);assert.deepEqual([a.workDays,a.output,a.wages,a.sold,a.unsold],[5,150,50,60,90]);
 s=rest(s);a=reconcile(s);assert.deepEqual([a.workDays,a.output,a.wages,a.sold,a.unsold],[2,60,50,60,0]);
 a=reconcile(step(s,{type:'FLIP_CONTRACT'}));assert.deepEqual([a.workDays,a.output,a.wages,a.sold,a.unsold],[2,60,20,30,30]);
 for(let person=4;person<10;person++)s=step(s,{type:'STAFF',person,employed:false});a=reconcile(s);
 assert.deepEqual([a.crew,a.workDays,a.output,a.wages,a.sold,a.unsold],[4,5,60,20,30,30]);assert.equal(a.people.filter(p=>p.income===0).length,6);
});
test('all capabilities, crew sizes, day patterns and contracts settle from real wallets',()=>{
 for(const rate of CALENDAR_RATES)for(let crew=0;crew<=10;crew++)for(const contract of ['weekly','attendance'])for(let mask=0;mask<32;mask++){
  const p={rate,staff:Array.from({length:10},(_,i)=>i<crew),extras:Array(5).fill(false),contract};const core=calendarRequiredDays(p);
  if(mask&((1<<core)-1))continue;p.extras=p.extras.map((_,i)=>!!(mask&(1<<i)));reconcile(p);
 }
});
test('all 1024 staff identities remain finite and preserve specific individuals',()=>{
 for(let mask=0;mask<1024;mask++){
  const p={...lab(),staff:Array.from({length:10},(_,i)=>!!(mask&(1<<i))),extras:Array(5).fill(false)};const a=reconcile(p);
  assert.deepEqual(a.people.map(p=>p.employed),p.staff);assert.equal(a.crew,p.staff.filter(Boolean).length);
 }
});
test('core dates are protected, rest can return to its own date, invalid inputs do nothing',()=>{
 let s=lab();for(const a of [{type:'PLACE_DAY',from:0,to:'rest'},{type:'PLACE_DAY',from:2,to:1},{type:'STAFF',person:10,employed:false},{type:'RATE',rate:61}])assert.strictEqual(step(s,a),s);
 s=step(s,{type:'PLACE_DAY',from:2,to:'rest'});assert.equal(s.extras[2],false);s=step(s,{type:'PLACE_DAY',from:2,to:2});assert.equal(s.extras[2],true);
 s=step(s,{type:'PLACE_DAY',from:3,to:'rest'});s=step(s,{type:'PLACE_DAY',from:2,to:3});assert.deepEqual(s.extras,[false,false,false,true,true]);
});
test('draft never changes last paid week; comparisons require actually running different conditions',()=>{
 let s=step(lab(),{type:'RUN'});const run=structuredClone(s.run);assert.equal(s.trials.length,1);assert.strictEqual(step(s,{type:'CONCLUDE'}),s);
 s=rest(s);assert.deepEqual(s.run,run);assert.equal(s.trials.length,1);s=step(s,{type:'RUN'});assert.equal(s.trials.length,2);
 assert.equal(step(s,{type:'CONCLUDE'}).phase,'conclusion');assert.deepEqual(step(s,{type:'RUN'}).trials,s.trials);
 const previous=structuredClone(s.trials);s=step(s,{type:'RATE',rate:80});assert.equal(s.run,null);assert.deepEqual(s.trials,previous);assert.strictEqual(step(s,{type:'CONCLUDE'}),s);
 const neutral=step(step(lab(),{type:'RATE',rate:0}),{type:'RUN'});assert.equal(step(neutral,{type:'CONCLUDE'}).phase,'conclusion');
});
test('saving clones drafts and executed records; corrupt and impossible histories cannot run',()=>{
 let s=step(lab(),{type:'RUN'});s=step(rest(s),{type:'RUN'});const saved=restoreTimeCalendar(s);assert.deepEqual(saved,s);saved.staff[0]=false;assert.equal(s.staff[0],true);
 for(const edit of [p=>p.run.extras[0]=true,p=>p.trials.push(p.trials[0]),p=>p.trials[0].rate=61,p=>p.staff.push(true),p=>p.extras[1]=true]){const bad=structuredClone(s);edit(bad);assert.equal(restoreTimeCalendar(bad),null);}
});
test('new calendar actions are separate from legacy snapshots and only available in time branch',()=>{
 const begin={type:'CALENDAR',action:{type:'BEGIN'}};const s=automationReducer(initialAutomation('time'),begin);assert.equal(s.calendar.phase,'lab');
 assert.deepEqual(restoreAutomation(s),s);const a=automationReducer(s,{type:'CALENDAR',action:{type:'RUN'}});assert.equal(a.run,null);assert.equal(a.calendar.trials.length,1);assert.deepEqual(restoreAutomation(a),a);
 assert.equal(canConcludeAutomation(a),false);let compared=a;for(const day of [2,3,4])compared=automationReducer(compared,{type:'CALENDAR',action:{type:'PLACE_DAY',from:day,to:'rest'}});compared=automationReducer(compared,{type:'CALENDAR',action:{type:'RUN'}});assert.equal(canConcludeAutomation(compared),true);
 for(const action of [{type:'RUN'},{type:'MODE',mode:'cut'},{type:'ASSIGN',person:0,mode:'share'}])assert.strictEqual(automationReducer(a,action),a);
 const ai=initialAutomation();assert.strictEqual(automationReducer(ai,begin),ai);
 const old=automationReducer(initialAutomation('time'),{type:'BEGIN'});assert.strictEqual(automationReducer(old,begin),old);assert.deepEqual(restoreAutomation(old),old);
 assert.deepEqual(automationReducer(a,{type:'RESTART'}),initialAutomation('time'));
});
