// Minimal viability probe: puppeteer + bundle inject + full rules (incl. layout).

import { verifyHtml, type VerifyResult } from './browser-runner.js';

/** Probe HTML: transparent caret-color (collect rule) + height overflow (layout rule height-nodisplay). */
const PROBE_HTML = `
<section>
  <p style="caret-color: rgba(0,0,0,0)">透明光标测试段落</p>
  <div style="height:1px;overflow:hidden;">
    <div style="height:120px;">溢出子元素（子高度 120 远大于父 height:1）</div>
  </div>
</section>
`;

interface ProbeCheck {
  name: string;
  pass: boolean;
  detail: string;
}

function check(result: VerifyResult): ProbeCheck[] {
  const inValidInfo = result.inValidInfo || {};
  const keys = Object.keys(inValidInfo);
  const warnMsgs = result.warnMsgs || [];

  const checks: ProbeCheck[] = [
    {
      name: 'verifyArticleStructure 返回结果不抛错',
      pass: result && typeof result.isValid === 'boolean',
      detail: `isValid=${result?.isValid}`,
    },
    {
      name: '含 caret-color 违规（收集阶段跑通）',
      pass: keys.includes('caret-color'),
      detail: `inValidKeys=[${keys.join(', ')}]`,
    },
    {
      name: '含 height-nodisplay 违规（布局阶段跑通）',
      pass: keys.includes('height-nodisplay'),
      detail: inValidInfo['height-nodisplay']
        ? `items=${inValidInfo['height-nodisplay'].items?.length || 0}`
        : '未检出',
    },
    {
      name: '不含「布局规则跳过」告警',
      pass: !warnMsgs.some((m) => String(m).includes('布局规则跳过')),
      detail: `warnMsgs=${warnMsgs.length ? JSON.stringify(warnMsgs) : '(空)'}`,
    },
  ];
  return checks;
}

async function main() {
  console.log('=== 探针启动：验证 puppeteer 注入 bundle 后全规则（含布局类）跑通 ===\n');

  console.log('[1/3] puppeteer launch + 注入 browser bundle ...');
  let result: VerifyResult;
  try {
    result = await verifyHtml(PROBE_HTML);
  } catch (e) {
    console.error('\n❌ 探针失败：verifyHtml 抛错');
    console.error((e as Error)?.stack || e);
    process.exit(1);
  }
  console.log('    ✓ 注入成功，verifyArticleStructure 已返回结果\n');

  console.log('[2/3] 断言检查 ...');
  const checks = check(result);
  checks.forEach((c) => {
    console.log(`    ${c.pass ? '✓' : '✗'} ${c.name}  →  ${c.detail}`);
  });

  console.log('\n[3/3] 汇总 ...');
  const allPass = checks.every((c) => c.pass);
  if (allPass) {
    console.log('\n✅ 探针通过：puppeteer 注入 + 全规则（含布局类 height-nodisplay）跑通。可铺开 CLI 主体。\n');
    process.exit(0);
  } else {
    const failed = checks.filter((c) => !c.pass).map((c) => c.name);
    console.error(`\n❌ 探针失败：${failed.length} 项未通过 → ${failed.join('；')}`);
    console.error('   需迭代探针 HTML 构造（参考 debug-fixtures.js 已知触发 height-nodisplay 的 fixture 写法）');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('探针异常:', (e as Error)?.stack || e);
  process.exit(1);
});
