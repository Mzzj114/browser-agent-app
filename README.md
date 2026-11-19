# 浏览助手 (Browser Agent App)

An HCI research prototype for reviewing a recorded browser-agent run and judging it against the original request. The participant workspace shows the original task, the agent's own completion claim, a chronological execution rail, the page state **before** each action, and the evidence inspector for that step.

> Built with React 19, TypeScript, Vite, and Bun. E2E uses the installed Google Chrome.

## Evidence contract

- One shared three-pane workspace: execution rail, recorded-page pane, and viewed-step inspector. The original task, the agent-reported result, and the on-screen response form are separate shell regions.
- All conditions keep the same action labels, screenshots, rail order, task/report text, geometry, and replay behavior.
- The compact layout reserves the independently scrolling inspector for evidence and keeps the assessment visible below the workspace. Browser metadata uses two compact rows; the screenshot fits both available dimensions without cropping or normal image-well scrolling. Click it for scrollable native-pixel inspection.
- The execution rail is the only replay navigation. **Final state** is its last item, in the same scrolling list and with the same selection styling as the steps. The initial view is the explicit final observation; it is not a numbered action and cannot be marked.
- Selecting an episode shows the page **before** that action. A missing image is reported as missing evidence; the after-state is never substituted.
- Screenshots keep their intrinsic dimensions and fit/actual-size zoom behavior in every condition.
- The assessment's **earliest mistaken action** select is the only marking control, independent of the viewed page and of accept/reject. A participant can mark at most one episode. Cannot determine or clearing the select removes a concrete mark without moving the replay.
- The response form requires accept/reject, requires a concrete episode or Cannot determine for rejection, and requires a nonblank explanation for a marked episode. The explanation limit is 500 characters. Submission is on-screen only; reload clears the judgment, and there is no export, backend, telemetry, or response persistence.
- Locale switching keeps the stable viewed episode, mark, verdict, and participant-authored explanation.
- The condition is inlined at build time from `VITE_STUDY_CONDITION` (default `baseline`); it cannot be selected from a URL, query string, or browser storage.

## Conditions

| Condition       | Participant evidence                                            |
| --------------- | --------------------------------------------------------------- |
| `baseline`      | Execution flow, labeled actions, screenshots                    |
| `candidates`    | Baseline plus offered operations and selected-operation targets |
| `probabilities` | Candidates plus per-head synthetic probabilities at both levels |

Experiment 2 additionally exposes per-candidate probabilities at both levels. The undocumented `confidence` fields are excluded. Probabilities apply only within one operation or target list and are not correctness estimates or overall action scores.

## Fixtures and provenance

- Canonical bilingual authoring data lives in `fixtures/decision-runs/shopping.{zh,en}.json` and is never imported by the participant entry.
- `bun run prepare:study` projects the selected condition into `public/study/` (`manifest.json`, `run.zh.json`, `run.en.json`). `public/study/` is generated and ignored by Git.
- The loader validates the manifest condition, both locales, the fixture revision, strict key surfaces, and zh/en structural parity before mounting. Missing, malformed, stale, or richer fixtures fail closed; there is no legacy/richer fallback.
- The one shipped synthetic shopping run is an interface-development example. It is **not** a study-ready stimulus set, a real Jev recording, or measured model output. The probabilities are synthetic.

## Getting started

Requires [Bun](https://bun.sh/), Node.js 22.18+ for direct TypeScript scripts, and Google Chrome for E2E.

```sh
bun install
bun run dev        # prepares the pinned fixtures, then http://127.0.0.1:5173
```

## Deploying the study sites

`bun run build:sites` builds the same source three times, once per condition, into `dist/baseline/`, `dist/candidates/`, and `dist/probabilities/`, verifies each build, and writes a root condition picker plus `robots.txt`. `vercel.json` sets `trailingSlash` so relative asset and fixture URLs resolve inside each condition directory, and marks every response `noindex`.

The linked Vercel project serves:

- `/baseline/`
- `/candidates/`
- `/probabilities/`

## Scripts

| Command                                                                        | Purpose                                                                              |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `bun run dev`                                                                  | Prepare the pinned fixture projection and start Vite                                 |
| `bun run build`                                                                | Prepare fixtures, typecheck, build, and verify the emitted participant artifacts     |
| `bun run build:sites`                                                          | Build and verify all three condition sites into `dist/<condition>/`                  |
| `bun run preview`                                                              | Verify the build and serve it with Vite preview                                      |
| `bun run prepare:study`                                                        | Project the checked-in condition into `public/study/`                                |
| `bun run screenshots`                                                          | Regenerate Chinese and English fixture screenshots                                   |
| `bun run typecheck`                                                            | Run `tsc --noEmit`                                                                   |
| `bun run lint`                                                                 | Run Biome checks                                                                     |
| `bun run format`                                                               | Format with Biome                                                                    |
| `bun run test`                                                                 | Run Vitest unit/component tests                                                      |
| `bun run test:e2e`                                                             | Build, verify, preview on port 4173, and run Playwright in Chrome                    |
| `node scripts/verify-study-builds.ts`                                          | Verify the emitted build's condition, fixtures, screenshots, and permitted artifacts |
| `node scripts/compare-study-builds.ts <baseline> <candidates> <probabilities>` | Compare three completed worktrees' builds and six browser-equivalence reports        |

The Playwright configuration always builds and previews the production output on port 4173 with `reuseExistingServer: false`. It never attaches to an arbitrary dev server.

## Artifact and equivalence verification

`bun run build` runs `scripts/verify-study-builds.ts` after Vite. It requires exactly the three permitted study JSON files in `dist/study`, resolves every referenced screenshot, rejects authoring/annotation/developer/map artifacts and legacy technical sentinels, and returns the pinned condition, fixture revision, and common-core digests.

The layout suite writes six ignored reports to `test-results/study-equivalence/<locale>-<width>x<height>.json` for 1280×720, 1366×768, and 1440×900 in both locales. Each report contains the condition, initial/final/episode-04 screenshot references, common pane and control bounds, and rail action order. It never contains inspector `scrollHeight` or participant answers.

`compareStudyBuilds` / the comparator CLI validates all six reports for every condition, checks common fixture revision and semantic core digests, compares unscored candidate order and selection between `candidates` and `probabilities`, and requires common bounds to match within 1px. Run it after all three fixed-condition worktrees have completed their own build and E2E suites.

The layout suite also captures ignored inspection images under `test-results/study-evidence/<locale>-<width>x<height>/` for the initial, historical-mark, uncertainty, and submitted states.

## Project layout

```text
src/
  App.tsx                    three-pane decision replay workspace
  bootstrap.tsx              validated loading and safe error boundary
  study-condition.ts         checked-in fixed condition
  components/ui/             rail, browser frame, candidate table, inspector, response form
  data/                      validated projected-fixture loader
  domain/                    decision run, replay, response, and projection contracts
  i18n/                      bilingual interface and study copy
  styles/                    design tokens and bounded study layout
fixtures/decision-runs/      canonical authoring data (never participant-imported)
scripts/                     projection, build verification, comparison, screenshots
tests/                       Vitest unit/component and artifact tests
e2e/                         production-browser regression suites
public/screenshots/          recorded synthetic page screenshots
DESIGN.md                    design system and interaction rules
```

Open `/showcase.html` only as a developer-only legacy component showcase. It is not a participant route and is not a production build input.

## Regenerating screenshots

```sh
bun run screenshots
```

This renders the Chinese and English fixture pages from `scripts/fixture-pages.ts` in headless Chrome and writes WebP files to `public/screenshots/` and `public/screenshots/en/`. The script runs under Node.js 22.18+ (direct TypeScript execution); use Node rather than Bun because Playwright's browser launch can hang under Bun.
