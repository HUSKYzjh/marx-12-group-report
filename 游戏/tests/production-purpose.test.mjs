import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/production-purpose.js',import.meta.url),'utf8'),{window});
const {calculate:calc,feedback}=window.ProductionPurpose;
test('better unit efficiency does not by itself fix total energy or output',()=>{
 const old=calc({machine:'old',orders:6,batches:1}),full=calc({machine:'new',orders:6,batches:3});
 assert.equal(old.output,6);assert.equal(old.hours,3);assert.equal(old.energy,12);
 assert.equal(full.energyPerLoaf,old.energyPerLoaf/2);assert.equal(full.hours,old.hours);
 assert.equal(full.output,18);assert.equal(full.energy,18);assert.equal(full.sold,6);assert.equal(full.stock,12);assert.match(feedback(full),/总共却更费/);
});
test('the same new oven can fulfil unchanged orders with less energy and time',()=>{
 const a=calc({machine:'new',orders:6,batches:1});assert.equal(a.output,6);assert.equal(a.energy,6);assert.equal(a.hours,1);assert.equal(a.freeHours,2);assert.equal(a.stock,0);assert.match(feedback(a),/时间和能源都省了/);
});
test('higher payable orders can absorb expansion without compulsory stock or a moral verdict',()=>{
 const a=calc({machine:'new',orders:18,batches:3});assert.equal(a.sold,18);assert.equal(a.stock,0);assert.equal(a.unfilled,0);assert.match(feedback(a),/都有人要/);
 const b=calc({machine:'new',orders:18,batches:1});assert.equal(b.unfilled,12);assert.match(feedback(b),/没做够/);
});
test('all legal plans conserve goods and hours; derived values and outside inputs cannot inject results',()=>{
 for(const orders of [6,18])for(const machine of ['old','new'])for(const batches of [1,2,3]){
  const p={orders,machine,batches},before=JSON.stringify(p),a=calc(p);assert.equal(JSON.stringify(p),before);
  if(machine==='old'&&batches>1){assert.equal(a,null);continue;}
  assert.equal(a.output,a.sold+a.stock);assert.equal(a.orders,a.sold+a.unfilled);assert.equal(a.hours+a.freeHours,3);assert.equal(a.energy,a.output*a.energyPerLoaf);
  assert.equal(calc({...p,energy:-100}).energy,a.energy);
 }
 for(const p of [null,{},[],{machine:'new',batches:4,orders:6},{machine:'new',batches:1.5,orders:6},{machine:'new',batches:1,orders:7},{machine:'magic',batches:1,orders:6}])assert.equal(calc(p),null);
});
test('production purpose installs before technology UI and only adds a non-gating conclusion experiment',()=>{
 const assembly=fs.readFileSync(new URL('../lib/trust-document.ts',import.meta.url),'utf8'),ui=fs.readFileSync(new URL('../lib/technology-ui.js',import.meta.url),'utf8');
 assert(assembly.indexOf('${script(productionPurpose)}')<assembly.indexOf('${script(technologyUI)}'));
 assert.match(ui,/if\(t\.phase==='conclusion'\)[\s\S]*ProductionPurpose\.mount/);
 assert.doesNotMatch(fs.readFileSync(new URL('../lib/production-purpose.js',import.meta.url),'utf8'),/localStorage|\.send\(|fetch\(/);
});
