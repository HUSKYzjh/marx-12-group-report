/** Date-specific, reversible questions based on an executed week.
 * Teaching conditions stay in the calendar model, not in this view. */
import {calendarAccount,calendarRequiredDays,type TimeCalendar} from './time-calendar.ts';
const days=['周一','周二','周三','周四','周五'];
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const change=(n:number,unit:string)=>n===0?'不变':(n>0?'多':'少')+Math.abs(n)+unit;
export function calendarExploration(s:TimeCalendar){
 if(s.phase!=='lab'||!s.run||s.run.rate!==s.rate)return null;
 const run=s.run;if(run.life===undefined)return null;
 const a=calendarAccount(run),missed=a.personal.activities.find(v=>!v.attended);
 let prompt:string,focusDay:number|null=null;
 if(!run.staff[0])prompt='阿面没排班，饭钱也没接上。把他留在名单，会怎样？';
 else if(a.personal.income<5)prompt='休息日有了，饭钱却少了。只翻工资牌，这周会怎样？';
 else if(!missed)prompt='约定赶上了，饭也吃够了。只翻工资牌，还一样吗？';
 else if(missed.working){
  if(missed.day>=calendarRequiredDays(run)){focusDay=missed.day;prompt=days[missed.day]+'的'+(missed.id===0?'球约':'画画')+'撞上了上班。只拿走这天的“继续做货”，能赶上吗？';}
  else prompt='原来的活占了'+calendarRequiredDays(run)+'天。少排人，会让剩下的人更早下班吗？';
 }else{focusDay=missed.day;prompt=days[missed.day]+'已经空了。把'+missed.name+'放回这天，阿面会怎样？';}
 let comparison:string|null=null;
 const previous=s.trials.filter(p=>p.rate===run.rate).at(-2);
 if(previous&&previous.life!==undefined){
  const b=calendarAccount(previous),sameStaff=same(previous.staff,run.staff),sameDays=same(previous.extras,run.extras),sameLife=same(previous.life,run.life),samePay=previous.contract===run.contract;
  const different=(before:boolean[],after:boolean[])=>after.flatMap((v,i)=>v!==before[i]?[i]:[]);
  if(sameStaff&&sameDays&&sameLife&&!samePay)comparison='同样排班、同样约定：只翻工资牌，阿面收入'+change(a.personal.income-b.personal.income,'枚')+'，买到的面包'+change(a.personal.bought-b.personal.bought,'份')+'。';
  else if(sameStaff&&samePay&&sameLife&&!sameDays){
   const dates=different(previous.extras,run.extras);
   if(dates.length===1)comparison='只改'+days[dates[0]]+'：'+(a.workDays<b.workDays?'少上':'多上')+Math.abs(a.workDays-b.workDays)+'天，收入'+change(a.personal.income-b.personal.income,'枚')+'；'+(a.output<b.output?'少做':'多做')+Math.abs(a.output-b.output)+'份，剩货'+change(a.unsold-b.unsold,'份')+'。';
  }else if(sameStaff&&sameDays&&samePay&&!sameLife){
   const activities=different(previous.life,run.life);
   if(activities.length===1){const v=a.personal.activities[activities[0]];comparison='只'+(v.planned?'排上':'拿走')+days[v.day]+'的'+v.name+'：收入和产销不变，'+(v.attended?'这次赶上了':'这次没有约定')+'。';}
  }
 }
 return {prompt,focusDay,comparison};
}
