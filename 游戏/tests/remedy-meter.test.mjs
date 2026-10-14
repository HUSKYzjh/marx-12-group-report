import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialRemedy,remedyReducer as act,remedyAccounts,REMEDY_MODES} from '../lib/remedy-lab.ts';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});
const {meterOpening,cashRuler,comparison,comparisonScale,previousView,path,turnEffects}=window.RemedyFeedback;
const clean=x=>JSON.parse(JSON.stringify(x));
function play(route,mode){let s=initialRemedy(route);for(let n=0;n<3;n++)s=act(s,{type:'PLACE',mode,expectedRound:n,outlook:n===2?'adverse':'normal'});return s;}

test('cash ruler leaves room above opening and uses funded units rather than a success percentage',()=>{
 assert.equal(cashRuler(60),120);assert.equal(cashRuler(75,60),120);assert.equal(cashRuler(121,130),180);assert.equal(cashRuler(0),120);
});
test('an unplayed opening has no transaction to animate',()=>{
 assert.equal(meterOpening(remedyAccounts(initialRemedy('consumption'))),null);assert.equal(meterOpening(null),null);
 assert.equal(turnEffects(null),null);
});

test('one move can fill the account and the shelf: the two impacts are not a win score',()=>{
 let s=initialRemedy('consumption');for(let n=0;n<2;n++)s=act(s,{type:'PLACE',mode:'credit',expectedRound:n});
 const r=remedyAccounts(s).display,e=turnEffects(r);assert.equal(e.stock.amount,12);assert.equal(e.cash.amount,3);
 assert.equal(e.stock.direction,'grow');assert.equal(e.cash.direction,'grow');assert.equal(e.stock.text,'＋12份');assert.equal(e.cash.text,'＋3枚');
 assert.match(e.stock.description,/做出50份，卖出38份/);assert(!/赢|利润|危机/.test(e.cash.description));
});

test('no production is never labelled sold out and zero impacts stay still',()=>{
 const r={newStock:0,cashChange:0,made:0,sold:0},e=turnEffects(r);assert.equal(e.stock.direction,'steady');assert.equal(e.cash.direction,'steady');
 assert.equal(e.stock.text,'不变');assert.equal(e.cash.text,'不变');assert.match(e.stock.description,/做出0份，卖出0份/);assert(!/卖完|满足|成功/.test(e.stock.description));
 const down=turnEffects({...r,newStock:-10,cashChange:-3});assert.equal(down.stock.direction,'shrink');assert.equal(down.stock.text,'−10份');assert.equal(down.cash.text,'−3枚');
});
test('each operated period starts at its real cash and stock, never at last alternative third-turn result',()=>{
 let s=play('consumption','credit');const base=remedyAccounts(s).reports[1].world;
 s=act(s,{type:'PLACE',mode:'raise',expectedRound:3,outlook:'adverse'});const a=remedyAccounts(s),snapshot=JSON.stringify(s);
 assert.deepEqual(clean(meterOpening(a)),{stock:base.stock,cash:base.cash.shop});assert.notEqual(base.cash.shop,a.thirdBaseline.world.cash.shop);
 assert.equal(JSON.stringify(s),snapshot);
});
test('archived view uses its own opening; inconsistent or absent prefixes cannot manufacture an animation',()=>{
 let s=play('investment','expand');s=act(s,{type:'REPLAY',fromRound:0,expectedPlan:JSON.stringify(s)});
 for(let n=0;n<2;n++)s=act(s,{type:'PLACE',mode:'replace',expectedRound:n});const a=remedyAccounts(s),old=previousView(a,path(a));
 assert.equal(meterOpening(old).stock,old.reports[0].stock);assert.equal(meterOpening(old).cash,old.reports[0].world.cash.shop);
 assert.equal(meterOpening({...old,reports:[]}),null);assert.equal(meterOpening({...old,display:{...old.display,cashChange:999}}),null);
});
test('a falling account fits the shared ruler even when both alternate closing balances are smaller',()=>{
 const report=(cash,delta)=>({sold:10,stock:20,world:{cash:{shop:cash}},cashChange:delta});
 const scale=comparisonScale({before:report(50,-100),after:report(60,-90)});assert.equal(scale.cash,180);assert.equal(scale.stock,30);
});
test('all route paths, doses and third conditions reconstruct funded period starts without writes',()=>{
 for(const route of Object.keys(REMEDY_MODES))for(const dose of [0,1,2,3])for(let bits=0;bits<8;bits++)for(const outlook of ['normal','adverse','supported']){
  let s={...initialRemedy(route),dose};for(let n=0;n<3;n++){s=act(s,{type:'PLACE',mode:REMEDY_MODES[route][bits>>n&1],expectedRound:n,outlook:n===2?outlook:'normal'});const a=remedyAccounts(s),start=meterOpening(a),r=a.display;
   assert.equal(start.cash+r.cashChange,r.world.cash.shop);assert.equal(start.stock+r.newStock,r.stock);assert(start.cash>=0&&start.stock>=0);assert(cashRuler(start.cash,r.world.cash.shop)>=start.cash);
   const impacts=turnEffects(r);assert.equal(impacts.stock.amount,r.stock-start.stock);assert.equal(impacts.cash.amount,r.world.cash.shop-start.cash);
  }
  s=act(s,{type:'PLACE',mode:REMEDY_MODES[route][1],expectedRound:3,outlook});const saved=JSON.stringify(s),a=remedyAccounts(s),r=comparison(a),old=previousView(a,r);
  assert.deepEqual(clean(meterOpening(a)),clean(meterOpening(old)));assert.equal(turnEffects(a.display).stock.amount,a.display.stock-meterOpening(a).stock);assert.equal(turnEffects(a.display).cash.amount,a.display.world.cash.shop-meterOpening(a).cash);assert.equal(JSON.stringify(s),saved);
 }
});
