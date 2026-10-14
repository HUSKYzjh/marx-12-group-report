import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createStreetStory,streetReducer} from '../lib/street-game.ts';

class Node {
 constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.textContent='';}
 appendChild(n){this.children.push(n);return n;}
 setAttribute(k,v){this.attrs[k]=v;}
 querySelectorAll(s){const all=this.children.flatMap(n=>[n,...n.querySelectorAll('*')]);return s==='*'?all:all.filter(n=>s==='[data-street-action]'?n.dataset.streetAction:s==='[data-street-action="ROUND"]'?n.dataset.streetAction==='ROUND':false);}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 text(){return [this.textContent,...this.children.map(n=>n.text())].filter(Boolean).join(' ');}
}
const scope={window:{},document:{createElement:t=>new Node(t)},StreetArt:{decorateMoney(){}},StreetPresentation:{change:r=>r.cashChange},StreetLedger:{names:{}}};
vm.runInNewContext(readFileSync(new URL('../lib/street-ui.js',import.meta.url),'utf8'),scope);
function render(game){const c={game,readout:new Node(),controls:new Node(),notes:new Node(),notesContent:new Node(),scene:{inspector:{open(){}},toggle(){},finish(){}},send(){},title(a,b){this.caption=b;},ending(){}};scope.window.renderStreetUI(c);if(c.scene.onChange)c.scene.onChange({complete:true});return c;}
const run=g=>streetReducer(g,{type:'ROUND',expectedRound:g.world.round});

test('current third act displays the requested production-and-exchange copy above both relationship diagrams',()=>{
 const frame={frame:{x:0,y:0,w:120,h:140}},atlas={frames:{body0000:frame,face0000:frame,hatguy0000:frame},meta:{size:{w:120,h:140}}};
 let mounted=0;const root={OwnershipPermissions:{mount(){mounted++;}}},s={window:root,document:{createElement:t=>new Node(t),createElementNS:(_,t)=>new Node(t)},StreetArt:{decorateMoney(){}},TRUST_ASSETS:{bakery:{bodyAtlas:atlas,faceAtlas:atlas,hatAtlas:atlas},street:{}}};
 vm.runInNewContext(readFileSync(new URL('../lib/weber-perspective.js',import.meta.url),'utf8'),s);
 vm.runInNewContext(readFileSync(new URL('../lib/value-journey.js',import.meta.url),'utf8'),s);
 vm.runInNewContext(readFileSync(new URL('../lib/street-summary.js',import.meta.url),'utf8'),s);
 const c={readout:new Node(),controls:new Node(),title(){},send(){}};root.renderStreetSummary(c);
 const gains=c.readout.children.find(n=>n.className==='street-summary-gains'),panels=c.readout.children.find(n=>n.className==='street-summary-panels');
 assert(gains);assert.equal(gains.tag,'p');assert.equal(gains.children[0].tag,'strong');assert.equal(gains.text(),'劳动分工提高生产效率，市场竞争推动改进，自由贸易扩大交换范围');assert(c.readout.children.indexOf(gains)<c.readout.children.indexOf(panels));assert.equal(panels.children.length,2);assert.match(c.readout.text(),/生产社会化.*生产资料的资本主义私人占有/);
 for(const panel of panels.children){assert.equal(panel.children[0].tag,'h2');assert.equal(panel.children[1].tag,'svg','name the concept before showing its picture');}
 const extra=c.readout.children.find(n=>n.className==='scene-supplement');assert(extra);assert.equal(extra.tag,'details');assert.notEqual(extra.open,true);assert.equal(extra.children[0].textContent,'再想一步：小实验与说明');
 assert.equal(panels.children[1].children.length,3,'both concept cards contain only a heading, diagram and caption');
 for(const panel of panels.children)assert(panel.children[2].text().length<=20,'diagram captions should not narrate the whole drawing');
 assert.match(c.readout.text(),/按现价卖不掉，不是人人都吃够/);
 assert.match(c.readout.text(),/一次剩货不能证明全面危机/,'shortening visible copy must not erase model boundaries');
 const entry=extra.children.find(n=>n.className==='ownership-permission-entry');assert(entry);assert.equal(mounted,0);entry.open=true;entry.ontoggle();assert.equal(mounted,1);entry.open=false;entry.ontoggle();entry.open=true;entry.ontoggle();assert.equal(mounted,1,'reading twice must not reset or duplicate the experiment');
 assert.equal(extra.children.filter(n=>n.tag==='details').length,4,'experiments, perspective and conditions remain available in one optional desk');
});

test('guided copy shows three metrics, no duplicate totals, cost paragraphs or repeated tutorial',()=>{
 let g=createStreetStory();assert.match(render(g).readout.text(),/点店看账/);
 g=run(g);let c=render(g);assert.match(c.readout.text(),/出炉.*卖出.*库存/);assert.doesNotMatch(c.readout.text(),/全街做|保管花|点店看账|老板：“钱多了/);
 g=streetReducer(g,{type:'STORY_EXPAND'});c=render(g);assert.equal(c.readout.children.filter(n=>n.tag==='p').length,0);assert.doesNotMatch(c.readout.text(),/3台炉|枚付给/);
 // A genuine error after a management receipt must still be visible.
 c=render({...g,message:'买炉后还要留三轮工资。这笔钱暂时不够。'});assert.match(c.readout.text(),/这笔钱暂时不够/);
});
test('end explanation keeps concepts and bounds, not the model manual',()=>{
 const g=run(createStreetStory());for(const phase of ['social','private','overproduction','limits']){const c=render({...g,phase}),text=c.readout.text();assert(text.length<220);assert.equal(c.notesContent.children.length,0);assert.doesNotMatch(text,/模型参数|75%|购物规则|人口与招聘|旧存档/);}
 const limits=render({...g,phase:'limits'}).readout.text();assert.match(limits,/生产社会化.*私人占有/);assert.match(limits,/政府、信贷和国外市场/);assert.match(limits,/一次剩货不等于全面危机/);assert.match(limits,/不能直接代指社会主义国家/);
 const bounds=render({...g,phase:'limits'}).readout.children.find(n=>n.tag==='details');assert(bounds);assert.equal(bounds.children[0].textContent,'实验边界');assert.notEqual(bounds.open,true);
});
test('layoff confirmation retains the payment and production tradeoff',()=>{
 const g={...run(createStreetStory()),phase:'manage',story:{...createStreetStory().story,beat:'layoff'},layoffPreview:true};const c=render(g);assert.match(c.controls.text(),/安置款 5枚.*少付5枚工资.*少做6个面包/);
});
test('visible wage and price labels stay short, accessible names retain units',()=>{
 const g={...run(createStreetStory()),phase:'manage',story:{...createStreetStory().story,beat:'adjust'}};const c=render(g);
 const knobs=c.controls.children.find(n=>n.className==='street-knobs');assert.deepEqual(knobs.children.map(n=>n.children[0].textContent),['工资','售价']);
 assert.match(c.controls.querySelectorAll('[data-street-action]').find(n=>n.dataset.streetAction==='WAGE').attrs['aria-label'],/每人每轮工资/);
});
