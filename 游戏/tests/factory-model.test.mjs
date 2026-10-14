import test from 'node:test';
import assert from 'node:assert/strict';
import {
  factoryAccount,
  marketRound,
  reliefAccount,
  rivalPlans,
  accountChange,
} from '../lib/factory-model.ts';
import { storySteps, storyEvidence } from '../lib/story-content.ts';
const close = (a, b) => assert(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
test('one consistent coin account connects baseline, technology and distribution', () => {
  const b = factoryAccount(),
    t = factoryAccount({ technology: true }),
    w = factoryAccount({ technology: true, wageEach: 6 }),
    h = factoryAccount({ technology: true, hours: 4 });
  assert.deepEqual(
    [b.produced, b.revenue, b.costs, b.wages, b.surplus],
    [8, 24, 10, 8, 6],
  );
  assert.deepEqual(
    [t.produced, t.revenue, t.costs, t.wages, t.surplus],
    [16, 48, 12, 8, 28],
  );
  close(w.wageEach, 6);
  close(w.surplus, 24);
  close(h.hours, 4);
  close(h.surplus, 8);
  for (const technology of [false, true])
    for (const hours of [4, 6, 8])
      for (const price of [1, 2, 3])
        for (const wageEach of [4, 6, 8])
          for (const clean of [false, true]) {
            const p = factoryAccount({
              technology,
              hours,
              price,
              wageEach,
              clean,
            });
            close(p.revenue, p.costs + p.wages + p.surplus);
            assert(p.burden >= 0);
          }
});
test('market orders conserve buyers and do not exceed either factory supply', () => {
  for (let ours = 0; ours <= 16; ours++)
    for (let theirs = 0; theirs <= 16; theirs++)
      for (const p of [1, 2, 3])
        for (const q of [1, 2, 3])
          for (const buyers of [0, 12, 24, 32, 40]) {
            const m = marketRound(ours, theirs, p, q, buyers);
            close(m.ours.sold + m.theirs.sold, Math.min(ours + theirs, buyers));
            assert(m.ours.sold <= ours && m.theirs.sold <= theirs);
            assert(m.ours.sold >= 0 && m.theirs.sold >= 0);
            close(m.totalUnsold, ours + theirs - m.ours.sold - m.theirs.sold);
          }
});
test('price cuts can sell more yet produce lower surplus', () => {
  const stay = marketRound(16, 16, 3),
    cut = marketRound(16, 16, 1);
  close(stay.ours.sold, 8);
  close(stay.ours.surplus, 4);
  close(cut.ours.sold, 16);
  close(cut.ours.surplus, -4);
});
test('24-buyer branch produces the stated 6/8/2/4 payoff matrix', () => {
  const ll = marketRound(12, 12),
    hl = marketRound(16, 12),
    lh = marketRound(12, 16),
    hh = marketRound(16, 16);
  assert.deepEqual(
    [ll.ours.surplus, hl.ours.surplus, lh.ours.surplus, hh.ours.surplus],
    [6, 8, 2, 4],
  );
  assert(
    hl.ours.surplus > ll.ours.surplus && hh.ours.surplus > lh.ours.surplus,
  );
  assert(
    ll.ours.surplus + ll.theirs.surplus > hh.ours.surplus + hh.theirs.surplus,
  );
});
test('32-buyer counterexample removes unsold goods and the collective disadvantage', () => {
  const a = marketRound(12, 12, 2, 2, 32),
    b = marketRound(16, 16, 2, 2, 32);
  close(b.totalUnsold, 0);
  close(b.ours.surplus, 12);
  assert(b.ours.surplus > a.ours.surplus);
  assert.deepEqual([...rivalPlans], [12, 16, 16]);
});
test('all 8 policy combinations account for wages, time, treatment and possible deficits', () => {
  for (const buyers of [24, 32])
    for (const pay of [false, true])
      for (const time of [false, true])
        for (const clean of [false, true]) {
          const p = reliefAccount({ pay, time, clean }, buyers);
          close(p.revenue, p.costs + p.wages + p.surplus);
          close(p.wageEach, pay ? 6 : 4);
          close(p.hours, time ? 6 : 8);
          close(p.treatment, clean ? 4 : 0);
          assert(p.sold <= p.produced);
        }
  close(reliefAccount({ pay: true, time: true, clean: true }).surplus, -2);
  close(reliefAccount({ pay: true, time: true, clean: false }).surplus, 2);
});
test('invalid settings are rejected; all eight chapters explain their assumptions and evidence', () => {
  for (const r of [
    { price: 0 },
    { hours: 9 },
    { sold: 9 },
    { wageEach: NaN },
    { planned: -1 },
  ])
    assert.throws(() => factoryAccount(r));
  for (const r of [
    [17, 16],
    [16, -1],
    [12.5, 16],
    [16, 16, 2, 2, 24.5],
    [16, 16, Infinity],
  ])
    assert.throws(() => marketRound(...r));
  assert.equal(storySteps.length, 8);
  assert.equal(storyEvidence.length, 8);
  storySteps.forEach((s) => {
    assert(s.assumption.length > 20);
    assert(s.boundary.length > 20);
  });
});
test('matched chapter baselines isolate allocation changes from the technology gain', () => {
  const technology = factoryAccount({ technology: true });
  const pay = accountChange(
    technology,
    factoryAccount({ technology: true, wageEach: 6 }),
  );
  assert.deepEqual(
    [pay.revenue, pay.costs, pay.wages, pay.surplus],
    [0, 0, 4, -4],
  );
  const time = accountChange(
    technology,
    factoryAccount({ technology: true, hours: 4 }),
  );
  assert.deepEqual([time.hours, time.sold, time.surplus], [-4, -8, -20]);
  for (const buyers of [24, 32])
    for (const pay of [false, true])
      for (const clean of [false, true]) {
        const before = reliefAccount({ pay, time: false, clean }, buyers);
        const after = reliefAccount({ pay, time: true, clean }, buyers);
        const d = accountChange(before, after);
        assert.deepEqual(
          [d.hours, d.costs, d.sold, d.surplus],
          buyers === 24 ? [-2, -2, 0, 2] : [-2, -2, -4, -6],
        );
        close(d.revenue - d.costs - d.wages, d.surplus);
      }
});
