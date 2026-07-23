// DOM (jsdom Node) -> mutable AST. AST node shape mirrors UE.uNode so the
// engine's nest.ts helpers (getTag / getStyle / getElementChildren) work
// unchanged: { type, tagName, attrs, children, parentNode, data }.
//
// The whole point of this conversion: nest.ts real-delete (isNeedDelete) does
// plain property assignment (currentNode.parentNode = ...; children[0] = ...).
// On a live DOM those are no-ops (parentNode readonly, children is a live
// HTMLCollection); on this AST they are ordinary writable fields and take effect.

/** Mutable AST node, shape-aligned with UE.uNode. */
export interface AstNode {
  type: 'root' | 'element' | 'text' | 'comment';
  tagName?: string; // element only, lowercase
  attrs?: Record<string, string>; // element only
  children?: AstNode[]; // root / element
  parentNode?: AstNode | null; // bidirectional link, set by domToAst
  data?: string; // text / comment only
}

/** jsdom Node.nodeType constants (avoid importing the full lib just for these). */
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const COMMENT_NODE = 8;
const DOCUMENT_NODE = 9;
const DOCUMENT_FRAGMENT_NODE = 11;

/** Read a NamedNodeMap into a plain lowercase-keyed attrs object, preserving source order. */
function collectAttrs(attributes: NamedNodeMap): Record<string, string> {
  const attrs: Record<string, string> = {};
  // jsdom NamedNodeMap preserves insertion order; iterate by index to keep it.
  for (let i = 0; i < attributes.length; i++) {
    const attr = attributes[i];
    attrs[attr.name.toLowerCase()] = attr.value;
  }
  return attrs;
}

/** Recursively convert a jsdom Node into an AstNode tree, wiring parentNode links. */
export function domToAst(node: Node, parent: AstNode | null = null): AstNode {
  switch (node.nodeType) {
    case ELEMENT_NODE: {
      const element = node as Element;
      const ast: AstNode = {
        type: 'element',
        tagName: element.tagName.toLowerCase(),
        attrs: collectAttrs(element.attributes),
        children: [],
        parentNode: parent,
      };
      element.childNodes.forEach((child) => {
        ast.children!.push(domToAst(child, ast));
      });
      return ast;
    }
    case TEXT_NODE: {
      return { type: 'text', data: node.nodeValue ?? '', parentNode: parent };
    }
    case COMMENT_NODE: {
      return { type: 'comment', data: node.nodeValue ?? '', parentNode: parent };
    }
    case DOCUMENT_NODE:
    case DOCUMENT_FRAGMENT_NODE: {
      const ast: AstNode = { type: 'root', children: [], parentNode: parent };
      node.childNodes.forEach((child) => {
        ast.children!.push(domToAst(child, ast));
      });
      return ast;
    }
    default: {
      // Unknown node types (CDATA, processing instruction, ...): represent as text.
      return { type: 'text', data: node.nodeValue ?? '', parentNode: parent };
    }
  }
}
