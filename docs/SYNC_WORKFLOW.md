# 三仓协作与同步流程

> 本文描述 `verify-article-structure-spec`（规范仓） / `verify-article-structure-engine`（引擎包） / `mmbizwebnew/web-webapp-common`（主仓真理源） 三者之间的关系、同步方向与 Agent 自动化修复流程。

---

## 1. 三仓定位

| 仓 / 包 | 角色 | 真理源? | 是否对外开源 | Agent 是否进入 |
| --- | --- | --- | --- | --- |
| `mmbizwebnew/packages/web-webapp-common/js/verify_article_structure.js` | **检测逻辑唯一真理源** | ✅ 是 | ❌ 否（私有大仓） | ✅ 是（修复目标） |
| `packages/verify-article-structure-engine` | **只读测试沙箱** + 浏览器 bundle 制品 | ❌ 派生制品 | ❌ 否（私有 npm 包） | ✅ 是（跑测试） |
| `packages/verify-article-structure-spec` | 规范文档 + bad/good cases + 反馈通道 | ✅ 是（针对规范） | ✅ 是（开源） | ✅ 是（接收 Issue） |

**核心原则**：检测逻辑只在主仓有一份，engine 包是单向同步出来的镜像，**禁止**在 engine 包 `src/` 下手动改代码。

---

## 2. 同步方向（单向：main → engine）

```mermaid
flowchart LR
    subgraph MAIN["mmbizwebnew 主仓 （真理源）"]
        SRC["packages/web-webapp-common/js/<br/>verify_article_structure.js"]
    end

    subgraph ENGINE["verify-article-structure-engine 引擎包"]
        SYNC["scripts/forward-sync.js"]
        DST["src/verify_article_structure.js<br/>（AUTO-GENERATED，禁手改）"]
        TEST["__tests__ <br/>vitest + puppeteer"]
        BUNDLE["dist/verify_article_structure.browser.js<br/>（esbuild 产物）"]
    end

    subgraph SPEC["verify-article-structure-spec 规范仓 （开源）"]
        MD["verify_article_structure.md<br/>（规范权威源）"]
        FIXTURES["__tests__/fixtures/<br/>badcases + goodcases"]
        ISSUES[["GitHub/GitLab Issues"]]
    end

    SRC -- "forward-sync<br/>（替换 require 路径 + 加 banner）" --> DST
    DST --> TEST
    DST --> BUNDLE
    BUNDLE --> TEST
    FIXTURES -. "通过 sync-source.js<br/>同步到 engine 测试" .-> TEST
    MD -. "权威规范，被 engine 测试报告引用 desc" .-> TEST
    ISSUES -. "用户反馈触发" .-> AGENT[/"Agent 自动化修复流程<br/>（见第 4 节）"/]

    classDef truth fill:#d4edda,stroke:#28a745,color:#155724
    classDef derived fill:#fff3cd,stroke:#ffc107,color:#856404
    classDef opensrc fill:#cce5ff,stroke:#007bff,color:#004085

    class SRC,MD truth
    class DST,BUNDLE derived
    class FIXTURES,ISSUES opensrc
```

### 操作命令

```bash
# 在 engine 包下执行
cd packages/verify-article-structure-engine
npm run sync:from-main          # 单向同步主仓 → engine
npm run test:unit               # 跑 vitest 单测（jsdom）
npm run test:integration        # 跑 puppeteer 真实浏览器集成测试
```

### `forward-sync.js` 做的事

1. 读取主仓 `web-webapp-common/js/verify_article_structure.js`
2. 仅在文件头前 30 行内做 `require` 路径替换：
    - 丢弃主仓未使用的 require：`constant` / `utils` / `wxgspeedsdk`
    - `@tencent/mp-common-utils/dist/get_para_list` → `./get_para_list`
    - `web-webapp-common/js/domUtils.js` → `./lib/dom_utils`
    - `web-webapp-common/js/editor_filter.js` → `./editor_filter`
    - `web-webapp-common/js/darkmode.js` → `./darkmode`
    - 移除未使用的 `deleteRedundantNode` 解构
    - `let getParaList` → `const getParaList`（风格统一）
3. 在 engine 文件顶部插入 `AUTO-GENERATED` 警示 banner（含同步时间戳）
4. 校验头部是否还有主仓路径残留，若有则非零退出（保护机制）

---

## 3. 各角色生命周期

```mermaid
sequenceDiagram
    autonumber
    participant Dev as 开发者
    participant Main as 主仓 web-webapp-common
    participant Sync as forward-sync.js
    participant Engine as engine 包 src/
    participant Vitest as vitest 单测
    participant Pup as puppeteer 集成测试

    Dev->>Main: 修改 verify_article_structure.js
    Dev->>Sync: cd engine && npm run sync:from-main
    Sync->>Main: 读取最新源
    Sync->>Sync: 转换 require 路径 + 加 banner
    Sync->>Engine: 写入 src/verify_article_structure.js
    Sync-->>Dev: ✅ 同步完成 + 替换报告

    Dev->>Vitest: npm run test:unit
    Vitest->>Engine: require(src/verify_article_structure)
    Vitest-->>Dev: ✓ 7 passed | 1 skipped

    Dev->>Pup: npm run test:integration
    Pup->>Engine: 加载 dist/*.browser.js
    Pup-->>Dev: 各 fixture 报告对比
```

---

## 4. Agent 自动修复闭环（spec Issue → Agent → main → engine 测试 → MR）

```mermaid
flowchart TB
    A["用户在 spec 仓提 Issue<br/>label: agent / rule-feedback"] -->|webhook| B[".github/workflows/<br/>agent-trigger.yml"]
    B --> C[Agent 拉取 mmbizwebnew 主仓<br/>checkout 工作分支]
    C --> D["Agent 在主仓修改<br/>web-webapp-common/js/verify_article_structure.js"]
    D --> E["在 engine 包跑 sync:from-main"]
    E --> F["engine 包 vitest 单测"]
    F -->|失败| D
    F -->|通过| G["engine 包 puppeteer 集成测试"]
    G -->|失败| D
    G -->|通过| H["在 mmbizwebnew 主仓提 MR<br/>关联 spec 仓 Issue"]
    H --> I[人工 Code Review]
    I --> J[合入主仓]
    J --> K["主仓 CI hook<br/>npm run sync:from-main<br/>提交 engine 包 PR"]
    K --> L[engine 包合入<br/>对外发布新版本]

    classDef agent fill:#e7d4f7,stroke:#6f42c1
    classDef testing fill:#fff3cd,stroke:#ffc107
    classDef human fill:#f8d7da,stroke:#dc3545

    class C,D,E agent
    class F,G testing
    class I human
```

**关键说明**：
- Agent **直接改主仓**（真理源），不在 engine 包 `src/` 下做修改
- engine 包是**轻量测试沙箱**——秒级跑 vitest，不需要拉起 mmbizwebnew 完整 CI
- 修复有效性以"engine 包测试通过"为门槛，再走主仓 MR 评审
- 主仓合入后，CI hook 自动 sync 一次到 engine 包并提同步 PR，保证两边永远一致

---

## 5. 文件结构对照

```
mmbizwebnew/
├── packages/
│   ├── web-webapp-common/js/
│   │   └── verify_article_structure.js     ← 真理源（开发者/Agent 改这里）
│   ├── verify-article-structure-engine/
│   │   ├── src/
│   │   │   └── verify_article_structure.js ← AUTO-GENERATED（禁手改）
│   │   ├── scripts/
│   │   │   ├── forward-sync.js             ← 单向同步脚本
│   │   │   └── build-browser.js            ← esbuild 打包产物
│   │   ├── __tests__/                      ← vitest + puppeteer
│   │   └── package.json                    ← npm run sync:from-main
│   └── verify-article-structure-spec/
│       ├── verify_article_structure.md     ← 规范权威源（desc 引用编号一致）
│       ├── __tests__/fixtures/             ← bad/good cases
│       ├── docs/
│       │   └── SYNC_WORKFLOW.md            ← 本文档
│       ├── DESIGN.md                       ← spec 包总体设计
│       └── .github/workflows/
│           └── agent-trigger.yml           ← Issue → Agent 触发
```

---

## 6. 设计权衡：为什么是单向？

历史方案曾考虑双向同步（spec/engine 也能反向回写主仓），最终放弃，原因：

| 方案 | 优点 | 缺点 | 结论 |
| --- | --- | --- | --- |
| 双向同步 | engine 也能直接改 | 双真理源，团队撞车；require 反向映射易错；失去"分离"意义 | ❌ 弃用 |
| **单向同步（当前）** | 真理源唯一；engine 是只读派生制品；Agent 改主仓更安全 | engine 临时调试需要先改主仓再 sync | ✅ 采用 |

**根本逻辑**：engine 包的核心价值是"**消费方**"——用于跑测试、对外提供 npm 制品、给 Agent 一个轻量沙箱，它从来不应该是"**生产方**"。

---

## 7. 兜底与防误改

- engine 包 `src/verify_article_structure.js` 顶部有 `AUTO-GENERATED` banner，明确警示
- `forward-sync.js` 末尾有路径残留校验，规则缺漏时非零退出
- 推荐在 engine 包加 husky pre-commit hook，禁止直接 commit `src/verify_article_structure.js`（仅允许 sync 脚本写入）— 后续可加

---

> 维护者：文章结构校验工程小组
> 最近更新：2026-06-18
