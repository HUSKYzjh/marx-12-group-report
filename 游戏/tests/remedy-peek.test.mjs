import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialRemedy,remedyReducer as act,remedyAccounts,REMEDY_MODES,remedyMoney} from '../lib/remedy-lab.ts';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});
const {comparison,path,previousView,comparisonLabel,comparisonScale,comparisonSubject,comparisonPreview,tradeoff,turnEffects,investmentState,producerReaction}=window.RemedyFeedback;
const clean=x=>JSON.parse(JSON.stringify(x));
const play=(route,mode,outlook='adverse')=>{let s=initialRemedy(route);for(let n=0;n<3;n++)s=act(s,{type:'PLACE',mode,expectedRound:n,outlook:n===2?outlook:'normal'});return s;};
const rewind=(s,n)=>act(s,{type:'REPLAY',fromRound:n,expectedPlan:JSON.stringify(s)});

test('a visual comparison requires actual current and recorded reports, not an opening or fabricated result',()=>{
 const a=remedyAccounts(initialRemedy('consumption'));assert.equal(previousView(a,null),null);assert.equal(previousView(a,{before:{},after:null}),null);
 let s=play('consumption','credit');s=act(s,{type:'PLACE',mode:'raise',expectedRound:3,outlook:'adverse'});const b=remedyAccounts(s),r=comparison(b);
 assert.equal(previousView(b,{...r,before:{...r.before}}),null);assert.equal(previousView(b,{...r,after:{...r.after}}),null);
});

test('same-period visual replay uses the real shared prefix and the compared result without a fourth day or payment',()=>{
 for(const [route,first,second]of [['consumption','credit','raise'],['investment','expand','replace'],['exports','single','diverse']]){
  let s=play(route,first);s=act(s,{type:'PLACE',mode:second,expectedRound:3,outlook:'adverse'});const a=remedyAccounts(s),snapshot=JSON.stringify(a),r=comparison(a),v=previousView(a,r);
  assert.strictEqual(v.display,r.before);assert.deepEqual(clean(v.reports),a.reports);assert.equal(v.reports.length,3);assert.equal(remedyMoney(v.display.world),420);assert.equal(JSON.stringify(a),snapshot);assert.match(comparisonLabel(r),/改了招式.*同一起点/);
 }
});

test('archived second-turn machines use the old first turn, never the new arrangement prefix',()=>{
 let s=rewind(play('investment','expand'),0);for(let n=0;n<2;n++)s=act(s,{type:'PLACE',mode:'replace',expectedRound:n});const a=remedyAccounts(s),r=path(a),v=previousView(a,r);
 assert.deepEqual(clean(v.reports),a.archives[0].reports.slice(0,2));assert.equal(investmentState(v).activeCapacity,10);assert.equal(investmentState(a).activeCapacity,0);assert.equal(v.display.stock,10);assert.equal(a.display.stock,0);assert.match(comparisonLabel(r),/前2回合对照.*第1回合.*第2回合/);
});

test('archived producer mood follows that arrangement only and no guess or completion is created',()=>{
 let s=rewind(play('consumption','credit','normal'),0);for(let n=0;n<3;n++)s=act(s,{type:'PLACE',mode:'raise',expectedRound:n});const a=remedyAccounts(s),saved=JSON.stringify(s),v=previousView(a,path(a));
 assert.deepEqual(clean(producerReaction(v)),clean(producerReaction(a.archives[0])));assert.equal(v.display.debt,10);assert.equal(a.display.debt,0);assert.equal(JSON.stringify(s),saved);assert.equal(v.guess,undefined);assert.equal(a.canContinue,false);
});

test('a partially played archive cannot supply a future scene',()=>{
 let s=initialRemedy('exports');s=act(s,{type:'PLACE',mode:'single',expectedRound:0});s=rewind(s,0);s=act(s,{type:'PLACE',mode:'diverse',expectedRound:0});const a=remedyAccounts(s);assert(previousView(a,path(a)));
 s=act(s,{type:'PLACE',mode:'diverse',expectedRound:1});assert.equal(path(remedyAccounts(s)),null);assert.equal(previousView(remedyAccounts(s),null),null);
});

test('a condition change retains its actual name; it cannot masquerade as an unchanged counter',()=>{
 let s=play('exports','single');s=act(s,{type:'COMPARE',outlook:'supported'});const a=remedyAccounts(s),r=comparison(a),v=previousView(a,r);
 assert.match(comparisonLabel(r),/改了条件/);assert.equal(v.display.control.outlook,'adverse');assert.equal(a.display.control.outlook,'supported');
 assert.equal(comparisonSubject(r),'旧试法');assert.equal(comparisonPreview('exports',r),'旧试法：押一个大客户 · 逆风。');assert.match(tradeoff(r),/^比旧试法：/);
});

test('the period can add stock while the countermove leaves less than the old move; both baselines are named',()=>{
 let s=play('consumption','credit');s=act(s,{type:'PLACE',mode:'raise',expectedRound:3,outlook:'adverse'});const a=remedyAccounts(s),r=comparison(a),effect=turnEffects(a.display);
 assert.equal(effect.stock.amount,22);assert.equal(effect.cash.amount,-7);assert.equal(r.stock,-8);assert.equal(r.cash,-2);
 assert.equal(tradeoff(r),'比旧招：少剩8份，钱少2枚；少欠2枚。');assert.equal(comparisonPreview('consumption',r),'旧招：先借钱 · 逆风。');
 assert(!/本期|利润|赢/.test(tradeoff(r)));
});

test('a dose change is a different trial and an archived plan is not renamed a single old move',()=>{
 let s=play('investment','expand');s=act(s,{type:'DOSE',delta:-1});s=act(s,{type:'PLACE',mode:'expand',expectedRound:3,outlook:'adverse'});let a=remedyAccounts(s),r=comparison(a);
 assert.equal(comparisonSubject(r),'旧试法');assert.match(tradeoff(r),/^比旧试法：/);
 s=rewind(s,0);s=act(s,{type:'PLACE',mode:'replace',expectedRound:0});a=remedyAccounts(s);r=path(a);
 assert.equal(comparisonSubject(r),'旧安排');assert.equal(comparisonPreview('investment',r),'旧安排：扩建产线 · 原条件。');assert.match(tradeoff(r),/^比旧安排：/);
 assert.equal(comparisonPreview('investment',null),'');
});

test('identical arrangements show reproduction, not a claim of improvement',()=>{
 let s=play('exports','single','normal');s=act(s,{type:'COMPARE',outlook:'normal'});const a=remedyAccounts(s),r=comparison(a);assert.match(comparisonLabel(r),/安排没变.*原结果复现/);assert.deepEqual(previousView(a,r).display.world,a.display.world);
});

test('both views share one inventory and cash scale rather than separately filling each bar',()=>{
 assert.equal(comparisonScale(null),null);let s=play('consumption','credit');s=act(s,{type:'PLACE',mode:'raise',expectedRound:3,outlook:'adverse'});const r=comparison(remedyAccounts(s)),scale=comparisonScale(r);
 assert.equal(scale.cash,120);assert(scale.cash>=r.before.world.cash.shop-r.before.cashChange);assert(scale.cash>=r.after.world.cash.shop-r.after.cashChange);assert.equal(scale.stock,Math.max(1,r.before.sold+r.before.stock,r.after.sold+r.after.stock));assert.notEqual(r.before.world.cash.shop/scale.cash,r.after.world.cash.shop/scale.cash);
});

test('all modes and doses retain funded, integer previous worlds and leave actual economic state untouched',()=>{
 for(const route of Object.keys(REMEDY_MODES))for(const dose of [0,1,2,3])for(const first of REMEDY_MODES[route])for(const second of REMEDY_MODES[route]){
  let s={...initialRemedy(route),dose};for(let n=0;n<3;n++)s=act(s,{type:'PLACE',mode:first,expectedRound:n,outlook:n===2?'adverse':'normal'});s=act(s,{type:'PLACE',mode:second,expectedRound:3,outlook:'supported'});const saved=JSON.stringify(s),a=remedyAccounts(s),v=previousView(a,comparison(a));
  assert.equal(v.reports.length,3);assert.equal(remedyMoney(v.display.world),420);assert(Object.values(v.display.world.cash).every(n=>Number.isInteger(n)&&n>=0));assert.equal(JSON.stringify(s),saved);
 }
});

test('all finite compared paths keep one bounded short line with the actual differences and old condition',()=>{
 for(const route of Object.keys(REMEDY_MODES))for(const dose of [0,1,2,3])for(let bits=0;bits<8;bits++)for(const outlook of ['normal','adverse','supported']){
  let s={...initialRemedy(route),dose};for(let n=0;n<3;n++)s=act(s,{type:'PLACE',mode:REMEDY_MODES[route][bits>>n&1],expectedRound:n,outlook:n===2?'adverse':'normal'});
  s=act(s,{type:'PLACE',mode:REMEDY_MODES[route][1],expectedRound:3,outlook});const saved=JSON.stringify(s),a=remedyAccounts(s),r=comparison(a),line=tradeoff(r),old=comparisonPreview(route,r);
  assert(Array.from(line).length<=30,line);assert(Array.from(old).length<=22,old);assert.match(old,new RegExp({normal:'原条件',adverse:'逆风',supported:'顺风'}[r.before.control.outlook]));
  if(r.stock)assert.match(line,new RegExp((r.stock>0?'多剩':'少剩')+Math.abs(r.stock)+'份'));else if(r.cash)assert.match(line,/剩货一样/);
  if(r.cash)assert.match(line,new RegExp('钱'+(r.cash>0?'多':'少')+Math.abs(r.cash)+'枚'));
  assert.equal(JSON.stringify(s),saved);
 }
});
