export const storySteps = [
  {
    name: '一起生产',
    title: '大家一起干活。',
    accent: '谁来决定怎么分？',
    intro:
      '小蓝和小粉有劳动能力，厂主拥有机器。先认识这家工厂，再看看一天结束时，金币去了哪里。',
    assumption:
      '两名工人，每人工作8小时、领取4金币。机器由厂主所有；暂时假设产品都能按每件3金币卖掉。',
    boundary:
      '这是对资本主义企业关系的简化，不是所有企业的画像。生产还依靠供应商、运输、科研和社会知识，远不止画面里三个人。',
    next: '机器升级，会怎样？',
  },
  {
    name: '升级机器',
    title: '同样两个人，',
    accent: '现在做得更多。',
    intro:
      '新技术让产量翻倍，还减少材料浪费。工资合同没有改变。先猜一猜，再亲手开启机器。',
    assumption:
      '本幕只改技术：产量从8变16；每件材料成本从1变0.5；每轮设备成本从2变4。仍假设全部卖掉。',
    boundary:
      '这些是教学参数，不是AI平均效果，也不是“机器独立创造价值”的比例。真实技术可能失败或需要更多核验。',
    next: '多出来的金币，归谁？',
  },
  {
    name: '分配红利',
    title: '技术给了余地。',
    accent: '现在，改一条规则。',
    intro:
      '这次你暂时拥有分配决策权。试着把技术红利变成工资或闲暇，看看谁的钱包真的变了。',
    assumption:
      '保持新技术和售价不变。三个方案都保留私人所有权；不把“工资提高”写成“所有权已经转移”。',
    boundary:
      '现实中的劳动者并非天然拥有这个按钮，改变合同往往需要组织、协商或制度保障。闲暇不用金币标价。',
    next: '但是，别家也有新机器了',
  },
  {
    name: '市场与价格',
    title: '你能生产出来，',
    accent: '别人就一定会买吗？',
    intro:
      '另一家工厂也升级了，每件只卖2金币。我们先把工时和工资恢复到8小时、4金币，单独看看竞争的影响。',
    assumption:
      '撤掉“全部卖掉”。两厂各产16件；买家每人买1件，最高愿付3金币，先买便宜的。同价时按产量代表的销售覆盖比例分单。',
    boundary:
      '这是刻意简化的分单规则，不是普遍市场定律。现实还有品牌、需求弹性、垄断、信贷和政府支出。你可以选择需求跟上的分支。',
    next: '再试试：每家都想多卖一点',
  },
  {
    name: '重复竞争',
    title: '对一家合理，',
    accent: '对大家也合理吗？',
    intro:
      '价格都固定为2金币。每轮你选生产12件或16件，对方同时作选择。先玩三轮，再把结果放在一起看。',
    assumption:
      '新增同时决策：同价按供给规模分单，四舍五入为整件。对方按预先写好的12、16、16件出牌，不读取你本轮的选择。',
    boundary:
      '这里展示一种可能的竞争困境，不证明危机必然发生。需求增加到32人时，这组参数下的滞销会消失。生产计划也不等于工人自动获准提前下班。',
    next: '除了追着竞争跑，还能改变什么？',
  },
  {
    name: '改变规则',
    title: '改善不是假的。',
    accent: '也不是没有代价。',
    intro:
      '现在把刚才分开的东西放回同一家工厂：工资、工时、治理成本和销路。尝试叠加改变，看看账本能否承担。',
    assumption:
      '以两厂同价、各分一半订单为基准。加薪到每人6金币；缩时到6小时、产12件；治理投入4金币使环境负担降低75%。',
    boundary:
      '本幕改用事先确定的各半订单，暂不沿用上一幕按规模分单；这是协调后的情景，不保证市场自然给到这些订单。工资、公共服务和治理需要资源与执行。环境指数不是健康的售价，负结余须说明资金来源。',
    next: '为什么改善后，问题还没完全消失？',
  },
  {
    name: '谁说了算',
    title: '金币分得更多，',
    accent: '就等于一起作主了吗？',
    intro:
      '保持刚才的产量和金币不变。现在只改变另一件事：谁拥有生产资料，谁有权决定生产与结余的用途？',
    assumption:
      '把收入分配、参与决策、所有与支配关系分开。产权按钮是理论对照，不是现实制度能够一键切换的承诺。',
    boundary:
      '一家合作社、一个公营企业或一项福利政策，都不能单独定义整个国家的社会制度。改变关系也不保证每个具体问题自动解决。',
    next: '看看这条路，还可以怎样走',
  },
  {
    name: '不同可能',
    title: '结局没有写在',
    accent: '机器的说明书里。',
    intro:
      '回头看：我们依次加入协作、技术、分配、竞争、社会需求和决策权。现在用不同条件，比较不同的发展可能。',
    assumption:
      '三个分支是机制情景，不是国家排名或历史预言。现实检验还需要调查、统计、制度分析与长期实践。',
    boundary:
      '技术能力、具体政策效果和国家基本制度不是同一个层级。不能用几个假想参数，证明一种社会制度的全部表现。',
    next: '',
  },
] as const;
export const evidenceImages = {
  'ai-paper': '/evidence/ai-paper.png',
  'cloud-report': '/evidence/cloud-report.png',
  'board-paper': '/evidence/board-paper.png',
  'bls-recalculation': '/evidence/bls-recalculation.png',
} as const;

export const storyEvidence = [
  {
    heading: '生产越来越依靠协作，但权利不自动共享',
    body: '马克思、恩格斯分析的是生产的社会性与占有方式的关系。“生产社会化”不只是两个人一起干活，而是分工、知识、产业链把越来越多人连在一起。',
    ids: ['engels', 'marx'],
    image: 'board-paper',
    caption:
      '作为企业权利研究的延伸阅读：作者稿第1页标题截图（2020-10-20）；论文于2021年发表。',
    imageUrl:
      'https://eml.berkeley.edu/~schoefer/schoefer_files/Labor_in_the_Boardroom_Final_QJE_Forthcoming.pdf',
  },
  {
    heading: '技术确实能帮到人，但任务不同，效果也不同',
    body: '2025年QJE正式论文研究5,172名客服，平均每小时解决问题数提高约15%。这既不是所有工作的平均效果，也不等于工资上涨15%。METR对特定资深开发任务的研究则提醒我们，核验AI建议也有成本。',
    ids: ['qje', 'metr'],
    image: 'ai-paper',
    caption:
      '原论文作者稿第1页标题截图，arXiv v2（2024）；不是2025年期刊排版。结论口径与正式发表版本分别注明。',
    imageUrl: 'https://arxiv.org/pdf/2304.11771v2',
  },
  {
    heading: '生产率增长与报酬增长，需要分别核验',
    body: '我们用BLS保存快照复算：2019—2025年简单年均指数比较，生产率累计增长13.81%，实际小时报酬增长6.77%。两种价格口径不同，差额不能全算成资本多拿走的份额。',
    ids: ['bls', 'uber'],
    image: 'bls-recalculation',
    caption:
      '本研究据BLS数据绘制的1973—2025年比较图，不是新闻或论文截图。来源快照：2026-09-08；图中不是AI的因果效果。',
    imageUrl: 'https://www.bls.gov/productivity/',
  },
  {
    heading: '现实竞争还受市场结构与平台控制影响',
    body: '英国CMA的2025年云服务调查关注市场集中、转换障碍等问题。真实市场不总是“同样两家工厂平等竞争”；谁控制平台、数据接口和迁移条件，也会影响客户选择。',
    ids: [],
    image: 'cloud-report',
    caption: 'CMA《云服务市场调查》最终决定摘要，第1页封面截图，2025-07-31。',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/688b20e6ff8c05468cb7b120/summary_of_final_decision.pdf',
  },
  {
    heading: '游戏的收益表，不是实证研究的结果表',
    body: '本幕的6、8、2、4枚金币由明确写出的成本、需求与分单假设算出。它隔离了私人决策与社会协调之间的一种张力，不能替代对现实危机的完整解释。现实市场结构可从CMA等调查继续核查。',
    ids: ['engels'],
    image: 'cloud-report',
    caption:
      '现实市场结构的延伸资料：CMA 2025年最终决定摘要封面。不是本游戏收益矩阵的估计来源。',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/688b20e6ff8c05468cb7b120/summary_of_final_decision.pdf',
  },
  {
    heading: '制度改善要看有没有真正落实',
    body: '中国2025年职业伤害保障安排把平台责任与订单联系起来；北京发布会还报告了实际待遇支付。参保人数不等于获赔人数，件数也不能直接除以人数算“成功率”。这类保障能改善生活，效果仍需核验。',
    ids: ['injury', 'paid', 'battery'],
    image: null,
    caption: '',
    imageUrl: '',
  },
  {
    heading: '参与治理、拿到工资、拥有生产资料，是不同权利',
    body: '《Labor in the Boardroom》研究德国部分企业三分之一董事会席位规则的变化，没有发现明确的平均工资提升。这既不能代表所有共同决定制度，也不能把代表席位等同于全部社会所有权。',
    ids: ['board', 'china', 'mao', 'cms'],
    image: 'board-paper',
    caption:
      '作者最终稿第1页标题截图；稿件日期2020-10-20，期刊正式发表2021年。',
    imageUrl:
      'https://eml.berkeley.edu/~schoefer/schoefer_files/Labor_in_the_Boardroom_Final_QJE_Forthcoming.pdf',
  },
  {
    heading: '证据帮助修正模型，而不是给预设结局盖章',
    body: '本作接续已有研究，事实与来源整理截至2026-09-09。你可以查原始口径、质疑假设，或在进阶实验中检验培养、环境与社会再生产的其他机制。',
    ids: ['engels', 'marx', 'qje', 'bls', 'china', 'mao'],
    image: null,
    caption: '',
    imageUrl: '',
  },
] as const;
