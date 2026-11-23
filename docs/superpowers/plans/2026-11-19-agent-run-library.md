# Recorded Agent-Run Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single synthetic fixture with a static library of 44 recorded runs, a Chinese projection of each run, a home run picker, and a workspace without an invented agent report.

**Architecture:** A committed canonical library under `fixtures/agent-runs/` is produced once by a checked-in importer from the research trace folder. Each build validates the library, projects the build-time evidence condition, and emits `public/runs/index.json` plus one directory per run. The app fetches the index, opens `?run=<id>` or renders the picker.

**Tech Stack:** React 19, TypeScript, Vite, Zod 4, Vitest, Playwright, Node 22.18+ script execution, Bun package scripts.

**Spec:** `docs/superpowers/specs/2026-11-19-agent-run-library-design.md`

## Global Constraints

- `fixtureVersion` is exactly `decision-replay/2`.
- Canonical and runtime screenshot sources are exactly `recorded`.
- Both locales load the same English frames; no locale-specific screenshot directory check.
- No runtime file contains condition names of the source dataset (`clean`/`intv`), verdict data, scores, `confidence`, prompts, usage, or model identifiers.
- The picker never displays run id, family, trial role, condition, or score.
- Every translatable task/action must be present in `fixtures/agent-runs/translations.json`; missing keys fail the importer.
- Frames are copied byte-for-byte and keep their intrinsic dimensions.
- The participant workspace remains desktop-only at 1280 × 720 minimum.
- No backend, telemetry, persistence, or upload.

## Review Focus

- A run with zero final frame (step-capped) still renders a final observation from the last before frame.
- A run with duplicate consecutive frames still keeps distinct observations and stable replay.
- An empty or icon-only element label still produces a nonempty candidate label.
- A missing translation key fails the build instead of silently falling back to English.
- An unknown or traversal-like `?run` value fails closed and never reads outside `runs/`.

---

### Task 1: Schema v2 and report-free workspace

**Files:**

- Modify: `src/domain/decision-run-schema.ts`
- Modify: `src/domain/study-run-schema.ts`
- Modify: `src/domain/project-run.ts`
- Modify: `src/App.tsx`
- Modify: `src/i18n/study-messages.ts`
- Modify: `src/i18n/messages.ts`
- Modify: `src/styles/study.css`
- Modify: `fixtures/decision-runs/shopping.en.json`, `fixtures/decision-runs/shopping.zh.json`
- Modify: `tests/fixtures/decision-runs.ts`
- Modify: `tests/workspace.test.tsx`, `tests/decision-evidence.test.tsx`, `tests/i18n.test.tsx`

**Interfaces:**

- Produces: `DecisionRun` without `report`; `StudyRun` without `report`; `screenshotSchema` path `^(?:frames|screenshots)\/[A-Za-z0-9_.-]+\.(?:jpe?g|png|webp)$`; `source` union `"recorded" | "synthetic-render"`; `fixtureVersion` literal `"decision-replay/2"`.
- Produces: `StudyMessages` without `agentReportedResult`.

- [ ] **Step 1: Change the schema and fixture literals**

Remove `report` from both run schemas and `projectRun`. Change `fixtureVersion` to `"decision-replay/2"`. Keep `source` a union so test fixtures remain valid. Update the two shopping JSON fixtures: delete `report`, change `fixtureVersion`, keep synthetic paths.

- [ ] **Step 2: Remove the report panel**

Render one `.study-context-panel` article containing the task and the provenance note. Change `.study-context` to `grid-template-columns: minmax(0, 1fr)`. Delete `agentReportedResult` from both locale objects and the `StudyMessages` type.

- [ ] **Step 3: Update native tests**

Run: `bun run test -- tests/workspace.test.tsx tests/decision-evidence.test.tsx tests/i18n.test.tsx`
Expected: no assertion references `run.report` or "Agent-reported result"; all pass.

- [ ] **Step 4: Commit**

```bash
git add src/domain src/App.tsx src/i18n src/styles/study.css fixtures/decision-runs tests
git commit -m "refactor: remove the invented agent report from the workspace"
```

---

### Task 2: Run index and per-run loader

**Files:**

- Modify: `src/domain/study-run-schema.ts`
- Modify: `src/data/load-study-runs.ts`
- Modify: `tests/load-study-runs.test.ts`
- Modify: `tests/study-build.test.ts`

**Interfaces:**

- Produces:

  ```ts
  type RunTitle = { readonly zh: string; readonly en: string }
  type RunSummary = {
    readonly id: string
    readonly ordinal: number
    readonly steps: number
    readonly title: RunTitle
    readonly files: { readonly zh: "run.zh.json"; readonly en: "run.en.json" }
  }
  type StudyRunIndex = {
    readonly fixtureVersion: "decision-replay/2"
    readonly condition: StudyCondition
    readonly fixtureRevision: string
    readonly runs: readonly RunSummary[]
  }
  loadRunIndex(baseUrl: URL, expectedCondition: StudyCondition, fetcher?: typeof fetch): Promise<StudyRunIndex>
  loadStudyRun(baseUrl: URL, index: StudyRunIndex, runId: string, fetcher?: typeof fetch): Promise<StudyRuns>
  ```
- `loadStudyRun` fetches `runs/<id>/run.zh.json` and `run.en.json`, validates both, requires `fixtureRevision` and condition to match the index, and requires `run.runId === runId`.

- [ ] **Step 1: Write failing loader tests**

Assert: unknown id rejects; condition mismatch rejects; revision mismatch rejects; zh/en structure mismatch rejects; a valid index plus run pair resolves. Include a traversal-like id `../x` and assert rejection before any fetch.

- [ ] **Step 2: Implement the schemas and loader**

Add `studyRunIndexSchema` and `loadRunIndex`/`loadStudyRun`. Delete `assertLocaleScreenshotDirectories` and `assertMatchingStructure` locale-directory dependence; keep structure parity.

- [ ] **Step 3: Run tests**

Run: `bun run test -- tests/load-study-runs.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/domain/study-run-schema.ts src/data/load-study-runs.ts tests
git commit -m "feat: load a validated run index and individual recorded runs"
```

---

### Task 3: Importer, translations, and the canonical 44-run library

**Files:**

- Create: `scripts/agent-run-import.ts` (pure helpers)
- Create: `scripts/import-agent-runs.ts` (CLI)
- Create: `fixtures/agent-runs/translations.json`
- Create: `fixtures/agent-runs/manifest.json`
- Create: `fixtures/agent-runs/provenance.json`
- Create: `fixtures/agent-runs/<run_id>/run.{en,zh}.json` and `frames/*.jpg`
- Create: `tests/agent-run-import.test.ts`

**Interfaces:**

- Produces: `repairMojibake(value: string): string`; `translateRun(run: DecisionRun, translations: Translations): DecisionRun`; `buildCanonicalRun(input: { runId, meta, trace, translations, imageSize }): { en: DecisionRun; zh: DecisionRun }`.
- CLI: `node scripts/import-agent-runs.ts --source "<research>/stimuli/final" --out fixtures/agent-runs`.
- `translations.json` shape:

  ```json
  {
    "tasks": { "<exact English instruction>": "<Chinese>" },
    "actions": { "<exact English action>": "<Chinese or same English>" },
    "taskTitles": { "amazon_add_single_item": { "en": "…", "zh": "…" } },
    "roles": { "button": "按钮", "link": "链接", "textbox": "文本框", "combobox": "下拉框", "checkbox": "复选框", "radio": "单选按钮" },
    "operations": { "CLICK": "点击", "TYPE_TEXT": "输入文本", "SELECT": "选择", "SCROLL_DOWN": "向下滚动", "SCROLL_UP": "向上滚动", "WAIT": "等待", "DONE": "完成", "BLOCKED": "受阻" }
  }
  ```

- [ ] **Step 1: Write failing importer tests**

Use a small inline trace with one CLICK step and a mojibake action `Sort results â†’ Price: Low to High`. Assert: repaired action; English and Chinese tasks/actions; observation count; final frame reuse when `final_frame` is null; rejection when a probability list does not sum to one; rejection when an action has no translation.

- [ ] **Step 2: Implement the mapping**

Repair uses the cp1252 reverse map for `0x80–0x9F` and `Buffer.from(bytes).toString("utf8")`; skip when U+FFFD appears. Element labels keep the bracketed index. Context is `role` or `${role} · current: ${value}` in English and `${zhRole} · 当前值：${value}` in Chinese. Operation candidates use the fixed operation order.

- [ ] **Step 3: Fill translations and generate the library**

Emit missing keys with the CLI, translate all 22 tasks and 91 actions (literal UI labels may map to themselves), then run the importer against the research folder. Confirm 44 run directories, 447 episodes, and matching frame counts.

- [ ] **Step 4: Run tests and commit data**

Run: `bun run test -- tests/agent-run-import.test.ts`
Expected: PASS.

```bash
git add scripts fixtures/agent-runs tests/agent-run-import.test.ts
git commit -m "feat: import and translate the recorded agent-run library"
```

---

### Task 4: Home picker and query routing

**Files:**

- Create: `src/RunPicker.tsx`
- Create: `src/styles/run-picker.css`
- Modify: `src/styles/index.css`
- Modify: `src/bootstrap.tsx`
- Modify: `src/i18n/study-messages.ts`
- Modify: `tests/bootstrap.test.tsx`

**Interfaces:**

- Produces: `RunPicker({ index }: { index: StudyRunIndex })`; links built as `?run=<id>` while preserving existing query params.
- Consumes: `loadRunIndex`, `loadStudyRun`.

- [ ] **Step 1: Write failing picker tests**

Assert: no `run` param renders the picker with 44 links; a link points to `?run=<id>`; `?lang=zh` preserves the locale in the link; an unknown id renders the error state with a home link; the picker contains no `clean`, `intv`, `failure`, `catch`, or score text.

- [ ] **Step 2: Implement routing and picker**

Bootstrap always loads the index, then either renders the picker or loads the selected run. Use real `<a>` elements. Add localized copy: `chooseRun`, `chooseRunHint`, `runOrdinal(n)`, `runStepCount(n)`, `englishPageNote`, `backToRuns`, `unknownRunTitle`, `unknownRunHint`.

- [ ] **Step 3: Style the picker**

Two-column list above 800px, one column below. Reuse header, tokens, 44px targets, visible focus. No cards with shadows.

- [ ] **Step 4: Run tests and commit**

Run: `bun run test -- tests/bootstrap.test.tsx`
Expected: PASS.

```bash
git add src tests/bootstrap.test.tsx
git commit -m "feat: add a neutral run picker at the home URL"
```

---

### Task 5: Runtime library build and verification

**Files:**

- Create: `scripts/run-library.ts`
- Create: `scripts/prepare-runs.ts`
- Delete: `scripts/prepare-study.ts`, `scripts/study-fixtures.ts`, `tests/study-fixtures.test.ts` (replaced)
- Modify: `scripts/study-build.ts`
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `tests/run-library.test.ts`
- Modify: `tests/study-build.test.ts`

**Interfaces:**

- Produces: `writeRunLibrary({ condition, sourceDir: "fixtures/agent-runs", outputDir: "public/runs" }): Promise<StudyRunIndex>`.
- Produces: `verifyStudyBuild(directory, expectedCondition)` over the new layout; `BuildReport.coreDigests` covers every run.

- [ ] **Step 1: Write failing writer tests**

Assert: output index has 44 runs and the selected condition; baseline runs have no heads; candidates have unscored heads; probabilities have scored heads; frames are copied; a missing frame fails; a missing run file fails.

- [ ] **Step 2: Implement the writer and prepare script**

Read and validate the manifest and every canonical run. Project with `projectRun`. Write `public/runs/index.json` and `runs/<id>/run.{zh,en}.json`; copy `frames/` byte-for-byte. Clean the output directory first.

- [ ] **Step 3: Rewrite build verification**

Permit `runs/index.json`, `runs/<id>/run.{zh,en}.json`, `runs/<id>/frames/*.jpg|jpeg|png|webp`, assets, root files. Reject raw traces, verdicts, `confidence`, provenance, translations, and unexpected dirs. Validate every run and every frame. Compare all run cores and heads across conditions.

- [ ] **Step 4: Update scripts and run**

`dev`/`build`/`preview` call `node scripts/prepare-runs.ts`; `prepare:study` becomes `prepare:runs`; `public/runs/` is ignored.

Run: `bun run build`
Expected: typecheck, Vite build, and verification pass with 44 runs.

- [ ] **Step 5: Commit**

```bash
git add scripts package.json .gitignore tests
git commit -m "build: emit and verify the static recorded-run library"
```

---

### Task 6: E2E against a real recorded run

**Files:**

- Modify: `e2e/decision-evidence.e2e.ts`
- Modify: `e2e/study-layout.e2e.ts`
- Modify: `e2e/workspace.e2e.ts`
- Modify: `e2e/theme.e2e.ts`
- Delete: `e2e/study-fixtures.ts`
- Create: `e2e/run-picker.e2e.ts`

**Interfaces:**

- Representative run: `F1_add_single_item_clean` (4 episodes, English frames).
- URLs: `/?run=F1_add_single_item_clean&lang=en|zh`.

- [ ] **Step 1: Update picker test**

Open `/`, assert 44 links, no condition/score text, click a run, assert the workspace and `?run=` URL.

- [ ] **Step 2: Update workspace tests**

Replace 8-step expectations with the representative run's 4 steps, `frames/pre_0003.jpg` history, and `frames/final.jpg` final state. Keep response, locale, missing-image, and no-persistence checks.

- [ ] **Step 3: Update layout reports**

Use the representative run; keep the three viewports and six reports. Assert overflow, focus, marking, and response behavior. Read `episode04` from the 4th rail item.

- [ ] **Step 4: Run E2E**

Run: `bun run test:e2e`
Expected: all suites pass in Chrome.

- [ ] **Step 5: Commit**

```bash
git add e2e
git commit -m "test: exercise the participant workspace with a recorded run"
```

---

### Task 7: Documentation and final verification

**Files:**

- Modify: `README.md`
- Modify: `DESIGN.md`
- Modify: `docs/superpowers/specs/2026-11-19-agent-run-library-design.md` (status only if needed)

- [ ] **Step 1: Update docs**

Describe the library, importer, picker, translation policy, `public/runs/`, and the removal of the report. Remove "synthetic" claims that now describe real data; keep them for test fixtures.

- [ ] **Step 2: Run the full gate**

Run: `bun run lint && bun run typecheck && bun run test && bun run build && bun run test:e2e`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add README.md DESIGN.md docs
git commit -m "docs: document the recorded-run library and picker"
```
