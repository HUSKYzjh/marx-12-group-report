import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const commit='6ec45d73befdb922bd40654dd1c1c903a953562f';
const response=await fetch(`https://api.github.com/repos/ncase/trust/git/trees/${commit}?recursive=1`);
if(!response.ok)throw new Error(`Source verification: HTTP ${response.status}`);
const tree=(await response.json()).tree;
const originals=['assets/tournament/peep_characters.png','assets/iterated/iterated_machine.png','assets/iterated/iterated_coin.png','LICENSE'];
const provenance=[];
for(const original of originals){
 const local=original==='LICENSE'?'LICENSE.txt':path.basename(original);
 const data=await fs.readFile(path.join(root,'public/assets/trust',local));
 const blob=crypto.createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
 if(tree.find(t=>t.path===original)?.sha!==blob)throw new Error(`Original mismatch: ${original}`);
 provenance.push({file:local,original,commit,git_blob_sha:blob,sha256:crypto.createHash('sha256').update(data).digest('hex'),license:'CC0-1.0',creator:'Nicky Case'});
}
await fs.writeFile(path.join(root,'public/assets/trust/provenance.json'),JSON.stringify(provenance,null,2));
console.log('Verified 3 original images and CC0 license against the pinned source commit.');
