import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function missingHan(text,ranges){
 // esbuild and nested iframe documents may escape Unicode; inspect those too.
 const decoded=text.replace(/\\u\{([0-9a-f]{1,6})\}|\\u([0-9a-f]{4})/gi,(_,long,short)=>String.fromCodePoint(parseInt(long??short,16)));
 const chars=[...new Set(decoded.match(/\p{Script=Han}/gu)??[])];
 return chars.filter(char=>{const code=char.codePointAt(0);let lo=0,hi=ranges.length-1;while(lo<=hi){const mid=(lo+hi)>>1,[a,b]=ranges[mid];if(code<a)hi=mid-1;else if(code>b)lo=mid+1;else return false;}return true;}).sort();
}
export function validateFontCoverage(font,coverage){
 const digest=createHash('sha256').update(font).digest('hex');
 if(digest!==coverage.sha256)throw new Error('Font coverage is stale: regenerate it with prepare-hand-font.py');
 let previous=-1,count=0;
 for(const range of coverage.ranges){if(!Array.isArray(range)||range.length!==2||!range.every(Number.isInteger)||range[0]<=previous||range[1]<range[0]||range[1]>0x10ffff)throw new Error('Invalid font coverage ranges');previous=range[1];count+=range[1]-range[0]+1;}
 if(count!==coverage.codepoints)throw new Error('Font coverage count does not match its ranges');
 return {codepoints:count,sha256:digest};
}
export async function checkFontCoverage(text){
 const font=await fs.readFile(path.join(root,'public/assets/fonts/workshop-hand.woff2'));
 const coverage=JSON.parse(await fs.readFile(path.join(root,'public/assets/fonts/coverage.json'),'utf8'));
 const verified=validateFontCoverage(font,coverage);
 const missing=missingHan(text,coverage.ranges);
 if(missing.length)throw new Error('Handwriting font lacks Chinese glyphs: '+missing.map(c=>c+' (U+'+c.codePointAt(0).toString(16).toUpperCase()+')').join(', '));
 return {...verified,missingHan:[]};
}
