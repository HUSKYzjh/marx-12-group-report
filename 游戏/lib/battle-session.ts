import {restoreCourse} from '../public/assets/market-duel/course-model.mjs';
import {restoreSteadyBest} from '../public/assets/market-duel/steady-challenge.mjs';
export type BattleSnapshot = {state: NonNullable<ReturnType<typeof restoreCourse>>; view:'choose'|'result'; openingRead?:boolean; steadyBest?:NonNullable<ReturnType<typeof restoreSteadyBest>>};
export function restoreBattleSnapshot(value:unknown):BattleSnapshot|null{
 if(!value||typeof value!=='object')return null;
 const input=value as {state:unknown;view:unknown;openingRead?:unknown;steadyBest?:unknown};
 if(input.openingRead!==undefined&&typeof input.openingRead!=='boolean')return null;
 if(input.view!=='choose'&&input.view!=='result')return null;
 const state=restoreCourse(input.state),steadyBest=restoreSteadyBest(input.steadyBest);
 return state?{state,view:input.view==='result'&&state.world.day?'result':'choose',
  ...(input.openingRead!==undefined?{openingRead:input.openingRead}:{}),...(steadyBest?{steadyBest}:{})}:null;
}
