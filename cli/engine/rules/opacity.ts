// opacity: img with opacity:0 → violation.

import type { RuleContext, RuleCandidate, PropertyMaps } from './types.js';

export function checkOpacityViolation(
  n: any,
  paragraphIndex: number,
  propertyMaps: PropertyMaps,
  tag: string,
  ctx: RuleContext,
): RuleCandidate | null {
  if (tag !== 'img') return null;
  const op = ctx.getInlineStyleValue(n, 'opacity');
  const s = n.getAttribute('style') || '';
  if ((op !== null && (/^0(?:\.0+)?$/.test(op) || parseFloat(op) === 0)) || /opacity\s*:\s*0\b/i.test(s)) {
    const item: RuleCandidate = {
      paragraphIndex,
      node: n,
      property: 'opacity',
      violationId: ctx.ensureViolationId(n, paragraphIndex),
      outerHTML: ctx.getCleanOuterHTML(n),
      value: op !== null ? op : '0 (from style attribute)',
    };
    propertyMaps['opacity'].set(paragraphIndex, item);
    return item;
  }
  return null;
}
