import test from 'node:test';
import assert from 'node:assert/strict';
import {initialTimeCalendar,timeCalendarReducer,calendarAccount,restoreTimeCalendar} from '../lib/time-calendar.ts';
const act=(s,a)=>timeCalendarReducer(s,a),lab=()=>act(initialTimeCalendar(),{type:'BEGIN'});
function lifePlan(){let s=lab();for(const from of [2,3,4])s=act(s,{type:'PLACE_DAY',from,to:'rest'});for(let activity=0;activity<2;activity++)s=act(s,{type:'PLACE_LIFE',activity,placed:true});return s;}
test('appointments require the actual weekday to be free, not just an aggregate count of rest days',()=>{
 let s=lab();assert.equal(act(s,{type:'PLACE_LIFE',activity:0,placed:true}),s);s=act(s,{type:'PLACE_DAY',from:3,to:'rest'});assert.equal(act(s,{type:'PLACE_LIFE',activity:0,placed:true}),s);s=act(s,{type:'PLACE_DAY',from:2,to:'rest'});s=act(s,{type:'PLACE_LIFE',activity:0,placed:true});assert.deepEqual(s.life,[true,false]);assert.equal(calendarAccount(s).personal.activities[0].attended,true);
});
test('same machine and free dates, different wage conditions: actual purchases differ',()=>{
 const paid=calendarAccount(lifePlan()),unpaid=calendarAccount(act(lifePlan(),{type:'FLIP_CONTRACT'}));assert.deepEqual(paid.personal.freeDays,unpaid.personal.freeDays);assert.equal(paid.personal.activities.filter(v=>v.attended).length,2);assert.equal(unpaid.personal.activities.filter(v=>v.attended).length,2);assert.deepEqual([paid.personal.income,paid.personal.bought,unpaid.personal.income,unpaid.personal.bought],[5,5,2,2]);assert.equal(paid.moneyAfter,110);assert.equal(unpaid.moneyAfter,110);
});
test('life placement has no wage or inventory side effects; work returning displaces the draft appointment only',()=>{
 let s=act(lab(),{type:'RUN'});const last=structuredClone(s.run);for(const from of [2,3,4])s=act(s,{type:'PLACE_DAY',from,to:'rest'});const before=calendarAccount(s);s=act(s,{type:'PLACE_LIFE',activity:0,placed:true});const after=calendarAccount(s);assert.deepEqual(after.transfers,before.transfers);assert.equal(after.output,before.output);assert.deepEqual(s.run,last);s=act(s,{type:'PLACE_DAY',from:2,to:2});assert.equal(s.life[0],false);assert.deepEqual(s.run,last);
});
test('date changes and protagonists employment are meaningful observations; legacy records gain no invented appointment',()=>{
 let s=lifePlan();s=act(s,{type:'RUN'});s=act(s,{type:'PLACE_LIFE',activity:0,placed:false});s=act(s,{type:'RUN'});assert.equal(s.trials.length,2);assert.deepEqual(restoreTimeCalendar(s),s);
 const old=structuredClone(s);delete old.life;for(const p of [old.run,...old.trials])delete p.life;old.trials=[old.run];assert.deepEqual(restoreTimeCalendar(old),old);assert(!('life' in restoreTimeCalendar(old).run));assert.equal(calendarAccount(old.run).personal.recorded,false);assert.equal(calendarAccount(s.run).personal.recorded,true);
 const bad=structuredClone(s);bad.life=[true,true];bad.extras[2]=true;assert.equal(restoreTimeCalendar(bad),null);
});
test('unemployment does not remove the person or make free time equivalent to paid leave',()=>{
 let s=lifePlan();s=act(s,{type:'STAFF',person:0,employed:false});const a=calendarAccount(s);assert.equal(a.people.length,10);assert.equal(a.personal.income,0);assert.equal(a.personal.bought,0);assert.equal(a.personal.activities.filter(v=>v.attended).length,2);assert.equal(a.moneyAfter,110);
});
