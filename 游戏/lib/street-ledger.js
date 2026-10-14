/* Read-only shop accounts. All money below is integer cents, like the model.
 * Never infer profit from cash or attribute street-wide reports to one shop. */
(function(root){
 'use strict';
 var names={bakery:'我们的面包店',rival:'另一家面包店',clothes:'服装店',cars:'车厂',ovens:'烤炉厂',inputs:'原料和仓储'};
 var products={bakery:'面包',rival:'面包',clothes:'衣服',cars:'汽车',ovens:'普通烤炉',inputs:'原料包'};
 var units={bakery:'个',rival:'个',clothes:'件',cars:'辆',ovens:'台',inputs:'份'};
 var requirements={bakery:1,rival:1,clothes:2,cars:4,ovens:3,inputs:0};
 var holding={bakery:6,rival:6,clothes:2,cars:1,ovens:1,inputs:0};
 var kinds={wage:'员工工资',inputs:'原料',bread:'面包销售',clothes:'衣服销售',car:'汽车销售',storage:'剩货保管',rent:'店租',equipment:'设备材料与安装',liquidation:'设备与原料变卖',replacement:'更换旧炉','new-oven':'购置烤炉',severance:'离职安置款','owner-budget':'老板个人消费预算'};
 function entries(report,id){
  var rows={},incoming=0,outgoing=0;
  (report?report.transactions:[]).forEach(function(t){
   if(t.from!==id&&t.to!==id)return;
   var direction=t.to===id?'in':'out',key=direction+':'+t.kind,amount=Math.round(t.amount*100);
   if(!amount)return;
   var label=t.kind==='owner-purchase'?'老板个人消费代付':direction==='in'&&t.kind==='inputs'?'原料销售':direction==='in'&&t.kind==='storage'?'保管服务收入':direction==='in'&&['new-oven','replacement'].includes(t.kind)?'烤炉销售':kinds[t.kind]||'其他款项';
   if(!rows[key])rows[key]={kind:t.kind,label:label,direction:direction,amount:0,quantity:0};
   rows[key].amount+=amount;rows[key].quantity+=t.quantity||0;
   if(direction==='in')incoming+=amount;else outgoing+=amount;
  });
  return {rows:Object.keys(rows).map(function(key){return rows[key];}),incoming:incoming,outgoing:outgoing,net:incoming-outgoing};
 }
 function inspect(g,id){
  var f=g.world.firms.find(function(f){return f.id===id;});if(!f)return null;
  var reports=(g.history||[]).filter(function(r){return !r.management;}).slice();
  if(g.report&&!g.report.management&&!reports.some(function(r){return r.round===g.report.round;}))reports.push(g.report);
  reports.sort(function(a,b){return a.round-b.round;});
  var report=reports.filter(function(r){return r.round===g.world.round;}).pop()||null;
  var flows=entries(report,id),before=report&&g.checkpoint&&g.checkpoint.round===report.round-1?g.checkpoint.firms.find(function(f){return f.id===id;}):null;
  var baking=id==='bakery'||id==='rival',price=id==='bakery'?g.price*100:f.price,wage=id==='bakery'?g.wage*100:f.wage;
  var usable=baking?f.ovenAges.map(function(age,i){return {age:age,capacity:(f.ovenCapacities||[])[i]||6};}).filter(function(o){return o.age<12;}).sort(function(a,b){return b.capacity-a.capacity;}):[];
  var planned=baking?Math.min(f.workers.length,usable.length,id==='bakery'?g.shifts:f.workers.length):f.workers.length;
  var capacity=baking?usable.slice(0,planned).reduce(function(n,o){return n+o.capacity;},0):planned*(id==='inputs'?48:f.productivity||1);
  var raw=capacity*requirements[id],packs=Math.ceil(Math.max(0,raw-f.inputs)/4),supplier=g.world.firms.find(function(f){return f.id==='inputs';});
  var staff=f.workers.map(function(pid,i){var p=g.world.people.find(function(p){return p.id===pid;});return {id:pid,name:(baking?'厨师':'员工')+' '+(i+1),cash:p.cash,paid:report?(report.transactions||[]).filter(function(t){return t.kind==='wage'&&t.from===id&&t.to===pid;}).reduce(function(n,t){return n+Math.round(t.amount*100);},0):null};});
  var latestDecision=null;reports.forEach(function(r){(r.firmDecisions||[]).forEach(function(d){if(d.firm===id)latestDecision=Object.assign({},d);});});
  if(g.report&&g.report.management)(g.report.firmDecisions||[]).forEach(function(d){if(d.firm===id)latestDecision=Object.assign({},d);});
  return {id:id,name:names[id],product:products[id],unit:units[id],round:g.world.round,cash:f.cash,stock:f.stock,inputs:f.inputs,working:f.working,produced:f.produced,sold:f.sold,
   decision:latestDecision,policy:f.firmPolicy?Object.assign({},f.firmPolicy):null,ovenPrice:g.world.firms.find(function(f){return f.id==='ovens';}).price,
   price:price,wage:wage,lastPrice:f.price,lastWage:f.wage,pending:price!==f.price||wage!==f.wage,staff:staff,machines:f.machines,usable:usable.length,baking:baking,
   estimate:{workers:planned,capacity:capacity,raw:raw,packs:packs,packPrice:supplier.price,wages:planned*wage,materials:packs*supplier.price,revenue:capacity*(id==='inputs'?price/4:price)},
   holdingUnit:holding[id],storageDebt:f.storageDebt||0,rentDebt:f.rentDebt||0,rentModel:!!g.world.rentPerDay,rentPerDay:id==='inputs'?0:g.world.rentPerDay||0,holdingEstimate:holding[id]?Math.ceil(f.stock/holding[id])*100:0,
   storage:report&&(report.storageCharges||[]).find(function(c){return c.firm===id;})?Object.assign({},report.storageCharges.find(function(c){return c.firm===id;})):null,
   day:report?{round:report.round,flows:flows,opening:before?before.cash:null,closing:before?before.cash+flows.net:null,accounts:id==='bakery'?report.accounts:null}:null,
   management:g.report&&g.report.management?entries(g.report,id):null,
   history:reports.slice(-3).map(function(r){return {round:r.round,flows:entries(r,id)};})};
 }
 root.StreetLedger={inspect:inspect,entries:entries,names:names};
})(window);
