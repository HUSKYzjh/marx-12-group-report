import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {separateBodies,crowdPressure,avoidanceVelocity} from '../public/assets/market-duel/crowd-spacing.mjs';
const overlaps=(a,b,gap=0)=>Math.abs(a.x+a.w/2-b.x-b.w/2)<(a.w+b.w)/2+gap-.01&&Math.abs(a.y+a.h/2-b.y-b.h/2)<(a.h+b.h)/2+gap-.01;
const advance=(bodies,canPlace,frames=100)=>{let result=bodies;for(let i=0;i<frames;i++)result=separateBodies(result,canPlace);return result;};

test('coincident people separate gently without changing identities, sizes or source positions',()=>{
 const initial=[0,1].map(id=>({id,x:100,y:80,w:39,h:58})),before=structuredClone(initial);
 const first=separateBodies(initial);assert.deepEqual(initial,before);
 for(const p of first){assert(Math.abs(p.x-100)<=4);assert(Math.abs(p.y-80)<=4);}
 const result=advance(initial);assert(!overlaps(...result,9));
 assert.deepEqual(result.map(p=>[p.id,p.w,p.h]),initial.map(p=>[p.id,p.w,p.h]));
 assert.deepEqual(separateBodies(initial),first,'avoidance does not roll random demand');
});

test('wall-side crowding moves the free person, never crosses walls or shop obstacles',()=>{
 const inside=(p,x,y)=>x>=8&&y>=8&&x+p.w<=500&&y+p.h<=300&&!(x<200&&x+p.w>170&&y<220&&y+p.h>70);
 const initial=[{id:0,x:8,y:50,w:39,h:58},{id:1,x:8,y:50,w:39,h:58}];
 const result=advance(initial,inside);assert(result.every(p=>inside(p,p.x,p.y)));assert(!overlaps(...result,9));
 let crowd=Array.from({length:12},(_,id)=>({id,x:220+id%4*38,y:20+Math.floor(id/4)*57,w:39,h:58}));
 for(let frame=0;frame<120;frame++){crowd=separateBodies(crowd,inside);assert(crowd.every(p=>inside(p,p.x,p.y)));}
 for(let i=0;i<crowd.length;i++)for(let j=i+1;j<crowd.length;j++)assert(!overlaps(crowd[i],crowd[j]),'bodies no longer cover each other');
 assert.equal(crowd.length,12);
});

test('separation is a final motion pass, including stationary people, not a population change',()=>{
 const source=readFileSync(new URL('../public/assets/market-duel/street-crowd.mjs',import.meta.url),'utf8');
 assert.match(source,/resolveOverlaps\(\);for\(const p of people\)/);
 assert.match(source,/resolveOverlaps\(true\);people.forEach\(paint\)/);
 assert.match(source,/clear\(byId.get\(p.id\),x,y\)/);
 assert.doesNotMatch(separateBodies.toString(),/Math.random|splice|\.pop\(|\.remove\(/);
});

test('crowded and already-reserved destinations have higher pressure than empty space',()=>{
 const bodies=[{id:0,x:0,y:0,tx:200,ty:80},{id:1,x:10,y:5,tx:210,ty:80},{id:2,x:20,y:0,tx:205,ty:85}];
 assert(crowdPressure(bodies,10,0)>crowdPressure(bodies,400,0));
 assert(crowdPressure(bodies,205,80,{targets:true})>crowdPressure(bodies,400,0,{targets:true}));
 assert(crowdPressure(bodies,0,0)>crowdPressure(bodies,0,0,{ignoreId:0}));
});

test('twenty large pedestrians can unpack without reducing the crowd',()=>{
 let crowd=Array.from({length:20},(_,id)=>({id,x:200+(id%5)*43,y:25+Math.floor(id/5)*65,w:46,h:68}));
 const inside=(p,x,y)=>x>=8&&y>=8&&x+p.w<=900&&y+p.h<=450;
 for(let frame=0;frame<180;frame++)crowd=separateBodies(crowd,inside,{gap:20,iterations:5,maxShift:4});
 assert.equal(crowd.length,20);assert(crowd.every(p=>inside(p,p.x,p.y)));
 for(let i=0;i<crowd.length;i++)for(let j=i+1;j<crowd.length;j++)assert(!overlaps(crowd[i],crowd[j],20));
});

test('approaching walkers avoid each other before collision, without global attraction',()=>{
 const a={id:0,x:0,y:0,vx:50,vy:0},b={id:1,x:120,y:0,vx:-50,vy:0};
 assert.equal(avoidanceVelocity(a,[a,b],{lookahead:0}).vx,0);
 assert(avoidanceVelocity(a,[a,b]).vx<0);assert(avoidanceVelocity(b,[a,b]).vx>0);
 assert.deepEqual(avoidanceVelocity(a,[a,{...b,x:500}]),{vx:0,vy:0});
 const coincident=avoidanceVelocity(a,[a,{...b,x:0,vx:50}]);assert(Number.isFinite(coincident.vx)&&Number.isFinite(coincident.vy));
 const source=readFileSync(new URL('../public/assets/market-duel/street-crowd.mjs',import.meta.url),'utf8');
 assert.match(source,/targets:true/);assert.match(source,/person.rerouteCooldown=\.8/);
});
