# 组内协作：按页认领，分支修改，合并后统一出片

本项目采用源码协作。每位同学在自己的分支修改源码和资料，通过Pull Request（PR，合并请求）汇总。`main`保存已经合并的源码，`成品/`保存最近一次正式发布；两者之间可能有尚未发布的修改，以发布记录说明为准。

## 第一次加入

1. 本项目仓库为[HUSKYzjh/zhongma-12-group-report](https://github.com/HUSKYzjh/zhongma-12-group-report)，中文名称“中马-12组汇报”。仓库已公开，查看、克隆和下载无需协作者邀请；以含`AGENTS.md`、`.build/`和本文件的目录为工作根目录。
2. 若需直接向本仓库推送分支，由所有者在`Settings → Collaborators → Add people`邀请同学；同学登录并接受邀请后获得协作权限。未获写入权限的用户也可以在自己的fork中修改，再提出PR。[官方说明](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/inviting-collaborators-to-a-personal-repository)
3. 每人克隆到自己的工作目录，再让Codex打开该目录，依次阅读`AGENTS.md`、本文件和`README.md`。
4. 使用README的依赖说明运行`python .build/project.py doctor`。当前生成器需要Codex自带运行库；只有GitHub网页或普通Node.js环境时，可以修改文本源码和补资料，渲染交给有完整环境的同学，并在PR中说明。

首次克隆可直接执行：

```powershell
git clone https://github.com/HUSKYzjh/zhongma-12-group-report.git
Set-Location zhongma-12-group-report
```

不要把GitHub登录凭据写入项目文件。`runtime.local.json`是各自的本机配置，已加入忽略规则。

## 认领修改范围

按[分工表](协作/分工表.md)选择章节，在Issue中记录“页码＋页面标题＋本次目标＋涉及的文件”，指定实际负责人。一个Issue解决一个明确的问题，例如“第3页补齐苹果成本口径”，而不是“全面优化PPT”。

页码用于当前36页基线；插页或调序后，以标题和源码定位为准。多人可以改不同页面，但若落在同一函数或数据项，应先在Issue里分清范围，或等待上一项合并。

## 每次修改

以下命令以`main`为默认分支；仓库实际默认分支不同时相应替换。先提交或保存当前工作，不使用强制重置清空别人的改动。

```powershell
git switch main
git pull --ff-only
git switch -c codex/姓名缩写-章节-任务
python .build/project.py doctor
```

分支名和构建编号使用英文字母、数字及连字符，例如`codex/ly-s03-apple-cost`与`ly-s03-apple-01`。在GitHub网页编辑文件时，也选择新建分支并提交PR。

修改真实输入与布局源，文件对应关系见README。`共用讲稿.md`、`汇报提纲-每页一个重点.md`和`内容与来源.json`是导出文件；要改讲稿或引用，应同步修改实际生效的源数据。若先写讨论稿，放在`协作/讨论稿/`，并在Issue中标明它尚未进入正式源码。

避免全文件格式化、无关改名或整篇重写。多个页面共用`.build/dense-pages.mjs`等文件，任务虽分属不同章节，Git仍可能发生冲突。主题、字体、页序和公共函数由一个任务集中调整。

完成源码修改后，在本地执行：

```powershell
python .build/project.py build --revision ly-s03-apple-01
git diff --stat
git diff
```

查看本次构建的`audit.json`及受影响页面预览。数据变化要核对来源、年份、单位和统计范围；布局变化要查看文字、连线、图例和页脚。没有运行或查看的检查如实写“未执行”。

只暂存本次涉及的文件，再提交和推送自己的分支。在Codex中可直接要求它“检查差异，仅提交本次修改并创建草稿PR”。实际仓库发布和通知仍按用户的具体指令执行。

## PR如何交接

仓库已经提供PR模板。写清修改后的观点、受影响页码、来源及实际验证结果；把相关页面预览附到PR，或提供组员可访问的预览位置。只有本机绝对路径的图片，其他同学无法打开。

普通内容PR提交源码、必要资料及相关协作说明；不运行`deliver`后提交整套生成物，也不夹带本地缓存。这样能减少成品、讲稿和图片在多个分支间同时变化。需要的预览放在PR中供核对。正式发布由整合负责人处理。

建议每个PR至少由另一位同学查看观点与页面效果，再由整合负责人合并。这是组内协作约定；GitHub Free支持为公开仓库设置受保护分支，所有者可按需要配置强制审查。本文的约定本身不表示已启用这些设置。[官方说明](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)

若两个PR改到同一处，在任务分支合并最新`main`后逐项处理冲突，再重新检查受影响页面。不要用“全部采用我的版本”覆盖另一项内容；保留有效改动并确认章节衔接。

## 合并后统一发布

整合负责人可以轮换。其职责是核对合并后的整体逻辑和成品，而不是包办所有章节。

1. 从最新`main`建立如`codex/release-d9`的发布分支。确认本轮要发布的内容PR已合并。
2. 执行`python .build/project.py build --revision release-d9`，检查组合后的页面，尤其是章节过渡、结论和新增引用。
3. 按README填写真实的`visual-review.json`，再执行`python .build/project.py deliver --revision release-d9`。脚本会先备份本机旧成品。
4. 发布PR集中提交最新PPT、导出讲稿、提纲、来源和预览。说明对应源码提交与验证范围；合并后标记版本，并把PPT和完整交接ZIP附到同一GitHub Release。

`MANIFEST.sha256`只对应某次交接快照，不是日常开发的测试。编辑后哈希变化是正常现象；重新打包时按本次文件重新生成清单，别为了通过旧清单而回退有效修改。原有`验收/`记录是历史基线，不证明后来的PR已检查。

本仓库没有配置云端PPT渲染。GitHub的普通托管环境不自动具备项目所需的Codex运行库；初期采用本地构建、PR附预览即可。

## 让Codex接手的指令

> 请先阅读AGENTS.md、CONTRIBUTING.md和README.md。我负责Issue中的指定页面，目标是【本次目标】。在独立分支修改实际生效的源码与必要资料，保持古罗马斗兽场主题和六节主线，避免无关格式化。构建并检查受影响页面；没有条件完成的检查如实记录。普通内容PR不更新正式成品。完成后说明改动、来源、验证与衔接影响。

## Git忽略与文件格式

`.build/`同时包含必要源码和临时输出，不能整体忽略。现有`.gitignore`采用必要源码名单；新增模块时，把它加入名单并在PR中说明。`node_modules`、各次临时构建、自动备份、图表缓存及本机配置均不提交。

`.gitattributes`保留文件原始换行字节，便于核对交接快照，并将PPT、PDF和图片标记为二进制。新增文本文件使用UTF-8。PPT本身不适合像文本源码那样逐行合并，因此集中发布。
