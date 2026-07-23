// pre: collect <pre> with non-empty text (overflow measured later in layout).

import type { RuleContext, RuleCandidate, PropertyMaps } from './types.js';

export function checkPreViolation(
  n: any,
  paragraphIndex: number,
  propertyMaps: PropertyMaps,
  ctx: RuleContext,
): RuleCandidate | null {
  const textContent = n.textContent ? n.textContent.replace(/​|\s/g, '') : '';
  if (textContent.length === 0) return null;
  const violationId = ctx.ensureViolationId(n, paragraphIndex);
  const item: RuleCandidate = {
    paragraphIndex,
    node: n,
    property: 'pre',
    violationId,
    outerHTML: ctx.getCleanOuterHTML(n),
  };
  propertyMaps['pre'].set(paragraphIndex, item);
  return item;
}
