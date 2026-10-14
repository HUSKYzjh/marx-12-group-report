import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {automationAccount,AUTOMATION_RATES,AUTOMATION_MODES} from '../lib/automation-experiment.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidence=JSON.parse(await fs.readFile(path.join(root,'data/automation-evidence.json'),'utf8'));
const get=id=>{const row=evidence.observations.find(r=>r.id===id);if(!row)throw new Error(id);return row.value;};
export const analysis={checked:evidence.checked,method:'Aggregate arithmetic, not a causal regression. Rounded inputs imply rounded results.',
 findings:{chinaProductionRatio:get('cn-production-2025')/get('cn-production-2020'),chinaProductionIncreasePercent:(get('cn-production-2025')/get('cn-production-2020')-1)*100,chinaProductionCAGRPercent:((get('cn-production-2025')/get('cn-production-2020'))**(1/5)-1)*100,
 femaleMinusMaleOccupationalExposurePP:get('ilo-female-occupation')-get('ilo-male-occupation'),femaleToMaleOccupationalExposureRatio:get('ilo-female-occupation')/get('ilo-male-occupation')},
 notComputed:['Robot production minus installations is NOT exports.','Occupational exposure is NOT observed layoffs.','No ownership, wage-share or national-system effect inferred from installation rankings.'],
 scenarios:AUTOMATION_RATES.flatMap(rate=>AUTOMATION_MODES.map(mode=>automationAccount(rate,mode)))};
if(process.argv.includes('--check')){
 const actual=JSON.parse(await fs.readFile(path.join(root,'outputs/automation-research/analysis.json'),'utf8'));
 if(JSON.stringify(actual)!==JSON.stringify(analysis))throw new Error('Analysis is stale; rerun generator');
 console.log('Evidence analysis reproducible: 14 observations, 5 descriptive calculations, 20 separate teaching scenarios.');
}else{
 await fs.mkdir(path.join(root,'outputs/automation-research'),{recursive:true});
 await fs.writeFile(path.join(root,'outputs/automation-research/analysis.json'),JSON.stringify(analysis,null,2)+'\n');
 console.log(JSON.stringify(analysis.findings,null,2));
}
