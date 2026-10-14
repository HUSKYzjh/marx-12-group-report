/** Read-only questions from dated, executed bread and cash records.
 * Adjacent trials count as a controlled comparison only if one input changed. */
import {preservationTrialAccount,type PreservationWorkbench,type PreservationSetup} from './preservation-workbench.ts';
function controlled(before:PreservationSetup[],after:PreservationSetup[]){
 if(before.length!==2||after.length!==2||before.some((x,i)=>(x.bake!==undefined)!==(after[i].bake!==undefined)))return null;
 const changes:{day:1|2;field:'price'|'efficient'|'cold'|'bake'}[]=[];
 for(let day=0;day<2;day++)for(const field of ['price','efficient','cold','bake'] as const)if(before[day][field]!==after[day][field])changes.push({day:(day+1) as 1|2,field});
 return changes.length===1?changes[0]:null;
}
export function preservationExploration(s:PreservationWorkbench){
 if(s.phase!=='lab'||s.step!=='result'||s.history.length!==2)return null;
 const a=preservationTrialAccount(s.history),second=a.periods[1],saved=a.night!.kept.length;
 const oldSold=second.bought.flat().filter(id=>id.startsWith('1:')).length;
 const hungry=a.periods.some(p=>p.purchases.some(n=>n<2));
 let question:string;
 if(saved&&second.setup.bake!==false&&a.stock)question=oldSold===saved?'旧面包卖完，又剩了新的。第二天不开炉呢？':'旧面包还没卖完，又做了新的。第二天不开炉呢？';
 else if(second.setup.bake===false)question=saved?'今天没开炉，卖了'+oldSold+'个旧面包。大家吃够了吗？':'炉子停了，旧面包也坏了。今天拿什么卖？';
 else if(a.spoiled)question='坏了'+a.spoiled+'个。冷柜得什么时候接上？';
 else if(hungry)question='架上还有面包，怎么有人没买够？';
 else if(a.firm<50)question='两天都卖完了，店里却少了'+(50-a.firm)+'枚。少花在哪？';
 else question='两天都买够了。还需要保存没剩下的面包吗？';
 const previous=s.trials.at(-2),change=previous?controlled(previous,s.history):null;
 let comparison:null|{day:1|2;field:'price'|'efficient'|'cold'|'bake';text:string}=null;
 if(change&&previous){
  const before=preservationTrialAccount(previous),produced=(x:typeof a)=>x.periods.reduce((n,p)=>n+p.produced.length,0),sold=(x:typeof a)=>x.periods.reduce((n,p)=>n+p.sold,0),fed=(x:typeof a)=>x.periods.reduce((n,p)=>n+p.purchases.filter(q=>q===2).length,0),inputs=(x:typeof a)=>x.periods.reduce((n,p)=>n+p.inputs,0);
  const names={price:'价签',efficient:'省料插头',cold:'冷柜插头',bake:'炉子开关'};
  const difference=change.field==='bake'?'两天新做'+produced(before)+'→'+produced(a)+'，卖出'+sold(before)+'→'+sold(a):change.field==='cold'?'坏掉'+before.spoiled+'→'+a.spoiled+'，最终剩货'+before.stock+'→'+a.stock:change.field==='efficient'?'原料支出'+inputs(before)+'→'+inputs(a)+'枚，卖出'+sold(before)+'→'+sold(a):'卖出'+sold(before)+'→'+sold(a)+'，买够的顾客人次'+fed(before)+'→'+fed(a);
  comparison={...change,text:'只改第'+change.day+'天的'+names[change.field]+'：'+difference+'；店里'+before.firm+'→'+a.firm+'枚。'};
 }
 return {question,person:0,days:a.periods.map(p=>({day:p.day,setup:{...p.setup},produced:p.produced.length,sold:p.sold,bought:p.purchases[0],wallet:p.wallets[0],oldBought:p.bought[0].filter(id=>p.day===2&&id.startsWith('1:')).length})),saved,oldSold,comparison};
}
