import fs from 'node:fs/promises';
import path from 'node:path';
import {createStreet,streetRound,simulateStreet,moneyTotal,STREET_PRICES} from '../lib/street-market-prototype.ts';
const output=path.resolve('outputs/street-model');await fs.mkdir(output,{recursive:true});
const grid=[];
for(let wage=3;wage<=7;wage++)for(let breadPrice=1;breadPrice<=4;breadPrice+=.5)for(const imitation of [false,true])for(const expand of [false,true]){
  const policy={wage,breadPrice,imitation,expand,rivalExpand:expand};
  const {state,history}=simulateStreet(policy,48);
  grid.push({...policy,totalSold:history.reduce((n,r)=>n+r.sold,0),stockAt8:history[7].stock,stockAt24:history[23].stock,
    stockAt48:history[47].stock,oursCash:history[47].ours.cash,employed:history[47].employed,
    roundsWithNoBreadStock:history.filter(r=>r.stock===0).length,cashConserved:moneyTotal(state)===state.initialMoney});
}
const examples={};
for(const [name,policy] of Object.entries({baseline:{wage:5,breadPrice:2.5},lowPayExpansion:{wage:3,breadPrice:2.5,imitation:true,expand:true,rivalExpand:true},highPayExpansion:{wage:7,breadPrice:2.5,imitation:true,expand:true,rivalExpand:true},lowerPrice:{wage:3,breadPrice:1,imitation:true,expand:true,rivalExpand:true},layoff:{wage:5,breadPrice:2.5,layoffAt:9,layoffs:1,otherLayoffs:true}})){
  const {history}=simulateStreet(policy,24);examples[name]={policy,history};
}
const initial=createStreet();let last=initial;
for(let i=0;i<8;i++)last=streetRound(last).state;
const before=structuredClone(last),cut=streetRound(before,{layoffAt:9,layoffs:1});
const severanceSensitivity=[0,5,10].map(severance=>({severance,report:streetRound(before,{layoffAt:9,layoffs:1,severance}).report}));
const report={status:'PASS',scope:'offline calibration prototype, not integrated gameplay or an empirical economy',prices:STREET_PRICES,
  cases:grid.length,cashConserved:grid.every(r=>r.cashConserved),noStockCasesAt8:grid.filter(r=>r.stockAt8===0).length,
  noStockCasesAt24:grid.filter(r=>r.stockAt24===0).length,grid,examples,
  layoffComparison:{beforeWorkers:before.firms[0].workers.length,afterWorkers:cut.report.ours.workers,beforeMachines:before.firms[0].machines,afterMachines:cut.report.ours.machines,afterProduction:cut.report.ours.produced},severanceSensitivity,
  limitations:['all prices/endowments and preferences are authored','raw materials, depreciation valuation, taxes, credit and foreign trade omitted','cash balance is not profit or surplus-value','numerical stability is not economic equilibrium','durable stock targets and twelve-use oven life are teaching assumptions, not measured lifetimes'],date:new Date().toISOString()};
await fs.writeFile(path.join(output,'price-calibration.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({cases:report.cases,cashConserved:report.cashConserved,noStockCasesAt8:report.noStockCasesAt8,noStockCasesAt24:report.noStockCasesAt24,
  examples:Object.fromEntries(Object.entries(examples).map(([name,e])=>[name,[e.history[7],e.history[23]]]))},null,2));
