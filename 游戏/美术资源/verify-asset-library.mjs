import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import atlases from '../public/assets/workshop-v6/trust-frames.mjs';

// Logical library and design coverage only. No files are modified.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const local = p => {
  assert(typeof p === 'string' && !path.isAbsolute(p) && !p.split(/[\\/]/).includes('..'), `Unsafe path: ${p}`);
  const q = path.resolve(root, p);
  assert(q.startsWith(root + path.sep));
  return q;
};
const read = p => fs.readFileSync(local(p), 'utf8');
const json = p => JSON.parse(read(p).replace(/^\uFEFF/, ''));
const library = json('美术资源/asset-library-v8.json');
const inventory = json(library.inventory);
const prep = json(library.preparation);
const provenance = json('public/assets/trust-source/provenance.json');
const packIds = new Set(prep.packs.map(p => p.id));
const unique = xs => assert.equal(new Set(xs).size, xs.length, 'Duplicate library identifier or path');

function verify(lib) {
  assert.equal(lib.schemaVersion, 1);
  unique(lib.records.map(r => r.id));
  unique(lib.records.map(r => r.path));
  assert.deepEqual(lib.records.map(r => r.path).sort(), inventory.files.map(r => r.path).sort(), 'Library does not cover frozen inventory');
  for (const r of lib.records) {
    assert(Object.hasOwn(lib.groups, r.group), `Unknown group: ${r.group}`);
    assert.equal(r.releaseApproved, false, `Unsupported release claim: ${r.path}`);
    const f = inventory.files.find(f => f.path === r.path);
    for (const key of ['bytes', 'sha256', 'width', 'height', 'colorType']) assert.equal(r[key], f[key], `Inventory drift: ${r.path} ${key}`);
    const bytes = fs.readFileSync(local(r.path));
    assert.equal(bytes.length, r.bytes);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), r.sha256, `File drift: ${r.path}`);
    const expectedPacks = prep.packs.filter(p => p.existingFiles.includes(r.path)).map(p => p.id);
    assert.deepEqual(r.packIds, expectedPacks, `Pack mapping drift: ${r.path}`);
    r.packIds.forEach(id => assert(packIds.has(id)));
    const source = provenance.files.find(s => s.path === r.path);
    if (source) {
      assert.equal(r.source.url, source.sourceUrl);
      assert.equal(r.source.commit, provenance.commit);
      assert.equal(r.source.licenseRecord, source.licenseRecord);
      assert.equal(r.disposition, source.disposition);
      assert.equal(r.group, r.path.endsWith('.png') ? 'original-art' : r.path.endsWith('.json') ? 'original-frame-data' : 'original-license');
    }
    if (r.group.startsWith('deprecated')) {
      assert.equal(r.disposition, 'do-not-reuse');
      assert.equal(r.packIds.length, 0, `Deprecated asset recommended: ${r.path}`);
    }
    if (prep.rights.generatedMachines.includes(r.path)) {
      assert.equal(r.group, 'generated-art');
      assert(!r.source.licenseRecord.startsWith('CC0'), 'Generated machine misattributed');
    }
    const atlasName = path.basename(r.path).replace(/\.(png|json)$/, '');
    if (r.frameAtlas) {
      assert.equal(r.frameAtlas.name, atlasName);
      assert.equal(r.frameAtlas.frameCount, Object.keys(atlases[atlasName].frames).length);
      assert.equal(r.frameAtlas.metadataOnly, true);
    }
    if (r.source.record) assert(fs.existsSync(local(r.source.record)));
    assert(r.note && r.source && r.disposition);
  }
  const count = group => lib.records.filter(r => r.group === group).length;
  assert.equal(count('original-art'), 18);
  assert.equal(count('original-frame-data'), 8);
  assert.equal(count('deprecated-art'), 19);
  assert.equal(count('deprecated-components'), 4);
  assert.equal(count('generated-art'), 2);
  assert.equal(count('evidence-image'), 4);
  assert.equal(lib.records.filter(r => r.path.endsWith('.json') && r.frameAtlas).reduce((n, r) => n + r.frameAtlas.frameCount, 0), 51);
}

try {
  verify(library);
  const guide = read('美术资源/12_资产库导航与复用指南.md');
  for (const r of library.records) assert(guide.includes(`](../${r.path})`), `Missing navigation: ${r.path}`);
  const gameplay = read('重构方案/22_七阶段玩法与角色接入.md');
  const ids = [...gameplay.matchAll(/^### (G\d{2}) /gm)].map(m => m[1]);
  assert.deepEqual(ids, Array.from({ length: 20 }, (_, i) => `G${String(i + 1).padStart(2, '0')}`));
  for (let i = 1; i <= 35; i++) assert(gameplay.includes(`P${String(i).padStart(2, '0')}`), `Unmapped content module: P${i}`);
  assert(gameplay.includes('Z00') && gameplay.includes('八个角色节点加四个共同结尾'));
  const workflow = read('重构方案/21_Codex游戏开发流程.md');
  assert(workflow.includes('https://developers.openai.com/showcase/codex-pet-arena'));
  assert(workflow.includes('https://developers.openai.com/blog/how-to-build-games-with-astra'));
  let links = 0;
  for (const doc of ['美术资源/12_资产库导航与复用指南.md', '重构方案/21_Codex游戏开发流程.md', '重构方案/22_七阶段玩法与角色接入.md']) {
    for (const [, href] of read(doc).matchAll(/\]\(([^)]+)\)/g)) {
      if (/^https?:/.test(href)) continue;
      const target = path.resolve(path.dirname(local(doc)), href.split('#')[0]);
      assert(target.startsWith(root + path.sep) && fs.existsSync(target), `Broken link: ${doc} ${href}`);
      links++;
    }
  }
  const mutations = [
    x => x.records[1].id = x.records[0].id,
    x => x.records.pop(),
    x => x.records.find(r => r.group === 'deprecated-art').packIds.push('B02'),
    x => x.records.find(r => r.group === 'generated-art').source.licenseRecord = 'CC0-1.0',
    x => x.records[0].sha256 = '0'.repeat(64),
    x => x.records.find(r => r.group === 'original-art').source.url = 'https://invalid.example/source',
  ];
  for (const mutate of mutations) {
    const bad = structuredClone(library); mutate(bad);
    assert.throws(() => verify(bad), 'Negative control not caught');
  }
  console.log(JSON.stringify({ status: 'PASS', files: library.records.length, categories: Object.keys(library.groups).length, deprecatedFiles: 23, atlasSidecars: 8, atlasFrames: 51, sourceFiles: provenance.files.length, stageGameplayCandidates: 20, prologueCandidates: 1, sourceModulesMentioned: 35, localLinks: links, negativeControls: mutations.length, scope: 'Asset integrity and design-document coverage; not gameplay, visual QA, theoretical validation or release approval' }, null, 2));
} catch (e) {
  console.error(`FAIL: ${e.message}`);
  process.exitCode = 1;
}
