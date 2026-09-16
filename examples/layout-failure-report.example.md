# Example Layout Failure Report

This file is a static example of what the UI layout oracle reports when a layout regression is detected. It is intentionally not wired into the default test flow, so the normal demo remains green.

Related machine-readable example:

```text
examples/layout-failure-report.example.json
```

## Scenario

A developer changes the `.logo` font size from `24px` to `40px`. The logo itself becomes taller, and the navigation area pushes downstream content lower on the page.

This is the kind of regression that a screenshot diff can show visually, but the DOM geometry report can explain structurally:

- which selector changed;
- which field changed;
- how large the movement was;
- whether the change is a warning or a blocking failure.

## Summary

| Breakpoint | Verdict | Example finding |
|---|---|---|
| mobile `375 x 812` | FAIL | `.logo` font size and height changed; `.hero h1` shifted down |
| tablet `768 x 1024` | FAIL | `.logo` style changed; `.hero-img` shifted within warning range |
| desktop `1280 x 800` | WARN | first product card width changed within warning range |

## Example Findings

### Blocking failure

```text
.logo
  [fail] fontSize: 24px -> 40px
  [fail] height: 29 -> 48 (delta 19px, tolerance +/-8px)
```

Why this blocks CI:

- style changes are treated as fail for watched selectors;
- the height delta exceeds the fail threshold;
- the element is part of the navigation identity area.

### Downstream layout shift

```text
.hero h1
  [fail] y: 258.7 -> 285.9 (delta 27.2px, tolerance +/-8px)
```

Why this is useful:

- the report points to a specific selector and coordinate field;
- the reviewer can see that the hero moved because upstream layout changed;
- this is faster to triage than only seeing red pixels in a screenshot diff.

### Warning, not failure

```text
#story .swatch
  [warn] y: 915.4 -> 942.6 (delta 27.2px, tolerance +/-31.5px)
```

Why this is only a warning:

- the same physical shift can be less risky for a larger/lower-priority element;
- the relative tolerance allows larger components to absorb small proportional movement;
- the report still records the drift for human review.

## How To Explain This In An Interview

The point of this example is not that DOM geometry is better than screenshots in every case. The point is that it gives a different, more structured signal.

Screenshot diff answers:

> What pixels changed?

The layout oracle answers:

> Which important DOM element moved, resized, disappeared, became hidden, or changed selected style fields?

In a CI flow, these two signals can complement each other. Screenshot diff remains useful for visual review. DOM geometry makes some layout regressions easier to classify and triage.

## Limitation Of This Example

This is a static illustrative report, not a generated artifact from a committed broken branch. It is included to show the expected shape of fail / warn output while keeping the default project state reproducible and passing.
