// Engine entry: verifyArticleStructure.
// Flow: darkmode convert/validate → getParaList → nest detection (dry-run) →
// collect style candidates → layout measurement → aggregate by property.

import getParaList from './paragraph.js';
import { domUtils } from './dom.js';
import { deleteNestNode } from './nest.js';
import Darkmode from './darkmode.js';
import { propertyRules } from './rules-text.js';
import { getInvalidNodes } from './collect.js';
import { detectLayoutIssues } from './layout.js';
import type { VerifyOpts, VerifyResult, ViolationEntry } from './types.js';

const DARKMODE_RUN_OPTS = {
  mode: 'dark',
  defaultDarkTextColor: '#989898',
  whitelist: { attribute: ['data-no-dark'] },
  needJudgeFirstPage: false,
  noEmit: true,
};

// Reverse-lookup the paragraph index for a node via the nearest data-blockidx
// ancestor, falling back to paragraphList.contains. Returns -1 when unknown.
function resolveParagraphIndex(node: any, paragraphList: any[]): number {
  let el = node;
  while (el) {
    if (typeof el.getAttribute === 'function') {
      const idx = el.getAttribute('data-blockidx');
      if (idx !== null && idx !== undefined && idx !== '') return parseInt(idx, 10);
    }
    el = el.parentNode;
  }
  return paragraphList.findIndex((p: any) => p && p.contains && p.contains(node));
}

async function verifyArticleStructure(articleBody: any, opts: VerifyOpts = {}): Promise<VerifyResult> {
  const nodes = articleBody.querySelectorAll('*');
  // mp-darkmode's conversion resolves backgrounds/gradients via the live render
  // tree (getComputedStyle), so the node must be attached to the document during
  // the darkmode stage — otherwise gradient/contrast markers are never stamped
  // and darkmode rules silently produce nothing. Attach only for this stage, then
  // detach again so the subsequent layout measurement keeps its detached sandbox
  // (attaching there caused false positives — see browser-runner.ts).
  const doc = typeof document !== 'undefined' ? document : null;
  const detached = doc && doc.body && !articleBody.parentNode;
  if (detached) doc!.body.appendChild(articleBody);
  Darkmode.reset(nodes, DARKMODE_RUN_OPTS);
  Darkmode.run(nodes, DARKMODE_RUN_OPTS);
  const darkmodeResult = Darkmode.validate(articleBody, DARKMODE_RUN_OPTS);
  if (detached) doc!.body.removeChild(articleBody);

  const paragraphList = getParaList(articleBody, {
    isMarkNode(node: any) { return domUtils.isMarkNode(node); },
    getNestedStructure: opts.getNestedStructure,
    ignoreFlexChildren: opts.ignoreFlexChildren,
    ignoreNotWriteableChildren: opts.ignoreNotWriteableChildren,
    getSpan: opts.getSpan,
  });

  // Nest detection reuses the editor's deleteNestNode dry-run (isTest) mode.
  const nestedNodes = deleteNestNode({ root: articleBody, isTest: true }) || [];

  const invalidNodesResult = getInvalidNodes(paragraphList);

  const fullHtmlString = articleBody && articleBody.outerHTML
    ? articleBody.outerHTML
    : (articleBody && articleBody.innerHTML ? `<section>${articleBody.innerHTML}</section>` : '');

  const layoutIssues: Record<string, ViolationEntry> = await detectLayoutIssues(
    invalidNodesResult.invalidNodes,
    fullHtmlString,
    opts.layoutDetectOptions as any,
  );

  // nestNodes: dedupe by paragraphIndex, keep the outermost (longest outerHTML).
  if (nestedNodes.length > 0) {
    const byPara = new Map<any, any>();
    nestedNodes.forEach((item: any) => {
      const paragraphIndex = resolveParagraphIndex(item, paragraphList);
      const outerHTML = item.outerHTML || '';
      const key = paragraphIndex !== undefined && paragraphIndex !== -1 ? `p_${paragraphIndex}` : item;
      const exist = byPara.get(key);
      if (!exist || (exist.outerHTML || '').length < outerHTML.length) {
        byPara.set(key, { paragraphIndex, outerHTML });
      }
    });
    layoutIssues.nestNodes = { violateRules: propertyRules['nest-level'], items: Array.from(byPara.values()) };
  }

  // darkmode: group by key.
  if (darkmodeResult.length > 0) {
    const byKey: Record<string, ViolationEntry> = {};
    darkmodeResult.forEach((item: any) => {
      if (!item || !item.key) return;
      if (!byKey[item.key]) byKey[item.key] = { violateRules: item.violateRules || '', items: [] };
      byKey[item.key].items.push({
        outerHTML: item.outerHTML || (item.dom ? item.dom.outerHTML : ''),
        paragraphIndex: item.paragraphIndex || 0,
      });
    });
    Object.assign(layoutIssues, byKey);
  }

  // Aggregate: keep only paragraphIndex/outerHTML/rules/thIndex per item.
  const filteredInfo: Record<string, ViolationEntry> = {};
  for (const [property, issueGroup] of Object.entries(layoutIssues)) {
    filteredInfo[property] = {
      violateRules: issueGroup.violateRules,
      items: issueGroup.items.map((item: any) => {
        const filtered: any = { paragraphIndex: item.paragraphIndex, outerHTML: item.outerHTML };
        if (item.rules) filtered.rules = item.rules;
        if (item.thIndex !== undefined) filtered.thIndex = item.thIndex;
        return filtered;
      }),
    };
  }

  const hasInValidData = Object.values(filteredInfo).some((g: any) => g.items && g.items.length > 0);
  return hasInValidData ? { isValid: false, inValidInfo: filteredInfo } : { isValid: true, inValidInfo: {} };
}

export { verifyArticleStructure };
