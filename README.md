# verify-article-structure-spec

微信公众平台文章结构验证规范文档 + 完整测试套件 —— 面向第三方编辑器开发者的排版合规指南与 API 参考。

> **⚠️ 这是规范的权威源（single source of truth）。所有对该规范的修改都从这里开始。**

## 提交 Issue / 反馈规则问题

如果你在使用过程中发现规则**误报**、**漏报**或有**改进建议**，欢迎通过 [GitHub Issues](https://git.woa.com/daisyhhuang/verify-article-structure-spec/issues) 提交反馈。

### Issue 类型

| 类型 | 说明 | 标签 |
|------|------|------|
| 🐛 **误报 (False Positive)** | 文章实际是合规的，但被某条规则标记为违规 | `bug` |
| 🐛 **漏报 (False Negative)** | 某篇明显有排版问题的文章没有被检测出来 | `bug` |
| 💡 **规则建议 (Rule Suggestion)** | 建议新增一条排版检测规则 | `enhancement` |
| ⚙️ **阈值调整 (Threshold Tuning)** | 某条规则的参数（如宽度阈值 `677px`、嵌套层数 `15`）太严或太松 | `enhancement` |

### 必填信息

无论哪种 Issue 类型，请务必提供：

1. **涉及规则**：指明是哪条规则（如 `2.4 width`、`2.1 opacity`、`3.1 嵌套层级`、`5.1 颜色` 等），方便快速定位。
2. **文章链接**：提供触发问题的公众号文章链接（`https://mp.weixin.qq.com/s/xxx`），用于复现和验证。
3. **问题描述**：清晰说明期望行为 vs 实际行为。

#### 误报 / 漏报额外需要

4. **文章 HTML**（强烈推荐）：截图无法反映具体样式数值，请提供 HTML 原文以达到精准排查：
   - **方式一（推荐）**：保存为 `.html` 文件，直接拖拽上传到 Issue 评论区。
   - **方式二**：在 Issue 中使用代码块粘贴关键 HTML 片段（太长可只贴 `<div id="js_content">` 内的部分）。

   > 💡 **如何提取文章 HTML**：在 Chrome 中打开文章 → F12 开发者工具 → 找到 `<div id="js_content">` 节点 → 右键 → Copy → Copy outerHTML。

#### 规则建议额外需要

4. **场景描述**：描述你遇到的排版问题场景，附上截图或效果对比更佳。
5. **检测思路**（可选）：如果你对如何自动检测该问题有思路，欢迎一并提出。

### Issue 模板

提交 Issue 时，可直接复制以下模板填写：

```markdown
### 涉及规则
<!-- 例如：2.4 width、2.1 opacity、3.1 嵌套层级 -->

### 文章链接
<!-- https://mp.weixin.qq.com/s/xxx -->

### 问题描述
<!-- 描述你遇到的情况：哪条规则误报了？或哪种异常情况没检测到？ -->

### 期望行为
<!-- 你认为正确的检测结果应该是什么？ -->

### 附件 / HTML 片段
<!-- 拖拽上传 .html 文件，或在下方代码块中粘贴关键 HTML -->
```

## 目录结构

```
verify-article-structure-spec/
├── verify_article_structure.md   ← 📜 规范文档权威正本
├── package.json                  ← 版本号 + 测试脚本
├── README.md                     ← 本文件
├── .gitignore
├── vitest.config.js              ← vitest 单元测试配置
├── debug-fixtures.js             ← fixture 调试工具
├── __tests__/                    ← 🧪 测试套件
│   ├── cases.config.js           ← 所有测试 case 的定义
│   ├── unit/                     ← vitest + jsdom 单测（毫秒级）
│   │   ├── setup.js
│   │   ├── minimal-cases.test.js
│   │   └── fixture-cases.test.js
│   ├── integration/              ← puppeteer 集成测（真实文章回归）
│   │   ├── run.js
│   │   └── debug-one.js
│   └── fixtures/                 ← 本地缓存的文章 HTML
│       ├── badcases/
│       └── goodcases/
├── scripts/
│   ├── publish-spec.js           ← 🚀 一键推送到独立开源仓库
│   ├── copy-to-legacy.js         ← postinstall 自动同步到内部旧路径
│   └── fetch-fixtures.js         ← 从公众号抓取 fixtures
└── 公众号新功能提示测试汇总/       ← 人工测试记录
```

## 测试

```bash
# 单测（快，CI 必跑）
npm run test:unit

# 集成测（慢，需本地服务）
npm run test:integration

# 抓取 fixtures（新增 case 后）
npm run fetch:fixtures
```

### 测试设计

| 测试层 | 框架 | 速度 | 覆盖范围 |
|---|---|---|---|
| **单元测试** | vitest + jsdom | 毫秒级 | 收集阶段规则（caret-color、pre、SVG animate-begin 等） |
| **集成测试** | puppeteer | 30s+/case | 全部规则，含布局测量类（width 差异、line-height 重叠） |

两层测试共享同一份 `__tests__/cases.config.js`。

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 0.1.0 | 2026-06-15 | 初始版本，合并测试套件 |
