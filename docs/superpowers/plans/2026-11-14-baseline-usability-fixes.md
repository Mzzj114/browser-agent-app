# Baseline Usability Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the essential shared-baseline usability issues B01–B06, B09–B10 identified in `research/baseline-usability-fixes.md` without adding report-exposure or repair behaviour.

**Architecture:** Extend the recorded-run fixture with a factual `action` label per step, then make that label the primary evidence index. Demote Python and model rationale into a secondary technical-details disclosure, give screenshots explicit step provenance, move replay controls into a dedicated bar with a step jump menu, and keep the verbatim task plus step navigation inside the enlarged viewer. Replace the one-click irreversible decision with tentative selection + explicit submission + optional reason.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + Testing Library, Playwright, Zod, plain CSS.

**Spec:** `C:\Users\mzzj\Documents\学习\HCI Research\research\baseline-usability-fixes.md`

## Global Constraints

- Keep the original task verbatim; never generate a checklist or requirement decomposition.
- Never show a correctness verdict, success badge, or error diagnosis.
- Accept and reject choices keep comparable visual emphasis.
- Preserve native-resolution screenshots and zoom/pan; do not add a contact sheet.
- Do not implement repair, rerun, order placement, or report-hiding behaviour.
- B07/B08 are optional and are intentionally deferred until a pilot justifies them.
- Interface copy must exist in both Chinese and English.
- All interactive targets keep the existing 44px minimum and visible focus.

## Review Focus

- A participant cannot read an action without opening technical details.
- A participant mistakes a historical frame for a fresh live state.
- A participant believes clicking Accept/Reject immediately submits an irreversible judgment.
- A participant loses the original task while comparing zoomed frames.
- A participant cannot move between steps in the enlarged viewer.

---

### Task 1: Action labels and technical-code sanitation

**Files:**

- Modify: `src/domain/run-schema.ts`
- Modify: `src/data/agent-run.json`, `src/data/agent-run.en.json`
- Create: `src/domain/technical-details.ts`
- Test: `tests/fixture.test.ts`, `tests/technical-details.test.ts`

**Interfaces:**

- Produces: `AgentStep["action"]: string`
- Produces: `sanitizeTechnicalCode(code: string, placeholder: string): string`

- [x] Add `action: z.string().min(1)` to `stepSchema`.
- [x] Add the eight factual labels to both fixtures.
- [x] Write a failing test asserting each fixture step has a non-empty action label.
- [x] Write a failing test asserting `finish(result="…")` is replaced with the placeholder while other code is unchanged.
- [x] Implement `sanitizeTechnicalCode` with a regex limited to `finish` / `finish_from_repl` string arguments.
- [x] Run `bun run test`.

### Task 2: Two-phase decision state

**Files:**

- Modify: `src/domain/replay.ts`
- Test: `tests/replay.test.ts`

**Interfaces:**

- Produces: `DecisionState = { status: "pending" | "submitted"; choice: DecisionChoice | null; reason: string; revisions: number }`
- Produces: `DecisionAction = {type:"select",choice} | {type:"reason",reason} | {type:"submit"}`
- Produces: `initialDecisionState(): DecisionState`
- Produces: `updateDecision(state: DecisionState, action: DecisionAction): DecisionState`

- [x] Failing tests: selecting does not submit; changing selection increments `revisions`; reason edits are kept; submit locks; later actions are ignored; submit with no choice is ignored.
- [x] Implement the reducer.
- [x] Run `bun run test tests/replay.test.ts`.

### Task 3: Bilingual copy catalogue

**Files:**

- Modify: `src/i18n/messages.ts`
- Test: `tests/i18n.test.tsx` (compile-level coverage)

- [x] Add keys for recorded execution, step provenance, last recorded state, technical details, full-size viewing, jump menu, dialog task/navigation, decision explanation/submission/reason, and inspection hint.
- [x] Change the decision question to fulfilment of the original request and rename decision choices accordingly.
- [x] Replace “Final state” wording with “Last recorded state”.
- [x] Run `bun run typecheck` after Tasks 4–8 consume the keys.

### Task 4: Action-first StepCard with technical details

**Files:**

- Modify: `src/components/ui/step-card.tsx`
- Modify: `src/components/ui/code-cell.tsx` (accept display code)
- Modify: `src/styles/execution.css`
- Test: `tests/primitives.test.tsx`, `tests/workspace.test.tsx`

- [x] Failing test: step header shows `Step N` and the factual action; Python is absent until “Technical details” is opened.
- [x] Failing test: opening technical details reveals the sanitized cell code and the nested thinking disclosure.
- [x] Render the action as the primary heading and keep “View page” as the affordance.
- [x] Wrap thinking and cells in a single `technicalDetails(cellCount)` disclosure; sanitize each code string with `technicalFinalReportRedacted`.

### Task 5: Evidence identity, replay bar, step jump

**Files:**

- Modify: `src/components/ui/browser-frame.tsx`
- Modify: `src/components/ui/replay-controls.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/browser.css`, `src/styles/workspace.css`
- Test: `tests/primitives.test.tsx`, `tests/workspace.test.tsx`

- [x] Failing test: the browser region names the recorded execution and the step count.
- [x] Failing test: a historical frame is labelled “recorded after this step”; the endpoint is labelled “Last recorded state”.
- [x] Failing test: the step menu jumps directly to a chosen step.
- [x] Move replay controls out of the browser chrome into a separate replay bar.
- [x] Add an evidence caption row (state label, action, capture time, full-size action).
- [x] Make the screenshot itself a full-size trigger.

### Task 6: Enlarged viewer keeps task, identity, and navigation

**Files:**

- Modify: `src/components/ui/screenshot-dialog.tsx`
- Modify: `src/styles/browser.css`
- Test: `tests/primitives.test.tsx`

- [x] Failing test: the dialog shows the verbatim task while the image is enlarged.
- [x] Failing test: the dialog shows the step identity and can move to the previous/next/final state without closing.
- [x] Failing test: “Actual size” restores 100%.
- [x] Add the pinned task strip, four-row dialog grid, and reuse of replay navigation.

### Task 7: Tentative selection, explicit submission, optional reason

**Files:**

- Modify: `src/components/ui/decision-footer.tsx`
- Modify: `src/styles/controls.css`
- Modify: `src/App.tsx`
- Test: `tests/primitives.test.tsx`, `tests/workspace.test.tsx`
- Test: `tests/i18n.test.tsx`

- [x] Failing test: selecting shows the tentative status and keeps submission available; both choices remain enabled.
- [x] Failing test: changing choice updates the tentative status and revision count.
- [x] Failing test: submitting locks both choices and shows the submitted status.
- [x] Failing test: the explanation states submission does not order, rerun, or repair.
- [x] Implement the controlled two-phase footer driven by `updateDecision`.

### Task 8: Workspace wiring, inspection hint, visual polish

**Files:**

- Modify: `src/App.tsx`, `src/showcase.tsx`
- Modify: `src/styles/workspace.css`, `src/styles/execution.css`, `src/styles/controls.css`
- Test: `tests/workspace.test.tsx`

- [x] Wire dialog navigation to the existing selection and keep it open across steps.
- [x] Add a neutral, task-agnostic inspection hint above the execution history.
- [x] Update the showcase to the new props/state.
- [x] Run `bun run typecheck && bun run lint && bun run test`.

### Task 9: End-to-end and build verification

**Files:**

- Modify: `e2e/workspace.e2e.ts`

- [x] Update e2e selectors for action labels, replay bar, tentative/submitted decisions, and viewer navigation.
- [x] Run `bun run build`.
- [x] Run `bun run test:e2e`.
- [x] Record any remaining manual-pilot items (practice task, optional B07/B08).

---

## Verification results (2026-11-14)

- `bun run typecheck`: PASS
- `bun run test`: 6 files, 63 tests PASS
- `bun run build`: PASS
- `bun run test:e2e`: 9 Playwright tests PASS
- `bunx biome check` on all changed source/test files: PASS
- Visual inspection at 1280x720, 1366x768, and in the enlarged viewer: no page-level overflow; the replay bar stays on one row; action labels, evidence provenance, tentative/submitted decisions, and viewer navigation are visible.

## Deliberately deferred

- **B07 / B08** remain optional per the issue inventory; no change overlay or two-frame pinning was added before a pilot justifies the extra baseline complexity.
- **A separate in-app practice run** was not added. The task-agnostic inspection hint explains navigation and full-size viewing; the formal practice procedure still belongs to the study protocol.
- **G01–G04 decision items** (report exposure rules, a third “insufficient evidence” response, repair) were not implemented because they change the response space or the experimental manipulation.
