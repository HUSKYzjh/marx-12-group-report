'use client';
import { useEffect, useReducer, useRef, useState, type CSSProperties } from 'react';
import { initialMachine, machineReducer, machineAccount, OLD_MACHINE, PREDICTION_QUESTIONS,
  MACHINE_STORAGE_KEY, restoreMachine, type MachineAction, type Contract } from '@/lib/machine-experiment';
import { ProloguePerson, SmallMachine } from './prologue-art';
import type { Entrance } from '@/lib/prologue-state';

function Box() {
  return <svg viewBox="0 0 40 34" aria-hidden="true" fill="#fff" stroke="#444" strokeWidth="2.5" strokeLinejoin="round"><path d="M 4 9 L 21 3 L 36 10 L 36 27 L 18 32 L 4 25 Z M 4 9 L 18 16 L 36 10 M 18 16 L 18 32 M 12 6 L 27 13" /></svg>;
}
function Clock({ hours }: { hours: number }) {
  return <svg viewBox="0 0 55 55" aria-hidden="true" fill="none" stroke="#444" strokeWidth="3" strokeLinecap="round"><circle cx="27" cy="27" r="22" /><path d={`M 27 12 L 27 27 L ${hours === 4 ? '40 35' : '16 36'}`} /><path d="M 27 5 L 27 8 M 49 27 L 46 27 M 27 49 L 27 46 M 5 27 L 8 27" /></svg>;
}
function Coins({ amount }: { amount: number }) {
  return <span className="ml-coins" aria-hidden="true">{Array.from({ length: amount }, (_, i) => <svg viewBox="10 10 102 102" key={i}><image href="/assets/trust/iterated_coin.png" width="128" height="128" /></svg>)}</span>;
}
const contracts: { id: Contract; label: string }[] = [
  { id: 'unchanged', label: '合同照旧' }, { id: 'pay', label: '假设谈成加薪' }, { id: 'time', label: '假设谈成早点下班' },
];
export default function MachineExperiment({ entrance, onBack }: { entrance: Entrance; onBack: () => void }) {
  const [state, dispatch] = useReducer(machineReducer, undefined, initialMachine);
  const [loaded, setLoaded] = useState(false), [canSave, setCanSave] = useState(true);
  const title = useRef<HTMLHeadingElement>(null);
  const worker = entrance === 'individual';
  useEffect(() => {
    try {
      const snapshots = JSON.parse(localStorage.getItem(MACHINE_STORAGE_KEY) || '{}');
      const restored = restoreMachine(snapshots[entrance]);
      dispatch({ type: 'RESTORE', snapshot: restored });
    } catch { setCanSave(false); }
    setLoaded(true);
  }, [entrance]);
  const current = state;
  const send = (a: MachineAction) => {
    if (!loaded) return;
    dispatch(a);
  };
  useEffect(() => {
    if (!loaded) return;
    try {
      let snapshots: Record<string, unknown> = {};
      try { snapshots = JSON.parse(localStorage.getItem(MACHINE_STORAGE_KEY) || '{}'); } catch { /* preserve UI even after a corrupt snapshot */ }
      if (!snapshots || typeof snapshots !== 'object' || Array.isArray(snapshots)) snapshots = {};
      localStorage.setItem(MACHINE_STORAGE_KEY, JSON.stringify({ ...snapshots, [entrance]: current }));
    } catch { setCanSave(false); }
  }, [current, entrance, loaded]);
  useEffect(() => { title.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }, [current.phase, current.questionIndex]);
  const a = machineAccount(current), upgraded = a.technology;
  const q = PREDICTION_QUESTIONS[current.questionIndex];
  const headline = current.phase === 'quote' ? '机器快了，日子会怎样？' : current.phase === 'predict' ? q.question
    : current.phase === 'ready' ? '猜好了？开动机器。' : current.phase === 'result' ? '产量翻倍，工资呢？' : '同一台机器，三种约定。';
  const copy = current.phase === 'compare' ? current.contract === 'pay' ? '这次，谈成了加薪。工时没改。'
    : current.contract === 'time' ? '这次，谈成了保薪缩时。做原来那么多，早些下班。' : '新机器，原来的合同。'
    : current.phase === 'result' ? '产品翻倍了。工资和下班时间，还是原来的。'
    : worker ? '你是这家工厂的工人。今天，要换一台新机器。' : '你经营这家工厂。今天，要换一台新机器。';
  return <main className="boss-prologue machine-experiment" data-machine-phase={current.phase} data-role={worker ? 'worker' : 'producer'} data-ready={loaded}>
    <header className="pg-header"><span>技术红利，归谁？ ／ 新机器</span><button className="pg-text-button" onClick={onBack}>← 回到入口</button></header>
    <section className="pg-scene" aria-labelledby="ml-title">
      <h1 ref={title} id="ml-title" tabIndex={-1}>{headline}</h1>
      {current.phase === 'quote' ? <div className="ml-intro">
        <SmallMachine upgraded />
        <blockquote><p>工欲善其事，必先利其器。</p><cite>《论语·卫灵公》</cite></blockquote>
        <p>{worker ? '先从工厂工人的一天开始。' : '先从生产企业的一天开始。'}</p>
        <button className="pg-primary" disabled={!loaded} onClick={() => send({ type: 'BEGIN' })}>去工厂 →</button>
      </div> : <>
        <p className="pg-situation" role="status">{copy}</p>
        <div className={`ml-stage ${upgraded ? 'ml-upgraded' : ''}`}>
          <div className="ml-workers"><ProloguePerson label="工人甲" hat={13} mood={current.phase === 'compare' && current.contract !== 'unchanged' ? 1 : 0} /><ProloguePerson label="工人乙" hat={12} mood={current.phase === 'compare' && current.contract !== 'unchanged' ? 1 : 0} /><span>{worker ? '你和同事' : '两位工人'}</span></div>
          <div className="ml-machine"><div className="ml-machine-body" key={upgraded ? 'new' : 'old'}><SmallMachine upgraded={upgraded} />
            {current.phase === 'result' && <svg className="ml-motion-lines" viewBox="0 0 220 150" aria-hidden="true" fill="none" stroke="#999" strokeWidth="2.5" strokeLinecap="round"><path d="M 3 40 L 29 40 M 8 59 L 35 59 M 2 79 L 23 79" /></svg>}
          </div><span>{upgraded ? '新机器' : '旧机器'}</span></div>
          <div className="ml-owner"><ProloguePerson label="老板" role="owner" hat={14} mood={upgraded ? 1 : 0} /><span>{worker ? '老板' : '你 · 经营者'}</span></div>
        </div>
        <div className="ml-results" aria-live="polite" aria-atomic="true" data-focus={current.phase === 'predict' ? q.id : 'products'}>
          <div className="ml-output" data-metric="products"><div className="ml-boxes" aria-hidden="true">{Array.from({ length: a.produced }, (_, i) => <span key={i} className={i >= OLD_MACHINE.produced ? 'ml-new-box' : ''} style={{ '--box-delay': `${Math.max(0, i - OLD_MACHINE.produced) * 75 + 350}ms` } as CSSProperties}><Box /></span>)}</div><span><span className="ml-metric-label">一天做 </span><span className="ml-metric-value"><strong>{a.produced}</strong> 件</span></span>{upgraded && <small>{a.produced === OLD_MACHINE.produced * 2 ? '产量 × 2' : `旧机器：${OLD_MACHINE.produced} 件`}</small>}</div>
          <div data-metric="wages"><Coins amount={a.wageEach} /><span><span className="ml-metric-label">每人工资 </span><span className="ml-metric-value"><strong>{a.wageEach}</strong> 枚</span></span>{upgraded && <small>原来：{OLD_MACHINE.wageEach} 枚</small>}</div>
          <div data-metric="hours"><Clock hours={a.hours} /><span><span className="ml-metric-label">一天工作 </span><span className="ml-metric-value"><strong>{a.hours}</strong> 小时</span></span>{upgraded && <small>原来：{OLD_MACHINE.hours} 小时</small>}</div>
        </div>
        {current.phase === 'predict' && <div className="ml-question">
          <p className="ml-prompt">先猜一猜 · {current.questionIndex + 1} / 3</p>
          <div className="pg-actions">{q.choices.map(c => <button key={c.value} className="ml-answer" onClick={() => send({ type: 'PREDICT', questionIndex: current.questionIndex, value: c.value })}>{c.label}</button>)}</div>
        </div>}
        {current.phase === 'ready' && <div className="pg-actions"><button className="pg-primary" onClick={() => send({ type: 'RUN' })}>换上新机器 →</button></div>}
        {current.phase === 'result' && <div className="pg-actions"><button className="pg-primary" onClick={() => send({ type: 'COMPARE' })}>工资、时间，能改吗？ →</button></div>}
        {current.phase === 'compare' && <>
          <div className="ml-contracts" role="group" aria-label="单独比较三种合同">{contracts.map(c => <button className="pg-text-button" key={c.id} aria-pressed={current.contract === c.id} onClick={() => send({ type: 'CONTRACT', contract: c.id })}>{c.label}</button>)}</div>
          <p className="ml-insight">机器让改变成为可能。<br />钱和时间，还要看怎样约定。</p>
          <p className="ml-role-limit">{worker ? '你可以提出愿望，不能一个人改合同。' : '这里是在比较合同条件，不代表现实中已经谈成。'}</p>
          <div className="pg-actions"><button className="pg-secondary" onClick={() => send({ type: 'RESTART' })}>再试一次 ↺</button><button className="pg-primary" onClick={onBack}>回到入口 →</button></div>
        </>}
        <details className="ml-details"><summary>把账打开看看</summary>
          <p>这是人为设定的教学工厂，不是现实测量。每厂两人，价格每件3枚，先假定全部售出。新机器同时改变加工能力、材料和设备耗用；合同对照各从同一新机基准出发，不叠加。</p>
          <dl>{[['收入', a.revenue], ['材料', a.materials], ['设备', a.equipment], ['工资合计', a.wages], ['公司结余', a.surplus]].map(([label, amount]) => <div key={label}><dt>{label}</dt><dd>{amount} 枚</dd></div>)}</dl>
          <p>公司结余＝收入－材料－设备－工资。结余不是剩余价值率，也不是老板个人财富。换角色不再生产一次；序章百分比不进入这本账。</p>
          {upgraded && <p>你刚才的预测：{PREDICTION_QUESTIONS.map(question => `${question.id === 'products' ? '产品' : question.id === 'wages' ? '工资' : '工时'}——${question.choices.find(c => c.value === current.predictions[question.id])?.label}`).join('；')}。没有成绩或观点排名。</p>}
        </details>
      </>}
    </section>
    <footer className="pg-footer"><span>工厂工人／生产企业首个实验片段，其余角色与完整路线尚未接入。</span><span>{canSave ? '只在本机保存实验，不上传。' : '本机保存不可用，本次仍可玩。'}</span></footer>
  </main>;
}
