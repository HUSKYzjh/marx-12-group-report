import {restoreCourse} from '../public/assets/market-duel/course-model.mjs';
export type BattleSnapshot = {state: NonNullable<ReturnType<typeof restoreCourse>>; view:'choose'|'result'};
export function restoreBattleSnapshot(value:unknown):BattleSnapshot|null{
 if(!value||typeof value!=='object')return null;
 const input=value as {state:unknown;view:unknown};
 if(input.view!=='choose'&&input.view!=='result')return null;
 const state=restoreCourse(input.state);
 return state?{state,view:input.view==='result'&&state.world.day?'result':'choose'}:null;
}
