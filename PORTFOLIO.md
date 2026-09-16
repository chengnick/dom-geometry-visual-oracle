# UI_Test Portfolio Brief

## 1. Project Title

UI Layout Regression Oracle with Playwright and DOM Geometry Baselines

## 2. One-line Summary

A Playwright-based UI regression demo that checks layout changes across mobile, tablet, and desktop breakpoints by comparing DOM geometry baselines, not only screenshot pixel diffs.

## 3. Problem

UI regression testing is often difficult to triage when the only signal is a screenshot diff. A screenshot can show that pixels changed, but it does not always explain whether the root cause is a shifted section, a resized element, a changed font size, or a missing component.

For a QA / SDET workflow, I wanted a demo that answers a narrower but useful question:

> Did an important UI element move, resize, disappear, become hidden, or change key style in a way that should be reviewed or block a pull request?

The test target is a static product landing page. I use it as a realistic surface for UI regression testing without exposing any company system or private data.

## 4. Why Screenshot Diff Was Not Enough

Screenshot diff is still useful, and this project keeps Playwright screenshot checks as one layer. But screenshot-only visual regression has practical limitations:

- It can be noisy across browsers, operating systems, fonts, and rendering engines.
- It shows changed pixels, but not always the changed layout property.
- Full-page and component screenshots can grow quickly in repository size.
- CI reviewers may need to open image artifacts to understand what happened.
- Small anti-aliasing or rendering differences can distract from actual layout regressions.

This is why I added a second signal: structured DOM geometry and selected computed styles. The goal is not to replace screenshot testing, but to make layout regression failures easier to explain.

## 5. Approach

I structured the project into three test layers:

| Layer | Purpose | Tooling |
|---|---|---|
| Smoke test | Verify core page load, sections, product filter, CTA links, mobile overflow | Playwright |
| Visual test | Compare screenshots for major page regions | Playwright `toHaveScreenshot()` |
| Layout oracle | Compare selected DOM element geometry and styles against JSON baselines | Playwright + custom checker |

The layout oracle flow is:

```text
Open static demo page
  -> capture watched selectors at mobile / tablet / desktop breakpoints
  -> store JSON baseline under baselines/<site>/<breakpoint>.json
  -> compare current DOM geometry with baseline
  -> classify differences as pass / warn / fail
  -> generate JSON and HTML reports
  -> fail CI when the result is fail
```

The watched data includes:

- element presence: `found`
- visibility: `visible`
- geometry: `x`, `y`, `width`, `height`
- computed styles: `fontSize`, `fontWeight`, `color`, `backgroundColor`

The tolerance model uses both absolute and relative thresholds:

```text
tolerance = max(minimum pixels, element size * percentage)
```

This avoids failing on tiny rendering noise while still catching meaningful layout movement.

## 6. Technical Highlights

- Built with Playwright for browser automation and UI verification.
- Uses a local static HTML demo, so the portfolio project can run without external services.
- Compares DOM geometry baselines instead of relying only on screenshot pixel diff.
- Supports mobile, tablet, and desktop breakpoints.
- Produces machine-readable `report.json` and human-readable `report.html`.
- Uses pass / warn / fail classification to separate minor drift from blocking layout changes.
- Keeps layout diff logic in pure functions and covers it with unit tests.
- Includes functional smoke tests, screenshot visual tests, and layout compare checks.
- Has a GitHub Actions workflow design for PR checks and report artifacts.
- Cleans baseline metadata so layout baselines are not polluted by timestamp or commit-only diffs.

## 7. Result / Evidence

Current local verification:

| Check | Result | Evidence |
|---|---:|---|
| Unit tests | 26 passed | `npm run test:unit` validates layout diff logic |
| Layout compare | PASS | `npm run layout:compare` checks 11 watched elements across 3 breakpoints |
| Smoke tests | 15 passed, 3 skipped | `npm run test:smoke`; skipped cases are planned `test.fixme` checks for placeholder LINE ID |
| Visual tests | 12 passed | `npm run test:visual` across Chromium, Firefox, and WebKit |
| Baseline update | success | `npm run layout:update -- --site=huiyou` regenerates stable baselines |

The sample layout report currently shows `PASS` for:

- mobile: 375 x 812
- tablet: 768 x 1024
- desktop: 1280 x 800

Each breakpoint watches 11 key selectors, including navigation, logo, hero, product tabs, product card, contact section, and footer.

I also included a static fail / warn example under `examples/layout-failure-report.example.md` to show how the oracle explains a layout regression without making the default demo fail.

## 8. Limitations

This project is intentionally scoped. I would not present it as a replacement for all visual regression testing.

Known limitations:

- It can miss issues where pixels change but bounding boxes stay the same, such as broken images, shadows, border radius, or subtle visual polish issues.
- It does not replace accessibility testing. Color contrast, keyboard navigation, semantic HTML, and screen reader behavior need separate checks.
- It depends on stable selectors. If selectors are unstable, the layout oracle becomes unstable.
- DOM geometry can differ across operating systems and fonts, so CI should use a consistent rendering environment.
- The current demo uses one static site. Adding more sites is supported by the registry design, but should be done deliberately.
- Baseline updates still require human review. A broken UI can be accepted as the new baseline if the reviewer updates blindly.

## 9. What I Learned

I learned that UI regression testing should not be treated as one tool or one assertion style. Screenshot diff, functional E2E checks, and structured layout checks answer different questions.

The main lesson was that a useful QA tool does not need to be broad to be valuable. By narrowing the scope to layout movement, visibility, and selected style changes, the oracle can give a clearer signal than a generic pixel diff for certain classes of regressions.

I also learned the importance of testing the test tool itself. The tolerance and pass / warn / fail classification logic has unit tests because a flaky or untested test utility can create false confidence.

## 10. 30-second Interview Pitch

I built a Playwright-based UI regression demo that checks layout changes across mobile, tablet, and desktop breakpoints. Instead of relying only on screenshot pixel diff, I added a DOM geometry baseline layer that captures selected elements, compares their position, size, visibility, and key styles, then reports pass, warn, or fail. The project includes unit tests for the diff logic, smoke tests, screenshot visual tests, layout reports, and a CI workflow design. I am careful to describe it as a layout regression guardrail, not a replacement for all visual or accessibility testing.

## 11. 2-minute Interview Pitch

This project started from a common UI testing problem: screenshot diffs are useful, but they can be noisy and sometimes hard to triage. A pixel diff can tell you the screen changed, but it does not always tell you whether the logo font changed, a section moved down, a product card resized, or an element disappeared.

I built a small Playwright demo around a static product landing page. It has three layers: functional smoke tests, screenshot visual tests, and a custom layout oracle. The layout oracle opens the page at mobile, tablet, and desktop breakpoints, captures selected DOM elements, stores their geometry and key computed styles as JSON baselines, then compares the current page against those baselines.

The comparison uses a tolerance formula based on both minimum pixels and element size, so it can ignore tiny rendering noise while still catching meaningful layout shifts. Differences are classified as pass, warn, or fail, and the tool writes both JSON and HTML reports. The pure diff logic has unit tests, and the workflow is designed to fit into CI so pull requests can be blocked when an important layout regression occurs.

I do not position this as a complete visual testing solution. It cannot catch every pixel-level issue and it does not replace accessibility checks. The value is that it adds an explainable, structured signal for layout regression, which can make CI failures easier for QA and developers to review.

## 12. STAR Interview Story

**Situation:** I wanted a public QA portfolio project that demonstrates more than basic Playwright scripting. I chose UI regression testing because it is a realistic SDET problem, especially when teams need reliable PR checks for frontend changes.

**Task:** The task was to build a demo that could detect layout regressions in a repeatable way, while keeping the project safe to publish and easy for interviewers to understand.

**Action:** I first implemented standard Playwright smoke and screenshot visual tests. Then I added a custom DOM geometry baseline checker. It captures selected elements across mobile, tablet, and desktop breakpoints, compares `x`, `y`, `width`, `height`, visibility, and selected styles, and classifies differences as pass, warn, or fail. I separated the diff logic into pure functions and added unit tests for tolerance boundaries and classification behavior. I also cleaned the baseline metadata so baseline diffs are not polluted by timestamp or commit changes.

**Result:** The project now has a reproducible local demo, clear README documentation, CI workflow design, JSON / HTML layout reports, and verified test results: 26 unit tests passing, layout compare passing across 3 breakpoints, 15 smoke tests passing with 3 planned skips, and 12 screenshot visual tests passing. It is ready to be used as a first public SDET flagship project, with limitations clearly documented.

## 13. Resume Bullets

- Built a Playwright-based UI regression demo with smoke tests, screenshot visual checks, and a custom DOM geometry layout oracle across mobile, tablet, and desktop breakpoints.
- Designed a DOM geometry baseline checker that compares selected element position, size, visibility, and computed styles, producing pass / warn / fail reports for CI review.
- Added unit coverage for layout diff logic, including tolerance boundaries, missing elements, style changes, and severity classification.
- Improved portfolio reproducibility by moving smoke tests from an external deployment URL to a local static demo page and cleaning volatile baseline metadata.
- Documented project limitations honestly, including why DOM geometry checks complement but do not replace screenshot visual regression or accessibility testing.

## 14. LinkedIn Project Description

UI Layout Regression Oracle is a Playwright-based QA portfolio project focused on explainable UI regression checks. The project demonstrates functional smoke tests, screenshot visual checks, and a custom DOM geometry baseline layer that validates selected elements across mobile, tablet, and desktop breakpoints.

Instead of relying only on screenshot pixel diffs, the layout oracle captures element position, size, visibility, and key computed styles, then classifies changes as pass, warn, or fail. The goal is to make layout regression failures easier to triage in CI.

This is intentionally scoped as a layout regression guardrail. It does not replace all visual regression testing or accessibility testing, but it shows how QA tooling can provide a more structured signal for frontend changes.

## 15. Cake Portfolio Description

### UI Layout Regression Oracle

這是一個以 Playwright 實作的 UI regression 測試作品，目標是展示我如何把前端版面回歸問題拆成可驗證、可重現、可放進 CI 的 QA 流程。

專案包含三層測試:

- smoke test: 驗證頁面載入、核心區塊、商品分類切換與手機版 overflow
- visual test: 使用 Playwright screenshot comparison 驗證主要區塊
- layout oracle: 使用 DOM geometry baseline 檢查重要元素的位置、尺寸、可見性與關鍵樣式

這個專案的重點是 layout oracle。它不是只看 pixel diff，而是把 selected DOM elements 在 mobile / tablet / desktop breakpoint 下的 `x`, `y`, `width`, `height`, `visible`, `fontSize`, `color` 等資料存成 JSON baseline，再與目前畫面比對，輸出 pass / warn / fail 報告。

目前驗證結果:

- 26 個 unit tests 通過，覆蓋 diff / tolerance / severity 邏輯
- layout compare 在 mobile / tablet / desktop 全部 PASS
- smoke tests 15 passed, 3 skipped
- screenshot visual tests 12 passed

我會誠實定位這個專案: 它不能取代所有 visual regression testing，也不能取代 accessibility testing。但它能補上 screenshot diff 不容易回答的問題: 哪個 DOM 元素移動了、尺寸變了、消失了、或關鍵樣式改變了。

