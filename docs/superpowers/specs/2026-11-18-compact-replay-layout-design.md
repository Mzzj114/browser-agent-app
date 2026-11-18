# Compact Replay Layout

**Status:** Approach A selected by the user. Short design awaiting approval.

## Intent

Show the complete recorded screenshot without requiring a click or scrolling
through a narrow strip. Reclaim vertical space from duplicate navigation,
browser chrome, and response copy while keeping assessment controls visible.

This is a small shared-layout change, not a new study flow or theme.

## Approaches

- **A — compact, always-visible assessment: chosen.** Put replay controls in the
  right pane, reduce browser chrome to two rows, and compact the context and
  response regions. The image is smaller than in B, but answering needs no
  additional click.
- **B — screenshot-first, expandable assessment: not chosen.** A collapsed
  response footer gives the image more height, but hides the assessment until
  expanded.
- **Fit-only CSS: insufficient.** Showing the whole image in the existing short
  well would make it too small. Both the height allocation and fitting must
  change.

## Chosen Layout

```text
Product header / language / recorded step count
Original task                 | Agent-reported result / synthetic provenance
Execution rail | Compact page metadata | Previous / step menu / next
               | Before/final caption | Return to final state
               |                      | ------------------------
               | Full fitted image    | Viewed-step inspector
               |                      | (independently scrollable)
Always-visible verdict | Earliest mistake | Explanation | Submit
Compact consequence and on-page-only notices / submission status
```

- Remove the replay toolbar beneath the screenshot. Keep its arrows, step menu,
  final-state control, and boundary behavior in a fixed area above the inspector.
  The execution rail remains available and does not change response judgments.
- Merge the tab/title and read-only URL into one compact metadata row. Use a
  second compact row for before/final state, capture time, and recorded/not-live
  context. Keep the action label in the inspector instead of repeating it in
  the screenshot caption. Preserve full title/URL access for truncated text.
- Fit the image to **both** available dimensions, preserving aspect ratio and
  showing every edge without cropping or default image-well scrolling. Center
  unused space. Clicking still toggles native-pixel inspection with scrolling;
  returning to fit shows the entire image again.
- Keep the response form always visible. Use a compact, stable multi-column
  layout, concise labels/helpers, and one notice group rather than separate
  full-width paragraphs. Preserve validation rules, accessible descriptions,
  consequence disclosure, refresh-clears-response disclosure, and live
  submission confirmation. Do not reserve an empty status row.
- Compact the task/report strip without changing either fixture text. Keep a
  concise, visible explanation that the run and pages are authored synthetic
  examples, not captured model output. Long content may scroll internally.

## Constraints and Builder Calls

- Use the existing light theme, typography, 44px interactive targets, and three
  panes. Do not shrink primary interface text below 14px to solve space pressure.
- Builder starting points, demonstrated in the mockup: a 104px context strip,
  a 156px normal response region, and roughly 62px of browser chrome. Verify
  actual translated copy before settling dimensions; errors/long content may
  scroll within their own regions, never stretch or cover the screenshot.
- Preserve initial final view, before-action images, separate final state,
  viewing/marking independence, submission locking, and bilingual draft state.
- Preserve fixture projections, evidence visibility, authored candidate order,
  and probability semantics. No annotations, telemetry, persistence, backend,
  additional dependencies, or participant-facing condition switch.
- Apply the same layout to every evidence condition. Keep the original
  `study/baseline`, `study/candidates`, and `study/probabilities` branches
  untouched in this fork; develop on `study/compact-layout-fork` and verify
  condition variants in isolated workspaces if needed.

## Acceptance

- At 1280×720, 1366×768, and 1440×900, in both locales, the complete healthy
  screenshot is visible in fit mode without image-well overflow.
- Target at least 320px of screenshot-well height at 1280×720, materially more
  than the reproduced 69px English well. Larger windows gain image height.
- Replay controls never consume a row beneath the image or wrap into it.
  Inspector evidence and the rail retain independent scrolling.
- Normal assessment controls and concise notices are visible; validation,
  long evidence, resized explanations, and submission remain reachable without
  shell overflow or overlap.
- Existing unit, browser, accessibility-oriented, build-artifact, and
  condition-equivalence checks pass with intentional layout assertions updated.

## Reference

Throwaway companion assets and checks:
`C:/Users/mzzj/AppData/Local/Temp/opencode/decision-evidence-visual-fork-2026-11-18/`.
All 12 mockup layout/locale/window combinations showed the full image. This is
exploration evidence, not verification of a production fix.
