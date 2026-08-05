// CLI entry: parse args → read HTML → run detection via puppeteer → format → exit.
// HELP text and error messages stay Chinese (cli.test.ts asserts on them).

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser, runVerify } from './browser-runner.js';
import { formatHuman, formatJson } from './result-formatter.js';

const HELP = `文章样式检测 CLI（puppeteer 真实浏览器跑全规则）

用法:
  pnpm check <file.html> [options]

位置参数:
  file                HTML 文件路径（必填）

选项:
  --json              输出结构化 JSON
  --executable-path=<path>  指定 Chromium 可执行文件路径（CI 场景）
  -h, --help          显示帮助

退出码:
  0  无违规
  1  检测到违规
  2  执行异常（puppeteer 启动失败 / 读取文件失败等）
`;

interface ParsedArgs {
  file?: string;
  json: boolean;
  executablePath?: string;
  help: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { json: false, help: false };
  const positional: string[] = [];
  for (const a of argv) {
    if (a === '-h' || a === '--help') {
      args.help = true;
    } else if (a === '--json') {
      args.json = true;
    } else if (a.startsWith('--executable-path=')) {
      args.executablePath = a.slice('--executable-path='.length);
    } else if (a.startsWith('--')) {
      throw new Error(`未知选项：${a}`);
    } else {
      positional.push(a);
    }
  }
  args.file = positional[0];
  return args;
}

async function readHtml(args: ParsedArgs): Promise<{ html: string; source: string }> {
  if (!args.file) {
    throw new Error('未指定 HTML 来源：需提供文件路径');
  }
  // npm scripts run `cd .../cli && tsx ...`, so process.cwd() is cli/ and a
  // relative path would resolve against cli/ and miss the file. npm/pnpm inject
  // the invoking directory as INIT_CWD; resolve against it so a relative path
  // from the repo root still works. Absolute paths are unaffected.
  const baseDir = process.env.INIT_CWD ?? process.cwd();
  const filePath = path.resolve(baseDir, args.file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在：${filePath}`);
  }
  const html = fs.readFileSync(filePath, 'utf8');
  return { html, source: args.file };
}

async function main(args: string[]) {
  const parsed = parseArgs(args);
  if (parsed.help) {
    process.stdout.write(HELP);
    process.exit(0);
  }

  let html: string;
  let source: string;
  try {
    ({ html, source } = await readHtml(parsed));
  } catch (e) {
    process.stderr.write(`✗ 读取来源失败：${(e as Error).message}\n`);
    process.exit(2);
  }

  const { browser, page } = await launchBrowser({ executablePath: parsed.executablePath });
  try {
    const result = await runVerify(page, html);
    const out = parsed.json ? formatJson(result, source) : formatHuman(result, source);
    process.stdout.write(out + '\n');
    process.exit(result.isValid ? 0 : 1);
  } catch (e) {
    process.stderr.write(`✗ 检测执行失败：${(e as Error).message}\n`);
    process.exit(2);
  } finally {
    await browser.close();
  }
}

/**
 * Programmatic check entry: parse the given args and run full-rule detection.
 * Exported so the bin dispatcher (cli.ts) and tests can call it. Internally
 * calls process.exit on completion (0 clean / 1 violations / 2 error).
 */
export async function runCheck(args: string[]): Promise<void> {
  await main(args);
}

// Run directly via `tsx src/index.ts ...` (tests / legacy `pnpm check`), but
// stay inert when imported by the dispatcher (cli.ts). The ESM direct-execute
// guard compares the current module URL against the entry script path.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((e) => {
    process.stderr.write(`✗ 未捕获异常：${(e as Error)?.stack || e}\n`);
    process.exit(2);
  });
}
