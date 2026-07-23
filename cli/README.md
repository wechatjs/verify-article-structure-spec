# verify-article-structure-cli

基于 **puppeteer 真实浏览器**的文章结构检测 CLI，对指定 HTML 文件或线上文章 URL 跑引擎**全规则**校验（含布局类规则 `height-nodisplay` / `width` 差异 / `height-zero` / `line-height` 实测叠字 / `checkChildHeightOverflow`），并输出违规结果；`dedupe` 还能清理冗余嵌套。

本子目录**自包含**：自带 `package.json` 显式声明 `puppeteer` / `esbuild` / `tsx` 等依赖，可独立 `pnpm install`。它就位于 `verify-article-structure-spec` 仓内，直接复用本仓的 `cases.config.js` 与 `__tests__/fixtures/` 作为回归用例。

## 为什么保留 puppeteer(不去浏览器化)

引擎 `verifyArticleStructure` 的布局类规则强依赖 `getBoundingClientRect` / `offsetHeight` / `getComputedStyle` 的真实浏览器测量，jsdom 等无头 DOM 方案做不了布局，只能跑收集阶段规则，对一个「样式检测工具」是硬伤。因此本 CLI 以 puppeteer 为正解，跑全规则。

## 安装

```bash
cd cli
pnpm install --ignore-workspace   # 或 npm install
```

### puppeteer Chromium 安装

`pnpm install` 时 puppeteer 会自动下载对应版本的 Chromium 到本地缓存（`~/.cache/puppeteer`），首次安装需要联网下载（约几百 MB）。

**CI / 受限网络环境**：若 Chromium 自动下载失败，可跳过下载并使用系统已安装的 Chromium：

```bash
# 1. 跳过 puppeteer 自带 Chromium 下载
PUPPETEER_SKIP_DOWNLOAD=true pnpm install

# 2. 指定系统 Chromium 路径运行
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome pnpm check ./article.html
```

`browser-runner.ts` 会读取 `process.env.PUPPETEER_EXECUTABLE_PATH` 作为 `executablePath`（未设置则用 puppeteer 自带 Chromium）。

## 使用

在 `cli/` 目录执行（`pnpm check` = `check` 检测，`pnpm dedupe` = `dedupe` 清理冗余嵌套）：

```bash
cd cli

# 检测本地 HTML 文件
pnpm check ./path/to/article.html

# 检测线上文章 URL（截取 #js_content innerHTML）

# 输出结构化 JSON
pnpm check ./article.html --json

# 清理冗余嵌套并输出清理后的 HTML
pnpm dedupe ./article.html --out=./cleaned.html
```

也可以用 tsx 直接跑源码：

```bash
cd cli
pnpm check ./article.html
```

### 参数

```
Usage: pnpm check <file.html> [options]   # check

位置参数：
  file              HTML 文件路径（必填）

选项：
  --json            输出结构化 JSON
  --executable-path=<path>  指定 Chromium 可执行文件路径（同 PUPPETEER_EXECUTABLE_PATH）
  -h, --help        帮助
```

### 退出码

| 场景 | 退出码 |
|------|--------|
| 检测通过（无违规） | 0 |
| 检测到违规 | 1 |
| 执行异常（puppeteer 启动失败 / 抓取失败等） | 2 |

## dedupe —— 冗余嵌套清理

`dedupe` 是 `check` 的姊妹能力：check 报「哪里有冗余嵌套」，clean 直接「把冗余嵌套层真删掉」并输出清理后的 HTML。两者组合形成「检测 → 清理 → 复测清零」闭环。

### 机制

clean 读 HTML → **jsdom** 解析成 DOM（中间态）→ `domToAst` 转成**可变 AST**（节点结构对齐 UE.uNode）→ `deleteNestNode({ isNeedDelete: true })` 在 AST 上跑真删 → `stripNestLevelAnnotations` 去掉检测标注 → `astToHtml` 序列化回 HTML → 输出。

关键纠偏：`check` 的 `runVerify` 用 `container.innerHTML = html` 在**真实 DOM** 上跑 `deleteNestNode`，而 `isNeedDelete` 真删分支的 4 处赋值（`currentNode.parentNode = ...` / `children[0] = ...`）在真实 DOM 上是 no-op（`parentNode` 只读、`children` 是 live HTMLCollection）。clean 的正解是把 HTML 转成**可变 AST**（普通 JS 对象树，`parentNode` / `children` 都是可写属性）再调真删，让那 4 处赋值真正生效。

### 为什么用 jsdom 而非 puppeteer

`deleteNestNode` 真删是**纯树操作**——只读 `tagName` / `style` 属性 / `.children` 结构，不碰 `getComputedStyle` / `offsetHeight` / `getBoundingClientRect`。clean 不需要布局测量，jsdom（纯 Node，无 Chromium 进程）足够且更轻（启动快、CI 友好、无 Chromium 下载依赖）。`check` 必须用 puppeteer 是因为它要跑布局类规则，clean 不背这个包袱。

唯一用 puppeteer 的场景是 `--verify` 复测 nestNodes 数——因为复测要走 `check` 的完整检测链路（含布局规则判定 nestNodes），必须真实浏览器。默认 clean 不开 `--verify` 就不启 Chromium。

### round-trip 保真

对已经干净（无冗余嵌套）的 HTML，clean 输出与输入**语义等价**：`<p>普通段落</p>` 进、`<p>普通段落</p>` 出。可接受的归一：属性引号统一双引号、void 元素统一 `<br/>` 自闭合（HTML 等价）。clean **不做** UE `isText` 的多空格压缩，仅做 `& <>` 转义，避免改变可见空白。

### 使用

在 `cli/` 目录执行（`pnpm dedupe` = `dedupe`）：

```bash
cd cli

# 清理本地 HTML 文件，结果写 stdout
pnpm dedupe ./path/to/article.html

# 清理后写入指定文件
pnpm dedupe ./article.html --out=./cleaned.html

# 抓取线上文章并清理

# 清理并复测 before/after nestNodes 数（走 puppeteer）
pnpm dedupe ./article.html --out=./cleaned.html --verify
```

### 参数

```
Usage: pnpm dedupe <file.html> [options]   # dedupe

位置参数：
  file              HTML 文件路径（必填）

选项：
  --out=<path>      清理后 HTML 写入指定文件（默认写 stdout）
  --verify          额外用 puppeteer 跑 before/after nestNodes 数，打印到 stderr
  -h, --help        帮助
```

### 退出码

| 场景 | 退出码 |
|------|--------|
| 清理成功（clean 不区分违规/合规，总是输出清理结果） | 0 |
| 执行异常（读取来源失败 / jsdom 解析失败 / 抓取失败等） | 2 |

> `--verify` 的 before/after 信息走 **stderr**，保证 stdout 是纯 HTML（可 `pnpm dedupe f.html --verify > out.html` 重定向）。

### 与 check 的关系

| 维度 | `check` | `dedupe` |
|---|---|---|
| 职责 | 检测样式违规（puppeteer 跑全规则，含布局类） | 真删冗余嵌套层，输出清理后 HTML |
| deleteNestNode 模式 | `isTest: true`（干跑只检测） | `isNeedDelete: true`（真删，改 AST 结构） |
| 跑在哪 | 真实 DOM（`innerHTML` 建容器） | 可变 AST（DOM→AST 转换） |
| 浏览器 | puppeteer（必需，跑布局规则） | jsdom（默认）；puppeteer（仅 `--verify`） |
| 退出码 | 0 无违规 / 1 有违规 / 2 异常 | 0 成功 / 2 异常 |

## 探针（probe）

`src/probe.ts` 是最小可行性探针，验证 puppeteer 注入 esbuild browser bundle 后能在给定 HTML 上跑通完整规则（含布局类）。apply 阶段第一步先跑探针，通过后才铺开 CLI 主体。

```bash
cd cli
pnpm probe
```

## 引擎源码归属 / 可开源策略

本 CLI 是**自包含**的：检测引擎已 vendor 进 `cli/engine/`（TypeScript），不再通过相对路径引用父级 engine 包的 `src/` 或 `dist/`。`src/bundle-loader.ts` 的 esbuild entry 直接指向 `engine/index.ts`，产物落到 `cli/dist/`。因此把 `cli/` 单独抽成开源仓库即可跑，无需连带父级 engine 包。

### engine/ 是 CLI 的独立真理源

`cli/engine/` 是本 CLI 自带的检测引擎（TypeScript），按检测职责重新划分模块（`rules/` 每规则一文件、`collect.ts` / `layout.ts` / `paragraph.ts` / `nest.ts` / `dom.ts` / `darkmode.ts` / `types.ts`）。它是 CLI 的独立真理源，不再依赖任何外部 engine 包；行为正确性由本仓 `cases.config.js` 的 badcases/goodcases 回归用例保障。

> `cli/engine/` 做过**从零重写**：丢弃了原 JS 怪癖（`__lhFallbackPush` monkey-patch、`overflowOnly` 魔法字段、`redundantNodeResult` 死代码等），结构与检测职责对齐。

### darkmode 换包

`cli/engine/darkmode.ts` 不再 vendor 55KB 的 minified UMD bundle，改用 npm 开源包 `mp-darkmode@1.2.2` 做暗色转换。vanilla 包仅导出 `run` / `init` / `getContrast` / `convertBg` / `extend` / `updateStyle`，引擎专用的 `reset`（清节点标记 + init 状态）与 `validate`（收集 darkmode 违规：低对比度 / 渐变背景 / 白名单属性）由引擎自身重写实现。darkmode 维度无 spec 回归用例覆盖，正确性靠与原 bundle 的人工对照（已验证 whitelist/contrast/mixed/clean 四类样本 byte-identical）。

### 注释规范

`cli/engine/` 与 `cli/src/` 的代码注释统一用**简短英文**（一行说清意图）。引擎内的规则文案字符串（`rule` / `message` / `rules` 字面量）保持原中文不变——它们是检测输出的一部分，改动会改变行为契约。CLI 面向用户的 stdout 输出（HELP 文本、人类可读结果、错误提示）也保持中文。

## 测试

```bash
cd cli
pnpm test              # behavior 回归 + cli E2E + clean E2E 全跑
pnpm test:behavior     # badcases/goodcases 行为回归(本仓 cases.config.js + fixtures)
pnpm test:e2e          # cli 5 个 E2E（违规/干净/--json/--help/缺来源）
pnpm probe             # 最小可行性探针
```

`tests/behavior/regression.test.ts` 是 vendor + 重构的行为安全网：用 puppeteer 注入 cli vendor bundle，对本仓 `cases.config.js` 的每个 badcase/goodcase fixture 跑检测，断言 `Object.keys(inValidInfo) ⊇ expectInvalidKeys`（badcase）或 `isValid === true`（goodcase）。refactor 前后都必须全过。

## 架构

```
cli/
├── package.json              # 自包含依赖（puppeteer / esbuild / tsx / vitest）
├── tsconfig.json             # NodeNext / ESM / strict；include engine/**/*.ts
├── vitest.config.js
├── README.md
├── .gitignore
├── engine/                   # 引擎检测逻辑（cli 独立真理源，从零重写的 TS）
│   ├── index.ts              # verifyArticleStructure 入口编排
│   ├── types.ts              # 收紧的类型定义
│   ├── rules-text.ts         # 规则文案字面量（产品文案，逐字保留）
│   ├── paragraph.ts          # 段落切分（原 get_para_list）
│   ├── nest.ts               # 嵌套检测（deleteNestNode isTest 模式）
│   ├── dom.ts                # isMarkNode / specialTags / isEmptyParagraph
│   ├── collect.ts            # 收集阶段：段落 BFS + 调各规则 checker
│   ├── layout.ts             # 布局阶段：sandbox 多屏测量 + width/line-height/pre/height 判定
│   ├── darkmode.ts           # mp-darkmode 包转换 + 引擎自实现 reset/validate
│   └── rules/                # 每规则一个纯函数文件 + 共享 helpers
│       ├── font-family.ts / opacity.ts / caret-color.ts / line-height.ts
│       ├── width.ts / text-align.ts / animate-begin.ts / height-zero.ts / pre.ts
│       ├── helpers.ts        # getInlineStyleValue / isTransparentRgba
│       ├── types.ts          # RuleContext / RuleCandidate
│       └── index.ts          # barrel
├── src/                      # CLI 外壳（重构 TS，行为不变）
│   ├── index.ts              # check 入口：参数解析 + 主流程 + 退出码
│   ├── clean.ts              # dedupe 入口：参数解析 + 清理流程 + 退出码
│   ├── clean-runner.ts       # jsdom parse → domToAst → deleteNestNode 真删 → astToHtml
│   ├── ast/                  # DOM↔AST 转换 / 序列化（对齐 UE.uNode 结构）
│   │   ├── ast-convert.ts    # jsdom Node → 可变 AstNode（挂 parentNode 双向链）
│   │   └── ast-serialize.ts  # AstNode → HTML（void 自闭合 + 转义 + 去 data-nest-level）
│   ├── types/jsdom.d.ts      # jsdom 最小类型声明（包无自带 .d.ts）
│   ├── browser-runner.ts     # puppeteer launch + 注入 bundle + 建游离 div + evaluate
│   ├── bundle-loader.ts      # esbuild 打包 engine/index.ts → cli/dist/
│   ├── fetch-article.ts      # URL 抓取（截取 #js_content innerHTML）
│   ├── result-formatter.ts   # 人类可读 + --json
│   └── probe.ts              # 最小可行性探针
├── tests/
│   ├── cli.test.ts           # check E2E 测试（5 个）
│   ├── clean.test.ts         # dedupe E2E 测试（7 个）
│   ├── behavior/regression.test.ts  # badcases/goodcases 行为回归
│   └── fixtures/
└── dist/                     # esbuild 产物（自建，不再读 ../dist）
```
