#!/usr/bin/env node
/**
 * publish-spec.js
 *
 * 将整个 spec 包（规范文档 + 测试套件 + fixtures）同步发布到独立开源仓库。
 *
 * 流程：
 *   1. 读取本地 package.json 版本号
 *   2. clone/pull 独立仓库到临时目录
 *   3. 清空仓库内容（保留 .git）
 *   4. 将 spec 包内容拷贝到仓库：
 *      - verify_article_structure.md → README.md
 *      - __tests__/ → __tests__/
 *      - scripts/fetch-fixtures.js → scripts/fetch-fixtures.js
 *      - vitest.config.js → vitest.config.js
 *      - debug-fixtures.js → debug-fixtures.js
 *      - package.json, .gitignore 等
 *   5. commit + push
 *   6. 清理临时目录
 *
 * ⚠️ src/verify_article_structure.js 不会被推送（内部实现，不开源）
 *
 * 前置条件：
 *   - 本地已配置 git SSH key，能免密 push 到独立仓库
 *   - package.json 里的 version 已更新为本次发布版本号
 *
 * 使用：
 *   node scripts/publish-spec.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const REPO_URL = 'git@git.woa.com:daisyhhuang/verify-article-structure-spec.git';
const BRANCH = 'master';

const ROOT = path.resolve(__dirname, '..');
const PKG = require(path.join(ROOT, 'package.json'));
const VERSION = PKG.version;

const TMP_DIR = path.join(os.tmpdir(), `spec-publish-${Date.now()}`);

// 需要拷贝到开源仓库的文件/目录（相对于 spec 包根目录）
const COPY_LIST = [
  'verify_article_structure.md',
  'package.json',
  '.gitignore',
  'vitest.config.js',
  'debug-fixtures.js',
  '__tests__/',
  'scripts/',
  '公众号新功能提示测试汇总/',
];

function run(cmd, opts = {}) {
  console.log(`  > ${cmd}`);
  return execSync(cmd, { stdio: 'pipe', ...opts }).toString().trim();
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function main() {
  console.log(`\n🚀 发布 verify-article-structure-spec v${VERSION}\n`);

  // 1. clone 独立仓库
  console.log('📦 克隆独立仓库...');
  run(`git clone --depth 1 --branch ${BRANCH} ${REPO_URL} ${TMP_DIR}`);

  // 2. 清空仓库内容（保留 .git）
  console.log('🧹 清空仓库旧内容...');
  for (const entry of fs.readdirSync(TMP_DIR)) {
    if (entry === '.git') continue;
    const p = path.join(TMP_DIR, entry);
    fs.rmSync(p, { recursive: true, force: true });
  }

  // 3. 拷贝文件到仓库
  console.log('📝 拷贝文件...');
  for (const item of COPY_LIST) {
    const srcPath = path.join(ROOT, item);
    const destPath = path.join(TMP_DIR, item);
    if (!fs.existsSync(srcPath)) {
      console.log(`  ⚠️  跳过（不存在）：${item}`);
      continue;
    }
    copyRecursive(srcPath, destPath);
    const stat = fs.statSync(srcPath);
    const type = stat.isDirectory() ? '📁' : '📄';
    const size = stat.isDirectory() ? '' : ` (${(stat.size / 1024).toFixed(1)} KB)`;
    console.log(`  ${type} ${item}${size}`);
  }

  // 4. verify_article_structure.md → README.md
  const readmeSrc = path.join(TMP_DIR, 'verify_article_structure.md');
  const readmeDest = path.join(TMP_DIR, 'README.md');
  if (fs.existsSync(readmeSrc)) {
    fs.renameSync(readmeSrc, readmeDest);
    console.log('  🔄 verify_article_structure.md → README.md');
  }

  // 5. 确保包名在开源仓库中去掉 private
  const pkgPath = path.join(TMP_DIR, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    delete pkg.private;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log('  🔧 package.json: 去掉 private 标记');
  }

  // 6. commit + push
  console.log('📤 提交并推送...');
  run('git add -A', { cwd: TMP_DIR });
  run(`git commit -m "release: v${VERSION}" --allow-empty`, { cwd: TMP_DIR });
  run(`git push origin ${BRANCH}`, { cwd: TMP_DIR });

  // 7. 清理
  console.log('🧹 清理临时目录...');
  fs.rmSync(TMP_DIR, { recursive: true, force: true });

  console.log(`\n✅ 发布完成！v${VERSION}\n`);
  console.log(`   👉 https://git.woa.com/daisyhhuang/verify-article-structure-spec\n`);
}

try {
  main();
} catch (e) {
  console.error('\n❌ 发布失败：', e.stderr?.toString() || e.message);
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }
  process.exit(1);
}
