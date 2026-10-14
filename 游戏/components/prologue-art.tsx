import type { CSSProperties } from 'react';
import { type Mood, type FirmId, type Relation, FIRMS } from '@/lib/prologue-state';

/** Follow IteratedPeep's body -> hat -> face -> eyebrow composition. */
function Sprite({ frame }: { frame: number }) {
  const x = 10 + (frame % 6) * 312, y = 10 + Math.floor(frame / 6) * 412;
  return <svg viewBox={`${x} ${y} 302 402`} x="0" y="0" width="302" height="402" aria-hidden="true">
    <image href="/assets/trust/iterated_peep.png" width="2048" height="2048" />
  </svg>;
}
const moods = { '-2': '很失落', '-1': '有点失落', '0': '平静', '1': '微笑', '2': '喜笑颜开' };
export function ProloguePerson({ mood = 0, hat = 13, label, role = 'worker', phase = 'allocation' }: {
  mood?: Mood; hat?: number; label: string; role?: 'worker' | 'owner' | 'father' | 'daughter';
  phase?: 'allocation' | 'customers' | 'relations' | 'ending';
}) {
  const gaze = phase === 'customers' ? 7 : phase === 'relations' ? -5 : 0;
  const describedMood = role === 'owner' && mood === -2 ? '很紧张' : moods[String(mood) as keyof typeof moods];
  // Original frame meanings are verified in js/sims/Iterated.js, not guessed by atlas position.
  // 9 is the upset face, 8 the reward face; 5/4 are subdued outcome eyebrows.
  // Avoid temptation/evil-laugh/dizzy frames: allocation is not a morality contest.
  const faceFrame = mood === -2 ? 9 : mood === 2 ? 8 : 1;
  const browFrame = mood === -1 ? 5 : mood === 1 ? 4 : null;
  const resting = Math.abs(mood) < 2 && phase !== 'ending';
  const lean = phase === 'customers' ? 4 : phase === 'relations' ? -3 : mood * -2;
  return <svg className="pg-person" viewBox="50 105 225 315" role="img"
    aria-label={`${label}：${describedMood}${phase === 'customers' ? '，转头看商品' : phase === 'relations' ? '，看向生产联系' : ''}`}
    data-mood={mood} data-face-frame={faceFrame} data-brow-frame={browFrame ?? 'none'} data-character-role={role} data-phase={phase}>
    <g className="pg-person-pose" style={{ transform: `rotate(${lean}deg)`, transformOrigin: '155px 392px' }}>
      <Sprite frame={0} />
      <Sprite frame={hat} />
      <g className="pg-face" transform={`translate(${gaze} 0)`}>
        <g className={resting ? 'pg-eyes-open' : ''}><Sprite frame={faceFrame} /></g>
        {resting && <g className="pg-eyes-blink"><Sprite frame={2} /></g>}
        {browFrame !== null && <g className="pg-eyebrows"><Sprite frame={browFrame} /></g>}
      </g>
      <g fill="none" stroke="#333" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        {mood === 2 ? <><path d="M 141 344 Q 111 333 96 296 L 87 281" /><path d="M 171 344 Q 206 326 221 294 L 232 283" /></>
          : mood === -2 ? <><path d="M 139 346 Q 116 367 95 362 L 80 354" /><path d="M 170 347 Q 202 375 225 360 L 234 350" /></>
          : <><path d={`M 141 345 Q 113 ${360 - mood * 8} 106 ${378 - mood * 12}`} /><path d={`M 170 345 Q 196 ${360 - mood * 8} 200 ${378 - mood * 12}`} /></>}
      </g>
    </g>
  </svg>;
}

export function Product({ firmId, className = '' }: { firmId: FirmId; className?: string }) {
  const firm = FIRMS.find(f => f.id === firmId)!;
  return <svg className={`pg-product ${className}`} viewBox="0 0 120 80" role="img" aria-label={firm.product}
    fill="none" stroke="#333" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ '--firm-color': firm.color } as CSSProperties}>
    {firmId === 'A' && <><path d="M 13 53 L 22 32 L 78 32 L 93 47 L 108 49 L 108 65 L 12 65 Z" fill={firm.color} /><path d="M 31 33 L 36 19 L 65 19 L 77 32" /><path d="M 44 20 L 44 32" /><circle cx="31" cy="64" r="10" fill="#fffdf7" /><circle cx="88" cy="64" r="10" fill="#fffdf7" /></>}
    {firmId === 'B' && <><rect x="39" y="5" width="44" height="70" rx="8" fill={firm.color} /><rect x="44" y="13" width="34" height="49" rx="2" fill="#fffdf7" /><path d="M 56 68 L 66 68 M 49 28 L 58 19 M 52 39 L 68 23" /></>}
    {firmId === 'C' && <><path d="M 18 18 L 41 27 L 59 19 L 73 43 L 104 54 Q 114 59 109 68 L 17 68 L 14 47 Z" fill={firm.color} /><path d="M 16 59 L 106 59 M 55 31 L 69 28 M 62 42 L 77 38" /></>}
    {firmId === 'D' && <><path d="M 15 63 L 15 42 C 15 6 104 6 104 42 L 104 63 Q 59 76 15 63 Z" fill="#dfb877" /><path d="M 37 31 L 30 44 M 59 27 L 52 42 M 82 31 L 75 44 M 18 56 Q 57 68 102 56" /></>}
  </svg>;
}
export function RelationMark({ kind }: { kind: Relation }) {
  return <svg className={`pg-mark pg-mark-${kind}`} viewBox="0 0 50 50" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    {kind === 'customers' && <><path d="M 6 11 L 13 12 L 18 32 L 39 32 L 44 18 L 15 18" /><circle cx="21" cy="40" r="3" /><circle cx="35" cy="40" r="3" /></>}
    {kind === 'cooperation' && <><circle cx="19" cy="25" r="11" /><circle cx="32" cy="25" r="11" /></>}
    {kind === 'ownership' && <><circle cx="15" cy="19" r="9" /><path d="M 22 25 L 40 43 M 31 34 L 36 29 M 36 39 L 41 34" /></>}
    {kind === 'control' && <><path d="M 9 40 L 42 40 M 24 38 L 35 15 M 10 20 L 22 20 M 18 15 L 23 20 L 18 25" /><circle cx="36" cy="12" r="6" fill="currentColor" /></>}
    {kind === 'payment' && <><circle cx="18" cy="22" r="12" fill="#f0cb58" /><path d="M 18 16 L 18 28 M 14 18 L 22 18 M 14 24 L 22 24 M 33 27 L 44 27 L 39 22 M 44 27 L 39 32" /></>}
  </svg>;
}
export function SmallMachine({ upgraded = false }: { upgraded?: boolean }) {
  return <svg className="pg-machine" viewBox="90 40 1400 800" role="img" aria-label={upgraded ? '新机器' : '公司的旧机器'}>
    <image href={upgraded ? '/assets/workshop-v6/machine-new-v1.png' : '/assets/workshop-v6/machine-old-v1.png'} width="1774" height="887" />
  </svg>;
}
export function CoalScene() {
  return <div className="pg-coal-scene" aria-label="面包师父和女儿面对空篮，远处还有卖不掉的面包" role="img">
    <div className="pg-family" aria-hidden="true">
      <ProloguePerson label="父亲" role="father" mood={-1} hat={13} phase="ending" />
      <ProloguePerson label="女儿" role="daughter" mood={-1} hat={15} phase="ending" />
    </div>
    <svg viewBox="0 0 650 170" className="pg-coal-ground" aria-hidden="true" fill="none" stroke="#333" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 15 145 Q 185 140 280 145 M 370 145 L 635 145" />
      <path d="M 243 105 L 253 141 L 310 141 L 322 105 M 252 103 Q 280 59 313 103" />
      {[410,460,510,560].map((x,i)=><image key={x} href="/assets/bakery/bread.svg" x={x} y={90+i%2*20} width="70" height="45" />)}
    </svg>
    <span className="pg-coal-label">面包还在。</span>
  </div>;
}
