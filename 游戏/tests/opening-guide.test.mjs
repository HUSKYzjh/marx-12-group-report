import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {equipmentWorld,equipmentRound,openingTradeExample} from '../public/assets/market-duel/equipment-model.mjs';

test('opening sales example uses real costs, including unsold storage',()=>{
 const world=equipmentWorld(),before=structuredClone(world);
 const actual=equipmentRound(world,'hold','steady');
 assert.deepEqual(openingTradeExample(6),{sold:6,quantity:6,revenue:18,operating:11,storage:0,change:7});
 assert.equal(openingTradeExample(6).change,actual.shops[0].cash-world.shops[0].cash);
 for(let sold=0;sold<=6;sold++){
  const sample=openingTradeExample(sold);
  assert.equal(sample.change,sold*3-11-(sold<6?1:0));
  assert(Object.values(sample).every(Number.isInteger));
 }
 assert.equal(openingTradeExample(4).change,0);
 assert.equal(openingTradeExample(0).change,-12);
 assert.equal(openingTradeExample(-1).sold,0);
 assert.equal(openingTradeExample(7).sold,6);
 assert.throws(()=>openingTradeExample(1.5));
 assert.deepEqual(world,before,'trying hypothetical sales never changes the world');
});

test('opening guide keeps decision costs and timing, not duplicate narration',()=>{
 const html=readFileSync(new URL('../public/assets/market-duel/battle.html',import.meta.url),'utf8');
 const guide=html.slice(html.indexOf('<dialog id="opening-guide"'),html.indexOf('<dialog id="detail"'));
 for(const rule of ['两家各有 36','每天先付 11','先买便宜的','2 人做 12 个','另付一天工资补偿','本回合</b><span>改价；付设备款或补偿，升级时停工','下回合</b><span>新炉到位，人员和工资调整生效','每回合只能选一项','第三天坏掉'])assert(guide.includes(rule),rule);
 assert.doesNotMatch(guide,/按原计划开店|昨天的安排也照办/,'self-evident controls do not need duplicate prose');
 assert.doesNotMatch(guide,/一台旧炉、三位厨师，每天做 6 个面包|算出能赚多少|读完说明不会开店|炉子能加速/);
 assert.doesNotMatch(guide,/<ol class="opening-topics"/,'the page count and title already identify the current rule');
 const plain=guide.replace(/<[^>]*>/g,'').replace(/\s/g,'');
 assert(plain.length<590,'keep the five introductory pages concise');
});

test('the final popup explains turn-based decisions, settlement and manual progression',()=>{
 const html=readFileSync(new URL('../public/assets/market-duel/battle.html',import.meta.url),'utf8');
 const page=html.split('<section data-opening-page="4"')[1].split('</section>')[0];
 assert.match(page,/回合制对决：1 回合 = 1 天。不用抢时间/);
 assert.match(page,/<ol class="opening-round-flow"/);
 assert.equal((page.match(/<li>/g)||[]).length,4);
 for(const item of ['选一项策略','自动经营','查看结果','进入下一回合','每回合只能选一项','由你点击继续','本回合','下回合','升级时停工'])assert(page.includes(item));
 assert.doesNotMatch(page,/今天出招，明天到货/);
 const ui=readFileSync(new URL('../public/assets/market-duel/course-game.mjs',import.meta.url),'utf8');
 assert.match(ui,/openingRequired\(\)\?'开始第一回合 →':'回到店里 →'/);
});

test('background, three-item price table, one-off measures and recurring changes use separate pages',()=>{
 const html=readFileSync(new URL('../public/assets/market-duel/battle.html',import.meta.url),'utf8');
 const background=html.split('<section data-opening-page="0"')[1].split('</section>')[0];
 const pricing=html.split('<section data-opening-page="1"')[1].split('</section>')[0];
 assert.match(background,/街上，多了一家面包店/);
 assert.match(background,/客人就这么多，生意得两家争/);
 assert.match(background,/还能一直扩张下去吗/);
 assert.match(background,/id="opening-shop-scene"/);
 assert.doesNotMatch(background,/opening-picture/,'show the actual rival shop, not two oven pictograms');
 assert.doesNotMatch(background,/coin|工资|原料|生活费|试算|先付/);
 assert.match(pricing,/物品与用工/);
 assert.match(pricing,/<table class="opening-price-table">/);
 assert.equal((pricing.match(/data-opening-rule=/g)||[]).length,3);
 assert.doesNotMatch(pricing,/data-opening-rule="(?:upgrade|fire|price|wage)"|<details/);
 const once=html.split('<section data-opening-page="2"')[1].split('</section>')[0];
 const daily=html.split('<section data-opening-page="3"')[1].split('</section>')[0];
 const rules=html.split('<section data-opening-page="4"')[1].split('</section>')[0];
 assert.match(once,/一次性措施/);assert.match(daily,/日常调整/);
 assert.equal((once.match(/data-opening-rule=/g)||[]).length,2);assert.equal((daily.match(/data-opening-rule=/g)||[]).length,2);
 for(const label of ['招募一名工人','无招聘费；明天上班','每人每天 · 工资'])assert(pricing.includes(label));
 const row=id=>html.split('<tr data-opening-rule="'+id+'">')[1].split('</tr>')[0];
 for(const [id,amount,unit] of [['bread',3,'每个 · 售价'],['buy',10,'每台 · 一次性'],['hire',2,'每人每天 · 工资']]){assert.match(row(id),new RegExp('<td>'+amount+' '));assert(row(id).includes(unit));}
 assert.match(row('upgrade'),/8 × 旧炉数/);assert.match(row('upgrade'),/一次性投资 · 停工1天/);
 assert.match(row('fire'),/1 天工资/);
 assert.match(row('wage'),/明天生效/);
 assert.match(rules,/<details class="opening-extra"><summary>试算一天的收支/);
 assert.match(rules,/opening-example/);
 const source=readFileSync(new URL('../public/assets/market-duel/course-game.mjs',import.meta.url),'utf8');
 assert.equal((html.match(/data-opening-page="/g)||[]).length,5,'the opening has five separate instruction pages');
 assert.match(source,/querySelectorAll\('\[data-opening-worker\]'\)/);
 assert.match(source,/ownerMarkup\(atlas,1,newcomer\)/);
 assert.match(source,/\[4,5,6\]\.map/);
 assert.match(source,/asset\('bread-rack'\)/);
 const css=readFileSync(new URL('../public/assets/market-duel/course.css',import.meta.url),'utf8');
 assert.match(css,/[\s\S]*data-opening-page="0"[\s\S]*font-size:18px/);
});
