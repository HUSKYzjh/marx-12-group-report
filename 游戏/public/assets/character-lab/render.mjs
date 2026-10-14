import { ATLASES } from './motions.mjs';
export async function loadArt() {
  const art=new Map();
  await Promise.all(ATLASES.map(async item => {
    const res=await fetch(item.path+'.json');
    if(!res.ok) throw new Error('Cannot load '+item.path);
    const atlas=JSON.parse((await res.text()).replace(/^\uFEFF/,''));
    const image=new Image();image.src=item.path+'.png';await image.decode();
    art.set(item.id,{...item,atlas,image,frames:Object.values(atlas.frames)});
  }));
  return art;
}
export function drawLayer(ctx,art,layer) {
  const resource=art.get(layer.atlas),data=resource?.frames[layer.frame];
  if(!data) throw new RangeError(`Missing ${layer.atlas} frame ${layer.frame}`);
  if(data.rotated) throw new Error('Rotated atlas packing not supported');
  const f=data.frame,source=data.sourceSize||{w:f.w,h:f.h},offset=data.spriteSourceSize||{x:0,y:0};
  ctx.save();ctx.translate(layer.x||0,layer.y||0);ctx.scale(layer.scale||1,layer.scale||1);
  ctx.drawImage(resource.image,f.x,f.y,f.w,f.h,
    offset.x-source.w*(layer.anchorX??.5),offset.y-source.h*(layer.anchorY??1),f.w,f.h);
  ctx.restore();
}
export function drawMotion(canvas,art,sample) {
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  const fit=Math.min(1,canvas.width/540,canvas.height/320);
  ctx.save();ctx.translate(canvas.width/2+sample.x*fit,canvas.height-35*fit+sample.y*fit);
  ctx.scale(fit,fit);ctx.rotate(sample.rotation);ctx.scale(sample.scale*sample.sx,sample.scale*sample.sy);
  sample.layers.forEach(layer=>drawLayer(ctx,art,layer));ctx.restore();
}
export function drawAtlasFrame(canvas,art,id,index,{shape=0,compose=true}={}) {
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  const resource=art.get(id),data=resource.frames[index],size=data.sourceSize||data.frame;
  const scale=Math.min((canvas.width-36)/size.w,(canvas.height-36)/size.h,1.5);
  ctx.save();ctx.translate(canvas.width/2,canvas.height/2+size.h*scale/2);ctx.scale(scale,scale);
  if(compose&&id==='trust'&&index>0)drawLayer(ctx,art,{atlas:'trust',frame:0});
  const composite=compose&&(/^(face|hat|lovehat|lover_shirt)/.test(id))&&!id.endsWith('hmph');
  if(composite&&id!=='hat')drawLayer(ctx,art,{atlas:'body',frame:shape});
  drawLayer(ctx,art,{atlas:id,frame:index,anchorX:id==='face_angry'?1/3:.5});
  // NormalPeep's original display order is hat → body → face.
  if(composite&&id==='hat')drawLayer(ctx,art,{atlas:'body',frame:shape});
  ctx.restore();
}
