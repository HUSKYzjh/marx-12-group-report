// Presentation derived from actual receipts. No new demand, money or penalties.
export function pressureFeedback(world) {
 const last=world.history.at(-1),previous=world.history.at(-2),first=world.history[0];
 const unpaid=world.people.slice(0,8).filter(p=>!world.firms[p.home].workers.includes(p.id)).map(p=>p.id);
 const poor=last?last.visits.filter(v=>!v.success&&v.reason==='钱不够').map(v=>v.person):[];
 const fired=last?last.before.firms[0].workers.filter(id=>!world.firms[0].workers.includes(id)):[];
 const wages=last?last.wages.reduce((a,b)=>a+b,0):null;
 const initialWages=first?first.wages.reduce((a,b)=>a+b,0):null;
 const firstClosure=!!last?.closed[0]&&!world.history.slice(0,-1).some(r=>r.closed[0]);
 const firstPoor=poor.length>0&&!world.history.slice(0,-1).some(r=>r.shortOfMoney>0);
 const cashChange=last?last.cashAfter[0]-last.cashBefore[0]:0;
 const checkpoint=world.day===9?'end':firstPoor?'poor':firstClosure?'closed':fired.length?'fired':null;
 let message='隔壁先裁两人，再把工资和价签压到1。';
 if(last){
  if(last.support){
   const paid=last.support.paid.length;
   const distribution=paid?'这天保障发给了'+paid+'人。':'这天没有发出保障。';
   message=distribution+(poor.length?'仍有'+poor.length+'人有货却买不起。':last.stockOut?'还有'+last.stockOut+'人没买到：面包卖完了。':'11人都买到了面包，但不等于剩货卖完了。');
  }
  else if(firstPoor)message='人来了，钱不够。面包还在柜台上。';
  else if(last.closed[0])message=world.firms[0].fast?'省了工资，也没留够下一次开炉的钱。':world.firms[0].price===1?'价降了，卖回的钱仍不够继续开炉。':'客人没抢回来，店里的钱先撑不住了。';
  else if(fired.length)message='这次少发了'+(last.before.firms[0].workers.length*last.before.firms[0].wage-last.wages[0])+'金币。没了工资的人，先花积蓄。';
  else if(poor.length)message='想吃面包的人没少，有钱买的人少了。';
  else if(world.day===1)message='连你的厨师，也去隔壁买了面包。';
  else if(world.firms[0].fast)message='工资省下了。再看看那四个老顾客的钱包。';
  else if(world.firms[0].price===1)message='价签降了，四份工资仍然要发。';
  else message='你没降价。客人继续往隔壁去。';
 }
 return {day:world.day,cashChange,wages,initialWages,unpaid,poor,fired,checkpoint,message,
  savings:unpaid.map(id=>({id,opening:first?.before.people[id].cash??world.people[id].cash,current:world.people[id].cash})),
  newlyPoor:poor.filter(id=>!previous?.visits.some(v=>v.person===id&&!v.success&&v.reason==='钱不够'))};
}
