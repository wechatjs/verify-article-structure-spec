#!/usr/bin/env node
/**
 * fetch-fixtures.js
 *
 * 把 cases.config.js 中所有 case 的文章 HTML 抓取到本地 __tests__/fixtures/，
 * 用于：
 *   1. 单元测试（vitest）离线读取 → 不依赖网络，CI 友好
 *   2. 集成测试缓存兜底 → 即使原文被删/改，回归测试依然可重放
 *
 * 用法：
 *   node scripts/fetch-fixtures.js          # 只抓缺失的
 *   node scripts/fetch-fixtures.js --force  # 强制全部重抓
 *
 * 抓取规则：
 *   - 只截取 <div id="js_content">...</div> 区间，与 verify_article_structure 的真实输入一致
 *   - 文章需登录 / 已删除 → 警告但继续，不中断
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const { badcases, goodcases } = require('../__tests__/cases.config.js');

const FIXTURES_DIR = path.resolve(__dirname, '../__tests__/fixtures');
const BAD_DIR = path.join(FIXTURES_DIR, 'badcases');
const GOOD_DIR = path.join(FIXTURES_DIR, 'goodcases');

const FORCE = process.argv.includes('--force');
const TIMEOUT_MS = 30000;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * 抓取文章 HTML，提取 #js_content 区段
 * 与 scripts/test_verify_cases.js 中的 fetchArticleContent 逻辑一致，便于切换
 */
function fetchArticleContent(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('重定向次数过多'));
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchArticleContent(res.headers.location, redirectCount + 1)
            .then(resolve)
            .catch(reject);
        }
        let html = '';
        res.on('data', (chunk) => (html += chunk));
        res.on('end', () => {
          const startMatch = html.match(/id=["']js_content["'][^>]*>/);
          if (!startMatch) {
            return reject(new Error('未找到 #js_content（文章可能需要登录或已删除）'));
          }
          const startIdx = startMatch.index + startMatch[0].length;
          const endKeywords = [
            'id="js_pc_qr_code"',
            'id="js_content_ad"',
            'class="rich_media_area_extra"',
            'id="js_tags_preview_toast"',
          ];
          let endIdx = html.length;
          for (const kw of endKeywords) {
            const idx = html.indexOf(kw, startIdx);
            if (idx > 0 && idx < endIdx) endIdx = idx;
          }
          resolve(html.substring(startIdx, endIdx));
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy(new Error('抓取超时'));
    });
  });
}

async function fetchOne(c, dir) {
  const dest = path.join(dir, `${c.id}.html`);
  if (!FORCE && fs.existsSync(dest)) {
    console.log(`  ⏭  ${c.id}  (已缓存)`);
    return { status: 'cached' };
  }
  try {
    const html = await fetchArticleContent(c.url);
    fs.writeFileSync(dest, html, 'utf8');
    console.log(`  ✓ ${c.id}  (${(html.length / 1024).toFixed(1)} KB)`);
    return { status: 'fetched' };
  } catch (e) {
    console.log(`  ⚠ ${c.id}  失败：${e.message}`);
    return { status: 'failed', error: e.message };
  }
}

async function main() {
  ensureDir(BAD_DIR);
  ensureDir(GOOD_DIR);

  console.log(`📥 fetching fixtures (force=${FORCE})...\n`);

  console.log(`badcases (${badcases.length}):`);
  for (const c of badcases) {
    await fetchOne(c, BAD_DIR);
  }

  console.log(`\ngoodcases (${goodcases.length}):`);
  for (const c of goodcases) {
    await fetchOne(c, GOOD_DIR);
  }

  console.log('\n✅ fetch done.');
  console.log(`   fixtures saved to: ${path.relative(process.cwd(), FIXTURES_DIR)}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error('❌ fetch failed:', e.message);
    process.exit(1);
  });
}
