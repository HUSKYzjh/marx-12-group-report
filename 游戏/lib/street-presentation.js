/* Pure presentation helpers; animation never changes the committed economy. */
(function(root){
 'use strict';
 function whole(cash){return Math.floor(cash/100);}
 function amount(coins){return Number.isInteger(coins)?String(coins):Math.floor(coins)+'（另有旧零钱）';}
 function change(report){return Math.floor(report.cash)-Math.floor(report.cash-report.cashChange+1e-8);}
 function ownerFunds(person,world){if(!person.owner)return 0;var f=world.firms.find(function(f){return f.id===person.owner;});return Math.max(0,Math.floor((f.cash-f.wage*f.workers.length*3)/100)*100);}
 // Place the complete portrait, including headwear, inside its own cell.
 // Bounds may have a negative origin because sprites are anchored at the feet.
 function fitPerson(bounds,cell,preferredScale){
  var scale=Math.min(preferredScale,cell.width/Math.max(1,bounds.width),cell.height/Math.max(1,bounds.height));
  return {scale:scale,x:cell.x+cell.width/2-(bounds.x+bounds.width/2)*scale,y:cell.y+cell.height-(bounds.y+bounds.height)*scale};
 }
 function visits(person,world,report){
  if(!report||report.management||!person.shopping||person.shopping.round!==world.round)return [];
  var tx=report.transactions.filter(function(t){return t.from===person.id;}),stops=[];
  person.shopping.items.forEach(function(item){
   if(stops.some(function(s){return s.outcome==='money';}))return;
   var purchases=tx.filter(function(t){return t.kind===item.kind;}),stores=[];
   purchases.forEach(function(t){if(stores.indexOf(t.to)<0)stores.push(t.to);});
   if(!stores.length)stores=[item.kind==='bread'?world.firms.filter(function(f){return f.id==='bakery'||f.id==='rival';}).sort(function(a,b){return a.price-b.price||a.id.localeCompare(b.id);})[0].id:item.kind==='car'?'cars':'clothes'];
   stores.forEach(function(firm){stops.push({firm:firm,kind:item.kind,outcome:item.outcome,bought:purchases.some(function(t){return t.to===firm;})});});
  });
  return stops;
 }
 function counter(position,index){return {x:position.box[0]+position.box[2]*(.12+(index%4)*.25),y:position.box[1]+position.shopHeight};}
 function timing(count,index){var start=2.1+(index%5)*.1;return {start:start,span:(7.5-start)/(count+1)};}
 function worried(time,stops,index){var leg=stops.findIndex(function(s){return s.outcome==='money';});if(leg<0)return false;var clock=timing(stops.length,index);return time>=clock.start+(leg+.6)*clock.span;}
 function trip(time,home,stops,index){
  var clock=timing(stops.length,index),end=7.5;
  if(!stops.length||time<clock.start||time>=end)return {x:home.x,y:home.y,state:'home',visit:null,leg:-1};
  var leg=Math.min(stops.length,Math.floor((time-clock.start)/clock.span)),u=(time-clock.start)/clock.span-leg;
  var from=leg?stops[leg-1].point:home,to=leg<stops.length?stops[leg].point:home;
  var progress=Math.min(1,u/.6);progress=progress*progress*(3-2*progress);
  return {x:from.x+(to.x-from.x)*progress,y:from.y+(to.y-from.y)*progress,state:leg===stops.length?'return':u<.6?'walk':'counter',visit:leg<stops.length?stops[leg]:null,leg:leg};
 }
 root.StreetPresentation={whole:whole,amount:amount,change:change,ownerFunds:ownerFunds,fitPerson:fitPerson,visits:visits,counter:counter,timing:timing,trip:trip,worried:worried};
})(window);
