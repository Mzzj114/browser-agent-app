# Compact Replay Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the entire recorded screenshot by default while keeping replay navigation and assessment controls visible.

**Architecture:** Keep the current React state and domain contracts. Move replay controls into a fixed inspector header, replace the browser chrome with two compact metadata rows, and use two-axis aspect-preserving image fitting. Allocate bounded context and response rows; their long content scrolls internally, never enlarging the shell.

**Tech Stack:** React 19, TypeScript, CSS Grid/Flexbox, Vite, Bun, Vitest/Testing Library, Playwright with installed Chrome. No additional dependencies.

**Spec:** `docs/superpowers/specs/2026-11-18-compact-replay-layout-design.md`

**Superseded navigation:** The approved follow-up
[`2026-11-18-evidence-first-inspector.md`](2026-11-18-evidence-first-inspector.md)
removes inspector replay/marking controls and puts Final state last in the same
scrolling rail. The previous source review was cancelled, not completed; do not
restart it as part of the follow-up.

## Approved Execution Adjustment

The user approved this plan and requested a build-focused pass rather than extensive verification. Execute the two tightly coupled layout tasks as one implementation pass with one source review. Use focused component tests and a production build; skip the visual/E2E matrix and isolated condition-workspace verification. The user will verify appearance. These instructions supersede the extended verification/review steps below; retain shared-condition layout and all study semantics.

- [x] Implement compact viewer, inspector replay header, context, and assessment in one pass.
- [x] Update documentation and stale browser-test selectors without browser runs.
- [x] Verify 323 unit/component tests and production build (including typecheck/artifact verification).
- [ ] Complete one focused source review.
- [ ] Leave changes on `study/compact-layout-fork` for user inspection; no merge or cleanup.

## Global Constraints

- Use the existing light theme, typography, 44px interactive targets, and three panes. Do not shrink primary interface text below 14px to solve space pressure.
- Preserve initial final view, before-action images, separate final state, viewing/marking independence, submission locking, and bilingual draft state.
- Preserve fixture projections, evidence visibility, authored candidate order, and probability semantics. No annotations, telemetry, persistence, backend, additional dependencies, or participant-facing condition switch.
- Keep both fixture task/report texts unchanged. Keep visible authored-synthetic provenance, consequence disclosure, refresh-clears-response disclosure, accessible descriptions, validation, and live submission confirmation.
- Apply the same layout to every evidence condition. Keep the original `study/baseline`, `study/candidates`, and `study/probabilities` branches untouched in this fork; develop on `study/compact-layout-fork` and verify condition variants in isolated workspaces if needed.
- Test 1280×720, 1366×768, and 1440×900 in both locales. Target at least 320px of screenshot-well height at 1280×720; larger windows gain image height.

## Review Focus

- A native-size image scrolled to its bottom-right must return to a centered, completely visible fit image, without stale scroll offsets.
- Long titles/URLs and historical captions must remain fully accessible without wrapping chrome into the screenshot.
- Long translated task/report content must scroll without hiding synthetic provenance or altering fixture copy.
- Invalid submission, a 500-character explanation, and a manually enlarged textarea must remain reachable without moving or covering the screenshot.
- Long inspector evidence must scroll independently while replay controls remain visible and viewing never changes the response mark.

## File Map

- `src/App.tsx`: compose the fixed replay header, scrolling inspector body, and compact context structure without changing state handlers.
- `src/components/ui/replay-controls.tsx`: arrows/select row plus a full-width final-state row; preserve accessible names and boundary rules.
- `src/components/ui/browser-frame.tsx`, `src/styles/browser.css`: two-row read-only metadata, full-fit/native-size image states, failure recovery.
- `src/components/ui/study-response-form.tsx`: stable four-column assessment and grouped notices; preserve field IDs, validation focus, descriptions, and live status.
- `src/i18n/messages.ts`, `src/i18n/study-messages.ts`: concise bilingual interface copy only, never fixture text or probability semantics.
- `src/styles/study.css`: bounded shell sizing, pane/scroll ownership, compact assessment grid.
- `src/showcase.tsx`: update BrowserFrame call sites if its props change; keep the showcase developer-only.
- Existing component/browser tests: extend behavior assertions and intentionally update layout-specific expectations, not semantic protections.
- `DESIGN.md`, `README.md`: align documented geometry and scroll ownership with the implemented contract.

## Preparation

- [x] Read the supplied design and existing production components.
- [x] Confirm a clean isolated fork on `study/compact-layout-fork`; preserve original branch heads.
- [x] Baseline `bun run test`: 16 files, 322 tests passed.
- [x] Baseline `bun run test:e2e`: 29 tests passed, including production build/artifact verification.
- [x] Record baseline formatting limitation: `bun run lint` fails on existing checkout-format issues, including CRLF files despite the LF Git policy. Keep changed files clean and report pre-existing diagnostics separately; do not reformat unrelated files.
- [x] Record protected heads: baseline `1c2d7a6b1ff4034b8354aad4cf15adefa8022f0b`, candidates `a53e9ac6d027d9967492b4f2a6e4deefc073f1ff`, probabilities `7f461c8d3efadf2adafd6b41f87422f317a03b32`.
- [x] Review this plan with the user before product implementation; approved with the lighter verification scope above.

---

### Task 1: Compact Replay Viewer

**Files:** Modify `src/App.tsx`, `src/components/ui/replay-controls.tsx`, `src/components/ui/browser-frame.tsx`, `src/styles/browser.css`, viewer/inspector rules in `src/styles/study.css`, `src/i18n/messages.ts`, `src/showcase.tsx`; extend existing component tests and `e2e/workspace.e2e.ts`, `e2e/study-layout.e2e.ts`.

**Interfaces:**

- Keep `ReplayControls` props and all existing callbacks/value inputs unchanged.
- Keep `BrowserFramePageState` unchanged. Remove duplicate `stepCount` and `actionLabel` BrowserFrame props and update every caller/test.
- Retain `pageState`, `stateLabel`, `stateNote: string | null`, and `capturedAtLabel`; give historical observations a localized recorded/not-live note too.
- Preserve `data-zoomed`, screenshot alt text, image-error fallback, and the fit/native-size accessible button names.
- Keep `.study-inspector-panel` as the independently scrolling evidence body; introduce an outer `.study-inspector` grid containing fixed replay controls and that body.

- [ ] **Step 1: Add failing viewer tests.** Extend the component tests for title/URL full-text access, absence of repeated action/count metadata, historical recorded/not-live context, unchanged replay boundaries, and missing-image recovery. Strengthen the existing browser zoom test with these assertions after image decode:

  ```ts
  expect(fit.image.left).toBeGreaterThanOrEqual(fit.well.left - 1)
  expect(fit.image.top).toBeGreaterThanOrEqual(fit.well.top - 1)
  expect(fit.image.right).toBeLessThanOrEqual(fit.well.right + 1)
  expect(fit.image.bottom).toBeLessThanOrEqual(fit.well.bottom + 1)
  expect(fit.scrollWidth).toBeLessThanOrEqual(fit.clientWidth + 1)
  expect(fit.scrollHeight).toBeLessThanOrEqual(fit.clientHeight + 1)
  ```

  Also assert aspect ratio equals the intrinsic width/height within rounding tolerance; actual-size rendered content uses native pixels. Scroll native mode to bottom-right, return to fit, and reassert every edge and centered unused space. Run this for final and historical screenshots in both locales.

- [ ] **Step 2: Run the focused tests and confirm relevant failures.** Run `bun run test` and `bun run test:e2e -- e2e/workspace.e2e.ts e2e/study-layout.e2e.ts`. Failures must demonstrate width-only fitting, duplicate chrome, or replay placement—not an unrelated locator/setup failure.

- [ ] **Step 3: Implement viewer composition and styling.** Move the replay header to `.study-inspector` above its scrolling `.study-inspector-panel`; remove the row beneath `.study-page`. Within `ReplayControls`, place Previous / labeled step select / Next on one grid row and Return to final on the second. Preserve position announcements with a visually hidden live element rather than a third visible control row. All interactive targets remain at least 44px. Keep the existing handlers and selection rules.

- [ ] **Step 4: Implement compact chrome and image fitting.** Use approximately 30px and 32px metadata rows: title/read-only URL, then state/capture time/recorded-not-live context. Expose complete title/URL through text and `title` attributes when visually truncated; keep the action only in the inspector. In fit mode center an intrinsic-aspect image constrained by both available dimensions, with no image-well overflow or cropping. Native mode removes fit constraints and enables two-axis scrolling. Switching back must reset effective scroll position. Preserve image error recovery; use declarative CSS for sizing, not resize observers or calculated viewport pixels.

- [ ] **Step 5: Verify independent scrolling and run focused tests.** In the existing long-evidence matrix, scroll the inspector and rail, check their scroll positions actually change, check replay controls stay fixed and outside the scrolling evidence, and verify the screenshot bounds do not move. Inject long metadata and assert full values remain available and chrome does not expand. Run the Step 2 commands and `bun run typecheck`; expect all to pass. Run `bun run lint` and require no new diagnostics relative to the recorded formatting baseline.

- [ ] **Step 6: Review and commit.** Use fresh `opencode-go/deepseek-v4.1-flash` subagents for spec and code-quality review; resolve findings before the next task. Commit only task-owned source/tests with `feat: compact replay navigation and fit screenshots in both dimensions`.

### Task 2: Compact Always-Visible Assessment and Context

**Files:** Modify `src/components/ui/study-response-form.tsx`, `src/App.tsx` context markup, `src/i18n/messages.ts`, `src/i18n/study-messages.ts`, shell/context/response rules in `src/styles/study.css`, existing response/workspace component tests, `e2e/study-layout.e2e.ts`, `e2e/theme.e2e.ts`, `DESIGN.md`, and `README.md`.

**Interfaces:**

- Consume the viewer/inspector structure from Task 1 without modifying replay/domain behavior.
- Keep `StudyResponseForm({ episodes, state, onResponse })`, all `ResponseAction` shapes, and `StudyResponse` unchanged.
- Add explicit form layout classes for localization, explanation, submit, and one notice group. Keep stable `aria-describedby` targets and the live `role="status"` node; do not allocate an empty status row.
- Use a 104px context row and 156px normal response row as starting dimensions, 8px page padding, and the existing 56px header. This budgets roughly 324px for the image well at 720px before browser rounding.

- [ ] **Step 1: Add failing compact-shell tests.** Extend all six locale/window layout cases: final and historical images fit, `browserViewport.height >= 320` at 1280×720, larger heights gain well height, no replay toolbar exists below the image, and normal verdict/select/textarea/submit plus both notices are visible without response scrolling. Assert primary labels/controls/body copy are at least 14px and interactive targets at least 44px.

- [ ] **Step 2: Add failure/overflow behavior assertions.** For both locales, verify error-summary focus and described-by links, 500-character text, manual textarea enlargement, long context text with unchanged fixture values, visible synthetic provenance, submission status, and locked response controls. In overflow states the appropriate inner region may scroll, but screenshot/main bounds and shell scroll dimensions must remain unchanged and controls stay reachable. Re-run locale switching after marking and submitting to preserve draft/locking behavior.

- [ ] **Step 3: Run focused tests and confirm failure.** Run `bun run test` and `bun run test:e2e -- e2e/study-layout.e2e.ts e2e/theme.e2e.ts`; expect compact geometry/visibility assertions to fail against the old flexible response/context rows.

- [ ] **Step 4: Implement the bounded context and response grid.** Use four stable columns for verdict, earliest mistake, explanation, and submit; stack the two equally styled verdict buttons in their column. Start with `268px 300px minmax(0, 1fr) 152px`, 16px column gaps, and a compact two-line textarea, adjusting only if actual bilingual measurements require it. Group consequence/on-page notices in one compact wrapping row. Keep error summary/field errors and live status in normal form flow within the bounded response scroller; never overlay or expand the screenshot. Keep provenance visible outside each report text scroller. Retain both fixture strings verbatim.

- [ ] **Step 5: Shorten interface copy in both locales without removing meaning.** Use concise task-fulfillment and earliest-mistake labels, uncertainty guidance, and required/optional helpers. Concrete marked steps require explanation for either verdict; Cannot determine remains optional. Keep full accessible labels/descriptions where useful. Retain explicit order/rerun/repair consequences, reload-clears-response notice, synthetic run/page provenance, and neutral submitted confirmation. Do not alter candidate/probability copy or domain validation.

- [ ] **Step 6: Verify and document.** Run the Step 3 commands; inspect generated initial/historical/error/uncertain/submitted evidence at all six combinations. Update `DESIGN.md` and `README.md` for actual compact row dimensions, two-row browser metadata, fixed inspector replay header, fit-only non-scrolling image well, native-pixel scrolling, and response overflow ownership. Expect tests/typecheck to pass and changed files to have no new lint/format diagnostics.

- [ ] **Step 7: Review and commit.** Fresh requested-model spec and code-quality reviewers check bilingual visibility, all disclosures, accessible descriptions/focus, absence of empty status space, and no domain/fixture changes. Resolve findings and commit `feat: keep assessment visible in compact replay shell`.

## Whole-Branch Verification and Condition Equivalence

- [ ] Run `bun run test`, `bun run typecheck`, `bun run lint`, `bun run build`, and `bun run test:e2e` on the completed baseline fork. Record counts and image-well measurements for all six locale/window pairs, including before/final and fit/native transitions.
- [ ] Create temporary isolated candidate/probability verification worktrees from the completed fork using native worktree tools. Change only their pinned `src/study-condition.ts` value, install existing locked dependencies, and run the same complete checks. Do not change any original study branch/worktree or add a runtime condition selector.
- [ ] Run `node scripts/compare-study-builds.ts <compact-baseline-path> <temporary-compact-candidates-path> <temporary-compact-probabilities-path>` after all three builds and browser report sets exist. Expect common fixture semantics, screenshot references, authored candidate order, and shared geometry within 1px to match.
- [ ] Obtain a fresh whole-branch review on `opencode-go/deepseek-v4.1-flash`, resolve actionable findings, and rerun affected verification. Compare original study branch heads to preparation records to confirm they remain untouched.
- [ ] Report changes, test evidence, actual minimum well height, and any remaining limitations. Do not claim completion if a required check was skipped or failed. Do not merge or remove worktrees without user direction.

## Plan Self-Review

- [x] Every chosen-layout and acceptance requirement maps to Task 1, Task 2, or whole-branch verification.
- [x] Preserve existing domain/data interfaces; update BrowserFrame callers together with its prop change.
- [x] All five review-focus cases have explicit owner-task assertions.
- [x] Dimensions marked as builder starting points remain subject to actual bilingual browser measurements; the 320px image-well target is the hard check.
- [x] Execution uses the user's requested subagent model; implementation tasks are sequential because they share shell styles.
