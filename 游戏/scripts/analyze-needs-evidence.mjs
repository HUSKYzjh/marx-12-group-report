import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spaceAccount,careAccount,SPACE_CAPACITIES,SPACE_MODES,CARE_MODES} from '../lib/needs-experiment.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidence=JSON.parse(await fs.readFile(path.join(root,'data/needs-evidence.json'),'utf8'));
const get=id=>{const r=evidence.observations.find(o=>o.id===id);if(!r)throw new Error(id);return r.value;};
const analysis={checked:evidence.checked,method:'Rounded aggregate arithmetic, NOT causal inference. Historical awards, targets and projections excluded from these descriptive calculations.',
 findings:{worldNurseIncreaseMillion:get('who-nurses-2023')-get('who-nurses-2018'),worldNurseIncreasePercent:(get('who-nurses-2023')/get('who-nurses-2018')-1)*100,worldShortageDecreaseMillion:get('who-shortage-2020')-get('who-shortage-2023'),nurseDensityCountryGroupRatio:(get('who-nurse-concentration')/get('who-pop-concentration'))/((100-get('who-nurse-concentration'))/(100-get('who-pop-concentration'))),womenShareOfCareRelatedNonparticipationPercent:100*get('ilo-out-care-women')/get('ilo-out-care'),china60PlusSharePercent:100*get('cn-60plus-2025')/get('cn-pop-2025'),china60PlusGrowthPercent:100*get('cn-60plus-increase')/(get('cn-60plus-2025')-get('cn-60plus-increase')),chinaNurseDensityIncreasePercent:100*(get('cn-nurse-density-2025')/get('cn-nurse-density-2020')-1)},
 limitations:['WHO reporting coverage changed; endpoints are not a balanced country panel.','Geographic nursing concentration does not measure class wealth or ownership.','Age alone does not establish care need.','Care-related nonparticipation denominator is not all women.','No comparison of Moon contracts to GDP; no permanent overproduction cure inferred.'],
 teachingScenarios:{space:SPACE_CAPACITIES.flatMap(c=>SPACE_MODES.map(m=>spaceAccount(c,m,3))),care:CARE_MODES.map(careAccount)}};
const destination=path.join(root,'outputs/needs-research/analysis.json');
if(process.argv.includes('--check')){if(JSON.stringify(JSON.parse(await fs.readFile(destination,'utf8')))!==JSON.stringify(analysis))throw new Error('Stale needs analysis');console.log('Reproducible: 19 source rows, 8 descriptive calculations, 13 separate teaching scenarios.');}
else{await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,JSON.stringify(analysis,null,2)+'\n');console.log(JSON.stringify(analysis.findings,null,2));}
