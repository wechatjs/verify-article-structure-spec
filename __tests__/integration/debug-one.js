#!/usr/bin/env node
/**
 * 临时调试脚本：跑单篇 fixture，把 verifyArticleStructure 的完整返回值打印出来
 *
 * 用法：node __tests__/integration/debug-one.js <fixture-id> [--kind=goodcases|badcases]
 * 默认 kind=goodcases
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const kindArg = args.find((a) => a.startsWith('--kind='));
const kind = kindArg ? kindArg.replace('--kind=', '') : 'goodcases';

if (!id) {
  console.error('请传入 fixture id，例如：node debug-one.js Y8lDF7sNwp5iwDrGq7ZGBQ');
  process.exit(1);
}

const FIXTURE_PATH = path.resolve(__dirname, `../fixtures/${kind}/${id}.html`);
const LOCAL_SCRIPT_PATH = path.resolve(__dirname, '../../verify-article-structure/src/verify_article_structure.js');

if (!fs.existsSync(FIXTURE_PATH)) {
  console.error('未找到 fixture：', FIXTURE_PATH);
  process.exit(1);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 677, height: 800 });

  let scriptSource = fs.readFileSync(LOCAL_SCRIPT_PATH, 'utf8');
  scriptSource = scriptSource.replace(
    /module\.exports\s*=\s*\{[\s\S]*?\};?\s*$/m,
    '/* stripped */'
  );
  // 浏览器没有 require，注入一个 stub，把所有依赖都返回成空实现
  const STUB_PRELUDE = `
    window.module = { exports: {} };
    window.require = function(id){
      if (id && id.indexOf('domUtils') >= 0) return { domUtils: { isMarkNode: function(){ return false; } } };
      if (id && id.indexOf('get_para_list') >= 0) return function(body){ return body && body.children ? Array.from(body.children) : []; };
      if (id && id.indexOf('editor_filter') >= 0) return { deleteRedundantNode: function(){return null;}, deleteNestNode: function(){return [];} };
      if (id && id.indexOf('darkmode') >= 0) return { reset: function(){}, run: function(){}, validate: function(){return [];} };
      if (id && id.indexOf('wxgspeedsdk') >= 0) return { report: function(){}, init: function(){} };
      return {};
    };
  `;
  await page.goto('about:blank');
  await page.evaluate(STUB_PRELUDE + '\n' + scriptSource);
  await page.waitForFunction(
    () => typeof window.verifyArticleStructure === 'function',
    { timeout: 5000 }
  );

  const html = fs.readFileSync(FIXTURE_PATH, 'utf8');
  const result = await page.evaluate(async (htmlContent) => {
    const container = document.createElement('div');
    container.className = 'rich_media_content';
    container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:677px;';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);
    try {
      const r = await window.verifyArticleStructure(container);
      // 把可能存在的 DOM 节点引用剥掉，方便 JSON 序列化
      const safe = JSON.parse(
        JSON.stringify(r, (key, value) => {
          if (value && typeof value === 'object' && value.nodeType) {
            return `[DOM ${value.nodeName}#${value.id || ''}.${value.className || ''}]`;
          }
          return value;
        })
      );
      return safe;
    } finally {
      document.body.removeChild(container);
    }
  }, html);

  console.log('\n===== verifyArticleStructure 返回值 =====');
  console.log(JSON.stringify(result, null, 2));

  console.log('\n===== inValidInfo keys 概览 =====');
  const keys = Object.keys(result.inValidInfo || {});
  if (!keys.length) {
    console.log('(空)');
  } else {
    keys.forEach((k) => {
      const items = result.inValidInfo[k]?.items || [];
      console.log(`  - ${k}: items=${items.length}`);
    });
  }
  console.log('\nisValid =', result.isValid);
  console.log('layoutIssues =', JSON.stringify(result.layoutIssues || {}));

  await browser.close();
})().catch((e) => {
  console.error('debug 异常：', e);
  process.exit(1);
});
