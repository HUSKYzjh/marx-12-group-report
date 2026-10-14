/** A view of the experiment's conditions, never a source of money or completion. */
export const CONDITION_GROUPS = ['needs','labour','ownership','boundaries'] as const;
export type ConditionGroup = typeof CONDITION_GROUPS[number];
export const ASSUMPTION_DIALOGUE = [
 '你这里的情景太理想化了，现实不是这样。',
 '我们有更高更妙的物理，有更大的市场、更深的理论。',
 '技术 is all you need！这些问题都会被解决。',
 '那我们来看看，如果这些条件发生改变，会怎样？',
] as const;
export type AssumptionDesk = {beat:0|1|2|3;selected:ConditionGroup|null;revision:number};
export type AssumptionDeskAction =
 | {type:'SPEAK';expectedBeat:number;expectedRevision:number}
 | {type:'REPLAY';expectedRevision:number}
 | {type:'SELECT';group:ConditionGroup|null;expectedRevision:number};
export const initialAssumptionDesk = ():AssumptionDesk => ({beat:0,selected:null,revision:0});
export function assumptionDeskReducer(s:AssumptionDesk,a:AssumptionDeskAction):AssumptionDesk {
 if(!a||a.expectedRevision!==s.revision||s.revision===Number.MAX_SAFE_INTEGER)return s;
 switch(a.type){
  case 'SPEAK':return a.expectedBeat===s.beat&&s.beat<3?{...s,beat:(s.beat+1) as 1|2|3,revision:s.revision+1}:s;
  case 'REPLAY':return s.beat===0?s:{...s,beat:0,revision:s.revision+1};
  case 'SELECT':return (a.group===null||CONDITION_GROUPS.includes(a.group))&&a.group!==s.selected
   ?{...s,selected:a.group,beat:3,revision:s.revision+1}:s;
  default:return s;
 }
}
export function restoreAssumptionDesk(v:unknown):AssumptionDesk|null {
 if(!v||typeof v!=='object'||Array.isArray(v))return null;
 const s=v as AssumptionDesk;
 if(![0,1,2,3].includes(s.beat)||!(s.selected===null||CONDITION_GROUPS.includes(s.selected))||!Number.isSafeInteger(s.revision)||s.revision<0)return null;
 return {beat:s.beat,selected:s.selected,revision:s.revision};
}
