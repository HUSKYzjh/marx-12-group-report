import test from 'node:test';
import assert from 'node:assert/strict';
import {initialDuel,settleDuel,rewindDuel,replayEveryone,restoreDuel,moneyTotal,offerIssue,currentOffer,STRATEGIES} from '../public/assets/market-duel/model.mjs';

test('duel has finite people, empty inventory, integer wallets and funded payments',()=>{
  let s=initialDuel();assert.equal(s.people.length,11);assert.deepEqual(s.firms.map(f=>f.bread.length),[0,0]);
  for(let i=0;i<6;i++){
    const o=currentOffer(s);while(offerIssue(s,o)&&o.wage>1)o.wage--;
    s=settleDuel(s,o,{allowClosed:true});assert.equal(moneyTotal(s),120);
    const wallets=Object.fromEntries([...s.history.at(-1).before.firms.map(f=>['f'+f.id,f.cash]),...s.history.at(-1).before.people.map(p=>['p'+p.id,p.cash])]);
    for(const r of s.history.at(-1).report.receipts){assert(Number.isInteger(r.amount));assert(wallets[r.from]>=r.amount);wallets[r.from]-=r.amount;wallets[r.to]+=r.amount;}
    for(const f of s.firms)assert.equal(wallets['f'+f.id],f.cash);
    for(const p of s.people)assert.equal(wallets['p'+p.id],p.cash);
  }
  assert.throws(()=>settleDuel(s,currentOffer(s)));assert.deepEqual(restoreDuel(s),s);
});
test('choices are not the old constant-104 account and rivals do not see current bids',()=>{
  const s=initialDuel();const a=settleDuel(s,{wage:1,price:3,ovens:1}),b=settleDuel(s,{wage:3,price:3,ovens:1});
  assert.notEqual(a.firms[0].cash,b.firms[0].cash);
  assert.deepEqual(a.history[0].offers[1],b.history[0].offers[1]);
  assert.equal(settleDuel(a,currentOffer(a)).history[1].offers[1].wage,1);
  assert.equal(settleDuel(b,currentOffer(b)).history[1].offers[1].wage,3);
});
test('same-seed rewinding reproduces decisions and preserves the original path',()=>{
  let s=initialDuel();for(let i=0;i<3;i++)s=settleDuel(s,currentOffer(s));
  const copy=structuredClone(s),back=rewindDuel(s,2);
  const next=settleDuel(back,s.history[1].requested);assert.deepEqual(next.history[1],s.history[1]);
  assert.deepEqual(s,copy);assert.equal(back.day,1);assert.equal(moneyTotal(back),120);
  const tampered=structuredClone(s);tampered.firms[0].cash++;tampered.firms[1].cash--;assert.equal(restoreDuel(tampered),null);
});
test('individual and everyone replay use their own same-funded start; everyone need not always lose',()=>{
  let s=initialDuel('steady');for(let i=0;i<6;i++)s=settleDuel(s,{wage:3,price:3,ovens:1},{allowClosed:true});
  const all=replayEveryone(s);assert.equal(moneyTotal(all),120);assert.equal(all.day,6);assert.deepEqual(restoreDuel(all),all);
  assert.deepEqual(s.history.map(h=>h.before.seed),all.history.map(h=>h.before.seed));
  assert(all.history.some(h=>h.report.fed>=s.history[h.report.day-1].report.fed));
});
test('legal offer enumeration conserves money, identities and purchased bread across strategies',()=>{
  for(const strategy of Object.keys(STRATEGIES))for(let seed=0;seed<8;seed++)for(let wage=1;wage<=4;wage++)for(let price=1;price<=4;price++)for(let ovens=1;ovens<=2;ovens++){
    const start=initialDuel(strategy,seed),offer={wage,price,ovens};if(offerIssue(start,offer))continue;
    const s=settleDuel(start,offer),r=s.history[0].report;
    assert.equal(moneyTotal(s),120);assert(r.fed<=11);assert(r.people.every(p=>p.bought<=2));
    for(let id=0;id<2;id++)assert.equal(r.made[id],r.sold[id]+r.stock[id]);
    const sold=r.visits.filter(v=>v.success).map(v=>v.bread);assert.equal(new Set(sold).size,sold.length);
    assert.deepEqual(restoreDuel(s),s);
  }
});
test('illegal, unaffordable and late actions never change the submitted world',()=>{
  const s=initialDuel(),before=structuredClone(s);
  for(const o of [{wage:0,price:3,ovens:1},{wage:2.5,price:3,ovens:1},{wage:2,price:0,ovens:1},{wage:4,price:3,ovens:3}])assert.throws(()=>settleDuel(s,o));
  assert.deepEqual(s,before);assert.equal(restoreDuel({...s,people:[]}),null);
});
test('stopped shops sell old stock without inventing payroll or buying an oven',()=>{
  // Synthetic cash-constraint stress state; browser tests never inject this.
  const s=settleDuel(initialDuel(),{wage:3,price:4,ovens:2});assert(s.firms[0].bread.length>0);
  s.people[10].cash+=s.firms[0].cash;s.firms[0].cash=0;
  const out=settleDuel(s,{wage:1,price:1,ovens:2},{allowClosed:true}),r=out.history.at(-1).report;
  assert(r.closed[0]);assert.equal(r.made[0],0);assert.equal(out.firms[0].price,1);
  assert(!r.receipts.some(p=>p.from==='f0'&&['工资','添烤炉','开炉原料与燃料'].includes(p.reason)));assert.equal(moneyTotal(out),120);
  assert.throws(()=>settleDuel(s,{wage:0,price:1,ovens:2},{allowClosed:true}));
});
test('six-day price/wage/oven paths and synchronized replay keep integer funded accounts',()=>{
  for(const strategy of Object.keys(STRATEGIES))for(let wage=1;wage<=4;wage++)for(let price=1;price<=4;price++){
    let s=initialDuel(strategy,43);
    for(let day=0;day<6;day++){
      const ovens=Math.min(3,s.firms[0].ovens+(day===2||day===4?1:0));
      s=settleDuel(s,{wage,price,ovens},{allowClosed:true});assert.equal(moneyTotal(s),120);
    }
    const all=replayEveryone(s);assert.equal(all.day,6);assert.equal(moneyTotal(all),120);assert.deepEqual(restoreDuel(all),all);assert.deepEqual(restoreDuel(s),s);
  }
});
