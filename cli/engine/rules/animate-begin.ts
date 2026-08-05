// animate-begin: SVG animate triggered by touchstart without click → violation.

import type { RuleContext, RuleCandidate, PropertyMaps } from './types.js';

export function checkAnimateBeginViolation(
  n: any,
  paragraphIndex: number,
  propertyMaps: PropertyMaps,
  tag: string,
  ctx: RuleContext,
): RuleCandidate | null {
  if (tag !== 'animate' && tag !== 'animateTransform' && tag !== 'animateMotion') return null;
  const beginAttr = n.getAttribute && n.getAttribute('begin');
  if (beginAttr && /\btouchstart\b/i.test(beginAttr) && !/\bclick\b/i.test(beginAttr)) {
    const item: RuleCandidate = {
      paragraphIndex,
      node: n,
      property: 'animate-begin',
      value: beginAttr,
      violationId: ctx.ensureViolationId(n, paragraphIndex),
      outerHTML: ctx.getCleanOuterHTML(n),
    };
    propertyMaps['animate-begin'].set(paragraphIndex, item);
    return item;
  }
  return null;
}
