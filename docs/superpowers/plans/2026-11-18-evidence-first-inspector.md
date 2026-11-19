# Evidence-first Inspector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** Implement approved Option A with Final state last in the same scrolling rail.

**Architecture:** Keep viewing and response state in App. Add a final-view callback to ExecutionRail, remove the replay header, and make DecisionInspector read-only. Keep the existing assessment select as the single marking surface.

**Tech Stack:** React, TypeScript, CSS, Testing Library, Vitest, Bun/Vite.

**Spec:** `docs/superpowers/specs/2026-11-18-evidence-first-inspector-design.md`

## Global Constraints
- Final state is the last item in the SAME scrolling execution list, using the same item style and selection treatment as episodes; no fixed footer or extra step number.
- Initial view remains final state; final state cannot be marked.
- Navigation and marking remain independent; submission locks the form, not navigation.
- All three conditions share layout; do not change fixture data, domain logic, evidence order/semantics, dependencies, or pinned condition.
- Retain existing compact viewer work and other uncommitted changes.
- Skip visual/E2E execution; keep unit/build checks. Leave uncommitted on the existing fork.

## Review Focus
- Final state must be inside the episode list and last, with only one currently viewed item.
- Choosing another episode or final must preserve a concrete mark and submitted response.
- The earliest-mistake select must remain the only marking control, with no final option.
- English/Chinese switching must preserve the viewed and marked IDs and participant text.
- Candidates/probabilities must retain their authored tables and selected markers without inspector controls.

## Task 1: Deduplicate participant navigation and marking

**Files:** Modify `src/App.tsx`, `src/components/ui/execution-rail.tsx`, `src/components/ui/decision-inspector.tsx`, `src/styles/study.css`, `tests/workspace.test.tsx`, `tests/decision-evidence.test.tsx`.

**Interfaces:** Add required `onFinal: () => void` to ExecutionRail. Keep `onView: (episodeId: string) => void`. Reduce DecisionInspector to `{ run: StudyRun, viewed: ViewedSelection }`. Keep StudyResponseForm's existing interface. Retain standalone ReplayControls and domain helpers for other callers/tests; no unrelated deletion.

- [x] Write a failing component test for same-list last Final state navigation and independent marking, plus absence of participant replay/mark controls.
- [x] Confirm intended RED: new same-list final-state test failed in all three conditions (expected 9 list items, got 8).
- [x] Wire `onFinal` from App, append the final list item with existing item styling and accessible current state, remove inspector replay and response props, and make inspector a single bounded scroll region. Remove obsolete inspector-only CSS.
- [x] Update existing component tests to navigate by rail and mark via the assessment select; retain coverage of before-images, final unmarkability, all conditions, locale, uncertainty/clearing and post-submit navigation.
- [x] Run focused tests (58 passing), full suite (329 passing), production build, and targeted Biome checks (10 source/test/E2E files clean).

## Controller maintenance and completion
- [x] Align README/DESIGN and current compact-layout documentation with the new navigation.
- [x] Update obsolete E2E locators and expectations only; do not run browsers.
- [x] Read-only source review of this change, without repeated verification or reviewing prior compact-layout work again: spec and quality PASS, no Critical/Important findings.
- [x] Record results and leave the fork uncommitted for manual inspection.

## Completion
Controller independently verified 16 test files / 329 tests passing, production build
(typecheck, Vite, baseline artifact verification), targeted Biome (10 files), and
`git diff --check`. Visual/E2E/AT verification was not performed, as requested.
Source review found no blocking issues. Optional test-hardening and unused-label cleanup
were left out to keep the approved small scope.

## Execution decision
The user said implement and continue, with no visual/E2E verification. Use one DeepSeek implementation pass and one source review; do not reopen design or plan approval.
