// Presentation-only separation. Never changes the number or identity of shoppers.
export function crowdPressure(bodies,x,y,{ignoreId,radius=115,targets=false}={}){
 let pressure=0;
 for(const p of bodies){
  if(p.id===ignoreId)continue;
  const px=targets?p.tx:p.x,py=targets?p.ty:p.y;
  if(!Number.isFinite(px)||!Number.isFinite(py))continue;
  const d=Math.hypot(x-px,(y-py)*.7);
  if(d<radius)pressure+=(1-d/radius)**2;
 }
 return pressure;
}

export function avoidanceVelocity(p,bodies,{radius=100,lookahead=.4}={}){
 let vx=0,vy=0;
 for(const other of bodies){
  if(p.id===other.id)continue;
  let dx=p.x+(p.vx||0)*lookahead-other.x-(other.vx||0)*lookahead;
  let dy=(p.y+(p.vy||0)*lookahead-other.y-(other.vy||0)*lookahead)*.7;
  let distance=Math.hypot(dx,dy);
  if(distance>=radius)continue;
  if(distance<.01){const angle=(p.id+other.id)*2.4,sign=p.id<other.id?1:-1;dx=Math.cos(angle)*sign;dy=Math.sin(angle)*sign;distance=1;}
  const strength=110*(1-distance/radius)**2;
  vx+=dx/distance*strength;vy+=dy/distance*strength*.8;
 }
 return {vx,vy};
}

export function separateBodies(input,canPlace=()=>true,{gap=9,iterations=4,maxShift=4}={}){
 const bodies=input.map(p=>({...p})),origin=new Map(input.map(p=>[p.id,p]));
 function move(p,axis,amount){
  const start=origin.get(p.id),next=Math.max(start[axis]-maxShift,Math.min(start[axis]+maxShift,p[axis]+amount));
  if(Math.abs(next-p[axis])<.001)return false;
  const x=axis==='x'?next:p.x,y=axis==='y'?next:p.y;
  if(!canPlace(p,x,y))return false;
  p[axis]=next;return true;
 }
 for(let pass=0;pass<iterations;pass++)for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
  const a=bodies[i],b=bodies[j];if(a.w<=0||a.h<=0||b.w<=0||b.h<=0)continue;
  const dx=(b.x+b.w/2)-(a.x+a.w/2),dy=(b.y+b.h/2)-(a.y+a.h/2);
  const ox=(a.w+b.w)/2+gap-Math.abs(dx),oy=(a.h+b.h)/2+gap-Math.abs(dy);
  if(ox<=0||oy<=0)continue;
  const axes=ox<oy?['x','y']:['y','x'];
  for(const axis of axes){
   const overlap=axis==='x'?ox:oy,delta=axis==='x'?dx:dy,sign=delta===0?(a.id<b.id?1:-1):Math.sign(delta);
   const amount=overlap/2+.05;
   const ma=move(a,axis,-sign*amount),mb=move(b,axis,sign*amount);
   // At a wall, let the unconstrained person do the remaining avoidance.
   if(ma&&!mb)move(a,axis,-sign*amount);
   if(mb&&!ma)move(b,axis,sign*amount);
   if(ma||mb)break;
  }
 }
 return bodies;
}
