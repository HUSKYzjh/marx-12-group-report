import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const model=readFileSync(new URL('../lib/mortgage-lab-model.js',import.meta.url),'utf8'),ui=readFileSync(new URL('../lib/mortgage-lab.js',import.meta.url),'utf8'),root={};
vm.runInNewContext(model,{window:root});
const run=root.MortgageLabModel.run;
test('origination and transfer change the payee without creating cash or duplicating the mortgage',()=>{
 const a=run({capital:10});assert.equal(a.total,372);assert.equal(a.snapshots.homes.cash.seller,100);assert.equal(a.snapshots.homes.cash.originator,0);
 assert.equal(a.snapshots.pool.cash.originator,80);assert.equal(a.snapshots.pool.bookAssets,80);assert.equal(a.snapshots.pool.funding,70);assert.equal(a.snapshots.pool.bookEquity,10);
 assert(a.snapshots.homes.mortgages.every(m=>m.owner==='originator'));assert(a.snapshots.pool.mortgages.every(m=>m.owner==='fund'));
});
test('falling collateral prices alone do not force default or destroy cash',()=>{
 const a=run({shock:'price'}),b=run({shock:'stable'});assert.equal(a.creditLoss,0);assert.equal(a.homesLost,0);assert.equal(a.jobs,3);assert.equal(a.businessLoan,8);
 assert.deepEqual(a.cash,b.cash);assert.deepEqual(a.snapshots.assessment,b.snapshots.assessment);assert.equal(a.snapshots.assessment.bookAssets,68);
});
test('the same default loss has different capital consequences and a real employment channel',()=>{
 const thin=run({shock:'income',capital:10}),thick=run({shock:'income',capital:30});
 assert.equal(thin.snapshots.assessment.cash.fund,8);assert.equal(thin.snapshots.assessment.bookAssets,76);assert.equal(thin.snapshots.assessment.expectedAssets,56);
 assert.equal(thin.snapshots.assessment.bookEquity,14);assert.equal(thin.snapshots.assessment.estimatedEquity,-6);
 assert.equal(thin.creditLoss,20);assert.equal(thin.snapshots.collection.bookEquity,-6);assert.equal(thick.creditLoss,20);assert.equal(thick.snapshots.collection.bookEquity,14);
 assert.equal(thin.jobs,1);assert.equal(thick.jobs,3);assert.equal(thin.businessLoan,0);assert.equal(thick.businessLoan,8);assert.equal(thin.cash.w1,0);assert.equal(thick.cash.w1,4);
 assert.equal(thin.homesLost,4);assert.equal(thick.homesLost,4);
});
test('liquidity trouble can exist with solvent assets; a public loan changes cash and liabilities, not equity',()=>{
 const a=run({rollover:false}),b=run({rollover:false,policy:'liquidity'});
 assert.equal(a.creditLoss,0);assert.equal(a.fundingGap,4);assert.equal(a.snapshots.funding.bookEquity,14);assert.equal(a.jobs,1);
 assert.equal(b.fundingGap,0);assert.equal(b.publicLoan,20);assert.equal(b.snapshots.support.bookEquity,b.snapshots.assessment.bookEquity);assert.equal(b.jobs,3);
 const bad=run({shock:'income',policy:'liquidity'});assert(!bad.eligible);assert.equal(bad.publicLoan,0);assert.equal(bad.publicSpent,0);assert.equal(bad.jobs,1);
});
test('capital support and household aid protect different people and keep public claims separate from costs',()=>{
 const equity=run({shock:'income',policy:'equity'}),aid=run({shock:'income',policy:'households'});
 assert.equal(equity.publicSpent,20);assert.equal(equity.publicAssetCost,20);assert.equal(equity.creditLoss,20);assert.equal(equity.homesLost,4);assert.equal(equity.jobs,3);
 assert.equal(aid.publicSpent,8);assert.equal(aid.publicAssetCost,0);assert.equal(aid.creditLoss,0);assert.equal(aid.homesLost,0);assert.equal(aid.jobs,3);
 assert.equal(run({shock:'income',rollover:false,policy:'households'}).jobs,1,'household cure does not fix an independent funding run');
});
test('a bearish protection contract has a funded counterparty and does not cause the default',()=>{
 for(const shock of ['stable','price','income']){const a=run({shock,protection:true}),b=run({shock});assert.equal(a.creditLoss,b.creditLoss);assert.equal(a.jobs,b.jobs);assert.equal(a.protectionGain,shock==='income'?4:-1);assert.equal(a.cash.trader+a.cash.insurer,30);assert.equal(a.cash.bakery,b.cash.bakery);}
 assert.equal(run({shock:'income',protection:true,policy:'households'}).protectionGain,-1);
});
test('all 96 combinations reconcile every cash transfer and loan-funded payroll; inputs are untouched',()=>{
 for(const capital of [10,30])for(const shock of ['stable','price','income'])for(const rollover of [true,false])for(const policy of ['none','liquidity','equity','households'])for(const protection of [true,false]){
  const input={capital,shock,rollover,policy,protection},before=JSON.stringify(input),a=run(input),cash={...a.snapshots.opening.cash};assert.equal(before,JSON.stringify(input));
  for(const entry of a.entries){assert(Number.isInteger(entry.amount)&&entry.amount>0);assert(cash[entry.from]>=entry.amount);cash[entry.from]-=entry.amount;cash[entry.to]+=entry.amount;}
  assert.deepEqual(cash,{...a.cash});assert.equal(Object.values(cash).reduce((n,v)=>n+v,0),a.total);assert(Object.values(cash).every(v=>Number.isInteger(v)&&v>=0));
  for(const s of Object.values(a.snapshots)){assert.equal(Object.values(s.cash).reduce((n,v)=>n+v,0),a.total);assert.equal(s.bookEquity,s.cash.fund+s.bookAssets-s.funding-s.publicLoan);}
  assert.equal(a.cash.bakery,4+a.businessLoan-4*a.jobs);assert.equal(a.cash.w0+a.cash.w1+a.cash.w2,a.jobs*4);assert.equal(a.businessLoan,a.snapshots.bakery.businessLoan);
  const c=a.creditDecision;assert.equal(c.capital,a.snapshots.funding.bookEquity);assert.equal(c.cashBefore,a.snapshots.funding.cash.fund);assert.equal(c.granted,a.businessLoan);assert.equal(c.requested,8);
  assert.equal(c.reasons.includes('capital'),c.capital<8);assert.equal(c.reasons.includes('funding'),a.fundingGap>0);assert.equal(c.reasons.includes('cash'),c.capital>=8&&!a.fundingGap&&c.cashBefore<8);
 }
 for(const x of [{capital:20},{shock:'forced-collapse'},{rollover:1},{policy:'print'},{protection:1}])assert.throws(()=>run(x));
 assert.doesNotMatch(model+ui,/localStorage|postMessage|fetch\(/);
});
class Node{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.dataset={};this.textContent='';}
 appendChild(n){this.children.push(n);return n;}replaceChildren(){this.children=[];}setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}focus(){}
 all(){return this.children.flatMap(n=>[n,...n.all()]);}querySelector(q){return this.all().find(n=>q==='h3'?n.tag==='h3':n.dataset.mortgageAction===q.match(/data-mortgage-action="([^"]+)"/)?.[1]);}text(){return [this.textContent,...this.children.map(n=>n.text())].join(' ');}
}
function uiFixture(){
 const f={frame:{x:0,y:0,w:60,h:70}},atlas={frames:{body0000:f,face0000:f},meta:{size:{w:60,h:70}}};
 const root={TRUST_ASSETS:{bakery:{bodyAtlas:atlas,faceAtlas:atlas}}},scope={window:root,document:{createElement:t=>new Node(t),createTextNode:t=>Object.assign(new Node('text'),{textContent:t})}};
 vm.runInNewContext(readFileSync(new URL('../lib/research-reader.js',import.meta.url),'utf8'),scope);vm.runInNewContext(model,scope);vm.runInNewContext(ui,scope);
 const parent=new Node('main'),entry=root.MortgageLab.mount(parent);assert.equal(entry.children.length,1);entry.open=true;entry.ontoggle();const desk=entry.children[1];
 const click=id=>desk.querySelector('[data-mortgage-action="'+id+'"]').onclick();return {root,entry,desk,click};
}
test('lazy UI follows an actual funded chain; rescue replays the same case without adding another public payment',()=>{
 const {root,entry,desk,click}=uiFixture();click('buy');click('10');click('income');assert.equal(desk.dataset.page,'3');assert.match(desk.text(),/估计资本\s+-6枚/);assert(!desk.querySelector('[data-mortgage-action="restart"]'));
 click('equity');assert.equal(desk.dataset.page,'4');assert.match(desk.querySelector('[data-mortgage-action="trace-bakery"]').text(),/开工 3 \/ 3/);assert.match(desk.querySelector('[data-mortgage-action="trace-family"]').text(),/4户失去房屋/);
 click('households');assert.match(desk.querySelector('[data-mortgage-action="trace-family"]').text(),/4户保住房屋/);assert.match(desk.text(),/公共账户付出\s+8枚/);
 entry.open=false;entry.ontoggle();entry.open=true;entry.ontoggle();assert.equal(entry.children.length,2);assert.equal(desk.dataset.page,'4');
 const notes=desk.all().find(n=>n.tag==='details'&&n.children[0].textContent==='历史、条件与来源');assert.equal(notes.children.length,1);notes.open=true;notes.ontoggle();assert.equal(notes.all().filter(n=>n.className==='research-paragraph').length,1);
 assert.match(root.MortgageLab.topics.map(t=>t.pages.join(' ')).join(' '),/证券化不必然失败.*房价一跌就自动违约/);
 const doc=readFileSync(new URL('../lib/trust-document.ts',import.meta.url),'utf8');assert.match(doc,/script\(mortgageLabModel\).*script\(mortgageLab\)/);
 const remedy=readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8');assert.match(remedy,/if\(focused\)root.MortgageLab.mount\(supplement\)/);assert.match(remedy,/root.MortgageLab.mount\(c.readout\)/);
});
test('inspectable chain uses actual payments, refuses blocked lending, and opens only one explanation',()=>{
 const {desk,click}=uiFixture();click('buy');click('10');click('income');click('none');
 const node=id=>desk.querySelector('[data-mortgage-action="trace-'+id+'"]'),detail=desk.all().find(n=>n.className==='mortgage-route-detail');
 assert.equal(detail.hidden,true);assert.match(node('family').text(),/还款 8 \/ 16/);assert.match(node('fund').text(),/放贷 0 \/ 8/);assert.match(node('bakery').text(),/开工 1 \/ 3/);
 assert.deepEqual(desk.all().filter(n=>n.className==='mortgage-route-edge').map(n=>n.dataset.flow),['paid','blocked']);
 click('trace-fund');assert.equal(detail.hidden,false);assert.equal(node('fund').attrs['aria-expanded'],'true');assert.match(detail.text(),/资本不足/);assert.match(detail.text(),/-6 \/ 8枚/);
 click('trace-bakery');assert.equal(node('fund').attrs['aria-expanded'],'false');assert.equal(node('bakery').attrs['aria-expanded'],'true');assert.match(detail.text(),/实际工资合计\s+4枚/);
 click('trace-bakery');assert.equal(detail.hidden,true);assert.equal(node('bakery').attrs['aria-expanded'],'false');
 assert.equal(desk.all().filter(n=>n.className==='mortgage-chef').length,3);assert.equal(desk.all().filter(n=>n.textContent==='没排上班').length,2);
});
test('one-factor comparisons retain the other conditions; no rescue transfers accumulate across replays',()=>{
 const {desk,click}=uiFixture();click('buy');click('10');click('income');click('none');click('change-capital');
 let compare=desk.all().find(n=>n.className==='mortgage-comparison');assert.match(compare.text(),/只换了机构出资/);assert.match(compare.text(),/实际开工\s+1 → 3人/);assert.match(compare.text(),/失去房屋\s+4 → 4户/);assert.match(desk.text(),/家庭收入2枚/);
 click('change-income');compare=desk.all().find(n=>n.className==='mortgage-comparison');assert.match(compare.text(),/只换了家庭收入/);assert.match(compare.text(),/失去房屋\s+4 → 0户/);assert.match(desk.text(),/机构垫30枚/);
 click('change-rollover');assert.match(desk.querySelector('[data-mortgage-action="trace-bakery"]').text(),/开工 1 \/ 3/);
 click('trace-fund');assert.match(desk.all().find(n=>n.className==='mortgage-route-detail').text(),/先还到期款/);
 click('liquidity');compare=desk.all().find(n=>n.className==='mortgage-comparison');assert.match(compare.text(),/实际开工\s+1 → 3人/);assert.match(compare.text(),/公共账户付出\s+0 → 20枚/);
 click('liquidity');compare=desk.all().find(n=>n.className==='mortgage-comparison');assert.match(compare.text(),/公共账户付出\s+0 → 20枚/,'unchanged choice must not fabricate another one-factor change');
 click('restart');assert.equal(desk.dataset.page,'0');assert(!desk.all().find(n=>n.className==='mortgage-comparison'));click('buy');click('10');click('stable');click('none');assert.match(desk.querySelector('[data-mortgage-action="trace-bakery"]').text(),/开工 3 \/ 3/);
 const css=readFileSync(new URL('../app/trust-stage.css',import.meta.url),'utf8');assert.match(css,/@media\(prefers-reduced-motion:reduce\)\s*{\s*\.mortgage-travel-coin\s*{\s*animation:none/);
});
test('a successful no-aid case is a genuine counterexample, not narrated as a hidden rescue',()=>{
 const {desk,click}=uiFixture();click('buy');click('10');click('price');click('none');
 assert.match(desk.text(),/房价跌了，这条资金链仍接得上/);assert.doesNotMatch(desk.text(),/谁付了代价/);
 click('trace-family');assert.match(desk.all().find(n=>n.className==='mortgage-route-detail').text(),/本期还款合计\s+16枚/);
 click('change-rollover');click('liquidity');assert.match(desk.text(),/公共账户付出了什么/);
});
