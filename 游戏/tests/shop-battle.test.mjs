import test from 'node:test';
import assert from 'node:assert/strict';
import {initialBattle, round, money, ACTIONS, moveIssue, restoreBattle, replay} from '../public/assets/market-duel/battle-model.mjs';

test('cash and dated goods balance across varied nine-day decisions', () => {
  for (let seed = 1; seed <= 120; seed++) {
    let state = initialBattle(seed);
    for (let day = 0; day < 9; day++) {
      const available = ACTIONS.filter(a => !moveIssue(state, a)), action = available[(seed * 11 + day * 7) % available.length], before = structuredClone(state);
      const after = round(state, action), r = after.history.at(-1);
      assert.deepEqual(state, before, 'a preview/round cannot mutate previous save');
      assert.equal(money(after), 120);
      for (let id = 0; id < 2; id++) {
        assert.equal(after.shops[id].bread.length, state.shops[id].bread.length - r.spoiled[id] + r.made[id] - r.sold[id]);
        const incoming = r.receipts.filter(p => p.to === 'f' + id).reduce((n, p) => n + p.amount, 0), outgoing = r.receipts.filter(p => p.from === 'f' + id).reduce((n, p) => n + p.amount, 0);
        assert.equal(after.shops[id].cash, state.shops[id].cash + incoming - outgoing);
      }
      assert.equal(r.visits.length, 11); assert.equal(new Set(r.visits.map(v => v.id)).size, 11);
      for (const v of r.visits.filter(v => v.bought)) assert(r.receipts.some(p => p.reason === '买面包' && p.from === (v.id === 10 ? 'supplier' : 'p' + v.id)));
      state = after;
    }
    assert.deepEqual(restoreBattle(state), state);
    assert.throws(() => round(state, 'hold'));
  }
});
test('price, wages and production choices have distinct delayed outcomes', () => {
  const hold = replay(Array(9).fill('hold'));
  const cut = replay(['price', 'labor', 'oven', 'labor', ...Array(5).fill('hold')]);
  const slow = replay(['price', 'labor', 'oven', 'labor', 'oven', ...Array(4).fill('hold')]);
  assert(hold.history[3].stopped[0]);
  assert(cut.history.filter(r => r.stopped[0]).length < hold.history.filter(r => r.stopped[0]).length);
  assert.equal(cut.history[3].poor, 0, 'laid-off workers initially spend savings');
  assert(cut.history.at(-1).poor > 0); assert(cut.shops.some(f => f.bread.length));
  assert.equal(slow.history[4].wages[0], cut.history[4].wages[0]);
  assert.equal(slow.history[4].made[0], 6); assert.equal(cut.history[4].made[0], 12);
  assert(slow.shops[0].bread.length < cut.shops[0].bread.length);
});
test('forged saves fail and replay preserves the same customers', () => {
  const s = replay(['price', 'labor', 'oven']);
  assert.deepEqual(replay(s.history.map(h => h.action)), s);
  const forged = structuredClone(s); forged.shops[0].cash++; assert.equal(restoreBattle(forged), null);
  assert.equal(restoreBattle(null), null);
  const poor = replay(Array(4).fill('hold')); assert(moveIssue(poor, 'oven')); assert.throws(() => round(poor, 'oven'));
});
