// caret-color: transparent caret-color (excluding empty paragraphs) → violation.

import type { RuleContext, RuleCandidate, PropertyMaps } from './types.js';

export function checkCaretColorViolation(
  n: any,
  paragraphIndex: number,
  propertyMaps: PropertyMaps,
  ctx: RuleContext,
): RuleCandidate | null {
  const caret = ctx.getInlineStyleValue(n, 'caret-color');
  if (caret && ctx.isTransparentRgba(caret)) {
    const item: RuleCandidate = {
      paragraphIndex,
      node: n,
      property: 'caret-color',
      violationId: ctx.ensureViolationId(n, paragraphIndex),
      outerHTML: ctx.getCleanOuterHTML(n),
    };
    if (!ctx.isEmptyParagraph(n)) propertyMaps['caret-color'].set(paragraphIndex, item);
    return item;
  }
  return null;
}
