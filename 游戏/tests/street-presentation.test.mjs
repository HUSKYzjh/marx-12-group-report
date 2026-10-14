import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createStreetGame,streetReducer} from '../lib/street-game.ts';
const context={window:{}};vm.runInNewContext(readFileSync(new URL('../lib/street-presentation.js',import.meta.url),'utf8'),context);
const view=context.window.StreetPresentation;

test('complete portraits including tall hats fit their cells, with negative sprite origins',()=>{
 for(const bounds of [{x:-50,y:-100,width:100,height:100},{x:-50,y:-160,width:100,height:160},{x:-65,y:-135,width:130,height:135}])for(const width of [44,70,120]){
  const cell={x:300,y:400,width,height:64},fit=view.fitPerson(bounds,cell,.49);
  assert(fit.scale<=.49);assert(fit.x+bounds.x*fit.scale>=cell.x-1e-8);assert(fit.y+bounds.y*fit.scale>=cell.y-1e-8);
  assert(fit.x+(bounds.x+bounds.width)*fit.scale<=cell.x+cell.width+1e-8);assert(fit.y+(bounds.y+bounds.height)*fit.scale<=cell.y+cell.height+1e-8);
  assert(Math.abs(fit.y+(bounds.y+bounds.height)*fit.scale-(cell.y+cell.height))<1e-8);
 }
});
test('whole-coin readout is spendable balance, not rounded fictional wealth',()=>{
 assert.equal(view.whole(22506),225);assert.equal(view.whole(99),0);assert.equal(view.amount(5),'5');assert(!/\d\.\d/.test(view.amount(5.59)));
 assert.equal(view.change({cash:225.06,cashChange:-.41}),0);assert.equal(view.change({cash:225.06,cashChange:4.57}),5);
});
test('trips stop exactly on each shop border, then return home without overshoot',()=>{
 const home={x:450,y:800},stops=[{firm:'bakery',point:view.counter({box:[300,400,350,900],shopHeight:165},1)},{firm:'clothes',point:view.counter({box:[20,20,250,800],shopHeight:140},1)},{firm:'cars',point:view.counter({box:[690,20,250,800],shopHeight:140},1)}];
 const clock=view.timing(stops.length,1);
 stops.forEach((s,i)=>{const sample=view.trip(clock.start+(i+.8)*clock.span,home,stops,1);assert.equal(sample.state,'counter');assert.equal(sample.visit.firm,s.firm);assert.equal(sample.x,s.point.x);assert.equal(sample.y,s.point.y);});
 for(const time of [0,1,7.5,8]){const s=view.trip(time,home,stops,1);assert.equal(s.state,'home');assert.equal(s.x,home.x);assert.equal(s.y,home.y);}
});
test('all desired shops are visited, including failed purchases, and both bread shops if actually used',()=>{
 const g=streetReducer(createStreetGame(),{type:'ROUND',expectedRound:0});
 for(const p of g.world.people){const visits=view.visits(p,g.world,g.report);assert(visits.some(s=>s.kind==='bread'));for(const item of p.shopping.items){assert(visits.some(s=>s.kind===item.kind&&s.outcome===item.outcome));if(item.outcome==='money')break;}for(const tx of g.report.transactions.filter(t=>t.from===p.id&&['bread','clothes','car'].includes(t.kind)))assert(visits.some(s=>s.kind===tx.kind&&s.firm===tx.to&&s.bought));}
 const poor=g.world.people.find(p=>p.id==='available-0');assert(view.visits(poor,g.world,g.report).some(s=>s.kind==='bread'&&!s.bought));
 assert.equal(view.visits(poor,g.world,{...g.report,management:true}).length,0);
});
test('money failure changes the face at the counter, cancels further browsing and returns home',()=>{
 const g=streetReducer(createStreetGame(),{type:'ROUND',expectedRound:0}),p=g.world.people.find(p=>p.id==='available-0');
 const stops=view.visits(p,g.world,g.report).map(s=>({...s,point:{x:100,y:165}})),clock=view.timing(stops.length,0),home={x:450,y:800};
 assert.equal(stops.length,1);assert.equal(stops[0].outcome,'money');assert.equal(view.worried(clock.start+.5*clock.span,stops,0),false);assert.equal(view.worried(clock.start+.8*clock.span,stops,0),true);
 assert.equal(view.trip(clock.start+1.2*clock.span,home,stops,0).state,'return');assert.equal(view.trip(8,home,stops,0).y,home.y);assert.equal(view.worried(8,stops,0),true);
});
