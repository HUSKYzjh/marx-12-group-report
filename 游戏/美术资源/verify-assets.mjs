import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// Read-only inventory verification. Does not fetch, copy, render or approve assets.
const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(directory);
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/^\uFEFF/, '');
const manifest = JSON.parse(read('美术资源/asset-manifest.json'));
const sceneDir = path.join(root, '重构方案/逐幕内容');
const sourceElements = fs.readdirSync(sceneDir).filter(f => /^P\d{2}_.*\.md$/.test(f)).sort().flatMap(file => {
  const content = fs.readFileSync(path.join(sceneDir, file), 'utf8');
  return [...content.matchAll(/^\| (p\d+-e\d+) \| ([^|]+) \| ([^|]+) \|/gm)].map(m => ({
    id: m[1], name: m[2].trim(), duty: m[3].trim(), source: `重构方案/逐幕内容/${file}`,
  }));
});
const pngSize = data => {
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'PNG signature');
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
};
const problems = data => {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const families = new Set(data.families.map(f => f.id));
  const elementIds = new Set(data.elements.map(e => e.id));
  check(families.size === data.families.length, 'Duplicate family ID');
  check(elementIds.size === data.elements.length, 'Duplicate element ID');
  check(data.elements.length === sourceElements.length, 'Element count differs from current source');
  for (const source of sourceElements) {
    const item = data.elements.find(e => e.id === source.id);
    check(Boolean(item), `Missing element ${source.id}`);
    if (!item) continue;
    for (const key of ['name', 'duty', 'source']) check(item[key] === source[key], `${source.id}: source ${key} differs`);
    check(item.familyIds.length > 0, `${source.id}: empty family mapping`);
    for (const id of item.familyIds) check(families.has(id), `${source.id}: unknown family ${id}`);
  }
  const safePath = relative => {
    const resolved = path.resolve(root, relative);
    return resolved.startsWith(root + path.sep) ? resolved : null;
  };
  for (const f of data.families) {
    for (const field of ['brief', 'format', 'size', 'priority', 'status', 'productionStatus']) check(Boolean(f[field]), `${f.id}: missing ${field}`);
    check(f.states.length > 0, `${f.id}: missing states`);
    check(JSON.stringify(f.usedBy) === JSON.stringify(data.elements.filter(e => e.familyIds.includes(f.id)).map(e => e.id)), `${f.id}: reverse mapping differs`);
    for (const p of f.existingPaths) check(safePath(p) && fs.existsSync(safePath(p)), `${f.id}: missing candidate ${p}`);
  }
  for (const g of data.globalNeeds) {
    check(Boolean(g.scope) && g.familyIds.length > 0, `${g.id}: missing global scope`);
    for (const id of g.familyIds) check(families.has(id), `${g.id}: unknown family ${id}`);
  }
  for (const item of data.inventory) {
    const p = safePath(item.path);
    check(p && fs.existsSync(p), `Missing inventory file ${item.path}`);
    if (!p || !fs.existsSync(p)) continue;
    const bytes = fs.readFileSync(p);
    check(bytes.length === item.bytes, `${item.path}: size differs`);
    check(crypto.createHash('sha256').update(bytes).digest('hex') === item.sha256, `${item.path}: hash differs`);
    if (item.path.endsWith('.png')) {
      const size = pngSize(bytes);
      check(size.width === item.width && size.height === item.height, `${item.path}: dimensions differ`);
    }
  }
  return errors;
};

const errors = problems(manifest);
assert.equal(sourceElements.length, 175, 'Expected current 35 × 5 specification');
assert.equal(new Set(sourceElements.map(e => e.id.slice(0, 3))).size, 35);
assert.equal(manifest.globalNeeds.length, 5);
assert.equal(manifest.families.length, 31);

const provenance = JSON.parse(read('public/assets/trust/provenance.json'));
for (const item of provenance) {
  const actual = manifest.inventory.find(i => i.path === `public/assets/trust/${item.file}`);
  assert(actual && actual.sha256 === item.sha256 && actual.provenanceMatch === true, `Local provenance mismatch: ${item.file}`);
}
let framesChecked = 0;
for (const name of ['iterated_machine', 'iterated_coin', 'iterated_peep']) {
  const atlas = JSON.parse(read(`public/assets/trust/${name}.json`));
  const size = pngSize(fs.readFileSync(path.join(root, 'public/assets/trust', `${name}.png`)));
  assert.deepEqual({ width: atlas.meta.size.w, height: atlas.meta.size.h }, size);
  for (const [id, entry] of Object.entries(atlas.frames)) {
    const f = entry.frame;
    assert(f.x >= 0 && f.y >= 0 && f.w > 0 && f.h > 0 && f.x + f.w <= size.width && f.y + f.h <= size.height, `Atlas frame outside image: ${id}`);
    framesChecked++;
  }
}
let localLinks = 0;
for (const file of fs.readdirSync(directory).filter(f => f.endsWith('.md'))) {
  const body = fs.readFileSync(path.join(directory, file), 'utf8');
  for (const match of body.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^(https?:|mailto:)/.test(target)) continue;
    localLinks++;
    if (!fs.existsSync(path.resolve(directory, target))) errors.push(`${file}: broken link ${target}`);
  }
}

// Negative controls ensure these checks can detect relevant regressions.
for (const [name, mutate] of [
  ['missing element', d => d.elements.pop()],
  ['unknown family', d => d.elements[0].familyIds.push('INVALID')],
  ['changed asset hash', d => { d.inventory[0].sha256 = '0'.repeat(64); }],
  ['missing candidate', d => d.families[0].existingPaths.push('public/assets/does-not-exist.png')],
]) {
  const changed = structuredClone(manifest);
  mutate(changed);
  assert(problems(changed).length > 0, `Failed negative control: ${name}`);
}
console.log(JSON.stringify({
  result: errors.length ? 'FAIL' : 'PASS', scenes: 35, elements: sourceElements.length,
  families: manifest.families.length, globalGroups: manifest.globalNeeds.length,
  files: manifest.inventory.length, pngs: manifest.inventory.filter(i => i.width).length,
  localProvenanceMatches: provenance.length, atlasFrames: framesChecked, localLinks,
  negativeControls: 4, errors,
  limitations: ['This verifier covers the original inventory only', 'Remote-source integrity is checked separately by verify-trust-source.mjs', 'Rendered artwork QA and production status are recorded separately', 'No formal game runtime verification'],
}, null, 2));
process.exitCode = errors.length ? 1 : 0;
