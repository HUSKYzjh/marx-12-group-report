/** Actual receipts pose the next question; plans and orders are not outcomes. */
import {demandTrialAccount,type PublicDemand,type DemandTrial} from './public-demand.ts';
const names=['阿面','小麦','团团','圆圆','阿青','阿蓝'];
const incomeProfile=(t:DemandTrial)=>Array.from({length:6},(_,person)=>[1,2].map(day=>t.income.filter(x=>x?.person===person&&x.day===day).length));
const deliveryProfile=(t:DemandTrial)=>Array.from({length:6},(_,person)=>[1,2].map(day=>t.deliveries.filter(x=>x.person===person&&x.day===day).length));
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function publicDemandExploration(s:PublicDemand){
 if(s.phase!=='lab'||s.step!=='result'||!s.run)return null;
 const now=demandTrialAccount(s.run),[today,tomorrow]=now.periods;
 const food=(day:typeof today,person:number)=>day.purchases[person]+day.provided[person];
 const borrower=s.run.loans.findIndex((yes,i)=>yes&&food(tomorrow,i)<2);
 const hungry=tomorrow.purchases.findIndex((_,i)=>food(tomorrow,i)<2);
 const focus=borrower>=0?borrower:hungry>=0?hungry:0;
 const receipt=now.repayments.find(x=>x.person===focus);
 let question=borrower>=0?`${names[focus]}今天吃了${food(today,focus)}个，明天只有${food(tomorrow,focus)}个。把一份钱留到明天呢？`
  :now.machine&&now.stock?`新炉第二天多做6个，最后还剩${now.stock}个。钱该先送给谁？`
  :hungry>=0?`${names[focus]}第二天没吃够。给他一份钱，还是替他买面包？`
  :'两天都吃够了。把一份钱挪一天，饭还够吗？';
 const roll=s.run.income.findIndex(x=>x?.person===focus);
 const unused=s.run.income.findIndex(x=>x===null);
 const editRoll=roll>=0?roll:unused>=0?unused:null;
 if(borrower>=0&&editRoll===null)question=`${names[focus]}明天只吃了${food(tomorrow,focus)}个。支持款都安排完了，该从哪里挪？`;
 else if(borrower>=0&&editRoll!==null){const when=s.run.income[editRoll]?.day;
  question=`${names[focus]}今天吃了${food(today,focus)}个，明天只有${food(tomorrow,focus)}个。`+(when===1?'把这份钱留到明天呢？':when===2?'把这份钱提前，饭钱会变吗？':'给他明天留一份，够吗？');
 }
 const personDays=now.periods.map(p=>({day:p.day,bought:p.purchases[focus],provided:p.provided[focus],
  income:s.run!.income.filter(x=>x?.person===focus&&x.day===p.day).length*2,
  walletAfterShopping:p.wallets[focus],repaid:p.repaid[focus],
  debt:p.day===1&&s.run!.loans[focus]?3:p.day===2?now.debt[focus]:0}));
 let comparison:null|{kind:'income-timing'|'income-amount'|'credit'|'capital';person:number|null;text:string}=null;
 const previous=s.trials.at(-2);
 if(previous&&!!previous.sharedBudget===!!s.run.sharedBudget){
  const before=demandTrialAccount(previous),ip=incomeProfile(previous),ic=incomeProfile(s.run);
  const sameIncome=equal(ip,ic),sameDeliveries=equal(deliveryProfile(previous),deliveryProfile(s.run));
  const changedLoans=s.run.loans.flatMap((v,i)=>v!==previous.loans[i]?[i]:[]);
  const machineChanged=!!s.run.machine!==!!previous.machine;
  const differences=ic.flatMap((v,i)=>v.flatMap((n,d)=>n-ip[i][d]?[{person:i,day:d,amount:n-ip[i][d]}]:[]));
  const summary=(i:number)=>`${names[i]}两天吃到${before.periods.map(p=>food(p,i)).join('／')} → ${now.periods.map(p=>food(p,i)).join('／')}个，最后欠${before.debt[i]} → ${now.debt[i]}枚。`;
  if(sameDeliveries&&!machineChanged&&!changedLoans.length&&differences.length){
   if(differences.length===2&&differences[0].person===differences[1].person&&differences.every(x=>Math.abs(x.amount)===1)&&differences[0].amount+differences[1].amount===0){
    const i=differences[0].person;comparison={kind:'income-timing',person:i,text:'只挪一份钱的日期；'+summary(i)};
   }else if(differences.length===1&&Math.abs(differences[0].amount)===1){
    const i=differences[0].person;comparison={kind:'income-amount',person:i,text:'只改一份2枚支持款；'+summary(i)};
   }
  }else if(sameIncome&&sameDeliveries&&!machineChanged&&changedLoans.length===1){
   const i=changedLoans[0];comparison={kind:'credit',person:i,text:'只改这个人的借款；'+summary(i)};
  }else if(sameIncome&&sameDeliveries&&!changedLoans.length&&machineChanged){
   comparison={kind:'capital',person:null,text:`只改购炉；产出${before.periods.reduce((n,p)=>n+p.produced,0)} → ${now.periods.reduce((n,p)=>n+p.produced,0)}个，剩货${before.stock} → ${now.stock}个，公共支出${32-before.publicFund} → ${32-now.publicFund}枚。`};
  }
 }
 return {question,focusPerson:focus,name:names[focus],personDays,repayment:receipt??null,editRoll,
  editWasPaid:editRoll!==null&&s.run.income[editRoll]!==null,
  editSlot:editRoll===null?null:s.run.income[editRoll],comparison};
}
