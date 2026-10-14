import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../lib/gesture-board.js',import.meta.url),'utf8');
test('a cancelled brush stroke suppresses its trailing native click, but deliberate keyboard pickup still works',()=>{
 class Node{
  constructor(){this.attributes={};this.listeners={};this.disabled=false;this.captured=false;}
  setAttribute(k,v){this.attributes[k]=String(v);}removeAttribute(k){delete this.attributes[k];}
  toggleAttribute(k,on){if(on)this.setAttribute(k,'');else this.removeAttribute(k);}
  addEventListener(k,fn){this.listeners[k]=fn;}contains(n){return this===n;}focus(){}
  setPointerCapture(){this.captured=true;}hasPointerCapture(){return this.captured;}releasePointerCapture(){this.captured=false;}
  getClientRects(){return [this.getBoundingClientRect()];}getBoundingClientRect(){return {left:80,right:120,top:0,bottom:40};}
 }
 const wrap=new Node(),trigger=new Node(),apply=new Node(),cancel=new Node(),cell=new Node(),window={},commits=[];let now=0;
 vm.runInNewContext(source,{window,performance:{now:()=>now}});
 window.GestureBoard.paint(wrap,{trigger,apply,cancel,capacity:1,cells:[{id:0,node:cell,eligible:true}],onPreview(){},onCommit:ids=>commits.push(ids)});
 const fire=(type,extra={})=>wrap.listeners[type]({target:trigger,button:0,pointerId:1,clientX:20,clientY:20,detail:0,preventDefault(){},stopImmediatePropagation(){},...extra});
 for(const ending of ['escape','cancel','lost','global']){
  fire('pointerdown');fire('pointermove',{clientX:35});assert.equal(trigger.attributes['aria-pressed'],'true');
  if(ending==='escape')fire('keydown',{key:'Escape'});
  else if(ending==='cancel')fire('pointercancel');
  else if(ending==='lost')fire('lostpointercapture');
  else window.GestureBoard.cancel();
  assert.equal(trigger.attributes['aria-pressed'],'false');assert.equal(wrap.captured,false);
  now+=1000;fire('pointerup',{clientX:35});fire('click',{detail:1});assert.equal(trigger.attributes['aria-pressed'],'false','even a delayed release of the cancelled pointer cannot re-arm its source');
  fire('click',{detail:0});assert.equal(trigger.attributes['aria-pressed'],'true','keyboard confirmation is not swallowed');window.GestureBoard.cancel();
  now+=400;fire('click',{detail:1});assert.equal(trigger.attributes['aria-pressed'],'true','a new deliberate pointer click is usable');window.GestureBoard.cancel();
 }
 assert.deepEqual(commits,[]);
});
function fixture(withFeedback=true,dual=false,rejectMessage=null){
 class Node{
  constructor(){this.attributes={};this.style={};this.children=[];}
  setAttribute(k,v){this.attributes[k]=v;}
  removeAttribute(k){delete this.attributes[k];}
  toggleAttribute(k,on){if(on)this.setAttribute(k,'');else this.removeAttribute(k);}
  appendChild(n){this.children.push(n);n.parent=this;}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
  cloneNode(){return new Node();}
  contains(n){return this===n||this.children.some(c=>c.contains(n));}
  setPointerCapture(){}
 }
 const body=new Node(),wrap=new Node(),packet=new Node(),target=new Node(),button=new Node(),hint=new Node(),window={},events=[];
 target.appendChild(button);wrap.appendChild(packet);wrap.appendChild(target);let under=null;
 const document={body,elementFromPoint:()=>under};vm.runInNewContext(source,{window,document});
 const config={pieces:[{id:'shop:0',node:packet,name:'插头'}],targets:[{id:'B',node:target,button,accepts:id=>id==='shop:0'}],hint,prompt:'接线',onDrop:(id,to)=>events.push(['drop',id,to])};
 if(rejectMessage){config.targets[0].accepts=()=>false;config.rejectMessage=rejectMessage;}
 if(dual)config.pieces.push({id:'shop:1',node:button,name:'另一个插头'});
 if(withFeedback){config.onDragMove=(id,p)=>events.push(['move',id,p.x,p.y,p.target]);config.onDragEnd=id=>events.push(['end',id]);}
 window.GestureBoard.bind(wrap,config);
 const pointer=(x,y)=>({button:0,pointerId:1,clientX:x,clientY:y,preventDefault(){}});
 return {body,wrap,packet,button,hint,window,events,pointer,over:()=>{under=button;},away:()=>{under=null;},down:()=>packet.onpointerdown(pointer(10,10)),move:()=>packet.onpointermove(pointer(80,60)),up:()=>packet.onpointerup(pointer(80,60))};
}
test('physical feedback follows motion, and a valid drop commits only after the feedback is released',()=>{
 const f=fixture();f.down();f.over();f.move();assert.deepEqual(f.events,[['move','shop:0',80,60,'B']]);assert.equal(f.body.children.length,1);
 f.up();assert.deepEqual(f.events,[['move','shop:0',80,60,'B'],['end','shop:0'],['drop','shop:0','B']]);assert.equal(f.body.children.length,0);
});
test('a movable person can also receive a held voucher or queue move, by keyboard or tap, without stealing the held piece',()=>{
 for(const method of ['keyboard','tap']){const f=fixture(true,true);f.packet.onclick();if(method==='keyboard')f.button.onclick();else{f.button.onpointerdown(f.pointer(80,60));f.button.onpointerup(f.pointer(80,60));f.button.onclick();}assert.deepEqual(f.events,[['drop','shop:0','B']]);assert.equal(f.packet.attributes['aria-pressed'],'false');assert.equal(f.button.attributes['aria-pressed'],'false');}
});
test('escape, pointer cancellation, invalid placement and teardown remove feedback without committing; optional hooks preserve old boards',()=>{
 for(const finish of [f=>f.wrap.onkeydown({key:'Escape'}),f=>f.packet.onpointercancel(),f=>{f.away();f.up();},f=>f.window.GestureBoard.cancel()]){
  const f=fixture();f.down();f.over();f.move();finish(f);assert.deepEqual(f.events.map(e=>e[0]),['move','end']);assert.equal(f.body.children.length,0);assert.equal(f.packet.attributes['aria-pressed'],'false');
 }
 const old=fixture(false);old.down();old.over();old.move();assert.deepEqual(old.events,[]);old.up();assert.deepEqual(old.events,[['drop','shop:0','B']]);
});

test('a reopened board can repeatedly cancel pickup or drag without keeping a hidden piece',()=>{
 const f=fixture();
 for(let i=0;i<3;i++){
  f.packet.onclick();assert.equal(f.packet.attributes['aria-pressed'],'true');f.window.GestureBoard.cancel();assert.equal(f.packet.attributes['aria-pressed'],'false');
  f.down();f.move();assert.equal(f.body.children.length,1);f.window.GestureBoard.cancel();assert.equal(f.body.children.length,0);assert.equal(f.packet.attributes['aria-pressed'],'false');
  // Closing before enough motion to arm must clear the pending pointer as well.
  f.down();f.window.GestureBoard.cancel();f.over();f.move();f.up();assert.equal(f.body.children.length,0);
 }
 assert.equal(f.events.some(e=>e[0]==='drop'),false);
});

test('optional need-specific rejection explains pointer and keyboard failures without a state commit',()=>{
 for(const method of ['pointer','keyboard']){
  const seen=[],f=fixture(false,false,(id,to)=>{seen.push([id,to]);return '能源件不能代替供气件。';});
  if(method==='pointer'){f.down();f.over();f.move();f.up();assert.equal(f.packet.attributes['aria-pressed'],'false');}
  else{f.packet.onclick();f.button.onclick();assert.equal(f.packet.attributes['aria-pressed'],'true');f.window.GestureBoard.cancel();}
  assert.deepEqual(seen,[['shop:0','B']]);assert.equal(f.hint.textContent,'能源件不能代替供气件。');assert.deepEqual(f.events,[]);assert.equal(f.body.children.length,0);
 }
});
