/**
 * 测试用例统一配置
 *
 * 这是 verify_article_structure 测试体系的"唯一事实来源"：
 *   - 集成测（puppeteer）：拉取每个 url，断言 expectInvalidKeys
 *   - 单元测（vitest）：从 fixtures/ 加载缓存的 HTML，对收集阶段规则做断言
 *
 * 字段说明（开源用户重点关注）：
 *   - id / url:               文章标识与原始链接
 *   - relatedRule:            该 case 期望命中的规则 key（与 propertyRules 对应）
 *   - expectInvalidKeys:      inValidInfo 实际产物中"必须出现"的外层桶名，参与断言
 *   - desc:                   人类可读描述，**必须以 "#章节号" 开头**，对应
 *                             verify_article_structure.md 中的章节，例如：
 *                               '#1.1 opacity - 图片透明度为 0'
 *                               '#1.4.2 width - 段落节点水平溢出'
 *                             开源用户可据此快速从规范文档查到对应规则说明。
 *   - skip / skipReason:      标记暂时无法稳定触发的 case，集成测会跳过（不算 fail）
 *   - requireLocalTpl / note: 内部排查辅助字段
 *
 * 维护原则：
 *   1. 每当检测规则的 propertyRules 新增 URL，必须在此处录入
 *   2. 新增 case 的 desc 必须带 #章节号前缀；若规范文档中尚无对应章节，需先补章节再加 case
 *   3. expectInvalidKeys 是 inValidInfo 中"必须出现"的键（实际可能多于这些）
 *   4. skip:true 的 case 会被集成测跳过（计入 skip 但不算 fail），用于"暂时测不出来"的场景
 */

const badcases = [
  // ===== opacity =====
  {
    id: 'aFumaby7dPTsGN2tTvHT9A',
    url: 'https://mp.weixin.qq.com/s/aFumaby7dPTsGN2tTvHT9A',
    relatedRule: 'opacity',
    expectInvalidKeys: ['opacity'],
    skip: true,
    skipReason:
      '规则注释里明确标注"测不出来，暂时不测，自动化跳过"',
    desc: '#1.1 opacity - 图片 opacity:0 + SVG 背景图叠加（跳过）',
  },
  {
    id: 'hykSi86rGj3BmUK70z6Tsg',
    url: 'https://mp.weixin.qq.com/s/hykSi86rGj3BmUK70z6Tsg',
    relatedRule: 'opacity',
    expectInvalidKeys: ['opacity'],
    desc: '#1.1 opacity - 图片透明度为 0',
  },

  // ===== caret-color =====
  {
    id: 'xKpKjTmXCHUqrTWkQ6h6yA',
    url: 'https://mp.weixin.qq.com/s/xKpKjTmXCHUqrTWkQ6h6yA',
    relatedRule: 'caret-color',
    expectInvalidKeys: ['caret-color'],
    desc: '#1.2 caret-color - 输入光标颜色透明',
  },

  // ===== line-height-overlapping =====
  {
    id: 'tZ70Hqt5QdAvRLQKyRpFBw',
    url: 'https://mp.weixin.qq.com/s/tZ70Hqt5QdAvRLQKyRpFBw',
    // 注：本 case 期望命中的是 line-height-overlapping 子规则
    //（行间距小于字号且多行文本，导致文字重叠）。
    // 实际产出时，inValidInfo 外层 key 是 'line-height'，
    // 但 violateRules 文案使用的是 propertyRules['line-height-overlapping']。
    // fallback 检测（detectLayoutIssues 中）会扫描沙箱内所有节点的 computedStyle，
    // 兜底捕获"继承式 line-height: 0"导致的叠字（如本 fixture 的"往期推荐"模块）。
    relatedRule: 'line-height-overlapping',
    expectInvalidKeys: ['line-height'],
    desc: '#1.3 line-height - 行高小于字号导致多行文字重叠（含继承式 line-height: 0）',
  },

  // ===== height =====
  {
    id: 'I6UWLvQ3pMKoocfIK__6vA',
    url: 'https://mp.weixin.qq.com/s/I6UWLvQ3pMKoocfIK__6vA',
    relatedRule: 'height',
    expectInvalidKeys: ['height'],
    desc: '#1.5.1 height:0 - 容器高度为 0 导致文字内容在移动端不可见',
    requireLocalTpl: true,
    note: '包含复杂结构，about:blank stub 无法正确处理，需 --use-local-tpl 模式',
  },

  // ===== width =====
  {
    id: 'ab3CS56Mvj43fZhRjBctDw',
    url: 'https://mp.weixin.qq.com/s/ab3CS56Mvj43fZhRjBctDw',
    relatedRule: 'width',
    expectInvalidKeys: ['width'],
    desc: '#1.4.2 width - 表格列宽固定导致窄屏溢出',
    requireLocalTpl: true,
    note: '含复杂 table，about:blank stub 无法正确处理，需 --use-local-tpl 模式',
  },
  {
    id: '42ApGiMTpDD9hotlfOqspA',
    url: 'https://mp.weixin.qq.com/s/42ApGiMTpDD9hotlfOqspA',
    relatedRule: 'width',
    expectInvalidKeys: ['width'],
    desc: '#1.4.1 width - 段落设置固定宽度，居中布局不一致',
  },
  {
    id: 'vURwUL9N98iHuh5lYGHTPQ',
    url: 'https://mp.weixin.qq.com/s/vURwUL9N98iHuh5lYGHTPQ',
    relatedRule: 'width',
    expectInvalidKeys: ['width'],
    desc: '#1.4.3 width - 段落设置固定宽度，不同屏幕下宽度比例差异',
  },
  {
    id: 'zB35yqcdMs2QboNPAaw_ug',
    url: 'https://mp.weixin.qq.com/s/zB35yqcdMs2QboNPAaw_ug',
    relatedRule: 'width',
    expectInvalidKeys: ['width'],
    desc: '#1.4.1 width - 段落设置固定宽度，居中布局不一致',
  },

  // ===== paragraph-overflow =====
  {
    id: 'kPV8nFFcxdku_Um5pvKvWQ',
    url: 'https://mp.weixin.qq.com/s/kPV8nFFcxdku_Um5pvKvWQ',
    relatedRule: 'paragraph-overflow',
    // paragraph-overflow 在 detectLayoutIssues 中归类到 width 桶
    expectInvalidKeys: ['width'],
    desc: '#1.4.2 width - 段落 margin-left 过大导致水平溢出',
  },

  // ===== animate-begin =====
  {
    id: 'KMe2Vh-LXs22LbqAEqLQhA',
    url: 'https://mp.weixin.qq.com/s/KMe2Vh-LXs22LbqAEqLQhA',
    relatedRule: 'animate-begin',
    expectInvalidKeys: ['animate-begin'],
    desc: '#1.7 begin - SVG 动画 begin 仅设置 touchstart，PC 端无法触发',
  },

  // ===== height-nodisplay =====
  {
    id: 'Xo_hRprDLhLbm9oabjX9CA',
    url: 'https://mp.weixin.qq.com/s/Xo_hRprDLhLbm9oabjX9CA',
    relatedRule: 'height-nodisplay',
    expectInvalidKeys: ['height-nodisplay'],
    desc: '#1.5.2 height-nodisplay - 父容器固定高度，子内容超出被裁剪',
  },
  {
    id: 'yMQwPSVKxU4Sphp2i02h_A',
    url: 'https://mp.weixin.qq.com/s/yMQwPSVKxU4Sphp2i02h_A',
    relatedRule: 'height-nodisplay',
    expectInvalidKeys: ['height-nodisplay'],
    skip: true,
    skipReason:
      '规则注释里明确标注"测不出来，暂时不测，自动化跳过"',
    desc: '#1.5.2 height-nodisplay - 父容器固定高度，子内容超出被裁剪（跳过）',
  },
  {
    id: '75N-79iGrHJEWvBrR3X2Tg',
    url: 'https://mp.weixin.qq.com/s/75N-79iGrHJEWvBrR3X2Tg',
    relatedRule: 'height-nodisplay',
    expectInvalidKeys: ['height-nodisplay'],
    desc: '#1.5.2 height-nodisplay - 父容器固定高度，子内容超出被裁剪',
    note: 'height-nodisplay 规则在本 fixture 中未触发，实际命中 nestNodes',
  },

  // ===== nest-level =====
  {
    id: 'LBlADJfjh0YNIp82pVDKMw',
    url: 'https://mp.weixin.qq.com/s/LBlADJfjh0YNIp82pVDKMw',
    relatedRule: 'nest-level',
    expectInvalidKeys: ['nestNodes'],
    desc: '#2.1 嵌套层级 - 同标签同样式连续嵌套超过限制层数',
  },
  {
    // Synthetic minimal repro for issue #5 (https://github.com/wechatjs/verify-article-structure-spec/issues/5):
    // 16 same-tag same-style <span> layers → nestNodes violation that `dedupe` cleans to 0.
    // Fixture is local (no network fetch); use it to demo the check→dedupe→recheck flow.
    id: 'issue5-redundant-nesting',
    relatedRule: 'nest-level',
    expectInvalidKeys: ['nestNodes'],
    desc: '#2.1 嵌套层级 - 冗余嵌套（dedupe 可清理，issue #5 用例）',
    requireLocalTpl: true,
  },

  // ===== pre =====
  {
    id: 'JAk9Sa9c7cCu9sX5pNIcZg',
    url: 'https://mp.weixin.qq.com/s/JAk9Sa9c7cCu9sX5pNIcZg',
    relatedRule: 'pre',
    expectInvalidKeys: ['pre'],
    desc: '#1.8 pre - 使用 <pre> 包裹正文导致移动端文字不换行',
  },
  {
    id: 'VqGvM5ozeQnBVW8F7-YM3Q',
    url: 'https://mp.weixin.qq.com/s/VqGvM5ozeQnBVW8F7-YM3Q',
    relatedRule: 'pre',
    expectInvalidKeys: ['pre'],
    desc: '#1.8 pre - 使用 <pre> 包裹正文导致移动端文字不换行',
  },
];

// const badcases = [
//   {
//     id: 'hykSi86rGj3BmUK70z6Tsg',
//     url: 'https://mp.weixin.qq.com/s/hykSi86rGj3BmUK70z6Tsg',
//     relatedRule: 'opacity',
//     expectInvalidKeys: ['opacity'],
//     desc: 'opacity case2 - 图片透明度为 0',
//   },
// ];


/**
 * 反向用例：用户认可的"完全合规"文章
 * 期望：isValid: true 且 inValidInfo 为空
 * 用途：防止规则误报（false positive），任何一篇炸了都说明规则改严了
 */
const goodcases = [
  {
    id: 'Y8lDF7sNwp5iwDrGq7ZGBQ',
    url: 'https://mp.weixin.qq.com/s/Y8lDF7sNwp5iwDrGq7ZGBQ',
    desc: '反向用例 #1 - 用户认可的合规文章（防止规则误报）',
  },
  {
    id: 'aISj197NyVblh8y0D-6TEg',
    url: 'https://mp.weixin.qq.com/s/aISj197NyVblh8y0D-6TEg',
    desc: '反向用例 #2 - 用户认可的合规文章（防止规则误报）',
  }
];

module.exports = { badcases, goodcases };
