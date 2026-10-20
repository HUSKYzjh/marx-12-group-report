# 素材与思想方法致谢

2026-10-03金币堆：弃用完整金色山形轮廓。侧面金币摞由本作Canvas椭圆边线编排，前景散币和飞入金币复用已署名的Trust `iterated_coin`原图；不重画或修改原图。稳定错位、下落和堆高属于本作舞台适配，不声称来自原作完整场景。

2026-10-03第一幕扩张：沿用已署名的WBWWB身体／基础表情／单片眼镜老板与本作厨师帽、新烤炉，不修改上游图集或PNG，也不按草图占位颜色给人物染色。倍增排列、镜头拉远、金币飞入、金山矢量轮廓及模糊问句由本作代码编排，见`lib/bakery-expansion.js`与`lib/bakery-expansion-stage.js`；不是Nicky Case原作场景或新下载素材。原有低工资越界红温反馈仍独立保留。

2026-10-03第二幕新增：`public/assets/bakery/oven-new.svg`为本作手绘矢量双层电烤炉，并非Nicky Case原图。厨师低工资表情复用已归档WBWWB `face_angry`第3帧，红温用第5帧和运行时染色、轻微摇晃；按原作 `AngryPeep.js`使用1/3横向锚点，不改原PNG或JSON，不执行原作暴力逻辑。六句厨师抱怨及七句老板台词为用户提供，随机选句仅用作人物情绪反馈，不代表成本核算。3—7枚谈判边界、45%/90%发言概率为本作剧情设定。15枚销售收款与旧版四企业10份预算保持独立，尚未统一两段经济模型。

## 2026-10-03补充：饥馑的盛宴 · 面包店首幕

最新厨师修订：WBWWB原作圆头身体`body`第0帧与原表情`face`不改，只叠加本作新绘`chef-hat.svg`。此前完整自绘`baker.svg`已退出运行，原文件保留；下段记录的是首版制作过程，不代表当前厨师仍为整体新绘。

正式入口新增“第一节 · 序章：厨房内外／第一幕 · 一车面包”。老板使用WBWWB固定提交中的`hatguy`（礼帽、单片眼镜与胡须），司机使用其`body`／`face`原图；不赋予原作人物新的道德评价。厨师、老烤炉、货车、面包四张SVG由本作绘制，存于`public/assets/bakery`，没有复制为原作资源。金币复用Trust原图。厨房的装车、付款和发薪动画由本作编排，时序来自`lib/bakery-timeline.js`，舞台适配为`lib/bakery-stage.js`；未执行WBWWB原作JS、新闻循环、声音或暴力场景。字体补入新标题与首幕文字，仍保留OFL及上游署名。

## 2026-10-03补充：原作人物表情与动作资源库

继续使用Trust原图第10帧大笑与身体蹦跳，补齐第11帧露齿夸张脸的独立预览，以及眨眼、走近、递钱、低落和晕眩等适配。第11帧并非已核查IteratedPeep中播放evil_laugh的帧；新增摆动明确标为本作预览编排，不声称是原版完整动作。

WBWWB人物图集、JSON及动作参考源码来自[Nicky Case仓库固定提交](https://github.com/ncase/wbwwb/tree/7c68c7e44e66b5be95ebd07d22391de707090397)，作者在[原始README](vendor/ncase-wbwwb/README.md)将自有美术与代码以CC0开放。新引入55份来源文件，18图集320帧，另有相机／电视候选；不下载第三方音效、武器、血腥素材、照片或外部引擎。不把作者的素材许可扩展为第三方资源的统一许可。逐文件路径、SHA-256与固定Git blob见[来源清单](public/assets/wbwwb-source/provenance.json)及[NOTICE](public/assets/wbwwb-source/NOTICE.txt)。

本作新编Canvas动作预览与控制器保存于`public/assets/character-lab`，共20图集344帧和24动作配方，另有4张原作道具预览，分清原图、原帧范围与预览时序。不会执行WBWWB游戏、原作群体传播／暴力逻辑或参考JS，没有改写Trust原图。完整动作库仍独立；本轮仅将礼帽角色与基础身体／表情接入面包店首幕，见本页最新条目。美术使用位置与缺项见[资源工作包](美术资源/README.md)。

## 2026-10-03补充：企业标志、行业与 AI 产品

小米、Tesla、DJI、DeepSeek、宇树的显示图形替换为实际企业标志，旧示意图保留溯源。新增隆基／阳光电源（太阳能）、雅培／默沙东（生物医药）、Airbus／SpaceX（航空航天）、ABB／Bosch（先进制造），以及ChatGPT、Gemini、Claude产品标识。ChatGPT用OpenAI结形标志识别，并非独立的ChatGPT专属图形。当前共35个真实标志、1个Codex示意入口、36个官网链接；总节点数不变。

新增10个图形取自Simple Icons 16.33.0，宇树、隆基、阳光电源取自各自官网，3个AI产品图形取自固定提交的Lobe Icons；后者MIT版权声明完整保留。来源与权利条件见[NOTICE](public/assets/production-logos/NOTICE.md)，并内嵌离线页面。品牌权利不由图标库许可替代。图形仅用于识别并链接，不接入模型、不表示合作，也不让随机连线代表真实公司关系。

## 2026-10-03补充：密集网络与新增标志

本次再加入15种真实标志：NVIDIA、AMD、Arm、Intel、Huawei、Samsung、Siemens、Linux、Ubuntu、Blender、Arduino、Raspberry Pi、PyTorch、TensorFlow和Wikipedia。路径从同一固定版Simple Icons逐一读取并保持几何形状，记录于`lib/production-brand-catalog.ts`；单色显示为展示适配，来源与商标规则随下列NOTICE内嵌。现有19个真实标志、6个品牌示意入口，合计25个官网链接。增加种类而不再增加总密度，普通重复实例相应减少；同图形10X远程排斥仅为画面规则，不代表真实企业互斥。

本轮缩小单个图形，进一步把桌面／中屏／手机的密度加倍，分别使用136／92／72个节点，并加入标题与四条边界的渐变排斥力。官网入口每种只出现一次，普通工具与人物可重复；所有节点仍共用同一个动态网络。新增8个本作绘制的工具图示：芯片、服务器、机械臂、卫星、电池、太阳能板、风力发电机和3D打印机。

新增GitHub、Python、Git与Rust四种标志，SVG路径取自固定版本 [Simple Icons 16.33.0](https://github.com/simple-icons/simple-icons/tree/16.33.0)，不是本作原创或Nicky Case素材。Rust路径仅把一个隐式重复的曲线命令显式写出，图形不变。各标志的官方来源、单独许可、商标条件与必要署名见 [标志来源与许可](public/assets/production-logos/NOTICE.md)，同一记录也嵌入离线页面底部。Simple Icons仓库许可不替代各品牌的商标权，也不代表每个标志均适用CC0。

图形在本地内嵌显示，不请求外部图标服务；第一批四个标志分别链接至GitHub、Python、Git和Rust官网，新增十五个链接至各自公司或项目官网。只有用户点击才会访问，不表示相关组织与本作存在合作或背书。

## 2026-10-02 中文手写字体

标题、短对白、主要按钮和舞台短标签使用 `Workshop Hand`：由 [LXGW 小赖字体 v3.126](https://github.com/lxgw/kose-font/releases/tag/v3.126) 生成的改名字库子集，原字形轮廓未修改。原作者为 LXGW、Nozomi Seto，适用 SIL OFL 1.1；不是《信任的进化》原版字体，也不表示字体作者背书。完整许可随 `public/assets/fonts/OFL.txt` 分发，同时嵌入离线网页底部“许可全文”。

脚本 `scripts/subset-hand-font.py` 固定上游 TTF 的 SHA-256，按当前舞台源码选字并转为 WOFF2；生成记录在同目录 `provenance.json`。修改游戏文案后须重跑字库生成。正文、数字和说明保持系统无衬线字体；字体文件嵌入单页，不请求外部字体服务。

## 2026-10-02 原版舞台引擎改编

此前10月2日开场曾采用上下两条人与工具混合的生产链；10月3日最新修订已替换为统一动态网络，详见下方。人物继续使用 SplashPeep；旧／新机器为本作此前制作的 PNG，扳手、齿轮、飞轮、传送带与电机由本作使用画布图形绘制。这些工具符号与构图不是原作素材。

本轮将原仓库 `assets/ui/scratch.png` 实际用于开场到分账、定义到父女故事的遮盖／揭开动画。PNG 未修改；帧推进、输入锁定与减少动态逻辑由本作编写，未加载原 Scratcher、Q 或声音。原图来源、提交和哈希保存在 `public/assets/trust-source/provenance.json`。

当前默认入口不再是仅借用图片的 React/SVG 页面。它在隔离的本地舞台中实际运行原作的 `Slideshow.js`、`TextBox.js`、`helpers.js`、`IteratedPeep`（从未改写的 `Iterated.js` 提取）、Pixi 4.4.3、TweenJS 0.6.2 和 MinPubSub。固定源提交仍为 `6ec45d73befdb922bd40654dd1c1c903a953562f`；未改写源文件保存在 `vendor/ncase-trust`。原版 `main.js`、联网 Loader、PD 博弈规则、第三方音效及字体不启动；改编运行器为 `lib/trust-stage.js`。

角色与钱实际由原版 MovieClip/Texture 图层与 Tween 推进，普通切幕保留同一 Stage 对象。开头复用未改写 `Splash.js` 中的 `SplashPeep` 图形；最新位置与动态键由本作的 `lib/production-network.js` 和舞台绘制管理，不再运行原人物固定位置漂浮或静态 `SplashEdge` 连线。原代码仍原样保留；不启动其原版独立应用、Loader 或音效。分账台复用原空白 `iterated_machine` 图集，叠加“这一笔／10份”，只是抽象装置，不把原机器博弈引入经济模型。中文文字、加减控件、公司身份、经济参数、关系标识及剧情为本作新增。原版人物的帽子不再标记合作／欺骗性格。

主线只做一家公司的分配，其他公司作为购物、协作背景；换公司对照放在按需展开的说明中，不要求四次重复操作。原版三帧按钮按图集使用正常、悬停和禁用状态，标题／舞台／一个主要动作居中编排，黑色底栏保留进度与说明。

作者代码与图形适用仓库 CC0；第三方 Pixi、TweenJS 和 MinPubSub 是 MIT，原文件的许可与版权标头完整保留，不能将其一概标为 CC0。原作署名和免责声明也显示在游戏页底部。

## 2026-09-15关系标识补充

workshop-v6新增的互扣圆环、钥匙、调节杆杆身和连线端点由本项目用CSS构成；调节杆圆钮、金币和连线继续复用原作PNG。显示层调整了线条伸展、深浅与分段，未改写原文件。四种关系的名称、语义、方向及交互演示均由本项目编写，并非原作的政治经济学分类。

## 2026-10-03开场：人、工具与生产

最新修订撤去上下排列的图标栏，所有对象共用一张动态网络。本作编写粒子排斥、弹簧吸引、距离区间成键／断键、冷却与淡入淡出；节点会重新寻找位置，初始布局不是固定锚点。鼠标／键盘选中官网符号时固定该节点，减少动态模式保留静态构图。标题留白、边界和最小可点击尺寸均属于界面约束，而非经济模型。连线不代表这些企业存在真实合作关系。

旧／新机器仍使用下述已有本作PNG，人物继续使用Nicky Case原图集。开场保留齿轮与传送带，新增8个代码绘制的SVG类别符号：电脑、AI芯片、终端、鲸鱼、四足机器人、智能设备、电动汽车和无人机，见 `lib/production-symbols.ts`。它们是本作的示意绘图，不是从企业官网下载或临摹的官方标志；不得以Nicky Case的CC0许可替代企业名称或商标各自的权利。

符号与产品／企业名称配对，仅用于课堂主题引入，不表示合作、赞助、推荐或背书。国内外企业并列不代表国家制度相同。六个官方入口于2026-10-03打开核验：

- [OpenAI Codex](https://openai.com/codex/)
- [DeepSeek](https://www.deepseek.com/)
- [Unitree宇树](https://www.unitree.com/cn/)
- [小米](https://www.mi.com/shop)
- [Tesla特斯拉中国](https://www.tesla.cn/)
- [DJI大疆](https://www.dji.com/cn)

网址集中在 `lib/production-links.ts`。只在用户激活链接后以新标签页打开，使用 `noopener noreferrer`，不会自动访问外站、传送选择或加载外部图标。各站可能按地区跳转；电脑、AI两个类别图示本身没有外链。SVG和中文字体均嵌入离线HTML，离线可显示，官网访问需联网。

## 2026-09-15新旧机器重绘

当前workshop-v6样张的机器已改为本作使用内置图像生成工具新绘的两张透明PNG：`machine-old-v1.png`（手摇飞轮与外露连杆）和`machine-new-v1.png`（封闭电机与传送带）。它们不是Nicky Case原作素材，不以原作CC0许可为其来源证明。原始机器图仍保留供旧页面与来源追溯使用，未覆盖。制作提示词与校验记录见[机器绘制记录](美术资源/07_新旧机器绘制.md)。下方原作素材重组说明为此前修订记录。

## 2026-09-15美术样张补充

首批样张已按用户反馈改为原作素材重组。除下方已有三张图片外，当前还使用原仓库的iterated_peep人物分层、splash_peep中性人物、iterated_scoreboard空框、connection与connection_flower连接图、button_short三态按钮、slider_bg与slider_knob、sandbox_incdec和scratch静态帧。中文标签、计数、布局及关系语义由本项目添加；计分框裁片被用作抽象产品标记，并非声称原作包含对应工厂插画。

逐文件来源、固定提交、原图尺寸和哈希见[本轮来源记录](public/assets/trust-source/provenance.json)。27个文件已核对到固定提交6ec45d73befdb922bd40654dd1c1c903a953562f；原PNG未改写。未导入原作的第三方音效、音乐或Futura字体；不将仓库图形许可扩展为这些资源的统一许可。首版19个自行绘制SVG仍保留追溯，但退出当前样张使用。

感谢 **Nicky Case** 创作的 [The Evolution of Trust /《信任的进化》](https://ncase.me/trust/)。本作实际复用了其公开仓库 [ncase/trust](https://github.com/ncase/trust) 的以下原始素材：

- `assets/tournament/peep_characters.png`：手绘人物条带；本作以CSS选择不同人物。
- `assets/iterated/iterated_machine.png`：手绘机器；本作按图集边界显示原有画面，并叠加中文功能标签。
- `assets/iterated/iterated_coin.png`：金币；本作按数量显示收入、成本、工资和结余。

仓库许可为 [CC0 1.0 Universal](https://github.com/ncase/trust/blob/gh-pages/LICENSE)，本地保留于 `public/assets/trust/LICENSE.txt`。原始文件未被覆盖；当前样张机器的使用替换见上方说明。下载时间：2026-09-10；本地原文件可按哈希复核。

人物的企业身份由本作重新分配，不继承原作“合作／欺骗”等性格。经济模型、中文叙事和政治经济学解释由本作新编，不代表 Nicky Case 的观点、认可或背书，也不是原作官方续篇。

交互方法还参考了 [LOOPY](https://ncase.me/loopy/) 的系统反馈，以及 [Nutshell](https://ncase.me/nutshell/) 的按需展开解释。没有将“相似风格”当作已完成理论论证。

## 资料图像

- `ai-paper.png`：Brynjolfsson、Li、Raymond，*Generative AI at Work*，arXiv:2304.11771v2，第1页标题及作者区域。作者稿2024年，正式期刊论文2025年；界面明确区分版本。保留作者署名，不展示整篇论文。
- `cloud-report.png`：英国CMA，*Cloud Services Market Investigation: Summary of Final Decision*，2025-07-31，第1页封面局部。
- `board-paper.png`：Jäger、Schoefer、Heining，*Labor in the Boardroom*，作者最终稿第1页标题、作者与日期；稿件日期2020-10-20，2021年期刊发表。
- `bls-recalculation.png`：本研究根据BLS公开API快照所作的复算图，来源快照为2026-09-08。不是论文或新闻原图；不能将图中差额全部归为劳动份额变化或AI的因果效应。

原文地址、PDF页码、截取范围和原文件哈希记录在 `public/evidence/manifest.json`；截取脚本为 `scripts/capture-evidence.py`。截图仅用于识别所引用资料，核心结论须结合原文口径核验，不能仅凭标题判定。资料作者与机构不为游戏参数背书。


## 2026-10-16 分享卡

分享卡新增的厨师、老板和烤炉插画由内置 imagegen 工具按游戏截图的风格参考生成，仅用于分享材料，不标为 Nicky Case 原作素材。二维码矩阵独立生成，HTML/CSS 负责排版，继续使用已署名的 OFL 文楷字体。提示词、来源和文件哈希见[分享卡制作记录](分享/制作与来源.json)，扫码检查见[校验记录](分享/扫码校验.json)。

群像二维码外圈的厨师、工人、老板、面包车及麦穗插画同样由内置 imagegen 生成，以已有分享卡插画作风格参考，仅用于分享材料。中央码芯独立生成。完整提示词、素材哈希及制作方式见[群像制作来源](分享/群像二维码制作与来源.json)。

## 2026-10-17 联网版字体与缓存

联网版按 `unicode-range` 分片加载同一文楷字库，全部47,449个字符映射保留；源码中的完整字库及单文件离线版保持完整。分片继续使用 OFL-1.1，保留字体内部署名、许可与字形；托管包附 `runtime-assets/OFL.txt`。来源与完整字库记录仍见 `public/assets/fonts/provenance.json`、`coverage.json` 及 `OFL.txt`。脚本与图像仅拆分为可缓存资源，图像内容未重绘。

## 2026-10-20 第四幕历史照片

九张照片均取自美国国会图书馆版画与照片部，按各条馆藏记录的权利说明使用。FSA/OWI馆藏注明为公有领域；其余选用条目注明无已知发表限制。保留下载JPEG原始字节与原片边框，未进行AI生成、修补、上色或重绘。每页只以照片说明历史场景，不把照片当作政策效果、因果关系或具体出口目的地的证明。

作者、原题、年代范围、权利原文、原始下载URL与SHA-256见[历史照片清单](public/assets/history/manifest.json)。图注与机制解释分别编写；包括TVA的图片明确标为公共工程，不混同于私人厂商。

- 纽约警察向有需要的人发放鸡蛋和面包；1930；New York World-Telegram staff photographer；[LOC 95514429](https://www.loc.gov/item/95514429/)。
- 得州韦科市场的一次付款交易；1939 Nov.；Russell Lee；[LOC 2017741319](https://www.loc.gov/item/2017741319/)。
- 圣安东尼奥赊销服装店店主；1939 Mar.；Russell Lee；[LOC 2017739420](https://www.loc.gov/item/2017739420/)。
- 诺里斯大坝变电场，TVA公共工程；1942 June；Arthur Rothstein；[LOC 2017832651](https://www.loc.gov/item/2017832651/)。
- 福特高地公园工厂的汽车装配线；ca. 1913；Not identified in catalog record；[LOC 2011661021](https://www.loc.gov/item/2011661021/)。
- TVA诺里斯公共工程配套工人住宅区；between 1933 and 1945；Tennessee Valley Authority; photographer not identified in catalog record；[LOC 2017871885](https://www.loc.gov/item/2017871885/)。
- 新奥尔良港，Traveller号船舶装载粮食；between 1900 and 1906；Detroit Publishing Co., publisher；[LOC 2016803158](https://www.loc.gov/item/2016803158/)。
- 新奥尔良Poydras街码头装船；1943 Mar.；John Vachon；[LOC 2017850498](https://www.loc.gov/item/2017850498/)。
- 佛罗里达州彭萨科拉港码头；between 1905 and 1915；Detroit Publishing Co., publisher；[LOC 2016815340](https://www.loc.gov/item/2016815340/)。

## 2026-10-20 作者头像

尾声的HUSKYzjh头像来自作者本人GitHub公开账号，原PNG内嵌离线页并由同源托管提供，用于作者身份识别。来源、日期及SHA-256见[作者头像记录](public/assets/author/provenance.json)。头像不归入游戏源码的MIT授权。
