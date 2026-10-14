(function(root){
 'use strict';
 const POLICIES=['none','liquidity','equity','households'];
 function run(input){
  const config={capital:10,shock:'stable',rollover:true,policy:'none',protection:false,...input};
  if(![10,30].includes(config.capital)||!['stable','price','income'].includes(config.shock)||typeof config.rollover!=='boolean'||typeof config.protection!=='boolean'||!POLICIES.includes(config.policy))throw new RangeError('无效实验条件');
  const cash={h0:5,h1:5,h2:5,h3:5,originator:80,seller:0,investor:30,saver:80,fund:0,employers:48,homebuyer:60,service:0,treasury:20,bakery:4,w0:0,w1:0,w2:0,trader:10,insurer:20};
  const total=Object.values(cash).reduce((a,b)=>a+b,0),entries=[],snapshots={},mortgages=Array.from({length:4},(_,id)=>({id,principal:0,paid:0,late:0,owner:null,homeOwner:'seller',loss:0}));
  let funding=0,publicLoan=0,businessLoan=0,capitalInjection=0,familySupport=0;
  function pay(from,to,amount,why){if(!Number.isInteger(amount)||amount<0||cash[from]<amount)throw new Error('支付须有足额整币');if(amount){cash[from]-=amount;cash[to]+=amount;entries.push({from,to,amount,why});}}
  function book(){return mortgages.reduce((n,m)=>n+m.principal,0);}
  function expected(){return mortgages.reduce((n,m)=>n+(m.late?Math.min(m.principal,config.shock==='income'?14:24):m.principal),0);}
  function snapshot(name){snapshots[name]={cash:{...cash},mortgages:mortgages.map(m=>({...m})),funding,publicLoan,businessLoan,bookAssets:book()+businessLoan,expectedAssets:expected()+businessLoan,bookEquity:cash.fund+book()+businessLoan-funding-publicLoan,estimatedEquity:cash.fund+expected()+businessLoan-funding-publicLoan,entries:entries.length};}
  snapshot('opening');
  for(const m of mortgages){pay('originator','h'+m.id,20,'发放住房贷款');m.principal=20;m.owner='originator';pay('h'+m.id,'seller',25,'首付加贷款买房');m.homeOwner='h'+m.id;}
  snapshot('homes');
  pay('investor','fund',config.capital,'投资者出资');funding=80-config.capital;pay('saver','fund',funding,'短期资金借给信贷机构');
  pay('fund','originator',80,'购入整组房贷凭证');mortgages.forEach(m=>{m.owner='fund';});
  if(config.protection)pay('trader','insurer',1,'假想信用保护费');
  snapshot('pool');
  for(const m of mortgages){pay('employers','h'+m.id,config.shock==='income'?2:8,'本期家庭收入');const amount=Math.min(4,cash['h'+m.id]);pay('h'+m.id,'fund',amount,'房贷本期付款');m.paid=amount;m.principal-=Math.max(0,amount-1);m.late=4-amount;}
  snapshot('assessment');
  const eligible=config.policy!=='liquidity'||snapshots.assessment.estimatedEquity>0;
  if(config.policy==='liquidity'&&eligible){pay('treasury','fund',20,'公共账户周转贷款');publicLoan=20;}
  if(config.policy==='equity'){pay('treasury','fund',20,'公共账户认购股权');capitalInjection=20;}
  if(config.policy==='households')for(const m of mortgages)if(m.late){const aid=m.late;pay('treasury','h'+m.id,aid,'家庭还款补助');familySupport+=aid;pay('h'+m.id,'fund',aid,'补齐本期本金');m.principal-=aid;m.paid+=aid;m.late=0;}
  snapshot('support');
  // Teaching contract: an uncured arrear triggers an agreed collateral sale at
  // this checkpoint. Actual procedures, timing and recourse differ by jurisdiction.
  for(const m of mortgages)if(m.late){const sale=config.shock==='income'?15:25;pay('homebuyer','fund',sale,'处置抵押房屋');pay('fund','service',1,'处置服务费');const net=sale-1;m.loss=Math.max(0,m.principal-net);const surplus=Math.max(0,net-m.principal);pay('fund','h'+m.id,surplus,'返还处置余款');m.principal=0;m.late=0;m.homeOwner='homebuyer';}
  const creditLoss=mortgages.reduce((n,m)=>n+m.loss,0);
  if(config.protection&&creditLoss>0)pay('insurer','trader',5,'假想信用保护赔付');
  snapshot('collection');
  const fundingDue=config.rollover?0:20,fundingPaid=Math.min(fundingDue,cash.fund);pay('fund','saver',fundingPaid,'到期短期借款本金');funding-=fundingPaid;const fundingGap=fundingDue-fundingPaid;
  snapshot('funding');
  const capitalOkay=snapshots.funding.bookEquity>=8;
  businessLoan=capitalOkay&&!fundingGap?Math.min(8,cash.fund):0;
  const creditDecision={requested:8,granted:businessLoan,capital:snapshots.funding.bookEquity,minimumCapital:8,cashBefore:cash.fund,fundingGap,reasons:[]};
  if(!capitalOkay)creditDecision.reasons.push('capital');
  if(fundingGap)creditDecision.reasons.push('funding');
  if(capitalOkay&&!fundingGap&&businessLoan<8)creditDecision.reasons.push('cash');
  pay('fund','bakery',businessLoan,'面包店申请8枚周转贷款');
  const jobs=Math.min(3,Math.floor(cash.bakery/4));for(let id=0;id<jobs;id++)pay('bakery','w'+id,4,'面包店实际发薪');
  snapshot('bakery');
  return {config,cash,entries,snapshots,total,mortgages,creditLoss,fundingDue,fundingPaid,fundingGap,creditDecision,capitalOkay,eligible,publicLoan,capitalInjection,familySupport,businessLoan,jobs,lostJobs:3-jobs,homesLost:mortgages.filter(m=>m.homeOwner==='homebuyer').length,protectionGain:config.protection?cash.trader-10:0,publicAssetCost:publicLoan+capitalInjection,publicSpent:publicLoan+capitalInjection+familySupport};
 }
 root.MortgageLabModel={run,policies:POLICIES};
})(window);
