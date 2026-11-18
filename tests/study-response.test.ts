import { describe, expect, it } from "vitest"
import {
  initialStudyResponse,
  type Localization,
  type ResponseAction,
  responseErrors,
  type StudyResponse,
  updateStudyResponse,
} from "../src/domain/study-response.ts"
import { canonicalRun } from "./fixtures/decision-runs.ts"

const episodeIds = canonicalRun("en").episodes.map((episode) => episode.id)

function withResponse(overrides: Partial<StudyResponse>): StudyResponse {
  return { ...initialStudyResponse(), ...overrides }
}

function withEpisodeLocalization(episodeId: string): Localization {
  return { kind: "episode", episodeId }
}

describe("study response initialization", () => {
  it("starts pending with no verdict, no localization, and no explanation", () => {
    // Given a fresh response.
    // When its initial state is created.
    // Then all judgment fields are empty and pending.
    expect(initialStudyResponse()).toEqual({
      status: "pending",
      verdict: null,
      localization: { kind: "unanswered" },
      explanation: "",
    })
  })
})

describe("study response submission", () => {
  it("cannot submit without a verdict", () => {
    // Given a response with a localization but no accept/reject choice.
    const state = withResponse({
      localization: { kind: "cannot-determine" },
      explanation: "An explanation cannot replace the verdict.",
    })
    // When it is validated and submitted.
    // Then the verdict is required and submission leaves the pending state unchanged.
    expect(responseErrors(state, episodeIds)).toEqual(["verdict-required"])
    expect(updateStudyResponse(state, { type: "submit" }, episodeIds)).toBe(state)
  })

  it("cannot submit a rejection whose localization is unanswered", () => {
    // Given a rejection with no concrete episode and no uncertainty choice.
    const state = withResponse({ verdict: "rejected" })
    // When it is validated and submitted.
    // Then localization is required and the state remains pending.
    expect(responseErrors(state, episodeIds)).toEqual(["localization-required"])
    expect(updateStudyResponse(state, { type: "submit" }, episodeIds)).toBe(state)
  })

  it("permits rejection with uncertainty and no invented failure step", () => {
    const state = {
      ...initialStudyResponse(),
      verdict: "rejected",
      localization: { kind: "cannot-determine" },
    } as const
    expect(responseErrors(state, ["episode-04"])).toEqual([])
    expect(updateStudyResponse(state, { type: "submit" }, ["episode-04"]).status).toBe("submitted")
  })

  it("permits acceptance without localization", () => {
    // Given an accepted result with no episode identified.
    const state = withResponse({ verdict: "accepted" })
    // When it is validated and submitted.
    // Then no localization is required and submission succeeds.
    expect(responseErrors(state, episodeIds)).toEqual([])
    expect(updateStudyResponse(state, { type: "submit" }, episodeIds).status).toBe("submitted")
  })

  it("requires a nonblank explanation for a concrete episode", () => {
    // Given a concrete episode with blank explanations.
    const blank = withResponse({
      verdict: "rejected",
      localization: withEpisodeLocalization("episode-04"),
    })
    const whitespace = withResponse({
      verdict: "accepted",
      localization: withEpisodeLocalization("episode-04"),
      explanation: "   \n\t ",
    })
    // When they are validated.
    // Then both verdicts require an explanation and neither can submit.
    expect(responseErrors(blank, episodeIds)).toEqual(["explanation-required"])
    expect(responseErrors(whitespace, episodeIds)).toEqual(["explanation-required"])
    expect(updateStudyResponse(blank, { type: "submit" }, episodeIds)).toBe(blank)
    expect(updateStudyResponse(whitespace, { type: "submit" }, episodeIds)).toBe(whitespace)
  })

  const verdicts = ["accepted", "rejected"] as const
  const localizations: readonly Localization[] = [
    { kind: "unanswered" },
    { kind: "cannot-determine" },
    withEpisodeLocalization("episode-04"),
  ]
  const explanations = [
    { label: "no explanation", text: "" },
    { label: "a whitespace-only explanation", text: "   " },
    { label: "a written explanation", text: "The sort control was the earliest mistake." },
  ] as const

  for (const verdict of verdicts) {
    for (const localization of localizations) {
      for (const explanation of explanations) {
        it(`validates ${verdict} with ${localization.kind} localization and ${explanation.label}`, () => {
          // Given a complete response combination.
          const state = withResponse({ verdict, localization, explanation: explanation.text })
          // When it is validated and submitted.
          const errors = responseErrors(state, episodeIds)
          // Then only the approved validation rule applies.
          if (localization.kind === "unanswered") {
            expect(errors).toEqual(verdict === "rejected" ? ["localization-required"] : [])
          } else if (localization.kind === "cannot-determine") {
            expect(errors).toEqual([])
          } else {
            expect(errors).toEqual(explanation.text.trim() === "" ? ["explanation-required"] : [])
          }
          expect(updateStudyResponse(state, { type: "submit" }, episodeIds).status).toBe(
            errors.length === 0 ? "submitted" : "pending",
          )
        })
      }
    }
  }

  it("reports a localization episode that is not part of the run", () => {
    // Given a response localizes an episode ID outside the run.
    const state = withResponse({
      verdict: "rejected",
      localization: withEpisodeLocalization("episode-99"),
      explanation: "This ID was not offered.",
    })
    // When it is validated.
    // Then the unknown episode is reported.
    expect(responseErrors(state, episodeIds)).toEqual(["unknown-episode"])
  })

  it("enforces the 500-character explanation limit", () => {
    // Given concrete localizations with exactly 500 and 501 characters.
    const atLimit = withResponse({
      verdict: "rejected",
      localization: withEpisodeLocalization("episode-04"),
      explanation: "x".repeat(500),
    })
    const overLimit = withResponse({
      verdict: "rejected",
      localization: withEpisodeLocalization("episode-04"),
      explanation: "x".repeat(501),
    })
    // When they are validated.
    // Then only the over-limit explanation fails.
    expect(responseErrors(atLimit, episodeIds)).toEqual([])
    expect(responseErrors(overLimit, episodeIds)).toEqual(["explanation-too-long"])
  })
})

describe("study response editing", () => {
  it("toggles and replaces the mark without changing the verdict", () => {
    // Given a rejection draft with no mark.
    let state = withResponse({ verdict: "rejected" })
    // When one episode is marked.
    state = updateStudyResponse(state, { type: "mark", episodeId: "episode-04" }, episodeIds)
    // Then it becomes the concrete localization and the verdict is unchanged.
    expect(state.localization).toEqual(withEpisodeLocalization("episode-04"))
    expect(state.verdict).toBe("rejected")
    // When the same episode is marked again.
    state = updateStudyResponse(state, { type: "mark", episodeId: "episode-04" }, episodeIds)
    // Then the mark clears without changing the verdict.
    expect(state.localization).toEqual({ kind: "unanswered" })
    expect(state.verdict).toBe("rejected")
    // When a different episode is marked.
    state = updateStudyResponse(state, { type: "mark", episodeId: "episode-05" }, episodeIds)
    // Then the new mark replaces the old one.
    expect(state.localization).toEqual(withEpisodeLocalization("episode-05"))
    expect(state.verdict).toBe("rejected")
  })

  it("clears a concrete mark when Cannot determine is chosen", () => {
    // Given a rejection marked at a concrete episode with preserved text.
    let state = withResponse({
      verdict: "rejected",
      localization: withEpisodeLocalization("episode-04"),
      explanation: "Draft explanation",
    })
    // When uncertainty is chosen.
    state = updateStudyResponse(
      state,
      { type: "localize", localization: { kind: "cannot-determine" } },
      episodeIds,
    )
    // Then the concrete mark is removed but the verdict and text remain.
    expect(state.localization).toEqual({ kind: "cannot-determine" })
    expect(state.verdict).toBe("rejected")
    expect(state.explanation).toBe("Draft explanation")
  })

  it("replaces a concrete mark when another episode is chosen", () => {
    // Given a marked episode.
    const state = updateStudyResponse(
      withResponse({ verdict: "rejected" }),
      { type: "mark", episodeId: "episode-04" },
      episodeIds,
    )
    // When a different episode is localized.
    const updated = updateStudyResponse(
      state,
      { type: "localize", localization: withEpisodeLocalization("episode-05") },
      episodeIds,
    )
    // Then the new localization replaces the mark.
    expect(updated.localization).toEqual(withEpisodeLocalization("episode-05"))
  })

  it("does not let a forged episode ID become a mark", () => {
    // Given a rejection draft and an episode ID outside the run.
    const state = withResponse({ verdict: "rejected" })
    // When the forged ID is marked.
    const updated = updateStudyResponse(
      state,
      { type: "mark", episodeId: "episode-99" },
      episodeIds,
    )
    // Then no mark is recorded.
    expect(updated).toBe(state)
    expect(updated.localization).toEqual({ kind: "unanswered" })
  })

  it("preserves authored explanation text exactly across tentative changes", () => {
    // Given an explanation with leading, trailing, and repeated whitespace.
    let state = updateStudyResponse(
      initialStudyResponse(),
      { type: "explain", text: "  Keep   this\ntext exactly.  " },
      episodeIds,
    )
    // When the verdict and localization change.
    state = updateStudyResponse(state, { type: "verdict", verdict: "rejected" }, episodeIds)
    state = updateStudyResponse(
      state,
      { type: "localize", localization: withEpisodeLocalization("episode-04") },
      episodeIds,
    )
    state = updateStudyResponse(
      state,
      { type: "localize", localization: { kind: "cannot-determine" } },
      episodeIds,
    )
    // Then the text is unchanged for storage and display.
    expect(state.explanation).toBe("  Keep   this\ntext exactly.  ")
  })

  it("rejects an over-limit explanation instead of truncating existing text", () => {
    // Given a draft explanation already contains text.
    const state = withResponse({ explanation: "Kept draft" })
    // When an over-limit explanation is entered.
    const updated = updateStudyResponse(
      state,
      { type: "explain", text: "x".repeat(501) },
      episodeIds,
    )
    // Then the action is rejected and the previous text is preserved intact.
    expect(updated).toBe(state)
    expect(updated.explanation).toBe("Kept draft")
    // When exactly 500 characters are entered.
    const atLimit = updateStudyResponse(
      state,
      { type: "explain", text: "x".repeat(500) },
      episodeIds,
    )
    // Then the explanation is accepted.
    expect(atLimit.explanation).toHaveLength(500)
  })
})

describe("submitted study responses", () => {
  it("ignores every response action after a successful submission", () => {
    // Given a valid rejection with uncertainty has been submitted.
    const submitted = updateStudyResponse(
      withResponse({ verdict: "rejected", localization: { kind: "cannot-determine" } }),
      { type: "submit" },
      episodeIds,
    )
    expect(submitted.status).toBe("submitted")
    // When any response action is dispatched.
    const actions: readonly ResponseAction[] = [
      { type: "verdict", verdict: "accepted" },
      { type: "localize", localization: withEpisodeLocalization("episode-04") },
      { type: "mark", episodeId: "episode-05" },
      { type: "explain", text: "Changed after submission" },
      { type: "submit" },
    ]
    // Then every action is ignored and the submitted state is unchanged.
    for (const action of actions) {
      expect(updateStudyResponse(submitted, action, episodeIds)).toBe(submitted)
    }
  })
})
