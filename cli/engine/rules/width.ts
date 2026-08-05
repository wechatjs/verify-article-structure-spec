// width: img (non-separator) / table th / fixed-width non-img-svg → width candidates.

import type { RuleContext, RuleCandidate, PropertyMaps } from './types.js';

export function checkWidthViolation(
  n: any,
  paragraphIndex: number,
  propertyMaps: PropertyMaps,
  tag: string,
  ctx: RuleContext,
): RuleCandidate | null {
  // Skip width detection when the node or an ancestor opts out via data-ignore-width.
  if (n.closest && n.closest('[data-ignore-width]')) return null;
  if (!n.closest && n.hasAttribute && n.hasAttribute('data-ignore-width')) return null;

  if (tag === 'img' && !n.classList.contains('ProseMirror-separator')) {
    const item: RuleCandidate = {
      paragraphIndex,
      node: n,
      property: 'width',
      violationId: ctx.ensureViolationId(n, paragraphIndex),
      outerHTML: ctx.getCleanOuterHTML(n),
    };
    propertyMaps['width'].set(paragraphIndex, item);
    return item;
  }

  const w = ctx.getInlineStyleValue(n, 'width');

  if (tag === 'table') {
    const thead = n.querySelector('thead');
    if (thead) {
      thead.querySelectorAll('th').forEach((th: any, thIndex: number) => {
        const item: RuleCandidate = {
          paragraphIndex,
          node: th,
          property: 'width',
          rule: ctx.propertyRules['width'],
          violationId: ctx.ensureViolationId(th, paragraphIndex),
          thIndex,
        };
        propertyMaps['width'].set(`${paragraphIndex}_th${thIndex}`, item);
      });
    }
    // Do not traverse into the table's children.
    return null;
  }

  if (tag !== 'img' && tag !== 'svg' && w !== null && w !== '' && !/auto|100%/i.test(w)) {
    const item: RuleCandidate = {
      paragraphIndex,
      node: n,
      property: 'width',
      value: w,
      rule: ctx.propertyRules['width'],
      violationId: ctx.ensureViolationId(n, paragraphIndex),
      outerHTML: ctx.getCleanOuterHTML(n),
    };
    propertyMaps['width'].set(paragraphIndex, item);
    return item;
  }

  return null;
}
