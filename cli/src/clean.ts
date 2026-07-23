// CLI entry for dedupe: parse args -> read HTML -> jsdom clean pipeline
// -> output cleaned HTML (stdout / --out), optionally --verify prints before/after
// nestNodes to stderr. HELP text and error messages stay Chinese (clean.test.ts
// asserts on them). Cleaned HTML always goes to stdout so it can be redirected.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runClean, runCleanWithVerify } from './clean-runner.js';

const HELP = `文章冗余嵌套清理 CLI（jsdom 解析 → deleteNestNode 真删 → 序列化输出）

用法:
  pnpm dedupe <file.html> [options]

位置参数:
  file                HTML 文件路径（必填）

选项:
  --out=<path>        清理后 HTML 写入指定文件（默认写 stdout）
  --verify            额外用 puppeteer 跑 before/after nestNodes 数，打印到 stderr
  -h, --help          显示帮助

退出码:
  0  清理成功（clean 不区分违规/合规，总是输出清理结果）
  2  执行异常（读取来源失败 / jsdom 解析失败等）
`;

interface ParsedArgs {
  file?: string;
  out?: string;
  verify: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { verify: false, help: false };
  const positional: string[] = [];
  for (const a of argv) {
    if (a === '-h' || a === '--help') {
      args.help = true;
    } else if (a === '--verify') {
      args.verify = true;
    } else if (a.startsWith('--out=')) {
      args.out = a.slice('--out='.length);
    } else if (a.startsWith('--')) {
      throw new Error(`未知选项：${a}`);
    } else {
      positional.push(a);
    }
  }
  args.file = positional[0];
  return args;
}

async function readHtml(args: ParsedArgs): Promise<string> {
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
  return fs.readFileSync(filePath, 'utf8');
}

async function main(args: string[]) {
  const parsed = parseArgs(args);
  if (parsed.help) {
    process.stdout.write(HELP);
    process.exit(0);
  }

  let html: string;
  try {
    html = await readHtml(parsed);
  } catch (e) {
    process.stderr.write(`✗ 读取来源失败：${(e as Error).message}\n`);
    process.exit(2);
  }

  try {
    if (parsed.verify) {
      const { cleanedHtml, before, after } = await runCleanWithVerify(html);
      process.stderr.write(`nestNodes: ${before} → ${after}\n`);
      writeOutput(parsed, cleanedHtml);
    } else {
      const cleanedHtml = runClean(html);
      writeOutput(parsed, cleanedHtml);
    }
    process.exit(0);
  } catch (e) {
    process.stderr.write(`✗ 清理执行失败：${(e as Error).message}\n`);
    process.exit(2);
  }
}

/** Write cleaned HTML to --out file (resolved against INIT_CWD) or stdout. */
function writeOutput(args: ParsedArgs, cleanedHtml: string): void {
  if (args.out) {
    const baseDir = process.env.INIT_CWD ?? process.cwd();
    const outPath = path.resolve(baseDir, args.out);
    fs.writeFileSync(outPath, cleanedHtml, 'utf8');
  } else {
    process.stdout.write(cleanedHtml);
  }
}

/**
 * Programmatic dedupe entry: parse the given args and run the clean pipeline.
 * Exported so the bin dispatcher (cli.ts) and tests can call it. Internally
 * calls process.exit on completion (0 success / 2 error).
 */
export async function runDedupe(args: string[]): Promise<void> {
  await main(args);
}

// Run directly via `tsx src/clean.ts ...` (tests / legacy `pnpm dedupe`), but
// stay inert when imported by the dispatcher (cli.ts). The ESM direct-execute
// guard compares the current module URL against the entry script path.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((e) => {
    process.stderr.write(`✗ 未捕获异常：${(e as Error)?.stack || e}\n`);
    process.exit(2);
  });
}
