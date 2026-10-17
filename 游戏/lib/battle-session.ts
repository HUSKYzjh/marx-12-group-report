import {restoreCourse} from '../public/assets/market-duel/course-model.mjs';
export type BattleSnapshot = {state: NonNullable<ReturnType<typeof restoreCourse>>; view:'choose'|'result'; openingRead?:boolean};
export function restoreBattleSnapshot(value:unknown):BattleSnapshot|null{
 if(!value||typeof value!=='object')return null;
 const input=value as {state:unknown;view:unknown;openingRead?:unknown};
 if(input.openingRead!==undefined&&typeof input.openingRead!=='boolean')return null;
 if(input.view!=='choose'&&input.view!=='result')return null;
 const state=restoreCourse(input.state);
 return state?{state,view:input.view==='result'&&state.world.day?'result':'choose',
  ...(input.openingRead!==undefined?{openingRead:input.openingRead}:{})}:null;
}
