/** Two dated working days. Draft wiring never pays money or rewrites a day.
 * Cold storage protects only the night actually paid for, not future purchases.
 * Prices, inputs and demand are teaching parameters, not fitted industry data. */
export type PreservationSetup={price:1|2|3;efficient:boolean;cold:boolean;bake?:boolean};
export type PreservationTrial=PreservationSetup[];
type PreservationPeriod={day:number;setup:PreservationSetup;produced:string[];sold:number;receipts:number;stock:number;inventory:string[];lost:string[];storage:number;inputs:number;wages:number;upgrade:number;operatingCash:number;cashChange:number;closing:number;wallets:number[];purchases:number[];bought:string[][]};
type PreservationNight={kept:string[];lost:string[];paid:number};
export type PreservationWorkbench={phase:'intro'|'lab'|'conclusion';step:'arrange'|'night'|'result';day:1|2;draft:PreservationSetup;history:PreservationSetup[];trials:PreservationTrial[];revision:number;flexibleBake?:true;nextDraft?:PreservationSetup};
export type PreservationAction={type:'BEGIN'|'PLANNED_BEGIN'}|{type:'BAKE';enabled:boolean;expectedRevision:number}|{type:'PRICE';price:1|2|3;expectedRevision:number}|{type:'CONNECT';tool:'efficient'|'cold';enabled:boolean;expectedRevision:number}|{type:'RUN'|'NEXT';expectedRevision:number}|{type:'RETRY'|'CONCLUDE'}|{type:'REPLAN';expectedRevision:number}|{type:'REPLAN_BAKE';enabled:boolean;expectedRevision:number}|{type:'REPLAN_PRICE';day:1|2;price:1|2|3;expectedRevision:number};
const setupValid=(v:unknown):v is PreservationSetup=>!!v&&typeof v==='object'&&[1,2,3].includes((v as PreservationSetup).price)&&typeof (v as PreservationSetup).efficient==='boolean'&&typeof (v as PreservationSetup).cold==='boolean'&&((v as PreservationSetup).bake===undefined||typeof (v as PreservationSetup).bake==='boolean');
const copy=(p:PreservationSetup):PreservationSetup=>({price:p.price,efficient:p.efficient,cold:p.cold,...(p.bake!==undefined?{bake:p.bake}:{})});
// Omitted bake means the legacy rule: both days always bake a new batch.
const signature=(p:PreservationTrial)=>JSON.stringify(p.map(x=>[x.price,x.efficient,x.cold,x.bake!==false]));
export function initialPreservation(flexibleBake=false):PreservationWorkbench{return {phase:'intro',step:'arrange',day:1,draft:{price:2,efficient:false,cold:false,...(flexibleBake?{bake:true}:{})},history:[],trials:[],revision:0,...(flexibleBake?{flexibleBake:true}:{})};}
function account(history:PreservationSetup[],overnight:boolean){
 const balances:Record<string,number>={firm:50,supplier:0,equipment:0};for(let i=0;i<6;i++)balances['person-'+i]=2;
 const owned={efficient:false,cold:false},transfers:{day:number;from:string;to:string;amount:number;kind:string;bread?:string}[]=[],periods:PreservationPeriod[]=[];
 const spoiled:string[]=[];let inventory:string[]=[],night:PreservationNight|null=null;
 function pay(day:number,from:string,to:string,amount:number,kind:string,bread?:string){if(!Number.isInteger(amount)||amount<0||balances[from]<amount)throw new Error('Unfunded preservation transfer');if(!amount)return;balances[from]-=amount;balances[to]+=amount;transfers.push({day,from,to,amount,kind,...(bread?{bread}:{})});}
 function crossNight(){if(night)return;const first=periods[0],kept=first.setup.cold&&first.storage===2?inventory.slice():[],lost=kept.length?[]:inventory.slice();night={kept,lost,paid:first.storage};spoiled.push(...lost);inventory=kept.slice();}
 for(let i=0;i<history.length;i++){
  if(i===1)crossNight();const day=i+1,setup=history[i],opening=balances.firm;
  let upgrade=0;for(const tool of ['efficient','cold'] as const)if(setup[tool]&&!owned[tool]){pay(day,'firm','equipment',6,'buy-'+tool);owned[tool]=true;upgrade+=6;}
  if(day===1&&setup.bake===false)throw new Error('The first batch precedes the overnight choice');
  const inputs=setup.bake===false?0:setup.efficient?3:12;pay(day,'firm','supplier',inputs,'inputs');for(let p=0;p<6;p++)pay(day,'firm','person-'+p,1,'wage');
  // Turning off the oven does not fire anyone or cancel the agreed daily wage.
  const produced=Array.from({length:setup.bake===false?0:12},(_,j)=>day+':'+j);inventory.push(...produced);
  const bought:string[][]=Array.from({length:6},()=>[]);
  function buy(p:number){if(balances['person-'+p]<setup.price||!inventory.length)return;const bread=inventory.shift()!;pay(day,'person-'+p,'firm',setup.price,'sale',bread);bought[p].push(bread);}
  // In the new planning experiment, serve first loaves before seconds. Keeping
  // the legacy purchase order matters to the identities in already played saves.
  if(setup.bake!==undefined){for(let j=0;j<2;j++)for(let p=0;p<6;p++)buy(p);}
  else for(let p=0;p<6;p++){const quantity=Math.min(2,Math.floor(balances['person-'+p]/setup.price),inventory.length);for(let j=0;j<quantity;j++)buy(p);}
  const sold=bought.reduce((n,x)=>n+x.length,0),receipts=sold*setup.price,storage=setup.cold&&inventory.length>0?2:0;pay(day,'firm','supplier',storage,'storage');
  periods.push({day,setup:copy(setup),produced,sold,receipts,stock:inventory.length,inventory:inventory.slice(),lost:day===2?night!.lost.slice():[],storage,inputs,wages:6,upgrade,operatingCash:receipts-6-inputs-storage,cashChange:balances.firm-opening,closing:balances.firm,wallets:Array.from({length:6},(_,j)=>balances['person-'+j]),purchases:bought.map(x=>x.length),bought});
 }
 if(overnight&&history.length===1)crossNight();
 return {firm:balances.firm,supplier:balances.supplier,equipment:balances.equipment,wallets:Array.from({length:6},(_,i)=>balances['person-'+i]),owned,inventory,stock:inventory.length,spoiled:spoiled.length,spoiledIDs:spoiled,night:night as PreservationNight|null,periods,transfers,upgrade:balances.equipment,moneyBefore:62,moneyAfter:Object.values(balances).reduce((a,b)=>a+b,0)};
}
export const preservationAccount=(s:PreservationWorkbench)=>account(s.history,s.day===2);
export function preservationTrialAccount(t:PreservationTrial){if(!Array.isArray(t)||t.length!==2||!t.every(setupValid))throw new Error('Invalid preservation trial');return account(t,true);}
export function preservationReducer(s:PreservationWorkbench,a:PreservationAction):PreservationWorkbench{
 if(!a||typeof a!=='object')return s;
 if(a.type==='BEGIN')return s.phase==='intro'?{...s,phase:'lab',revision:s.revision+1}:s;
 if(a.type==='PLANNED_BEGIN')return !s.flexibleBake?{...initialPreservation(true),phase:'lab',trials:s.trials.map(t=>t.map(copy)),revision:s.revision+1}:s;
 if(a.type==='RETRY')return s.step==='result'?{...initialPreservation(!!s.flexibleBake),phase:'lab',trials:s.trials.map(t=>t.map(copy)),revision:s.revision+1}:s;
 if(a.type==='REPLAN'||a.type==='REPLAN_BAKE'||a.type==='REPLAN_PRICE'){
  if(s.phase!=='lab'||s.step!=='result'||a.expectedRevision!==s.revision||s.history.length!==2)return s;
  const plans=s.history.map(copy);
  if(a.type==='REPLAN_BAKE'){
   if(!s.flexibleBake||typeof a.enabled!=='boolean'||plans[1].bake===a.enabled)return s;
   plans[1].bake=a.enabled;
  }
  if(a.type==='REPLAN_PRICE'){
   if(![1,2].includes(a.day)||![1,2,3].includes(a.price)||plans[a.day-1].price===a.price)return s;
   plans[a.day-1].price=a.price;
  }
  // These are proposals from the same opening wallets, never edited receipts.
  return {...initialPreservation(!!s.flexibleBake),phase:'lab',draft:plans[0],nextDraft:plans[1],trials:s.trials.map(t=>t.map(copy)),revision:s.revision+1};
 }
 if(s.phase!=='lab')return s;
 const change=(p:Partial<PreservationWorkbench>)=>({...s,...p,revision:s.revision+1});
 switch(a.type){
  case 'BAKE':return s.flexibleBake&&s.day===2&&s.step==='arrange'&&a.expectedRevision===s.revision&&typeof a.enabled==='boolean'&&s.draft.bake!==a.enabled?change({draft:{...s.draft,bake:a.enabled}}):s;
  case 'PRICE':return s.step==='arrange'&&a.expectedRevision===s.revision&&[1,2,3].includes(a.price)&&a.price!==s.draft.price?change({draft:{...s.draft,price:a.price}}):s;
  case 'CONNECT':return s.step==='arrange'&&a.expectedRevision===s.revision&&['efficient','cold'].includes(a.tool)&&typeof a.enabled==='boolean'&&s.draft[a.tool]!==a.enabled?change({draft:{...s.draft,[a.tool]:a.enabled}}):s;
  case 'RUN':{
   if(s.step!=='arrange'||a.expectedRevision!==s.revision)return s;
   const history=[...s.history.map(copy),copy(s.draft)];account(history,true);
   if(s.day===1)return change({history,step:'night'});
   const trials=[...s.trials.filter(t=>signature(t)!==signature(history)),history.map(copy)].slice(-12);return change({history,step:'result',trials});
  }
  case 'NEXT':{
   if(s.step!=='night'||s.day!==1||a.expectedRevision!==s.revision)return s;
   const {nextDraft,...rest}=s;
   return {...rest,day:2,step:'arrange',draft:copy(nextDraft??s.draft),revision:s.revision+1};
  }
  case 'CONCLUDE':return s.step==='result'&&s.trials.length>=2?change({phase:'conclusion'}):s;
  default:return s;
 }
}
export function restorePreservation(v:unknown):PreservationWorkbench|null{
 try{
  if(!v||typeof v!=='object')return null;const s=v as PreservationWorkbench;
  if(!['intro','lab','conclusion'].includes(s.phase)||!['arrange','night','result'].includes(s.step)||![1,2].includes(s.day)||!setupValid(s.draft)||!Array.isArray(s.history)||s.history.length>2||!s.history.every(setupValid)||!Array.isArray(s.trials)||s.trials.length>12||!Number.isSafeInteger(s.revision)||s.revision<0)return null;
  if(s.flexibleBake!==undefined&&s.flexibleBake!==true||(s.flexibleBake?typeof s.draft.bake!=='boolean'||s.history.some(p=>typeof p.bake!=='boolean'):s.draft.bake!==undefined||s.history.some(p=>p.bake!==undefined))||s.day===1&&s.draft.bake===false||s.history[0]?.bake===false)return null;
  if(s.nextDraft!==undefined&&(!setupValid(s.nextDraft)||s.phase!=='lab'||s.day!==1||!['arrange','night'].includes(s.step)||!s.trials.length||(s.flexibleBake?typeof s.nextDraft.bake!=='boolean':s.nextDraft.bake!==undefined)))return null;
  const expected=s.step==='result'?2:s.day===1?s.step==='night'?1:0:1;
  if(s.history.length!==expected||s.step==='night'&&s.day!==1||s.step==='result'&&s.day!==2||s.step!=='arrange'&&signature([s.draft])!==signature([s.history.at(-1)!]))return null;
  s.trials.forEach(preservationTrialAccount);if(new Set(s.trials.map(signature)).size!==s.trials.length)return null;
  if(s.step==='result'&&(!s.trials.length||signature(s.trials.at(-1)!)!==signature(s.history))||s.phase==='conclusion'&&(s.step!=='result'||s.trials.length<2))return null;
  const fresh=initialPreservation(!!s.flexibleBake);if(s.phase==='intro'&&Object.keys(fresh).some(k=>JSON.stringify(s[k as keyof PreservationWorkbench])!==JSON.stringify(fresh[k as keyof PreservationWorkbench])))return null;
  preservationAccount(s);
  return {phase:s.phase,step:s.step,day:s.day,draft:copy(s.draft),history:s.history.map(copy),trials:s.trials.map(t=>t.map(copy)),revision:s.revision,...(s.flexibleBake?{flexibleBake:true}:{}),...(s.nextDraft?{nextDraft:copy(s.nextDraft)}:{})};
 }catch{return null;}
}
