import type {PrologueState} from './prologue-state';

export const IF_BRANCHES=['space','services','automation','time','concentration','sharing','policy','prices'] as const;
export type IfBranch=typeof IF_BRANCHES[number];
export type RouteProgress={kind:'new'|'draft'|'receipt'|'legacy';receipts:number;label:string};
export const assumptionBranchState=(s:PrologueState,branch:IfBranch)=>
 [s.technology,s.needsTechnology,s.ownershipTechnology,s.marketRules].find(v=>v?.branch===branch)??s.branchArchive[branch];

/** A read-only signpost, not a completion score. Count executed comparison
 * receipts, never draft placements, menu visits or a parent's conclusion flag.
 * The active state takes precedence over a stale archive after explicit reset. */
export function assumptionRouteProgress(s:PrologueState):Record<IfBranch,RouteProgress>{
 const result={} as Record<IfBranch,RouteProgress>;
 for(const branch of IF_BRANCHES){
  const state=assumptionBranchState(s,branch);
  let count=0,partial=false,legacy=false;
  if(state){
   switch(branch){
    case 'automation':
     if('allocations' in state||'trials' in state){count=state.trials?.length??0;partial=!!state.run;}
     else if('match' in state||'pressure' in state||'run' in state&&state.run){legacy=true;}
     break;
    case 'time':
     if('calendar' in state&&state.calendar){count=state.calendar.trials.length;partial=!!state.calendar.run;}
     else if('run' in state&&state.run)legacy=true;
     break;
    case 'space':
     if('freight' in state&&state.freight){count=state.freight.trials.length;partial=state.freight.history.length>0;}
     else if('round' in state&&state.round>0)legacy=true;
     break;
    case 'services':
     if('care' in state&&state.care){count=state.care.trials.length;partial=!!state.care.run;}
     else if('careRun' in state&&state.careRun)legacy=true;
     break;
    case 'concentration':
     if('network' in state&&state.network){count=state.network.trials.length;partial=state.network.history.length>0;}
     else if('round' in state&&state.round>0)legacy=true;
     break;
    case 'sharing':
     if('council' in state&&state.council){count=state.council.trials.length;partial=!!state.council.run;}
     else if('run' in state&&state.run)legacy=true;
     break;
    case 'policy':
     if('demand' in state&&state.demand){count=state.demand.trials.length;partial=state.demand.funded>0;}
     else if('round' in state&&state.round>0)legacy=true;
     break;
    case 'prices':
     if('workbench' in state&&state.workbench){count=state.workbench.trials.length;partial=state.workbench.history.length>0;}
     else if('round' in state&&state.round>0)legacy=true;
     break;
   }
  }
  result[branch]=count>0?{kind:'receipt',receipts:count,label:`已有 ${count} 份回执 · 接着试`}
   :legacy?{kind:'legacy',receipts:0,label:'留有旧版记录 · 回去看看'}
   :partial?{kind:'draft',receipts:0,label:'这轮已开始 · 接着做'}
   :state&&state.phase!=='intro'?{kind:'draft',receipts:0,label:'安排中 · 回去继续'}
   :{kind:'new',receipts:0,label:'动手试试 →'};
 }
 return result;
}
