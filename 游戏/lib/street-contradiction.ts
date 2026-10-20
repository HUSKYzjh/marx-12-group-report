import {runStreetPeriod,streetFirm,streetCapacity,type StreetGame,type StreetWorld,type StreetReport} from './street-game.ts';
const breadFirms=(w:StreetWorld)=>w.firms.filter(f=>f.id==='bakery'||f.id==='rival');
function observation(world:StreetWorld,report:StreetReport){
 const bakeries=breadFirms(world),ours=streetFirm(world,'bakery');
 return {round:world.round,produced:bakeries.reduce((n,f)=>n+f.produced,0),sold:bakeries.reduce((n,f)=>n+f.sold,0),breadStock:bakeries.reduce((n,f)=>n+f.stock,0),
  wageTotal:report.transactions.filter(t=>t.kind==='wage').reduce((n,t)=>n+t.amount,0),ownWages:report.wageBill,ownCashChange:report.cashChange,ownSold:report.sold,
  breadUnaffordable:world.people.filter(p=>p.shopping?.items[0].outcome==='money').length,
  unaffordable:world.people.filter(p=>p.shopping?.items.some(i=>i.outcome==='money')).length,
  needsWithStock:world.people.filter(p=>p.shopping?.items.some(i=>i.outcome==='money'&&(i.kind==='bread'?bakeries.some(f=>f.stock>0):streetFirm(world,i.kind==='car'?'cars':'clothes').stock>0))).length,
  stock:[{kind:'面包',unit:'个',quantity:bakeries.reduce((n,f)=>n+f.stock,0)},{kind:'衣服',unit:'件',quantity:streetFirm(world,'clothes').stock},{kind:'汽车',unit:'辆',quantity:streetFirm(world,'cars').stock}],
  capacity:streetCapacity(ours),spoiledBread:report.spoiled,
  suppliers:report.transactions.filter(t=>t.kind==='inputs'&&t.to==='inputs').map(t=>({firm:t.from,paid:t.amount})),
  crossPurchases:report.transactions.filter(t=>['bread','clothes','car'].includes(t.kind)&&report.transactions.some(w=>w.kind==='wage'&&w.to===t.from&&w.from!==t.to)).slice(0,2).map(t=>({employer:report.transactions.find(w=>w.kind==='wage'&&w.to===t.from)!.from,seller:t.to,person:t.from,paid:t.amount}))};
}
/** Recompute the same day from its real opening, never insert a sale or a crisis.
 * Hold the own-shop wage, price, staffed shifts and starting wealth identical.
 * Only the other firms' conditional wage response changes. These are comparisons,
 * not a replay of history and not a claim that every employer follows a cut. */
export function streetContradiction(g:StreetGame){
 const actual=g.report&&!g.report.management?observation(g.world,g.report):null;
 const examples=g.history.filter(r=>!r.management);
 const repeatedOwnStock=examples.slice(-2).length===2&&examples.slice(-2).every(r=>r.stock>0);
 let comparison:null|{wage:number;price:number;shifts:number;own:ReturnType<typeof observation>|null;follow:ReturnType<typeof observation>|null}=null;
 if(actual&&g.checkpoint&&streetFirm(g.world,'bakery').wage<500){
  const firm=streetFirm(g.world,'bakery'),wage=firm.wage/100,price=firm.price/100,shifts=firm.working;
  const trial=(response:StreetGame['response'])=>{
   const input={...g,world:structuredClone(g.checkpoint!),wage,price,shifts,response,story:undefined,campaign:undefined,tutorial:undefined};
   const result=runStreetPeriod(input);return 'blocked' in result?null:observation(result.world,result.report);
  };
  comparison={wage,price,shifts,own:trial('none'),follow:trial('cut')};
 }
 return {actual,repeatedOwnStock,comparison,reviewReady:g.world.round>=2,
  expanded:streetFirm(g.world,'bakery').machines>2,followed:g.world.firms.some(f=>f.id!=='bakery'&&f.id!=='inputs'&&f.machines>({rival:1,clothes:2,cars:2,ovens:1} as Record<string,number>)[f.id])};
}
