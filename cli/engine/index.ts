// Engine entry: verifyArticleStructure.
// Flow: darkmode convert/validate → getParaList → nest detection (dry-run) →
// collect style candidates → layout measurement → aggregate by property.

import Darkmode from 'mp-darkmode';

import getParaList from './paragraph.js';
import { domUtils } from './dom.js';
import { deleteNestNode } from './nest.js';
import { propertyRules } from './rules-text.js';
import { getInvalidNodes } from './collect.js';
import { detectLayoutIssues } from './layout.js';
import type { VerifyOpts, VerifyResult, ViolationEntry } from './types.js';

// Reverse-lookup the paragraph index for a node via the nearest data-blockidx
// ancestor, falling back to paragraphList.contains. Returns -1 when unknown.
//
// 优先级 1：编辑器自带的 data-para-index（编辑器对 live DOM 盖的段落编号，
// 是「定位」跳转的真正依据）。引擎自算的段号基于传入 HTML 的切分，与编辑器
// 内部段落列表可能存在偏移（编辑态 DOM 带 span leaf 等产物、节点经编辑增删），
// 实测同一节点我们算 41 而编辑器标 42，定位跳错一行。属性缺失（CLI 场景）时
// 走优先级 2。
// 优先级 2：data-blockidx stamp + 包含性验证。quickRegex 跳过的段落（如无
// 样式关键词的 ul 列表块）自身子树没有盖章，其内部节点反查会一路穿透到被
// 早期段落盖章的共享外层容器，得到错误的早期段号——所以找到 stamp 后必须
// 确认 paragraphList[idx] 确实包含该节点。
// 优先级 3：findIndex 兜底（第一个包含该节点的段落）。
function resolveParagraphIndex(node: any, paragraphList: any[]): number {
  // 优先级 1：编辑器自己的段落编号
  let el = node;
  while (el) {
    if (typeof el.getAttribute === 'function') {
      const editorIdx = el.getAttribute('data-para-index');
      if (editorIdx !== null && editorIdx !== '') {
        const n = parseInt(editorIdx, 10);
        if (Number.isFinite(n)) return n;
      }
    }
    el = el.parentNode;
  }

  // 优先级 2：data-blockidx stamp + 包含性验证
  el = node;
  while (el) {
    if (typeof el.getAttribute === 'function') {
      const idx = el.getAttribute('data-blockidx');
      if (idx !== null && idx !== undefined && idx !== '') {
        const i = parseInt(idx, 10);
        const p = paragraphList[i];
        if (p && typeof p.contains === 'function' && p.contains(node)) return i;
      }
    }
    el = el.parentNode;
  }

  // 优先级 3：findIndex 兜底
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
  Darkmode.reset(nodes);
  Darkmode.run(nodes, {
    mode: 'dark',
    defaultDarkTextColor: '#989898',
    whitelist: { attribute: ['data-no-dark'] },
    needJudgeFirstPage: false,
    noEmit: true,
  });
  const darkmodeResult = Darkmode.validate(articleBody);
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
        // 用违规 dom 节点反查真实段号（mp-darkmode 不返回段落信息，旧逻辑
        // `|| 0` 把所有 item 兜底成第 1 段，编辑器「定位」按钮全部跳错）。
        // dom 已在原始容器上，data-blockidx 由 getInvalidNodes 盖章，可反查。
        // 找不到时返回 -1（诚实未知），不要假装成第 1 段。
        paragraphIndex: resolveParagraphIndex(item.dom, paragraphList),
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
