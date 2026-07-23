// height:0 with real text content (excludes SVG inner / data-mode=svg containers) → violation.

import type { RuleContext, RuleCandidate, PropertyMaps } from './types.js';

export function checkHeightZeroViolation(
  n: any,
  paragraphIndex: number,
  propertyMaps: PropertyMaps,
  tag: string,
  isInsideSvg: boolean,
  isInsideSvgMode: boolean,
  ctx: RuleContext,
): RuleCandidate | null {
  if (isInsideSvg || isInsideSvgMode) return null;

  const h = ctx.getInlineStyleValue(n, 'height');
  if (h !== null && /^0(px)?$/i.test(h.trim())) {
    const textContent = n.textContent
      ? n.textContent.replace(/​/g, '').replace(/ /g, '').replace(/\s+/g, '')
      : '';
    if (textContent.length > 0) {
      const violationId = ctx.ensureViolationId(n, paragraphIndex);
      const item: RuleCandidate = {
        paragraphIndex,
        node: n,
        property: 'height',
        value: h,
        violationId,
        outerHTML: ctx.getCleanOuterHTML(n),
      };
      propertyMaps['height'].set(violationId, item);
      return item;
    }
  }
  return null;
}
