import test from 'node:test';
import assert from 'node:assert/strict';
import {initialCourse,courseRound,courseMoves,courseIssue,nextCourse} from '../public/assets/market-duel/course-model.mjs';
import {steadyChallenge,restoreSteadyBest,steadyBestGain,rememberSteadyBest,STEADY_CHALLENGE} from '../public/assets/market-duel/steady-challenge.mjs';
import {restoreBattleSnapshot} from '../lib/battle-session.ts';
const run=actions=>actions.reduce((s,a)=>courseRound(s,a),initialCourse());

test('every legal three-day path is bounded by the advertised maximum; holding is the reference',()=>{
 const outcomes=[];
 function visit(s){if(s.world.day===3){outcomes.push(steadyChallenge(s).gain);return;}for(const m of courseMoves(s))if(!courseIssue(s,m.id))visit(courseRound(s,m.id));}
 visit(initialCourse());assert(outcomes.length>305);
 assert.equal(Math.max(...outcomes),STEADY_CHALLENGE.maxGain);
 assert.equal(steadyChallenge(run(['hold','hold','hold'])).gain,STEADY_CHALLENGE.baselineGain);
 const best=run(['price-up','price-up','hold']);assert.equal(best.world.shops[0].cash,87);
 assert.deepEqual(best.world.history.map(r=>r.sold[0]),[6,6,6]);assert(steadyChallenge(best).atMaximum);
});
test('coaching follows the actual move and never mutates accounts or recommends a forced action',()=>{
 for(const move of ['hold','price-up','price-down','buy','upgrade','hire','fire']){
  const s=run([move]),before=structuredClone(s),c=steadyChallenge(s);
  assert(c.hint.length>0&&c.hint.length<25);assert.equal(c.gain,s.world.shops[0].cash-36);assert.deepEqual(s,before);
 }
 assert.equal(steadyChallenge(nextCourse(run(['hold','hold','hold']))),null);
 assert.equal(steadyChallenge(initialCourse(false)),null);
});
test('best result is reconstructed from moves, survives replay and cannot be inflated with a score field',()=>{
 const ordinary=run(['hold','hold','hold']),maximum=run(['price-up','price-up','hold']);
 let best=rememberSteadyBest(null,ordinary);assert.equal(steadyBestGain(best),21);
 best=rememberSteadyBest(best,maximum);assert.equal(steadyBestGain(best),51);
 assert.strictEqual(rememberSteadyBest(best,ordinary),best);
 assert.strictEqual(rememberSteadyBest(best,initialCourse()),best);
 assert.equal(restoreSteadyBest({...best,gain:999}),null);
 for(const actions of [[],['hold','hold'],['wage-down','wage-down','hold'],['oops','hold','hold']])assert.equal(restoreSteadyBest({version:1,actions}),null);
 const snapshot={state:maximum,view:'result',openingRead:true,steadyBest:best};
 assert.deepEqual(restoreBattleSnapshot(JSON.parse(JSON.stringify(snapshot))),snapshot);
 const legacy={state:ordinary,view:'choose'};assert.deepEqual(restoreBattleSnapshot(legacy),legacy);
 assert.deepEqual(restoreBattleSnapshot({...legacy,steadyBest:{version:1,actions:['invalid']}}),legacy,'bad optional record never erases a valid game');
});
