import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialRemedy,remedyReducer as act,remedyAccounts,REMEDY_MODES} from '../lib/remedy-lab.ts';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});
const view=window.RemedyFeedback;
const place=(s,mode)=>act(s,{type:'PLACE',mode,expectedRound:s.history.length,outlook:s.history.length>=2?'adverse':'normal'});

test('the local opening asks players to clear stock, not to find a universally winning policy',()=>{
 for(const route of Object.keys(REMEDY_MODES)){
  const s=initialRemedy(route),before=JSON.stringify(s),line=view.message(route,remedyAccounts(s),false);
  assert.match(line,/50份.*40份.*试着清货/);assert(!/获胜|通关|必然|正确/.test(line));assert.equal(JSON.stringify(s),before);
 }
});

test('equally clear first shelves expose different funded commitments rather than identical success',()=>{
 let s=place(initialRemedy('consumption'),'credit'),r=remedyAccounts(s).display;
 assert.equal(r.stock,0);assert.equal(r.debt,10);assert.match(view.prompt('consumption',1,r),/卖完了.*先还旧账12枚/);
 s=place(initialRemedy('consumption'),'raise');r=remedyAccounts(s).display;
 assert.equal(r.stock,0);assert.equal(r.debt,0);assert(!/旧账|还借/.test(view.prompt('consumption',1,r)));
 s=place(initialRemedy('investment'),'expand');r=remedyAccounts(s).display;
 assert.equal(r.stock,0);assert.equal(r.made,50);assert.equal(r.capacity,10);assert.match(view.prompt('investment',1,r),/卖完了.*下回合开工.*多做10份/);
 s=place(initialRemedy('investment'),'replace');r=remedyAccounts(s).display;
 assert.equal(r.stock,0);assert.equal(r.capacity,0);assert.match(view.prompt('investment',1,r),/旧机换下来了/);
});

test('a second credit prompt uses actual remaining stock and due principal plus interest',()=>{
 let s=place(initialRemedy('consumption'),'credit');s=place(s,'credit');const r=remedyAccounts(s).display;
 assert.equal(r.stock,12);assert.match(view.prompt('consumption',2,r),/剩12份.*旧账12枚/);
 const unfunded={...r,stock:0,made:0};assert(!view.prompt('consumption',1,unfunded).includes('卖完了'));
 assert(!view.prompt('consumption',1,{...unfunded,debt:0}).includes('卖完了'));
 assert(!view.prompt('investment',1,{...unfunded,capacity:10,investment:0,control:{mode:'expand'}}).includes('新机器下回合'));
});

test('current stock and cash differences cannot conceal the outstanding debt difference',()=>{
 let s=initialRemedy('consumption');for(let n=0;n<3;n++)s=place(s,'credit');s=place(s,'raise');
 const a=remedyAccounts(s),frozen=JSON.stringify(a),comparison=view.comparison(a),line=view.tradeoff(comparison);
 assert.equal(comparison.stock,-8);assert.equal(comparison.cash,-2);assert.equal(comparison.before.debt,2);assert.equal(comparison.after.debt,0);
 assert.match(line,/少剩8份，钱少2枚；少欠2枚/);assert(!/赢|最佳/.test(line));assert.equal(JSON.stringify(a),frozen);
});

test('same third-turn cash does not conceal the next-period machine and cost commitments',()=>{
 let s=initialRemedy('investment');for(let n=0;n<3;n++)s=place(s,'expand');s=place(s,'replace');
 const a=remedyAccounts(s),frozen=JSON.stringify(a),comparison=view.comparison(a),line=view.tradeoff(comparison);
 assert.equal(comparison.stock,0);assert.equal(comparison.cash,0);assert.equal(comparison.before.capacity,25);assert.equal(comparison.after.capacity,20);
 assert.match(line,/眼前一样.*下期产能少5份.*开工少花2枚/);assert.equal(JSON.stringify(a),frozen);
 const reverse={...comparison,before:comparison.after,after:comparison.before};assert.match(view.tradeoff(reverse),/下期产能多5份.*开工多花2枚/);
});
