import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { rawSourcePlugin } from '../scripts/raw-source.mjs';
import {
  FIRMS, initialPrologue, prologueReducer as reduce, expressions, plan,
  restorePrologue, visiblePlans, ENDING_PAIRS, PROLOGUE_STORAGE_KEY,
} from '../lib/prologue-state.ts';

const start = () => [{type:'START'},{type:'CONTINUE_BAKERY'},{type:'CONFIRM_BAKERY_WAGE'},{type:'OPEN_ALLOCATION_COMPARE'}].reduce(reduce,initialPrologue());
test('all eleven shares give complementary plans and five moods on BOTH sides', () => {
  const seenLabor = new Set(), seenOwner = new Set();
  for (let share = 0; share <= 100; share += 10) {
    const p = plan(share), face = expressions(share);
    assert.equal(p.laborShare + p.retainedShare, 100);
    assert.equal(face.labor + face.owner, 0);
    seenLabor.add(face.labor); seenOwner.add(face.owner);
  }
  assert.equal(seenLabor.size, 5); assert.equal(seenOwner.size, 5);
  for (const invalid of [-10, 110, 9, 50.1, NaN, Infinity]) assert.throws(() => plan(invalid));
});
test('only active company changes; limits are disabled no-ops; original snapshot is immutable', () => {
  let state = start();
  for (const firm of FIRMS) {
    state = reduce(state, { type: 'SELECT_FIRM', firmId: firm.id });
    const before = structuredClone(state);
    const unchanged = FIRMS.filter(f => f.id !== firm.id);
    for (let n = 0; n < 5; n++) state = reduce(state, { type: 'ADJUST_SHARE', delta: -10 });
    assert.equal(state.allocationPlans[firm.id].laborShare, 0);
    assert.strictEqual(reduce(state, { type: 'ADJUST_SHARE', delta: -10 }), state);
    for (let n = 0; n < 10; n++) state = reduce(state, { type: 'ADJUST_SHARE', delta: 10 });
    assert.equal(state.allocationPlans[firm.id].laborShare, 100);
    assert.strictEqual(reduce(state, { type: 'ADJUST_SHARE', delta: 10 }), state);
    for (const f of unchanged) assert.deepEqual(state.allocationPlans[f.id], before.allocationPlans[f.id]);
    assert.equal(before.allocationPlans[firm.id].laborShare, 50);
  }
  assert.deepEqual(state.adjustedFirmIds.sort(), ['A', 'B', 'C', 'D']);
  assert.strictEqual(reduce(state, { type: 'ADJUST_SHARE', delta: 20 }), state);
});
test('one allocation can enter the network; optional firm selection determines whose worker is followed', () => {
  for (const firm of FIRMS) {
    let state = reduce(start(), { type: 'SELECT_FIRM', firmId: firm.id });
    state = reduce(state, { type: 'ADJUST_SHARE', delta: 10 });
    state = reduce(state, { type: 'SHOW_NETWORK' });
    assert.equal(state.scene, 'network');
    assert.equal(state.customerFirmId, firm.id);
    assert.deepEqual(state.adjustedFirmIds, [firm.id]);
    for (const other of FIRMS.filter(f => f.id !== firm.id)) assert.equal(state.allocationPlans[other.id].laborShare, 50);
  }
});
test('network changes and conditional demonstration cannot rewrite personal choices', () => {
  let state = reduce(start(), { type: 'ADJUST_SHARE', delta: 10 });
  const personal = structuredClone(state.allocationPlans);
  state = reduce(state, { type: 'SHOW_NETWORK' });
  state = reduce(state, { type: 'SHOW_DEMO' });
  assert.equal(state.demoActive, true);
  assert.equal(visiblePlans(state).A.laborShare, 20);
  assert.deepEqual(state.allocationPlans, personal);
  assert.strictEqual(reduce(state, { type: 'ADJUST_SHARE', delta: -10 }), state);
  state = reduce(state, { type: 'SELECT_CUSTOMER', firmId: 'D' });
  assert.equal(state.customerFirmId, 'D');
  for (const relation of ['cooperation', 'ownership', 'control', 'payment']) {
    state = reduce(state, { type: 'SHOW_RELATION', relation });
    assert.deepEqual(visiblePlans(state), personal);
  }
  state = reduce(state, { type: 'BACK_TO_ALLOCATION' });
  assert.equal(state.demoActive, false);
  assert.deepEqual(state.allocationPlans, personal);
});
test('concept precedes independent ending; navigation never fabricates a crisis', () => {
  for (const target of [0, 50, 100]) {
    let state = start();
    while (state.allocationPlans.A.laborShare !== target)
      state = reduce(state, { type: 'ADJUST_SHARE', delta: target < 50 ? -10 : 10 });
    assert.strictEqual(reduce(state, { type: 'SHOW_ENDING' }), state);
    state = reduce(state, { type: 'SHOW_NETWORK' });
    state = reduce(state, { type: 'SHOW_CONCEPT' });
    assert.equal(state.definitionShown, true);
    state = reduce(state, { type: 'SHOW_ENDING' });
    assert.equal(state.scene, 'ending');
    assert.strictEqual(reduce(state, { type: 'ENTER_ROUTES', entrance: 'individual' }), state);
    state = reduce(state, { type: 'NEXT_PAIR', expectedIndex: 0 });
    const afterOne = state;
    assert.strictEqual(reduce(state, { type: 'NEXT_PAIR', expectedIndex: 0 }), afterOne);
    state = reduce(state, { type: 'NEXT_PAIR', expectedIndex: 1 });
    state = reduce(state, { type: 'ENTER_ROUTES', entrance: 'enterprise' });
    assert.equal(state.scene, 'routes'); assert.equal(state.entrance, 'enterprise');
    assert.equal(state.prologueStatus, 'observed');
    assert.equal(state.allocationPlans.A.laborShare, target);
    assert(!('unemployment' in state)); assert(!('profit' in state));
  }
  assert.deepEqual(ENDING_PAIRS.map(p => p.father), ['家里没钱买面包。', '我失业了，没了这份工资。', '店里说面包太多，卖不出去，停了我的活。']);
});
test('purchase comparisons and a missing production step remain separate from personal allocation', () => {
  let state = reduce(start(), { type: 'ADJUST_SHARE', delta: 10 });
  const personal = structuredClone(state.allocationPlans);
  state = reduce(state, { type: 'SHOW_NETWORK' });
  for (const laborShare of [20, 80]) {
    state = reduce(state, { type: 'SHOW_DEMO', laborShare });
    assert.equal(visiblePlans(state).A.laborShare, laborShare);
    assert.deepEqual(state.allocationPlans, personal);
    assert.deepEqual(restorePrologue(JSON.stringify(state)), state);
  }
  state = reduce(state, { type: 'SHOW_RELATION', relation: 'cooperation' });
  assert.equal(state.demoActive, false);
  assert.strictEqual(reduce(state, { type: 'SHOW_DEMO', laborShare: 80 }), state);
  state = reduce(state, { type: 'TOGGLE_WORK' });
  assert.equal(state.workPaused, true);
  assert.deepEqual(state.allocationPlans, personal);
  state = restorePrologue(JSON.stringify(state));
  assert.equal(state.workPaused, true);
  state = reduce(state, { type: 'TOGGLE_WORK' });
  assert.equal(state.workPaused, false);
  state = reduce(state, { type: 'SHOW_RELATION', relation: 'ownership' });
  assert.strictEqual(reduce(state, { type: 'TOGGLE_WORK' }), state);
  assert.deepEqual(state.allocationPlans, personal);
  const oldSnapshot = structuredClone(state);
  delete oldSnapshot.demoLaborShare; delete oldSnapshot.workPaused;
  assert.equal(restorePrologue(oldSnapshot).allocationPlans.A.laborShare, 60);
});
test('finishing the dialogue opens one role choice, without silently choosing a route', () => {
  let state = reduce(start(), { type: 'SHOW_NETWORK' });
  state = reduce(state, { type: 'SHOW_CONCEPT' });
  state = reduce(state, { type: 'SHOW_ENDING' });
  assert.strictEqual(reduce(state, { type: 'FINISH_PROLOGUE' }), state);
  state = reduce(state, { type: 'SHOW_ALL' });
  state = reduce(state, { type: 'FINISH_PROLOGUE' });
  assert.equal(state.scene, 'routes'); assert.equal(state.entrance, null);
  assert.equal(state.prologueStatus, 'observed');
  assert.strictEqual(reduce(state, { type: 'FINISH_PROLOGUE' }), state);
});
test('skip/all dialogue/restore preserve records without pretending four decisions or erasing legacy data', () => {
  const a = reduce(start(), { type: 'ADJUST_SHARE', delta: 10 });
  const skip = reduce(a, { type: 'SKIP_PROLOGUE' });
  assert.equal(skip.prologueStatus, 'skipped');
  assert.deepEqual(skip.adjustedFirmIds, ['A']);
  assert.deepEqual(restorePrologue(JSON.stringify(skip)), skip);
  for (const bad of [null, 'not json', { businessChoice: 'retain' }, { ...a, version: 'old' },
    { ...a, allocationPlans: { ...a.allocationPlans, A: { laborShare: 60, retainedShare: 60 } } },
    { ...a, scene: 'ending', definitionShown: false }, { ...a, adjustedFirmIds: ['X'] },
    { ...a, endingPairIndex: 3 }]) assert.deepEqual(restorePrologue(bad), initialPrologue());
  let state = reduce(reduce(a, { type: 'SHOW_NETWORK' }), { type: 'SHOW_CONCEPT' });
  state = reduce(reduce(state, { type: 'SHOW_ENDING' }), { type: 'SHOW_ALL' });
  assert.equal(state.endingPairIndex, 0); // seeing all is not three sequential NEXT_PAIR events
  state = reduce(state, { type: 'ENTER_ROUTES', entrance: 'individual' });
  assert.equal(state.scene, 'routes');
  assert.equal(PROLOGUE_STORAGE_KEY, 'technology-dividend:prologue:v1');
});
test('source-based entry embeds the original engine; legacy art still has five separate moods', async () => {
  const bundle = await build({ stdin: { contents: `
    import React from 'react'; import {renderToString} from 'react-dom/server';
    import Story from './components/playable-story';
    import {ProloguePerson} from './components/prologue-art';
    export const initial=renderToString(React.createElement(Story));
    export const moods=[-2,-1,0,1,2].map(m=>renderToString(React.createElement(ProloguePerson,{mood:m,label:'工人',hat:13})));
  `, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, platform: 'node', format: 'cjs', plugins: [rawSourcePlugin] });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
  assert.match(module.exports.initial, /data-testid="trust-frame"/);
  assert.match(module.exports.initial, /function Slideshow/);
  assert.match(module.exports.initial, /function IteratedPeep/);
  assert.match(module.exports.initial, /pixi.js - v4.4.3/);
  assert.match(module.exports.initial, /一个关于机器、钱与人的可玩故事/);
  assert.match(module.exports.initial, /function SplashPeep/);
  assert.doesNotMatch(module.exports.initial, /下一家公司 →/);
  assert.match(module.exports.initial, /你们的产品上个季度销量不错/);
  assert.match(module.exports.initial, /iterated_peep.png/);
  assert.doesNotMatch(module.exports.initial, /假设公司这次多赚/);
  assert.equal(new Set(module.exports.moods).size, 5);
  module.exports.moods.forEach(html => { assert.match(html, /pg-face/); assert.match(html, /pg-person-pose/); });
});
