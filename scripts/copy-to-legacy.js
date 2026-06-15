#!/usr/bin/env node
/**
 * copy-to-legacy.js
 *
 * postinstall 脚本：将权威 .md 从 spec 包同步到 packages/web-webapp-common/js/
 * 确保编辑器团队在旧路径看到的一直是最新版本。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.resolve(__dirname, '../verify_article_structure.md');
const DEST_DIR = path.join(ROOT, 'packages/web-webapp-common/js');
const DEST = path.join(DEST_DIR, 'verify_article_structure.md');

const HEADER = `<!--
  ⚠️ 此文件由 packages/verify-article-structure-spec 自动同步，请勿直接编辑。
  权威源：packages/verify-article-structure-spec/verify_article_structure.md
  版本：${require('../package.json').version}
-->

`;

const content = fs.readFileSync(SRC, 'utf8');
fs.writeFileSync(DEST, HEADER + content, 'utf8');
console.log(`  ✓ verify_article_structure.md → ${path.relative(ROOT, DEST)}`);
