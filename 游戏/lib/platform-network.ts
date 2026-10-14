/** Two funded teaching periods. Routing a plug is a draft, not a payment or
 * an ownership transfer. First-period accounts cannot be rewritten by rerouting. */
export const NETWORK_RULES=['locked','portable','joint'] as const;
export type NetworkRule=typeof NETWORK_RULES[number];
export type Endpoint='A'|'B'|null;
export type NetworkTrial={rule:NetworkRule;fee:number;routes:Endpoint[]};
export type PlatformNetwork=NetworkTrial & {phase:'intro'|'lab'|'conclusion';revision:number;history:Endpoint[][];trials:NetworkTrial[];proposal?:NetworkTrial};
export type NetworkAction={type:'BEGIN'}|{type:'CONDITION';rule:NetworkRule}|{type:'FEE';fee:number}|{type:'CONNECT';shop:number;to:Endpoint}|{type:'OPERATE';expectedRevision:number}|{type:'NEXT_CONNECT';shop:number;to:Endpoint}|{type:'NEXT_RULE';rule:NetworkRule}|{type:'NEXT_FEE';fee:number}|{type:'COMPARE';expectedRevision:number}|{type:'RETRY'}|{type:'CONCLUDE'};
const routesValid=(r:unknown):r is Endpoint[]=>Array.isArray(r)&&r.length===3&&r.every(v=>v===null||v==='A'||v==='B');
const feeValid=(f:unknown)=>Number.isInteger(f)&&Number(f)>=0&&Number(f)<=6;
function trialValid(v:unknown):v is NetworkTrial{if(!v||typeof v!=='object')return false;const p=v as NetworkTrial;return NETWORK_RULES.includes(p.rule)&&feeValid(p.fee)&&routesValid(p.routes)&&!(p.rule==='joint'&&p.fee!==1);}
const trialCopy=(p:NetworkTrial):NetworkTrial=>({rule:p.rule,fee:p.fee,routes:p.routes.slice()});
const sameTrial=(a:NetworkTrial,b:NetworkTrial)=>a.rule===b.rule&&a.fee===b.fee&&a.routes.every((r,i)=>r===b.routes[i]);
const signature=(p:NetworkTrial)=>[p.rule,p.fee,...['A','B',null].map(x=>p.routes.filter(v=>v===x).length)].join('|');
const withoutProposal=(s:PlatformNetwork)=>{const copy={...s};delete copy.proposal;return copy;};
export function initialPlatformNetwork():PlatformNetwork{return {phase:'intro',revision:0,rule:'locked',fee:3,routes:['A','A','A'],history:[],trials:[]};}
export function platformNetworkReducer(s:PlatformNetwork,a:NetworkAction):PlatformNetwork{
 if(!a||typeof a!=='object')return s;
 if(a.type==='BEGIN')return s.phase==='intro'?{...s,phase:'lab'}:s;
 if(a.type==='RETRY')return (s.phase==='lab'||s.phase==='conclusion')&&s.history.length===2?{...withoutProposal(s),phase:'lab',routes:['A','A','A'],history:[],revision:s.revision+1}:s;
 if(s.phase!=='lab')return s;
 const change=(p:Partial<PlatformNetwork>)=>{const next={...s,...p,revision:s.revision+1};return next.proposal===undefined?withoutProposal(next):next;};
 // Prospective comparisons retain the paid two-period account until execution.
 // They replay from the same finite origin, not from the previous closing cash.
 if(['NEXT_CONNECT','NEXT_RULE','NEXT_FEE','COMPARE'].includes(a.type)){
  if(s.history.length!==2)return s;
  const draft=trialCopy(s.proposal??s);
  if(a.type==='COMPARE'){
   if(a.expectedRevision!==s.revision||!s.proposal||sameTrial(draft,s))return s;
   return change({...draft,history:[['A','A','A'],draft.routes.slice()],proposal:undefined,trials:[...s.trials.filter(p=>signature(p)!==signature(draft)),trialCopy(draft)].slice(-12)});
  }
  if(a.type==='NEXT_CONNECT'){
   if(!Number.isInteger(a.shop)||a.shop<0||a.shop>=3||![null,'A','B'].includes(a.to)||draft.routes[a.shop]===a.to)return s;
   draft.routes[a.shop]=a.to;
  }else if(a.type==='NEXT_RULE'){
   if(!NETWORK_RULES.includes(a.rule)||draft.rule===a.rule)return s;
   draft.rule=a.rule;if(a.rule==='joint')draft.fee=1;
  }else if(a.type==='NEXT_FEE'){
   if(draft.rule==='joint'||!feeValid(a.fee)||draft.fee===a.fee)return s;
   draft.fee=a.fee;
  }
  return change({proposal:sameTrial(draft,s)?undefined:draft});
 }
 switch(a.type){
  case 'CONDITION':return NETWORK_RULES.includes(a.rule)&&s.history.length!==1&&a.rule!==s.rule?change({rule:a.rule,fee:a.rule==='joint'?1:3,routes:['A','A','A'],history:[],proposal:undefined}):s;
  case 'FEE':return s.history.length===0&&s.rule!=='joint'&&feeValid(a.fee)&&a.fee!==s.fee?change({fee:a.fee}):s;
  case 'CONNECT':{
   if(s.history.length!==1||!Number.isInteger(a.shop)||a.shop<0||a.shop>=3||![null,'A','B'].includes(a.to)||s.routes[a.shop]===a.to)return s;
   const routes=s.routes.slice();routes[a.shop]=a.to;return change({routes});
  }
  case 'OPERATE':{
   if(a.expectedRevision!==s.revision||s.history.length>=2)return s;
   const history=[...s.history.map(r=>r.slice()),s.routes.slice()];
   const trials=history.length===2?[...s.trials.filter(p=>signature(p)!==signature(s)),trialCopy(s)].slice(-12):s.trials;
   return change({history,trials});
  }
  case 'CONCLUDE':return s.history.length===2&&s.trials.length>=2?{...withoutProposal(s),phase:'conclusion'}:s;
  default:return s;
 }
}
export function networkAccount(rule:NetworkRule,fee:number,history:Endpoint[][]){
 if(!NETWORK_RULES.includes(rule)||!feeValid(fee)||rule==='joint'&&fee!==1||!Array.isArray(history)||history.length>2||history.some(r=>!routesValid(r))||history.length&&history[0].some(r=>r!=='A'))throw new Error('Invalid network account');
 const charge=rule==='joint'?1:fee,costToMove=rule==='locked'?6:1;
 const shops=[20,20,20];let platform=12,alternative=12,buyers=72,workers=0,supplier=0;
 const transfers:{day:number;from:string;to:string;amount:number;kind:string}[]=[];
 const periods=history.map((routes,dayIndex)=>{
  const day=dayIndex+1,before=shops.slice(),fees=[0,0,0],migration=[0,0,0],sold=[0,0,0];
  const transfer=(from:string,to:string,amount:number,kind:string)=>{if(amount)transfers.push({day,from,to,amount,kind});};
  routes.forEach((endpoint,i)=>{
   if(endpoint===null)return;
   fees[i]=endpoint==='A'?charge:2;migration[i]=dayIndex>0&&history[dayIndex-1][i]!==endpoint?costToMove:0;
   const cost=4+2+fees[i]+migration[i];if(shops[i]<cost)throw new Error('Cannot pay without overdraft');
   shops[i]-=cost;workers+=4;supplier+=2+migration[i];if(endpoint==='A')platform+=fees[i];else alternative+=fees[i];
   transfer('shop-'+i,'workers',4,'wage');transfer('shop-'+i,'supplier',2,'inputs');transfer('shop-'+i,endpoint,fees[i],'access');transfer('shop-'+i,'supplier',migration[i],'migration');
   shops[i]+=8;buyers-=8;sold[i]=4;transfer('buyers','shop-'+i,8,'sale');
  });
  const maintenanceA=routes.filter(e=>e==='A').length,maintenanceB=routes.filter(e=>e==='B').length;
  platform-=maintenanceA;alternative-=maintenanceB;supplier+=maintenanceA+maintenanceB;transfer('A','supplier',maintenanceA,'maintenance');transfer('B','supplier',maintenanceB,'maintenance');
  // Display this period's actual receipts, never a quote for the draft routes
  // or a cumulative two-period amount mislabeled as the current payment.
  const actual=transfers.filter(t=>t.day===day),sum=(kind:string,to?:string)=>actual.filter(t=>t.kind===kind&&(to===undefined||t.to===to)).reduce((n,t)=>n+t.amount,0);
  const payments={sales:sum('sale'),wages:sum('wage'),inputs:sum('inputs'),accessA:sum('access','A'),accessB:sum('access','B'),migration:sum('migration'),maintenance:sum('maintenance')};
  return {day,before,routes:routes.slice(),fees,migration,sold,maintenanceA,maintenanceB,closing:shops.slice(),payments};
 });
 return {rule,fee:charge,shops,platform,alternative,buyers,workers,supplier,periods,transfers,migration:periods.reduce((n,p)=>n+p.migration.reduce((a,b)=>a+b,0),0),sold:periods.reduce((n,p)=>n+p.sold.reduce((a,b)=>a+b,0),0),moneyBefore:156,moneyAfter:shops.reduce((a,b)=>a+b,0)+platform+alternative+buyers+workers+supplier};
}
export const networkTrialAccount=(p:NetworkTrial)=>networkAccount(p.rule,p.fee,[['A','A','A'],p.routes]);
export function restorePlatformNetwork(v:unknown):PlatformNetwork|null{
 if(!trialValid(v))return null;const s=v as PlatformNetwork;
 if(!['intro','lab','conclusion'].includes(s.phase)||!Number.isSafeInteger(s.revision)||s.revision<0||!Array.isArray(s.history)||s.history.length>2||s.history.some(r=>!routesValid(r))||s.history.length&&s.history[0].some(r=>r!=='A')||!Array.isArray(s.trials)||s.trials.length>12||s.trials.some(p=>!trialValid(p))||new Set(s.trials.map(signature)).size!==s.trials.length)return null;
 if(s.history.length===0&&s.routes.some(r=>r!=='A')||s.history.length===2&&(JSON.stringify(s.routes)!==JSON.stringify(s.history[1])||!s.trials.length||JSON.stringify(trialCopy(s))!==JSON.stringify(trialCopy(s.trials.at(-1)!)))||s.phase==='conclusion'&&(s.history.length!==2||s.trials.length<2)||s.phase==='intro'&&(s.revision!==0||s.history.length||s.trials.length||s.rule!=='locked'||s.fee!==3))return null;
 if(s.proposal!==undefined&&(!trialValid(s.proposal)||s.phase!=='lab'||s.history.length!==2||sameTrial(s.proposal,s)))return null;
 return {...trialCopy(s),phase:s.phase,revision:s.revision,history:s.history.map(r=>r.slice()),trials:s.trials.map(trialCopy),...(s.proposal?{proposal:trialCopy(s.proposal)}:{})};
}
