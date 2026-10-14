// Reachable UI schedules, not an optimizer and not evidence of real economies.
import fs from 'node:fs/promises';
import {initialDuel,currentOffer,offerIssue,settleDuel,STRATEGIES} from '../public/assets/market-duel/model.mjs';
const results=[];
for(const strategy of Object.keys(STRATEGIES))for(const seed of [17,43]){
 const rows=[];
 for(let wage=1;wage<=4;wage++)for(let price=1;price<=4;price++)for(const buy of [false,true])for(let later=1;later<=4;later++){
  let s=initialDuel(strategy,seed),valid=true;
  for(let day=0;day<6;day++){
   const offer=currentOffer(s);
   if(day===0)offer.wage=wage;
   if(day===1)offer.price=price;
   if(day===2&&buy)offer.ovens++;
   if(day===3)offer.wage=later;
   const cannotOpen=!!offerIssue(s,{...currentOffer(s),wage:1});
   if(offerIssue(s,offer)&&!cannotOpen){valid=false;break;}
   s=settleDuel(s,offer,{allowClosed:cannotOpen});
  }
  if(valid)rows.push({wage,price,buy,later,cash:s.firms[0].cash,rival:s.firms[1].cash,fed:s.history.reduce((n,h)=>n+h.report.fed,0),stock:s.firms[0].bread.length,closed:s.history.filter(h=>h.report.closed[0]).length});
 }
 const bestCash=Math.max(...rows.map(r=>r.cash)),bestFed=Math.max(...rows.map(r=>r.fed));
 results.push({strategy,seed,schedules:rows.length,bestCash,bestFed,cashLeaders:rows.filter(r=>r.cash===bestCash),foodLeaders:rows.filter(r=>r.fed===bestFed).slice(0,6)});
}
await fs.mkdir('outputs/duel-strategy-audit',{recursive:true});
await fs.writeFile('outputs/duel-strategy-audit/report.json',JSON.stringify({checkedAt:new Date().toISOString(),scope:'256 candidate schedules per rival/seed; one real UI action per day; not exhaustive',results},null,2));
console.log(JSON.stringify(results));
