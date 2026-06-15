/**
 * 快速调试：用 puppeteer 加载 fixture，打印 verify 结果
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const { badcases, goodcases } = require('./__tests__/cases.config.js');

const FIXTURES_DIR = path.resolve(__dirname, '__tests__/fixtures');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 677, height: 800 });

  // 使用本地模板页加载（含 verifyArticleStructure）
  await page.goto(
    'http://localhost:8003/cgi-bin/readtemplate?t=media/get_article_structure_tmpl',
    { waitUntil: 'load', timeout: 30000 }
  );
  await page.waitForFunction(
    () => typeof window.verifyArticleStructure === 'function',
    { timeout: 15000 }
  );
  console.log('✅ 模板页加载成功\n');

  const fixtureMap = {
    badcases: badcases.map(tc => ({ ...tc, path: path.join(FIXTURES_DIR, 'badcases', `${tc.id}.html`) })),
    goodcases: goodcases.map(tc => ({ ...tc, path: path.join(FIXTURES_DIR, 'goodcases', `${tc.id}.html`) })),
  };

  for (const [kind, cases] of Object.entries(fixtureMap)) {
    console.log(`\n========== ${kind.toUpperCase()} ==========\n`);
    for (const tc of cases) {
      if (!fs.existsSync(tc.path)) { console.log(`[${tc.id}] ⚠️  fixture 不存在`); continue; }
      const html = fs.readFileSync(tc.path, 'utf8');
      try {
        const result = await page.evaluate((articleHtml) => {
          const container = document.createElement('div');
          container.className = 'rich_media_content';
          container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:677px;';
          container.innerHTML = articleHtml;
          document.body.appendChild(container);
          return window.verifyArticleStructure(container);
        }, html);

        const keys = Object.keys(result.inValidInfo || {});
        const expected = tc.expectInvalidKeys || [];
        const missing = expected.filter(k => !keys.includes(k));
        console.log(`[${tc.desc || tc.id}]`);
        console.log(`  期望: ${expected.join(', ') || '(空, goodcase)'}`);
        console.log(`  实际 keys: ${keys.join(', ') || '(空)'}`);
        if (result.isValid) {
          console.log(`  ✅ isValid = true`);
        } else {
          console.log(`  ❌ isValid = false`);
        }
        if (missing.length && kind === 'badcases') {
          console.log(`  ❌ 缺少期望 key: ${missing.join(', ')}`);
        }
        // 打印 height-nodisplay 详情
        if (result.inValidInfo && result.inValidInfo['height-nodisplay']) {
          console.log(`  height-nodisplay items: ${result.inValidInfo['height-nodisplay'].items.length}`);
          result.inValidInfo['height-nodisplay'].items.forEach((item, i) => {
            console.log(`    [${i}] 父 height: ${item.parentHeight}, 子 height: ${item.childHeight}`);
            console.log(`         outerHTML: ${(item.outerHTML || '').substring(0, 150)}`);
          });
        }
        // 打印 height 详情
        if (result.inValidInfo && result.inValidInfo.height) {
          console.log(`  height items: ${result.inValidInfo.height.items.length}`);
        }
        console.log('');
      } catch (e) {
        console.log(`[${tc.desc || tc.id}] ⚠️ 执行异常: ${e.message}\n`);
      }
    }
  }

  await browser.close();
})();
