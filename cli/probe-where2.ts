// TEMP probe: why is stamp 0 "valid"? inspect paragraphList[0] and ancestor chain
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
  return (window as any).verifyArticleStructure(container, {}).then(() => {
    const strong = Array.from(container.querySelectorAll('strong')).find((s: any) =>
      (s.textContent || '').includes('理解：'));
    // 祖先链 + 每层的 stamp
    const chain: any[] = [];
    let el: any = strong;
    while (el && el !== container) {
      chain.push({
        tag: el.tagName,
        stamp: el.getAttribute ? el.getAttribute('data-blockidx') : null,
        text: (el.textContent || '').trim().slice(0, 12),
      });
      el = el.parentNode;
    }
    return { chain };
  });
}, html);
console.log('「理解：」strong 的祖先链（从内到外）:');
diag.chain.forEach((c: any) => console.log(`  <${c.tag}> stamp=${c.stamp} "${c.text}"`));
await browser.close();
