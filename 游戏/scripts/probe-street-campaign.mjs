import {createStreetCampaign,streetReducer as reduce,streetMoney,restoreStreetGame} from '../lib/street-game.ts';
export function acknowledge(g){while(g.tutorial.pending.length)g=reduce(g,{type:'ACK_NOTICE',id:g.tutorial.pending[0].id});return g;}
export const run=g=>acknowledge(reduce(g,{type:'ROUND',expectedRound:g.world.round}));
export function openStreet(){let g=run(createStreetCampaign());g=acknowledge(reduce(g,{type:'STORY_EXPAND'}));g=run(g);g=reduce(g,{type:'STORY_COMPETE'});return reduce(g,{type:'OTHERS_FOLLOW'});}
export function probe(wage,price,shifts){
 let g=openStreet();for(let i=0;i<Math.abs(wage-g.wage);) {g=reduce(g,{type:'WAGE',delta:Math.sign(wage-g.wage)});if(g.wage===wage)break;}
 while(g.price!==price)g=reduce(g,{type:'PRICE',delta:Math.sign(price-g.price)});
 const timeline=[];
 while(g.world.round<48&&!['insolvent','closed'].includes(g.campaign.beat)){
  while(g.shifts>Math.min(shifts,g.world.firms[0].workers.length))g=reduce(g,{type:'SHIFTS',delta:-1});
  const previous=g.world.round;let n=run(g);
  while(n.world.round===previous&&g.shifts>0){g=reduce(g,{type:'SHIFTS',delta:-1});n=run(g);}
  if(n.world.round===previous)break;g=n;
  if(streetMoney(g.world)!==g.world.initialMoney)throw Error('Money created');
  if(JSON.stringify(restoreStreetGame(g))!==JSON.stringify(g))throw Error('Campaign restore changed state');
  timeline.push({day:g.world.round,shifts:g.shifts,stock:g.report.stock,sold:g.report.sold,profit:g.report.accounts.netProfit/100,cash:g.report.cash,arrears:g.campaign.solvency.arrears});
 }
 return {wage,price,shifts,day:g.world.round,beat:g.campaign.beat,attempts:g.campaign.attempts,solvency:g.campaign.solvency,followed:g.campaign.followed,timeline,game:g};
}
if(process.argv[1]?.endsWith('probe-street-campaign.mjs')){
 const results=[];for(const w of [3,5,7])for(const p of [1,2,3,4].filter(p=>p<=w))for(const n of [1,2,3]){const r=probe(w,p,n);const {game,timeline,...summary}=r;results.push({...summary,lastDays:timeline.slice(-3)});}
 console.log(JSON.stringify(results,null,2));
}
