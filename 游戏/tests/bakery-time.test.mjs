import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/bakery-time.js',import.meta.url),'utf8'),{window});
test('the identical new oven can produce more or meet the old order in less time',()=>{
 const more=window.BakeryTime.calculate('more'),rest=window.BakeryTime.calculate('rest');
 assert.equal(more.loaves,12);assert.equal(more.hours,6);assert.equal(rest.loaves,8);assert.equal(rest.hours,4);
 assert.equal(more.loaves/more.hours,rest.loaves/rest.hours);assert.equal(rest.savedHours,2);
 for(const a of [more,rest]){assert.equal(a.baselineLoaves,8);assert.equal(a.baselineHours,6);assert(!('sales' in a));assert(!('profit' in a));assert(!('wage' in a));}
});
test('invalid plans do not create invented money or production',()=>{
 for(const p of [null,undefined,0,'','magic'])assert.equal(window.BakeryTime.calculate(p),null);
 const source=fs.readFileSync(new URL('../lib/bakery-time.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/localStorage|postMessage|fetch\(/);
 const runtime=fs.readFileSync(new URL('../lib/trust-stage.js',import.meta.url),'utf8');
});

test('the prologue omits the extra oven-time panel and asks about buying more ovens',()=>{
 const runtime=fs.readFileSync(new URL('../lib/trust-stage.js',import.meta.url),'utf8');
 const document=fs.readFileSync(new URL('../lib/trust-document.ts',import.meta.url),'utf8');
 assert.doesNotMatch(runtime,/BakeryTime\.mount|data-testid="bakery-time"/);
 assert.doesNotMatch(document,/bakery-time\.js\?raw|script\(bakeryTime\)/);
 assert.match(runtime,/action\('若是再买些烤炉呢 →','OPEN_BAKERY_EXPANSION'/);
 assert.doesNotMatch(runtime,/action\('再买些烤炉 →'/);
});

test('the optional tomorrow experiment is folded; its payment rule precedes the choice',()=>{
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.style={setProperty(){}};}
  appendChild(n){this.children.push(n);return n;}
  setAttribute(k,v){this.attrs[k]=v;}
  replaceChildren(){this.children=[];}
 }
 const root={};vm.runInNewContext(fs.readFileSync(new URL('../lib/bakery-time.js',import.meta.url),'utf8'),{window:root,document:{createElement:t=>new Element(t)}});
 const parent=new Element('div'),desk=root.BakeryTime.mount(parent,{bread:'bread.svg'},5);
 assert.equal(desk.tag,'details');assert.notEqual(desk.open,true);
 assert.equal(desk.children[0].tag,'summary');
 assert.match(desk.children[1].textContent,/都照发/,'equal pay is a decision condition, not an afterthought');
 const actions=desk.children.find(n=>n.className==='bakery-time-actions');
 actions.children[0].onclick();
 const result=desk.children.find(n=>n.className==='bakery-time-result');
 assert.equal(result.children.find(n=>n.className==='bakery-time-status').textContent,'12个面包 · 6小时');
 assert.equal(result.children.find(n=>n.className==='bakery-time-voice').textContent,'面包多了，客人呢？');
 assert(desk.children.some(n=>n.className==='street-bounds'),'full conditions remain available');
});
