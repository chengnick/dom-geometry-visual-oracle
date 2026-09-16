// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

// 測本機靜態檔案，讓 portfolio demo 不依賴外部部署或網路狀態。
const LOCAL_URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

test.describe('薈柚 Huì Yòu — Phase 1 煙霧測試', () => {

    // 每次測試前先導覽至目標網頁
    test.beforeEach(async ({ page }) => {
        await page.goto(LOCAL_URL);
    });

    test('1. 網頁應載入成功且包含正確的 SEO Meta 資訊', async ({ page }) => {
        // 驗證網頁 Title
        await expect(page).toHaveTitle(/薈柚 Huì Yòu/);

        // 驗證 Meta Description 是否存在（基本 SEO 檢查）
        const description = page.locator('meta[name="description"]');
        await expect(description).toHaveAttribute('content', /天然冷製手工皂|薈柚/);
    });

    test('2. 關鍵形象與產品區塊必須存在於頁面中', async ({ page }) => {
        // 驗證 Navbar 品牌名稱
        const logo = page.locator('.nav .logo');
        await expect(logo).toHaveText('薈柚 Huì Yòu');

        // 驗證核心錨點區塊是否存在
        await expect(page.locator('#story')).toBeVisible();
        await expect(page.locator('#ingredients')).toBeVisible();
        await expect(page.locator('#sustain')).toBeVisible();
        await expect(page.locator('#products')).toBeVisible();
        await expect(page.locator('#contact')).toBeVisible();
    });

    test('3. 商品卡片與所有 CTA 導流按鈕必須綁定正確的 LINE 連結', async ({ page }) => {
        // 驗證商品卡片是否成功載入（至少要有 4 款以上）
        const productCards = page.locator('.prod-card');
        const count = await productCards.count();
        expect(count).toBeGreaterThanOrEqual(4);

        // 抓取頁面上所有的 LINE 詢問/加好友按鈕
        const lineButtons = page.locator('a[href*="line.me"]');
        const btnCount = await lineButtons.count();

        // 確保頁面上至少有設定好的 LINE 導流點
        expect(btnCount).toBeGreaterThan(0);

        // 驗證所有 LINE 按鈕是否都設定了在新分頁開啟，以優化使用者體驗
        for (let i = 0; i < btnCount; i++) {
            await expect(lineButtons.nth(i)).toHaveAttribute('target', '_blank');
            await expect(lineButtons.nth(i)).toHaveAttribute('rel', 'noopener noreferrer');
        }
    });

    test('4. 商品分類過濾功能應正確切換顯示', async ({ page }) => {
        const allCards = page.locator('.prod-card');
        const totalCount = await allCards.count();

        // 點擊「經典柚香」分類
        await page.getByRole('button', { name: '經典柚香' }).click();

        // 可見卡片至少一張,且必須全部屬於該分類
        const visibleCards = page.locator('.prod-card:not(.hide)');
        const visibleCount = await visibleCards.count();
        expect(visibleCount).toBeGreaterThan(0);
        expect(visibleCount).toBeLessThan(totalCount);
        for (let i = 0; i < visibleCount; i++) {
            await expect(visibleCards.nth(i)).toHaveAttribute('data-category', 'citrus');
        }

        // active 樣式應跟著切換到被點擊的分類
        await expect(page.getByRole('button', { name: '經典柚香' })).toHaveClass(/active/);

        // 切回「全部商品」應恢復顯示所有卡片
        await page.getByRole('button', { name: '全部商品' }).click();
        await expect(page.locator('.prod-card:not(.hide)')).toHaveCount(totalCount);
    });

    // 素材到位前先標記 fixme:LINE 官方帳號確認並取代佔位符後,移除 .fixme 讓它正式生效
    test.fixme('5. LINE 連結不得殘留佔位 ID(@YOUR_LINE_ID)', async ({ page }) => {
        const lineButtons = page.locator('a[href*="line.me"]');
        const btnCount = await lineButtons.count();
        expect(btnCount).toBeGreaterThan(0);
        for (let i = 0; i < btnCount; i++) {
            const href = await lineButtons.nth(i).getAttribute('href');
            expect(href).not.toContain('YOUR_LINE_ID');
        }
    });

});

test.describe('薈柚 Huì Yòu — 手機版行動裝置相容性檢測', () => {

    // 設定視窗尺寸為標準 iPhone 規格 (375px 寬度)
    test.use({ viewport: { width: 375, height: 667 } });

    test('6. 在 375px 寬度下，網頁應完美響應不破版', async ({ page }) => {
        await page.goto(LOCAL_URL);

        // 檢查 Navbar 在手機版是否正常顯示
        const logo = page.locator('.nav .logo');
        await expect(logo).toBeVisible();

        // 檢查商品分類標籤區塊在手機版是否可見
        const tabs = page.locator('.prod-tabs');
        await expect(tabs).toBeVisible();

        // 自動自動化幾何比對（確保頁面寬度沒有產生水平 X 軸捲軸，防範破版溢出）
        const hasHorizontalScroll = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasHorizontalScroll).toBe(false);
    });

});

