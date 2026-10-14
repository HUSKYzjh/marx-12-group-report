'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { advanceSkills, feedbackPath, type Training } from '@/lib/simulation';

export function AnimatedNumber({
  value,
  digits = 0,
}: {
  value: number;
  digits?: number;
}) {
  const [shown, setShown] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - start) / 420);
      setShown(from + (value - from) * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <span aria-label={value.toFixed(digits)}>
      <span aria-hidden="true">{shown.toFixed(digits)}</span>
    </span>
  );
}

export function Prediction({
  chosen,
  onChoose,
  revealed,
}: {
  chosen: string | null;
  onChoose: (v: string) => void;
  revealed: boolean;
}) {
  return (
    <div className={'prediction ' + (revealed ? 'resolved' : '')}>
      <span className="prompt-label">先猜，再试</span>
      <p>
        机器快了50%。<strong>你的日工资呢？</strong>
      </p>
      <div className="prediction-options">
        {[
          ['rise', '也涨50%'],
          ['same', '原地不动'],
          ['rules', '单靠技术，判断不了'],
        ].map(([id, label]) => (
          <Button
            variant="outline"
            key={id}
            className="guess-button"
            aria-pressed={chosen === id}
            onClick={() => onChoose(id)}
          >
            {chosen === id ? '●' : '○'} {label}
          </Button>
        ))}
      </div>
      {revealed && chosen && (
        <p className="prediction-reply" role="status">
          {chosen === 'rise'
            ? '多生产50%，不等于多拿50%。'
            : chosen === 'same'
              ? '在这份不变的工资合同下，你猜中了。'
              : '对，技术本身没有写好工资合同。'}{' '}
          在这个实验里，工资暂时不变。下一幕，你可以改这条规则。
        </p>
      )}
    </div>
  );
}

export function ProductionPlayground({
  adopted,
  onToggle,
  disabled,
}: {
  adopted: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <div className={'production-playground ' + (adopted ? 'is-on' : '')}>
      <div className="stage-corner">实验 01 / 只改变技术</div>
      <div className="production-flow">
        <div className="worker-group">
          <span className="figure-label">一起劳动的10个人</span>
          <div className="people" aria-label="10名劳动者">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i}>{String(i + 1).padStart(2, '0')}</span>
            ))}
          </div>
          <span className="scene-caption">每人 8 小时 / 日</span>
        </div>
        <span className="flow-arrow" aria-hidden="true">
          →
        </span>
        <Button
          className="machine-control"
          aria-pressed={adopted}
          onClick={onToggle}
          disabled={disabled}
          aria-label={
            adopted ? '关闭新技术，对比原先产出' : '开启新技术，效率提高50%'
          }
        >
          <span className="machine-status">
            <i />
            {adopted ? '新技术已开启' : '原有生产工具'}
          </span>
          <strong>
            ×<AnimatedNumber value={adopted ? 1.5 : 1} digits={1} />
          </strong>
          <span className="machine-switch">
            {adopted ? '↺ 关掉，对照看看' : '↗ 点我，升级技术'}
          </span>
        </Button>
        <span className="flow-arrow" aria-hidden="true">
          →
        </span>
        <div className="goods-group">
          <span className="figure-label">共同产出 · 每块10件</span>
          <div className="goods" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <span
                key={i}
                className={i < 8 ? 'original' : adopted ? 'new' : 'unmade'}
                style={{ animationDelay: `${Math.max(0, i - 8) * 65}ms` }}
              />
            ))}
          </div>
          <strong className="output-number">
            <AnimatedNumber value={adopted ? 120 : 80} />
            <small> 件 / 日</small>
          </strong>
        </div>
      </div>
      <div className="unchanged-contract">
        <span>
          产出 <b>{adopted ? '+50%' : '基准'}</b>
        </span>
        <span>
          工时 <b>8小时</b>
        </span>
        <span>
          每人日工资 <b>4</b>
        </span>
        <small>技术开关没有改动工资合同</small>
      </div>
    </div>
  );
}

export function InlineConcept({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="inline-concept">
      <button
        className="concept-link"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        {label}
        <span aria-hidden="true">{open ? ' −' : ' ＋'}</span>
      </button>
      <span id={id} hidden={!open} className="concept-expansion">
        {children}
      </span>
    </span>
  );
}

export function SkillFlow({
  stock,
  choice,
}: {
  stock: number;
  choice: Training | null;
}) {
  const next = choice ? advanceSkills(stock, choice) : null;
  return (
    <div
      className="skill-equation"
      aria-label="每轮能力更新：原有能力保留90%，再加入新人形成的能力。"
    >
      <div>
        <span>原有能力</span>
        <strong>{stock.toFixed(1)}</strong>
        <small>保留90%</small>
      </div>
      <b aria-hidden="true">× 0.9</b>
      <b aria-hidden="true">＋</b>
      <div>
        <span>新人补充</span>
        <strong>{next ? (next.stock - stock * 0.9).toFixed(1) : '?'}</strong>
        <small>{choice ? '最近方案的补充量' : '取决于你的选择'}</small>
      </div>
      <b aria-hidden="true">→</b>
      <div className="future-node">
        <span>下一轮能力</span>
        <strong>{next ? next.stock.toFixed(1) : '?'}</strong>
        <small>{choice ? '若下一轮继续此方案' : '不是自动补齐'}</small>
      </div>
    </div>
  );
}

export function BurdenDots({
  total,
  responsibility,
}: {
  total: number;
  responsibility: number;
}) {
  const count = Math.ceil(total / 5),
    inside = (total * responsibility) / 100;
  return (
    <div
      className="burden-dots"
      role="img"
      aria-label={`总负担${total.toFixed(1)}，企业责任${inside.toFixed(1)}。每个完整点代表5单位；末点和责任交界点可按比例填充。`}
    >
      {Array.from({ length: 40 }, (_, i) => {
        const amount = Math.min(5, Math.max(0, total - i * 5));
        const assigned = Math.min(amount, Math.max(0, inside - i * 5));
        return (
          <span
            key={i}
            className={i < count ? 'burden-dot filled' : 'burden-dot'}
            style={{
              background: amount
                ? `conic-gradient(var(--blue) 0 ${(assigned / 5) * 100}%, var(--orange) ${(assigned / 5) * 100}% ${(amount / 5) * 100}%, transparent ${(amount / 5) * 100}% 100%)`
                : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

export function FeedbackLab() {
  const [reinvest, setReinvest] = useState(100),
    [sharing, setSharing] = useState(0),
    [round, setRound] = useState(0);
  const path = feedbackPath(reinvest, sharing),
    current = path[round];
  const gap = Math.max(0, current.capacity - current.sold);
  function resetChange(fn: (n: number) => void, n: number) {
    fn(n);
    setRound(0);
  }
  return (
    <div className="feedback-lab">
      <div className="lab-heading">
        <span className="prompt-label">额外实验 / 把关系连起来</span>
        <h3>
          每家企业都想多生产。
          <br />
          可谁来买？
        </h3>
        <p>先只扩产，再试着改变收入分配。看两条路径如何反馈。</p>
      </div>
      <div
        className="loop-diagram"
        aria-label="企业结余用于扩产，劳动收入影响需求，实际销售再影响结余。"
      >
        <div className="loop-node">
          <span>生产能力</span>
          <strong>
            <AnimatedNumber value={current.capacity} digits={1} />
          </strong>
          <small>企业结余 → 再投资</small>
        </div>
        <span className="loop-arrow" aria-hidden="true">
          →
        </span>
        <div className="loop-node loop-demand">
          <span>可实现需求</span>
          <strong>
            <AnimatedNumber value={current.demand} digits={1} />
          </strong>
          <small>固定需求 ＋ 劳动收入</small>
        </div>
        <span className="loop-arrow" aria-hidden="true">
          →
        </span>
        <div className="loop-node">
          <span>实际销售</span>
          <strong>
            <AnimatedNumber value={current.sold} digits={1} />
          </strong>
          <small>取能力与需求的较小值</small>
        </div>
      </div>
      <div className="loop-return">
        <span aria-hidden="true">↶</span> 销售产生的结余，反馈到下一轮投资与分配
      </div>
      <div className="feedback-controls">
        {[
          {
            id: 'feedback-invest',
            label: '结余中用于扩产',
            value: reinvest,
            change: setReinvest,
          },
          {
            id: 'feedback-share',
            label: '可分配基数中转为工资',
            value: sharing,
            change: setSharing,
          },
        ].map((c) => (
          <div className="range-field" key={c.id}>
            <label id={c.id}>
              {c.label}
              <strong>{c.value}%</strong>
            </label>
            <Slider
              aria-labelledby={c.id}
              value={[c.value]}
              min={0}
              max={100}
              step={10}
              onValueChange={(v) =>
                resetChange(c.change, Array.isArray(v) ? v[0] : v)
              }
            />
          </div>
        ))}
      </div>
      <div className="feedback-actions">
        <Button
          className="action-button"
          disabled={round === 8}
          onClick={() => setRound((r) => Math.min(8, r + 1))}
        >
          运行一轮 →
        </Button>
        <Button
          variant="outline"
          className="action-button"
          disabled={round === 0}
          onClick={() => setRound(0)}
        >
          重置轮次
        </Button>
        <span>第 {round} / 8 轮</span>
      </div>
      <p className="loop-result" role="status">
        {round === 0
          ? '同一起点：生产能力100，需求100。点击运行，看看下一轮。'
          : gap > 0.05
            ? `能力与销售之间出现了${gap.toFixed(1)}的缺口。扩产并不自动带来等量需求。`
            : '当前需求承接了生产能力。收入分配改善，可以缓和这一情景中的实现约束。'}
      </p>
      <details className="loop-assumptions">
        <summary>打开方程与反例：为什么这不是“危机预测器”？</summary>
        <p>
          初始能力与销售为100，工资40，结余20。下一轮能力＝原能力＋原结余×再投资比例×0.5；工资＝40＋上轮销售×0.2×分享比例；需求＝60＋工资；销售＝min(能力，需求)；结余＝max(0，销售×0.2−新增工资)。每轮沿用这些假设；此处与第二幕不是同一套货币账户。
        </p>
        <p>
          模型刻意固定其他需求，没有信贷、政府新增支出、出口、价格调整和折旧；投资支出也未形成模型内的需求。改变这些边界，结果会变。它只隔离“扩产—分配—需求”的一条反馈，不能证明危机必然发生，更不能把消费不足当成资本主义基本矛盾的全部。
        </p>
      </details>
    </div>
  );
}
