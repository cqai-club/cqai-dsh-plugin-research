# cqai-dsh-plugin-research · e研宝

<img src="assets/icon.svg" width="48" height="48" alt="e研宝图标：书页与放大镜" />

独立源码仓库：[cqai-club/cqai-dsh-plugin-research](https://github.com/cqai-club/cqai-dsh-plugin-research)。

这是 ebao-studio（易宝工坊）的学术研究工作台：查看四套技能的安装状态、预览技能内容，并复制调用指令到 e宝对话。v0.2.0 的 npm 包内置四套学术技能及配套文件，安装插件并重启后即可在当前 Profile 中识别，无需手动另装技能。

## 功能与前提

插件通过现有 DSH/Cordis 接口注册侧边栏和主面板 `cqai-research`。首页数字员工卡片由桌面 presentation 插件根据侧边栏标签生成。

插件为当前 Harness 的 `skills` 服务注册内置技能 provider，并读取服务发现结果。内置内容固定来自 [academic-research-skills v3.23.0](https://github.com/Imbad0202/academic-research-skills/tree/6ab4b03bf70a118a1b3ee7f3263ed9f19031061b)，包含以下四套技能及其配套文件：

| 技能 | 用途 |
| --- | --- |
| `deep-research` | 深度研究、文献综述、事实核查 |
| `academic-paper` | 论文写作与修改 |
| `academic-paper-reviewer` | 同行评审与方法审查 |
| `academic-pipeline` | 研究、写作、评审与返修编排 |

当前项目或用户技能目录中已有的同名技能优先；插件内置版本只补充尚未提供的技能，不覆盖用户文件。安装并重启后，打开工作台确认四套技能已就绪，再选择技能、复制调用指令、补充题目并发送到 e宝对话。若宿主未提供技能服务，插件会等待该服务；目录发现失败时工作台会显示未就绪，不能把这种情况当作已安装成功。

上游版本和提交固定在 npm 包中，不会在启动时自动下载或跟随上游更新。源提交为 `6ab4b03bf70a118a1b3ee7f3263ed9f19031061b`；更新内置内容需要安装后续插件版本。

## 运行要求

- Node.js `^22.19.0 || >=24.0.0`。
- DSH UI 与 Host 依赖范围为 `^0.2.0-rc.2`；插件清单使用相同范围。旧运行时不属于声明范围。
- 浏览器客户端由宿主的 `window.__ModuleLoader__` 加载。

以上是构建与依赖要求；实际桌面和市场兼容性需要安装验收。

四套技能自动识别不等于任务所需工具全部安装。需要运行分析脚本、生成文档或转换格式时，仍应按具体任务准备 Python、相应 Python 包、Pandoc 等工具，并配置模型与检索能力。上游面向 Claude 的 hooks、commands 和多代理控制不会自动映射成 DSH 能力；本插件提供技能内容和工作台入口，不承诺完整复现上游运行环境。

## 安装

这是由用户选择安装的插件。在 ebao-studio 的「插件管理 → 插件市场」选择 `CQAI Club Plugin Market`，搜索 `cqai-dsh-plugin-research` 或「e研宝」并安装，随后重启。插件会注册内置四套技能，无需再到上游项目手动安装。

从 v0.2.1 起，已安装插件列表通过随包导出的 `locale/en.json`、`locale/zh.json` 显示「e研宝」，并读取 `package.json` 的 `icon` 字段展示本地图标。已有旧版本需要更新插件并重启，npm 包名仍为 `cqai-dsh-plugin-research`。

从 v0.2.2 起，侧边栏和首页数字员工入口也直接复用 `assets/icon.svg`，构建时嵌入客户端，无需远程下载。各入口按宿主提供的尺寸显示相同的蓝色书页与放大镜图形。

也可以在 ebao-studio 的 DSH 终端中安装。以下以 `desktop` Profile 为例，其他 Profile 需要替换名称：

```bash
dsh plugin --profile desktop add cqai-dsh-plugin-research
```

本地压缩包安装方法见 [安装说明.md](安装说明.md)。

卸载插件并重启后，内置技能 provider 随插件撤销。插件不会删除项目或用户技能目录中的文件；原有同名技能仍由对应的用户或项目 provider 管理。

## 独立开发与打包

当前开发源码目录包含源码、构建配置和现有路由测试，可以独立运行；仅有 npm 安装包时应直接通过宿主安装：

```bash
npm ci --ignore-scripts
npm run check
npm run check:release
npm pack
```

`check` 依次执行类型检查、路由测试和构建。`check:release` 检查 npm 实际打包文件、Host/Client 入口、类型声明、版本一致性、DSH bundle patch 和公开 registry 配置。`npm pack` 的 `prepack` 会重新构建。

`package-lock.json` 固定开发依赖。npm 包包含编译产物、DSH 清单、Cordis patch、图标、`assets/academic-research-skills/` 下的内置技能及配套文件、文档和许可声明；源码、测试、开发脚本和市场元数据留在开发目录。技能分发范围、固定来源及许可映射见 [THIRD_PARTY.md](THIRD_PARTY.md)。

## CQAI Club Plugin Market 配置

市场由 `cqai-club-portal` 维护；ebao-studio 读取目录并安装 npm 包。

- 目录来源：`https://cqaiclub.asia/catalog-source.json`
- 公开目录：`https://cqaiclub.asia/v1/plugins`
- 管理后台：`https://cqaiclub.asia/member/dashboard/admin/plugins`
- 后台导入文件：开发目录中的 `market/cqai-club-plugin.json`（不包含在 npm 安装包中）。

后台导入文件中的 `description` 保留 Markdown 原文，市场详情页渲染标题、段落、列表、强调、行内代码和安全链接。目录接口通过协议允许的 Unicode 行分隔符传递 Markdown 换行，后台原文保持不变；详情页不会执行原始 HTML 或直接加载 Markdown 里的远程图片。

图标唯一设计源为 `assets/icon.svg`，采用 24 × 24 网格、48 × 48 默认尺寸的透明底蓝色渐变线条，与易宝工坊 imagegen 插件图标风格一致。侧边栏、首页数字员工入口和已安装插件列表使用同一个 SVG，以 data URI 展示，无需访问远程图标。市场目前仅支持光栅图片，使用由该 SVG 导出的 128 × 128 透明 PNG `assets/icon.png`，图形保持一致；两者均随 npm 包打包。后台「图标地址」需指向 PNG 原图的 HTTPS 直链，portal 会通过同域图标代理供易宝工坊读取。

先验证和发布公开 npm 包，再用有 `plugin:admin` 权限的账号在后台选择「新增插件 → JSON 快速添加」，粘贴导入文件。添加后生成草稿，点击「发布」才会进入公开目录。导入 JSON 不是 portal 的自动 seed 文件，也不会自动修改数据库。

本机 portal 的现有 SQLite 预览数据库也可以通过开发脚本配置草稿。默认只读预览；`--apply` 新增草稿，或更新尚未发布的同名草稿元数据。条目状态保持为草稿，已发布过的条目必须通过后台管理。此脚本不连接线上服务，不上架条目：

```bash
npm run configure:portal -- --portal-dir /absolute/path/to/cqai-club-portal
npm run configure:portal -- --portal-dir /absolute/path/to/cqai-club-portal --apply
```

脚本使用 portal 当前的字段校验与数据映射，并只接受 `.env.local` 指定的现有本地 SQLite 文件。

市场的 npm 安装预览会校验官方 registry 的 `latest`：必须是同名包、精确稳定版本，并包含合法 `dsh.bundle.patch`。后台元数据校验不代替这一步。正式发布前先检查：

```bash
npm whoami --registry https://registry.npmjs.org/
npm publish --dry-run --access public --registry https://registry.npmjs.org/
```

源码推送会运行 GitHub Actions 的 CI，完成类型检查、测试、构建、发行文件校验，并保存打包产物。

需要发布时，在本仓库的 Actions 中运行 `Publish npm package`，填写与 package.json 和 dsh.plugin.json 一致的稳定版本。`dry_run` 默认开启，先完成演练。正式运行需要配置有此包发布权限的 `NPM_TOKEN` 仓库 secret；仅关闭演练开关才会发布，普通源码推送不会发布 npm。

发布后用 `npm view cqai-dsh-plugin-research@latest version` 验证，再完成 portal 上架和实际安装验收。

## HTTP 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/cqai-research/catalog` | 四套技能的安装状态和上游信息 |
| GET | `/api/cqai-research/skill?name=<skill>` | 技能全文预览，最多 200,000 字符 |

接口仅接受 `127.0.0.1` / `::1` 回环请求。

## 许可与归属

插件代码采用 [MIT](LICENSE)。随包分发的技能及配套内容来自 Cheng-I Wu 的 [academic-research-skills](https://github.com/Imbad0202/academic-research-skills/tree/6ab4b03bf70a118a1b3ee7f3263ed9f19031061b)，固定为 v3.23.0 / `6ab4b03bf70a118a1b3ee7f3263ed9f19031061b`，采用 CC-BY-NC-4.0；其内容和版权归原作者所有。

内置文件保留上游版权、NOTICE 与 CITATION 信息。具体目录、许可映射和分发说明见 [THIRD_PARTY.md](THIRD_PARTY.md)。npm 包整体的许可表达式为 `(MIT AND CC-BY-NC-4.0)`：插件代码的 MIT 许可不替代技能内容的许可，使用和再分发附带内容时需遵守上游署名、非商业使用及其他许可要求。
