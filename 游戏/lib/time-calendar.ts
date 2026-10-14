/** A separate, one-week scheduling experiment. Tasks are perfectly divisible;
 * wages, goods and purchases are whole units. This is not measured productivity.
 * Removing a name compares stable staffing, not actual dismissal/severance law. */
export const CALENDAR_RATES=[0,20,40,60,80] as const;
export const CALENDAR_LIFE=[{id:0,day:2,name:'踢球'},{id:1,day:4,name:'画画'}] as const;
export type CalendarContract='weekly'|'attendance';
export type CalendarPlan={rate:number;staff:boolean[];extras:boolean[];contract:CalendarContract;life?:boolean[]};
export type TimeCalendar=CalendarPlan & {phase:'intro'|'lab'|'conclusion';run:CalendarPlan|null;trials:CalendarPlan[]};
export type CalendarAction={type:'BEGIN'}|{type:'REOPEN'}|{type:'RATE';rate:number}|{type:'PLACE_DAY';from:number;to:number|'rest'}|{type:'STAFF';person:number;employed:boolean}|{type:'PLACE_LIFE';activity:number;placed:boolean}|{type:'FLIP_CONTRACT'}|{type:'RUN'}|{type:'CONCLUDE'};
export const calendarCrew=(p:CalendarPlan)=>p.staff.filter(Boolean).length;
export function calendarRequiredDays(p:CalendarPlan){const crew=calendarCrew(p);return crew?Math.min(5,Math.ceil((50-p.rate/2)/crew)):5;}
export const calendarFreeForHero=(p:CalendarPlan,day:number)=>!p.staff[0]||day>=calendarRequiredDays(p)&&!p.extras[day];
export const calendarPlan=(s:CalendarPlan):CalendarPlan=>({rate:s.rate,staff:s.staff.slice(),extras:s.extras.slice(),contract:s.contract,...(s.life?{life:s.life.slice()}:{})});
const tidyLife=(p:TimeCalendar):TimeCalendar=>p.life?{...p,life:p.life.map((v,i)=>v&&calendarFreeForHero(p,CALENDAR_LIFE[i].day))}:p;
export function initialTimeCalendar():TimeCalendar{
 return {phase:'intro',rate:60,staff:Array(10).fill(true),extras:[false,false,true,true,true],contract:'weekly',life:[false,false],run:null,trials:[]};
}
// Dates and the protagonist's employment now have actual personal consequences.
const signature=(s:CalendarPlan)=>[s.rate,calendarCrew(s),s.staff[0],s.extras.map(Number).join(''),s.contract,(s.life??[false,false]).map(Number).join('')].join('|');
export const calendarCurrentTrials=(s:TimeCalendar)=>s.trials.filter(p=>p.rate===s.rate);
export const canConcludeCalendar=(s:TimeCalendar)=>!!s.run&&s.run.rate===s.rate&&(s.rate===0||calendarCurrentTrials(s).length>=2);
const validPlan=(p:unknown):p is CalendarPlan=>{
 if(!p||typeof p!=='object')return false;const s=p as CalendarPlan;
 return CALENDAR_RATES.includes(s.rate as 0|20|40|60|80)&&['weekly','attendance'].includes(s.contract)&&Array.isArray(s.staff)&&s.staff.length===10&&s.staff.every(v=>typeof v==='boolean')&&Array.isArray(s.extras)&&s.extras.length===5&&s.extras.every(v=>typeof v==='boolean')&&s.extras.slice(0,calendarRequiredDays(s)).every(v=>!v)&&(s.life===undefined||Array.isArray(s.life)&&s.life.length===2&&s.life.every((v,i)=>typeof v==='boolean'&&(!v||calendarFreeForHero(s,CALENDAR_LIFE[i].day))));
};
export function timeCalendarReducer(s:TimeCalendar,a:CalendarAction):TimeCalendar{
 if(!a||typeof a!=='object')return s;
 if(a.type==='BEGIN')return s.phase==='intro'?{...s,phase:'lab'}:s;
 if(a.type==='REOPEN')return s.phase==='conclusion'&&canConcludeCalendar(s)?{...s,phase:'lab'}:s;
 if(s.phase!=='lab')return s;
 switch(a.type){
  case 'RATE':{
   if(!CALENDAR_RATES.includes(a.rate as 0|20|40|60|80)||a.rate===s.rate)return s;
   // A new capability changes the draft, not the weeks already executed.
   const p={...s,rate:a.rate,run:null};p.extras=s.extras.map((v,i)=>i>=calendarRequiredDays(p)&&v);return tidyLife(p);
  }
  case 'PLACE_DAY':{
   const core=calendarRequiredDays(s);
   if(!Number.isInteger(a.from)||a.from<core||a.from>=5||a.to!=='rest'&&(!Number.isInteger(a.to)||a.to<core||a.to>=5))return s;
   const extras=s.extras.slice();if(a.to==='rest'){if(!extras[a.from])return s;extras[a.from]=false;}
   else{if(extras[a.to])return s;extras[a.from]=false;extras[a.to]=true;}
   return tidyLife({...s,extras});
  }
  case 'STAFF':{
   if(!Number.isInteger(a.person)||a.person<0||a.person>=10||typeof a.employed!=='boolean'||s.staff[a.person]===a.employed)return s;
   const staff=s.staff.slice();staff[a.person]=a.employed;const p={...s,staff};p.extras=s.extras.map((v,i)=>i>=calendarRequiredDays(p)&&v);return tidyLife(p);
  }
  case 'PLACE_LIFE':{
   if(!Number.isInteger(a.activity)||a.activity<0||a.activity>=2||typeof a.placed!=='boolean'||!!s.life?.[a.activity]===a.placed||a.placed&&!calendarFreeForHero(s,CALENDAR_LIFE[a.activity].day))return s;
   const life=s.life?.slice()??[false,false];life[a.activity]=a.placed;return {...s,life};
  }
  case 'FLIP_CONTRACT':return {...s,contract:s.contract==='weekly'?'attendance':'weekly'};
  case 'RUN':{
   const run=calendarPlan(s),kept=s.trials.filter(p=>signature(p)!==signature(run));
   const current=[...kept.filter(p=>p.rate===s.rate),run].slice(-12);
   const trials=[...kept.filter(p=>p.rate!==s.rate),...current];return {...s,run,trials};
  }
  case 'CONCLUDE':return canConcludeCalendar(s)?{...s,phase:'conclusion'}:s;
  default:return s;
 }
}
export function restoreTimeCalendar(v:unknown):TimeCalendar|null{
 if(!validPlan(v))return null;const s=v as TimeCalendar;
 if(!['intro','lab','conclusion'].includes(s.phase)||s.run!==null&&(!validPlan(s.run)||s.run.rate!==s.rate)||!Array.isArray(s.trials)||s.trials.length>60||s.trials.some(p=>!validPlan(p))||CALENDAR_RATES.some(rate=>s.trials.filter(p=>p.rate===rate).length>12)||new Set(s.trials.map(signature)).size!==s.trials.length)return null;
 if(s.run!==null&&(!s.trials.length||JSON.stringify(calendarPlan(s.trials.at(-1)!))!==JSON.stringify(calendarPlan(s.run)))||s.phase==='intro'&&(s.run!==null||s.trials.length)||s.phase==='conclusion'&&!canConcludeCalendar(s))return null;
 return {...calendarPlan(s),phase:s.phase,run:s.run?calendarPlan(s.run):null,trials:s.trials.map(calendarPlan)};
}
export function calendarAccount(p:CalendarPlan){
 if(!validPlan(p))throw new Error('Invalid calendar');
 const crew=calendarCrew(p),core=calendarRequiredDays(p),workDays=crew?core+p.extras.filter(Boolean).length:0;
 const requiredLabor=50-p.rate/2,productiveLabor=Math.min(requiredLabor,crew*core)+crew*p.extras.filter(Boolean).length;
 const output=Math.floor(productiveLabor*60/requiredLabor),materials=Math.ceil(output/10),maintenance=2;
 const pay=p.contract==='weekly'?5:workDays,people=p.staff.map((employed,id)=>({id,employed,income:employed?pay:0,cash:employed?pay:0,bought:0}));
 const wages=people.reduce((n,h)=>n+h.income,0),firmBefore=100,ownerBefore=10;
 const transfers:{from:string;to:string;amount:number;kind:string}[]=[];
 people.forEach(h=>{if(h.income)transfers.push({from:'firm',to:'person-'+h.id,amount:h.income,kind:'wage'});});
 if(materials)transfers.push({from:'firm',to:'supplier',amount:materials,kind:'materials'});
 transfers.push({from:'firm',to:'supplier',amount:maintenance,kind:'maintenance'});
 let stock=output;
 // Each round buys at most one unit per person; the first loaf comes first.
 for(let pass=0;pass<5;pass++)for(const h of people)if(stock&&h.cash){h.cash--;h.bought++;stock--;transfers.push({from:'person-'+h.id,to:'firm',amount:1,kind:'purchase'});}
 const ownerBought=Math.min(ownerBefore,stock);stock-=ownerBought;if(ownerBought)transfers.push({from:'owner',to:'firm',amount:ownerBought,kind:'purchase'});
 const sold=output-stock,firmAfter=firmBefore-wages-materials-maintenance+sold,supplierAfter=materials+maintenance,ownerAfter=ownerBefore-ownerBought;
 const laborDays=crew*workDays,paidDays=crew*pay,restDays=crew?5-workDays:0;
 const days=Array.from({length:5},(_,i)=>({day:i,kind:i<core?'core':p.extras[i]?'extra':'rest',working:crew>0&&(i<core||p.extras[i]),output:i<core?Math.floor(Math.min(crew,Math.max(0,requiredLabor-i*crew))*60/requiredLabor):p.extras[i]?Math.floor(crew*60/requiredLabor):0}));
 // Fractional productive units are kept as work-in-process until week's end.
 const dayTotal=days.reduce((n,d)=>n+d.output,0);days[Math.max(0,days.findLastIndex(d=>d.working))].output+=output-dayTotal;
 const hero=people[0],personal={recorded:p.life!==undefined,income:hero.income,bought:hero.bought,wanted:5,freeDays:Array.from({length:5},(_,i)=>calendarFreeForHero(p,i)),activities:CALENDAR_LIFE.map(v=>({...v,planned:!!p.life?.[v.id],attended:!!p.life?.[v.id]&&calendarFreeForHero(p,v.day),working:!calendarFreeForHero(p,v.day)}))};
 return {rate:p.rate,crew,workDays,restDays,laborDays,paidDays,output,sold,unsold:stock,wages,materials,maintenance,firmBefore,firmAfter,cashChange:firmAfter-firmBefore,supplierAfter,ownerBefore,ownerAfter,ownerBought,people,days,transfers,
  completedOriginal:Math.min(60,output),missingOriginal:Math.max(0,60-output),personal,moneyBefore:110,moneyAfter:firmAfter+supplierAfter+ownerAfter+people.reduce((n,h)=>n+h.cash,0)};
}
