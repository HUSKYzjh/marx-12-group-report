/** A finite-cash teaching street, not an estimated economy or a theory of inevitable crisis.
 * Storage uses integer cents; new transactions are whole coins. Old saved
 * fractional remainders stay exact and cannot be spent by whole-coin payments.
 * Frame rate never enters this model. Factory cash is not personal profit.
 */
import {openingBakeryBooks,settleBakeryAccounts,type BakeryBooks,type BakeryDayAccounts} from './street-accounts.ts';
import {advanceCampaign,streetSolvency,type StreetCampaign,CAMPAIGN_BEATS} from './street-campaign.ts';
export const STREET_VERSION = 13;
export const STREET_INITIAL_WORKERS:Record<Industry,number> = {bakery:2,rival:1,clothes:2,cars:2,ovens:1,inputs:2};
export const STREET_INITIAL_WAITING = 4;
const LEGACY_WORKERS:Record<Industry,number> = {bakery:2,rival:1,clothes:1,cars:1,ovens:1,inputs:1};
// Small, explicitly funded opening balances. Bakery reserves still cover the
// guided purchase and hire; cash is transferred, never minted by expansion.
export const STREET_INITIAL_CASH:Record<Industry,number> = {bakery:60,rival:60,clothes:24,cars:32,ovens:32,inputs:16};
export const STREET_INITIAL_SAVINGS = 9;
export const STREET_INPUT_CAPACITY = 48;
export const INPUTS_PER_PACK = 4;
export const INDUSTRIES = ['bakery','rival','clothes','cars','ovens','inputs'] as const;
export type Industry = typeof INDUSTRIES[number];
export type ShoppingKind = 'bread'|'clothes'|'car';
export type ShoppingItem = {kind:ShoppingKind;price:number;probability:number;outcome:'planned'|'bought'|'money'|'stock';quantity:number;wantedQuantity?:number};
export type ShoppingPlan = {round:number;cashBefore:number;items:ShoppingItem[]};
export type StreetPerson = {id:string;cash:number;job:Industry|null;owner:Industry|null;clothesAge:number;carAge:number;bread:number;shopping?:ShoppingPlan};
export type RivalPolicy = {pressureDays:number;cutRound?:number;cutWage?:number;laidOff?:boolean};
export type RivalDecision = {kind:'wage-cut'|'layoff';stock:number;oldWage:number;wage:number;person?:string};
export type StorageCharge = {firm:Industry;stock:number;due:number;paid:number};
export type FirmDecision = {firm:Industry;kind:'price-cut'|'wage-cut'|'layoff'|'hire'|'wage-rise'|'expand';round:number;stock:number;oldValue:number;value:number;reason:string;person?:string};
export type FirmPolicy = {pressureDays:number;clearDays:number;lastActionRound?:number;lastKind?:FirmDecision['kind'];wageCeiling?:number};
export type StreetFirm = {id:Industry;cash:number;wage:number;price:number;workers:string[];machines:number;ovenAges:number[];ovenCapacities?:number[];productivity?:number;stock:number;inputs:number;working:number;produced:number;sold:number;rivalPolicy?:RivalPolicy;firmPolicy?:FirmPolicy;storageDebt?:number;rentDebt?:number};
export type StreetWorld = {round:number;firms:StreetFirm[];people:StreetPerson[];batches:{firm:Industry;round:number;quantity:number}[];initialMoney:number;rentPerDay?:number};
export type StreetTransfer = {from:string;to:string;amount:number;kind:string;quantity:number};
export type StreetReport = {round:number;transactions:StreetTransfer[];produced:number;sold:number;stock:number;spoiled:number;working:number;cash:number;cashChange:number;wageBill:number;inputBill:number;needWithoutMoney:number;breadBought:number;dismissed:string[];hired:string[];investment:number;management:boolean;rivalDecision?:RivalDecision;firmDecisions?:FirmDecision[];storageCharges?:StorageCharge[];accounts?:BakeryDayAccounts};
export type StreetPhase = 'intro'|'own'|'neighbors'|'manage'|'social'|'private'|'overproduction'|'limits';
export const STREET_STORY_BEATS = ['opening','expand','lead','rival','pressure','adjust','layoff','review'] as const;
export type StreetStory = {beat:typeof STREET_STORY_BEATS[number];comparison:StreetReport|null;dismissed:string[];neighborCuts:boolean;pressureRounds:number};
export type StreetNotice={id:'first-day'|'first-oven'|'first-stock';round:number;rows:[string,number][]};
export type StreetGame = {version:number;world:StreetWorld;phase:StreetPhase;wage:number;price:number;shifts:number;response:'none'|'rival'|'some'|'all'|'cut';report:StreetReport|null;checkpoint:StreetWorld|null;serial:number;message:string;layoffPreview:boolean;history:StreetReport[];story?:StreetStory;storyCheckpoint?:StreetStory;campaign?:StreetCampaign;campaignCheckpoint?:StreetCampaign;books?:BakeryBooks;booksCheckpoint?:BakeryBooks;tutorial?:{seen:string[];pending:StreetNotice[]}};
export type StreetAction =
 | {type:'WAGE';delta:number}|{type:'PRICE';delta:number}|{type:'SHIFTS';delta:number}
 | {type:'ROUND';expectedRound:number}|{type:'NEXT'}|{type:'RETRY'}
 | {type:'RESPONSE';value:StreetGame['response']}|{type:'BUY_OVEN'}|{type:'HIRE'}
 | {type:'PREVIEW_LAYOFF'}|{type:'CANCEL_LAYOFF'}|{type:'LAYOFF'}|{type:'OTHER_LAYOFFS'}|{type:'EXPLAIN'}|{type:'RESTART'}
 | {type:'EXPAND_STREET'}|{type:'FOLLOW_EXPANSION'}|{type:'MANAGE'}
 | {type:'BEGIN_STORY'}|{type:'STORY_EXPAND'}|{type:'STORY_COMPETE'}|{type:'STORY_REPEAT'}|{type:'STORY_SANDBOX'}|{type:'BEGIN_CAMPAIGN'}|{type:'ACK_NOTICE';id:StreetNotice['id']}|{type:'OTHERS_FOLLOW'}|{type:'CLOSE_SHOP'};
const cents=(n:number)=>Math.round(n*100);
export const streetFirm=(w:StreetWorld,id:Industry)=>w.firms.find(f=>f.id===id)!;
export const streetPerson=(w:StreetWorld,id:string)=>w.people.find(p=>p.id===id)!;
export const streetMoney=(w:StreetWorld)=>w.firms.reduce((n,f)=>n+f.cash,0)+w.people.reduce((n,p)=>n+p.cash,0);
/** Owners may draw the shortfall of an actual purchase, after payroll reserves.
 * This is personal consumption, not a material cost, loan or new income. */
export function streetOwnerFunds(w:StreetWorld,p:StreetPerson):number{
 if(!p.owner)return 0;const f=streetFirm(w,p.owner);
 return Math.max(0,Math.floor((f.cash-f.wage*f.workers.length*3)/100)*100);
}
const workingOvens=(f:StreetFirm,n:number)=>f.ovenAges.map((age,i)=>({age,i,q:f.ovenCapacities?.[i]??6})).filter(o=>o.age<12).sort((a,b)=>b.q-a.q||a.i-b.i).slice(0,n);
export const streetCapacity=(f:StreetFirm,n=f.workers.length)=>f.id==='bakery'||f.id==='rival'?workingOvens(f,n).reduce((sum,o)=>sum+o.q,0):f.id==='inputs'?n*STREET_INPUT_CAPACITY:n*(f.productivity??1);
const capacity=streetCapacity;
const requirement=(id:Industry)=>id==='bakery'||id==='rival'?1:id==='clothes'?2:id==='cars'?4:id==='ovens'?3:0;
const inputOrder=(needed:number,held:number)=>Math.ceil(Math.max(0,needed-held)/INPUTS_PER_PACK)*INPUTS_PER_PACK;
/** Teaching probability, not measured consumer behavior. Price is in cents. */
export const discretionaryProbability=(price:number)=>400/(400+price);
// Stable random-looking draw per identity, period and product. Reload, click,
// pause and retry cannot reroll preferences. A cheaper price uses the same draw.
function shoppingDraw(id:string,round:number,kind:string){
 let hash=2166136261;for(const c of id+'|'+round+'|'+kind)hash=Math.imul(hash^c.charCodeAt(0),16777619);
 hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d);hash^=hash>>>15;hash=Math.imul(hash,0x846ca68b);hash^=hash>>>16;
 return (hash>>>0)/4294967296;
}
/** Conditional willingness for each extra loaf, a teaching saturation rule. */
export const extraBreadProbability=(unit:number)=>unit===2?.75:unit===3?.35:0;
export function breadWanted(id:string,round:number){let count=1;for(let unit=2;unit<=3;unit++){if(shoppingDraw(id,round,'bread-'+unit)>=extraBreadProbability(unit))break;count++;}return count;}
export function createShoppingPlan(id:string,round:number,cashBefore:number,prices:Record<ShoppingKind,number>):ShoppingPlan{
 const items:ShoppingItem[]=[{kind:'bread',price:prices.bread,probability:1,outcome:'planned',quantity:0,wantedQuantity:breadWanted(id,round)}];
 for(const kind of ['clothes','car'] as const){const probability=discretionaryProbability(prices[kind]);if(shoppingDraw(id,round,kind)<probability)items.push({kind,price:prices[kind],probability,outcome:'planned',quantity:0});}
 return {round,cashBefore,items};
}
export function createStreetGame(wage=5):StreetGame{
 const world:StreetWorld={round:0,firms:[],people:[],batches:[],initialMoney:0};
 const specs:[Industry,number,number,number][]=[['bakery',STREET_INITIAL_WORKERS.bakery,wage,3],['rival',STREET_INITIAL_WORKERS.rival,4,3],['clothes',STREET_INITIAL_WORKERS.clothes,6,8],['cars',STREET_INITIAL_WORKERS.cars,7,40],['ovens',STREET_INITIAL_WORKERS.ovens,5,24],['inputs',STREET_INITIAL_WORKERS.inputs,5,1]];
 for(const [id,count,pay,price] of specs){
  const workers:string[]=[];
  for(let i=0;i<count;i++){const name=id+'-'+i;workers.push(name);world.people.push({id:name,cash:cents(STREET_INITIAL_SAVINGS),job:id,owner:null,clothesAge:world.people.length%4,carAge:world.people.length%16,bread:0});}
  world.people.push({id:id+'-owner',cash:cents(STREET_INITIAL_SAVINGS),job:null,owner:id,clothesAge:2,carAge:8,bread:0});
  world.firms.push({id,cash:cents(STREET_INITIAL_CASH[id]),wage:cents(pay),price:cents(price),workers,machines:count,ovenAges:Array(count).fill(0),stock:0,inputs:0,working:0,produced:0,sold:0});
 }
 for(let i=0;i<STREET_INITIAL_WAITING;i++)world.people.push({id:'available-'+i,cash:0,job:null,owner:null,clothesAge:4,carAge:16,bread:0});
 for(const p of world.people)p.shopping=createShoppingPlan(p.id,1,p.cash,{bread:300,clothes:800,car:4000});
 world.initialMoney=streetMoney(world);
 return {version:STREET_VERSION,world,phase:'intro',wage,price:3,shifts:2,response:'none',report:null,checkpoint:null,serial:0,message:'',layoffPreview:false,history:[]};
}
/** A five-round guided experiment over the same conserved-cash model. */
export function createStreetStory(wage=5):StreetGame{
 return {...createStreetGame(wage),story:{beat:'opening',comparison:null,dismissed:[],neighborCuts:false,pressureRounds:0}};
}
/** New classroom campaign foundation. Played legacy wallets are never rewritten. */
// Teaching working-capital allocation: both heavy industries start above every
// light industry. Redistribute the same 624 coins; do not inject demand or money.
export const STREET_CAMPAIGN_CASH:Record<Industry,number>={bakery:72,rival:84,clothes:60,cars:204,ovens:156,inputs:48};
export function createStreetCampaign(wage=5):StreetGame{
 const g=createStreetGame(wage);
 for(const f of g.world.firms)f.cash=cents(STREET_CAMPAIGN_CASH[f.id]);
 g.world.initialMoney=streetMoney(g.world);g.world.rentPerDay=4;g.books=openingBakeryBooks(g.world);g.tutorial={seen:[],pending:[]};g.campaign={beat:'opening',followed:[],attempts:0,pressureDays:0};return g;
}
function bookAndBrief(g:StreetGame,next:StreetGame,management=false):StreetGame{
 if(!g.books||!next.report)return next;
 const settled=settleBakeryAccounts(g.books,g.world,next.world,next.report.transactions,management);
 const report={...next.report,accounts:settled.accounts},tutorial=g.tutorial?structuredClone(g.tutorial):undefined;
 if(tutorial){
  const add=(id:StreetNotice['id'],rows:StreetNotice['rows'])=>{if(!tutorial.seen.includes(id)&&!tutorial.pending.some(n=>n.id===id))tutorial.pending.push({id,round:next.world.round,rows});};
  const a=settled.accounts;
  if(!management)add('first-day',[['销售额',a.sales],['售出面包的成本（含折旧）',a.costOfSales],['店租',a.fixedCosts??0],['坏掉与保管费用',a.spoilage+a.storage],['净利润',a.netProfit],['厨师工资（已计生产成本）',a.wages],['老板个人取用',a.ownerDraw],['公司留存利润',a.retained]]);
  const purchased=report.transactions.filter(t=>t.from==='bakery'&&t.kind==='new-oven').reduce((n,t)=>n+cents(t.amount),0);
  if(purchased)add('first-oven',[['烤炉花费',purchased],['购置后公司余额',streetFirm(next.world,'bakery').cash]]);
  const charge=report.storageCharges?.find(c=>c.firm==='bakery');
  if(!management&&report.stock>0&&charge)add('first-stock',[['待售面包（个）',report.stock],['本轮保管费',cents(charge.due-(streetFirm(g.world,'bakery').storageDebt??0))],['实际支付',cents(charge.paid)]]);
 }
 const updated={...next,books:settled.books,...(!management?{booksCheckpoint:structuredClone(g.books),...(g.campaign?{campaignCheckpoint:structuredClone(g.campaign)}:{})}:{}),report,history:management?next.history:next.history.map(r=>r.round===report.round&&!r.management?report:r),...(tutorial?{tutorial}:{})};
 return advanceCampaign(updated,g);
}
function pay(from:{id:string;cash:number},to:{id:string;cash:number},amount:number,kind:string,tx:StreetTransfer[],quantity=0){
 if(!Number.isSafeInteger(amount)||amount<0||from.cash<amount)throw new Error('Unfunded street transfer');
 from.cash-=amount;to.cash+=amount;tx.push({from:from.id,to:to.id,amount:amount/100,kind,quantity});
}
function report(w:StreetWorld,tx:StreetTransfer[],cashStart:number,spoiled=0,management=false):StreetReport{
 const f=streetFirm(w,'bakery');return {round:w.round,transactions:tx,produced:f.produced,sold:f.sold,stock:f.stock,spoiled,working:f.working,cash:f.cash/100,cashChange:(f.cash-cashStart)/100,
 wageBill:tx.filter(t=>t.kind==='wage'&&t.from==='bakery').reduce((n,t)=>n+t.amount,0),inputBill:tx.filter(t=>t.kind==='inputs'&&t.from==='bakery').reduce((n,t)=>n+t.amount,0),
 needWithoutMoney:w.people.filter(p=>p.bread===0&&p.cash+streetOwnerFunds(w,p)<Math.min(f.price,streetFirm(w,'rival').price)).length,breadBought:w.people.reduce((n,p)=>n+p.bread,0),dismissed:[],hired:[],investment:0,management};
}
/** Inventory-led teaching rule, not an empirical law of employer behavior.
 * Read the previous completed day before resetting its output counters. Never
 * fire from a single leftover loaf, and never remove the rival's last worker.
 */
function respondToRivalStock(w:StreetWorld,tx:StreetTransfer[]):RivalDecision|undefined{
 const f=streetFirm(w,'rival'),previous=f.rivalPolicy;
 const pressure=f.workers.length>0&&f.produced>0&&f.sold<f.produced&&f.stock>=Math.max(6,Math.ceil(streetCapacity(f)/2));
 const policy:RivalPolicy={...previous,pressureDays:pressure?(previous?.pressureDays??0)+1:0};
 f.rivalPolicy=policy;
 if(policy.cutWage!==undefined)f.wage=Math.min(f.wage,policy.cutWage);
 if(!pressure)return;
 if(policy.pressureDays>=2&&policy.cutRound===undefined&&f.wage>300){
  const oldWage=f.wage/100;f.wage-=100;policy.cutRound=w.round;policy.cutWage=f.wage;
  return {kind:'wage-cut',stock:f.stock,oldWage,wage:f.wage/100};
 }
 if(policy.pressureDays>=3&&!policy.laidOff&&(policy.cutRound===undefined||policy.cutRound<w.round)&&f.workers.length>1&&f.cash>=500){
  const id=f.workers.shift()!;pay(f,streetPerson(w,id),500,'severance',tx);streetPerson(w,id).job=null;policy.laidOff=true;
  return {kind:'layoff',stock:f.stock,oldWage:f.wage/100,wage:f.wage/100,person:id};
 }
}
/** Distinct turnover windows: one leftover car is not a stale loaf.
 * All decisions use yesterday's accounts. They do not see today's buyers.
 * These are bounded teaching heuristics, not a prediction of real firms. */
export const STREET_ADAPTATION_RULES={
 rival:{stock:6,days:3},clothes:{stock:4,days:3},cars:{stock:2,days:6},ovens:{stock:2,days:5},inputs:{stock:96,days:3},
} as const;
function respondToFirmStock(w:StreetWorld,f:StreetFirm,tx:StreetTransfer[]):FirmDecision|undefined{
 if(f.id==='bakery'||w.round<=1||f.id==='rival'&&!f.rivalPolicy?.laidOff)return;
 const rule=STREET_ADAPTATION_RULES[f.id],previous=f.firmPolicy;
 const pressure=(f.stock>=rule.stock&&(f.sold<f.produced||f.sold===0))||(f.storageDebt??0)>0;
 const recovering=!pressure&&f.stock<rule.stock/2&&f.sold>0&&f.sold>=f.produced;
 const policy:FirmPolicy={...previous,pressureDays:pressure?(previous?.pressureDays??0)+1:0,clearDays:recovering?(previous?.clearDays??0)+1:0};f.firmPolicy=policy;
 if(policy.wageCeiling!==undefined)f.wage=Math.min(f.wage,policy.wageCeiling);
 if(policy.lastActionRound!==undefined&&w.round-policy.lastActionRound<2)return;
 function decision(kind:FirmDecision['kind'],oldValue:number,value:number,reason:string,person?:string):FirmDecision{
  policy.lastActionRound=w.round;policy.lastKind=kind;
  return {firm:f.id,kind,round:w.round,stock:f.stock,oldValue,value,reason,...(person?{person}:{})};
 }
 // Reopen a paid vacancy only after repeated recovery, not after one sale.
 if(policy.clearDays>=3&&policy.lastKind){
  const candidate=w.people.find(p=>!p.job&&!p.owner);
  if(candidate&&f.workers.length<f.machines&&f.cash>=f.wage*(f.workers.length+1)*3){
   const old=f.workers.length;candidate.job=f.id;f.workers.push(candidate.id);
   return decision('hire',old,f.workers.length,'连续卖得动，留够三轮工资后补回空缺。',candidate.id);
  }
  const openingWage={rival:400,clothes:600,cars:700,ovens:500,inputs:500}[f.id];
  if(policy.clearDays>=5&&policy.wageCeiling!==undefined&&f.wage<openingWage&&f.cash>=(f.wage+100)*f.workers.length*3){
   const old=f.wage;f.wage+=100;policy.wageCeiling=f.wage;
   if(f.id==='rival')f.rivalPolicy!.cutWage=f.wage;
   return decision('wage-rise',old/100,f.wage/100,'销量连续恢复，工资加回一枚。');
  }
 }
 if(!pressure||policy.pressureDays<rule.days)return;
 // Input basket has a one-coin minimum. Other discounts are whole-coin quotes,
 // bounded below by this shop's illustrative full-shift wage/material budget.
 const q=Math.max(1,streetCapacity(f)),rawPrice=streetFirm(w,'inputs').price;
 const floor=f.id==='inputs'?100:Math.max(100,Math.ceil((f.wage*f.workers.length+Math.ceil(q*requirement(f.id)/4)*rawPrice)/q/100)*100);
 function discount():FirmDecision|undefined{
  if(f.price<=floor)return;
  const old=f.price;f.price=Math.max(floor,f.price-Math.max(100,Math.floor(f.price/1000)*100));
  return decision('price-cut',old/100,f.price/100,'库存持续卖不动，先降价试试；不是新增购买力。');
 }
 if(!policy.lastKind||policy.lastKind==='layoff'||policy.lastKind==='hire'||policy.lastKind==='wage-rise'){const changed=discount();if(changed)return changed;}
 if(policy.lastKind!=='wage-cut'&&f.wage>300){
  const old=f.wage;f.wage-=100;policy.wageCeiling=f.wage;
  return decision('wage-cut',old/100,f.wage/100,'积压未缓解，尝试少付一枚工资。');
 }
 if(f.workers.length>1&&f.cash>=500){
  const old=f.workers.length,id=f.workers.pop()!;pay(f,streetPerson(w,id),500,'severance',tx);streetPerson(w,id).job=null;
  return decision('layoff',old,f.workers.length,'持续积压，付五枚安置款后减少一个岗位。',id);
 }
 const changed=discount();if(changed)return changed;
 if(f.wage>300){const old=f.wage;f.wage-=100;policy.wageCeiling=f.wage;return decision('wage-cut',old/100,f.wage/100,'货还剩着，再尝试减少工资；最低三枚。');}
}
/** One complete period. Its ledger commits before any animation starts. */
export function runStreetPeriod(g:StreetGame):{world:StreetWorld;report:StreetReport}|{blocked:string}{
 const w:StreetWorld=structuredClone(g.world),tx:StreetTransfer[]=[],ours=streetFirm(w,'bakery'),rival=streetFirm(w,'rival'),supply=streetFirm(w,'inputs');
 const cashStart=ours.cash;ours.wage=cents(g.wage);ours.price=cents(Math.min(g.price,g.wage));
 const active=Math.min(g.shifts,ours.workers.length,ours.ovenAges.filter(a=>a<12).length);
 const inputCost=inputOrder(capacity(ours,active),ours.inputs)/INPUTS_PER_PACK*supply.price;
 if(ours.cash<active*ours.wage+inputCost)return {blocked:'这轮工资和原料还差 '+Math.ceil((active*ours.wage+inputCost-ours.cash)/100)+' 枚。先调整班次，或再看看账本。'};
 w.round++;let spoiled=0;
 w.batches=w.batches.filter(b=>{if(w.round-b.round<3)return true;streetFirm(w,b.firm).stock-=b.quantity;spoiled+=b.quantity;return false;});
 for(const p of w.people){p.bread=0;p.clothesAge++;p.carAge++;}
 const bases:Record<Industry,number>={bakery:5,rival:4,clothes:6,cars:7,ovens:5,inputs:5};
 for(const f of w.firms){if(f===ours)continue;
  if(g.response==='rival'&&f===rival)f.wage=cents(Math.max(3,g.wage<=5?g.wage:3));
  if(g.response==='cut')f.wage=Math.min(f.wage,cents(Math.max(3,Math.round(bases[f.id]*Math.min(5,g.wage)/5))));
  if(g.response==='some'&&['rival','clothes'].includes(f.id)||g.response==='all')f.wage=cents(Math.max(3,Math.min(7,Math.round(bases[f.id]*g.wage/5))));
 }
 const rivalDecision=respondToRivalStock(w,tx);
 const firmDecisions:FirmDecision[]=[];
 if(rivalDecision)firmDecisions.push({firm:'rival',kind:rivalDecision.kind,round:w.round,stock:rivalDecision.stock,oldValue:rivalDecision.kind==='layoff'?rival.workers.length+1:rivalDecision.oldWage,value:rivalDecision.kind==='layoff'?rival.workers.length:rivalDecision.wage,reason:rivalDecision.kind==='layoff'?'连续积压，降薪后仍未缓解；支付五枚安置款后裁员。':'连续两天积压，尝试降薪一枚。',...(rivalDecision.person?{person:rivalDecision.person}:{})});
 for(const f of w.firms){if(f.id==='rival'&&rivalDecision)continue;const decision=respondToFirmStock(w,f,tx);if(decision)firmDecisions.push(decision);}
 for(const f of w.firms){f.working=0;f.produced=0;f.sold=0;}
 // Material wholesaler is a funded employer too. Its basket aggregates flour,
 // fuel and industrial components; these are not a literal universal raw material.
 const supplyWorkers=supply.stock>=96?0:Math.min(supply.workers.length,Math.floor(supply.cash/supply.wage));
 for(const id of supply.workers.slice(0,supplyWorkers))pay(supply,streetPerson(w,id),supply.wage,'wage',tx);
 supply.working=supplyWorkers;supply.produced=capacity(supply,supplyWorkers);supply.stock+=supply.produced;
 for(const f of w.firms.filter(f=>f!==supply)){
  const bread=['bakery','rival'].includes(f.id),target=f.id==='clothes'?4:2;
  let desired= f===ours?g.shifts:bread?f.workers.length:g.campaign?.followed.includes(f.id)&&(f.firmPolicy?.pressureDays??0)<STREET_ADAPTATION_RULES[f.id as Exclude<Industry,'bakery'>].days?f.workers.length:f.stock>=target?0:f.id==='clothes'?Math.min(f.workers.length,target-f.stock):f.workers.length;
  let n=Math.min(desired,f.workers.length,bread?f.ovenAges.filter(a=>a<12).length:f.workers.length);
  // No overdraft; a funded shift includes both wages and usable input stock.
  while(n>0){const q=capacity(f,n)*requirement(f.id),order=inputOrder(q,f.inputs);if(f.cash>=n*f.wage+order/INPUTS_PER_PACK*supply.price&&order<=supply.stock)break;n--;}
  const q=capacity(f,n),raw=q*requirement(f.id),order=inputOrder(raw,f.inputs);
  if(order){pay(f,supply,order/INPUTS_PER_PACK*supply.price,'inputs',tx,order);supply.stock-=order;supply.sold+=order;f.inputs+=order;}
  for(const id of f.workers.slice(0,n))pay(f,streetPerson(w,id),f.wage,'wage',tx);
  f.inputs-=raw;f.working=n;f.produced=q;f.stock+=q;
  if(bread){const used=workingOvens(f,n).map(o=>o.i);f.ovenAges=f.ovenAges.map((a,i)=>used.includes(i)?a+1:a);w.batches.push({firm:f.id,round:w.round,quantity:q});}
 }
 for(const f of w.firms){const budget=cents(Math.min(6,Math.max(0,Math.round((f.cash-f.workers.length*f.wage*3)/100*.025))));pay(f,streetPerson(w,f.id+'-owner'),budget,'owner-budget',tx);}
 function buy(p:StreetPerson,f:StreetFirm,kind:string){
  if(!f.stock||p.cash+streetOwnerFunds(w,p)<f.price)return false;
  if(p.cash<f.price){const shortage=cents(Math.ceil((f.price-p.cash)/100));pay(streetFirm(w,p.owner!),p,shortage,'owner-purchase',tx);}
  pay(p,f,f.price,kind,tx,1);f.stock--;f.sold++;
  if(['bakery','rival'].includes(f.id)){const b=w.batches.find(b=>b.firm===f.id&&b.quantity>0)!;b.quantity--;p.bread++;}
  return true;
 }
 let turn=w.round;
 function bread(p:StreetPerson){const order=turn++;return [ours,rival].sort((a,b)=>a.price-b.price||(order%2?a.id.localeCompare(b.id):b.id.localeCompare(a.id))).some(f=>buy(p,f,'bread'));}
 const offset=w.round*7%w.people.length,customers=[...w.people.slice(offset),...w.people.slice(0,offset)];
 const prices={bread:Math.min(ours.price,rival.price),clothes:streetFirm(w,'clothes').price,car:streetFirm(w,'cars').price};
 // Everybody tries for one essential loaf, including owners and people out of
 // work. Intention is generated even when cash is zero; success is separate.
 for(const p of customers){
  p.shopping=createShoppingPlan(p.id,w.round,p.cash,prices);const item=p.shopping.items[0],bought=bread(p);
  item.outcome=bought?'bought':p.cash+streetOwnerFunds(w,p)<prices.bread?'money':'stock';item.quantity=p.bread;
  if(bought)item.price=cents(tx[tx.length-1].amount);
 }
 // Only after the essential-bread pass do people try discretionary goods.
 // Price affects the chance to try, not a fictional grant of purchasing power.
 for(const p of customers)for(const item of p.shopping!.items.slice(1)){
  const f=streetFirm(w,item.kind==='clothes'?'clothes':'cars');
  if(buy(p,f,item.kind)){item.outcome='bought';item.quantity=1;if(item.kind==='clothes')p.clothesAge=0;else p.carAge=0;}
  else item.outcome=p.cash+streetOwnerFunds(w,p)<f.price?'money':'stock';
 }
 for(const p of customers){const desired=p.shopping!.items[0].wantedQuantity!;while(p.bread>=1&&p.bread<desired&&bread(p)){} }
 for(const p of customers)p.shopping!.items[0].quantity=p.bread;
 // Replacement is distinct from expansion. Reserve payroll; never give away ovens.
 const maker=streetFirm(w,'ovens');
 for(const f of [ours,rival]){let worn=f.ovenAges.findIndex(a=>a>=12);while(worn>=0&&maker.stock){const cost=maker.price*(f.ovenCapacities?.[worn]===12?2:1);if(f.cash<cost+f.wage*f.workers.length*3)break;pay(f,maker,cost,'replacement',tx,1);maker.stock--;maker.sold++;f.ovenAges[worn]=0;worn=f.ovenAges.findIndex(a=>a>=12);}}
 // Unsold finished goods use packaging, fuel and space. The input supplier
 // represents this service too; coins move to a real firm, not out of the world.
 // Rates are visible teaching settings, not estimated industry storage costs.
 const storageCharges:StorageCharge[]=[];
 // The campaign rents its workshops from the warehouse. Fixed rent continues
 // while a shop is open, including idle days; unpaid rent is a liability.
 // This explicit constraint is not applied retroactively to legacy experiments.
 if(w.rentPerDay)for(const f of w.firms.filter(f=>f!==supply)){
  const due=w.rentPerDay+(f.rentDebt??0),paid=Math.min(due,Math.floor(f.cash/100));f.rentDebt=due-paid;
  if(paid)pay(f,supply,cents(paid),'rent',tx);
 }
 const units:Record<Industry,number>={bakery:6,rival:6,clothes:2,cars:1,ovens:1,inputs:48};
 for(const f of w.firms.filter(f=>f!==supply&&(f.stock>0||f.storageDebt))){
  const due=Math.ceil(f.stock/units[f.id])+(f.storageDebt??0),paid=Math.min(due,Math.floor(f.cash/100));f.storageDebt=due-paid;
  if(paid)pay(f,supply,cents(paid),'storage',tx);
  storageCharges.push({firm:f.id,stock:f.stock,due,paid});
 }
 assertStreetWorld(w);const result=report(w,tx,cashStart,spoiled);
 result.storageCharges=storageCharges;
 result.firmDecisions=firmDecisions;
 if(rivalDecision)result.rivalDecision=rivalDecision;
 for(const d of firmDecisions){if(d.kind==='layoff'&&d.person)result.dismissed.push(d.person);if(d.kind==='hire'&&d.person)result.hired.push(d.person);}
 return {world:w,report:result};
}
export function streetReducer(g:StreetGame,a:StreetAction):StreetGame{
 if(a.type==='BEGIN_CAMPAIGN')return {...createStreetCampaign(),serial:g.serial+1};
 if(a.type==='ACK_NOTICE'){
  if(!g.tutorial||g.tutorial.pending[0]?.id!==a.id)return g;
  return {...g,tutorial:{seen:[...new Set([...g.tutorial.seen,a.id])],pending:g.tutorial.pending.slice(1)}};
 }
 if(g.tutorial?.pending.length)return g;
 if(a.type==='RESTART')return {...createStreetGame(),serial:g.serial+1};
 if(a.type==='BEGIN_STORY')return {...createStreetStory(),serial:g.serial+1};
 const explaining=['social','private','overproduction','limits'].includes(g.phase);
 const managed=g.phase==='manage';
 if(g.campaign&&['insolvent','closed'].includes(g.campaign.beat)&&!['CLOSE_SHOP','EXPLAIN','RETRY','NEXT'].includes(a.type))return g;
 if(a.type==='STORY_SANDBOX'&&g.story){const {story,storyCheckpoint,...free}=g;return {...free,phase:'manage',layoffPreview:false,message:''};}
 if(a.type==='STORY_REPEAT'&&g.story?.beat==='review')return {...g,phase:'manage',story:{...g.story,beat:'adjust',comparison:g.report},layoffPreview:false,message:''};
 if(a.type==='STORY_EXPAND'&&(g.story?.beat==='expand'||g.campaign?.beat==='expand')||a.type==='EXPAND_STREET'&&managed){
  // Combine an actual purchase and an actual hire into one guided decision.
  // Failure leaves the original world intact, rather than a half-paid scene.
  const bought=streetReducer({...g,phase:'manage',story:undefined,campaign:undefined,tutorial:undefined},{type:'BUY_OVEN'});
  if(streetFirm(bought.world,'bakery').machines!==streetFirm(g.world,'bakery').machines+1)return {...g,message:bought.message};
  const hired=streetReducer(bought,{type:'HIRE'});
  if(!hired.report?.hired.length)return {...g,message:hired.message};
  const r=report(hired.world,bought.report!.transactions,streetFirm(g.world,'bakery').cash,0,true);r.hired=hired.report.hired;r.investment=bought.report!.investment;
  return bookAndBrief(g,{...g,world:hired.world,phase:a.type==='EXPAND_STREET'?'manage':'own',report:r,serial:g.serial+1,shifts:a.type==='EXPAND_STREET'?Math.min(streetFirm(hired.world,'bakery').workers.length,streetFirm(hired.world,'bakery').machines):3,...(g.story?{story:{...g.story,beat:'lead' as const}}:{}),...(g.campaign?{campaign:{...g.campaign,beat:'lead' as const}}:{}),message:r.investment+'枚付给烤炉厂。一位街上的待业者来当厨师，下一轮开始领工资。'},true);
 }
 if(a.type==='STORY_COMPETE'&&(g.story?.beat==='rival'||g.campaign?.beat==='rival')){
  const w=structuredClone(g.world),rival=streetFirm(w,'rival'),maker=streetFirm(w,'ovens'),person=w.people.find(p=>!p.job&&!p.owner),cost=maker.price*2;
  if(!person||!maker.stock||rival.cash<cost+rival.wage*(rival.workers.length+1)*3)return {...g,message:'邻店还没凑齐人手、烤炉和工资准备金。先去自由经营看看账本。'};
  const tx:StreetTransfer[]=[];pay(rival,maker,cost,'new-oven',tx,1);maker.stock--;maker.sold++;
  rival.ovenCapacities=[...Array.from({length:rival.machines},(_,i)=>rival.ovenCapacities?.[i]??6),12];rival.machines++;rival.ovenAges.push(0);person.job='rival';rival.workers.push(person.id);
  assertStreetWorld(w);const r=report(w,tx,streetFirm(g.world,'bakery').cash,0,true);r.hired=[person.id];
  return {...g,world:w,phase:'neighbors',report:r,serial:g.serial+1,...(g.story?{story:{...g.story,beat:'pressure' as const}}:{}),...(g.campaign?{campaign:{...g.campaign,beat:'others' as const}}:{}),message:'邻店花'+cost/100+'枚买了更快的炉，又招了一位街上的待业者。全街仍是'+w.people.length+'人。'};
 }
 if(a.type==='OTHERS_FOLLOW'&&g.campaign?.beat==='others'||a.type==='FOLLOW_EXPANSION'&&managed){
  const w=structuredClone(g.world),supplier=streetFirm(w,'inputs'),tx:StreetTransfer[]=[],decisions:FirmDecision[]=[],followed:Industry[]=[];
  if(a.type==='FOLLOW_EXPANSION'){
   const rival=streetFirm(w,'rival'),maker=streetFirm(w,'ovens'),person=w.people.find(p=>!p.job&&!p.owner),cost=maker.price*2;
   if(rival.machines<2&&person&&maker.stock&&rival.cash>=cost+rival.wage*(rival.workers.length+1)*3){
    pay(rival,maker,cost,'new-oven',tx,1);maker.stock--;maker.sold++;
    rival.ovenCapacities=[...Array.from({length:rival.machines},(_,i)=>rival.ovenCapacities?.[i]??6),12];rival.machines++;rival.ovenAges.push(0);person.job='rival';rival.workers.push(person.id);followed.push('rival');
    decisions.push({firm:'rival',kind:'expand',round:w.round,stock:rival.stock,oldValue:rival.machines-1,value:rival.machines,person:person.id,reason:'同行跟进的条件实验：自付快炉款与工资准备金，招用一位现有待业者。'});
   }
  }
  for(const id of ['clothes','cars','ovens'] as const){const f=streetFirm(w,id),candidate=w.people.find(p=>!p.job&&!p.owner),parts=16,cost=2400;
   const reserve=f.wage*(f.workers.length+(candidate?1:0));
   if(a.type==='FOLLOW_EXPANSION'&&f.machines>STREET_INITIAL_WORKERS[id])continue;
   if(f.machines>=4||f.cash<cost+reserve||supplier.stock<parts)continue;
   const old=f.machines;pay(f,supplier,cost,'equipment',tx,parts);supplier.stock-=parts;supplier.sold+=parts;f.machines++;f.ovenAges.push(0);
   if(candidate){candidate.job=id;f.workers.push(candidate.id);}else f.productivity=2;
   followed.push(id);decisions.push({firm:id,kind:'expand',round:w.round,stock:f.stock,oldValue:old,value:f.machines,reason:candidate?'购买设备材料与安装服务，招用街上的待业者。':'人手不足，购置省工设备，提高每人产量。',...(candidate?{person:candidate.id}:{})});
  }
  assertStreetWorld(w);const r=report(w,tx,streetFirm(g.world,'bakery').cash,0,true);r.firmDecisions=decisions;r.hired=decisions.flatMap(d=>d.person?[d.person]:[]);
  return {...g,world:w,phase:'manage',report:r,serial:g.serial+1,...(g.campaign?{campaign:{...g.campaign,beat:'pressure' as const,followed}}:{}),message:followed.length?'别家也添了设备。钱付给原料和仓储店。':'别家暂时付不起扩产的钱。'};
 }
 if(a.type==='CLOSE_SHOP'&&g.campaign?.beat==='insolvent'&&streetSolvency(g).shortfall>0){
  const w=structuredClone(g.world),f=streetFirm(w,'bakery'),buyer=streetFirm(w,'inputs'),tx:StreetTransfer[]=[],bid=streetSolvency(g).resale,dismissed=[...f.workers];
  pay(buyer,f,cents(bid),'liquidation',tx); // Zero bid still records asset disposal.
  for(const kind of ['rent','storage'] as const){const key=kind==='rent'?'rentDebt':'storageDebt',paid=Math.min(f[key]??0,Math.floor(f.cash/100));if(paid)pay(f,buyer,cents(paid),kind,tx);f[key]=(f[key]??0)-paid;}
  for(const id of dismissed)streetPerson(w,id).job=null;
  f.workers=[];f.machines=0;f.ovenAges=[];f.ovenCapacities=[];f.stock=0;f.inputs=0;f.working=0;f.produced=0;f.sold=0;w.batches=w.batches.filter(b=>b.firm!=='bakery');
  const r=report(w,tx,streetFirm(g.world,'bakery').cash,0,true);r.dismissed=dismissed;assertStreetWorld(w);
  return bookAndBrief(g,{...g,world:w,report:r,shifts:0,serial:g.serial+1,campaign:{...g.campaign,beat:'closed'},message:'设备变卖了，欠款还没还清。厨师的岗位没了。'},true);
 }
 if(a.type==='NEXT'){
  const next:Partial<Record<StreetPhase,StreetPhase>>={own:'neighbors',neighbors:'manage',social:'private',private:'overproduction',overproduction:'limits'};
  if(g.phase==='own'&&!g.report)return g;
  return next[g.phase]?{...g,phase:next[g.phase]!,message:'',layoffPreview:false}:g;
 }
 if(a.type==='MANAGE')return {...g,phase:'manage',message:''};
 if(a.type==='EXPLAIN')return g.report?{...g,phase:'social',layoffPreview:false,message:''}:g;
 if(a.type==='CANCEL_LAYOFF')return {...g,layoffPreview:false};
 if(a.type==='RETRY'&&g.checkpoint){const {storyCheckpoint,campaignCheckpoint,...rest}=g;return {...rest,...(storyCheckpoint?{story:structuredClone(storyCheckpoint)}:{}),...(campaignCheckpoint?{campaign:structuredClone(campaignCheckpoint)}:{}),...(g.booksCheckpoint?{books:structuredClone(g.booksCheckpoint)}:{}),phase:explaining?'manage':g.phase,world:structuredClone(g.checkpoint),report:null,checkpoint:null,serial:g.serial+1,message:'回到上一轮开门前。改一个条件再试；这不是现实中的撤销。',history:g.history.slice(0,-1)};}
 if(explaining)return g;
 if(a.type==='WAGE'&&[-1,1].includes(a.delta)){const wage=Math.max(3,Math.min(7,g.wage+a.delta));return {...g,wage,price:Math.min(g.price,wage),message:g.price>wage?'工资降到'+wage+'枚，面包售价也降到'+wage+'枚。面包不能比一天厨师工资更贵。':''};}
 if(a.type==='PRICE'&&[-1,1].includes(a.delta))return {...g,price:Math.max(1,Math.min(4,g.wage,g.price+a.delta)),message:''};
 const f=streetFirm(g.world,'bakery');
 if(a.type==='SHIFTS'&&managed&&[-1,1].includes(a.delta))return {...g,shifts:Math.max(0,Math.min(f.workers.length,f.machines,g.shifts+a.delta)),message:'按班次付工资：少排一班，这轮少领一份。岗位仍保留。'};
 if(a.type==='RESPONSE'&&['neighbors','manage'].includes(g.phase)&&['none','rival','some','all','cut'].includes(a.value))return {...g,response:a.value,message:''};
 if(a.type==='ROUND'&&Number.isInteger(a.expectedRound)&&a.expectedRound===g.world.round){
  const rivalPolicy=streetFirm(g.world,'rival').rivalPolicy;
  const observeRival=g.report?.rivalDecision?.kind==='wage-cut'||Boolean(rivalPolicy?.pressureDays&&!rivalPolicy?.laidOff)||!g.report&&rivalPolicy?.cutRound===g.world.round&&!rivalPolicy?.laidOff;
  if(g.story&&(['expand','rival'].includes(g.story.beat)||g.story.beat==='review'&&!observeRival))return g;
  if(g.campaign&&['expand','rival','others'].includes(g.campaign.beat))return g;
  if(g.world.round>=48)return {...g,message:'已营业48轮。回看这条街，或重试上一轮。'};
  const result=runStreetPeriod(g);if('blocked' in result)return {...g,message:result.blocked};
  const beats:Partial<Record<StreetStory['beat'],StreetStory['beat']>>={opening:'expand',lead:'rival',pressure:'adjust',adjust:'layoff',layoff:'review'};
  const story=g.story?{...g.story,beat:g.story.beat==='pressure'&&g.story.pressureRounds===0?'pressure':beats[g.story.beat]??g.story.beat,pressureRounds:g.story.pressureRounds+(g.story.beat==='pressure'?1:0),comparison:g.story.beat==='pressure'?result.report:g.story.comparison,dismissed:[...new Set([...g.story.dismissed,...result.report.dismissed])]}:undefined;
  return bookAndBrief(g,{...g,world:result.world,checkpoint:structuredClone(g.world),report:result.report,phase:g.campaign?'manage':story&&['adjust','layoff','review'].includes(story.beat)?'manage':g.phase==='intro'?'own':g.phase,...(story?{story,storyCheckpoint:structuredClone(g.story!)}:{}),serial:g.serial+1,message:'',history:[...g.history,result.report].slice(-12)});
 }
 if(a.type==='PREVIEW_LAYOFF'&&managed)return {...g,layoffPreview:true,message:''};
 if(!managed||!['BUY_OVEN','HIRE','LAYOFF','OTHER_LAYOFFS'].includes(a.type))return g;
 const w=structuredClone(g.world),ours=streetFirm(w,'bakery'),tx:StreetTransfer[]=[],cashStart=ours.cash;
 const r=report(w,tx,cashStart,0,true);
 if(a.type==='BUY_OVEN'){
  const maker=streetFirm(w,'ovens');
  if(ours.machines>=4)return {...g,message:'小街区最多放4台炉。先看看现在的炉有没有闲着。'};
  if(!maker.stock)return {...g,message:'烤炉厂还没货。先营业一轮，等他们开工。'};
  if(ours.cash<maker.price+ours.wage*ours.workers.length*3)return {...g,message:'买炉后还要留三轮工资。这笔钱暂时不够。'};
  pay(ours,maker,maker.price,'new-oven',tx,1);maker.stock--;maker.sold++;if(ours.ovenCapacities)ours.ovenCapacities.push(6);ours.machines++;ours.ovenAges.push(0);r.investment=maker.price/100;
 }else if(a.type==='HIRE'){
  const person=w.people.find(p=>!p.job&&!p.owner&&p.id.startsWith('bakery-'))||w.people.find(p=>!p.job&&!p.owner);
  if(ours.workers.length>=ours.machines)return {...g,message:'先准备一台空闲的炉，再招一位厨师。'};
  if(!person)return {...g,message:'街上暂时没有待业的人。招聘不会凭空添人。'};
  if(ours.cash<cents(g.wage)*(ours.workers.length+1)*3)return {...g,message:'招聘需要留够三轮工资；工资要从店里余额支付。'};
  person.job='bakery';ours.workers.push(person.id);r.hired.push(person.id);
 }else{
  if(a.type==='LAYOFF'&&!g.layoffPreview)return g;
  const targets=a.type==='OTHER_LAYOFFS'?w.firms.filter(f=>['rival','clothes'].includes(f.id)):[ours];
  for(const f of targets){if(!f.workers.length||f.cash<500||f.id==='rival'&&f.rivalPolicy?.laidOff)continue;const id=(a.type==='OTHER_LAYOFFS'?f.workers.shift():f.workers.pop())!,p=streetPerson(w,id);pay(f,p,500,'severance',tx);p.job=null;r.dismissed.push(id);if(f.id==='rival')f.rivalPolicy={...f.rivalPolicy,pressureDays:f.rivalPolicy?.pressureDays??0,laidOff:true};}
  if(!r.dismissed.length)return {...g,message:'没有可解除的岗位，或现金不足以支付5枚安置款。',layoffPreview:false};
 }
 assertStreetWorld(w);r.cash=ours.cash/100;r.cashChange=(ours.cash-cashStart)/100;
 return bookAndBrief(g,{...g,world:w,report:r,serial:g.serial+1,shifts:Math.min(ours.workers.length,ours.machines),layoffPreview:false,...(g.story?{story:{...g.story,dismissed:[...new Set([...g.story.dismissed,...r.dismissed])],neighborCuts:g.story.neighborCuts||a.type==='OTHER_LAYOFFS'}}:{}),message:a.type==='HIRE'?'人手已到岗，下一轮开工。':a.type==='BUY_OVEN'?r.investment+'枚付给了烤炉厂。炉到了；人手要另招。':'岗位解除了，积蓄和安置款还在。下一轮不再领这家的工资。'},true);
}
export function assertStreetWorld(w:StreetWorld,legacyPrices=false){
 if(!Number.isSafeInteger(w.round)||w.round<0||w.round>48||w.firms.length!==6||!Number.isSafeInteger(w.initialMoney)||streetMoney(w)!==w.initialMoney)throw new Error('Invalid street money/round');
 if(w.rentPerDay!==undefined&&(!Number.isInteger(w.rentPerDay)||w.rentPerDay<0||w.rentPerDay>10))throw new Error('Invalid rent');
 if(new Set(w.firms.map(f=>f.id)).size!==6||!INDUSTRIES.every(id=>w.firms.some(f=>f.id===id)))throw new Error('Missing firm');
 if(![15,20].includes(w.people.length)||new Set(w.people.map(p=>p.id)).size!==w.people.length)throw new Error('Invalid population');
 const initialWorkers=w.people.length===15?LEGACY_WORKERS:STREET_INITIAL_WORKERS,initialWaiting=w.people.length===15?2:STREET_INITIAL_WAITING;
 const expectedIds=INDUSTRIES.flatMap(id=>[id+'-owner',...Array.from({length:initialWorkers[id]},(_,i)=>id+'-'+i)]).concat(Array.from({length:initialWaiting},(_,i)=>'available-'+i));
 if(!expectedIds.every(id=>w.people.some(p=>p.id===id))||w.batches.length>16)throw new Error('Invalid identities/batches');
 for(const x of [...w.firms,...w.people])if(!Number.isSafeInteger(x.cash)||x.cash<0)throw new Error('Invalid cash');
 for(const f of w.firms){
  if(f.storageDebt!==undefined&&(!Number.isSafeInteger(f.storageDebt)||f.storageDebt<0))throw new Error('Invalid storage debt');
  if(f.rentDebt!==undefined&&(!Number.isSafeInteger(f.rentDebt)||f.rentDebt<0)||f.productivity!==undefined&&(!['clothes','cars','ovens'].includes(f.id)||f.productivity!==2))throw new Error('Invalid campaign factory');
  if(f.rivalPolicy){const p=f.rivalPolicy;if(f.id!=='rival'||!Number.isInteger(p.pressureDays)||p.pressureDays<0||p.pressureDays>48||(p.cutRound===undefined)!==(p.cutWage===undefined)||p.cutRound!==undefined&&(!Number.isInteger(p.cutRound)||p.cutRound<1||p.cutRound>w.round)||p.cutWage!==undefined&&(!Number.isInteger(p.cutWage)||p.cutWage<300||p.cutWage>600||p.cutWage%100!==0)||p.laidOff!==undefined&&typeof p.laidOff!=='boolean')throw new Error('Invalid rival policy');}
  if(f.firmPolicy){const p=f.firmPolicy;if(f.id==='bakery'||![p.pressureDays,p.clearDays].every(n=>Number.isInteger(n)&&n>=0&&n<=48)||(p.lastActionRound===undefined)!==(p.lastKind===undefined)||p.lastActionRound!==undefined&&(!Number.isInteger(p.lastActionRound)||p.lastActionRound<1||p.lastActionRound>w.round)||p.lastKind!==undefined&&!['price-cut','wage-cut','layoff','hire','wage-rise'].includes(p.lastKind)||p.wageCeiling!==undefined&&(!Number.isInteger(p.wageCeiling)||p.wageCeiling%100!==0||p.wageCeiling<300||p.wageCeiling>700))throw new Error('Invalid firm policy');}
  if(f.ovenCapacities&&(!['bakery','rival'].includes(f.id)||f.ovenCapacities.length!==f.machines||f.ovenCapacities.some(q=>![6,12].includes(q))))throw new Error('Invalid oven capacities');
  if(!Number.isInteger(f.stock)||f.stock<0||!Number.isInteger(f.inputs)||f.inputs<0||!Number.isInteger(f.machines)||f.machines<0||f.machines>4||f.ovenAges.length!==f.machines||f.ovenAges.some(a=>!Number.isInteger(a)||a<0||a>12)||!Number.isInteger(f.wage)||f.wage<300||f.wage>700||!Number.isInteger(f.price)||f.price<=0||!legacyPrices&&f.price%100!==0||![f.working,f.produced,f.sold].every(n=>Number.isInteger(n)&&n>=0)||f.working>4)throw new Error('Invalid factory');
  if(new Set(f.workers).size!==f.workers.length||f.workers.some(id=>streetPerson(w,id)?.job!==f.id))throw new Error('Invalid jobs');
 }
 for(const p of w.people)if(p.job&&!streetFirm(w,p.job)?.workers.includes(p.id)||p.owner&&!INDUSTRIES.includes(p.owner)||p.owner&&p.job||p.owner&&p.id!==p.owner+'-owner'||p.id.endsWith('-owner')&&!p.owner||![p.clothesAge,p.carAge,p.bread].every(n=>Number.isInteger(n)&&n>=0))throw new Error('Invalid person');
 for(const p of w.people)if(p.shopping){const s=p.shopping;
  if(!Number.isInteger(s.round)||s.round<1||s.round>Math.max(1,w.round)||!Number.isSafeInteger(s.cashBefore)||s.cashBefore<0||!Array.isArray(s.items)||s.items.length<1||s.items.length>3||s.items[0].kind!=='bread'||s.items[0].probability!==1||new Set(s.items.map(i=>i.kind)).size!==s.items.length||s.items.some(i=>!['bread','clothes','car'].includes(i.kind)||!Number.isSafeInteger(i.price)||i.price<=0||!Number.isFinite(i.probability)||i.probability<=0||i.probability>1||!['planned','bought','money','stock'].includes(i.outcome)||!Number.isInteger(i.quantity)||i.quantity<0||i.outcome==='bought'&&i.quantity<1||i.outcome!=='bought'&&i.quantity!==0||i.wantedQuantity!==undefined&&(i.kind!=='bread'||!Number.isInteger(i.wantedQuantity)||i.wantedQuantity<1||i.wantedQuantity>3||i.quantity>i.wantedQuantity)))throw new Error('Invalid shopping plan');
 }
 for(const b of w.batches)if(!['bakery','rival'].includes(b.firm)||!Number.isInteger(b.quantity)||b.quantity<0||!Number.isInteger(b.round)||b.round<0||b.round>w.round)throw new Error('Invalid batch');
 for(const id of ['bakery','rival'] as const)if(w.batches.filter(b=>b.firm===id).reduce((n,b)=>n+b.quantity,0)!==streetFirm(w,id).stock)throw new Error('Bread accounting failed');
}
/** Only the finite teaching street is playable. Retired populations or corrupt
 * street data restart ONLY this act; surrounding chapter choices survive. */
export function restoreStreetGame(value:unknown,wage=5):StreetGame{
 try{
  const g=value as StreetGame;
  if(!g||![1,2,3,4,5,6,7,8,9,10,11,12,STREET_VERSION].includes(g.version)||!['intro','own','neighbors','manage','social','private','overproduction','limits'].includes(g.phase)||!Number.isInteger(g.wage)||g.wage<3||g.wage>7||!Number.isFinite(g.price)||g.price<1||g.price>4||(g.version===1?g.price*2%1:!Number.isInteger(g.price))||!Number.isInteger(g.shifts)||g.shifts<0||g.shifts>4||!['none','rival','some','all','cut'].includes(g.response)||!Number.isSafeInteger(g.serial)||g.serial<0||typeof g.message!=='string'||typeof g.layoffPreview!=='boolean'||!Array.isArray(g.history)||g.history.length>12)throw new Error('Bad game');
  for(const c of [g.campaign,g.campaignCheckpoint].filter(Boolean) as StreetCampaign[]){if(!CAMPAIGN_BEATS.includes(c.beat)||!Array.isArray(c.followed)||new Set(c.followed).size!==c.followed.length||c.followed.some(id=>!['clothes','cars','ovens'].includes(id))||![c.attempts,c.pressureDays].every(n=>Number.isInteger(n)&&n>=0&&n<=48)||c.solvency&&Object.values(c.solvency).some(n=>!Number.isInteger(n)||n<0))throw new Error('Bad campaign');}
  if(g.campaign&&(g.story||!g.books||!g.tutorial||g.world.rentPerDay!==4)||g.campaignCheckpoint&&!g.campaign)throw new Error('Incomplete campaign');
  for(const s of [g.story,g.storyCheckpoint].filter(Boolean) as StreetStory[])if(!STREET_STORY_BEATS.includes(s.beat)||!Array.isArray(s.dismissed)||s.dismissed.some(id=>!g.world.people.some(p=>p.id===id))||typeof s.neighborCuts!=='boolean'||!Number.isInteger(s.pressureRounds)||s.pressureRounds<0||s.pressureRounds>2||s.comparison&&(!Number.isInteger(s.comparison.round)||!Number.isFinite(s.comparison.stock)))throw new Error('Bad story');
  if(g.storyCheckpoint&&!g.story)throw new Error('Orphan story checkpoint');
  assertStreetWorld(g.world,g.version===1);if(g.checkpoint)assertStreetWorld(g.checkpoint,g.version===1);
  for(const b of [g.books,g.booksCheckpoint].filter(Boolean) as BakeryBooks[]){if(!Array.isArray(b.ovens)||b.ovens.length>4||![b.stockValue,b.inputValue,...b.ovens.flatMap(o=>[o.cost,o.value])].every(n=>Number.isSafeInteger(n)&&n>=0)||b.ovens.some(o=>o.value>o.cost))throw new Error('Bad books');}
  if(g.books&&(g.books.ovens.length!==streetFirm(g.world,'bakery').machines||!streetFirm(g.world,'bakery').stock&&g.books.stockValue||!streetFirm(g.world,'bakery').inputs&&g.books.inputValue))throw new Error('Books disagree with world');
  if(g.tutorial){const ids=['first-day','first-oven','first-stock'];if(!Array.isArray(g.tutorial.seen)||g.tutorial.seen.length>3||new Set(g.tutorial.seen).size!==g.tutorial.seen.length||g.tutorial.seen.some(id=>!ids.includes(id))||!Array.isArray(g.tutorial.pending)||g.tutorial.pending.length>3||new Set(g.tutorial.pending.map(n=>n.id)).size!==g.tutorial.pending.length||g.tutorial.pending.some(n=>!ids.includes(n.id)||g.tutorial!.seen.includes(n.id)||!Number.isInteger(n.round)||n.round<0||n.round>g.world.round||!Array.isArray(n.rows)||n.rows.length>8||n.rows.some(row=>!Array.isArray(row)||row.length!==2||typeof row[0]!=='string'||row[0].length>80||!Number.isSafeInteger(row[1]))))throw new Error('Bad tutorial');}
  for(const r of [g.report,...g.history,g.story?.comparison,g.storyCheckpoint?.comparison].filter(Boolean) as StreetReport[]){if(!Array.isArray(r.transactions)||r.transactions.some(t=>!Number.isFinite(t.amount)||t.amount<0||!Number.isInteger(t.quantity)||t.quantity<0||typeof t.kind!=='string')||![r.cash,r.cashChange,r.produced,r.sold,r.stock,r.working,r.round].every(Number.isFinite)||!Array.isArray(r.dismissed)||!Array.isArray(r.hired))throw new Error('Bad report');
   if(r.rivalDecision){const d=r.rivalDecision;if(!['wage-cut','layoff'].includes(d.kind)||!Number.isInteger(d.stock)||d.stock<0||![d.oldWage,d.wage].every(v=>Number.isInteger(v)&&v>=3&&v<=7)||d.kind==='wage-cut'&&d.oldWage-d.wage!==1||d.kind==='layoff'&&(!d.person||!g.world.people.some(p=>p.id===d.person)))throw new Error('Bad rival decision');}
   if(r.storageCharges&&(!Array.isArray(r.storageCharges)||r.storageCharges.some(c=>!INDUSTRIES.includes(c.firm)||![c.stock,c.due,c.paid].every(n=>Number.isInteger(n)&&n>=0)||c.paid>c.due||c.due<1)))throw new Error('Bad storage charge');
   if(r.firmDecisions){if(!Array.isArray(r.firmDecisions)||r.firmDecisions.length>5||new Set(r.firmDecisions.map(d=>d.firm)).size!==r.firmDecisions.length)throw new Error('Bad firm decisions');
    for(const d of r.firmDecisions){if(d.firm==='bakery'||!INDUSTRIES.includes(d.firm)||!['price-cut','wage-cut','layoff','hire','wage-rise','expand'].includes(d.kind)||d.round!==r.round||!Number.isInteger(d.round)||d.round<1||d.round>g.world.round||!Number.isInteger(d.stock)||d.stock<0||![d.oldValue,d.value].every(n=>Number.isSafeInteger(n)&&n>=0)||typeof d.reason!=='string'||d.reason.length>200)throw new Error('Bad firm decision');
     if(d.kind==='expand'&&(!['clothes','cars','ovens'].includes(d.firm)||d.value-d.oldValue!==1||d.value>4))throw new Error('Bad expansion');
     if(d.kind==='price-cut'&&(d.value<1||d.oldValue<=d.value)||['wage-cut','wage-rise'].includes(d.kind)&&(d.oldValue<3||d.oldValue>7||d.value<3||d.value>7||d.value-d.oldValue!==(d.kind==='wage-cut'?-1:1))||['layoff','hire'].includes(d.kind)&&(!d.person||!g.world.people.some(p=>p.id===d.person&&!p.owner)||d.oldValue>4||d.value>4||d.value-d.oldValue!==(d.kind==='layoff'?-1:1)))throw new Error('Bad firm adjustment');
    }
   }
  }
  const restored=structuredClone(g);restored.version=STREET_VERSION;
  // Refresh only an exact, unplayed v12 campaign opening. A paid day, an
  // investment or a custom wallet must retain its actual historical balances.
  if(g.version===12&&g.campaign?.beat==='opening'&&g.world.round===0&&!g.report&&!g.checkpoint&&!g.history.length&&!g.booksCheckpoint&&!g.campaignCheckpoint){
   const opening=createStreetCampaign(g.wage),previous=structuredClone(opening.world);
   const previousCash:Record<Industry,number>={bakery:72,rival:96,clothes:84,cars:180,ovens:144,inputs:48};
   for(const f of previous.firms)f.cash=cents(previousCash[f.id]);
   previous.initialMoney=streetMoney(previous);
   if(JSON.stringify(g.world)===JSON.stringify(previous)&&JSON.stringify(g.books)===JSON.stringify(opening.books)&&JSON.stringify(g.campaign)===JSON.stringify(opening.campaign)&&JSON.stringify(g.tutorial)===JSON.stringify(opening.tutorial)){
    restored.world=opening.world;restored.serial++;
   }
  }
  // Retire the UI's forced wage-copy experiment, without touching accounts.
  if(g.version<9)restored.response='none';
  // Update only the untouched v6 opening preset. Never rewrite a completed
  // day, an investment, a custom wallet, or an old fractional-money fixture.
  if(g.version===6&&g.world.round===0&&!g.report&&!g.checkpoint&&!g.history.length&&g.world.initialMoney===162900&&g.world.people.every((p,i)=>p.cash===(p.owner?1200:p.job?cents(12+i%5*3):0))&&g.world.firms.every(f=>f.cash===24000&&f.workers.length===LEGACY_WORKERS[f.id]&&f.machines===f.workers.length&&f.produced===0&&f.sold===0&&f.inputs===0&&f.stock===(f.id==='inputs'?64:0))){
   restored.world=createStreetGame(g.wage).world;restored.serial++;
  }
  // Add the five new residents to old played streets with zero cash and no
  // job. Do not retrospectively create wages, products, fees or purchasing power.
  // A new entrance gets the new staffed 20-person opening. Preserve checkpoints.
  for(const w of [restored.world,restored.checkpoint].filter(Boolean) as StreetWorld[]){if(w.people.length===15){
   const ids=INDUSTRIES.flatMap(id=>Array.from({length:STREET_INITIAL_WORKERS[id]},(_,i)=>id+'-'+i)).concat(Array.from({length:STREET_INITIAL_WAITING},(_,i)=>'available-'+i));
   for(const id of ids)if(!w.people.some(p=>p.id===id))w.people.push({id,cash:0,job:null,owner:null,clothesAge:4,carAge:16,bread:0,shopping:createShoppingPlan(id,Math.max(1,w.round),0,{bread:Math.min(streetFirm(w,'bakery').price,streetFirm(w,'rival').price),clothes:streetFirm(w,'clothes').price,car:streetFirm(w,'cars').price})});
   assertStreetWorld(w);
  }}
  if(g.version===1){
   restored.version=STREET_VERSION;restored.price=Math.round(restored.price);
   for(const w of [restored.world,restored.checkpoint].filter(Boolean) as StreetWorld[]){for(const f of w.firms)f.price=f.id==='inputs'?100:Math.max(100,Math.round(f.price/100)*100);}
   // Keep historical cash, completed purchases and intentions exact. Only
   // future quotes change; pre-opening plans can safely use the new prices.
   if(restored.world.round===0)for(const p of restored.world.people)p.shopping=createShoppingPlan(p.id,1,p.cash,{bread:Math.min(cents(restored.price),streetFirm(restored.world,'rival').price),clothes:streetFirm(restored.world,'clothes').price,car:streetFirm(restored.world,'cars').price});
  }
  for(const w of [restored.world,restored.checkpoint].filter(Boolean) as StreetWorld[])if(w.firms.some(f=>f.price%100))throw new Error('Fractional current price');
  restored.price=Math.min(restored.price,restored.wage);
  return restored;
 }catch{return createStreetStory(wage);}
}
