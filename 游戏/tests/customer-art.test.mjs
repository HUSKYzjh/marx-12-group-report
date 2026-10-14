import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CUSTOMER_LOOKS,customerMarkup,PEDESTRIAN_LOOKS,pedestrianMarkup} from '../public/assets/market-duel/customer-art.mjs';
const atlas=Object.fromEntries(['body','face','face_nervous','hatguy','trust'].map(name=>[name,JSON.parse(fs.readFileSync(new URL('../public/assets/'+(name==='trust'?'trust/iterated_peep':'wbwwb-source/'+name)+'.json',import.meta.url),'utf8').replace(/^\uFEFF/,''))]));

test('wandering shoppers have twelve stable outfits, separate from chef uniforms and wallets',()=>{
 assert.equal(new Set(PEDESTRIAN_LOOKS).size,12);
 const looks=new Set();
 for(let id=0;id<24;id++){
  const normal=pedestrianMarkup(atlas,id),worried=pedestrianMarkup(atlas,id,{worried:true});
  looks.add(normal.match(/data-look="([^"]+)"/)[1]);
  assert.equal(normal.match(/<g data-outfit[\s\S]*<\/g>/)[0],worried.match(/<g data-outfit[\s\S]*<\/g>/)[0]);
  assert.match(normal,new RegExp('data-shopper-id="'+id+'"'));
  assert.doesNotMatch(normal,/data-work-hat|data-person-id|data-hat-stripe/);
  assert.match(worried,/face_nervous/);
  assert.equal(pedestrianMarkup(atlas,id),normal);
 }
 assert.equal(looks.size,12);
 for(const id of [-1,1.5,NaN])assert.throws(()=>pedestrianMarkup(atlas,id));
 const ui=fs.readFileSync(new URL('../public/assets/market-duel/course-game.mjs',import.meta.url),'utf8');
 assert.match(ui,/id=>pedestrianMarkup\(atlas,id\)/);
 assert.match(ui,/pedestrianMarkup\(atlas,v.id,\{worried:!v.bought\}\)/);
});
test('both crews wear matching chef uniforms, with a black hat stripe only on the rival crew',()=>{
 assert.equal(new Set(CUSTOMER_LOOKS.slice(0,4)).size,1);assert.equal(new Set(CUSTOMER_LOOKS.slice(4,8)).size,1);
 for(let id=0;id<8;id++){
  const html=customerMarkup(atlas,id,{working:true});
  assert(html.includes('data-work-hat="toque"'));assert.equal(html.includes('data-hat-stripe="black"'),id>=4);
  const body=html.match(/<svg class="customer-body"[\s\S]*<\/svg>/)[0];
  const sameTeam=customerMarkup(atlas,id<4?0:4,{working:true}).match(/<svg class="customer-body"[\s\S]*<\/svg>/)[0];
  assert.equal(body,sameTeam);
 }
});

test('uniforms preserve all eleven identities and the distinct owners and supplier',()=>{
 for(let id=0;id<11;id++){const html=customerMarkup(atlas,id,{working:id<8});assert(html.includes(`data-person-id="${id}"`));assert(html.includes(`data-look="${CUSTOMER_LOOKS[id]}"`));}
 assert(customerMarkup(atlas,8).includes('data-character="round-monocle"'));
 assert(customerMarkup(atlas,9).includes('data-character="square-parted-hair"'));
 assert(customerMarkup(atlas,10).includes('原料商'));
});
test('unemployment removes work hats, while clothes and worried expressions keep the same identity',()=>{
 for(let id=0;id<8;id++){
  const work=customerMarkup(atlas,id,{working:true}),idle=customerMarkup(atlas,id,{working:false,worried:true});
  assert(work.includes('data-work-hat'));assert(!idle.includes('data-work-hat'));assert(!idle.includes('data-hat-stripe'));
  assert(idle.includes(`data-look="${CUSTOMER_LOOKS[id]}"`));assert(idle.includes('face_nervous.png'));assert(idle.includes('暂时待业'));
 }
});
test('a recruited worker wears the current employer uniform, not the former team hat',()=>{
 const ours=customerMarkup(atlas,7,{working:true,employer:0});assert(ours.includes('data-look="chef-white"'));assert(!ours.includes('data-hat-stripe'));assert(ours.includes('你店里的员工'));
 const rival=customerMarkup(atlas,2,{working:true,employer:1});assert(rival.includes('data-hat-stripe'));assert(rival.includes('隔壁的员工'));
});
