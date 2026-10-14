'use client';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import {
  production,
  advanceSkills,
  footprint,
  skillsPath,
  trainingRules,
  bounded,
  type Allocation,
  type Training,
} from '@/lib/simulation';
import { sources, institutionCards, type SourceId } from '@/lib/evidence';
import { registerGameTools } from '@/lib/webmcp';
import {
  AnimatedNumber,
  Prediction,
  ProductionPlayground,
  InlineConcept,
  SkillFlow,
  BurdenDots,
  FeedbackLab,
} from '@/components/playful-scenes';

const chapters = ['生产', '分配', '未来', '边界', '制度', '再实验'];
const names = ['第一幕', '第二幕', '第三幕', '第四幕', '第五幕', '尾声'];
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
function Action({
  children,
  onClick,
  secondary = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      variant={secondary ? 'outline' : 'default'}
      className="action-button"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}
function Evidence({ ids, history }: { ids: SourceId[]; history?: string }) {
  return (
    <Accordion className="evidence">
      <AccordionItem value="evidence">
        <AccordionTrigger className="evidence-trigger">
          真实世界里，有什么证据？
          <span className="source-count">{ids.length} 项</span>
        </AccordionTrigger>
        <AccordionContent className="evidence-content">
          {history && <p className="history-note">历史回声 · {history}</p>}
          {ids.map((id) => {
            const s = sources.find((s) => s.id === id)!;
            return (
              <div className="source-row" key={id}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.label} ↗
                </a>
                <p>{s.text}</p>
              </div>
            );
          })}
          <p className="muted">
            证据整理截至2026年9月9日。文献不是游戏参数的估计依据。
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
function Assumptions({ children }: { children: React.ReactNode }) {
  return (
    <Accordion className="assumptions">
      <AccordionItem value="model">
        <AccordionTrigger className="model-trigger">
          这个模型省略了什么？
        </AccordionTrigger>
        <AccordionContent className="evidence-content">
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
function Range({
  id,
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  unit = '%',
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}) {
  return (
    <div className="range-field">
      <label id={id}>
        {label}
        <strong>
          {fmt(value)}
          {unit}
        </strong>
      </label>
      <Slider
        aria-labelledby={id}
        min={min}
        max={max}
        step={unit === '倍' ? 0.05 : 1}
        value={[value]}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
      <div className="range-ends">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}
function Metric({
  label,
  value,
  unit,
  detail,
}: {
  label: string;
  value: number;
  unit: string;
  detail?: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>
        {fmt(value)}
        <small>{unit}</small>
      </strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
function Account({
  allocation,
  share,
}: {
  allocation: Allocation;
  share: number;
}) {
  const p = production(true, allocation, share);
  return (
    <>
      <div className="account-caption">
        <span>销售收入的去向</span>
        <strong>{fmt(p.output)} 货币单位 / 日</strong>
      </div>
      <div
        className="account-bar"
        role="img"
        aria-label={`成本${p.costs}，劳动者报酬${p.wages}，企业结余${p.surplus}`}
      >
        <div
          className="cost"
          style={{ width: `${(p.costs / p.output) * 100}%` }}
        />
        <div
          className="wage"
          style={{ width: `${(p.wages / p.output) * 100}%` }}
        />
        <div
          className="surplus"
          style={{ width: `${(p.surplus / p.output) * 100}%` }}
        />
      </div>
      <div className="account-legend">
        <span>
          <i className="cost" />
          其他成本 {fmt(p.costs)}
        </span>
        <span>
          <i className="wage" />
          劳动报酬 {fmt(p.wages)}
        </span>
        <span>
          <i className="surplus" />
          企业结余 {fmt(p.surplus)}
        </span>
      </div>
      <div className="metrics">
        <Metric label="实际产出" value={p.output} unit="件 / 日" />
        <Metric
          label="每人报酬"
          value={p.wages / 10}
          unit="货币单位 / 日"
          detail="原先为4"
        />
        <Metric
          label="每人工时"
          value={p.hours}
          unit="小时 / 日"
          detail="原先为8"
        />
      </div>
    </>
  );
}
function SkillsChart({
  values,
  label = '你的六轮路径',
}: {
  values: number[];
  label?: string;
}) {
  const ceiling = Math.max(110, ...values) * 1.15;
  return (
    <figure className="skills-chart">
      <figcaption>
        {label}
        <small>熟练能力指数 · 初始100</small>
      </figcaption>
      <div
        className="skill-columns"
        role="img"
        aria-label={values.map((v, i) => `第${i}轮${fmt(v)}`).join('，')}
      >
        {Array.from({ length: 7 }, (_, i) => (
          <div className="skill-col" key={i}>
            <div className="bar-area">
              {values[i] !== undefined && (
                <div
                  style={{ height: `${(values[i] / ceiling) * 100}%` }}
                  className={values[i] < 100 ? 'decline' : 'increase'}
                >
                  <span>{fmt(values[i])}</span>
                </div>
              )}
            </div>
            <small>{i === 0 ? '开始' : `第${i}轮`}</small>
          </div>
        ))}
      </div>
      <small>柱高从0开始；显示范围随数据调整，请以标注数值比较不同实验。</small>
    </figure>
  );
}

export default function TrustGame() {
  const [chapter, setChapter] = useState(0),
    [unlocked, setUnlocked] = useState(0);
  const [adopted, setAdopted] = useState(false),
    [tried, setTried] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [allocation, setAllocation] = useState<Allocation>('retain'),
    [share, setShare] = useState(50),
    [allocated, setAllocated] = useState(false);
  const [history, setHistory] = useState<
    { stock: number; choice: Training; resources: number }[]
  >([]);
  const [growth, setGrowth] = useState(50),
    [intensity, setIntensity] = useState(30),
    [responsibility, setResponsibility] = useState(0),
    [touched, setTouched] = useState(false);
  const [institution, setInstitution] = useState(0),
    [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [labPolicy, setLabPolicy] = useState<Training>('cut'),
    [learning, setLearning] = useState(1);
  function restart() {
    setChapter(0);
    setUnlocked(0);
    setAdopted(false);
    setTried(false);
    setPrediction(null);
    setAllocation('retain');
    setShare(50);
    setAllocated(false);
    setHistory([]);
    setGrowth(50);
    setIntensity(30);
    setResponsibility(0);
    setTouched(false);
    setInstitution(0);
    setAnswers({});
    setLabPolicy('cut');
    setLearning(1);
  }
  const titleRef = useRef<HTMLHeadingElement>(null),
    first = useRef(true);
  const p = production(true, allocation, share),
    f = footprint(growth, intensity, responsibility);
  const stocks = [100, ...history.map((h) => h.stock)],
    stock = stocks.at(-1)!;
  function go(next: number) {
    bounded(next, 0, 5);
    if (!Number.isInteger(next) || next > unlocked + 1)
      throw new Error('请先完成上一幕');
    setChapter(next);
    setUnlocked((u) => Math.max(u, next));
  }
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    titleRef.current?.focus();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [chapter]);
  function train(choice: Training) {
    setHistory((h) =>
      h.length >= 6 ? h : [...h, advanceSkills(h.at(-1)?.stock ?? 100, choice)],
    );
  }
  const bridge = useRef({
    chapter,
    unlocked,
    allocation,
    share,
    growth,
    intensity,
    responsibility,
    stock,
  });
  bridge.current = {
    chapter,
    unlocked,
    allocation,
    share,
    growth,
    intensity,
    responsibility,
    stock,
  };
  useEffect(
    () =>
      registerGameTools(
        () => ({ ...bridge.current, model: 'hypothetical teaching model' }),
        (input) => {
          if (bridge.current.chapter !== 5)
            throw new Error('请先在界面进入再实验');
          const values = input as {
            share: number;
            growth: number;
            intensity: number;
            responsibility: number;
          };
          for (const k of ['share', 'growth', 'responsibility'] as const)
            bounded(values[k], 0, 100);
          bounded(values.intensity, 0, 80);
          flushSync(() => {
            setShare(values.share);
            setAllocation('share');
            setGrowth(values.growth);
            setIntensity(values.intensity);
            setResponsibility(values.responsibility);
          });
          return {
            production: production(true, 'share', values.share),
            footprint: footprint(
              values.growth,
              values.intensity,
              values.responsibility,
            ),
          };
        },
      ),
    [],
  );
  const titles = [
    <>
      机器更快了。
      <br />
      然后呢？
    </>,
    <>
      多出来的，
      <br />
      <span className="orange">归谁？</span>
    </>,
    <>
      今天少招一个人，
      <br />
      明天会怎样？
    </>,
    <>
      移出账本，
      <br />
      就消失了吗？
    </>,
    <>
      改变一条规则，
      <br />
      等于改变制度？
    </>,
    <>
      没有万能按钮。
      <br />
      <span className="orange">现在，改写条件。</span>
    </>,
  ];
  const descriptions = [
    '10个人，每人工作8小时，一共生产80件产品。现在有一项技术，能让每小时产出提高50%。你会采用吗？',
    '从这里起，采用同一项技术作比较。你暂时拿到分配权：这不是因为现实中的劳动者天然拥有这个权利。',
    '镜头拉远：一个行业的熟练能力，靠一代代新人补充。连续作六次选择，看看今天的节省会留下什么。',
    '某条供应链，原先有100单位需要处理的环境负担。技术降低了单位强度，但总生产规模也在扩大。',
    '数值实验没有替你判定国家性质。看三个真实制度情境：一项改革，究竟改变了哪个层级？',
    '你可以重玩，也可以在这里改变假设。实验能展示机制，却不能靠预设参数证明一种社会制度的全部优劣。',
  ];
  const ready =
    chapter === 0
      ? tried
      : chapter === 1
        ? allocated
        : chapter === 2
          ? history.length === 6
          : chapter === 3
            ? touched
            : chapter === 4
              ? Object.keys(answers).length === 3
              : true;
  return (
    <main className="game-shell">
      <a className="skip-link" href="#experiment-title">
        跳到当前实验
      </a>
      <header className="masthead">
        <span className="wordmark">
          技术红利<span className="orange">。</span>
        </span>
        <span className="edition">关于生产、分配与未来的互动实验</span>
        <Dialog>
          <DialogTrigger className="about-trigger">概念与来源</DialogTrigger>
          <DialogContent className="sources-dialog" showCloseButton={false}>
            <DialogTitle className="dialog-heading">
              实验，不是现实的缩小复刻
            </DialogTitle>
            <DialogDescription>
              先分清三个层级，再解释你的选择。
            </DialogDescription>
            <div className="dialog-scroll">
              <p>
                <strong>资本主义基本矛盾：</strong>
                生产社会化与生产资料资本主义私人占有之间的矛盾。不是把任何失业、污染或差距加成一个分数。
              </p>
              <p>
                <strong>社会主义中国：</strong>
                仍存在生产力与生产关系、经济基础与上层建筑的矛盾，但不能照搬资本主义矛盾的性质与解决方式。市场、民营企业和公共支付都不能单独定义国家制度。
              </p>
              <p>
                <strong>模型的地位：</strong>
                所有可调数值为教学假设；货币结余不是剩余价值率，产量不是价值量，环境责任也不是身体风险的转移。
              </p>
              {sources.map((s) => (
                <div className="source-row" key={s.id}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.label} ↗
                  </a>
                  <p>{s.text}</p>
                </div>
              ))}
              <p>
                灵感来自 Nicky Case 的{' '}
                <a
                  href="https://ncase.me/trust/"
                  target="_blank"
                  rel="noreferrer"
                >
                  The Evolution of Trust
                </a>
                ：先作猜想，再运行实验；也参考{' '}
                <a
                  href="https://ncase.me/loopy/"
                  target="_blank"
                  rel="noreferrer"
                >
                  LOOPY
                </a>{' '}
                的反馈关系表达，以及{' '}
                <a
                  href="https://ncase.me/nutshell/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Nutshell
                </a>{' '}
                的就地展开解释。本作使用原创代码、叙事和图形，不是原作续篇，也未获得原作者背书。基础研究版本：2026-09-09。
              </p>
            </div>
            <DialogClose className="close-button">回到实验</DialogClose>
          </DialogContent>
        </Dialog>
        <span className="page-count">0{chapter + 1} / 06</span>
      </header>
      <nav className="chapter-nav" aria-label="实验章节">
        {chapters.map((name, i) => (
          <button
            key={name}
            onClick={() => go(i)}
            disabled={i > unlocked}
            aria-current={chapter === i ? 'step' : undefined}
          >
            <span>0{i + 1}</span>
            {name}
          </button>
        ))}
      </nav>
      <section className="chapter-head">
        <span className="eyebrow">
          {names[chapter]} · {chapters[chapter]}{' '}
          <span className="model-stamp">教学情景</span>
        </span>
        <h1 id="experiment-title" ref={titleRef} tabIndex={-1}>
          {titles[chapter]}
        </h1>
        <p>{descriptions[chapter]}</p>
      </section>
      <section className="experiment" key={chapter}>
        {chapter === 0 && (
          <>
            <Prediction
              chosen={prediction}
              onChoose={setPrediction}
              revealed={tried}
            />
            <ProductionPlayground
              adopted={adopted}
              disabled={!prediction}
              onToggle={() => {
                setAdopted((v) => !v);
                setTried(true);
              }}
            />
            <p className="verdict" aria-live="polite">
              {!tried
                ? prediction
                  ? '现在，点一下中间的生产工具。'
                  : '先选一个猜想。不计分，你可以随时改主意。'
                : adopted
                  ? '多了40件产品。但没有任何一条技术规则，自动把工资变高。'
                  : '产出保持80件。拒绝技术保留了现状，却也放弃了可用于收入或闲暇的潜力。'}
            </p>
            <Assumptions>
              <p>
                假设10人不变、工具只提高效率、所有产品都能按每件1货币单位卖出。没有模拟失业、需求约束、竞争、融资或技术失败。因此，50%不是AI的真实平均效果，也不是机器创造新价值的比例。
              </p>
            </Assumptions>
            <Evidence
              ids={['qje', 'metr', 'marx']}
              history="从李嘉图到马克思，争论逐渐从机器是否有用，转向机器怎样被使用、不同群体怎样受益。"
            />
          </>
        )}
        {chapter === 1 && (
          <>
            <div className="choices three">
              {(
                [
                  {
                    id: 'retain',
                    title: '维持原报酬',
                    body: '每人仍得4；新增结余由企业保留。',
                  },
                  {
                    id: 'share',
                    title: '分享新增结余',
                    body: '不减少工时，把一部分新增结余转成报酬。',
                  },
                  {
                    id: 'time',
                    title: '保薪缩短工时',
                    body: '产量维持80件，每人报酬不变。',
                  },
                ] as const
              ).map((c) => (
                <button
                  key={c.id}
                  className="choice"
                  aria-pressed={allocated && allocation === c.id}
                  onClick={() => {
                    setAllocation(c.id);
                    setAllocated(true);
                  }}
                >
                  <span>{c.title}</span>
                  <small>{c.body}</small>
                  <b aria-hidden>
                    {allocated && allocation === c.id ? '●' : '○'}
                  </b>
                </button>
              ))}
            </div>
            {allocation === 'share' && (
              <Range
                id="share-label"
                label="新增可分配结余中，给劳动者的比例"
                value={share}
                onChange={setShare}
              />
            )}
            <div className="baseline-strip">
              <span>没有新技术时</span>
              <span>
                产出 <b>80</b>
              </span>
              <span>
                每人工资 <b>4</b>
              </span>
              <span>
                每人工时 <b>8</b>
              </span>
            </div>
            <Account allocation={allocation} share={share} />
            <p className="verdict" aria-live="polite">
              {allocation === 'retain'
                ? '同样120件产品，劳动报酬没有变。谁控制分配，成了技术之外的问题。'
                : allocation === 'share'
                  ? `每人日收入现在是${fmt(p.wages / 10)}。分享真实改善了报酬，但不自动转移生产资料所有权。`
                  : '每人少工作约2.7小时，收入不降；企业结余降为16。闲暇也是技术收益，但不是没有成本的按钮。'}
            </p>
            <Assumptions>
              <p>
                基准：销售80−材料16−设备成本4−劳动报酬40＝企业结余20。采用技术后：120−24−8−40＝48，新增可分配结余28。分享只分这28。缩时情景仍承担新设备成本8。结余未再区分税、利息、利润用途，也不能当作剩余价值。
              </p>
            </Assumptions>
            <Evidence
              ids={['bls', 'uber', 'engels']}
              history="战后工资增长与随后分化提示：技术进步、劳动者组织和制度安排不能分开考察。"
            />
          </>
        )}
        {chapter === 2 && (
          <>
            <div className="round-caption">
              <span>当前第 {Math.min(history.length + 1, 6)} / 6 轮</span>
              <strong>熟练能力 {fmt(stock)}</strong>
            </div>
            <SkillFlow stock={stock} choice={history.at(-1)?.choice ?? null} />
            <SkillsChart values={stocks} />
            <div className="choices three">
              {(Object.keys(trainingRules) as Training[]).map((key) => (
                <button
                  disabled={history.length === 6}
                  className="choice"
                  key={key}
                  onClick={() => train(key)}
                >
                  <span>{trainingRules[key].label}</span>
                  <small>
                    新人 {trainingRules[key].entrants} · 培养效果{' '}
                    {trainingRules[key].learning}倍<br />
                    当期资源投入 {trainingRules[key].resources} 单位
                  </small>
                  <b aria-hidden>＋</b>
                </button>
              ))}
            </div>
            <div className="round-history">
              {history.map((r, i) => (
                <span key={i}>
                  {i + 1}. {trainingRules[r.choice].label}
                </span>
              ))}
            </div>
            <div className="play-actions">
              <Action
                secondary
                disabled={!history.length}
                onClick={() => setHistory((h) => h.slice(0, -1))}
              >
                撤回上一轮
              </Action>
              <small>
                六轮培训资源累计：{history.reduce((s, h) => s + h.resources, 0)}{' '}
                单位
              </small>
            </div>
            <p className="verdict" aria-live="polite">
              {!history.length
                ? '每轮有10%的熟练能力退出，需要由新人补充。请作出第一轮选择。'
                : stock < 99.95
                  ? `能力指数降至${fmt(stock)}。当期省下培养投入，不代表未来能力也会自动补上。`
                  : stock > 100.05
                    ? `能力指数升至${fmt(stock)}。投入培养改变了路径，但也占用了当期资源。`
                    : '能力维持在100。新人少20%时，培养效果需要提高25%，才能补足原有新增能力。'}
            </p>
            <Assumptions>
              <p>
                下一轮能力＝本轮能力×0.9＋新人数量×培养效果。初始100；这里研究行业能力存量，不是第一幕10人的人数。三个方案及资源单位均为假设。AI辅导的1.25倍效果需要独立考核证据，不因名字含AI就已成立；尾声可以下调它。培训资源只记投入，未估计完整社会净收益。
              </p>
            </Assumptions>
            <Evidence
              ids={['metr', 'qje']}
              history="工业机器人时代已有新人入口调整。当代待验证的是：跨任务模型是否同时改变训练任务与独立能力形成。"
            />
          </>
        )}
        {chapter === 3 && (
          <>
            <div className="split-experiment">
              <div>
                <Range
                  id="growth-label"
                  label="生产规模增长"
                  value={growth}
                  onChange={(v) => {
                    setGrowth(v);
                    setTouched(true);
                  }}
                />
                <Range
                  id="intensity-label"
                  label="单位负担降低"
                  value={intensity}
                  max={80}
                  onChange={(v) => {
                    setIntensity(v);
                    setTouched(true);
                  }}
                />
              </div>
              <div className="burden-total">
                <span>需要处理的总负担</span>
                <strong>
                  <AnimatedNumber value={f.total} digits={1} />
                </strong>
                <small>情景单位 · 原先100</small>
                <BurdenDots total={f.total} responsibility={responsibility} />
                <small>每个完整点 = 5单位；蓝色归企业，红色在企业之外</small>
                <p>
                  {f.total > 100
                    ? '单位更清洁，总量却更高。'
                    : f.total < 100
                      ? '总量确实下降，不应否认改善。'
                      : '单位改善恰好抵消规模扩张。'}
                </p>
              </div>
            </div>
            <Range
              id="responsibility-label"
              label="由企业承担处理责任的比例"
              value={responsibility}
              onChange={(v) => {
                setResponsibility(v);
                setTouched(true);
              }}
            />
            <div className="liability-track">
              <div className="inside" style={{ width: `${responsibility}%` }} />
              <div
                className="outside"
                style={{ width: `${100 - responsibility}%` }}
              />
            </div>
            <div className="account-legend">
              <span>企业责任：{fmt(f.inside)}</span>
              <span>留给社区／公共系统：{fmt(f.outside)}</span>
            </div>
            <div className="play-actions">
              <Action
                secondary
                onClick={() => {
                  setResponsibility(100);
                  setTouched(true);
                }}
              >
                让企业承担全部处理责任
              </Action>
            </div>
            <p className="verdict" aria-live="polite">
              总负担仍是{fmt(f.total)}
              。改变责任归属，不等于物理损害已经减少，也不等于补偿已经兑现。
            </p>
            <Assumptions>
              <p>
                总负担＝100×（1＋规模增长率）×（1−单位负担降幅）。情景单位不是吨碳、患病人数或实测污染。“企业承担”仅表示模型责任分摊，不表示受害者的健康风险随付款转移。预防、修复效果、企业融资和成本转嫁未被模拟。
              </p>
            </Assumptions>
            <Evidence
              ids={['forest', 'battery']}
              history="技术不仅能扩大资源开发，也能以新材料和遥感手段减少依赖、发现外部影响。"
            />
          </>
        )}
        {chapter === 4 && (
          <>
            <div className="institution-list">
              {institutionCards.map((c, i) => (
                <button
                  key={c.title}
                  onClick={() => setInstitution(i)}
                  aria-pressed={institution === i}
                >
                  <span>0{i + 1}</span>
                  {c.title}
                  <small>
                    {answers[i] !== undefined ? '已讨论' : '待判断'}
                  </small>
                </button>
              ))}
            </div>
            <div className="institution-question">
              <h2>{institutionCards[institution].question}</h2>
              <div className="play-actions">
                <Action
                  secondary
                  onClick={() =>
                    setAnswers((a) => ({ ...a, [institution]: true }))
                  }
                >
                  可以这样判断
                </Action>
                <Action
                  secondary
                  onClick={() =>
                    setAnswers((a) => ({ ...a, [institution]: false }))
                  }
                >
                  不能这样判断
                </Action>
              </div>
              {answers[institution] !== undefined && (
                <div className="verdict" aria-live="polite">
                  <strong>
                    {answers[institution]
                      ? '这个推断跨过了一个层级。'
                      : institutionCards[institution].answer}
                  </strong>
                  <p>{institutionCards[institution].body}</p>
                  {institution < 2 && (
                    <Button
                      variant="link"
                      className="next-case"
                      onClick={() => setInstitution(institution + 1)}
                    >
                      再看下一个情境 →
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div
              className="institution-levels"
              aria-label="分析国家制度、企业关系与政策效果三个不同层级"
            >
              <div>
                <span>01 / 国家基本制度</span>
                <strong>
                  {institution === 1
                    ? '社会主义中国'
                    : institution === 0
                      ? '资本主义美国'
                      : '资本主义德国'}
                </strong>
                <p>不能由一项公共政策或一家企业，反推整个国家的性质。</p>
              </div>
              <div>
                <span>02 / 企业中的权利</span>
                <strong>
                  {institution === 1
                    ? '平台劳动与责任'
                    : institution === 0
                      ? '私人疗法与所有权'
                      : '劳动者参与治理'}
                </strong>
                <p>所有权、劳动过程控制权和收益分配权，需要分别考察。</p>
              </div>
              <div>
                <span>03 / 政策实际效果</span>
                <strong>
                  {institution === 1
                    ? '谁被保障，谁已获赔'
                    : institution === 0
                      ? '谁能获得实际治疗'
                      : '哪些决策发生变化'}
                </strong>
                <p>制度定位不能代替效果证据；具体改善也不等于根本变革。</p>
              </div>
            </div>
            <p className="concept-definition">
              资本主义基本矛盾：
              <strong>生产社会化与生产资料资本主义私人占有之间的矛盾。</strong>
              技术能力、具体政策和国家基本制度，不能用同一个刻度衡量。
            </p>
            <Evidence
              ids={['engels', 'mao', 'china', 'cms', 'board', 'injury', 'paid']}
            />
          </>
        )}
        {chapter === 5 && (
          <>
            <div className="takeaway-grid">
              <div>
                <span>你如何分配</span>
                <strong>
                  {allocation === 'time'
                    ? '把一部分红利变成闲暇'
                    : allocation === 'share'
                      ? '让劳动者分享新增结余'
                      : '保留企业新增结余'}
                </strong>
                <p>
                  每人收入 {fmt(p.wages / 10)}，工时 {fmt(p.hours)}
                  。这两个结果，不自动回答谁拥有生产资料。
                </p>
              </div>
              <div>
                <span>你留下什么</span>
                <strong>六轮后能力：{fmt(stock)}</strong>
                <p>
                  需要处理的总负担 {fmt(f.total)}，其中 {fmt(f.outside)}{' '}
                  单位责任仍在企业之外。不同指标不能加总成一个“矛盾分数”。
                </p>
              </div>
            </div>
            <h2 className="lab-title">自由实验室</h2>
            <p>保持技术不变，改动规则。也可以推翻过于乐观的假设。</p>
            <div className="lab-grid">
              <div>
                <Range
                  id="lab-share"
                  label="新增结余的劳动者分享比例"
                  value={share}
                  onChange={(v) => {
                    setShare(v);
                    setAllocation('share');
                  }}
                />
                <p>将此滑块用于“分享”方案，重新计算同一套货币账户。</p>
                <Account allocation={allocation} share={share} />
              </div>
              <div>
                <div className="compact-choices">
                  {(Object.keys(trainingRules) as Training[]).map((k) => (
                    <Button
                      key={k}
                      variant={labPolicy === k ? 'default' : 'outline'}
                      className="small-choice"
                      onClick={() => {
                        setLabPolicy(k);
                        setLearning(trainingRules[k].learning);
                      }}
                    >
                      {trainingRules[k].label}
                    </Button>
                  ))}
                </div>
                <Range
                  id="learning-label"
                  label="每位新人的有效培养效果"
                  value={learning}
                  min={0.5}
                  max={2}
                  unit="倍"
                  onChange={setLearning}
                />
                <SkillsChart
                  label="如果连续六轮这样做"
                  values={skillsPath(labPolicy, 6, learning)}
                />
                <p>
                  “AI辅导”只是方案名称。若真实效果只有1倍，少招新人仍会留下缺口。
                </p>
              </div>
            </div>
            <div className="lab-grid">
              <Range
                id="lab-growth"
                label="规模增长"
                value={growth}
                onChange={setGrowth}
              />
              <Range
                id="lab-intensity"
                label="单位负担降幅"
                value={intensity}
                max={80}
                onChange={setIntensity}
              />
            </div>
            <p className="lab-result" aria-live="polite">
              总负担 {fmt(f.total)} / 基准100。单位下降{intensity}
              %时，规模增长超过{fmt(f.threshold)}%，总量仍可能上升。
            </p>
            <div className="final-argument">
              <h2>
                技术扩大可能性，
                <br />
                关系与规则塑造结果。
              </h2>
              <p>
                具体矛盾可以真实缓和；但技术进步不会自动把生产条件和剩余的支配权转为社会共同支配。判断是否加剧，须继续追问：谁作决定，谁分享，谁承担风险，谁能进入下一轮生产？
              </p>
              <p>
                这个作品提供可以质疑的机制，不提供由参数预先写好的历史结局。
              </p>
              <p>
                这里说的{' '}
                <InlineConcept label="资本主义基本矛盾">
                  生产社会化与生产资料资本主义私人占有之间的矛盾。它的展开涉及生产、分配、交换和再生产关系，不等于一个“贫富差距”或“消费不足”指标。
                </InlineConcept>
                ，也不是{' '}
                <InlineConcept label="一切社会矛盾的别名">
                  社会主义社会同样存在生产力与生产关系、经济基础与上层建筑的矛盾，但其性质与解决方式不能机械套用资本主义的规定。
                </InlineConcept>
                。
              </p>
            </div>
            <FeedbackLab />
            <Evidence
              ids={['bls', 'uber', 'injury', 'battery', 'engels', 'mao']}
            />
          </>
        )}
        {chapter === 5 && (
          <>
            <Range
              id="lab-responsibility"
              label="企业承担处理责任的比例"
              value={responsibility}
              onChange={setResponsibility}
            />
            <p className="muted" aria-live="polite">
              责任分配：企业 {fmt(f.inside)}，社区／公共系统 {fmt(f.outside)}
              ；物理总负担仍是 {fmt(f.total)}。
            </p>
            <div className="play-actions">
              <Action secondary onClick={restart}>
                清空选择，重新开始
              </Action>
            </div>
          </>
        )}
      </section>
      <div className="chapter-footer">
        <Button
          variant="ghost"
          className="back-button"
          disabled={chapter === 0}
          onClick={() => go(chapter - 1)}
        >
          ← 上一幕
        </Button>
        {chapter < 5 ? (
          <div>
            <small>
              {!ready
                ? chapter === 2
                  ? '完成六轮选择后继续'
                  : chapter === 4
                    ? '讨论完三个情境后继续'
                    : '先尝试本幕的选择'
                : '可以随时返回，改变你的选择'}
            </small>
            <Action disabled={!ready} onClick={() => go(chapter + 1)}>
              {
                [
                  '接下来，红利归谁？',
                  '把时间往后推',
                  '再看账本之外',
                  '这就改变制度了吗？',
                  '进入自由实验室',
                ][chapter]
              }{' '}
              →
            </Action>
          </div>
        ) : (
          <Action onClick={() => go(0)}>回到第一幕，再试一种选择 ↺</Action>
        )}
      </div>
      <footer className="ground-note">
        <span>
          所有可调数值均为教学假设。真实证据另列，不模拟国家制度评分。
        </span>
        <span>约12—18分钟 · 无账户 · 不上传你的选择</span>
      </footer>
    </main>
  );
}
