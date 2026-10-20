import { marketAccount, RELIEF_ROUTES, type MarketMode, type ReliefRoute } from './crisis-model.ts';
import { createStreetCampaign as createStreetGame, restoreStreetGame, streetReducer, type StreetGame, type StreetAction } from './street-game.ts';
import {RELIEF_PHASES, type ReliefPhase} from './relief-experiment.ts';
import {initialAutomation,automationReducer,restoreAutomation,AUTOMATION_BRANCHES,type AutomationState,type AutomationAction,type AutomationBranch} from './automation-experiment.ts';
import {initialNeeds,needsReducer,restoreNeeds,NEEDS_BRANCHES,type NeedsState,type NeedsAction,type NeedsBranch} from './needs-experiment.ts';
import {initialOwnership,ownershipReducer,restoreOwnership,OWNERSHIP_BRANCHES,type OwnershipState,type OwnershipAction,type OwnershipBranch} from './ownership-experiment.ts';
import {initialRules,rulesReducer,restoreRules,RULE_BRANCHES,type RuleState,type RuleAction,type RuleBranch} from './market-rules-experiment.ts';
import {initialRemedy,remedyReducer,restoreRemedy,remedyAccounts,type RemedyLab,type RemedyAction} from './remedy-lab.ts';
import {initialAssumptionDesk,assumptionDeskReducer,restoreAssumptionDesk,type AssumptionDesk,type AssumptionDeskAction} from './assumption-desk.ts';
import {restoreBattleSnapshot,type BattleSnapshot} from './battle-session.ts';

/** Teaching scene state only. Allocation plans remain separate from the conditional market models. */
export const PROLOGUE_VERSION = '20261002-boss-allocation';
export const PROLOGUE_STORAGE_KEY = 'technology-dividend:prologue:v1';
export const FIRMS = [
  { id: 'A', name: '汽车公司', product: '汽车', color: '#c65a48', hat: 13 },
  { id: 'B', name: '手机公司', product: '手机', color: '#467eac', hat: 15 },
  { id: 'C', name: '鞋厂', product: '鞋', color: '#a97b39', hat: 17 },
  { id: 'D', name: '面包公司', product: '面包', color: '#588675', hat: 12 },
] as const;
export type FirmId = typeof FIRMS[number]['id'];
export type Scene = 'opening' | 'bakery' | 'bakery-upgrade' | 'bakery-expansion' | 'street' | 'street-economy' | 'street-summary' | 'allocation' | 'market' | 'network' | 'concept' | 'ending' | 'relief' | 'epilogue' | 'assumptions' | 'technology' | 'needs-technology' | 'ownership-technology' | 'market-rules' | 'routes';
export const GAME_TITLE = '饥馑的盛宴';
export const PROLOGUE_TITLE = '序章：厨房内外';
// Chapter navigation is separate from the acts within each chapter.
export const STORY_CHAPTERS = [
  { id: 'prologue', title: PROLOGUE_TITLE },
  { id: 'automation', title: '第一章：谁还领钱？' },
  { id: 'needs', title: '第二章：需要很多，谁来买？' },
  { id: 'ownership', title: '第三章：钱分了，谁说了算？' },
  { id: 'rules', title: '第四章：改改买卖的规矩' },
  // Keep the old experiment and its save ID, but outside the four IF chapters.
  { id: 'machine', title: '附录：两人小工厂' },
] as const;
export type ChapterId = typeof STORY_CHAPTERS[number]['id'];
const researchScenes: readonly Scene[] = ['assumptions','technology','needs-technology','ownership-technology','market-rules'];
export const PROLOGUE_STAGES = [
  { label: '首页', scene: 'opening' },
  { label: '第一幕·更大的烤炉', scene: 'bakery' },
  { label: '第二幕·面包店对决', scene: 'street' },
  { label: '第三幕·有限的钱包', scene: 'street-economy' },
  { label: '第四幕·三条出路', scene: 'relief' },
  { label: '序章·尾声', scene: 'epilogue' },
  { label: '如果换个条件？', scene: 'assumptions' },
] as const;
export const BAKERY_COMPLAINTS = [
  '产量多咗，粮少咗，你部机系榨我血唔系揉面',
  '面包越做越多，钱越拿越少，你当我是发面？越胀越小！',
  '刮皮刮到机器头上，侬当我是零件啊？',
  '机器转得快，你手抠得紧，合着就我一个人吃亏？',
  '小气巴拉，连炉子的电都想从我工资里出！',
  '以前搓面靠我对手，依家靠部机，你就当我手系多余的？工资都多余？',
] as const;
export const RELATIONS = ['customers', 'cooperation', 'ownership', 'control', 'payment'] as const;
export const BAKERY_BOSS_DEFLECTIONS = ['要为长远发展考虑', '格局小了', '你要顾全大局'] as const;
export const BAKERY_BOSS_REFUSALS = ['不要乱了规矩', '你要当合伙人？', '你不是我的兄弟', '房租水电折旧，哪个不要钱'] as const;
// Scripted character reactions, not estimated economic probabilities.
export const BAKERY_REACTION_PROBABILITY = { ordinary: .45, heated: .9 } as const;
export type Relation = typeof RELATIONS[number];
export type Entrance = 'individual' | 'enterprise';
export type Plan = { laborShare: number; retainedShare: number };
/** Each if-line owns its history; revisiting a sibling is not a new experiment. */
export type BranchArchive = Partial<Record<AutomationBranch,AutomationState>>
  & Partial<Record<NeedsBranch,NeedsState>>
  & Partial<Record<OwnershipBranch,OwnershipState>>
  & Partial<Record<RuleBranch,RuleState>>;
export type PrologueState = {
  version: typeof PROLOGUE_VERSION;
  scene: Scene;
  activeFirmId: FirmId;
  allocationPlans: Record<FirmId, Plan>;
  adjustedFirmIds: FirmId[];
  relationFocus: Relation;
  customerFirmId: FirmId;
  definitionShown: boolean;
  endingPairIndex: number;
  endingViewMode: 'pairs' | 'all';
  prologueStatus: 'notStarted' | 'observed' | 'demo' | 'skipped';
  demoActive: boolean;
  demoLaborShare: 20 | 80;
  workPaused: boolean;
  marketMode: MarketMode;
  marketCuts: 0 | 1 | 2;
  marketDemoShare: 20 | 80 | null;
  reliefRoute: ReliefRoute | null;
  reliefSustained: boolean;
  reliefVisited: ReliefRoute[];
  reliefPhase: ReliefPhase;
  /** bit 1: constrained outcome observed; bit 2: changed condition observed. */
  reliefTested: number;
  reliefCompleted: ReliefRoute[];
  /** Explicitly choosing the shorter story path never completes unplayed remedies. */
  reliefSampled: boolean;
  /** Narrative reading is separate from old remedy experiments. */
  reliefReadingFinished: boolean;
  remedyLabs: Partial<Record<ReliefRoute,RemedyLab>>;
  epilogueBeat: 0 | 1 | 2 | 3;
  assumptionDesk: AssumptionDesk;
  /** Explicit chapter browsing is not completion of the preceding story. */
  chapterBrowsing: boolean;
  technology: AutomationState | null;
  needsTechnology: NeedsState | null;
  ownershipTechnology: OwnershipState | null;
  marketRules: RuleState | null;
  branchArchive: BranchArchive;
  entrance: Entrance | null;
  bakeryWage: number;
  bakeryComplaintIndex: number | null;
  bakeryCommitted: boolean;
  bakeryBoundary: 'low' | 'high' | null;
  bakeryBoundarySerial: number;
  bakeryBossQuoteIndex: number | null;
  bakeryUpperLocked: boolean;
  bakeryPreviousWage: number | null;
  street: StreetGame | null;
  battle: BattleSnapshot | null;
  streetMode: 'battle' | 'sandbox';
};
export const ENDING_PAIRS = [
  { daughter: '爸爸，肚子饿了，为什么不吃面包？', father: '家里没钱买面包。' },
  { daughter: '为什么没钱？', father: '我失业了，没了这份工资。' },
  { daughter: '为什么失业？', father: '店里说面包太多，卖不出去，停了我的活。' },
] as const;
export const BASIC_CONTRADICTION = '生产社会化与生产资料资本主义私人占有之间的矛盾。';
export function initialPrologue(): PrologueState {
  return {
    version: PROLOGUE_VERSION, scene: 'opening', activeFirmId: 'A',
    allocationPlans: { A: plan(50), B: plan(50), C: plan(50), D: plan(50) },
    adjustedFirmIds: [], relationFocus: 'customers', customerFirmId: 'B',
    definitionShown: false, endingPairIndex: 0, endingViewMode: 'pairs',
    prologueStatus: 'notStarted', demoActive: false, demoLaborShare: 20, workPaused: false, entrance: null,
    marketMode: 'single', marketCuts: 0, marketDemoShare: null,
    reliefRoute: null, reliefSustained: false, reliefVisited: [],
    reliefPhase:'ready',reliefTested:0,reliefCompleted:[],reliefSampled:false,reliefReadingFinished:false,remedyLabs:{},epilogueBeat:0,assumptionDesk:initialAssumptionDesk(),chapterBrowsing:false,technology:null,needsTechnology:null,ownershipTechnology:null,marketRules:null,branchArchive:{},
    bakeryWage: 5, bakeryComplaintIndex: null, bakeryCommitted: false,
    bakeryBoundary: null, bakeryBoundarySerial: 0, bakeryBossQuoteIndex: null,
    bakeryUpperLocked: false, bakeryPreviousWage: null, street: null, battle: null, streetMode:'battle',
  };
}
const firmIds: readonly string[] = FIRMS.map(f => f.id);
function rememberBranches(s:PrologueState):BranchArchive{
  const archive={...s.branchArchive};
  if(s.technology)archive[s.technology.branch]=s.technology;
  if(s.needsTechnology)archive[s.needsTechnology.branch]=s.needsTechnology;
  if(s.ownershipTechnology)archive[s.ownershipTechnology.branch]=s.ownershipTechnology;
  if(s.marketRules)archive[s.marketRules.branch]=s.marketRules;
  return archive;
}
function restoreBranchArchive(v:unknown):BranchArchive|null{
  if(!v||typeof v!=='object'||Array.isArray(v))return null;
  const archive:BranchArchive={};
  for(const [key,value] of Object.entries(v)){
    if(AUTOMATION_BRANCHES.includes(key as AutomationBranch)){
      const state=restoreAutomation(value);if(!state||state.branch!==key)return null;
      archive[key as AutomationBranch]=state;
    }else if(NEEDS_BRANCHES.includes(key as NeedsBranch)){
      const state=restoreNeeds(value);if(!state||state.branch!==key)return null;
      archive[key as NeedsBranch]=state;
    }else if(OWNERSHIP_BRANCHES.includes(key as OwnershipBranch)){
      const state=restoreOwnership(value);if(!state||state.branch!==key)return null;
      archive[key as OwnershipBranch]=state;
    }else if(RULE_BRANCHES.includes(key as RuleBranch)){
      const state=restoreRules(value);if(!state||state.branch!==key)return null;
      archive[key as RuleBranch]=state;
    }else return null;
  }
  return archive;
}
export function plan(laborShare: number): Plan {
  if (!Number.isInteger(laborShare) || laborShare < 0 || laborShare > 100 || laborShare % 10 !== 0)
    throw new RangeError('Share must be 0–100 in steps of 10 percentage points');
  return { laborShare, retainedShare: 100 - laborShare };
}
export type Mood = -2 | -1 | 0 | 1 | 2;
export function expressionBand(share: number): Mood {
  plan(share);
  return share <= 20 ? -2 : share <= 40 ? -1 : share === 50 ? 0 : share <= 70 ? 1 : 2;
}
export function expressions(share: number) {
  const labor = expressionBand(share);
  return { labor, owner: (labor === 0 ? 0 : -labor) as Mood };
}
export type PrologueAction =
  | { type: 'SAVE_BATTLE'; snapshot: unknown }
  | { type: 'FINISH_BATTLE' }
  | { type: 'FINISH_STREET_ECONOMY' }
  | { type: 'OPEN_STREET_SANDBOX' }
  | { type: 'BACK_BATTLE' }
  | { type: 'STREET'; action: StreetAction }
  | { type: 'RESTORE'; snapshot: unknown }
  | { type: 'START' }
  | { type: 'CONTINUE_BAKERY' }
  | { type: 'SET_BAKERY_WAGE'; wage: number; complaintIndex?: number | null; bossQuoteIndex?: number }
  | { type: 'CONFIRM_BAKERY_WAGE' }
  | { type: 'RETRY_BAKERY_WAGE' }
  | { type: 'OPEN_ALLOCATION_COMPARE' }
  | { type: 'OPEN_BAKERY_EXPANSION' }
  | { type: 'EXPANSION_CONTINUE' }
  | { type: 'SHOW_HOME' }
  | { type: 'JUMP_STAGE'; stage: number }
  | { type: 'NAVIGATE_CHAPTER'; chapter: Exclude<ChapterId, 'machine'> }
  | { type: 'ADJUST_SHARE'; delta: -10 | 10 }
  | { type: 'SELECT_FIRM'; firmId: FirmId }
  | { type: 'SHOW_MARKET' }
  | { type: 'OTHER_FIRMS_COPY' }
  | { type: 'MARKET_CUT' }
  | { type: 'MARKET_TRY'; laborShare: 20 | 80 }
  | { type: 'MARKET_RESTORE' }
  | { type: 'MARKET_CONTINUE' }
  | { type: 'SHOW_NETWORK' }
  | { type: 'SHOW_RELATION'; relation: Relation }
  | { type: 'SELECT_CUSTOMER'; firmId: FirmId }
  | { type: 'BACK_TO_ALLOCATION' }
  | { type: 'SHOW_CONCEPT' }
  | { type: 'SHOW_ENDING' }
  | { type: 'SHOW_STREET_SUMMARY' }
  | { type: 'NEXT_PAIR'; expectedIndex: number }
  | { type: 'SHOW_ALL' }
  | { type: 'SHOW_RELIEF' }
  | { type: 'CHOOSE_RELIEF'; route: ReliefRoute }
  | { type: 'REMEDY'; action:RemedyAction }
  | { type: 'RELIEF_CONDITION'; sustained: boolean }
  | { type: 'RELIEF_ADVANCE'; expectedPhase: ReliefPhase }
  | { type: 'RELIEF_COMPLETE' }
  | { type: 'RELIEF_WRAP' }
  | { type: 'RELIEF_MENU' }
  | { type: 'FINISH_RELIEF' }
  | { type: 'FINISH_RELIEF_SAMPLE' }
  | { type: 'FINISH_RELIEF_READING' }
  | { type: 'EPILOGUE_NEXT'; expectedBeat: number }
  | { type: 'EPILOGUE_REVEAL' }
  | { type: 'SHOW_ASSUMPTIONS' }
  | { type: 'ASSUMPTION_DESK'; action:AssumptionDeskAction }
  | { type: 'OPEN_TECHNOLOGY'; branch:AutomationBranch }
  | { type: 'TECHNOLOGY'; action:AutomationAction }
  | { type: 'OPEN_NEEDS'; branch:NeedsBranch }
  | { type: 'NEEDS'; action:NeedsAction }
  | { type: 'OPEN_OWNERSHIP'; branch:OwnershipBranch }
  | { type: 'OWNERSHIP'; action:OwnershipAction }
  | { type: 'OPEN_RULES'; branch:RuleBranch }
  | { type: 'RULES'; action:RuleAction }
  | { type: 'BACK_ASSUMPTIONS' }
  | { type: 'OPEN_RELATED'; branch: AutomationBranch | NeedsBranch | OwnershipBranch | RuleBranch }
  | { type: 'ENTER_ROUTES'; entrance: Entrance }
  | { type: 'FINISH_PROLOGUE' }
  | { type: 'SET_ENTRANCE'; entrance: Entrance }
  | { type: 'SKIP_PROLOGUE' }
  | { type: 'SHOW_DEMO'; laborShare?: 20 | 80 }
  | { type: 'TOGGLE_WORK' }
  | { type: 'LEAVE_DEMO' };
function sixFirmEconomy():StreetGame{
  const game=createStreetGame();
  delete game.campaign;delete game.tutorial;
  return {...game,phase:'manage'};
}
export function prologueReducer(s: PrologueState, action: PrologueAction): PrologueState {
  switch (action.type) {
    case 'OPEN_STREET_SANDBOX': {
      if(s.scene!=='street'||s.battle?.state.mode!=='done')return s;
      return {...s,scene:'street-economy',streetMode:'battle',street:s.street??sixFirmEconomy()};
    }
    case 'BACK_BATTLE': return s.scene==='street'&&s.streetMode==='sandbox'?{...s,streetMode:'battle'}:s;
    case 'SAVE_BATTLE': {
      if(s.scene!=='street')return s;
      const battle=restoreBattleSnapshot(action.snapshot);
      return battle?{...s,battle}:s;
    }
    case 'FINISH_BATTLE': {
      if(s.scene!=='street'||s.battle?.state.mode!=='done')return s;
      if(s.battle.state.externalOnly)return {...s,scene:'street-economy',streetMode:'battle',street:s.street??sixFirmEconomy()};
      return {...s,scene:'ending',streetMode:'battle',definitionShown:true,endingPairIndex:0,endingViewMode:'pairs'};
    }
    case 'FINISH_STREET_ECONOMY': return s.scene==='street-economy'&&s.street&&s.street.world.round>=2&&s.street.report&&!s.street.report.management&&['social','private','overproduction','limits'].includes(s.street.phase)
      ?{...s,scene:'ending',definitionShown:true,endingPairIndex:0,endingViewMode:'pairs'}:s;
    case 'RESTORE': return restorePrologue(action.snapshot);
    case 'STREET': return ['street','street-economy','street-summary'].includes(s.scene)&&action.action&&typeof action.action.type==='string'
      ? {...s,street:streetReducer(s.street??(s.scene==='street-economy'?sixFirmEconomy():createStreetGame()),action.action)}:s;
    case 'SHOW_HOME': return { ...s, scene: 'opening', chapterBrowsing:false };
    case 'NAVIGATE_CHAPTER': {
      // The menu is an independent entry point for classroom demonstrations.
      // Preserve actual results; never fabricate completed relief experiments.
      const next={...s,chapterBrowsing:true,demoActive:false,workPaused:false};
      switch(action.chapter){
        case 'prologue':return {...s,scene:'bakery',chapterBrowsing:false,demoActive:false,workPaused:false};
        case 'automation':return {...next,scene:'technology',technology:s.technology??initialAutomation('automation')};
        case 'needs':return {...next,scene:'needs-technology',needsTechnology:s.needsTechnology??initialNeeds('space')};
        case 'ownership':return {...next,scene:'ownership-technology',ownershipTechnology:s.ownershipTechnology??initialOwnership('concentration')};
        case 'rules':return {...next,scene:'market-rules',marketRules:s.marketRules??initialRules('policy')};
        default:return s;
      }
    }
    case 'JUMP_STAGE': {
      if (!Number.isInteger(action.stage) || action.stage < 0 || action.stage >= PROLOGUE_STAGES.length) return s;
      const next = { ...s, scene: PROLOGUE_STAGES[action.stage].scene, demoActive: false, workPaused: false,
        chapterBrowsing:PROLOGUE_STAGES[action.stage].scene==='assumptions'&&s.chapterBrowsing };
      if(next.scene==='epilogue'&&!reliefEndingAccessible(s)||next.scene==='assumptions'&&!researchAccessible(s))return s;
      // Chapter browsing resumes the second act; only an explicit replay or
      // advancing again from the first-act expansion starts a fresh battle.
      if(next.scene==='street')return {...next,battle:s.battle};
      if(next.scene==='street-economy')return {...next,street:s.street??sixFirmEconomy()};
      if(next.scene==='street-summary')return {...next,definitionShown:true};
      if (next.scene === 'relief') return { ...next, definitionShown: true, endingViewMode: 'all',
        reliefRoute: null, reliefSustained: false,reliefPhase:'ready',reliefTested:0 };
      return next;
    }
    case 'START': return s.scene === 'opening' ? { ...s, scene: 'bakery' } : s;
    case 'CONTINUE_BAKERY': return s.scene === 'bakery' ? { ...s, scene: 'bakery-upgrade' } : s;
    case 'SET_BAKERY_WAGE': {
      if(s.scene!=='bakery-upgrade'||s.bakeryCommitted||!Number.isInteger(action.wage)||action.wage<0||action.wage>15)return s;
      const complaint=action.complaintIndex;
      if(complaint!=null&&(!Number.isInteger(complaint)||complaint<0||complaint>=BAKERY_COMPLAINTS.length))return s;
      if(action.wage<3||action.wage>7){
        const low=action.wage<3, quote=action.bossQuoteIndex;
        if(typeof quote!=='number'||!Number.isInteger(quote)||quote<0||quote>=(low?BAKERY_BOSS_DEFLECTIONS:BAKERY_BOSS_REFUSALS).length)return s;
        return {...s,bakeryWage:low?3:7,bakeryBoundary:low?'low':'high',
          bakeryBoundarySerial:s.bakeryBoundarySerial+1,bakeryBossQuoteIndex:quote,
          bakeryComplaintIndex:low?(complaint??null):null,bakeryUpperLocked:false};
      }
      if(action.wage===s.bakeryWage)return s;
      return {...s,bakeryWage:action.wage,bakeryComplaintIndex:action.wage<5?(complaint??null):null,
        bakeryBoundary:null,bakeryBossQuoteIndex:null};
    }
    case 'CONFIRM_BAKERY_WAGE': return s.scene==='bakery-upgrade'?{...s,bakeryCommitted:true}:s;
    case 'RETRY_BAKERY_WAGE': return s.scene==='bakery-upgrade'?{...s,bakeryCommitted:false}:s;
    case 'OPEN_ALLOCATION_COMPARE': return s.scene==='bakery-upgrade'&&s.bakeryCommitted?{...s,scene:'allocation'}:s;
    case 'OPEN_BAKERY_EXPANSION': return s.scene==='bakery-upgrade'&&s.bakeryCommitted?{...s,scene:'bakery-expansion'}:s;
    case 'EXPANSION_CONTINUE': return s.scene==='bakery-expansion'?{...s,scene:'street',battle:null,streetMode:'battle'}:s;
    case 'ADJUST_SHARE': {
      if (s.scene !== 'allocation' || ![-10, 10].includes(action.delta)) return s;
      const value = s.allocationPlans[s.activeFirmId].laborShare + action.delta;
      if (value < 0 || value > 100) return s;
      return { ...s, allocationPlans: { ...s.allocationPlans, [s.activeFirmId]: plan(value) },
        adjustedFirmIds: [...new Set([...s.adjustedFirmIds, s.activeFirmId])] };
    }
    case 'SELECT_FIRM': return s.scene === 'allocation' && firmIds.includes(action.firmId)
      ? { ...s, activeFirmId: action.firmId } : s;
    case 'SHOW_MARKET': return s.scene === 'allocation'
      ? { ...s, scene: 'market', marketMode: 'single', marketCuts: 0, marketDemoShare: null,
        definitionShown: false, demoActive: false, workPaused: false } : s;
    case 'OTHER_FIRMS_COPY': return s.scene === 'market' && s.marketMode === 'single'
      ? { ...s, marketMode: 'all' } : s;
    case 'MARKET_CUT': {
      if (s.scene !== 'market' || s.marketMode !== 'all' || s.marketCuts === 2) return s;
      const share = s.marketDemoShare ?? s.allocationPlans[s.activeFirmId].laborShare;
      if (marketAccount(share, s.marketMode, s.marketCuts).unsold <= 0) return s;
      return { ...s, marketCuts: (s.marketCuts + 1) as 1 | 2 };
    }
    case 'MARKET_TRY': return s.scene === 'market' && s.marketMode === 'all' && [20, 80].includes(action.laborShare)
      ? { ...s, marketCuts: 0, marketDemoShare: action.laborShare } : s;
    case 'MARKET_RESTORE': return s.scene === 'market' && s.marketMode === 'all'
      ? { ...s, marketCuts: 0, marketDemoShare: null } : s;
    case 'MARKET_CONTINUE': return s.scene === 'market'
      ? { ...s, scene: 'network', relationFocus: 'cooperation', customerFirmId: s.activeFirmId,
        definitionShown: false, demoActive: false, workPaused: false } : s;
    case 'SHOW_NETWORK': return s.scene === 'allocation'
      ? { ...s, scene: 'network', relationFocus: 'customers', customerFirmId: s.activeFirmId, demoActive: false } : s;
    case 'SHOW_RELATION': return s.scene === 'network' && RELATIONS.includes(action.relation)
      ? { ...s, relationFocus: action.relation, demoActive: false, workPaused: false } : s;
    case 'TOGGLE_WORK': return s.scene === 'network' && s.relationFocus === 'cooperation'
      ? { ...s, workPaused: !s.workPaused } : s;
    case 'SELECT_CUSTOMER': return s.scene === 'network' && firmIds.includes(action.firmId)
      ? { ...s, customerFirmId: action.firmId } : s;
    case 'BACK_TO_ALLOCATION': return s.scene !== 'opening'
      ? { ...s, scene: 'allocation', demoActive: false, marketDemoShare: null, marketCuts: 0 } : s;
    case 'SHOW_CONCEPT': return s.scene === 'network'
      ? { ...s, scene: 'concept', demoActive: false, definitionShown: true } : s;
    case 'SHOW_ENDING': return s.scene === 'concept'||s.scene==='street'&&(s.street?.phase==='limits'||s.street?.campaign?.beat==='closed')
      ? { ...s, scene: 'ending', definitionShown:true, endingPairIndex: 0, endingViewMode: 'pairs' } : s;
    case 'SHOW_STREET_SUMMARY': return s.scene==='ending'&&(s.endingPairIndex===2||s.endingViewMode==='all')?{...s,scene:'street-summary',definitionShown:true}:s;
    case 'NEXT_PAIR': return s.scene === 'ending' && s.endingViewMode === 'pairs'
      && action.expectedIndex === s.endingPairIndex && s.endingPairIndex < 2
      ? { ...s, endingPairIndex: s.endingPairIndex + 1 } : s;
    case 'SHOW_ALL': return s.scene === 'ending' ? { ...s, endingViewMode: 'all' } : s;
    case 'SHOW_RELIEF': return s.scene==='street-summary'||s.scene === 'ending'
      && (s.endingPairIndex === 2 || s.endingViewMode === 'all')
      ? { ...s, scene: 'relief',endingViewMode:'all',reliefRoute: null, reliefSustained: false,reliefPhase:'ready',reliefTested:0 } : s;
    case 'CHOOSE_RELIEF': {
      if(s.scene!=='relief'||!RELIEF_ROUTES.includes(action.route))return s;
      const lab=s.remedyLabs[action.route]??initialRemedy(action.route,true),accounts=remedyAccounts(lab),round=lab.history.length;
      return {...s,reliefRoute:action.route,reliefSustained:accounts.display?.control.outlook==='supported',
        reliefPhase:lab.flow&&accounts.canContinue?'compare':round===0?'ready':round===1?'improved':accounts.comparisonSeen||accounts.responseSeen?'compare':'stress',
        reliefTested:lab.flow&&accounts.canContinue?3:round<2?0:accounts.comparisonSeen||accounts.responseSeen?3:1,
        remedyLabs:{...s.remedyLabs,[action.route]:lab},reliefVisited:[...new Set([...s.reliefVisited,action.route])]};
    }
    case 'REMEDY': {
      if(s.scene!=='relief'||!s.reliefRoute||!s.remedyLabs[s.reliefRoute]||!action.action)return s;
      const previous=s.remedyLabs[s.reliefRoute]!,lab=remedyReducer(previous,action.action);
      if(lab===previous)return s;
      const accounts=remedyAccounts(lab),round=lab.history.length;
      const restarted=['REPLAY','RESTART','OPEN_FLOW'].includes(action.action.type),reliefCompleted=restarted?s.reliefCompleted.filter(r=>r!==s.reliefRoute):s.reliefCompleted;
      const remedyLabs={...s.remedyLabs,[s.reliefRoute]:lab};
      return {...s,remedyLabs,reliefCompleted,
        reliefSampled:s.reliefSampled&&canSampleRelief({reliefCompleted,remedyLabs}),
        reliefPhase:lab.flow&&accounts.canContinue?'compare':round===0?'ready':round===1?'improved':accounts.comparisonSeen||accounts.responseSeen?'compare':'stress',
        reliefTested:lab.flow&&accounts.canContinue?3:round<2?0:accounts.comparisonSeen||accounts.responseSeen?3:1,reliefSustained:!lab.flow&&round===3&&accounts.display?.control.outlook==='supported'};
    }
    case 'RELIEF_ADVANCE': {
      if(s.scene!=='relief'||s.reliefRoute===null||action.expectedPhase!==s.reliefPhase)return s;
      if(s.reliefPhase==='ready')return {...s,reliefPhase:'improved'};
      if(s.reliefPhase==='improved')return {...s,reliefPhase:'stress',reliefTested:1};
      return s;
    }
    case 'RELIEF_CONDITION': return s.scene === 'relief' && s.reliefRoute !== null && ['stress','compare'].includes(s.reliefPhase)&&typeof action.sustained === 'boolean'
      ? { ...s, reliefSustained: action.sustained,reliefPhase:'compare',reliefTested:s.reliefTested|(action.sustained?2:1) } : s;
    case 'RELIEF_COMPLETE': return s.scene==='relief'&&s.reliefRoute!==null&&s.reliefPhase==='compare'&&s.reliefTested===3
      &&(!s.remedyLabs[s.reliefRoute]?.history.length||remedyAccounts(s.remedyLabs[s.reliefRoute]!).canContinue)
      ? {...s,reliefPhase:'done',reliefSustained:false,reliefCompleted:[...new Set([...s.reliefCompleted,s.reliefRoute])]}:s;
    case 'RELIEF_WRAP': {
      const finished=prologueReducer(s,{type:'RELIEF_COMPLETE'});
      return finished===s?s:prologueReducer(finished,{type:'RELIEF_MENU'});
    }
    case 'RELIEF_MENU': return s.scene === 'relief'
      ? { ...s, reliefRoute: null, reliefSustained: false,reliefPhase:'ready',reliefTested:0 } : s;
    case 'FINISH_RELIEF_READING': return s.scene==='relief'
      ? {...s,scene:'epilogue',reliefReadingFinished:true,reliefRoute:null,reliefSustained:false,reliefPhase:'ready',reliefTested:0,epilogueBeat:0,entrance:null,prologueStatus:'observed'}:s;
    case 'FINISH_RELIEF': return s.scene === 'relief' && s.reliefCompleted.length===3
      ? { ...s, scene: 'epilogue',reliefRoute:null,reliefSustained:false,reliefPhase:'ready',reliefTested:0,epilogueBeat:0,entrance: null, prologueStatus: 'observed' } : s;
    case 'FINISH_RELIEF_SAMPLE': return s.scene==='relief'&&s.reliefRoute===null&&canSampleRelief(s)
      ? {...s,scene:'epilogue',reliefSampled:true,reliefSustained:false,reliefPhase:'ready',reliefTested:0,epilogueBeat:0,entrance:null,prologueStatus:'observed'}:s;
    case 'EPILOGUE_NEXT': return s.scene==='epilogue'&&action.expectedBeat===s.epilogueBeat&&s.epilogueBeat<3?{...s,epilogueBeat:(s.epilogueBeat+1) as 1|2|3}:s;
    case 'EPILOGUE_REVEAL': return s.scene==='epilogue'?{...s,epilogueBeat:3}:s;
    case 'SHOW_ASSUMPTIONS': return s.scene==='epilogue'&&s.epilogueBeat===3?{...s,scene:'assumptions'}:s;
    case 'ASSUMPTION_DESK': {
      if(s.scene!=='assumptions'||!researchAccessible(s))return s;
      const assumptionDesk=assumptionDeskReducer(s.assumptionDesk,action.action);
      return assumptionDesk===s.assumptionDesk?s:{...s,assumptionDesk};
    }
    case 'OPEN_RELATED':{
      const current=s.scene==='technology'?s.technology:s.scene==='needs-technology'?s.needsTechnology:s.scene==='ownership-technology'?s.ownershipTechnology:s.scene==='market-rules'?s.marketRules:null;
      if(!researchAccessible(s)||current?.phase!=='conclusion')return s;
      const entry={...s,scene:'assumptions' as const};
      if(AUTOMATION_BRANCHES.includes(action.branch as AutomationBranch))return prologueReducer(entry,{type:'OPEN_TECHNOLOGY',branch:action.branch as AutomationBranch});
      if(NEEDS_BRANCHES.includes(action.branch as NeedsBranch))return prologueReducer(entry,{type:'OPEN_NEEDS',branch:action.branch as NeedsBranch});
      if(OWNERSHIP_BRANCHES.includes(action.branch as OwnershipBranch))return prologueReducer(entry,{type:'OPEN_OWNERSHIP',branch:action.branch as OwnershipBranch});
      if(RULE_BRANCHES.includes(action.branch as RuleBranch))return prologueReducer(entry,{type:'OPEN_RULES',branch:action.branch as RuleBranch});
      return s;
    }
    case 'OPEN_TECHNOLOGY':{
      if(!['assumptions','technology'].includes(s.scene)||!researchAccessible(s)||!AUTOMATION_BRANCHES.includes(action.branch))return s;
      const branchArchive=rememberBranches(s);
      return {...s,scene:'technology',branchArchive,technology:branchArchive[action.branch]??initialAutomation(action.branch)};
    }
    case 'TECHNOLOGY':return s.scene==='technology'&&s.technology?{...s,technology:automationReducer(s.technology,action.action)}:s;
    case 'OPEN_NEEDS':{
      if(!['assumptions','technology','needs-technology'].includes(s.scene)||!researchAccessible(s)||!NEEDS_BRANCHES.includes(action.branch))return s;
      const branchArchive=rememberBranches(s);
      return {...s,scene:'needs-technology',branchArchive,needsTechnology:branchArchive[action.branch]??initialNeeds(action.branch)};
    }
    case 'NEEDS':return s.scene==='needs-technology'&&s.needsTechnology?{...s,needsTechnology:needsReducer(s.needsTechnology,action.action)}:s;
    case 'OPEN_OWNERSHIP':{
      if(!['assumptions','technology','needs-technology','ownership-technology'].includes(s.scene)||!researchAccessible(s)||!OWNERSHIP_BRANCHES.includes(action.branch))return s;
      const branchArchive=rememberBranches(s);
      return {...s,scene:'ownership-technology',branchArchive,ownershipTechnology:branchArchive[action.branch]??initialOwnership(action.branch)};
    }
    case 'OWNERSHIP':return s.scene==='ownership-technology'&&s.ownershipTechnology?{...s,ownershipTechnology:ownershipReducer(s.ownershipTechnology,action.action)}:s;
    case 'OPEN_RULES':{
      if(!['assumptions','market-rules'].includes(s.scene)||!researchAccessible(s)||!RULE_BRANCHES.includes(action.branch))return s;
      const branchArchive=rememberBranches(s);
      return {...s,scene:'market-rules',branchArchive,marketRules:branchArchive[action.branch]??initialRules(action.branch)};
    }
    case 'RULES':return s.scene==='market-rules'&&s.marketRules?{...s,marketRules:rulesReducer(s.marketRules,action.action)}:s;
    case 'BACK_ASSUMPTIONS':return ['technology','needs-technology','ownership-technology','market-rules'].includes(s.scene)?{...s,scene:'assumptions'}:s;
    case 'ENTER_ROUTES': return s.scene === 'ending'
      && (s.endingPairIndex === 2 || s.endingViewMode === 'all')
      && ['individual', 'enterprise'].includes(action.entrance)
      ? { ...s, scene: 'routes', entrance: action.entrance, prologueStatus: 'observed' } : s;
    case 'FINISH_PROLOGUE': return s.scene === 'ending'
      && (s.endingPairIndex === 2 || s.endingViewMode === 'all')
      ? { ...s, scene: 'routes', entrance: null, prologueStatus: 'observed' } : s;
    case 'SKIP_PROLOGUE': return { ...s, scene: 'routes', demoActive: false, entrance: null,
      prologueStatus: s.prologueStatus === 'observed' ? 'observed' : 'skipped' };
    case 'SET_ENTRANCE': return s.scene === 'routes' && ['individual', 'enterprise'].includes(action.entrance)
      ? { ...s, entrance: action.entrance } : s;
    case 'SHOW_DEMO': return s.scene === 'network' && s.relationFocus === 'customers'
      && (action.laborShare === undefined || [20, 80].includes(action.laborShare))
      ? { ...s, demoActive: true, demoLaborShare: action.laborShare ?? 20 } : s;
    case 'LEAVE_DEMO': return { ...s, demoActive: false };
  }
}
export function canSampleRelief(s: Pick<PrologueState,'reliefCompleted'|'remedyLabs'>): boolean {
  return s.reliefCompleted.some(route=>{
    const lab=s.remedyLabs[route];
    return !!lab&&remedyAccounts(lab).canContinue;
  });
}
export function reliefEndingAccessible(s: Pick<PrologueState,'reliefCompleted'|'remedyLabs'|'reliefSampled'> & {reliefReadingFinished?:boolean}): boolean {
  return s.reliefReadingFinished===true || s.reliefCompleted.length===3 || s.reliefSampled&&canSampleRelief(s);
}
function researchAccessible(s: PrologueState): boolean {
  return s.chapterBrowsing || reliefEndingAccessible(s) && s.epilogueBeat===3;
}
export function visiblePlans(s: PrologueState): Record<FirmId, Plan> {
  return s.demoActive && s.scene === 'network' && s.relationFocus === 'customers'
    ? { A: plan(s.demoLaborShare), B: plan(s.demoLaborShare), C: plan(s.demoLaborShare), D: plan(s.demoLaborShare) } : s.allocationPlans;
}
/** Validate this version's snapshot and fill newly introduced fields in older local saves. */
export function restorePrologue(snapshot: unknown): PrologueState {
  try {
    const v = typeof snapshot === 'string' ? JSON.parse(snapshot) : snapshot;
    if (!v || v.version !== PROLOGUE_VERSION) return initialPrologue();
    const has = (key: string) => Object.prototype.hasOwnProperty.call(v, key);
    if (!['opening', 'bakery', 'bakery-upgrade', 'bakery-expansion', 'street', 'street-economy', 'street-summary', 'allocation', 'market', 'network', 'concept', 'ending', 'relief', 'epilogue','assumptions','technology','needs-technology','ownership-technology','market-rules','routes'].includes(v.scene)
      || !firmIds.includes(v.activeFirmId) || !firmIds.includes(v.customerFirmId)
      || !RELATIONS.includes(v.relationFocus)
      || !['notStarted', 'observed', 'demo', 'skipped'].includes(v.prologueStatus)
      || !['pairs', 'all'].includes(v.endingViewMode)
      || !Number.isInteger(v.endingPairIndex) || v.endingPairIndex < 0 || v.endingPairIndex > 2
      || typeof v.definitionShown !== 'boolean' || typeof v.demoActive !== 'boolean'
      || (v.demoLaborShare !== undefined && ![20, 80].includes(v.demoLaborShare))
      || (v.workPaused !== undefined && typeof v.workPaused !== 'boolean')
      || (has('marketMode') && !['single', 'all'].includes(v.marketMode))
      || (has('marketCuts') && ![0, 1, 2].includes(v.marketCuts))
      || (has('marketDemoShare') && ![null, 20, 80].includes(v.marketDemoShare))
      || (has('reliefRoute') && v.reliefRoute !== null && !RELIEF_ROUTES.includes(v.reliefRoute))
      || (has('reliefSustained') && typeof v.reliefSustained !== 'boolean')
      || (has('reliefVisited') && (!Array.isArray(v.reliefVisited)
        || v.reliefVisited.some((route: ReliefRoute) => !RELIEF_ROUTES.includes(route))))
      || (has('reliefPhase')&&!RELIEF_PHASES.includes(v.reliefPhase))
      || (has('reliefTested')&&![0,1,3].includes(v.reliefTested))
      || (has('reliefCompleted')&&(!Array.isArray(v.reliefCompleted)||v.reliefCompleted.some((r:ReliefRoute)=>!RELIEF_ROUTES.includes(r))||new Set(v.reliefCompleted).size!==v.reliefCompleted.length))
      || (has('reliefSampled')&&typeof v.reliefSampled!=='boolean')
      || (has('reliefReadingFinished')&&typeof v.reliefReadingFinished!=='boolean')
      || (has('epilogueBeat')&&![0,1,2,3].includes(v.epilogueBeat))
      || (has('chapterBrowsing')&&typeof v.chapterBrowsing!=='boolean')
      || (has('bakeryWage')&&(!Number.isInteger(v.bakeryWage)||v.bakeryWage<0||v.bakeryWage>15))
      || (has('bakeryCommitted')&&typeof v.bakeryCommitted!=='boolean')
      || (has('bakeryComplaintIndex')&&v.bakeryComplaintIndex!==null&&(!Number.isInteger(v.bakeryComplaintIndex)||v.bakeryComplaintIndex<0||v.bakeryComplaintIndex>=BAKERY_COMPLAINTS.length))
      || (has('bakeryBoundary')&&![null,'low','high'].includes(v.bakeryBoundary))
      || (has('bakeryBoundarySerial')&&(!Number.isSafeInteger(v.bakeryBoundarySerial)||v.bakeryBoundarySerial<0))
      || (has('bakeryUpperLocked')&&typeof v.bakeryUpperLocked!=='boolean')
      || (has('bakeryPreviousWage')&&v.bakeryPreviousWage!==null&&(!Number.isInteger(v.bakeryPreviousWage)||v.bakeryPreviousWage<0||v.bakeryPreviousWage>15))
      || (has('bakeryBossQuoteIndex')&&v.bakeryBossQuoteIndex!==null&&(!Number.isInteger(v.bakeryBossQuoteIndex)||v.bakeryBossQuoteIndex<0||v.bakeryBossQuoteIndex>= (v.bakeryBoundary==='low'?BAKERY_BOSS_DEFLECTIONS:BAKERY_BOSS_REFUSALS).length))
      || ![null, 'individual', 'enterprise'].includes(v.entrance)
      || !Array.isArray(v.adjustedFirmIds)
      || v.adjustedFirmIds.some((id: string) => !firmIds.includes(id))) return initialPrologue();
    const plans = {} as Record<FirmId, Plan>;
    for (const { id } of FIRMS) {
      plans[id] = plan(v.allocationPlans[id].laborShare);
      if (plans[id].retainedShare !== v.allocationPlans[id].retainedShare) return initialPrologue();
    }
    const chapterBrowsing=v.chapterBrowsing??false;
    const browsingResearch=chapterBrowsing&&researchScenes.includes(v.scene);
    if (['concept', 'ending', 'street-summary','relief','epilogue','assumptions','technology','needs-technology','ownership-technology','market-rules'].includes(v.scene) && !v.definitionShown && !browsingResearch) return initialPrologue();
    const marketMode: MarketMode = v.marketMode ?? 'single';
    const marketCuts: 0 | 1 | 2 = v.marketCuts ?? 0;
    const marketDemoShare: 20 | 80 | null = v.marketDemoShare ?? null;
    const reliefRoute: ReliefRoute | null = v.reliefRoute ?? null;
    const reliefSustained = has('reliefPhase')?(v.reliefSustained ?? false):false;
    const reliefVisited = [...new Set(v.reliefVisited ?? [])] as ReliefRoute[];
    const reliefPhase:ReliefPhase=v.reliefPhase??'ready',reliefTested=v.reliefTested??0;
    const reliefCompleted:ReliefRoute[]=v.reliefCompleted??[],reliefSampled=v.reliefSampled??false,reliefReadingFinished=v.reliefReadingFinished??false,epilogueBeat=v.epilogueBeat??0;
    const remedyLabs:Partial<Record<ReliefRoute,RemedyLab>>={};
    if(has('remedyLabs')){
      if(!v.remedyLabs||typeof v.remedyLabs!=='object'||Array.isArray(v.remedyLabs)||Object.keys(v.remedyLabs).some(k=>!RELIEF_ROUTES.includes(k as ReliefRoute)))return initialPrologue();
      for(const route of RELIEF_ROUTES)if(Object.prototype.hasOwnProperty.call(v.remedyLabs,route)){
        const lab=restoreRemedy(v.remedyLabs[route],route);if(!lab)return initialPrologue();remedyLabs[route]=lab;
      }
    }
    if(reliefCompleted.some(r=>!reliefVisited.includes(r)))return initialPrologue();
    if(reliefRoute===null&&(reliefPhase!=='ready'||reliefTested!==0))return initialPrologue();
    if(['ready','improved'].includes(reliefPhase)&&(reliefTested!==0||reliefSustained))return initialPrologue();
    if(reliefPhase==='stress'&&(reliefTested!==1||reliefSustained))return initialPrologue();
    if(reliefPhase==='compare'&&!([1,3].includes(reliefTested)))return initialPrologue();
    if(reliefPhase==='done'&&(reliefTested!==3||reliefSustained||reliefRoute===null||!reliefCompleted.includes(reliefRoute)))return initialPrologue();
    if(reliefSampled&&!canSampleRelief({reliefCompleted,remedyLabs}))return initialPrologue();
    if(['epilogue',...researchScenes].includes(v.scene)&&!reliefEndingAccessible({reliefCompleted,remedyLabs,reliefSampled,reliefReadingFinished})&&!browsingResearch)return initialPrologue();
    if(researchScenes.includes(v.scene)&&epilogueBeat!==3&&!browsingResearch)return initialPrologue();
    const technology=v.technology==null?null:restoreAutomation(v.technology);
    if(v.technology!=null&&!technology||v.scene==='technology'&&!technology)return initialPrologue();
    const needsTechnology=v.needsTechnology==null?null:restoreNeeds(v.needsTechnology);
    if(v.needsTechnology!=null&&!needsTechnology||v.scene==='needs-technology'&&!needsTechnology)return initialPrologue();
    const ownershipTechnology=v.ownershipTechnology==null?null:restoreOwnership(v.ownershipTechnology);
    if(v.ownershipTechnology!=null&&!ownershipTechnology||v.scene==='ownership-technology'&&!ownershipTechnology)return initialPrologue();
    const marketRules=v.marketRules==null?null:restoreRules(v.marketRules);
    if(v.marketRules!=null&&!marketRules||v.scene==='market-rules'&&!marketRules)return initialPrologue();
    const branchArchive=has('branchArchive')?restoreBranchArchive(v.branchArchive):{};
    if(!branchArchive)return initialPrologue();
    const assumptionDesk=has('assumptionDesk')?restoreAssumptionDesk(v.assumptionDesk):initialAssumptionDesk();
    if(!assumptionDesk)return initialPrologue();
    if (marketMode === 'single' && (marketCuts !== 0 || marketDemoShare !== null)) return initialPrologue();
    if (v.scene === 'market' && v.definitionShown) return initialPrologue();
    if (v.scene === 'relief' && v.endingPairIndex !== 2 && v.endingViewMode !== 'all') return initialPrologue();
    if ((reliefRoute !== null && !reliefVisited.includes(reliefRoute)) || (reliefRoute === null && reliefSustained))
      return initialPrologue();
    const oldWage=v.bakeryWage??5, bakeryWage=Math.max(3,Math.min(7,oldWage)), migrated=bakeryWage!==oldWage;
    const promotedSandbox=v.scene==='street'&&v.streetMode==='sandbox'&&v.street&&restoreBattleSnapshot(v.battle)?.state.mode==='done';
    return { ...initialPrologue(), scene: promotedSandbox?'street-economy':v.scene, activeFirmId: v.activeFirmId, customerFirmId: v.customerFirmId,
      allocationPlans: plans, adjustedFirmIds: [...new Set(v.adjustedFirmIds)] as FirmId[],
      relationFocus: v.relationFocus, definitionShown: v.definitionShown,
      endingPairIndex: v.endingPairIndex, endingViewMode: v.endingViewMode,
      prologueStatus: v.prologueStatus, demoActive: v.demoActive && v.scene === 'network' && v.relationFocus === 'customers',
      demoLaborShare: v.demoLaborShare ?? 20,
      workPaused: v.workPaused === true && v.scene === 'network' && v.relationFocus === 'cooperation',
      marketMode, marketCuts, marketDemoShare, reliefRoute, reliefSustained, reliefVisited,reliefPhase,reliefTested,reliefCompleted,reliefSampled,reliefReadingFinished,remedyLabs,epilogueBeat,assumptionDesk,branchArchive,chapterBrowsing,technology,needsTechnology,ownershipTechnology,marketRules,
      bakeryWage,bakeryCommitted:migrated?false:(v.bakeryCommitted??false),
      bakeryComplaintIndex:bakeryWage<5?(v.bakeryComplaintIndex??null):null,
      bakeryBoundary:migrated?null:(v.bakeryBoundary??null),bakeryBoundarySerial:v.bakeryBoundarySerial??0,
      bakeryBossQuoteIndex:migrated?null:(v.bakeryBossQuoteIndex??null),bakeryUpperLocked:false,
      bakeryPreviousWage:migrated?oldWage:(v.bakeryPreviousWage??null),
      street:v.street?restoreStreetGame(v.street):v.scene==='street-economy'?sixFirmEconomy():null,
      battle:restoreBattleSnapshot(v.battle),
      streetMode:'battle',
      entrance: v.entrance };
  } catch { return initialPrologue(); }
}
