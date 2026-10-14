export type Allocation = 'retain' | 'share' | 'time';
export type Training = 'cut' | 'invest' | 'mentor';
export function bounded(n: number, min: number, max: number) {
  if (!Number.isFinite(n) || n < min || n > max)
    throw new RangeError(`参数须在 ${min}—${max} 之间`);
  return n;
}
export function production(
  adopted: boolean,
  allocation: Allocation = 'retain',
  share = 50,
) {
  bounded(share, 0, 100);
  if (!['retain', 'share', 'time'].includes(allocation))
    throw new Error('未知分配方案');
  const productivity = adopted ? 1.5 : 1;
  const hours = adopted && allocation === 'time' ? 8 / productivity : 8;
  const output = 10 * hours * productivity;
  const costs = output * 0.2 + (adopted ? 8 : 4);
  const bonus = adopted && allocation === 'share' ? (28 * share) / 100 : 0;
  const wages = 40 + bonus;
  return {
    productivity,
    hours,
    output,
    costs,
    wages,
    surplus: output - costs - wages,
    bonus,
  };
}
export const trainingRules = {
  cut: { label: '压缩新人培养', entrants: 8, learning: 1, resources: 8 },
  invest: { label: '扩大培养投入', entrants: 10, learning: 1.2, resources: 14 },
  mentor: {
    label: 'AI辅导 + 独立考核',
    entrants: 8,
    learning: 1.25,
    resources: 12,
  },
} as const;
export function advanceSkills(
  stock: number,
  choice: Training,
  learningOverride?: number,
) {
  bounded(stock, 0, 1000);
  const rule = trainingRules[choice];
  if (!rule) throw new Error('未知培养方案');
  const learning =
    learningOverride === undefined
      ? rule.learning
      : bounded(learningOverride, 0.5, 2);
  const next = stock * 0.9 + rule.entrants * learning;
  return {
    stock: next,
    capacity: next * 1.2,
    resources: rule.resources,
    choice,
  };
}
export function skillsPath(choice: Training, periods = 6, learning?: number) {
  bounded(periods, 0, 30);
  if (!Number.isInteger(periods)) throw new Error('轮数必须为整数');
  const path = [100];
  for (let i = 0; i < periods; i++)
    path.push(advanceSkills(path.at(-1)!, choice, learning).stock);
  return path;
}
export function footprint(
  growth: number,
  intensityReduction: number,
  responsibility: number,
) {
  bounded(growth, 0, 100);
  bounded(intensityReduction, 0, 80);
  bounded(responsibility, 0, 100);
  const total = 100 * (1 + growth / 100) * (1 - intensityReduction / 100);
  return {
    total,
    inside: (total * responsibility) / 100,
    outside: total * (1 - responsibility / 100),
    threshold: (1 / (1 - intensityReduction / 100) - 1) * 100,
  };
}

// Isolates one feedback mechanism, not a complete macroeconomic account.
export function feedbackPath(
  reinvestment: number,
  sharing: number,
  periods = 8,
) {
  bounded(reinvestment, 0, 100);
  bounded(sharing, 0, 100);
  bounded(periods, 0, 30);
  if (!Number.isInteger(periods)) throw new RangeError('轮数必须为整数');
  const path = [
    { capacity: 100, demand: 100, sold: 100, retained: 20, wage: 40 },
  ];
  for (let i = 0; i < periods; i++) {
    const before = path.at(-1)!;
    const capacity =
      before.capacity + ((before.retained * reinvestment) / 100) * 0.5;
    const wage = 40 + (before.sold * 0.2 * sharing) / 100;
    const demand = 60 + wage;
    const sold = Math.min(capacity, demand);
    const retained = Math.max(0, sold * 0.2 - (wage - 40));
    path.push({ capacity, demand, sold, retained, wage });
  }
  return path;
}
