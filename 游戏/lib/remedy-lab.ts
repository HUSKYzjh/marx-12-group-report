import {RELIEF_ROUTES,type ReliefRoute} from './crisis-model.ts';

/** A small, finite, fixed-price production district, NOT a calibrated macroeconomic model.
 * Its output is a basket of final consumer/equipment goods; one unit costs one
 * teaching coin. Separate buyers pay for all orders; loans transfer a lender's
 * existing cash. Output pools the equipment sellers and recipient producers;
 * shop is the pooled operating account, buyers the capital-purchasing fund.
 * Neither the sales index nor operating cash change is a single firm's profit.
 * Store decisions only and reconstruct every account on reload. */
export const REMEDY_MODES={consumption:['raise','credit'],investment:['expand','replace'],exports:['single','diverse']} as const;
export type RemedyMode=typeof REMEDY_MODES[ReliefRoute][number];
export type RemedyControl={dose:number;mode:RemedyMode;outlook:'normal'|'supported'|'adverse'};
export type RemedyFollowup={base:RemedyControl;control:RemedyControl};
export type RemedyFlow='consumption-open'|'production-open';
export type RemedyRun={history:RemedyControl[];comparisons:RemedyControl[];followups?:RemedyFollowup[];flow?:RemedyFlow};
export type RemedyLab=RemedyRun&{route:ReliefRoute;dose:number;mode:RemedyMode;archives?:RemedyRun[];thirdOutlook?:RemedyControl['outlook']};
export type RemedyAction=
 | {type:'DAY';mode:RemedyMode;expectedRound:number;expectedPlan:string;dose?:number;outlook?:RemedyControl['outlook']}
 | {type:'OPEN_FLOW'}
 | {type:'DOSE';delta:-1|1}
 | {type:'MODE';mode:RemedyMode}
 | {type:'PLACE';mode:RemedyMode;expectedRound:number;outlook?:RemedyControl['outlook']}
 | {type:'OPERATE';expectedRound:number;outlook?:RemedyControl['outlook']}
 | {type:'PREPARE_OUTLOOK';outlook:RemedyControl['outlook']}
 | {type:'COMPARE';outlook:RemedyControl['outlook']}
 | {type:'FOLLOWUP';mode:RemedyMode;expectedPlan:string}
 | {type:'REPLAY';fromRound:0|1|2;expectedPlan:string}
 | {type:'RESTART'};
type Wallet='shop'|'households'|'buyers'|'owners'|'bank'|'foreign'|'suppliers';
export type RemedyWorld={cash:Record<Wallet,number>;stock:number;capacity:number;efficiency:number;debt:number;principalDebt:number;interestDebt:number;round:number};
export type RemedyPayment={from:Wallet;to:Wallet;amount:number;reason:string};
export type RemedyDebtAccount={openingPrincipal:number;openingInterest:number;interestCharged:number;borrowed:number;principalRepaid:number;interestPaid:number;closingPrincipal:number;closingInterest:number};
export type RemedyReport={round:number;control:RemedyControl;made:number;sold:number;stock:number;newStock:number;
 wages:number;borrowed:number;repayment:number;debt:number;arrears:number;creditStopped:boolean;investment:number;capacity:number;upkeep:number;
 transport:number;exports:number;lostExports:number;exportQuota:number;exportSupplyShortfall:number;preorders:number;costs:number;margin:number;cashChange:number;
 lowestCash:number;payments:RemedyPayment[];debtAccount:RemedyDebtAccount;world:RemedyWorld};
const opening=():RemedyWorld=>({cash:{shop:60,households:0,buyers:120,owners:30,bank:90,foreign:120,suppliers:0},stock:0,capacity:0,efficiency:0,debt:0,principalDebt:0,interestDebt:0,round:0});
export const REMEDY_INITIAL_MONEY=420;
export const remedyMoney=(w:RemedyWorld)=>Object.values(w.cash).reduce((a,b)=>a+b,0);
export function initialRemedy(route:ReliefRoute,openFlow=false):RemedyLab{
 if(!RELIEF_ROUTES.includes(route))throw new RangeError('Unknown remedy');
 return {route,dose:2,mode:route==='consumption'?'credit':REMEDY_MODES[route][0],history:[],comparisons:[],...(openFlow?{flow:(route==='consumption'?'consumption-open':'production-open') as RemedyFlow}:{})};
}
const copyRun=(r:RemedyRun):RemedyRun=>({history:r.history.map(c=>({...c})),comparisons:r.comparisons.map(c=>({...c})),...(r.followups?.length?{followups:r.followups.map(copyFollowup)}:{}),...(r.flow?{flow:r.flow}:{})});
function validControl(route:ReliefRoute,c:unknown):c is RemedyControl{
 const v=c as RemedyControl;
 return !!v&&Number.isInteger(v.dose)&&v.dose>=0&&v.dose<=3
  &&(REMEDY_MODES[route] as readonly string[]).includes(v.mode)&&['normal','supported','adverse'].includes(v.outlook);
}
const runKey=(run:RemedyRun)=>JSON.stringify(run.history.map(c=>[c.mode,c.dose,c.outlook]));
const controlKey=(c:RemedyControl)=>JSON.stringify([c.mode,c.dose,c.outlook]);
const followupKey=(f:RemedyFollowup)=>controlKey(f.base)+'/'+controlKey(f.control);
const copyFollowup=(f:RemedyFollowup):RemedyFollowup=>({base:{...f.base},control:{...f.control}});
export function remedyReducer(s:RemedyLab,a:RemedyAction):RemedyLab{
 if(!a||typeof a.type!=='string')return s;
 if(a.type==='OPEN_FLOW'){
  if(s.flow)return s;
  const archives=(s.archives??[]).map(copyRun);if(s.history.length)archives.push(copyRun(s));
  return {...initialRemedy(s.route,true),...(archives.length?{archives}: {})};
 }
 if(s.flow){
  if(a.type==='DAY'){
   const control:RemedyControl={dose:a.dose??s.dose,mode:a.mode,outlook:a.outlook??'normal'};
   if(a.expectedRound!==s.history.length||a.expectedPlan!==JSON.stringify(s)||!validControl(s.route,control))return s;
   return {...s,mode:a.mode,history:[...s.history,control]};
  }
  if(a.type==='REPLAY'){
   if(a.fromRound!==0||!s.history.length||a.expectedPlan!==JSON.stringify(s))return s;
   const archives=(s.archives??[]).map(copyRun),old=copyRun(s);
   if(!archives.some(r=>r.flow===old.flow&&runKey(r)===runKey(old)))archives.push(old);
   return {...initialRemedy(s.route,true),archives};
  }
  if(a.type==='RESTART')return initialRemedy(s.route,true);
  if(!['DOSE','MODE'].includes(a.type))return s;
 }
 switch(a.type){
  case 'DOSE':return [-1,1].includes(a.delta)&&s.dose+a.delta>=0&&s.dose+a.delta<=3?{...s,dose:s.dose+a.delta}:s;
  case 'MODE':return (REMEDY_MODES[s.route] as readonly string[]).includes(a.mode)?{...s,mode:a.mode}:s;
  case 'PREPARE_OUTLOOK':return s.history.length===2&&['normal','supported','adverse'].includes(a.outlook)?{...s,thirdOutlook:a.outlook}:s;
  case 'PLACE':{
   if(s.followups?.length)return s;
   if(a.expectedRound!==s.history.length||!(REMEDY_MODES[s.route] as readonly string[]).includes(a.mode))return s;
   if(a.outlook!==undefined&&(!['normal','supported','adverse'].includes(a.outlook)||s.history.length<2&&a.outlook!=='normal'))return s;
   const arranged={...s,mode:a.mode};
   return remedyReducer(arranged,s.history.length<3?{type:'OPERATE',expectedRound:a.expectedRound,outlook:a.outlook}:{type:'COMPARE',outlook:a.outlook??'normal'});
  }
  case 'OPERATE':{
   const outlook=a.outlook??s.thirdOutlook??'normal';
   if(a.expectedRound!==s.history.length||s.history.length>=3||!['normal','supported','adverse'].includes(outlook)||s.history.length<2&&outlook!=='normal')return s;
   const next={...s,history:[...s.history,{dose:s.dose,mode:s.mode,outlook}]};delete next.thirdOutlook;return next;
  }
  case 'COMPARE':{
   if(s.followups?.length)return s;
   if(s.history.length!==3||!['normal','supported','adverse'].includes(a.outlook))return s;
   const control:RemedyControl={dose:s.dose,mode:s.mode,outlook:a.outlook};
   // Keep each operated comparison as evidence, without an unbounded save log.
   const comparisons=s.comparisons.filter(c=>JSON.stringify(c)!==JSON.stringify(control));
   return {...s,comparisons:[...comparisons,control]};
  }
  case 'FOLLOWUP':{
   if(s.history.length!==3||a.expectedPlan!==JSON.stringify(s)||!(REMEDY_MODES[s.route] as readonly string[]).includes(a.mode))return s;
   // The fourth turn starts after the chosen, actually played third turn.
   // Retrying it changes only turn four; it never erases an earlier loan or oven.
   const base={...(s.followups?.at(-1)?.base??s.comparisons.at(-1)??s.history[2])};
   if(base.outlook!=='adverse')return s;
   const control:RemedyControl={dose:s.dose,mode:a.mode,outlook:base.outlook},next={base,control};
   if(s.followups?.length&&followupKey(s.followups.at(-1)!)===followupKey(next))return s;
   return {...s,mode:a.mode,followups:[...(s.followups??[]).filter(f=>followupKey(f)!==followupKey(next)),next]};
  }
  case 'REPLAY':{
   if(!s.history.length||![0,1,2].includes(a.fromRound)||a.fromRound>=s.history.length||a.expectedPlan!==JSON.stringify(s))return s;
   const copy=(c:RemedyControl):RemedyControl=>({...c}),signature=runKey(s),archives=(s.archives??[]).map(r=>({history:r.history.map(copy),comparisons:r.comparisons.map(copy),...(r.followups?.length?{followups:r.followups.map(copyFollowup)}:{})}));
   const prior=archives.find(r=>runKey(r)===signature);
   if(prior){for(const c of s.comparisons)if(!prior.comparisons.some(p=>controlKey(p)===controlKey(c)))prior.comparisons.push(copy(c));for(const f of s.followups??[])if(!prior.followups?.some(p=>followupKey(p)===followupKey(f)))(prior.followups??=[]).push(copyFollowup(f));}
   else archives.push({history:s.history.map(copy),comparisons:s.comparisons.map(copy),...(s.followups?.length?{followups:s.followups.map(copyFollowup)}:{})});
   const control=s.history[a.fromRound];
   const next={...s,mode:control.mode,dose:control.dose,history:s.history.slice(0,a.fromRound).map(copy),comparisons:[],archives};
   delete next.followups;delete next.thirdOutlook;if(a.fromRound===2)next.thirdOutlook=control.outlook;return next;
  }
  case 'RESTART':return initialRemedy(s.route);
  default:return s;
 }
}
export function restoreRemedy(v:unknown,route:ReliefRoute):RemedyLab|null{
 const s=v as RemedyLab;
 if(s?.flow!==undefined&&!['consumption-open','production-open'].includes(s.flow))return null;
 if(s?.flow){
  if((s.flow==='consumption-open')!==(route==='consumption')||s.route!==route||!validControl(route,{dose:s.dose,mode:s.mode,outlook:'normal'})||!Array.isArray(s.history)||s.history.some(c=>!validControl(route,c))||!Array.isArray(s.comparisons)||s.comparisons.length||s.followups!==undefined||s.thirdOutlook!==undefined)return null;
  let archives:RemedyRun[]|undefined;
  if(s.archives!==undefined){
   if(!Array.isArray(s.archives)||!s.archives.length)return null;
   archives=[];
   for(const run of s.archives){
    if(!run?.history?.length||Object.prototype.hasOwnProperty.call(run,'archives'))return null;
    const restored=restoreRemedy({...run,route,dose:2,mode:initialRemedy(route).mode},route);
    if(!restored)return null;archives.push(copyRun(restored));
   }
  }
  return {route,dose:s.dose,mode:s.mode,history:s.history.map(c=>({...c})),comparisons:[],flow:s.flow,...(archives?{archives}:{})};
 }
 if(!s||s.route!==route||!validControl(route,{dose:s.dose,mode:s.mode,outlook:'normal'})
  ||!Array.isArray(s.history)||s.history.length>3||s.history.some((c,i)=>!validControl(route,c)||i<2&&c.outlook!=='normal')
  ||s.thirdOutlook!==undefined&&(s.history.length!==2||!['normal','supported','adverse'].includes(s.thirdOutlook))
  ||!Array.isArray(s.comparisons)||s.comparisons.length>24||s.comparisons.some(c=>!validControl(route,c))
  ||s.comparisons.length&&s.history.length!==3
  ||new Set(s.comparisons.map(c=>JSON.stringify([c.dose,c.mode,c.outlook]))).size!==s.comparisons.length)return null;
 const clean=(c:RemedyControl):RemedyControl=>({dose:c.dose,mode:c.mode,outlook:c.outlook});
 function validFollowups(run:RemedyRun){
  if(run.followups===undefined)return true;
  if(!Array.isArray(run.followups)||!run.followups.length||run.followups.length>64||run.history.length!==3)return false;
  const bases=[run.history[2],...run.comparisons];
  return run.followups.every(f=>!!f&&validControl(route,f.base)&&validControl(route,f.control)&&f.base.outlook==='adverse'&&f.control.outlook===f.base.outlook&&bases.some(b=>controlKey(b)===controlKey(f.base)))
   &&new Set(run.followups.map(followupKey)).size===run.followups.length;
 }
 if(!validFollowups(s))return null;
 let archives:RemedyRun[]|undefined;
 if(s.archives!==undefined){
  // Eight choices for the first two turns, 24 for the actual third condition.
  // Partial archives are evidence of those turns only, never a completed trial.
  if(!Array.isArray(s.archives)||!s.archives.length||s.archives.length>1608)return null;
  archives=[];
  for(const run of s.archives){
   if(!run||!Array.isArray(run.history)||!run.history.length||run.history.length>3||run.history.some((c,i)=>!validControl(route,c)||i<2&&c.outlook!=='normal')
    ||!Array.isArray(run.comparisons)||run.comparisons.length>24||run.comparisons.some(c=>!validControl(route,c))
    ||run.comparisons.length&&run.history.length!==3
    ||new Set(run.comparisons.map(c=>JSON.stringify([c.dose,c.mode,c.outlook]))).size!==run.comparisons.length)return null;
   if(!validFollowups(run))return null;
   archives.push({history:run.history.map(clean),comparisons:run.comparisons.map(clean),...(run.followups?{followups:run.followups.map(f=>({base:clean(f.base),control:clean(f.control)}))}:{})});
  }
  if(new Set(archives.map(runKey)).size!==archives.length)return null;
 }
 return {route,dose:s.dose,mode:s.mode,history:s.history.map(clean),comparisons:s.comparisons.map(clean),...(s.followups?{followups:s.followups.map(f=>({base:clean(f.base),control:clean(f.control)}))}:{}),...(archives?{archives}:{}),...(s.thirdOutlook!==undefined?{thirdOutlook:s.thirdOutlook}:{})};
}
function operate(previous:RemedyWorld,route:ReliefRoute,control:RemedyControl,flow?:RemedyFlow):RemedyReport{
 const circular=!!flow,openProduction=flow==='production-open';
 const w=structuredClone(previous),before=w.cash.shop,oldStock=w.stock,n=w.round+1,dose=control.dose*5;
 const payments:RemedyPayment[]=[];
 function pay(from:Wallet,to:Wallet,request:number,reason:string){
  const amount=Math.max(0,Math.min(Math.floor(request),w.cash[from]));
  w.cash[from]-=amount;w.cash[to]+=amount;if(amount)payments.push({from,to,amount,reason});return amount;
 }
 const supported=control.outlook==='supported',adverse=control.outlook==='adverse';
 const baseWage=route==='consumption'&&adverse?10:20;
 // A tested income condition, not a magic cancellation of credit obligations.
 const wages=pay('shop','households',baseWage+(route==='consumption'&&control.mode==='raise'?dose:0)
  +(route==='consumption'&&supported?10:0),'工资');
 const openingPrincipal=w.principalDebt,openingInterest=w.interestDebt;
 const principal=Math.min(w.debt,w.cash.households),interest=w.debt?Math.ceil(w.debt/5):0;
 const repayment=pay('households','bank',principal+interest,'还本付息');
 // Split the existing single cash transfer, never book a second payment.
 // Unpaid interest remains separate, but is interest-bearing in this toy.
 const principalRepaid=Math.min(openingPrincipal,repayment),interestPaid=repayment-principalRepaid;
 w.principalDebt=openingPrincipal-principalRepaid;
 w.interestDebt=openingInterest+interest-interestPaid;
 w.debt=Math.max(0,w.debt+interest-repayment);
 const arrears=w.debt,creditStopped=route==='consumption'&&control.mode==='credit'&&arrears>0;
 const borrowed=route==='consumption'&&control.mode==='credit'&&!creditStopped?pay('bank','households',dose,'借款'):0;
 w.debt+=borrowed;
 w.principalDebt+=borrowed;
 const debtAccount:RemedyDebtAccount={openingPrincipal,openingInterest,interestCharged:interest,borrowed,principalRepaid,interestPaid,closingPrincipal:w.principalDebt,closingInterest:w.interestDebt};
 const upkeep=Math.ceil(w.capacity/5),costs=pay('shop','suppliers',Math.max(10,15-w.efficiency)+upkeep,'生产与维护');
 const lowestCash=w.cash.shop;
 const made=costs>=Math.max(10,15-w.efficiency)+upkeep&&wages>=baseWage?50+w.capacity:0;
 w.stock+=made;
 // Open experiments close these standing circuits with actual payments.
 // Owners receive an actual distribution; suppliers spend their actual receipts
 // on equipment. Neither is a new wallet, loan or subsidy. Legacy runs retain
 // their original finite purchasing funds and are replayed without this change.
 if(circular)pay('shop','owners',5,'业主领取');
 function order(from:Wallet,wanted:number,reason:string){const bought=pay(from,'shop',Math.min(w.stock,wanted),reason);w.stock-=bought;return bought;}
 // The shopping-list cap is a stated local assumption, not a ceiling on all human needs.
 order('households',supported&&route==='consumption'?40:30,'家庭购物');
 order('owners',5,'业主消费');
 if(circular)order('suppliers',costs,'供货商设备采购');
 else order('buyers',route==='investment'&&adverse?8:15,'原有设备订单');
 const investment=route==='investment'?order('buyers',adverse?Math.floor(dose/2):dose,'新增设备订单'):0;
 const preorders=route==='investment'&&supported?order('buyers',w.capacity,'已落实的下游订单'):0;
 // Equipment is useful next period. Replacement is not assumed to expand output.
 if(route==='investment'){
  if(control.mode==='expand')w.capacity+=investment;
  else w.efficiency=Math.min(5,w.efficiency+Math.floor(investment/5));
 }
 // In open play no date can silently cancel an order. A contraction must be
 // explicitly selected; the foreign customer's finite cash still limits payment.
 const quota=openProduction?(adverse?(control.mode==='diverse'?5:0):control.mode==='diverse'&&!supported?10:15)
  :adverse?(control.mode==='diverse'?5:0):control.mode==='diverse'?(n===1?15:10):(n===1||supported?15:n===2?5:3);
 const desiredExport=route==='exports'?dose:0;
 const foreignCash=w.cash.foreign;
 const exports=route==='exports'?order('foreign',Math.min(dose,quota),'海外订单'):0;
 const exportSupplyShortfall=route==='exports'?Math.max(0,Math.min(dose,quota,foreignCash)-exports):0;
 const requestedTransport=exports?Math.ceil(exports/5)+(control.mode==='diverse'?2:0):0;
 const transport=pay('shop','suppliers',requestedTransport,'运费与开拓市场');
 w.round=n;
 const sold=oldStock+made-w.stock;
 const report:RemedyReport={round:n,control:{...control},made,sold,stock:w.stock,newStock:w.stock-oldStock,wages,borrowed,repayment,
  debt:w.debt,arrears,creditStopped,investment,capacity:w.capacity,upkeep,transport,exports,lostExports:desiredExport-exports,preorders,costs,
  exportQuota:route==='exports'?Math.min(quota,foreignCash):0,exportSupplyShortfall,
  margin:sold-wages-costs-transport,cashChange:w.cash.shop-before,lowestCash,payments,debtAccount,world:w};
 if(w.debt!==w.principalDebt+w.interestDebt||w.principalDebt<0||w.interestDebt<0)throw new Error('Remedy debt breakdown is inconsistent');
 if(remedyMoney(w)!==REMEDY_INITIAL_MONEY||Object.values(w.cash).some(x=>!Number.isInteger(x)||x<0))throw new Error('Remedy ledger is not conserved');
 return report;
}
function accountsForRun(route:ReliefRoute,run:RemedyRun){
 let world=opening();const reports:RemedyReport[]=[];
 for(const control of run.history){const r=operate(world,route,control,run.flow);reports.push(r);world=r.world;}
 const compareBase=reports.length===3?reports[1].world:null;
 const comparisons=compareBase?run.comparisons.map(c=>operate(compareBase,route,c)):[];
 const trials=run.flow?reports:reports.length===3?[reports[2],...comparisons]:comparisons;
 const followupBases=(run.followups??[]).map(f=>trials.find(r=>controlKey(r.control)===controlKey(f.base))!);
 const followups=(run.followups??[]).map((f,i)=>operate(followupBases[i].world,route,f.control));
 const riskSeen=trials.some(r=>r.control.outlook==='adverse'),comparisonSeen=trials.some(r=>r.control.outlook==='supported');
 // A response is an actual fourth turn under the same shock, or a legacy
 // third-turn alternative. Opening a menu or editing a draft is not evidence.
 const responseSeen=followups.length>0||new Set(trials.filter(r=>r.control.outlook==='adverse').map(r=>JSON.stringify([r.control.mode,r.control.dose]))).size>1;
 return {opening:opening(),reports,comparisons,followups,followupBases,...(run.flow?{flow:run.flow}:{}),followupBase:followupBases.at(-1)??null,display:followups.at(-1)??comparisons.at(-1)??reports.at(-1)??null,
  thirdBaseline:reports[2]??null,comparisonSeen,riskSeen,responseSeen,canContinue:run.flow?reports.some(r=>r.made>0&&r.sold>0):riskSeen&&(responseSeen||comparisonSeen)};
}
export function remedyAccounts(s:RemedyLab){return {...accountsForRun(s.route,s),...(s.flow?{flow:s.flow}:{}),archives:(s.archives??[]).map(run=>accountsForRun(s.route,run))};}
export const REMEDY_SOURCES=[
 {title:'遨游之舟：资产阶级精英开出的药方（用户提供）',url:'https://www.zhihu.com/question/264895929/answer/1906437501',note:'三条路线的叙事来源；著作权归作者所有。这里对其机制进行条件化实验，并不将文中的所有历史因果判断作为事实。',access:'依据用户提供正文，不作为独立实证研究。'},
 {title:'美联储历史：次贷危机',url:'https://www.federalreservehistory.org/essays/subprime-mortgage-crisis',note:'2007—2010年的危机涉及高风险房贷、房价变化、证券化和融资收缩。本局只展示偿债与停贷的一条传导链，不是在复现整场危机。',access:'2026-10-11复核官方历史文章正文，未复算其引用研究。'},
 {title:'IMF：什么是凯恩斯主义（2014）',url:'https://www.imf.org/external/pubs/ft/fandd/2014/09/basics.htm',note:'凯恩斯主义关注有效需求和政策干预，不可简化为只让穷人借钱或印钱；政府购买也是需求来源。',access:'2026-10-11直开403；官方搜索索引返回正文，可核对四项需求与财政干预，未重做政策效果估计。'},
 {title:'BIS：家庭债务的短期与长期影响（2017）',url:'https://www.bis.org/publications/working-paper-607-real-effects-household-debt-short-and-long-run',note:'54个经济体、1990—2015年资料显示借债的短期与长期影响可能不同，不证明每笔贷款都会引发危机。作者观点不必代表BIS；不能把研究阈值当作本局或各国通用的债务上限。',access:'2026-10-11核对官方工作论文607网页及摘要索引，未阅读全文或复现回归。'},
 {title:'IMF：全球失衡需要合作调整（2018）',url:'https://www.imf.org/en/blogs/articles/2018/07/24/blog-addressing-global-imbalances-requires-cooperation',note:'文章讨论经常账户失衡及合作调整，不是双边贸易排名。经常账户与净出口不是同一个指标，不能把文中统计直接当作净出口。',access:'2026-10-11官方搜索索引返回文章正文；未读取其引用的完整外部部门报告。'},
 {title:'WTO：2023年世界贸易报告',url:'https://www.wto.org/english/res_e/publications_e/wtr23_e.htm',note:'报告讨论贸易分裂的风险及重新整合的益处。“出口”并不自动导向战争，本实验没有模拟战争。',access:'2026-10-11直开失败；官方出版页及发布新闻的索引正文可核对上述主题，未精读完整报告。'},
] as const;
