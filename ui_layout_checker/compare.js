// @ts-check
// 走訪受測站，三個斷點各自與 baseline 比對，套三級判定，印出報告。
// 退出碼：任一斷點判定 fail → exit 1（讓 CI 紅燈）；只有 warn / pass → exit 0。
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const {
  TARGET_URL,
  BASELINE_DIR,
  BREAKPOINTS,
  FAIL_TOLERANCE_BY_BREAKPOINT,
} = require('./config');
const { extractLayout } = require('./extract');
const { diffSelector, classifyDiffs } = require('./diff');

const REPORT_PATH = path.resolve(__dirname, 'report.json');
const ICON = { fail: '✗', warn: '△', pass: '✓' };

function loadBaseline(bpName) {
  const p = path.join(BASELINE_DIR, `${bpName}.json`);
  if (!fs.existsSync(p)) {
    console.error(`找不到 ${bpName} 的基準檔：${p}\n請先執行：npm run layout:update`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function fmtDiff(d) {
  if ('delta' in d) {
    return `${d.field}: ${d.from} → ${d.to}（差 ${d.delta}px，容差 ±${d.tolerance}px）`;
  }
  return `${d.field}: ${JSON.stringify(d.from)} → ${JSON.stringify(d.to)}`;
}

async function main() {
  const browser = await chromium.launch();
  const report = { generatedAt: new Date().toISOString(), overall: 'pass', breakpoints: [] };

  for (const bp of BREAKPOINTS) {
    const baseline = loadBaseline(bp.name);
    const failOverride = FAIL_TOLERANCE_BY_BREAKPOINT[bp.name];

    const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height } });
    await page.goto(TARGET_URL);
    const current = await extractLayout(page);
    await page.close();

    const findings = [];
    let bpVerdict = 'pass';
    for (const selector of Object.keys(baseline.elements)) {
      const diffs = diffSelector(baseline.elements[selector], current[selector] || { found: false });
      if (diffs.length === 0) continue;
      const { verdict, graded } = classifyDiffs(diffs, failOverride);
      findings.push({ selector, verdict, diffs: graded });
      if (verdict === 'fail') bpVerdict = 'fail';
      else if (verdict === 'warn' && bpVerdict !== 'fail') bpVerdict = 'warn';
    }

    report.breakpoints.push({ name: bp.name, verdict: bpVerdict, findings });
    if (bpVerdict === 'fail') report.overall = 'fail';
    else if (bpVerdict === 'warn' && report.overall !== 'fail') report.overall = 'warn';

    // 逐斷點列印
    console.log(`\n${ICON[bpVerdict]} [${bp.name}] ${bp.width}×${bp.height} — ${bpVerdict.toUpperCase()}`);
    for (const f of findings) {
      console.log(`  ${ICON[f.verdict]} ${f.selector}`);
      for (const d of f.diffs) console.log(`      · [${d.severity}] ${fmtDiff(d)}`);
    }
    if (findings.length === 0) console.log(`  （${Object.keys(baseline.elements).length} 個元素全部在容差內）`);
  }

  await browser.close();
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');

  console.log(`\n──────── 總判定：${report.overall.toUpperCase()} ────────`);
  console.log(`報告已寫入 ${path.relative(process.cwd(), REPORT_PATH)}`);
  process.exit(report.overall === 'fail' ? 1 : 0);
}

main();
