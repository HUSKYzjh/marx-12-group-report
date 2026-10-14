import {freightAccount,type SpaceFreight,type FreightRecord,type FreightKind} from './space-freight.ts';

const names={power:'能源件',air:'供气件',structure:'结构件'};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const recipes=(r:FreightRecord)=>r.history.map(p=>p.mix!.slice().sort());
const deliveredKinds=(r:FreightRecord)=>{
 const kinds=r.history.flatMap(p=>p.mix!);
 return r.history.map(p=>p.shipped.map(id=>kinds[id]).sort());
};

/** Ask about a real, completed construction attempt. No challenge score, new
 * money or compulsory solution: next-contract papers/blueprints remain drafts.
 * Comparisons say which inputs match; equal totals alone are not a control. */
export function freightExploration(s:SpaceFreight){
 if(!s.construction||s.phase!=='lab'||s.stage!=='finished'||s.history.length!==3)return null;
 const actual=freightAccount(s);
 const unwanted=actual.crates.find(c=>actual.wanted[c.kind!]===0)?.kind;
 let prompt:string,focusKind:FreightKind|null=null;
 if(unwanted&&actual.need>0&&actual.authorization>=4){
  focusKind=unwanted;prompt='仓库有'+names[unwanted]+'，基地却缺别的。只换图纸，能多配出一间吗？';
 }else if(actual.need>0&&actual.authorization<4){
  prompt=actual.stock?'还是这张4组单，能配好一间、不留剩货吗？':'仓库空了，基地还缺货。把订单补足后，要做哪几样？';
 }else if(actual.habitats===4&&!actual.renewed){
  prompt=actual.stock?'四间建好了。少做一点，还是另接维护单？':'四间建好了。再接维护单，谁的钱和工作会增加？';
 }else if(actual.renewed&&actual.maintenanceDelivered===6){
  prompt=actual.stock?'维护做完了。保持同样交货，能少做一点吗？':'建设和维护都用上了。只做建设，工厂和工人的钱会怎样？';
 }else if(actual.habitats===0&&actual.produced){
  prompt='货发出去了，住舱还不能住。只换图纸，能配出一间吗？';
 }else if(actual.stock&&actual.authorization>=4){
  prompt='还有付款没用上。重新配货，能多住一间吗？';
 }else{
  prompt=actual.produced?'还有住舱没配齐。三期的图纸该怎样安排？':'订单能付钱。三期里，怎样配出能住人的一间？';
 }
 let comparison:string|null=null;
 const previous=s.trials.slice(0,-1).reverse().filter(r=>r.construction&&r.capacity===s.capacity&&r.order===s.order);
 // Same entire production programme and unchanged pre-renewal deliveries:
 // the new maintenance order changes actual demand, not production or costs.
 const maintenancePeer=previous.find(r=>((r.maintenanceAt===null)!==(s.maintenanceAt===null))&&same(recipes(r),recipes(s))&&
  same(deliveredKinds(r).slice(0,r.maintenanceAt??s.maintenanceAt!),deliveredKinds(s).slice(0,r.maintenanceAt??s.maintenanceAt!)));
 if(maintenancePeer){
  const before=freightAccount(maintenancePeer),sold=actual.sold-before.sold,receipts=sold*4;
  if(sold&&actual.workers===before.workers&&actual.habitats===before.habitats)comparison='同样三期生产：'+(receipts>0?'加上':'不接')+'维护单，收款'+(receipts>0?'多':'少')+Math.abs(receipts)+'枚；工资和已建住舱不变。';
 }
 if(!comparison){
  const mixPeer=previous.find(r=>r.maintenanceAt===s.maintenanceAt&&same(r.history.map(p=>p.produced),s.history.map(p=>p.produced))&&!same(recipes(r),recipes(s)));
  if(mixPeer){
   const before=freightAccount(mixPeer),homes=actual.habitats-before.habitats;
   if(homes)comparison='同样订单、同样每期产量：图纸与交货搭配改变后，能住的'+(homes>0?'多':'少')+Math.abs(homes)+'间，库存从'+before.stock+'组变为'+actual.stock+'组。';
  }
 }
 if(!comparison){
  const pacePeer=previous.find(r=>r.maintenanceAt===s.maintenanceAt&&same(deliveredKinds(r),deliveredKinds(s))&&!same(recipes(r),recipes(s)));
  if(pacePeer){
   const before=freightAccount(pacePeer),stock=actual.stock-before.stock,wages=actual.workers-before.workers;
   if(stock&&wages)comparison='同样各期交货：库存'+(stock>0?'多':'少')+Math.abs(stock)+'组，工人工资也'+(wages>0?'多':'少')+Math.abs(wages)+'枚。';
  }
 }
 return {prompt,focusKind,comparison};
}
