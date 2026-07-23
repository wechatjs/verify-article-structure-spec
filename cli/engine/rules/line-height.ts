// line-height: nodes with text content collected for layout overlap detection (svg excluded).

import type { RuleContext, RuleCandidate, PropertyMaps } from './types.js';

export function checkLineHeightViolation(
  n: any,
  paragraphIndex: number,
  propertyMaps: PropertyMaps,
  tag: string,
  ctx: RuleContext,
): RuleCandidate | null {
  if (tag === 'svg') return null;

  const textContent = n.textContent
    ? n.textContent.replace(/​/g, '').replace(/ /g, '').replace(/\s+/g, '')
    : null;

  // line-height:0 with no inner text is not a violation (seamless image tiling).
  const lh = ctx.getInlineStyleValue(n, 'line-height');
  if (lh !== null && /^0(px)?$/i.test(lh.trim())) {
    if (!textContent) return null;
  }

  if (textContent) {
    const item: RuleCandidate = {
      paragraphIndex,
      node: n,
      property: 'line-height',
      violationId: ctx.ensureViolationId(n, paragraphIndex),
      outerHTML: ctx.getCleanOuterHTML(n),
    };
    propertyMaps['line-height'].set(paragraphIndex, item);
    return item;
  }
  return null;
}
