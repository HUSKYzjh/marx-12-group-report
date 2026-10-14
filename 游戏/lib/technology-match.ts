import {initialTechnologyDuel,currentOffer,offerIssue,settleDuel,rewindDuel,replayEveryone,restoreDuel,STRATEGIES,AUTOMATION_PLANS,type Duel,type Offer,type AutomationPlan} from '../public/assets/market-duel/model.mjs';
export type TechnologyMatch={version:1;phase:'lab'|'conclusion';world:Duel;draft:Offer;reference:Duel|null;synchronous:Duel|null};
export type MatchAction={type:'BEGIN';strategy?:Duel['strategy']}|{type:'SET';field:'wage'|'price';value:number}|{type:'PLAN';plan:AutomationPlan}|{type:'RUN'}|{type:'REWIND';day:number}|{type:'COMPARE'}|{type:'CONCLUDE'}|{type:'RESTART';strategy:Duel['strategy']};
export function initialMatch(strategy:Duel['strategy']='mirror'):TechnologyMatch{const world=initialTechnologyDuel(strategy);return {version:1,phase:'lab',world,draft:currentOffer(world),reference:null,synchronous:null};}
export function cannotOpenMatch(s:TechnologyMatch){
 const current=currentOffer(s.world);
 const plans=s.world.firms[0].robot?AUTOMATION_PLANS.filter(p=>p!=='off'):['off' as const];
 return plans.every(automation=>!!offerIssue(s.world,{...current,wage:1,automation}));
}
export function matchReducer(s:TechnologyMatch,a:MatchAction):TechnologyMatch{
 if(!a||typeof a!=='object')return s;
 if(a.type==='RESTART')return STRATEGIES[a.strategy]?initialMatch(a.strategy):s;
 if(a.type==='REWIND'){
  if(!Number.isInteger(a.day)||a.day<1||a.day>s.world.day)return s;
  const world=rewindDuel(s.world,a.day);return {...s,phase:'lab',world,draft:currentOffer(world),reference:s.world,synchronous:null};
 }
 if(s.phase==='conclusion')return s;
 if(a.type==='COMPARE')return s.world.day===6?{...s,synchronous:replayEveryone(s.world)}:s;
 if(a.type==='CONCLUDE')return s.world.day===6?{...s,phase:'conclusion'}:s;
 if(s.world.day===6)return s;
 if(a.type==='SET'||a.type==='PLAN'){
  if(a.type==='SET'&&(a.field!=='wage'&&a.field!=='price'||!Number.isInteger(a.value)||a.value<1||a.value>4||a.field==='price'&&s.world.day<1))return s;
  if(a.type==='PLAN'&&(s.world.day<2||!AUTOMATION_PLANS.includes(a.plan)))return s;
  const draft=a.type==='SET'?{...currentOffer(s.world),[a.field]:a.value}:{...currentOffer(s.world),automation:a.plan};
  if(offerIssue(s.world,draft)==='这张安排不成立。'||JSON.stringify(draft)===JSON.stringify(s.draft))return s;
  return {...s,draft};
 }
 if(a.type==='RUN'){
  const closed=cannotOpenMatch(s);if(offerIssue(s.world,s.draft)&&!closed)return s;
  const world=settleDuel(s.world,s.draft,{allowClosed:closed});return {...s,world,draft:currentOffer(world),synchronous:null};
 }
 return s;
}
export function restoreMatch(v:unknown):TechnologyMatch|null{
 try{
  if(!v||typeof v!=='object')return null;const s=v as TechnologyMatch,world=restoreDuel(s.world);
  if(s.version!==1||!world||world.version!==2||!['lab','conclusion'].includes(s.phase)||s.phase==='conclusion'&&world.day!==6||offerIssue(world,s.draft)==='这张安排不成立。')return null;
  const reference=s.reference===null?null:restoreDuel(s.reference),synchronous=s.synchronous===null?null:restoreDuel(s.synchronous);
  if(s.reference!==null&&(!reference||reference.version!==2||reference.seed!==world.seed||reference.strategy!==world.strategy))return null;
  if(s.synchronous!==null&&(!synchronous||world.day!==6||JSON.stringify(synchronous)!==JSON.stringify(replayEveryone(world))))return null;
  return {version:1,phase:s.phase,world,draft:{...s.draft},reference,synchronous};
 }catch{return null;}
}
