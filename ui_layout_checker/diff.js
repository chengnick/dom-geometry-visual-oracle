// @ts-check
// 純比對邏輯：不開瀏覽器、不讀寫檔案，方便被單元測試直接呼叫。
const { GEOMETRY_TOLERANCE, GEOMETRY_FAIL_TOLERANCE, FONT_SIZE_TOLERANCE_PX } = require('./config');

const GEOMETRY_FIELDS = ['x', 'y', 'width', 'height'];

function round(n) {
  return Math.round(n * 100) / 100;
}

// 通用容差公式：max(絕對值下限, 相對百分比 * 該元素自身基準尺寸)
function toleranceFor(baselineValue, { minPx, ratio }) {
  return Math.max(minPx, ratio * Math.abs(baselineValue));
}

// WARN 線（偵測地板）：diffSelector 用它決定「有沒有值得回報的差異」
function geometryTolerance(baselineValue) {
  return toleranceFor(baselineValue, GEOMETRY_TOLERANCE);
}

// FAIL 線（擋 PR）：分類器用它把已回報的位移分成 warn / fail
function geometryFailTolerance(baselineValue, override) {
  return toleranceFor(baselineValue, override || GEOMETRY_FAIL_TOLERANCE);
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

// ── 三級判定：把 diffSelector 回報的每筆差異分成 warn / fail ──────────────
// 幾何位移：warn 線 < 位移 <= fail 線 → warn；> fail 線 → fail。
// 結構性差異（found 消失/出現、visible 翻轉、樣式改變）→ 一律 fail。
function severityOfDiff(diff, failTolerance) {
  if ('delta' in diff) {
    const failTol = geometryFailTolerance(diff.from, failTolerance);
    return Math.abs(diff.to - diff.from) > failTol ? 'fail' : 'warn';
  }
  return 'fail';
}

// 對一組差異做整體判定：任一 fail → fail；否則有 warn → warn；全無 → pass。
// failTolerance 可傳入該斷點的覆寫值（見 config.FAIL_TOLERANCE_BY_BREAKPOINT）。
function classifyDiffs(diffs, failTolerance) {
  const graded = diffs.map((d) => ({ ...d, severity: severityOfDiff(d, failTolerance) }));
  let verdict = 'pass';
  if (graded.some((d) => d.severity === 'fail')) verdict = 'fail';
  else if (graded.some((d) => d.severity === 'warn')) verdict = 'warn';
  return { verdict, graded };
}

module.exports = {
  GEOMETRY_FIELDS,
  round,
  geometryTolerance,
  geometryFailTolerance,
  diffSelector,
  severityOfDiff,
  classifyDiffs,
};
