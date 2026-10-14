import test from 'node:test';
import assert from 'node:assert/strict';
import { promiseRound } from '../lib/factory-model.ts';

test('keeping a better contract has a visible, finite reserve cost under the shock', () => {
  const relief = { pay: true, time: true, clean: false };
  const day1 = promiseRound(relief, 20, 'keep');
  const day2 = promiseRound(relief, 20, 'keep', 2);
  assert.deepEqual(
    [
      day1.account.wageEach,
      day1.account.hours,
      day1.account.surplus,
      day1.reserveLeft,
    ],
    [6, 6, -2, 6],
  );
  assert.equal(day2.reserveLeft, 4);
  assert.equal(day2.canRepeat, false);
  const quiet = promiseRound(relief, 24, 'keep', 2);
  assert.equal(quiet.account.surplus, 2);
  assert.equal(quiet.reserveLeft, 8);
});

test('renegotiation changes the actual ending contract and retains environmental choice', () => {
  const r = promiseRound(
    { pay: true, time: false, clean: true },
    20,
    'negotiate',
  );
  assert.deepEqual(
    [
      r.account.wageEach,
      r.account.hours,
      r.account.treatment,
      r.account.surplus,
    ],
    [4, 6, 4, -2],
  );
  assert.equal(r.reserveLeft, 6);
});

test('all playable combinations conserve reserve and prevent unfunded extra days', () => {
  for (let mask = 0; mask < 8; mask++)
    for (const demand of [20, 24, 32])
      for (const response of ['keep', 'negotiate']) {
        const relief = {
          pay: Boolean(mask & 1),
          time: Boolean(mask & 2),
          clean: Boolean(mask & 4),
        };
        const r = promiseRound(relief, demand, response);
        assert.equal(r.fundingGap, 0);
        assert.equal(r.reserveLeft + r.dailyDraw, 8);
        assert.equal(
          r.account.revenue,
          r.account.costs + r.account.wages + r.account.surplus,
        );
        const next = promiseRound(relief, demand, response, 2);
        assert.equal(r.canRepeat, next.fundingGap === 0);
      }
  assert.throws(
    () =>
      promiseRound({ pay: false, time: false, clean: false }, 20, 'keep', 3),
    RangeError,
  );
});
