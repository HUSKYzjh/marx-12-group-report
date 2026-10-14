import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class Node {
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.textContent='';}
 appendChild(n){this.children.push(n);return n;}
 replaceChildren(){this.children=[];}
 setAttribute(k,v){this.attrs[k]=v;}
 focus(){this.focused=true;}
 find(tag){return [...(this.tag===tag?[this]:[]),...this.children.flatMap(n=>n.find(tag))];}
}
const window={},scope={window,document:{createElement:tag=>new Node(tag),createTextNode:text=>Object.assign(new Node('#text'),{textContent:text})}};
vm.runInNewContext(fs.readFileSync(new URL('../lib/research-reader.js',import.meta.url),'utf8'),scope);
const {parse,mount}=window.ResearchReader,dir=new URL('../docs/研究报告/',import.meta.url);
const reports=fs.readdirSync(dir).filter(n=>n.endsWith('.txt')).map(file=>({file,text:fs.readFileSync(new URL(file,dir),'utf8')}));

test('all eight research reports retain every nonblank source line, including metadata, qualifications and citations',()=>{
 assert.equal(reports.length,8);
 for(const {file,text} of reports){
  const groups=parse(text),lines=groups.flatMap(g=>[...(g.synthetic||g.title==='正文'?[]:[g.title]),...g.pages.flatMap(p=>p.split('\n'))]);
  assert.deepEqual(Array.from(lines),text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),file);
  assert(groups.length>=6,file);assert(groups.some(g=>g.preface),file);if(text.split(/\r?\n/).some(line=>/^\[[A-Z]*\d+\]/.test(line)))assert(groups.some(g=>/来源/.test(g.title)),file);
  assert(Math.max(...groups.flatMap(g=>g.pages.map(p=>p.length)))<900,file+' one complete original paragraph at a time');
 }
});
test('plain short prose is not mistaken for a title and discarded',()=>{
 assert.equal(parse('').length,0);assert.equal(parse('保留的研究说明。')[0].pages[0],'保留的研究说明。');
});
test('real report reader shows one paragraph, preserves the supplied corpus and never edits an external model',()=>{
 for(const {text} of reports){
  const parent=new Node('div'),reader=mount(parent,text),select=reader.find('select')[0],buttons=reader.find('button');assert.equal(reader.researchText,text);assert.equal(select.attrs['aria-label'],'选择资料主题');
  const groups=parse(text);assert.equal(Number(reader.dataset.topic),1);
  for(let topic=0;topic<groups.length;topic++){
   select.value=String(topic);select.onchange();assert.equal(reader.dataset.page,'0');
   for(let page=0;page<groups[topic].pages.length;page++){
    assert.equal(reader.find('p').length,1);assert.equal(reader.find('h3').length,1);assert.equal(Number(reader.dataset.page),page);
    assert.equal(reader.find('h3')[0].hidden,groups[topic].title.length<=18,'short selector labels should not be printed twice; long clipped titles remain readable');
    if(page<groups[topic].pages.length-1)buttons[1].onclick();else assert.equal(buttons[1].disabled,true);
   }
   assert.equal(reader.researchText,text);
  }
 }
});
test('source URLs become safe links rather than a long raw URL or executable markup',()=>{
 const reader=mount(new Node('div'),'资料标题\n元数据\n\n研究来源\n说明 <script>不会执行</script> https://example.org/source。'),p=reader.find('p')[0],a=p.find('a')[0];
 assert.equal(a.href,'https://example.org/source');assert.equal(a.textContent,'原始来源 ↗');assert.equal(a.target,'_blank');assert.equal(a.rel,'noreferrer');assert(p.find('#text').some(n=>n.textContent.includes('<script>')));assert.equal(reader.find('script').length,0);
});
test('arriving at a disabled last/first navigation button transfers focus to the usable neighbour',()=>{
 const reader=mount(new Node('div'),'标题\n元数据\n\n主题\n第一段。\n第二段。'),buttons=reader.find('button');buttons[1].onclick();assert.equal(buttons[0].focused,true);buttons[0].onclick();assert.equal(buttons[1].focused,true);
});

test('source index shows one complete source at a time, with dates, locators and access qualifications',()=>{
 for(const file of ['automation','needs','ownership','market-rules']){
  const sources=JSON.parse(fs.readFileSync(new URL('../data/'+file+'-evidence.json',import.meta.url),'utf8')).sources;
  const reader=mount(new Node('div'),'保留的正文。',{sources}),select=reader.find('select')[0];
  select.value='1';select.onchange();assert.equal(reader.dataset.pageCount,String(sources.length));
  for(let i=0;i<sources.length;i++){
   const p=reader.find('p')[0],words=p.find('#text').map(n=>n.textContent).join('');assert.equal(reader.find('p').length,1);assert.equal(reader.find('a').length,sources[i].numericUrl?2:1);assert.equal(reader.find('a')[0].href,sources[i].url);if(sources[i].numericUrl)assert.equal(reader.find('a')[1].href,sources[i].numericUrl);
   for(const field of ['title','published','locator','access'])if(sources[i][field])assert(words.includes(sources[i][field]),file+' source '+i+' '+field);
   if(i<sources.length-1)reader.find('button')[1].onclick();
  }
 }
});

test('additional manuscript topics share the same single-page viewport without changing the supplied report',()=>{
 const text='保留的正文。',pages=['第一篇。\nhttps://example.org/one','第二篇。\n未逐句听校。'];
 const reader=mount(new Node('div'),text,{topics:[{title:'文稿背景（逐篇）',pages}]}),select=reader.find('select')[0];
 select.value='1';select.onchange();assert.equal(reader.find('p').length,1);assert.equal(reader.find('a')[0].href,'https://example.org/one');reader.find('button')[1].onclick();assert.equal(reader.find('a').length,0);assert.equal(reader.find('p')[0].find('#text')[0].textContent,pages[1]);assert.equal(reader.researchText,text);assert.deepEqual(pages,['第一篇。\nhttps://example.org/one','第二篇。\n未逐句听校。']);
});
