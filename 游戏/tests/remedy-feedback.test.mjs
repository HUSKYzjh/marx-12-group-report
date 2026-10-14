import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialRemedy,remedyReducer as act,remedyAccounts} from '../lib/remedy-lab.ts';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});
const feedback=window.RemedyFeedback;

test('optional inspection copy stays short without hiding delayed maintenance or confusing supply with orders',()=>{
 for(const route of ['investment','exports'])for(const dose of [0,1,2,3])for(let bits=0;bits<8;bits++)for(const outlook of ['normal','adverse','supported']){
  let s={...initialRemedy(route),dose};const modes=route==='investment'?['expand','replace']:['single','diverse'];for(let n=0;n<3;n++)s=act(s,{type:'PLACE',mode:modes[bits>>n&1],expectedRound:n,outlook:n===2?outlook:'normal'});
  const a=remedyAccounts(s),snapshot=JSON.stringify(a),r=a.display,quotes=route==='investment'?[feedback.investmentCheck(feedback.investmentState(a)),feedback.buyerQuote(feedback.equipmentBuyer(a),a)]:[feedback.exportCheck(feedback.exportState(r))];
  for(const quote of quotes)assert(Array.from(quote).length<=25,quote);assert.equal(JSON.stringify(a),snapshot);
  if(route==='investment'){const equipment=feedback.investmentState(a);if(equipment.pendingCapacity)assert.match(quotes[0],new RegExp('下期多做'+equipment.pendingCapacity+'份.*维护多'+equipment.maintenance+'枚'));}
  else if(r.exportSupplyShortfall)assert.match(quotes[0],new RegExp('肯买'+Math.min(r.control.dose*5,r.exportQuota)+'份.*只发'+r.exports+'份.*缺货'));
 }
});

test('export network uses actual foreign payments and separates no order from supply shortage',()=>{
 assert.equal(feedback.exportState(null).status,'ready');
 let lab=initialRemedy('exports');lab=act(lab,{type:'PLACE',mode:'single',expectedRound:0});let s=feedback.exportState(remedyAccounts(lab).display);
 assert.equal(s.status,'traded');assert.equal(s.shipped,10);assert.equal(s.transport,2);
 lab=act(lab,{type:'PLACE',mode:'single',expectedRound:1});s=feedback.exportState(remedyAccounts(lab).display);assert.equal(s.status,'reduced');assert.equal(s.shipped,5);assert.equal(s.limited,5);assert.match(feedback.exportCheck(s),/卖了5份.*跑腿1枚/);
 lab=act(initialRemedy('exports'),{type:'DOSE',delta:1});lab=act(lab,{type:'PLACE',mode:'single',expectedRound:0});s=feedback.exportState(remedyAccounts(lab).display);assert.equal(s.status,'shortage');assert.equal(s.quota,15);assert.equal(s.shipped,10);assert.match(feedback.exportCheck(s),/肯买15份.*只发10份.*缺货/);
 const report=remedyAccounts(lab).display;assert.equal(feedback.exportState({...report,exports:999,transport:999}).shipped,10);assert.equal(feedback.exportState({...report,exports:999,transport:999}).transport,2);
});

test('a stop has no cargo; diversification retains actual orders at a real market cost',()=>{
 let lab=act(trial('exports','single'),{type:'COMPARE',outlook:'adverse'});let s=feedback.exportState(remedyAccounts(lab).display);assert.equal(s.status,'stopped');assert.equal(s.shipped,0);assert.equal(s.transport,0);assert.match(feedback.exportCheck(s),/船不能当顾客/);
 lab=act(lab,{type:'PLACE',mode:'diverse',expectedRound:3,outlook:'adverse'});s=feedback.exportState(remedyAccounts(lab).display);assert.equal(s.status,'reduced');assert.equal(s.shipped,5);assert.equal(s.transport,3);assert.equal(s.mode,'diverse');
 const before=feedback.exportState(remedyAccounts(lab).display);lab=act(lab,{type:'DOSE',delta:1});assert.deepEqual(feedback.exportState(remedyAccounts(lab).display),before);
});

test('zero-dose export is idle, not a shipment or an invented cancelled sale',()=>{
 let lab=initialRemedy('exports');lab=act(lab,{type:'DOSE',delta:-1});lab=act(lab,{type:'DOSE',delta:-1});for(let n=0;n<3;n++)lab=act(lab,{type:'PLACE',mode:'single',expectedRound:n});lab=act(lab,{type:'COMPARE',outlook:'adverse'});
 const s=feedback.exportState(remedyAccounts(lab).display);assert.equal(s.status,'idle');assert.equal(s.shipped,0);assert.equal(s.transport,0);assert.match(feedback.exportCheck(s),/没接海外单/);
});

test('all mode paths and doses keep exported orders and charges equal to the funded ledger',()=>{
 for(let path=0;path<8;path++)for(let dose=0;dose<4;dose++)for(const outlook of ['normal','adverse','supported']){
  let lab=initialRemedy('exports');while(lab.dose!==dose)lab=act(lab,{type:'DOSE',delta:Math.sign(dose-lab.dose)});
  for(let n=0;n<3;n++)lab=act(lab,{type:'PLACE',mode:path&(1<<n)?'single':'diverse',expectedRound:n});lab=act(lab,{type:'COMPARE',outlook});const account=remedyAccounts(lab),frozen=structuredClone(lab);
  for(const r of account.reports.concat(account.comparisons)){const s=feedback.exportState(r);assert.equal(s.shipped,r.exports);assert.equal(s.transport,r.transport);assert.equal(s.shortfall,r.exportSupplyShortfall);assert.equal(s.requested,r.control.dose*5);}
  assert.deepEqual(lab,frozen);
 }
});

test('investment art separates this-period capacity from funded next-period equipment',()=>{
 let lab=initialRemedy('investment');let s=feedback.investmentState(remedyAccounts(lab));
 assert.equal(s.bought,0);assert.equal(s.activeCapacity,0);assert.equal(s.running,false);
 lab=act(lab,{type:'PLACE',mode:'expand',expectedRound:0});s=feedback.investmentState(remedyAccounts(lab));
 assert.equal(s.activeCapacity,0);assert.equal(s.pendingCapacity,10);assert.equal(s.nextCapacity,10);assert.equal(s.maintenance,2);assert.equal(s.booting,false);
 assert.match(feedback.investmentCheck(s),/下期多做10份.*维护多2枚/);
 lab=act(lab,{type:'PLACE',mode:'expand',expectedRound:1});s=feedback.investmentState(remedyAccounts(lab));
 assert.equal(s.activeCapacity,10);assert.equal(s.pendingCapacity,10);assert.equal(s.booting,true);assert.equal(remedyAccounts(lab).display.made,60);
 const frozen=feedback.investmentState(remedyAccounts(lab));lab=act(lab,{type:'DOSE',delta:1});assert.deepEqual(feedback.investmentState(remedyAccounts(lab)),frozen);
});

test('replacement saves next-period costs without adding capacity or deleting prior expansion',()=>{
 let lab=act(initialRemedy('investment'),{type:'PLACE',mode:'replace',expectedRound:0});let s=feedback.investmentState(remedyAccounts(lab));
 assert.equal(s.pendingCapacity,0);assert.equal(s.saving,2);assert.equal(remedyAccounts(lab).display.costs,15);assert.match(feedback.investmentCheck(s),/下期少花2枚，不多做/);
 lab=act(lab,{type:'PLACE',mode:'replace',expectedRound:1});s=feedback.investmentState(remedyAccounts(lab));assert.equal(s.saving,2);assert.equal(remedyAccounts(lab).display.costs,13);
 lab=act(initialRemedy('investment'),{type:'PLACE',mode:'expand',expectedRound:0});lab=act(lab,{type:'PLACE',mode:'replace',expectedRound:1});s=feedback.investmentState(remedyAccounts(lab));assert.equal(s.activeCapacity,10);assert.equal(s.nextCapacity,10);assert.equal(s.pendingCapacity,0);assert.equal(s.saving,2);
});

test('same-shock trials never cumulatively install machines and actual order size controls the art',()=>{
 let lab=trial('investment','expand');lab=act(lab,{type:'COMPARE',outlook:'adverse'});let s=feedback.investmentState(remedyAccounts(lab));
 assert.equal(s.activeCapacity,20);assert.equal(s.bought,5);assert.equal(s.pendingCapacity,5);
 const frozen=feedback.investmentState(remedyAccounts(lab));lab=act(lab,{type:'COMPARE',outlook:'adverse'});assert.deepEqual(feedback.investmentState(remedyAccounts(lab)),frozen);
 lab=act(lab,{type:'PLACE',mode:'replace',expectedRound:3,outlook:'adverse'});s=feedback.investmentState(remedyAccounts(lab));assert.equal(s.activeCapacity,20);assert.equal(s.pendingCapacity,0);assert.equal(s.saving,1);
});

test('zero orders and fully improved equipment cannot claim a new benefit',()=>{
 let lab=initialRemedy('investment');lab=act(lab,{type:'DOSE',delta:-1});lab=act(lab,{type:'DOSE',delta:-1});for(let n=0;n<3;n++)lab=act(lab,{type:'PLACE',mode:'replace',expectedRound:n});
 const a=remedyAccounts(lab),s=feedback.investmentState(a);assert.equal(s.bought,0);assert.equal(s.saving,0);assert.match(feedback.line('investment',a.display),/没买到机器/);
 const capped={opening:{capacity:0,efficiency:5},reports:[],display:{round:1,capacity:0,made:50,world:{efficiency:5},payments:[{from:'buyers',to:'shop',reason:'新增设备订单',amount:10}]}};
 assert.equal(feedback.investmentState(capped).saving,0);assert.match(feedback.investmentCheck(feedback.investmentState(capped)),/成本没再降/);
});
test('credit arrows use actual funded transfers; changing the draft or using wages cannot manufacture a loan',()=>{
 assert.deepEqual({...feedback.creditFlows(null)},{borrowed:0,repaid:0});
 let lab=act(initialRemedy('consumption'),{type:'PLACE',mode:'credit',expectedRound:0});
 assert.deepEqual({...feedback.creditFlows(remedyAccounts(lab).display)},{borrowed:10,repaid:0});
 const before=feedback.creditFlows(remedyAccounts(lab).display);lab=act(lab,{type:'DOSE',delta:1});assert.deepEqual(feedback.creditFlows(remedyAccounts(lab).display),before);
 lab=act(lab,{type:'PLACE',mode:'raise',expectedRound:1});assert.deepEqual({...feedback.creditFlows(remedyAccounts(lab).display)},{borrowed:0,repaid:12});
 lab=act(trial('consumption','credit'),{type:'COMPARE',outlook:'adverse'});assert.equal(feedback.creditFlows(remedyAccounts(lab).display).borrowed,0);assert.equal(feedback.creditFlows(remedyAccounts(lab).display).repaid,10);
 assert.deepEqual({...feedback.creditFlows(remedyAccounts(trial('consumption','raise')).display)},{borrowed:0,repaid:0});
 assert.match(feedback.moveHint('consumption','raise',2),/店里付/);assert.match(feedback.moveHint('consumption','credit',2),/下期还/);assert(!feedback.moveHint('consumption','credit',0).includes('下期还'));
 assert.match(feedback.moveHint('investment','expand',2),/下期/);assert.match(feedback.moveHint('investment','replace',2),/不添产能/);
});
test('producer reacts to actual account changes, with zero breaking streaks and trials replacing rather than appending day three',()=>{
 const report=(round,cashChange)=>({round,cashChange});
 const mood=(reports,display=reports.at(-1))=>feedback.producerReaction({reports,display});
 assert.equal(mood([],null).mood,'ready');
 assert.equal(mood([report(1,0)]).streak,0);
 assert.equal(mood([report(1,4)]).mood,'pleased');
 assert.equal(mood([report(1,-4)]).mood,'worried');
 const reports=[report(1,4),report(2,2),report(3,1)];
 assert.equal(mood(reports).mood,'delighted');assert.equal(mood(reports).streak,3);
 assert.equal(mood(reports,report(3,-2)).mood,'worried');assert.equal(mood(reports,report(3,-2)).streak,1);
 assert.equal(mood([report(1,-4),report(2,-2),report(3,3)],report(3,-1)).mood,'distressed');
 assert.equal(mood([report(1,4),report(2,0),report(3,2)]).streak,1);
 for(const route of ['consumption','investment','exports']){
  let lab=trial(route,{consumption:'credit',investment:'expand',exports:'single'}[route]);lab=act(lab,{type:'COMPARE',outlook:'adverse'});
  const before=mood(remedyAccounts(lab).reports,remedyAccounts(lab).display);
  lab=act(lab,{type:'COMPARE',outlook:'adverse'});lab=act(lab,{type:'DOSE',delta:1});
  assert.deepEqual(mood(remedyAccounts(lab).reports,remedyAccounts(lab).display),before);
 }
});
function trial(route,mode){let lab=initialRemedy(route);for(let n=0;n<3;n++)lab=act(lab,{type:'PLACE',mode,expectedRound:n});return lab;}
test('one-line feedback describes actual arrears, replacement and export shortages without declaring universal crises',()=>{
 let lab=act(trial('consumption','credit'),{type:'COMPARE',outlook:'adverse'});assert(feedback.line('consumption',remedyAccounts(lab).display).includes('账单'));
 lab=trial('investment','replace');assert(feedback.line('investment',remedyAccounts(lab).display).includes('不是又开'));
 lab=initialRemedy('exports');lab=act(lab,{type:'DOSE',delta:1});lab=act(lab,{type:'PLACE',mode:'single',expectedRound:0});assert(feedback.line('exports',remedyAccounts(lab).display).includes('别把缺货当滞销'));
 for(const route of ['consumption','investment','exports'])assert(!/必然|战争|崩溃/.test(feedback.line(route,remedyAccounts(trial(route,{consumption:'credit',investment:'expand',exports:'single'}[route])).display)));
});
test('counter feedback compares the previous actual trial under the same condition, not a silently restored normal world',()=>{
 let lab=act(trial('consumption','credit'),{type:'COMPARE',outlook:'adverse'});const prior=remedyAccounts(lab).display;
 lab=act(lab,{type:'PLACE',mode:'raise',expectedRound:3,outlook:'adverse'});const result=feedback.comparison(remedyAccounts(lab));
 assert.deepEqual(result.before,prior);assert.equal(result.after.control.outlook,'adverse');assert.deepEqual(Array.from(result.changes),['mode']);assert(result.stock<0);assert(result.sold>0);
});
test('condition, dose and move changes are identified separately; unchanged trials do not claim a new causal effect',()=>{
 let lab=trial('exports','single');assert.equal(feedback.comparison(remedyAccounts(lab)),null);
 lab=act(lab,{type:'COMPARE',outlook:'normal'});assert.deepEqual(Array.from(feedback.comparison(remedyAccounts(lab)).changes),[]);
 lab=act(lab,{type:'COMPARE',outlook:'adverse'});assert.deepEqual(Array.from(feedback.comparison(remedyAccounts(lab)).changes),['outlook']);
 lab=act(lab,{type:'DOSE',delta:1});lab=act(lab,{type:'PLACE',mode:'diverse',expectedRound:3,outlook:'adverse'});
 assert.deepEqual(Array.from(feedback.comparison(remedyAccounts(lab)).changes),['mode','dose']);
});
test('battle beats follow actual evidence, not visiting screens or inventing an automatic crisis',()=>{
 let lab=initialRemedy('investment');assert.equal(feedback.beat(remedyAccounts(lab)),'play');
 lab=trial('investment','expand');const original=structuredClone(lab);assert.equal(feedback.beat(remedyAccounts(lab)),'incoming');assert.deepEqual(lab,original);
 lab=act(lab,{type:'COMPARE',outlook:'supported'});assert.equal(feedback.beat(remedyAccounts(lab)),'incoming','a favourable-only old save still needs the adverse experiment');
 lab=act(lab,{type:'COMPARE',outlook:'adverse'});assert.equal(feedback.beat(remedyAccounts(lab)),'free');
 lab=act(trial('investment','expand'),{type:'COMPARE',outlook:'adverse'});assert.equal(feedback.beat(remedyAccounts(lab)),'respond');
 lab=act(lab,{type:'PLACE',mode:'replace',expectedRound:3,outlook:'adverse'});const r=remedyAccounts(lab).display;assert.equal(feedback.beat(remedyAccounts(lab)),'free');assert.equal(r.capacity,20);assert(feedback.line('investment',r).includes('已经扩出的产能还在'));assert.deepEqual(lab.history,original.history);
});
test('incoming wage shock does not invent an old bill for a player who never borrowed',()=>{
 const wages=remedyAccounts(trial('consumption','raise')).display,credit=remedyAccounts(trial('consumption','credit')).display;
 assert.equal(wages.debt,0);assert(!feedback.reply('consumption',wages).includes('旧账'));assert(feedback.reply('consumption',credit).includes('旧账'));assert(credit.debt>0);
 const zeroDose=act(initialRemedy('consumption'),{type:'DOSE',delta:-1});let noLoan=act(zeroDose,{type:'DOSE',delta:-1});for(let n=0;n<3;n++)noLoan=act(noLoan,{type:'PLACE',mode:'credit',expectedRound:n});assert(!feedback.reply('consumption',remedyAccounts(noLoan).display).includes('旧账'));
});

test('next-turn prompts respond to real debt, capacity, stock and customer orders without executing a turn',()=>{
 const cases=[['consumption','credit',/先还旧账/],['consumption','raise',/卖完了/],['investment','expand',/下回合开工/],['investment','replace',/旧机换下来了/],['exports','single',/明天也接吗/],['exports','diverse',/跑腿钱/]];
 for(const [route,mode,pattern] of cases){let lab=act(initialRemedy(route),{type:'PLACE',mode,expectedRound:0});const before=structuredClone(lab),r=remedyAccounts(lab).display;assert.match(feedback.prompt(route,1,r),pattern);assert.deepEqual(lab,before);lab=act(lab,{type:'PLACE',mode,expectedRound:1});const second=remedyAccounts(lab).display;if(route==='investment'&&mode==='expand')assert(feedback.prompt(route,2,second).includes(second.stock+'份'));if(route==='exports'&&mode==='single')assert.match(feedback.prompt(route,2,second),/少买了/);assert.equal(feedback.prompt(route,3,second),'你怎么接？');}
 let mixed=act(initialRemedy('investment'),{type:'PLACE',mode:'expand',expectedRound:0});mixed=act(mixed,{type:'PLACE',mode:'replace',expectedRound:1});assert.match(feedback.prompt('investment',2,remedyAccounts(mixed).display),/换机没缩产能/);
 const noMachine=act(initialRemedy('investment'),{type:'DOSE',delta:-1});let empty=act(noMachine,{type:'DOSE',delta:-1});empty=act(empty,{type:'PLACE',mode:'expand',expectedRound:0});assert.match(feedback.prompt('investment',1,remedyAccounts(empty).display),/没添机器/);
 let noReplacement=act(noMachine,{type:'DOSE',delta:-1});noReplacement=act(noReplacement,{type:'PLACE',mode:'replace',expectedRound:0});assert.match(feedback.prompt('investment',1,remedyAccounts(noReplacement).display),/没换机器/);
});

test('households react to their own available shopping basket, not aggregate equipment sales',()=>{
 assert.equal(feedback.householdMood(null),'ready');
 let lab=act(initialRemedy('consumption'),{type:'PLACE',mode:'credit',expectedRound:0});assert.equal(feedback.householdMood(remedyAccounts(lab).display),'happy');lab=act(lab,{type:'PLACE',mode:'credit',expectedRound:1});assert.equal(feedback.householdMood(remedyAccounts(lab).display),'worried');
 const raise=remedyAccounts(trial('consumption','raise')).display;assert.equal(feedback.householdMood(raise),'happy');
 const synthetic={...raise,sold:50,stock:20,payments:[{from:'households',to:'shop',reason:'家庭购物',amount:12},{from:'buyers',to:'shop',reason:'原有设备订单',amount:38}]};assert.equal(feedback.householdMood(synthetic),'worried','equipment sales cannot make a household happy');
 assert.equal(feedback.householdMood({...synthetic,sold:12,stock:0}),'ready','limited supply is not falsely diagnosed as missing household money or a full shopping basket');assert.equal(feedback.householdMood({...synthetic,sold:0,stock:0,payments:[]}),'ready');
});

test('a wage move cannot claim a fatter wallet when its dose is zero or old bills absorb the money',()=>{
 let lab=initialRemedy('consumption');lab=act(lab,{type:'DOSE',delta:-1});lab=act(lab,{type:'DOSE',delta:-1});for(let n=0;n<3;n++)lab=act(lab,{type:'PLACE',mode:'raise',expectedRound:n});lab=act(lab,{type:'COMPARE',outlook:'adverse'});assert.match(feedback.line('consumption',remedyAccounts(lab).display),/工资没加/);
 lab=act(trial('consumption','credit'),{type:'PLACE',mode:'raise',expectedRound:3,outlook:'adverse'});assert.match(feedback.line('consumption',remedyAccounts(lab).display),/先还了一笔旧账/);
 lab=act(trial('consumption','raise'),{type:'COMPARE',outlook:'adverse'});assert.equal(remedyAccounts(lab).display.wages,20);assert.match(feedback.line('consumption',remedyAccounts(lab).display),/缩水/);
});

test('one transcript uses the actual next question during play and the real tradeoff after a response',()=>{
 for(const [route,first,next] of [['consumption','credit','raise'],['investment','expand','replace'],['exports','single','diverse']]){
  let lab=initialRemedy(route);assert.match(feedback.message(route,remedyAccounts(lab),false),/50份.*40份/);
  for(let n=0;n<2;n++){lab=act(lab,{type:'PLACE',mode:first,expectedRound:n});const account=remedyAccounts(lab),before=structuredClone(lab);assert.equal(feedback.message(route,account,false),feedback.prompt(route,n+1,account.display));assert.deepEqual(lab,before);}
  lab=act(lab,{type:'PLACE',mode:first,expectedRound:2});assert.equal(feedback.message(route,remedyAccounts(lab),false),feedback.line(route,remedyAccounts(lab).display));
  lab=act(lab,{type:'COMPARE',outlook:'adverse'});assert.equal(feedback.message(route,remedyAccounts(lab),false),feedback.line(route,remedyAccounts(lab).display));
  lab=act(lab,{type:'PLACE',mode:next,expectedRound:3,outlook:'adverse'});const account=remedyAccounts(lab);assert.equal(feedback.message(route,account,false),feedback.tradeoff(feedback.comparison(account)));
 }
 const opening=remedyAccounts(initialRemedy('consumption'));assert.match(feedback.message('consumption',opening,true),/换个开局/);
});
