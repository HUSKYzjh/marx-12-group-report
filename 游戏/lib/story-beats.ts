// The playable layer stays short; research and model qualifications live in story-content.
export const storyBeats = [
  {
    title: '先让工厂转起来。',
    lead: '点一下小蓝和小粉，让他们加入生产。',
    rule: '每人4枚工资 · 每天8小时 · 暂时全部卖掉',
    next: '换台新机器',
  },
  {
    title: '机器快了，工资呢？',
    lead: '先猜，再按下开关。',
    rule: '只升级机器 · 不改工资合同',
    next: '试着分一分',
  },
  {
    title: '多拿钱，还是早下班？',
    lead: '你来改合同。看看两人的钱包和工时。',
    rule: '新机器不变 · 暂时全部卖掉 · 私人所有',
    next: '隔壁降价了',
  },
  {
    title: '隔壁只卖2枚。你呢？',
    lead: '试试三个价格：卖得多，就一定赚得多吗？',
    rule: '恢复8小时、每人4枚 · 买家先买便宜的',
    next: '和隔壁过三招',
  },
  {
    title: '你多产，我也多产。',
    lead: '选好产量，再看对手出牌。共三轮。',
    rule: '每件2枚 · 同价按供给规模分订单',
    next: '换一种玩法',
  },
  {
    title: '能多拿钱、少干活吗？',
    lead: '小挑战：每人6枚、工作6小时，工厂还不亏。',
    rule: '现在协调订单，各分一半 · 不凭空增加需求',
    next: '最后，谁作主？',
  },
  {
    title: '分钱 ≠ 一起作主。',
    lead: '金币不变。这次只换“谁拥有、谁决定”。',
    rule: '企业权利的理论对照，不是国家制度开关',
    next: '带着我们的选择，走到最后',
  },
  {
    title: '我们要的，不只是更多。',
    lead: '回看小蓝、小粉，也回看谁拥有决定权。',
    rule: '情景比较，不是历史预言',
    next: '',
  },
] as const;

export function policyChallenge(
  wageEach: number,
  hours: number,
  surplus: number,
) {
  return [
    { label: '每人6枚', met: wageEach >= 6 },
    { label: '最多6小时', met: hours <= 6 },
    { label: '不亏钱', met: surplus >= 0 },
  ];
}
