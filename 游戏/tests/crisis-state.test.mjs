import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialPrologue, prologueReducer as reduce, restorePrologue, PROLOGUE_STAGES,
} from '../lib/prologue-state.ts';
import { marketAccount, RELIEF_ROUTES } from '../lib/crisis-model.ts';

const start = () => [{type:'START'},{type:'CONTINUE_BAKERY'},{type:'CONFIRM_BAKERY_WAGE'},{type:'OPEN_ALLOCATION_COMPARE'}].reduce(reduce,initialPrologue());
const market = () => reduce(start(), { type: 'SHOW_MARKET' });
const allFirms = () => reduce(market(), { type: 'OTHER_FIRMS_COPY' });
const ending = () => {
  let state = reduce(allFirms(), { type: 'MARKET_CONTINUE' });
  state = reduce(state, { type: 'SHOW_CONCEPT' });
  return reduce(state, { type: 'SHOW_ENDING' });
};
const relief = () => reduce(reduce(ending(), { type: 'SHOW_ALL' }), { type: 'SHOW_RELIEF' });
const account = state => marketAccount(
  state.marketDemoShare ?? state.allocationPlans[state.activeFirmId].laborShare,
  state.marketMode, state.marketCuts,
);

test('returning home preserves decisions and saved experimental conditions', () => {
  let state = reduce(start(), { type: 'ADJUST_SHARE', delta: 10 });
  state = reduce(reduce(state, { type: 'SHOW_MARKET' }), { type: 'OTHER_FIRMS_COPY' });
  state = reduce(state, { type: 'MARKET_CUT' });
  const home = reduce(state, { type: 'SHOW_HOME' });
  assert.deepEqual(home, { ...state, scene: 'opening' });
  assert.deepEqual(restorePrologue(JSON.stringify(home)), home);
  assert.equal(reduce(home, { type: 'START' }).allocationPlans.A.laborShare, 60);
});

test('each chapter can be opened directly, refreshed and continued without clearing choices', () => {
  const chosen = reduce(start(), { type: 'ADJUST_SHARE', delta: 10 });
  for (let stage = 0; stage < PROLOGUE_STAGES.length; stage++) {
    const next = reduce(chosen, { type: 'JUMP_STAGE', stage });
    if(['epilogue','assumptions'].includes(PROLOGUE_STAGES[stage].scene)){assert.strictEqual(next,chosen);continue;}
    assert.equal(next.scene, PROLOGUE_STAGES[stage].scene);
    assert.deepEqual(next.allocationPlans, chosen.allocationPlans);
    assert.deepEqual(next.adjustedFirmIds, chosen.adjustedFirmIds);
    assert.equal(next.prologueStatus, chosen.prologueStatus);
    assert.deepEqual(restorePrologue(JSON.stringify(next)), next);
    if (next.scene === 'market') assert.equal(reduce(next, { type: 'OTHER_FIRMS_COPY' }).marketMode, 'all');
    if (next.scene === 'network') assert.equal(reduce(next, { type: 'SHOW_CONCEPT' }).scene, 'concept');
    if (next.scene === 'ending') assert.equal(reduce(next, { type: 'NEXT_PAIR', expectedIndex: 0 }).endingPairIndex, 1);
    if (next.scene === 'relief') assert.equal(reduce(next, { type: 'CHOOSE_RELIEF', route: 'consumption' }).reliefRoute, 'consumption');
  }
  for (const stage of [-1, PROLOGUE_STAGES.length, 2.5, NaN, Infinity, '1'])
    assert.strictEqual(reduce(chosen, { type: 'JUMP_STAGE', stage }), chosen);
});

test('market transitions accept only their intended scenes and do not reveal the concept early', () => {
  const opening = initialPrologue();
  for (const action of [
    { type: 'SHOW_MARKET' }, { type: 'OTHER_FIRMS_COPY' }, { type: 'MARKET_CUT' },
    { type: 'MARKET_TRY', laborShare: 20 }, { type: 'MARKET_RESTORE' }, { type: 'MARKET_CONTINUE' },
  ]) assert.strictEqual(reduce(opening, action), opening);
  let state = market();
  assert.equal(state.scene, 'market');
  assert.equal(state.marketMode, 'single');
  assert.equal(state.marketCuts, 0);
  assert.equal(state.marketDemoShare, null);
  assert.equal(state.definitionShown, false);
  for (const action of [
    { type: 'SHOW_MARKET' }, { type: 'MARKET_CUT' }, { type: 'MARKET_TRY', laborShare: 20 },
    { type: 'MARKET_RESTORE' }, { type: 'SHOW_CONCEPT' }, { type: 'SHOW_ENDING' },
  ]) assert.strictEqual(reduce(state, action), state);
  state = reduce(state, { type: 'OTHER_FIRMS_COPY' });
  assert.strictEqual(reduce(state, { type: 'OTHER_FIRMS_COPY' }), state);
  assert.strictEqual(reduce(state, { type: 'MARKET_TRY', laborShare: 50 }), state);
  state = reduce(state, { type: 'MARKET_CONTINUE' });
  assert.equal(state.scene, 'network');
  assert.equal(state.relationFocus, 'cooperation');
  assert.equal(state.definitionShown, false);
  assert.strictEqual(reduce(state, { type: 'MARKET_CONTINUE' }), state);
  state = reduce(state, { type: 'SHOW_CONCEPT' });
  assert.equal(state.definitionShown, true);
});

test('only unsold output permits a cut and no more than two cuts can occur', () => {
  let state = allFirms();
  for (let expected = 1; expected <= 2; expected++) {
    assert(account(state).unsold > 0);
    state = reduce(state, { type: 'MARKET_CUT' });
    assert.equal(state.marketCuts, expected);
  }
  assert.strictEqual(reduce(state, { type: 'MARKET_CUT' }), state);
  for (const share of [80, 90, 100]) {
    let clearing = start();
    while (clearing.allocationPlans.A.laborShare < share)
      clearing = reduce(clearing, { type: 'ADJUST_SHARE', delta: 10 });
    clearing = reduce(reduce(clearing, { type: 'SHOW_MARKET' }), { type: 'OTHER_FIRMS_COPY' });
    assert.equal(account(clearing).unsold, 0);
    assert.strictEqual(reduce(clearing, { type: 'MARKET_CUT' }), clearing);
  }
});

test('20/80 experiments reset cuts while leaving every personal allocation intact', () => {
  let state = reduce(start(), { type: 'SELECT_FIRM', firmId: 'C' });
  state = reduce(state, { type: 'ADJUST_SHARE', delta: 10 });
  const personal = structuredClone(state.allocationPlans);
  const adjusted = [...state.adjustedFirmIds];
  state = reduce(reduce(state, { type: 'SHOW_MARKET' }), { type: 'OTHER_FIRMS_COPY' });
  assert.equal(account(state).laborShare, 60);
  for (const laborShare of [20, 80]) {
    state = reduce(state, { type: 'MARKET_CUT' });
    state = reduce(state, { type: 'MARKET_TRY', laborShare });
    assert.equal(state.marketCuts, 0);
    assert.equal(account(state).laborShare, laborShare);
    assert.deepEqual(state.allocationPlans, personal);
    assert.deepEqual(state.adjustedFirmIds, adjusted);
    assert.deepEqual(restorePrologue(JSON.stringify(state)), state);
  }
  assert.equal(account(state).unsold, 0);
  assert.strictEqual(reduce(state, { type: 'MARKET_CUT' }), state);
  state = reduce(state, { type: 'MARKET_RESTORE' });
  assert.equal(state.marketDemoShare, null);
  assert.equal(state.marketCuts, 0);
  assert.equal(account(state).laborShare, 60);
  state = reduce(state, { type: 'MARKET_TRY', laborShare: 20 });
  state = reduce(state, { type: 'MARKET_CUT' });
  state = reduce(state, { type: 'BACK_TO_ALLOCATION' });
  assert.equal(state.scene, 'allocation');
  assert.equal(state.marketCuts, 0);
  assert.equal(state.marketDemoShare, null);
  assert.deepEqual(state.allocationPlans, personal);
  state = reduce(state, { type: 'SHOW_MARKET' });
  assert.equal(state.marketMode, 'single');
});

test('relief requires actual operations, both conditions and three completed experiments', () => {
  let state = ending();
  assert.strictEqual(reduce(state, { type: 'SHOW_RELIEF' }), state);
  state = reduce(state, { type: 'NEXT_PAIR', expectedIndex: 0 });
  assert.strictEqual(reduce(state, { type: 'SHOW_RELIEF' }), state);
  state = reduce(state, { type: 'NEXT_PAIR', expectedIndex: 1 });
  state = reduce(state, { type: 'SHOW_RELIEF' });
  assert.equal(state.scene, 'relief');
  assert.equal(state.reliefRoute, null);
  assert.equal(state.reliefSustained, false);
  for (const action of [
    { type: 'SHOW_RELIEF' }, { type: 'FINISH_RELIEF' },
    { type: 'RELIEF_CONDITION', sustained: true }, { type: 'CHOOSE_RELIEF', route: 'invalid' },
    { type: 'FINISH_PROLOGUE' }, { type: 'ENTER_ROUTES', entrance: 'enterprise' },
  ]) assert.strictEqual(reduce(state, action), state);
  for (const route of RELIEF_ROUTES) {
    state = reduce(state, { type: 'CHOOSE_RELIEF', route });
    assert.equal(state.reliefRoute, route);
    assert.equal(state.reliefSustained, false);
    assert.strictEqual(reduce(state, { type: 'RELIEF_CONDITION', sustained: 1 }), state);
    assert.strictEqual(reduce(state, { type: 'RELIEF_CONDITION', sustained: true }), state);
    assert.strictEqual(reduce(state, { type: 'RELIEF_COMPLETE' }), state);
    state=reduce(state,{type:'RELIEF_ADVANCE',expectedPhase:'ready'});
    assert.equal(state.reliefPhase,'improved');
    assert.strictEqual(reduce(state,{type:'RELIEF_ADVANCE',expectedPhase:'ready'}),state);
    state=reduce(state,{type:'RELIEF_ADVANCE',expectedPhase:'improved'});
    assert.equal(state.reliefPhase,'stress');
    state = reduce(state, { type: 'RELIEF_CONDITION', sustained: true });
    assert.equal(state.reliefSustained, true);
    assert.deepEqual(restorePrologue(JSON.stringify(state)), state);
    state=reduce(state,{type:'RELIEF_COMPLETE'});
    assert.equal(state.reliefPhase,'done');assert.equal(state.reliefSustained,false);
    state = reduce(state, { type: 'RELIEF_MENU' });
    assert.equal(state.reliefRoute, null);
    assert.equal(state.reliefSustained, false);
  }
  assert.deepEqual(state.reliefVisited, [...RELIEF_ROUTES]);
  state = reduce(state, { type: 'CHOOSE_RELIEF', route: 'consumption' });
  assert.deepEqual(state.reliefVisited, [...RELIEF_ROUTES]);
  state = reduce(state, { type: 'FINISH_RELIEF' });
  assert.equal(state.scene, 'epilogue');
  assert.equal(state.entrance, null);
  assert.equal(state.prologueStatus, 'observed');
  for (const action of [
    { type: 'FINISH_RELIEF' }, { type: 'RELIEF_MENU' },
    { type: 'RELIEF_CONDITION', sustained: false }, { type: 'CHOOSE_RELIEF', route: 'exports' },
  ]) assert.strictEqual(reduce(state, action), state);
  assert.deepEqual(restorePrologue(JSON.stringify(state)), state);
  const oneRoute = reduce(relief(), { type: 'CHOOSE_RELIEF', route: 'investment' });
  assert.strictEqual(reduce(oneRoute, { type: 'FINISH_RELIEF' }),oneRoute);
});

test('new fields migrate into old saves without changing their allocations or later scenes', () => {
  let state = reduce(start(), { type: 'ADJUST_SHARE', delta: -10 });
  const scenes = [state];
  for (const action of [
    { type: 'SHOW_NETWORK' }, { type: 'SHOW_CONCEPT' }, { type: 'SHOW_ENDING' },
    { type: 'SHOW_ALL' }, { type: 'FINISH_PROLOGUE' }, { type: 'SET_ENTRANCE', entrance: 'enterprise' },
  ]) { state = reduce(state, action); scenes.push(state); }
  for (const original of scenes) {
    const legacy = structuredClone(original);
    for (const key of ['marketMode', 'marketCuts', 'marketDemoShare', 'reliefRoute', 'reliefSustained', 'reliefVisited']) delete legacy[key];
    assert.deepEqual(restorePrologue(JSON.stringify(legacy)), original);
    assert.equal(restorePrologue(legacy).allocationPlans.A.laborShare, 40);
  }
  const skipped = reduce(allFirms(), { type: 'SKIP_PROLOGUE' });
  assert.deepEqual(restorePrologue(skipped), skipped);
});

test('restore rejects malformed new fields and impossible market or relief scenes', () => {
  const valid = relief();
  for (const [key, values] of Object.entries({
    marketMode: ['baseline', null, undefined],
    marketCuts: [-1, 3, 0.5, '1', undefined],
    marketDemoShare: [0, 50, '20', undefined],
    reliefRoute: ['credit', false, undefined],
    reliefSustained: [0, 'false', null, undefined],
    reliefVisited: [null, {}, ['credit'], [null], undefined],
  })) for (const value of values)
    assert.deepEqual(restorePrologue({ ...valid, [key]: value }), initialPrologue(), `${key}: ${value}`);
  for (const invalid of [
    { ...market(), marketCuts: 1 },
    { ...market(), marketDemoShare: 20 },
    { ...market(), definitionShown: true },
    { ...valid, definitionShown: false },
    { ...valid, endingViewMode: 'pairs', endingPairIndex: 1 },
    { ...valid, reliefRoute: 'consumption', reliefVisited: [] },
    { ...valid, reliefRoute: null, reliefSustained: true },
  ]) assert.deepEqual(restorePrologue(invalid), initialPrologue());
  for (const state of [market(), allFirms(), relief()])
    assert.deepEqual(restorePrologue(JSON.stringify(state)), state);
});
