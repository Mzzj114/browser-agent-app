import { describe, expect, it } from "vitest"
import {
  initialStudyResponse,
  type ResponseAction,
  responseErrors,
  type StudyResponse,
  updateStudyResponse,
} from "../src/domain/study-response.ts"

function withResponse(overrides: Partial<StudyResponse>): StudyResponse {
  return { ...initialStudyResponse(), ...overrides }
}

describe("study response initialization", () => {
  it("starts pending with no verdict and no explanation", () => {
    // Given no prior participant response.
    // When its initial state is created.
    // Then the verdict and explanation are empty and the response is pending.
    expect(initialStudyResponse()).toEqual({
      status: "pending",
      verdict: null,
      explanation: "",
    })
  })
})

describe("study response submission", () => {
  const verdicts = ["accepted", "rejected"] as const

  for (const verdict of verdicts) {
    it(`submits ${verdict} with a blank explanation`, () => {
      // Given a verdict and no explanation.
      const state = { ...initialStudyResponse(), verdict } as const
      // When it is validated and submitted.
      // Then the optional explanation does not block either verdict.
      expect(responseErrors(state)).toEqual([])
      expect(updateStudyResponse(state, { type: "submit" }).status).toBe("submitted")
    })
  }

  it("cannot submit without a verdict even when an explanation is written", () => {
    // Given an explanation but no accept/reject choice.
    const state = withResponse({ explanation: "An explanation cannot replace the verdict." })
    // When it is validated and submitted.
    // Then the verdict is required and submission leaves the state unchanged.
    expect(responseErrors(state)).toEqual(["verdict-required"])
    expect(updateStudyResponse(state, { type: "submit" })).toBe(state)
  })

  it("enforces the 500-character explanation limit", () => {
    // Given verdict-bearing responses with exactly 500 and 501 characters.
    const atLimit = withResponse({ verdict: "rejected", explanation: "x".repeat(500) })
    const overLimit = withResponse({ verdict: "rejected", explanation: "x".repeat(501) })
    // When they are validated and submitted.
    // Then only the over-limit explanation fails.
    expect(responseErrors(atLimit)).toEqual([])
    expect(updateStudyResponse(atLimit, { type: "submit" }).status).toBe("submitted")
    expect(responseErrors(overLimit)).toEqual(["explanation-too-long"])
    expect(updateStudyResponse(overLimit, { type: "submit" })).toBe(overLimit)
  })
})

describe("study response editing", () => {
  it("preserves authored explanation text exactly across tentative verdict changes", () => {
    // Given an explanation with leading, trailing, and repeated whitespace.
    let state = updateStudyResponse(initialStudyResponse(), {
      type: "explain",
      text: "  Keep   this\ntext exactly.  ",
    })
    // When the verdict changes repeatedly.
    state = updateStudyResponse(state, { type: "verdict", verdict: "rejected" })
    state = updateStudyResponse(state, { type: "verdict", verdict: "accepted" })
    // Then the text is unchanged for storage and display.
    expect(state.explanation).toBe("  Keep   this\ntext exactly.  ")
  })

  it("rejects an over-limit explanation instead of truncating existing text", () => {
    // Given a draft explanation already contains text.
    const state = withResponse({ explanation: "Kept draft" })
    // When an over-limit explanation is entered.
    const updated = updateStudyResponse(state, { type: "explain", text: "x".repeat(501) })
    // Then the action is rejected and the previous text is preserved intact.
    expect(updated).toBe(state)
    expect(updated.explanation).toBe("Kept draft")
    // When exactly 500 characters are entered.
    const atLimit = updateStudyResponse(state, { type: "explain", text: "x".repeat(500) })
    // Then the explanation is accepted.
    expect(atLimit.explanation).toHaveLength(500)
  })
})

describe("submitted study responses", () => {
  it("ignores every response action after a successful submission", () => {
    // Given a valid rejection has been submitted.
    const submitted = updateStudyResponse(withResponse({ verdict: "rejected" }), {
      type: "submit",
    })
    expect(submitted.status).toBe("submitted")
    // When any response action is dispatched.
    const actions: readonly ResponseAction[] = [
      { type: "verdict", verdict: "accepted" },
      { type: "explain", text: "Changed after submission" },
      { type: "submit" },
    ]
    // Then every action is ignored and the submitted state is unchanged.
    for (const action of actions) {
      expect(updateStudyResponse(submitted, action)).toBe(submitted)
    }
  })
})
