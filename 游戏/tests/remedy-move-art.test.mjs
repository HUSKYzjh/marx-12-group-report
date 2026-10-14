import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialRemedy,remedyReducer as act,remedyAccounts,REMEDY_MODES} from '../lib/remedy-lab.ts';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});
const {moveArt,movePiece}=window.RemedyFeedback;

test('six move drawings distinguish funding, installation and customer concentration without reporting an outcome',()=>{
 const pictures=[];
 for(const [route,modes] of Object.entries(REMEDY_MODES))for(const mode of modes){
  const svg=moveArt(route,mode);pictures.push(svg);
  assert.match(svg,/^<svg viewBox="0 0 80 74" aria-hidden="true"/);assert.match(svg,/remedy-move-motion/);
  assert(!/https?:|<image|<script|foreignObject|on[a-z]+=/.test(svg));
  assert(!/支付|成交|盈利|获胜|卖完/.test(svg));assert.equal((svg.match(/<svg/g)||[]).length,1);
 }
 assert.equal(new Set(pictures).size,6);
 assert.match(moveArt('consumption','credit'),/stroke-dasharray/);assert(!moveArt('consumption','raise').includes('stroke-dasharray'));
 assert.equal((moveArt('exports','diverse').match(/<circle/g)||[]).length,3);assert.equal((moveArt('exports','single').match(/<circle/g)||[]).length,1);
});

test('optional pieces are route-specific arrangements, not a generic coupon or newly created money',()=>{
 const names=[];for(const route of Object.keys(REMEDY_MODES)){
  const piece=movePiece(route);names.push(piece.name);assert(piece.prompt.includes(piece.name));assert(piece.prompt.startsWith('点招式'));
  assert(!piece.name.includes('处方券'));assert(['cash','ovens','order'].includes(piece.icon));
 }
 assert.equal(new Set(names).size,3);assert.equal(movePiece('exports').icon,'order');
});

test('reading a move drawing or optional piece never modifies the current receipts or completion',()=>{
 for(const [route,modes] of Object.entries(REMEDY_MODES)){
  let lab=initialRemedy(route);for(let n=0;n<3;n++)lab=act(lab,{type:'PLACE',mode:modes[0],expectedRound:n,outlook:n===2?'adverse':'normal'});
  const before=JSON.stringify(lab),accounts=JSON.stringify(remedyAccounts(lab));for(const mode of modes)moveArt(route,mode);movePiece(route);
  assert.equal(JSON.stringify(lab),before);assert.equal(JSON.stringify(remedyAccounts(lab)),accounts);assert.equal(remedyAccounts(lab).canContinue,false);
 }
});
