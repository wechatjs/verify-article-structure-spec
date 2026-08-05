// font-family: custom inline font-family (non-allowlist prefix) → violation.

import type { RuleContext, RuleCandidate, PropertyMaps } from './types.js';

const normalizeFontFamily = (fontStr: string) =>
  fontStr.replace(/["']/g, '').replace(/\s+/g, ' ').trim();

const allowedFontFamily = normalizeFontFamily('"mp-quote", PingFang SC, system-ui, -apple-system');

export function checkFontFamilyViolation(
  n: any,
  paragraphIndex: number,
  _propertyMaps: PropertyMaps,
  _tag: string,
  ctx: RuleContext,
): RuleCandidate | null {
  const ff = ctx.getInlineStyleValue(n, 'font-family');
  if (ff && !normalizeFontFamily(ff).startsWith(allowedFontFamily)) {
    return {
      paragraphIndex,
      node: n,
      property: 'font-family',
      value: ff,
      rule: ctx.propertyRules['font-family'],
      violationId: ctx.ensureViolationId(n, paragraphIndex),
    };
  }
  return null;
}
