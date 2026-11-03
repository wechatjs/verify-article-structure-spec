// text-align: start|end is only a violation when it CONFLICTS with the
// effective alignment inherited from ancestors.
//
// Why: a renderer that doesn't support start/end drops the value → the node
// inherits the ancestor's alignment; a renderer that supports it resolves
// start→left / end→right (LTR). When both outcomes render the same side
// (e.g. start inside left, end inside right), the value is harmless. The
// visible bug (centered on some devices, left on others) only appears when
// the two outcomes diverge — e.g. start inside center.

import type { RuleContext, RuleCandidate, PropertyMaps } from './types.js';

const LOGICAL_ALIGN = /^(start|end)$/i;

/** Resolve a text-align value to a comparable side; start/end follow direction (rtl swaps sides). */
function resolveSide(value: string, rtl: boolean): string {
  const v = value.trim().toLowerCase();
  if (v === 'start') return rtl ? 'right' : 'left';
  if (v === 'end') return rtl ? 'left' : 'right';
  return v;
}

function isRtlDirection(value: string | null): boolean {
  return !!value && /^rtl$/i.test(value.trim());
}

export function checkTextAlignViolation(
  n: any,
  paragraphIndex: number,
  propertyMaps: PropertyMaps,
  ctx: RuleContext,
): RuleCandidate | null {
  const ta = ctx.getInlineStyleValue(n, 'text-align');
  if (!ta || !LOGICAL_ALIGN.test(ta)) return null;

  // Walk up to the nearest ancestor with an explicit inline text-align,
  // tracking rtl direction along the chain (affects start/end resolution).
  const nodeRtl = isRtlDirection(ctx.getInlineStyleValue(n, 'direction'));
  let rtl = nodeRtl;
  let ancestor: any = n.parentNode;
  let ancestorTa: string | null = null;
  while (ancestor) {
    if (isRtlDirection(ctx.getInlineStyleValue(ancestor, 'direction'))) rtl = true;
    const v = ctx.getInlineStyleValue(ancestor, 'text-align');
    if (v) {
      ancestorTa = v;
      break;
    }
    ancestor = ancestor.parentNode;
  }

  // No explicit ancestor alignment → default left; start is then identical
  // to the default (harmless), end resolves to the other side (conflict).
  const nodeSide = resolveSide(ta, nodeRtl);
  const ancestorSide = ancestorTa ? resolveSide(ancestorTa, rtl) : 'left';

  // justify's last line is start-aligned, so a left-resolving start/end value
  // inside justify renders the same whether honored or dropped → harmless.
  const conflict =
    nodeSide !== ancestorSide && !(nodeSide === 'left' && ancestorSide === 'justify');
  if (!conflict) return null;

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
