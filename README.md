# 中马-12组汇报

**科学技术是缓和还是加剧了资本主义基本矛盾？**

结合当代科技发展与资本主义新变化的组内汇报项目。仓库已公开，任何人均可通过链接查看、克隆和下载，无需先接受邀请。组员通过分支与PR修改源码；直接向本仓库推送分支仍需协作者权限。

[协作方法](CONTRIBUTING.md) · [章节分工](协作/分工表.md) · [修改任务](https://github.com/HUSKYzjh/marx-12-group-report/issues) · [成品与项目包](https://github.com/HUSKYzjh/marx-12-group-report/releases)

[阅读与审阅安排](协作/阅读与审阅材料/README.md)提供小组日程与工作说明、视频选材建议，以及含七篇文字稿的下载包。

[在线试玩《饥馑的盛宴》](https://zjh-d0ginayd0c9cbf350-1345006689.tcloudbaseapp.com/) · [二维码与手绘分享卡](游戏/分享/README.md) · [游戏源码与离线包](游戏/README.md)。线上版本供小范围试玩，首次可能出现腾讯云访问提示。

<a href="https://zjh-d0ginayd0c9cbf350-1345006689.tcloudbaseapp.com/"><img src="游戏/分享/试玩二维码-面包工坊群像.png" width="324" alt="饥馑的盛宴面包工坊群像二维码，扫码打开游戏"></a>

本项目用于约30分钟的课程汇报。最新成品为36页，2026-10-13完成d8逻辑链修订；2026-10-14整理可交接项目包。

[打开最新PPT](成品/科学技术与资本主义基本矛盾-古罗马斗兽场-信息深化与图形重绘版.pptx) · [逐页提纲](汇报提纲-每页一个重点.md) · [讲稿](共用讲稿.md) · [论证逻辑](论证逻辑与章节衔接.md) · [项目规则](AGENTS.md)

## 先读与先看

1. 阅读`AGENTS.md`，了解已经确定的论证、主题和用户偏好。
2. 看`成品/信息深化-全页预览.jpg`与最新PPT，再读`论证逻辑与章节衔接.md`。
3. 按需要查`资料/`的数据口径，以及`B站文字稿/文字稿索引.md`的观点出处。
4. 继续编辑时先定位源文件。`内容与来源.json`和Markdown讲稿是导出的交付文件，不是全部页面的生成源。

## 组内共同修改

大家通过Codex或GitHub修改源码，采用“认领页面 → 各自分支 → PR核对 → 合并后统一发布”的流程。先看[协作说明](CONTRIBUTING.md)和[章节分工表](协作/分工表.md)。仓库根目录已有Git忽略规则、Issue模板和PR模板。

普通内容修改以实际源码为准；`main`可能包含尚未发布的内容，当前PPT仍以最近一次发布为准。正式成品、导出讲稿和预览由整合负责人统一更新。本仓库基于已核验的协作包建立；后续直接克隆仓库，在各自分支继续修改。

## 包内结构

```text
AGENTS.md                         项目规则与用户偏好
README.md                         本说明
成品/                             最新PPT、36页预览及重点缩略图
游戏/                             饥馑的盛宴页游、源码与离线试玩包
.build/                           当前必要源码、输入数据和构建工具
资料/                             原始数据、CSV、来源材料与口径说明
素材/                             当前使用的三张斗兽场背景及生成记录
B站文字稿/                        7份视频文字稿、SRT、元数据及已有术语修订
背景论文/                         最新论文源稿与现有PDF，作为背景材料
验收/                             d8原验收、构建环境与交接验证记录
内容与来源.json                   当前交付内容与51项来源
共用讲稿.md                       与当前36页对应
汇报提纲-每页一个重点.md
逐页内容方案.md
论证逻辑与章节衔接.md
参考资料-信息深化与图形重绘版.md
runtime.example.json              换电脑时的可选路径配置模板
MANIFEST.sha256                   交接快照的逐文件校验值
verify_package.py                 使用Python标准库核对交接文件
```

项目包不包含历史PPT、旧版构建、缓存、node_modules、浏览器会话和音视频下载。背景论文中的旧Markdown未收录，避免它覆盖较新的TeX稿。文字稿保留机器转写及术语修订的原有标记。

## 直接改成品

用PowerPoint打开PPT即可修改文字、形状、连线和9张原生图表。背景插画是图片。若只在PowerPoint中修改，另存副本并记录改动；之后从脚本重建会以源码为准，不会自动吸收手工修改。

## 从源码继续修改

需要Node.js、Python及Codex提供的演示文稿运行库。当前基线使用`@oai/artifact-tool 2.8.93`、`@napi-rs/canvas`和Pillow，运行库版本为`26.1011.11113`。`@oai/artifact-tool`是随Codex提供的依赖，不能把普通的npm安装当成完整替代；这些软件不随项目包分发。

字体使用Microsoft YaHei、SimSun和Georgia。其他系统缺少这些字体时，须配置可用字体并重新检查分页、换行和显示效果，不能声称版式与本机完全一致。

在Codex中先调用`load_workspace_dependencies`定位本机运行环境。脚本会自动查找当前用户目录下的常见Codex安装位置，也可复制`runtime.example.json`为`runtime.local.json`，填写实际路径。`dependencies`是依赖根目录；`helpers`是演示文稿的`container_tools`目录。其余可选键未使用时删除，不要保留示例占位文字。若Python或Node不在PATH中，使用工具返回的可执行文件完整路径调用。

在项目根目录执行：

```powershell
python .build/project.py doctor
python .build/project.py build --revision d9
```

第二条命令生成`.build/roman-structure-d9/`，包含待交付PPT、36张PNG、缩略图、图表核对、文本边界和包结构检查。它不覆盖正式成品。构建编号已存在时请选择新编号。

修改位置：

| 修改对象 | 源文件 |
| --- | --- |
| 背景、尺寸、字体、整体导出 | `.build/dense-layout.mjs` |
| 六节主线、章节文字、过渡、讲稿补充 | `.build/logic-content.mjs` |
| 六张章节导图和结论图 | `.build/logic-pages.mjs` |
| 大部分信息深化页 | `.build/dense-pages.mjs` |
| 其余页 | `.build/restructure-pages.mjs`、`.build/information-pages.mjs` |
| 页序、基础备注、引用 | `.build/dense-content.json` |
| 图表数值 | `.build/dense-charts.json`，同时核对`资料/` |

渲染优先级为logic、dense、restructure、information；后面的模块只在前面没有处理该页时生效。最后一个模块用旧页码`legacy_page`匹配。先搜索当前页面标题，再确认哪个模块实际生效。

## 检查后更新成品

查看新构建的`预览/`、`全页预览.jpg`和`audit.json`。根据真实检查结果创建同目录的`visual-review.json`，例如：

```json
{
  "passed": true,
  "sha256": "填写同目录audit.json中的sha256",
  "checked_pages": [2, 8, 13, 19, 23, 29, 33],
  "checked": ["填写实际查看的版式、文字、连线与图表检查"],
  "native_powerpoint_tested": false
}
```

这份文件记录检查结果，不会替你执行视觉检查。页码按本次实际检查填写；结构检查通过也不等于已完成PowerPoint播放验收。

然后执行：

```powershell
python .build/project.py deliver --revision d9
```

交付命令先在`制作/交付前-时间戳/`备份现有PPT与主要文稿，再更新最新PPT、逐页预览、内容与来源、提纲、讲稿、逐页方案和参考资料。独立的章节预览图可从相应新页重新组合。改页数时还需要更新`review-dense.py`与`deliver-dense.py`的页数和图表位置预期。

本次验证曾在Windows沙箱中遇到`fs.promises.realpath`返回`EPERM`，而普通文件读取正常；通过工具批准的本地执行完成了重建。若出现相同问题，可在普通本机终端执行相同命令，或使用Codex的执行授权机制，不需要改动文稿或关闭系统安全功能。

## 校验与继续任务示例

在解压后的项目根目录运行`python verify_package.py`，核对交接文件是否完整。校验用于最初交接快照，编辑后出现哈希变化是正常的。环境重建验证的范围见`验收/交接验证.json`。

给接手对话的指令可写为：

> 请先阅读AGENTS.md、README.md和论证逻辑与章节衔接.md，以成品目录中的最新PPT为准。保持古罗马斗兽场主题和约30分钟结构，按我的新要求修改真实源文件；重建后核对数据并查看受影响页面，再同步PPT、讲稿、提纲及来源。

交接包保留当前成品，不因重建测试而替换它。主要事实和来源沿用原稿时间口径，打包日期不表示已重新检索所有新闻或数据。
