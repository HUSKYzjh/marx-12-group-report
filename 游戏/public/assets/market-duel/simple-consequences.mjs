import {equipmentWorld,vacantWorkers} from './equipment-model.mjs';

export const SIMPLE_RULE='immediate-consequences-v1';
export const simpleRules=world=>world?.ruleSet===SIMPLE_RULE;
export const simpleCapacity=shop=>6*(shop.ovens+shop.fastOvens);
export function simpleWorld(social=false){return {...equipmentWorld(social),ruleSet:SIMPLE_RULE};}
export const simpleRival=()=>({name:'照常营业',line:'“我照常卖。看看你这一步会怎样。”'});
export function simpleMoves(world,allowWages=false){
 const shop=world.shops[0],moves=[
  {id:'price-down',name:'降低售价',icon:'tag',hint:`${shop.price} → ${Math.max(1,shop.price-1)} 金币 · 当天`,detail:'每个面包少收1枚；顾客优先买便宜的。'},
  {id:'price-up',name:'提高售价',icon:'tag',hint:`${shop.price} → ${Math.min(5,shop.price+1)} 金币 · 当天`,detail:'每个面包多收1枚；顾客优先买便宜的。'},
  {id:'expand',name:'添炉＋招工',icon:'oven',hint:`付10枚 · 产能+6／天 · 工资+${shop.wage}枚／天`,detail:`一次添1台普通炉并招1人，当天产能增加6个，每天工资增加${shop.wage}枚；没有招聘费或额外等待。`},
  {id:'upgrade',name:'换成快炉',icon:'oven',hint:`付8枚 · ${simpleCapacity(shop)} → ${simpleCapacity(shop)+6}个／天 · 当天`,detail:'一次付8枚，将1台旧炉换成快炉，当天产能增加6个，不停工；人数和工资不变。'},
 ];
 if(allowWages)moves.push(
  {id:'wage-down',name:'降低工资',icon:'people',hint:`每人 ${shop.wage} → ${Math.max(1,shop.wage-1)} 金币 · 当天`,detail:'每人当天少领1枚。人数和产量不变；下幕中，顾客的钱包也会受影响。'},
  {id:'wage-up',name:'提高工资',icon:'people',hint:`每人 ${shop.wage} → ${Math.min(4,shop.wage+1)} 金币 · 当天`,detail:'每人当天多领1枚。人数和产量不变；下幕中，顾客的钱包也会受影响。'},
 );
 moves.push({id:'hold',name:'照常营业',icon:'bread',hint:'维持现在的售价、工资和烤炉',detail:'不改参数，按目前的安排营业一天。'});
 return moves;
}
export function simpleIssue(world,action,social=false,allowWages=social){
 if(!simpleMoves(world,allowWages).some(move=>move.id===action))return '本局没有这项操作。';
 const shop=world.shops[0];
 if(action==='price-down'&&shop.price<=1)return '售价最低1枚。';
 if(action==='price-up'&&shop.price>=5)return '售价最高5枚。';
 if(action==='wage-down'&&shop.wage<=1)return '每人工资最低1枚。';
 if(action==='wage-up'&&shop.wage>=4)return '每人工资最高4枚。';
 if(action==='expand'&&(shop.ovens>=3||!vacantWorkers(world).length))return shop.ovens>=3?'最多3台炉。':'街上没有待业厨师。';
 if(action==='upgrade'&&shop.fastOvens>=shop.ovens)return '已经全是快炉。';
 const wage=shop.wage+(action==='wage-up'?1:action==='wage-down'?-1:0);
 const operating=(shop.workers.length+(action==='expand'?1:0))*wage+5;
 if(action==='expand'&&shop.cash<10+operating)return `需${10+operating}枚：扩产10枚，加今天${shop.workers.length+1}人工资和固定开支${operating}枚。`;
 if(action==='upgrade'&&shop.cash<8+operating)return `需${8+operating}枚：换炉8枚，加今天开支${operating}枚。`;
 return '';
}
export function simpleRound(input,action,mode,allowWages=mode==='social'){
 const social=mode==='social';if(simpleIssue(input,action,social,allowWages))throw Error('Unavailable simple move');
 const world=structuredClone(input),shop=world.shops[0],seller=social?'supplier':'outside';
 const round={day:++world.day,action,move:simpleMoves(input,allowWages).find(move=>move.id===action).name,rival:'照常营业',before:input.shops.map(s=>s.cash),receipts:[],made:[0,0],sold:[0,0],wages:[0,0],spoiled:[0,0],stopped:[false,false],fired:[],hired:[],visits:[],changes:[],installing:[false,false]};
 const purse=key=>key==='outside'?{get cash(){return world.outside;},set cash(value){world.outside=value;}}:key==='supplier'?{get cash(){return world.supplier;},set cash(value){world.supplier=value;}}:key[0]==='f'?world.shops[+key[1]]:world.people[+key.slice(1)];
 const pay=(from,to,amount,reason)=>{if(!Number.isInteger(amount)||amount<0||purse(from).cash<amount)throw Error('Unfunded simple payment');if(!amount)return;purse(from).cash-=amount;purse(to).cash+=amount;round.receipts.push({from,to,amount,reason});};
 if(action==='price-down')shop.price--;
 if(action==='price-up')shop.price++;
 if(action==='wage-down')shop.wage--;
 if(action==='wage-up')shop.wage++;
 if(action==='upgrade'){
  pay('f0',seller,8,'升级快炉');round.changes.push({shop:0,old:shop.ovens,fast:shop.fastOvens,workers:shop.workers.length,next:{ovens:shop.ovens,fastOvens:shop.fastOvens+1,workers:shop.workers.slice(),wage:shop.wage}});shop.fastOvens++;shop.fast=true;
 }
 if(action==='expand'){
  const person=vacantWorkers(world)[0];pay('f0',seller,10,'订购普通炉');shop.ovens++;shop.workers.push(person);round.hired.push(person);
 }
 for(const current of world.shops){
  const id=current.id,capacity=simpleCapacity(current),raw=3,payroll=current.workers.length*current.wage;
  current.quantity=capacity;current.nextQuantity=capacity;
  if(current.cash<payroll+raw+2){round.stopped[id]=true;continue;}
  for(const person of current.workers)pay('f'+id,social?'p'+person:seller,current.wage,'工资');round.wages[id]=payroll;
  pay('f'+id,seller,raw,'原料');pay('f'+id,social?'p'+(8+id):seller,2,'固定开支');
  round.made[id]=capacity;
  for(let n=0;n<capacity;n++)current.bread.push({id:`${mode}:${world.day}:${id}:${n}`,day:world.day});
 }
 const demand=social?11:mode==='steady'?12:[12,20,20,6,12][world.day-1];round.demand=demand;round.heard=input.history.at(-1)?.demand??12;
 for(let index=0;index<demand;index++){
  const id=social?(index+world.day)%demand:index,from=social?(id===10?'supplier':'p'+id):'outside',preference=(id+world.day)%2;
  const available=world.shops.filter(s=>s.bread.length).sort((a,b)=>a.price-b.price||(a.id===preference?-1:1)),chosen=available.find(s=>purse(from).cash>=s.price);
  if(chosen){const bread=chosen.bread.shift();pay(from,'f'+chosen.id,chosen.price,'买面包');round.sold[chosen.id]++;round.visits.push({id,shop:chosen.id,bought:true,bread:bread.id});}
  else round.visits.push({id,shop:available[0]?.id??preference,bought:false,reason:available.length?'钱不够':'卖完了'});
 }
 round.committed=world.shops.map(s=>s.quantity);round.scheduled=world.shops.map(s=>s.nextQuantity);round.after=world.shops.map(s=>s.cash);round.stock=world.shops.map(s=>s.bread.length);round.poor=round.visits.filter(v=>v.reason==='钱不够').length;round.missed=round.visits.filter(v=>!v.bought).length;world.history.push(round);
 const total=world.shops.reduce((n,s)=>n+s.cash,0)+(social?world.supplier+world.people.reduce((n,p)=>n+p.cash,0):world.outside);if(total!==(social?120:2072))throw Error('Simple ledger mismatch');
 return world;
}
