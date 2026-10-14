/** Offline price/wage calibration, NOT the shipped game or a macro forecast.
 * Five sectors exchange finite cash. Inputs, credit, taxes, imports and a labour
 * value account are omitted. Cash changes are NOT profit or surplus-value.
 */
export type Sector = 'bakery' | 'rival' | 'clothes' | 'cars' | 'ovens';
export type Policy = {
  wage?: number; breadPrice?: number; imitation?: boolean;
  expand?: boolean; rivalExpand?: boolean;
  layoffAt?: number; layoffs?: number; otherLayoffs?: boolean;
  severance?: number; rehire?: boolean;
};
type Firm = {id:Sector;cash:number;wage:number;price:number;machines:number;ovenAges:number[];workers:string[];stock:number;cashStart:number;produced:number;sold:number;paid:number};
type Buyer = {id:string;cash:number;job:Sector|null;owner:Sector|null;clothesAge:number;carAge:number;bread:number};
export type StreetState = {round:number;firms:Firm[];buyers:Buyer[];breadBatches:{firm:Sector;round:number;quantity:number}[];initialMoney:number};
export const STREET_PRICES = {bread:2.5,clothes:8,cars:40,ovens:24} as const;
const cents=(n:number)=>Math.round(n*100);
const coins=(n:number)=>n/100;
const firmOf=(s:StreetState,id:Sector)=>s.firms.find(f=>f.id===id)!;
const buyerOf=(s:StreetState,id:string)=>s.buyers.find(b=>b.id===id)!;
export const moneyTotal=(s:StreetState)=>s.firms.reduce((n,f)=>n+f.cash,0)+s.buyers.reduce((n,b)=>n+b.cash,0);
const units=(f:Firm,active:number)=>f.id==='bakery'||f.id==='rival'?Math.min(active,f.machines)*6:f.id==='clothes'?active:f.id==='cars'?Math.floor(active/2):Math.floor(active/3);
export function createStreet():StreetState{
  const specs:[Sector,number,number,number][]=[['bakery',2,5,2.5],['rival',2,4,2.5],['clothes',4,6,8],['cars',2,7,40],['ovens',3,5,24]];
  const buyers:Buyer[]=[],firms:Firm[]=[];
  for(const [id,count,wage,price] of specs){
    const workers:string[]=[];
    for(let i=0;i<count;i++){const name=id+'-'+i;workers.push(name);buyers.push({id:name,cash:cents(12+(buyers.length%5)*3),job:id,owner:null,clothesAge:buyers.length%4,carAge:buyers.length%16,bread:0});}
    buyers.push({id:id+'-owner',cash:cents(12),job:null,owner:id,clothesAge:2,carAge:8,bread:0});
    firms.push({id,cash:cents(240),wage:cents(wage),price:cents(price),machines:count,ovenAges:Array(count).fill(0),workers,stock:0,cashStart:0,produced:0,sold:0,paid:0});
  }
  for(let i=0;i<8;i++)buyers.push({id:'available-'+i,cash:0,job:null,owner:null,clothesAge:4,carAge:16,bread:0});
  const s:StreetState={round:0,firms,buyers,breadBatches:[],initialMoney:0};s.initialMoney=moneyTotal(s);return s;
}
export function streetRound(previous:StreetState,policy:Policy={}){
  for(const key of ['imitation','expand','rivalExpand','otherLayoffs','rehire'] as const)if(policy[key]!==undefined&&typeof policy[key]!=='boolean')throw new TypeError('Invalid '+key);
  const wage=policy.wage??5,price=policy.breadPrice??STREET_PRICES.bread;
  if(!Number.isInteger(wage)||wage<3||wage>7)throw new RangeError('Wage must be an integer from 3 to 7');
  if(!Number.isFinite(price)||price<1||price>4||price*2%1!==0)throw new RangeError('Price must be 1–4 in half-coin steps');
  if(policy.layoffs!==undefined&&(!Number.isInteger(policy.layoffs)||policy.layoffs<0||policy.layoffs>4))throw new RangeError('Invalid layoff count');
  if(policy.layoffAt!==undefined&&(!Number.isInteger(policy.layoffAt)||policy.layoffAt<1))throw new RangeError('Invalid layoff round');
  if(policy.severance!==undefined&&(!Number.isInteger(policy.severance)||policy.severance<0||policy.severance>12))throw new RangeError('Invalid severance');
  const s:StreetState=structuredClone(previous);s.round++;
  const transactions:{from:string;to:string;amount:number;kind:string;quantity:number}[]=[];
  function transfer(from:Firm|Buyer,to:Firm|Buyer,amount:number,kind:string,quantity=0){
    if(!Number.isInteger(amount)||amount<0||from.cash<amount)throw new Error('Unfunded transfer');
    from.cash-=amount;to.cash+=amount;transactions.push({from:from.id,to:to.id,amount:coins(amount),kind,quantity});
  }
  const ours=firmOf(s,'bakery'),rival=firmOf(s,'rival');ours.wage=cents(wage);ours.price=cents(price);
  if(policy.imitation){const original:{[K in Sector]:number}={bakery:5,rival:4,clothes:6,cars:7,ovens:5};for(const f of s.firms)if(f!==ours)f.wage=cents(Math.max(3,Math.min(7,Math.round(original[f.id]*wage/5))));}
  for(const f of s.firms){f.cashStart=f.cash;f.produced=0;f.sold=0;f.paid=0;}
  let dismissed=0;
  if(s.round===policy.layoffAt){for(const f of s.firms.filter(f=>f===ours||policy.otherLayoffs)){
    const severance=cents(policy.severance??5);
    const count=Math.min(policy.layoffs??1,f.workers.length,severance?Math.floor(f.cash/severance):f.workers.length);
    const ids=f.workers.splice(f.workers.length-count,count);for(const id of ids){const b=buyerOf(s,id);transfer(f,b,severance,'severance');b.job=null;}dismissed+=ids.length;
  }}
  // Bread has a three-round shelf life. Expiry is recorded, not a sale.
  let spoiled=0;
  s.breadBatches=s.breadBatches.filter(batch=>{if(s.round-batch.round<3)return true;firmOf(s,batch.firm).stock-=batch.quantity;spoiled+=batch.quantity;return false;});
  for(const b of s.buyers){b.bread=0;b.clothesAge++;b.carAge++;}
  for(const f of s.firms){
    // Durable manufacturers schedule batches against a finite stock target;
    // idle shifts are not dismissals. Bread production is the player's choice.
    const target=f.id==='clothes'?4:2;
    const desired=f.id==='bakery'||f.id==='rival'?f.workers.length:f.stock>=target?0:f.id==='clothes'?Math.min(f.workers.length,target-f.stock):f.workers.length;
    const usable=f.id==='bakery'||f.id==='rival'?f.ovenAges.filter(age=>age<12).length:f.workers.length;
    const active=Math.min(desired,usable,Math.floor(f.cash/f.wage));
    for(const id of f.workers.slice(0,active)){transfer(f,buyerOf(s,id),f.wage,'wage');f.paid++;}
    f.produced=units(f,active);f.stock+=f.produced;
    if(f.id==='bakery'||f.id==='rival'){let used=0;f.ovenAges=f.ovenAges.map(age=>age<12&&used++<active?age+1:age);}
    if(f.id==='bakery'||f.id==='rival')s.breadBatches.push({firm:f.id,round:s.round,quantity:f.produced});
    const allowance=Math.min(cents(6),Math.max(0,Math.floor((f.cash-f.workers.length*f.wage*3)*.025)));
    transfer(f,buyerOf(s,f.id+'-owner'),allowance,'owner-consumption-budget');
  }
  function purchase(b:Buyer,f:Firm,kind:string){
    if(f.stock<1||b.cash<f.price)return false;
    transfer(b,f,f.price,kind,1);f.stock--;f.sold++;
    if(f.id==='bakery'||f.id==='rival'){const batch=s.breadBatches.find(batch=>batch.firm===f.id&&batch.quantity>0)!;batch.quantity--;b.bread++;}
    return true;
  }
  // Rotate arrival order: no permanent first customer or tie-break advantage.
  const offset=s.round%s.buyers.length,customers=[...s.buyers.slice(offset),...s.buyers.slice(0,offset)];
  let breadTurn=s.round;
  function buyBread(b:Buyer){
    const turn=breadTurn++;
    const choices=[ours,rival].sort((a,b)=>a.price-b.price||(turn%2?a.id.localeCompare(b.id):b.id.localeCompare(a.id)));
    return choices.some(f=>purchase(b,f,'bread'));
  }
  for(const b of customers){
    buyBread(b);
    if(b.clothesAge>=4&&purchase(b,firmOf(s,'clothes'),'clothes'))b.clothesAge=0;
    if(b.carAge>=16&&b.cash>=firmOf(s,'cars').price+cents(5)&&purchase(b,firmOf(s,'cars'),'car'))b.carAge=0;
  }
  for(const b of customers){
    // A finite household appetite, not an infinite demand curve.
    const maximum=b.owner?2:2+(Number(b.id.slice(-1))%3===0?1:0);
    while(b.bread<maximum&&b.cash>=Math.min(ours.price,rival.price)&&buyBread(b)){}
  }
  let investments=0,replacements=0,hires=0;
  for(const f of [ours,rival]){
    const requested=f===ours?policy.expand:policy.rivalExpand;
    const maker=firmOf(s,'ovens');
    const worn=f.ovenAges.findIndex(age=>age>=12);
    if(worn>=0&&maker.stock>0&&f.cash>=maker.price+f.wage*f.workers.length*3){
      transfer(f,maker,maker.price,'replacement-oven',1);maker.stock--;maker.sold++;f.ovenAges[worn]=0;replacements++;
    }
    const available=s.buyers.find(b=>!b.job&&!b.owner);
    if(policy.rehire&&s.round!==policy.layoffAt&&available&&f.workers.length<f.machines&&f.cash>=f.wage*(f.workers.length+1)*3){
      f.workers.push(available.id);available.job=f.id;hires++;continue;
    }
    // Expansion is a funded choice, not an automatic growth script.
    if(requested&&available&&f.machines<4&&maker.stock>0&&f.cash>=maker.price+f.wage*(f.workers.length+1)*3){
      transfer(f,maker,maker.price,'new-oven',1);maker.stock--;maker.sold++;f.machines++;f.ovenAges.push(0);f.workers.push(available.id);available.job=f.id;investments++;hires++;
    }
  }
  if(moneyTotal(s)!==s.initialMoney)throw new Error('Cash conservation failed');
  for(const a of [...s.firms,...s.buyers])if(a.cash<0||!Number.isInteger(a.cash))throw new Error('Invalid cash');
  for(const f of s.firms)if(f.stock<0||!Number.isInteger(f.stock))throw new Error('Invalid stock');
  for(const id of ['bakery','rival'] as const)if(s.breadBatches.filter(b=>b.firm===id).reduce((n,b)=>n+b.quantity,0)!==firmOf(s,id).stock)throw new Error('Inventory mismatch');
  const bakeries=[ours,rival];
  return {state:s,round:s.round,transactions,report:{
    produced:bakeries.reduce((n,f)=>n+f.produced,0),sold:bakeries.reduce((n,f)=>n+f.sold,0),stock:bakeries.reduce((n,f)=>n+f.stock,0),spoiled,
    working:s.firms.reduce((n,f)=>n+f.paid,0),employed:s.firms.reduce((n,f)=>n+f.workers.length,0),dismissed,hires,investments,replacements,
    wageBill:transactions.filter(t=>t.kind==='wage').reduce((n,t)=>n+t.amount,0),ours:{cash:coins(ours.cash),cashChange:coins(ours.cash-ours.cashStart),produced:ours.produced,sold:ours.sold,stock:ours.stock,workers:ours.workers.length,machines:ours.machines},
  }};
}
export function simulateStreet(policy:Policy={},rounds=24){
  if(!Number.isInteger(rounds)||rounds<1||rounds>96)throw new RangeError('Rounds must be 1–96');
  let s=createStreet();const history:ReturnType<typeof streetRound>['report'][]=[];
  for(let i=0;i<rounds;i++){const result=streetRound(s,policy);s=result.state;history.push(result.report);}
  return {state:s,history};
}
