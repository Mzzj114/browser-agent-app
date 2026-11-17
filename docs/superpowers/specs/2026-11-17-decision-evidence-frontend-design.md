# Decision-Evidence Frontend Design

**Status:** Proposed design for approval. Approach 1 and layout B are approved; this document and its remaining design calls are not yet approved. Planning only: no product implementation or condition branches have been created.

**Builder check:** A fresh frontend reviewer found no important unanswered questions needed to plan this design. This is a completeness check, not user approval or validation of the study.

## 1. Intent

Research question:

> Does exposing decision-time candidate sets and scores improve people's localization and diagnosis of browser-agent failures beyond an execution trace with equivalent replay and navigation?

The research is narrowing in scope. The current interface is a starting point, not a constraint to preserve its old task or layout. This phase builds a synthetic, read-only interface prototype; it does not deliver a complete study, collect research data, or establish the usefulness/calibration of model scores.

### Confirmed requirements

- Three frontend versions on three feature branches, using a shared foundation.
- All versions retain execution flow, human-readable action labels, and screenshots.
- Screenshots for a step show the page **before** that action.
- Experiment 1 additionally exposes offered and selected options at two levels: operation, then targets for the selected operation.
- Experiment 2 additionally exposes per-candidate probabilities at both levels. Exclude the separately reported, undocumented `confidence` fields.
- Preserve accept/reject; add selection of the **earliest mistaken action** and a short free-text explanation.
- Offer **Cannot determine**, but not **No mistaken action**.
- Use synthetic Jev-shaped fixtures for now; defer real-run ingestion/instrumentation.
- Remove participant-facing raw code, model thinking, and technical payloads in every condition. Keep factual action outcomes/errors common.
- Use layout B: separate execution-flow rail, screenshot pane, and viewed-step inspector.
- Submission is on-screen only. No response export, backend, or new response persistence.

## 2. Approaches and Decisions

### Implementation approaches

1. **Shared foundation with fixed-condition branches — chosen.** Common components, replay, fixtures, and response behavior are implemented together. Branches differ only in their fixed condition and resulting permitted evidence. Common changes are propagated to each branch.
2. **Independent per-condition implementations — rejected.** Straightforward individual versions, but duplicated work and navigation/layout drift make experimental equivalence harder to maintain.

### Layout alternatives

- **A: inline evidence inside the execution flow.** Closer to today's two-pane interface and gives the screenshot more room. Long candidate lists push the remaining action overview away.
- **B: separate execution flow, screenshot, and step inspector — chosen.** The action overview stays stable while the inspector scrolls independently. Costs some screenshot width; retain screenshot fit/actual-size inspection.

Throwaway visual exploration is under `.superpowers/brainstorm/778-1794956755/`. It is not product code or a pixel specification; exclude that directory and its session credentials from commits.

## 3. Experimental Contract

Use the **same underlying synthetic run** in every condition. This is a proposed design call to isolate evidence exposure, not a previously confirmed participant-allocation protocol.

| Evidence / behavior | Baseline | Candidates | Probabilities |
| --- | --- | --- | --- |
| Task and agent-reported result | Same | Same | Same |
| Chronological action labels and factual outcomes/errors | Same | Same | Same |
| Before-action screenshots and separate final page state | Same | Same | Same |
| Replay, zoom, navigation, viewing/marking, response form | Same | Same | Same |
| Offered operations and selected operation | No | Yes | Yes |
| Offered targets for selected operation and selected target | No | Yes | Yes |
| Per-candidate operation and target probabilities | No | No | Yes |
| Raw code, thinking, payload viewers | No | No | No |
| Undocumented confidence fields / correctness verdicts | No | No | No |

The baseline's action label necessarily names the executed action; it does not gain a separate offered-candidate list. Candidate information supplements labels rather than replacing them.

All conditions use the same pane dimensions, typography, screenshot assets, initial replay state, report prominence, and interaction rules. No candidate ranking, probability-based color, score bars, recommendations, automatic failure markers, or condition-specific navigation. Marking is the participant's judgment, never a correctness signal.

## 4. Jev Semantics and Limits

Read-only source exploration of `D:\Program\Python\try-browser-use\jev-ultrafast` found:

- `jev_ultrafast/model.py:91-106,126-131`: operation and operation-specific target questions are separate. Only the chosen operation's target answer is consumed and validated.
- `model.py:30-45,135-149`: per-question probability distributions exist separately from confidence fields. They are not validated as probabilities of correctness or task success.
- `model.py:48-78` and `snapshot.js:68-80`: one element can yield multiple operation-qualified candidates; native select options are separate candidates.
- `agent.py:93-100,121-141`: terminal DONE/BLOCKED predictions do not appear in its execution history.
- Historical exports lack reliable decision/execution/screenshot links; no complete raw decision record was available in the checkout.

Consequences for this prototype:

- An episode represents one chosen browser action or terminal decision, not a Python cell or an arbitrary batch.
- Show an operation list and **only the selected operation's target list**. Do not flatten them into a supposed joint complete-action distribution.
- Label target scores as probabilities **within that operation**. Do not multiply heads into an overall action score.
- Typed text is an unscored parameter from a separate helper; show the actual text equally across conditions without suggesting the target score evaluates the generated wording.
- DONE, BLOCKED, WAIT, and scroll decisions have no target head. Show “No target required,” not a missing-data error.
- Preserve authored candidate order in both experiments. Do not copy the existing Jev inspector's probability sorting.
- Fixture candidates/probabilities are synthetic authored examples, not captured Jev outputs or a faithful simulation of every DOM extraction rule.

## 5. Shared Workspace

### Composition

- Existing product header and language control remain common.
- A shared context strip presents the original task and agent-reported final text, explicitly labeled as the agent's report, not a verified outcome.
- Main workspace has three bounded columns: chronological action rail, recorded-page pane, and viewed-step inspector.
- A common response region is below the workspace, not mixed into the agent report.
- Remove the disabled live-agent composer from the participant workspace uniformly. Existing unused primitives may remain for the showcase; do not delete unrelated code as part of this redesign.

Use the existing quiet light theme and tokens. This is not a separate branding/theme redesign. Update `DESIGN.md` where its two-pane, technical-disclosure, and composer contracts are superseded.

### Layout and scrolling

Keep the existing desktop minimum of 1280×720 and fallback below that size. Verify at 1280×720, 1366×768, and 1440×900 in both locales.

The shell stays viewport-bounded. Execution rail, screenshot viewport, and inspector scroll independently; content must not stretch the grid or cover controls. Context/response regions may have bounded vertical overflow for long text, but their controls remain reachable. At the minimum size, do not solve space pressure by reducing primary text below the existing 14px body minimum. Exact column widths and region height limits are builder decisions to verify at these sizes.

The inspector's outer dimensions do not change between conditions. Baseline displays the common action summary, marking control, and factual recorded outcome without blank candidate tables or “information hidden” placeholders.

### Replay and exposure defaults — proposed calls

- Preserve the existing **final-state initial view** in all conditions.
- Selecting an action shows its before-action screenshot and its inspector, with permitted candidate sections visible without another disclosure click.
- Previous from the final state selects the last episode. Previous/next traverse episode order and are disabled at the first/last episode boundaries. A shared final-state control and step menu remain available.
- Final state is a separate replay selection, not a numbered action and not eligible for failure marking. Terminal DONE/BLOCKED decisions are numbered episodes and are eligible.
- Fit/actual-size screenshot inspection remains identical across conditions. Missing images show an explicit missing-screenshot state; never substitute the after-state and label it “before.”
- No screenshot annotations, candidate bounding boxes, hover overlays, or click-to-act behavior in this phase.

## 6. Viewing and Failure Marking

Keep two independent pieces of state:

1. **Viewed selection:** episode ID or final state; controls the screenshot and inspector.
2. **Localization response:** unanswered, a specific episode ID, or Cannot determine.

Clicking a rail item changes only the viewed selection. “Mark as earliest mistake” marks the viewed episode; it does not automatically reject the result. A distinct, neutral “Your mark” label appears on the marked rail item. Changing the viewed episode does not move the mark.

Only one earliest action can be marked. Marking another replaces it; marking the currently marked episode again clears it. The response menu can select any episode or Cannot determine. Choosing Cannot determine removes the concrete mark without moving the replay. No automatic error selection or researcher ground truth reaches these controls.

## 7. Response Form and Submission

The common form has accept/reject, localization, a short explanation, and explicit Submit. Inputs remain editable until submission.

**Proposed validation rules for approval:**

- Accept/reject is required.
- Rejection requires a concrete episode or Cannot determine.
- Acceptance does not require localization, but may include a recovered earlier mistake.
- When a concrete episode is marked, require a nonblank short explanation, even if the final result is accepted.
- For Cannot determine, explanatory text is optional; helper copy invites the participant to explain what prevented localization.
- With acceptance and no localization, the explanation is optional. Unanswered localization is not recorded or described as “No mistaken action.”
- Keep the existing 500-character explanation limit. Preserve entered text across tentative choice/localization changes rather than silently discarding it.

Submission locks verdict, localization, marking, and explanation, and shows a neutral on-screen confirmation. Screenshot replay/navigation remain usable. No correctness feedback is given. Reloading clears the response; no localStorage, export, telemetry, or backend is added for judgments. Existing locale-preference behavior is unchanged.

Locale changes retain the same underlying run, stable episode selection/mark, and form state; the participant-authored explanation is not translated. Both fixture translations must have matching IDs and ordering.

## 8. Synthetic Data Contract

Introduce a versioned decision-replay fixture contract rather than relabeling the current after-action `pageState` data.

### Canonical authoring data

- Run ID, fixture version, synthetic provenance, localized task/report, and stable locale-independent episode/observation IDs.
- Initial observation and explicit final observation, each with URL/title, capture time, screenshot path/dimensions, and synthetic-render provenance.
- Chronological episodes, each with ID, ordinal, human-readable actual-action label, execution/terminal time, before-observation reference, factual after-observation/outcome, and operation.
- Operation decision: ordered candidates with IDs/labels/probabilities and selected operation ID.
- Target decision: ordered operation-qualified candidate IDs, readable labels/context, probabilities, and selected target ID; absent for operations without targets.
- Actual action parameters such as entered text, kept separate from probability semantics.
- Researcher-only annotations stored separately from participant inputs and application assets.

The authoring contract must validate unique IDs, references, chronological ordinals, selected membership, finite 0–1 probabilities, approximately normalized per-head sets, and selected argmax/tie consistency. Synthetic scores should sum to one within numerical tolerance; display raw values consistently as percentages without silent renormalization. Use one decimal place and explain possible rounding differences. Never compare scores across target heads.

### Participant data projection — proposed call

Derive condition-specific runtime fixtures from one canonical fixture source. Baseline omits candidate/score fields; candidates condition omits probabilities; probabilities condition includes both levels. Runtime code imports only the permitted projection, not the full canonical source or researcher annotations.

Projection happens before serving/building, with no public runtime condition switch or query/storage override. Keep authoring/ground-truth sources out of emitted participant assets. Exact generator/module boundaries are left to the implementation plan, but missing/mismatched projections must fail rather than silently fall back to a richer condition.

This prevents accidental data leakage through DOM, accessibility text, tooltips, payload viewers, and shipped fixtures; it is not a security claim against editing or rebuilding the source repository.

## 9. Initial Fixture Scope

Ship one bilingual synthetic shopping run for interface development, with the page already on the store homepage at the recording start. Reuse the current screenshot assets where their visual state really matches the new observation.

Use the mockup's coherent eight-episode sequence:

1. Type the search text; before image is the empty-search homepage.
2. Submit search; before image is the filled-search homepage.
3. Click Best selling; before image is unsorted results.
4. Open Cloud Walk Red Sneakers; before image is sorted results.
5. Select size 42; before image is the product page without size selection.
6. Add to cart; before image is the size-selected product page.
7. Open cart; before image is the added-to-cart page.
8. DONE / report completion; before image is the cart.

The final observation is the cart after termination; sharing the same pixels with the before-DONE observation is valid, but its semantic reference remains explicit. Keep the existing agent-reported claim of the other product/price; do not rewrite it into an objectively verified statement.

Action labels must state what was actually selected, not the agent's intended goal (“Open Cloud Walk…” rather than “Open the best-selling running shoe”). Re-author researcher annotations for the new episode numbering, including the earliest mistake; do not reuse old step indices.

Candidate lists must match the authored observation and chosen action, with distinguishable targets and context for repeated labels. Offer plausible alternative operations, but do not present mockup sample lists as a complete capture of Jev's DOM candidate generator.

Add small **test-only** fixtures for operation mistakes, terminal DONE/BLOCKED, WAIT/scroll without targets, successful/recovered runs, repeated-label/select-option targets, longer lists, and missing screenshots. No participant run picker, stimulus sampling/counterbalancing, ground-truth scoring UI, or study-wide stimulus set is in scope.

## 10. Branch and Delivery Contract

After approval and implementation planning, create a common foundation commit and three feature branches:

- `study/baseline`: execution flow + labeled actions + screenshots.
- `study/candidates`: same, plus offered/selected operations and selected-operation targets.
- `study/probabilities`: same as candidates, plus the two per-head probability sets.

A small checked-in condition module pins each branch. Apart from this fixed condition, branches share the same source changes and canonical fixtures; generated runtime projections are derived, not independently authored. Never use a participant-facing condition chooser. A developer-only component test harness may exercise all variants, but it is not a shipped participant route.

Common fixes are merged/cherry-picked from a common source commit to every condition and verified again. Do not merge one condition's configuration over another. Document branch/build condition and fixture revision for future deployment; deployment itself is out of scope.

Preserve existing untracked neutral-theme planning files and all unrelated user work. Do not create branches, modify `jev-ultrafast`, install dependencies, or implement this design during planning.

## 11. Expected Areas of Change

- `src/domain/run-schema.ts`, `src/data/agent-run.ts`, and fixture authoring inputs: new episode/observation contract and safe condition projections.
- `src/domain/replay.ts`: stable-ID viewed selection plus independent localization/response state and validation.
- `src/App.tsx`: shared context, three-column workspace, inspector, common response region.
- `src/components/ui/step-card.tsx`: compact labeled overview, viewed state, separate participant-mark state.
- New focused inspector/candidate-list components; `browser-frame.tsx` and `replay-controls.tsx` adopt before/final semantics.
- `decision-footer.tsx`: common response form, explicit uncertainty, explanation and submit rules.
- `src/i18n/`: full Chinese/English labels, prompts, validation and state announcements.
- Existing styles and `DESIGN.md`: update layout/scroll ownership without a new theme.
- Tests and researcher annotations: replace superseded assumptions, preserve unrelated coverage. Existing technical primitives need not be deleted.

## 12. Verification and Acceptance

1. **Data:** schema rejects missing/duplicate IDs, invalid references/selection, mixed score-head semantics, malformed probabilities, and mismatched locale episode structures. Assert every before-state transition and explicit final state.
2. **Projection:** baseline runtime data has no candidates/scores; candidates runtime data has no probability/confidence values; none ships researcher annotations. Check built fixtures/assets as well as rendered text. Internal test sources are not participant assets.
3. **Replay:** initial final view; rail/menu/arrows agree; before labels match images; terminal and final views remain distinct; zoom/missing-image behavior is common.
4. **Response:** viewing never marks, marking never changes verdict, one earliest mark, Cannot determine clears marks, tentative revisions preserve text, validation follows section 7, submission locks responses but not replay, reload clears judgments.
5. **Condition equivalence:** compare action labels, reports, screenshot URLs/dimensions, rail order, selection defaults, candidate order between experimental conditions, and geometry/control behavior. No rank/color/overlay changes accompany probabilities.
6. **Accessibility/locales:** keyboard-operable native controls, visible focus, meaningful table headings and image text, distinct viewed/marked semantics, polite state/validation announcements, no color-only signals, no untranslated interface copy.
7. **Browser layout:** both locales at the three supported desktop sizes; long target labels/lists and explanations; context, inspector, response, and screenshot scrolling remain independently usable without shell overflow or overlap.
8. **Regression commands:** existing typecheck, lint, build, Vitest, and Playwright suites pass after intentionally updating superseded expectations. Verify each pinned branch's build, not only a component harness.

Manual review and a usability pilot are still needed before freezing a study interface. Synthetic prototype scores, automated equivalence checks, and on-screen-only answers do not constitute a deployed or validated experiment.

## 13. Decisions Still Requiring Document Approval

The user has approved the requirements, layout, and shared-branch approach above. These builder calls are proposed here rather than attributed to the user:

- Identical underlying run and initial final-state view across conditions.
- Default-expanded permitted candidate sections, fixed pane geometry, no screenshot overlays.
- Terminal decisions as markable episodes.
- Acceptance/rejection localization rules and conditional explanation requirements.
- One bilingual demonstration run plus test-only edge cases.
- Condition-specific generated runtime fixtures, researcher-only ground truth, no new dependencies anticipated.

All other implementation details that do not change these behaviors—component names, exact grid widths, helper organization, and test-file split—are left to the builder. Any need to change the study controls, response meaning, or expand to real-run capture returns for a separate decision.
