#!/usr/bin/env node
// Bin entry: dispatch `check` / `dedupe` subcommands to the matching runner.
// index.ts / clean.ts internally call process.exit, so we just await them.

import { runCheck } from './index.js';
import { runDedupe } from './clean.js';

const HELP = `verify-article-structure — 文章结构检测 & 清理 CLI

用法:
  verify-article-structure <command> [options]

命令:
  check <file.html>     跑全规则检测（puppeteer 真实浏览器）
  dedupe <file.html>    清理冗余嵌套（jsdom 真删 → 输出清理后 HTML）

各命令的帮助:
  verify-article-structure check -h
  verify-article-structure dedupe -h

退出码:
  check  0 无违规 / 1 检测到违规 / 2 执行异常
  dedupe 0 清理成功 / 2 执行异常
`;

const subcommand = process.argv[2];

async function main(): Promise<void> {
  switch (subcommand) {
    case 'check':
      await runCheck(process.argv.slice(3));
      return;
    case 'dedupe':
      await runDedupe(process.argv.slice(3));
      return;
    case '-h':
    case '--help':
    case undefined:
      process.stdout.write(HELP);
      process.exit(0);
    default:
      process.stderr.write(`✗ 未知命令：${subcommand}\n\n${HELP}`);
      process.exit(2);
  }
}

main().catch((e) => {
  process.stderr.write(`✗ 未捕获异常：${(e as Error)?.stack || e}\n`);
  process.exit(2);
});
