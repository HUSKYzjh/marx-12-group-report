import type {PrologueState} from './prologue-state';
import {assumptionObservations,type AssumptionObservation} from './assumption-observations.ts';
import {assumptionBranchState,IF_BRANCHES,type IfBranch} from './assumption-route-progress.ts';
import {automationAllocations,type AutomationRun} from './automation-experiment.ts';
import type {CalendarPlan} from './time-calendar.ts';
import type {FreightRecord} from './space-freight.ts';
import type {CarePlan} from './care-routing.ts';
import type {NetworkTrial} from './platform-network.ts';
import type {CouncilTrial} from './sharing-council.ts';
import type {DemandTrial} from './public-demand.ts';
import type {PreservationTrial} from './preservation-workbench.ts';

export const BRANCH_CONNECTIONS = {
 automation:{next:'time',question:'省下的工时，能变成带薪休息吗？',label:'再看：少上班，少拿钱吗？'},
 time:{next:'services',question:'有了空闲，需要的服务就一定用得上吗？',label:'再看：谁能用上照护？'},
 space:{next:'prices',question:'建设订单结束后，留下的货怎么办？',label:'再看：把剩货留到明天？'},
 services:{next:'policy',question:'有人代付后，这笔预算还够做什么？',label:'再看：公共预算怎样用？'},
 concentration:{next:'sharing',question:'能换服务商，就能决定钱怎么用吗？',label:'再看：分钱与票权'},
 sharing:{next:'automation',question:'有了决定权，怎样安排机器省下的劳动？',label:'再看：机器接班以后'},
 policy:{next:'sharing',question:'公共钱支持了生产，设备和决定权归谁？',label:'再看：设备归谁，谁拍板？'},
 prices:{next:'space',question:'货没坏掉，接下来谁来下单？',label:'再看：需要怎样成为订单？'},
} as const satisfies Record<IfBranch,{next:IfBranch;question:string;label:string}>;

const ledgers={automation:['technology',null],time:['technology','calendar'],space:['needsTechnology','freight'],services:['needsTechnology','care'],concentration:['ownershipTechnology','network'],sharing:['ownershipTechnology','council'],policy:['marketRules','demand'],prices:['marketRules','workbench']} as const;
export type BranchReview={latest:AssumptionObservation;previous:AssumptionObservation|null;receipts:number;arrangements:{latest:string;previous:string|null};connection:typeof BRANCH_CONNECTIONS[IfBranch]};

function arrangement(branch:IfBranch,trial:unknown):string{
 switch(branch){
  case 'automation':{const r=trial as AutomationRun,plans=automationAllocations(r);return (['cut','expand','time','share'] as const).map(mode=>({cut:'停排',expand:'继续做货',time:'带薪休息',share:'不排班仍分享'}[mode])+plans.filter(v=>v===mode).length+'人').join(' · ');}
  case 'time':{const r=trial as CalendarPlan;return '名单'+r.staff.filter(Boolean).length+'人 · '+(r.contract==='weekly'?'保周薪':'按出勤领钱')+' · 额外做货'+r.extras.filter(Boolean).length+'天 · 排上'+(r.life??[]).filter(Boolean).length+'个约定';}
  case 'space':{const r=trial as FreightRecord;return '订单'+r.order+'组 · 三期各做'+r.history.map(p=>p.produced).join('／')+'组 · '+(r.maintenanceAt===null?'未接维护单':'另接维护单');}
  case 'services':{const r=trial as CarePlan;return '排岗'+r.slots.filter(v=>v!==null).length+'人 · '+(r.tool?'接上工具':'没接工具')+' · 培训'+r.training.filter(v=>v!==null).length+'人 · 代付'+r.vouchers.filter(v=>v!==null).length+'人';}
  case 'concentration':{const r=trial as NetworkTrial;return ({locked:'资料锁定',portable:'资料可带走',joint:'共同控制'}[r.rule])+' · 原入口收费'+r.fee+'枚 · 三店接到'+r.routes.map(v=>v??'停用').join('／');}
  case 'sharing':{const r=trial as CouncilTrial;return ({bonus:'奖金规则',minority:'少数权益',coop:'共同经营'}[r.mode])+' · 工人先分'+r.allocation.filter(v=>v!=='owner').length+'枚 · 老板先分'+r.allocation.filter(v=>v==='owner').length+'枚 · 你投'+(r.ballot==='divide'?'分红':'投资');}
  case 'policy':{const r=trial as DemandTrial;return '借款'+r.loans.filter(Boolean).length+'人 · 两天增收款'+[1,2].map(day=>r.income.filter(v=>v?.day===day).length*2).join('／')+'枚 · '+(r.machine?'公共款购炉':'未用公共款购炉');}
  case 'prices':return (trial as PreservationTrial).map((r,i)=>'第'+(i+1)+'天：'+r.price+'枚／个 · '+(r.bake===false?'停炉':'开炉')+' · '+(r.efficient?'省料':'普通工艺')+' · '+(r.cold?'接冷柜':'不接冷柜')).join('；');
 }
}

/** Read completed receipts only. Drafts, partial second periods, menu visits,
 * and old incompatible capabilities cannot create a comparison. This is a
 * descriptive comparison, not identification of a single causal effect. */
export function branchReviews(s:PrologueState):Partial<Record<IfBranch,BranchReview>>{
 const observations=assumptionObservations(s),out:Partial<Record<IfBranch,BranchReview>>={};
 for(const branch of IF_BRANCHES){
  const latest=observations[branch];if(!latest)continue;
  const state=assumptionBranchState(s,branch)!;
  const [key,nested]=ledgers[branch];
  const record=state as unknown as Record<string,unknown>;
  const ledger=(nested?record[nested]:record) as Record<string,unknown>;
  const trials=ledger.trials as Record<string,unknown>[];
  if(!Array.isArray(trials)||!trials.length)continue;
  // A new shared-budget or construction experiment changes the baseline.
  // Do not place an older, different capability in the previous column.
  const current=trials.at(-1)!;
  const compatible=trials.filter(r=>branch==='policy'?!!r.sharedBudget===!!current.sharedBudget:branch==='space'?!!r.construction===!!current.construction:true);
  let previous:AssumptionObservation|null=null;
  if(compatible.length>1){
   const before={...ledger,trials:compatible.slice(0,-1)};
   const older={...s,[key]:nested?{...state,[nested]:before}:before} as PrologueState;
   previous=assumptionObservations(older)[branch]??null;
  }
  out[branch]={latest,previous,receipts:compatible.length,arrangements:{latest:arrangement(branch,current),previous:previous?arrangement(branch,compatible.at(-2)!):null},connection:BRANCH_CONNECTIONS[branch]};
 }
 return out;
}
