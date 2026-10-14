// Presentation only: derive expressions from settled operating receipts, never UI clicks.
export function operatingBalance(report, id) {
  const receipts=report.receipts||[];
  const income=receipts.filter(p=>p.to==='f'+id&&p.reason==='买面包').reduce((n,p)=>n+p.amount,0);
  const expense=receipts.filter(p=>p.from==='f'+id&&['工资','原料','原料燃料'].includes(p.reason)).reduce((n,p)=>n+p.amount,0);
  // Accrue today's storage, including an unpaid portion. Old arrears are not expensed twice.
  return income-expense-Math.ceil((report.stock?.[id]||0)/6);
}
export function ownerEmotion(history,id) {
  if(!history.length)return {mood:'neutral',streak:0,balance:0,label:'正在等开门'};
  const balance=operatingBalance(history.at(-1),id),sign=Math.sign(balance);
  let streak=0;for(let i=history.length-1;i>=0&&sign;i--){if(Math.sign(operatingBalance(history[i],id))!==sign)break;streak++;}
  const mood=sign>0?(streak>=2?'winning':'gain'):sign<0?(streak>=2?'losing':'loss'):'neutral';
  const label={neutral:'本轮营业收支持平',gain:'赚了一轮，笑起来',winning:`连赚 ${streak} 轮，忍不住大笑`,loss:'亏了一轮，皱起眉头',losing:`连亏 ${streak} 轮，急得冒汗`}[mood];
  return {mood,streak,balance,label};
}
export const OWNER_ATLASES=['body','face','face_nervous','hatguy'];
function layer(atlas,name,index,attributes=''){
  const a=atlas[name],f=Object.values(a.frames)[index].frame;
  return `<svg ${attributes} viewBox="${f.x} ${f.y} ${f.w} ${f.h}" aria-hidden="true"><image href="${a.image||'../'+(name==='trust'?'trust/iterated_peep':'wbwwb-source/'+name)+'.png'}" width="${a.meta.size.w}" height="${a.meta.size.h}"/></svg>`;
}
function face(atlas,mood,shift){
  if(mood==='winning'){
    const a=atlas.trust,f=Object.values(a.frames)[10].frame;
    return `<svg x="39" y="${48+shift}" width="46" height="49" viewBox="${f.x+86} ${f.y+150} 164 184" aria-hidden="true"><image href="${a.image||'../trust/iterated_peep.png'}" width="${a.meta.size.w}" height="${a.meta.size.h}"/></svg>`;
  }
  const name=mood==='loss'||mood==='losing'?'face_nervous':'face',index=mood==='gain'?6:mood==='loss'?8:mood==='losing'?24:0;
  return layer(atlas,name,index,`x="0" y="${shift}" width="120" height="140"`)+(mood==='gain'?`<path d="M53 ${80+shift} Q65 ${88+shift} 76 ${79+shift}" fill="none" stroke="#626461" stroke-width="2.5" stroke-linecap="round"/>`:'');
}
export function ownerMarkup(atlas,id,emotion,animate=false){
  const rival=id===1,mood=emotion.mood;
  const base=rival?
    layer(atlas,'body',1,'x="0" y="0" width="120" height="140"')+
    '<g fill="#646562" stroke="#646562" stroke-linejoin="round" stroke-linecap="round"><path d="M35 62L34 48Q35 38 53 39L78 42 84 49 84 58 73 52 58 49 44 59Z" stroke-width="3"/><path d="M47 100L73 101 82 132 67 134 62 125 58 135 46 133Z" stroke-width="3"/></g><path d="M48 101L61 116 73 101" fill="white"/><path d="M60 107L64 107 67 122 62 127 59 122Z" fill="#84816d"/><path d="M49 43Q62 43 71 48" fill="none" stroke="#a1a19a" stroke-width="2" stroke-linecap="round"/>':
    layer(atlas,'hatguy',0,'x="0" y="0" width="120" height="140"')+
    '<path d="M42 48Q57 39 73 46Q81 52 80 64L77 77Q62 84 48 76Q38 66 42 48Z" fill="white"/>';
  const monocle=!rival?'<g fill="none" stroke="#646562" stroke-width="2.6"><circle cx="79" cy="63" r="8"/><path d="M86 67Q91 87 76 99" stroke-width="1.4"/></g>':'';
  const sweat=mood==='losing'?'<g class="owner-sweat" fill="#fff" stroke="#777e79" stroke-width="1.7"><path d="M91 53Q98 65 91 66Q85 65 91 53Z"/><path d="M29 70Q35 80 29 82Q23 80 29 70Z"/></g>':'';
  const moustache=!rival&&mood==='neutral'?'<path d="M51 75Q56 68 62 73Q69 68 75 74Q72 80 62 76Q54 80 51 75Z" fill="#646562"/>':'';
  return `<span class="owner" data-character="${rival?'square-parted-hair':'round-monocle'}" data-mood="${mood}" data-streak="${emotion.streak}" data-animate="${animate}" role="img" aria-label="${rival?'隔壁老板':'你的老板'}：${emotion.label}" title="${emotion.label}；本轮营业收支 ${emotion.balance>=0?'+':''}${emotion.balance}（购炉、取现另算）"><svg class="owner-pose" viewBox="24 ${rival?18:0} 76 ${rival?126:144}" aria-hidden="true">${base}${face(atlas,mood,rival?0:-9)}${moustache}${monocle}${sweat}</svg></span>`;
}
