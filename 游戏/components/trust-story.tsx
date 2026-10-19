'use client';
import {streetContradiction} from '../lib/street-contradiction.ts';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { trustDocument } from '@/lib/trust-document';
import { initialPrologue, prologueReducer, restorePrologue, visiblePlans, canSampleRelief, reliefEndingAccessible, FIRMS,
  BASIC_CONTRADICTION, ENDING_PAIRS, PROLOGUE_STORAGE_KEY, PROLOGUE_STAGES, STORY_CHAPTERS, BAKERY_COMPLAINTS, BAKERY_BOSS_DEFLECTIONS, BAKERY_BOSS_REFUSALS, BAKERY_REACTION_PROBABILITY, type PrologueAction, type Entrance } from '@/lib/prologue-state';
import { initialMachine, machineReducer, machineAccount, restoreMachine, MACHINE_STORAGE_KEY,
  OLD_MACHINE, PREDICTION_QUESTIONS, type MachineAction } from '@/lib/machine-experiment';
import { marketAccount, reliefAccount } from '@/lib/crisis-model';
import {reliefFrame,EPILOGUE_QUOTE,EPILOGUE_SOURCE,EPILOGUE_DELAYS,PROLOGUE_ASSUMPTIONS,PROLOGUE_MODEL_ASSUMPTIONS,PROLOGUE_REASONING} from '@/lib/relief-experiment';
import {ASSUMPTION_DIALOGUE} from '@/lib/assumption-desk';
import {assumptionRouteProgress} from '@/lib/assumption-route-progress';
import {assumptionObservations} from '@/lib/assumption-observations';
import {branchReviews} from '@/lib/branch-review';
import assumptionParameters from '../docs/street-model-notes.txt?raw';
import {automationAccount,automationRunAccount} from '@/lib/automation-experiment';
import {cannotOpenMatch} from '@/lib/technology-match';
import {offerIssue} from '../public/assets/market-duel/model.mjs';
import {pressureFeedback} from '../public/assets/market-duel/pressure-feedback.mjs';
import {calendarAccount} from '@/lib/time-calendar';
import {automationExploration,automationRehearsal} from '@/lib/automation-exploration';
import {calendarExploration} from '@/lib/calendar-exploration';
import automationEvidence from '@/data/automation-evidence.json';
import automationReport from '../docs/研究报告/01_AI机器人与工资来源.txt?raw';
import timeReport from '../docs/研究报告/02_新机器与闲暇.txt?raw';
import {spaceAccount,careAccount} from '@/lib/needs-experiment';
import {freightAccount} from '@/lib/space-freight';
import {freightExploration} from '@/lib/freight-exploration';
import {careRoutingAccount} from '@/lib/care-routing';
import {careExploration} from '@/lib/care-exploration';
import needsEvidence from '@/data/needs-evidence.json';
import spaceReport from '../docs/研究报告/03_太空建设与有效需求.txt?raw';
import careReport from '../docs/研究报告/04_照护缺口与技术.txt?raw';
import {platformAccount,sharingAccount} from '@/lib/ownership-experiment';
import {networkAccount,networkTrialAccount} from '@/lib/platform-network';
import {platformExploration} from '@/lib/platform-exploration';
import {councilAccount,councilTrialAccount,councilProductionTrials,councilCanConclude} from '@/lib/sharing-council';
import {councilExploration} from '@/lib/council-exploration';
import {productionAccount} from '@/lib/council-production';
import ownershipEvidence from '@/data/ownership-evidence.json';
import concentrationReport from '../docs/研究报告/05_平台集中与技术协作.txt?raw';
import sharingReport from '../docs/研究报告/06_收益共享与决定权.txt?raw';
import {policyAccount,priceAccount} from '@/lib/market-rules-experiment';
import {publicDemandAccount,demandTrialAccount} from '@/lib/public-demand';
import {publicDemandExploration} from '@/lib/public-demand-exploration';
import {preservationAccount,preservationTrialAccount} from '@/lib/preservation-workbench';
import {preservationExploration} from '@/lib/preservation-exploration';
import rulesEvidence from '@/data/market-rules-evidence.json';
import policyReport from '../docs/研究报告/07_公共订单信用与技术方向.txt?raw';
import pricesReport from '../docs/研究报告/08_降价工艺与保鲜.txt?raw';
import {remedyAccounts,REMEDY_SOURCES} from '@/lib/remedy-lab';

const VIEW_KEY = 'technology-dividend:active-view:v1';
export default function TrustStory({ onLegacy, active = true }: { onLegacy: () => void; active?: boolean }) {
  const [prologue, dispatch] = useReducer(prologueReducer, undefined, initialPrologue);
  const [machine, machineDispatch] = useReducer(machineReducer, undefined, initialMachine);
  const [entrance, setEntrance] = useState<Entrance>('individual');
  const [section, setSection] = useState<'prologue' | 'machine'>('prologue');
  const [loaded, setLoaded] = useState(false), [ready, setReady] = useState(false);
  const [canSave, setCanSave] = useState(true), [failed, setFailed] = useState(false);
  const [height, setHeight] = useState(800);
  const frame = useRef<HTMLIFrameElement>(null);
  const document = useMemo(trustDocument, []);
  const latest = useRef({ prologue, machine, entrance, section, canSave });
  latest.current = { prologue, machine, entrance, section, canSave };
  useEffect(() => {
    if (ready) frame.current?.contentWindow?.postMessage({ app: 'trust-adaptation', type: 'visibility', active }, '*');
  }, [ready, active]);
  useEffect(() => {
    try {
      dispatch({ type: 'RESTORE', snapshot: restorePrologue(localStorage.getItem(PROLOGUE_STORAGE_KEY)) });
      const view = JSON.parse(localStorage.getItem(VIEW_KEY) || 'null');
      if (view?.version === 1 && ['individual', 'enterprise'].includes(view.entrance)) setEntrance(view.entrance);
      if (view?.version === 1 && view.view === 'experiment' && ['individual', 'enterprise'].includes(view.entrance)) {
        setSection('machine');
        const snapshots = JSON.parse(localStorage.getItem(MACHINE_STORAGE_KEY) || '{}');
        machineDispatch({ type: 'RESTORE', snapshot: restoreMachine(snapshots?.[view.entrance]) });
      }
    } catch { setCanSave(false); }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(PROLOGUE_STORAGE_KEY, JSON.stringify(prologue));
      localStorage.setItem(VIEW_KEY, JSON.stringify({ version: 1, view: section === 'machine' ? 'experiment' : 'prologue', entrance }));
      if (section === 'machine') {
        let snapshots: Record<string, unknown> = {};
        try { const stored = JSON.parse(localStorage.getItem(MACHINE_STORAGE_KEY) || '{}');
          if (stored && typeof stored === 'object' && !Array.isArray(stored)) snapshots = stored; } catch { /* independent snapshots */ }
        localStorage.setItem(MACHINE_STORAGE_KEY, JSON.stringify({ ...snapshots, [entrance]: machine }));
      }
    } catch { setCanSave(false); }
  }, [loaded, prologue, machine, section, entrance]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || !event.data || event.data.app !== 'trust-adaptation') return;
      const data = event.data;
      if (data.type === 'ready') { setReady(true); return; }
      if (data.type === 'error') { setFailed(true); return; }
      if (data.type === 'height' && Number.isFinite(data.height)) { setHeight(Math.max(400, Math.min(12000, data.height))); return; }
      if (data.type !== 'action' || !latest.current) return;
      const a = data.action;
      if(data.channel==='prologue'&&a&&['SAVE_BATTLE','FINISH_BATTLE','FINISH_STREET_ECONOMY','OPEN_STREET_SANDBOX','BACK_BATTLE'].includes(a.type))dispatch(a as PrologueAction);
      if(data.channel==='prologue'&&a?.type==='REMEDY')dispatch(a as PrologueAction);
      if(data.channel==='prologue'&&a?.type==='ASSUMPTION_DESK')dispatch(a as PrologueAction);
      if(data.channel==='prologue'&&a&&typeof a==='object'&&['OPEN_NEEDS','NEEDS','OPEN_OWNERSHIP','OWNERSHIP','OPEN_RULES','RULES'].includes(a.type))dispatch(a as PrologueAction);
      if (data.channel === 'prologue' && a && typeof a === 'object'
        && ['STREET','START','CONTINUE_BAKERY','SET_BAKERY_WAGE','CONFIRM_BAKERY_WAGE','RETRY_BAKERY_WAGE','OPEN_ALLOCATION_COMPARE','OPEN_BAKERY_EXPANSION','EXPANSION_CONTINUE','ADJUST_SHARE','SELECT_FIRM','SHOW_MARKET','OTHER_FIRMS_COPY','MARKET_CUT','MARKET_TRY','MARKET_RESTORE','MARKET_CONTINUE','SHOW_NETWORK','SHOW_RELATION','SELECT_CUSTOMER','BACK_TO_ALLOCATION','SHOW_CONCEPT','SHOW_ENDING','SHOW_STREET_SUMMARY','NEXT_PAIR','SHOW_ALL','SHOW_RELIEF','CHOOSE_RELIEF','RELIEF_CONDITION','RELIEF_ADVANCE','RELIEF_COMPLETE','RELIEF_WRAP','RELIEF_MENU','FINISH_RELIEF','FINISH_RELIEF_SAMPLE','FINISH_RELIEF_READING','EPILOGUE_NEXT','EPILOGUE_REVEAL','SHOW_ASSUMPTIONS','OPEN_TECHNOLOGY','TECHNOLOGY','BACK_ASSUMPTIONS','OPEN_RELATED','ENTER_ROUTES','FINISH_PROLOGUE','SET_ENTRANCE','SKIP_PROLOGUE','SHOW_DEMO','LEAVE_DEMO','TOGGLE_WORK'].includes(a.type)) dispatch(a as PrologueAction);
      if (data.channel === 'machine' && a && typeof a === 'object'
        && ['BEGIN','PREDICT','RUN','COMPARE','CONTRACT','RESTART'].includes(a.type)) machineDispatch(a as MachineAction);
      if (data.channel === 'host' && a?.type === 'EXPERIMENT' && ['individual','enterprise'].includes(a.entrance)) {
        setEntrance(a.entrance); setSection('machine');
        try { const snapshots = JSON.parse(localStorage.getItem(MACHINE_STORAGE_KEY) || '{}');
          machineDispatch({ type: 'RESTORE', snapshot: restoreMachine(snapshots?.[a.entrance]) }); } catch { machineDispatch({ type: 'RESTART' }); }
        window.scrollTo(0, 0);
      }
      if (data.channel === 'host' && a?.type === 'BACK') { setSection('prologue'); window.scrollTo(0, 0); }
      if (data.channel === 'host' && a?.type === 'HOME') {
        dispatch({ type: 'SHOW_HOME' }); setSection('prologue'); window.scrollTo(0, 0);
      }
      if (data.channel === 'host' && a?.type === 'NAVIGATE_CHAPTER'
        && STORY_CHAPTERS.some(chapter => chapter.id === a.chapter)) {
        if (a.chapter !== 'machine') {
          dispatch({type:'NAVIGATE_CHAPTER',chapter:a.chapter});setSection('prologue');
        } else if (latest.current.section !== 'machine') {
          const role = latest.current.entrance;
          try { const snapshots = JSON.parse(localStorage.getItem(MACHINE_STORAGE_KEY) || '{}');
            machineDispatch({ type: 'RESTORE', snapshot: restoreMachine(snapshots?.[role] ?? latest.current.machine) });
          } catch { machineDispatch({ type: 'RESTORE', snapshot: latest.current.machine }); }
          setSection('machine');
        }
        window.scrollTo(0, 0);
      }
      if (data.channel === 'host' && a?.type === 'NAVIGATE_STAGE'
        && Number.isInteger(a.stage) && a.stage >= 0 && a.stage < PROLOGUE_STAGES.length) {
        dispatch({ type: 'JUMP_STAGE', stage: a.stage }); setSection('prologue'); window.scrollTo(0, 0);
      }
      if (data.channel === 'host' && a?.type === 'LEGACY') onLegacy();
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onLegacy]);
  useEffect(() => {
    if (!ready || !loaded) return;
    frame.current?.contentWindow?.postMessage({ app: 'trust-adaptation', type: 'state', payload: {
      streetContradiction:prologue.scene==='street-economy'&&prologue.street?streetContradiction(prologue.street):null,
      prologue, machine, entrance, section, canSave, firms: FIRMS, plans: visiblePlans(prologue),
      account: machineAccount(machine), oldAccount: OLD_MACHINE, questions: PREDICTION_QUESTIONS,
      market: marketAccount(prologue.marketDemoShare ?? prologue.allocationPlans[prologue.activeFirmId].laborShare,
        prologue.marketMode, prologue.marketCuts),
      marketSingle: marketAccount(prologue.marketDemoShare ?? prologue.allocationPlans[prologue.activeFirmId].laborShare, 'single', 0),
      relief: prologue.reliefRoute ? reliefAccount(prologue.reliefRoute, prologue.reliefSustained) : null,
      reliefFrame:reliefFrame(prologue.reliefRoute,prologue.reliefPhase,prologue.reliefSustained),
      remedy:prologue.reliefRoute&&prologue.remedyLabs[prologue.reliefRoute]?remedyAccounts(prologue.remedyLabs[prologue.reliefRoute]!):null,
      remedyMenu:prologue.scene==='relief'&&!prologue.reliefRoute?Object.fromEntries(Object.entries(prologue.remedyLabs).map(([id,lab])=>[id,remedyAccounts(lab)])):null,
      remedySources:REMEDY_SOURCES,
      reliefSampleAvailable:canSampleRelief(prologue),reliefEndingAccessible:reliefEndingAccessible(prologue),
      epilogueQuote:EPILOGUE_QUOTE,epilogueSource:EPILOGUE_SOURCE,epilogueDelays:EPILOGUE_DELAYS,assumptions:PROLOGUE_ASSUMPTIONS,modelAssumptions:PROLOGUE_MODEL_ASSUMPTIONS,assumptionReasoning:PROLOGUE_REASONING,assumptionDialogue:ASSUMPTION_DIALOGUE,assumptionParameters,assumptionProgress:assumptionRouteProgress(prologue),assumptionObservations:assumptionObservations(prologue),branchReviews:branchReviews(prologue),
      technologyAccount:prologue.technology?.run?automationRunAccount(prologue.technology.run):null,
      technologyTrials:(prologue.technology?.trials??[]).map(automationRunAccount),
      automationExploration:prologue.technology?automationExploration(prologue.technology):null,
      automationRehearsal:prologue.technology?automationRehearsal(prologue.technology):null,
      calendarAccount:prologue.technology?.calendar?.run?calendarAccount(prologue.technology.calendar.run):null,
      calendarTrials:(prologue.technology?.calendar?.trials??[]).map(calendarAccount),
      calendarExploration:prologue.technology?.calendar?calendarExploration(prologue.technology.calendar):null,
      technologyBaseline:automationAccount(0,'cut'),technologyReports:{automation:automationReport,time:timeReport},technologyEvidence:automationEvidence,
      matchOfferIssue:prologue.technology?.match?offerIssue(prologue.technology.match.world,prologue.technology.match.draft):null,
      matchCannotOpen:prologue.technology?.match?cannotOpenMatch(prologue.technology.match):false,
      pressureFeedback:prologue.technology?.pressure?pressureFeedback(prologue.technology.pressure.world):null,
      needsAccount:prologue.needsTechnology?.freight||prologue.needsTechnology?.care?null:prologue.needsTechnology?.branch==='space'?spaceAccount(prologue.needsTechnology.capacity,prologue.needsTechnology.spaceMode,prologue.needsTechnology.round):prologue.needsTechnology?.careRun?careAccount(prologue.needsTechnology.careRun):null,
      needsReports:{space:spaceReport,services:careReport},needsEvidence,
      freightAccount:prologue.needsTechnology?.freight?freightAccount(prologue.needsTechnology.freight,prologue.needsTechnology.freight.pending):null,
      freightTrials:(prologue.needsTechnology?.freight?.trials??[]).map(r=>({...freightAccount(r),capacity:r.capacity,order:r.order})),
      freightExploration:prologue.needsTechnology?.freight?freightExploration(prologue.needsTechnology.freight):null,
      careRoutingAccount:prologue.needsTechnology?.care?.run?careRoutingAccount(prologue.needsTechnology.care.run):null,
      careExploration:prologue.needsTechnology?.care?careExploration(prologue.needsTechnology.care):null,
      careRoutingTrials:(prologue.needsTechnology?.care?.trials??[]).map(careRoutingAccount),
      ownershipAccount:prologue.ownershipTechnology?.network||prologue.ownershipTechnology?.council?null:prologue.ownershipTechnology?.branch==='concentration'?platformAccount(prologue.ownershipTechnology.platformMode,prologue.ownershipTechnology.fee,prologue.ownershipTechnology.round):prologue.ownershipTechnology?.run?sharingAccount(prologue.ownershipTechnology.run.mode,prologue.ownershipTechnology.run.ballot):null,
      councilAccount:prologue.ownershipTechnology?.council?councilAccount(prologue.ownershipTechnology.council.mode,prologue.ownershipTechnology.council.paid,prologue.ownershipTechnology.council.run?.ballot??null,prologue.ownershipTechnology.council.run?.others??prologue.ownershipTechnology.council.others,!!prologue.ownershipTechnology.council.personal):null,
      councilTrials:prologue.ownershipTechnology?.council?.trials.map(p=>({...p,...councilTrialAccount(p)}))??[],
      councilExploration:prologue.ownershipTechnology?.council?councilExploration(prologue.ownershipTechnology.council):null,
      councilProductionAccount:prologue.ownershipTechnology?.council?.production?productionAccount(prologue.ownershipTechnology.council.production):null,
      councilProductionTrials:prologue.ownershipTechnology?.council?councilProductionTrials(prologue.ownershipTechnology.council):[],
      councilCanConclude:prologue.ownershipTechnology?.council?councilCanConclude(prologue.ownershipTechnology.council):false,
      networkAccount:prologue.ownershipTechnology?.network?networkAccount(prologue.ownershipTechnology.network.rule,prologue.ownershipTechnology.network.fee,prologue.ownershipTechnology.network.history):null,
      networkTrials:prologue.ownershipTechnology?.network?.trials.map(p=>({...p,...networkTrialAccount(p)}))??[],
      networkExploration:prologue.ownershipTechnology?.network?platformExploration(prologue.ownershipTechnology.network):null,
      ownershipReports:{concentration:concentrationReport,sharing:sharingReport},ownershipEvidence,
      rulesAccount:prologue.marketRules?.demand||prologue.marketRules?.workbench?null:prologue.marketRules?.branch==='policy'?policyAccount(prologue.marketRules.policyMode,prologue.marketRules.income,prologue.marketRules.round):prologue.marketRules?priceAccount(prologue.marketRules.priceMode,prologue.marketRules.price,prologue.marketRules.round):null,
      preservationAccount:prologue.marketRules?.workbench?preservationAccount(prologue.marketRules.workbench):null,
      preservationTrials:prologue.marketRules?.workbench?prologue.marketRules.workbench.trials.map(preservationTrialAccount):[],
      preservationExploration:prologue.marketRules?.workbench?preservationExploration(prologue.marketRules.workbench):null,
      demandAccount:prologue.marketRules?.demand?publicDemandAccount(prologue.marketRules.demand):null,
      demandExploration:prologue.marketRules?.demand?publicDemandExploration(prologue.marketRules.demand):null,
      demandTrials:prologue.marketRules?.demand?.trials.map(demandTrialAccount)??[],
      rulesReports:{policy:policyReport,prices:pricesReport},rulesEvidence,
      definition: BASIC_CONTRADICTION, ending: ENDING_PAIRS, bakeryComplaints:BAKERY_COMPLAINTS,
      bakeryBossDeflections:BAKERY_BOSS_DEFLECTIONS,bakeryBossRefusals:BAKERY_BOSS_REFUSALS,bakeryReactionProbability:BAKERY_REACTION_PROBABILITY,
    } }, '*');
  }, [ready, loaded, prologue, machine, entrance, section, canSave]);
  return <div className="trust-host">
    {!ready && !failed && <p className="trust-loading" role="status">舞台准备中…</p>}
    <iframe ref={frame} title="饥馑的盛宴 · 章与幕的互动舞台" data-testid="trust-frame" srcDoc={document}
      style={{ width: '100%', height, border: 0, display: failed ? 'none' : 'block' }} />
    {failed && <div className="trust-loading" role="alert"><p>这个浏览器暂时没能打开动画舞台。你的选择没有被清除。</p><button onClick={() => window.location.reload()}>重新打开</button><button onClick={onLegacy}>打开旧版小工厂</button></div>}
  </div>;
}
