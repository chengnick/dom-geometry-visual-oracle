# UI_Test - UI Layout Regression Oracle

> A Playwright-based UI regression demo that compares DOM geometry baselines instead of relying only on screenshot pixel diffs. It is designed as a portfolio project for Software Test Engineer / SDET interviews.

This project uses a static product website, "Hui You", as the test target. The goal is not to claim this tool replaces visual testing. The goal is to show how a QA engineer can turn a UI regression problem into a repeatable, explainable, CI-friendly check.

## Project Background

UI regression testing often starts with screenshots. Screenshot comparison is useful, but it can become noisy when the page has responsive layouts, font rendering differences, image compression changes, or small anti-aliasing shifts.

In this project I first used Playwright's built-in screenshot assertions to test a real-looking landing page. That exposed a practical QA problem:

- full-page and component screenshots are easy to understand, but baseline images grow quickly;
- pixel diffs show where pixels changed, but not always why they changed;
- a small rendering difference can look dramatic in a diff image;
- CI needs a result that can be reviewed quickly without opening many image artifacts.

So I built a small layout oracle as a second layer. Instead of comparing pixels, it captures selected DOM elements and compares their geometry and key computed styles against a baseline.

## QA Problem Solved

This project focuses on one specific question:

> Did an important UI element move, resize, disappear, become hidden, or change key style in a way that should block a pull request?

It is aimed at layout regressions such as:

- a header height change pushing the hero section down;
- a product card becoming wider or narrower than expected;
- a responsive breakpoint causing unexpected layout shift;
- a key CTA, card, section, or footer disappearing;
- a style change such as font size or color changing on a watched selector.

It is not meant to validate every pixel. Screenshot testing and manual review are still useful for image quality, spacing taste, design polish, accessibility, and visual issues that do not change bounding boxes.

## Technical Approach

The project has three layers of UI testing:

| Layer | Purpose | Implementation |
|---|---|---|
| Functional smoke tests | Check that the page loads and core flows work | `tests/smoke.spec.js` |
| Screenshot visual checks | Compare selected page areas with screenshots | `tests/visual.spec.js` |
| Layout oracle | Compare DOM geometry and selected styles | `ui_layout_checker/` |

The layout oracle works like this:

```text
Playwright opens the page
  -> capture selected DOM elements at mobile / tablet / desktop widths
  -> store baseline JSON in baselines/<site>/<breakpoint>.json
  -> compare current capture with the baseline
  -> classify each difference as pass / warn / fail
  -> write ui_layout_checker/report.json and report.html
  -> return exit code 1 when the overall result is fail
```

The watched data includes:

- element presence: `found`
- visibility: `visible`
- geometry: `x`, `y`, `width`, `height`
- selected computed styles: `fontSize`, `fontWeight`, `color`, `backgroundColor`

The important design choice is the tolerance model:

```text
tolerance = max(minimum pixels, element size * percentage)
```

This avoids failing a build for sub-pixel noise, while still catching meaningful movement. The checker uses two thresholds:

| Verdict | Meaning | CI behavior |
|---|---|---|
| `pass` | Differences are within tolerance | Build stays green |
| `warn` | Difference is worth reviewing but below the fail threshold | Report only |
| `fail` | Element disappeared, visibility changed, style changed, or geometry exceeded fail tolerance | Build fails |

The comparison logic is separated into pure functions in `ui_layout_checker/diff.js`, with unit tests in `tests/diff.spec.js`. This is intentional: the test tool itself should have tests, especially around boundary conditions.

## How To Run The Demo

Install dependencies:

```bash
npm install
npx playwright install chromium
```

Run the fastest validation, which tests the layout diff logic without opening a browser:

```bash
npm run test:unit
```

Run the layout oracle against the included static demo page:

```bash
npm run layout:compare
```

Generate and open the HTML report from the last run:

```bash
npm run layout:report
```

Update baselines only after confirming the current page is correct:

```bash
npm run layout:update
```

Run the screenshot-based visual checks:

```bash
npm run test:visual
```

Run the functional smoke tests:

```bash
npm run test:smoke
```

## Test Results

Current sample report:

```json
{
  "overall": "pass",
  "sites": [
    {
      "name": "huiyou",
      "verdict": "pass",
      "breakpoints": [
        { "name": "mobile", "viewport": { "width": 375, "height": 812 }, "verdict": "pass", "findings": [] },
        { "name": "tablet", "viewport": { "width": 768, "height": 1024 }, "verdict": "pass", "findings": [] },
        { "name": "desktop", "viewport": { "width": 1280, "height": 800 }, "verdict": "pass", "findings": [] }
      ]
    }
  ]
}
```

Latest local verification:

| Check | Result | Notes |
|---|---:|---|
| `npm run test:unit` | 26 passed | Pure diff logic, Chromium project |
| `npm run layout:compare` | PASS | 11 watched elements across mobile / tablet / desktop |
| `npm run test:smoke` | 15 passed, 3 skipped | The skipped cases are the planned `test.fixme` LINE placeholder check across browsers |
| `npm run test:visual` | 12 passed | Screenshot checks across Chromium / Firefox / WebKit |

The unit test suite covers the diff engine, including:

- geometry tolerance boundaries;
- found / missing element handling;
- style differences;
- warning versus failure classification;
- breakpoint-specific fail tolerance overrides.

At the time this README was prepared, `tests/diff.spec.js` contains 26 unit tests for the pure layout comparison logic.

## CI Usage

The GitHub Actions workflow is in:

```text
.github/workflows/ui-layout-check.yml
```

It runs on pull requests to `main` or `master`, and can also be triggered manually.

The CI flow is:

```text
checkout
  -> setup Node.js 20
  -> npm ci
  -> install Playwright Chromium
  -> npm run test:unit
  -> npm run layout:compare
  -> upload ui_layout_checker/report.json as an artifact
  -> comment the pass / warn / fail summary on the PR
```

The workflow currently uses `windows-latest` because the existing baselines were captured on Windows. DOM geometry can vary slightly across operating systems due to font rendering and layout differences. Keeping capture and comparison on the same runner reduces false failures.

For a larger team, I would move baseline capture and comparison into the same Playwright Docker image so local and CI runs use the same rendering environment.

## Sample Report

`npm run layout:compare` writes:

```text
ui_layout_checker/report.json
ui_layout_checker/report.html
```

`report.json` is the machine-readable artifact for CI. `report.html` is the human-readable report for local review.

A static fail / warn example is included for interview review:

```text
examples/layout-failure-report.example.md
examples/layout-failure-report.example.json
```

A failing or warning item is reported by selector and field. For example, if a logo font change pushes the page down, the report can identify that:

```text
.logo
  fontSize: 24px -> 40px
  width: changed
  height: changed

.hero h1
  y: shifted beyond tolerance
```

This is the main benefit over a pure pixel diff: the report points to the element and property that changed, making triage faster.

## Project Structure

```text
UI_Test/
├── index.html
├── styles.css
├── tests/
│   ├── smoke.spec.js
│   ├── visual.spec.js
│   └── diff.spec.js
├── ui_layout_checker/
│   ├── config.js
│   ├── capture.js
│   ├── compare.js
│   ├── diff.js
│   ├── extract.js
│   └── report-html.js
├── baselines/
│   └── huiyou/
│       ├── mobile.json
│       ├── tablet.json
│       └── desktop.json
└── .github/workflows/ui-layout-check.yml
```

## Limitations

This project is intentionally small and focused. Its limitations are part of the design:

- It does not replace screenshot testing. It can miss issues where the bounding box stays the same but pixels are wrong, such as broken images, shadows, border radius, or subtle visual polish problems.
- It does not replace accessibility testing. Color contrast, keyboard navigation, semantic HTML, and screen reader behavior need separate checks.
- It depends on stable selectors. If selectors are brittle, the oracle becomes brittle too.
- It currently watches one static demo site. The registry supports more sites, but additional targets should be added deliberately.
- DOM geometry can differ between operating systems and fonts. CI should use a consistent rendering environment.
- Updating baselines is a review-sensitive action. A bad UI can be accidentally accepted as the new baseline if the reviewer does not check it first.

## Future Improvements

Planned improvements I would make next:

- Add an accessibility layer with Playwright + axe checks.
- Add a second demo target, such as a small React/Vite app, to show the oracle works beyond one static page.
- Run capture and comparison in a fixed Playwright container instead of relying on `windows-latest`.
- Add a small intentionally-broken fixture page to demonstrate fail and warn reports reproducibly.
- Improve the HTML report with grouped summaries, before/current values, and links to selectors.
- Add baseline review guidance to the pull request template.
- Add an optional screenshot attachment for failed selectors, while keeping DOM geometry as the primary signal.

## Interview Summary

I built this project to demonstrate a practical SDET approach to UI regression testing: start with standard Playwright visual checks, identify where screenshot diffs become noisy or hard to triage, then add a small deterministic oracle that compares DOM geometry and key styles. The result is not a universal visual testing replacement, but it is a CI-friendly guardrail that gives more explainable failure reports for layout regressions.



