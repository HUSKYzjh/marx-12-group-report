import test from 'node:test';
import assert from 'node:assert/strict';
import {courseMenu,shortMoveLabel} from '../public/assets/market-duel/course-menu.mjs';
import {initialCourse,courseMoves,courseRound} from '../public/assets/market-duel/course-model.mjs';
test('all business decisions remain available once, grouped without changing accounts',()=>{
 for(const social of [false,true]){
  const state=initialCourse(true,false);if(social)state.mode='social';
  const before=structuredClone(state),moves=courseMoves(state),menu=courseMenu(moves);
  assert.deepEqual(state,before);
  assert.deepEqual([...menu.groups.flatMap(g=>g.moves),...menu.direct].map(m=>m.id).sort(),moves.map(m=>m.id).sort());
  assert.equal(menu.groups.length,3);assert.deepEqual(menu.direct.map(m=>m.id),['hold']);
  assert.equal(menu.groups[2].label,social?'人手与工资':'调人手');
 }
});
test('grouping preserves the three-day maximum and normal-business accounts',()=>{
 let normal=initialCourse(),best=initialCourse();
 for(const move of ['price-up','price-up','hold']){courseMenu(courseMoves(best));best=courseRound(best,move);normal=courseRound(normal,'hold');}
 assert.equal(best.world.shops[0].cash,87);assert.equal(normal.world.shops[0].cash,57);
});
test('old and additional actions retain an accessible fallback',()=>{
 const move={id:'future-action',name:'另一个安排'};
 assert.equal(shortMoveLabel(move),move.name);assert.equal(courseMenu([move]).groups[0].moves[0],move);
 assert.equal(shortMoveLabel({id:'hold'}),'照常营业 →');
});
