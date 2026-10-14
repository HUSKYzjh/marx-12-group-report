import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { PROLOGUE_VERSION, FIRMS, ENDING_PAIRS } from '../lib/prologue-state.ts';

// Read-only audit of preparation records. It does not test gameplay or a server.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const local = p => {
  assert.equal(typeof p, 'string');
  assert(!path.isAbsolute(p) && !p.split(/[\\/]/).includes('..'), `Unsafe path: ${p}`);
  const resolved = path.resolve(root, p);
  assert(resolved.startsWith(root + path.sep), `Outside project: ${p}`);
  return resolved;
};
const json = p => JSON.parse(fs.readFileSync(local(p), 'utf8').replace(/^\uFEFF/, ''));
const prep = json('美术资源/asset-preparation-v8.json');
const inventory = json(prep.inventory);
const legacy = json(prep.legacyManifest);
const familyIds = new Set(legacy.families.map(f => f.id));
const unique = (items, label) => assert.equal(new Set(items).size, items.length, `Duplicate ${label}`);
const digest = b => crypto.createHash('sha256').update(b).digest('hex');
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function validatePreparation(p) {
  assert.equal(p.schemaVersion, 1);
  assert.equal(p.releaseApproved, false);
  assert.equal(p.roles.length, 7);
  unique(p.roles.map(r => r.id), 'role');
  const table = fs.readFileSync(local(p.sourceRoleTable), 'utf8');
  for (const role of p.roles) {
    const row = table.split('\n').find(line => line.startsWith(`| ${role.id} |`) && line.includes('P'));
    assert(row, `Missing role table row: ${role.id}`);
    const cells = row.split('|').slice(2, -1);
    assert.equal(cells.length, 8);
    assert.equal(role.nodes.length, 8);
    unique(role.nodes.map(n => n.id), `nodes in ${role.id}`);
    role.nodes.forEach((n, i) => {
      assert.equal(n.position, i + 1);
      assert.deepEqual(n.modules, cells[i].match(/P\d{2}/g), `Role source drift: ${n.id}`);
      assert(n.modules.every(m => /^P\d{2}$/.test(m) && +m.slice(1) >= 1 && +m.slice(1) <= 35));
      if (i < p.aiFormalStartRolePosition - 1) assert(!n.modules.includes('P21'), `AI introduced early: ${n.id}`);
    });
    assert(role.nodes[6].modules.includes('P21'), `Missing late AI entry: ${role.id}`);
    assert.equal(role.nodes.length + p.sharedEnding.length + 1, p.mainNodesPerRoute);
    assert.equal(role.entrance, ['producer', 'platform_firm'].includes(role.id) ? 'enterprise' : 'individual');
  }
  assert.equal(p.prologue, 'Z00');
  const z = p.prologueInteraction;
  assert.equal(z.version, '20261002-boss-allocation');
  assert.equal(z.version, PROLOGUE_VERSION);
  assert.deepEqual(z.firms, FIRMS.map(f => f.id));
  assert.deepEqual(z.endingPairs, ENDING_PAIRS);
  assert.equal(z.status, 'implemented-local-prototype');
  assert.equal(z.browserQaRecord, 'QA-2026-10-02.md');
  assert(fs.statSync(local(z.browserQaRecord)).isFile());
  assert.deepEqual(z.implementationSources, ['components/boss-prologue.tsx', 'components/prologue-art.tsx', 'lib/prologue-state.ts', 'app/boss-prologue.css']);
  z.implementationSources.forEach(file => assert(fs.statSync(local(file)).isFile()));
  assert.equal(z.perspective, 'company-owner-and-operator');
  assert.deepEqual(z.firms, ['A', 'B', 'C', 'D']);
  assert.equal(z.control, 'plus-minus');
  assert.equal(z.allocationScope, 'additional-distributable-return-plan');
  assert.deepEqual([z.minLaborShare, z.initialLaborShare, z.maxLaborShare, z.stepPercentagePoints, z.shareTotal], [0, 50, 100, 10, 100]);
  assert.equal(z.modelId, null);
  assert.equal(z.expressionBands.length, 5);
  for (let share = z.minLaborShare; share <= z.maxLaborShare; share += z.stepPercentagePoints) {
    const bands = z.expressionBands.filter(b => share >= b.min && share <= b.max);
    assert.equal(bands.length, 1, `Ambiguous or missing expression band: ${share}`);
    assert(bands[0].labor && bands[0].owner);
    assert.equal(share + (z.shareTotal - share), 100);
  }
  assert.equal(z.conceptBeforeEnding, true);
  assert.equal(z.endingIsIndependentParable, true);
  assert.equal(z.postDialogueNarration, false);
  assert.deepEqual(z.endingPairs, [
    { daughter: '这么冷，为什么不烧煤？', father: '家里没钱买煤。' },
    { daughter: '为什么没钱？', father: '我失业了，没了这份工资。' },
    { daughter: '为什么失业？', father: '矿上说煤太多，卖不出去，停了我的活。' },
  ]);
  const prologueText = fs.readFileSync(local(z.source), 'utf8');
  assert(prologueText.includes(z.version));
  assert(prologueText.indexOf('## 社会关系全景与概念') < prologueText.indexOf('## 父女结束语'));
  for (const pair of z.endingPairs) {
    assert(prologueText.includes(`> 女儿：${pair.daughter}`));
    assert(prologueText.includes(`> 父亲：${pair.father}`));
  }
  assert.deepEqual(p.sharedEnding, ['C01', 'C02', 'C03', 'C04']);
  assert.equal(p.mainNodesPerRoute, 13);
  assert.equal(p.aiFormalStartRolePosition, 7);
  assert.deepEqual(p.roles.find(r => r.id === 'public_worker').subtypes, ['administrative', 'us_house_representative']);
  unique(p.packs.map(x => x.id), 'pack');
  assert.equal(p.packs.length, 18);
  const covered = new Set();
  for (const pack of p.packs) {
    assert.equal(pack.status, 'planned');
    assert.equal(pack.releaseApproved, false);
    assert(['P0', 'P1', 'P2'].includes(pack.priority));
    assert(pack.missingAssets.length && pack.states.length && pack.sceneRefs.length);
    unique(pack.familyIds, `family in ${pack.id}`);
    pack.familyIds.forEach(id => { assert(familyIds.has(id), `Unknown family: ${id}`); covered.add(id); });
    pack.existingFiles.forEach(file => assert(fs.statSync(local(file)).isFile(), `Missing input: ${file}`));
    pack.sceneRefs.forEach(id => assert(/^(Z00|C0[1-4]|P(0[1-9]|[12]\d|3[0-5])|roles|all|public_worker)$/.test(id), `Invalid scene: ${id}`));
  }
  assert.equal(covered.size, familyIds.size, 'A legacy resource family is not mapped into V8');
  const s = p.statistics;
  assert.equal(s.status, 'contract-not-implemented');
  assert.equal(s.showAfterChoice, true);
  assert.equal(s.blocksProgress, false);
  assert.equal(s.replayInFirstCounts, false);
  assert.equal(s.responseContainsIndividualTrajectories, false);
  assert.equal(s.notVerifiedNaturalPersonCount, true);
  assert.deepEqual(s.eventFields, ['classId', 'playId', 'roleId', 'nodeId', 'scenarioId', 'scenarioVersion', 'modelId', 'modelVersion', 'contentVersion', 'baselineId', 'choiceId', 'eventId', 'attemptType']);
  assert.deepEqual(s.firstSubmissionKey, ['classId', 'playId', ...s.groupBy.slice(1)]);
  assert.deepEqual(s.groupBy, ['classId', 'roleId', 'nodeId', 'scenarioId', 'scenarioVersion', 'modelId', 'modelVersion', 'contentVersion', 'baselineId']);
  assert.deepEqual(s.attemptTypes, ['first', 'replay']);
  assert.deepEqual(s.states, ['loading', 'empty', 'live', 'stale', 'offline', 'error']);
  assert.deepEqual(p.packs.find(x => x.id === 'B08').states, s.states);
  assert(s.noCollectedFields.every(field => !s.eventFields.includes(field)));
}

function validateFile(f) {
  const bytes = fs.readFileSync(local(f.path));
  assert.equal(bytes.length, f.bytes, `Byte drift: ${f.path}`);
  assert.equal(digest(bytes), f.sha256, `Hash drift: ${f.path}`);
  if (f.width !== undefined) {
    assert(bytes.subarray(0, 8).equals(pngSignature), `Invalid PNG: ${f.path}`);
    assert.equal(bytes.readUInt32BE(16), f.width);
    assert.equal(bytes.readUInt32BE(20), f.height);
    assert.equal(bytes[25], f.colorType);
  }
}

function list(dir) {
  return fs.readdirSync(local(dir), { withFileTypes: true }).flatMap(e => {
    const p = `${dir}/${e.name}`;
    assert(!e.isSymbolicLink(), `Symlink not allowed in snapshot: ${p}`);
    return e.isDirectory() ? list(p) : [p];
  });
}

try {
  validatePreparation(prep);
  unique(inventory.files.map(f => f.path), 'inventory path');
  assert.deepEqual(inventory.roots, ['public/assets', 'public/evidence']);
  const actual = inventory.roots.flatMap(list).sort();
  assert.deepEqual(inventory.files.map(f => f.path).sort(), actual, 'Inventory incomplete or stale');
  inventory.files.forEach(validateFile);
  const provenance = json(prep.rights.originalSourceProvenance);
  assert.equal(provenance.commit, prep.rights.originalCommit);
  for (const source of provenance.files) {
    const frozen = inventory.files.find(f => f.path === source.path);
    assert(frozen, `Source omitted: ${source.path}`);
    assert.equal(frozen.sha256, source.sha256, `Source hash drift: ${source.path}`);
  }
  for (const machine of prep.rights.generatedMachines) {
    const f = inventory.files.find(f => f.path === machine);
    assert(f);
    assert.deepEqual([f.width, f.height, f.colorType], [1774, 887, 6]);
  }
  assert.equal(prep.rights.deprecatedSvgReuse, false);
  assert.equal(inventory.files.filter(f => f.path.startsWith('public/assets/workshop-v6/') && f.path.endsWith('.svg')).length, 19);
  const docs = ['重构方案/20_可复用参考与工具选型.md', '美术资源/10_V8资产准备与制作清单.md'];
  let links = 0;
  for (const doc of docs) {
    const text = fs.readFileSync(local(doc), 'utf8');
    for (const [, href] of text.matchAll(/\]\(([^)]+)\)/g)) {
      if (/^https?:/.test(href)) continue;
      const target = path.resolve(path.dirname(local(doc)), href.split('#')[0]);
      assert(target.startsWith(root + path.sep) && fs.existsSync(target), `Broken local link: ${doc} -> ${href}`);
      links++;
    }
  }
  const negatives = [
    p => p.packs[1].id = p.packs[0].id,
    p => p.packs[0].familyIds.push('A99'),
    p => p.packs[0].existingFiles.push('public/assets/does-not-exist-v8.png'),
    p => p.roles[0].nodes[0].modules.push('P21'),
    p => p.statistics.groupBy.pop(),
    p => p.prologueInteraction.stepPercentagePoints = 20,
    p => p.prologueInteraction.expressionBands[0].max = 40,
    p => p.prologueInteraction.endingPairs[2].father = '这是玩家必然造成的结果。',
  ];
  for (const mutate of negatives) {
    const bad = structuredClone(prep); mutate(bad);
    assert.throws(() => validatePreparation(bad), 'Negative control not detected');
  }
  assert.throws(() => validateFile({ ...inventory.files[0], sha256: '0'.repeat(64) }));
  console.log(JSON.stringify({ status: 'PASS', scope: 'Preparation records only, not UI or server QA', roles: prep.roles.length, mainNodesPerRoute: 13, plannedPacks: prep.packs.length, legacyFamiliesMapped: familyIds.size, files: inventory.files.length, pngs: inventory.files.filter(f => f.width !== undefined).length, bytes: inventory.files.reduce((n, f) => n + f.bytes, 0), originalSources: provenance.files.length, prologueShareStates: 11, expressionBands: 5, endingPairs: 3, localLinks: links, negativeControls: negatives.length + 1 }, null, 2));
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
}
