// @ts-check
// 把 compare.js 產生的 report.json 渲染成一頁自包含的 HTML 報告（沿用 oracle 的視覺語言）。
// 可被 compare.js 匯入（renderReportHtml），也可獨立執行：
//   node ui_layout_checker/report-html.js          讀 report.json → 寫 report.html
//   node ui_layout_checker/report-html.js --open    產生後用預設瀏覽器打開
const fs = require('fs');
const path = require('path');

const ICON = { fail: '✗', warn: '△', pass: '✓' };
const LABEL = { fail: 'FAIL', warn: 'WARN', pass: 'PASS' };

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function fmtDiff(d) {
  if ('delta' in d) {
    return `<span class="fld">${esc(d.field)}</span>` +
      `<span class="mv"><span class="from">${esc(d.from)}</span> → <span class="to">${esc(d.to)}</span></span>` +
      `<span class="meas">差 ${esc(d.delta)}px · 容差 ±${esc(d.tolerance)}px</span>`;
  }
  return `<span class="fld">${esc(d.field)}</span>` +
    `<span class="mv"><span class="from">${esc(JSON.stringify(d.from))}</span> → <span class="to">${esc(JSON.stringify(d.to))}</span></span>` +
    `<span class="meas">結構性差異</span>`;
}

function summarize(report) {
  let bp = 0, findings = 0, failD = 0, warnD = 0;
  for (const s of report.sites) {
    for (const b of s.breakpoints) {
      bp++;
      for (const f of b.findings) {
        findings++;
        for (const d of f.diffs) {
          if (d.severity === 'fail') failD++;
          else if (d.severity === 'warn') warnD++;
        }
      }
    }
  }
  return { bp, findings, failD, warnD };
}

function renderReportHtml(report) {
  const sum = summarize(report);
  const when = new Date(report.generatedAt || Date.now()).toLocaleString('sv');

  const sitesHtml = report.sites.map((site) => {
    const bpsHtml = site.breakpoints.map((bp) => {
      const dims = bp.viewport ? `${bp.viewport.width}×${bp.viewport.height}` : '';
      const body = bp.findings.length === 0
        ? `<div class="allclear">${ICON.pass} 全部元素都在容差範圍內</div>`
        : bp.findings.map((f) => `
            <div class="finding v-${f.verdict}">
              <div class="sel">${ICON[f.verdict]} <code>${esc(f.selector)}</code></div>
              <div class="diffs">
                ${f.diffs.map((d) => `<div class="diff sev-${d.severity}"><span class="sev">${LABEL[d.severity]}</span>${fmtDiff(d)}</div>`).join('')}
              </div>
            </div>`).join('');
      return `
        <section class="bp v-${bp.verdict}">
          <div class="bp-head">
            <div class="bp-id"><span class="bp-name">${esc(bp.name)}</span><span class="bp-dims">${dims}</span></div>
            <span class="badge b-${bp.verdict}">${ICON[bp.verdict]} ${LABEL[bp.verdict]}</span>
          </div>
          ${body}
        </section>`;
    }).join('');
    return `
      <div class="site">
        <div class="site-head"><span class="badge b-${site.verdict}">${LABEL[site.verdict]}</span><h2>${esc(site.name)}</h2></div>
        ${bpsHtml}
      </div>`;
  }).join('');

  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>UI Layout Oracle · 報告 · ${LABEL[report.overall]}</title>
<style>
  :root{
    --ground:#EBEEF3;--surface:#fff;--surface-2:#F5F7FA;--ink:#111A24;--ink-2:#47586A;--ink-3:#7A8B9B;
    --line:#D6DEE7;--line-2:#BDC8D4;--accent:#2454E4;
    --pass:#1E8F52;--warn:#A9740A;--fail:#CA3620;
    --pass-bg:#E4F3EA;--warn-bg:#F6ECD6;--fail-bg:#F7E2DC;
    --mono:"SF Mono",ui-monospace,"Cascadia Mono","Roboto Mono",Menlo,Consolas,monospace;
    --sans:system-ui,-apple-system,"Segoe UI",Roboto,"PingFang TC","Microsoft JhengHei",sans-serif;
  }
  @media (prefers-color-scheme:dark){:root{
    --ground:#0B1119;--surface:#121B25;--surface-2:#16212D;--ink:#E7EDF4;--ink-2:#9EAFBF;--ink-3:#66788A;
    --line:#24313F;--line-2:#35485B;--accent:#5E8DFF;
    --pass:#45C07C;--warn:#E2AC42;--fail:#F26A50;--pass-bg:#10241A;--warn-bg:#241D0F;--fail-bg:#2A1512;
  }}
  *{box-sizing:border-box}
  body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--sans);line-height:1.55;-webkit-font-smoothing:antialiased}
  .wrap{max-width:900px;margin:0 auto;padding:0 20px}
  code{font-family:var(--mono)}
  header.top{border-bottom:1px solid var(--line);background:var(--surface)}
  .top .wrap{padding:26px 20px}
  .eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);font-weight:600}
  .headline{display:flex;align-items:center;gap:16px;margin-top:10px;flex-wrap:wrap}
  .verdict-hero{font-family:var(--mono);font-weight:700;font-size:26px;letter-spacing:.02em;padding:8px 18px;border-radius:6px;border:1px solid}
  .verdict-hero.fail{color:var(--fail);background:var(--fail-bg);border-color:var(--fail)}
  .verdict-hero.warn{color:var(--warn);background:var(--warn-bg);border-color:var(--warn)}
  .verdict-hero.pass{color:var(--pass);background:var(--pass-bg);border-color:var(--pass)}
  .headline h1{font-family:var(--mono);font-size:17px;font-weight:600;margin:0;color:var(--ink-2)}
  .meta-row{display:flex;gap:18px;flex-wrap:wrap;margin-top:14px;font-family:var(--mono);font-size:12.5px;color:var(--ink-3)}
  .meta-row b{color:var(--ink)}
  .meta-row .c-fail{color:var(--fail)}.meta-row .c-warn{color:var(--warn)}
  main{padding:26px 0 60px}
  .site-head{display:flex;align-items:center;gap:12px;margin:22px 0 12px}
  .site-head h2{font-family:var(--mono);font-size:18px;margin:0}
  .badge{font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.06em;padding:3px 9px;border-radius:999px;border:1px solid;display:inline-flex;align-items:center;gap:5px}
  .b-fail{color:var(--fail);background:var(--fail-bg);border-color:var(--fail)}
  .b-warn{color:var(--warn);background:var(--warn-bg);border-color:var(--warn)}
  .b-pass{color:var(--pass);background:var(--pass-bg);border-color:var(--pass)}
  .bp{background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:14px 16px;margin-bottom:12px;border-left-width:3px}
  .bp.v-fail{border-left-color:var(--fail)}.bp.v-warn{border-left-color:var(--warn)}.bp.v-pass{border-left-color:var(--pass)}
  .bp-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
  .bp-name{font-family:var(--mono);font-weight:600;font-size:14px}
  .bp-dims{font-family:var(--mono);font-size:12px;color:var(--ink-3);margin-left:8px}
  .allclear{color:var(--pass);font-size:13px;margin-top:10px;font-family:var(--mono)}
  .finding{margin-top:12px;padding-top:12px;border-top:1px dashed var(--line)}
  .sel{font-size:13.5px;margin-bottom:7px}
  .sel code{font-weight:600}
  .diff{display:grid;grid-template-columns:auto 120px 1fr auto;gap:10px;align-items:baseline;padding:4px 0;font-size:12.5px}
  .sev{font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.05em;padding:1px 6px;border-radius:3px;text-align:center}
  .sev-fail .sev{color:#fff;background:var(--fail)}
  .sev-warn .sev{color:#fff;background:var(--warn)}
  .fld{font-family:var(--mono);color:var(--ink-2)}
  .mv{font-family:var(--mono)}
  .from{color:var(--ink-3)}.to{color:var(--ink);font-weight:600}
  .meas{font-family:var(--mono);font-size:11.5px;color:var(--ink-3);text-align:right}
  footer{border-top:1px solid var(--line);padding:20px 0;color:var(--ink-3);font-size:12.5px}
  @media (max-width:640px){.diff{grid-template-columns:auto 1fr;gap:4px 8px}.meas{text-align:left}}
</style>
</head>
<body>
  <header class="top">
    <div class="wrap">
      <div class="eyebrow">UI Layout Oracle · 版面回歸報告</div>
      <div class="headline">
        <span class="verdict-hero ${report.overall}">${LABEL[report.overall]}</span>
        <h1>不靠 pixel-diff、不存截圖 —— 比對 DOM geometry baseline</h1>
      </div>
      <div class="meta-row">
        <span>擷取時間 <b>${esc(when)}</b></span>
        <span>斷點 <b>${sum.bp}</b></span>
        <span>有差異元素 <b>${sum.findings}</b></span>
        <span class="c-fail">fail 差異 <b>${sum.failD}</b></span>
        <span class="c-warn">warn 差異 <b>${sum.warnD}</b></span>
      </div>
    </div>
  </header>
  <main>
    <div class="wrap">
      ${sitesHtml}
    </div>
  </main>
  <footer>
    <div class="wrap">ui_layout_checker · fail 擋 PR（exit 1）· warn 記錄不擋 · pass 視為抖動忽略</div>
  </footer>
</body>
</html>
`;
}

function writeReportHtml(report, outPath) {
  fs.writeFileSync(outPath, renderReportHtml(report));
  return outPath;
}

module.exports = { renderReportHtml, writeReportHtml };

// ── 獨立執行：讀 report.json → 寫 report.html（--open 可順便打開）──
if (require.main === module) {
  const jsonPath = path.resolve(__dirname, 'report.json');
  const htmlPath = path.resolve(__dirname, 'report.html');
  if (!fs.existsSync(jsonPath)) {
    console.error(`找不到 ${jsonPath}，請先執行：npm run layout:compare`);
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  writeReportHtml(report, htmlPath);
  console.log(`報告已產生：${path.relative(process.cwd(), htmlPath)}`);

  if (process.argv.includes('--open')) {
    const { exec } = require('child_process');
    const cmd = process.platform === 'win32' ? `start "" "${htmlPath}"`
      : process.platform === 'darwin' ? `open "${htmlPath}"`
      : `xdg-open "${htmlPath}"`;
    exec(cmd, () => {});
  }
}
