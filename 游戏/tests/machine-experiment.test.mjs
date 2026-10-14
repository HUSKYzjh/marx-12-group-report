import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';

const bundle = await build({ entryPoints: ['lib/machine-experiment.ts'], bundle: true, write: false, platform: 'node', format: 'cjs' });
const module = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { initialMachine, machineReducer: reduce, machineAccount: account, restoreMachine, PREDICTION_QUESTIONS: qs } = module.exports;
const ready = values => values.reduce((s, value, questionIndex) => reduce(s, { type: 'PREDICT', value, questionIndex }), reduce(initialMachine(), { type: 'BEGIN' }));

test('every prediction path reaches the SAME M1 result; no opinion score or extra production', () => {
  for (const a of qs[0].choices) for (const b of qs[1].choices) for (const c of qs[2].choices) {
    const s = ready([a.value, b.value, c.value]);
    assert.equal(s.phase, 'ready');
    assert.equal(account(s).produced, 8);
    const result = reduce(s, { type: 'RUN' });
    assert.equal(account(result).produced, 16);
    assert.equal(account(result).wageEach, 4);
    assert.equal(account(result).hours, 8);
    assert.equal(account(result).surplus, 28);
    assert.strictEqual(reduce(result, { type: 'RUN' }), result);
    assert(!('score' in result));
  }
});
test('contracts each start from the new-machine baseline, rather than stacking improvements', () => {
  let s = reduce(reduce(ready(['more', 'more', 'less']), { type: 'RUN' }), { type: 'COMPARE' });
  for (let n = 0; n < 3; n++) {
    s = reduce(s, { type: 'CONTRACT', contract: 'pay' });
    assert.deepEqual([account(s).produced, account(s).wageEach, account(s).hours, account(s).surplus], [16, 6, 8, 24]);
    s = reduce(s, { type: 'CONTRACT', contract: 'time' });
    assert.deepEqual([account(s).produced, account(s).wageEach, account(s).hours, account(s).surplus], [8, 4, 4, 8]);
    s = reduce(s, { type: 'CONTRACT', contract: 'unchanged' });
    assert.deepEqual([account(s).produced, account(s).wageEach, account(s).hours, account(s).surplus], [16, 4, 8, 28]);
    const a = account(s);
    assert.equal(a.revenue - a.materials - a.equipment - a.wages, a.surplus);
  }
});
test('invalid, early and repeated events are no-ops; reload validation keeps only actual observations', () => {
  const quote = initialMachine();
  assert.strictEqual(reduce(quote, { type: 'RUN' }), quote);
  assert.strictEqual(reduce(quote, { type: 'CONTRACT', contract: 'pay' }), quote);
  const begin = reduce(quote, { type: 'BEGIN' });
  assert.strictEqual(reduce(begin, { type: 'PREDICT', questionIndex: 0, value: 'less' }), begin);
  const one = reduce(begin, { type: 'PREDICT', questionIndex: 0, value: 'more' });
  assert.strictEqual(reduce(one, { type: 'PREDICT', questionIndex: 0, value: 'more' }), one);
  assert.deepEqual(restoreMachine(JSON.stringify(one)), one);
  for (const bad of [null, 'bad json', { ...one, questionIndex: 0 }, { ...one, contract: 'pay' }, { ...quote, questionIndex: 2 },
    { ...ready(['more', 'same', 'less']), questionIndex: 0 }, { ...one, predictions: { products: 'less' } }])
    assert.deepEqual(restoreMachine(bad), quote);
  const result = reduce(ready(['more', 'same', 'same']), { type: 'RUN' });
  assert.deepEqual(restoreMachine(result), result);
  assert.deepEqual(reduce(result, { type: 'RESTART' }), quote);
});
