'use client';
import { useState, useEffect, useRef, type ReactNode } from 'react';
import { storyBeats, policyChallenge } from '@/lib/story-beats';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  factoryAccount,
  marketRound,
  reliefAccount,
  rivalPlans,
  accountChange,
  promiseRound,
  type FactoryAccount,
  type Relief,
  type FactoryRules,
} from '@/lib/factory-model';
import { storySteps, storyEvidence, evidenceImages } from '@/lib/story-content';
import { sources } from '@/lib/evidence';
import PromiseScene, { WishCards } from '@/components/story-promise';
import TrustGame from '@/components/trust-game';

export function DeepDive({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="deep-dive">
      <summary>{title}</summary>
      <div>{children}</div>
    </details>
  );
}
export function Reaction({
  person = 0,
  children,
}: {
  person?: number;
  children: ReactNode;
}) {
  return (
    <div
      className="character-reaction"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <Peep person={person} small />
      <p key={String(children)}>{children}</p>
    </div>
  );
}
export function Peep({
  person = 0,
  label = '',
  small = false,
}: {
  person?: number;
  label?: string;
  small?: boolean;
}) {
  return (
    <span className={'story-person ' + (small ? 'small' : '')}>
      <span
        className="peep-art"
        style={{ backgroundPosition: `${(person / 7) * 100}% 0` }}
        role="img"
        aria-label={label || '故事中的人物'}
      />
      {label && <span className="peep-label">{label}</span>}
    </span>
  );
}
export function Coins({
  amount,
  label = '',
  previous,
}: {
  amount: number;
  label?: string;
  previous?: number;
}) {
  const count = Math.floor(Math.abs(amount)),
    fraction = Math.abs(amount) % 1;
  return (
    <div
      className={'coin-wallet ' + (amount < 0 ? 'negative' : '')}
      aria-label={`${label}${amount}金币${amount < 0 ? '，需要弥补的亏损' : ''}${previous === undefined ? '' : `，对照值${previous}金币，${amount === previous ? '不变' : amount > previous ? `增加${amount - previous}金币` : `减少${previous - amount}金币`}`}`}
    >
      {label && <span className="wallet-label">{label}</span>}
      <div className="wallet-number">
        <strong>{Number.isInteger(amount) ? amount : amount.toFixed(1)}</strong>
        <span>金币</span>
        {previous !== undefined && (
          <b className={amount >= previous ? 'gain' : 'loss'}>
            {amount > previous ? '+' : ''}
            {amount === previous
              ? '不变'
              : Number.isInteger(amount - previous)
                ? amount - previous
                : (amount - previous).toFixed(1)}
          </b>
        )}
      </div>
      <div className="coin-pile" aria-hidden="true">
        {Array.from({ length: Math.min(count, 48) }, (_, i) => (
          <i
            key={i}
            className="story-coin"
            style={{ animationDelay: `${Math.min(i, 15) * 24}ms` }}
          />
        ))}
        {fraction > 0 && (
          <i
            className="story-coin partial"
            style={{ clipPath: `inset(0 ${100 - fraction * 100}% 0 0)` }}
          />
        )}
        {amount === 0 && <span className="empty-wallet">暂时没有</span>}
        {count > 48 && <span>…</span>}
      </div>
    </div>
  );
}
export function FactoryStage({
  rules,
  joined = 3,
  onJoin,
}: {
  rules?: FactoryRules;
  joined?: number;
  onJoin?: (v: number) => void;
}) {
  const p = factoryAccount(rules);
  return (
    <div className="factory-stage">
      <div className="ownership-note">
        <Peep person={1} small />
        <span>
          <b>厂主拥有机器</b>
          <small>工资合同与生产安排，由所有者决定</small>
        </span>
      </div>
      <div className="factory-cast">
        <div className="worker-pair">
          {['小蓝', '小粉'].map((name, i) => (
            <button
              className={'worker-join ' + (joined & (1 << i) ? 'joined' : '')}
              key={name}
              onClick={() => onJoin?.(joined | (1 << i))}
              disabled={!onJoin || Boolean(joined & (1 << i))}
              aria-label={`让${name}加入生产`}
            >
              <Peep person={i === 0 ? 0 : 2} label={name} />
              {onJoin && !(joined & (1 << i)) && (
                <span className="join-label">点我来帮忙</span>
              )}
            </button>
          ))}
        </div>
        <div className="machine-wrap">
          <div
            className="machine-art"
            role="img"
            aria-label="借用信任的进化原作的手绘机器素材"
          />
          <div className="machine-label">
            <span>{p.technology ? '新机器' : '原来的机器'}</span>
            <strong>×{p.technology ? 2 : 1}</strong>
          </div>
        </div>
        <div className="product-shelf">
          <span>今天的产品</span>
          <div
            className="product-grid"
            role="img"
            aria-label={`${p.produced}件产品，每格一件，${p.unsold}件未售出`}
          >
            {Array.from({ length: Math.floor(p.produced) }, (_, i) => (
              <i className={i < p.sold ? 'sold' : 'unsold'} key={i} />
            ))}
          </div>
          <strong>
            {p.produced} <small>件</small>
          </strong>
        </div>
      </div>
      <div className="factory-caption">
        <span>
          {onJoin
            ? `${(joined & 1 ? 1 : 0) + (joined & 2 ? 1 : 0)} / 2人已加入`
            : '2名劳动者'}
        </span>
        <span>每人 {p.hours} 小时</span>
        <span>每件售价 {p.price} 金币</span>
        <span>{p.unsold ? `${p.unsold}件没卖掉` : '产品全部售出'}</span>
      </div>
    </div>
  );
}
export function Ledger({
  rules = {},
  compare = false,
  baseline = factoryAccount(),
  baselineLabel = '旧机器、每人4枚、8小时、全部售出',
}: {
  rules?: FactoryRules;
  compare?: boolean;
  baseline?: FactoryAccount;
  baselineLabel?: string;
}) {
  const p = factoryAccount(rules),
    base = baseline;
  return (
    <DeepDive
      title={`看账本：${p.revenue}收入 − ${p.costs}成本 − ${p.wages}工资 = ${p.surplus}结余`}
    >
      <div className="story-ledger">
        {compare && (
          <p className="comparison-key">
            增减对照：{baselineLabel}。＋／−只表示数量变化，不代表好坏。
          </p>
        )}
        <div className="receipt">
          <Coins
            amount={p.revenue}
            label="卖产品收回"
            previous={compare ? base.revenue : undefined}
          />
          <span className="ledger-sign">−</span>
          <Coins
            amount={p.costs}
            label="材料、设备等成本"
            previous={compare ? base.costs : undefined}
          />
          <span className="ledger-sign">−</span>
          <Coins
            amount={p.wages}
            label="两人的工资"
            previous={compare ? base.wages : undefined}
          />
          <span className="ledger-sign">＝</span>
          <Coins
            amount={p.surplus}
            label={p.surplus < 0 ? '本轮亏损' : '企业结余'}
            previous={compare ? base.surplus : undefined}
          />
        </div>
        <p className="ledger-equation">
          {p.revenue} − {p.costs} − {p.wages} = {p.surplus} 金币
        </p>
        <p className="ledger-note">
          1枚金币 =
          1个假想货币单位。结余还未分税、利息等，不是马克思的“剩余价值”核算。
          {p.surplus < 0 ? ' 红色表示缺口，不是手里真的有“负金币”。' : ''}
        </p>
      </div>
    </DeepDive>
  );
}
function StoryEvidence({ chapter }: { chapter: number }) {
  const e = storyEvidence[chapter],
    ids = new Set<string>(e.ids);
  return (
    <Accordion className="story-evidence">
      <AccordionItem value="evidence">
        <AccordionTrigger>
          真实世界里，有什么证据？<span>打开原始来源 ↗</span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="evidence-layout">
            {e.image && (
              <figure className="evidence-image">
                <Dialog>
                  <DialogTrigger className="paper-preview">
                    <img src={evidenceImages[e.image]} alt={e.caption} />
                    <span>查看大图 ＋</span>
                  </DialogTrigger>
                  <DialogContent className="paper-dialog">
                    <DialogTitle>原始资料与复算图</DialogTitle>
                    <DialogDescription>{e.caption}</DialogDescription>
                    <img src={evidenceImages[e.image]} alt={e.caption} />
                    <a href={e.imageUrl} target="_blank" rel="noreferrer">
                      打开完整来源 ↗
                    </a>
                  </DialogContent>
                </Dialog>
                <figcaption>{e.caption}</figcaption>
              </figure>
            )}
            <div>
              <h3>{e.heading}</h3>
              <p>{e.body}</p>
              {sources
                .filter((s) => ids.has(s.id))
                .map((s) => (
                  <a
                    className="evidence-source"
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    key={s.id}
                  >
                    {s.label} ↗
                  </a>
                ))}
              {e.imageUrl && (
                <a
                  className="evidence-source"
                  href={e.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  图示对应的完整来源 ↗
                </a>
              )}
              <small>
                截图标注了具体版本，不把封面当成因果证据。模型参数均为假设。
              </small>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
function Credits() {
  return (
    <Dialog>
      <DialogTrigger className="story-text-button">
        概念 · 素材致谢
      </DialogTrigger>
      <DialogContent className="story-about">
        <DialogTitle>关于这个可玩的解释</DialogTitle>
        <DialogDescription>
          先分清“生活改善”与“谁拥有和支配生产”。
        </DialogDescription>
        <div className="story-about-scroll">
          <h3>感谢 Nicky Case</h3>
          <p>
            本作实际使用了《信任的进化》的手绘人物、机器与金币素材，来自{' '}
            <a
              href="https://github.com/ncase/trust"
              target="_blank"
              rel="noreferrer"
            >
              ncase/trust
            </a>
            ，依其{' '}
            <a
              href="https://github.com/ncase/trust/blob/gh-pages/LICENSE"
              target="_blank"
              rel="noreferrer"
            >
              CC0 1.0
            </a>{' '}
            许可使用。也参考 LOOPY 的反馈关系和 Nutshell 的就地展开解释。
          </p>
          <p>
            人物身份为本作重新分配，不继承原作“合作／欺骗”性格。经济模型、中文叙事及结论由本作编写，不代表
            Nicky Case 的观点，也不是官方续作。
          </p>
          <h3>我们究竟在研究什么？</h3>
          <p>
            资本主义基本矛盾，是生产社会化与生产资料资本主义私人占有之间的矛盾。“社会化”包括广泛分工协作及相互依赖，不等于国有化这个词本身。
          </p>
          <p>
            金币只代表假想货币。企业结余未完整核算税、利息、价值转移等，不能当作马克思的剩余价值量。价格与价值、贫富差距与基本矛盾也不能直接画等号。
          </p>
          <p>
            每一幕都是同一工厂的对照实验，不是未经说明就累加的一整段真实经营史。新增或撤掉的假设会显示在画面上；需求、成本与治理效果都需要现实证据校准。
          </p>
          <p>
            中国的社会主义基本制度与具体企业问题不是同一层级。制度定位不替代实际效果检验，资本主义国家的一项公共政策也不自动改变其基本制度。
          </p>
          <p>
            参考研究整理截至2026-09-09。资料截图均来自标注的真实PDF；BLS图为本研究复算，不伪装成新闻截图。
          </p>
        </div>
        <DialogClose className="story-button">回到故事</DialogClose>
      </DialogContent>
    </Dialog>
  );
}
export function PeopleWallets({
  rules,
  baseline = factoryAccount(),
}: {
  rules: FactoryRules;
  baseline?: FactoryAccount;
}) {
  const p = factoryAccount(rules);
  return (
    <div className="people-wallets">
      <div>
        <Peep person={0} label="小蓝" />
        <Coins amount={p.wageEach} previous={baseline.wageEach} />
      </div>
      <div>
        <Peep person={2} label="小粉" />
        <Coins amount={p.wageEach} previous={baseline.wageEach} />
      </div>
      <div>
        <Peep person={1} label="厂主控制的结余" />
        <Coins amount={p.surplus} previous={baseline.surplus} />
      </div>
    </div>
  );
}
export function PolicyConsequences({
  relief,
  buyers,
}: {
  relief: Relief;
  buyers: number;
}) {
  const current = reliefAccount(relief, buyers);
  const withoutTime = reliefAccount({ ...relief, time: false }, buyers);
  const time = accountChange(withoutTime, current);
  const withoutClean = reliefAccount({ ...relief, clean: false }, buyers);
  const active = relief.pay || relief.time || relief.clean;
  return (
    <div
      className="policy-consequences"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <h3>这几条规则，分别改变了什么？</h3>
      {!active && (
        <p>还没有改变规则。下面的钱包与账本会和本幕“全部不选”的情况比较。</p>
      )}
      {relief.pay && (
        <p>
          <b>加薪：</b>
          两位劳动者各多拿2枚，工资共增加4枚；在其他选择不变时，企业结余相应减少4枚。
        </p>
      )}
      {relief.time && (
        <p>
          <b>缩时：</b>
          与不缩时、其余选择相同相比，每人少工作2小时，材料成本少2枚。
          {time.sold === 0
            ? '本来就有产品卖不掉，现在少生产4件，却没有少卖：结余反而增加2枚。'
            : `少卖${-time.sold}件、收入少${-time.revenue}枚，扣掉节省的材料后，结余减少${-time.surplus}枚。`}
          <span>这取决于本幕各半订单的假设，不是缩时必然增利或必然亏损。</span>
        </p>
      )}
      {relief.clean && (
        <p>
          <b>治理：</b>在当前产量下，投入4枚，使环境负担从{withoutClean.burden}
          降到{current.burden}；企业结余减少4枚。环境改善不等于收入增加。
        </p>
      )}
      {active && (
        <small>
          逐项解释都保持其他选择不变；有相互影响时，不能把各项物理效果简单相加。
        </small>
      )}
    </div>
  );
}
function MiniFactory({
  name,
  account,
  person = 1,
}: {
  name: string;
  account: ReturnType<typeof factoryAccount>;
  person?: number;
}) {
  return (
    <div className="mini-factory">
      <Peep person={person} small label={name} />
      <div>
        <span>
          生产 {account.produced} · 卖出 {account.sold}
        </span>
        <div className="mini-products" aria-label={`${account.unsold}件未卖出`}>
          {Array.from({ length: account.produced }, (_, i) => (
            <i key={i} className={i < account.sold ? 'sold' : 'unsold'} />
          ))}
        </div>
        <small>
          每件 {account.price} 金币 · {account.unsold}件滞销
        </small>
      </div>
      <Coins amount={account.surplus} label="本轮企业结余" />
    </div>
  );
}
type Contest = { ours: number; theirs: number; buyers: number };
type Governance = 'private' | 'voice' | 'social';
export default function FactoryStory() {
  const [chapter, setChapter] = useState(0),
    [unlocked, setUnlocked] = useState(0),
    [advanced, setAdvanced] = useState(false);
  const [joined, setJoined] = useState(0),
    [paid, setPaid] = useState(false),
    [adopted, setAdopted] = useState(false),
    [tried, setTried] = useState(false),
    [guess, setGuess] = useState<string | null>(null);
  const [allocation, setAllocation] = useState<'retain' | 'pay' | 'time'>(
      'retain',
    ),
    [allocated, setAllocated] = useState(false);
  const [price, setPrice] = useState(3),
    [priced, setPriced] = useState(false),
    [buyers, setBuyers] = useState(24),
    [contest, setContest] = useState<Contest[]>([]);
  const [relief, setRelief] = useState<Relief>({
      pay: false,
      time: false,
      clean: false,
    }),
    [intervened, setIntervened] = useState(false),
    [governance, setGovernance] = useState<Governance>('private'),
    [governed, setGoverned] = useState(false);
  const [ending, setEnding] = useState<'profit' | 'reform' | 'social'>(
    'profit',
  );
  const [eventDemand, setEventDemand] = useState<number | null>(null);
  const [response, setResponse] = useState<'keep' | 'negotiate' | null>(null);
  const [eventDays, setEventDays] = useState(1);
  function resetEvent(demand: number | null = null) {
    setEventDemand(demand);
    setResponse(null);
    setEventDays(1);
  }
  const promise =
    eventDemand !== null && response
      ? promiseRound(relief, eventDemand, response, eventDays)
      : null;
  const lived = promise?.account ?? reliefAccount(relief, buyers);
  const title = useRef<HTMLHeadingElement>(null),
    first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    title.current?.focus();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [chapter, advanced, eventDemand]);
  const distRules: FactoryRules = {
    technology: true,
    hours: allocation === 'time' ? 4 : 8,
    wageEach: allocation === 'pay' ? 6 : 4,
  };
  const comp = marketRound(16, 16, price, 2, buyers),
    last = contest.at(-1),
    result = last
      ? marketRound(last.ours, last.theirs, 2, 2, last.buyers)
      : null;
  const policy = reliefAccount(relief, buyers),
    basePolicy = reliefAccount(
      { pay: false, time: false, clean: false },
      buyers,
    );
  const ready = [
    paid,
    tried,
    allocated,
    priced,
    contest.length === 3,
    Boolean(promise),
    governed,
    true,
  ][chapter];
  function go(n: number) {
    if (n < 0 || n > 7 || n > unlocked + 1) return;
    setChapter(n);
    setUnlocked((v) => Math.max(v, n));
  }
  function changeDemand(n: number) {
    setBuyers(n);
    setContest([]);
    resetEvent();
  }
  function play(n: number) {
    setContest((h) =>
      h.length < 3
        ? [...h, { ours: n, theirs: rivalPlans[h.length], buyers }]
        : h,
    );
  }
  function restart() {
    setChapter(0);
    setUnlocked(0);
    setJoined(0);
    setPaid(false);
    setAdopted(false);
    setTried(false);
    setGuess(null);
    setAllocation('retain');
    setAllocated(false);
    setPrice(3);
    setPriced(false);
    setBuyers(24);
    setContest([]);
    setRelief({ pay: false, time: false, clean: false });
    setIntervened(false);
    setGovernance('private');
    setGoverned(false);
    setEnding('profit');
    resetEvent();
  }
  const reaction = [
    '我们每人拿4枚，剩下6枚由厂主决定。',
    adopted
      ? '产量翻倍了，我的工资还是4枚。'
      : '又回到旧机器了。工资仍然没变。',
    allocation === 'pay'
      ? '这2枚，终于能留给我的夜校课了。'
      : allocation === 'time'
        ? '今天早下班4小时，可以陪爸爸走一走了。'
        : '多出的金币留在企业，不会自动变工资。',
    comp.ours.surplus < 0
      ? '全卖完，也能亏4枚。便宜不是万能的。'
      : buyers === 32
        ? '买家够多，两家都卖完了！滞销不是必然。'
        : '做出来了，不等于能卖出去。',
    contest.length === 3
      ? buyers === 24
        ? '如果都扩产，各4枚；如果都稳产，反而各6枚。'
        : '需求跟上了：都扩产，各得12枚！'
      : result
        ? `这一轮，我们拿${result.ours.surplus}枚，对手拿${result.theirs.surplus}枚。`
        : '',
    promise
      ? '守住一天，不等于守住以后。接着问：谁有权决定？'
      : policy.surplus < 0
        ? `还缺${-policy.surplus}枚。愿望不能代替资金来源。`
        : relief.pay && relief.time
          ? '做到了！多拿钱、少工作，还没有亏钱。'
          : '试着同时点亮三个目标。也可以看看治理的代价。',
    governance === 'social'
      ? '改变的是谁拥有、谁决定，不是凭空变出金币。'
      : governance === 'voice'
        ? '有了发言权，不等于拥有全部生产资料。'
        : '机器更先进，也不会自己交出决定权。',
  ][chapter];
  if (advanced)
    return (
      <>
        <div className="return-story">
          <Button className="story-button" onClick={() => setAdvanced(false)}>
            ← 回到工厂故事
          </Button>
          <span>进阶专题使用不同模型，数值不与主线金币混算。</span>
        </div>
        <TrustGame />
      </>
    );
  return (
    <main className="factory-story quick-story" data-chapter={chapter}>
      <a className="skip-link" href="#story-title">
        跳到故事
      </a>
      <header className="story-header">
        <span>技术红利，归谁？</span>
        <Credits />
        <span>{chapter + 1} / 8</span>
      </header>
      <nav className="story-progress" aria-label="故事章节">
        {storySteps.map((s, i) => (
          <button
            key={s.name}
            aria-label={`${i + 1} ${s.name}`}
            disabled={i > unlocked}
            aria-current={chapter === i ? 'step' : undefined}
            onClick={() => go(i)}
          >
            <b>{i + 1}</b>
            <span>{s.name}</span>
          </button>
        ))}
      </nav>
      <section className="story-intro">
        <span className="story-kicker">
          第{chapter + 1}幕 / {storySteps[chapter].name}
        </span>
        <h1 id="story-title" ref={title} tabIndex={-1}>
          {chapter === 5 && eventDemand !== null
            ? '昨天的约定，今天还算数吗？'
            : storyBeats[chapter].title}
        </h1>
        <p>
          {chapter === 5 && eventDemand !== null
            ? '选一次应对，再让时间走一天。'
            : storyBeats[chapter].lead}
        </p>
      </section>
      <div className="quick-rule">
        <span>
          本幕假设：
          {chapter === 5 && eventDemand !== null
            ? '虚构订单事件 · 各半订单 · 8枚初始备用金'
            : storyBeats[chapter].rule}
        </span>
        <DeepDive title="规则与边界">
          <p>{storySteps[chapter].assumption}</p>
          <p>{storySteps[chapter].boundary}</p>
        </DeepDive>
      </div>
      <section className="story-scene" key={`scene-${chapter}`}>
        {chapter === 0 && (
          <>
            <WishCards />
            <small className="fiction-note">
              小蓝、小粉是虚构人物；愿望不是现实访谈。
            </small>
            <FactoryStage
              joined={joined}
              onJoin={setJoined}
              rules={{
                planned: ((joined & 1 ? 1 : 0) + (joined & 2 ? 1 : 0)) * 4,
              }}
            />
            <div className="story-actions">
              <Button
                className="story-button"
                disabled={joined !== 3}
                onClick={() => setPaid(true)}
              >
                干完一天，结算金币 →
              </Button>
            </div>
            {paid && (
              <>
                <PeopleWallets rules={{}} />
                <Ledger />
                <DeepDive title="为什么会这样？">
                  <p className="story-narrator">
                    大家共同做出了8件产品，卖回24金币。扣除10枚成本和8枚工资，剩下6枚由厂主决定用途。
                    <br />
                    <strong>一起生产，不一定意味着一起作决定。</strong>
                  </p>
                </DeepDive>
                <DeepDive title="工厂外，还有谁在合作？">
                  <div className="social-chain">
                    <span>供应商</span>
                    <b>＋</b>
                    <span>科研与社会知识</span>
                    <b>＋</b>
                    <span>工厂劳动</span>
                    <b>＋</b>
                    <span>运输与销售</span>
                    <p>画面只有三个人，背后却是一张越来越大的协作网。</p>
                  </div>
                </DeepDive>
              </>
            )}
          </>
        )}
        {chapter === 1 && (
          <>
            <div className="story-prediction">
              <p>工资会跟着翻倍吗？</p>
              <div className="story-actions">
                {[
                  ['everyone', '会吧！'],
                  ['owner', '不一定'],
                ].map(([id, label]) => (
                  <Button
                    className="story-button outline"
                    aria-pressed={guess === id}
                    key={id}
                    onClick={() => setGuess(id)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <FactoryStage rules={{ technology: adopted }} />
            <div className="story-actions">
              <Button
                disabled={!guess}
                className="story-button"
                onClick={() => {
                  setAdopted((v) => !v);
                  setTried(true);
                }}
              >
                {adopted ? '关掉，作个对照 ↺' : '开启新机器 →'}
              </Button>
            </div>
            {tried && (
              <>
                <PeopleWallets rules={{ technology: adopted }} />
                <Ledger rules={{ technology: adopted }} compare />
                <DeepDive title="为什么会这样？">
                  <p className="story-narrator">
                    {adopted ? (
                      <>
                        {guess === 'everyone'
                          ? '多生产，不等于每个人自动多拿。'
                          : '在不变的工资合同下，新增结余先由企业控制。'}{' '}
                        两位工人仍各拿4金币；结余从6变成28。
                        <br />
                        <strong>
                          技术改变了能生产多少，没有自动改写合同。
                        </strong>
                      </>
                    ) : (
                      <>
                        关掉后回到原先的8件和6枚结余。
                        <strong>拒绝技术，也会放弃改善生活的可能。</strong>
                      </>
                    )}
                  </p>
                </DeepDive>
              </>
            )}
          </>
        )}
        {chapter === 2 && (
          <>
            <div className="story-choice-row">
              {(
                [
                  {
                    id: 'retain',
                    title: '不改工资',
                    body: '4枚 · 8小时',
                  },
                  {
                    id: 'pay',
                    title: '每人多拿2枚',
                    body: '6枚 · 8小时',
                  },
                  {
                    id: 'time',
                    title: '保薪，只做4小时',
                    body: '4枚 · 4小时',
                  },
                ] as const
              ).map((c) => (
                <Button
                  className="story-choice"
                  key={c.id}
                  aria-pressed={allocated && allocation === c.id}
                  onClick={() => {
                    setAllocation(c.id);
                    setAllocated(true);
                  }}
                >
                  <b>{c.title}</b>
                  <span>{c.body}</span>
                </Button>
              ))}
            </div>
            <PeopleWallets
              rules={distRules}
              baseline={factoryAccount({ technology: true })}
            />
            <div className="hours-result">
              每人每天 <strong>{allocation === 'time' ? 4 : 8}</strong> 小时{' '}
              <span>本幕基准8小时 · 闲暇不折算成金币</span>
            </div>
            <Ledger
              rules={distRules}
              compare
              baseline={factoryAccount({ technology: true })}
              baselineLabel="同一新机器，不改工资与工时（结余28枚）"
            />
            <DeepDive title="为什么会这样？">
              <p className="story-narrator">
                {allocation === 'retain'
                  ? '新增结余保留在企业，不保证会转为工资。'
                  : allocation === 'pay'
                    ? '小蓝和小粉都真实多拿了2枚。这不是“假的改善”。'
                    : '每天多出4小时可自由支配。这也是技术带来的真实改善。'}
                <br />
                <strong>但“谁能决定怎么分”的安排，还没有自动改变。</strong>
              </p>
            </DeepDive>
          </>
        )}
        {chapter === 3 && (
          <>
            <div className="demand-branch">
              <span>先选一个社会需求分支</span>
              <div className="story-actions">
                {[24, 32].map((n) => (
                  <Button
                    key={n}
                    className="story-button outline"
                    aria-pressed={buyers === n}
                    onClick={() => changeDemand(n)}
                  >
                    {n === 24 ? '24个买家：需求没跟上' : '32个买家：需求跟上了'}
                  </Button>
                ))}
              </div>
              <DeepDive title="买家从哪里来？">
                <p>
                  买家指有支付能力的需求。增加需求需要工资、公共支出等条件，不是免费的政策。
                </p>
              </DeepDive>
            </div>
            <div className="story-actions">
              {[3, 2, 1].map((n) => (
                <Button
                  className="story-button outline"
                  key={n}
                  aria-pressed={priced && price === n}
                  onClick={() => {
                    setPrice(n);
                    setPriced(true);
                  }}
                >
                  我的售价：{n}金币
                </Button>
              ))}
            </div>
            <div className="market-stage">
              <MiniFactory name="我们的工厂" account={comp.ours} />
              <span className="market-versus">
                同一个市场
                <br />
                <b>{buyers}位买家</b>
              </span>
              <MiniFactory name="另一家工厂" account={comp.theirs} person={3} />
            </div>
            <Ledger rules={{ technology: true, price, sold: comp.ours.sold }} />
            <DeepDive title="为什么会这样？">
              <p className="story-narrator">
                {buyers === 32
                  ? '需求跟上了，两家都能卖完。新技术并不必然导致滞销。'
                  : price === 1
                    ? '便宜能抢到订单，但每件收入也变少了：卖得更多，仍可能亏损。'
                    : `我们的${comp.ours.unsold}件产品没变成金币，却已经花了材料和设备成本。`}
                <br />
                <strong>生产能力、销售收入、最终结余，是三件不同的事。</strong>
              </p>
            </DeepDive>
          </>
        )}
        {chapter === 4 && (
          <>
            <div className="contest-top">
              <span>市场需求：{buyers}人 · 每件2金币</span>
              <strong>第 {Math.min(contest.length + 1, 3)} / 3 轮</strong>
            </div>
            <p className="story-small">
              代表左厂选产量。对手的选择提交后揭晓。
            </p>
            <div className="story-actions">
              {[12, 16].map((n) => (
                <Button
                  className="story-button"
                  disabled={contest.length === 3}
                  key={n}
                  onClick={() => play(n)}
                >
                  {n === 12 ? '稳产：生产12件' : '多铺渠道：生产16件'}
                </Button>
              ))}
            </div>
            {result ? (
              <div
                className="market-stage"
                aria-live="polite"
                key={contest.length}
              >
                <MiniFactory name="我们的工厂" account={result.ours} />
                <span className="market-versus">
                  本轮共剩
                  <br />
                  <b>{result.totalUnsold}件</b>
                </span>
                <MiniFactory
                  name="另一家工厂"
                  account={result.theirs}
                  person={3}
                />
              </div>
            ) : (
              <div className="waiting-round">
                <Peep person={1} />
                <span>
                  对手已选好。
                  <br />
                  <strong>轮到你了。</strong>
                </span>
                <Peep person={3} />
              </div>
            )}
            <DeepDive title="看看前三轮">
              <div className="contest-history">
                {contest.map((r, i) => {
                  const m = marketRound(r.ours, r.theirs, 2, 2, r.buyers);
                  return (
                    <span key={i}>
                      第{i + 1}轮：{r.ours} / {r.theirs}件 → 结余{' '}
                      {m.ours.surplus} / {m.theirs.surplus}金币
                    </span>
                  );
                })}
              </div>
            </DeepDive>
            {contest.length === 3 && (
              <>
                <DeepDive title="把四种选择放在一起比较">
                  <div
                    className="payoff-matrix"
                    role="table"
                    aria-label="左厂和右厂的金币结余对照"
                  >
                    <div role="row" className="matrix-row">
                      <span role="columnheader">左厂 / 右厂</span>
                      <span role="columnheader">右厂12件</span>
                      <span role="columnheader">右厂16件</span>
                    </div>
                    {[12, 16].map((a) => (
                      <div role="row" className="matrix-row" key={a}>
                        <strong role="rowheader">左厂{a}件</strong>
                        {[12, 16].map((b) => {
                          const m = marketRound(a, b, 2, 2, buyers);
                          return (
                            <span role="cell" key={b}>
                              <i className="story-coin" aria-hidden="true" />
                              <b>
                                {m.ours.surplus} / {m.theirs.surplus}
                              </b>
                              <small>左 / 右厂结余</small>
                            </span>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <DeepDive title="为什么会这样？">
                    <p className="story-narrator">
                      {buyers === 24 ? (
                        <>
                          无论对方怎样选，我们多生产都更划算；但两家都多生产时，每家只剩4枚，比都稳产的6枚少。
                          <br />
                          <strong>
                            个人逐利的合理选择，可能带来共同不想要的结果。
                          </strong>
                        </>
                      ) : (
                        <>
                          32个买家把产品都接住了，两家多生产都能获益。
                          <br />
                          <strong>
                            困境不是机器天生带来的：需求与协调条件会改变结果。
                          </strong>
                        </>
                      )}
                    </p>
                  </DeepDive>
                  <p className="story-small">
                    在马克思主义分析中，这可帮助理解企业内部有组织的生产，与相互竞争的独立资本事后协调之间的张力。“社会生产无政府状态”并不是说没有政府。这张表只是一个机制示例，不是基本矛盾的数学证明。
                  </p>
                </DeepDive>
              </>
            )}
            <div className="story-actions">
              <Button
                className="story-button outline"
                disabled={!contest.length}
                onClick={() => setContest([])}
              >
                重玩三轮 ↺
              </Button>
              <Button
                className="story-button outline"
                onClick={() => changeDemand(buyers === 24 ? 32 : 24)}
              >
                改成{buyers === 24 ? 32 : 24}个买家，重试分支
              </Button>
            </div>
          </>
        )}
        {chapter === 5 && (
          <>
            {eventDemand === null ? (
              <>
                <div className="challenge-checks" aria-label="本轮小挑战">
                  {policyChallenge(
                    policy.wageEach,
                    policy.hours,
                    policy.surplus,
                  ).map((c) => (
                    <span key={c.label} data-met={c.met}>
                      {c.met ? '✓' : '○'} {c.label}
                    </span>
                  ))}
                </div>
                <p className="challenge-note">这是收支练习，不是唯一好方案。</p>
                <div className="policy-options">
                  {(
                    [
                      {
                        id: 'pay',
                        title: '加薪',
                        body: '每人4 → 6枚',
                      },
                      {
                        id: 'time',
                        title: '早下班',
                        body: '8 → 6小时，保薪',
                      },
                      {
                        id: 'clean',
                        title: '治理污染',
                        body: '花4枚，负担降75%',
                      },
                    ] as const
                  ).map((c) => (
                    <label key={c.id} className="policy-card">
                      <Checkbox
                        checked={relief[c.id]}
                        onCheckedChange={(v) => {
                          setRelief((r) => ({ ...r, [c.id]: Boolean(v) }));
                          setIntervened(true);
                          resetEvent();
                        }}
                      />
                      <span>
                        <b>{c.title}</b>
                        <small>{c.body}</small>
                      </span>
                    </label>
                  ))}
                </div>
                <PeopleWallets
                  baseline={basePolicy}
                  rules={{
                    technology: true,
                    hours: policy.hours,
                    price: 2,
                    sold: policy.sold,
                    wageEach: policy.wageEach,
                    clean: relief.clean,
                  }}
                />
                <div className="human-results">
                  <div>
                    <span>每人工时</span>
                    <strong>
                      {policy.hours} <small>小时</small>
                    </strong>
                    <small>本幕基准8小时</small>
                  </div>
                  <div>
                    <span>环境负担</span>
                    <strong>
                      {policy.burden} <small>情景指数</small>
                    </strong>
                    <small>本幕基准{basePolicy.burden} · 不是健康的售价</small>
                  </div>
                  <div>
                    <span>未卖产品</span>
                    <strong>
                      {policy.unsold} <small>件</small>
                    </strong>
                    <small>本幕需求{buyers}人</small>
                  </div>
                </div>
                <Ledger
                  compare
                  baseline={basePolicy}
                  baselineLabel={`本幕${buyers}个买家、各半订单、不加薪不缩时不治理（结余${basePolicy.surplus}枚）`}
                  rules={{
                    technology: true,
                    hours: policy.hours,
                    price: 2,
                    sold: policy.sold,
                    wageEach: policy.wageEach,
                    clean: relief.clean,
                  }}
                />
                <DeepDive title="加薪、缩时、治理，各改变了什么？">
                  <PolicyConsequences relief={relief} buyers={buyers} />
                </DeepDive>
                <DeepDive title="为什么会这样？">
                  <p className="story-narrator">
                    {policy.surplus < 0 ? (
                      <>
                        这组安排每轮缺{-policy.surplus}
                        枚金币。改善的愿望不能代替资金来源。
                        <br />
                        <strong>
                          需要核验效率、资源再分配与公共支持，而不是把亏空藏起来。
                        </strong>
                      </>
                    ) : (
                      <>
                        在这组条件下，改变规则可以同时改变收入、时间或环境负担。
                        <br />
                        <strong>这些改善有意义，也需要持续执行。</strong>
                      </>
                    )}
                  </p>
                </DeepDive>
                <div className="story-actions">
                  <Button
                    className="story-button outline"
                    onClick={() => {
                      setRelief({ pay: false, time: false, clean: false });
                      setIntervened(true);
                    }}
                  >
                    先不改变，保留基准
                  </Button>
                  <Button
                    className="story-button"
                    disabled={!intervened}
                    onClick={() => resetEvent(20)}
                  >
                    就这样约定，看看第二天 →
                  </Button>
                </div>
              </>
            ) : (
              <PromiseScene
                relief={relief}
                buyers={buyers}
                demand={eventDemand}
                response={response}
                days={eventDays}
                onDemand={resetEvent}
                onResponse={(v) => {
                  setResponse(v);
                  setEventDays(1);
                }}
                onRepeat={() => {
                  if (promise?.canRepeat) setEventDays(2);
                }}
                onBack={() => resetEvent()}
              />
            )}
          </>
        )}
        {chapter === 6 && (
          <>
            <div className="rights-question">
              <Coins
                amount={lived.surplus}
                label={
                  lived.surplus < 0 ? '同样这一笔资金缺口' : '同样这一笔结余'
                }
              />
              <span>
                刚才那份约定，谁有权更改？
                <br />
                <b>不凭空多出一枚金币。</b>
              </span>
            </div>
            <div className="story-choice-row">
              {(
                [
                  {
                    id: 'private',
                    title: '所有者单独决定',
                    body: '私人占有关系不变。',
                  },
                  {
                    id: 'voice',
                    title: '劳动者参与治理',
                    body: '有发言权 ≠ 全部所有权',
                  },
                  {
                    id: 'social',
                    title: '社会共同占有与支配',
                    body: '改变占有关系的理论方向',
                  },
                ] as const
              ).map((c) => (
                <Button
                  className="story-choice"
                  key={c.id}
                  aria-pressed={governed && governance === c.id}
                  onClick={() => {
                    setGovernance(c.id);
                    setGoverned(true);
                  }}
                >
                  <b>{c.title}</b>
                  <span>{c.body}</span>
                </Button>
              ))}
            </div>
            <div className="decision-circle">
              <Peep
                person={1}
                label={
                  governance === 'private'
                    ? '所有者决定'
                    : governance === 'social'
                      ? '受托管理者'
                      : '所有者 / 管理者'
                }
              />
              {governance !== 'private' && (
                <>
                  <b>＋</b>
                  <Peep person={0} label="劳动者参与" />
                </>
              )}
              {governance === 'social' && (
                <>
                  <b>＋</b>
                  <Peep person={4} label="社会公共利益" />
                </>
              )}
            </div>
            <DeepDive title="为什么会这样？">
              <p className="story-narrator">
                {governance === 'private'
                  ? '机器更先进、工资更高，都不自动取消私人支配生产条件与结余的关系。'
                  : governance === 'voice'
                    ? '参与治理能约束单方面决策，但有席位、拿工资、拥有生产资料，是不同权利。'
                    : '从马克思主义分析看，根本解决的方向不是只把私人收益分得更均匀，而是使社会化生产与社会共同占有、支配相适应。'}
                <br />
                <strong>
                  这就是为什么，技术可以缓和具体问题，却不能自动消除基本矛盾。
                </strong>
              </p>
            </DeepDive>
            <p className="core-definition">
              资本主义基本矛盾：<b>生产社会化</b>与
              <b>生产资料资本主义私人占有</b>之间的矛盾。
            </p>
            <DeepDive title="这与马哲定义、国家制度有什么关系？">
              <div className="definition-reveal">
                <span>现在，再读这个定义</span>
                <h3>
                  生产社会化
                  <br />
                  <b>与</b>
                  <br />
                  生产资料资本主义私人占有
                  <br />
                  <b>之间的矛盾</b>
                </h3>
                <p>
                  我们看到的失业风险、分配分歧或滞销，只可能是它在一定条件下的具体展开，不是定义本身。社会共同支配也需要制度、信息、参与与问责，不能靠名称保证效果。
                </p>
              </div>
              <div className="country-contrast">
                <div>
                  <h3>放在社会主义中国</h3>
                  <p>
                    公有制为主体、多种所有制经济共同发展。存在民营平台和劳动问题，不能据此把中国归类为资本主义国家；还要研究保障、治理和共同发展如何落实。
                  </p>
                </div>
                <div>
                  <h3>放在资本主义国家</h3>
                  <p>
                    公共医保、劳动保障或共同决定可以带来真实改善，但一项公共政策或部分代表席位，并不自动改变整个社会的基本占有关系。
                  </p>
                </div>
              </div>
            </DeepDive>
            <p className="country-reminder">
              企业选择≠国家制度：中国的社会主义基本制度与资本主义国家须分别分析。
            </p>
          </>
        )}
        {chapter === 7 && (
          <>
            <div className="ending-verdict">
              <span className="event-stamp">你的故事，到这里还没有结束</span>
              <h2>
                机器能把蛋糕做大。
                <br />
                <em>不能替我们决定，</em>
                <br />
                谁分享，谁作主。
              </h2>
              <p>
                科技能缓和具体困境；在资本逐利与私人占有下，也可能加深矛盾。
                <strong>它不会自动消除资本主义基本矛盾。</strong>
              </p>
            </div>
            <div className="lived-ending">
              <span className="event-stamp">这一次，你留下了什么？</span>
              <WishCards wage={lived.wageEach} hours={lived.hours} settled />
              <p>
                {promise
                  ? `你让这份安排走了${eventDays}天，每人每天${lived.wageEach}枚、工作${lived.hours}小时；备用金还剩${promise.reserveLeft}枚。`
                  : '你改变了前面的条件。这是当前约定的预览；返回第六幕，重新让它经历第二天。'}
              </p>
              <b>
                {governance === 'private'
                  ? '改善可以是真的；私人占有与决定权，仍没有改变。'
                  : governance === 'voice'
                    ? '劳动者有了发言权；参与治理，还不等于共同占有。'
                    : '你选择共同占有与支配的方向；兑现它，仍要靠制度与问责。'}
              </b>
            </div>
            <div className="conclusion-steps">
              <div>
                <span>01 / 缓和</span>
                <h3>多出来的生活，是真的。</h3>
                <p>
                  提高效率，为加薪、缩时与公共服务创造物质可能；如何兑现，取决于分配与制度。
                </p>
              </div>
              <div>
                <span>02 / 加剧</span>
                <h3>一起生产，各自逐利。</h3>
                <p>
                  科技扩大社会协作，也可能在资本竞争中放大集中与失衡；是否发生、程度如何，要看具体条件。
                </p>
              </div>
              <div>
                <span>03 / 根本</span>
                <h3>分了多少，还要问谁占有。</h3>
                <p>
                  资本主义基本矛盾是<b>生产社会化</b>与
                  <b>生产资料资本主义私人占有</b>之间的矛盾。
                </p>
              </div>
            </div>
            <p className="ending-last-line">
              别只问机器能做多少。
              <br />
              <strong>也问：它多做的那些，能让谁好好生活？</strong>
            </p>
            <p className="country-reminder">
              企业选择不等于国家制度：中国须在社会主义基本制度下分析；资本主义国家的局部改革不自动改变基本占有关系。社会主义也不意味着不存在矛盾。
            </p>
            <DeepDive title="回看我的选择">
              <div className="journey-recap">
                <span>你的实验记录</span>
                <p>
                  需求分支：<b>{buyers}个买家</b>；分配尝试：
                  <b>
                    {allocation === 'pay'
                      ? '提高工资'
                      : allocation === 'time'
                        ? '保薪缩时'
                        : '保留企业结余'}
                  </b>
                  ；决策安排：
                  <b>
                    {governance === 'private'
                      ? '私人支配'
                      : governance === 'voice'
                        ? '劳动者参与'
                        : '社会共同支配方向'}
                  </b>
                  。
                </p>
              </div>
            </DeepDive>
            <DeepDive title="再比较三种理论路径（不是你的实际结局）">
              <div className="story-choice-row">
                {(
                  [
                    {
                      id: 'profit',
                      title: '技术升级，关系不变',
                      body: '先看产能与私人结余。',
                    },
                    {
                      id: 'reform',
                      title: '在原关系内改善',
                      body: '提高工资、缩短工时，仍由私人占有。',
                    },
                    {
                      id: 'social',
                      title: '进一步改变占有关系',
                      body: '同样的物质条件，转向社会共同支配。',
                    },
                  ] as const
                ).map((c) => (
                  <Button
                    key={c.id}
                    className="story-choice"
                    aria-pressed={ending === c.id}
                    onClick={() => setEnding(c.id)}
                  >
                    <b>{c.title}</b>
                    <span>{c.body}</span>
                  </Button>
                ))}
              </div>
              <div className="ending-branch">
                <h3>
                  {ending === 'profit'
                    ? '技术红利不会自己走进每个人的钱包'
                    : ending === 'reform'
                      ? '具体改善是真实的，根本关系仍须追问'
                      : '根本方向改变，也不是从此没有矛盾'}
                </h3>
                <p>
                  {ending === 'profit'
                    ? '机器升级了，决定权没变。买家够不够，仍影响能赚多少。'
                    : ending === 'reform'
                      ? '每人6枚、工作6小时。生活改善了，私人占有关系还在。'
                      : '沿用每人6枚、6小时的账本，只改变占有关系。仍需要协调和监督。'}
                </p>
                <Coins
                  amount={
                    ending === 'profit'
                      ? marketRound(16, 16, 2, 2, buyers).ours.surplus
                      : reliefAccount(
                          { pay: true, time: true, clean: false },
                          buyers,
                        ).surplus
                  }
                  label={
                    ending === 'social'
                      ? '等待共同决定用途的结余'
                      : '这个情景的企业结余'
                  }
                />
              </div>
            </DeepDive>
            <DeepDive title="现实里，我们能做什么？">
              <div className="what-can-change">
                <h3>那我们能做什么？</h3>
                <p>
                  <b>先让技术真正帮到人：</b>
                  核验效率与安全，用培训、劳动保障、缩时和治理把收益变成可兑现的改善。
                </p>
                <p>
                  <b>再让决定受到约束：</b>
                  增强劳动者参与，落实社会责任，改善公共服务与生产协调；同时交代成本和谁来执行。
                </p>
                <p>
                  <b>最后追问占有与支配：</b>
                  不把基本矛盾化约为“老板够不够善良”或“机器够不够先进”。怎样使社会化生产服务社会共同需要，要结合制度与历史实践讨论。
                </p>
                <small>
                  这些是可讨论的行动方向，不是一份保证消除所有冲突的万能处方。
                </small>
                <p>
                  社会主义社会也存在生产力与生产关系、经济基础与上层建筑的矛盾；其性质和解决方式不能机械照搬资本主义。
                </p>
              </div>
            </DeepDive>
            <div className="story-actions">
              <Button className="story-button" onClick={() => go(3)}>
                换一个需求分支，再走一遍 ↺
              </Button>
              <Button
                className="story-button outline"
                onClick={() => setAdvanced(true)}
              >
                进阶：培养、生态与再生产
              </Button>
              <Button className="story-button outline" onClick={restart}>
                全部重来
              </Button>
            </div>
          </>
        )}
        {chapter < 7 &&
          !(chapter === 5 && eventDemand !== null) &&
          (ready ||
            (chapter === 5 && intervened) ||
            (chapter === 4 && contest.length > 0)) && (
            <Reaction
              person={
                chapter === 3 || chapter === 4
                  ? 1
                  : chapter === 2 && allocation === 'time'
                    ? 2
                    : 0
              }
            >
              {reaction}
            </Reaction>
          )}
      </section>
      <StoryEvidence chapter={chapter} key={`evidence-${chapter}`} />
      <div className="story-navigation">
        <Button
          className="story-text-button"
          disabled={chapter === 0}
          onClick={() => go(chapter - 1)}
        >
          ← 上一幕
        </Button>
        {chapter < 7 && (
          <div>
            <small>
              {!ready ? '先试一试本幕的选择' : '可以返回，改变选择或假设'}
            </small>
            <Button
              className="story-button"
              disabled={!ready}
              onClick={() => go(chapter + 1)}
            >
              {storyBeats[chapter].next} →
            </Button>
          </div>
        )}
      </div>
      <footer className="story-credit">
        感谢 Nicky Case ·{' '}
        <a href="https://ncase.me/trust/" target="_blank" rel="noreferrer">
          《信任的进化》
        </a>{' '}
        的人物、机器与金币素材（
        <a
          href="https://github.com/ncase/trust/blob/gh-pages/LICENSE"
          target="_blank"
          rel="noreferrer"
        >
          CC0
        </a>
        ）。新故事与经济模型不代表原作者观点。
        <br />
        无账户 · 不上传选择 · 刷新重来 · 金币为教学假设
      </footer>
    </main>
  );
}
