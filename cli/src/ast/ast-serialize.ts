// AST -> HTML string serializer. Mirrors UE.htmlparser's serialization contract:
// - void elements self-close as <tag/>
// - attribute values escaped with utils.unhtml semantics (& < > ")
// - text escaped with & < > (not ", matching UE isText)
// - comment preserved verbatim
// - data-nest-level (detection annotation from nest.ts depth1) stripped before
//   output so clean HTML does not leak detection bookkeeping.

import type { AstNode } from './ast-convert.js';

/** HTML standard void elements (no closing tag). Not UEditor dtd.$empty — no runtime dep. */
export const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/** Escape an attribute value: & < > " (aligned with utils.unhtml). */
function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Escape text content: & < > (no quote, aligned with UE isText). */
function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Render an attrs object as a leading-space-prefixed attribute string. */
function serializeAttrs(attrs?: Record<string, string>): string {
  if (!attrs) return '';
  let out = '';
  for (const key of Object.keys(attrs)) {
    out += ` ${key}="${escapeAttr(attrs[key])}"`;
  }
  return out;
}

/** Serialize an AstNode tree back to an HTML string. */
export function astToHtml(node: AstNode): string {
  switch (node.type) {
    case 'root':
      return (node.children || []).map(astToHtml).join('');
    case 'text':
      return escapeText(node.data || '');
    case 'comment':
      return `<!--${node.data || ''}-->`;
    case 'element': {
      const tag = node.tagName || '';
      const open = `<${tag}${serializeAttrs(node.attrs)}`;
      if (VOID_TAGS.has(tag)) return `${open}/>`;
      return `${open}>${(node.children || []).map(astToHtml).join('')}</${tag}>`;
    }
    default:
      return '';
  }
}

/**
 * Recursively strip `data-nest-level` from every element's attrs.
 * nest.ts depth1 annotates each node with this detection bookkeeping; it is
 * not content and must not leak into clean output. Run before astToHtml.
 */
export function stripNestLevelAnnotations(node: AstNode): void {
  if (node.type === 'element' && node.attrs) {
    delete node.attrs['data-nest-level'];
  }
  for (const child of node.children || []) {
    stripNestLevelAnnotations(child);
  }
}
