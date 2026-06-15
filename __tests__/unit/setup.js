/**
 * vitest 单元测试启动钩子（CommonJS 兼容版）
 *
 * 背景：被测源码 packages/web-webapp-common/js/verify_article_structure.js 用 CommonJS
 *      require('web-webapp-common/js/xxx') 这种 webpack alias 写法引入依赖。
 *      vitest.config.js 的 resolve.alias 只对 ESM import 生效，对 Node 原生 require 不生效；
 *      vi.mock() 同样只 hook ESM import。
 *
 * 方案：直接 patch Node 的 Module._resolveFilename：
 *   1. 把 'web-webapp-common/js/xxx' 重写为 packages/web-webapp-common/js/xxx 的真实路径
 *   2. 把 'biz_common/xxx' 重写为 packages/mmbizweb-web2-common/biz_common/xxx 的真实路径
 *   3. 对部分 Node 下加载会炸的模块（依赖 webpack-only API、ProseMirror 等），
 *      直接命中内置 stub，不走真品。
 */

const Module = require('module');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const WEB_COMMON = path.join(REPO_ROOT, 'packages/web-webapp-common');
const BIZ_COMMON = path.join(REPO_ROOT, 'packages/mmbizweb-web2-common/biz_common');

// ============================================================
// 内置 stub：Node 下加载会炸或副作用过重的模块
// ============================================================
const STUB_MODULES = {
  // const.js / common_utils.js 是 AMD 写法（define()），Node 下加载会炸；
  // 而 verify_article_structure.js 实际并未使用 constant.* / utils.*（只是 require 了），
  // 所以直接 stub 成空对象。
  'web-webapp-common/js/const': {},
  'web-webapp-common/js/common_utils': {},

  // domUtils 在校验逻辑里只调用了 domUtils.isMarkNode(node)，
  // mark 节点是富文本里的特殊标记节点（如 mp-common-* 文字链），
  // 单测里所有用例都不构造 mark 节点，统一返回 false 即可。
  'web-webapp-common/js/domUtils.js': {
    domUtils: {
      isMarkNode: () => false,
    },
  },

  // get_para_list 用于把 article body 拆成段落数组，
  // 真品逻辑较复杂且依赖 webpack；单测里我们直接按"每个直接子元素 = 一个段落"近似，
  // 这对收集阶段的属性类规则（caret-color/pre/font-family/...）已经足够。
  'biz_common/utils/get_para_list': (articleBody /* , opts */) => {
    if (!articleBody) return [];
    return Array.from(articleBody.children || []);
  },

  // 上报 SDK：不需要真实上报
  'biz_common/utils/wxgspeedsdk.js': {
    report: () => {},
    init: () => {},
    default: { report: () => {}, init: () => {} },
  },
  // editor_filter 依赖 ProseMirror，单测里仅用 deleteNestNode；默认返回 []（无嵌套违规）
  'web-webapp-common/js/editor_filter.js': {
    deleteRedundantNode: () => null,
    deleteNestNode: () => [],
  },
  // darkmode 内部依赖 webpack runtime；单测默认让它"通过"
  // 源码里是 Darkmode.reset(...) / Darkmode.run(...) / Darkmode.validate(...) 的静态调用，
  // 因此 stub 直接是带这三个方法的对象。
  'web-webapp-common/js/darkmode.js': {
    reset: () => {},
    run: () => {},
    validate: () => [],
  },
};

// 把 stub 直接写进 require.cache：用真实 path 作为 key
const stubCachePaths = {};
for (const reqId of Object.keys(STUB_MODULES)) {
  // 用一个固定的"虚拟"绝对路径作为 cache key
  const fakePath = path.join(REPO_ROOT, '__vitest_stub__', reqId);
  stubCachePaths[reqId] = fakePath;
  require.cache[fakePath] = {
    id: fakePath,
    filename: fakePath,
    loaded: true,
    exports: STUB_MODULES[reqId],
    children: [],
    paths: [],
  };
}

// ============================================================
// patch Module._resolveFilename：拦截 webpack alias 风格的 require
// ============================================================
const origResolve = Module._resolveFilename;
Module._resolveFilename = function patchedResolve(request, parent, ...rest) {
  // 1. stub 命中
  if (stubCachePaths[request]) {
    return stubCachePaths[request];
  }
  // 2. web-webapp-common/* → packages/web-webapp-common/*
  if (request.startsWith('web-webapp-common/')) {
    const rel = request.slice('web-webapp-common/'.length);
    return origResolve.call(this, path.join(WEB_COMMON, rel), parent, ...rest);
  }
  // 3. biz_common/* → packages/mmbizweb-web2-common/biz_common/*
  if (request.startsWith('biz_common/')) {
    const rel = request.slice('biz_common/'.length);
    return origResolve.call(this, path.join(BIZ_COMMON, rel), parent, ...rest);
  }
  return origResolve.call(this, request, parent, ...rest);
};

// ============================================================
// 全局 polyfill
// ============================================================

// jsdom 的 getBoundingClientRect 总是返回 0，需要时由具体测试自行 mock
// 这里不全局 mock，避免影响"不依赖布局"的纯收集测试
