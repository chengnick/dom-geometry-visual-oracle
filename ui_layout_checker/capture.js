// @ts-check
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const { TARGET_URL } = require('./config');
const { extractLayout } = require('./extract');

const BASELINE_PATH = path.resolve(__dirname, 'baseline.json');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(TARGET_URL);

  const layout = await extractLayout(page);
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(layout, null, 2) + '\n');

  await browser.close();

  const size = fs.statSync(BASELINE_PATH).size;
  console.log(`基準已寫入 ${BASELINE_PATH}（${size} bytes，${Object.keys(layout).length} 個元素）`);
}

main();
