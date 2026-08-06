// @ts-check
// 純比對邏輯：不開瀏覽器、不讀寫檔案，方便被單元測試直接呼叫。
const { GEOMETRY_TOLERANCE, FONT_SIZE_TOLERANCE_PX } = require('./config');

const GEOMETRY_FIELDS = ['x', 'y', 'width', 'height'];

function round(n) {
  return Math.round(n * 100) / 100;
}

// 容差公式：max(絕對值下限, 相對百分比 * 該元素自身基準尺寸)
function geometryTolerance(baselineValue) {
  return Math.max(GEOMETRY_TOLERANCE.minPx, GEOMETRY_TOLERANCE.ratio * Math.abs(baselineValue));
}

/** 回傳一個選擇器上所有欄位的差異清單；沒有差異回傳空陣列 */
function diffSelector(baseline, current) {
  const diffs = [];

  if (!baseline.found || !current.found) {
    if (baseline.found !== current.found) {
      diffs.push({ field: 'found', from: baseline.found, to: current.found });
    }
    return diffs;
  }

  for (const field of GEOMETRY_FIELDS) {
    const from = baseline[field];
    const to = current[field];
    const tolerance = geometryTolerance(from);
    if (Math.abs(to - from) > tolerance) {
      diffs.push({ field, from, to, delta: round(to - from), tolerance: round(tolerance) });
    }
  }

  for (const field of Object.keys(current)) {
    if (GEOMETRY_FIELDS.includes(field) || field === 'found') continue;
    const from = baseline[field];
    const to = current[field];
    if (field === 'fontSize') {
      const fromPx = parseFloat(from);
      const toPx = parseFloat(to);
      if (Math.abs(toPx - fromPx) > FONT_SIZE_TOLERANCE_PX) {
        diffs.push({ field, from, to });
      }
    } else if (from !== to) {
      diffs.push({ field, from, to });
    }
  }

  return diffs;
}

module.exports = { GEOMETRY_FIELDS, round, geometryTolerance, diffSelector };
