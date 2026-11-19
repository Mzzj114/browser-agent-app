# Evidence-first inspector — approved Option A

## Intent
Free the right inspector for agent choices and probabilities by removing duplicate navigation and marking controls. The user selected Option A and requested implementation with no visual or E2E verification.

## Approaches
- **A, selected:** navigation only in the execution rail; marking only in the assessment's existing earliest-mistake select. Maximum evidence space, without replay shortcuts.
- **B, not selected:** relocate shortcuts into the rail and assessment. Retains duplicate controls and makes those areas denser.
- Keep the current inspector controls: rejected because they obstruct evidence.

## Design and constraints
- Remove Previous / step menu / Next, Return to final state, and Mark / Clear mark from the participant inspector.
- Append **Final state** / **最终状态** as the last item in the SAME scrolling execution list, using the same item style and selection treatment as episodes. No fixed footer, separate button area, divider, special promotion, or extra step number.
- Final state remains a view of the observation after the last action, not a markable action. Initial view remains final state.
- Rail navigation changes viewing only. The bottom earliest-mistake select is the only marking control; selecting a mark, clearing it, and Cannot determine do not navigate. Submission locks the form but not rail navigation.
- Keep the inspector's action/outcome/entered-text and authored candidate/probability evidence unchanged; remove the now-empty replay header and give its space to the scrolling evidence body.
- Apply the same shell and navigation across baseline, candidates, and probabilities; preserve the pinned condition, fixture strings, candidate order, selected labels, score meaning, bilingual draft state, compact screenshot layout, and accessibility.
- No dependencies, persistence, telemetry, domain refactor, commits, merge, or unrelated cleanup.

## Verification
Use a focused failing component test followed by implementation, the unit suite, production build, and targeted formatting checks. Maintain stale browser-test selectors without running visual/E2E checks; the user will verify manually.
