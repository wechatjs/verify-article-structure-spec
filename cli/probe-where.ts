// TEMP probe: for each darkmode violation, show its REAL text content + resolved paragraph's text
// 验证 paragraphIndex 是否真实对应视觉段落，特别是那 3 个 0
import { loadBrowserBundle } from './src/bundle-loader.js';
import puppeteer from 'puppeteer';
import fs from 'node:fs';

const html = fs.readFileSync('../e.html', 'utf8');
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 677, height: 800 });
const bundle = await loadBrowserBundle();
await page.goto('about:blank');
await page.evaluate(bundle + '\nwindow.verifyArticleStructure = __verifyArticleStructureModule__.verifyArticleStructure;');

const diag = await page.evaluate((articleHtml: string) => {
  const container = document.createElement('div');
  container.innerHTML = articleHtml;
  // 先跑一遍让引擎盖章 data-blockidx，然后手动复刻 darkmode validate 找出每个违规 strong
  return (window as any).verifyArticleStructure(container, {}).then(() => {
    const out: any[] = [];
    container.querySelectorAll('strong,span,b,section,p').forEach((el: any) => {
      const st = el.getAttribute('style') || '';
      if (!/linear-gradient/i.test(st)) return;
      // 反查段号（与引擎同逻辑）
      let anc: any = el, idx: any = null;
      while (anc) {
        if (anc.getAttribute && anc.getAttribute('data-blockidx') !== null) {
          idx = anc.getAttribute('data-blockidx');
          break;
        }
        anc = anc.parentNode;
      }
      // 该违规的文字内容
      const text = (el.textContent || '').trim().slice(0, 25);
      // 找到它所在「视觉段落」的文本（往上找最近的 p 或叶子 section）
      let p: any = el;
      while (p && p.tagName !== 'P') p = p.parentElement;
      const paraText = p ? (p.textContent || '').trim().slice(0, 30) : '(无p祖先)';
      out.push({ resolved: idx, text, paraText });
    });
    return out;
  });
}, html);
console.log(JSON.stringify(diag, null, 1));
await browser.close();
