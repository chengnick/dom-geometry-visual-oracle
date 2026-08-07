// @ts-check
// 走訪受測站，三個斷點各匯出一份 baseline JSON（{ meta, elements }）。
// 安全設計：一定要帶 --update-baseline 才會實際覆寫，避免把壞掉的版面靜默寫進基準。
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('@playwright/test');
const { TARGET_URL, SITE, BASELINE_DIR, BREAKPOINTS } = require('./config');
const { extractLayout } = require('./extract');

function currentCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return null; // 尚未 commit / 非 git 環境時不擋流程
  }
}

async function main() {
  if (!process.argv.includes('--update-baseline')) {
    console.error(
      '拒絕覆寫 baseline：capture.js 只會在明確帶 --update-baseline 時寫入。\n' +
        '請先肉眼／視覺回歸確認畫面正確，再執行：\n' +
        '  npm run layout:update      （= node ui_layout_checker/capture.js --update-baseline）'
    );
    process.exit(1);
  }

  fs.mkdirSync(BASELINE_DIR, { recursive: true });
  const commit = currentCommit();
  const browser = await chromium.launch();

  for (const bp of BREAKPOINTS) {
    const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height } });
    await page.goto(TARGET_URL);
    const elements = await extractLayout(page);
    await page.close();

    const doc = {
      meta: {
        site: SITE,
        breakpoint: bp.name,
        viewport: { width: bp.width, height: bp.height },
        commit,
        capturedAt: new Date().toISOString(),
      },
      elements,
    };

    const outPath = path.join(BASELINE_DIR, `${bp.name}.json`);
    fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
    console.log(
      `✓ ${bp.name.padEnd(7)} (${bp.width}×${bp.height}) → ${path.relative(process.cwd(), outPath)}` +
        `（${Object.keys(elements).length} 個元素）`
    );
  }

  await browser.close();
  console.log(`\n基準已更新（commit ${commit || 'N/A'}）。記得把 baselines/ 一起 commit。`);
}

main();
