# 浏览助手 (Browser Agent App)

An HCI research prototype for reviewing a recorded browser-agent run and judging it against the original request. The participant workspace shows the original task, a chronological execution rail, the page state **before** each action, and that step's evidence immediately below the screenshot. A home picker lists the recorded runs.

> Built with React 19, TypeScript, Vite, and Bun. E2E uses the installed Google Chrome.

## Evidence contract

- One shared two-column workspace: a quiet chronological step rail beside a single white review panel that holds the screenshot followed immediately by that step's evidence. The compact task strip sits above the workspace and stays pinned under the header; the response form sits below the review panel in the page flow, so participants scroll the page to reach it.
- The agent is decision-model driven and writes no final answer. The workspace therefore has no agent-reported result panel.
- All conditions keep the same action labels, screenshots, rail order, task text, shared geometry, and replay behavior.
- The original task is a native disclosure. Its collapsed summary is one visually clipped line of the exact recorded task; expanding it replaces that excerpt with the complete task text, so the task never appears twice. A long task scrolls inside the strip and is never truncated in the DOM.
- The page is the only normal scroll container. The review panel grows with its content, and the screenshot fills the panel width at its intrinsic aspect ratio, so the step evidence and the response form sit below the fold. Fit mode never crops or scrolls inside the image well; clicking the screenshot still opens native-pixel inspection, which scrolls inside the image well when the panel is narrower than the image.
- The study page uses a compact 44px browser caption: the recorded-state label on the left and a text-style **Zoom**/**Fit** control on the right with a full 44×44px target. The full `BrowserFrame` variant keeps title, read-only URL, capture time, and recorded-not-live metadata for other surfaces such as the developer showcase.
- The execution rail is the only replay navigation. It has a visible **Steps** heading, compact rows, and a subtle highlighted current row. **Final state** is its last item, in the same scrolling list and with the same selection styling as the steps. The rail is capped at the review page's height and scrolls internally only when the steps outgrow the page, so a short run shows every step. The initial view is the explicit final observation; it is not a numbered action.
- Selecting an episode shows the page **before** that action. Selection resets the page scroll to the top without moving keyboard focus from the rail. A missing image is reported as missing evidence; the after-state is never substituted.
- Screenshots keep their intrinsic dimensions and fit/actual-size zoom behavior in every condition.
- Choice-bearing conditions show the chosen action and, when the step has one, the chosen page element as two side-by-side cards under the screenshot. Each card carries a small heading and the chosen label; up to three alternatives follow as compact chips, with the remaining offered options behind a per-group dashed count/expand chip. Numeric probabilities are never displayed.
- Display labels drop a leading raw candidate identifier such as `[39] `; the stable `data-candidate-id` and underlying label data are preserved.
- Confidence is the value the agent reported for the chosen operation and chosen target. It appears only on chosen cards in `probabilities`, right-aligned as a large percentage with a small **Confidence** caption, separately from selection probability, and is not a check that the choice was correct.
- The response form has **Accept**, **Reject**, an optional explanation (500 characters) for either verdict, and **Submit**. Demo links keep the response on-screen only: reload clears the judgment, with no export, backend, telemetry, or persistence. Study links instead save the completed response to a local queue and insert one row into the `study_submissions` table; see [Study links and data collection](#study-links-and-data-collection).
- Locale switching keeps the stable viewed episode, verdict, and participant-authored explanation. Interface copy, tasks, actions, and role context switch; literal page text and screenshots stay English.
- The condition is inlined at build time from `VITE_STUDY_CONDITION` (default `baseline`); it cannot be selected from a URL, query string, or browser storage.

## Conditions

| Condition       | Participant evidence                                                           |
| --------------- | ------------------------------------------------------------------------------ |
| `baseline`      | Task, steps, screenshots, and factual action/outcome details                   |
| `candidates`    | Baseline plus side-by-side chosen cards and compact unchosen alternative chips |
| `probabilities` | The same cards and order plus agent-reported confidence on chosen cards only   |

Selection probabilities are the decision model's recorded outputs used to rank the alternatives. They stay in the scored fixtures but are never displayed and are not correctness estimates. Confidence is a separate agent-reported value on chosen cards; it is not a probability of being right.

## Recorded-run library

- The canonical library lives in `fixtures/agent-runs/`: `manifest.json`, `translations.json`, `provenance.json`, and one directory per run with `run.en.json`, `run.zh.json`, and `frames/`.
- `scripts/import-agent-runs.ts` rebuilds the library from a collected research directory. It repairs cp1252 mojibake, maps trace steps and decisions to the replay contract, applies the exact-match Chinese dictionary, and fails on a missing translation, missing or invalid recorded confidence, or invalid probability head.
- The 44 committed runs are recorded stimulus material from the decision-model browser agent. Both locales share the same English JPEG evidence. Step-capped runs without a post-run frame reuse the last before frame as the explicit final observation.
- `bun run prepare:runs` validates the library, projects the selected evidence condition, and writes `public/runs/` (`index.json`, one directory per run). `public/runs/` is generated and ignored by Git.
- The loader validates the index condition and revision, per-run locale and step count, zh/en structural parity, and every referenced frame at build time. Missing, malformed, stale, or extra artifacts fail closed.
- The home URL lists runs with neutral titles and ordinals. `?run=<run_id>` opens one; unknown ids fail closed with a return to the list. The picker does not expose run ids, source condition, family, trial role, or evaluator score.

## Getting started

Requires [Bun](https://bun.sh/), Node.js 22.18+ for direct TypeScript scripts, and Google Chrome for E2E.

```sh
bun install
bun run dev        # prepares the run library, then http://127.0.0.1:5173
```

## Deploying the study sites

`bun run build:sites` builds the same source three times, once per condition, into the neutral path segments `dist/b/` (baseline), `dist/c/` (candidates), and `dist/p/` (probabilities), verifies each build, and writes a root condition picker plus `robots.txt`. `vercel.json` sets `trailingSlash` so relative asset and run URLs resolve inside each condition directory, and marks every response `noindex`.

The linked Vercel project serves:

- `/b/` — baseline
- `/c/` — candidates
- `/p/` — probabilities

## Study links and data collection

Each participant receives three researcher-built links — one per case, one per condition:

```text
/b/?p=P01&c=1&case=C07   (baseline)
/c/?p=P01&c=1&case=C07   (candidates)
/p/?p=P01&c=1&case=C07   (probabilities)
```

- `p` is the pseudonymous participant code, `c` is the case order (1–3), and `case` is a short code resolved by the checked-in `src/study/cases.json` map (22 codes over the approved roster; `C02` is intentionally unused). The map carries no expected answers, and raw run IDs never appear in study links.
- Study mode opens exactly that case. Invalid or partial links show a neutral error instead of the run picker; `?run=<id>` keeps its existing demo meaning.
- Submitting stores the verdict, optional explanation, and review timing (wall time, step views, unique steps viewed, final-state views, and the time from case open to the first step, final-state, or response interaction; `null` when unavailable, `0` for an immediate interaction): first in a `localStorage` queue, then as one insert into the Supabase `study_submissions` table using the public publishable key. Failed inserts retry on page load and when the browser comes back online; a `409` on the same `submission_id` counts as delivered.
- Reloading or revisiting a submitted link shows a submitted notice. A completed marker in `localStorage` blocks a second insert from the same browser.
- The table is insert-only for `anon` (RLS with no read policy); apply `supabase/migrations/20261123_create_study_submissions.sql` to the study project. Analysis keeps the first complete row per `(participant_code, case_order)` and flags later duplicates.

`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` must both be present — in `.env.local` (ignored by Git) or as Vercel project variables. Without them, study links fail closed with a neutral configuration error; demo links still work.

## Scripts

| Command                                    | Purpose                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| `bun run dev`                              | Prepare the run library and start Vite                                        |
| `bun run build`                            | Prepare, typecheck, build, and verify the participant artifacts               |
| `bun run build:sites`                      | Build and verify all three condition sites into `dist/{b,c,p}/`               |
| `bun run preview`                          | Verify the build and serve it with Vite preview                               |
| `bun run prepare:runs`                     | Project the checked-in condition into `public/runs/`                          |
| `node scripts/import-agent-runs.ts`        | Rebuild the committed library from collected research output                  |
| `bun run screenshots`                      | Regenerate the synthetic test-fixture screenshots                             |
| `bun run typecheck`                        | Run `tsc --noEmit`                                                            |
| `bun run lint`                             | Run Biome checks                                                              |
| `bun run format`                           | Format with Biome                                                             |
| `bun run test`                             | Run Vitest unit/component tests                                               |
| `bun run test:e2e`                         | Build, verify, preview on port 4173, and run Playwright in Chrome             |
| `node scripts/verify-study-builds.ts`      | Verify the emitted run index, runs, frames, and permitted artifacts           |
| `node scripts/compare-study-builds.ts ...` | Compare three completed worktrees' builds and six browser equivalence reports |

The Playwright configuration always builds and previews the production output on port 4173 with `reuseExistingServer: false`. It never attaches to an arbitrary dev server.

## Artifact and equivalence verification

`bun run build` runs `scripts/verify-study-builds.ts` after Vite. It requires `runs/index.json`, exactly two run JSON files per indexed run, every referenced frame, matching revisions/conditions, and no forbidden artifact or sentinel. It returns the pinned condition, fixture revision, and common-core digests.

The layout suite writes six ignored `study-equivalence/2` reports to `test-results/study-equivalence/<locale>-<width>x<height>.json` for 1280×720, 1366×768, and 1440×900 in both locales. Each report contains the condition, initial/final/episode-04 screenshot references, rail action order, and the named shared panes (`context`, `rail`, `review`, `browserFrame`, `response`) and controls (`task`, `viewedStep`, `final`, `accept`, `reject`, `explanation`, `submit`). Geometry is captured in the final view — which renders the same evidence in every condition — with the task disclosure collapsed and the window scrolled to the top. Reports never contain review `scrollHeight`, card content height, or participant answers.

`compareStudyBuilds` / the comparator CLI validates all six reports for every condition, checks common fixture revision and semantic core digests across every run, compares unscored candidate order and selection between `candidates` and `probabilities`, and requires the named shared bounds to match within 1px. It rejects reports with an obsolete schema version or unshared pane/control names. Run it after all three fixed-condition worktrees have completed their own build and E2E suites.

The layout suite also captures ignored inspection images under `test-results/study-evidence/<locale>-<width>x<height>/` for the `initial`, `expanded`, `expanded-last`, `draft`, and `submitted` states. The `baseline` condition has no alternative chips, so it skips the two expanded states.

## Project layout

```text
src/
  App.tsx                    two-column screenshot-first review workspace
  RunPicker.tsx              home run list and localization
  bootstrap.tsx              validated index/run loading and safe error boundary
  study-condition.ts         checked-in fixed condition
  components/ui/             task strip, rail, browser frame, choice cards, response form
  data/                      validated run-index and per-run loader
  domain/                    decision run, replay, response, and projection contracts
  i18n/                      bilingual interface and study copy
  styles/                    design tokens, bounded study layout, and picker
fixtures/agent-runs/         committed canonical 44-run library
fixtures/decision-runs/      synthetic unit-test authoring fixtures
tests/fixtures/screenshots/  synthetic unit-test evidence
scripts/                     import, projection, build verification, comparison
tests/                       Vitest unit/component tests
e2e/                         production-browser regression suites
public/runs/                 generated run library (ignored)
DESIGN.md                    design system and interaction rules
```

Open `/showcase.html` only as a developer-only legacy component showcase. It is not a participant route and is not a production build input.

## Regenerating test screenshots

```sh
bun run screenshots
```

This renders the Chinese and English synthetic fixture pages from `scripts/fixture-pages.ts` in headless Chrome and writes WebP files to `tests/fixtures/screenshots/`. The script runs under Node.js 22.18+ (direct TypeScript execution); use Node rather than Bun because Playwright's browser launch can hang under Bun.
