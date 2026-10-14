import test from 'node:test';
import assert from 'node:assert/strict';
import {initialAutomation,automationReducer as ai,restoreAutomation,automationRunAccount,AUTOMATION_RATES,AUTOMATION_MODES} from '../lib/automation-experiment.ts';
import {automationExploration as probeAI,automationRehearsal as nextAI} from '../lib/automation-exploration.ts';
import {initialTimeCalendar,timeCalendarReducer as cal,calendarAccount,restoreTimeCalendar} from '../lib/time-calendar.ts';
import {calendarExploration as probeCal} from '../lib/calendar-exploration.ts';
const labAI=()=>ai(initialAutomation(),{type:'BEGIN'}),labCal=()=>cal(initialTimeCalendar(),{type:'BEGIN'});
const runAI=s=>ai(s,{type:'RUN'}),runCal=s=>cal(s,{type:'RUN'});
function rested(){let s=labCal();for(const from of [2,3,4])s=cal(s,{type:'PLACE_DAY',from,to:'rest'});return s;}
function appointments(){let s=rested();for(const activity of [0,1])s=cal(s,{type:'PLACE_LIFE',activity,placed:true});return s;}

test('AI questions require a paid run and keep the actual person when the draft changes',()=>{
 let s=labAI();assert.equal(probeAI(s),null);s=runAI(s);assert.equal(probeAI(s).focusPerson,4);assert.match(probeAI(s).prompt,/小1.*没饭钱.*只挪他/);
 const p=probeAI(s),saved=structuredClone(s);assert.deepEqual(probeAI(restoreAutomation(s)),p);assert.deepEqual(s,saved);
 s=ai(s,{type:'ASSIGN',person:0,mode:'time'});assert.deepEqual(probeAI(s),p);s=ai(s,{type:'RATE',rate:80});assert.equal(probeAI(s),null);
 assert.equal(probeAI(initialAutomation('time')),null);s=ai(labAI(),{type:'RATE',rate:0});assert.equal(probeAI(runAI(s)),null);
});

test('AI actual outcomes ask different questions for lost pay, excess work, share and paid leave',()=>{
 for(const [mode,pattern] of [['cut',/没饭钱/],['expand',/人人有收入.*面包.*留下.*少做货/],['share',/有饭钱.*没在册.*身份/],['time',/卖完.*继续做货/]]){
  const s=runAI(ai(labAI(),{type:'MODE',mode}));assert.match(probeAI(s).prompt,pattern);assert.equal(probeAI(s).focusPerson,4);
  assert.equal(automationRunAccount(s.run).moneyAfter,108);
 }
 const s=runAI(ai(runAI(labAI()),{type:'ASSIGN',person:0,mode:'time'}));assert.equal(probeAI(s).focusPerson,5);assert.match(probeAI(s).prompt,/小2.*饭钱/);
});

test('AI one-person comparisons derive actual income, output and identity effects in both directions',()=>{
 let s=runAI(labAI());s=runAI(ai(s,{type:'ASSIGN',person:0,mode:'time'}));assert.match(probeAI(s).comparison,/机器没换，只改小1.*收入多4枚.*卖出多4份.*剩货少4份/);
 s=runAI(ai(s,{type:'ASSIGN',person:0,mode:'expand'}));assert.match(probeAI(s).comparison,/收入不变.*多上5天.*多做12份.*多剩12份/);
 s=runAI(ai(s,{type:'ASSIGN',person:0,mode:'cut'}));assert.match(probeAI(s).comparison,/收入少4枚.*卖出少4份.*剩货少8份/);
 s=runAI(ai(s,{type:'ASSIGN',person:0,mode:'share'}));assert.match(probeAI(s).comparison,/收入多4枚.*剩货少4份/);
 s=runAI(ai(s,{type:'ASSIGN',person:0,mode:'time'}));assert.match(probeAI(s).comparison,/收入和产销不变.*改领工资.*在册多1人/);
 s=runAI(ai(s,{type:'ASSIGN',person:0,mode:'share'}));assert.match(probeAI(s).comparison,/改领分享.*在册少1人/);
});

test('AI comparisons do not invent a single-person cause for multiple edits or another machine',()=>{
 let s=runAI(labAI());s=ai(s,{type:'ASSIGN',person:0,mode:'time'});s=ai(s,{type:'ASSIGN',person:1,mode:'share'});s=runAI(s);assert.equal(probeAI(s).comparison,null);
 s=ai(s,{type:'RATE',rate:80});s=runAI(s);assert.equal(probeAI(s).comparison,null);
 // Count-based dedup is not a license to call an identity swap a one-person edit.
 s=ai(s,{type:'ASSIGN',person:0,mode:'time'});s=runAI(s);s=ai(s,{type:'ASSIGN',person:0,mode:'share'});s=ai(s,{type:'ASSIGN',person:1,mode:'time'});s=runAI(s);assert.equal(probeAI(s).comparison,null);
});

test('all legal nonzero AI conditions and mode pairs use the matching actual person and finite ledger',()=>{
 for(const rate of AUTOMATION_RATES.filter(Boolean))for(const before of AUTOMATION_MODES)for(const after of AUTOMATION_MODES.filter(m=>m!==before)){
  let s=ai(labAI(),{type:'RATE',rate});s=runAI(ai(s,{type:'MODE',mode:before}));s=runAI(ai(s,{type:'ASSIGN',person:0,mode:after}));
  const saved=structuredClone(s),p=probeAI(s);assert.match(p.comparison,/只改小1/);assert.equal(automationRunAccount(s.run).moneyAfter,108);assert.deepEqual(s,saved);
 }
});

test('future name-card stays on the one edited person, without rewriting actual money or the actual question',()=>{
 let s=runAI(labAI()),question=probeAI(s),receipt=structuredClone(s.run);
 assert.deepEqual(nextAI(s),{person:0,id:4,name:'小1',mode:'cut',previousMode:'cut',changedPeople:0});
 s=ai(s,{type:'ASSIGN',person:3,mode:'time'});
 assert.deepEqual(nextAI(s),{person:3,id:7,name:'小4',mode:'time',previousMode:'cut',changedPeople:1});
 assert.deepEqual(s.run,receipt);assert.deepEqual(probeAI(s),question);
 assert.equal(automationRunAccount(s.run).households[7].income,0);
 assert.deepEqual(nextAI(restoreAutomation(s)),nextAI(s));
 const saved=structuredClone(s);nextAI(s);assert.deepEqual(s,saved);
 s=ai(s,{type:'ASSIGN',person:3,mode:'cut'});assert.equal(nextAI(s).changedPeople,0);
 s=ai(s,{type:'ASSIGN',person:0,mode:'expand'});s=ai(s,{type:'ASSIGN',person:1,mode:'time'});
 assert.equal(nextAI(s).changedPeople,2,'the shortcut cannot describe a multi-edit draft as only one change');
 s=runAI(s);assert.equal(nextAI(s).changedPeople,0);assert.equal(nextAI(s).id,6,'after paying, use the new actual question, not the last pickup');
});

test('the rehearsal requires an actual nonzero run and never imports another experiment',()=>{
 assert.equal(nextAI(labAI()),null);assert.equal(nextAI(initialAutomation('time')),null);
 let s=runAI(labAI());s=ai(s,{type:'RATE',rate:0});assert.equal(nextAI(runAI(s)),null);
 s=ai(runAI(labAI()),{type:'RATE',rate:80});assert.equal(nextAI(s),null);
 s=ai(runAI(labAI()),{type:'CONCLUDE'}); // Only one run, still lab.
 assert.equal(s.phase,'lab');
 for(const rate of AUTOMATION_RATES.filter(Boolean))for(const mode of AUTOMATION_MODES){
  let current=ai(labAI(),{type:'RATE',rate});current=runAI(ai(current,{type:'MODE',mode}));
  const id=rate/10-1;current=ai(current,{type:'ASSIGN',person:id,mode:mode==='cut'?'time':'cut'});
  assert.equal(nextAI(current).person,id);assert.equal(nextAI(current).changedPeople,1);
  assert.equal(nextAI(current).id,9);assert.equal(automationRunAccount(current.run).moneyAfter,108);
 }
});

test('calendar questions point to actual blocked/free dates, not a newer draft or an impossible day',()=>{
 let s=labCal();assert.equal(probeCal(s),null);s=runCal(s);assert.match(probeCal(s).prompt,/周三.*球约.*继续做货/);assert.equal(probeCal(s).focusDay,2);
 const p=probeCal(s);s=cal(s,{type:'PLACE_DAY',from:2,to:'rest'});assert.deepEqual(probeCal(s),p);s=runCal(s);assert.match(probeCal(s).prompt,/周三已经空了.*踢球/);
 s=cal(s,{type:'RATE',rate:0});assert.equal(probeCal(s),null);s=runCal(s);assert.match(probeCal(s).prompt,/原来的活占了5天.*少排人/);assert.equal(probeCal(s).focusDay,null);
 // Necessary work is three days, even when two extra days make the whole week busy.
 s=cal(labCal(),{type:'RATE',rate:40});s=runCal(s);assert.match(probeCal(s).prompt,/原来的活占了3天/);
});

test('calendar separates the dates, pay and employment questions using executed weeks',()=>{
 let s=runCal(appointments());assert.match(probeCal(s).prompt,/约定赶上.*饭.*吃够.*只翻工资牌/);
 s=runCal(cal(s,{type:'FLIP_CONTRACT'}));assert.match(probeCal(s).prompt,/休息日有了.*饭钱却少/);assert.match(probeCal(s).comparison,/同样排班、同样约定.*只翻工资牌.*收入少3枚.*面包少3份/);
 s=runCal(cal(s,{type:'FLIP_CONTRACT'}));assert.match(probeCal(s).comparison,/收入多3枚.*面包多3份/);
 s=runCal(cal(s,{type:'STAFF',person:0,employed:false}));assert.match(probeCal(s).prompt,/没排班.*饭钱.*留在名单/);assert.equal(calendarAccount(s.run).personal.income,0);
});

test('calendar one-date and one-appointment comparisons do not confuse free time with paid demand',()=>{
 let s=runCal(labCal());s=runCal(cal(s,{type:'PLACE_DAY',from:2,to:'rest'}));assert.match(probeCal(s).comparison,/只改周三.*少上1天.*收入不变.*少做30份.*剩货少30份/);
 s=runCal(cal(s,{type:'PLACE_LIFE',activity:0,placed:true}));assert.match(probeCal(s).comparison,/只排上周三的踢球.*收入和产销不变.*赶上/);assert.equal(probeCal(s).focusDay,4);
 s=runCal(cal(s,{type:'PLACE_LIFE',activity:0,placed:false}));assert.match(probeCal(s).comparison,/只拿走周三的踢球.*没有约定/);
 // A wage flip plus a date edit is not a contract-only explanation.
 s=cal(s,{type:'FLIP_CONTRACT'});s=cal(s,{type:'PLACE_DAY',from:3,to:'rest'});s=runCal(s);assert.equal(probeCal(s).comparison,null);
});

test('calendar restored, legacy and changed-capability runs remain readonly and correctly scoped',()=>{
 let s=runCal(appointments());s=runCal(cal(s,{type:'FLIP_CONTRACT'}));const saved=structuredClone(s);assert.deepEqual(probeCal(restoreTimeCalendar(s)),probeCal(s));assert.deepEqual(s,saved);
 const old=structuredClone(s);delete old.life;for(const plan of [old.run,...old.trials])delete plan.life;assert.equal(probeCal(old),null);
 s=cal(s,{type:'RATE',rate:80});assert.equal(probeCal(s),null);s=runCal(s);assert.equal(probeCal(s).comparison,null);assert.equal(calendarAccount(s.run).moneyAfter,110);
 s=cal(s,{type:'CONCLUDE'}); // One new week does not unlock this condition.
 assert.equal(s.phase,'lab');
});
