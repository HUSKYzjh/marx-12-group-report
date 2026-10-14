import {initialPressure,pressureRound,rewindPressure,restorePressure,PRESSURE_ACTIONS,type PressureWorld,type PressureChoice} from '../public/assets/market-duel/pressure-model.mjs';
export type PressureStory={version:1;phase:'lab'|'conclusion';stage:'competition'|'support';world:PressureWorld;draft:PressureChoice;reference:PressureWorld|null;paths:PressureWorld[];coins:(number|null)[];revision:number};
export type PressureAction={type:'BEGIN'}|{type:'DRAFT';choice:PressureChoice}|{type:'RUN';revision:number}|{type:'REWIND';day:number}|{type:'TRY_FOLLOW'}|{type:'SUPPORT'}|{type:'COIN';coin:number;person:number|null}|{type:'RESTART'}|{type:'CONCLUDE'};
export function initialPressureStory():PressureStory{return {version:1,phase:'lab',stage:'competition',world:initialPressure(),draft:'hold',reference:null,paths:[],coins:Array(4).fill(null),revision:0};}
export function supportRemaining(s:PressureStory){return Math.max(0,12-s.world.history.reduce((n,h)=>n+h.receipts.filter(p=>p.reason==='收入保障').reduce((m,p)=>m+p.amount,0),0));}
export function pressureStoryReducer(s:PressureStory,a:PressureAction):PressureStory{
 if(!a||typeof a!=='object')return s;
 const change=(p:Partial<PressureStory>)=>({...s,...p,revision:s.revision+1});
 if(a.type==='RESTART')return {...initialPressureStory(),paths:[...s.paths,s.world].slice(-2),revision:s.revision+1};
 if(a.type==='TRY_FOLLOW'){
  if(s.phase!=='lab'||s.stage!=='competition'||s.world.firms[0].fast||!s.world.history.at(-1)?.closed[0]||s.world.day<2)return s;
  return change({world:rewindPressure(s.world,2),draft:'follow',reference:s.world,paths:[...s.paths,s.world].slice(-2)});
 }
 if(a.type==='REWIND'){
  if(!Number.isInteger(a.day)||a.day<1||a.day>s.world.day||s.stage==='support'&&a.day<7)return s;
  return change({phase:'lab',world:rewindPressure(s.world,a.day),draft:'hold',reference:s.stage==='support'?s.reference:s.world});
 }
 if(a.type==='SUPPORT'){
  if(s.world.day!==9||s.stage!=='competition')return s;
  return change({phase:'lab',stage:'support',world:rewindPressure(s.world,7),reference:s.world,draft:'hold',coins:Array(4).fill(null)});
 }
 if(a.type==='CONCLUDE')return s.world.day===9&&s.phase==='lab'?change({phase:'conclusion'}):s;
 if(s.phase!=='lab'||s.world.day===9)return s;
 if(a.type==='DRAFT')return s.stage==='competition'&&s.world.day>0&&PRESSURE_ACTIONS.includes(a.choice)&&a.choice!==s.draft?change({draft:a.choice}):s;
 if(a.type==='COIN'){
  if(s.stage!=='support'||!Number.isInteger(a.coin)||a.coin<0||a.coin>=4||a.person!==null&&(!Number.isInteger(a.person)||a.person<0||a.person>7)||s.coins[a.coin]===a.person||a.person!==null&&s.coins.includes(a.person))return s;
  const coins=s.coins.slice();coins[a.coin]=a.person;return change({coins});
 }
 if(a.type==='RUN'){
  if(a.revision!==s.revision)return s;
  const action=s.stage==='support'?s.reference?.history[s.world.day]?.action:s.draft;if(!action)return s;
  const options=s.stage==='support'?{support:s.coins.filter((id):id is number=>id!==null)}:{};
  const world=pressureRound(s.world,action,options);return change({world,draft:'hold'});
 }
 return s;
}
export function restorePressureStory(v:unknown):PressureStory|null{
 try{
  if(!v||typeof v!=='object')return null;const s=v as PressureStory,world=restorePressure(s.world),reference=s.reference===null?null:restorePressure(s.reference);
  if(s.version!==1||!world||!['lab','conclusion'].includes(s.phase)||s.phase==='conclusion'&&world.day!==9||!['competition','support'].includes(s.stage)||!PRESSURE_ACTIONS.includes(s.draft)||!Number.isInteger(s.revision)||s.revision<world.day||!Array.isArray(s.paths)||s.paths.length>2||!Array.isArray(s.coins)||s.coins.length!==4||s.coins.some(id=>id!==null&&(!Number.isInteger(id)||id<0||id>7))||new Set(s.coins.filter(id=>id!==null)).size!==s.coins.filter(id=>id!==null).length)return null;
  const paths=s.paths.map(restorePressure);if(paths.some(p=>!p||p.seed!==world.seed)||s.reference!==null&&(!reference||reference.seed!==world.seed))return null;
  if(world.seed!==17||world.history.length&&world.history[0].action!=='hold')return null;
  if(s.stage==='competition'&&(world.history.some(r=>r.support)||reference?.history.some(r=>r.support)||s.coins.some(id=>id!==null)))return null;
  if(s.stage==='support'){
   if(!reference||reference.day!==9||reference.history.some(r=>r.support)||world.day<6||s.draft!=='hold'||JSON.stringify(world.history.slice(0,6))!==JSON.stringify(reference.history.slice(0,6))||world.history.slice(6).some((r,i)=>!r.support||r.action!==reference.history[i+6].action))return null;
  }
  return {version:1,phase:s.phase,stage:s.stage,world,draft:s.draft,reference,paths:paths as PressureWorld[],coins:s.coins.slice(),revision:s.revision};
 }catch{return null;}
}
