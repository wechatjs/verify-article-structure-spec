// Nested-level detection via the editor's deleteNestNode dry-run (isTest) mode.
// Aligned with web-webapp-common/js/editor_filter.js (MAX_STYLE_LEVEL = 15 + new
// unwrap simulation). Debug console.log stripped for cli style; the data-nest-level
// attribute annotation is kept (detection semantic, used to locate nesting depth).

import { domUtils } from './dom.js';

interface DeleteNestNodeOpts {
  root: any;
  isPaste?: boolean;
  html?: string;
  isNeedDelete?: boolean;
  isFromApp?: boolean;
  isTest?: boolean;
}

// Unified "effective element children" getter so AST and Real DOM behave alike:
// Real DOM .children (HTMLCollection) already returns Element nodes only;
// AST .children (Array) mixes in text nodes (type='text'), which must be filtered.
const getElementChildren = (node: any): any[] => {
  if (!node || !node.children) return [];
  const children = node.children;
  // Real DOM HTMLCollection exposes .item(); return as-is.
  if (typeof children.item === 'function') return children;
  // AST mode: keep only nodes with a tagName (element nodes).
  return children.filter((c: any) => !!c.tagName);
};

function deleteNestNode({ root, isNeedDelete = false, isTest = false }: DeleteNestNodeOpts): any[] | undefined {
  // Real-delete (isNeedDelete) mutates structure via plain assignment:
  // currentNode.parentNode = temp; children[0] = currentNode; etc. These only
  // take effect on a mutable AST (parentNode/children are plain writable props).
  // On a live DOM they are no-ops (parentNode is readonly, children is a live
  // HTMLCollection). Callers MUST pass a mutable AST root, not a DOM node, for
  // isNeedDelete to actually delete. (dedupe does this via domToAst.)
  const MAX_STYLE_LEVEL = 15;
  const hasNestedNode: any[] = [];
  // isTest only: record one "will-be-deleted" representative per nested problem node.
  const willBeDeletedNodes: any[] = [];
  const willBeDeletedSet = new Set<any>();
  const pushWillBeDeleted = (node: any): boolean => {
    if (!node || willBeDeletedSet.has(node)) return false;
    willBeDeletedSet.add(node);
    willBeDeletedNodes.push(node);
    return true;
  };

  // ---- AST/DOM dual-compatible attribute helpers (deleteNestNode-local) ----
  // AST: node.tagName is already lowercase; DOM: tagName is uppercase — normalize.
  const getTag = (node: any): string => ((node && node.tagName) || '').toLowerCase();
  // AST: node.attrs.style; DOM: node.getAttribute('style')
  const getStyle = (node: any): string => {
    if (!node) return '';
    if (node.attrs && typeof node.attrs.style === 'string') return node.attrs.style;
    if (typeof node.getAttribute === 'function') return node.getAttribute('style') || '';
    return '';
  };

  const depth1 = (node: any) => {
    if (node === null) return;
    if (node.children) {
      node.level = node.parentNode && node.parentNode.level ? node.parentNode.level + 1 : 1;
      // Annotate nesting level on the node for caller-side locating (AST + DOM).
      if (node.attrs) node.attrs['data-nest-level'] = String(node.level);
      if (typeof node.setAttribute === 'function') node.setAttribute('data-nest-level', String(node.level));
      if (node.level >= MAX_STYLE_LEVEL) {
        hasNestedNode.push(node);
        return;
      }
    }
    const children = getElementChildren(node);
    for (let i = 0; i < children.length; i++) depth1(children[i]);
  };
  root.level = 0;
  depth1(root);

  if (hasNestedNode.length > 0 && (isNeedDelete || isTest)) {
    hasNestedNode.forEach(item => {
      // keep the nearest single layer
      let deleteLevel = MAX_STYLE_LEVEL - 2;
      let currentNode = item;

      let tagList: string[] = [];
      let styleDetailList: string[] = [];
      let parentStyleDetailList: string[] = [];

      const parentHasTag = (tagName: string): boolean => {
        let result = true;
        if (!tagList.includes(tagName)) {
          tagList.push(tagName);
          result = false;
        }
        return result;
      };

      const parentHasStyle = (str: string = '', isParentNode = false): boolean => {
        const allStyle = str.split(';');
        let result = true;
        if (isParentNode) {
          allStyle.forEach(s => {
            if (!parentStyleDetailList.includes(s)) {
              result = false;
              parentStyleDetailList.push(s);
            }
          });
        } else {
          allStyle.forEach(s => {
            if (!styleDetailList.includes(s) && !parentStyleDetailList.includes(s)) {
              result = false;
              styleDetailList.push(s);
            }
          });
        }
        return result;
      };

      // upward walk: tag unchecked, style checked
      while (deleteLevel) {
        const grandParent = currentNode.parentNode && currentNode.parentNode.parentNode;
        const gpChildren = grandParent ? getElementChildren(grandParent) : [];
        const gpChildrenLen = gpChildren.length;

        if (currentNode.parentNode && grandParent && gpChildrenLen === 1) {
          const nodeTagName = getTag(currentNode.parentNode);
          const nodeStyle = getStyle(currentNode.parentNode);

          if (!parentHasTag(nodeTagName) || (parentHasTag(nodeTagName) && !parentHasStyle(nodeStyle, true))) {
            // first occurrence of tag/style: keep climbing
            currentNode = currentNode.parentNode;
          } else {
            if (!domUtils.specialTags.test(nodeTagName)) {
              if (!isTest) {
                // real delete: upward replace
                const temp = currentNode.parentNode.parentNode;
                currentNode.parentNode = temp;
                currentNode.parentNode.children[0] = currentNode;
              } else {
                // isTest: one will-be-deleted node is enough
                pushWillBeDeleted(currentNode.parentNode);
                return;
              }
            }
          }
        }
        deleteLevel -= 1;
      }

      // reset for downward walk
      currentNode = item;

      // downward walk: dive as deep as deletable layers go
      const stack: any[] = [currentNode];

      while (stack.length) {
        const downNode = stack.pop();
        if (downNode.isNeedEmpty) {
          tagList = [];
          styleDetailList = [];
        }
        const downChildren = getElementChildren(downNode);
        const downChildrenLen = downChildren.length;

        if (downChildrenLen === 1) {
          const child = downChildren[0];
          const childChildren = getElementChildren(child);
          const childChildrenLen = childChildren.length;

          if (childChildrenLen === 1) {
            const grandChild = childChildren[0];
            const gcChildren = getElementChildren(grandChild);
            const gcChildrenLen = gcChildren.length;

            // delete only if there is content beyond the nearest 3 layers
            if (gcChildrenLen > 0) {
              const nodeTagName = getTag(child);
              const nodeStyle = getStyle(child);
              if (!parentHasTag(nodeTagName) || (parentHasTag(nodeTagName) && !parentHasStyle(nodeStyle))) {
                // first occurrence of tag/style: push child, keep diving
                stack.push(child);
              } else {
                // skip special tags when deleting
                if (!domUtils.specialTags.test(nodeTagName)) {
                  if (!isTest) {
                    // real delete: downward replace
                    const tmp = childChildren[0];
                    downNode.children[downNode.children.indexOf(child)] = tmp;
                    tmp.parentNode = downNode;
                    stack.push(downNode);
                  } else {
                    // isTest: record will-be-deleted node
                    pushWillBeDeleted(child);
                    return;
                  }
                }
              }
            }
          } else if (childChildrenLen > 1) {
            // child has multiple children: expand and keep walking
            for (let i = childChildrenLen - 1; i >= 0; i--) {
              childChildren[i].isNeedEmpty = true;
              stack.push(childChildren[i]);
            }
          }
        } else if (downChildrenLen > 1) {
          // downNode has multiple children: expand and keep walking
          for (let i = downChildrenLen - 1; i >= 0; i--) {
            downChildren[i].isNeedEmpty = true;
            stack.push(downChildren[i]);
          }
        }
      }
    });
  }

  // isTest returns the will-be-deleted node list for caller-side user prompts
  if (isTest) return willBeDeletedNodes;
}

export { deleteNestNode };
