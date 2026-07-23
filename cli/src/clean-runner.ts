// clean runner: jsdom parse HTML -> mutable AST -> deleteNestNode real-delete
// (isNeedDelete) -> strip detection annotations -> serialize back to HTML.
// Optional --verify path reuses editor:check's puppeteer chain to report
// before/after nestNodes counts (before = original, after = cleaned).

import { JSDOM } from 'jsdom';
import { domToAst, type AstNode } from './ast/ast-convert.js';
import { astToHtml, stripNestLevelAnnotations } from './ast/ast-serialize.js';
import { deleteNestNode } from '../engine/nest.js';
import { launchBrowser, runVerify, type VerifyResult } from './browser-runner.js';

/**
 * Run the clean pipeline on an HTML string and return the cleaned HTML.
 * jsdom parses into a DOM (intermediate); the body element's children become
 * the children of a synthetic root so deleteNestNode walks a container (matching
 * editor:check's div-container convention) and astToHtml emits only the content
 * (no wrapping <body>). domToAst turns the DOM into a mutable AST, deleteNestNode
 * mutates the AST in place (real-delete), annotations are stripped, then the
 * AST is serialized back to HTML.
 */
export function runClean(html: string): string {
  const dom = new JSDOM(html);
  const bodyAst = domToAst(dom.window.document.body, null);
  // Wrap body's children under a root container (type 'root'), mirroring how
  // editor:check passes a div container as the engine root. This also ensures
  // astToHtml emits the content without a <body> wrapper.
  const root: AstNode = { type: 'root', children: bodyAst.children || [], parentNode: null };
  for (const child of root.children!) child.parentNode = root;
  deleteNestNode({ root, isNeedDelete: true });
  stripNestLevelAnnotations(root);
  return astToHtml(root);
}

/** Count nestNodes items in a verify result (0 when none detected). */
function nestNodesCount(result: VerifyResult): number {
  const items = result?.inValidInfo?.nestNodes?.items;
  return Array.isArray(items) ? items.length : 0;
}

/**
 * Run clean AND verify the cleanup: before = nestNodes in the original HTML,
 * after = nestNodes in the cleaned HTML. Launches a browser (puppeteer) for
 * the verify recheck only; the clean itself stays jsdom-only.
 */
export async function runCleanWithVerify(html: string): Promise<{
  cleanedHtml: string;
  before: number;
  after: number;
}> {
  const cleanedHtml = runClean(html);
  const { browser, page } = await launchBrowser();
  try {
    const beforeResult = await runVerify(page, html);
    const afterResult = await runVerify(page, cleanedHtml);
    return {
      cleanedHtml,
      before: nestNodesCount(beforeResult),
      after: nestNodesCount(afterResult),
    };
  } finally {
    await browser.close();
  }
}
