import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialRemedy,remedyReducer as act,remedyAccounts} from '../lib/remedy-lab.ts';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});
const art=s=>JSON.parse(JSON.stringify(window.RemedyFeedback.equipmentArt(remedyAccounts(s))));

test('new equipment remains pending; expansion adds a live glyph next turn while replacement changes the existing glyph',()=>{
 let expanded=act(initialRemedy('investment'),{type:'PLACE',mode:'expand',expectedRound:0});
 assert.deepEqual(art(expanded),{baseKind:'old',count:1,mode:'expand',outgoingKind:null,bootIndex:-1});
 expanded=act(expanded,{type:'PLACE',mode:'expand',expectedRound:1});assert.deepEqual(art(expanded),{baseKind:'old',count:2,mode:'expand',outgoingKind:null,bootIndex:1});assert.equal(remedyAccounts(expanded).display.made,60);
 let replaced=act(initialRemedy('investment'),{type:'PLACE',mode:'replace',expectedRound:0});
 assert.deepEqual(art(replaced),{baseKind:'old',count:1,mode:'replace',outgoingKind:'old',bootIndex:-1});assert.equal(remedyAccounts(replaced).display.costs,15);
 replaced=act(replaced,{type:'PLACE',mode:'replace',expectedRound:1});assert.deepEqual(art(replaced),{baseKind:'upgraded',count:1,mode:'replace',outgoingKind:'upgraded',bootIndex:0});assert.equal(remedyAccounts(replaced).display.made,50);assert.equal(remedyAccounts(replaced).display.costs,13);
});

test('unfunded purchases have no pending art; paused production has no start gesture',()=>{
 let s={...initialRemedy('investment'),dose:0};s=act(s,{type:'PLACE',mode:'replace',expectedRound:0});assert.equal(art(s).mode,null);assert.equal(art(s).outgoingKind,null);assert.equal(art(s).bootIndex,-1);
 const a=remedyAccounts(act(initialRemedy('investment'),{type:'PLACE',mode:'expand',expectedRound:0}));
 const unpaid={...a,reports:[a.display,{...a.display,round:2,made:0}],display:{...a.display,round:2,made:0}};assert.equal(window.RemedyFeedback.equipmentArt(unpaid).bootIndex,-1);
});

test('all modes, doses and actual third-turn trials use their own preceding equipment, not newly delivered or old alternate machines',()=>{
 for(const dose of [0,1,2,3])for(let bits=0;bits<8;bits++)for(const outlook of ['normal','adverse','supported']){
  let s={...initialRemedy('investment'),dose};for(let n=0;n<3;n++)s=act(s,{type:'PLACE',mode:bits>>n&1?'replace':'expand',expectedRound:n,outlook:n===2?outlook:'normal'});
  s=act(s,{type:'PLACE',mode:'replace',expectedRound:3,outlook:'adverse'});const saved=JSON.stringify(s),a=remedyAccounts(s),before=a.reports[1].world,v=art(s);
  assert.equal(v.baseKind,before.efficiency?'upgraded':'old');assert.equal(v.count,Math.min(3,1+Math.ceil(before.capacity/10)));assert.equal(v.mode,a.display.investment?'replace':null);assert.equal(JSON.stringify(s),saved);
  const changed=act(s,{type:'DOSE',delta:dose? -1:1});assert.deepEqual(art(changed),v,'a draft never redraws paid equipment');
 }
});

test('replacement illustration does not put bread inside a purchased machine or modify the prologue art',()=>{
 const svg=fs.readFileSync(new URL('../public/assets/bakery/oven-old-empty.svg',import.meta.url),'utf8');assert.match(svg,/data-part="empty-rack"/);assert.match(svg,/data-part="chamber"/);assert(!/bread|<text|<script/.test(svg));
 const old=fs.readFileSync(new URL('../public/assets/bakery/oven-old.svg',import.meta.url),'utf8');assert.match(old,/M100 182/,'the original kitchen scene retains its bread');
 const document=fs.readFileSync(new URL('../lib/trust-document.ts',import.meta.url),'utf8');assert.match(document,/emptyOldOven:'\/assets\/bakery\/oven-old-empty\.svg'/);
});
