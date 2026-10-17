import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
// These files are reproducible outputs, deliberately absent from a checkout.
// Prepare them from the tracked evidence before tests try to verify them.
for(const name of ['build-battle-embed','analyze-automation-evidence','analyze-needs-evidence','analyze-ownership-evidence','analyze-market-rules-evidence']){
 const result=spawnSync(process.execPath,[`scripts/${name}.mjs`],{cwd:root,encoding:'utf8'});
 if(result.error||result.status!==0){process.stderr.write(result.stdout||'');process.stderr.write(result.stderr||'');throw result.error||new Error(`${name} failed (${result.status})`);}
 console.log(`Prepared ${name}`);
}
