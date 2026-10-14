import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../docs/研究报告/'+file,import.meta.url),'utf8');
test('automation report keeps the current experiment and qualifications, not two obsolete walkthroughs',()=>{
 const text=read('01_AI机器人与工资来源.txt');assert(text.length<5500);
 for(const words of ['延伸实验与旧记录','11人、120金币','一周实验','没有政府采购','任务暴露','社会主义','数据与复算说明'])assert(text.includes(words),words);
 assert(!text.includes('可选九天竞争：隔壁的低价'));assert(!text.includes('保留的六天竞争记录（不再是新开局默认玩法）'));
 for(const id of ['S1','S2','S3','S4','S5','S6','S7','S8'])assert(text.includes('['+id+']'),id);
});
test('sharing report has one current explanation, retains institutional distinctions and funded counterexamples',()=>{
 const text=read('06_收益共享与决定权.txt');assert(text.length<5000);
 for(const words of ['同一笔钱，谁分、谁决定','共88枚','现金收支差24枚','未计设备折旧','不是工资决定政治态度的普遍规律','3比3','4比2','6比0','实际把12枚付给设备商','做72、卖42、剩30','做36、卖36','做36、卖31、剩5','工资或奖金多，不会自动多出票','一股一票','一人一票','资本主义与社会主义分别怎样理解','基本矛盾','analyze-council-personal.mjs --check','analyze-council-production.mjs --check'])assert(text.includes(words),words);
 assert(!text.includes('六补充、'));assert(!text.includes('八、补充：'));assert.match(text,/旧存档保留原先/);
 for(const domain of ['mondragon-corporation.com','dol.gov','nber.org','huawei.com','xuebao.ruc.edu.cn'])assert(text.includes(domain),domain);
});
