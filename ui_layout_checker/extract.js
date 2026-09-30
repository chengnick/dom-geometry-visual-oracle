// @ts-check
const { STYLE_PROPS } = require('./config');

/**
 * 對每個選定的元素抓 boundingBox（幾何）+ 指定的 computed style（樣式），
 * 回傳 { selector: { x, y, width, height, ...styleProps } } 的扁平物件。
 * 抓不到的元素（例如選擇器打錯或元素不存在）記錄 found:false，不讓整個流程中斷。
 * @param {import('@playwright/test').Page} page
 * @param {string[]} selectors 該站要監看的選擇器
 */
async function extractLayout(page, selectors) {
  const result = {};

  // 等 web font 載完再量：font-display: swap 會先用備援字型排版，太早量會量到備援字型的寬度。
  await page.evaluate(() => document.fonts.ready);

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const count = await locator.count();

    if (count === 0) {
      result[selector] = { found: false };
      continue;
    }

    // found = 選擇器抓得到（在 DOM 裡）；visible = 真的顯示出來（非 display:none / visibility:hidden）
    // 兩者分開：元素還在 DOM 但被隱藏，是最常見的版面壞法，found 抓不到、visible 抓得到。
    const visible = await locator.isVisible();
    const box = await locator.boundingBox();
    const style = await locator.evaluate((el, props) => {
      const computed = getComputedStyle(el);
      const out = {};
      for (const prop of props) out[prop] = computed[prop];
      return out;
    }, STYLE_PROPS);

    result[selector] = {
      found: true,
      visible,
      x: box ? round(box.x) : null,
      y: box ? round(box.y) : null,
      width: box ? round(box.width) : null,
      height: box ? round(box.height) : null,
      ...style,
    };
  }

  return result;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { extractLayout };
