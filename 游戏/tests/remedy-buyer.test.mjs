import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialRemedy,remedyReducer as act,remedyAccounts} from '../lib/remedy-lab.ts';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});
const {equipmentBuyer,buyerQuote,path,previousView}=window.RemedyFeedback;
const clean=x=>JSON.parse(JSON.stringify(x));
function play(mode='expand'){let s=initialRemedy('investment');for(let n=0;n<3;n++)s=act(s,{type:'PLACE',mode,expectedRound:n,outlook:n===2?'adverse':'normal'});return s;}

test('the opening buyer has no fictional order or new wallet',()=>{
 const a=remedyAccounts(initialRemedy('investment')),snapshot=JSON.stringify(a);
 assert.deepEqual(clean(equipmentBuyer(a)),{total:0,prior:null,status:'ready'});assert.match(buyerQuote(equipmentBuyer(a),a),/还没下单/);assert.equal(JSON.stringify(a),snapshot);
});
test('clipboard includes only actually paid original, new and downstream orders',()=>{
 let s=initialRemedy('investment');s=act(s,{type:'PLACE',mode:'expand',expectedRound:0});const a=remedyAccounts(s),r=a.display;
 assert.deepEqual(clean(equipmentBuyer(a)),{total:25,prior:null,status:'ordered'});assert.match(buyerQuote(equipmentBuyer(a),a),/下回合才开工/);
 assert.equal(equipmentBuyer({...a,display:{...r,sold:999,investment:999,preorders:999,payments:[...r.payments,{from:'households',to:'shop',amount:100,reason:'新增设备订单'},{from:'buyers',to:'bank',amount:100,reason:'原有设备订单'}]}}).total,25);
});
test('smaller actual third-period orders use the shared second-period prefix, not the last trial',()=>{
 let s=play();let a=remedyAccounts(s);assert.deepEqual(clean(equipmentBuyer(a)),{total:13,prior:25,status:'less'});assert.match(buyerQuote(equipmentBuyer(a),a),/上回买25份.*这回买13份/);
 s=act(s,{type:'PLACE',mode:'replace',expectedRound:3,outlook:'adverse'});a=remedyAccounts(s);assert.equal(equipmentBuyer(a).prior,25);assert.equal(equipmentBuyer(a).status,'less');
 s=act(s,{type:'COMPARE',outlook:'supported'});a=remedyAccounts(s);assert.equal(equipmentBuyer(a).total,45);assert.equal(equipmentBuyer(a).status,'ordered');assert.match(buyerQuote(equipmentBuyer(a),a),/只换旧机器/);
});
test('zero extra investment retains original paid orders and does not invent installation',()=>{
 let s={...initialRemedy('investment'),dose:0};s=act(s,{type:'PLACE',mode:'expand',expectedRound:0});const a=remedyAccounts(s);assert.equal(equipmentBuyer(a).total,15);assert.match(buyerQuote(equipmentBuyer(a),a),/没添新设备/);
 const noOrders={...a,display:{...a.display,payments:[]}};assert.equal(equipmentBuyer(noOrders).status,'none');assert.match(buyerQuote(equipmentBuyer(noOrders),noOrders),/没成交/);
});
test('old buyer reaction belongs to its own archived arrangement and cannot rewrite it',()=>{
 let s={...initialRemedy('investment'),dose:0};for(let n=0;n<2;n++)s=act(s,{type:'PLACE',mode:'replace',expectedRound:n});s=act(s,{type:'REPLAY',fromRound:0,expectedPlan:JSON.stringify(s)});s=act(s,{type:'DOSE',delta:1});s=act(s,{type:'DOSE',delta:1});for(let n=0;n<2;n++)s=act(s,{type:'PLACE',mode:'expand',expectedRound:n});const a=remedyAccounts(s),saved=JSON.stringify(s),old=previousView(a,path(a));
 assert.deepEqual(clean(equipmentBuyer(old)),{total:15,prior:15,status:'ordered'});assert.equal(equipmentBuyer(a).total,25);assert.equal(JSON.stringify(s),saved);
});
test('all doses, move paths and conditions retain integer ledger-only orders',()=>{
 for(const dose of [0,1,2,3])for(let bits=0;bits<8;bits++)for(const outlook of ['normal','adverse','supported']){
  let s={...initialRemedy('investment'),dose};for(let n=0;n<3;n++)s=act(s,{type:'PLACE',mode:bits>>n&1?'expand':'replace',expectedRound:n,outlook:n===2?outlook:'normal'});
  const a=remedyAccounts(s),saved=JSON.stringify(a),b=equipmentBuyer(a),expected=a.display.payments.filter(p=>p.from==='buyers'&&p.to==='shop').reduce((sum,p)=>sum+p.amount,0);
  assert.equal(b.total,expected);assert(Number.isInteger(b.total)&&b.total>=0);assert.equal(JSON.stringify(a),saved);assert(!/战争|崩溃|必然/.test(buyerQuote(b,a)));
 }
});
