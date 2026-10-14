import { factoryAccount } from './factory-model.ts';

/** M1 teaching scenarios: not inherited from the prologue's allocation percentages. */
export const MACHINE_STORAGE_KEY = 'technology-dividend:machine-experiment:v1';
export const PREDICTION_QUESTIONS = [
  { id: 'products', question: '换了新机器，东西会做得更多吗？', choices: [{ value: 'more', label: '会更多' }, { value: 'same', label: '差不多' }] },
  { id: 'wages', question: '那，工资也会跟着涨吗？', choices: [{ value: 'more', label: '会跟着涨' }, { value: 'same', label: '不一定' }] },
  { id: 'hours', question: '能早点下班吗？', choices: [{ value: 'less', label: '能早些走' }, { value: 'same', label: '不一定' }] },
] as const;
export type PredictionId = typeof PREDICTION_QUESTIONS[number]['id'];
export type Prediction = 'more' | 'same' | 'less';
export type Contract = 'unchanged' | 'pay' | 'time';
export type MachineState = {
  version: 1;
  phase: 'quote' | 'predict' | 'ready' | 'result' | 'compare';
  questionIndex: number;
  predictions: Partial<Record<PredictionId, Prediction>>;
  contract: Contract;
};
export const initialMachine = (): MachineState => ({ version: 1, phase: 'quote', questionIndex: 0, predictions: {}, contract: 'unchanged' });
export type MachineAction =
  | { type: 'RESTORE'; snapshot: unknown }
  | { type: 'BEGIN' }
  | { type: 'PREDICT'; questionIndex: number; value: Prediction }
  | { type: 'RUN' }
  | { type: 'COMPARE' }
  | { type: 'CONTRACT'; contract: Contract }
  | { type: 'RESTART' };
export function machineReducer(s: MachineState, a: MachineAction): MachineState {
  switch (a.type) {
    case 'RESTORE': return restoreMachine(a.snapshot);
    case 'BEGIN': return s.phase === 'quote' ? { ...s, phase: 'predict' } : s;
    case 'PREDICT': {
      const q = PREDICTION_QUESTIONS[s.questionIndex];
      if (s.phase !== 'predict' || a.questionIndex !== s.questionIndex
        || !q.choices.some(c => c.value === a.value)) return s;
      return { ...s, predictions: { ...s.predictions, [q.id]: a.value },
        questionIndex: Math.min(2, s.questionIndex + 1), phase: s.questionIndex === 2 ? 'ready' : 'predict' };
    }
    case 'RUN': return s.phase === 'ready' ? { ...s, phase: 'result' } : s;
    case 'COMPARE': return s.phase === 'result' ? { ...s, phase: 'compare' } : s;
    case 'CONTRACT': return s.phase === 'compare' && ['unchanged', 'pay', 'time'].includes(a.contract)
      ? { ...s, contract: a.contract } : s;
    case 'RESTART': return initialMachine();
  }
}
export const OLD_MACHINE = factoryAccount();
export function machineAccount(s: MachineState) {
  if (['quote', 'predict', 'ready'].includes(s.phase)) return OLD_MACHINE;
  return factoryAccount({ technology: true,
    wageEach: s.phase === 'compare' && s.contract === 'pay' ? 6 : 4,
    hours: s.phase === 'compare' && s.contract === 'time' ? 4 : 8 });
}
export function restoreMachine(v: unknown): MachineState {
  try {
    const s = typeof v === 'string' ? JSON.parse(v) : v;
    if (!s || s.version !== 1 || !['quote', 'predict', 'ready', 'result', 'compare'].includes(s.phase)
      || !Number.isInteger(s.questionIndex) || s.questionIndex < 0 || s.questionIndex > 2
      || !['unchanged', 'pay', 'time'].includes(s.contract) || !s.predictions || typeof s.predictions !== 'object') return initialMachine();
    const p: MachineState['predictions'] = {};
    for (const q of PREDICTION_QUESTIONS) if (s.predictions[q.id] !== undefined) {
      if (!q.choices.some(c => c.value === s.predictions[q.id])) return initialMachine();
      p[q.id] = s.predictions[q.id];
    }
    const expected = s.phase === 'quote' ? 0 : s.phase === 'predict' ? s.questionIndex : 3;
    if (Object.keys(p).length !== expected || PREDICTION_QUESTIONS.slice(0, expected).some(q => !p[q.id])
      || (s.phase === 'quote' && s.questionIndex !== 0)
      || (['ready', 'result', 'compare'].includes(s.phase) && s.questionIndex !== 2)
      || (s.phase !== 'compare' && s.contract !== 'unchanged')) return initialMachine();
    return { ...initialMachine(), phase: s.phase, questionIndex: s.questionIndex, predictions: p, contract: s.contract };
  } catch { return initialMachine(); }
}
