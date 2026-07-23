// text-align: non-standard value (start|end) → violation.

import type { RuleContext, RuleCandidate, PropertyMaps } from './types.js';

export function checkTextAlignViolation(
  n: any,
  paragraphIndex: number,
  propertyMaps: PropertyMaps,
  ctx: RuleContext,
): RuleCandidate | null {
  const ta = ctx.getInlineStyleValue(n, 'text-align');
  if (ta && /^(start|end)$/i.test(ta)) {
    const item: RuleCandidate = {
      paragraphIndex,
      node: n,
      property: 'text-align',
      value: ta,
      violationId: ctx.ensureViolationId(n, paragraphIndex),
      outerHTML: ctx.getCleanOuterHTML(n),
    };
    propertyMaps['text-align'].set(paragraphIndex, item);
    return item;
  }
  return null;
}
