# Recorded Agent-Run Library Design

**Date:** 2026-11-19
**Status:** Approved in conversation ("A plus those two defaults work. Do it.")
**Supersedes:** the single synthetic shopping fixture as participant data.

## 1. Intent and Why

The application was built around one authored bilingual shopping run. The study now has 44 recorded runs at
`research/stimuli/final`, produced by a decision-model browser agent rather than an answer-writing LLM.
The runs are the real stimulus material. The app must present any one of them, in Chinese or English, with
English screenshots, and let a visitor choose a run from the home URL.

The decision-model agent never writes a final answer. The current "Agent-reported result" panel therefore
fabricates evidence. It is removed.

## 2. Goals

- Ship the 44 recorded runs as static files with no backend and no runtime dependency on the research folder.
- Let the home URL list runs with neutral labels and open one through `?run=<id>`.
- Provide a Chinese projection of every run while every screenshot stays English.
- Generate the baseline / candidates / probabilities conditions from the recorded decision distributions.
- Validate the entire library at build time; a missing run, frame, translation, or structural mismatch fails the build.
- Preserve the existing replay workspace, response form, locale switching, keyboard behavior, and layout rules.

## 3. Non-Goals

- No response persistence, telemetry, assignment, recording upload, or backend.
- No participant-facing metadata that reveals condition, score, family, trial role, or ground truth.
- No invented agent report, synthetic probability, or rewritten evidence.
- No image conversion, cropping, or re-encoding; frames are copied byte-for-byte.
- No experiment procedure or run-selection policy.

## 4. Anti-Goals

- A picker that shows `clean` / `intv` suffixes, shortlist buckets, evaluator verdicts, or run families.
- Chinese screenshots, or translated element names that no longer match the visible English page.
- Shipping raw traces, `verdict.json`, `raw_answers`, prompts, token usage, or model identifiers to the browser.
- A runtime that parses unvalidated trace files.

## 5. Constraints

- Static Vite build deployed to Vercel under `dist/<condition>/`; `trailingSlash: true`, relative base `./`.
- 44 runs, 447 episodes, 1,120 × 780 JPEG frames, ~36 MB images and ~9.4 MB traces.
- Both locales share the same English frames; locale-specific screenshot directories no longer exist.
- Existing desktop-only participant workspace: minimum 1280 × 720.
- Chinese participants are college students; task, actions, and role context are Chinese, literal page text stays English.
- Every rendered string must pass the existing strict Zod schemas; no unvalidated fixture reaches the app.

## 6. Approaches Considered

| Approach | Description | Verdict |
|---|---|---|
| A | Commit a canonical library under `fixtures/agent-runs/`; a checked-in importer converts the research folder once; each build projects the selected condition into `public/runs/`. | **Chosen.** One source of truth, reproducible, fail-closed validation, still fully static. |
| B | Copy the whole `final/` tree into `public/` and parse `trace.json` in the browser. | Rejected. Ships model internals and evaluator data, parses untrusted 1 MB files at runtime, and offers no schema gate. |
| C | Ship only prebuilt JSON and frames in `public/`, with no canonical layer. | Rejected. Not reproducible; translation and condition projection become hand-maintained. |

## 7. Canonical Library

```text
fixtures/agent-runs/
  manifest.json            fixtureVersion, fixtureRevision, run list, neutral titles
  translations.json        exact English -> Chinese task/action/role/operation maps
  provenance.json          source hashes and collection metadata (never shipped)
  <run_id>/
    run.en.json
    run.zh.json
    frames/<frame>.jpg
```

`manifest.json` is internal. The build emits a sanitized `public/runs/index.json` with only:
`fixtureVersion`, `condition`, `fixtureRevision`, and per run `id`, `ordinal`, `steps`,
`title: { zh, en }`, and the two file names.

Run ordinals are assigned by sorting run ids lexicographically; the picker shows the ordinal and
neutral task title only.

## 8. Trace Mapping

For every run directory with `meta.json` and `trace.json`:

- Repair cp1252-mojibake (`â†’`, `â€”`, `Ã©`, …) by mapping the Unicode characters back to cp1252 bytes and
  decoding as UTF-8. Applies to instructions, actions, element labels, and page titles. Repair is skipped
  when the result contains U+FFFD.
- `task` ← `meta.instruction`; `runId` ← directory name; `locale` ← `en`.
- One observation per episode: `obs-00` is `initial_frame`; `obs-NN` is step N's `pre_frame`.
  The final observation reuses `final_frame`, or the last `pre_frame` for step-capped runs that recorded no
  final frame. Screenshot path is `frames/<file>`; dimensions are read from the JPEG header.
- `capturedAt` ← `meta.started_at + step.elapsed_ms`; `executedAt` is the midpoint between the before and
  after observation (equal to both when the gap is zero).
- `action` ← `step.action`; `operation` ← `step.operation`; `enteredText` ← `step.text` (English input kept).
- Operation head ← `decision.operation_probabilities` in the fixed operation order.
- Target head ← `decision.raw_answers[<question>]` where the question is `click_target`,
  `text_type_target`/`type_text_target`, or `select_target` as appropriate; targetless operations have no head.
- Candidate identity is the trace key; label is the repaired `element` string including its `[n]` prefix;
  context is the localized role plus `current value` when present. Probabilities are used verbatim.
- The importer rejects a run unless every probability list sums to one, the selected value is an argmax, and
  every probability key has matching criteria.

## 9. Translation Policy (approved default)

Translated: task instruction, rail action labels, candidate role/context, operation labels, picker titles,
and `taskId`-derived titles.

Kept English: all screenshots, observation page titles, URLs, entered text, and candidate labels that quote
the page. An element label such as `[29] Add Classic Leather Wallet to Cart` stays verbatim.

`translations.json` is an exact-match dictionary. The importer fails with the missing English string if a
task or action has no translation. This makes translation completeness checkable and prevents silent English
fallback in the Chinese build.

## 10. Runtime

- `runs/index.json` and `runs/<id>/run.{zh,en}.json` are fetched relative to the app base.
- `?run=<id>` selects a run. No param shows the picker. Unknown ids fail closed with a link home.
- The picker shows the localized neutral title, ordinal, step count, and a one-line note that page content is
  English. It does not show the run id, condition, family, score, or trial role.
- The three condition sites remain separate builds. The picker and run library are identical in each; only
  the inspector evidence differs.

## 11. UI Change

- Remove the second context panel and the `report` field from both schemas and the workspace.
- The original-task strip becomes one full-width panel; the provenance note moves under it.
- Provenance copy states that this is a recorded decision replay with English screenshots.
- Probability copy states that the values are recorded model outputs, not correctness estimates, and apply
  within each head only.
- Add a picker page using existing tokens, a two-column responsive list, real links, visible focus, and the
  same header brand and language toggle.

## 12. Build and Verification

- `prepare:runs` validates every canonical run, projects the selected condition, writes `public/runs/`, and
  copies frames unchanged.
- `verify-study-builds` requires an index, exactly two run files per indexed run, every referenced frame,
  matching revisions/conditions, zh/en structural parity, and no forbidden artifact or sentinel.
- `compare-study-builds` compares a digest of every run's common core across conditions and compares
  unscored candidate order/selection between candidates and probabilities; layout equivalence reports are
  produced by E2E for one representative run.
- Unit tests cover the new schemas, loader, importer mapping, picker, and workspace. E2E covers the picker,
  a real recorded run, missing-image behavior, locale switching, and the layout invariant.

## 13. Accepted Debt

- Committing ~36 MB of JPEG evidence to Git rather than using an external asset store.
- The recorded a11y labels occasionally contain raw page prose as the "action" label; translation is
  best-effort and keeps product names English.
- Six step-capped runs have no post-run frame; their final observation intentionally reuses the last before
  frame, the same semantic allowance the previous design already made.
- No run-selection policy or counterbalancing; the picker exists because the procedure is undecided.
