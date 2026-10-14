import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/hidden-work.js',import.meta.url),'utf8'),{window});
const calc=window.HiddenWork.calculate;
test('fast incomplete output is not counted as completed work',()=>{
 const a=calc(['auto','auto','auto']);assert.equal(a.total,3);assert.equal(a.ready,1);assert.equal(a.pending,2);assert.equal(a.human,0);
});
test('actual review labour appears; complete assistance can still save time',()=>{
 const a=calc(['auto','review','review']);assert.equal(a.total,10);assert.equal(a.ready,3);assert.equal(a.human,7);assert.equal(a.baseline,12);
 assert.equal(a.rows[2].human+a.rows[2].machine,5,'this task takes longer with assistance');
 const b=calc(['auto','manual','manual']);assert.equal(b.total,9);assert.equal(b.ready,3);
});
test('every task combination is pure, finite and conserves allocated time',()=>{
 for(const a of ['auto','manual','review'])for(const b of ['auto','manual','review'])for(const c of ['auto','manual','review']){const p=[a,b,c],before=JSON.stringify(p),r=calc(p);assert.equal(r.total,r.machine+r.human);assert.equal(r.ready+r.pending,3);assert.equal(JSON.stringify(p),before);assert(r.total>=0&&Number.isInteger(r.total));}
 for(const p of [null,[],['auto','auto'],['auto','auto','magic']])assert.equal(calc(p),null);
});
test('a future slogan cannot turn incomplete outputs into an achieved time saving',()=>{
 const a=window.HiddenWork.audit(['auto','auto','auto']);assert.equal(a.ready,1);assert.equal(a.comparable,false);assert.equal(a.savedMinutes,null);
 for(const key of ['wages','schedule'])assert.equal(a[key],'not-measured');assert.equal(a.generalIntelligence,'not-tested');assert.equal(a.future,'not-verified');
});
test('complete assistance reports real toy savings without inferring wages, leisure or AGI',()=>{
 const a=window.HiddenWork.audit(['auto','review','review']);assert.equal(a.savedMinutes,2);assert.equal(a.comparable,true);assert.equal(a.total,10);
 assert.equal(window.HiddenWork.audit(['auto','manual','manual']).savedMinutes,3);assert.equal(window.HiddenWork.audit(['manual','manual','manual']).savedMinutes,0);assert.equal(window.HiddenWork.audit(null),null);
 assert.equal(a.schedule,'not-measured');assert.equal(a.generalIntelligence,'not-tested');
});
test('all audits use the same completed standard and never mutate task choices',()=>{
 for(const a of ['auto','manual','review'])for(const b of ['auto','manual','review'])for(const c of ['auto','manual','review']){const plan=[a,b,c],before=JSON.stringify(plan),r=calc(plan),audit=window.HiddenWork.audit(plan);assert.equal(JSON.stringify(plan),before);assert.equal(audit.comparable,r.ready===3);assert.equal(audit.savedMinutes,r.ready===3?r.baseline-r.total:null);assert.equal(audit.future,'not-verified');}
});

test('optional wage comparisons use the same delivery and conserve actual wallets',()=>{
 for(const a of ['auto','manual','review'])for(const b of ['auto','manual','review'])for(const c of ['auto','manual','review']){
  const plan=[a,b,c],before=JSON.stringify(plan),time=calc(plan);
  for(const rule of ['all','original']){
   const bill=window.HiddenWork.settle(plan,rule);
   assert.equal(bill.blocked,!!time.pending);
   if(time.pending){assert.equal(bill.accounts,undefined);continue;}
   assert.equal(bill.human,time.human);assert.equal(bill.total,time.total);
   assert.equal(bill.paidMinutes+bill.unpaidMinutes,time.human);
   const wallets={firm:20,customer:18,staff:0,system:0};
   for(const e of bill.entries){assert(Number.isInteger(e.amount)&&e.amount>0);assert(wallets[e.from]>=e.amount);wallets[e.from]-=e.amount;wallets[e.to]+=e.amount;}
   assert.equal(JSON.stringify(wallets),JSON.stringify(bill.accounts));
   assert.equal(Object.values(wallets).reduce((n,v)=>n+v,0),38);
   assert.equal(JSON.stringify(window.HiddenWork.settle(plan,rule)),JSON.stringify(bill),'retries recompute, never charge twice');
  }
  assert.equal(JSON.stringify(plan),before);
 }
 const paid=window.HiddenWork.settle(['auto','review','review'],'all'),omitted=window.HiddenWork.settle(['auto','review','review'],'original');
 assert.equal(paid.wages,7);assert.equal(omitted.wages,0);assert.equal(omitted.unpaidMinutes,7);
 assert.equal(paid.total,omitted.total);assert.equal(paid.ready,omitted.ready);
});

test('the audit adds one consequence, not a second copy of the visible time and delivery figures',()=>{
 const source=fs.readFileSync(new URL('../lib/hidden-work.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/这批3笔全部交付，用了|这批只交付|这张时间单，还不能|改记账口径，再结算同一批/);
 assert.match(source,/还没做完，不能算省时/);
 assert.match(source,/本批 '\+a.total\+' 分钟 · 全人工/);
 assert.match(source,/核对后才能交付/);
 assert.match(source,/假想合同：每分钟人工1枚/);
 assert.match(source,/文稿线索与研究/);
});

test('task UI separates promises, completed work and explicit wage payments',()=>{
 class Node{
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.words='';this.isConnected=true;}
  set textContent(v){this.words=v;this.children=[];}
  get textContent(){return this.words+this.children.map(n=>n.textContent).join('');}
  appendChild(n){n.parent=this;this.children.push(n);return n;}
  replaceChildren(){this.children.forEach(n=>n.isConnected=false);this.children=[];this.words='';}
  setAttribute(k,v){this.attrs[k]=v;}
  focus(){this.focused=true;}
  all(){return [this,...this.children.flatMap(n=>n.all())];}
  closest(){let n=this;while(n&&!n.dataset.task)n=n.parent;return n;}
  querySelectorAll(selector){return this.all().slice(1).filter(n=>selector==='button'?n.tag==='button':selector.startsWith('.')?n.className===selector.slice(1):false);}
  querySelector(selector){const task=selector.match(/^\[data-task="(.+)"\] button$/);if(task)return this.all().find(n=>n.dataset.task===task[1])?.querySelectorAll('button')[0];return this.querySelectorAll(selector)[0]||null;}
 }
 const root={StreetArt:{decorateMoney(){}},ResearchReader:{mount(parent,text,options){parent.topics=options.topics;}}};
 vm.runInNewContext(fs.readFileSync(new URL('../lib/hidden-work.js',import.meta.url),'utf8'),{window:root,document:{createElement:t=>new Node(t)}});
 const desk=root.HiddenWork.mount(new Node('div'));
 const find=id=>desk.all().find(n=>n.dataset.testid===id);
 const click=label=>{const b=desk.all().find(n=>n.tag==='button'&&n.textContent===label);assert(b,label);b.onclick();};
 assert.equal(find('hidden-work-pay'),undefined);assert.equal(find('promise-audit'),undefined);
 click('这批全交给系统');click('验收今天这批');
 assert.equal(find('promise-audit').dataset.comparable,'false');assert.equal(find('hidden-work-pay'),undefined);
 click('请人收尾');assert.equal(find('promise-audit'),undefined,'changed tasks invalidate the old audit');
 click('验收今天这批');assert.equal(find('hidden-work-pay-result'),undefined,'audit is not a payment');
 assert.equal(find('hidden-work-pay').parent,desk,'checking pay does not require opening an advertisement');
 click('照这张工时单结算 →');assert.equal(find('hidden-work-pay-result').dataset.wages,'7');assert.equal(find('hidden-work-pay-result').dataset.unpaid,'0');
 click('只记原岗位');assert.equal(find('hidden-work-pay-result'),undefined,'new accounting does not show a stale payment');
 click('照这张工时单结算 →');assert.equal(find('hidden-work-pay-result').dataset.wages,'0');assert.equal(find('hidden-work-pay-result').dataset.unpaid,'7');
 assert.equal(desk.dataset.minutes,'10');assert.equal(desk.dataset.ready,'3');
 const future=desk.all().find(n=>n.className==='hidden-work-promise');future.open=true;
 click('宣传再大胆一点');assert.equal(find('hidden-work-pay-result').dataset.wages,'0');assert.equal(desk.dataset.minutes,'10');
 assert.equal(desk.all().find(n=>n.className==='hidden-work-promise').open,true);
 click('只自动处理重复订单');assert.equal(find('promise-audit'),undefined);assert.equal(find('hidden-work-pay-result'),undefined);
 click('验收今天这批');click('照这张工时单结算 →');assert.equal(find('hidden-work-pay-result').dataset.wages,'8','actual manual work is still paid');
 click('只自动处理重复订单');assert.equal(find('hidden-work-pay-result').dataset.wages,'8','an unchanged plan does not erase the current payment');
});
