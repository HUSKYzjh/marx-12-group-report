/**
 * A partial demand-feedback illustration, not a closed stock-flow macro model.
 * Quantities are an indexed basket of final consumption and capital goods at
 * one fixed price. They are neither actual money nor a GDP forecast. Intermediate
 * inputs, replacement costs, credit and price changes are outside this model.
 */
export type MarketMode = 'single' | 'all';
export type FirmAccount = {
  output: number;
  wages: number;
  sales: number;
  /** Sales receipts less wages only; omitted costs mean this is NOT profit. */
  receiptsMinusWages: number;
};
export type MarketAccount = {
  mode: MarketMode | 'baseline';
  laborShare: number;
  cuts: number;
  output: number;
  workerDemand: number;
  ownerDemand: number;
  investmentDemand: number;
  demand: number;
  sold: number;
  unsold: number;
  unfilled: number;
  inventory: number;
  workersIncome: number;
  firm: FirmAccount;
  otherFirms: FirmAccount[];
  baselineFirm: FirmAccount;
};

export const MARKET_ASSUMPTIONS = [
  '四家公司起点相同：各生产10、发工资5；技术提高后各可生产12.5。分配刻度是固定10单位资金中给工人的份额，并非销售收入的百分比。',
  '工人花掉当期全部工资。业主消费5与资本品投资15由既有资金支持，本轮固定不变；其他国内订单并未消失。',
  '商品是消费品与资本品组成的最终产出指数篮子，价格统一，订单按产量比例分配；这里不核算原材料等中间投入的重置成本。',
  '数字是教学指数，不是真实货币或GDP预测；销售回款减工资不等于利润。此处只演示需求反馈，不构建完整的存量流量闭合宏观模型。',
  '减产每轮使当期产量下降10%、工资下降20%；旧库存不参与本轮销售，累计库存加上各轮新增积压。',
] as const;

function baselineFirm(): FirmAccount {
  return { output: 10, wages: 5, sales: 10, receiptsMinusWages: 5 };
}

function firmAccount(
  output: number,
  wages: number,
  sales: number,
): FirmAccount {
  return { output, wages, sales, receiptsMinusWages: sales - wages };
}

/** The matched starting economy: all four firms sell their full output of 10. */
export function baselineMarketAccount(): MarketAccount {
  return {
    mode: 'baseline',
    laborShare: 50,
    cuts: 0,
    output: 40,
    workerDemand: 20,
    ownerDemand: 5,
    investmentDemand: 15,
    demand: 40,
    sold: 40,
    unsold: 0,
    unfilled: 0,
    inventory: 0,
    workersIncome: 20,
    firm: baselineFirm(),
    otherFirms: Array.from({ length: 3 }, baselineFirm),
    baselineFirm: baselineFirm(),
  };
}

/**
 * laborShare is the existing 0..100 percentage control, in steps of 10.
 * Dividing by ten maps it to a wage of 0..10, not a share of realized receipts.
 * Keep full precision here; the presentation may format to two decimal places.
 */
export function marketAccount(
  laborShare: number,
  mode: MarketMode,
  cuts = 0,
): MarketAccount {
  if (
    !Number.isInteger(laborShare) ||
    laborShare < 0 ||
    laborShare > 100 ||
    laborShare % 10 !== 0
  )
    throw new RangeError('工人份额须为0—100之间、每次10个百分点');
  if (mode !== 'single' && mode !== 'all')
    throw new RangeError('只支持单家公司或四家公司共同采用技术');
  if (
    !Number.isInteger(cuts) ||
    cuts < 0 ||
    cuts > 2 ||
    (mode === 'single' && cuts !== 0)
  )
    throw new RangeError('共同采用技术后才可减产，且只演算0—2轮');

  const firmOutput = 12.5 * 0.9 ** cuts;
  const firmWages = (laborShare / 10) * 0.8 ** cuts;
  const otherOutput = mode === 'single' ? 10 : firmOutput;
  const otherWages = mode === 'single' ? 5 : firmWages;
  const output = firmOutput + otherOutput * 3;
  const workerDemand = firmWages + otherWages * 3;
  const ownerDemand = 5;
  const investmentDemand = 15;
  const demand = workerDemand + ownerDemand + investmentDemand;
  const sold = Math.min(output, demand);
  const unsold = output - sold;
  const firmSales = sold * (firmOutput / output);
  const otherSales = sold * (otherOutput / output);
  let inventory = unsold;
  // No stock liquidation is assumed: only current output serves current orders.
  for (let period = 0; period < cuts; period++) {
    const earlierOutput = 50 * 0.9 ** period;
    const earlierDemand = (laborShare / 10) * 4 * 0.8 ** period + 20;
    inventory += Math.max(0, earlierOutput - earlierDemand);
  }

  return {
    mode,
    laborShare,
    cuts,
    output,
    workerDemand,
    ownerDemand,
    investmentDemand,
    demand,
    sold,
    unsold,
    unfilled: demand - sold,
    inventory,
    workersIncome: workerDemand,
    firm: firmAccount(firmOutput, firmWages, firmSales),
    otherFirms: Array.from({ length: 3 }, () =>
      firmAccount(otherOutput, otherWages, otherSales),
    ),
    baselineFirm: baselineFirm(),
  };
}

export const RELIEF_ROUTES = ['consumption', 'investment', 'exports'] as const;
export type ReliefRoute = (typeof RELIEF_ROUTES)[number];
export type ReliefAccount = {
  route: ReliefRoute;
  sustained: boolean;
  output: number;
  workerDemand: number;
  ownerDemand: number;
  investmentDemand: number;
  extraConsumption: number;
  exportDemand: number;
  demand: number;
  sold: number;
  unsold: number;
  nextOutput: number;
  nextDemand: number;
  nextSold: number;
  nextUnsold: number;
  extraOrders: number;
  label: string;
  cost: string;
  now: string;
  condition: string;
  next: string;
  funding: string;
};

/**
 * Three independent experiments start from output 50 and domestic orders 40.
 * No preceding slider or cut experiment carries into this common baseline.
 */
export function reliefAccount(
  route: ReliefRoute,
  sustained: boolean,
): ReliefAccount {
  if (!(RELIEF_ROUTES as readonly unknown[]).includes(route))
    throw new RangeError('请选择消费、投资或出口实验');
  if (typeof sustained !== 'boolean')
    throw new TypeError('后续条件必须为布尔值');

  const nextOutput = route === 'investment' ? 60 : 50;
  const nextDemand =
    route === 'investment' ? (sustained ? 60 : 50) : sustained ? 50 : 40;
  const nextSold = Math.min(nextOutput, nextDemand);
  const descriptions = {
    consumption: {
      label: '增加消费',
      funding:
        '企业从既有留存现金另付10给家庭，家庭当期花掉；不减少本轮业主消费5或投资15。',
      cost: '企业须先垫付工资10；新增消费也会形成企业回款，不能断言企业整体现金净减少10。回款时间与企业间分布未必一致，持续增收需要可持续的分配与流动资金安排。',
      now: '原有订单40，加上家庭消费10，订单50接住当期产出50。',
      condition: '下一轮是否仍有可持续资金，让家庭多消费10？',
      next: sustained
        ? '下一轮额外消费10继续：产出50、订单50，暂无新增积压。这是条件成立时的结果。'
        : '只发一次：下一轮回到订单40，产出仍为50，又新增积压10。',
    },
    investment: {
      label: '增加投资',
      funding:
        '企业动用既有现金，额外购买10单位资本品；假设闲置产能可匹配这些订单，产出篮子包含资本品。',
      cost: '本轮现金支出增加10，下一轮新增产能10。本实验不另算投资诱发的工资消费；扩展乘数效应时，须逐期核算新增收入与消费，不能把同一笔销售算两次。',
      now: '原有投资15增至25，总订单从40增至50，接住当期产出。',
      condition:
        '下一轮额外投资10仍继续时，是否另有经核实、资金可持续的下游最终消费10？',
      next: sustained
        ? '额外投资10继续，另有下游最终消费10：新产出60、订单60，新增产能有需求承接。'
        : '额外投资10虽继续，订单仍只有50；新产出达到60，新增积压10。投资需求不自动保证下游销售。',
    },
    exports: {
      label: '增加出口',
      funding:
        '外国买家用境外收入新增订单10，不占用本国家庭工资；本实验暂固定进口，不新增产能。',
      cost: '需要持续的外部购买力与市场条件。出口不同于净出口，净出口须扣除进口；全球净出口合计为零，各国不能同时靠顺差吸收产出。',
      now: '国内订单40，加上境外订单10，总订单50，接住当期产出50。',
      condition: '下一轮境外收入与订单是否仍能支持新增出口10？',
      next: sustained
        ? '境外订单10持续：下一轮产出50、订单50，暂无新增积压；结果仍取决于外部需求。'
        : '境外新增订单消失：下一轮订单回到40，产出仍为50，又新增积压10。',
    },
  };

  return {
    route,
    sustained,
    output: 50,
    workerDemand: 20,
    ownerDemand: 5,
    investmentDemand: route === 'investment' ? 25 : 15,
    extraConsumption: route === 'consumption' ? 10 : 0,
    exportDemand: route === 'exports' ? 10 : 0,
    demand: 50,
    sold: 50,
    unsold: 0,
    nextOutput,
    nextDemand,
    nextSold,
    nextUnsold: nextOutput - nextSold,
    extraOrders: 10,
    ...descriptions[route],
  };
}
