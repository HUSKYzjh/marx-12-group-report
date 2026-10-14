import test from 'node:test';
import assert from 'node:assert/strict';
import {createStreetCampaign,streetReducer as reduce,streetMoney,restoreStreetGame} from '../lib/street-game.ts';
import {streetSolvency} from '../lib/street-campaign.ts';
import {openStreet,run,acknowledge,probe} from '../scripts/probe-street-campaign.mjs';
import {initialPrologue,prologueReducer,restorePrologue} from '../lib/prologue-state.ts';

test('opening, purchase, rival and other bosses follow with actual payments and finite hires',()=>{
 let g=run(createStreetCampaign());assert.equal(g.campaign.beat,'expand');assert.equal(run(g).world.round,1);
 g=acknowledge(reduce(g,{type:'STORY_EXPAND'}));g=run(g);assert.equal(g.campaign.beat,'rival');g=reduce(g,{type:'STORY_COMPETE'});assert.equal(g.campaign.beat,'others');assert.equal(run(g).world.round,2);
 const previous=structuredClone(g);g=reduce(g,{type:'OTHERS_FOLLOW'});assert.deepEqual(g.campaign.followed,['clothes','cars','ovens']);assert.equal(g.report.transactions.length,3);assert(g.report.transactions.every(t=>t.amount===24&&t.to==='inputs'&&t.quantity===16));assert.equal(g.report.hired.length,2);
 assert.equal(g.world.people.length,20);assert.equal(g.world.people.filter(p=>!p.job&&!p.owner).length,0);assert.equal(streetMoney(g.world),previous.world.initialMoney);assert.equal(g.world.firms.find(f=>f.id==='ovens').productivity,2);assert.equal(reduce(g,{type:'OTHERS_FOLLOW'}),g);assert.deepEqual(restoreStreetGame(g),g);
});
test('real inventory or negative profit triggers repeated decisions, never mandatory firing',()=>{
 let g=openStreet();while(g.campaign.beat==='pressure')g=run(g);assert(g.report.stock>0||g.report.accounts.netProfit<0);
 const staff=g.world.firms[0].workers.length;for(let i=0;i<3;i++)g=run(g);assert.equal(g.campaign.beat,'decide');assert(g.campaign.attempts>=3);assert.equal(g.world.firms[0].workers.length,staff);
 const before=g;g=reduce(g,{type:'WAGE',delta:-1});g=reduce(g,{type:'PRICE',delta:-1});g=run(g);assert.equal(g.world.round,before.world.round+1);assert.deepEqual(restoreStreetGame(g),g);
 const retry=reduce(g,{type:'RETRY'});assert.deepEqual(retry.world,before.world);assert.deepEqual(retry.books,before.books);assert.deepEqual(retry.campaign,before.campaign);
});
test('cash shortfall for a full shift is not bankruptcy; actual arrears exceed a funded bid',()=>{
 const results=[];for(const w of [3,5,7])for(const p of [1,2,3,4].filter(p=>p<=w))for(const n of [1,2,3]){
  const r=probe(w,p,n);assert.equal(r.beat,'insolvent');assert(r.solvency.shortfall>0);assert.equal(r.solvency.shortfall,r.solvency.arrears-r.solvency.cash-r.solvency.resale);assert(r.day>6);assert(r.attempts>1);results.push(r);
 }
 assert(new Set(results.map(r=>r.day)).size>1,'different choices must not all close on a scripted day');
 const r=results[0],g=r.game;assert.deepEqual(streetSolvency(g),g.campaign.solvency);assert.equal(run(g),g); // A bankrupt shop cannot keep printing sales.
 const before=streetMoney(g.world),closed=reduce(g,{type:'CLOSE_SHOP'});assert.equal(closed.campaign.beat,'closed');assert.equal(closed.world.firms[0].workers.length,0);assert.equal(closed.books.ovens.length,0);assert.equal(closed.books.stockValue,0);assert.equal(streetMoney(closed.world),before);assert.equal(closed.report.accounts.closingAssets-closed.report.accounts.openingAssets,closed.report.accounts.retained);assert.deepEqual(restoreStreetGame(closed),closed);
 assert(closed.report.transactions.some(t=>t.kind==='liquidation'&&t.amount===r.solvency.resale));assert.equal(reduce(closed,{type:'CLOSE_SHOP'}),closed);
});
test('closed bakery leads to father/daughter, then summary, then prescriptions',()=>{
 const g=reduce(probe(5,3,3).game,{type:'CLOSE_SHOP'});let s={...initialPrologue(),scene:'street',street:g};s=prologueReducer(s,{type:'SHOW_ENDING'});assert.equal(s.scene,'ending');assert.deepEqual(restorePrologue(JSON.stringify(s)),s);
 assert.equal(prologueReducer(s,{type:'SHOW_STREET_SUMMARY'}),s);s=prologueReducer(s,{type:'NEXT_PAIR',expectedIndex:0});s=prologueReducer(s,{type:'NEXT_PAIR',expectedIndex:1});s=prologueReducer(s,{type:'SHOW_STREET_SUMMARY'});assert.equal(s.scene,'street-summary');assert.deepEqual(restorePrologue(JSON.stringify(s)),s);s=prologueReducer(s,{type:'SHOW_RELIEF'});assert.equal(s.scene,'relief');
});
