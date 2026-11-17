# Decision-Evidence Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build three equivalent synthetic browser-agent replay interfaces that progressively expose candidates and per-head probabilities, with common failure-localization responses.

**Architecture:** Implement one shared three-column workspace and pin its evidence condition on each feature branch. Generate permitted runtime fixtures from researcher-only canonical sources; bootstrap the app with validated projected data rather than importing richer authoring fixtures into the browser. Keep viewed replay selection and participant response state independent.

**Tech Stack:** Existing React 19.3.1, TypeScript 7, Vite 8.3.8, Zod 4.6.7, Bun scripts, Vitest/Testing Library, Playwright with installed Chrome; Node.js 22.18+ for direct TypeScript scripts. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-17-decision-evidence-frontend-design.md` — approved 2026-11-17.

## Global Constraints

- “All versions retain execution flow, human-readable action labels, and screenshots.”
- “Screenshots for a step show the page **before** that action.”
- “Experiment 2 additionally exposes per-candidate probabilities at both levels. Exclude the separately reported, undocumented `confidence` fields.”
- “Offer **Cannot determine**, but not **No mistaken action**.”
- “Submission is on-screen only. No response export, backend, or new response persistence.”
- Desktop minimum: 1280×720; verify 1280×720, 1366×768, and 1440×900 in both Chinese and English.
- One common synthetic run, identical pane geometry/navigation/defaults; no score-based sorting, coloring, bars, overlays, or correctness feedback.
- Operation candidates plus targets for the selected operation only; DONE/BLOCKED/WAIT/scroll require no target.
- Same actual task/report text, screenshots and truthful action labels across branches. Synthetic probabilities are not measured Jev outputs or correctness estimates.
- Preserve existing theme tokens, 14px minimum primary text, screenshot fit/actual-size behavior, and equal accept/reject styling.
- Keep authoring sources, researcher annotations, raw code/thinking, developer harnesses, and richer condition fixtures out of participant builds.
- Do not modify `jev-ultrafast`, deploy, add response telemetry/persistence, or implement stimulus allocation.
- Use an isolated implementation worktree. Preserve the original workspace's modified `.gitignore` and untracked neutral-theme documents; never stage them into this work.
- Temporary test staging belongs under the approved `%LOCALAPPDATA%\Temp\opencode` directory or the isolated worktree's ignored test output; never recursively remove broad paths.
- New modules shared with Node scripts use explicit `.ts` relative import extensions and `import type` for erased types. Keep them free of JSX, runtime enums, parameter properties, and browser-only side effects; do not add a TS runner dependency.

## Review Focus

1. Locale switch after a marked rejection draft must preserve episode IDs, verdict, mark, and participant-authored text — Task 6.
2. Repeated target labels and native-select options must remain distinct candidates rather than collapse to one element — Task 4.
3. Long Chinese text, 250+ illustrative rows, and a full explanation must leave controls keyboard-reachable at 1280×720 — Task 8.
4. Stale/mismatched projections, missing locale files, and malformed JSON must fail closed rather than reveal a richer fallback — Task 2.
5. An image URL returning 404 must show missing evidence without substituting an after-image, and switching to a healthy image must recover — Task 6.

---

## File Structure and Boundaries

| Files | Responsibility |
| --- | --- |
| `fixtures/decision-runs/shopping.{zh,en}.json` | Canonical synthetic authoring data, never browser-imported |
| `tests/fixtures/shopping.ground-truth.json` | Researcher-only earliest-error annotation, not runtime data |
| `src/domain/decision-run-schema.ts` | Canonical episode/observation schema and types |
| `src/domain/study-condition.ts`, `src/study-condition.ts` | Condition type and the branch's fixed condition |
| `src/domain/study-run-schema.ts`, `src/domain/project-run.ts` | Strict projected schemas and deterministic evidence projection |
| `scripts/study-fixtures.ts`, `scripts/prepare-study.ts` | Generate only the pinned runtime fixture set |
| `public/study/` (generated, ignored) | Manifest and permitted locale JSON; copied by Vite to `dist/study/` |
| `src/data/load-study-runs.ts` | Validate manifest/files/condition/locale identity before mounting |
| `src/domain/decision-replay.ts`, `src/domain/study-response.ts` | Pure replay transitions and response validation/reducer |
| `src/components/ui/{execution-rail,candidate-table,decision-inspector,study-response-form}.tsx` | New focused participant components |
| `src/i18n/study-messages.ts` | Typed bilingual study copy, attached to existing `Messages.study` |
| `src/bootstrap.tsx`, `src/App.tsx` | Loading/error boundary at startup, then common workspace composition |
| `src/components/ui/{browser-frame,replay-controls}.tsx` | Retained screenshot/replay primitives with structural input types |
| `src/styles/study.css` | New bounded layout/scroll rules, using existing tokens |
| `scripts/study-build.ts`, `scripts/{verify,compare}-study-builds.ts` | Production artifact and cross-branch equivalence checks |
| `tests/`, `e2e/` | Unit/component, production-browser, and artifact safeguards |

Keep the old `run-schema.ts`, `replay.ts`, fixture loader, and technical primitives for legacy showcase/unit coverage during migration. Do not import the old fixture loader from the new app entry. The existing `showcase.html` remains developer-only; do not add it as a production build input. This avoids destabilizing unrelated primitives while replacing the participant workspace.

## Shared Type Vocabulary

Names in this section are the interfaces later tasks consume, not optional alternatives.

- `StudyCondition = "baseline" | "candidates" | "probabilities"`; `studyCondition` is the exported constant in `src/study-condition.ts`, initially `"baseline"`.
- `Operation = "CLICK" | "TYPE_TEXT" | "SELECT" | "SCROLL_DOWN" | "SCROLL_UP" | "WAIT" | "DONE" | "BLOCKED"`.
- `Observation`: `id`, `url`, `title`, `capturedAt`, nullable `screenshot`; screenshots contain `path`, `width`, `height`, and `source: "synthetic-render"`.
- `EpisodeCore`: `id`, `ordinal`, `action`, `operation`, `executedAt`, `beforeObservationId`, `afterObservationId`, nullable factual `outcome: { kind: "observation" | "execution-error"; text: string }`, nullable `enteredText`.
- `Candidate`: `id`, localized `label`, nullable localized `context`; `ScoredCandidate` additionally has `probability`.
- `DecisionHead<T>`: ordered `offered: readonly T[]` and `selectedId`; a target head additionally identifies its `operation`.
- `DecisionRun`: `fixtureVersion: "decision-replay/1"`, `source: "synthetic"`, `runId`, `locale`, `task`, `report`, `initialObservationId`, `finalObservationId`, `observations`, and `episodes`; each canonical episode extends `EpisodeCore` with scored `operationHead` and nullable scored `targetHead`.
- `StudyRun`: strict union discriminated by `condition`, with `fixtureRevision` and the run's common fields. Baseline episodes are `EpisodeCore` only; candidates episodes add unscored heads; probabilities episodes add scored heads. Export `StudyEpisode = StudyRun["episodes"][number]`, `StudyRunCore` for common run fields/observations/core episodes excluding condition, revision and decision heads, and `StudyRuns = Readonly<Record<Locale, StudyRun>>`.
- `ViewedSelection = { kind: "final" } | { kind: "episode"; episodeId: string }`.
- `Localization = { kind: "unanswered" } | { kind: "cannot-determine" } | { kind: "episode"; episodeId: string }`.
- `StudyResponse`: `status: "pending" | "submitted"`, `verdict: "accepted" | "rejected" | null`, `localization`, `explanation`.
- `ResponseAction`: `verdict` with `verdict`; `localize` with `localization`; `mark` with `episodeId` (toggle); `explain` with `text`; or `submit`.
- `ResponseError = "verdict-required" | "localization-required" | "unknown-episode" | "explanation-required" | "explanation-too-long"`.

Use readonly inferred schema types and native React props, not a global store. Do not synchronize derived episode/index objects through effects; derive them from stable IDs during rendering.

### Task 1: Canonical decision episodes and coherent synthetic fixtures

**Files:** Create `src/domain/decision-run-schema.ts`, `fixtures/decision-runs/shopping.zh.json`, `fixtures/decision-runs/shopping.en.json`, `tests/fixtures/decision-runs.ts`, `tests/fixtures/shopping.ground-truth.json`, `tests/decision-run-schema.test.ts`. Read existing `scripts/fixture-pages.ts:234-250`, `tests/fixtures/agent-run.ground-truth.json`; do not overwrite the legacy fixtures.

**Interfaces:** Produces `decisionRunSchema`, `DecisionRun`, `Observation`, `EpisodeCore`, `Operation`, `Candidate`, `ScoredCandidate`, `DecisionHead<T>`. Test-only helpers: `canonicalRun(locale: Locale): DecisionRun` returns a fresh clone; `edgeRun(kind: "operation-error" | "blocked" | "controls" | "successful" | "recovered" | "repeated-targets" | "long-list" | "missing-image"): DecisionRun`.

- [ ] **Step 1: Establish isolation.** Invoke `using-git-worktrees` at execution time; create the implementation worktree on `study/baseline` from the approved planning revision. If the branch already exists, inspect/ask rather than resetting it. Install existing dependencies with `bun install --frozen-lockfile` if needed. Run the existing typecheck, lint, unit, and E2E suites once there; record pre-existing failures without fixing unrelated work.
- [ ] **Step 2: Write failing `validates canonical decision episodes` tests.** Assert eight episodes with IDs `episode-01`…`episode-08`, same IDs/head order/scores across locales, `episode-04` opening Cloud Walk, and terminal DONE. Assert the before-image sequence is `01-home`, `02-search-filled`, `03-results`, `04-sorted`, `05-product`, `06-size-selected`, `07-added`, `08-cart`; final observation is a separate `obs-08` referencing `08-cart`. Assert rejection of duplicate IDs, broken observation links, reversed times, missing selected IDs, target/operation mismatch, nonfinite/out-of-range scores, nonnormalized heads, non-argmax selections, and target heads on control/terminal operations.

  ```ts
  it("rejects a step whose before observation does not exist", () => {
    const run = canonicalRun("en")
    const episodes = run.episodes.map((episode) =>
      episode.id === "episode-04" ? { ...episode, beforeObservationId: "missing" } : episode,
    )
    expect(decisionRunSchema.safeParse({ ...run, episodes }).success).toBe(false)
  })
  ```

- [ ] **Step 3: Run `bun run test tests/decision-run-schema.test.ts`.** Expected: FAIL because the new module/data/contract are absent; fix test setup errors before treating a behavioral failure as red.
- [ ] **Step 4: Implement the schema, fixture pair, and test helpers.** Use strict Zod 4 objects and cross-field refinements. Set sum and argmax tolerances to `1e-6` for these synthetic fixtures. Restrict screenshot paths with `/^screenshots\/(?:en\/)?[a-z0-9-]+\.webp$/`, rejecting traversal/absolute URLs. Start with the store already open, use `obs-00`…`obs-08`, and validate `before.capturedAt <= executedAt <= after.capturedAt` plus each next before-reference matching the preceding after-reference. Keep the final report verbatim from each existing locale fixture. Researcher annotation identifies `episode-04`; no annotation is imported into runtime schema modules.
- [ ] **Step 5: Run the targeted tests and `bun run typecheck`.** Expected: PASS; existing app/legacy fixture tests still work. Inspect the reused screenshots against the new timeline; do not merely shift captions on old step objects.
- [ ] **Step 6: Commit only this deliverable:** `git add src/domain/decision-run-schema.ts fixtures/decision-runs tests/fixtures/decision-runs.ts tests/fixtures/shopping.ground-truth.json tests/decision-run-schema.test.ts`; `git commit -m "feat: model synthetic decision episodes and observations"`.

### Task 2: Fixed-condition runtime projections and fail-closed fixture loading

**Files:** Create `src/domain/study-condition.ts`, `src/study-condition.ts`, `src/domain/study-run-schema.ts`, `src/domain/project-run.ts`, `src/data/load-study-runs.ts`, `scripts/study-fixtures.ts`, `scripts/prepare-study.ts`, `tests/study-fixtures.test.ts`, `tests/load-study-runs.test.ts`. Modify isolated-worktree `.gitignore` and `package.json`; extend `tests/fixtures/decision-runs.ts`.

**Interfaces:** Consumes Task 1. Produces `studyRunSchema`, `studyManifestSchema`, `StudyManifest`, `StudyRun`, `StudyEpisode`, `StudyRuns`, `StudyRunCore`; `projectRun(run: DecisionRun, condition: StudyCondition, fixtureRevision: string): StudyRun`; `coreView(run: StudyRun): StudyRunCore`; `writeStudyFixtures(options: { condition: StudyCondition; outputDir: string }): Promise<StudyManifest>`; `loadStudyRuns(baseUrl: URL, expectedCondition: StudyCondition, fetcher?: typeof fetch): Promise<StudyRuns>`. Export manifest schema/type from `study-run-schema.ts`. `StudyManifest` contains `fixtureVersion`, `condition`, a SHA-256 `fixtureRevision` over both canonical source files in fixed zh/en order, and exactly `files: { zh: "run.zh.json"; en: "run.en.json" }`. Add test helper `studyRuns(condition: StudyCondition): StudyRuns`.

- [ ] **Step 1: Write failing projection/loader tests.** Across all three conditions assert equal `coreView` results and invariant candidate order between experiments; baseline episode keys exclude heads, candidate rows exclude `probability`, and no projection includes confidence/annotations. Generate to an owned temporary directory twice and assert byte-identical output. Reject forged manifest condition, richer/unexpected keys, locale/revision mismatch, missing file, HTTP error, invalid JSON, and mismatched locale episode/candidate structures; never fall back to the canonical/legacy fixture. Test relative base URLs.

  ```ts
  it("physically removes decision heads from baseline episodes", () => {
    const run = projectRun(canonicalRun("en"), "baseline", "0".repeat(64))
    expect(run.episodes.every((episode) => !("operationHead" in episode))).toBe(true)
    expect(run.episodes.every((episode) => !("targetHead" in episode))).toBe(true)
  })
  ```

- [ ] **Step 2: Run `bun run test tests/study-fixtures.test.ts tests/load-study-runs.test.ts`.** Expected: FAIL on absent projection/loading behavior.
- [ ] **Step 3: Implement the projection and generation boundary.** Project by explicit allowlists, not spreading canonical episodes then hiding fields. Validate each projected union and selected membership even when scores are absent. Write only the three fixed files in generated `public/study/`, ignoring that directory; no full source copy or alternate-condition payloads. Fail on unknown pre-existing files rather than deleting unrelated contents. `prepare-study.ts` reads only the checked-in `studyCondition`, calls the writer, and exits nonzero on failure. Add `prepare:study`; prefix existing `dev` and `build` scripts with `node scripts/prepare-study.ts`. Keep `base: "./"` and production entry behavior unchanged.
- [ ] **Step 4: Implement validated loading.** Fetch the manifest and two fixed locale files concurrently; resolve paths against the supplied base URL. Require the pinned condition, shared revision, expected locales, matching structural IDs/order, and valid observation links before returning. The generator is not imported into browser code. The loader never fetches authoring/annotation sources or accepts URL/storage condition overrides.
- [ ] **Step 5: Run targeted tests, `bun run prepare:study`, `bun run typecheck`, and `bun run build`.** Expected: PASS and exactly one baseline fixture set in `public/study/`/`dist/study/`. The participant entry is migrated in Task 6; do not deploy this intermediate build as the completed study UI.
- [ ] **Step 6: Commit these exact created/modified source/test/config paths, not generated JSON.** Message: `feat: project and load fixed-condition replay fixtures`.

### Task 3: Independent replay and judgment state machines

**Files:** Create `src/domain/decision-replay.ts`, `src/domain/study-response.ts`, `tests/decision-replay.test.ts`, `tests/study-response.test.ts`.

**Interfaces:** `initialViewedSelection(): ViewedSelection`; `previousViewedSelection(selection: ViewedSelection, episodeIds: readonly string[]): ViewedSelection`; `nextViewedSelection(...)` with the same parameters/return; `normalizeViewedSelection(...)` likewise; `viewedObservation(run: StudyRun, selection: ViewedSelection): Observation`. `initialStudyResponse(): StudyResponse`; `responseErrors(state: StudyResponse, episodeIds: readonly string[]): readonly ResponseError[]`; `updateStudyResponse(state: StudyResponse, action: ResponseAction, episodeIds: readonly string[]): StudyResponse`. Export all state/action/error types from their owning files.

- [ ] **Step 1: Write failing replay tests.** Initial selection is final; previous from final selects `episode-08`; terminal/final remain distinct despite identical screenshot pixels; arrows stop at boundaries; unknown viewed IDs normalize to final; before observation for `episode-04` is sorted results, not the product page.

  ```ts
  it("goes from final state to the terminal decision without conflating them", () => {
    const ids = canonicalRun("en").episodes.map((episode) => episode.id)
    expect(previousViewedSelection(initialViewedSelection(), ids)).toEqual({
      kind: "episode", episodeId: "episode-08",
    })
  })
  ```

- [ ] **Step 2: Write failing response truth-table tests.** No verdict cannot submit; rejected+unanswered cannot submit; rejected+Cannot determine can submit with empty explanation; either verdict+concrete episode requires nonblank explanation; accepted+unanswered may submit. Mark toggles/replaces without changing verdict; Cannot determine clears a concrete mark; edits preserve text; forged episode IDs do not become marks; whitespace-only and 501-character explanations fail. After successful submit every response action is ignored. Replay transitions never alter the response.

  ```ts
  it("permits rejection with uncertainty and no invented failure step", () => {
    const state = {
      ...initialStudyResponse(), verdict: "rejected",
      localization: { kind: "cannot-determine" },
    } as const
    expect(responseErrors(state, ["episode-04"])).toEqual([])
    expect(updateStudyResponse(state, { type: "submit" }, ["episode-04"]).status)
      .toBe("submitted")
  })
  ```

- [ ] **Step 3: Run `bun run test tests/decision-replay.test.ts tests/study-response.test.ts`.** Expected: FAIL on missing state-machine behavior.
- [ ] **Step 4: Implement the pure transitions and validators.** Keep explanation text unchanged for storage/display, use trim only to test nonblank, and enforce length at both reducer/validation and UI boundaries. Reject an over-limit explain action rather than silently truncating existing text. Invalid submit returns pending state unchanged. Do not add persistence, revision telemetry, repair calls, or correctness checks.
- [ ] **Step 5: Run both targeted tests and `bun run typecheck`.** Expected: PASS, including full accepted/rejected × localization × explanation coverage.
- [ ] **Step 6: Commit the four files.** Message: `feat: separate replay viewing from failure localization`.

### Task 4: Stable execution overview and two-level decision inspector

**Files:** Create `src/components/ui/execution-rail.tsx`, `src/components/ui/candidate-table.tsx`, `src/components/ui/decision-inspector.tsx`, `src/i18n/study-messages.ts`, `tests/decision-evidence.test.tsx`. Modify `src/i18n/messages.ts`; extend `tests/i18n.test.tsx` only for new copy.

**Interfaces:** `ExecutionRail({ episodes, viewed, localization, onView })`, where `episodes` is readonly `Pick<EpisodeCore, "id" | "ordinal" | "action">[]`, and `onView: (episodeId: string) => void`. `DecisionInspector({ run, viewed, response, onResponse })` uses Task 2/3 types and `onResponse: (action: ResponseAction) => void`. `CandidateTable(props: CandidateTableProps)` takes a `head` and localized `caption`; props are discriminated as unscored (`mode: "candidates"`) or scored (`mode: "probabilities"`). All return `React.JSX.Element`. Export `StudyMessages`, `zhStudyMessages`, `enStudyMessages`; add readonly `Messages.study`.

- [ ] **Step 1: Write failing component tests using `studyRuns(condition)`.** All conditions show the same action labels/outcome and separate viewed/marked labels. Baseline has no candidate tables; candidates has two tables with selected rows but no probability column; probabilities has the same rows/order and percentages at each level. Terminal/control episodes show only an operation table and “No target required.” Test repeated-label targets, separate SELECT options, a wrong-operation fixture, and unscored entered text. Candidate tables are read-only, not alternative action controls.

  ```tsx
  it("keeps same-label targets distinct without adding scores", () => {
    const head = {
      selectedId: "CLICK:shipping",
      offered: [
        { id: "CLICK:billing", label: "Edit", context: "Billing address" },
        { id: "CLICK:shipping", label: "Edit", context: "Shipping address" },
      ],
    }
    render(<LocaleProvider initialLocale="en">
      <CandidateTable mode="candidates" head={head} caption="Click targets" />
    </LocaleProvider>)
    expect(screen.getAllByText("Edit")).toHaveLength(2)
    expect(screen.getByText("Shipping address")).toBeVisible()
    expect(screen.queryByRole("columnheader", { name: "Probability" })).toBeNull()
  })
  ```

- [ ] **Step 2: Run `bun run test tests/decision-evidence.test.tsx`.** Expected: FAIL for absent components/copy.
- [ ] **Step 3: Implement the rail and inspector.** Render candidates in source order with stable IDs; never sort or collapse by label/element. Baseline inspector contains only common summary, mark control, and outcome. Final selection has no mark button. Submitted responses disable marking but not viewing. Display score columns only from the scored prop variant, with one decimal percent via locale-aware `Intl.NumberFormat`; no score-derived CSS. Contextual labels distinguish same-name targets.
- [ ] **Step 4: Add the bilingual copy contract.** Include execution overview, viewed step, original task, agent-reported result, before-step caption, final-state explanation, offered operations, offered targets, selected, no target required, mark/clear, your mark, synthetic provenance, conditional-score explanation, and rounding caveat. English localization prompt is “Which step contains the agent's earliest mistaken action?”; Chinese is “哪一步包含 Agent 最早的错误操作？”. Do not change legacy after-state keys still used by the showcase; add a new before-state key.
- [ ] **Step 5: Run targeted component/i18n tests and `bun run typecheck`.** Expected: PASS in both locales; baseline has no disclosure through hidden nodes, accessible names, titles, or data attributes.
- [ ] **Step 6: Commit the named component/copy/test files.** Message: `feat: add shared execution rail and decision evidence inspector`.

### Task 5: Common on-screen response form

**Files:** Create `src/components/ui/study-response-form.tsx`, `tests/study-response-form.test.tsx`. Extend `src/i18n/study-messages.ts`.

**Interfaces:** `StudyResponseForm({ episodes, state, onResponse })` returns `React.JSX.Element`; `episodes` has the rail's summary type, `state: StudyResponse`, `onResponse: (action: ResponseAction) => void`. No form-owned verdict/mark/explanation state.

- [ ] **Step 1: Write failing UI tests.** Assert equal neutral verdict buttons; no “No mistaken action” option; stable episode-ID option values plus Cannot determine; a persistent, visible explanation field with `maxLength=500`. The form reports Task 3 validation errors with accessible associations, preserves text when localization changes, and exposes the uncertainty helper without making its explanation required. Submission locks all judgment/mark inputs and announces a neutral on-screen-only status.

  ```tsx
  it("offers uncertainty without a no-mistake answer", () => {
    render(<LocaleProvider initialLocale="en">
      <StudyResponseForm episodes={canonicalRun("en").episodes}
        state={initialStudyResponse()} onResponse={vi.fn()} />
    </LocaleProvider>)
    expect(screen.getByRole("option", { name: "Cannot determine" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "No mistaken action" })).toBeNull()
    expect(screen.getByRole("textbox")).toHaveAttribute("maxLength", "500")
  })
  ```

- [ ] **Step 2: Run `bun run test tests/study-response-form.test.tsx`.** Expected: FAIL for absent form behavior.
- [ ] **Step 3: Implement the controlled form.** Reuse `ActionButton`; dispatch Task 3 actions only. Disable Submit until a verdict is chosen; after a verdict, permit a submit attempt to reveal required-field errors, but dispatch `submit` only when `responseErrors` is empty. Use focusable native select/textarea and an error summary/live region; do not invoke an API or download. Keep one explanation value with context-dependent helper text.
- [ ] **Step 4: Add bilingual form copy.** Reuse existing fulfill/reject and submit text. Add “Cannot determine” / “无法判断”, short-explanation prompts, per-error messages, optional/required indicators, and “Shown on this page only. Reloading clears your response.” / “评估仅显示在本页，刷新后将清除。” Preserve the existing no-order/no-rerun consequence.
- [ ] **Step 5: Run form/reducer tests and `bun run typecheck`.** Expected: PASS for acceptance, rejection with a marked explanation, and rejection with uncertainty. No storage/network/download callbacks exist.
- [ ] **Step 6: Commit the form, copy, and test.** Message: `feat: capture on-screen failure localization and diagnosis`.

### Task 6: Assemble layout B with correct before/final screenshot semantics

**Files:** Create `src/bootstrap.tsx`, `src/styles/study.css`, `tests/bootstrap.test.tsx`. Modify `src/main.tsx:1-24`, `src/App.tsx:42-208`, `src/components/ui/browser-frame.tsx:6-84`, `src/components/ui/replay-controls.tsx:6-79`, `src/styles/index.css`, `tests/workspace.test.tsx`, `tests/i18n.test.tsx`; extend screenshot primitive tests in `tests/primitives.test.tsx`.

**Interfaces:** `App({ runs }: { readonly runs: StudyRuns }): React.JSX.Element`. `mountStudyApp(element: HTMLElement, baseUrl: URL, condition: StudyCondition): Promise<void>` handles loading, success and safe error rendering. `BrowserFrame.pageState` becomes structural `{ url; title; capturedAt; screenshot: { path; width; height } | null }`; old PageState remains assignable. `ReplayControls.steps` becomes readonly `{ id: string; ordinal: number; action: string }[]`; keep its existing zero-based callback interface and derive indices from stable IDs in App.

- [ ] **Step 1: Replace superseded workspace assertions with failing integration tests.** Parameterize over the three projected conditions; test final initial view, before-step captions/images, common task/report/action labels, direct menu/rail/arrow agreement, mark independent of view/verdict, terminal marking, locked response with usable replay, and no technical disclosure/composer. Add draft and submitted locale-switch tests preserving ID, verdict, localization and unmodified user text. Test null screenshot and real `img` error followed by recovery on another path.

  ```tsx
  it("shows the before-image rather than the result of the selected action", async () => {
    window.history.replaceState({}, "", "/?lang=en")
    const user = userEvent.setup()
    render(<App runs={studyRuns("baseline")} />)
    await user.selectOptions(screen.getByRole("combobox", { name: "Jump to step" }), "3")
    expect(screen.getByText("Before step 4 of 8")).toBeVisible()
    expect(document.querySelector(".page-screenshot"))
      .toHaveAttribute("src", "screenshots/en/04-sorted.webp")
  })
  ```

- [ ] **Step 2: Add failing bootstrap tests and run targeted suites.** Assert only loading/error text before validation, successful App mount from projected data, and no fallback to the old fixture on malformed input. Run `bun run test tests/workspace.test.tsx tests/bootstrap.test.tsx tests/i18n.test.tsx tests/primitives.test.tsx`; expected: FAIL on the newly intended behavior, not import/setup errors.
- [ ] **Step 3: Assemble App from Tasks 2–5.** In `main.tsx`, call `mountStudyApp(rootElement, new URL(import.meta.env.BASE_URL, document.baseURI), studyCondition)`. Bootstrap loads and validates both locales once before mounting the workspace; show localized common loading/error notices, without raw exception payloads. App owns independent viewed selection and response reducer, never keys the workspace by locale, and derives screenshot/index/selected episode at render time. Use direct new-component imports. Remove raw fixture, old StepCard/DecisionFooter, chat-jump, and disabled-composer usage from the participant entry only. Preserve report/task text; identify the report as an agent claim.
- [ ] **Step 4: Implement before/final and failed-image handling in shared primitives.** App supplies `viewedObservation`, new before-caption copy, and the explicit final observation. BrowserFrame handles `onError` for the current path as missing evidence, keeps URL/title/caption, and restores healthy paths without using an after-frame fallback. Keep existing zoom mechanics and intrinsic dimensions. Adapt controls structurally without changing legacy showcase functionality.
- [ ] **Step 5: Add the bounded layout using existing tokens.** Grid columns: `clamp(12rem, 16vw, 14rem) minmax(0, 1fr) clamp(19rem, 25vw, 22rem)`. Header, context strip, main grid and response form are separate shell rows. Cap context at `clamp(6rem, 18dvh, 9rem)` and response at `clamp(10rem, 26dvh, 14rem)` with internal overflow when needed; each column uses `min-block-size: 0`/`min-inline-size: 0`. Preserve the 1280×720 fallback, 44px controls, theme, and primary-text minimum. Dimensions must not depend on the condition.
- [ ] **Step 6: Run the targeted suites, all Vitest tests, typecheck and build.** Expected: PASS. Leave old schema/reducer/primitives coverage intact; update only tests whose participant behavior the approved spec replaces. Production entry imports no canonical/legacy fixture source.
- [ ] **Step 7: Commit the named integration/styles/tests paths.** Message: `feat: assemble equivalent three-pane decision replay workspace`.

### Task 7: Production artifact exposure gate

**Files:** Create `scripts/study-build.ts`, `scripts/verify-study-builds.ts`, `tests/study-build.test.ts`, `tests/fixtures/study-builds.ts`. Modify `package.json`.

**Interfaces:** `verifyStudyBuild(directory: string, expectedCondition: StudyCondition): Promise<BuildReport>`; `BuildReport = { condition: StudyCondition; fixtureRevision: string; coreDigests: Readonly<Record<Locale, string>> }`. Export both from `scripts/study-build.ts`. CLI verifier defaults to current `dist`/pinned condition. Test-only `writeBuildFixture(condition: StudyCondition): Promise<string>` returns an owned temporary dist directory containing Task 2's generated fixtures plus minimal index/screenshot assets.

- [ ] **Step 1: Write failing artifact tests.** Test strict JSON exposure checks, mismatched manifest/pinned branch, canonical or annotation files copied into dist, missing screenshots, legacy fixture Python/thinking sentinels in emitted assets, and an accidentally emitted showcase HTML. Do not assert that the generic word “probability” is absent from JavaScript; generic schemas/copy are not leaked score data.

  ```ts
  it("rejects a richer fixture build for a baseline pin", async () => {
    const directory = await writeBuildFixture("probabilities")
    await expect(verifyStudyBuild(directory, "baseline")).rejects.toThrow(/condition/i)
  })
  ```

- [ ] **Step 2: Run `bun run test tests/study-build.test.ts`.** Expected: FAIL on missing verifier behavior.
- [ ] **Step 3: Implement the artifact verifier.** Parse `dist/study` with the runtime schema; check exact allowed fixture files and resolve every screenshot. Reject authoring/ground-truth/developer artifacts and legacy fixture-data sentinels. Return common-core digests for later comparison. Do not change production input selection to include the legacy showcase.
- [ ] **Step 4: Attach verification to build and preview.** Run `node scripts/verify-study-builds.ts` after Vite build and before preview, so stale wrong-condition output cannot be served. Do not emit source maps exposing authoring data.
- [ ] **Step 5: Run targeted tests, typecheck, lint and build.** Expected: PASS, including the built baseline artifact gate. Browser regression migration follows in Task 8; do not claim the old E2E expectations already describe the new UI.
- [ ] **Step 6: Commit the verifier, wrapper, tests/helper and script changes.** Message: `test: gate participant builds on permitted evidence`.

### Task 8: Production browser regression and cross-condition equivalence

**Files:** Create `scripts/compare-study-builds.ts`, `tests/study-comparison.test.ts`, `e2e/decision-evidence.e2e.ts`, `e2e/study-layout.e2e.ts`. Extend `scripts/study-build.ts`, `tests/fixtures/study-builds.ts`. Modify `e2e/workspace.e2e.ts`, `e2e/theme.e2e.ts`, `playwright.config.ts`, `README.md`, `DESIGN.md`.

**Interfaces:** Consumes Task 7's `BuildReport` and verifier. Add `compareStudyBuilds(directories: Readonly<Record<StudyCondition, string>>): Promise<void>` in `scripts/study-build.ts`; it takes worktree roots, validates their `dist/` folders, and compares common data plus browser reports. Comparator CLI takes three positional worktree paths in baseline/candidates/probabilities order.

- [ ] **Step 1: Write failing production-browser and comparison tests.** Inspect the pinned condition without any runtime override. Cover both heads/no-target terminals, no raw-code/thinking/score leaks, read-only tables, rejection validation, uncertainty, mark/view separation, reload clearing, and no judgment request/storage write. At each locale/viewport, test long CJK content, long illustrative candidate lists, 500-character explanations, keyboard access, distinct viewed/marked states, and image-request failure/recovery. Supply long-list/edge fixtures by intercepting permitted fixture requests in the test browser only; no debug route is shipped. Add comparator tests that reject mismatched common fields, experimental candidate order, missing reports, or pane bounds outside the 1px tolerance.

  ```ts
  test("viewing another action never moves the participant's mark", async ({ page }) => {
    await page.goto("/?lang=en")
    await page.getByRole("combobox", { name: "Jump to step" }).selectOption("3")
    await page.getByRole("button", { name: "Mark as earliest mistake", exact: true }).click()
    await page.getByRole("button", { name: "Next step", exact: true }).click()
    await expect(page.getByRole("combobox", { name: /earliest mistaken action/i }))
      .toHaveValue("episode-04")
  })
  ```

- [ ] **Step 2: Run `bun run test tests/study-comparison.test.ts` and `bun run test:e2e e2e/decision-evidence.e2e.ts e2e/study-layout.e2e.ts`.** Expected: failures identify absent safeguards/test support, not missing Chrome or a server of the wrong condition.
- [ ] **Step 3: Switch Playwright to production serving.** Its webServer must build then preview on port 4173 with `reuseExistingServer: false`, rather than attach to an arbitrary Vite dev server.
- [ ] **Step 4: Migrate existing E2E expectations intentionally.** Keep token/contrast helpers, equal-answer styling, focus, intrinsic screenshot dimensions/fit/zoom/unfiltered opacity, desktop fallback, and literal task/report checks. Replace after-action, Python-disclosure, disabled-composer, chat-footer and old pane-width assertions with the new B geometry/state behavior. Rejection symmetry tests must choose Cannot determine before submission. Do not drop an entire suite to make the redesign pass.
- [ ] **Step 5: Emit test-only equivalence reports and implement comparison.** Each layout case writes `test-results/study-equivalence/<locale>-<width>x<height>.json`, including condition, initial/final and viewed-episode-04 screenshot references, common control/pane bounds, and action order. Compare all six locale/viewport reports across branches within 1px for common outer/control bounds; compare semantic core digests and unscored candidate heads exactly. Do not compare inspector scrollHeight or persist participant answers.
- [ ] **Step 6: Run typecheck, lint, all unit tests, build, and full E2E suite.** Expected: PASS for the baseline pin, including artifact verification. Manually inspect matched captures with the task/report, historical view, concrete mark, uncertainty and submission at all supported sizes.
- [ ] **Step 7: Update README and DESIGN with the new evidence contract, generated fixtures, before/final semantics, on-screen-only limitations, fixed condition module and verification commands.** State that the one synthetic run is not a study-ready stimulus set or real Jev recording. Document developer-only legacy showcase access separately.
- [ ] **Step 8: Commit the browser/comparison/documentation deliverable.** Message: `test: enforce cross-condition browser equivalence`.

### Task 9: Produce and verify the three fixed-condition feature branches

**Files:** On derived branches, modify only `src/study-condition.ts`. Test existing commands/artifacts from Tasks 7–8. Record final commit IDs and verification outcomes in the implementation handoff, not participant UI.

**Interfaces:** Consumes the complete shared foundation on `study/baseline` and Tasks 7–8's verifier/comparator. Produces branches `study/baseline`, `study/candidates`, `study/probabilities`, sharing all implementation/fixture commits and differing only in the fixed pin.

- [ ] **Step 1: Run the full verification commands below on `study/baseline` and record its foundation commit SHA.** Expected: all PASS before branching. No incomplete shared work or unrelated changes are included.
- [ ] **Step 2: Using `using-git-worktrees`, create separate worktrees/branches `study/candidates` and `study/probabilities` from that exact SHA.** Do not overwrite existing branches/worktrees. Record their actual paths for the comparator and install existing dependencies with `bun install --frozen-lockfile` if needed.
- [ ] **Step 3: On each derived branch, demonstrate the pin mismatch before changing it.** Run `bun run build` while the pin is still baseline, since ignored output is not inherited by a fresh worktree. Call `verifyStudyBuild("./dist", "candidates")` or `verifyStudyBuild("./dist", "probabilities")` via Node importing `scripts/study-build.ts`; expected: rejection for condition mismatch. Then change only the constant to the branch's intended condition, regenerate fixtures and run the full verification commands there. Expected: all PASS with the correct runtime manifest.
- [ ] **Step 4: Commit each condition pin separately:** `git add src/study-condition.ts`; messages `feat: pin candidate-evidence study condition` and `feat: pin probability-evidence study condition`. Generated fixtures, dist and test reports remain ignored.
- [ ] **Step 5: Run `node scripts/compare-study-builds.ts "<baseline-worktree>" "<candidates-worktree>" "<probabilities-worktree>"` from any completed worktree.** Expected: PASS for fixture revision, common core, candidate ordering, six matched geometry reports and permitted exposure differences. Diff each derived branch against the foundation; only `src/study-condition.ts` should differ. If shared code needs a fix, apply one common commit to all branches without overwriting pins, rerun all affected verification, then rerun comparison.
- [ ] **Step 6: Obtain a final whole-branch review and hand off the three commit IDs, test results, and remaining prototype limits.** No automatic merge to main, deployment, real-run import, participant-data capture, or continuation into a main study.

## Verification Commands

Run separately in each isolated condition worktree; do not reuse a server or dist folder from another branch:

```powershell
bun run typecheck
bun run lint
bun run test
bun run build
bun run test:e2e
```

`build` must run the artifact verifier. The E2E config builds/previews its own branch and emits the comparison reports; comparison runs only after all three suites finish. Tests must never change the checked-in pin to simulate another condition. Pure projection/component tests may inject a condition directly without exposing that mechanism in the app.

## Self-Review / Coverage Record

- Spec sections 1–4 and 8–9: Tasks 1–2 establish synthetic episodes, two-head semantics, safe projections and fixture provenance.
- Sections 5–7: Tasks 3–6 implement layout B, before/final replay, independent marking, exact response rules, locale preservation and on-screen-only submission.
- Sections 10–12: Tasks 7–9 verify production exposure and equivalence, preserve unrelated coverage, document limits, and create the three pinned branches.
- All five Review Focus risks have explicit owning tests above. Runtime/generated files are not source imports or response exports.
- Intermediate legacy coexistence is deliberate; the participant entry is switched once in Task 6, and no intermediate build is a study deliverable.
- Self-review split artifact gating and browser equivalence into separate reviewable tasks, checked type/function names across task boundaries, and added concrete regression assertions for the identified risks.
- No product changes or branches are authorized by writing this plan. Execution requires the user's separate choice of method.

## Implementation References

- [Vite public assets and build base](https://vite.dev/guide/assets.html): generate projected files outside the import graph and resolve their URLs using `import.meta.env.BASE_URL`.
- [Node native TypeScript](https://nodejs.org/docs/latest-v22.x/api/typescript.html): explicit extensions, erased types, and supported syntax for the dependency-free scripts.
- [Zod 4 API](https://zod.dev/api): strict objects, discriminated unions and cross-field refinements.
- [React state preservation](https://react.dev/learn/preserving-and-resetting-state): preserve the workspace position/key while locale props change.
