// @ts-check
// 走訪每個站點 × 每個斷點，各自與 baseline 比對，套三級判定，印出報告。
// 退出碼：任一站點任一斷點判定 fail → exit 1（讓 CI 紅燈）；只有 warn / pass → exit 0。
// 可選 --site=<name> 只比對單一站點。
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const { SITES, breakpointsFor, baselineDir } = require('./config');
const { extractLayout } = require('./extract');
const { diffSelector, classifyDiffs } = require('./diff');
const { writeReportHtml } = require('./report-html');

const REPORT_PATH = path.resolve(__dirname, 'report.json');
const REPORT_HTML_PATH = path.resolve(__dirname, 'report.html');
const ICON = { fail: '✗', warn: '△', pass: '✓' };

function siteFilter() {
  const arg = process.argv.find((a) => a.startsWith('--site='));
  return arg ? arg.slice('--site='.length) : null;
}

function loadBaseline(siteName, bpName) {
  const p = path.join(baselineDir(siteName), `${bpName}.json`);
  if (!fs.existsSync(p)) {
    console.error(`找不到 ${siteName}/${bpName} 的基準檔：${p}\n請先執行：npm run layout:update`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function worse(a, b) {
  const rank = { pass: 0, warn: 1, fail: 2 };
  return rank[b] > rank[a] ? b : a;
}

function fmtDiff(d) {
  if ('delta' in d) {
    return `${d.field}: ${d.from} → ${d.to}（差 ${d.delta}px，容差 ±${d.tolerance}px）`;
  }
  return `${d.field}: ${JSON.stringify(d.from)} → ${JSON.stringify(d.to)}`;
}

async function main() {
  const only = siteFilter();
  const sites = only ? SITES.filter((s) => s.name === only) : SITES;
  if (sites.length === 0) {
    console.error(`找不到站點：${only}。可用站點：${SITES.map((s) => s.name).join(', ')}`);
    process.exit(1);
  }

  const browser = await chromium.launch();
  const report = { generatedAt: new Date().toISOString(), overall: 'pass', sites: [] };

  for (const site of sites) {
    console.log(`\n▸ ${site.name}`);
    const siteReport = { name: site.name, verdict: 'pass', breakpoints: [] };

    for (const bp of breakpointsFor(site)) {
      const baseline = loadBaseline(site.name, bp.name);
      const failOverride = (site.failToleranceByBreakpoint || {})[bp.name];

      const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height } });
      await page.goto(site.url);
      const current = await extractLayout(page, site.selectors);
      await page.close();

      const findings = [];
      let bpVerdict = 'pass';
      for (const selector of Object.keys(baseline.elements)) {
        const diffs = diffSelector(baseline.elements[selector], current[selector] || { found: false });
        if (diffs.length === 0) continue;
        const { verdict, graded } = classifyDiffs(diffs, failOverride);
        findings.push({ selector, verdict, diffs: graded });
        bpVerdict = worse(bpVerdict, verdict);
      }

      siteReport.breakpoints.push({ name: bp.name, viewport: { width: bp.width, height: bp.height }, verdict: bpVerdict, findings });
      siteReport.verdict = worse(siteReport.verdict, bpVerdict);

      console.log(`  ${ICON[bpVerdict]} [${bp.name}] ${bp.width}×${bp.height} — ${bpVerdict.toUpperCase()}`);
      for (const f of findings) {
        console.log(`      ${ICON[f.verdict]} ${f.selector}`);
        for (const d of f.diffs) console.log(`          · [${d.severity}] ${fmtDiff(d)}`);
      }
      if (findings.length === 0) console.log(`      （${Object.keys(baseline.elements).length} 個元素全部在容差內）`);
    }

    report.sites.push(siteReport);
    report.overall = worse(report.overall, siteReport.verdict);
  }

  await browser.close();
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
  writeReportHtml(report, REPORT_HTML_PATH);

  console.log(`\n──────── 總判定：${report.overall.toUpperCase()} ────────`);
  console.log(`報告已寫入 ${path.relative(process.cwd(), REPORT_PATH)}`);
  console.log(`HTML 報告 ${path.relative(process.cwd(), REPORT_HTML_PATH)}（用瀏覽器打開，或 npm run layout:report）`);
  process.exit(report.overall === 'fail' ? 1 : 0);
}

main();
