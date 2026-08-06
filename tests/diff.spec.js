// @ts-check
// ui_layout_checker 純比對邏輯的單元測試（不開瀏覽器、不讀檔）。
const { test, expect } = require('@playwright/test');
const { geometryTolerance, diffSelector } = require('../ui_layout_checker/diff');
const { GEOMETRY_TOLERANCE, FONT_SIZE_TOLERANCE_PX } = require('../ui_layout_checker/config');

// 建立一個「完整、無差異」的基準元素，測試時只覆寫要驗證的欄位
function makeEl(overrides = {}) {
  return {
    found: true,
    x: 100,
    y: 200,
    width: 300,
    height: 80,
    fontSize: '16px',
    fontWeight: '400',
    color: 'rgb(0, 0, 0)',
    backgroundColor: 'rgba(0, 0, 0, 0)',
    ...overrides,
  };
}

test.describe('geometryTolerance() — 容差公式', () => {

  test('小元素：相對百分比算出的值低於下限時，改用絕對下限', () => {
    // ratio(0.01) * 50 = 0.5 < minPx(2) → 取 minPx
    expect(geometryTolerance(50)).toBe(GEOMETRY_TOLERANCE.minPx);
  });

  test('大元素：相對百分比超過下限時，容差隨尺寸放大', () => {
    // ratio(0.01) * 1000 = 10 > minPx(2) → 取 10
    expect(geometryTolerance(1000)).toBe(GEOMETRY_TOLERANCE.ratio * 1000);
  });

  test('交界點：相對值恰好等於下限', () => {
    const crossover = GEOMETRY_TOLERANCE.minPx / GEOMETRY_TOLERANCE.ratio; // 200
    expect(geometryTolerance(crossover)).toBe(GEOMETRY_TOLERANCE.minPx);
  });

  test('負座標：以絕對值計算，不會因負號算出負容差', () => {
    expect(geometryTolerance(-1000)).toBe(GEOMETRY_TOLERANCE.ratio * 1000);
  });

});

test.describe('diffSelector() — found 狀態', () => {

  test('兩邊皆存在且相同 → 無差異', () => {
    expect(diffSelector(makeEl(), makeEl())).toEqual([]);
  });

  test('基準存在、當前消失 → 回報 found 差異', () => {
    const diffs = diffSelector(makeEl(), { found: false });
    expect(diffs).toEqual([{ field: 'found', from: true, to: false }]);
  });

  test('兩邊皆不存在 → 無差異（不誤報）', () => {
    expect(diffSelector({ found: false }, { found: false })).toEqual([]);
  });

});

test.describe('diffSelector() — 幾何差異與容差邊界', () => {

  test('位移在容差內 → 不回報', () => {
    // width=300 → 容差 = 0.01*300 = 3px；位移 2.5px 應被吸收
    const diffs = diffSelector(makeEl(), makeEl({ width: 302.5 }));
    expect(diffs).toEqual([]);
  });

  test('位移剛好等於容差 → 不回報（用 > 而非 >=）', () => {
    // width=300 → 容差 3px；位移剛好 3px 不算超出
    const diffs = diffSelector(makeEl(), makeEl({ width: 303 }));
    expect(diffs).toEqual([]);
  });

  test('位移略微超過容差 → 回報，並附上 delta 與 tolerance', () => {
    // width=300 → 容差 3px；位移 3.5px 超出
    const diffs = diffSelector(makeEl(), makeEl({ width: 303.5 }));
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toMatchObject({ field: 'width', from: 300, to: 303.5, delta: 3.5, tolerance: 3 });
  });

  test('重現實測邊界案例：小容差元素被 19px 連鎖位移抓到', () => {
    // 模擬 #ingredients 卡片：y 基準大、但位移超過其容差
    const baseline = makeEl({ y: 1889.23, height: 200 });
    const current = makeEl({ y: 1908.44, height: 200 });
    const diffs = diffSelector(baseline, current);
    expect(diffs.map(d => d.field)).toContain('y');
  });

});

test.describe('diffSelector() — 樣式差異', () => {

  test('字級變化在 0.5px 內 → 不回報（吸收次像素渲染差異）', () => {
    const diffs = diffSelector(makeEl({ fontSize: '16px' }), makeEl({ fontSize: '16.3px' }));
    expect(diffs).toEqual([]);
  });

  test('字級變化超過門檻 → 回報', () => {
    const bump = FONT_SIZE_TOLERANCE_PX + 1;
    const diffs = diffSelector(makeEl({ fontSize: '16px' }), makeEl({ fontSize: `${16 + bump}px` }));
    expect(diffs).toEqual([{ field: 'fontSize', from: '16px', to: `${16 + bump}px` }]);
  });

  test('顏色改變 → 精確比對，回報', () => {
    const diffs = diffSelector(makeEl(), makeEl({ color: 'rgb(204, 51, 0)' }));
    expect(diffs).toEqual([{ field: 'color', from: 'rgb(0, 0, 0)', to: 'rgb(204, 51, 0)' }]);
  });

  test('多欄位同時改變 → 全部回報', () => {
    const diffs = diffSelector(makeEl(), makeEl({ height: 120, fontSize: '24px', color: 'rgb(1, 2, 3)' }));
    const fields = diffs.map(d => d.field).sort();
    expect(fields).toEqual(['color', 'fontSize', 'height']);
  });

});
