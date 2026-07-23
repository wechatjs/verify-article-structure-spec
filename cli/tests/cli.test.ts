/**
 * cli.test.ts — E2E 测试
 *
 * 通过子进程跑真实 CLI（tsx src/index.ts），对违规 / 干净 HTML fixture 断言退出码与输出。
 * 不 mock 引擎、不 mock puppeteer——走完整 CLI → puppeteer → 引擎链路（与 `verify` skill
 * 「drive the surface」一致：surface 是 CLI 子进程，observe 真实 stdout + 退出码）。
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// cli/ 目录：tests/ 的上一级
const CLI_DIR = path.resolve(__dirname, '..');
const TSX = path.join(CLI_DIR, 'node_modules', '.bin', 'tsx');
const FIXTURES = path.join(CLI_DIR, 'tests', 'fixtures');

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

function runCli(args: string[]): RunResult {
  try {
    const stdout = execFileSync(TSX, [path.join(CLI_DIR, 'src', 'index.ts'), ...args], {
      cwd: CLI_DIR,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120000,
    });
    return { code: 0, stdout, stderr: '' };
  } catch (e: any) {
    return { code: e.status ?? 2, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

const VIOLATIONS_HTML = `<section>
  <p style="caret-color: rgba(0,0,0,0)">透明光标段落</p>
  <div style="height:1px;overflow:hidden;">
    <div style="height:120px;">溢出子元素（子高度远大于父 height）</div>
  </div>
</section>`;

const CLEAN_HTML = `<p>这是一个普通段落，没有任何样式问题。</p>`;

function writeFixture(name: string, html: string): string {
  const p = path.join(FIXTURES, name);
  fs.writeFileSync(p, html, 'utf8');
  return p;
}

describe('article-style-checker CLI (E2E)', () => {
  const violationsPath = writeFixture('e2e-violations.html', VIOLATIONS_HTML);
  const cleanPath = writeFixture('e2e-clean.html', CLEAN_HTML);

  test('违规 HTML：检出 caret-color + height-nodisplay（含布局类），退出码 1', () => {
    const r = runCli([violationsPath]);
    expect(r.code).toBe(1);
    expect(r.stdout).toContain('caret-color');
    expect(r.stdout).toContain('height-nodisplay');
    expect(r.stdout).toContain('isValid：false');
  });

  test('干净 HTML：无违规，isValid=true，退出码 0', () => {
    const r = runCli([cleanPath]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('isValid：true');
    expect(r.stdout).toContain('未检测到违规');
  });

  test('--json：输出合法 JSON，含 isValid / source / violations（items 含 outerHTML 截断）', () => {
    const r = runCli([violationsPath, '--json']);
    expect(r.code).toBe(1);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.isValid).toBe(false);
    expect(typeof parsed.source).toBe('string');
    expect(Array.isArray(parsed.violations)).toBe(true);
    const keys = parsed.violations.map((v: any) => v.key);
    expect(keys).toContain('caret-color');
    expect(keys).toContain('height-nodisplay');
    // items 含 outerHTML 截断
    const caret = parsed.violations.find((v: any) => v.key === 'caret-color');
    expect(caret.items.length).toBeGreaterThan(0);
    expect(caret.items[0].outerHTML).toContain('caret-color');
  });

  test('--help：退出码 0，含用法说明', () => {
    const r = runCli(['--help']);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('pnpm check');
    expect(r.stdout).toContain('--json');
  });

  test('缺文件来源：执行异常，退出码 2', () => {
    const r = runCli([]);
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/来源|HTML/);
  });
});
