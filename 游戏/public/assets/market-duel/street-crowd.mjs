// Presentation only: the course ledger supplies counts; wandering never rolls demand.
import {separateBodies,crowdPressure,avoidanceVelocity} from './crowd-spacing.mjs';
export function createStreetCrowd(gate,markup,reduced){
  const field=document.createElement('div');field.className='crowd-field';gate.append(field);
  let people=[],active=false,frame=0,last=0,width=0,height=0,obstacles=[],offset={x:0,y:0},streetTop=0,streetHeight=0;
  const random=(a,b)=>a+Math.random()*(b-a);
  const bounds=()=>{
    width=field.clientWidth;height=field.clientHeight;
    const box=field.getBoundingClientRect(),street=gate.getBoundingClientRect();offset={x:box.left,y:box.top};streetTop=street.top-box.top;streetHeight=street.height;
    obstacles=[...gate.closest('.arena').querySelectorAll('.shop-outline path')].map(path=>({path,inverse:path.getScreenCTM()?.inverse()})).filter(o=>o.inverse);
  };
  const limits=p=>({x:Math.max(8,width-p.el.offsetWidth-8),y:Math.max(8,height-p.el.offsetHeight-8)});
  function clear(p,x,y){
    const b=limits(p);if(x<8||x>b.x||y<8||y>b.y)return false;
    const w=p.el.offsetWidth,h=p.el.offsetHeight,pad=7;
    for(const o of obstacles)for(const xx of [x-pad,x+w/2,x+w+pad])for(const yy of [y-pad,y+h/2,y+h+pad]){
      if(o.path.isPointInFill(new DOMPoint(offset.x+xx,offset.y+yy).matrixTransform(o.inverse)))return false;
    }
    return true;
  }
  function clearRoute(p,x,y,from=p){
    const steps=Math.ceil(Math.hypot(x-from.x,y-from.y)/22);
    for(let i=1;i<=steps;i++)if(!clear(p,from.x+(x-from.x)*i/steps,from.y+(y-from.y)*i/steps))return false;
    return true;
  }
  function route(p,x,y){
    if(clearRoute(p,x,y))return [{x,y}];
    // Leave the shop-front recess before crossing the street, then approach
    // the other recess. A clear destination need not have a straight route.
    const middle=streetTop+(streetHeight-p.el.offsetHeight)/2;
    const points=[{x:p.x,y:middle},{x,y:middle},{x,y}];
    let from=p;
    for(const point of points){if(!clearRoute(p,point.x,point.y,from))return null;from=point;}
    return points;
  }
  function paint(p){p.el.style.transform=`translate(${p.x}px,${p.y}px)`;p.el.style.zIndex=Math.round(p.y)+1;}
  function target(p){
    const b=limits(p);let best={points:[],score:-Infinity};
    // Seek open space, including neighbours' destinations, not just the longest
    // crossing through the centre of the street.
    for(let i=0;i<24;i++){
      const x=random(8,b.x),y=random(8,b.y),d=Math.hypot(x-p.x,y-p.y);
      const score=Math.min(d,240)*.2-crowdPressure(people,x,y,{ignoreId:p.id})*125-crowdPressure(people,x,y,{ignoreId:p.id,targets:true})*65;
      if(d>25&&score>best.score&&clear(p,x,y)){const points=route(p,x,y);if(points)best={points,score};}
    }
    p.route=best.points;const next=p.route.shift()||p;
    p.tx=next.x;p.ty=next.y;p.wait=random(.05,.3);
  }
  function make(id){
    const el=document.createElement('span');el.className='market-pedestrian';el.dataset.crowdId=id;el.innerHTML=markup(id);field.append(el);
    const p={id,el,x:0,y:0,tx:0,ty:0,vx:0,vy:0,rerouteCooldown:0,route:[],wait:0,speed:random(48,72)};people.push(p);return p;
  }
  function place(p,index,count){
    const b=limits(p),cols=Math.max(1,Math.floor(width/58)),rows=Math.ceil(count/cols);
    p.x=8+(index%cols+.35)*Math.max(0,b.x-8)/cols;
    p.y=streetTop+8+(Math.floor(index/cols)+.3)*Math.max(0,streetHeight-p.el.offsetHeight-16)/rows;
    target(p);paint(p);
  }
  function spread(p){
    const b=limits(p);
    let best=null,bestGap=-1;
    for(let i=0;i<60;i++){
      const x=random(8,b.x),y=random(8,b.y);if(!clear(p,x,y))continue;
      const gap=Math.min(...people.filter(o=>o!==p).map(o=>Math.hypot(o.x-x,(o.y-y)*.8)));
      if(gap>bestGap){best={x,y};bestGap=gap;}
    }
    if(best){p.x=best.x;p.y=best.y;}
    target(p);paint(p);
  }
  function stop(){cancelAnimationFrame(frame);frame=0;last=0;people.forEach(p=>p.el.classList.remove('walking'));}
  function resolveOverlaps(initial=false){
    const byId=new Map(people.map(p=>[p.id,p]));
    const bodies=people.map(p=>({id:p.id,x:p.x,y:p.y,w:p.el.offsetWidth,h:p.el.offsetHeight}));
    const gap=width<360?9:width<600?14:20;
    const separated=separateBodies(bodies,(p,x,y)=>clear(byId.get(p.id),x,y),initial?{gap,iterations:16,maxShift:30}:{gap,iterations:5,maxShift:4});
    for(const p of separated){const person=byId.get(p.id),nudged=Math.hypot(person.x-p.x,person.y-p.y)>1;person.x=p.x;person.y=p.y;if(!initial&&nudged&&person.rerouteCooldown<=0){target(person);person.rerouteCooldown=.8;}}
  }
  function tick(time){
    if(!active||document.hidden||reduced()){stop();return;}
    const dt=Math.min(.05,(time-(last||time))/1000);last=time;
    const before=new Map(people.map(p=>[p.id,{x:p.x,y:p.y}]));
    const motionBodies=people.map(p=>({id:p.id,x:p.x,y:p.y,vx:p.vx,vy:p.vy}));
    for(const p of people){
      p.rerouteCooldown=Math.max(0,p.rerouteCooldown-dt);
      p.wait-=dt;if(p.wait>0){p.el.classList.remove('walking');continue;}
      let dx=p.tx-p.x,dy=p.ty-p.y,d=Math.hypot(dx,dy);
      if(d<5){const next=p.route.shift();if(next){p.tx=next.x;p.ty=next.y;}else target(p);continue;}
      let vx=dx/d*p.speed,vy=dy/d*p.speed;
      const avoid=avoidanceVelocity(p,motionBodies,{radius:width<360?80:110});vx+=avoid.vx;vy+=avoid.vy;
      vx+=Math.cos(time/1100+p.id*1.7)*7;vy+=Math.sin(time/1300+p.id*2.3)*7;
      const speed=Math.hypot(vx,vy),scale=Math.min(1,82/speed),b=limits(p);
      const x=Math.max(8,Math.min(b.x,p.x+vx*scale*dt)),y=Math.max(8,Math.min(b.y,p.y+vy*scale*dt));
      if(clear(p,x,y)){p.x=x;p.y=y;}else{target(p);continue;}
      p.el.classList.add('walking');p.el.querySelector('.street-person').style.scale=vx<0?'-1 1':'1 1';
    }
    resolveOverlaps();for(const p of people){const previous=before.get(p.id);p.vx=dt?(p.x-previous.x)/dt:0;p.vy=dt?(p.y-previous.y)/dt:0;paint(p);}
    frame=requestAnimationFrame(tick);
  }
  function setActive(value){active=value;stop();if(active&&!reduced()&&!document.hidden)frame=requestAnimationFrame(tick);}
  function setCount(count){
    bounds();while(people.length>count)people.pop().el.remove();
    while(people.length<count){const p=make(people.length);place(p,p.id,count);spread(p);}
    resolveOverlaps(true);people.forEach(paint);
    gate.dataset.count=people.length;
  }
  async function reconcile(count){
    setActive(false);bounds();gate.dataset.flow=count>people.length?'entering':count<people.length?'leaving':'steady';
    const animations=[];
    async function move(p,from,to,delay){
      if(reduced()){p.x=to.x;p.y=to.y;paint(p);return;}
      p.el.classList.add('walking');
      const animation=p.el.animate([{transform:`translate(${from.x}px,${from.y}px)`},{transform:`translate(${to.x}px,${to.y}px)`}],{duration:850,delay,easing:'ease-in-out',fill:'both'});
      try{await animation.finished;}finally{p.x=to.x;p.y=to.y;paint(p);animation.cancel();p.el.classList.remove('walking');}
    }
    if(count<people.length){
      const leaving=people.slice(count);
      for(const [i,p] of leaving.entries()){
        const x=p.x<width/2?-p.el.offsetWidth-4:width+4;
        p.el.dataset.leaving='true';p.el.querySelector('.street-person').style.scale=x<p.x?'-1 1':'1 1';
        animations.push((async()=>{
          const exitY=Math.max(streetTop+10,Math.min(streetTop+streetHeight-p.el.offsetHeight-10,p.y));
          if(Math.abs(exitY-p.y)>1)await move(p,{x:p.x,y:p.y},{x:p.x,y:exitY},0);
          await move(p,{x:p.x,y:p.y},{x,y:exitY},i*35);p.el.remove();
        })());
      }
      await Promise.all(animations);people=people.slice(0,count);
    }else{
      const old=people.length;
      while(people.length<count){const p=make(people.length);place(p,p.id,count);const destination={x:p.x,y:p.y},from={x:p.id%2?-p.el.offsetWidth-4:width+4,y:p.y};p.el.dataset.entering='true';p.el.querySelector('.street-person').style.scale=from.x<0?'1 1':'-1 1';animations.push(move(p,from,destination,(p.id-old)*65).then(()=>delete p.el.dataset.entering));}
      await Promise.all(animations);
    }
    gate.dataset.count=people.length;delete gate.dataset.flow;
  }
  new ResizeObserver(()=>{const beforeWidth=width,beforeHeight=height;bounds();const resized=width!==beforeWidth||height!==beforeHeight;for(const p of people){if(resized){place(p,p.id,people.length);spread(p);continue;}const b=limits(p);p.x=Math.max(8,Math.min(b.x,p.x));p.y=Math.max(8,Math.min(b.y,p.y));if(!clear(p,p.x,p.y))place(p,p.id,people.length);target(p);paint(p);}}).observe(field);
  matchMedia('(prefers-reduced-motion:reduce)').addEventListener('change',()=>setActive(active));
  window.addEventListener('pagehide',stop);
  return {setCount,setActive,reconcile,element:id=>people.find(p=>p.id===id)?.el};
}
