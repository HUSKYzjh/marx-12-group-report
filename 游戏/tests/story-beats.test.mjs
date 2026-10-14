import test from 'node:test';
import assert from 'node:assert/strict';
import { storyBeats, policyChallenge } from '../lib/story-beats.ts';
import { reliefAccount } from '../lib/factory-model.ts';

test('each playable beat has one short prompt and an explicit compact assumption', () => {
  assert.equal(storyBeats.length, 8);
  for (const b of storyBeats) {
    assert(b.title.length <= 20);
    assert(b.lead.length <= 35);
    assert(b.rule.length <= 35);
  }
  assert.match(storyBeats[3].rule, /恢复8小时/);
  assert.match(storyBeats[5].rule, /协调订单/);
  assert.match(storyBeats[6].rule, /不是国家制度开关/);
});
test('policy challenge is feasible in both demand branches, and never labels a deficit as success', () => {
  for (const buyers of [24, 32])
    for (const pay of [false, true])
      for (const time of [false, true])
        for (const clean of [false, true]) {
          const p = reliefAccount({ pay, time, clean }, buyers);
          const goals = policyChallenge(p.wageEach, p.hours, p.surplus);
          assert.equal(
            goals.every((g) => g.met),
            pay && time && !clean,
          );
          if (p.surplus < 0) assert.equal(goals[2].met, false);
        }
});
