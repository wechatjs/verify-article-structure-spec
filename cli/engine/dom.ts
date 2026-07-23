// DOM helpers: editor mark-node detection + empty-paragraph check.

const bookmarkPrefix = '_baidu_bookmark_';
const checktextTagName = 'mpchecktext';
const checktextTmpTagName = 'mptmpchecktext';
const payFilterTagName = 'mp-pay-preview-filter';

function isMarkNode(node: any): boolean {
  if (!node || !node.tagName) return false;
  const tagName = node.tagName.toLowerCase();
  if (tagName === checktextTagName || tagName === checktextTmpTagName || tagName === payFilterTagName) {
    return true;
  }
  if (node.nodeType === 1 && node.id && new RegExp('^' + bookmarkPrefix, 'i').test(node.id)) {
    return true;
  }
  return false;
}

const specialTags = /iframe|video|audio|cps|mp|img|animateTransform|hr|path|br|svg|^g$|^a$/i;

export const domUtils = { isMarkNode, specialTags };

// Visually-empty paragraph: blank, only <br>, whitespace, or ProseMirror empty placeholder.
function isEmptyParagraph(element: any): boolean {
  const html = element.innerHTML.trim();
  return html === ''
    || /^(\s*<br[^>]*?\s*\/?>\s*)*$/i.test(html)
    || /^\s*$/.test(html)
    || /^<span[^>]*\bleaf\b[^>]*>\s*(<br[^>]*>)?\s*<\/span>$/i.test(html);
}

export { isMarkNode, isEmptyParagraph };
