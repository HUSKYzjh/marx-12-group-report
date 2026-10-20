// Unmodified source libraries run as classic scripts in an isolated teaching stage.
import pixi from '../vendor/ncase-trust/js/lib/pixi.min.js?raw';
import tween from '../vendor/ncase-trust/js/lib/tweenjs-0.6.2.min.js?raw';
import pubsub from '../vendor/ncase-trust/js/lib/minpubsub.src.js?raw';
import helpers from '../vendor/ncase-trust/js/lib/helpers.js?raw';
import slideshow from '../vendor/ncase-trust/js/core/Slideshow.js?raw';
import textbox from '../vendor/ncase-trust/js/core/TextBox.js?raw';
import iterated from '../vendor/ncase-trust/js/sims/Iterated.js?raw';
import splash from '../vendor/ncase-trust/js/sims/Splash.js?raw';
import runtime from './trust-stage.js?raw';
import battleDocument from './generated/battle-embed.html?raw';
import battleStage from './battle-stage.js?raw';
import bakeryTimeline from './bakery-timeline.js?raw';
import bakeryStage from './bakery-stage.js?raw';
import bakeryExpansion from './bakery-expansion.js?raw';
import bakeryExpansionStage from './bakery-expansion-stage.js?raw';
import productionNetwork from './production-network.js?raw';
import streetStage from './street-stage.js?raw';
import streetArt from './street-art.js?raw';
import streetPresentation from './street-presentation.js?raw';
import streetLedger from './street-ledger.js?raw';
import streetInspector from './street-inspector.js?raw';
import streetUI from './street-ui.js?raw';
import streetBriefing from './street-briefing.js?raw';
import streetSummary from './street-summary.js?raw';
import streetContradictionUI from './street-contradiction-ui.js?raw';
import branchReviewUI from './branch-review-ui.js?raw';
import weberPerspective from './weber-perspective.js?raw';
import valueJourney from './value-journey.js?raw';
import mortgageLabModel from './mortgage-lab-model.js?raw';
import mortgageLab from './mortgage-lab.js?raw';
import ownershipPermissions from './ownership-permissions.js?raw';
import reliefUI from './relief-ui.js?raw';
import reliefReading from './relief-reading.js?raw';
import reliefReadingData from './relief-reading-data.json';
import remedyUI from './remedy-ui.js?raw';
import gestureBoard from './gesture-board.js?raw';
import technologyUI from './technology-ui.js?raw';
import researchReader from './research-reader.js?raw';
import hiddenWork from './hidden-work.js?raw';
import aiRedesign from './ai-redesign.js?raw';
import productionPurpose from './production-purpose.js?raw';
import technologyMatchUI from './technology-match-ui.js?raw';
import competitivePressureUI from './competitive-pressure-ui.js?raw';
import timeCalendarUI from './time-calendar-ui.js?raw';
import needsUI from './needs-ui.js?raw';
import spaceFreightUI from './space-freight-ui.js?raw';
import careRoutingUI from './care-routing-ui.js?raw';
import ownershipUI from './ownership-ui.js?raw';
import platformNetworkUI from './platform-network-ui.js?raw';
import sharingCouncilUI from './sharing-council-ui.js?raw';
import councilProductionUI from './council-production-ui.js?raw';
import marketRulesUI from './market-rules-ui.js?raw';
import publicDemandUI from './public-demand-ui.js?raw';
import preservationUI from './preservation-ui.js?raw';
import css from '../app/trust-stage.css?raw';
import { PRODUCTION_LINKS } from './production-links';
import { PROLOGUE_STAGES, STORY_CHAPTERS } from './prologue-state';
import thirdPartyNotices from '../vendor/ncase-trust/THIRD_PARTY_NOTICES.txt?raw';
import cc0 from '../vendor/ncase-trust/LICENSE?raw';
import fontLicense from '../public/assets/fonts/OFL.txt?raw';
import productionLogoNotice from '../public/assets/production-logos/NOTICE.md?raw';
import peepAtlas from '../public/assets/trust/iterated_peep.json';
import coinAtlas from '../public/assets/trust/iterated_coin.json';
import deskAtlas from '../public/assets/trust/iterated_machine.json';
import splashAtlas from '../public/assets/trust-source/splash_peep.json';
import connectionAtlas from '../public/assets/trust-source/connection.json';
import bakeryHatAtlas from '../public/assets/wbwwb-source/hatguy.json';
import bakeryBodyAtlas from '../public/assets/wbwwb-source/body.json';
import bakeryFaceAtlas from '../public/assets/wbwwb-source/face.json';
import bakeryAngryAtlas from '../public/assets/wbwwb-source/face_angry.json';
import bakeryNervousAtlas from '../public/assets/wbwwb-source/face_nervous.json';
import wbNotice from '../public/assets/wbwwb-source/NOTICE.txt?raw';

const assets = {
  author: {avatar:'/assets/author/huskyzjh.png',profile:'https://github.com/HUSKYzjh',repository:'https://github.com/HUSKYzjh/feast-of-hunger'},
  history: {"consumption-relief":"/assets/history/consumption-relief.jpg","consumption-market":"/assets/history/consumption-market.jpg","consumption-credit":"/assets/history/consumption-credit.jpg","investment-power":"/assets/history/investment-power.jpg","investment-ford":"/assets/history/investment-ford.jpg","investment-housing":"/assets/history/investment-housing.jpg","exports-grain":"/assets/history/exports-grain.jpg","exports-loading":"/assets/history/exports-loading.jpg","exports-port":"/assets/history/exports-port.jpg"},
  peep: '/assets/trust/iterated_peep.png', coin: '/assets/trust/iterated_coin.png',
  old: '/assets/workshop-v6/machine-old-v1.png', new: '/assets/workshop-v6/machine-new-v1.png',
  button: '/assets/trust-source/button_long.png', peepAtlas, coinAtlas,
  scratch: '/assets/trust-source/scratch.png',
  desk: '/assets/trust/iterated_machine.png', deskAtlas,
  splash: '/assets/trust-source/splash_peep.png', splashAtlas,
  connection: '/assets/trust-source/connection.png', connectionAtlas,
  street: {clothes:'/assets/street/clothes.svg',cars:'/assets/street/cars.svg',inputs:'/assets/street/inputs.svg',emptyOven:'/assets/street/oven-empty.svg'},
  bakery: {
    chefHat:'/assets/bakery/chef-hat.svg',oven:'/assets/bakery/oven-old.svg',emptyOldOven:'/assets/bakery/oven-old-empty.svg',
    truck:'/assets/bakery/truck.svg',bread:'/assets/bakery/bread.svg',newOven:'/assets/bakery/oven-new.svg',
    hat:'/assets/wbwwb-source/hatguy.png',body:'/assets/wbwwb-source/body.png',face:'/assets/wbwwb-source/face.png',
    angry:'/assets/wbwwb-source/face_angry.png',angryAtlas:bakeryAngryAtlas,
    nervous:'/assets/wbwwb-source/face_nervous.png',nervousAtlas:bakeryNervousAtlas,
    hatAtlas:bakeryHatAtlas,bodyAtlas:bakeryBodyAtlas,faceAtlas:bakeryFaceAtlas,
  },
};
const script = (source: string) => `<script>${source.replaceAll('</script', '<\\/script')}</script>`;
const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
// No original PD simulation, audio, web loader, or game-theory slide is started.
const peepSource = iterated.slice(iterated.indexOf('function IteratedPeep(config)'));
const splashSource = splash.slice(splash.indexOf('function SplashPeep(config)'));
export function trustDocument() {
  const fontUri = (globalThis as typeof globalThis & {__WORKSHOP_FONT_URI__?: string}).__WORKSHOP_FONT_URI__ ?? '/assets/fonts/workshop-hand.woff2';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
  <nav class="chapter-navigation" aria-label="章节切换"><details id="chapter-menu"><summary id="chapter-toggle"><span id="chapter">序章：厨房内外</span><span class="chapter-chevron" aria-hidden="true">▾</span></summary><ul id="chapter-list" aria-label="章节列表"></ul></details><button type="button" id="fullscreen-toggle" hidden aria-pressed="false">全屏 ⛶</button><span id="fullscreen-status" role="status"></span></nav>
  <main><div id="slideshow"></div><div id="battle-mount" hidden></div><div id="readout" aria-live="polite" aria-atomic="true"></div><div id="controls"></div><details id="notes"><summary>展开说明</summary><div id="note-content"></div></details></main><div id="scene-scratch" aria-hidden="true"></div>
  <footer><nav id="stage-navigation" aria-label="阶段切换"><button type="button" id="previous-stage" class="stage-arrow" aria-label="上一阶段" title="上一阶段">←</button><div id="dots" aria-label="故事阶段"></div><button type="button" id="next-stage" class="stage-arrow" aria-label="下一阶段" title="下一阶段">→</button></nav><details><summary>关于这个改编</summary><p>基于 Nicky Case《信任的进化》的 Slideshow、Pixi 舞台、IteratedPeep 人物、SplashPeep／SplashEdge 开场及 Tween 动画改编。经济模型和中文叙事为本作编写，不代表原作者观点。</p><p>四家公司及煤矿父女情节改编自<a href="https://www.zhihu.com/question/264895929/answer/1906437501" target="_blank" rel="noreferrer">遨游之舟的知乎回答</a>，依据用户提供文本。作者保留著作权，商业转载请联系授权，非商业转载请注明出处。本作是改编教学故事，不是历史实录；注明出处不等于取得公开改编许可。</p><p>原作代码／图形 CC0；Pixi、TweenJS、MinPubSub 保留 MIT 许可。没有使用原版第三方字体或音效。</p><p>第四幕历史照片来自美国国会图书馆版画与照片部的FSA/OWI、Detroit Publishing等馆藏；每页附原始档案链接。保留原片与原始年代范围，未使用AI重绘。照片用于说明历史场景，不能单凭照片判断政策效果。详细作者、权利说明和文件哈希见项目历史照片清单与CREDITS.md。</p><p>网页字体 Workshop Hand 是<a href="https://github.com/lxgw/LxgwWenKai-Screen" target="_blank" rel="noreferrer">霞鹜文楷屏幕阅读版 v1.522（陆标字形）</a>的改名网页字体，保留原版全部字符映射、LXGW 与 Klee 项目作者署名，按 SIL OFL 1.1 分发；不代表字体作者认可本作。</p><a href="https://github.com/ncase/trust" target="_blank" rel="noreferrer">原版源码 ↗</a><details><summary>许可全文</summary><pre>${escape(thirdPartyNotices + '\n\nNICKY CASE ORIGINAL WORK — CC0\n\n' + cc0 + '\n\nWORKSHOP HAND — WENKAI GB SCREEN FULL CHARACTER COVERAGE / SIL OFL 1.1\n\n' + fontLicense)}</pre></details></details></footer>
  <template id="production-logo-notice"><p>面包店老板使用 Nicky Case《We Become What We Behold》的礼帽单片眼镜角色，厨师和司机复用其身体与普通表情。厨师仅加本作新绘厨师帽；老烤炉、货车、面包为本作新绘SVG。金币沿用Trust原图。演示动作由本作编排，不运行原作剧情。</p><details><summary>WBWWB素材来源与许可</summary><pre>${escape(wbNotice)}</pre></details><details><summary>新增标志出处与许可</summary><pre>${escape(productionLogoNotice)}</pre></details></template>
  ${script(`var TRUST_ASSETS=${JSON.stringify(assets)}; var RELIEF_READING=${JSON.stringify(reliefReadingData)}; var PRODUCTION_LINKS=${JSON.stringify(PRODUCTION_LINKS)}; var STORY_STAGES=${JSON.stringify(PROLOGUE_STAGES)}; var STORY_CHAPTERS=${JSON.stringify(STORY_CHAPTERS)}; var c_={}; var createjs={};`)}
  ${script('var BATTLE_DOCUMENT='+JSON.stringify(battleDocument)+';')}${script(battleStage)}${script(researchReader)}${script(valueJourney)}${script(mortgageLabModel)}${script(mortgageLab)}${script(hiddenWork)}${script(aiRedesign)}${script(productionPurpose)}
  ${script(pixi)}${script(tween)}${script('var Tween=createjs.Tween, Ease=createjs.Ease, Ticker=createjs.Ticker; Ticker.framerate=60; Ticker.paused=true;')}${script(ownershipPermissions)}${script(weberPerspective)}${script(streetSummary)}
  ${script(pubsub)}${script(helpers)}${script(slideshow)}${script(textbox)}${script(peepSource)}${script(splashSource)}${script(productionNetwork)}${script(bakeryTimeline)}${script(bakeryStage)}${script(bakeryExpansion)}${script(bakeryExpansionStage)}${script(streetArt)}${script(streetPresentation)}${script(streetLedger)}${script(streetInspector)}${script(streetStage)}${script(streetBriefing)}${script(streetUI)}${script(streetContradictionUI)}${script(gestureBoard)}${script(remedyUI)}${script(reliefReading)}${script(reliefUI)}${script(timeCalendarUI)}${script(competitivePressureUI)}${script(technologyMatchUI)}${script(technologyUI)}${script(spaceFreightUI)}${script(careRoutingUI)}${script(needsUI)}${script(platformNetworkUI)}${script(councilProductionUI)}${script(sharingCouncilUI)}${script(ownershipUI)}${script(publicDemandUI)}${script(preservationUI)}${script(marketRulesUI)}${script(branchReviewUI)}${script(runtime)}
  </body></html>`.replaceAll('__WORKSHOP_FONT_URL__', fontUri);
}
