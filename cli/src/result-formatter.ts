/**
 * result-formatter.ts
 *
 * Result formatting: human-readable + --json.
 *
 * - formatHuman: mirrors run.js printResultDetail style. Emits isValid + the
 *   violation key list, with each key's items showing a truncated outerHTML
 *   (layout rules also surface parentHeight/childHeight measurement fields).
 * - formatJson: emits { isValid, source, violations: [{ key, message, items }] }
 *   as valid JSON.
 *
 * violations are derived from the engine's inValidInfo.
 *
 * NOTE: user-facing output strings stay Chinese (cli.test.ts asserts on them).
 */
import type { VerifyResult, ViolationEntry, ViolationItem } from './browser-runner.js';
import { propertyRules, WIDTH_DETAIL_RULES } from '../engine/rules-text.js';

/** Max outerHTML length shown in human-readable output. */
const OUTERHTML_TRUNCATE = 200;

/**
 * Resolve a human-readable description for a violation key.
 *
 * Priority:
 *   1. entry.violateRules (set by the engine on the group)
 *   2. propertyRules[key] (the product copy in rules-text.ts)
 *   3. empty string (unknown key — caller skips the line)
 */
function getGroupDescription(key: string, entry: ViolationEntry | undefined): string {
  const groupRules = entry?.violateRules;
  if (typeof groupRules === 'string' && groupRules.trim().length > 0) return groupRules;
  const fallback = propertyRules[key];
  return typeof fallback === 'string' ? fallback : '';
}

/**
 * Resolve a per-item description (e.g. width rules have sub-categories like
 * "不同屏幕下宽度差异" → WIDTH_DETAIL_RULES lookup).
 */
function getItemDescription(key: string, item: ViolationItem): string {
  const sub = (item as any).rules;
  if (typeof sub !== 'string' || !sub.trim()) return '';
  if (key === 'width') {
    return WIDTH_DETAIL_RULES[sub] || sub;
  }
  return sub;
}

function truncate(s: string | undefined, max: number): string {
  if (!s) return '';
  return s.length > max ? s.substring(0, max) + '...' : s;
}

/** Build a single item: truncated outerHTML + remaining measurement fields as-is. */
function formatItem(item: ViolationItem): Record<string, unknown> {
  const { outerHTML, ...rest } = item;
  return {
    outerHTML: truncate(outerHTML, OUTERHTML_TRUNCATE),
    ...rest,
  };
}

/**
 * Human-readable output (mirrors run.js printResultDetail style).
 */
export function formatHuman(result: VerifyResult, source: string): string {
  const inValidInfo = result.inValidInfo || {};
  const keys = Object.keys(inValidInfo);
  const warnMsgs = result.warnMsgs || [];
  const lines: string[] = [];

  lines.push('文章样式检测结果');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push(`来源：${source}`);
  lines.push(`isValid：${result.isValid ? 'true（无违规）' : 'false（有违规）'}`);
  if (warnMsgs.length > 0) {
    lines.push(`warnMsgs：${warnMsgs.length} 条`);
    warnMsgs.slice(0, 3).forEach((m, idx) => lines.push(`  ⚠ warn[${idx}]: ${m}`));
    if (warnMsgs.length > 3) lines.push(`  ⚠ ... 还有 ${warnMsgs.length - 3} 条 warn`);
  }
  lines.push('━━━━━━━━━━━━━━━━━━━━');

  if (result.isValid || keys.length === 0) {
    lines.push('✓ 未检测到违规');
    return lines.join('\n');
  }

  lines.push(`✗ 检测到 ${keys.length} 类违规：`);
  keys.forEach((key, idx) => {
    const entry: ViolationEntry = inValidInfo[key];
    const items = entry?.items || [];
    const message = entry?.message || '';
    const groupDesc = getGroupDescription(key, entry);
    lines.push('');
    lines.push(`[${idx + 1}] ${key}`);
    if (message) lines.push(`    描述：${message}`);
    if (!message && groupDesc) lines.push(`    描述：${groupDesc}`);
    lines.push(`    违规节点 ${items.length} 个：`);
    items.slice(0, 5).forEach((item) => {
      const html = truncate(item.outerHTML, OUTERHTML_TRUNCATE);
      // Layout rules carry parentHeight/childHeight; annotate them when present.
      const extras: string[] = [];
      if (typeof item.parentHeight === 'number' || typeof item.childHeight === 'number') {
        extras.push(`父 height: ${item.parentHeight}, 子 height: ${item.childHeight}`);
      }
      const extra = extras.length ? `  (${extras.join('; ')})` : '';
      // Per-item sub-description (e.g. width 子规则).
      const subDesc = getItemDescription(key, item);
      const subLine = subDesc ? `\n        原因：${subDesc}` : '';
      lines.push(`      - ${html}${extra}${subLine}`);
    });
    if (items.length > 5) lines.push(`      ... 还有 ${items.length - 5} 条`);
  });
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  return lines.join('\n');
}

/** Structured JSON output shape. */
export interface JsonOutput {
  isValid: boolean;
  source: string;
  violations: Array<{
    key: string;
    message: string;
    items: Array<Record<string, unknown>>;
  }>;
  warnMsgs?: string[];
}

/**
 * Structured JSON output (valid JSON).
 */
export function formatJson(result: VerifyResult, source: string): string {
  const inValidInfo = result.inValidInfo || {};
  const keys = Object.keys(inValidInfo);
  const output: JsonOutput = {
    isValid: result.isValid,
    source,
    violations: keys.map((key) => {
      const entry: ViolationEntry = inValidInfo[key];
      const items = (entry?.items || []).map(formatItem);
      // Prefer the engine-provided message; fall back to the rules-text lookup
      // so consumers always get a non-empty description.
      const message = entry?.message || getGroupDescription(key, entry);
      return {
        key,
        message,
        items,
      };
    }),
  };
  if (result.warnMsgs && result.warnMsgs.length > 0) {
    output.warnMsgs = result.warnMsgs;
  }
  return JSON.stringify(output, null, 2);
}
