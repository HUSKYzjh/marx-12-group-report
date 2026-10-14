import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialRemedy,remedyReducer as act,remedyAccounts,REMEDY_MODES} from '../lib/remedy-lab.ts';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});
const shelf=r=>JSON.parse(JSON.stringify(window.RemedyFeedback.shelfState(r)));

test('unplayed, idle and old-stock-only shelves cannot celebrate new production',()=>{
 assert.deepEqual(shelf(null),{kind:'ready',caption:'待开工'});
 assert.deepEqual(shelf({stock:0,made:0,sold:0}),{kind:'idle',caption:'没开工'});
 assert.deepEqual(shelf({stock:0,made:0,sold:5}),{kind:'old-cleared',caption:'旧货卖完'});
 assert.deepEqual(shelf({stock:5,made:0,sold:0}),{kind:'stocked',caption:''});
});

test('clear stock can still carry actual debt; marking it does not complete the experiment',()=>{
 let s=act(initialRemedy('consumption'),{type:'PLACE',mode:'credit',expectedRound:0});
 const before=JSON.stringify(s),a=remedyAccounts(s);assert.equal(a.display.stock,0);assert.equal(a.display.debt,10);assert.equal(a.canContinue,false);
 assert.deepEqual(shelf(a.display),{kind:'cleared',caption:'卖完！'});assert.equal(JSON.stringify(s),before);
 s=act(s,{type:'PLACE',mode:'credit',expectedRound:1});assert.equal(remedyAccounts(s).display.stock,12);assert.equal(shelf(remedyAccounts(s).display).kind,'stocked');
});

test('shelf states use each actual report, including alternative and archived periods, without writes',()=>{
 for(const route of Object.keys(REMEDY_MODES))for(const dose of [0,1,2,3])for(let bits=0;bits<8;bits++)for(const outlook of ['normal','adverse','supported']){
  let s={...initialRemedy(route),dose};
  for(let n=0;n<3;n++){
   s=act(s,{type:'PLACE',mode:REMEDY_MODES[route][bits>>n&1],expectedRound:n,outlook:n===2?outlook:'normal'});
   const r=remedyAccounts(s).display,original=JSON.stringify(r),v=shelf(r);
   if(r.stock)assert.equal(v.kind,'stocked');else if(r.made&&r.sold)assert.equal(v.kind,'cleared');else assert.notEqual(v.kind,'cleared');
   assert.equal(JSON.stringify(r),original);assert(!/赢|利润|通关|危机/.test(v.caption));
  }
  s=act(s,{type:'PLACE',mode:REMEDY_MODES[route][1],expectedRound:3,outlook});const old=JSON.stringify(s),a=remedyAccounts(s);
  shelf(a.display);shelf(a.thirdBaseline);assert.equal(JSON.stringify(s),old);
  const replay=act(s,{type:'REPLAY',fromRound:0,expectedPlan:JSON.stringify(s)}),frozen=JSON.stringify(replay),rewound=remedyAccounts(replay);
  assert.equal(shelf(rewound.display).kind,'ready');assert.equal(rewound.archives.length,1);
  for(const r of rewound.archives[0].reports.concat(rewound.archives[0].comparisons)){
   const v=shelf(r);if(r.stock)assert.equal(v.kind,'stocked');else if(r.made&&r.sold)assert.equal(v.kind,'cleared');else assert.notEqual(v.kind,'cleared');
  }
  assert.equal(JSON.stringify(replay),frozen);
 }
});
