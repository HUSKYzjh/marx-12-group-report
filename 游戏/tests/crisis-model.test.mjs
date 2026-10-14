import test from 'node:test';
import assert from 'node:assert/strict';
import {
  baselineMarketAccount,
  marketAccount,
  MARKET_ASSUMPTIONS,
  RELIEF_ROUTES,
  reliefAccount,
} from '../lib/crisis-model.ts';

const close = (actual, expected) =>
  assert(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('the symmetric baseline sells all 40 units using wages and other domestic orders', () => {
  const account = baselineMarketAccount();
  assert.deepEqual(
    [
      account.output,
      account.workerDemand,
      account.ownerDemand,
      account.investmentDemand,
      account.demand,
      account.sold,
      account.unsold,
    ],
    [40, 20, 5, 15, 40, 40, 0],
  );
  for (const firm of [account.firm, ...account.otherFirms])
    assert.deepEqual(firm, {
      output: 10,
      wages: 5,
      sales: 10,
      receiptsMinusWages: 5,
    });
});

test('one firm can benefit at 30 percent while universal imitation reduces its sales advantage', () => {
  const single = marketAccount(30, 'single');
  const all = marketAccount(30, 'all');
  close(single.output, 42.5);
  close(single.workerDemand, 18);
  close(single.demand, 38);
  close(single.firm.sales, (38 * 12.5) / 42.5);
  assert(
    single.firm.receiptsMinusWages > single.baselineFirm.receiptsMinusWages,
  );
  assert(single.firm.sales > all.firm.sales);
  assert(single.firm.receiptsMinusWages > all.firm.receiptsMinusWages);
  close(all.firm.receiptsMinusWages, 5);
  close(all.unsold, 18);
  assert(
    single.otherFirms.every((firm) => firm.output === 10 && firm.wages === 5),
  );
});

test('the 50 percent case accounts for 50 output, 20 wages, 5 owner orders, 15 investment and 10 unsold', () => {
  const account = marketAccount(50, 'all');
  assert.deepEqual(
    [
      account.output,
      account.workerDemand,
      account.ownerDemand,
      account.investmentDemand,
      account.demand,
      account.sold,
      account.unsold,
    ],
    [50, 20, 5, 15, 40, 40, 10],
  );
  assert.deepEqual(account.firm, {
    output: 12.5,
    wages: 5,
    sales: 10,
    receiptsMinusWages: 5,
  });
  assert(!Object.hasOwn(account.firm, 'profit'));
});

test('high wages supply a counterexample to inevitable unsold production', () => {
  const account = marketAccount(80, 'all');
  close(account.workerDemand, 32);
  close(account.demand, 52);
  close(account.sold, 50);
  close(account.unsold, 0);
  close(account.unfilled, 2);
  close(account.inventory, 0);
});

test('two cut rounds lower wages and sales while inventory accumulates even as new surplus shrinks', () => {
  const rounds = [0, 1, 2].map((cuts) => marketAccount(50, 'all', cuts));
  const expected = [
    [50, 20, 40, 10, 10],
    [45, 16, 36, 9, 19],
    [40.5, 12.8, 32.8, 7.7, 26.7],
  ];
  for (const [i, round] of rounds.entries()) {
    [
      round.output,
      round.workersIncome,
      round.sold,
      round.unsold,
      round.inventory,
    ].forEach((value, field) => close(value, expected[i][field]));
    if (i === 0) continue;
    assert(round.unsold < rounds[i - 1].unsold);
    assert(round.inventory > rounds[i - 1].inventory);
    assert(round.firm.wages < rounds[i - 1].firm.wages);
    assert(round.firm.sales < rounds[i - 1].firm.sales);
  }
});

test('every allowed allocation conserves orders, firm sales and accumulated stock without rounding drift', () => {
  for (let share = 0; share <= 100; share += 10)
    for (const mode of ['single', 'all'])
      for (const cuts of mode === 'single' ? [0] : [0, 1, 2]) {
        const account = marketAccount(share, mode, cuts);
        const firms = [account.firm, ...account.otherFirms];
        close(
          account.demand,
          account.workerDemand + account.ownerDemand + account.investmentDemand,
        );
        close(account.output, account.sold + account.unsold);
        close(account.demand, account.sold + account.unfilled);
        close(
          firms.reduce((sum, firm) => sum + firm.sales, 0),
          account.sold,
        );
        close(
          firms.reduce((sum, firm) => sum + firm.wages, 0),
          account.workersIncome,
        );
        for (const firm of firms) {
          assert(firm.sales <= firm.output + 1e-9 && firm.sales >= 0);
          close(firm.receiptsMinusWages, firm.sales - firm.wages);
        }
        close(
          account.inventory,
          Array.from(
            { length: cuts + 1 },
            (_, period) => marketAccount(share, mode, period).unsold,
          ).reduce((a, b) => a + b, 0),
        );
        assert.deepEqual(JSON.parse(JSON.stringify(account)), account);
      }
});

test('all ending experiments independently fill the same 10-unit gap with explicit additional funding', () => {
  assert.deepEqual(
    [...RELIEF_ROUTES],
    ['consumption', 'investment', 'exports'],
  );
  for (const route of RELIEF_ROUTES)
    for (const sustained of [false, true]) {
      marketAccount(10, 'all', 2);
      const account = reliefAccount(route, sustained);
      assert.deepEqual(
        [
          account.output,
          account.workerDemand,
          account.ownerDemand,
          account.demand,
          account.sold,
          account.unsold,
        ],
        [50, 20, 5, 50, 50, 0],
      );
      close(
        account.demand,
        account.workerDemand +
          account.ownerDemand +
          account.investmentDemand +
          account.extraConsumption +
          account.exportDemand,
      );
      close(account.nextOutput, account.nextSold + account.nextUnsold);
      for (const field of [
        'cost',
        'now',
        'condition',
        'next',
        'funding',
        'label',
      ])
        assert(typeof account[field] === 'string' && account[field].length > 0);
      assert.deepEqual(JSON.parse(JSON.stringify(account)), account);
    }
  assert.match(reliefAccount('consumption', false).funding, /既有留存现金/);
  assert.match(reliefAccount('consumption', false).funding, /不减少/);
  assert.match(reliefAccount('investment', false).funding, /既有现金/);
  assert.match(reliefAccount('investment', false).funding, /资本品/);
  assert.match(reliefAccount('exports', false).funding, /境外收入/);
  assert.match(reliefAccount('exports', false).cost, /全球净出口合计为零/);
});

test('the three routes distinguish conditional continuation from automatic permanent cures', () => {
  for (const route of ['consumption', 'exports']) {
    const once = reliefAccount(route, false);
    const repeat = reliefAccount(route, true);
    assert.deepEqual(
      [once.nextOutput, once.nextDemand, once.nextSold, once.nextUnsold],
      [50, 40, 40, 10],
    );
    assert.deepEqual(
      [
        repeat.nextOutput,
        repeat.nextDemand,
        repeat.nextSold,
        repeat.nextUnsold,
      ],
      [50, 50, 50, 0],
    );
  }
  const investment = reliefAccount('investment', false);
  const matchedInvestment = reliefAccount('investment', true);
  assert.deepEqual(
    [
      investment.nextOutput,
      investment.nextDemand,
      investment.nextSold,
      investment.nextUnsold,
    ],
    [60, 50, 50, 10],
  );
  assert.deepEqual(
    [
      matchedInvestment.nextOutput,
      matchedInvestment.nextDemand,
      matchedInvestment.nextSold,
      matchedInvestment.nextUnsold,
    ],
    [60, 60, 60, 0],
  );
  assert.match(investment.condition, /下游最终消费10/);
  assert.match(investment.cost, /不另算投资诱发的工资消费/);
  assert.match(investment.cost, /不能把同一笔销售算两次/);
});

test('invalid model inputs are rejected instead of being silently coerced', () => {
  for (const share of [-10, 110, 15, 0.5, NaN, Infinity, '50', null, undefined])
    assert.throws(() => marketAccount(share, 'all'), RangeError);
  for (const mode of ['baseline', '', null, undefined])
    assert.throws(() => marketAccount(50, mode), RangeError);
  for (const cuts of [-1, 3, 0.5, NaN, Infinity, '1', null])
    assert.throws(() => marketAccount(50, 'all', cuts), RangeError);
  assert.throws(() => marketAccount(50, 'single', 1), RangeError);
  for (const route of ['tax', '', null, undefined])
    assert.throws(() => reliefAccount(route, true), RangeError);
  for (const sustained of ['true', 1, 0, null, undefined])
    assert.throws(() => reliefAccount('consumption', sustained), TypeError);
  assert.match(MARKET_ASSUMPTIONS.join(''), /不等于利润/);
  assert.match(MARKET_ASSUMPTIONS.join(''), /GDP预测/);
});
