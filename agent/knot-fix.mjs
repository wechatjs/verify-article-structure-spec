#!/usr/bin/env node
/**
 * knot-fix.mjs — GitHub Issue 轮询 + Knot 智能体修复触发器
 *
 * 职责（刻意保持薄，重活全在智能体侧）：
 *   1. 轮询 GitHub spec 仓带 `agent` 标签的 open issue（去重靠标签，不靠内存）
 *   2. 发现待处理 issue → 调 Knot 智能体 AG-UI API（绑定工作区 + 注入终端环境变量）
 *   3. 解析智能体终态 JSON → issue 评论 + 打终态标签
 *
 * 状态机（与旧 fix-service 一致，全部落在 GitHub label 上，脚本可随时重启）：
 *   agent                    触发标签（issue 模板维护者手动打，或以后自动化）
 *   agent:processing         处理中（防止并发捞取）
 *   agent:processed-YYYYMMDD 修复成功，PR 已创建
 *   agent:skipped            分诊判定检测正确，无需改规则
 *   agent:needs-human        信息不足 / 需人工介入
 *   agent:failed             修复失败（重试耗尽或智能体异常）
 *
 * 用法：
 *   node agent/knot-fix.mjs --once     单次扫描（配 cron 用）
 *   node agent/knot-fix.mjs            常驻轮询（默认每 3 分钟）
 *   node agent/knot-fix.mjs --reset-processing <N>  清掉 issue #N 卡死的 processing 标签
 *
 * 配置：复制 agent/.env.example 为 agent/.env 填好（.env 已 gitignore）
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── 极简 dotenv：读脚本同目录 .env，已存在的进程变量优先 ───
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    const val = m[2].replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

// ─── 配置 ───
const CFG = {
  githubApi: 'https://api.github.com',
  repo: process.env.GITHUB_REPO || 'wechatjs/verify-article-structure-spec',
  ghToken: process.env.GITHUB_TOKEN || '',

  knotBase: process.env.KNOT_API_BASE || '',
  knotToken: process.env.KNOT_API_TOKEN || '',
  agentId: process.env.KNOT_AGENT_ID || '',
  knotModel: process.env.KNOT_MODEL || 'claude-sonnet-5.5',
  workspaceUuid: process.env.KNOT_AGENT_CLIENT_UUID || '',

  repoPath: process.env.REPO_PATH || '',
  pollMinutes: parseInt(process.env.KNOT_POLL_MINUTES || '3', 10),
  agentTimeoutMs: parseInt(process.env.KNOT_TIMEOUT_MINUTES || '45', 10) * 60 * 1000,
  maxIssuesPerRun: parseInt(process.env.KNOT_MAX_ISSUES_PER_RUN || '1', 10),
};

const TRIGGER_LABEL = 'agent';
const PROCESSING_LABEL = 'agent:processing';
const TERMINAL_LABELS = ['agent:failed', 'agent:skipped', 'agent:needs-human'];
const PROCESSED_PREFIX = 'agent:processed-';

function log(...args) {
  console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...args);
}

function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

// ─── GitHub API ───
async function gh(method, apiPath, body) {
  const res = await fetch(`${CFG.githubApi}${apiPath}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${CFG.ghToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'verify-article-fix-agent',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub API ${method} ${apiPath} -> ${res.status}: ${text.slice(0, 300)}`);
  }
  // 204 等空响应
  if (res.status === 204) return null;
  return res.json();
}

const labels = (issue) => (issue.labels || []).map((l) => (typeof l === 'string' ? l : l.name));
const isTerminal = (issue) => {
  const ls = labels(issue);
  return TERMINAL_LABELS.some((t) => ls.includes(t)) || ls.some((l) => l.startsWith(PROCESSED_PREFIX));
};

async function addLabels(num, arr) {
  try {
    await gh('POST', `/repos/${CFG.repo}/issues/${num}/labels`, { labels: arr });
  } catch (e) {
    log(`⚠ addLabels(${num}, ${arr}) 失败: ${e.message}`);
  }
}

async function removeLabel(num, name) {
  try {
    await gh('DELETE', `/repos/${CFG.repo}/issues/${num}/labels/${encodeURIComponent(name)}`);
  } catch (e) {
    log(`⚠ removeLabel(${num}, ${name}) 失败: ${e.message}`);
  }
}

async function comment(num, body) {
  await gh('POST', `/repos/${CFG.repo}/issues/${num}/comments`, { body });
}

// ─── Knot AG-UI 调用 ───
function buildMessage(issue) {
  return [
    `【任务】处理 GitHub Issue #${issue.number}（排版规则反馈），完成后按约定输出终态 JSON。`,
    '',
    '## 环境说明',
    '- 仓库已在本地 clone，路径见终端环境变量 REPO_PATH',
    '- GITHUB_TOKEN 已注入终端环境变量：push 用 `https://x-access-token:$GITHUB_TOKEN@github.com/${CFG.repo}.git`，提 PR 用 GitHub API',
    '- 开始前先切干净分支：`git -C $REPO_PATH fetch origin && git -C $REPO_PATH checkout -B agent/issue-${issue.number} origin/main`',
    '- Issue 里的文章链接需自行抓取 HTML 后再复现（curl 带 UA）',
    '',
    '## Issue 内容',
    `标题：${issue.title}`,
    '',
    '正文：',
    '---',
    issue.body || '（空）',
    '---',
    '',
    '## 输出要求（最后一步，只输出这一个 JSON，不要额外解释）',
    '```json',
    '{"status": "PR_CREATED|SKIP|NEED_HUMAN|FAILED", "pr_url": "PR 链接或空", "summary": "一句话中文说明"}',
    '```',
  ].join('\n');
}

/**
 * 调用 Knot 智能体（AG-UI 协议，非流式）。
 * 返回智能体最终回复文本。
 * 兼容三种响应形态：整体 JSON / SSE 事件流 / XML 协议 choices。
 */
async function callKnotAgent(message) {
  const url = `${CFG.knotBase}/apigw/api/v1/agents/agui/${CFG.agentId}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-knot-api-token': CFG.knotToken,
    },
    body: JSON.stringify({
      input: {
        message,
        conversation_id: '',
        model: CFG.knotModel,
        stream: false,
        enable_web_search: false,
        use_memory: false,
        chat_extra: {
          agent_client_uuid: CFG.workspaceUuid,
          terminal_env_infos: {
            GITHUB_TOKEN: CFG.ghToken,
            REPO_PATH: CFG.repoPath,
            ISSUE_NUMBER: '',
          },
        },
      },
    }),
    signal: AbortSignal.timeout(CFG.agentTimeoutMs),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Knot API ${res.status}: ${text.slice(0, 500)}`);
  }

  const raw = await res.text();

  // 形态一：SSE 事件流（data: {...} 行）——拼接所有 TEXT_MESSAGE_CONTENT
  if (raw.includes('data:')) {
    const parts = [];
    let sawTextStart = false;
    for (const line of raw.split('\n')) {
      const s = line.replace(/^data:\s?/, '').trim();
      if (!s || s === '[DONE]') continue;
      let msg;
      try {
        msg = JSON.parse(s);
      } catch {
        continue;
      }
      if (msg.type === 'TEXT_MESSAGE_START') {
        parts.length = 0;
        sawTextStart = true;
      }
      if (msg.type === 'TEXT_MESSAGE_CONTENT' && msg.rawEvent?.content) {
        parts.push(msg.rawEvent.content);
      }
      if (msg.type === 'RunError') {
        throw new Error(`Knot RunError: ${msg.rawEvent?.tip_option?.content || JSON.stringify(msg).slice(0, 300)}`);
      }
    }
    const text = parts.join('');
    if (text) return text;
    if (!sawTextStart) throw new Error(`Knot SSE 响应无文本事件: ${raw.slice(0, 300)}`);
  }

  // 形态二/三：整体 JSON
  // 实测（2026-11-09 冒烟测试）：非流式返回单个事件对象
  //   { rawEvent: { content, conversation_id, ... }, type: "TEXT_MESSAGE_CONTENT", ... }
  try {
    const j = JSON.parse(raw);
    if (typeof j?.rawEvent?.content === 'string') return j.rawEvent.content;
    const viaChoices = j?.choices?.[0]?.message?.content;
    if (viaChoices) return viaChoices;
    if (typeof j?.content === 'string') return j.content;
    // 事件数组形态
    if (Array.isArray(j)) {
      const parts = j.filter((e) => e.type === 'TEXT_MESSAGE_CONTENT').map((e) => e.rawEvent?.content || '');
      if (parts.length) return parts.join('');
    }
    throw new Error(`Knot 响应结构未识别: ${JSON.stringify(j).slice(0, 300)}`);
  } catch (e) {
    if (e instanceof SyntaxError) throw new Error(`Knot 响应非 JSON: ${raw.slice(0, 300)}`);
    throw e;
  }
}

/** 从智能体回复中提取终态 JSON（容忍代码块包裹、前后杂文） */
function parseVerdict(text) {
  const fence = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  const candidates = [];
  if (fence) candidates.push(fence[1]);
  const bare = text.match(/\{[\s\S]*"status"[\s\S]*\}/);
  if (bare) candidates.push(bare[0]);

  for (const c of candidates) {
    try {
      const v = JSON.parse(c);
      if (['PR_CREATED', 'SKIP', 'NEED_HUMAN', 'FAILED'].includes(v.status)) {
        return { status: v.status, pr_url: v.pr_url || '', summary: v.summary || '' };
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

// ─── 单个 issue 的处理流程 ───
async function processIssue(issue) {
  const num = issue.number;
  log(`▶ 处理 issue #${num}: ${issue.title}`);

  await addLabels(num, [PROCESSING_LABEL]);

  let verdict;
  let apiError = '';
  try {
    const reply = await callKnotAgent(buildMessage(issue));
    log(`  智能体回复（尾部 300 字）: ...${reply.slice(-300).replace(/\n/g, ' ')}`);
    verdict = parseVerdict(reply);
    if (!verdict) {
      verdict = { status: 'NEED_HUMAN', pr_url: '', summary: `智能体回复未包含合法终态 JSON，请人工查看。回复尾部：${reply.slice(-200)}` };
    }
  } catch (e) {
    apiError = e.message;
    log(`  ✗ Knot 调用失败: ${apiError}`);
    verdict = { status: 'FAILED', pr_url: '', summary: `Knot API 调用失败：${apiError}` };
  }

  const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  try {
    if (verdict.status === 'PR_CREATED') {
      await comment(
        num,
        [
          '✅ **AI Agent 自动修复完成**',
          '',
          `- ${verdict.summary}`,
          `- PR：${verdict.pr_url}`,
          '',
          '修复已通过全量测试，请 review 上方 PR；合并后将自动发布新版 npm 包。',
          '如对修复有疑问，可直接在本 issue 留言。',
        ].join('\n'),
      );
      await addLabels(num, [`${PROCESSED_PREFIX}${dateTag}`]);
    } else if (verdict.status === 'SKIP') {
      await comment(num, `🔍 **AI 分诊结果：检测正确，无需修改规则**\n\n- ${verdict.summary}`);
      await addLabels(num, ['agent:skipped']);
    } else if (verdict.status === 'NEED_HUMAN') {
      await comment(num, `🤔 **AI 无法自动处理，需人工介入**\n\n- ${verdict.summary}`);
      await addLabels(num, ['agent:needs-human']);
    } else {
      await comment(
        num,
        [
          '❌ **Agent 自动修复失败**',
          '',
          `- ${verdict.summary || apiError}`,
          '',
          '请人工排查；处理好后可移除 `agent:failed` 标签并重新打 `agent` 标签触发重试。',
        ].join('\n'),
      );
      await addLabels(num, ['agent:failed']);
    }
  } finally {
    await removeLabel(num, PROCESSING_LABEL);
  }

  log(`✔ issue #${num} 终态: ${verdict.status}${verdict.pr_url ? ` (${verdict.pr_url})` : ''}`);
}

// ─── 主循环 ───
async function scanOnce() {
  const issues = await gh(
    'GET',
    `/repos/${CFG.repo}/issues?state=open&labels=${encodeURIComponent(TRIGGER_LABEL)}&per_page=30`,
  );

  // issues API 会把 PR 也返回，过滤掉；再过滤终态与处理中
  const candidates = issues.filter(
    (i) => !i.pull_request && !isTerminal(i) && !labels(i).includes(PROCESSING_LABEL),
  );

  log(`扫描完成：open+agent 共 ${issues.filter((i) => !i.pull_request).length} 个，待处理 ${candidates.length} 个`);
  if (candidates.length === 0) return;

  for (const issue of candidates.slice(0, CFG.maxIssuesPerRun)) {
    await processIssue(issue);
  }
}

async function main() {
  const args = process.argv.slice(2);

  // --reset-processing <N>：清掉卡死的 processing 标签（脚本崩溃在半路时用）
  const resetIdx = args.indexOf('--reset-processing');
  if (resetIdx !== -1) {
    const num = parseInt(args[resetIdx + 1], 10);
    if (!num) die('用法: --reset-processing <issue编号>');
    if (!CFG.ghToken) die('GITHUB_TOKEN 未配置');
    await removeLabel(num, PROCESSING_LABEL);
    log(`已移除 issue #${num} 的 ${PROCESSING_LABEL} 标签`);
    return;
  }

  // 配置校验
  const missing = Object.entries({
    GITHUB_TOKEN: CFG.ghToken,
    KNOT_API_BASE: CFG.knotBase,
    KNOT_API_TOKEN: CFG.knotToken,
    KNOT_AGENT_ID: CFG.agentId,
    KNOT_AGENT_CLIENT_UUID: CFG.workspaceUuid,
    REPO_PATH: CFG.repoPath,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) die(`.env 配置缺失：${missing.join(', ')}（参考 agent/.env.example）`);

  if (args.includes('--once')) {
    await scanOnce();
    return;
  }

  log(`常驻轮询启动：每 ${CFG.pollMinutes} 分钟扫描一次，repo=${CFG.repo}，model=${CFG.knotModel}`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await scanOnce();
    } catch (e) {
      log(`✗ 扫描异常（忽略，下轮继续）: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, CFG.pollMinutes * 60 * 1000));
  }
}

main().catch((e) => {
  console.error(`✗ 未捕获异常: ${e.stack || e}`);
  process.exit(1);
});
