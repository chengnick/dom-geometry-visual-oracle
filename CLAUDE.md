# CLAUDE.md

給在這個 repo 工作的 AI/協作者的快速指南。

## 這是什麼

**跑在 CI 裡的單站視覺回歸 oracle**：每個 PR 自動判斷薈柚（Huì Yòu）靜態站的版面有沒有壞。
核心取捨：**不靠 pixel-diff、不存截圖**，改比對 DOM geometry baseline（體積小三個數量級、比結構不比像素）。

## 架構（三個階段）

```
擷取 Capture            比對 Diff                判定 Verdict
Playwright 走訪頁面   →  當前 geometry           →  三級判定
三個斷點各一份 JSON      vs baseline geometry       pass / warn / fail
匯出 DOM geometry                                   fail → exit 1（CI 紅燈）
```

## 檔案地圖

- `ui_layout_checker/config.js` — **站點 registry `SITES`**、斷點、樣式屬性、**兩條容差線**（warn / fail）
- `ui_layout_checker/extract.js` — 共用擷取 `extractLayout(page, selectors)`（boundingBox + computed style + `visible`）
- `ui_layout_checker/diff.js` — **純比對邏輯**（不開瀏覽器、不讀檔）：`diffSelector` + 三級判定 `classifyDiffs`
- `ui_layout_checker/capture.js` — 產生/更新 baseline（**須帶 `--update-baseline`**，可 `--site=`）
- `ui_layout_checker/compare.js` — 走訪 → 比對 → 判定 → 印報告 + `report.json` + `report.html`（可 `--site=`）
- `ui_layout_checker/report-html.js` — 把 `report.json` 渲染成自包含 HTML 報告（compare 自動呼叫，也可 `--open` 獨立跑）
- `baselines/<site>/{mobile,tablet,desktop}.json` — 版控的 baseline（`{ meta, elements }`）
- `tests/diff.spec.js` — diff.js 純邏輯的 26 個單元測試
- `.github/workflows/ui-layout-check.yml` — PR 觸發的 oracle

## 接一個新受測站

在 `config.js` 的 `SITES` 加一筆 `{ name, url, selectors }`（`url` 可 `file://` 或 `http://` dev server），
然後 `npm run layout:update -- --site=<name>` 產 baseline、commit。擷取/比對/CI 自動涵蓋。

## 常用指令

```bash
npm run test:unit       # diff.js 純邏輯單元測試（最快，不開瀏覽器）
npm run layout:compare  # 比對所有站點版面，印三級報告 + 產 report.json/report.html，fail → exit 1
npm run layout:report   # 把上次比對結果轉 HTML 報告並打開
npm run layout:update   # 重抓所有站點 baseline（= capture.js --update-baseline）
# 單站：加 --site=<name>（compare 直接加；update 用 -- --site=<name>）
```

## 改動時的規矩

- **`diff.js` 的 `diffSelector` / `geometryTolerance` 是受測核心**：改它前先看 `tests/diff.spec.js`，26 個測試必須全綠。
- **容差是兩條線**：`GEOMETRY_TOLERANCE`（warn 偵測地板 2px/1%）與 `GEOMETRY_FAIL_TOLERANCE`（fail 線 8px/5%）。三級判定 = pass(<warn) / warn(warn~fail) / fail(>fail)。結構性差異（found/visible/樣式）一律 fail。
- **baseline 是明確動作**：只有 `--update-baseline` 會覆寫。務必先肉眼／視覺回歸確認畫面正確再更新，否則會把壞版面寫進基準。
- **跨 OS 字型度量**：baseline 在 Windows 擷取，CI runner 也釘 `windows-latest`。換擷取環境時要一起換，否則會假性 fail。

## 已知限制 / 後續

- 跨 OS 渲染差異靠「runner 對齊擷取環境」規避；更 scalable 是釘 Playwright 官方 Linux 容器，讓 dev 與 CI 用同一渲染環境。
- 第二個受測對象 Sticker Studio Pro（動態 UI）尚未接上。
