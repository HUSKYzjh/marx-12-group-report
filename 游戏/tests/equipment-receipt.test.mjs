import test from 'node:test';
import assert from 'node:assert/strict';
import {equipmentWorld,equipmentRound} from '../public/assets/market-duel/equipment-model.mjs';
import {ovenReport,tradeReceipt} from '../public/assets/market-duel/equipment-receipt.mjs';
test('recorded ordering costs stay on the day paid, not on delivery day',()=>{
 let w=equipmentRound(equipmentWorld(),'upgrade','steady');const before=JSON.stringify(w);
 let a=ovenReport(w);assert.equal(a.current.equipment,8);assert.equal(a.current.made,0);assert.equal(a.current.inputs,0);assert.equal(a.current.wages,6);assert.equal(a.installed,false);assert.equal(a.previous,null);assert.equal(JSON.stringify(w),before);
 w=equipmentRound(w,'hold','steady');a=ovenReport(w);assert.equal(a.installed,true);assert.equal(a.current.made,12);assert.equal(a.previous.equipment,8);assert.equal(a.current.equipment,0);assert(a.current.sold<a.current.made);
 for(const r of [a.previous,a.current])assert.equal(r.change,r.revenue-r.outflow);
});
test('diffusion is shown only once both actual installations exist, not when rival merely orders',()=>{
 let w=equipmentRound(equipmentWorld(true),'upgrade','social');w=equipmentRound(w,'hold','social');assert.equal(ovenReport(w).shared,false);
 w=equipmentRound(w,'hold','social');assert.equal(ovenReport(w).shared,true);
});
test('every payment remains classified, and reports cannot alter saved paths',()=>{
 let w=equipmentWorld(true);for(const move of ['upgrade','hold','fire','wage-down','hold']){w=equipmentRound(w,move,'social');const before=JSON.stringify(w);for(const id of [0,1]){const r=tradeReceipt(w.history.at(-1),id);assert.equal(r.outflow,r.wages+r.inputs+r.owner+r.equipment+r.storage+r.compensation);assert.equal(r.change,r.revenue-r.outflow);assert(Object.values(r).every(Number.isInteger));}ovenReport(w);assert.equal(JSON.stringify(w),before);}
 assert.equal(ovenReport(equipmentWorld()),null);assert.equal(tradeReceipt(null),null);assert.equal(tradeReceipt(w.history[0],3),null);
});
