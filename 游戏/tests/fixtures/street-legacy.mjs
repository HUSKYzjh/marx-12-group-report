import {createStreetGame,streetFirm,streetMoney} from '../../lib/street-game.ts';
// Retired 27-person v2 save: test input only, never a playable runtime world.
export function legacyStreetGame(){
 const g=createStreetGame();g.version=2;
 for(const [id,count] of [['bakery',2],['rival',2],['clothes',4],['cars',2],['ovens',3],['inputs',2]]){
  const f=streetFirm(g.world,id),template=g.world.people.find(p=>p.id===id+'-0');
  for(let i=f.workers.length;i<count;i++){const p=structuredClone(template);p.id=id+'-'+i;p.cash=1500;g.world.people.push(p);f.workers.push(p.id);}
  f.machines=count;f.ovenAges=Array(count).fill(0);
 }
 const template=g.world.people.find(p=>p.id==='available-0');
 for(let i=2;i<6;i++){const p=structuredClone(template);p.id='available-'+i;g.world.people.push(p);}
 g.world.initialMoney=streetMoney(g.world);return g;
}
