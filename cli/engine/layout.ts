// Layout detection: sandbox multi-screen measurement + width/line-height/pre/height judgments.

import { propertyRules, WIDTH_DETAIL_RULES } from './rules-text.js';
import type { InvalidNode, ScreenFindings, ViolationEntry, WidthFinding, LineHeightFinding, PreFinding } from './types.js';

interface DetectLayoutOpts {
  screenConfigs?: { width: number; style: { width: string } }[];
}

const DEFAULT_SCREENS = [
  { width: 585, style: { width: '585px' } },
  { width: 677, style: { width: '677px' } },
  { width: 375, style: { width: '375px' } },
];

function createLayoutSandbox(htmlString: string): HTMLDivElement {
  const sandbox = document.createElement('div');
  sandbox.id = 'test';
  sandbox.className = 'rich_media_content';
  Object.assign(sandbox.style, {
    position: 'absolute',
    'z-index': 10000,
    boxSizing: 'border-box',
    color: 'rgba(0, 0, 0, 0.9)',
    fontSize: 'var(--articleFontsize)',
    overflow: 'hidden',
    textAlign: 'justify',
  });

  if (!document.getElementById('rich-media-styles')) {
    const style = document.createElement('style');
    style.id = 'rich-media-styles';
    style.textContent = `
      .rich_media_content * {
        max-width: 100% !important;
        box-sizing: border-box !important;
        -webkit-box-sizing: border-box !important;
        word-wrap: break-word !important;
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(sandbox);
  sandbox.innerHTML = htmlString;
  return sandbox;
}

// Shallow clone shell (open+close tags only), debug markers stripped.
function getShellHTML(el: any): string {
  if (!el || typeof el.cloneNode !== 'function') return '';
  const clone = el.cloneNode(false);
  clone.removeAttribute('data-blockidx');
  clone.removeAttribute('data-violation-id');
  const tmp = document.createElement('div');
  tmp.appendChild(clone);
  return tmp.innerHTML;
}

// Full outerHTML with debug markers stripped from the node and all descendants.
function getCleanOuterHTML(el: any): string {
  if (!el || typeof el.cloneNode !== 'function') return '';
  const clone = el.cloneNode(true);
  clone.removeAttribute('data-blockidx');
  clone.removeAttribute('data-violation-id');
  clone.querySelectorAll('[data-blockidx]').forEach((n: any) => n.removeAttribute('data-blockidx'));
  clone.querySelectorAll('[data-violation-id]').forEach((n: any) => n.removeAttribute('data-violation-id'));
  const tmp = document.createElement('div');
  tmp.appendChild(clone);
  return tmp.innerHTML;
}

interface WidthVarianceResult { isValid: boolean; rules: string }

function hasWidthVariance(screenFindings: WidthFinding[], tolerance = 10, ratioTolerance = 0.2): WidthVarianceResult {
  if (!screenFindings.length) return { isValid: true, rules: '' };

  // overflowOnly nodes (the paragraph node itself) only check overflow, not centering.
  const isOverflowOnly = screenFindings[0].overflowOnly;
  const baseWidth = screenFindings[0].computedWidth;
  const baseRatio = screenFindings[0].widthRatio;
  const baseOverflowing = screenFindings[0].isOverflowing;

  const hasWidthDiff = screenFindings.some(f => Math.abs(f.computedWidth - baseWidth) > tolerance);
  // Stricter ratio tolerance (0) when any screen fills the container exactly.
  const dynamicRatioTolerance = screenFindings.some(f => f.widthRatio === 1) ? 0 : ratioTolerance;
  const hasRatioDiff = screenFindings.some(f => Math.abs(f.widthRatio - baseRatio) > dynamicRatioTolerance);
  const hasOverflowDiff = screenFindings.some(f => f.isOverflowing !== baseOverflowing);

  if (isOverflowOnly) {
    const isActuallyOverflowing = screenFindings.some(f => f.isOverflowing);
    return { isValid: !isActuallyOverflowing, rules: isActuallyOverflowing ? '存在溢出问题' : '' };
  }

  const hasCenter = screenFindings.every(f => f.isHorizontallyCentered);
  const hasCenterInconsistency = screenFindings.some(f => f.isHorizontallyCentered)
    && screenFindings.some(f => !f.isHorizontallyCentered);

  const isValid = !(hasCenter ? hasOverflowDiff : (hasWidthDiff && hasRatioDiff) || hasOverflowDiff || hasCenterInconsistency);

  let rules = '';
  if (!isValid) {
    if (hasCenterInconsistency) rules = '居中布局不一致';
    else if (hasOverflowDiff) rules = '存在溢出问题';
    else if (hasWidthDiff && hasRatioDiff) rules = '不同屏幕下宽度差异';
  }
  return { isValid, rules };
}

function hasLineHeightOverlapping(screenFindings: LineHeightFinding[]): { isValid: boolean } {
  if (!screenFindings.length) return { isValid: true };
  return { isValid: !screenFindings.some(f => f.isOverlapping) };
}

const MAX_DEPTH = 10;

function findHeightAncestor(chain: any[]): any {
  for (let i = 0; i < chain.length; i++) {
    const el = chain[i];
    if (!el || typeof el.getAttribute !== 'function') continue;
    const styleStr = el.getAttribute('style');
    if (!styleStr) continue;
    const heightMatch = styleStr.match(/(^|;)\s*height\s*:\s*([^;]+)/i);
    if (heightMatch && !/^auto$/i.test(heightMatch[2].trim())) return el;
  }
  return null;
}

function checkChildHeightOverflow(
  parentElement: any,
  parentRect: DOMRect,
  depth = 0,
  ancestorChain: any[] = [],
): { overflowChild: any; childHeight: number; parentHeight: number; suspectAncestor: any } | null {
  if (!parentElement || !parentRect || depth > MAX_DEPTH) return null;

  const children: any[] = Array.from(parentElement.children);
  const currentChain = [...ancestorChain, parentElement];

  for (const child of children) {
    const childHeight = child.offsetHeight;
    const overflowY = window.getComputedStyle(child).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') continue;

    if ((parentRect.height > 200 && childHeight > parentRect.height + 20) || (parentRect.height <= 200 && childHeight > parentRect.height + 5)) {
      return {
        overflowChild: child,
        childHeight,
        parentHeight: parentRect.height,
        suspectAncestor: findHeightAncestor(currentChain),
      };
    }

    const result = checkChildHeightOverflow(child, parentRect, depth + 1, currentChain);
    if (result) return result;
  }
  return null;
}

interface FallbackItem { node: any; fontSize: number; lineHeight: number; elementHeight: number; estLines: number; text: string }

// Computed-style line-height overlap fallback: catches inherited line-height:0
// that inline-style collection misses. Rule A: lh===0 + height>0 + text → overlap.
// Rule B: estLines≥2 + realLineHeight < fontSize*0.95 → multi-line overlap.
function collectLineHeightFallback(sandbox: HTMLElement): FallbackItem[] {
  const blockTags = new Set(['p', 'div', 'section', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'a']);
  const items: FallbackItem[] = [];

  sandbox.querySelectorAll('*').forEach((node: any) => {
    const tag = node.tagName.toLowerCase();
    if (!blockTags.has(tag)) return;
    // Only nodes with direct text, to avoid upper containers double-counting.
    const hasDirectText = Array.from(node.childNodes).some(
      (c: any) => c.nodeType === Node.TEXT_NODE && c.textContent.trim().length > 0,
    );
    if (!hasDirectText) return;

    const cs = window.getComputedStyle(node);
    const fontSize = parseFloat(cs.fontSize);
    const lhRaw = cs.lineHeight;
    const lineHeight = lhRaw === 'normal' ? fontSize * 1.2 : parseFloat(lhRaw);
    const elementHeight = node.getBoundingClientRect().height;
    const text = (node.textContent || '').trim().replace(/\s+/g, ' ');

    let overlapping = false;
    let estLines = 0;
    if (Number.isFinite(lineHeight) && lineHeight === 0 && elementHeight > 0 && text.length > 0 && Number.isFinite(fontSize) && fontSize > 0) {
      overlapping = true;
      estLines = elementHeight > 0 && fontSize > 0 ? Math.max(1, Math.round(elementHeight / fontSize)) : 1;
    } else if (Number.isFinite(lineHeight) && lineHeight > 0 && Number.isFinite(fontSize) && fontSize > 0) {
      estLines = Math.round(elementHeight / lineHeight);
      const realLineHeight = estLines > 0 ? elementHeight / estLines : 0;
      overlapping = estLines >= 2 && realLineHeight > 0 && realLineHeight < fontSize * 0.95;
    }

    if (overlapping) {
      items.push({ node, fontSize, lineHeight, elementHeight, estLines, text: text.slice(0, 60) });
    }
  });

  return items;
}

function findParagraphIndexInSandbox(node: any): number {
  let el = node;
  while (el) {
    if (typeof el.getAttribute === 'function') {
      const idx = el.getAttribute('data-blockidx');
      if (idx !== null && idx !== undefined && idx !== '') {
        const parsed = parseInt(idx, 10);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
    el = el.parentNode;
  }
  return -1;
}

async function detectLayoutIssues(
  invalidNodes: InvalidNode[] = [],
  htmlString: string = '',
  opts: DetectLayoutOpts = {},
): Promise<Record<string, ViolationEntry>> {
  const screenConfigs = opts.screenConfigs || DEFAULT_SCREENS;
  const sandbox = createLayoutSandbox(htmlString);

  const allScreenFindings: Record<string, ScreenFindings> = {};
  const caretColorNodes = invalidNodes.filter(n => n.property === 'caret-color');
  const opacityNodes = invalidNodes.filter(n => n.property === 'opacity');
  const textAlignNodes = invalidNodes.filter(n => n.property === 'text-align');
  const animateBeginNodes = invalidNodes.filter(n => n.property === 'animate-begin');
  const preNodes = invalidNodes.filter(n => n.property === 'pre');
  const heightZeroNodes = invalidNodes.filter(n => n.property === 'height');

  // Height overflow: one pass under the first screen config.
  Object.assign(sandbox.style, screenConfigs[0].style);
  await new Promise(r => setTimeout(r, 100));
  const parentRect = sandbox.getBoundingClientRect();
  const overflowResult = checkChildHeightOverflow(sandbox, parentRect);
  let heightIssues: any[] = [];
  if (overflowResult) {
    heightIssues.push({
      violateRules: propertyRules['height-nodisplay'],
      outerHTML: overflowResult.suspectAncestor ? getShellHTML(overflowResult.suspectAncestor) : '',
      childHeight: overflowResult.childHeight,
      parentHeight: overflowResult.parentHeight,
    });
  }

  const fallbackItems = collectLineHeightFallback(sandbox);

  for (const config of screenConfigs) {
    Object.assign(sandbox.style, config.style);
    await new Promise(r => setTimeout(r, 100));
    const pRect = sandbox.getBoundingClientRect();
    const widthNodes = invalidNodes.filter(n => n.property === 'width');
    const lineHeightNodes = invalidNodes.filter(n => n.property === 'line-height');

    widthNodes.forEach(nodeInfo => {
      const violationId = nodeInfo.violationId;
      if (!violationId) return;
      const cloned = sandbox.querySelector(`[data-violation-id="${violationId}"]`);
      if (!cloned) return;
      const rect = cloned.getBoundingClientRect();
      const computedWidth = Math.round(parseFloat(rect.width as any));
      const leftDistance = rect.left - pRect.left;
      const rightDistance = pRect.right - rect.right;
      const horizontalCenterDiff = Math.abs(leftDistance + rightDistance);
      const isHorizontallyCentered = horizontalCenterDiff <= 1;
      // +1px sub-pixel tolerance; exclude symmetric centered overflow (deliberate visual effect).
      const isOverflowing = (rect.left < pRect.left - 1 || rect.right > pRect.right + 1) && !isHorizontallyCentered;

      const finding: WidthFinding = {
        violationId,
        node: nodeInfo.node,
        property: 'width',
        screenWidth: config.width,
        widthRatio: computedWidth / config.width,
        computedWidth: Number.isFinite(computedWidth) ? computedWidth : 0,
        isHeightZero: rect.height < 1,
        isOverflowing,
        isHorizontallyCentered,
        overflowOnly: nodeInfo.overflowOnly || false,
      };
      if (!allScreenFindings[violationId]) allScreenFindings[violationId] = { width: [], 'line-height': [] };
      allScreenFindings[violationId].width.push(finding);
    });

    lineHeightNodes.forEach(nodeInfo => {
      const violationId = nodeInfo.violationId;
      if (!violationId) return;
      const cloned = sandbox.querySelector(`[data-violation-id="${violationId}"]`);
      if (!cloned) return;
      const styleNode = window.getComputedStyle(cloned);
      const lineHeightRaw = styleNode.lineHeight;
      const fontSize = parseFloat(styleNode.fontSize);
      const lineHeight = lineHeightRaw === 'normal' ? fontSize * 1.2 : parseFloat(lineHeightRaw);
      const elementHeight = cloned.getBoundingClientRect().height;
      const hasMultipleLines = elementHeight > fontSize * 1.2;
      const isOverlapping = hasMultipleLines && lineHeight + 10 < fontSize;

      const finding: LineHeightFinding = { node: nodeInfo.node, violationId, property: 'line-height', isOverlapping };
      if (!allScreenFindings[violationId]) allScreenFindings[violationId] = { width: [], 'line-height': [] };
      allScreenFindings[violationId]['line-height'].push(finding);
    });

    preNodes.forEach(nodeInfo => {
      const violationId = nodeInfo.violationId;
      if (!violationId) return;
      const cloned = sandbox.querySelector(`[data-violation-id="${violationId}"]`);
      if (!cloned) return;
      // +1px cross-browser tolerance.
      const isOverflowing = cloned.scrollWidth > cloned.clientWidth + 1;
      if (!allScreenFindings[violationId]) allScreenFindings[violationId] = { width: [], 'line-height': [] };
      if (!allScreenFindings[violationId].pre) allScreenFindings[violationId].pre = [];
      const finding: PreFinding = { violationId, isOverflowing, screenWidth: config.width };
      allScreenFindings[violationId].pre!.push(finding);
    });
  }

  const optimizedIssues: Record<string, ViolationEntry> = {};

  Object.entries(allScreenFindings).forEach(([violationId, findings]) => {
    if (findings.width && findings.width.length > 0) {
      const { isValid, rules } = hasWidthVariance(findings.width);
      if (!isValid) {
        const paragraphIndex = violationId.split('-')[1];
        const itemViolateRulesDesc = WIDTH_DETAIL_RULES[rules] || propertyRules['width'];
        if (!optimizedIssues.width) optimizedIssues.width = { violateRules: propertyRules['width'], items: [] };
        optimizedIssues.width.items.push({
          violationId,
          screenFindings: findings.width,
          rules,
          paragraphIndex,
          outerHTML: getCleanOuterHTML(findings.width[0].node),
          violateRules: itemViolateRulesDesc,
        });
      }
    }
    if (findings['line-height'].length > 0) {
      const { isValid } = hasLineHeightOverlapping(findings['line-height']);
      if (!isValid) {
        const paragraphIndex = violationId.split('-')[1];
        if (!optimizedIssues['line-height']) optimizedIssues['line-height'] = { violateRules: propertyRules['line-height-overlapping'], items: [] };
        optimizedIssues['line-height'].items.push({
          violationId,
          screenFindings: findings['line-height'],
          paragraphIndex,
          outerHTML: getCleanOuterHTML(findings['line-height'][0].node),
        });
      }
    }
  });

  if (heightIssues.length > 0) {
    optimizedIssues['height-nodisplay'] = { violateRules: propertyRules['height-nodisplay'], items: heightIssues };
  }
  if (heightZeroNodes.length > 0) optimizedIssues.height = { violateRules: propertyRules['height'], items: heightZeroNodes as any };
  if (caretColorNodes.length > 0) optimizedIssues['caret-color'] = { violateRules: propertyRules['caret-color'], items: caretColorNodes as any };
  if (opacityNodes.length > 0) optimizedIssues.opacity = { violateRules: propertyRules['opacity'], items: opacityNodes as any };
  if (animateBeginNodes.length > 0) optimizedIssues['animate-begin'] = { violateRules: propertyRules['animate-begin'], items: animateBeginNodes as any };
  if (textAlignNodes.length > 0) optimizedIssues['text-align'] = { violateRules: propertyRules['text-align'], items: textAlignNodes as any };

  if (preNodes.length > 0) {
    const preOverflowItems: any[] = [];
    preNodes.forEach(preNode => {
      const violationId = preNode.violationId;
      if (!violationId) return;
      const findings = allScreenFindings[violationId];
      if (!findings || !findings.pre || !findings.pre.length) return;
      if (findings.pre.some(f => f.isOverflowing)) {
        preOverflowItems.push({ violationId, paragraphIndex: preNode.paragraphIndex, outerHTML: getCleanOuterHTML(preNode.node) });
      }
    });
    if (preOverflowItems.length > 0) optimizedIssues['pre'] = { violateRules: propertyRules['pre'], items: preOverflowItems };
  }

  // Merge computed-style fallback overlap hits into line-height (distinct violationIds, no dup).
  if (fallbackItems.length > 0) {
    let localCounter = 0;
    if (!optimizedIssues['line-height']) optimizedIssues['line-height'] = { violateRules: propertyRules['line-height-overlapping'], items: [] };
    fallbackItems.forEach(it => {
      const paragraphIndex = findParagraphIndexInSandbox(it.node);
      // -1 = unknown paragraph (do not silently degrade to 0).
      const safePIdx = paragraphIndex >= 0 ? paragraphIndex : -1;
      let violationId: string | null = null;
      const node = it.node;
      if (node && typeof node.getAttribute === 'function' && typeof node.setAttribute === 'function') {
        const existing = node.getAttribute('data-violation-id');
        if (existing) {
          violationId = existing;
        } else {
          violationId = `violation-${safePIdx}-${localCounter++}-${Date.now()}`;
          node.setAttribute('data-violation-id', violationId);
        }
      }
      optimizedIssues['line-height'].items.push({
        violationId,
        paragraphIndex: safePIdx,
        outerHTML: getCleanOuterHTML(it.node),
        rules: it.lineHeight === 0
          ? '继承的 line-height: 0 导致文字叠字（兜底检测）'
          : '行高小于字体大小，且存在多行文本，可能导致文字重叠（实测）',
      });
    });
  }

  return optimizedIssues;
}

export { detectLayoutIssues, getCleanOuterHTML };
