import type {StreetWorld,StreetTransfer} from './street-game.ts';

/** Moving-average manufacturing accounts for the player's bakery, in cents.
 * Cash transactions remain whole coins. Asset valuation is not spendable money.
 * Wages/material/depreciation enter product cost, then expense when sold or
 * spoiled. Storage and the new campaign's explicit rent accrue when unpaid;
 * legacy games have no rent. Taxes are outside this teaching account. */
export type BakeryBooks={stockValue:number;inputValue:number;ovens:{cost:number;value:number}[]};
export type BakeryDayAccounts={sales:number;costOfSales:number;wages:number;materialsPurchased:number;materialsUsed:number;depreciation:number;spoilage:number;storage:number;severance:number;fixedCosts?:number;liquidationLoss?:number;netProfit:number;ownerDraw:number;retained:number;openingAssets:number;closingAssets:number};
const ours=(w:StreetWorld)=>w.firms.find(f=>f.id==='bakery')!;
const amount=(tx:StreetTransfer[],kind:string,side:'from'|'to'='from')=>tx.filter(t=>t[side]==='bakery'&&t.kind===kind).reduce((n,t)=>n+Math.round(t.amount*100),0);
const allocate=(value:number,quantity:number,total:number)=>total?quantity>=total?value:Math.round(value*quantity/total):0;
const assets=(w:StreetWorld,b:BakeryBooks)=>ours(w).cash+b.stockValue+b.inputValue+b.ovens.reduce((n,o)=>n+o.value,0)-((ours(w).storageDebt??0)+(ours(w).rentDebt??0))*100;
export function openingBakeryBooks(w:StreetWorld):BakeryBooks{
 const f=ours(w);if(f.stock||f.inputs||w.round)throw new Error('Books require a fresh opening, not reconstructed history');
 const quote=w.firms.find(f=>f.id==='ovens')!.price;
 return {stockValue:0,inputValue:0,ovens:f.ovenAges.map((age,i)=>{const cost=quote*(f.ovenCapacities?.[i]===12?2:1);return {cost,value:Math.round(cost*(12-age)/12)};})};
}
export function settleBakeryAccounts(book:BakeryBooks,before:StreetWorld,after:StreetWorld,tx:StreetTransfer[],management=false){
 const b=structuredClone(book),f=ours(before),n=ours(after),openingAssets=assets(before,book);
 const wages=amount(tx,'wage'),materialsPurchased=amount(tx,'inputs'),sales=amount(tx,'bread','to');
 let materialsUsed=0,depreciation=0,spoilage=0,costOfSales=0;
 const bought=tx.filter(t=>t.from==='bakery'&&t.kind==='inputs').reduce((q,t)=>q+t.quantity,0);
 b.inputValue+=materialsPurchased;
 if(!management){
  const expired=before.batches.filter(x=>x.firm==='bakery'&&after.round-x.round>=3).reduce((q,x)=>q+x.quantity,0);
  spoilage=allocate(b.stockValue,expired,f.stock);b.stockValue-=spoilage;
  materialsUsed=allocate(b.inputValue,n.produced,f.inputs+bought);b.inputValue-=materialsUsed;
  const working=f.ovenAges.map((age,i)=>({age,i,q:f.ovenCapacities?.[i]??6})).filter(o=>o.age<12).sort((a,c)=>c.q-a.q||a.i-c.i).slice(0,n.working);
  for(const o of working){const asset=b.ovens[o.i],charge=Math.min(asset.value,Math.round(asset.cost/12));asset.value-=charge;depreciation+=charge;}
  b.stockValue+=wages+materialsUsed+depreciation;
  const producedStock=f.stock-expired+n.produced;
  costOfSales=allocate(b.stockValue,n.sold,producedStock);b.stockValue-=costOfSales;
 }
 const purchases=tx.filter(t=>t.from==='bakery'&&t.kind==='new-oven');
 for(const t of purchases){const cost=Math.round(t.amount*100);b.ovens.push({cost,value:cost});}
 const replaced=f.ovenAges.map((age,i)=>({age,i})).filter(o=>n.ovenAges[o.i]===0&&(o.age>=12||!management&&o.age===11));
 const replacements=tx.filter(t=>t.from==='bakery'&&t.kind==='replacement');
 if(replaced.length!==replacements.length)throw new Error('Replacement books disagree with equipment');
 replacements.forEach((t,i)=>{const cost=Math.round(t.amount*100);b.ovens[replaced[i].i]={cost,value:cost};});
 const storage=management?0:amount(tx,'storage')+((n.storageDebt??0)-(f.storageDebt??0))*100;
 const fixedCosts=management?0:amount(tx,'rent')+((n.rentDebt??0)-(f.rentDebt??0))*100;
 let liquidationLoss=0;
 if(tx.some(t=>t.kind==='liquidation'&&t.to==='bakery')){liquidationLoss=b.stockValue+b.inputValue+b.ovens.reduce((n,o)=>n+o.value,0)-amount(tx,'liquidation','to');b.stockValue=0;b.inputValue=0;b.ovens=[];}
 const severance=amount(tx,'severance'),ownerDraw=amount(tx,'owner-budget')+amount(tx,'owner-purchase');
 const netProfit=sales-costOfSales-spoilage-storage-severance-fixedCosts-liquidationLoss,retained=netProfit-ownerDraw,closingAssets=assets(after,b);
 if(closingAssets-openingAssets!==retained)throw new Error('Bakery profit and asset reconciliation failed');
 if(b.ovens.length!==n.machines||[b.stockValue,b.inputValue,...b.ovens.flatMap(o=>[o.cost,o.value])].some(v=>!Number.isSafeInteger(v)||v<0)||!n.stock&&b.stockValue||!n.inputs&&b.inputValue)throw new Error('Invalid bakery books');
 return {books:b,accounts:{sales,costOfSales,wages,materialsPurchased,materialsUsed,depreciation,spoilage,storage,severance,fixedCosts,liquidationLoss,netProfit,ownerDraw,retained,openingAssets,closingAssets} satisfies BakeryDayAccounts};
}
