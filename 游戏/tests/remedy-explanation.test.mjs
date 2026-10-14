import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {REMEDY_SOURCES} from '../lib/remedy-lab.ts';

const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window});
const notes=window.RemedyFeedback.openNotes;
test('three current remedies explain purpose, funding and limits separately, without a rule wall',()=>{
 for(const route of ['consumption','investment','exports']){
  const groups=notes(route);assert.equal(groups.length,3);assert.equal(groups[0].title,'这招在试什么？');assert.equal(groups[0].pages.length,route==='consumption'?3:1);
  assert.equal(groups[1].pages.length,route==='consumption'?3:2);assert.equal(groups[2].pages.length,2);
  const text=groups.flatMap(g=>g.pages).join('\n');for(const g of groups)for(const page of g.pages)assert(page.length<=130,route);
  for(const bound of ['基础产出50份','家庭清单30份','基础工资20枚','生产支出15枚','已有钱包','不设固定天数','已发生的债务','余额不是利润','物量不等于马克思所说的价值'])assert(text.includes(bound),route+' '+bound);
  if(route==='consumption'){assert.match(text,/每次20%/);assert.match(text,/不是现实利率/);assert.match(text,/银行不创造新钱/);assert.match(text,/消费增长.*消费主义/);assert.match(text,/需要、消费愿望与支付能力不是一回事/);assert.match(text,/借贷也不必然酿成危机/);assert.match(text,/不测量广告或文化影响/);}
  else{assert.match(text,/120枚/);assert.match(text,/不每天重置/);assert.match(text,/不证明|不等于现实/);}
  if(route==='investment'){assert.match(text,/交付后.*维护/);assert.match(text,/不会撤销已到货/);}
  if(route==='exports'){assert.match(text,/全球净出口合计为零/);assert.match(text,/不等于贸易额不能增长/);}
 }
 assert.equal(notes('missing').length,0);
});
test('remedy sources distinguish narrative, statistical research and actual access scope',()=>{
 assert.equal(REMEDY_SOURCES.length,6);assert(REMEDY_SOURCES.every(s=>s.access&&s.note&&s.url.startsWith('https://')));
 assert.match(REMEDY_SOURCES[0].access,/用户提供/);assert.match(REMEDY_SOURCES[2].access,/403/);assert.match(REMEDY_SOURCES[3].note,/54个经济体.*1990—2015/);assert.match(REMEDY_SOURCES[4].note,/经常账户与净出口不是同一个指标/);assert.match(REMEDY_SOURCES[5].access,/未精读完整报告/);
});
