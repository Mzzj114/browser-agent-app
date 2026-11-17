# Decision Evidence Frontend — Planning Notes

Status: design approved and implementation plan written. This is the discovery/decision record; the linked design and implementation plan are the handoff documents. Execution has not been authorized and no product changes or condition branches have been created.

## Planning checklist

- [x] Inspect the current replay, step evidence, data model, and response interface.
- [x] Clarify participant tasks, evidence semantics, and experimental controls.
- [x] Present viable frontend implementation approaches and obtain a choice.
- [x] Write the proposed design, distinguishing confirmed requirements from proposals.
- [x] Obtain a fresh builder review and resolve consequential questions.
- [x] Obtain the user's approval of the design.
- [x] Produce the implementation plan using the writing-plans workflow.

## Research intent

Does exposing decision-time candidate sets and scores improve people's localization and diagnosis of browser-agent failures beyond an execution trace with equivalent replay and navigation?

The research question is evolving. The existing frontend is a starting point, not a fixed constraint.

## Confirmed requirements

- Three frontend conditions, each ultimately on its own feature branch:
  - Baseline: execution flow, labeled action, screenshots.
  - Experiment 1: execution flow, offered options, selected options, screenshots.
  - Experiment 2: execution flow, offered options, selected options, per-candidate probabilities, screenshots.
- Step screenshots should show the page before the action, so participants can inspect the options visible at decision time.
- Change the response interface to support choosing a step where the participant believes the agent fails, in addition to accept/reject.
- The selected failure step means the earliest mistaken action, not the first visible downstream symptom.
- Capture diagnosis with a short free-text explanation rather than predefined failure categories.
- Both experimental conditions expose both decision levels: offered operations with the selected operation, then offered targets for the selected operation with the selected target. Experiment 2 adds scores at both levels.
- Preserve the same human-readable executed-action label in the execution flow in all three conditions. Candidate details supplement, rather than replace, that overview.
- Experiment 2 uses per-candidate probabilities at both decision levels, not the separate undocumented confidence fields. Explain the scope of each probability set; do not imply overall correctness.
- Offer "Cannot determine" as an alternative to identifying the earliest mistaken action. Do not add a "No mistaken action" response option. A participant rejecting the result without locating an error can use "Cannot determine."
- Use synthetic Jev-shaped fixtures for this frontend phase. Real-run ingestion and upstream agent recording/export changes are deferred.
- Remove raw code, model thinking, and technical payload disclosures from all participant conditions. Retain human-readable action labels and observable outcomes/errors equally across conditions.
- Use layout B: a stable execution-flow rail, screenshot pane, and dedicated viewed-step inspector. The user chose it over inline candidate details.
- Submission is on-screen only for this phase. No JSON export, backend collection, or new persistence is in scope.
- Use approach 1: common frontend foundation with three fixed-condition branches, not independent implementations or a participant-facing condition switch.
- Ask questions as the plan develops; do not implement now.

## Current frontend findings

- `src/App.tsx` coordinates replay selection, the screenshot pane, execution history, and participant response.
- `src/components/ui/step-card.tsx` displays action labels and expandable technical evidence, including optional agent thinking.
- `src/domain/run-schema.ts` has per-step page states but no decision candidates or score fields.
- Step screenshots currently mean after-action states.
- The final replay view reuses the last step's page state; switching to before-action states requires an explicit terminal-state decision.
- `src/components/ui/decision-footer.tsx` and `src/domain/replay.ts` currently support accept/reject, an optional reason, revisions, and submission.
- Current fixtures are synthetic and bilingual.
- Existing untracked neutral-theme planning files are separate user work and remain untouched.

## Defaults adopted through design approval

- Use identical underlying runs, actions, screenshots, and navigation across conditions; vary only exposure of decision evidence.
- Preserve a distinct final outcome screenshot rather than relabeling a before-action screenshot as the final state.
- Keep candidate ordering identical between experiments 1 and 2; scores must not also introduce ranking.
- Include terminal decisions in the replay so participants can identify premature completion.
- Require localization (a step or "Cannot determine") for rejection; do not require it for acceptance, but allow marking a recovered earlier error. A concrete mark requires a short explanation; an uncertainty explanation is optional.
- Use a shared synthetic fixture set across conditions, with synthetic probability values explicitly identified as prototype data rather than measured Jev outputs.

## Delegated Jev exploration

The user requested a read-only exploration of `D:\Program\Python\try-browser-use\jev-ultrafast` by DeepSeek V4.1 Flash. The subagent completed it without changes. The findings below are source-based reports, not measurements from a complete raw decision log; no such log was present in the checkout.

- `jev_ultrafast/model.py:91-106`: each request asks an operation question and target questions for available operations; this is not a single flat distribution over complete actions.
- `jev_ultrafast/model.py:126-131`: only the selected operation's target head is consumed and validated. Unused target heads should not be presented as equally validated decisions.
- `jev_ultrafast/model.py:30-45,135-149`: per-question probabilities and separate confidence values exist. The probability sets are validated to sum approximately to one; calibration and the separate confidence field's semantics are not established.
- `jev_ultrafast/model.py:48-78` and `jev_ultrafast/snapshot.js:68-80`: one page element may yield different action candidates; native select options have separate candidates.
- `jev_ultrafast/static/app.js:107-118`: the existing inspector sorts by probability. Do not copy that behavior into experiment 2 alone.
- `jev_ultrafast/agent.py:93-100,121-141`: terminal DONE/BLOCKED predictions do not become execution-history rows.
- `jev_ultrafast/agent.py:42-44,149-152` and `jev_ultrafast/model.py:107-117,135-149`: observations can include pre-action screenshots, but historical decision exports lack explicit screenshot/geometry links.
- Existing exports lack reliable decision-to-execution IDs and statuses; stale/superseded predictions must not be silently treated as executed actions.
- Typed text comes from a separate helper; decision scores do not score the generated text value.
- Captured candidates are filtered viewport-visible supported controls, with an action cap; a missing candidate is not proof that the page lacks the control.

### Interpretation safeguards

- Experiment 1 may expose operation and target candidate identities and selections, but not probability values, confidence, score-derived ranks, or score-derived styling.
- Experiment 2 must add only the agreed score information, not a different ordering or navigation scheme.
- Do not derive a joint complete-action distribution by multiplying separate head scores without an explicitly justified model contract.
- Do not label service scores as calibrated correctness or success probabilities.
- Researcher ground truth and independent outcome verification are for analysis, not participant-visible verdicts.
- Distinguish frontend fixture/demo work from instrumentation needed to support faithful real-run replay; neither is authorized yet.

## Approved design

- `docs/superpowers/specs/2026-11-17-decision-evidence-frontend-design.md` records the design and separates confirmed requirements from builder calls.
- Matching underlying runs, initial final-state view, exposure defaults, terminal episodes, response gating, exact fixture scope, and runtime fixture projection were approved with that document.
- A fresh builder review completed with "nothing important left"; no additional stakeholder questions arose.
- The user approved the full design on 2026-11-17. The implementation plan is `docs/superpowers/plans/2026-11-17-decision-evidence-frontend.md`; product implementation still requires a separate execution decision.

## Visual exploration

- The user accepted browser-based mockups.
- Throwaway companion files are under `.superpowers/brainstorm/778-1794956755/`; these are not product implementation and should not be committed.
- Two alternatives are shown with a preview-only three-condition switch:
  - A: screenshot plus execution flow, with candidate evidence inline in the viewed step.
  - B: separate execution-flow rail, screenshot pane, and persistent selected-step inspector (chosen by the user for a stable overview).
- Both retain human-readable labels, before-action screenshots, a separate final-state view, two-level candidate evidence, identical candidate order, and independent viewing/marking state.
- The response preview includes accept/reject, a step or "Cannot determine", and short free text. Rejection gating and explanation requirements were subsequently approved in the full design.
- Mockup screenshots reuse existing synthetic assets. Candidate lists/probabilities are illustrative, not a claimed Jev recording or a complete study stimulus.
- A local Playwright verification script checks the three conditions, invariant ordering, separate viewed/marked state, uncertainty, final/terminal views, and both layouts. This does not validate the research design or the actual app.
