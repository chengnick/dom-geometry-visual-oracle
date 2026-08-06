// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

// 測本機靜態檔案，避免依賴網路與線上內容變動造成的假陽性
const LOCAL_URL = `file://${path.resolve(__dirname, '..', 'index.html')}`;

test.describe('薈柚 Huì Yòu — 視覺回歸測試（Playwright toHaveScreenshot）', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(LOCAL_URL);
  });

  test('1. 首頁全頁快照應與基準圖一致', async ({ page }) => {
    await expect(page).toHaveScreenshot('homepage-full.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('2. Navbar 區塊快照應與基準圖一致', async ({ page }) => {
    await expect(page.locator('.nav')).toHaveScreenshot('navbar.png');
  });

  test('3. Hero 區塊快照應與基準圖一致', async ({ page }) => {
    await expect(page.locator('.hero')).toHaveScreenshot('hero.png');
  });

  test('4. 精選商品區塊快照應與基準圖一致', async ({ page }) => {
    await expect(page.locator('#products')).toHaveScreenshot('products-section.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

});
