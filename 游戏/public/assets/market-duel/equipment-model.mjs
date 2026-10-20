// Equipment arrives tomorrow; a whole-shop upgrade pauses today's baking, not wages.
export const EQUIPMENT_COST={buy:10,upgrade:8};
export const WORKERS=Array.from({length:8},(_,i)=>i);
export const batchUpgrade=w=>w.upgradeRule==='whole-shop-v1';
export const upgradeCost=f=>EQUIPMENT_COST.upgrade*(readyShop(f).ovens-readyShop(f).fastOvens);
export function equipmentWorld(social=false,batch=true){
 const world={day:0,shops:[0,1].map(id=>({id,cash:36,price:social?2:3,wage:2,workers:[id*4,id*4+1,id*4+2],ovens:1,fastOvens:0,fast:false,pending:null,quantity:6,nextQuantity:6,bread:[],debt:0})),history:[]};
 if(batch)world.upgradeRule='whole-shop-v1';
 return social?{...world,seed:17,supplier:8,people:Array.from({length:10},(_,id)=>({id,cash:id<8?5:0}))}:{...world,outside:2000};
}
// A view-only first-day example. Reuse the actual opening settlement for costs;
// hypothetical sales never change a player's world or saved record.
export function openingTradeExample(sold){
 if(!Number.isInteger(sold))throw Error('Whole bread only');
 const world=equipmentWorld(),round=equipmentRound(world,'hold','steady').history[0];
 const quantity=round.made[0],count=Math.max(0,Math.min(quantity,sold));
 const operating=round.receipts.filter(p=>p.from==='f0'&&p.reason!=='保管').reduce((sum,p)=>sum+p.amount,0);
 const storage=Math.ceil((quantity-count)/6),revenue=count*world.shops[0].price;
 return {sold:count,quantity,revenue,operating,storage,change:revenue-operating-storage};
}
export function equippedCapacity(f){
 const fastHands=Math.min(f.workers.length,2*f.fastOvens);
 return fastHands*6+Math.min(f.workers.length-fastHands,3*(f.ovens-f.fastOvens))*2;
}
export const readyShop=f=>({...f,...(f.pending||{}),pending:null});
export function vacantWorkers(w){const occupied=new Set(w.shops.flatMap(f=>readyShop(f).workers));return WORKERS.filter(id=>!occupied.has(id));}
function planFor(w,action){
 const f=readyShop(w.shops[0]),next={ovens:f.ovens,fastOvens:f.fastOvens,workers:f.workers.slice(),wage:f.wage};
 if(action==='buy')next.ovens++;
 if(action==='upgrade')next.fastOvens=batchUpgrade(w)?next.ovens:next.fastOvens+1;
 if(action==='hire')next.workers.push(vacantWorkers(w)[0]);
 if(action==='fire')next.workers.pop();
 if(action==='wage-down')next.wage--;
 if(action==='wage-up')next.wage++;
 return next;
}
export function equipmentMoves(w,social=false){
 const f=readyShop(w.shops[0]),moves=[
  {id:'price-down',name:'调低售价',icon:'tag',hint:`${f.price} → ${Math.max(1,f.price-1)} 金币 · 今天`,detail:'便宜的先卖。抢到客人，也得算算每个少收的那一块。'},
  {id:'price-up',name:'调高售价',icon:'tag',hint:`${f.price} → ${Math.min(5,f.price+1)} 金币 · 今天`,detail:'每个多收一块。客人看完价签，可能顺便看一眼隔壁。'},
  {id:'buy',name:'购置机器',icon:'oven',hint:'添一台普通炉 · 明天到',detail:'付10金币，明天添炉。炉子不带免费厨师，多出来的炉子还得有人操作。'},
  {id:'upgrade',name:'升级新机',icon:'oven',hint:batchUpgrade(w)?`${f.ovens-f.fastOvens}台旧炉 · ${upgradeCost(f)}金币 · 停工1天`:'一台旧炉换快炉 · 明天到',detail:batchUpgrade(w)?`一次付${upgradeCost(f)}金币，升级全部${f.ovens-f.fastOvens}台旧炉。今天停炉安装，工资照发，只卖已有面包；明天可复工，仍需付得起开销。快炉2人做12个，它负责快，不负责卖。`:'付8金币，明天换快炉：普通炉3人做6个，快炉2人做12个。它负责快，不负责卖。'},
  {id:'hire',name:'招工',icon:'people',hint:`${f.workers.length} → ${Math.min(6,f.workers.length+1)} 人 · 明天上班`,detail:'从街上待业者中招一人，明天开工。员工来了，工资单也来了。'},
  {id:'fire',name:'解聘',icon:'people',hint:`${f.workers.length} → ${Math.max(1,f.workers.length-1)} 人 · 明天离岗`,detail:`今天工资照发，另付${f.wage}金币补偿。明天离岗。工作没了，肚子还在。`},
 ];
 if(social)moves.push(
  {id:'wage-down',name:'降低工资',icon:'people',hint:`每人 ${f.wage} → ${Math.max(1,f.wage-1)} 金币 · 明天`,detail:'明天每人少领一块。你的工资单瘦了，他们的钱包也瘦了。',group:'wages'},
  {id:'wage-up',name:'提高工资',icon:'people',hint:`每人 ${f.wage} → ${Math.min(4,f.wage+1)} 金币 · 明天`,detail:'明天每人多领一块。钱从你的店里出去，随后可能去隔壁买面包。',group:'wages'});
 moves.push({id:'hold',name:'照常营业',icon:'bread',hint:'今天照旧',detail:'今天不加新安排。昨天订的炉子、说好的用工调整，还是会来。'});return moves;
}
export function equipmentIssue(w,action,social=false,allowWages=social){
 if(!equipmentMoves(w,allowWages).some(m=>m.id===action))return '没有这项策略。';
 const f=readyShop(w.shops[0]);
 if(action==='price-down'&&f.price<=1)return '售价最低1金币。';
 if(action==='price-up'&&f.price>=5)return '本实验售价最高5金币。';
 if(action==='buy'&&f.ovens>=3)return '最多3台炉。店里还得留个门。';
 if(action==='upgrade'&&f.fastOvens>=f.ovens)return '全是快炉了。已经快到头了。';
 if(action==='hire'&&(f.workers.length>=6||!vacantWorkers(w).length))return f.workers.length>=6?'最多6人。再招，店里站不下。':'街上没人待业。老板先别招自己。';
 if(action==='fire'&&f.workers.length<=1)return '最后一位了。总得有人开炉。';
 if(action==='wage-down'&&f.wage<=1)return '本实验工资最低1金币。';
 if(action==='wage-up'&&f.wage>=4)return '本实验工资最高4金币。';
 const installing=action==='upgrade'&&batchUpgrade(w);
 const upfront=action==='buy'?10:action==='upgrade'?(installing?upgradeCost(f):8):action==='fire'?f.wage:0;
 const operating=f.workers.length*f.wage+(installing?0:Math.ceil(equippedCapacity(f)/(social?4:2)))+2+f.debt;
 return upfront&&f.cash<upfront+operating?`钱包不同意：需${upfront+operating}金币，含今天开支。`:'';
}
export function equipmentRival(w){
 if(w.day===0)return {name:'降薪、降价',line:'“工资少一块，面包少一块。双喜临门！”'};
 if(w.day===1)return {name:batchUpgrade(w)?'停工升级快炉':'预订快炉',line:batchUpgrade(w)?'“今天装炉，明天加速。工资单倒是不肯休息。”':'“明天快炉到！面包，给我加速！”'};
 if(w.day===2)return {name:'解聘一人',line:'“快炉只要两人。你明天不用来了。”'};
 return {name:'继续低价',line:'“一块一个！薄利多销，多销，多销……”'};
}
const random=(w,id)=>{let n=(w.seed+w.day*104729+id*7919)>>>0;n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296;};
export function equipmentRound(input,action,mode,allowWages=mode==='social'){
 const social=mode==='social',w=structuredClone(input),f=w.shops[0];
 if(equipmentIssue(input,action,social,allowWages))throw Error('Unavailable equipment move');
 const r={day:++w.day,action,move:equipmentMoves(input,allowWages).find(m=>m.id===action).name,rival:social?equipmentRival(input).name:'按原计划开炉',before:input.shops.map(f=>f.cash),receipts:[],made:[0,0],sold:[0,0],wages:[0,0],spoiled:[0,0],stopped:[false,false],fired:[],hired:[],visits:[],changes:[]};
 if(batchUpgrade(w))r.installing=[false,false];
 const purse=k=>k==='outside'?{get cash(){return w.outside;},set cash(v){w.outside=v;}}:k==='supplier'?{get cash(){return w.supplier;},set cash(v){w.supplier=v;}}:k[0]==='f'?w.shops[+k[1]]:w.people[+k.slice(1)];
 const pay=(from,to,n,reason)=>{if(!Number.isInteger(n)||n<0||purse(from).cash<n)throw Error('Unfunded equipment payment');if(!n)return;purse(from).cash-=n;purse(to).cash+=n;r.receipts.push({from,to,amount:n,reason});};
 const seller=social?'supplier':'outside';
 for(const shop of w.shops){
  if(shop.pending){r.fired.push(...shop.workers.filter(id=>!shop.pending.workers.includes(id)));r.hired.push(...shop.pending.workers.filter(id=>!shop.workers.includes(id)));r.changes.push({shop:shop.id,old:shop.ovens,fast:shop.fastOvens,workers:shop.workers.length,next:structuredClone(shop.pending)});Object.assign(shop,shop.pending);shop.pending=null;}
  shop.fast=shop.fastOvens>0;shop.quantity=equippedCapacity(shop);
 }
 r.committed=w.shops.map(f=>f.quantity);
 if(action==='price-down')f.price--;
 if(action==='price-up')f.price++;
 if(['buy','upgrade','hire','fire','wage-down','wage-up'].includes(action)){
  if(action==='buy'||action==='upgrade')pay('f0',seller,action==='upgrade'&&batchUpgrade(w)?upgradeCost(f):EQUIPMENT_COST[action],action==='buy'?'订购普通炉':'升级快炉');
  if(action==='upgrade'&&batchUpgrade(w))r.installing[0]=true;
  if(action==='fire')pay('f0',social?'p'+f.workers.at(-1):'outside',f.wage,'解聘补偿');
  f.pending=planFor(input,action);
 }
 if(social){
  const rival=w.shops[1];rival.price=1;rival.wage=1;
  const cost=rival.workers.length+Math.ceil(equippedCapacity(rival)/4)+2+rival.debt;
  if(w.day===2){const investment=batchUpgrade(w)?upgradeCost(rival):8,overhead=batchUpgrade(w)?rival.workers.length+2+rival.debt:cost;if(investment>0&&rival.cash>=overhead+investment){pay('f1','supplier',investment,'升级快炉');rival.pending={ovens:rival.ovens,fastOvens:batchUpgrade(w)?rival.ovens:1,workers:rival.workers.slice(),wage:1};if(batchUpgrade(w))r.installing[1]=true;}else r.rival='现金不足，没能订炉';}
  if(w.day===3&&rival.workers.length>2&&rival.cash>=cost+1){pay('f1','p'+rival.workers.at(-1),1,'解聘补偿');rival.pending={ovens:rival.ovens,fastOvens:rival.fastOvens,workers:rival.workers.slice(0,-1),wage:1};}
 }
 for(const shop of w.shops){
  const id=shop.id,fresh=shop.bread.filter(b=>w.day-b.day<2);r.spoiled[id]=shop.bread.length-fresh.length;shop.bread=fresh;
  const installing=r.installing?.[id]||false,raw=installing?0:Math.ceil(shop.quantity/(social?4:2)),payroll=shop.workers.length*shop.wage;
  if(shop.cash<payroll+raw+2+shop.debt){r.stopped[id]=true;continue;}
  pay('f'+id,seller,shop.debt,'补付保管');shop.debt=0;
  for(const pid of shop.workers)pay('f'+id,social?'p'+pid:'outside',shop.wage,'工资');r.wages[id]=payroll;
  pay('f'+id,seller,raw,'原料');pay('f'+id,social?'p'+(8+id):'outside',2,'老板生活费');
  r.stopped[id]=installing;r.made[id]=installing?0:shop.quantity;for(let n=0;n<r.made[id];n++)shop.bread.push({id:`${mode}:${w.day}:${id}:${n}`,day:w.day});
 }
 const demand=social?11:mode==='steady'?12:[12,20,20,6,12][w.day-1];r.demand=demand;r.heard=input.history.at(-1)?.demand??12;
 const buyers=Array.from({length:demand},(_,id)=>id);if(social)buyers.sort((a,b)=>random(w,a)-random(w,b));
 for(const id of buyers){
  const from=social?(id===10?'supplier':'p'+id):'outside',preference=social?(random({...w,seed:w.seed+101},id)<.5?0:1):(id+w.day)%2;
  const available=w.shops.filter(f=>f.bread.length).sort((a,b)=>a.price-b.price||(a.id===preference?-1:1)),shop=available.find(f=>purse(from).cash>=f.price);
  if(shop){const bread=shop.bread.shift();pay(from,'f'+shop.id,shop.price,'买面包');r.sold[shop.id]++;r.visits.push({id,shop:shop.id,bought:true,bread:bread.id});}
  else r.visits.push({id,shop:available[0]?.id??preference,bought:false,reason:available.length?'钱不够':'卖完了'});
 }
 for(const shop of w.shops){const due=Math.ceil(shop.bread.length/6),paid=Math.min(shop.cash,due);pay('f'+shop.id,seller,paid,'保管');shop.debt+=due-paid;shop.nextQuantity=equippedCapacity(readyShop(shop));}
 r.scheduled=w.shops.map(f=>f.nextQuantity);r.after=w.shops.map(f=>f.cash);r.stock=w.shops.map(f=>f.bread.length);r.poor=r.visits.filter(v=>v.reason==='钱不够').length;r.missed=r.visits.filter(v=>!v.bought).length;w.history.push(r);
 const total=w.shops.reduce((n,f)=>n+f.cash,0)+(social?w.supplier+w.people.reduce((n,p)=>n+p.cash,0):w.outside);
 if(total!==(social?120:2072))throw Error('Equipment ledger mismatch');
 const all=w.shops.flatMap(f=>readyShop(f).workers);if(new Set(all).size!==all.length||all.some(id=>!WORKERS.includes(id)))throw Error('Duplicate worker');
 return w;
}
