/**
 * behavior/regression.test.ts — behavior regression contract
 *
 * Runs the cli's vendored engine bundle against this spec repo's
 * badcases/goodcases fixtures (local only, no network). Asserts:
 *   - badcase: Object.keys(inValidInfo) ⊇ expectInvalidKeys AND isValid === false
 *   - goodcase: isValid === true AND inValidInfo is empty
 *   - skip:true cases are skipped (matching run.js)
 *
 * This is the safety net for the vendor + refactor: it must stay green before
 * and after every module refactor step. Same injection path as the CLI itself
 * (browser-runner: puppeteer + cli vendor bundle + about:blank + free div).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { launchBrowser, runVerify } from '../../src/browser-runner.js';

// cli/tests/behavior/ → repo root is 3 levels up (../../../).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SPEC_DIR = path.resolve(__dirname, '../../..');
const require = createRequire(import.meta.url);
const { badcases, goodcases } = require(`${SPEC_DIR}/cases.config.js`) as {
  badcases: Array<{ id: string; expectInvalidKeys: string[]; skip?: boolean; skipReason?: string; desc?: string }>;
  goodcases: Array<{ id: string; desc?: string }>;
};

const FIXTURES_DIR = path.join(SPEC_DIR, '__tests__/fixtures');

function loadFixture(id: string, kind: 'badcases' | 'goodcases'): string | null {
  const p = path.join(FIXTURES_DIR, kind, `${id}.html`);
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  return null;
}

describe('cli vendored engine — behavior regression (spec badcases/goodcases)', () => {
  // One shared browser per test file to keep puppeteer launch cost down.
  let browser: Awaited<ReturnType<typeof launchBrowser>>['browser'] | null = null;
  let page: Awaited<ReturnType<typeof launchBrowser>>['page'] | null = null;

  beforeAll(async () => {
    const launched = await launchBrowser();
    browser = launched.browser;
    page = launched.page;
  }, 120000);

  afterAll(async () => {
    if (browser) await browser.close();
  });

  describe.each(badcases)('badcase $id', (c) => {
    const testFn = c.skip ? test.skip : test;
    testFn(`detects ⊇ ${JSON.stringify(c.expectInvalidKeys)} (${c.desc ?? ''})`, async () => {
      const html = loadFixture(c.id, 'badcases');
      if (!html) {
        // Fixture missing: skip with a warning (matches run.js), do not block.
        console.warn(`[regression] fixture missing for badcase ${c.id}, skipping`);
        return;
      }
      const result = await runVerify(page!, html);
      expect(result.isValid).toBe(false);
      const keys = Object.keys(result.inValidInfo);
      for (const expectedKey of c.expectInvalidKeys) {
        expect(keys).toContain(expectedKey);
      }
    }, 120000);
  });

  describe.each(goodcases)('goodcase $id', (c) => {
    test(`stays clean (isValid=true, empty inValidInfo) (${c.desc ?? ''})`, async () => {
      const html = loadFixture(c.id, 'goodcases');
      if (!html) {
        console.warn(`[regression] fixture missing for goodcase ${c.id}, skipping`);
        return;
      }
      const result = await runVerify(page!, html);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.inValidInfo)).toHaveLength(0);
    }, 120000);
  });
});
