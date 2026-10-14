import atlases from './trust-frames.mjs';
export const escapeHtml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asset = name => new URL(name,import.meta.url).href;
const integer=(n,a,b)=>{if(!Number.isInteger(n)||n<a||n>b)throw new RangeError(`Expected ${a}–${b}`);return n;};
export function rawCrop(file,[x,y,w,h,iw,ih],label='',className=''){
  if(x<0||y<0||w<=0||h<=0||x+w>iw||y+h>ih)throw new RangeError('Invalid crop');
  return `<svg class="${className}" viewBox="${x} ${y} ${w} ${h}" ${label?`role="img" aria-label="${escapeHtml(label)}"`:'aria-hidden="true"'}><image href="${asset(file)}" width="${iw}" height="${ih}"/></svg>`;
}
export function frame(name,index=0,label='',className=''){
  const a=atlases[name],entries=Object.values(a?.frames??{});integer(index,0,entries.length-1);
  const f=entries[index].frame,folder=['iterated_peep','iterated_coin','iterated_machine'].includes(name)?'trust':'trust-source';
  return rawCrop(`../${folder}/${name}.png`,[f.x,f.y,f.w,f.h,a.meta.size.w,a.meta.size.h],label,className);
}
export function person(hat=13,label='劳动者甲',blink=false){
  integer(hat,12,17);
  return `<figure class="tr-person"><div class="tr-person-layers" role="img" aria-label="${escapeHtml(label)}">${frame('iterated_peep',0)}${frame('iterated_peep',hat)}<span class="tr-open-eyes">${frame('iterated_peep',1)}</span><span class="tr-blink-eyes">${frame('iterated_peep',2)}</span></div><figcaption>${escapeHtml(label)}</figcaption></figure>`;
}
export function machine(upgraded=false){
  const name=upgraded?'新机器 · 电机与传送带':'旧机器 · 手摇飞轮与连杆';
  // Display crops remove unused transparent margins without modifying the PNGs.
  const crop=upgraded?[440,95,970,690,1774,887]:[90,40,1400,800,1774,887];
  return `<figure class="tr-machine" data-machine="${upgraded?'new':'old'}">${rawCrop(upgraded?'machine-new-v1.png':'machine-old-v1.png',crop,name,'tr-machine-art')}<figcaption class="tr-machine-label">${upgraded?'新机器 · 电机传动':'旧机器 · 手摇传动'}</figcaption></figure>`;
}
export const coin=()=>frame('iterated_coin',0,'','tr-coin');
export const line=()=>frame('connection',0,'','tr-line-art').replace('<svg ','<svg preserveAspectRatio="none" ');
export const productFrame=()=>rawCrop('../trust-source/iterated_scoreboard.png',[10,20,180,170,402,202],'','tr-product-unit');
export function products(count=8){integer(count,0,32);return `<figure class="tr-products" aria-label="${count}件产品"><div class="tr-product-grid" aria-hidden="true">${Array.from({length:count},()=>productFrame()).join('')}</div><figcaption><strong>${count}</strong> 件产品</figcaption></figure>`;}
export function income(amount=4,label='甲的收入'){integer(amount,0,32);return `<figure class="tr-income"><div class="tr-coin-row">${Array.from({length:amount},()=>coin()).join('')}</div><figcaption>${escapeHtml(label)} <strong>${amount}</strong><small>货币单位</small></figcaption></figure>`;}
export function timeRuler(hours=8,{kind='合同工时'}={}){integer(hours,0,8);return `<div class="tr-time" role="img" aria-label="${escapeHtml(kind)}${hours}小时，基准8小时"><div class="tr-time-label"><span>${escapeHtml(kind)}</span><strong>${hours} 小时</strong></div><div class="tr-slider"><img src="${asset('../trust-source/slider_bg.png')}" alt="" class="tr-slider-line"><img src="${asset('../trust-source/slider_knob.png')}" alt="" class="tr-slider-knob" style="left:calc(${hours/8*100}% - ${hours/8*30}px)"></div><div class="tr-ticks">${[0,2,4,6,8].map(n=>`<span>${n}</span>`).join('')}</div>${hours<8?`<p class="tr-time-note">${8-hours}小时${kind==='合同工时'?'缩短':'未安排'}</p>`:''}</div>`;}
export const relationTypes=Object.freeze({
  cooperation:{label:'协作',hint:'共同完成',description:'甲和乙分工配合。协作不等于共同拥有机器。'},
  ownership:{label:'产权',hint:'归谁所有',description:'钥匙连接所有者与设备，表示产权关系，不表示谁在操作。'},
  control:{label:'控制',hint:'谁来安排',description:'箭头从排班负责人指向劳动者，表示工作安排权，不自动等于所有权。'},
  payment:{label:'付款',hint:'钱付给谁',description:'金币沿箭头从企业账户付给劳动者，表示实际工资支付。'},
  unknown:{label:'待证',hint:'尚未确认',description:'问号表示关系尚待确认，不表示关系不存在。'},
});
export function relationSymbol(kind){
  if(!Object.hasOwn(relationTypes,kind))throw new RangeError('Unknown relation');
  const content={cooperation:'<i></i><i></i>',ownership:'<i></i><b></b>',control:`<i></i><img src="${asset('../trust-source/slider_knob.png')}" alt="">`,payment:coin()+coin(),unknown:'?'}[kind];
  return `<span class="tr-symbol tr-symbol-${kind}" aria-hidden="true">${content}</span>`;
}
export function relation(kind='cooperation'){
  if(!Object.hasOwn(relationTypes,kind))throw new RangeError('Unknown relation');
  const {label,hint}=relationTypes[kind];
  return `<figure class="tr-relation tr-${kind}"><div class="tr-relation-rail" aria-hidden="true">${line()}${relationSymbol(kind)}</div><figcaption>${label} · ${hint}</figcaption></figure>`;
}
export function neutralNode(label){return `<figure class="tr-neutral">${frame('splash_peep',0,label)}<figcaption>${escapeHtml(label)}</figcaption></figure>`;}
export const sampleScenarios=Object.freeze({
 old:{label:'旧机',upgraded:false,products:8,wage:4,hours:8,revenue:24,materials:8,equipment:2,wages:8,surplus:6},
 new:{label:'新机',upgraded:true,products:16,wage:4,hours:8,revenue:48,materials:8,equipment:4,wages:8,surplus:28},
 pay:{label:'加薪',upgraded:true,products:16,wage:6,hours:8,revenue:48,materials:8,equipment:4,wages:12,surplus:24},
 time:{label:'缩时',upgraded:true,products:8,wage:4,hours:4,revenue:24,materials:4,equipment:4,wages:8,surplus:8},
});
export function ledger(s){if(Math.abs(s.revenue-s.materials-s.equipment-s.wages-s.surplus)>1e-8)throw new RangeError('Unbalanced ledger');return `<dl class="tr-ledger">${[['销售收入',s.revenue],['材料',s.materials],['设备',s.equipment],['工资总额',s.wages],['会计结余',s.surplus]].map(([n,v])=>`<div><dt>${n}</dt><dd>${v}</dd></div>`).join('')}</dl>`;}
export const sourceSamples=[
 ['原作身体＋眼睛＋蓝帽','iterated_peep.png',()=>person(13,'身体、表情、帽子独立')],
 ['原作身体＋眼睛＋粉帽','iterated_peep.png',()=>person(15,'不继承原作策略性格')],
 ['原作中性协作人物','splash_peep.png',()=>neutralNode('社会协作节点')],
 ['本作新绘 · 手摇旧机','machine-old-v1.png',()=>machine(false)],
 ['本作新绘 · 电动新机','machine-new-v1.png',()=>machine(true)],
 ['原作金币','iterated_coin.png',()=>income(4,'收入')],
 ['原作计分框的显示裁片','iterated_scoreboard.png',()=>products(8)],
 ['原作线条＋本作协作标识','connection.png + CSS',()=>relation('cooperation')],
 ['原作滑条与把手','slider_bg.png',()=>timeRuler(4)],
 ['原作三态按钮','button_short.png',()=>'<button class="tr-button" data-pose="normal">默认</button><button class="tr-button" data-pose="hover">选中</button><button class="tr-button" disabled>不可用</button>'],
 ['原作弧形连接','connection_flower.png',()=>`<div class="tr-curves">${frame('connection_flower',0)}${frame('connection_flower',2)}</div>`],
 ['原作增减控件','sandbox_incdec.png',()=>`<div class="tr-arrows">${rawCrop('../trust-source/sandbox_incdec.png',[0,0,40,40,160,40])}${rawCrop('../trust-source/sandbox_incdec.png',[80,0,40,40,160,40])}</div>`],
 ['原作擦除帧（静态）','scratch.png',()=>rawCrop('../trust-source/scratch.png',[0,3200,711,400,1422,8000],'擦除过渡第9帧','tr-scratch')],
];
