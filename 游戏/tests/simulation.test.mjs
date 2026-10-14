import test from 'node:test';
import assert from 'node:assert/strict';
import {
  production,
  advanceSkills,
  skillsPath,
  footprint,
  bounded,
  feedbackPath,
} from '../lib/simulation.ts';
import { registerGameTools } from '../lib/webmcp.ts';
const close = (a, b) => assert(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
test('feedback model isolates investment and wage-demand channels', () => {
  const expand = feedbackPath(100, 0),
    share = feedbackPath(100, 100),
    fixed = feedbackPath(0, 0);
  close(expand[8].capacity, 180);
  close(expand[8].sold, 100);
  assert(share[8].sold > expand[8].sold);
  assert(share[8].capacity < expand[8].capacity);
  fixed.forEach((p) => {
    close(p.capacity, 100);
    close(p.sold, 100);
  });
  for (let inv = 0; inv <= 100; inv += 10)
    for (let wage = 0; wage <= 100; wage += 10)
      for (const p of feedbackPath(inv, wage, 30)) {
        assert(p.sold <= p.capacity);
        assert(p.sold <= p.demand);
        assert(p.retained >= 0);
        for (const n of Object.values(p)) assert(Number.isFinite(n));
      }
  for (const args of [
    [-1, 50],
    [50, 101],
    [NaN, 50],
    [50, 50, 1.5],
    [50, 50, 31],
  ])
    assert.throws(() => feedbackPath(...args));
});
test('baseline and adopted accounting balance', () => {
  assert.deepEqual(production(false), {
    productivity: 1,
    hours: 8,
    output: 80,
    costs: 20,
    wages: 40,
    surplus: 20,
    bonus: 0,
  });
  for (const adopted of [false, true])
    for (const allocation of ['retain', 'share', 'time'])
      for (let share = 0; share <= 100; share++) {
        const p = production(adopted, allocation, share);
        close(p.output, p.costs + p.wages + p.surplus);
        assert(p.surplus >= 0);
        assert(p.wages >= 40);
        assert(p.hours <= 8);
      }
  close(production(true).surplus, 48);
  close(production(true, 'share', 50).wages, 54);
  close(production(true, 'time').surplus, 16);
});
test('technology and distribution are independently represented', () => {
  close(production(true, 'retain').wages, production(false).wages);
  close(
    production(true, 'share', 100).output,
    production(true, 'retain').output,
  );
  close(production(true, 'time').output, production(false).output);
});
test('training has multiple paths and the mentor assumption can fail', () => {
  const cut = skillsPath('cut'),
    invest = skillsPath('invest'),
    mentor = skillsPath('mentor');
  assert(cut[6] < 100);
  assert(invest[6] > 100);
  mentor.forEach((s) => close(s, 100));
  close(skillsPath('mentor', 6, 1)[6], cut[6]);
  close(advanceSkills(100, 'cut').stock, 98);
});
test('all 729 six-round training paths stay finite', () => {
  for (let code = 0; code < 729; code++) {
    let n = code,
      s = 100;
    for (let t = 0; t < 6; t++) {
      s = advanceSkills(s, ['cut', 'invest', 'mentor'][n % 3]).stock;
      n = Math.floor(n / 3);
    }
    assert(Number.isFinite(s));
    assert(s > 0);
  }
});
test('responsibility transfers do not change the physical burden', () => {
  for (let g = 0; g <= 100; g += 5)
    for (let i = 0; i <= 80; i += 5)
      for (let r = 0; r <= 100; r += 10) {
        const f = footprint(g, i, r);
        close(f.total, f.inside + f.outside);
        close(f.total, footprint(g, i, 0).total);
      }
  close(footprint(50, 30, 0).total, 105);
  close(footprint(0, 30, 100).total, 70);
});
test('invalid values fail rather than silently poisoning results', () => {
  for (const bad of [-1, 101, NaN, Infinity])
    assert.throws(() => bounded(bad, 0, 100));
  assert.throws(() => production(true, 'unknown'));
  assert.throws(() => skillsPath('cut', 1.5));
  assert.throws(() => footprint(50, 81, 0));
});
test('WebMCP registry contract: read/configure, invalid inputs and teardown', () => {
  const registry = new Map();
  let state = { share: 50, growth: 50, intensity: 30, responsibility: 0 };
  const cleanup = registerGameTools(
    () => state,
    (v) => {
      for (const k of Object.keys(v))
        bounded(v[k], 0, k === 'intensity' ? 80 : 100);
      state = { ...v };
      return state;
    },
    {
      registerTool(tool, { signal }) {
        registry.set(tool.name, tool);
        signal.addEventListener('abort', () => registry.delete(tool.name));
      },
    },
  );
  assert.equal(registry.size, 2);
  const read = registry.get('read_technology_experiment'),
    write = registry.get('configure_technology_sandbox');
  assert.equal(read.annotations.readOnlyHint, true);
  assert.equal(write.annotations.readOnlyHint, false);
  assert.equal(
    write.execute({ share: 40, growth: 10, intensity: 50, responsibility: 100 })
      .share,
    40,
  );
  assert.equal(read.execute({}).share, 40);
  for (const bad of [
    null,
    {},
    [],
    { share: 2, growth: 2, intensity: 2, responsibility: 2, extra: 2 },
    { share: 3, growth: 3, intensity: 99, responsibility: 3 },
  ])
    assert.throws(() => write.execute(bad));
  assert.equal(read.execute({}).share, 40);
  cleanup();
  assert.equal(registry.size, 0);
});
