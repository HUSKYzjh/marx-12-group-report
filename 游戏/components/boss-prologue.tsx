'use client';
import { useEffect, useLayoutEffect, useId, useReducer, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import {
  FIRMS, RELATIONS, ENDING_PAIRS, BASIC_CONTRADICTION, PROLOGUE_STORAGE_KEY,
  initialPrologue, prologueReducer, expressions, visiblePlans,
  type FirmId, type Relation, type PrologueState, type PrologueAction,
} from '@/lib/prologue-state';
import { Product, ProloguePerson, RelationMark, SmallMachine, CoalScene } from './prologue-art';

const relationNames: Record<Relation, string> = {
  customers: '谁来买', cooperation: '一起生产', ownership: '归谁所有', control: '谁来安排', payment: '钱分给谁',
};
const titles: Record<PrologueState['scene'], string> = {
  opening: '大家都想把货卖出去', bakery: '第一幕·更大的烤炉', 'bakery-upgrade':'第一幕·更大的烤炉', 'bakery-expansion':'第一幕·更大的烤炉', allocation: '给工人多少？你来定。',
  network: '等等，谁来买你的东西？', concept: '一起生产，分别占有。',
  ending: '再看一个小故事', routes: '接下来，你想从哪里开始？',
  market: '新版市场实验', relief: '新版三条出路', street:'第二幕·面包卖给谁？', 'street-summary':'第三幕·卖不掉的面包',
  epilogue:'序章·尾声',assumptions:'如果换个条件？',technology:'如果换一种技术安排？','needs-technology':'需要很多，谁来买？','ownership-technology':'钱分了，谁说了算？','market-rules':'改改买卖的规矩',
};
function SourceNotes() {
  return <details className="pg-notes">
    <summary>来源与说明</summary>
    <div>
      <p>四家公司和煤矿父女情节，改编自<a href="https://www.zhihu.com/question/264895929/answer/1906437501" target="_blank" rel="noreferrer">遨游之舟的知乎回答</a>，依据用户提供的文本。作者原文著作权归作者所有，商业转载请联系作者获得授权，非商业转载请注明出处。这里是改编的教学故事，不是历史实录；署名不代表已取得改编发布许可。</p>
      <p>人物身体、帽子、眼睛、表情与眉毛沿用 Nicky Case <a href="https://github.com/ncase/trust" target="_blank" rel="noreferrer">《信任的进化》</a>的 CC0 图集，按<a href="https://github.com/ncase/trust/blob/gh-pages/js/sims/Iterated.js" target="_blank" rel="noreferrer">原作的分层方法</a>装配。新增手臂姿态、产品和关系符号由本作绘制；不沿用原作的合作／欺骗收益规则或人物性格。</p>
      <p>这里的老板是资本所有者兼经营决策者。分的是预先给定的一笔新增可分配金额，比例不是全部工资，也不代表老板个人财富。金色小圆每个表示10个百分点，移动只表示分配方案变化，不是实际付款。公司留下的钱还可能投资、支付其他费用；销量好不一定利润就高。</p>
      <p>表情只是故事反馈，不是幸福测量。购物线表示可能购买，生产线表示共同依靠的条件；此处不计算销售、库存、利润、失业或经济危机。没有收入排行榜，也没有正确分法。</p>
      <p>基本矛盾的定义采用马克思主义政治经济学的通行表述；消费不足只是可能的表现与机制之一，不替代定义。本序章描绘私人资本主义企业，不用它直接描述社会主义国家。选择只保存在本机，不上传或展示虚构的课堂统计。</p>
      <p>开场引句摘自司马迁《史记·货殖列传》：“天下熙熙，皆为利来。”古文是引入，不是现代经济理论的证据。</p>
    </div>
  </details>;
}
function FirmTabs({ state, send }: { state: PrologueState; send: (a: PrologueAction) => void }) {
  return <div className="pg-firm-tabs" role="group" aria-label="换一家公司的老板">
    {FIRMS.map(f => <button key={f.id} type="button" aria-pressed={state.activeFirmId === f.id}
      aria-label={`切换到${f.id}${f.name}`} onClick={() => send({ type: 'SELECT_FIRM', firmId: f.id })}
      style={{ '--firm-color': f.color } as CSSProperties}>
      <Product firmId={f.id} /><span>{f.name}</span>
    </button>)}
  </div>;
}
function AllocationCoins({ share }: { share: number }) {
  const workerParts = share / 10;
  return <svg className="pg-coin-flow" viewBox="0 0 640 86" aria-hidden="true" data-testid="allocation-coins" data-worker-parts={workerParts}>
    <path d="M 65 38 L 70 72 L 195 72 L 200 38 M 440 38 L 445 72 L 570 72 L 575 38" fill="none" stroke="#bbb" strokeWidth="2.5" />
    {Array.from({ length: 10 }, (_, i) => {
      const worker = i < workerParts, n = worker ? i : i - workerParts;
      return <g key={i} className="pg-moving-coin" data-recipient={worker ? 'worker' : 'company'}
        style={{ transform: `translate(${(worker ? 82 : 457) + n % 5 * 24}px, ${n < 5 ? 37 : 59}px)` }}>
        <circle r="10" fill="#edc34c" stroke="#8b6d28" strokeWidth="2" /><path d="M -3 -3 L 3 -3 M 0 -6 L 0 6 M -3 3 L 3 3" fill="none" stroke="#8b6d28" strokeWidth="1.7" />
      </g>;
    })}
  </svg>;
}
function Allocation({ state, send }: { state: PrologueState; send: (a: PrologueAction) => void }) {
  const firm = FIRMS.find(f => f.id === state.activeFirmId)!;
  const share = state.allocationPlans[firm.id].laborShare;
  const face = expressions(share);
  const [feedback, setFeedback] = useState('试着点一下。');
  useEffect(() => setFeedback(state.adjustedFirmIds.includes(firm.id) ? '这家记住了你的分法。' : '试着点一下。'), [firm.id]); // shares deliberately don't reset the click feedback
  const adjust = (delta: -10 | 10) => {
    send({ type: 'ADJUST_SHARE', delta });
    setFeedback(share + delta === 50 ? '又回到了刚才的分法。' : delta > 0
      ? '工人多拿了一些。公司少留了一些。' : '公司留下的多了。工人这次拿到的少了。');
  };
  return <>
    <p className="pg-situation"><span className="pg-firm-label">{firm.name} · 你来当老板</span><br />你们的产品上个季度销量不错。</p>
    <div className="pg-allocation-scene" style={{ '--firm-color': firm.color } as CSSProperties} data-firm={firm.id}>
      <div className="pg-cast pg-workers">
        <div className="pg-worker-pair" key={String(face.labor)}>
          <div style={{ viewTransitionName: `firm-${firm.id}-worker` }}><ProloguePerson mood={face.labor} hat={firm.hat} label={`${firm.name}的工人甲`} /></div>
          <ProloguePerson mood={face.labor} hat={firm.hat === 13 ? 12 : 13} label={`${firm.name}的工人乙`} />
        </div>
        <span className="pg-person-label">工人们</span>
      </div>
      <div className="pg-desk"><div style={{ viewTransitionName: `firm-${firm.id}-product` }}><Product firmId={firm.id} /></div><span>这次拿来分的钱</span><svg viewBox="0 0 130 55" aria-hidden="true"><path d="M 8 12 L 121 12 L 111 49 L 18 49 Z" fill="#efcf69" stroke="#333" strokeWidth="4" /><path d="M 18 12 Q 63 -2 110 12" fill="none" stroke="#333" strokeWidth="4" /></svg></div>
      <div className="pg-cast pg-boss" key={String(face.owner)} style={{ viewTransitionName: `firm-${firm.id}-owner` }}>
        <ProloguePerson mood={face.owner} role="owner" hat={14} label={`${firm.name}的老板`} />
        <span className="pg-person-label">你 · 老板</span>
      </div>
      <AllocationCoins share={share} />
    </div>
    <div className="pg-distribution">
      <div className="pg-share-line"><span>给工人 <strong data-testid="labor-share">{share}%</strong></span><span>留在公司 <strong data-testid="retained-share">{100 - share}%</strong></span></div>
      <div className="pg-share-bar" role="img" aria-label={`给工人${share}%，留在公司${100 - share}%`}>
        <span style={{ width: `${share}%` }} /><span style={{ width: `${100 - share}%` }} />
      </div>
      <div className="pg-stepper" role="group" aria-label="调整给工人的份额">
        <button type="button" className="pg-step" aria-label="给工人少分10个百分点" disabled={share === 0} onClick={() => adjust(-10)}>−</button>
        <span>点 ＋ 或 −，换个分法</span>
        <button type="button" className="pg-step" aria-label="给工人多分10个百分点" disabled={share === 100} onClick={() => adjust(10)}>＋</button>
      </div>
      <p className="pg-feedback" role="status" aria-live="polite" aria-atomic="true">{feedback}</p>
    </div>
    <div className="pg-actions">
      <button className="pg-secondary" onClick={() => send({ type: 'SELECT_FIRM', firmId: FIRMS[(FIRMS.findIndex(f => f.id === firm.id) + 1) % 4].id })}>换一家 →</button>
      <button className="pg-primary" onClick={() => send({ type: 'SHOW_NETWORK' })}>看看大家 ↗</button>
    </div>
    <FirmTabs state={state} send={send} />
  </>;
}
function RelationshipBoard({ state, send }: { state: PrologueState; send?: (a: PrologueAction) => void }) {
  const plans = visiblePlans(state), kind = state.scene === 'concept' ? 'ownership' : state.relationFocus;
  const isCustomers = kind === 'customers', isShared = kind === 'cooperation';
  const selected = state.customerFirmId;
  const board = useRef<HTMLDivElement>(null), arrowId = useId();
  const [geometry, setGeometry] = useState({ width: 800, height: 510, paths: [] as string[] });
  useLayoutEffect(() => {
    const root = board.current;
    if (!root || (!isCustomers && !isShared)) return;
    const measure = () => {
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const point = (el: Element, edge: 'person' | 'product' | 'hub') => {
        const r = el.getBoundingClientRect();
        if (edge === 'product') return {
          x: r.left - rect.left + (r.left - rect.left + r.width / 2 < rect.width / 2 ? r.width + 8 : -8),
          y: r.top - rect.top + r.height / 2,
        };
        return { x: r.left - rect.left + r.width / 2,
          y: r.top - rect.top + (edge === 'person' ? r.height * .72 : r.height / 2) };
      };
      const paths: string[] = [];
      const source = root.querySelector('.pg-market-source .pg-person');
      const hub = root.querySelector('.pg-shared-hub');
      if (isCustomers && source) for (const target of root.querySelectorAll('.pg-firm-card header .pg-product')) {
        const a = point(source, 'person'), b = point(target, 'product');
        const bend = Math.abs(a.x - b.x) < 140 ? 65 : 0;
        paths.push(`M ${a.x} ${a.y} C ${a.x + bend} ${a.y - 40}, ${b.x + bend} ${b.y + 45}, ${b.x} ${b.y}`);
      }
      if (isShared && hub) for (const person of root.querySelectorAll('.pg-customer .pg-person')) {
        const a = point(person, 'person'), b = point(hub, 'hub');
        paths.push(`M ${a.x} ${a.y} Q ${a.x} ${b.y}, ${b.x} ${b.y}`);
      }
      setGeometry(previous => previous.width === rect.width && previous.height === rect.height && previous.paths.join('|') === paths.join('|')
        ? previous : { width: rect.width, height: rect.height, paths });
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(root);
    root.addEventListener('animationend', measure);
    return () => { observer.disconnect(); root.removeEventListener('animationend', measure); };
  }, [kind, selected, isCustomers, isShared, state.demoActive]);
  return <div ref={board} className={`pg-board pg-board-${kind}`} data-testid="relationship-board" data-relation={kind}>
    {(isCustomers || isShared) && <svg className="pg-network-lines" viewBox={`0 0 ${geometry.width} ${geometry.height}`} aria-hidden="true">
      <defs><marker id={arrowId} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><polygon points="0,0 6,3 0,6" fill="#bbb" /></marker></defs>
      {geometry.paths.map((d, i) => <path key={`${kind}-${selected}-${state.demoActive}-${i}`} d={d} pathLength="1"
        className="pg-drawn-link" style={{ '--link-delay': `${i * 100}ms` } as CSSProperties}
        markerEnd={isCustomers ? `url(#${arrowId})` : undefined} />)}
    </svg>}
    {isCustomers && <div className="pg-market-source" key={`${selected}-${state.demoActive}`}>
      <div style={{ viewTransitionName: `firm-${selected}-worker` }}><ProloguePerson label={`${FIRMS.find(f => f.id === selected)!.name}的工人`} mood={expressions(plans[selected].laborShare).labor}
        hat={FIRMS.find(f => f.id === selected)!.hat} phase="customers" /></div>
      <strong>工人，也是顾客</strong><span>{FIRMS.find(f => f.id === selected)!.name}的工人</span>
    </div>}
    {isShared && <div className="pg-shared-hub"><RelationMark kind="cooperation" /><span>供电 · 运输 · 工具</span></div>}
    {FIRMS.map(f => {
      const face = expressions(plans[f.id].laborShare);
      return <article className={`pg-firm-card ${isCustomers && selected === f.id ? 'pg-card-selected' : ''}`} key={f.id} data-firm-node={f.id} style={{ '--firm-color': f.color } as CSSProperties}>
        <header><div style={{ viewTransitionName: `firm-${f.id}-product` }}><Product firmId={f.id} /></div><h3>{f.name}</h3></header>
        {!isCustomers && <div className="pg-card-people">
          {!isShared && <div style={{ viewTransitionName: `firm-${f.id}-owner` }}><ProloguePerson role="owner" label={`${f.name}的老板`} hat={14} mood={face.owner} phase="relations" /><span>老板</span></div>}
          {!isShared && <div className="pg-card-link"><RelationMark kind={kind} /><span>{kind === 'ownership' ? '拥有' : kind === 'control' ? '安排' : '分配方案'}</span></div>}
          {kind === 'ownership' ? <div className="pg-card-machine"><SmallMachine /><span>厂房、机器</span></div>
            : <button className="pg-customer" onClick={() => send?.({ type: 'SELECT_CUSTOMER', firmId: f.id })}
              disabled={!isCustomers} aria-pressed={isCustomers ? selected === f.id : undefined} aria-label={`看看${f.id}${f.name}的工人`} style={{ viewTransitionName: `firm-${f.id}-worker` }}>
              <ProloguePerson label={`${f.name}的工人`} mood={face.labor} hat={f.hat} phase={isCustomers ? 'customers' : 'relations'} /><span>{isCustomers ? '工人，也是顾客' : '工人'}</span>
            </button>}
        </div>}
        {kind === 'payment' && <footer><span>给工人 <b>{plans[f.id].laborShare}%</b></span><span>留在公司 <b>{plans[f.id].retainedShare}%</b></span></footer>}
      </article>;
    })}
    {isCustomers && <div className="pg-customer-picker" role="group" aria-label="换一家的工人看看">
      {FIRMS.map(f => <button key={f.id} className="pg-customer" aria-label={`看看${f.id}${f.name}的工人`}
        aria-pressed={selected === f.id} onClick={() => send?.({ type: 'SELECT_CUSTOMER', firmId: f.id })}>{f.name}</button>)}
    </div>}
  </div>;
}
function Network({ state, send }: { state: PrologueState; send: (a: PrologueAction) => void }) {
  const focus = state.relationFocus;
  const firm = FIRMS.find(f => f.id === state.customerFirmId)!;
  const copy: Record<Relation, string> = {
    customers: '他们在这里挣钱，也会去别家买东西。',
    cooperation: '做东西，要靠很多人一起。供电、运输和工具，也把各家连在一起。',
    ownership: '但厂房和机器，归各家的老板。一起生产，不等于一起拥有。',
    control: '谁来干、怎么干？这里由各家的老板安排。',
    payment: '这次拿来分的钱，各家公司自己决定怎么分。图上还是方案，没有实际付款。',
  };
  return <>
    <p className="pg-situation" role="status">{copy[focus]}</p>
    <RelationshipBoard state={state} send={send} />
    {focus === 'customers' && <div className="pg-what-if">
      {!state.demoActive ? <button className="pg-text-button" onClick={() => send({ type: 'SHOW_DEMO' })}>如果各家都给工人20%呢？ ↗</button>
        : <div className="pg-demo" role="status"><b>另看一种情况：各家给工人20%。</b><p>{state.allocationPlans[firm.id].laborShare > 20 ? '这家的工人少拿了，能花的钱也少了。' : state.allocationPlans[firm.id].laborShare < 20 ? '相比你的分法，这家的工人反而多拿了。' : '这家的分法没有变。'}<span> 假设其他收入、物价不变；不改你的记录。</span></p><button className="pg-secondary" onClick={() => send({ type: 'LEAVE_DEMO' })}>回到我的分法</button></div>}
    </div>}
    <div className="pg-actions">
      <button className="pg-secondary" onClick={() => send({ type: 'BACK_TO_ALLOCATION' })}>← 回去分一分</button>
      {focus === 'customers' ? <button className="pg-primary" onClick={() => { send({ type: 'LEAVE_DEMO' }); send({ type: 'SHOW_RELATION', relation: 'cooperation' }); }}>不只是买东西 →</button>
        : focus === 'cooperation' ? <button className="pg-primary" onClick={() => send({ type: 'SHOW_RELATION', relation: 'ownership' })}>那厂房归谁？ →</button>
        : <button className="pg-primary" onClick={() => send({ type: 'SHOW_CONCEPT' })}>把两件事放在一起 →</button>}
    </div>
    <div className="pg-network-options">
      <details className="pg-relation-explorer"><summary>换一种关系看</summary><div className="pg-relation-tabs" role="group" aria-label="查看不同关系">
        {RELATIONS.map(r => <button key={r} aria-pressed={focus === r} onClick={() => {
          send({ type: 'LEAVE_DEMO' }); send({ type: 'SHOW_RELATION', relation: r });
        }}><RelationMark kind={r} /><span>{relationNames[r]}</span></button>)}
      </div></details>
      <details className="pg-plan-details"><summary>查看四家的分法</summary><div>{FIRMS.map(f => <p key={f.id}>{f.name}<br /><b>给工人 {state.allocationPlans[f.id].laborShare}%</b><br />留在公司 {state.allocationPlans[f.id].retainedShare}%</p>)}</div></details>
    </div>
  </>;
}
function Concept({ send }: { state: PrologueState; send: (a: PrologueAction) => void }) {
  return <>
    <div className="pg-concept-stage">
      <div className="pg-concept-shared"><RelationMark kind="cooperation" /><strong>做东西，靠大家。</strong><span>分工 · 知识 · 供电 · 运输</span></div>
      <svg className="pg-concept-links" viewBox="0 0 640 54" aria-hidden="true"><path d="M 320 0 L 320 22 M 80 54 L 80 22 L 560 22 L 560 54 M 240 22 L 240 54 M 400 22 L 400 54" pathLength="1" /></svg>
      <div className="pg-concept-firms">{FIRMS.map(f => <div key={f.id}><span>{f.name}</span><RelationMark kind="ownership" /><SmallMachine /><small>各家的老板拥有</small></div>)}</div>
    </div>
    <div className="pg-definition"><small>资本主义基本矛盾</small><p>{BASIC_CONTRADICTION.split(/(生产社会化|生产资料资本主义私人占有)/).map((part, i) => i % 2 ? <span key={i}>{part}</span> : part)}</p></div>
    <details className="pg-explain"><summary>再说一句</summary><p>多分一点，工人能受益。但钱怎么分，和厂房归谁，不是同一件事。少买东西可能让生意难做，却不等于经济一定会崩。</p></details>
    <div className="pg-actions"><button className="pg-secondary" onClick={() => send({ type: 'BACK_TO_ALLOCATION' })}>← 回去试试</button><button className="pg-primary" onClick={() => send({ type: 'SHOW_ENDING' })}>再看一个小故事 →</button></div>
  </>;
}
function Ending({ state, send }: { state: PrologueState; send: (a: PrologueAction) => void }) {
  const all = state.endingViewMode === 'all';
  const last = all || state.endingPairIndex === 2;
  const pairs = all ? ENDING_PAIRS : [ENDING_PAIRS[state.endingPairIndex]];
  return <>
    <p className="pg-parable-label">改编故事，不是这局的结果。</p>
    <div className="pg-ending-tableau" key={all ? 'all' : state.endingPairIndex} data-story-beat={all ? 'all' : state.endingPairIndex}><CoalScene /></div>
    <div className={`pg-dialogue ${all ? 'pg-dialogue-all' : ''}`} role="status" aria-live="polite" aria-atomic="true" key={all ? 'all' : state.endingPairIndex}>
      {pairs.map(pair => <div className="pg-dialogue-pair" key={pair.daughter}><p><span>女儿：</span>{pair.daughter}</p><p><span>父亲：</span>{pair.father}</p></div>)}
    </div>
    {!last ? <div className="pg-actions"><button className="pg-secondary" onClick={() => send({ type: 'SHOW_ALL' })}>一次看完</button><button className="pg-primary" onClick={() => send({ type: 'NEXT_PAIR', expectedIndex: state.endingPairIndex })}>继续 →</button></div>
      : <div className="pg-ending-exits"><button className="pg-primary" onClick={() => send({ type: 'ENTER_ROUTES', entrance: 'individual' })}>从个人开始 →</button><button className="pg-primary" onClick={() => send({ type: 'ENTER_ROUTES', entrance: 'enterprise' })}>从公司开始 →</button><button className="pg-text-button" onClick={() => send({ type: 'BACK_TO_ALLOCATION' })}>回头看看</button></div>}
  </>;
}
export default function BossPrologue({ onLegacy, onExperiment }: { onLegacy: () => void; onExperiment?: (entrance: 'individual' | 'enterprise') => void }) {
  const [state, dispatch] = useReducer(prologueReducer, undefined, initialPrologue);
  const [loaded, setLoaded] = useState(false), [storageUnavailable, setStorageUnavailable] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null), first = useRef(true);
  useEffect(() => {
    try { const saved = localStorage.getItem(PROLOGUE_STORAGE_KEY); if (saved) dispatch({ type: 'RESTORE', snapshot: saved }); }
    catch { setStorageUnavailable(true); }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(PROLOGUE_STORAGE_KEY, JSON.stringify(state)); }
    catch { setStorageUnavailable(true); }
  }, [state, loaded]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [state.scene, state.relationFocus]);
  const transitioning = useRef(false);
  const pendingVisualActions = useRef<PrologueAction[] | null>(null);
  const send = (action: PrologueAction) => {
    if (!loaded) return;
    // Preserve event order if a player clicks again before the visual callback.
    if (pendingVisualActions.current) { pendingVisualActions.current.push(action); return; }
    const cinematic = ['SHOW_NETWORK', 'BACK_TO_ALLOCATION', 'SHOW_RELATION', 'SHOW_CONCEPT', 'SELECT_FIRM'].includes(action.type);
    // The model commits once. A visual transition never produces money or blocks a later input.
    if (cinematic && document.startViewTransition && !transitioning.current
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      transitioning.current = true;
      pendingVisualActions.current = [action];
      const transition = document.startViewTransition(() => {
        const actions = pendingVisualActions.current ?? [];
        pendingVisualActions.current = null;
        flushSync(() => actions.forEach(next => dispatch(next)));
      });
      void transition.finished.catch(() => {}).finally(() => { transitioning.current = false; });
    } else dispatch(action);
  };
  const activeTitle = state.scene === 'network' && state.relationFocus !== 'customers'
    ? relationNames[state.relationFocus] + '？' : titles[state.scene];
  const stage = state.scene === 'opening' ? 0 : state.scene === 'allocation' ? 1
    : state.scene === 'network' ? 2 : state.scene === 'concept' ? 3 : state.scene === 'ending' ? 4 : 5;
  return <main className={`boss-prologue pg-scene-${state.scene}`} data-scene={state.scene} data-ready={loaded}>
    <header className="pg-header"><span>技术红利，归谁？ <span className="pg-header-divider">／</span> 序章</span>
      {!['ending', 'routes'].includes(state.scene) && <button className="pg-text-button" disabled={!loaded} onClick={() => send({ type: 'SKIP_PROLOGUE' })}>跳过序章</button>}
    </header>
    <div className="pg-progress" aria-label={`序章阶段：${['开场', '分钱', '看联系', '看区别', '小故事', '选择入口'][stage]}`}>
      {['分钱', '看联系', '看区别', '小故事'].map((s, i) => <span key={s} aria-current={stage === i + 1 ? 'step' : undefined} data-past={stage > i + 1}><i />{s}</span>)}
    </div>
    <section className="pg-scene" aria-labelledby="pg-title">
      <h1 id="pg-title" ref={heading} tabIndex={-1}>{activeTitle}</h1>
      {state.scene === 'opening' && <div className="pg-opening">
        <div className="pg-opening-world" aria-hidden="true">{FIRMS.map(f => <div key={f.id}><Product firmId={f.id} /><ProloguePerson label="" hat={f.hat} /></div>)}</div>
        <blockquote><p>天下熙熙，皆为利来。</p><cite>司马迁《史记·货殖列传》</cite></blockquote>
        <p>先当几家公司的老板。<br />分一分钱，看看会发生什么。</p>
        <button className="pg-primary" disabled={!loaded} onClick={() => { send({ type: 'START' }); send({ type: 'CONTINUE_BAKERY' }); }}>我来当老板 →</button>
      </div>}
      {state.scene === 'allocation' && <Allocation state={state} send={send} />}
      {state.scene === 'bakery' && <div><p>面包店演示在新版动画舞台中。这个旧版入口保留原有分配实验。</p><button className="pg-primary" onClick={() => send({ type: 'CONTINUE_BAKERY' })}>继续旧版分配 →</button></div>}
      {['bakery-upgrade','bakery-expansion','market', 'relief'].includes(state.scene) && <p>这段存档属于新版动画舞台。请回到主页继续；旧版没有覆盖你的选择。</p>}
      {state.scene === 'network' && <Network state={state} send={send} />}
      {state.scene === 'concept' && <Concept state={state} send={send} />}
      {state.scene === 'ending' && <Ending state={state} send={send} />}
      {state.scene === 'routes' && <div className="pg-routes">
        <div className="pg-route-options"><button className="pg-secondary" aria-pressed={state.entrance === 'individual'} onClick={() => send({ type: 'SET_ENTRANCE', entrance: 'individual' })}><ProloguePerson label="个人" hat={13} /><b>个人</b><span>从工作和生活出发</span></button><button className="pg-secondary" aria-pressed={state.entrance === 'enterprise'} onClick={() => send({ type: 'SET_ENTRANCE', entrance: 'enterprise' })}><ProloguePerson label="企业" role="owner" hat={14} /><b>公司</b><span>从生产和经营出发</span></button></div>
        <p>{state.entrance ? `先试试${state.entrance === 'individual' ? '工厂工人' : '生产企业'}的视角。` : '先选一个入口。'}<br />新片段已接入；其余角色路线仍在制作。</p>
        <div className="pg-actions"><button className="pg-secondary" onClick={() => send({ type: 'BACK_TO_ALLOCATION' })}>回头看看</button>{onExperiment && <button className="pg-primary" disabled={!state.entrance} onClick={() => state.entrance && onExperiment(state.entrance)}>去看看新机器 →</button>}</div>
        <button className="pg-text-button pg-legacy-link" onClick={onLegacy}>继续旧版小工厂 →</button>
      </div>}
    </section>
    <footer className="pg-footer"><SourceNotes /><span>{storageUnavailable ? '本机保存不可用，本次仍可正常玩。' : '只在本机记住分法，不上传选择。'}</span></footer>
  </main>;
}
