import {initialCourse,courseRound,nextCourse,finished} from './course-model.mjs';
import {batchUpgrade} from './equipment-model.mjs';
import {simpleRules} from './simple-consequences.mjs';

// Compare the same five demand days and equipment rule. Do not replay the
// player's actions as a counterfactual or mix the three independent accounts.
export function wavesReview(state){
 if(state.version!==3||state.mode!=='waves'||!finished(state))return null;
 let baseline=initialCourse(batchUpgrade(state.world),true,true,simpleRules(state.world));
 while(!finished(baseline))baseline=courseRound(baseline,'hold');
 baseline=nextCourse(baseline);
 while(!finished(baseline))baseline=courseRound(baseline,'hold');
 const world=state.world,opening=world.history[0].before[0];
 const gain=world.shops[0].cash-opening,baselineGain=baseline.world.shops[0].cash-opening;
 return {gain,baselineGain,difference:gain-baselineGain,stock:world.shops[0].bread.length,
  spoiled:world.history.reduce((n,r)=>n+r.spoiled[0],0),demand:world.history.map(r=>r.demand)};
}

export function socialReview(world){
 const r=world.history.at(-1);if(!r)return null;
 const stock=r.stock[0]+r.stock[1];
 return {stock,poor:r.poor,wages:r.wages[0]+r.wages[1],
  stopped:world.history.filter(h=>h.stopped[0]&&!h.installing?.[0]).length,
  title:r.poor?'有面包，有人却买不起。':stock?'剩下面包，问题只在炉子吗？':'这次没有剩货，再看看钱流向谁。'};
}
