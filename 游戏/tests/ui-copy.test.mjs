import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Guard the authored screen, not merely source-string substitutions. Folded
// research remains available, while the default view cannot become an essay.
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.textContent='';this.className='';this.attrs={};}
 appendChild(child){this.children.push(child);return child;}
 setAttribute(name,value){this.attrs[name]=value;}
 visibleParagraphs(){if(this.tag==='details')return [];return [...(this.tag==='p'?[this.textContent]:[]),...this.children.flatMap(n=>n.visibleParagraphs())];}
 find(cls){return [...(this.className===cls?[this]:[]),...this.children.flatMap(n=>n.find(cls))];}
}
const variants=[
 ['technology','renderTechnologyExperiment','technology','automation'],
 ['technology','renderTechnologyExperiment','technology','time'],
 ['needs','renderNeedsExperiment','needsTechnology','space'],
 ['needs','renderNeedsExperiment','needsTechnology','services'],
 ['ownership','renderOwnershipExperiment','ownershipTechnology','concentration'],
 ['ownership','renderOwnershipExperiment','ownershipTechnology','sharing'],
 ['market-rules','renderMarketRules','marketRules','policy'],
 ['market-rules','renderMarketRules','marketRules','prices'],
];
function screen(file,renderer,stateKey,branch,phase,extra={}){
 const root={ResearchReader:{mount(parent,text,options){const n=new Element('section');n.className='research-reader';n.textContent=text;n.readerOptions=options;parent.appendChild(n);}}},context={window:root,document:{createElement:tag=>new Element(tag)},StreetArt:{decorateMoney(){},icon(){return '<svg/>';}},TRUST_ASSETS:{bakery:{newOven:'local-oven.svg'}}};
 context.GestureBoard={bind(){}};
 const atlas={frames:Object.fromEntries(['body0000','face0000'].map(k=>[k,{frame:{x:0,y:0,w:120,h:140}}])),meta:{size:{w:120,h:140}}};
 Object.assign(context.TRUST_ASSETS.bakery,{body:'body.png',face:'face.png',bodyAtlas:atlas,faceAtlas:atlas});
 vm.runInNewContext(fs.readFileSync(new URL('../lib/weber-perspective.js',import.meta.url),'utf8'),context);
 vm.runInNewContext(fs.readFileSync(new URL('../lib/value-journey.js',import.meta.url),'utf8'),context);
 vm.runInNewContext(fs.readFileSync(new URL('../lib/'+file+'-ui.js',import.meta.url),'utf8'),context);
 vm.runInNewContext(fs.readFileSync(new URL('../lib/time-calendar-ui.js',import.meta.url),'utf8'),context);
 vm.runInNewContext(fs.readFileSync(new URL('../lib/space-freight-ui.js',import.meta.url),'utf8'),context);
 vm.runInNewContext(fs.readFileSync(new URL('../lib/care-routing-ui.js',import.meta.url),'utf8'),context);
 const state={prologue:{[stateKey]:{branch,phase,...extra}},calendarTrials:[]};
 for(const [key,file] of [['technology','automation'],['needs','needs'],['ownership','ownership'],['rules','market-rules']]){state[key+'Evidence']={sources:JSON.parse(fs.readFileSync(new URL('../data/'+file+'-evidence.json',import.meta.url),'utf8')).sources};state[key+'Reports']={[branch]:'保留的研究说明。'};}
 const c={state,readout:new Element('div'),controls:new Element('div'),title(title,subtitle){assert.equal(subtitle,'','do not repeat the question in a subtitle');},send(){}};
 root[renderer](c);return c;
}
test('calendar ending also keeps one visible conclusion and folded research',()=>{
 const c=screen('technology','renderTechnologyExperiment','technology','time','conclusion',{calendar:{phase:'conclusion'}});
 assert.equal(c.readout.visibleParagraphs().length,1);assert(c.readout.visibleParagraphs()[0].length<50);assert.equal(c.readout.find('technology-report').length,1);assert.equal(c.readout.find('street-bounds').length,1);
});
test('freight ending also has one visible conclusion and folded research',()=>{
 const c=screen('needs','renderNeedsExperiment','needsTechnology','space','conclusion',{freight:{phase:'conclusion'}});
 assert.equal(c.readout.visibleParagraphs().length,1);assert(c.readout.visibleParagraphs()[0].length<50);assert.equal(c.readout.find('technology-report').length,1);assert.equal(c.readout.find('street-bounds').length,1);
});
test('care routing ending has one visible conclusion, folded limits and research',()=>{
 const c=screen('needs','renderNeedsExperiment','needsTechnology','services','conclusion',{care:{phase:'conclusion'}});
 assert.equal(c.readout.visibleParagraphs().length,1);assert(c.readout.visibleParagraphs()[0].length<50);assert.equal(c.readout.find('technology-report').length,1);assert.equal(c.readout.find('street-bounds').length,1);
});
test('network ending retains one short claim, with limits and research folded',()=>{
 const c=screen('ownership','renderOwnershipExperiment','ownershipTechnology','concentration','conclusion',{network:{phase:'conclusion'}});
 assert.equal(c.readout.visibleParagraphs().length,1);assert(c.readout.visibleParagraphs()[0].length<50);assert.equal(c.readout.find('street-bounds').length,1);assert.equal(c.readout.find('technology-report').length,1);
});
test('council ending retains one short claim, with limits and research folded',()=>{
 const c=screen('ownership','renderOwnershipExperiment','ownershipTechnology','sharing','conclusion',{council:{phase:'conclusion'}});
 assert.equal(c.readout.visibleParagraphs().length,1);assert(c.readout.visibleParagraphs()[0].length<50);assert.equal(c.readout.find('street-bounds').length,1);assert.equal(c.readout.find('technology-report').length,1);
});
test('six current conclusions preserve receipts by default; clearing is a separate folded action',()=>{
 for(const [file,renderer,field,branch,extra,label,type,action] of [
  ['technology','renderTechnologyExperiment','technology','automation',{},'保留回执，再挪挪人 ↺','TECHNOLOGY',{type:'REOPEN'}],
  ['technology','renderTechnologyExperiment','technology','time',{calendar:{phase:'conclusion'}},'保留回执，再排一周 ↺','TECHNOLOGY',{type:'CALENDAR',action:{type:'REOPEN'}}],
  ['needs','renderNeedsExperiment','needsTechnology','space',{freight:{phase:'conclusion'}},'保留回执，再接一单 ↺','NEEDS',{type:'FREIGHT',action:{type:'RETRY'}}],
  ['needs','renderNeedsExperiment','needsTechnology','services',{care:{phase:'conclusion',revision:7}},'保留回执，继续安排 ↺','NEEDS',{type:'CARE',action:{type:'REOPEN',expectedRevision:7}}],
  ['ownership','renderOwnershipExperiment','ownershipTechnology','concentration',{network:{phase:'conclusion'}},'保留回执，再接一次 ↺','OWNERSHIP',{type:'NETWORK',action:{type:'RETRY'}}],
  ['ownership','renderOwnershipExperiment','ownershipTechnology','sharing',{council:{phase:'conclusion'}},'保留回执，重新分配 ↺','OWNERSHIP',{type:'COUNCIL',action:{type:'RETRY'}}],
 ]){
  const c=screen(file,renderer,field,branch,'conclusion',extra),b=c.controls.children.find(n=>n.textContent===label);assert(b);let sent;c.send=a=>sent=a;b.onclick();assert.equal(JSON.stringify(sent),JSON.stringify({type,action}));
  const resets=c.readout.find('experiment-reset');assert.equal(resets.length,1);assert.notEqual(resets[0].open,true);const clear=resets[0].children.find(n=>n.tag==='button');assert.equal(clear.textContent,'清空本分支，重新开局');clear.onclick();assert.equal(JSON.stringify(sent),JSON.stringify({type,action:{type:'RESTART'}}));
 }
});
test('public demand ending retains one short claim, with limits and research folded',()=>{
 const c=screen('market-rules','renderMarketRules','marketRules','policy','conclusion',{demand:{phase:'conclusion'}});
 assert.equal(c.readout.visibleParagraphs().length,1);assert(c.readout.visibleParagraphs()[0].length<50);assert.equal(c.readout.find('street-bounds').length,1);assert.equal(c.readout.find('technology-report').length,1);
});
test('preservation ending retains one short claim, with limits and research folded',()=>{
 const c=screen('market-rules','renderMarketRules','marketRules','prices','conclusion',{workbench:{phase:'conclusion'}});
 assert.equal(c.readout.visibleParagraphs().length,1);assert(c.readout.visibleParagraphs()[0].length<50);assert.equal(c.readout.find('street-bounds').length,1);assert.equal(c.readout.find('technology-report').length,1);
});

test('legacy endings expose explicit new rules; current endings retry without erasing comparisons',()=>{
 for(const [branch,extra,label,action] of [
  ['policy',{demand:{phase:'conclusion'}},'试试同一笔公共预算 ↺',{type:'DEMAND',action:{type:'SHARED_BEGIN'}}],
  ['prices',{workbench:{phase:'conclusion'}},'试试先卖昨天的面包 ↺',{type:'PRESERVATION',action:{type:'PLANNED_BEGIN'}}],
  ['policy',{demand:{phase:'conclusion',sharedBudget:true}},'同样的钱，再换个安排 ↺',{type:'DEMAND',action:{type:'RETRY'}}],
  ['prices',{workbench:{phase:'conclusion',flexibleBake:true}},'同样的钱，再换个安排 ↺',{type:'PRESERVATION',action:{type:'RETRY'}}],
 ]){
  const c=screen('market-rules','renderMarketRules','marketRules',branch,'conclusion',extra),b=c.controls.children.find(n=>n.textContent===label);assert(b,'explicit entry is present');let sent;c.send=a=>sent=a;b.onclick();assert.equal(JSON.stringify(sent),JSON.stringify({type:'RULES',action}));
 }
});
for(const [file,renderer,stateKey,branch] of variants){
 test(branch+': one short introduction, research only after play',()=>{
  const c=screen(file,renderer,stateKey,branch,'intro');
  assert.equal(c.readout.visibleParagraphs().length,1);
  assert(c.readout.visibleParagraphs().join('').length<=30,'one short setup, not a preview of the whole lesson');
  assert.equal(c.readout.find('technology-report').length,0);
 });
 test(branch+': one visible conclusion, optional explanation and sources retained',()=>{
  const c=screen(file,renderer,stateKey,branch,'conclusion');
  assert.equal(c.readout.visibleParagraphs().length,1);
  assert(c.readout.visibleParagraphs()[0].length<50);
  const bounds=c.readout.find('street-bounds');assert.equal(bounds.length,1);assert.notEqual(bounds[0].open,true);
  assert.equal(c.readout.find('technology-report').length,1);
  assert.equal(c.readout.find('technology-report-body').length,1);
  const report=c.readout.find('technology-report')[0];assert.deepEqual(report.children.map(n=>n.tag),['summary','div'],'no duplicate audit paragraph or independently expanding source wall');
  const sources=c.readout.find('research-reader')[0].readerOptions.sources;assert(sources.length>0);if(file!=='technology')assert(sources.every(s=>s.branch===branch),'only this branch sources, not other studies or industries');
 });
}

test('manipulation screens do not repeat directions as separate explanatory paragraphs',()=>{
 const automation=fs.readFileSync(new URL('../lib/technology-ui.js',import.meta.url),'utf8');
 assert.doesNotMatch(automation,/先试一种安排，再只挪动一个人|这一周，实际发生了什么|假设占原来六成工时/);
 assert.match(automation,/if\(!samePlan\(t\)\)el\('p','草稿已改，仍显示上次结果。'/,'stale-result warnings remain visible');
 const gestures=fs.readFileSync(new URL('../lib/gesture-board.js',import.meta.url),'utf8');
 assert.doesNotMatch(gestures,/empty.textContent='放在这里'/,'do not repeat prose in every empty destination');
 assert.match(gestures,/empty.setAttribute\('aria-hidden','true'\)/);
 const c=screen('technology','renderTechnologyExperiment','technology','automation','intro');
 const intro=c.readout.find('technology-intro')[0],extra=intro.children.filter(n=>n.tag==='details');
 assert.equal(intro.find('piece-hint')[0].textContent,'','labelled source and destination need no permanent tutorial sentence');
 assert.match(automation,/prompt:'把任务交给机器：拖动或点选。'/,'the hint is still available when the destination is clicked first');
 assert.match(fs.readFileSync(new URL('../app/trust-stage.css',import.meta.url),'utf8'),/\.piece-hint:empty\s*\{\s*display:none/,'only empty hints are collapsed, not pickup or failure feedback');
 assert.equal(extra.length,1,'optional diversions share one collapsed entry rather than three rows around the main action');
 assert.equal(extra[0].children[0].textContent,'另外试试');assert.notEqual(extra[0].open,true);
 assert.equal(extra[0].children.filter(n=>n.tag==='details').length,3,'all three optional experiences remain available');
 const end=screen('technology','renderTechnologyExperiment','technology','automation','conclusion');
 const optional=end.readout.find('scene-supplement');assert.equal(optional.length,1);
 assert.equal(optional[0].children[0].textContent,'继续探索与说明');assert.notEqual(optional[0].open,true);
 assert.equal(optional[0].find('street-bounds').length,1,'definitions remain available in the shared entry');
 assert.equal(optional[0].find('production-purpose-entry').length,1,'the energy experiment remains available');
 assert.equal(optional[0].find('technology-report').length,1,'research is inside the shared entry, not another default row');
 assert.equal(optional[0].find('hidden-work-entry').length,1,'completed players can revisit the task experiment without clearing receipts');
});

test('five manuscript contexts keep their own date, question, source and reading caveat, but are not rendered together',()=>{
 const c=screen('technology','renderTechnologyExperiment','technology','automation','conclusion'),topics=c.readout.find('research-reader')[0].readerOptions.topics;
 assert.equal(topics.length,1);assert.equal(topics[0].title,'文稿背景（逐篇）');assert.equal(topics[0].pages.length,5);
 for(const [i,date] of ['2020-12-12','2021-02-02','2023-04-14','2024-05-18','2026-02-20'].entries()){const page=topics[0].pages[i];assert(page.startsWith(date));assert.match(page,/不是学界共识/);assert.match(page,/机器稿未逐句听校/);assert.match(page,/https:\/\/www.bilibili.com\/video\/BV/);assert(page.length<300);}
 assert.equal(c.readout.find('manuscript-context').length,0);
});

test('contextual annotations do not duplicate controls or actual figures',()=>{
 const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
 const battle=read('public/assets/market-duel/battle.html');
 assert.doesNotMatch(battle,/aria-label="对战流程"/,'do not preview the later wage reveal above the experiment');
 assert.match(battle,/id="chapter-title"/,'the current scene still identifies where the player is');
 const care=read('lib/care-routing-ui.js');
 assert.doesNotMatch(care,/这一期，实际用上了多少？|点一个人，看看钱包和等待原因。/);
 assert.match(care,/if\(!same\)el\('p','新安排还没服务。这里仍是上次结果。'/);
 assert.match(care,/inspection.hidden=true/);assert.match(care,/inspection.hidden=false;inspection.textContent=/,'a requested personal explanation must become visible');
 assert.match(care,/服务后才付钱/,'payment timing is a decision rule, not disposable commentary');
 const council=read('lib/sharing-council-ui.js');
 assert.doesNotMatch(council,/council-ballot-instruction/,'one active instruction, not a second paragraph beside the ballot');
 assert.match(council,/你是第六名工人/);assert.match(council,/草稿已改，确认后才执行/);
 assert.doesNotMatch(council,/hint.hidden=/,'future inspection and invalid-drop feedback must not remain hidden');
 assert.match(read('app/trust-stage.css'),/\.council-hint:empty\{display:none\}/);
 const network=read('lib/platform-network-ui.js');
 assert.doesNotMatch(network,/network-shop-delta/,'opening and closing balances already show the change');
 assert.match(network,/network-shop-balance/);assert.match(network,/network-individual-account/);
 const freight=read('lib/space-freight-ui.js');
 assert.doesNotMatch(freight,/点部件，看看为什么还留着。/);
 assert.match(freight,/notice.hidden=false;notice.textContent=/,'clicking leftover goods still explains the actual constraint');
 for(const src of [care,council,network,freight])assert.match(src,/账|假设|ledger/,'assumptions and payment details remain available on demand');
});

test('optional technology experiments let figures speak; commentary names only the consequence',()=>{
 const read=file=>fs.readFileSync(new URL('../lib/'+file,import.meta.url),'utf8');
 const purpose=read('production-purpose.js');
 assert.doesNotMatch(purpose,/还有'\+a.stock\+'份没卖出。/,'unsold goods already have a label beside the tray');
 assert.match(purpose,/总共却更费/);assert.match(purpose,/production-purpose-energy/);assert.match(purpose,/production-purpose-baseline/);
 const hidden=read('hidden-work.js');
 assert.match(hidden,/if\(a.pending\)el\('p','转出去了，还没做完。'/,'only incomplete work needs a warning beyond the three row statuses');
 assert.match(hidden,/本批 '\+a.total\+' 分钟 · 全人工/);
 const value=read('value-journey.js');
 assert.doesNotMatch(value,/\['能辅助的任务'|\['使用费'/,'active buttons already identify the selected capability and fee');
 assert.match(value,/\['你的预算','2枚'\]/);assert.match(value,/付不起，只能自己做/);
 assert.match(value,/if\(!settled\)el\('p','买入10份需100枚。'/,'an already settled trade must not retain a pending-trade caption');
 for(const source of [purpose,hidden,value])assert.match(source,/来源|sources|条件/,'assumptions and research have not been discarded');
});
