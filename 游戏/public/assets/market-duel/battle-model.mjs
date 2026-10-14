// A bounded, closed-street teaching encounter. Money changes hands; it is not damage.
export const DAYS = 9;
export const ACTIONS = ['price', 'oven', 'labor', 'hold'];
export function initialBattle(seed = 17) {
  return {version: 1, seed, day: 0, supplier: 8,
    shops: [0, 1].map(id => ({id, cash: 36, price: 2, wage: 2, workers: [id * 4, id * 4 + 1, id * 4 + 2, id * 4 + 3], fast: false, small: false, bread: [], debt: 0})),
    people: Array.from({length: 10}, (_, id) => ({id, cash: id < 8 ? 5 : 0})), history: []};
}
export const money = s => s.supplier + s.shops.reduce((v, f) => v + f.cash, 0) + s.people.reduce((v, p) => v + p.cash, 0);
export const capacity = f => f.small ? 6 : f.fast ? 12 : Math.floor(f.workers.length * 1.5);
export function moves(s) {
  const f = s.shops[0];
  return [
    {id: 'price', name: f.price === 2 ? '降价抢客' : '恢复原价', icon: 'tag', hint: `面包 ${f.price} → ${f.price === 2 ? 1 : 2} 金币`, detail: f.price === 2 ? '同样的面包，客人先买便宜的。每个少收一块。' : '每个多收一块。隔壁仍便宜，客人可能转身就走。'},
    {id: 'oven', name: !f.fast ? '换快炉' : f.small ? '全速开炉' : '少做一点', icon: 'oven', hint: !f.fast ? '花 8 金币 · 每天可做 12 个' : f.small ? '每天做 12 个' : '每天做 6 个 · 工资照付', detail: !f.fast ? '产量上去了。有没有更多人买，是另一回事。' : f.small ? '恢复产量，也恢复原料开支。' : '先省原料、消化旧货。人留下，工资照付。'},
    {id: 'labor', name: f.wage === 2 ? '压低工资' : f.workers.length === 4 ? '裁掉两人' : '招回加薪', icon: 'people', hint: f.wage === 2 ? '每人工资 2 → 1' : f.workers.length === 4 ? '4 人 → 2 人' : '招回原来的两人 · 工资恢复 2', detail: f.wage === 2 ? '今天少付工资。员工每天还是要吃面包。' : f.workers.length === 4 ? '省下两份工资。离开的员工会先花自己的积蓄。' : '四个人重新有工资。店里要负担四份开支。'},
    {id: 'hold', name: '照常营业', icon: 'bread', hint: '维持今天的安排', detail: '价格、工资、人手和产量都不改，开一天看看。'},
  ];
}
export function rivalMove(s) {
  if (s.day === 0) return {name: '降薪、降价', line: '“工资少一块，面包也少一块！”'};
  if (s.day === 1) return {name: '换快炉', line: '“你慢慢烤，我先把客人接了。”'};
  if (s.day === 2) return {name: '裁掉两人', line: '“有机器了，两个人就够了！”'};
  return s.shops[1].bread.length >= 18 ? {name: '减少开炉', line: '“先把架子上的卖掉。”'} : {name: '继续低价', line: '“一块一个，还跟不跟？”'};
}
function plan(s, action) {
  const f = structuredClone(s.shops[0]);
  if (action === 'price') f.price = f.price === 1 ? 2 : 1;
  if (action === 'oven') {if (f.fast) f.small = !f.small; else f.fast = true;}
  if (action === 'labor') {
    if (f.wage === 2) f.wage = 1;
    else if (f.workers.length === 4) f.workers = [0, 1];
    else {f.workers = [0, 1, 2, 3]; f.wage = 2;}
  }
  return f;
}
export function moveIssue(s, action) {
  if (action !== 'oven' || s.shops[0].fast) return '';
  const f = plan(s, action), cost = 8 + f.workers.length * f.wage + Math.ceil(capacity(f) / 4) + f.debt;
  return f.cash < cost ? `换炉后还要发薪、买原料，共需 ${cost} 金币。` : '';
}
function random(s, id) {let n = (s.seed + s.day * 104729 + id * 7919) >>> 0; n ^= n << 13; n ^= n >>> 17; n ^= n << 5; return (n >>> 0) / 4294967296;}
export function round(input, action) {
  if (!ACTIONS.includes(action) || input.day >= DAYS || moveIssue(input, action)) throw new Error('Unavailable move');
  const s = structuredClone(input), r = {day: ++s.day, action, move: moves(input).find(m => m.id === action).name, rival: rivalMove(input).name, receipts: [], made: [0, 0], sold: [0, 0], wages: [0, 0], spoiled: [0, 0], stopped: [false, false], fired: [], visits: [], before: input.shops.map(f => f.cash)};
  const purse = key => key === 'supplier' ? {get cash(){return s.supplier;}, set cash(v){s.supplier = v;}} : key[0] === 'f' ? s.shops[+key[1]] : s.people[+key.slice(1)];
  const pay = (from, to, amount, reason) => {if (!Number.isInteger(amount) || amount < 0 || purse(from).cash < amount) throw new Error('Unfunded payment'); if (!amount) return; purse(from).cash -= amount; purse(to).cash += amount; r.receipts.push({from, to, amount, reason});};
  const plans = [plan(input, action), structuredClone(s.shops[1])];
  plans[1].price = 1; plans[1].wage = 1;
  if (s.day >= 2) plans[1].fast = true;
  if (s.day >= 3) plans[1].workers = [4, 5];
  plans[1].small = input.shops[1].bread.length >= 18;
  for (const f of s.shops) {
    const id = f.id, p = plans[id], fresh = f.bread.filter(b => s.day - b.day < 2);
    r.spoiled[id] = f.bread.length - fresh.length; f.bread = fresh; f.price = p.price;
    const output = capacity(p), upgrade = p.fast && !f.fast ? 8 : 0;
    if (f.cash < upgrade + p.workers.length * p.wage + Math.ceil(output / 4) + f.debt) {r.stopped[id] = true; continue;}
    pay('f' + id, 'supplier', f.debt, '补付保管'); f.debt = 0;
    pay('f' + id, 'supplier', upgrade, '购买快炉');
    r.fired.push(...f.workers.filter(person => !p.workers.includes(person)));
    Object.assign(f, {fast: p.fast, small: p.small, wage: p.wage, workers: p.workers});
    for (const person of f.workers) {pay('f' + id, 'p' + person, f.wage, '工资'); r.wages[id] += f.wage;}
    pay('f' + id, 'supplier', Math.ceil(output / 4), '原料');
    r.made[id] = output;
    for (let j = 0; j < output; j++) f.bread.push({id: `${s.day}:${id}:${j}`, day: s.day});
    pay('f' + id, 'p' + (8 + id), Math.min(2, f.cash), '老板生活费');
  }
  // Eight workers, two owners and the supplier: eleven finite buyers.
  const customers = [...s.people.map(p => p.id), 10].sort((a, b) => random(s, a) - random(s, b));
  for (const id of customers) {
    const key = id === 10 ? 'supplier' : 'p' + id, cash = purse(key).cash;
    const preference = random({...s, seed: s.seed + 101}, id) < .5 ? 0 : 1;
    const available = s.shops.filter(f => f.bread.length).sort((a, b) => a.price - b.price || (a.id === preference ? -1 : 1));
    const seller = available.find(f => f.price <= cash);
    if (seller) {const loaf = seller.bread.shift(); pay(key, 'f' + seller.id, seller.price, '买面包'); r.sold[seller.id]++; r.visits.push({id, shop: seller.id, bought: true, bread: loaf.id});}
    else r.visits.push({id, shop: available[0]?.id ?? preference, bought: false, reason: available.length ? '钱不够' : '卖完了'});
  }
  for (const f of s.shops) {const due = Math.ceil(f.bread.length / 6), paid = Math.min(f.cash, due); pay('f' + f.id, 'supplier', paid, '保管'); f.debt += due - paid;}
  r.after = s.shops.map(f => f.cash); r.stock = s.shops.map(f => f.bread.length);
  r.poor = r.visits.filter(v => v.reason === '钱不够').length;
  s.history.push(r); assertBattle(s); return s;
}
export function assertBattle(s) {
  if (money(s) !== 120 || s.history.length !== s.day) throw new Error('Invalid street accounts');
  for (const p of [...s.shops, ...s.people, {cash: s.supplier}]) if (!Number.isInteger(p.cash) || p.cash < 0) throw new Error('Invalid wallet');
  const ids = s.shops.flatMap(f => f.bread.map(b => b.id)); if (new Set(ids).size !== ids.length) throw new Error('Duplicate loaf');
  return s;
}
export function replay(actions, seed = 17) {return actions.reduce((s, a) => round(s, a), initialBattle(seed));}
export function restoreBattle(s) {try {if (s?.version !== 1 || !Number.isInteger(s.seed) || s.day > DAYS) return null; const valid = replay(s.history.map(h => h.action), s.seed); return JSON.stringify(valid) === JSON.stringify(s) ? valid : null;} catch {return null;}}
