import test from 'node:test';
import assert from 'node:assert/strict';
import '../lib/production-network.js';
import { PRODUCTION_LINKS } from '../lib/production-links.ts';

const Network = globalThis.ProductionNetwork;
const advance = (network, seconds, dt = 1 / 60) => { for (let t = 0; t < seconds - 1e-8; t += dt) network.step(dt); };
const snapshot = network => JSON.stringify({ nodes: network.nodes, edges: network.edges, stats: network.stats });
const fixture = seed => new Network({ width: 1000, height: 650, restLength: 110, seed,
  exclusion: { x: 360, y: 220, width: 280, height: 180 },
  nodes: Array.from({ length: 22 }, (_, i) => ({ id: `node-${i}`, x: 80 + (i % 6) * 168, y: 70 + Math.floor(i / 6) * 170, radius: 20 }))
});

test('walls and title repel before contact, with smooth falloff and no distant force', () => {
  const network = new Network({ width: 800, height: 600, restLength: 100,
    wallReach: 40, titleReach: 40, exclusion: { x: 300, y: 200, width: 200, height: 200 } });
  const force = (x, y) => network._environmentForce({ x, y, radius: 10 });
  assert(force(20, 100)[0] > 0);
  assert(force(780, 100)[0] < 0);
  assert(force(100, 20)[1] > 0);
  assert(force(100, 580)[1] < 0);
  assert(force(280, 300)[0] < 0);
  assert(force(520, 300)[0] > 0);
  assert(force(400, 180)[1] < 0);
  assert(force(400, 420)[1] > 0);
  assert.deepEqual(force(150, 100), [0, 0]);
  assert(force(51.9, 100)[0] > 0 && force(51.9, 100)[0] < .01);
  assert.equal(force(52, 100)[0], 0);
});

test('classic script exports precise inclusive formation and break ranges', () => {
  assert.equal(typeof Network, 'function');
  for (const d of [150, 200, 300]) assert.equal(Network.canForm(d, 100), true);
  for (const d of [-1, 0, 149.999, 300.001, NaN, Infinity]) assert.equal(Network.canForm(d, 100), false);
  for (const d of [0, 150, 200]) assert.equal(Network.canBreak(d, 100), true);
  for (const d of [-1, 200.001, NaN, Infinity]) assert.equal(Network.canBreak(d, 100), false);
  assert.equal(Network.canForm(0, 0), false);
  assert.equal(Network.canBreak(0, 0), false);
});

test('top-wall reach can shrink independently while other boundaries retain their force', () => {
  const options = { width: 800, height: 600, restLength: 100, wallReach: 40 };
  const original = new Network(options), smaller = new Network({ ...options, topWallReach: 16 });
  const force = (network, x, y) => network._environmentForce({ x, y, radius: 10 });
  assert(force(original, 100, 40)[1] > 0);
  assert.equal(force(smaller, 100, 40)[1], 0);
  assert(force(smaller, 100, 20)[1] > 0);
  assert(force(smaller, 100, 20)[1] < force(original, 100, 20)[1]);
  for (const [x, y] of [[20, 100], [780, 100], [100, 580]]) assert.deepEqual(force(smaller, x, y), force(original, x, y));
  assert.equal(smaller._wallReach, 40);
  assert.equal(smaller._topWallReach, 16);
});

function densityFixture() {
  return new Network({ width: 1800, height: 900, restLength: 100, seed: 'local-density', initialBondRatio: 0,
    nodes: [
      { x: 200, y: 200 }, { x: 375, y: 200 },
      { x: 1100, y: 500 }, { x: 1275, y: 500 },
      ...Array.from({ length: 12 }, (_, i) => ({ x: 1060 + (i % 4) * 80, y: i < 8 ? 380 + Math.floor(i / 4) * 60 : 620 }))
    ].map((node, id) => ({ ...node, id, radius: 5, pinned: true }))
  });
}

test('local spatial density continuously favours formation in sparse areas and breaks in crowded areas', () => {
  const network = densityFixture(), sparse = network.edges.find(e => e.a === 0 && e.b === 1);
  const crowded = network.edges.find(e => e.a === 2 && e.b === 3);
  const density = network._localDensities();
  assert.equal(network._distance(sparse), network._distance(crowded));
  const low = network._bondRates(sparse, density), high = network._bondRates(crowded, density);
  assert.deepEqual(low, { form: 3, break: .2 });
  assert(high.form < low.form && high.break > low.break);
  assert(high.form > .6 && high.break < 1.6);
  // Bonding every pair does not change spatial density or its probabilities.
  network.edges.forEach(e => { e.bonded = true; });
  assert.deepEqual(network._localDensities(), density);
  const neighbour = new Network({ width: 1000, height: 900, restLength: 100, initialBondRatio: 0,
    nodes: [{ x: 200, y: 300 }, { x: 375, y: 300 }, { x: 287.5, y: 800 }].map(n => ({ ...n, pinned: true, radius: 5 })) });
  const edge = neighbour.edges[0], rates = () => neighbour._bondRates(edge, neighbour._localDensities());
  assert.deepEqual(rates(), low, 'outside 3X has no density influence');
  neighbour.nodes[2].y = 500;
  const medium = rates();
  neighbour.nodes[2].y = 400;
  const near = rates();
  assert(near.form < medium.form && medium.form < low.form);
  assert(near.break > medium.break && medium.break > low.break);
  neighbour.nodes[2].y = 300 + Math.sqrt(300 ** 2 - 87.5 ** 2) - .001;
  assert(Math.abs(rates().form - low.form) < 1e-8, 'smooth cutoff, not a binary neighbour count');
});

test('actual bond events use density-weighted probabilities and change at most one edge', () => {
  for (const bonded of [false, true]) {
    const network = densityFixture();
    const pair = [network.edges.find(e => e.a === 0 && e.b === 1), network.edges.find(e => e.a === 2 && e.b === 3)];
    const density = network._localDensities(), kind = bonded ? 'break' : 'form';
    const rates = pair.map(e => network._bondRates(e, density)[kind]);
    const counts = [0, 0], trials = 5000;
    for (let trial = 0; trial < trials; trial++) {
      network.edges.forEach(e => { e.bonded = false; e.alpha = 0; e.cooldown = 999; e.age = 10; });
      pair.forEach(e => { e.bonded = bonded; e.alpha = bonded ? 1 : 0; e.cooldown = 0; });
      const before = network.stats.formed + network.stats.broken;
      network._bonds(.3);
      assert(network.stats.formed + network.stats.broken - before <= 1);
      pair.forEach((e, i) => { if (e.bonded !== bonded) counts[i]++; });
    }
    const events = counts[0] + counts[1];
    const expectedEventChance = 1 - Math.exp(-(rates[0] + rates[1]) / 2 * .3);
    assert(Math.abs(events / trials - expectedEventChance) < .04);
    assert(Math.abs(counts[0] / events - rates[0] / (rates[0] + rates[1])) < .04);
    assert(bonded ? counts[1] > counts[0] : counts[0] > counts[1]);
  }
});

test('identical artwork has smooth extra repulsion out to 10X, not unrelated or unspecified symbols', () => {
  const network = new Network({ restLength: 100 });
  const a = { symbolKey: 'svg:chip' }, b = { symbolKey: 'svg:chip' };
  assert(network._sameSymbolForce(a, b, 350) > 0, 'beyond the ordinary 3X range');
  assert(network._sameSymbolForce(a, b, 100) > network._sameSymbolForce(a, b, 350));
  assert(network._sameSymbolForce(a, b, 999.99) > 0);
  assert(network._sameSymbolForce(a, b, 999.99) < 1e-7);
  for (const d of [1000, 1001, NaN, Infinity, -1]) assert.equal(network._sameSymbolForce(a, b, d), 0);
  assert.equal(network._sameSymbolForce(a, { symbolKey: 'svg:server' }, 350), 0);
  assert.equal(network._sameSymbolForce({}, {}, 350), 0);
});

test('10X pressure spreads matching symbols while keeping a focused anchor fixed', () => {
  const fixture = same => new Network({ width: 2000, height: 900, restLength: 100, initialBondRatio: 0,
    nodes: [{ x: 700, y: 450, symbolKey: 'svg:chip', pinned: true },
      { x: 1050, y: 450, symbolKey: same ? 'svg:chip' : 'svg:server' }] });
  const same = fixture(true), other = fixture(false);
  for (const network of [same, other]) {
    network.nodes.forEach(n => { n._phase = .5; });
    advance(network, 5);
    assert.equal(network.nodes[0].x, 700); assert.equal(network.nodes[0].y, 450);
  }
  assert(same.nodes[1].x > other.nodes[1].x + 5);
});

test('seeded initial graph is sparse, reproducible, and keeps input objects intact', () => {
  const a = fixture(2026), b = fixture(2026), c = fixture(2027);
  assert.equal(snapshot(a), snapshot(b));
  assert.notEqual(snapshot(a), snapshot(c));
  const bonds = a.edges.filter(e => e.bonded);
  assert.ok(bonds.length > 0 && bonds.length <= Math.ceil(a.nodes.length * .62));
  const degrees = a.nodes.map(() => 0);
  for (const e of bonds) { degrees[e.a]++; degrees[e.b]++; assert.equal(a._crossesTitle(e), false); }
  assert.ok(degrees.every(d => d <= 2));
  const input = { id: 'input', x: 200, y: 200, radius: 12 };
  new Network({ nodes: [input] });
  assert.deepEqual(input, { id: 'input', x: 200, y: 200, radius: 12 });
});

test('overlapping distance bands respect bond lifetime, cooldown, and gradual alpha', () => {
  const network = new Network({ width: 600, height: 300, restLength: 100, seed: 2,
    nodes: [{ id: 'a', x: 150, y: 150, radius: 15, pinned: true }, { id: 'b', x: 325, y: 150, radius: 15, pinned: true }] });
  const edge = network.edges[0];
  assert.equal(edge.bonded, true);
  advance(network, 3.5);
  assert.equal(edge.bonded, true);
  for (let i = 0; i < 3600 && edge.bonded; i++) network.step(1 / 60);
  assert.equal(edge.bonded, false);
  assert.ok(edge.alpha > .9, 'breaking starts a fade instead of removing a line immediately');
  advance(network, .35);
  assert.ok(edge.alpha > .4 && edge.alpha < .6);
  advance(network, .4);
  assert.equal(edge.alpha, 0);
  advance(network, 3);
  assert.equal(edge.bonded, false, 'cooldown blocks a rapid flip in the overlapping distance bands');
  for (let i = 0; i < 3600 && !edge.bonded; i++) network.step(1 / 60);
  assert.equal(edge.bonded, true);
  assert.ok(edge.alpha < .1, 'new bond fades in');
  assert.ok(network.stats.broken >= 1 && network.stats.formed >= 1);
});

test('pinned nodes stay exact and clear velocity while neighbours keep flowing', () => {
  const network = fixture('pinned');
  const pinned = network.nodes[5], before = { x: pinned.x, y: pinned.y };
  pinned.pinned = true; pinned.vx = 100; pinned.vy = -100;
  const neighbour = { x: network.nodes[4].x, y: network.nodes[4].y };
  network.setPointer(pinned.x + 2, pinned.y + 2, true);
  advance(network, 12);
  assert.equal(pinned.x, before.x); assert.equal(pinned.y, before.y);
  assert.equal(pinned.vx, 0); assert.equal(pinned.vy, 0);
  assert.ok(Math.hypot(network.nodes[4].x - neighbour.x, network.nodes[4].y - neighbour.y) > 3);
});

test('bonded pair has zero relative net force at the natural distance X', () => {
  const network = new Network({ width: 1000, height: 600, restLength: 100,
    nodes: [{ id: 'a', x: 400, y: 300, radius: 10 }, { id: 'b', x: 500, y: 300, radius: 10 }] });
  network.nodes[0]._phase = network.nodes[1]._phase = .5;
  network.edges[0].bonded = true; network.edges[0].alpha = 1;
  advance(network, .2);
  assert.ok(Math.abs(network._distance(network.edges[0]) - 100) < 1e-9);
  assert.ok(Math.abs(network.nodes[0].vx - network.nodes[1].vx) < 1e-9);
});

test('boundary, title clearance, collision spacing and degree remain stable over time', () => {
  const network = fixture('long-run');
  for (let frame = 0; frame < 60 * 70; frame++) {
    network.step(frame % 197 === 0 ? .8 : 1 / 60);
    if (frame % 30) continue;
    const degrees = network.nodes.map(() => 0);
    for (const e of network.edges) {
      assert.ok(e.alpha >= 0 && e.alpha <= 1);
      if (e.bonded || e.alpha > 0) { degrees[e.a]++; degrees[e.b]++; }
    }
    assert.ok(degrees.every(d => d <= 3));
    for (const n of network.nodes) {
      assert.ok([n.x, n.y, n.vx, n.vy].every(Number.isFinite));
      assert.ok(n.x >= n.radius && n.x <= network.width - n.radius);
      assert.ok(n.y >= n.radius && n.y <= network.height - n.radius);
      const r = network.exclusion;
      assert.ok(n.x <= r.x - n.radius || n.x >= r.x + r.width + n.radius || n.y <= r.y - n.radius || n.y >= r.y + r.height + n.radius);
      assert.ok(Math.hypot(n.vx, n.vy) <= network.restLength * .3 + .001);
    }
    for (let i = 0; i < network.nodes.length; i++) for (let j = i + 1; j < network.nodes.length; j++) {
      const a = network.nodes[i], b = network.nodes[j];
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.radius + b.radius - .1);
    }
  }
  assert.ok(network.stats.formed >= 2 && network.stats.broken >= 2);
});

test('substeps agree across frame rates, cap suspended-tab time, and reject invalid time', () => {
  const a = fixture(9), b = fixture(9);
  advance(a, 10, 1 / 60); advance(b, 10, 1 / 30);
  assert.equal(snapshot(a), snapshot(b));
  const c = fixture(8), d = fixture(8);
  c.step(50); d.step(.1);
  assert.equal(snapshot(c), snapshot(d));
  const before = snapshot(c);
  for (const dt of [0, -1, NaN, Infinity]) c.step(dt);
  assert.equal(snapshot(c), before);
});

test('overstretched bonds release gradually and per-event changes stay limited', () => {
  const network = fixture('stretched');
  const edge = network.edges.find(e => e.bonded);
  const a = network.nodes[edge.a], b = network.nodes[edge.b];
  a.x = 60; a.y = 60; a.pinned = true; b.x = 940; b.y = 590; b.pinned = true;
  let previous = 0;
  for (let i = 0; i < 40; i++) {
    network.step(.1);
    const changes = network.stats.formed + network.stats.broken;
    assert.ok(changes - previous <= 1);
    previous = changes;
  }
  assert.equal(edge.bonded, false);
  assert.equal(edge.alpha, 0);
});

test('coincident nodes separate without NaNs or changing a pinned node', () => {
  const network = new Network({ width: 500, height: 500, seed: 4, nodes: Array.from({ length: 5 }, (_, i) => ({ id: i, x: 250, y: 250, radius: 15, pinned: i === 0 })) });
  advance(network, 1);
  assert.equal(network.nodes[0].x, 250); assert.equal(network.nodes[0].y, 250);
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) assert.ok(Math.hypot(network.nodes[i].x - network.nodes[j].x, network.nodes[i].y - network.nodes[j].y) >= 30);
});

test('a pinned node cannot trap a neighbour against a wall or corner', () => {
  for (const [fixedX, fixedY, x, y] of [[50, 100, 24, 100], [350, 100, 376, 100], [200, 50, 200, 24], [200, 150, 200, 176], [50, 50, 24, 24]]) {
    const network = new Network({ width: 400, height: 200, restLength: 100,
      nodes: [{ id: 'fixed', x: fixedX, y: fixedY, radius: 22, pinned: true }, { id: 'moving', x, y, radius: 22 }] });
    const [fixed, moving] = network.nodes;
    assert.ok(Math.hypot(moving.x - fixed.x, moving.y - fixed.y) >= 49, `failed escape from ${x},${y}`);
    advance(network, 2);
    assert.equal(fixed.x, fixedX); assert.equal(fixed.y, fixedY);
    assert.equal(fixed.vx, 0); assert.equal(fixed.vy, 0);
    assert.ok(Math.hypot(moving.x - fixed.x, moving.y - fixed.y) >= 49 - .01);
  }
});

test('escape from a newly pinned wall trap is gradual and eventually clears it', () => {
  const network = new Network({ width: 400, height: 200, restLength: 100,
    nodes: [{ id: 'fixed', x: 50, y: 100, radius: 22, pinned: true }, { id: 'moving', x: 24, y: 40, radius: 22 }] });
  const [fixed, moving] = network.nodes;
  moving.x = 24; moving.y = 100;
  for (let frame = 0; frame < 300; frame++) {
    const before = { x: moving.x, y: moving.y };
    network.step(1 / 60);
    assert.ok(Math.hypot(moving.x - before.x, moving.y - before.y) < 2, 'escape must not teleport to the chosen free point');
  }
  assert.ok(Math.hypot(moving.x - fixed.x, moving.y - fixed.y) >= 49 - .01);
  assert.equal(fixed.x, 50); assert.equal(fixed.y, 100);
});

test('escape target expires on release and is recomputed for a relocated pinned anchor', () => {
  const network = new Network({ width: 400, height: 200, restLength: 100,
    nodes: [{ id: 'fixed', x: 50, y: 100, radius: 22, pinned: true }, { id: 'moving', x: 24, y: 40, radius: 22 }] });
  const [fixed, moving] = network.nodes;
  moving.x = 24; moving.y = 100; network.step(1 / 60);
  assert.ok(network._escapeTargets[1]);
  fixed.pinned = false; network.step(1 / 60);
  assert.equal(network._escapeTargets[1], null);
  fixed.x = 50; fixed.y = 100; fixed.pinned = true;
  moving.x = 24; moving.y = 100; network.step(1 / 60);
  const oldTarget = network._escapeTargets[1];
  assert.ok(oldTarget);
  // Releasing and pinning again can happen between simulation frames.
  fixed.pinned = false; fixed.y = 60; fixed.pinned = true;
  moving.x = 24; moving.y = 60; network.step(1 / 60);
  assert.ok(network._escapeTargets[1]);
  assert.notEqual(network._escapeTargets[1], oldTarget);
  assert.equal(network._escapeTargets[1].anchorY, 60);
  advance(network, 5);
  assert.ok(Math.hypot(moving.x - fixed.x, moving.y - fixed.y) >= 49 - .01);
});

function openingFixture(width) {
  const compact = width <= 600, height = compact ? 760 + Math.max(0, 360 - width) * 4 : 600;
  const exclusion = { x: width / 2 - (compact ? 87 : 163), y: compact ? 262 : 229, width: compact ? 174 : 326, height: compact ? 96 : 142 };
  const svgRadius = compact ? 18 : 23;
  const personCount = compact ? 6 : width < 900 ? 12 : 22, personSize = compact ? 24 : 32;
  const personRadius = Math.ceil(Math.hypot(personSize, personSize * 402 / 302) / 2) + 3;
  // Preserve actual stage order, radii and exact artwork-family keys.
  const canvasTools = compact ? [29.5, 34, 21, 21, 21, 21, 21] : [35, 41, 24, 24, 24, 24, 24];
  if (!compact && width >= 900) canvasTools.push(24, 35, 24, 41);
  const kinds = ['old', 'new', 'gear', 'conveyor', 'wrench', 'flywheel', 'motor'];
  if (!compact && width >= 900) kinds.push('gear', 'old', 'conveyor', 'new');
  const nodes = PRODUCTION_LINKS.map(symbol => ({ id: symbol.id, radius: symbol.href ? 33 : svgRadius, symbolKey: 'svg:' + symbol.id }));
  const repeatPool = PRODUCTION_LINKS.filter(symbol => !symbol.href);
  const target = compact ? 72 : width < 900 ? 92 : 136;
  const duplicateCount = target - nodes.length - canvasTools.length - personCount;
  for (let i = 0; i < duplicateCount; i++) nodes.push({ id: 'repeat-' + i, radius: svgRadius, symbolKey: 'svg:' + repeatPool[i % repeatPool.length].id });
  canvasTools.forEach((radius, i) => nodes.push({ id: 'canvas-' + i, radius, symbolKey: 'canvas:' + kinds[i] }));
  for (let i = 0; i < personCount; i++) nodes.push({ id: 'person-' + i, radius: personRadius, symbolKey: 'canvas:person' });
  let seed = 3817;
  const random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  const placed = [];
  for (const n of [...nodes].sort((a, b) => b.radius - a.radius)) {
    let best, bestScore = -Infinity;
    const r = n.radius + 12;
    for (let attempt = 0; attempt < 500; attempt++) {
      const x = r + random() * (width - r * 2), y = r + random() * (height - r * 2);
      const cx = Math.max(exclusion.x, Math.min(x, exclusion.x + exclusion.width)), cy = Math.max(exclusion.y, Math.min(y, exclusion.y + exclusion.height));
      if (Math.hypot(x - cx, y - cy) < r) continue;
      let score = placed.length ? Infinity : random();
      for (const p of placed) score = Math.min(score, Math.hypot(x - p.x, y - p.y) / (n.radius + p.radius + 10));
      if (score > bestScore) { bestScore = score; best = { x, y }; }
    }
    Object.assign(n, best || { x: r, y: r }); random(); placed.push(n);
  }
  return new Network({ width, height, restLength: compact ? 48 : 72, wallReach: compact ? 20 : 38, topWallReach: compact ? 10 : 18, titleReach: compact ? 7 : 14, exclusion, seed: 7419, nodes });
}

for (const width of [320, 390, 768, 1280]) test(`dense opening stays clear and reconnects for 60 seconds at ${width}px; visual collision radii take priority over X`, () => {
  const network = openingFixture(width), starts = network.nodes.map(n => ({ x: n.x, y: n.y }));
  assert.equal(network.nodes.length, width <= 600 ? 72 : width < 900 ? 92 : 136);
  // X is the net-force equilibrium for small enough drawings. Larger visible
  // drawings and 44px link hit areas keep their collision clearance instead.
  assert.ok(network.nodes.some(n => n.radius * 2 + 5 > network.restLength));
  const counts = [network.edges.filter(e => e.bonded).length];
  let minGap = Infinity, tightestPair;
  for (let frame = 0; frame < 60 * 60; frame++) {
    network.step(1 / 60);
    if (frame % 60) continue;
    counts.push(network.edges.filter(e => e.bonded).length);
    for (const n of network.nodes) {
      const r = network.exclusion;
      assert.ok([n.x, n.y, n.vx, n.vy].every(Number.isFinite));
      assert.ok(n.x >= n.radius && n.x <= width - n.radius);
      assert.ok(n.y >= n.radius && n.y <= network.height - n.radius);
      assert.ok(n.x <= r.x - n.radius || n.x >= r.x + r.width + n.radius || n.y <= r.y - n.radius || n.y >= r.y + r.height + n.radius);
    }
    for (let i = 0; i < network.nodes.length; i++) for (let j = i + 1; j < network.nodes.length; j++) {
      const a = network.nodes[i], b = network.nodes[j], gap = Math.hypot(a.x - b.x, a.y - b.y) - a.radius - b.radius;
      if (gap < minGap) { minGap = gap; tightestPair = { frame, a: a.id, b: b.id, ax: a.x, ay: a.y, bx: b.x, by: b.y }; }
    }
  }
  assert.ok(minGap >= -.1, `minimum circle clearance ${minGap}: ${JSON.stringify(tightestPair)}`);
  assert.ok(network.stats.formed >= 2 && network.stats.broken >= 2);
  assert.ok(new Set(counts).size >= 3, 'bond count changes naturally over time');
  const travelled = network.nodes.reduce((sum, n, i) => sum + Math.hypot(n.x - starts[i].x, n.y - starts[i].y), 0) / network.nodes.length;
  assert.ok(travelled > 2, 'network keeps flowing');
  console.log(JSON.stringify({ width, nodes: network.nodes.length, restLength: network.restLength, formed: network.stats.formed, broken: network.stats.broken, initial: counts[0], minBonds: Math.min(...counts), maxBonds: Math.max(...counts), minGap, meanDisplacement: travelled }));
});
