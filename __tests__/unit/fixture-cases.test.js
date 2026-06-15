/**
 * Fixture 单测：基于本地缓存的真实文章 HTML 做收集阶段断言
 *
 * 注意：vitest 跑在 jsdom 下，没有真实布局。
 *      涉及 getBoundingClientRect 的规则（width/line-height/pre 溢出等）会无效，
 *      但"静态属性收集"类规则（caret-color、嵌套节点、SVG animate-begin 等）依然有效。
 *
 * 所以本文件只对"非 layout 类"的 case 做断言；layout 类 case 在集成测中覆盖。
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

// eslint-disable-next-line import/no-commonjs
const { badcases } = require('../cases.config.js');

const FIXTURES_DIR = path.resolve(__dirname, '../fixtures/badcases');

// 仅这些规则在 jsdom 下能稳定收集到
// 注意：
//   - pre 规则最终判定依赖 layout 测量（isOverflowing），jsdom 下 width 始终为 0，无法触发
//   - opacity 规则部分依赖 getComputedStyle，不稳定
//   - width / line-height / nest-overlap 等同样依赖布局
//   - nestNodes 检测依赖 editor_filter.js 的 ProseMirror 真实解析，jsdom 单测里被 stub 成空，无法触发
//     → 这条规则交给集成测（puppeteer）覆盖
const JSDOM_SUPPORTED_RULES = new Set([
  'caret-color',
  'animate-begin',
]);

let verifyArticleStructure;

beforeAll(async () => {
  const mod = require('../../../verify-article-structure/src/verify_article_structure.js');
  verifyArticleStructure = mod.verifyArticleStructure;
});

function mountHTML(html) {
  const container = document.createElement('div');
  container.className = 'rich_media_content';
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

function getInvalidKeys(result) {
  return Object.keys(result.inValidInfo || {}).filter(
    (k) => result.inValidInfo[k].items && result.inValidInfo[k].items.length > 0
  );
}

// 只挑选 jsdom 下能稳定测的 case
const supportedCases = badcases.filter((c) => {
  if (c.skip) return false;
  return c.expectInvalidKeys.some((k) => JSDOM_SUPPORTED_RULES.has(k));
});

describe('verify_article_structure - fixture 回归（收集阶段）', () => {
  if (supportedCases.length === 0) {
    it.skip('无 jsdom 可测的 case', () => {});
    return;
  }

  supportedCases.forEach((tc) => {
    const fixturePath = path.join(FIXTURES_DIR, `${tc.id}.html`);
    const exists = fs.existsSync(fixturePath);
    const expectedKeys = tc.expectInvalidKeys.filter((k) =>
      JSDOM_SUPPORTED_RULES.has(k)
    );

    const testFn = exists ? it : it.skip;
    // 大 fixture（如 nest 嵌套 1500+ 节点）在 jsdom 下耗时较长，单 case 超时调到 30s
    testFn(`[${tc.relatedRule}] ${tc.desc}`, async () => {
      const html = fs.readFileSync(fixturePath, 'utf8');
      const container = mountHTML(html);
      const result = await verifyArticleStructure(container);
      const got = getInvalidKeys(result);
      expectedKeys.forEach((k) => {
        expect(got, `期望命中 ${k}，实际：${got.join(', ') || '(空)'}`).toContain(k);
      });
    }, 30000);
  });
});
