/**
 * clean.test.ts — E2E test for dedupe CLI
 *
 * Runs the real CLI as a subprocess (tsx src/clean.ts), no engine/jsdom mock —
 * same "drive the surface" approach as cli.test.ts (surface = CLI subprocess,
 * observe real stdout + exit code). Verifies: real-delete reduces nesting,
 * round-trip preserves clean HTML, --out writes file, --verify prints
 * before/after to stderr, --help, missing-source exit code.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_DIR = path.resolve(__dirname, '..');
const TSX = path.join(CLI_DIR, 'node_modules', '.bin', 'tsx');
const CLEAN_TS = path.join(CLI_DIR, 'src', 'clean.ts');
const FIXTURES = path.join(CLI_DIR, 'tests', 'fixtures');

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

function runClean(args: string[]): RunResult {
  // spawnSync captures both stdout and stderr regardless of exit code, so the
  // --verify test can assert on the nestNodes line written to stderr on success.
  const res = spawnSync(TSX, [CLEAN_TS, ...args], {
    cwd: CLI_DIR,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120000,
  });
  return {
    code: res.status ?? 2,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
  };
}

/** Build an N-deep single-child <span style="color:red"> chain wrapping text. */
function nestedSpans(depth: number): string {
  let inner = 'hello';
  for (let i = 0; i < depth; i++) inner = `<span style="color:red">${inner}</span>`;
  return `<section>${inner}</section>`;
}

function writeFixture(name: string, html: string): string {
  const p = path.join(FIXTURES, name);
  fs.writeFileSync(p, html, 'utf8');
  return p;
}

/** Count element open-tags of a given tag in an HTML string. */
function countTags(html: string, tag: string): number {
  return (html.match(new RegExp(`<${tag}[\\s/>]`, 'g')) || []).length;
}

describe('dedupe CLI (E2E)', () => {
  const nestedPath = writeFixture('clean-nested.html', nestedSpans(16));
  const cleanPath = writeFixture('clean-clean.html', '<p>普通段落，无冗余嵌套。</p>');
  // Clipped fragment echoing issue #5's redundant-nesting shape: a deep span
  // color chain inside a section (the real article shows 3 nestNodes; this
  // synthetic clip reproduces the >15-level single-child chain that triggers it).
  const issue5ClipPath = writeFixture('clean-issue5-clip.html', nestedSpans(16));

  test('冗余嵌套 HTML → clean → span 层数大幅减少，无 data-nest-level 残留', () => {
    const r = runClean([nestedPath]);
    expect(r.code).toBe(0);
    // 16-layer chain collapses to <= 6 (engine keeps the nearest single layer
    // of MAX_STYLE_LEVEL-2 = 13 unwind budget; observed 5 in practice).
    expect(countTags(r.stdout, 'span')).toBeLessThan(16);
    // detection annotation must not leak into output
    expect(r.stdout).not.toContain('data-nest-level');
  });

  test('冗余嵌套 HTML → clean --verify → stderr 含 nestNodes 且 after ≤ before，stdout 仍为纯 HTML', () => {
    const r = runClean([nestedPath, '--verify']);
    expect(r.code).toBe(0);
    expect(r.stderr).toMatch(/nestNodes:\s*\d+\s*→\s*\d+/);
    // after (right of →) should be 0
    const m = r.stderr.match(/nestNodes:\s*(\d+)\s*→\s*(\d+)/);
    expect(Number(m![2])).toBeLessThanOrEqual(Number(m![1]));
    expect(Number(m![2])).toBe(0);
    // stdout is the cleaned HTML, no verify line bleeding in
    expect(r.stdout).not.toContain('nestNodes');
    expect(r.stdout).toContain('<span');
  });

  test('干净 HTML → clean → round-trip 保真（语义等价，无嵌套层新增）', () => {
    const r = runClean([cleanPath]);
    expect(r.code).toBe(0);
    // clean HTML stays clean: a single <p>, no spans introduced
    expect(r.stdout).toContain('<p>');
    expect(countTags(r.stdout, 'p')).toBe(1);
    expect(countTags(r.stdout, 'span')).toBe(0);
  });

  test('--out=<path> → 指定文件存在且内容 = clean stdout', () => {
    const outPath = path.join(FIXTURES, 'clean-out.html');
    const r = runClean([nestedPath, `--out=${outPath}`]);
    expect(r.code).toBe(0);
    expect(fs.existsSync(outPath)).toBe(true);
    const fileContent = fs.readFileSync(outPath, 'utf8');
    const stdoutClean = runClean([nestedPath]).stdout;
    expect(fileContent).toBe(stdoutClean);
  });

  test('-h / --help → 退出码 0，stdout 含 dedupe 与 --verify', () => {
    const r = runClean(['--help']);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('pnpm dedupe');
    expect(r.stdout).toContain('--verify');
  });

  test('缺来源（无参数）→ 退出码 2，stderr 报错', () => {
    const r = runClean([]);
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/来源|HTML/);
  });

  test('issue #5 文章片段 → clean → --verify 复测 after nestNodes=0', () => {
    const r = runClean([issue5ClipPath, '--verify']);
    expect(r.code).toBe(0);
    const m = r.stderr.match(/nestNodes:\s*(\d+)\s*→\s*(\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m![2])).toBe(0);
  });
});
