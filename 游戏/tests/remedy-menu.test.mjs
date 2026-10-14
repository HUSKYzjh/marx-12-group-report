import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {prologueReducer as act} from '../lib/prologue-state.ts';
import {legacyRemedyPrologue as initialPrologue} from './helpers/legacy-remedy.mjs';
import {remedyAccounts} from '../lib/remedy-lab.ts';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});
const choice=(s,id)=>JSON.parse(JSON.stringify(window.RemedyFeedback.choice(s,id,s.remedyLabs[id]?remedyAccounts(s.remedyLabs[id]):null)));

test('each fictional adviser gives one short offer, with no mandatory extra dialogue or invented progress',()=>{
 const s=act(initialPrologue(),{type:'JUMP_STAGE',stage:4}),saved=JSON.stringify(s);
 for(const id of ['consumption','investment','exports']){
  const c=choice(s,id);assert.equal(c.round,0);assert.equal(c.completed,false);assert.equal(c.progress,'→');
  assert(Array.from(c.quote).length<=9);assert(!/必然|保证|战争|印钱/.test(c.quote));assert.match(c.label,/试这张处方/);
 }
 assert.equal(JSON.stringify(s),saved);
});

test('collected cards show actual stock and carryover, not an adviser promise or a universal verdict',()=>{
 for(const [route,mode,other] of [['consumption','credit','raise'],['investment','expand','replace'],['exports','single','diverse']])for(const last of [mode,other]){
  let s=act(act(initialPrologue(),{type:'JUMP_STAGE',stage:4}),{type:'CHOOSE_RELIEF',route});
  for(let n=0;n<3;n++)s=act(s,{type:'REMEDY',action:{type:'PLACE',mode,expectedRound:n,outlook:n===2?'adverse':'normal'}});
  s=act(s,{type:'REMEDY',action:{type:'PLACE',mode:other,expectedRound:3,outlook:'adverse'}});
  if(last!==other)s=act(s,{type:'REMEDY',action:{type:'PLACE',mode:last,expectedRound:3,outlook:'adverse'}});
  assert.equal(choice(s,route).recorded,false,'executing is not collecting');
  s=act(s,{type:'RELIEF_WRAP'});const before=JSON.stringify(s),r=remedyAccounts(s.remedyLabs[route]).display,c=choice(s,route);
  assert(c.recorded);assert(c.quote.startsWith('剩'+r.stock+'份 · '));assert(c.trial.endsWith('逆风'));assert(c.label.includes(c.trial));assert.equal(c.progress,'再试 ↺');
  if(route==='consumption')assert(c.quote.endsWith(r.debt?'下期还'+(r.debt+Math.ceil(r.debt/5))+'枚':'工资'+r.wages+'枚'));
  if(route==='investment')assert(c.quote.endsWith(last==='expand'?'下期产能'+(50+r.capacity)+'份':'下期开工'+(Math.max(10,15-r.world.efficiency)+Math.ceil(r.capacity/5))+'枚'));
  if(route==='exports')assert(c.quote.endsWith('跑腿'+r.transport+'枚'));
  assert(Array.from(c.quote).length<=30);assert(!/利润|赢|战争|必然|崩溃/.test(c.quote));assert.equal(JSON.stringify(s),before);
  const opened=act(s,{type:'CHOOSE_RELIEF',route}),draft=act(opened,{type:'REMEDY',action:{type:'DOSE',delta:-1}});assert.deepEqual(choice(s,route),choice(draft,route));
  const rematch=act(opened,{type:'REMEDY',action:{type:'REPLAY',fromRound:0,expectedPlan:JSON.stringify(opened.remedyLabs[route])}});
  assert.equal(choice(rematch,route).recorded,false);assert.equal(choice(rematch,route).trial,'');assert.equal(choice(rematch,route).completed,false);assert.equal(choice(rematch,route).progress,'→');
 }
});

test('a favourable-condition receipt is labelled favourable instead of repeating a crisis story',()=>{
 let s=act(act(initialPrologue(),{type:'JUMP_STAGE',stage:4}),{type:'CHOOSE_RELIEF',route:'exports'});
 for(let n=0;n<3;n++)s=act(s,{type:'REMEDY',action:{type:'PLACE',mode:'single',expectedRound:n,outlook:n===2?'adverse':'normal'}});
 s=act(s,{type:'REMEDY',action:{type:'COMPARE',outlook:'supported'}});s=act(s,{type:'RELIEF_WRAP'});
 assert(choice(s,'exports').recorded);assert(choice(s,'exports').trial.endsWith('顺风'));assert(!/停单|危机|逆风/.test(choice(s,'exports').quote));
});

test('a menu visit, draft or unfinished turn can only resume the actual record; a completed response has a different label',()=>{
 for(const [route,mode,other] of [['consumption','credit','raise'],['investment','expand','replace'],['exports','single','diverse']]){
  let s=act(initialPrologue(),{type:'JUMP_STAGE',stage:4});s=act(s,{type:'CHOOSE_RELIEF',route});
  for(let n=0;n<3;n++){
   s=act(s,{type:'REMEDY',action:{type:'PLACE',mode,expectedRound:n,outlook:n===2?'adverse':'normal'}});
   const before=JSON.stringify(s),c=choice(s,route);assert.equal(c.round,n+1);assert.equal(c.completed,false);assert.equal(c.progress,'接着玩 →');assert.match(c.label,/保留原记录/);assert.equal(JSON.stringify(s),before);
  }
  s=act(s,{type:'REMEDY',action:{type:'PLACE',mode:other,expectedRound:3,outlook:'adverse'}});
  assert.equal(choice(s,route).completed,false,'a finished trial still needs the real collect action');
  s=act(s,{type:'RELIEF_WRAP'});assert.equal(choice(s,route).completed,true);assert.equal(choice(s,route).progress,'再试 ↺');
  const menu=act(s,{type:'RELIEF_MENU'}),draft=act(act(menu,{type:'CHOOSE_RELIEF',route}),{type:'REMEDY',action:{type:'DOSE',delta:-1}});
  assert.deepEqual(choice(menu,route),choice(draft,route));assert.equal(choice(menu,['consumption','investment','exports'].find(id=>id!==route)).progress,'→');
 }
});
