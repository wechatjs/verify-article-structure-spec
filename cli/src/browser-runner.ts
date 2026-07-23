// puppeteer runner: launch browser → inject bundle → run engine → return result.

import puppeteer, { type Browser, type Page } from 'puppeteer';
import { loadBrowserBundle } from './bundle-loader.js';

/** Violation item returned by verifyArticleStructure (loose type; layout items add parentHeight/childHeight). */
export interface ViolationItem {
  outerHTML?: string;
  [key: string]: unknown;
}

/** Violation group keyed by property. */
export interface ViolationEntry {
  violateRules?: string;
  message?: string;
  items?: ViolationItem[];
  [key: string]: unknown;
}

/** Engine result. */
export interface VerifyResult {
  isValid: boolean;
  inValidInfo: Record<string, ViolationEntry>;
  warnMsgs?: string[];
  [key: string]: unknown;
}

/** puppeteer launch options. */
export interface RunnerOptions {
  /** System Chromium path (CI); falls back to puppeteer's bundled browser. */
  executablePath?: string;
  /** Detection timeout (ms); default 60000. */
  verifyTimeoutMs?: number;
}

/** page.evaluate script mounting the bundle's factory onto window. */
const MOUNT_SCRIPT = `
window.verifyArticleStructure = __verifyArticleStructureModule__.verifyArticleStructure;
`;

/**
 * Launch a browser, inject the bundle, return { browser, page }.
 * Caller is responsible for closing the browser in a finally block.
 */
export async function launchBrowser(opts: RunnerOptions = {}): Promise<{
  browser: Browser;
  page: Page;
}> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: opts.executablePath || process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 677, height: 800 });

  // Inject the browser bundle (built from the cli's vendored engine).
  const bundleSource = await loadBrowserBundle();
  await page.goto('about:blank');
  await page.evaluate(bundleSource + '\n' + MOUNT_SCRIPT);
  await page.waitForFunction(
    () => typeof (window as any).verifyArticleStructure === 'function',
    { timeout: 5000 },
  );
  return { browser, page };
}

/**
 * Run the engine's full rule set on the given HTML.
 *
 * @param page a page with the bundle already injected
 * @param html article HTML string
 * @param verifyTimeoutMs detection timeout
 * @returns the engine's { isValid, inValidInfo, warnMsgs }
 */
export async function runVerify(
  page: Page,
  html: string,
  verifyTimeoutMs = 60000,
): Promise<VerifyResult> {
// Matches run.js: use a plain div with innerHTML set, no position:absolute and no
// appendChild to document.body (absolute+appendChild pollutes the layout sandbox
// and causes false positives — verified empirically).
const result = await page.evaluate(
    async (articleHtml: string) => {
      const container = document.createElement('div');
      container.innerHTML = articleHtml;
      try {
        const res = await (window as any).verifyArticleStructure(container);
        return res;
      } finally {
        // Container is not attached to document.body, so no removeChild needed;
        // finally kept for future extension.
      }
    },
    html,
  );
  return result as VerifyResult;
}

/**
 * Convenience wrapper: launch → runVerify → close in one call.
 * For probe / single-shot detection.
 */
export async function verifyHtml(
  html: string,
  opts: RunnerOptions = {},
): Promise<VerifyResult> {
  const { browser, page } = await launchBrowser(opts);
  try {
    return await runVerify(page, html, opts.verifyTimeoutMs);
  } finally {
    await browser.close();
  }
}
