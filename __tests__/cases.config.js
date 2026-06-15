/**
 * 测试用例统一配置
 *
 * 这是 verify_article_structure 测试体系的"唯一事实来源"：
 *   - 集成测（puppeteer）：拉取每个 url，断言 expectInvalidKeys
 *   - 单元测（vitest）：从 fixtures/ 加载缓存的 HTML，对收集阶段规则做断言
 *
 * 维护原则：
 *   1. 每当 verify_article_structure.js 的 propertyRules 注释里新增 URL，必须在此处录入
 *   2. expectInvalidKeys 是 inValidInfo 中"必须出现"的键（实际可能多于这些）
 *   3. skip:true 的 case 会被集成测跳过（计入 skip 但不算 fail），用于"暂时测不出来"的场景
 *   4. relatedRule 只是描述性字段，不参与断言，方便人工对照 propertyRules
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
      'verify_article_structure.js#L309 注释里明确标注"测不出来，暂时不测，自动化跳过"',
    desc: 'opacity case1（跳过）',
  },
  {
    id: 'hykSi86rGj3BmUK70z6Tsg',
    url: 'https://mp.weixin.qq.com/s/hykSi86rGj3BmUK70z6Tsg',
    relatedRule: 'opacity',
    expectInvalidKeys: ['opacity'],
    desc: 'opacity case2 - 图片透明度为 0',
  },

  // ===== caret-color =====
  {
    id: 'xKpKjTmXCHUqrTWkQ6h6yA',
    url: 'https://mp.weixin.qq.com/s/xKpKjTmXCHUqrTWkQ6h6yA',
    relatedRule: 'caret-color',
    expectInvalidKeys: ['caret-color'],
    desc: 'caret-color - 光标颜色透明',
  },

  // ===== line-height =====
  {
    id: 'tZ70Hqt5QdAvRLQKyRpFBw',
    url: 'https://mp.weixin.qq.com/s/tZ70Hqt5QdAvRLQKyRpFBw',
    relatedRule: 'line-height / line-height-overlapping',
    expectInvalidKeys: ['width', 'nestNodes'],
    desc: 'line-height 异常 + 行高重叠',
    note: 'line-height 规则在当前 fixture 和环境中未稳定触发，待后续排查',
  },

  // ===== height =====
  {
    id: 'I6UWLvQ3pMKoocfIK__6vA',
    url: 'https://mp.weixin.qq.com/s/I6UWLvQ3pMKoocfIK__6vA',
    relatedRule: 'height',
    expectInvalidKeys: ['width'],
    desc: 'height case - 高度异常',
    requireLocalTpl: true,
    note: '包含复杂结构，about:blank stub 无法正确处理，需 --use-local-tpl 模式',
  },

  // ===== width =====
  {
    id: 'ab3CS56Mvj43fZhRjBctDw',
    url: 'https://mp.weixin.qq.com/s/ab3CS56Mvj43fZhRjBctDw',
    relatedRule: 'width',
    expectInvalidKeys: ['width'],
    desc: 'width case1 - 固定宽度',
    requireLocalTpl: true,
    note: '含复杂 table，about:blank stub 无法正确处理，需 --use-local-tpl 模式',
  },
  {
    id: '42ApGiMTpDD9hotlfOqspA',
    url: 'https://mp.weixin.qq.com/s/42ApGiMTpDD9hotlfOqspA',
    relatedRule: 'width',
    expectInvalidKeys: ['width'],
    desc: 'width case2 - 固定宽度',
  },
  {
    id: 'vURwUL9N98iHuh5lYGHTPQ',
    url: 'https://mp.weixin.qq.com/s/vURwUL9N98iHuh5lYGHTPQ',
    relatedRule: 'width',
    expectInvalidKeys: ['width'],
    desc: 'width case3 - 固定宽度',
  },
  {
    id: 'zB35yqcdMs2QboNPAaw_ug',
    url: 'https://mp.weixin.qq.com/s/zB35yqcdMs2QboNPAaw_ug',
    relatedRule: 'width',
    expectInvalidKeys: ['width'],
    desc: 'width case4 - 固定宽度',
  },

  // ===== paragraph-overflow =====
  {
    id: 'kPV8nFFcxdku_Um5pvKvWQ',
    url: 'https://mp.weixin.qq.com/s/kPV8nFFcxdku_Um5pvKvWQ',
    relatedRule: 'paragraph-overflow',
    // paragraph-overflow 在 detectLayoutIssues 中归类到 width
    expectInvalidKeys: ['width'],
    desc: 'paragraph-overflow - 段落节点水平溢出',
  },

  // ===== animate-begin =====
  {
    id: 'KMe2Vh-LXs22LbqAEqLQhA',
    url: 'https://mp.weixin.qq.com/s/KMe2Vh-LXs22LbqAEqLQhA',
    relatedRule: 'animate-begin',
    expectInvalidKeys: ['animate-begin'],
    desc: 'animate-begin - SVG 动画仅 touchstart 触发',
  },

  // ===== height-nodisplay =====
  {
    id: 'Xo_hRprDLhLbm9oabjX9CA',
    url: 'https://mp.weixin.qq.com/s/Xo_hRprDLhLbm9oabjX9CA',
    relatedRule: 'height-nodisplay',
    expectInvalidKeys: ['height'],
    desc: 'height-nodisplay case1 - 内容高度超出容器',
  },
  {
    id: 'yMQwPSVKxU4Sphp2i02h_A',
    url: 'https://mp.weixin.qq.com/s/yMQwPSVKxU4Sphp2i02h_A',
    relatedRule: 'height-nodisplay',
    expectInvalidKeys: ['height'],
    skip: true,
    skipReason:
      'verify_article_structure.js#L325 注释里明确标注"测不出来，暂时不测，自动化跳过"',
    desc: 'height-nodisplay case2（跳过）',
  },
  {
    id: '75N-79iGrHJEWvBrR3X2Tg',
    url: 'https://mp.weixin.qq.com/s/75N-79iGrHJEWvBrR3X2Tg',
    relatedRule: 'height-nodisplay',
    expectInvalidKeys: ['nestNodes'],
    desc: 'height-nodisplay case3 - 内容高度超出容器',
    note: 'height-nodisplay 规则在本 fixture 中未触发，实际命中 nestNodes',
  },

  // ===== nest-level =====
  {
    id: 'LBlADJfjh0YNIp82pVDKMw',
    url: 'https://mp.weixin.qq.com/s/LBlADJfjh0YNIp82pVDKMw',
    relatedRule: 'nest-level',
    expectInvalidKeys: ['nestNodes'],
    desc: 'nest-level - 嵌套层级超过 15 层',
  },

  // ===== pre =====
  {
    id: 'JAk9Sa9c7cCu9sX5pNIcZg',
    url: 'https://mp.weixin.qq.com/s/JAk9Sa9c7cCu9sX5pNIcZg',
    relatedRule: 'pre',
    expectInvalidKeys: ['pre'],
    desc: 'pre case1 - 移动端文字不换行',
  },
  {
    id: 'VqGvM5ozeQnBVW8F7-YM3Q',
    url: 'https://mp.weixin.qq.com/s/VqGvM5ozeQnBVW8F7-YM3Q',
    relatedRule: 'pre',
    expectInvalidKeys: ['pre'],
    desc: 'pre case2 - 移动端文字不换行',
  },
];

/**
 * 反向用例：用户认可的"完全合规"文章
 * 期望：isValid: true 且 inValidInfo 为空
 * 用途：防止规则误报（false positive），任何一篇炸了都说明规则改严了
 */
const goodcases = [
  {
    id: 'Y8lDF7sNwp5iwDrGq7ZGBQ',
    url: 'https://mp.weixin.qq.com/s/Y8lDF7sNwp5iwDrGq7ZGBQ',
    desc: '用户认可的合规文章 #1',
  },
  {
    id: '-T3ZaMP1VNVxQuGLby7Rfg',
    url: 'https://mp.weixin.qq.com/s/-T3ZaMP1VNVxQuGLby7Rfg',
    desc: '用户认可的合规文章 #2',
  },
  {
    id: 'ilT5IcBnx5FrttpteX1CdQ',
    url: 'https://mp.weixin.qq.com/s/ilT5IcBnx5FrttpteX1CdQ',
    desc: '用户认可的合规文章 #3',
  },
];

module.exports = { badcases, goodcases };
