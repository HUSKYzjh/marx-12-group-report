import {networkAccount,networkTrialAccount,type PlatformNetwork,type NetworkTrial} from './platform-network.ts';

const names=['面包厂','服装厂','车厂'];
const sameRoutes=(a:NetworkTrial,b:NetworkTrial)=>a.routes.every((r,i)=>r===b.routes[i]);
const sameCashFlow=(a:NetworkTrial,b:NetworkTrial)=>JSON.stringify(networkTrialAccount(a).transfers)===JSON.stringify(networkTrialAccount(b).transfers);

/** A next question, not a predicted outcome. Only two settled periods can
 * support a comparison; next-period plugs and new condition papers are drafts. */
export function platformExploration(s:PlatformNetwork){
 if(s.history.length!==2)return null;
 const actual=networkAccount(s.rule,s.fee,s.history),trial=s.trials.at(-1)!;
 const stopped=trial.routes.findIndex(r=>r===null),moved=trial.routes.findIndex(r=>r==='B');
 let prompt:string,focusShop:number|null=null;
 if(stopped>=0){
  focusShop=stopped;prompt=names[stopped]+'停用了。接回去，店里和工人的钱会怎样？';
 }else if(moved>=0&&trial.rule==='locked'){
  focusShop=moved;prompt=names[moved]+'搬走了。只让资料能带走，同样搬法会怎样？';
 }else if(trial.rule==='joint'){
  prompt='三店都有钥匙。私营入口也收1枚，账会一样吗？';
 }else if(trial.fee===1){
  prompt='每店只收1枚。换成三店各有钥匙，钱和决定权都一样吗？';
 }else if(moved>=0){
  focusShop=moved;prompt=names[moved]+'搬走了。只把它接回原入口，会更划算吗？';
 }else{
  focusShop=0;prompt='只搬面包厂。省下的使用费，够付搬资料的钱吗？';
  // At or below the alternative's fee there is no access saving to imply.
  if(trial.fee<=2)prompt='只搬面包厂。使用费和搬资料的钱，一共会变多少？';
 }
 let comparison:string|null=null;
 const previous=s.trials.slice(0,-1).reverse();
 // Exact shop identity, fees and wiring: not merely two similar totals.
 const migrationPeer=previous.find(p=>p.fee===trial.fee&&sameRoutes(p,trial)&&
  (p.rule==='locked'&&trial.rule==='portable'||p.rule==='portable'&&trial.rule==='locked'));
 if(migrationPeer&&moved>=0){
  const before=networkTrialAccount(migrationPeer),delta=before.migration-actual.migration;
  const retained=actual.shops.reduce((n,x)=>n+x,0)-before.shops.reduce((n,x)=>n+x,0);
  if(delta&&retained===delta)comparison='同样费用、同样搬法：搬资料'+(delta>0?'少':'多')+'付'+Math.abs(delta)+'枚，三店合计'+(retained>0?'多':'少')+'留'+Math.abs(retained)+'枚。';
 }
 if(!comparison){
  const controlPeer=previous.find(p=>p.rule!==trial.rule&&(p.rule==='joint'||trial.rule==='joint')&&p.fee===trial.fee&&sameRoutes(p,trial)&&sameCashFlow(p,trial));
  if(controlPeer)comparison='两期钱流一样；原入口'+(trial.rule==='joint'?'改由三店共同决定。':'仍由服务商决定。');
 }
 if(!comparison){
  // Only disconnect/reconnect changes; do not silently mix in a migration.
  const stoppagePeer=previous.find(p=>p.rule===trial.rule&&p.fee===trial.fee&&
   p.routes.some((r,i)=>r!==trial.routes[i])&&p.routes.every((r,i)=>r===trial.routes[i]||r===null||trial.routes[i]===null));
  if(stoppagePeer){
   const before=networkTrialAccount(stoppagePeer),wages=actual.workers-before.workers,sold=actual.sold-before.sold;
   if(wages&&sold)comparison='与上次两期相比：工人工资'+(wages>0?'多':'少')+Math.abs(wages)+'枚，卖出的产品'+(sold>0?'多':'少')+Math.abs(sold)+'件。';
  }
 }
 if(!comparison){
  const routePeer=previous.find(p=>p.rule===trial.rule&&p.fee===trial.fee&&p.routes.filter((r,i)=>r!==trial.routes[i]).length===1&&p.routes.every((r,i)=>r===trial.routes[i]||r!==null&&trial.routes[i]!==null));
  if(routePeer){
   const shop=trial.routes.findIndex((r,i)=>r!==routePeer.routes[i]),before=networkTrialAccount(routePeer),delta=actual.shops[shop]-before.shops[shop];
   const feeDelta=actual.periods[1].fees[shop]-before.periods[1].fees[shop],moveDelta=actual.periods[1].migration[shop]-before.periods[1].migration[shop];
   comparison='只改'+names[shop]+'的入口：第二期使用费'+(feeDelta===0?'不变':(feeDelta>0?'多':'少')+Math.abs(feeDelta)+'枚')+'，搬资料'+(moveDelta===0?'不变':(moveDelta>0?'多':'少')+Math.abs(moveDelta)+'枚')+'；两期后店里'+(delta===0?'钱一样多。':(delta>0?'多':'少')+'留'+Math.abs(delta)+'枚。');
  }
 }
 return {prompt,focusShop,comparison};
}
