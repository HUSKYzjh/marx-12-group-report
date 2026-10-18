import {simpleRules} from './simple-consequences.mjs';
// A read-only report of recorded payments. No alternative history or new model rules.
export function tradeReceipt(round,id=0){
 if(!round||![0,1].includes(id))return null;
 const from='f'+id,out=round.receipts.filter(p=>p.from===from),incoming=round.receipts.filter(p=>p.to===from);
 const sum=reason=>out.filter(p=>p.reason===reason).reduce((n,p)=>n+p.amount,0);
 return {day:round.day,made:round.made[id],sold:round.sold[id],stock:round.stock[id],
  wages:sum('工资'),inputs:sum('原料'),owner:sum('老板生活费'),
  equipment:sum('订购普通炉')+sum('升级快炉'),storage:sum('保管')+sum('补付保管'),
  compensation:sum('解聘补偿'),revenue:incoming.reduce((n,p)=>n+p.amount,0),
  outflow:out.reduce((n,p)=>n+p.amount,0),change:round.after[id]-round.before[id]};
}
export function ovenReport(world){
 if(!world?.history?.length)return null;
 const last=world.history.at(-1),current=tradeReceipt(last),previous=tradeReceipt(world.history.at(-2));
 const installed=last.changes?.some(c=>c.shop===0&&c.next.fastOvens>c.fast)||false;
 const shared=world.shops.every(f=>f.fastOvens>0);
 return {current,previous,installed,shared,
  headline:simpleRules(world)&&installed?'今天换炉，今天增产。':shared?'两家都有快炉了。':installed?'炉子到了。客人没跟着装箱。':'炉子快了，钱呢？',
  note:simpleRules(world)?'换炉只改变产能，人数和工资不变；多做出来不保证卖得掉。':shared?'技术不再只有你家有。谁能卖掉，还看售价、工资和客人的钱包。':current.made>current.sold?'做出来，不等于卖出去。余下的面包还要保管。':'这一天的货卖出去了。机器能否划算，还得看后面的订单。'};
}
