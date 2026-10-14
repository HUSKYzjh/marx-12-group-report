import type {PrologueState} from './prologue-state';
import {IF_BRANCHES,assumptionBranchState,type IfBranch} from './assumption-route-progress.ts';
import {automationRunAccount} from './automation-experiment.ts';
import {calendarAccount} from './time-calendar.ts';
import {freightAccount} from './space-freight.ts';
import {careRoutingAccount} from './care-routing.ts';
import {networkTrialAccount} from './platform-network.ts';
import {councilTrialAccount} from './sharing-council.ts';
import {demandTrialAccount} from './public-demand.ts';
import {preservationTrialAccount} from './preservation-workbench.ts';

export type ObservedFact={label:string;value:number;unit:'人'|'个'|'间'|'天'|'枚'|'票'};
export type AssumptionObservation={context:string;facts:[ObservedFact,ObservedFact]};
const fact=(label:string,value:number,unit:ObservedFact['unit']):ObservedFact=>({label,value,unit});

/** Two short facts from the most recently executed, COMPLETE comparison.
 * A changed draft, an unfinished second period, or a new capability cannot
 * rewrite that receipt. Independent stories are not a comparable score table.
 * Legacy models keep their distinct signpost, never a fabricated new receipt. */
export function assumptionObservations(s:PrologueState):Partial<Record<IfBranch,AssumptionObservation>>{
 const out:Partial<Record<IfBranch,AssumptionObservation>>={};
 for(const branch of IF_BRANCHES){
  const state=assumptionBranchState(s,branch);if(!state)continue;
  switch(branch){
   case 'automation':{
    if(!('trials' in state)||!state.trials?.length||!('branch' in state)||state.branch!=='automation')break;
    const r=state.trials.at(-1)!,a=automationRunAccount(r);
    out[branch]={context:'省下'+r.rate+'%工时 · 一周',facts:[fact('领到收入',a.households.filter(p=>p.income>0).length,'人'),fact('剩下面包',a.unsold,'个')]};break;
   }
   case 'time':{
    if(!('calendar' in state)||!state.calendar?.trials.length)break;
    const r=state.calendar.trials.at(-1)!,a=calendarAccount(r);
    out[branch]={context:'省下'+r.rate+'%工时 · '+(r.contract==='weekly'?'保周薪':'按出勤领钱'),facts:[fact('阿面有空',a.personal.freeDays.filter(Boolean).length,'天'),fact('阿面收入',a.personal.income,'枚')]};break;
   }
   case 'space':{
    if(!('freight' in state)||!state.freight?.trials.length)break;
    const r=state.freight.trials.at(-1)!;if(!r.construction)break;
    const a=freightAccount(r);
    out[branch]={context:'三趟货运 · 配套建设',facts:[fact('配齐住舱',a.habitats,'间'),fact('留在厂里',a.stock,'个')]};break;
   }
   case 'services':{
    if(!('care' in state)||!state.care?.trials.length)break;
    const a=careRoutingAccount(state.care.trials.at(-1)!);
    out[branch]={context:'一次服务 · 十二位使用者',facts:[fact('服务能力',a.capacity,'人'),fact('实际用上',a.served,'人')]};break;
   }
   case 'concentration':{
    if(!('network' in state)||!state.network?.trials.length)break;
    const r=state.network.trials.at(-1)!,a=networkTrialAccount(r);
    const access=a.transfers.filter(p=>p.kind==='access').reduce((n,p)=>n+p.amount,0);
    out[branch]={context:'两次营业 · '+({locked:'资料锁定',portable:'可带走资料',joint:'共同控制'}[r.rule]),facts:[fact('付接入费',access,'枚'),fact('搬资料花',a.migration,'枚')]};break;
   }
   case 'sharing':{
    if(!('council' in state)||!state.council?.trials.length)break;
    const r=state.council.trials.at(-1)!,a=councilTrialAccount(r);
    out[branch]={context:'分配与表决 · '+({bonus:'发奖金',minority:'少数权益',coop:'共同经营'}[r.mode]),facts:[fact('工人分到',a.firstWorkers+a.extraWorkers,'枚'),fact('每位工人',a.workerWeight,'票')]};break;
   }
   case 'policy':{
    if(!('demand' in state)||!state.demand?.trials.length)break;
    const r=state.demand.trials.at(-1)!,a=demandTrialAccount(r);
    const delivered=a.periods.reduce((n,p)=>n+p.publicSold,0);
    out[branch]={context:'两天 · '+(r.sharedBudget&&r.machine?'公共款买了私人快炉':'没用公共款添炉'),facts:[fact('食堂买走',delivered,'个'),fact('还欠贷款',a.debtTotal,'枚')]};break;
   }
   case 'prices':{
    if(!('workbench' in state)||!state.workbench?.trials.length)break;
    const a=preservationTrialAccount(state.workbench.trials.at(-1)!);
    out[branch]={context:'过了一夜 · 两天营业',facts:[fact('坏掉面包',a.spoiled,'个'),fact('最后剩下',a.stock,'个')]};break;
   }
  }
 }
 return out;
}
