import {equipmentWorld,equipmentRound,batchUpgrade} from './equipment-model.mjs';
import {simpleRules,simpleWorld,simpleRound} from './simple-consequences.mjs';
// Read-only comparison of complete operating plans under the same rival and seed.
export function profitReview(world){
 if(!world?.history?.length||!world.people)return null;
 const simplified=simpleRules(world);let baseline=simplified?simpleWorld(true):equipmentWorld(true,batchUpgrade(world));
 for(let day=0;day<world.day;day++)baseline=simplified?simpleRound(baseline,'hold','social'):equipmentRound(baseline,'hold','social');
 const totals=w=>({wages:w.history.reduce((n,r)=>n+r.wages[0],0),sold:w.history.reduce((n,r)=>n+r.sold[0],0),gain:w.shops[0].cash-36});
 const actual=totals(world),ordinary=totals(baseline);
 return {actual,ordinary,difference:actual.gain-ordinary.gain};
}
