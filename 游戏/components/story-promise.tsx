'use client';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { promiseRound, type Relief } from '@/lib/factory-model';

export function WishCards({
  wage = 4,
  hours = 8,
  settled = false,
}: {
  wage?: number;
  hours?: number;
  settled?: boolean;
}) {
  return (
    <div className="wish-cards" aria-label="两个人的小愿望">
      {[
        {
          name: '小蓝',
          person: 0,
          wish: '想给自己的夜校课，多留2枚。',
          met: wage >= 6,
          result:
            wage >= 6 ? '夜校预算，多出了2枚。' : '夜校预算，还得再等等。',
        },
        {
          name: '小粉',
          person: 2,
          wish: '想在天黑前，陪爸爸散散步。',
          met: hours <= 6,
          result:
            hours <= 6
              ? `今天多了${8 - hours}小时，可以去散步。`
              : '今天，还是要工作8小时。',
        },
      ].map((p) => (
        <div className="wish-card" key={p.name} data-met={settled && p.met}>
          <span className="story-person small">
            <span
              className="peep-art"
              role="img"
              aria-label={p.name}
              style={{ backgroundPosition: `${(p.person / 7) * 100}% 0` }}
            />
          </span>
          <div>
            <b>{p.name}</b>
            <p>{settled ? p.result : p.wish}</p>
          </div>
          {settled && (
            <span
              className="wish-mark"
              aria-label={p.met ? '愿望具备条件' : '愿望尚未具备条件'}
            >
              {p.met ? '✓' : '…'}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PromiseScene({
  relief,
  buyers,
  demand,
  response,
  days,
  onDemand,
  onResponse,
  onRepeat,
  onBack,
}: {
  relief: Relief;
  buyers: number;
  demand: number;
  response: 'keep' | 'negotiate' | null;
  days: number;
  onDemand: (n: number) => void;
  onResponse: (v: 'keep' | 'negotiate') => void;
  onRepeat: () => void;
  onBack: () => void;
}) {
  const trial = promiseRound(relief, demand, response ?? 'keep', days);
  const after = trial.account;
  const aftermath = useRef<HTMLDivElement>(null);
  const envelope = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (response) {
      aftermath.current?.focus({ preventScroll: true });
      aftermath.current?.scrollIntoView({
        block: 'start',
        behavior: 'instant',
      });
    } else {
      envelope.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [response, days]);
  return (
    <div className="promise-scene" data-shock={demand === 20}>
      <div className="event-envelope" ref={envelope}>
        <span className="event-stamp">第二天 · 一封订单通知</span>
        <h2>
          {demand === 20 ? '机器没坏。订单少了。' : '另一条路：订单没有减少。'}
        </h2>
        <div className="order-drop">
          <span>
            {buyers / 2}
            <small>昨天订单</small>
          </span>
          <b>→</b>
          <span>
            {demand / 2}
            <small>今天订单</small>
          </span>
        </div>
        <p>工资与休息的约定，还算数吗？</p>
        <small>虚构压力测试 · 总需求{demand}，各分一半 · 另设8枚备用金</small>
      </div>
      {!response ? (
        <>
          <div className="promise-dialogue">
            <b>厂主</b>
            <p>
              {trial.dailyDraw > 0
                ? `“我也希望留住大家。但每天缺的${trial.dailyDraw}枚，从哪里来？”`
                : '“这份安排还付得起。我们要继续兑现约定吗？”'}
            </p>
          </div>
          <div className="story-choice-row promise-choices">
            <Button className="story-choice" onClick={() => onResponse('keep')}>
              <b>先守住这份约定</b>
              <span>工资和工时不变，亏空用备用金补。</span>
            </Button>
            <Button
              className="story-choice"
              onClick={() => onResponse('negotiate')}
            >
              <b>重新协商工资与工时</b>
              <span>假设达成每人4枚、每天6小时；治理不变。</span>
            </Button>
          </div>
        </>
      ) : (
        <div
          className="promise-aftermath"
          ref={aftermath}
          tabIndex={-1}
          key={`${demand}-${response}-${days}`}
        >
          <span className="event-stamp">这份安排已执行 {days} 天</span>
          <WishCards wage={after.wageEach} hours={after.hours} settled />
          <div className="promise-metrics" aria-live="polite">
            <div>
              <span>每人工资</span>
              <b>
                {after.wageEach}
                <small>枚 / 天</small>
              </b>
            </div>
            <div>
              <span>每日企业结余</span>
              <b>
                {after.surplus}
                <small>枚</small>
              </b>
            </div>
            <div>
              <span>备用金剩余</span>
              <b>
                {trial.reserveLeft}
                <small> / 8枚</small>
              </b>
            </div>
          </div>
          <div
            className="reserve-track"
            role="img"
            aria-label={`备用金剩余${trial.reserveLeft}枚，共8枚`}
          >
            {Array.from({ length: 8 }, (_, i) => (
              <i key={i} data-spent={i >= trial.reserveLeft} />
            ))}
          </div>
          <p className="promise-line">
            {trial.dailyDraw === 0
              ? '这份约定，在当前条件下不必动用备用金。'
              : trial.reserveLeft === 0
                ? '约定还在。能缓冲的8枚，已经用完了。'
                : `今天守住的安排，每天要用${trial.dailyDraw}枚备用金支撑。`}
          </p>
          <div className="story-actions">
            <Button
              className="story-button"
              disabled={!trial.canRepeat}
              onClick={onRepeat}
            >
              {days === 2
                ? '两天已过，带着结果往下走'
                : trial.canRepeat
                  ? '如果再过一天呢？ →'
                  : '备用金已不足再撑一天'}
            </Button>
            <Button
              className="story-button outline"
              onClick={() => onDemand(demand)}
            >
              换个应对，重新试
            </Button>
          </div>
        </div>
      )}
      <div className="story-actions">
        <Button
          className="story-text-button"
          onClick={() => onDemand(demand === 20 ? buyers : 20)}
        >
          {demand === 20 ? '如果订单没减少呢？ ↗' : '回到订单减少的那天 ↗'}
        </Button>
        <Button className="story-text-button" onClick={onBack}>
          ← 重新拟定约定
        </Button>
      </div>
      <details className="deep-dive">
        <summary>这一幕假设了什么？</summary>
        <div>
          <p>
            订单变化是你可以切换的外生情景，不是科技必然造成危机的预测。备用金8枚是假设的初始储备，不与前几幕的实验结余累加；这里只扣每日亏空，正结余另留企业，不自动加入储备。重试会重置这次实验。
          </p>
          <p>
            重新协商假设劳动者同意，不表示企业可以单方面违约。模型没有模拟家庭全部开支、信贷、公共支持或新投资；两天的收支不能证明一种制度的长期成败。
          </p>
        </div>
      </details>
    </div>
  );
}
