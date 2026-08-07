# UI_Test — 跑在 CI 裡的單站視覺回歸 Oracle

> 用 DOM geometry 當 baseline、跑在 CI 裡的單站視覺回歸 oracle：每個 PR 自動判斷版面有沒有壞，**不靠 pixel-diff、不存截圖**。

以「薈柚 Huì Yòu」品牌手工皂靜態網站為受測對象，示範一套**分層的 UI 測試策略**，並在撞到業界標準工具（截圖式視覺回歸）的限制後，自行設計了更適合 CI 的替代方案，最後連自製工具本身都補上單元測試。

**核心敘事：先用現成工具撞到痛點 → 自己做一個更合適的工具解掉它 → 連自製工具都補上單元測試 → 掛進 CI 變成 PR 的守門員。**

---

## 架構一圖

```
   擷取 Capture              比對 Diff                 判定 Verdict
┌──────────────────┐    ┌────────────────────┐    ┌──────────────────┐
│ Playwright 走訪   │    │ 當前 geometry       │    │ 三級判定          │
│ 三個斷點          │ →  │   vs                │ →  │ pass / warn / fail│
│ 匯出 DOM geometry │    │ baseline geometry   │    │ fail → exit 1     │
│ (含 visible/樣式) │    │ (逐選擇器逐欄位)     │    │ → CI 紅燈         │
└──────────────────┘    └────────────────────┘    └──────────────────┘
        │                                                    │
        └──── baselines/huiyou/{mobile,tablet,desktop}.json ─┘
              版控、量小（KB 級）、更新須明確 --update-baseline
```

---

## UI 測試的三個層次（別混為一談）

| 層次 | 問的問題 | 本專案的實作 | 工具 |
|---|---|---|---|
| **1. 功能性 E2E** | 點得到、走得通嗎？ | `tests/smoke.spec.js` | Playwright |
| **2. 視覺回歸** | 畫面長得跟基準一樣嗎？ | `tests/visual.spec.js` | Playwright `toHaveScreenshot()` |
| **3. 版面幾何驗證** | 元素的座標/尺寸/樣式跑掉了嗎？ | `ui_layout_checker/` | 自製 oracle（抓 DOM 幾何存 JSON） |

---

## Step 1 — 視覺回歸（用內建工具，並撞到它的極限）

`tests/visual.spec.js` 用 Playwright 內建的 `toHaveScreenshot()`，對首頁全頁 / Navbar / Hero / 商品區塊四個區塊截圖比對，跨 chromium + firefox + webkit 三個引擎，共 12 個測試。

**撞到的痛點（正是 Step 2 的動機）**：
- **儲存成本高**：3 引擎 × 4 區塊的基準圖就達 **6.3 MB**，單張全頁截圖 1.3~1.5 MB。多頁面／多斷點下會線性爆炸。
- **容差難調**：全頁快照因 CSS 背景圖與字型渲染，需加 `maxDiffPixelRatio` 才穩定；小區塊反而不需要。同一套容差不適用所有區塊。
- **只知道「哪裡不一樣」，不知道「為什麼」**：diff 圖只標紅像素，不會告訴你根因是字級變了還是元素被推移。

---

## Step 2 — 自製 `ui_layout_checker`（解掉 Step 1 的痛點）

**核心概念**：不存截圖、不比像素，改抓每個關鍵元素的 `boundingBox()`（x/y/width/height）+ `visible` + 關鍵 computed style（字級/字重/顏色/背景色），存成結構化 JSON 當基準，下次重抓比對。

| | Step 1 截圖 | Step 2 JSON |
|---|---|---|
| 體積 | 6.3 MB | **KB 級**（小三個數量級） |
| 比什麼 | 像素 | 版面結構 + 樣式 |
| 對字型渲染差異 | 敏感、易誤報 | 只受容差內波動影響 |
| 回報內容 | 一塊紅色像素 | 具體欄位：`fontSize 24px→40px`、`y 位移 27.2px` |

**容差公式（設計精華）**：`max(絕對下限, 相對百分比 × 元素自身基準尺寸)`
- 絕對下限吸收次像素渲染雜訊，小元素不誤報
- 相對百分比讓容差隨元素尺寸縮放，大區塊本來就有更多正常浮動

---

## Step 3 — 為自製工具補單元測試（測試工具自己也要有測試）

`tests/diff.spec.js` 針對 `diff.js` 的純函數寫了 **26 個單元測試**，涵蓋容差公式邊界、found/visible 狀態、幾何容差邊界、樣式差異、以及三級判定分類。

**兩個刻意的設計決策**：
1. **為可測試性重構**：把純邏輯抽到獨立的 `diff.js`（不含 `launch browser` 副作用），需求反過來逼出更乾淨的架構（純函數與副作用分離）。
2. **變異測試驗證**：把比對邏輯的 `>` 故意改成 `>=`，確認**正好只有那條邊界測試失敗**，證明測試真的守得住邊界。

---

## Step 4 — 從 checker 升級成 CI Oracle（本次重點）

把「能在本地跑的 checker」變成「跑在 PR 上的守門員」，做了三件事：

### ① 多斷點擷取
三個斷點各存一份 baseline：`mobile (375)` / `tablet (768)` / `desktop (1280)`。單頁滾動站在不同寬度會 reflow，製造測試表面積，也讓 RWD 壞掉時的位移抓得到。baseline 結構為 `{ meta, elements }`，`meta` 記錄 commit sha、viewport、擷取時間。

### ② 三級判定（避免 sub-pixel 抖動就 fail）
兩條容差線，把差異分三級：

| 判定 | 條件 | 動作 |
|---|---|---|
| **Fail** | 幾何位移 > fail 線（預設 8px 或 5%）／ 元素消失（found 翻轉）／ `visible` 翻轉 ／ 樣式改變 | **擋 PR**（exit 1，CI 紅燈） |
| **Warn** | 幾何位移落在 warn 線與 fail 線之間（2~8px） | 記錄不擋，人工看一眼 |
| **Pass** | 幾何位移 < warn 線（2px） | 視為抖動忽略 |

容差寫在 config，且 fail 線可**各斷點覆寫**（例如手機允許更大位移）。

> **活實例**：把 `.logo` 字級從 24px 改成 40px，oracle 三斷點全 FAIL——`.logo` 本體（fontSize/width/height）判 fail，nav 變高把整頁往下推 27.2px，於是 `.hero h1`／`.hero-img`（容差緊）判 fail，頁面更下方的 swatch（容差鬆）**同樣 27.2px 位移卻降級為 warn**。同一個物理位移在不同位置得到不同判定，正是相對容差設計的價值。

### ③ 掛進 CI
`.github/workflows/ui-layout-check.yml` 在 PR 觸發：`npm ci` → 單元測試 → `layout:compare`。總判定 fail 時 job 紅燈；`report.json` 上傳為 artifact，並把分級摘要貼成 PR comment（同一條更新不洗版）。

---

## 指令

```bash
npm install                 # 首次執行前（含 npx playwright install）

npm run test:unit           # diff.js 純邏輯單元測試（不開瀏覽器，最快）
npm run test:visual         # 視覺回歸（三引擎截圖比對）
npm run layout:compare      # oracle：擷取三斷點 → 比對 → 三級判定報告，fail 時 exit 1
npm run layout:update       # 重抓 baseline（= capture.js --update-baseline）

npx playwright show-report  # 視覺化截圖比對報告
```

> `layout:update` 會無條件把「當下畫面」存成新基準。務必先肉眼／視覺回歸確認畫面正確再執行，否則會把壞掉的版面存成基準。

---

## 已知限制 / 後續

- **跨 OS 字型度量**：DOM geometry 含字型度量，跨作業系統渲染有 px 級差異。目前靠「CI runner 釘 `windows-latest`、對齊 baseline 擷取環境」規避；更 scalable 的做法是把擷取與比對都釘在 Playwright 官方 Linux 容器，讓 dev 與 CI 用同一渲染環境。
- **抓不到的壞法**：不比像素 → 抓不到 bounding box 不變的視覺壞法（元素重疊、破圖、對比度不足、陰影/圓角跑掉）。字級與顏色因為有抓 computed style，仍在守備範圍內。
- **第二個受測對象**：Sticker Studio Pro（Vite+React+TS，動態 UI）尚未接上，接上後可驗證動態 UI 也 hold 得住。

---

## 一句話總結（履歷用）

> 用 DOM geometry 當 baseline、跑在 CI 裡的單站視覺回歸 oracle：發現截圖式視覺回歸在多斷點下會遇到儲存爆炸與渲染誤報，於是改比 DOM 結構化幾何資料（體積小三個數量級、比結構不比像素），設計三級容差判定避免 sub-pixel 誤報，並為比對核心補上單元測試與變異測試驗證，最後掛進 PR CI 當版面守門員。
