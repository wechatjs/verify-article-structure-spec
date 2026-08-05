// Collect stage: scan paragraphs (BFS) for style violation candidates.

import { propertyRules } from './rules-text.js';
import { isEmptyParagraph } from './dom.js';
import { getCleanOuterHTML } from './layout.js';
import {
  getInlineStyleValue,
  isTransparentRgba,
  checkFontFamilyViolation,
  checkOpacityViolation,
  checkCaretColorViolation,
  checkLineHeightViolation,
  checkWidthViolation,
  checkTextAlignViolation,
  checkAnimateBeginViolation,
  checkHeightZeroViolation,
  checkPreViolation,
} from './rules/index.js';
import type { RuleContext, RuleCandidate, PropertyMaps } from './rules/index.js';
import type { InvalidNode } from './types.js';

const commentRegex = /<!--[\s\S]*?-->/g;
// Pre-filter: skip paragraphs whose HTML has no rule-relevant token.
const quickRegex = /\b(?:font-family|caret-color|opacity|line-height|text-align|width|height|animate)\b|<pre[\s>]/i;

function toArray(maybeList: any): any[] {
  if (!maybeList) return [];
  if (Array.isArray(maybeList)) return maybeList;
  try { return Array.prototype.slice.call(maybeList); } catch { return []; }
}

function makeContext(): RuleContext {
  let counter = 0;
  const ensureViolationId = (node: any, paragraphIndex: number): string | null => {
    if (!node || typeof node.getAttribute !== 'function' || typeof node.setAttribute !== 'function') return null;
    const existing = node.getAttribute('data-violation-id');
    if (existing) return existing;
    const id = `violation-${paragraphIndex}-${counter++}-${Date.now()}`;
    node.setAttribute('data-violation-id', id);
    return id;
  };
  return { getInlineStyleValue, isTransparentRgba, isEmptyParagraph, getCleanOuterHTML, propertyRules, ensureViolationId };
}

function collectViolationsInParagraph(paragraphNode: any, paragraphIndex: number): RuleCandidate[] {
  const found: RuleCandidate[] = [];
  if (!paragraphNode) return found;

  // Empty paragraphs (e.g. ProseMirror <span leaf><br></span>) would falsely trip
  // overflow checks, so they are skipped entirely.
  if (isEmptyParagraph(paragraphNode)) return found;

  const ctx = makeContext();
  const propertyMaps: PropertyMaps = {
    'line-height': new Map(),
    'width': new Map(),
    'height': new Map(),
    'caret-color': new Map(),
    'opacity': new Map(),
    'text-align': new Map(),
    'animate-begin': new Map(),
    'pre': new Map(),
  };

  // The paragraph node itself is added to the width queue: non-width CSS (e.g.
  // margin) can also cause horizontal overflow, so reuse the overflow check to
  // catch paragraph-level layout drift. overflowOnly skips the centering check.
  // Skip the paragraph-level candidate when the paragraph opts out via
  // data-ignore-width; node-level checks below still run for its children.
  if (!(paragraphNode.hasAttribute && paragraphNode.hasAttribute('data-ignore-width'))) {
    const paraViolationId = ctx.ensureViolationId(paragraphNode, paragraphIndex);
    propertyMaps['width'].set(`${paragraphIndex}_para`, {
      paragraphIndex,
      node: paragraphNode,
      property: 'width',
      violationId: paraViolationId,
      outerHTML: paragraphNode.outerHTML,
      overflowOnly: true,
    });
  }

  const q: any[] = [{ node: paragraphNode, isInsideSvg: false, isInsideSvgMode: false }];
  while (q.length) {
    const { node: n, isInsideSvg, isInsideSvgMode } = q.shift();
    const tag = (n.tagName && typeof n.tagName === 'string') ? n.tagName.toLowerCase() : '';

    n.setAttribute('data-blockidx', String(paragraphIndex));
    const currentInsideSvg = isInsideSvg || tag === 'svg';
    const currentInsideSvgMode = isInsideSvgMode || (n.getAttribute && n.getAttribute('data-mode') === 'svg');

    const opacity = checkOpacityViolation(n, paragraphIndex, propertyMaps, tag, ctx);
    if (opacity) found.push(opacity);
    const caretColor = checkCaretColorViolation(n, paragraphIndex, propertyMaps, ctx);
    if (caretColor) found.push(caretColor);
    const lineHeight = checkLineHeightViolation(n, paragraphIndex, propertyMaps, tag, ctx);
    if (lineHeight) found.push(lineHeight);
    const width = checkWidthViolation(n, paragraphIndex, propertyMaps, tag, ctx);
    if (width) found.push(width);
    const textAlign = checkTextAlignViolation(n, paragraphIndex, propertyMaps, ctx);
    if (textAlign) found.push(textAlign);
    const animateBegin = checkAnimateBeginViolation(n, paragraphIndex, propertyMaps, tag, ctx);
    if (animateBegin) found.push(animateBegin);
    const heightZero = checkHeightZeroViolation(n, paragraphIndex, propertyMaps, tag, currentInsideSvg, currentInsideSvgMode, ctx);
    if (heightZero) found.push(heightZero);

    if (tag === 'pre') {
      const pre = checkPreViolation(n, paragraphIndex, propertyMaps, ctx);
      if (pre) found.push(pre);
    }

    const children = toArray(n.children || n.childNodes);
    for (let i = 0; i < children.length; i++) {
      q.push({ node: children[i], isInsideSvg: currentInsideSvg, isInsideSvgMode: currentInsideSvgMode });
    }
  }

  const allResults: RuleCandidate[] = [];
  for (const map of Object.values(propertyMaps)) allResults.push(...Array.from(map.values()));
  return allResults;
}

function getInvalidNodes(paragraphList: any[]): { isValid: boolean; invalidNodes: InvalidNode[] } {
  const invalid: InvalidNode[] = [];

  // Stamp data-blockidx on ancestor wrappers of each paragraph so the layout
  // line-height fallback reverse-lookup always resolves. Stop at an already-
  // stamped ancestor (earlier paragraph keeps the smaller, semantically-earlier
  // index for shared ancestors).
  for (let i = 0; i < paragraphList.length; i++) {
    const pNode = paragraphList[i];
    if (!pNode || typeof pNode.parentNode === 'undefined') continue;
    let anc = pNode.parentNode;
    while (anc && typeof anc.getAttribute === 'function' && typeof anc.setAttribute === 'function') {
      if (anc.getAttribute('data-blockidx') !== null) break;
      anc.setAttribute('data-blockidx', String(i));
      anc = anc.parentNode;
    }
  }

  paragraphList.forEach((pNode, idx) => {
    if (!pNode) return;
    let htmlStr = '';
    if (typeof pNode.outerHTML === 'string') {
      htmlStr = pNode.outerHTML.replace(commentRegex, '');
    } else if (typeof pNode.innerHTML === 'string') {
      htmlStr = `<root>${pNode.innerHTML}</root>`.replace(commentRegex, '');
    } else if (pNode.html) {
      htmlStr = String(pNode.html).replace(commentRegex, '');
    }
    if (htmlStr && !quickRegex.test(htmlStr)) return;

    const founds = collectViolationsInParagraph(pNode, idx);
    for (let j = 0; j < founds.length; j++) invalid.push(founds[j] as InvalidNode);
  });

  return { isValid: invalid.length === 0, invalidNodes: invalid };
}

export { getInvalidNodes };
