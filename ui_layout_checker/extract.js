// @ts-check
const { SELECTORS, STYLE_PROPS } = require('./config');

/**
 * 對每個選定的元素抓 boundingBox（幾何）+ 指定的 computed style（樣式），
 * 回傳 { selector: { x, y, width, height, ...styleProps } } 的扁平物件。
 * 抓不到的元素（例如選擇器打錯或元素不存在）記錄 found:false，不讓整個流程中斷。
 */
async function extractLayout(page) {
  const result = {};

  for (const selector of SELECTORS) {
    const locator = page.locator(selector).first();
    const count = await locator.count();

    if (count === 0) {
      result[selector] = { found: false };
      continue;
    }

    const box = await locator.boundingBox();
    const style = await locator.evaluate((el, props) => {
      const computed = getComputedStyle(el);
      const out = {};
      for (const prop of props) out[prop] = computed[prop];
      return out;
    }, STYLE_PROPS);

    result[selector] = {
      found: true,
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
