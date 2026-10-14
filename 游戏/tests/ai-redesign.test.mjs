import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../lib/ai-redesign.js',import.meta.url),'utf8');
const window={};vm.runInNewContext(source,{window});
const {day,permission,bridge}=window.AIRedesign;

test('one machine has distinct goals, real costs and no automatic extra buyers',()=>{
 const a=day('expand'),b=day('rest'),c=day('replace');
 assert.equal(a.stock,8);assert.equal(b.stock,0);assert.equal(c.stock,0);
 assert.equal(a.wages,b.wages);assert.equal(b.hours,2);assert.equal(c.wages,6);assert.equal(c.working,2);
 for(const r of [a,b,c]){
  const wallets={firm:60,buyers:24,workers:0,supplier:0};
  for(const e of r.entries){assert(wallets[e.from]>=e.amount);wallets[e.from]-=e.amount;wallets[e.to]+=e.amount;}
  assert.equal(JSON.stringify(wallets),JSON.stringify(r.accounts));assert.equal(Object.values(wallets).reduce((a,b)=>a+b),84);
  assert.equal(r.sold+r.stock,r.output);
 }
 assert.equal(day('magic'),null);
});

test('proposal, signature and real approval are separate rights',()=>{
 assert.equal(permission('owner','chef',false),'pending');assert.equal(permission('owner','owner',false),'apply');
 assert.equal(permission('joint','owner',false),'needs-crew');assert.equal(permission('joint','chef',false),'sign');
 assert.equal(permission('joint','owner',true),'apply');assert.equal(permission('public','owner',true),null);
});

test('all transition conditions conserve funded wallets and record only real unmet spending',()=>{
 for(const goal of ['expand','rest','replace'])for(const adopt of [0,2])for(const start of [0,2])for(const reserve of [0,6,12]){
  const plan={goal,adopt,start,reserve},before=JSON.stringify(plan),r=bridge(plan),wallets={firm:60,fund:0,supplier:0,shop:0,workers:[3,3,3,3]};
  const get=k=>typeof k==='number'?wallets.workers[k]:wallets[k];
  for(const e of r.entries){assert(Number.isInteger(e.amount)&&e.amount>0);assert(get(e.from)>=e.amount);if(typeof e.from==='number')wallets.workers[e.from]-=e.amount;else wallets[e.from]-=e.amount;if(typeof e.to==='number')wallets.workers[e.to]+=e.amount;else wallets[e.to]+=e.amount;}
  assert.equal(JSON.stringify(wallets),JSON.stringify(r.accounts));assert.equal(r.total,72);
  assert.equal(r.gap,r.days.flatMap(d=>d.people).reduce((s,p)=>s+3-p.spent,0));
  assert.equal(JSON.stringify(plan),before);assert.equal(JSON.stringify(bridge(plan)),JSON.stringify(r));
  for(const d of r.days)for(const p of d.people){assert(p.wage+p.support<=3);assert(p.gap>=0);assert(p.balance>=0);}
 }
 assert.equal(bridge({goal:'replace',adopt:0,start:1,reserve:12}),null);
});

test('timely funded protection and deferred adoption can avoid a gap; funding alone is not enough',()=>{
 const plan={goal:'replace',adopt:0,start:2,reserve:12},late=bridge(plan),timely=bridge({...plan,start:0}),deferred=bridge({...plan,adopt:2});
 assert.equal(late.gap,6);assert.equal(timely.gap,0);assert.equal(deferred.gap,0);
 assert.equal(bridge({...plan,start:0,reserve:0}).gap,12);
 assert.equal(bridge({...plan,goal:'rest',reserve:0}).gap,0);
 assert.equal(late.accounts.fund,6);assert.equal(timely.accounts.fund,0);
});

test('UI does not enact a chef proposal, requires both signatures, and clears changed transition results',()=>{
 class Node{
  constructor(tag){this.tag=tag;this.children=[];this.words='';this.attrs={};this.dataset={};}
  set textContent(v){this.words=v;this.children=[];}get textContent(){return this.words+this.children.map(n=>n.textContent).join('');}
  appendChild(n){this.children.push(n);return n;}replaceChildren(){this.children=[];this.words='';}
  setAttribute(k,v){this.attrs[k]=v;}focus(){}all(){return [this,...this.children.flatMap(n=>n.all())];}
  querySelectorAll(s){return this.all().filter(n=>n.tag===s);}querySelector(s){return this.querySelectorAll(s)[0];}
 }
 const w={StreetArt:{decorateMoney(){}}};vm.runInNewContext(source,{window:w,document:{createElement:t=>new Node(t)}});
 const desk=w.AIRedesign.mount(new Node('div')),click=text=>{const b=desk.all().find(n=>n.tag==='button'&&n.textContent===text);assert(b,text);b.onclick();};
 assert.equal(desk.dataset.step,'0');assert(!desk.all().some(n=>n.dataset.testid==='redesign-goal-result'));
 click('试一天 →');click('安排是谁定的？ →');click('提交安排 →');assert.equal(desk.dataset.goal,'expand');assert(desk.textContent.includes('意见交上去了'));
 click('共同审批');click('我是老板');click('确认安排 →');assert.equal(desk.dataset.goal,'expand');assert(desk.textContent.includes('还缺厨师'));
 click('我是厨师');click('少排两个人');click('提交安排 →');click('我是老板');click('确认安排 →');assert.equal(desk.dataset.goal,'replace');
 click('照现有安排，往后看 →');assert.equal(desk.all().filter(n=>n.dataset.testid==='redesign-person').length,0);
 click('看到支持能到账的那天 →');assert.equal(desk.all().filter(n=>n.dataset.testid==='redesign-person').length,12);assert(desk.textContent.includes('收入先断了'));
 click('支持明天到账');assert.equal(desk.all().filter(n=>n.dataset.testid==='redesign-person').length,0);
 click('看到支持能到账的那天 →');assert(desk.textContent.includes('收入和生活接上了'));assert(!desk.textContent.includes('收入先断了'));
});
