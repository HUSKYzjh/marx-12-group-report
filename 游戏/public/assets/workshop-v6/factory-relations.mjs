import {person,machine,neutralNode,relationSymbol,line,escapeHtml} from './trust-kit.mjs';

export const factoryRelationKinds=['cooperation','ownership','control','payment'];
export function factoryRelationPlan(kind,scenario){
 if(!factoryRelationKinds.includes(kind))throw new RangeError('Unknown factory relation');
 if(!Number.isInteger(scenario.wage)||scenario.wage<0)throw new RangeError('Invalid wage');
 const plans={
  cooperation:{actor:null,targets:['worker-a','worker-b'],note:'一起生产，不等于共同拥有。'},
  ownership:{actor:'所有者身份',targets:['machine'],note:'换了设备，产权不会自动改变。'},
  control:{actor:'排班负责人',targets:['worker-a','worker-b'],note:`本样张安排每人工作${scenario.hours}小时；安排权不自动等于所有权。`},
  payment:{actor:'企业账户',targets:['worker-a','worker-b'],note:`企业账户 → 甲${scenario.wage}、乙${scenario.wage}；工资总额${scenario.wages}。`},
 };
 return {...plans[kind],kind,wage:scenario.wage};
}

export function factoryMarkup(kind,s){
 const p=factoryRelationPlan(kind,s);
 return `<div class="tr-map-role" data-node="actor">${p.actor?neutralNode(p.actor):'<p class="tr-map-cooperation-note">两个人，同一间工厂。</p>'}</div><div class="tr-map-worker-a" data-node="worker-a">${person(13,'劳动者甲')}</div><div class="tr-map-machine" data-node="machine">${machine(s.upgraded)}</div><div class="tr-map-worker-b" data-node="worker-b">${person(15,'劳动者乙')}</div><div class="tr-map-edges" aria-hidden="true"></div>`;
}

// Coordinates come from the actual responsive node layout, never fixed screen positions.
export function drawFactoryRelations(mount,kind,s){
 const plan=factoryRelationPlan(kind,s),base=mount.getBoundingClientRect();
 const box=name=>{const r=mount.querySelector(`[data-node="${name}"]`).getBoundingClientRect();return {x:r.left-base.left+r.width/2,top:r.top-base.top,bottom:r.bottom-base.top};};
 const segment=(a,b)=>{
  const length=Math.hypot(b.x-a.x,b.y-a.y),angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
  return `<span class="tr-map-segment tr-map-segment-${kind}" style="left:${a.x}px;top:${a.y}px;width:${length}px;transform:rotate(${angle}deg)">${line()}</span>`;
 };
 const marker=(x,y,label='')=>`<span class="tr-map-marker" style="left:${x}px;top:${y}px">${relationSymbol(kind)}${label?`<small>${escapeHtml(label)}</small>`:''}</span>`;
 const tip=(x,y,angle)=>`<span class="tr-map-tip tr-map-tip-${kind}" style="left:${x}px;top:${y}px;transform:translate(-50%,-50%) rotate(${angle}deg)"></span>`;
 let html='';
 if(kind==='cooperation'){
  const a=box('worker-a'),b=box('worker-b'),m=box('machine');
  // On a phone the machine sits below the workers: keep their link in the gap.
  const stacked=m.top>Math.max(a.bottom,b.bottom);
  const y=stacked?(Math.max(a.bottom,b.bottom)+m.top)/2:Math.max(a.bottom,b.bottom,m.bottom)+30;
  const points=[{x:a.x,y:a.bottom+5},{x:a.x,y},{x:b.x,y},{x:b.x,y:b.bottom+5}];
  html=points.slice(1).map((p,i)=>segment(points[i],p)).join('')+marker((a.x+b.x)/2,y)+tip(a.x,a.bottom+5,0)+tip(b.x,b.bottom+5,0);
 }else{
  const actor=box('actor'),start={x:actor.x,y:actor.bottom+7};
  for(const target of plan.targets){
   // The original peep sprite has transparent headroom; aim at its visible hat.
   const to=box(target),end={x:to.x,y:to.top+(target.startsWith('worker-')?26:-10)};
   const angle=Math.atan2(end.y-start.y,end.x-start.x)*180/Math.PI;
   html+=segment(start,end)+marker((start.x+end.x)/2,(start.y+end.y)/2,kind==='payment'?`工资 ${plan.wage}`:'')+tip(end.x,end.y,angle);
  }
 }
 mount.querySelector('.tr-map-edges').innerHTML=html;
}
