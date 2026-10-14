import type {PressureWorld} from './pressure-model.mjs';
export type PressureFeedback={day:number;cashChange:number;wages:number|null;initialWages:number|null;unpaid:number[];poor:number[];fired:number[];checkpoint:'end'|'poor'|'closed'|'fired'|null;message:string;savings:{id:number;opening:number;current:number}[];newlyPoor:number[]};
export function pressureFeedback(world:PressureWorld):PressureFeedback;
