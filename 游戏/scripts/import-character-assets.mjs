// Fetch only the pinned author's artwork/reference code. Never run upstream JS.
// Existing source files are verified, not overwritten. No audio, weapon or gore assets.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = '7c68c7e44e66b5be95ebd07d22391de707090397';
const repo = 'https://raw.githubusercontent.com/ncase/wbwwb/' + sha;
const images = ['body', 'body_red', 'hangry', 'face', 'face_angry', 'face_nervous', 'face_snobby',
  'face_snobby_hmph', 'hat', 'hatguy', 'happy_weirdo', 'helping',
  'lovehat', 'lover_shirt', 'lover_panic', 'peace'];
const sources = ['js/game/Peep.js', 'js/game/AnimationProp.js', 'js/lib/helpers.js',
  ...['NormalPeep', 'CrazyPeep', 'NervousPeep', 'PanicPeep', 'AngryPeep',
    'SnobbyPeep', 'HatPeep', 'HappyWeirdoPeep', 'LoverPeep', 'HelpingAnim',
    'ProtestAnim'].map(s => 'js/peeps/' + s + '.js'), 'README.md'];
const files = [
  ...images.flatMap(s => ['png', 'json'].map(ext => ({ upstream: `sprites/peeps/${s}.${ext}`, local: `public/assets/wbwwb-source/${s}.${ext}` }))),
  ...['candlelight', 'lovers_watching'].flatMap(s => ['png', 'json'].map(ext => ({ upstream: `sprites/misc/${s}.${ext}`, local: `public/assets/wbwwb-source/${s}.${ext}` }))),
  ...['cam/cam.png', 'cam/cam-flash.png', 'cam/cam-instructions.png', 'tv.png'].map(s => ({ upstream: 'sprites/' + s, local: 'public/assets/wbwwb-source/' + s })),
  ...sources.map(upstream => ({ upstream, local: 'vendor/ncase-wbwwb/' + upstream })),
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const records = [];
// Small bounded batches; preserve an exact hash for every imported source.
for (let offset = 0; offset < files.length; offset += 4) {
  await Promise.all(files.slice(offset, offset + 4).map(async item => {
    const url = repo + '/' + item.upstream;
    let bytes;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`${res.status}: ${url}`);
        bytes = Buffer.from(await res.arrayBuffer()); break;
      } catch (err) { if (attempt === 2) throw err; }
    }
    const destination = path.resolve(root, item.local);
    if (!destination.startsWith(root + path.sep)) throw new Error('Outside project');
    let existing;
    try { existing = await fs.readFile(destination); } catch (err) { if (err.code !== 'ENOENT') throw err; }
    if (existing && !existing.equals(bytes)) throw new Error('Refusing to overwrite changed source: ' + item.local);
    if (!existing) { await fs.mkdir(path.dirname(destination), { recursive: true }); await fs.writeFile(destination, bytes, { flag: 'wx' }); }
    const record = { path: item.local, upstreamPath: item.upstream, sourceUrl: url,
      bytes: bytes.length, sha256: hash(bytes), gitBlobSha: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') };
    if (item.local.endsWith('.png')) { record.width = bytes.readUInt32BE(16); record.height = bytes.readUInt32BE(20); }
    records.push(record);
  }));
  console.log(`Verified ${Math.min(offset + 4, files.length)}/${files.length}`);
}
records.sort((a,b) => a.path.localeCompare(b.path));
// This is generated provenance, not authored game code.
const manifest = { creator: 'Nicky Case', repository: 'https://github.com/ncase/wbwwb', commit: sha,
  retrievedOn: '2026-10-03', license: 'CC0-1.0 (author-owned art/code; third-party sounds excluded)',
  scope: 'Character/action resource library only; reference JS is not executed or bundled into the game', files: records };
const output = path.join(root, 'public/assets/wbwwb-source/provenance.json');
const generated = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
try {
  const existing = await fs.readFile(output);
  if (!existing.equals(generated)) {
    const previous = JSON.parse(existing.toString('utf8'));
    if (previous.commit !== sha || previous.files.some(old => !records.some(r => r.path === old.path && r.sha256 === old.sha256))) throw new Error('Existing provenance differs; review before updating');
    await fs.writeFile(output, generated); // Verified additive regeneration only.
  }
}
catch (err) { if (err.code !== 'ENOENT') throw err; await fs.writeFile(output, generated, { flag: 'wx' }); }
console.log(`Imported ${records.length} pinned source files. No original assets changed.`);
