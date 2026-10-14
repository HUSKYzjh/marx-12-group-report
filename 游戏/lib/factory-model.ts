export type FactoryRules = {
  technology?: boolean;
  hours?: number;
  planned?: number;
  price?: number;
  sold?: number;
  wageEach?: number;
  clean?: boolean;
};
function limit(n: number, low: number, high: number, label: string) {
  if (!Number.isFinite(n) || n < low || n > high) throw new RangeError(label);
  return n;
}
export function factoryAccount(r: FactoryRules = {}) {
  const technology = r.technology ?? false,
    hours = limit(r.hours ?? 8, 4, 8, '工时须在4—8之间');
  const capacity = 2 * hours * (technology ? 1 : 0.5),
    produced = limit(r.planned ?? capacity, 0, capacity, '产量不能超过能力');
  const price = limit(r.price ?? 3, 1, 3, '价格须在1—3之间'),
    sold = limit(r.sold ?? produced, 0, produced, '销量不能超过产量');
  const wageEach = limit(r.wageEach ?? 4, 0, 12, '每人工资须在0—12之间');
  const materials = produced * (technology ? 0.5 : 1),
    equipment = technology ? 4 : 2,
    treatment = r.clean ? 4 : 0;
  const costs = materials + equipment + treatment,
    wages = 2 * wageEach,
    revenue = sold * price,
    surplus = revenue - costs - wages;
  const burden = (produced / 4) * (r.clean ? 0.25 : 1);
  return {
    technology,
    hours,
    capacity,
    produced,
    sold,
    unsold: produced - sold,
    price,
    wageEach,
    materials,
    equipment,
    treatment,
    costs,
    wages,
    revenue,
    surplus,
    burden,
  };
}
export function marketRound(
  ours: number,
  theirs: number,
  ourPrice = 2,
  theirPrice = 2,
  buyers = 24,
) {
  for (const n of [ours, theirs]) {
    limit(n, 0, 16, '产量须在0—16之间');
    if (!Number.isInteger(n)) throw new RangeError('产品按整件计算');
  }
  limit(ourPrice, 1, 3, '价格须在1—3之间');
  limit(theirPrice, 1, 3, '价格须在1—3之间');
  limit(buyers, 0, 40, '买家须在0—40之间');
  if (!Number.isInteger(buyers)) throw new RangeError('买家按人数计算');
  let sold = 0,
    rivalSold = 0;
  if (ours + theirs <= buyers) {
    sold = ours;
    rivalSold = theirs;
  } else if (ourPrice < theirPrice) {
    sold = Math.min(ours, buyers);
    rivalSold = Math.min(theirs, buyers - sold);
  } else if (ourPrice > theirPrice) {
    rivalSold = Math.min(theirs, buyers);
    sold = Math.min(ours, buyers - rivalSold);
  } else {
    sold = Math.min(ours, Math.round((buyers * ours) / (ours + theirs)));
    rivalSold = Math.min(theirs, buyers - sold);
  }
  return {
    ours: factoryAccount({
      technology: true,
      planned: ours,
      price: ourPrice,
      sold,
    }),
    theirs: factoryAccount({
      technology: true,
      planned: theirs,
      price: theirPrice,
      sold: rivalSold,
    }),
    buyers,
    totalUnsold: ours + theirs - sold - rivalSold,
  };
}
export const rivalPlans = [12, 16, 16] as const;
export type Relief = { pay: boolean; time: boolean; clean: boolean };
export type FactoryAccount = ReturnType<typeof factoryAccount>;
/** Compare matched scenarios; positive is an increase, not a welfare score. */
export function accountChange(before: FactoryAccount, after: FactoryAccount) {
  return {
    revenue: after.revenue - before.revenue,
    costs: after.costs - before.costs,
    wages: after.wages - before.wages,
    surplus: after.surplus - before.surplus,
    hours: after.hours - before.hours,
    sold: after.sold - before.sold,
    burden: after.burden - before.burden,
  };
}
export function reliefAccount(r: Relief, buyers = 24) {
  limit(buyers, 0, 40, '买家须在0—40之间');
  const hours = r.time ? 6 : 8;
  return factoryAccount({
    technology: true,
    hours,
    price: 2,
    sold: Math.min(hours * 2, buyers / 2),
    wageEach: r.pay ? 6 : 4,
    clean: r.clean,
  });
}

/** Fictional two-day stress test. Reserve is an explicit endowment, not earlier profits. */
export function promiseRound(
  promised: Relief,
  buyers: number,
  response: 'keep' | 'negotiate',
  days = 1,
) {
  if (days !== 1 && days !== 2) throw new RangeError('只演算一至两天');
  const rules =
    response === 'keep'
      ? promised
      : { pay: false, time: true, clean: promised.clean };
  const account = reliefAccount(rules, buyers);
  const dailyDraw = Math.max(0, -account.surplus);
  const reserve = 8;
  const needed = dailyDraw * days;
  return {
    account,
    rules,
    days,
    dailyDraw,
    reserveLeft: Math.max(0, reserve - needed),
    fundingGap: Math.max(0, needed - reserve),
    canRepeat: days < 2 && dailyDraw * (days + 1) <= reserve,
  };
}
