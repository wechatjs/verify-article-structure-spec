// darkmode stage: open-source mp-darkmode for conversion (run/getContrast);
// validate/reset are engine-owned. validate respects data-ignore-dm (skip per
// rule: low-contrast / text-bg-gradient / whitelist), mirroring upstream.
import Darkmode from 'mp-darkmode';

export interface DarkmodeRunOptions {
  mode?: string;
  defaultDarkTextColor?: string;
  defaultDarkBgColor?: string;
  whitelist?: { tagName?: string[]; attribute?: string[] };
  needJudgeFirstPage?: boolean;
  noEmit?: boolean;
  minContrast?: number;
  [key: string]: unknown;
}

export interface DarkmodeViolation {
  key: string;
  violateRules: string;
  dom?: { outerHTML?: string };
  outerHTML?: string;
  paragraphIndex?: number;
}

const DEFAULT_DARK_TEXT = '#a3a3a3';
const DEFAULT_DARK_BG = '#191919';
const MIN_CONTRAST = 1.5;
// Match nodes carrying a darkmode-converted text/bg color attribute (suffix is a
// per-run timestamp+random id, so match by prefix).
const DARK_COLOR_ATTR = /^data-darkmode-color-/;
const DARK_BG_ATTR = /^data-darkmode-bgcolor-/;
const DARK_ORIG_BG_ATTR = /^data-darkmode-original-bgcolor-/;
const DARK_BGIMAGE_ATTR = /^data-darkmode-bgimage-/;
const HAS_URL = /url\([^)]*\)/i;

function readDarkAttr(el: HTMLElement, re: RegExp): string | null {
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    if (re.test(attr.name)) return attr.value;
  }
  return null;
}

function collectWhitelistAttributes(opts?: DarkmodeRunOptions): string[] {
  const attrs = ['data-no-dark', ...(opts?.whitelist?.attribute || [])];
  return attrs;
}

// reset: clear the darkmode data attributes the run stamped on nodes, and reset
// the library's init-guard so a subsequent run works. Each verifyArticleStructure
// call runs in an isolated page, so this primarily clears node-side state.
function reset(nodes: Node[] | NodeListOf<Element>, _opts?: DarkmodeRunOptions): void {
  try {
    // Reset internal init state if reachable (vanilla exposes init but not a public
    // reset; the hasInit flag lives on an internal config object). Best-effort.
    (Darkmode as any).resetCss?.();
  } catch { /* no-op */ }

  const html = document.getElementsByTagName('html')[0];
  html?.classList.remove('js_darkmode__');

  (Array.from(nodes as ArrayLike<Element>) as Element[]).forEach(node => {
    if (!(node instanceof HTMLElement)) return;
    const toRemove: string[] = [];
    for (let i = 0; i < node.attributes.length; i++) {
      const name = node.attributes[i].name;
      if (DARK_COLOR_ATTR.test(name) || DARK_BG_ATTR.test(name) || DARK_ORIG_BG_ATTR.test(name)
        || DARK_BGIMAGE_ATTR.test(name) || /^data-darkmode-original-color-/.test(name)
        || /^data-darkmode-complementary-bgimagecolor-/.test(name)) {
        toRemove.push(name);
      }
    }
    toRemove.forEach(n => node.removeAttribute(n));
  });
}

// validate: walk the tree, collecting darkmode violations with the same semantics
// as the original fork: low-contrast text, gradient backgrounds, whitelist attrs.
function validate(articleBody: Node, opts?: DarkmodeRunOptions): DarkmodeViolation[] {
  const minContrast = opts?.minContrast || MIN_CONTRAST;
  const defaultDarkTextColor = opts?.defaultDarkTextColor || DEFAULT_DARK_TEXT;
  const defaultDarkBgColor = opts?.defaultDarkBgColor || DEFAULT_DARK_BG;
  const whitelistAttrs = collectWhitelistAttributes(opts);
  const violations: DarkmodeViolation[] = [];

  const walker = document.createTreeWalker(articleBody, NodeFilter.SHOW_ELEMENT, (node: any) => {
    if (!(node instanceof HTMLElement)) return NodeFilter.FILTER_REJECT;
    const cs = node.style;
    if (cs.display === 'none') return NodeFilter.FILTER_REJECT;
    if (HAS_URL.test(cs.backgroundImage || '') || HAS_URL.test((cs as any).webkitBorderImage || cs.borderImage || '')) return NodeFilter.FILTER_REJECT;
    if (node instanceof SVGElement) return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  });

  while (walker.nextNode()) {
    const el = walker.currentNode as HTMLElement;

    // data-ignore-dm: space-separated rules to skip (low-contrast / text-bg-gradient / whitelist).
    const ignoreRules = (el.getAttribute('data-ignore-dm') || '').split(/\s+/);

    const hasText = Array.prototype.some.call(el.childNodes, (c: any) =>
      c.nodeType === 3 && c.nodeValue.replace(/\s/g, '').length > 0,
    );
    if (!ignoreRules.includes('low-contrast') && hasText) {
      const textColor = readDarkAttr(el, DARK_COLOR_ATTR) || defaultDarkTextColor;
      const bgColor = readDarkAttr(el, DARK_ORIG_BG_ATTR) || readDarkAttr(el, DARK_BG_ATTR) || defaultDarkBgColor;
      const contrast = (Darkmode as any).getContrast ? (Darkmode as any).getContrast(textColor, bgColor) : 1;
      if (contrast < minContrast) {
        violations.push({ dom: el, key: 'darkmode-low-contrast', violateRules: '文字与背景色对比度太低（参考文档#4.1.1使用对比度适中的颜色）' });
      }
    }

    if (!ignoreRules.includes('text-bg-gradient') && readDarkAttr(el, DARK_BGIMAGE_ATTR)) {
      violations.push({ dom: el, key: 'darkmode-no-gradient', violateRules: '文字背景尽量不要使用渐变（参考文档#4.1.2如非必要，文字背景尽量不要使用渐变）' });
    }

    if (whitelistAttrs.some(attr => el.hasAttribute(attr))) {
      violations.push({ dom: el, key: 'darkmode-whitelist', violateRules: '注意，此处包含白名单属性，会跳过darkmode算法转换（参考文档#4.5.1 指定节点跳过算法转换）' });
    }
  }

  return violations;
}

const DarkmodeEngine = {
  reset,
  run(nodes: Node[] | NodeListOf<Element>, runOpts: DarkmodeRunOptions): void {
    (Darkmode as any).run(nodes, runOpts);
  },
  validate,
};

export default DarkmodeEngine;
