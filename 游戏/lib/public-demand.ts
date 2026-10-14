/** Two dated periods with finite cash, optional credit and actual deliveries.
 * Income uses employer cash in legacy records, the shared public budget in new
 * records. Loans transfer lender cash; privately owned equipment is paid once.
 * A purchase order is not a payment. Unpaid debt is not negative cash. */
export type IncomeSlot={person:number;day:1|2};
export type DemandDelivery={day:1|2;person:number;bread:string};
export type DemandTrial={loans:boolean[];income:(IncomeSlot|null)[];deliveries:DemandDelivery[];sharedBudget?:true;machine?:boolean};
export type PublicDemand={phase:'intro'|'lab'|'conclusion';step:'fund'|'repay'|'deliver'|'result';day:1|2;loans:boolean[];income:(IncomeSlot|null)[];loanPaid:boolean[]|null;incomePaid:(IncomeSlot|null)[]|null;funded:0|1|2;reviewed:boolean[];orders:(string|null)[];deliveries:DemandDelivery[];run:DemandTrial|null;trials:DemandTrial[];revision:number;sharedBudget?:true;machineDraft?:boolean;machinePaid?:boolean|null};
export type DemandAction={type:'BEGIN'}|{type:'SHARED_BEGIN'}|{type:'MACHINE';enabled:boolean}|{type:'LOAN';person:number;enabled:boolean}|{type:'INCOME';roll:number;to:IncomeSlot|null}|{type:'INCOME_GROUP';people:number[];day:1|2;expectedRevision:number}|{type:'FUND';expectedRevision:number}|{type:'REPAY';person:number;expectedRevision:number}|{type:'SHOP';expectedRevision:number}|{type:'MATCH';bread:string;person:number|null}|{type:'DELIVER';person:number;expectedRevision:number}|{type:'DELIVER_BATCH';expectedRevision:number}|{type:'NEXT';expectedRevision:number}|{type:'RETRY'}|{type:'REPLAN';expectedRevision:number}|{type:'REPLAN_INCOME';roll:number;to:IncomeSlot;expectedRevision:number}|{type:'CONCLUDE'};
const person=(v:unknown):v is number=>Number.isInteger(v)&&Number(v)>=0&&Number(v)<6;
const bools=(v:unknown):v is boolean[]=>Array.isArray(v)&&v.length===6&&v.every(b=>typeof b==='boolean');
const slot=(v:unknown):v is IncomeSlot=>!!v&&typeof v==='object'&&person((v as IncomeSlot).person)&&[1,2].includes((v as IncomeSlot).day);
const incomeValid=(v:unknown):v is (IncomeSlot|null)[]=>Array.isArray(v)&&v.length===12&&v.every(x=>x===null||slot(x))&&[1,2].every(day=>Array.from({length:6},(_,i)=>v.filter(x=>x?.day===day&&x.person===i).length).every(n=>n<=2));
const deliveryValid=(v:unknown):v is DemandDelivery=>!!v&&typeof v==='object'&&[1,2].includes((v as DemandDelivery).day)&&person((v as DemandDelivery).person)&&typeof (v as DemandDelivery).bread==='string'&&/^[12]:(?:[0-9]|1[0-7])$/.test((v as DemandDelivery).bread);
const copyIncome=(v:(IncomeSlot|null)[])=>v.map(x=>x?{person:x.person,day:x.day}:null);
const trialCopy=(v:DemandTrial):DemandTrial=>({loans:v.loans.slice(),income:copyIncome(v.income),deliveries:v.deliveries.map(x=>({...x})),...(v.sharedBudget?{sharedBudget:true,machine:v.machine}:{} )});
const signature=(t:DemandTrial)=>JSON.stringify([!!t.sharedBudget,!!t.machine,t.loans,Array.from({length:6},(_,i)=>[1,2].map(day=>t.income.filter(x=>x?.person===i&&x.day===day).length)),t.deliveries.map(d=>[d.day,d.person]).sort((a,b)=>a[0]-b[0]||a[1]-b[1])]);
export function initialPublicDemand(shared=false):PublicDemand{return {phase:'intro',step:'fund',day:1,loans:Array(6).fill(false),income:Array(12).fill(null),loanPaid:null,incomePaid:null,funded:0,reviewed:Array(6).fill(false),orders:Array(6).fill(null),deliveries:[],run:null,trials:[],revision:0,...(shared?{sharedBudget:true,machineDraft:false,machinePaid:null}:{})};}
/** Replay only executed transfers. Draft income, unsigned loans and matching
 * an order never affect any wallet or remove a loaf from the inventory. */
function account(day:number,active:boolean,funded:number,loans:boolean[],income:(IncomeSlot|null)[],reviewed:boolean[],deliveries:DemandDelivery[],shared=false,machine=false){
 const balances:Record<string,number>={firm:40,publicFund:32,lender:40,employer:24,supplier:0};for(let i=0;i<6;i++)balances['person-'+i]=2;
 const debt=Array(6).fill(0),transfers:{day:number;from:string;to:string;amount:number;kind:string;bread?:string}[]=[],periods=[];
 const repayments:{person:number;amount:number;walletBefore:number;walletAfter:number;debtAfter:number}[]=[];
 let inventory:string[]=[];
 function pay(d:number,from:string,to:string,amount:number,kind:string,bread?:string){if(!Number.isInteger(amount)||amount<0||balances[from]<amount)throw new Error('Unfunded demand transfer');if(!amount)return;const before=balances[from];balances[from]-=amount;balances[to]+=amount;transfers.push({day:d,from,to,amount,kind,...(bread?{bread}:{})});if(kind==='repayment'){const person=Number(from.slice(7));repayments.push({person,amount,walletBefore:before,walletAfter:balances[from],debtAfter:debt[person]-amount});}}
 for(let d=1;active&&d<=day;d++){
  const opening=balances.firm,purchases=Array(6).fill(0),provided=Array(6).fill(0),repaid=Array(6).fill(0);
  // The first day's loaves already exist when the equipment is ordered.
  // Publicly funded equipment belongs to the private bakery and operates tomorrow.
  const produced=shared&&machine&&d===2?18:12;
  pay(d,'firm','supplier',produced/2,'inputs');for(let i=0;i<6;i++)pay(d,'firm','person-'+i,1,'wage');
  inventory.push(...Array.from({length:produced},(_,i)=>d+':'+i));
  if(funded>=d){
   if(shared&&machine&&d===1)pay(d,'publicFund','supplier',12,'equipment');
   income.forEach(x=>{if(x?.day===d)pay(d,shared?'publicFund':'employer','person-'+x.person,2,'income');});
   if(d===1)loans.forEach((yes,i)=>{if(yes){pay(d,'lender','person-'+i,2,'loan');debt[i]=3;}});
   if(d===2)loans.forEach((yes,i)=>{if(yes&&reviewed[i]){const n=Math.min(debt[i],balances['person-'+i]);pay(d,'person-'+i,'lender',n,'repayment');debt[i]-=n;repaid[i]=n;}});
   const shopping=d===1||loans.every((yes,i)=>!yes||reviewed[i]);
   if(shopping)for(let i=0;i<6;i++){
    const n=Math.min(2,Math.floor(balances['person-'+i]/2),inventory.length);purchases[i]=n;
    for(let j=0;j<n;j++){const bread=inventory.shift()!;pay(d,'person-'+i,'firm',2,'private-sale',bread);}
   }
   for(const delivery of deliveries.filter(x=>x.day===d)){
    if(!shopping||provided[delivery.person]||purchases[delivery.person]>=2||!inventory.includes(delivery.bread)||balances.publicFund<2)throw new Error('Invalid demand delivery');
    pay(d,'publicFund','firm',2,'public-sale',delivery.bread);inventory=inventory.filter(id=>id!==delivery.bread);provided[delivery.person]=1;
   }
  }else if(deliveries.some(x=>x.day===d))throw new Error('Delivery before funding');
  const privateSold=purchases.reduce((a,b)=>a+b,0),publicSold=provided.reduce((a,b)=>a+b,0);
  periods.push({day:d,produced,privateSold,publicSold,sold:privateSold+publicSold,stock:inventory.length,receipts:2*(privateSold+publicSold),operatingCash:2*(privateSold+publicSold)-6-produced/2,cashChange:balances.firm-opening,purchases,provided,repaid,wallets:Array.from({length:6},(_,i)=>balances['person-'+i]),debt:debt.reduce((a,b)=>a+b,0)});
 }
 if(deliveries.some(x=>x.day>day)||new Set(deliveries.map(x=>x.bread)).size!==deliveries.length)throw new Error('Future or duplicate delivery');
 return {...balances,sharedBudget:shared,machine,machineOwner:machine?'private-bakery':null,firm:balances.firm,publicFund:balances.publicFund,lender:balances.lender,employer:balances.employer,supplier:balances.supplier,wallets:Array.from({length:6},(_,i)=>balances['person-'+i]),debt,debtTotal:debt.reduce((a,b)=>a+b,0),inventory,stock:inventory.length,periods,transfers,repayments,moneyBefore:148,moneyAfter:Object.values(balances).reduce((a,b)=>a+b,0)};
}
export function publicDemandAccount(s:PublicDemand){
 const ac=account(s.day,s.phase!=='intro',s.funded,s.loanPaid??Array(6).fill(false),s.incomePaid??Array(12).fill(null),s.reviewed,s.deliveries,!!s.sharedBudget,!!s.machinePaid);
 const incomeCost=2*s.income.filter(x=>x?.day===s.day).length,machineCost=s.sharedBudget&&s.day===1&&s.machineDraft?12:0;
 const plannedCost=incomeCost+machineCost,available=s.sharedBudget?ac.publicFund:ac.employer;
 return {...ac,plannedCost,available,canFund:plannedCost<=available,canConclude:s.trials.filter(t=>!!t.sharedBudget===!!s.sharedBudget).length>=2};
}
export function demandTrialAccount(t:DemandTrial){if(!bools(t.loans)||!incomeValid(t.income)||!Array.isArray(t.deliveries)||t.deliveries.length>12||t.deliveries.some(d=>!deliveryValid(d))||t.sharedBudget!==undefined&&t.sharedBudget!==true||(t.sharedBudget?typeof t.machine!=='boolean':t.machine!==undefined))throw new Error('Invalid demand trial');return account(2,true,2,t.loans,t.income,Array(6).fill(true),t.deliveries,!!t.sharedBudget,!!t.machine);}
export function publicDemandReducer(s:PublicDemand,a:DemandAction):PublicDemand{
 if(!a||typeof a!=='object')return s;
 if(a.type==='BEGIN')return s.phase==='intro'?{...s,phase:'lab',revision:s.revision+1}:s;
 if(a.type==='SHARED_BEGIN')return !s.sharedBudget?{...initialPublicDemand(true),phase:'lab',trials:s.trials.map(trialCopy),revision:s.revision+1}:s;
 if(a.type==='RETRY')return s.step==='result'?{...initialPublicDemand(!!s.sharedBudget),phase:'lab',trials:s.trials.map(trialCopy),revision:s.revision+1}:s;
 if(s.phase!=='lab')return s;
 if(a.type==='REPLAN'||a.type==='REPLAN_INCOME'){
  if(s.step!=='result'||!s.run||a.expectedRevision!==s.revision)return s;
  const income=copyIncome(s.run.income);
  if(a.type==='REPLAN_INCOME'){
   if(!Number.isInteger(a.roll)||a.roll<0||a.roll>=12||!slot(a.to)||JSON.stringify(income[a.roll])===JSON.stringify(a.to))return s;
   income[a.roll]={...a.to};if(!incomeValid(income))return s;
  }
  // Reuse a proposal, never reuse a paid wallet, repayment or delivered loaf.
  // The independent day-one production remains the usual model opening.
  return {...initialPublicDemand(!!s.sharedBudget),phase:'lab',loans:s.run.loans.slice(),income,
   trials:s.trials.map(trialCopy),revision:s.revision+1,
   ...(s.sharedBudget?{machineDraft:!!s.run.machine}:{})};
 }
 const change=(p:Partial<PublicDemand>)=>({...s,...p,revision:s.revision+1});
 switch(a.type){
  case 'MACHINE':return s.sharedBudget&&s.day===1&&s.step==='fund'&&typeof a.enabled==='boolean'&&s.machineDraft!==a.enabled?change({machineDraft:a.enabled}):s;
  case 'LOAN':{if(s.step!=='fund'||s.day!==1||!person(a.person)||typeof a.enabled!=='boolean'||s.loans[a.person]===a.enabled)return s;const loans=s.loans.slice();loans[a.person]=a.enabled;return change({loans});}
  case 'INCOME':{
   if(s.step!=='fund'||!Number.isInteger(a.roll)||a.roll<0||a.roll>=12||a.to!==null&&(!slot(a.to)||a.to.day<s.day)||s.incomePaid?.[a.roll]?.day===1)return s;
   const income=copyIncome(s.income);income[a.roll]=a.to?{...a.to}:null;if(!incomeValid(income)||JSON.stringify(income)===JSON.stringify(s.income))return s;return change({income});
  }
  case 'INCOME_GROUP':{
   if(s.step!=='fund'||a.expectedRevision!==s.revision||![1,2].includes(a.day)||a.day<s.day||!Array.isArray(a.people)||!a.people.length||a.people.length>6||a.people.some(id=>!person(id))||new Set(a.people).size!==a.people.length)return s;
   // One stroke assigns existing unsigned rolls. It never reallocates an
   // already paid roll or silently overwrites another person's future plan.
   const free=s.income.flatMap((x,i)=>x===null?[i]:[]);
   if(free.length<a.people.length||a.people.some(id=>s.income.filter(x=>x?.person===id&&x.day===a.day).length>=2))return s;
   const income=copyIncome(s.income);a.people.forEach((id,i)=>{income[free[i]]={person:id,day:a.day};});
   return incomeValid(income)?change({income}):s;
  }
  case 'FUND':{
   if(s.step!=='fund'||a.expectedRevision!==s.revision||!publicDemandAccount(s).canFund)return s;
   const incomePaid=copyIncome(s.incomePaid??Array(12).fill(null));s.income.forEach((x,i)=>{if(x?.day===s.day)incomePaid[i]={...x};});
   const loanPaid=s.loanPaid??s.loans.slice(),step=s.day===2&&loanPaid.some(Boolean)?'repay':'deliver';return change({funded:s.day,loanPaid:loanPaid.slice(),incomePaid,step,...(s.sharedBudget&&s.day===1?{machinePaid:!!s.machineDraft}:{})});
  }
  case 'REPAY':{
   if(s.step!=='repay'||a.expectedRevision!==s.revision||!person(a.person)||!s.loanPaid?.[a.person]||s.reviewed[a.person])return s;
   const reviewed=s.reviewed.slice();reviewed[a.person]=true;return change({reviewed});
  }
  case 'SHOP':return s.step==='repay'&&a.expectedRevision===s.revision&&s.loanPaid!.every((yes,i)=>!yes||s.reviewed[i])?change({step:'deliver'}):s;
  case 'MATCH':{
   if(s.step!=='deliver'||typeof a.bread!=='string'||a.person!==null&&!person(a.person))return s;
   const ac=publicDemandAccount(s);if(!ac.inventory.includes(a.bread))return s;
   const orders=s.orders.slice(),current=orders.indexOf(a.bread);if(a.person!==null){const p=ac.periods.at(-1)!;if(s.deliveries.some(d=>d.day===s.day&&d.person===a.person)||p.purchases[a.person]>=2)return s;if(orders[a.person]!==null&&orders[a.person]!==a.bread)return s;}
   if(current>=0)orders[current]=null;if(a.person!==null)orders[a.person]=a.bread;if(JSON.stringify(orders)===JSON.stringify(s.orders)||2*orders.filter(Boolean).length>ac.publicFund)return s;return change({orders});
  }
  case 'DELIVER_BATCH':{
   if(!s.sharedBudget||s.step!=='deliver'||a.expectedRevision!==s.revision||!s.orders.some(Boolean))return s;
   const ac=publicDemandAccount(s),batch=s.orders.flatMap((bread,person)=>bread?[{day:s.day,person,bread}]:[]);
   if(ac.publicFund<2*batch.length||batch.some(d=>!ac.inventory.includes(d.bread)||ac.periods.at(-1)!.purchases[d.person]>=2||ac.periods.at(-1)!.provided[d.person]))return s;
   return change({orders:Array(6).fill(null),deliveries:[...s.deliveries,...batch]});
  }
  case 'DELIVER':{
   if(s.step!=='deliver'||a.expectedRevision!==s.revision||!person(a.person)||!s.orders[a.person])return s;
   const bread=s.orders[a.person]!,ac=publicDemandAccount(s);if(!ac.inventory.includes(bread)||ac.publicFund<2)return s;
   const orders=s.orders.slice();orders[a.person]=null;return change({orders,deliveries:[...s.deliveries,{day:s.day,person:a.person,bread}]});
  }
  case 'NEXT':{
   if(s.step!=='deliver'||a.expectedRevision!==s.revision||s.orders.some(Boolean))return s;
   if(s.day===1)return change({day:2,step:'fund'});
   const run:DemandTrial={loans:s.loanPaid!.slice(),income:copyIncome(s.incomePaid!),deliveries:s.deliveries.map(d=>({...d})),...(s.sharedBudget?{sharedBudget:true,machine:!!s.machinePaid}:{})},trials=[...s.trials.filter(t=>signature(t)!==signature(run)),run].slice(-12);
   return change({step:'result',run,trials});
  }
  case 'CONCLUDE':return s.step==='result'&&publicDemandAccount(s).canConclude?{...s,phase:'conclusion'}:s;
  default:return s;
 }
}
export function restorePublicDemand(v:unknown):PublicDemand|null{
 try{
  if(!v||typeof v!=='object')return null;const s=v as PublicDemand;
  if(!['intro','lab','conclusion'].includes(s.phase)||!['fund','repay','deliver','result'].includes(s.step)||![1,2].includes(s.day)||!bools(s.loans)||!incomeValid(s.income)||s.loanPaid!==null&&!bools(s.loanPaid)||s.incomePaid!==null&&!incomeValid(s.incomePaid)||![0,1,2].includes(s.funded)||!bools(s.reviewed)||!Array.isArray(s.orders)||s.orders.length!==6||s.orders.some(x=>x!==null&&(typeof x!=='string'||!/^[12]:(?:[0-9]|1[0-7])$/.test(x)))||!Array.isArray(s.deliveries)||s.deliveries.length>12||s.deliveries.some(d=>!deliveryValid(d))||!Array.isArray(s.trials)||s.trials.length>12||!Number.isSafeInteger(s.revision)||s.revision<0)return null;
  if(s.sharedBudget!==undefined&&s.sharedBudget!==true||(s.sharedBudget?(typeof s.machineDraft!=='boolean'||s.machinePaid!==null&&typeof s.machinePaid!=='boolean'||s.funded===0&&s.machinePaid!==null||s.funded>0&&s.machinePaid!==s.machineDraft):s.machineDraft!==undefined||s.machinePaid!==undefined))return null;
  const fresh=initialPublicDemand(!!s.sharedBudget);if(s.phase==='intro'&&Object.keys(fresh).some(k=>JSON.stringify(s[k as keyof PublicDemand])!==JSON.stringify(fresh[k as keyof PublicDemand])))return null;
  if(s.funded!==s.day-(s.step==='fund'?1:0)||s.funded===0&&(s.loanPaid!==null||s.incomePaid!==null)||s.funded>0&&(!s.loanPaid||!s.incomePaid||JSON.stringify(s.loans)!==JSON.stringify(s.loanPaid))||s.step==='repay'&&(s.day!==2||!s.loanPaid?.some(Boolean))||s.day===1&&s.reviewed.some(Boolean)||s.reviewed.some((yes,i)=>yes&&!s.loanPaid?.[i])||s.step==='fund'&&s.day===2&&s.reviewed.some(Boolean)||s.day===2&&s.step!=='fund'&&s.step!=='repay'&&s.loanPaid?.some((yes,i)=>yes&&!s.reviewed[i]))return null;
  if(s.incomePaid?.some((x,i)=>x&&JSON.stringify(x)!==JSON.stringify(s.income[i])||x&&x.day>s.funded)||s.income.some((x,i)=>x&&x.day<=s.funded&&!s.incomePaid?.[i])||s.deliveries.some(d=>d.day>s.funded)||s.step!=='deliver'&&s.orders.some(Boolean))return null;
  const ac=publicDemandAccount(s),last=ac.periods.at(-1);if(new Set(s.orders.filter(Boolean)).size!==s.orders.filter(Boolean).length||2*s.orders.filter(Boolean).length>ac.publicFund||s.orders.some((id,i)=>id&&(!ac.inventory.includes(id)||!last||last.purchases[i]>=2||last.provided[i])))return null;
  s.trials.forEach(demandTrialAccount);if(new Set(s.trials.map(signature)).size!==s.trials.length)return null;
  if(s.step==='result'&&(s.day!==2||!s.run||JSON.stringify(trialCopy(s.run))!==JSON.stringify({loans:s.loanPaid,income:s.incomePaid,deliveries:s.deliveries,...(s.sharedBudget?{sharedBudget:true,machine:!!s.machinePaid}:{})})||!s.trials.length||JSON.stringify(trialCopy(s.trials.at(-1)!))!==JSON.stringify(trialCopy(s.run)))||s.step!=='result'&&s.run!==null||s.phase==='conclusion'&&(s.step!=='result'||!ac.canConclude))return null;
  return {phase:s.phase,step:s.step,day:s.day,loans:s.loans.slice(),income:copyIncome(s.income),loanPaid:s.loanPaid?.slice()??null,incomePaid:s.incomePaid?copyIncome(s.incomePaid):null,funded:s.funded,reviewed:s.reviewed.slice(),orders:s.orders.slice(),deliveries:s.deliveries.map(d=>({...d})),run:s.run?trialCopy(s.run):null,trials:s.trials.map(trialCopy),revision:s.revision,...(s.sharedBudget?{sharedBudget:true,machineDraft:s.machineDraft,machinePaid:s.machinePaid}:{})};
 }catch{return null;}
}
