import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialPrologue} from '../lib/prologue-state.ts';
import {PROLOGUE_ASSUMPTIONS,PROLOGUE_MODEL_ASSUMPTIONS,PROLOGUE_REASONING} from '../lib/relief-experiment.ts';
import {ASSUMPTION_DIALOGUE} from '../lib/assumption-desk.ts';
import {assumptionRouteProgress} from '../lib/assumption-route-progress.ts';
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.dataset={};this.textContent='';}
 appendChild(n){this.children.push(n);return n;}
 replaceChildren(){this.children=[];}
 focus(){this.focused=true;}
 setAttribute(k,v){this.attrs[k]=v;}
 find(cls){return [...(this.className===cls?[this]:[]),...this.children.flatMap(n=>n.find(cls))];}
}
function render(selected=null,observations={}){
 const root={addEventListener(){}},atlas={frames:Object.fromEntries(['body0000','face0000','face0006'].map(k=>[k,{frame:{x:0,y:0}}])),meta:{size:{w:100,h:140}}},bindings=[];
 const context={window:root,document:{createElement:tag=>new Element(tag),createTextNode:text=>Object.assign(new Element('#text'),{textContent:text})},StreetArt:{decorateMoney(){}},TRUST_ASSETS:{bakery:{body:'body.png',face:'face.png',bodyAtlas:atlas,faceAtlas:atlas}},GestureBoard:{bind(n,c){bindings.push(c);}}};
 vm.runInNewContext(fs.readFileSync(new URL('../lib/research-reader.js',import.meta.url),'utf8'),context);
 vm.runInNewContext(fs.readFileSync(new URL('../lib/relief-ui.js',import.meta.url),'utf8'),context);
 const p=initialPrologue(),sent=[];p.assumptionDesk.selected=selected;p.assumptionDesk.beat=3;
 const c={state:{prologue:p,definition:'生产社会化与生产资料资本主义私人占有之间的矛盾。',assumptions:PROLOGUE_ASSUMPTIONS,modelAssumptions:PROLOGUE_MODEL_ASSUMPTIONS,assumptionReasoning:PROLOGUE_REASONING,assumptionDialogue:ASSUMPTION_DIALOGUE,assumptionParameters:'参数说明',assumptionProgress:assumptionRouteProgress(p),assumptionObservations:observations},readout:new Element('div'),controls:new Element('div'),notes:new Element('div'),title(){},send(a){sent.push(a);}};
 root.renderPrologueAssumptions(c);return {c,bindings,sent};
}
test('four concrete question cards lead to two hands-on routes per condition, never eight buttons at once',()=>{
 for(const group of PROLOGUE_ASSUMPTIONS){
  const {c,bindings,sent}=render(group.id);assert.equal(bindings[0].pieces.length,4);
  assert.deepEqual(Array.from(bindings[0].pieces,x=>x.name),PROLOGUE_ASSUMPTIONS.map(x=>x.label));
  const groups=c.readout.find('assumption-group');assert.equal(groups.filter(n=>!n.hidden).length,1);assert.equal(groups.find(n=>!n.hidden).dataset.assumption,group.id);
  const visible=groups.find(n=>!n.hidden).find('assumption-fork');assert.equal(visible.length,2);
  for(let i=0;i<2;i++){const b=visible[i],branch=group.ifs[i];assert.equal(b.attrs['aria-label'],branch.title+' →');assert.equal(b.find('assumption-fork-play')[0].textContent,branch.play);assert.equal(b.find('assumption-fork-play')[0].hidden,false);assert(branch.play.length<=18);assert.equal(b.dataset.progress,'new');assert.equal(b.find('assumption-fork-progress')[0].textContent,'动手试试 →');b.onclick();assert.equal(sent.at(-1).branch,branch.id);}
  const premise=groups.find(n=>!n.hidden).find('assumption-premise')[0];assert.equal(premise.children[0].textContent,'刚才实验的条件');assert.equal(premise.children[1].textContent,group.title);
  assert.equal(c.readout.find('assumption-model')[0].open,undefined,'all assumptions remain available but folded');
 }
});
test('empty desk gives the purpose of placement without sending a choice or inventing receipts',()=>{
 const {c,bindings}=render();assert.equal(c.readout.find('assumption-hint')[0].textContent,'把一张条件放上桌：拖动或点选。');assert(c.readout.find('assumption-group').every(n=>n.hidden));
 assert.equal(bindings[0].targets.length,2);assert.equal(c.state.prologue.assumptionDesk.selected,null);assert.equal(Object.keys(c.state.prologue.branchArchive).length,0);
 assert.equal(c.readout.find('assumption-speech speech-bubble')[0].textContent,ASSUMPTION_DIALOGUE[3]);
});

test('folded reasoning separates the relation, sale conditions and feedback without inventing outcomes',()=>{
 const {c,sent}=render(),book=c.readout.find('assumption-model')[0];assert.equal(book.open,undefined);
 assert.deepEqual(c.readout.find('assumption-reasoning').map(n=>n.dataset.reasoning),['relation','sale','feedback']);
 assert.equal(c.readout.find('assumption-reasoning-definition')[0].textContent,'资本主义社会基本矛盾：'+c.state.definition);
 assert.match(c.readout.find('assumption-reasoning-note')[1].textContent,/产品超过工资，不等于一定卖不掉/);
 assert.match(c.readout.find('assumption-reasoning-note')[2].textContent,/只有其他购买、收入或降价没有补足时/);
 assert.match(c.readout.find('assumption-reasoning-boundary')[0].textContent,/社会主义国家不能直接套用/);
 const source=c.readout.find('assumption-reasoning-source')[0].children[0];assert.equal(source.href,PROLOGUE_REASONING.source.url);
 const entries=book.children.filter(n=>n.tag==='details');assert.equal(entries.length,5);assert(entries.every(n=>!n.open));
 entries[0].open=true;entries[0].ontoggle();entries[1].open=true;entries[1].ontoggle();assert.equal(entries[0].open,false);assert.equal(entries[1].open,true);
 const assumptions=c.readout.find('assumption-assumptions')[0],reader=assumptions.find('research-reader')[0];assert.equal(reader.dataset.pageCount,'8');assert.equal(reader.find('research-paragraph').length,1);
 assert.match(reader.find('research-paragraph')[0].children[0].textContent,/1 \/ 8.*两店对战/);
 for(let i=1;i<8;i++)reader.find('secondary')[1].onclick();assert.match(reader.find('research-paragraph')[0].children[0].textContent,/8 \/ 8.*工资之外/);
 assert.equal(c.readout.find('assumption-parameters')[0].find('research-reader').length,1);assert.deepEqual(sent,[]);assert.equal(Object.keys(c.state.prologue.branchArchive).length,0);
});
test('a route shows two scoped observed facts without executing, changing records or replacing its question',()=>{
 const observation={automation:{context:'省下60%工时 · 一周',facts:[{label:'领到收入',value:4,unit:'人'},{label:'剩下面包',value:24,unit:'个'}]}},before=structuredClone(observation);
 const {c,sent}=render('labour',observation),receipts=c.readout.find('assumption-observation');
 assert.equal(receipts.length,1);assert.equal(receipts[0].dataset.branchObservation,'automation');assert.equal(receipts[0].find('assumption-observation-context')[0].textContent,observation.automation.context);
 assert.deepEqual(receipts[0].find('assumption-observation-fact').map(n=>[n.dataset.fact,n.dataset.value]),[['领到收入','4'],['剩下面包','24']]);
 const button=c.readout.find('assumption-fork').find(n=>n.dataset.branch==='automation');assert.equal(button.attrs['aria-describedby'],'if-play-automation if-observed-automation if-record-automation');
 assert.equal(button.find('assumption-fork-question')[0].textContent,PROLOGUE_ASSUMPTIONS[1].ifs[0].title);assert.equal(button.find('assumption-fork-play')[0].textContent,PROLOGUE_ASSUMPTIONS[1].ifs[0].play);
 assert.equal(button.find('assumption-fork-play')[0].hidden,true,'actual observations replace the repeated visual action hint');
 assert.equal(c.readout.find('assumption-fork').find(n=>n.dataset.branch==='time').find('assumption-fork-play')[0].hidden,false,'unplayed routes keep their visible action preview');
 assert.deepEqual(sent,[]);assert.deepEqual(observation,before);assert.equal(c.readout.find('assumption-fork').find(n=>n.dataset.branch==='time').find('assumption-observation').length,0);
});
