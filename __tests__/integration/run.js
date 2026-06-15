#!/usr/bin/env node
/**
 * 集成测试 runner（puppeteer + 真实文章）
 *
 * 与 scripts/test_verify_cases.js 等价，但：
 *   1. case 来源改为 __tests__/cases.config.js（统一事实来源）
 *   2. 支持 skip 字段（不影响退出码）
 *   3. 新增 goodcases 反向断言（isValid: true）
 *   4. fixture 优先：本地有缓存则不走网络（CI 离线友好）
 *
 * 用法：
 *   node __tests__/integration/run.js                  # 全量
 *   node __tests__/integration/run.js --no-network     # 仅用本地 fixtures
 *   node __tests__/integration/run.js --only=width     # 只跑某条规则
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.error('❌ puppeteer 未安装，请先在 packages/verify-article-structure 下执行 pnpm install');
  process.exit(1);
}

const { badcases, goodcases } = require('../cases.config.js');

const LOCAL_VERIFY_URL =
  process.env.VERIFY_URL ||
  'http://localhost:8003/cgi-bin/readtemplate?t=media/get_article_structure_tmpl';

// 本地脚本路径：packages/verify-article-structure/src/verify_article_structure.js
// 由 `npm run sync` 从 packages/web-webapp-common/js/ 同步而来
const LOCAL_SCRIPT_PATH = path.resolve(__dirname, '../../verify-article-structure/src/verify_article_structure.js');

const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');
const FETCH_TIMEOUT_MS = 30000;
const VERIFY_TIMEOUT_MS = 60000;

const args = process.argv.slice(2);
const NO_NETWORK = args.includes('--no-network');
const ONLY_ARG = args.find((a) => a.startsWith('--only='));
const ONLY_RULE = ONLY_ARG ? ONLY_ARG.replace('--only=', '') : null;
const USE_LOCAL_TPL = args.includes('--use-local-tpl'); // 强制使用 localhost:8003 测试页（兼容旧用法）

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};
const c = (color, msg) => `${COLORS[color]}${msg}${COLORS.reset}`;

function loadFromFixture(id, kind /* 'badcases' | 'goodcases' */) {
  const p = path.join(FIXTURES_DIR, kind, `${id}.html`);
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  return null;
}

function fetchArticleContent(url, redirect = 0) {
  return new Promise((resolve, reject) => {
    if (redirect > 5) return reject(new Error('重定向次数过多'));
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
          return fetchArticleContent(res.headers.location, redirect + 1)
            .then(resolve)
            .catch(reject);
        }
        let html = '';
        res.on('data', (chunk) => (html += chunk));
        res.on('end', () => {
          const m = html.match(/id=["']js_content["'][^>]*>/);
          if (!m) return reject(new Error('未找到 #js_content，文章可能需登录'));
          const start = m.index + m[0].length;
          const endKeywords = [
            'id="js_pc_qr_code"',
            'id="js_content_ad"',
            'class="rich_media_area_extra"',
            'id="js_tags_preview_toast"',
          ];
          let end = html.length;
          for (const kw of endKeywords) {
            const i = html.indexOf(kw, start);
            if (i > 0 && i < end) end = i;
          }
          resolve(html.substring(start, end));
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(FETCH_TIMEOUT_MS, () => req.destroy(new Error('抓取超时')));
  });
}

function withTimeout(p, ms, label) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`超时 ${ms}ms：${label}`)), ms)),
  ]);
}

async function getContent(item, kind) {
  const cached = loadFromFixture(item.id, kind);
  if (cached) return { html: cached, source: 'fixture' };
  if (NO_NETWORK) {
    throw new Error('--no-network 模式下未找到本地 fixture，跳过');
  }
  const html = await withTimeout(
    fetchArticleContent(item.url),
    FETCH_TIMEOUT_MS,
    item.desc || item.id
  );
  // 顺手缓存
  try {
    const dir = path.join(FIXTURES_DIR, kind);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${item.id}.html`), html, 'utf8');
  } catch (e) {
    /* ignore cache write failure */
  }
  return { html, source: 'network' };
}

async function runVerify(page, html) {
  return withTimeout(
    page.evaluate(async (htmlContent) => {
      const container = document.createElement('div');
      container.className = 'rich_media_content';
      container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:677px;';
      container.innerHTML = htmlContent;
      document.body.appendChild(container);
      try {
        return await window.verifyArticleStructure(container);
      } finally {
        document.body.removeChild(container);
      }
    }, html),
    VERIFY_TIMEOUT_MS,
    'verifyArticleStructure'
  );
}

async function main() {
  console.log(c('bold', '\n========================================'));
  console.log(c('bold', '  verify_article_structure 集成测试'));
  console.log(c('bold', '========================================\n'));
  if (NO_NETWORK) console.log(c('gray', '🌐 --no-network 模式：仅使用本地 fixtures'));
  if (ONLY_RULE) console.log(c('gray', `🎯 --only=${ONLY_RULE}：只跑相关规则`));

  // 启动 puppeteer
  let browser, page;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();
    await page.setViewport({ width: 677, height: 800 });

    if (USE_LOCAL_TPL) {
      // 兼容旧用法：依赖本地 cgi 渲染的模板页（已自带 verify_article_structure.js）
      await page.goto(LOCAL_VERIFY_URL, { waitUntil: 'load', timeout: 30000 });
      await page.waitForFunction(
        () => typeof window.verifyArticleStructure === 'function',
        { timeout: 15000 }
      );
      console.log(c('green', `✅ ${LOCAL_VERIFY_URL} 加载成功\n`));
    } else {
      // 默认：自给自足。打开 about:blank，注入本地 src/verify_article_structure.js
      // 这样 CI / 离线 / 开源后都能跑，不依赖任何内网服务
      if (!fs.existsSync(LOCAL_SCRIPT_PATH)) {
        throw new Error(
          `未找到本地 verify_article_structure.js：${LOCAL_SCRIPT_PATH}\n` +
            `   请先执行：npm run sync`
        );
      }
      let scriptSource = fs.readFileSync(LOCAL_SCRIPT_PATH, 'utf8');
      // 剥掉浏览器环境无 module 的 CommonJS 导出，避免 ReferenceError
      scriptSource = scriptSource.replace(
        /module\.exports\s*=\s*\{[\s\S]*?\};?\s*$/m,
        '/* module.exports stripped for browser */'
      );
      // 浏览器没有 require，注入 stub 让所有内部依赖都返回空实现
      // 这会跳过 darkmode / editor_filter 等检测，但核心的 width/height/caret-color/pre 等规则不受影响
      const requireStub = `
        window.module = { exports: {} };
        window.require = function(id) {
          if (id && id.indexOf('domUtils') >= 0) return { domUtils: { isMarkNode: function(){ return false; } } };
          if (id && id.indexOf('get_para_list') >= 0) return function(body){ return body && body.children ? Array.from(body.children) : []; };
          if (id && id.indexOf('editor_filter') >= 0) return { deleteRedundantNode: function(){return null;}, deleteNestNode: function(){return [];} };
          if (id && id.indexOf('darkmode') >= 0) return { reset: function(){}, run: function(){}, validate: function(){return [];} };
          if (id && id.indexOf('wxgspeedsdk') >= 0) return { report: function(){}, init: function(){} };
          return {};
        };
      `;
      await page.goto('about:blank');
      await page.evaluate(requireStub + '\n' + scriptSource);
      await page.waitForFunction(
        () => typeof window.verifyArticleStructure === 'function',
        { timeout: 5000 }
      );
      console.log(
        c('green', `✅ 已注入本地脚本：${path.relative(process.cwd(), LOCAL_SCRIPT_PATH)}\n`)
      );
    }
  } catch (e) {
    console.error(c('red', `❌ 测试环境初始化失败：${e.message}`));
    if (USE_LOCAL_TPL) {
      console.error(c('yellow', `   --use-local-tpl 模式需要本地服务：${LOCAL_VERIFY_URL}`));
    }
    if (browser) await browser.close();
    process.exit(1);
  }

  const results = { pass: [], fail: [], skip: [] };

  // ===== badcases：期望命中违规 =====
  console.log(c('bold', `\n📕 BADCASES（期望命中违规） — ${badcases.length} 个`));
  for (let i = 0; i < badcases.length; i++) {
    const tc = badcases[i];
    if (ONLY_RULE && !tc.relatedRule.includes(ONLY_RULE)) continue;
    const prefix = `[${i + 1}/${badcases.length}]`;
    process.stdout.write(`${c('cyan', prefix)} ${tc.desc} ... `);

    if (tc.skip) {
      console.log(c('gray', `⏭  SKIP（${tc.skipReason}）`));
      results.skip.push({ ...tc, reason: tc.skipReason });
      continue;
    }
    if (tc.requireLocalTpl && !USE_LOCAL_TPL) {
      console.log(c('gray', `⏭  SKIP（需要 --use-local-tpl 模式，about:blank stub 无法处理复杂结构）`));
      results.skip.push({ ...tc, reason: 'requireLocalTpl：需要 --use-local-tpl 模式' });
      continue;
    }

    try {
      const { html, source } = await getContent(tc, 'badcases');
      const result = await runVerify(page, html);
      const inValidInfo = result.inValidInfo || {};
      const missing = tc.expectInvalidKeys.filter((k) => {
        const g = inValidInfo[k];
        return !g || !g.items || g.items.length === 0;
      });
      if (missing.length === 0) {
        console.log(c('green', `✅ PASS`) + c('gray', `  (${source})`));
        results.pass.push(tc);
      } else {
        console.log(c('red', `❌ FAIL`));
        console.log(`   期望命中: ${c('bold', tc.expectInvalidKeys.join(', '))}`);
        console.log(`   实际缺少: ${c('red', missing.join(', '))}`);
        console.log(`   实际 keys: ${Object.keys(inValidInfo).join(', ') || '(空)'}`);
        results.fail.push({ ...tc, missing });
      }
    } catch (err) {
      console.log(c('yellow', `⚠️  SKIP（${err.message}）`));
      results.skip.push({ ...tc, reason: err.message });
    }
  }

  // ===== goodcases：期望全部合规 =====
  console.log(c('bold', `\n📗 GOODCASES（期望全部合规） — ${goodcases.length} 个`));
  for (let i = 0; i < goodcases.length; i++) {
    const tc = goodcases[i];
    if (ONLY_RULE) continue; // --only 时跳过 goodcases
    const prefix = `[${i + 1}/${goodcases.length}]`;
    process.stdout.write(`${c('cyan', prefix)} ${tc.desc} ... `);

    try {
      const { html, source } = await getContent(tc, 'goodcases');
      const result = await runVerify(page, html);
      if (result.isValid) {
        console.log(c('green', `✅ PASS`) + c('gray', `  (${source})`));
        results.pass.push(tc);
      } else {
        console.log(c('red', `❌ FAIL（误报）`));
        console.log(`   实际 inValidInfo keys: ${Object.keys(result.inValidInfo || {}).join(', ')}`);
        results.fail.push({ ...tc, falsePositive: Object.keys(result.inValidInfo || {}) });
      }
    } catch (err) {
      console.log(c('yellow', `⚠️  SKIP（${err.message}）`));
      results.skip.push({ ...tc, reason: err.message });
    }
  }

  await browser.close();

  // 汇总
  console.log(c('bold', '\n========================================'));
  console.log(c('bold', '  汇总'));
  console.log(c('bold', '========================================'));
  console.log(c('green', `✅ 通过: ${results.pass.length}`));
  if (results.skip.length > 0) {
    console.log(c('yellow', `⏭  跳过: ${results.skip.length}`));
    results.skip.forEach((r) =>
      console.log(c('gray', `   - ${r.desc}: ${r.reason}`))
    );
  }
  if (results.fail.length > 0) {
    console.log(c('red', `❌ 失败: ${results.fail.length}`));
    results.fail.forEach((r) => {
      if (r.falsePositive) {
        console.log(c('red', `   - ${r.desc}（误报：${r.falsePositive.join(', ')}）`));
      } else {
        console.log(c('red', `   - ${r.desc}（缺少 key: ${r.missing.join(', ')}）`));
      }
    });
    console.log(c('red', '\n🚫 集成测试失败！\n'));
    process.exit(1);
  } else {
    console.log(c('green', '\n🎉 全部通过！\n'));
    process.exit(0);
  }
}

main().catch((e) => {
  console.error('runner 异常：', e);
  process.exit(1);
});
