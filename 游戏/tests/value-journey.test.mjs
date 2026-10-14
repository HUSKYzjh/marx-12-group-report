import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../lib/value-journey.js',import.meta.url),'utf8');
const window={};vm.runInNewContext(source,{window});
const j=window.ValueJourney,base={machine:'old',orders:6,price:3,plan:'keep',pace:'normal'};
test('same useful new oven allows both a loss and successful sale without forced crisis',()=>{
 const old=j.bakery(base),thin=j.bakery({...base,machine:'new'}),full=j.bakery({...base,machine:'new',orders:12});
 assert.equal(old.output,6);assert.equal(old.profit,5);assert.equal(thin.output,12);assert.equal(thin.sold,6);assert.equal(thin.unsold,6);assert.equal(thin.profit,-2);
 assert.equal(full.output,thin.output);assert.equal(full.sold,12);assert.equal(full.profit,16);assert(full.cashChange!==full.profit);
 assert.equal(thin.machinePurchase,12);assert.equal(thin.depreciation,2);assert.equal(thin.machineBook,10);
 assert.equal(thin.accounts.firm+thin.machineBook-72,thin.profit,'cash plus remaining machine reconciles profit when unsold stock is written off');
});
test('time, staffing, wages, pace and machine efficiency remain separate',()=>{
 const fast={...base,machine:'new'},keep=j.bakery(fast),rest=j.bakery({...fast,plan:'rest'}),cut=j.bakery({...fast,plan:'cut'}),expand=j.bakery({...fast,plan:'expand'}),hurry=j.bakery({...fast,pace:'hurry'});
 assert.equal(rest.output,6);assert.equal(rest.wages,keep.wages);assert.equal(rest.workers,2);assert.equal(rest.hours,3);
 assert.equal(cut.workers,1);assert.equal(cut.wages,3);assert.equal(cut.output,6);
 assert.equal(expand.workers,4);assert.equal(expand.output,24);assert.equal(expand.ovens,2);assert.equal(expand.wages,12);
 assert.equal(hurry.hours,keep.hours);assert.equal(hurry.machine,keep.machine);assert(hurry.output>keep.output);
});
test('all selectable bakery conditions conserve funded integer money and do not value unsold goods as receipts',()=>{
 for(const machine of ['old','new'])for(const plan of machine==='old'?['keep']:['keep','rest','cut','expand'])for(const orders of [6,12,24])for(const price of [2,3])for(const pace of ['normal','hurry']){
  const a=j.bakery({machine,plan,orders,price,pace});assert.equal(a.moneyTotal,144);
  assert(Object.values(a.accounts).every(n=>Number.isInteger(n)&&n>=0));assert.equal(a.revenue,a.sold*price);assert.equal(a.sold+a.unsold,a.output);
  assert.equal(a.advance,a.machinePurchase+a.materials+a.wages);assert.equal(a.profit,a.revenue-a.materials-a.wages-a.depreciation);
  const accounts={firm:72,buyers:72,workers:0,supplier:0,machineMaker:0};for(const e of a.entries){assert(accounts[e.from]>=e.amount);accounts[e.from]-=e.amount;accounts[e.to]+=e.amount;}assert.deepEqual(accounts,{...a.accounts});
 }
});
test('AI capability is independent of fee and payment gates actual access',()=>{
 const original=j.service({tasks:5,price:1}),improved=j.service({tasks:10,price:1}),blocked=j.service({tasks:10,price:4});
 assert.equal(original.minutes,35);assert.equal(improved.minutes,20);assert.equal(improved.verification,10);assert.equal(improved.accounts.provider,1);
 assert.equal(blocked.assisted,0);assert.equal(blocked.minutes,50);assert.equal(blocked.accounts.provider,0);assert.equal(blocked.tasks,improved.tasks);
 for(const a of [original,improved,blocked])assert.equal(Object.values(a.accounts).reduce((s,n)=>s+n,0),2);
});
test('resale expectation is not a network improvement or money creation',()=>{
 const win=j.resale({offer:12,network:'same'}),lose=j.resale({offer:8,network:'improved'});
 assert.equal(win.profit,18);assert.equal(lose.profit,-22);assert.equal(win.accounts.nextBuyer,40);assert.equal(lose.accounts.nextBuyer,80);
 for(const a of [win,lose]){assert.equal(a.moneyTotal,260);assert.equal(a.fee,2);assert.equal(Object.values(a.accounts).reduce((s,n)=>s+n,0),260);assert.equal(Object.values(a.holdings).reduce((s,n)=>s+n,0),10);assert.equal(a.holdings.trader,0);}
 assert.equal(j.resale({offer:8,network:'same'}).profit,lose.profit);
});

test('payment transfers existing tokens and goods; speed does not create purchasing power',()=>{
 for(const network of ['same','improved'])for(const accepts of [true,false])for(const step of [0,1,2]){
  const input={network,accepts,step},before=JSON.stringify(input),a=j.payment(input);
  assert.equal(JSON.stringify(input),before);assert.equal(Object.values(a.accounts).reduce((s,n)=>s+n,0),2);
  for(const item of ['snack','dinner'])assert.equal(Object.values(a.goods).reduce((s,g)=>s+g[item],0),1);
  assert(Object.values(a.accounts).every(n=>Number.isInteger(n)&&n>=0));
  const wallets={guest:2,maker:0,bakery:0};for(const e of a.entries){assert(wallets[e.from]>=e.amount);wallets[e.from]-=e.amount;wallets[e.to]+=e.amount;}assert.deepEqual(wallets,{...a.accounts});
  assert.equal(a.goods.maker.dinner,Number(step===2&&accepts));assert.equal(a.blocked,step===2&&!accepts);
  const other=j.payment({...input,network:network==='same'?'improved':'same'});assert.deepEqual({...a.accounts},{...other.accounts});assert.equal(JSON.stringify(a.goods),JSON.stringify(other.goods));
 }
 const received=j.payment({network:'same',accepts:false,step:1}),refused=j.payment({network:'same',accepts:false,step:2});
 assert.equal(refused.stage,1);assert.equal(JSON.stringify(received.entries),JSON.stringify(refused.entries));assert.equal(refused.accounts.maker,2);assert.equal(refused.goods.bakery.dinner,1);
 for(const input of [null,{}, {network:'same',accepts:true,step:3},{network:'magic',accepts:true,step:1},{network:'same',accepts:1,step:0}])assert.equal(j.payment(input),null);
});
test('conditional value-rate arithmetic is separate from the cash model',()=>{
 assert.equal(j.valueRate(80,20,20).profitRate,.2);assert.equal(j.valueRate(180,20,20).profitRate,.1);assert.equal(j.valueRate(80,20,30).profitRate,.3);
 assert.equal(j.valueRate(80,20,20).surplusRate,1);assert.equal(j.valueRate(180,20,20).surplusRate,1);
 for(const a of [null,{}, {...base,machine:'magic'}, {...base,price:1}, {...base,plan:'rest'}])assert.equal(j.bakery(a),null);
 assert.equal(j.service({tasks:100,price:1}),null);assert.equal(j.resale({offer:100,network:'same'}),null);assert.equal(j.valueRate(1,0,1),null);
 assert.doesNotMatch(source,/localStorage|postMessage|fetch\(/);
});

class Node{
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.textContent='';this.style={setProperty(){}};}
 appendChild(n){this.children.push(n);return n;}
 replaceChildren(){this.children=[];}
 setAttribute(k,v){this.attrs[k]=v;}
 focus(){this.focused=true;}
 all(){return this.children.flatMap(n=>[n,...n.all()]);}
 querySelector(s){return this.all().find(n=>s==='h3'?n.tag==='h3':n.dataset.valueAction===s.match(/data-value-action="([^"]+)"/)?.[1]);}
 text(){return [this.textContent,...this.children.map(n=>n.text())].join(' ');}
}
function setup(start){const root={TRUST_ASSETS:{bakery:{bread:'bread',emptyOldOven:'old',newOven:'new'}}},scope={window:root,document:{createElement:t=>new Node(t),createTextNode:t=>Object.assign(new Node('#text'),{textContent:t})}};
 vm.runInNewContext(fs.readFileSync(new URL('../lib/research-reader.js',import.meta.url),'utf8'),scope);vm.runInNewContext(source,scope);
 const parent=new Node('main'),entry=root.ValueJourney.mount(parent,start);return {root,parent,entry};
}
test('single lazy entry renders one experiment at a time and reading twice keeps local choices',()=>{
 const {entry}=setup();assert.equal(entry.children.length,1);assert(!entry.open);entry.open=true;entry.ontoggle();const desk=entry.children[1];assert.equal(desk.dataset.page,'0');assert.doesNotMatch(desk.text(),/原料燃料每个|比特币网络、持有/);
 desk.querySelector('[data-value-action="swap"]').onclick();desk.querySelector('[data-value-action="swap"]').onclick();assert.match(desk.text(),/换来晚饭/);
 desk.querySelector('[data-value-action="next"]').onclick();assert.equal(desk.dataset.page,'1');desk.querySelector('[data-value-action="new"]').onclick();desk.querySelector('[data-value-action="run"]').onclick();assert.match(desk.text(),/利润\s+-2枚/);
 assert.match(desk.text(),/为卖而买：M—C … 生产 … C′—M₁/);
 const setupCard=desk.all().find(n=>n.className==='value-notes value-setup');assert.equal(setupCard.tag,'details');assert(!setupCard.open,'settlement focuses results rather than leaving all strategy controls expanded');
 assert.doesNotMatch(desk.text(),/这批结算了。想换个条件|先看机器能做什么/);
 assert(desk.all().filter(n=>n.className==='value-result'||n.className==='value-caption').every(n=>n.text().length<45),'feedback remains short while the detailed conditions stay optional');
 entry.open=false;entry.ontoggle();entry.open=true;entry.ontoggle();assert.equal(entry.children.length,2);assert.match(desk.text(),/利润\s+-2枚/);
 desk.querySelector('[data-value-action="next"]').onclick();assert.equal(desk.dataset.page,'2');desk.querySelector('[data-value-action="4"]').onclick();assert.doesNotMatch(desk.text(),/付不起/);desk.querySelector('[data-value-action="ai-run"]').onclick();assert.match(desk.text(),/付不起/);
 desk.querySelector('[data-value-action="next"]').onclick();assert.equal(desk.dataset.page,'3');assert(!desk.querySelector('[data-value-action="settle"]'));
 desk.querySelector('[data-value-action="resell"]').onclick();assert.doesNotMatch(desk.text(),/最终现金/);desk.querySelector('[data-value-action="settle"]').onclick();assert.match(desk.text(),/最终现金\s+118枚/);
});
test('AI callback starts on the relevant technology and folded concepts use the real reader',()=>{
 const {entry}=setup('ai');entry.open=true;entry.ontoggle();const desk=entry.children[1];assert.equal(desk.dataset.page,'2');
 const notes=desk.all().find(n=>n.className==='value-notes'&&n.children[0].textContent==='条件、概念与出处');assert.equal(notes.children.length,1);notes.open=true;notes.ontoggle();assert(notes.all().some(n=>n.className==='research-reader'));
 assert.equal(notes.all().filter(n=>n.className==='research-paragraph').length,1);assert.match(notes.text(),/假想服务/);
 const doc=fs.readFileSync(new URL('../lib/trust-document.ts',import.meta.url),'utf8');assert.match(doc,/script\(valueJourney\)/);
 assert.match(fs.readFileSync(new URL('../lib/street-summary.js',import.meta.url),'utf8'),/ValueJourney\.mount\(extra\)/);
 assert.match(fs.readFileSync(new URL('../lib/technology-ui.js',import.meta.url),'utf8'),/phase==='conclusion'\)root.ValueJourney.mount\(conclusionExtras,'ai'\)/);
});

test('AI quote changes do not spend money or claim work; only explicit use creates a funded receipt',()=>{
 const {entry}=setup('ai');entry.open=true;entry.ontoggle();const desk=entry.children[1],click=id=>desk.querySelector('[data-value-action="'+id+'"]').onclick();
 const result=()=>desk.all().find(n=>n.dataset.testid==='value-ai-result');
 assert(!result());assert.match(desk.text(),/你的预算\s+2枚/);assert.doesNotMatch(desk.text(),/核对完成|本批服务使用权/);
 click('10');assert(!result());click('ai-run');assert.equal(result().dataset.assisted,'10');assert.match(result().text(),/用了20分钟/);
 assert.match(result().text(),/本批服务使用权：使用者 → 服务商 · 1枚/);assert.match(desk.text(),/你的余额\s+1枚.*服务商收到\s+1枚/);
 click('10');assert(result(),'clicking the same condition does not erase a real receipt');
 const receipt=result().text();click('ai-run');assert.equal(result().text(),receipt,'retries are independent, not repeated billing');
 click('4');assert(!result(),'old results must not masquerade as results at the new quoted price');assert.match(desk.text(),/你的预算\s+2枚/);
 click('ai-run');assert.equal(result().dataset.assisted,'0');assert.match(result().text(),/付不起，只能自己做：50分钟/);
 assert.match(desk.text(),/你的余额\s+2枚.*服务商收到\s+0枚/);assert.doesNotMatch(result().text(),/本批服务使用权：/);
 click('1');click('5');assert(!result());click('ai-run');assert.match(result().text(),/用了35分钟/);
 click('next');click('back');assert.match(result().text(),/用了35分钟/,'other pages do not silently clear the AI experiment');
 entry.open=false;entry.ontoggle();entry.open=true;entry.ontoggle();assert.match(result().text(),/用了35分钟/);
});

test('payment cards use funded entries and concepts appear only on request',()=>{
 for(const machine of ['old','new'])for(const plan of machine==='old'?['keep']:['keep','rest','cut','expand'])for(const orders of [6,12,24])for(const price of [2,3])for(const pace of ['normal','hurry']){
  const a=j.bakery({machine,plan,orders,price,pace}),s=j.spending(a);
  assert.equal(s.total,a.advance);assert.equal(s.means,a.machinePurchase+a.materials);assert.equal(s.labor,a.wages);
 }
 const {entry}=setup();entry.open=true;entry.ontoggle();const desk=entry.children[1];desk.querySelector('[data-value-action="next"]').onclick();
 const board=()=>desk.all().find(n=>n.className==='value-spending');assert.equal(board().attrs['aria-label'],'本批拟付款的用途');
 assert(!desk.all().some(n=>n.className==='value-spending-note'));
 desk.querySelector('[data-value-action="spending-means"]').onclick();assert.match(board().text(),/不变资本 c/);
 desk.querySelector('[data-value-action="spending-labor"]').onclick();assert.match(board().text(),/可变资本 v/);assert.doesNotMatch(board().text(),/不变资本 c/);
 desk.querySelector('[data-value-action="spending-labor"]').onclick();assert(!desk.all().some(n=>n.className==='value-spending-note'));
 desk.querySelector('[data-value-action="run"]').onclick();assert.equal(board().attrs['aria-label'],'本批实际付款的用途');
});

test('actual comparisons replace duplicate totals; a draft or identical rerun does not invent evidence',()=>{
 const {entry}=setup();entry.open=true;entry.ontoggle();const desk=entry.children[1],click=id=>desk.querySelector('[data-value-action="'+id+'"]').onclick();
 click('next');click('run');assert(!desk.all().some(n=>n.className==='value-comparison'));
 click('new');assert(!desk.all().some(n=>n.className==='value-receipt'));click('run');
 const table=()=>desk.all().find(n=>n.className==='value-comparison');assert.equal(table().children[0].dataset.changed,'machine');assert.match(table().text(),/5枚.*-2枚/);
 const receipt=()=>desk.all().find(n=>n.className==='value-receipt');
 assert(!receipt().children.some(n=>n.className==='value-facts'),'do not repeat current totals alongside the comparison');
 assert.equal(receipt().children.filter(n=>n.className==='value-result').length,1);
 assert(!receipt().children.some(n=>n.className==='value-formula'||n.className==='value-money-path'),'formal path stays in the optional account');
 const baseline=table().text();click('run');assert.equal(table().text(),baseline);
 click('12');assert(!table());click('run');assert.equal(table().children[0].dataset.changed,'orders');assert.match(table().text(),/-2枚.*16枚/);
 click('rest');click('3');click('hurry');click('run');assert.match(table().text(),/这次改变了2项条件/);
});

test('payment UI has a real refused trade and an explicit retry without confusing tokens with fiat',()=>{
 const {entry}=setup('ai');entry.open=true;entry.ontoggle();const desk=entry.children[1],click=id=>desk.querySelector('[data-value-action="'+id+'"]').onclick(),wallet=id=>desk.all().find(n=>n.dataset.wallet===id);
 click('next');click('pay');assert.equal(wallet('maker').dataset.tokens,'0');assert.equal(wallet('maker').dataset.snack,'1');
 click('pay-step');assert.equal(wallet('maker').dataset.tokens,'2');assert.equal(wallet('guest').dataset.snack,'1');
 click('refuse');click('pay-step');assert.match(desk.text(),/店家不收。币还在，晚饭没买到/);assert.equal(wallet('maker').dataset.tokens,'2');assert.equal(wallet('maker').dataset.dinner,'0');
 click('improved');assert.equal(wallet('maker').dataset.tokens,'2');assert.match(desk.text(),/付款等待：假设缩短/);assert.match(desk.text(),/晚饭没买到/);
 click('accept');click('pay-step');assert.equal(wallet('maker').dataset.tokens,'0');assert.equal(wallet('maker').dataset.dinner,'1');assert.equal(wallet('bakery').dataset.tokens,'2');assert(!desk.querySelector('[data-value-action="pay-step"]'));
 assert.equal(desk.all().filter(n=>n.className==='value-result').length,1);assert.doesNotMatch(desk.text(),/最终现金|转售收入/);
 click('resell');click('8');click('settle');assert.match(desk.text(),/最终现金\s+78枚/);assert.match(desk.text(),/付款功能改善了，转售却亏了/);
 click('pay');assert.equal(wallet('maker').dataset.dinner,'1','switching purpose does not erase a completed payment');
 click('pay-reset');assert.equal(wallet('maker').dataset.snack,'1');assert.equal(wallet('maker').dataset.dinner,'0');assert.equal(wallet('guest').dataset.tokens,'2');
});
