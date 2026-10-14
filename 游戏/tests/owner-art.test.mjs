import test from 'node:test';
import assert from 'node:assert/strict';
import {operatingBalance,ownerEmotion} from '../public/assets/market-duel/owner-art.mjs';
const round=(income,cost,stock=0)=>({receipts:[{from:'customer',to:'f0',reason:'买面包',amount:income},{from:'f0',to:'worker',reason:'工资',amount:cost}],stock:[stock,0]});
test('owner expressions follow settled results and consecutive streaks',()=>{
 const gain=round(10,5),loss=round(3,5),zero=round(5,5);
 assert.equal(ownerEmotion([],0).mood,'neutral');
 assert.equal(ownerEmotion([gain],0).mood,'gain');
 assert.equal(ownerEmotion([gain,gain],0).mood,'winning');
 assert.equal(ownerEmotion([gain,gain,loss],0).mood,'loss');
 assert.equal(ownerEmotion([gain,loss,loss],0).mood,'losing');
 assert.equal(ownerEmotion([gain,zero,gain],0).streak,1);
 assert.equal(ownerEmotion([loss,zero],0).mood,'neutral');
 assert.equal(ownerEmotion([gain],1).mood,'neutral');
});
test('capital purchases and withdrawals do not masquerade as operating losses',()=>{
 const r=round(18,8,7);
 r.receipts.push({from:'f0',to:'supplier',reason:'原料',amount:3},{from:'f0',to:'supplier',reason:'购炉',amount:8},{from:'f0',to:'owner',reason:'取现',amount:2},{from:'f0',to:'supplier',reason:'保管欠款',amount:4});
 assert.equal(operatingBalance(r,0),5);
 assert.equal(ownerEmotion([r],0).mood,'gain');
});
