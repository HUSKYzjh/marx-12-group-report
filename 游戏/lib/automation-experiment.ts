/** Conditional one-period experiment, NOT an estimate of AI's real capabilities.
 * All money is integer. Payments move between an endowed firm, ten households,
 * an owner and an input supplier. No street money or population is imported.
 */
import {initialTimeCalendar,timeCalendarReducer,restoreTimeCalendar,canConcludeCalendar,type TimeCalendar,type CalendarAction} from './time-calendar.ts';
import {initialMatch,matchReducer,restoreMatch,type TechnologyMatch,type MatchAction} from './technology-match.ts';
import {initialPressureStory,pressureStoryReducer,restorePressureStory,type PressureStory,type PressureAction} from './competitive-pressure.ts';
export const AUTOMATION_MODES=['cut','expand','time','share'] as const;
export type AutomationMode=typeof AUTOMATION_MODES[number];
export const AUTOMATION_RATES=[0,20,40,60,80] as const;
export const AUTOMATION_BRANCHES=['automation','time'] as const;
export type AutomationBranch=typeof AUTOMATION_BRANCHES[number];
export type AutomationRun={mode:AutomationMode|'mixed';rate:number;allocations?:AutomationMode[]};
export type AutomationState={branch:AutomationBranch;phase:'intro'|'lab'|'conclusion';rate:number;mode:AutomationMode;seen:number;run:AutomationRun|null;allocations?:AutomationMode[];trials?:AutomationRun[];calendar?:TimeCalendar;match?:TechnologyMatch;pressure?:PressureStory};
export function initialAutomation(branch:AutomationBranch='automation'):AutomationState{
 return {branch,phase:'intro',rate:60,mode:branch==='time'?'time':'cut',seen:0,run:null};
}
export type AutomationAction={type:'BEGIN'}|{type:'REOPEN'}|{type:'RATE';rate:number}|{type:'MODE';mode:AutomationMode}|{type:'ASSIGN';person:number;mode:AutomationMode}|{type:'RUN'}|{type:'CONCLUDE'}|{type:'RESTART'}|{type:'CALENDAR';action:CalendarAction}|{type:'MATCH';action:MatchAction}|{type:'PRESSURE';action:PressureAction};
export const automationAllocations=(s:{rate:number;mode:AutomationMode|'mixed';allocations?:AutomationMode[]}):AutomationMode[]=>s.allocations?.slice()??Array(s.rate/10).fill(s.mode);
const validAllocations=(v:unknown,rate:number):v is AutomationMode[]=>Array.isArray(v)&&v.length===rate/10&&v.every(m=>AUTOMATION_MODES.includes(m));
const arrangementMode=(allocations:AutomationMode[],fallback:AutomationMode):AutomationMode|'mixed'=>allocations.every(m=>m===allocations[0])?(allocations[0]??fallback):'mixed';
const signature=(s:AutomationRun)=>s.rate+'|'+AUTOMATION_MODES.map(m=>automationAllocations(s).filter(v=>v===m).length).join(',');
export const automationCurrentTrials=(s:AutomationState)=>(s.trials??[]).filter(r=>r.rate===s.rate);
export function canConcludeAutomation(s:AutomationState){
 if(s.calendar)return s.phase==='lab'&&s.calendar.phase==='lab'&&canConcludeCalendar(s.calendar);
 return s.phase==='lab'&&!!s.run&&s.run.rate===s.rate&&(s.seen===15||s.branch==='automation'&&(s.rate===0||automationCurrentTrials(s).length>=2));
}
export function automationReducer(s:AutomationState,a:AutomationAction):AutomationState{
 if(!a||typeof a!=='object')return s;
 if(a.type==='PRESSURE'){
  if(!a.action||typeof a.action!=='object'||s.branch!=='automation'||s.match||s.calendar||!s.pressure&&(s.phase!=='intro'||a.action.type!=='BEGIN'))return s;
  const before=s.pressure??initialPressureStory(),pressure=a.action.type==='BEGIN'?before:pressureStoryReducer(before,a.action);
  if(s.pressure&&pressure===before)return s;
  return {...s,phase:pressure.phase,seen:0,run:null,pressure};
 }
 if(s.pressure)return a.type==='RESTART'?initialAutomation('automation'):s;
 if(a.type==='MATCH'){
  if(!a.action||typeof a.action!=='object')return s;
  if(s.branch!=='automation'||s.calendar||!s.match&&(s.phase!=='intro'||a.action?.type!=='BEGIN'))return s;
  const before=s.match??initialMatch(a.action.type==='BEGIN'?a.action.strategy:undefined),match=a.action.type==='BEGIN'?before:matchReducer(before,a.action);
  if(s.match&&match===before)return s;
  return {...s,phase:match.phase,seen:0,run:null,match};
 }
 if(s.match)return a.type==='RESTART'?initialAutomation('automation'):s;
 if(a.type==='CALENDAR'){
  if(s.branch!=='time'||!s.calendar&&(s.phase!=='intro'||a.action?.type!=='BEGIN'))return s;
  const before=s.calendar??initialTimeCalendar(),calendar=timeCalendarReducer(before,a.action);if(calendar===before)return s;
  return {...s,phase:calendar.phase,rate:calendar.rate,mode:'time',seen:0,run:null,calendar};
 }
 if(s.calendar)return a.type==='RESTART'?initialAutomation('time'):s;
 switch(a.type){
  case 'BEGIN':return s.phase==='intro'?{...s,phase:'lab'}:s;
  case 'RATE':{
   if(s.phase!=='lab'||!AUTOMATION_RATES.includes(a.rate as 0|20|40|60|80)||a.rate===s.rate)return s;
   const {allocations:_allocations,...base}=s;
   // Capture a legacy executed plan before changing the draft; never infer
   // receipts for modes merely marked in its old progress mask.
   const trials=s.trials??(s.run?[{...s.run,allocations:automationAllocations(s.run)}]:undefined);
   return {...base,...(trials?{trials}:{}),rate:a.rate,seen:0,run:null};
  }
  case 'MODE':return s.phase==='lab'&&AUTOMATION_MODES.includes(a.mode)?{...s,mode:a.mode,...(s.allocations?{allocations:Array(s.rate/10).fill(a.mode)}:{})}:s;
  case 'ASSIGN':{
   if(s.phase!=='lab'||s.branch!=='automation'||!Number.isInteger(a.person)||a.person<0||a.person>=s.rate/10||!AUTOMATION_MODES.includes(a.mode))return s;
   const allocations=automationAllocations(s);if(allocations[a.person]===a.mode)return s;
   allocations[a.person]=a.mode;return {...s,allocations};
  }
  case 'RUN':{
   if(s.phase!=='lab')return s;
   const allocations=automationAllocations(s),mode=arrangementMode(allocations,s.mode);
   const run:AutomationRun={mode,rate:s.rate,...(s.allocations?{allocations}: {})};
   const seen=mode==='mixed'?s.seen:s.seen|(1<<AUTOMATION_MODES.indexOf(mode));
   const trial:AutomationRun={...run,allocations:allocations.slice()};
   const previous=s.trials??(s.run?[{...s.run,allocations:automationAllocations(s.run)}]:[]);
   const kept=previous.filter(r=>signature(r)!==signature(trial));
   const current=[...kept.filter(r=>r.rate===s.rate),trial].slice(-12);
   const trials=[...kept.filter(r=>r.rate!==s.rate),...current];
   return {...s,seen,run,trials};
  }
  case 'CONCLUDE':return canConcludeAutomation(s)?{...s,phase:'conclusion'}:s;
  case 'REOPEN':return s.phase==='conclusion'&&canConcludeAutomation({...s,phase:'lab'})?{...s,phase:'lab'}:s;
  case 'RESTART':return initialAutomation(s.branch);
  default:return s;
 }
}
export function restoreAutomation(v:unknown):AutomationState|null{
 if(!v||typeof v!=='object')return null;
 const s=v as AutomationState;
 if(!AUTOMATION_BRANCHES.includes(s.branch)||!['intro','lab','conclusion'].includes(s.phase)||!AUTOMATION_RATES.includes(s.rate as 0|20|40|60|80)||!AUTOMATION_MODES.includes(s.mode)||!Number.isInteger(s.seen)||s.seen<0||s.seen>15)return null;
 if(s.pressure!==undefined){
  const pressure=restorePressureStory(s.pressure);
  if(s.branch!=='automation'||!pressure||s.phase!==pressure.phase||s.calendar!==undefined||s.match!==undefined||s.allocations!==undefined||s.trials!==undefined||s.seen!==0||s.run!==null)return null;
  return {branch:s.branch,phase:s.phase,rate:s.rate,mode:s.mode,seen:0,run:null,pressure};
 }
 if(s.match!==undefined){
  const match=restoreMatch(s.match);
  if(s.branch!=='automation'||!match||s.phase!==match.phase||s.calendar!==undefined||s.allocations!==undefined||s.trials!==undefined||s.seen!==0||s.run!==null)return null;
  return {branch:s.branch,phase:s.phase,rate:s.rate,mode:s.mode,seen:0,run:null,match};
 }
 if(s.calendar!==undefined){
  const calendar=restoreTimeCalendar(s.calendar);
  if(s.branch!=='time'||!calendar||s.phase!==calendar.phase||s.rate!==calendar.rate||s.mode!=='time'||s.seen!==0||s.run!==null||s.allocations!==undefined||s.trials!==undefined)return null;
  return {branch:'time',phase:s.phase,rate:s.rate,mode:'time',seen:0,run:null,calendar};
 }
 if(s.allocations!==undefined&&(s.branch!=='automation'||!validAllocations(s.allocations,s.rate)))return null;
 const validRun=(r:AutomationRun)=>!!r&&AUTOMATION_RATES.includes(r.rate as 0|20|40|60|80)&&(AUTOMATION_MODES.includes(r.mode as AutomationMode)||r.mode==='mixed'&&s.branch==='automation')&&(r.allocations===undefined?r.mode!=='mixed':validAllocations(r.allocations,r.rate)&&arrangementMode(r.allocations,r.mode==='mixed'?'cut':r.mode)===r.mode);
 if(s.run!==null&&(!validRun(s.run)||s.run.rate!==s.rate||s.run.mode!=='mixed'&&!(s.seen&(1<<AUTOMATION_MODES.indexOf(s.run.mode)))))return null;
 if(s.trials!==undefined&&(!Array.isArray(s.trials)||s.trials.length>60||s.trials.some(r=>!validRun(r)||!r.allocations)||AUTOMATION_RATES.some(rate=>s.trials!.filter(r=>r.rate===rate).length>12)||new Set(s.trials.map(signature)).size!==s.trials.length||s.run&&s.trials.length&&(s.trials.at(-1)!.rate!==s.run.rate||JSON.stringify(automationAllocations(s.trials.at(-1)!))!==JSON.stringify(automationAllocations(s.run)))))return null;
 if(s.run===null&&s.seen!==0||s.phase==='intro'&&(s.seen!==0||s.run!==null||s.allocations!==undefined||(s.trials?.length??0)>0)||s.phase==='conclusion'&&!canConcludeAutomation({...s,phase:'lab'}))return null;
 const copyRun=(r:AutomationRun):AutomationRun=>({...r,...(r.allocations?{allocations:r.allocations.slice()}:{})});
 return {branch:s.branch,phase:s.phase,rate:s.rate,mode:s.mode,seen:s.seen,run:s.run?copyRun(s.run):null,...(s.allocations?{allocations:s.allocations.slice()}:{}),...(s.trials?{trials:s.trials.map(copyRun)}:{})};
}
/** Each freed position is allocated independently. Uniform plans reconcile with
 * the original four comparisons; mixtures are computed, not narrative presets. */
export function automationArrangementAccount(rate:number,allocations:AutomationMode[],fallback:AutomationMode='cut'){
 if(!AUTOMATION_RATES.includes(rate as 0|20|40|60|80)||!validAllocations(allocations,rate)||!AUTOMATION_MODES.includes(fallback))throw new Error('Invalid task arrangement');
 const base=10-rate/10,mode=arrangementMode(allocations,fallback);
 const households=Array.from({length:10},(_,id)=>{
  const allocation:AutomationMode|'work'=id<base?'work':allocations[id-base];
  const employed=allocation!=='cut'&&allocation!=='share',income=allocation==='cut'?0:4,days=allocation==='work'||allocation==='expand'?5:0;
  return {id,employed,income,bought:income,allocation,days};
 });
 const count=(m:AutomationMode)=>allocations.filter(a=>a===m).length;
 const jobs=households.filter(p=>p.employed).length,wages=jobs*4,transfer=count('share')*4;
 const output=48+count('expand')*48/base,householdIncome=wages+transfer,ownerPurchases=8,sold=householdIncome+ownerPurchases;
 const inputs=4,firmBefore=100,ownerBefore=8,firmAfter=firmBefore-wages-transfer-inputs+sold;
 const laborDays=households.reduce((n,p)=>n+p.days,0);
 return {rate,mode,allocations:allocations.slice(),jobs,displaced:10-jobs,workDays:jobs?laborDays/jobs:0,laborDays,output,sold,unsold:output-sold,wages,transfer,householdIncome,ownerPurchases,inputs,firmBefore,firmAfter,cashSurplus:sold-wages-transfer-inputs,
  moneyBefore:firmBefore+ownerBefore,moneyAfter:firmAfter+inputs+(ownerBefore-ownerPurchases),households};
}
export function automationRunAccount(run:AutomationRun){
 // Legacy uniform plans and new mixed plans have the same accounts. Resolve
 // both through the person-level ledger so actual work days and destinations
 // are available without inventing them in the view or changing the saved run.
 return automationArrangementAccount(run.rate,automationAllocations(run),run.mode==='mixed'?'cut':run.mode);
}
export function automationAccount(rate:number,mode:AutomationMode){
 if(!AUTOMATION_RATES.includes(rate as 0|20|40|60|80)||!AUTOMATION_MODES.includes(mode))throw new Error('Invalid automation scenario');
 const displaced=rate/10,jobs=mode==='cut'||mode==='share'?10-displaced:10;
 const output=mode==='expand'?48*100/(100-rate):48;
 const wages=jobs*4,transfer=mode==='share'?displaced*4:0;
 const householdIncome=wages+transfer,householdPurchases=householdIncome; // Each can eat at most four, at price 1.
 const ownerPurchases=8; // Owner's pre-existing 8-coin wallet, not assumed zero.
 const sold=Math.min(output,householdPurchases+ownerPurchases),unsold=output-sold;
 const inputs=4,firmBefore=100,ownerBefore=8,firmAfter=firmBefore-wages-transfer-inputs+sold;
 return {rate,mode,jobs,displaced:10-jobs,workDays:mode==='time'?5-rate/20:5,output,sold,unsold,wages,transfer,householdIncome,ownerPurchases,inputs,firmBefore,firmAfter,cashSurplus:sold-wages-transfer-inputs,
  moneyBefore:firmBefore+ownerBefore,moneyAfter:firmAfter+inputs+(ownerBefore-ownerPurchases)+(householdIncome-householdPurchases),
  households:Array.from({length:10},(_,i)=>({id:i,employed:i<jobs,income:i<jobs?4:mode==='share'?4:0,bought:i<jobs||mode==='share'?4:0}))};
}
