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

test('five-page guide states the immediate consequences and excludes removed penalties',()=>{
 const html=readFileSync(new URL('../public/assets/market-duel/battle.html',import.meta.url),'utf8');
 const guide=html.slice(html.indexOf('<dialog id="opening-guide"'),html.indexOf('<dialog id="detail"'));
 assert.equal((guide.match(/data-opening-page="/g)||[]).length,5);
 for(const rule of ['开局3位厨师','一次付8枚','当天生效、不停工','不改人数','每人加减1枚','产量不变','免费留到以后','不收保管费','不坏损'])assert(guide.includes(rule),rule);
 assert.doesNotMatch(guide,/明天上班|明天生效|旧炉数|解聘补偿|第三天坏掉/);
});

test('the final guide page preserves manual turns and explains the single daily account',()=>{
 const html=readFileSync(new URL('../public/assets/market-duel/battle.html',import.meta.url),'utf8');
 const page=html.split('<section data-opening-page="4"')[1].split('</section>')[0];
 assert.match(page,/1 回合 = 1 天/);assert.equal((page.match(/<li>/g)||[]).length,4);
 for(const rule of ['每回合只能选一项','由你点击继续','当天生效','固定5枚和当次设备费'])assert(page.includes(rule));
 assert.doesNotMatch(page,/下回合|停工|补偿/);
 const ui=readFileSync(new URL('../public/assets/market-duel/course-game.mjs',import.meta.url),'utf8');
 assert.match(ui,/openingRequired\(\)\?'开始第一回合 →':'回到店里 →'/);
});

test('price, wages and capacity are introduced separately before the first move',()=>{
 const html=readFileSync(new URL('../public/assets/market-duel/battle.html',import.meta.url),'utf8');
 const page=index=>html.split('<section data-opening-page="'+index+'"')[1].split('</section>')[0];
 assert.match(page(0),/id="opening-shop-scene"/);assert.match(page(0),/每天12位顾客/);
 assert.match(page(1),/面包售价/);assert.match(page(1),/每人工资/);assert.match(page(1),/普通炉产能/);
 assert.match(page(2),/产能当天增加6个/);assert.match(page(2),/8枚/);
 assert.match(page(3),/当前几位厨师，工资单就加减几枚/);
 assert.match(page(4),/opening-example/);
});
