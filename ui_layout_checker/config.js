// @ts-check
const path = require('path');

// ── 共用預設（跨站點）────────────────────────────────────────────
// 三個斷點：手機 / 平板 / 桌機。單頁滾動站在不同寬度會 reflow → 製造測試表面積。
const BREAKPOINTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

// 只抓會直接影響「看起來對不對」的樣式屬性，不抓會隨瀏覽器/字型渲染引擎浮動的屬性
const STYLE_PROPS = ['fontSize', 'fontWeight', 'color', 'backgroundColor'];

// ── 三級判定的兩條容差線（Pass < warn < fail）──────────────────────
// 容差公式：max(絕對值下限, 相對百分比 * 該元素自身基準尺寸)
//  - 絕對下限吸收次像素渲染雜訊（小元素也不會被誤報）
//  - 相對百分比讓容差隨元素尺寸縮放（大區塊本來就會有更多正常像素浮動）
//
// WARN 線（偵測地板）：位移超過這條才「值得記錄」。< 這條 = Pass（視為抖動忽略）。
const GEOMETRY_TOLERANCE = { minPx: 2, ratio: 0.01 };
// FAIL 線（擋 PR）：位移超過這條 = 版面真的壞了。warn 線與 fail 線之間 = Warn。
const GEOMETRY_FAIL_TOLERANCE = { minPx: 8, ratio: 0.05 };
// 字級容差：0.5px 內視為次像素渲染差異
const FONT_SIZE_TOLERANCE_PX = 0.5;

// baseline 根目錄；每個站點存在 baselines/<site>/<breakpoint>.json
const BASELINE_ROOT = path.resolve(__dirname, '..', 'baselines');

// ── 站點註冊表（要接新站，加一筆就好）────────────────────────────
// 每個站點：
//   name        baseline 目錄名，也寫進 meta
//   url         受測頁面（file:// 靜態檔 或 http:// dev server）
//   selectors   要監看的關鍵元素
//   breakpoints (選填) 覆寫該站的斷點，預設沿用 BREAKPOINTS
//   failToleranceByBreakpoint (選填) 各斷點覆寫 fail 門檻，例如手機允許更大位移
const SITES = [
  {
    name: 'huiyou',
    url: `file://${path.resolve(__dirname, '..', 'index.html')}`,
    selectors: [
      '.nav',
      '.logo',
      '.hero h1',
      '.hero-img',
      '#story .swatch',
      '#ingredients .ing-card:nth-child(1)',
      '#sustain .swatch',
      '.prod-tabs',
      '.prod-card:nth-child(1)',
      '.contact-container',
      'footer',
    ],
    failToleranceByBreakpoint: {},
  },
  // 之後接 Sticker Studio Pro：
  // {
  //   name: 'sticker-studio',
  //   url: 'http://localhost:5173',        // Vite dev server
  //   selectors: ['header', '.canvas', '.grid-overlay', '.export-btn', ...],
  // },
];

// 該站的有效斷點（站點自訂優先，否則用共用預設）
function breakpointsFor(site) {
  return site.breakpoints || BREAKPOINTS;
}

// 該站的 baseline 目錄
function baselineDir(siteName) {
  return path.join(BASELINE_ROOT, siteName);
}

module.exports = {
  BREAKPOINTS,
  STYLE_PROPS,
  GEOMETRY_TOLERANCE,
  GEOMETRY_FAIL_TOLERANCE,
  FONT_SIZE_TOLERANCE_PX,
  BASELINE_ROOT,
  SITES,
  breakpointsFor,
  baselineDir,
};
