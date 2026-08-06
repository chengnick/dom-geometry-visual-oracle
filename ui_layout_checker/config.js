// @ts-check
const path = require('path');

const TARGET_URL = `file://${path.resolve(__dirname, '..', 'index.html')}`;

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

// 容差公式：max(絕對值下限, 相對百分比 * 該元素自身基準尺寸)
// - 絕對下限吸收次像素渲染雜訊（小元素也不會被誤報）
// - 相對百分比讓容差隨元素尺寸縮放（大區塊本來就會有更多正常像素浮動）
const GEOMETRY_TOLERANCE = { minPx: 2, ratio: 0.01 };
const FONT_SIZE_TOLERANCE_PX = 0.5;

module.exports = { TARGET_URL, SELECTORS, STYLE_PROPS, GEOMETRY_TOLERANCE, FONT_SIZE_TOLERANCE_PX };
