// @ts-check
const path = require('path');

const TARGET_URL = `file://${path.resolve(__dirname, '..', 'index.html')}`;

// 受測站點代號 → baseline 存在 baselines/<SITE>/<breakpoint>.json
const SITE = 'huiyou';

// baseline 根目錄（版控，單站量小，不會像多品牌那樣爆）
const BASELINE_DIR = path.resolve(__dirname, '..', 'baselines', SITE);

// 三個斷點：手機 / 平板 / 桌機。每個斷點各存一份 baseline。
// 單頁滾動站在不同寬度會 reflow → 製造測試表面積，也逼出 RWD 壞掉時的位移。
const BREAKPOINTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

// 挑選跨區塊、大小不一的關鍵元素，用來驗證容差公式在不同尺寸下是否都合理
const SELECTORS = [
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
];

// 只抓會直接影響「看起來對不對」的樣式屬性，不抓會隨瀏覽器/字型渲染引擎浮動的屬性（例如 letter-spacing 次像素差異）
const STYLE_PROPS = ['fontSize', 'fontWeight', 'color', 'backgroundColor'];

// ── 三級判定的兩條容差線（Pass < warn < fail）──────────────────────
// 容差公式：max(絕對值下限, 相對百分比 * 該元素自身基準尺寸)
//  - 絕對下限吸收次像素渲染雜訊（小元素也不會被誤報）
//  - 相對百分比讓容差隨元素尺寸縮放（大區塊本來就會有更多正常像素浮動）
//
// WARN 線（偵測地板）：位移超過這條才「值得記錄」。< 這條 = Pass（視為抖動忽略）。
const GEOMETRY_TOLERANCE = { minPx: 2, ratio: 0.01 };
// FAIL 線（擋 PR）：位移超過這條 = 版面真的壞了。warn 線與 fail 線之間 = Warn（人工看一眼）。
const GEOMETRY_FAIL_TOLERANCE = { minPx: 8, ratio: 0.05 };

// 字級容差：0.5px 內視為次像素渲染差異
const FONT_SIZE_TOLERANCE_PX = 0.5;

// 各斷點可覆寫 fail 門檻（例如手機允許更大位移）。未列出的斷點沿用全域預設。
// 例：{ mobile: { minPx: 12, ratio: 0.06 } }
const FAIL_TOLERANCE_BY_BREAKPOINT = {};

module.exports = {
  TARGET_URL,
  SITE,
  BASELINE_DIR,
  BREAKPOINTS,
  SELECTORS,
  STYLE_PROPS,
  GEOMETRY_TOLERANCE,
  GEOMETRY_FAIL_TOLERANCE,
  FONT_SIZE_TOLERANCE_PX,
  FAIL_TOLERANCE_BY_BREAKPOINT,
};
