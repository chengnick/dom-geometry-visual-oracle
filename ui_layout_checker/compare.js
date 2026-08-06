// @ts-check
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const { TARGET_URL } = require('./config');
const { extractLayout } = require('./extract');
const { diffSelector } = require('./diff');

const BASELINE_PATH = path.resolve(__dirname, 'baseline.json');

async function main() {
  if (!fs.existsSync(BASELINE_PATH)) {
    console.error(`找不到基準檔：${BASELINE_PATH}，請先執行 capture.js`);
    process.exit(1);
  }
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8'));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(TARGET_URL);
  const current = await extractLayout(page);
  await browser.close();

  let hasDrift = false;
  for (const selector of Object.keys(baseline)) {
    const diffs = diffSelector(baseline[selector], current[selector] || { found: false });
    if (diffs.length === 0) continue;

    hasDrift = true;
    console.log(`\n✗ ${selector}`);
    for (const d of diffs) {
      if ('delta' in d) {
        console.log(`  - ${d.field}: ${d.from} → ${d.to}（差 ${d.delta}px，容差 ±${d.tolerance}px）`);
      } else {
        console.log(`  - ${d.field}: ${JSON.stringify(d.from)} → ${JSON.stringify(d.to)}`);
      }
    }
  }

  if (!hasDrift) {
    console.log(`✓ 所有 ${Object.keys(baseline).length} 個元素的版面與樣式都在容差範圍內`);
    process.exit(0);
  } else {
    console.log('\n偵測到版面/樣式跑掉，見上方細節。');
    process.exit(1);
  }
}

main();
