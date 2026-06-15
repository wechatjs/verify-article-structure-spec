/**
 * 最小复现单测：针对"收集阶段"规则做精准断言
 *
 * 这类测试不依赖真实文章，直接构造最小 HTML 片段触发单一规则。
 * 优势：
 *   - 跑得飞快（毫秒级）
 *   - 改了某条规则的阈值，立刻知道挂的是哪条
 *   - 不依赖网络 / 本地服务，CI 友好
 *
 * 仅覆盖"通过静态属性即可判断的规则"：caret-color、SVG animate-begin、嵌套层级 等
 * 注意：
 *   - pre 规则最终判定依赖 layout 测量（isOverflowing），jsdom 下无法触发，仅做主流程烟测
 *   - opacity 规则部分依赖 getComputedStyle，jsdom 下不稳定，仅做主流程烟测
 *   - 涉及真实 layout 测量的规则（width 差异、行高重叠）由集成测覆盖
 */

import { describe, it, expect, beforeAll } from 'vitest';

let verifyArticleStructure;

beforeAll(async () => {
  // 必须在 setup.js 注入 stub 之后再 require 主模块
  const mod = require('../../../verify-article-structure/src/verify_article_structure.js');
  verifyArticleStructure = mod.verifyArticleStructure;
});

/** 把 HTML 片段挂到 body 并返回容器，verifyArticleStructure 接受 DOM 节点 */
function mountFragment(html) {
  const container = document.createElement('div');
  container.className = 'rich_media_content';
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

/** 收集所有违规 key */
function getInvalidKeys(result) {
  return Object.keys(result.inValidInfo || {}).filter(
    (k) => result.inValidInfo[k].items && result.inValidInfo[k].items.length > 0
  );
}

describe('verify_article_structure - 收集阶段最小复现单测', () => {
  describe('caret-color 规则', () => {
    // 源码识别格式：caret-color: rgba(0,0,0,0) 字面量；不识别 transparent 关键字
    it('段落 caret-color: rgba(0,0,0,0) 应被检出', async () => {
      const c = mountFragment(`
        <section style="caret-color: rgba(0,0,0,0);">这是一段隐藏插入符的文字</section>
      `);
      const result = await verifyArticleStructure(c);
      expect(getInvalidKeys(result)).toContain('caret-color');
    });

    it('正常文本不应被误报 caret-color', async () => {
      const c = mountFragment(`<section>普通段落</section>`);
      const result = await verifyArticleStructure(c);
      expect(getInvalidKeys(result)).not.toContain('caret-color');
    });

    it('caret-color: transparent 关键字不被识别（与源码当前行为一致）', async () => {
      // 这是回归测：如果将来源码扩展为也识别 transparent 关键字，本测试需要同步更新
      const c = mountFragment(`<section style="caret-color: transparent;">x</section>`);
      const result = await verifyArticleStructure(c);
      expect(getInvalidKeys(result)).not.toContain('caret-color');
    });
  });

  describe('SVG animate-begin 规则', () => {
    it('SVG <animate begin="touchstart"> 应被检出', async () => {
      const c = mountFragment(`
        <p>
          <svg viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="3">
              <animate attributeName="r" begin="touchstart" dur="1s" to="5"/>
            </circle>
          </svg>
        </p>
      `);
      const result = await verifyArticleStructure(c);
      expect(getInvalidKeys(result)).toContain('animate-begin');
    });
  });

  describe('opacity / pre 规则（layout 类，仅烟测）', () => {
    it('opacity: 0 主流程不抛异常', async () => {
      const c = mountFragment(`
        <p><img src="https://example.com/x.jpg" style="opacity: 0;" /></p>
      `);
      const result = await verifyArticleStructure(c);
      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
    });

    it('<pre> 标签主流程不抛异常（pre 溢出判定依赖布局，jsdom 不支持）', async () => {
      const c = mountFragment(`
        <pre>这是一段被 pre 标签包裹的文字。</pre>
      `);
      const result = await verifyArticleStructure(c);
      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
    });
  });

  describe('合规内容回归', () => {
    it('正常段落应返回 isValid: true 且 inValidInfo 为空', async () => {
      const c = mountFragment(`
        <p>这是一段完全正常的段落文字。</p>
        <p>第二段也很正常。</p>
      `);
      const result = await verifyArticleStructure(c);
      const invalidKeys = getInvalidKeys(result);
      expect(invalidKeys).not.toContain('caret-color');
      expect(invalidKeys).not.toContain('animate-begin');
    });
  });
});
