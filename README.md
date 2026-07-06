# verify-article-structure-spec

> 微信公众平台文章结构验证**规范仓**——面向第三方编辑器开发者的排版合规指南、测试用例与反馈通道。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

本仓库制定微信公众号文章 HTML 结构的合规标准，涵盖测试用例与反馈机制。供第三方编辑器及排版校验插件的开发者参考。

| 内容 | 文件 | 作用 |
|---|---|---|
| 📜 **规范文档** | [`verify_article_structure.md`](./verify_article_structure.md) | 所有检测规则的权威定义（章节号、阈值、判定逻辑） |
| 🧪 **测试用例** | [`cases.config.js`](./cases.config.js) | 违规用例（badcases）+ 合规反向用例（goodcases）|

---

## 提交 Issue / 反馈规则问题

> 本仓库的核心对外机制：通过 Issue 驱动规则迭代与完善。

### Issue 类型

| 类型 | 说明 | 标签 |
|---|---|---|
| 🐛 **误报 (False Positive)** | 文章实际是合规的，但被某条规则标记为违规 | `bug` |
| 🐛 **漏报 (False Negative)** | 某篇明显有排版问题的文章没有被检测出来 | `bug` |
| 💡 **规则建议 (Rule Suggestion)** | 建议新增一条排版检测规则 | `enhancement` |
| ⚙️ **阈值调整 (Threshold Tuning)** | 某条规则的参数（如宽度阈值 `677px`、嵌套层数 `15`）太严或太松 | `enhancement` |

### 提交流程

1. 点击 **[New Issue](https://github.com/wechatjs/verify-article-structure-spec/issues/new?template=rule-feedback.yml)** → 直接进入「规则反馈」模板
2. 按模板填写必填字段（涉及规则、文章链接、问题描述、期望行为）
3. 提交后维护者会跟进，修复后会在 Issue 中回复并关闭

### 必填信息

无论哪种 Issue 类型，须提供：

1. **涉及规则**：指明是哪条规则（如 `2.4 width`、`2.1 opacity`、`3.1 嵌套层级`、`5.1 颜色` 等），便于定位。
2. **文章链接** / **文章 HTML**（二选一）：提供以下任一即可用于复现和验证。
   - **文章链接**：触发问题的公众号文章链接（`https://mp.weixin.qq.com/s/xxx`）。
   - **文章 HTML**：提供文章 HTML 源码以便精准排查。
3. **问题描述**：清晰说明期望行为 vs 实际行为。

#### 规则建议额外需要

4. **场景描述**：描述所遇排版问题的场景，附截图或效果对比。
5. **检测思路**（可选）：如有自动检测该问题的思路，可一并提出。

#### 示例

##### 📝 误报示例

> **标题**：[误报] 2.4 width 规则错杀响应式图片
>
> **1. 涉及规则**：`2.4 width`
>
> **2. 文章链接**：`https://mp.weixin.qq.com/s/AbCdEfGhIjKlMnOp`
>
> **3. 问题描述**：
> - **期望行为**：图片设置了 `max-width: 100%` 应当判为合规。
> - **实际行为**：被判违规，提示 `width 超过 677px`。
> - 检测逻辑似乎只看了 `width` 属性，忽略了 `max-width` 的约束语义。

##### 💡 规则建议示例

> **标题**：[规则建议] 检测正文中的空 `<a>` 标签
>
> **1. 涉及规则**：建议新增 `6.x 空链接`
>
> **2. 文章 HTML**：
> ```html
> <p>这是一段正文，<a href="https://example.com"></a> 后面还有内容。</p>
> ```
>
> **3. 问题描述**：
> - **期望行为**：检测出文本为空的 `<a>` 标签并提示作者。
> - **实际行为**：当前无相关规则，此类隐形链接会被忽略。
>
> **4. 场景描述**：第三方工具导入文章时，常因模板残留生成 `<a></a>` 空标签，读者无法点击但占用语义。截图对比见附件。
>
> **5. 检测思路**（可选）：
> - 遍历 `<a>` 节点，判断 `textContent.trim()` 为空且无 `<img>` 子节点即视为空链接。
> - 阈值建议：单篇 ≥ 1 即提示。

---

## 目录结构

```
verify-article-structure-spec/
├── verify_article_structure.md    ← 📜 规范文档（权威源）
├── cases.config.js                ← 🧪 测试用例配置
├── __tests__/
│   └── fixtures/                  ← 📂 文章 HTML 缓存
│       ├── badcases/              ← 违规用例文章
│       └── goodcases/             ← 合规反向用例文章
├── scripts/
│   └── fetch-fixtures.js          ← 从公众号抓取 fixtures 到本地缓存
├── 公众号新功能提示测试汇总/        ← 人工测试记录归档
├── .github/
│   └── ISSUE_TEMPLATE/            ← Issue 模板
├── package.json
└── README.md
```

---

## 测试用例字段说明（cases.config.js）

[`cases.config.js`](./cases.config.js) 定义了用于回归测试的违规与合规用例。如有意附带补充用例，可参照下表字段格式提供：

### `badcases`（违规用例）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | ✅ | 文章短链 ID（`mp.weixin.qq.com/s/` 后的部分），同时用作 fixture 文件名 |
| `url` | string | ✅ | 文章完整 URL |
| `relatedRule` | string | ✅ | 期望命中的规则 key，对应 `propertyRules` 中的键（如 `opacity` / `width` / `pre`） |
| `expectInvalidKeys` | string[] | ✅ | 验证结果 `inValidInfo` 中**必须出现**的外层桶名（如 `['width']`） |
| `desc` | string | ✅ | 可读描述，**必须以 `#章节号` 开头**对应 `verify_article_structure.md` 章节，例：`'#2.1 opacity - 图片透明度为 0'` |

### `goodcases`（合规反向用例）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | ✅ | 同上 |
| `url` | string | ✅ | 同上 |
| `desc` | string | ✅ | 可读描述（无章节号约束） |

> goodcase 期望：`isValid: true` 且 `inValidInfo` 为空。

---

## 版本历史

| 版本 | 日期 | 变更 |
|---|---|---|
| 1.0.0 | 2026-06-25 | 首个对外发布版本 · 含规范文档、测试用例与 Issue 反馈通道 |

---

## License

MIT
