import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../lib/bakery-timeline.js';
import {initialPrologue,prologueReducer as reduce,restorePrologue,GAME_TITLE,PROLOGUE_TITLE,PROLOGUE_STAGES,STORY_CHAPTERS,BAKERY_COMPLAINTS} from '../lib/prologue-state.ts';
const {sample,captions,duration}=globalThis.BakeryTimeline;
test('the home enters the prologue, act one before the street; existing records survive',()=>{
  assert.equal(GAME_TITLE,'饥馑的盛宴');assert.equal(PROLOGUE_TITLE,'序章：厨房内外');
  let s=initialPrologue();s.allocationPlans.A={laborShare:70,retainedShare:30};
  const saved=structuredClone(s.allocationPlans);
  assert.strictEqual(reduce(s,{type:'CONTINUE_BAKERY'}),s);
  s=reduce(s,{type:'START'});assert.equal(s.scene,'bakery');
  assert.deepEqual(restorePrologue(JSON.stringify(s)),s);
  assert.deepEqual(s.allocationPlans,saved);
  s=reduce(s,{type:'CONTINUE_BAKERY'});assert.equal(s.scene,'bakery-upgrade');assert.deepEqual(s.allocationPlans,saved);
  assert.equal(PROLOGUE_STAGES[2].scene,'street');
  assert.equal(PROLOGUE_STAGES[1].label,'第一幕·更大的烤炉');
  assert.equal(PROLOGUE_STAGES[1].scene,'bakery');
});

test('chapter labels use chapter + act, and only expose implemented chapters',()=>{
  assert.deepEqual(STORY_CHAPTERS,[{id:'prologue',title:'序章：厨房内外'},{id:'automation',title:'第一章：谁还领钱？'},{id:'needs',title:'第二章：需要很多，谁来买？'},{id:'ownership',title:'第三章：钱分了，谁说了算？'},{id:'rules',title:'第四章：改改买卖的规矩'},{id:'machine',title:'附录：两人小工厂'}]);
  const document=fs.readFileSync(new URL('../lib/trust-document.ts',import.meta.url),'utf8');
  const runtime=fs.readFileSync(new URL('../lib/trust-stage.js',import.meta.url),'utf8');
  assert.match(document,/aria-label="章节切换"/);assert.match(document,/id="chapter-list"/);
  assert.doesNotMatch(document+runtime,/第一节|第二节|chapter-label/);
});
test('bread loads before payment, truck leaves before wages, then the demonstration stops',()=>{
  assert.deepEqual(captions.map(c=>c.id),['bake','arrive','load','pay','depart','wages','done']);
  const {at}=globalThis.BakeryTimeline;
  assert.equal(duration,9.66);assert.equal(globalThis.BakeryTimeline.upgradeDuration,9.8);
  assert(sample(at(7.2)).bread.every(v=>v===1));assert.equal(sample(at(7.2)).paid,0);
  assert.equal(sample(at(10)).paid,10);assert.equal(sample(at(10)).wages,0);
  assert.equal(sample(at(12)).truckLeave,1);assert.equal(sample(at(12)).wages,0);
  const end=sample(duration);assert.equal(end.complete,true);assert.equal(end.wages,5);assert.equal(end.boss,5);assert.equal(end.paid,10);
  assert.deepEqual(sample(999),end);assert.deepEqual(sample(-1),sample(0));assert.deepEqual(sample(NaN),sample(0));
});
test('no stage invents coins or treats proceeds less wages as net profit',()=>{
  for(let i=0;i<=1600;i++){
    const s=sample(i/100);assert.equal(s.wages+s.boss,s.paid);assert(s.paid<=10&&s.wages<=5&&s.boss>=0);
    assert.equal(s.paid,s.money.filter(c=>c.pay===1).length);assert.equal(s.wages,s.money.filter(c=>c.wage===1).length);
    assert(s.money.every(c=>c.pay>=0&&c.pay<=1&&c.wage>=0&&c.wage<=1));
  }
});

test('both balance labels appear only after departure and the completed wage transfer',()=>{
  for(let i=0;i<=1600;i++){
    const s=sample(i/100);
    assert.equal(s.showBalances,s.truckLeave===1&&s.wages===5);
    if(s.showBalances)assert.deepEqual([s.wages,s.boss],[5,5]);
  }
  for(const t of [0,5.3,9.5,10,11.9,12,13.5])assert.equal(sample(globalThis.BakeryTimeline.at(t)).showBalances,false);
  assert.equal(sample(globalThis.BakeryTimeline.at(14)).showBalances,true);assert.equal(sample(duration).showBalances,true);
  assert.equal(sample(0).showBalances,false);
  const art=fs.readFileSync(new URL('../lib/bakery-stage.js',import.meta.url),'utf8');
  assert.match(art,/labels\.visible=s\.showBalances/);
  assert.match(art,/labelY=truck\.y-truck\.height\/2/);
  assert.match(art,/fontSize=compact\?40:28/);
});
test('authored art is local vector art with no scripts, external references or embedded fonts',()=>{
  for(const name of ['baker','chef-hat','oven-old','oven-new','truck','bread']){
    const svg=fs.readFileSync(new URL('../public/assets/bakery/'+name+'.svg',import.meta.url),'utf8');
    assert.match(svg,/<svg/);assert.doesNotMatch(svg,/<script|onload=|onerror=|href=|<foreignObject|@font-face/);
  }
});

test('new oven receives fifteen coins before any chosen wages are distributed',()=>{
  for(let wage=0;wage<=15;wage++){
    for(let t=0;t<=16;t+=.1){
      const s=sample(t,{upgrade:true,wage,committed:false});assert.equal(s.wages,0);assert.equal(s.showBalances,false);assert.equal(s.wages+s.boss,s.paid);assert(s.paid<=15);
    }
    const end=sample(16,{upgrade:true,wage,committed:true,distributionSeconds:2.2});
    assert.deepEqual([end.paid,end.wages,end.boss,end.showBalances],[15,wage,15-wage,true]);
  }
});

test('upgrade, baking, sale and split stay separate even when replaying a committed choice',()=>{
 const {at,upgradeCaptions,captionFor,upgradeDuration}=globalThis.BakeryTimeline;
 assert.deepEqual(upgradeCaptions.map(c=>c.id),['upgrade','produce','arrive','load','pay','depart','choose']);
 assert.equal(sample(0,{upgrade:true}).baked,0);
 assert.equal(sample(at(2.8,true),{upgrade:true}).baked,12);
 assert(sample(at(2,true),{upgrade:true}).baked>0&&sample(at(2,true),{upgrade:true}).baked<12);
 for(const c of upgradeCaptions){const s=sample(c.at,{upgrade:true,wage:5,committed:true,distributionSeconds:0});
  if(!s.complete)assert.equal(captionFor(s,true,true),c.text);
  assert.equal(captionFor(s,true,false),c.text);
  if(c.id==='upgrade'||c.id==='produce')assert.equal(s.paid,0);
 }
 const ready=sample(upgradeDuration,{upgrade:true,wage:5,committed:false});assert.equal(ready.paid,15);assert.equal(ready.wages,0);assert.equal(ready.caption,'这次，给厨师分多少？');
 assert.equal(captionFor(sample(upgradeDuration,{upgrade:true,wage:5,committed:true}),true,true),'老板把金币分给厨师。');
 assert.equal(captionFor(sample(upgradeDuration,{upgrade:true,wage:5,committed:true,distributionSeconds:2.2}),true,true),'');
});

test('legal wage choices save independently; complaints are optional and only below five',()=>{
  const initial=reduce(reduce(initialPrologue(),{type:'START'}),{type:'CONTINUE_BAKERY'});
  assert.equal(BAKERY_COMPLAINTS.length,6);assert(BAKERY_COMPLAINTS.every(q=>q.trim().length>0));
  for(let wage=3;wage<=7;wage++){
    const s=reduce(initial,{type:'SET_BAKERY_WAGE',wage,complaintIndex:5});
    assert.equal(s.bakeryWage,wage);assert.equal(s.bakeryComplaintIndex,wage<5?5:null);
    assert.deepEqual(s.allocationPlans,initial.allocationPlans);
    assert.deepEqual(restorePrologue(JSON.stringify(s)),s);
    const committed=reduce(s,{type:'CONFIRM_BAKERY_WAGE'});
    assert.strictEqual(reduce(committed,{type:'SET_BAKERY_WAGE',wage:6}),committed);
    assert.equal(reduce(committed,{type:'OPEN_ALLOCATION_COMPARE'}).scene,'allocation');
    assert.equal(reduce(committed,{type:'RETRY_BAKERY_WAGE'}).bakeryCommitted,false);
  }
  for(const wage of [-1,16,5.5,NaN])assert.strictEqual(reduce(initial,{type:'SET_BAKERY_WAGE',wage}),initial);
  assert.strictEqual(reduce(initial,{type:'SET_BAKERY_WAGE',wage:4,complaintIndex:6}),initial);
  const legacy=structuredClone(initial);delete legacy.bakeryWage;delete legacy.bakeryComplaintIndex;delete legacy.bakeryCommitted;
  assert.equal(restorePrologue(legacy).bakeryWage,5);
});
test('lower attempt heats the chef but saves three; upper attempts repeatedly rebound to seven without locking',()=>{
  const initial={...initialPrologue(),scene:'bakery-upgrade'};
  const low=reduce(initial,{type:'SET_BAKERY_WAGE',wage:2,complaintIndex:2,bossQuoteIndex:1});
  assert.equal(low.bakeryWage,3);assert.equal(low.bakeryBoundary,'low');assert.equal(low.bakeryBoundarySerial,1);
  assert.deepEqual(restorePrologue(JSON.stringify(low)),low);
  const again=reduce(low,{type:'SET_BAKERY_WAGE',wage:2,complaintIndex:null,bossQuoteIndex:0});
  assert.equal(again.bakeryWage,3);assert.equal(again.bakeryBoundarySerial,2);assert.equal(again.bakeryComplaintIndex,null);
  const high=reduce(again,{type:'SET_BAKERY_WAGE',wage:8,bossQuoteIndex:3});
  assert.equal(high.bakeryWage,7);assert.equal(high.bakeryUpperLocked,false);assert.equal(high.bakeryBoundary,'high');
  const repeated=reduce(high,{type:'SET_BAKERY_WAGE',wage:8,bossQuoteIndex:0});
  assert.equal(repeated.bakeryWage,7);assert.equal(repeated.bakeryBoundarySerial,high.bakeryBoundarySerial+1);
  assert.equal(restorePrologue({...high,bakeryUpperLocked:true}).bakeryUpperLocked,false,'old locks are removed on refresh');
  const down=reduce(high,{type:'SET_BAKERY_WAGE',wage:6});assert.equal(down.bakeryBoundary,null);
  assert.equal(reduce(down,{type:'SET_BAKERY_WAGE',wage:7}).bakeryWage,7);
  assert.strictEqual(reduce(initial,{type:'SET_BAKERY_WAGE',wage:2,bossQuoteIndex:3}),initial);
  assert.strictEqual(reduce(initial,{type:'SET_BAKERY_WAGE',wage:8}),initial);
  assert.deepEqual(high.allocationPlans,initial.allocationPlans);
});
test('driving is faster in both acts, without skipping loading, payment or departure',()=>{
  const {at}=globalThis.BakeryTimeline;
  for(const upgrade of [false,true]){
    assert(Math.abs(at(4.8,upgrade)-at(2.8,upgrade)-(upgrade?.9:.63))<1e-9);
    assert(Math.abs(at(12,upgrade)-at(10,upgrade)-(upgrade?.9:.63))<1e-9);
    for(const t of [2.8,4.8,7.2,10,12,...(upgrade?[]:[16])])assert.equal(sample(at(t,upgrade),{upgrade}).storyTime,t);
    assert.equal(sample(at(4.8,upgrade),{upgrade}).truckArrive,1);
    assert.equal(sample(at(10,upgrade),{upgrade}).paid,upgrade?15:10);
  }
});
test('the upgrade question opens interactive choices immediately, not four seconds later',()=>{
  const {upgradeCaptions,upgradeDuration}=globalThis.BakeryTimeline;
  const question=upgradeCaptions.find(c=>c.id==='choose');
  assert.equal(question.at,upgradeDuration);
  assert.equal(sample(question.at-.01,{upgrade:true}).complete,false);
  const ready=sample(question.at,{upgrade:true});
  assert.equal(ready.phase,'choose');assert.equal(ready.complete,true);
  assert.equal(ready.paid,15);assert.equal(ready.truckLeave,1);
  assert.equal(ready.wages,0);
});
test('old out-of-range saves preserve their historical choice and require reconfirmation',()=>{
  for(const wage of [0,1,2,8,15]){
    const old={...initialPrologue(),scene:'bakery-upgrade',bakeryWage:wage,bakeryCommitted:true};
    const restored=restorePrologue(old);assert.equal(restored.bakeryWage,Math.max(3,Math.min(7,wage)));
    assert.equal(restored.bakeryPreviousWage,wage);assert.equal(restored.bakeryCommitted,false);
    assert.deepEqual(restorePrologue(restored),restored);
    assert.deepEqual(restored.allocationPlans,old.allocationPlans);
  }
});
test('the baker uses original WBWWB body and face with only a new chef hat',()=>{
  const source=fs.readFileSync(new URL('../lib/bakery-stage.js',import.meta.url),'utf8');
  const document=fs.readFileSync(new URL('../lib/trust-document.ts',import.meta.url),'utf8');
  assert.match(source,/chefBody=_makeMovieClip\('bakery_body'/);
  assert.match(source,/chefFace=_makeMovieClip\('bakery_face'/);
  assert.match(source,/chefHat=sprite\(textures.chefHat,chef\)/);
  assert.match(source,/bakery_angry',\{anchorX:1\/3/);
  assert.match(source,/chefAngry\.gotoAndStop\(hot\?5:3\)/);
  assert.match(document,/chef-hat\.svg/);assert.doesNotMatch(document,/\/baker\.svg/);
});

test('the bakery keeps only two coin labels, no decorative rules or account note',()=>{
  const art=fs.readFileSync(new URL('../lib/bakery-stage.js',import.meta.url),'utf8');
  const runtime=fs.readFileSync(new URL('../lib/trust-stage.js',import.meta.url),'utf8');
  assert.doesNotMatch(art,/label\('面包店'\)|label\('老烤炉'\)|ink\.lineStyle|ink\.lineTo/);
  assert.doesNotMatch(runtime,/bakery-account-note|留下的5枚还要付面粉/);
});
