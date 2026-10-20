import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=async p=>JSON.parse(await fs.readFile(new URL(p,root),'utf8'));

test('all nine short reading pages reference distinct, traceable archival JPEGs with unchanged bytes',async()=>{
 const data=await read('lib/relief-reading-data.json'),manifest=await read('public/assets/history/manifest.json');
 assert.deepEqual(Object.keys(data),['consumption','investment','exports']);
 const used=new Set();assert.equal(manifest.images.length,9);
 for(const route of Object.values(data)){
  assert.equal(route.pages.length,3);
  for(const page of route.pages){
   assert(page.text.length<=75,'Each page has one short paragraph');assert(page.headline.length<=18);
   assert(!used.has(page.photo));used.add(page.photo);
   const photo=manifest.images.find(p=>p.id===page.photo);assert(photo);
   assert.equal(photo.catalog_id,page.catalog);assert.equal(photo.source_record,`https://www.loc.gov/item/${page.catalog}/`);
   assert.match(photo.download_url,/^https:\/\/cdn\.loc\.gov\/service\/pnp\//);
   assert(photo.creator&&photo.date_in_catalog&&photo.rights_advisory);assert.match(photo.modifications,/None/);
   const bytes=await fs.readFile(new URL('public/assets/history/'+photo.file,root));
   assert.equal(bytes.readUInt16BE(),0xffd8);assert.equal(bytes.length,photo.bytes);
   assert.equal(createHash('sha256').update(bytes).digest('hex'),photo.sha256);
  }
 }
 assert.equal(used.size,9);
});
