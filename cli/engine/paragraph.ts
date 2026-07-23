// Paragraph structure splitter: returns the paragraph list of an HTML tree.

const blockEleTagName = ['P', 'DIV', 'SECTION', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TABLE', 'WX-VIEW'];
const canNotSplitEleClassName = ['js_product_container', 'js_blockquote_wrap'];
const canNotSplitEleTagName = ['BLOCKQUOTE'];
const selfTagName = ['HR', 'IMG'];

interface GetParaListOpts {
  getNestedStructure?: boolean;
  isMarkNode?: (node: any) => boolean;
  ignoreFlexChildren?: boolean;
  ignoreNotWriteableChildren?: boolean;
  getSpan?: boolean;
  [key: string]: unknown;
}

function childNodesHasBlockEle(element: any, opts: GetParaListOpts): boolean {
  if (!element || element.nodeType !== 1) return false;
  for (let i = 0, len = element.children.length; i < len; i++) {
    if (
      blockEleTagName.indexOf(element.children[i].tagName) !== -1
      || (opts.getSpan && element.children[i].tagName === 'SPAN'
        && (childNodesHasBlockEle(element.children[i], opts) || element.children[i].querySelector('br') !== null))
    ) {
      return true;
    }
  }
  return false;
}

function isNotSplitEle(ele: any, opts: GetParaListOpts): boolean {
  for (let i = 0; i < canNotSplitEleClassName.length; i++) {
    if (ele.className.indexOf(canNotSplitEleClassName[i]) > -1) return true;
  }
  if ((opts.ignoreFlexChildren && ele.style.display === 'flex' && (ele.style.flexDirection === 'row' || ele.style.flexDirection === 'row-reverse') && ele.children.length > 1)
    || (opts.ignoreNotWriteableChildren
      && (ele.getAttribute('contenteditable') === 'false' || (ele.childNodes.length === 1 && ele.childNodes[0].getAttribute('contenteditable') === 'false')))) {
    return true;
  }
  return canNotSplitEleTagName.indexOf(ele.tagName) > -1;
}

function getParaList(element: any, opts: GetParaListOpts, isRoot = true): any[] {
  const children = element.children;
  if (!children.length) return children;

  let child: any;
  let paragraphList: any[] = [];
  for (let i = 0; i < children.length; i++) {
    child = children[i];
    child.isWrapper = undefined;

    if (opts && opts.isMarkNode && opts.isMarkNode(child)) continue;

    if (childNodesHasBlockEle(child, opts) && !isNotSplitEle(child, opts)) {
      paragraphList = paragraphList.concat(getParaList(child, opts, false));
      if (opts.getNestedStructure && child.tagName !== 'SPAN') {
        child.isWrapper = true;
        paragraphList.push(child);
      }
    } else if (opts.getSpan && child.querySelector('br') !== null) {
      let pushed = false;
      Array.prototype.forEach.call(child.querySelectorAll('br'), (br: any) => {
        let currentNode = br;
        let parentNode = br.parentNode;
        while (parentNode.tagName === 'SPAN' && currentNode === parentNode.lastChild) {
          currentNode = parentNode;
          parentNode = parentNode.parentNode;
        }
        if (parentNode.tagName === 'SPAN' || (parentNode.tagName !== 'SPAN' && currentNode !== parentNode.lastChild)) {
          paragraphList.push(br);
          pushed = true;
        }
      });
      if (child.tagName !== 'SPAN') {
        if (pushed === false) {
          paragraphList.push(child);
        } else if (opts.getNestedStructure) {
          child.isWrapper = true;
          paragraphList.push(child);
        }
      }
    } else if (!opts.getSpan || (opts.getSpan && child.tagName !== 'SPAN' && selfTagName.indexOf(child.tagName) === -1)) {
      paragraphList.push(child);
    }
  }

  if (isRoot) {
    let needExecBr = true;
    for (let i = paragraphList.length - 1, c = paragraphList[i]; i >= 0; i--, c = paragraphList[i]) {
      if (c.isWrapper) {
        needExecBr = true;
      } else if (needExecBr && c.tagName === 'BR') {
        needExecBr = false;
        while (!c.isWrapper) {
          if (c.nextElementSibling !== null) {
            paragraphList.splice(i + 1, 0, c.nextElementSibling);
            break;
          } else {
            c = c.parentNode;
          }
        }
      }
    }
  }

  return paragraphList;
}

getParaList.paragraphStartIdx = 1000000;

export default getParaList;
