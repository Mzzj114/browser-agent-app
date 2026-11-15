import { describe, expect, it } from "vitest"
import {
  clampReplaySelection,
  finalReplaySelection,
  initialDecisionState,
  initialReplaySelection,
  nextReplaySelection,
  previousReplaySelection,
  stepReplaySelection,
  updateDecision,
} from "../src/domain/replay"

describe("replay selection", () => {
  it("shows the final page state when the run opens", () => {
    // Given a completed run is opening.
    // When the initial selection is created.
    const selection = initialReplaySelection()
    // Then the final state is selected.
    expect(selection).toEqual({ kind: "final" })
  })

  it("moves to the last step when previous is chosen from the final state", () => {
    // Given the final state of an eight-step run.
    const selection = initialReplaySelection()
    // When previous is chosen.
    const previous = previousReplaySelection(selection, 8)
    // Then the last execution step is selected.
    expect(previous).toEqual({ kind: "step", stepIndex: 7 })
  })

  it("keeps the first step selected when previous is chosen at the boundary", () => {
    // Given the first step is selected.
    const selection = stepReplaySelection(0)
    // When previous is chosen.
    const previous = previousReplaySelection(selection, 8)
    // Then the selection does not move outside the run.
    expect(previous).toEqual(selection)
  })

  it("moves to the following step when next is chosen inside the run", () => {
    // Given the second step is selected.
    const selection = stepReplaySelection(1)
    // When next is chosen.
    const next = nextReplaySelection(selection, 8)
    // Then the third step is selected.
    expect(next).toEqual({ kind: "step", stepIndex: 2 })
  })

  it("keeps the last step selected when next is chosen at the boundary", () => {
    // Given the last step is selected.
    const selection = stepReplaySelection(7)
    // When next is chosen.
    const next = nextReplaySelection(selection, 8)
    // Then the selection does not move outside the run.
    expect(next).toEqual(selection)
  })

  it("keeps the final state selected when next is chosen", () => {
    // Given the final state is selected.
    const selection = finalReplaySelection()
    // When next is chosen.
    const next = nextReplaySelection(selection, 8)
    // Then the final state remains selected.
    expect(next).toEqual(selection)
  })
})

describe("clampReplaySelection", () => {
  it("keeps the final state for any step count", () => {
    // Given the final state is selected.
    const selection = finalReplaySelection()
    // When the selection is clamped against an eight-step run.
    const clamped = clampReplaySelection(selection, 8)
    // Then the final state is returned unchanged.
    expect(clamped).toBe(selection)
  })

  it("keeps an in-range step unchanged", () => {
    // Given the third step of an eight-step run is selected.
    const selection = stepReplaySelection(2)
    // When the selection is clamped against the run.
    const clamped = clampReplaySelection(selection, 8)
    // Then the same step remains selected.
    expect(clamped).toBe(selection)
  })

  it("clamps a step at the run length to the last step", () => {
    // Given the step index equals the step count.
    const selection = stepReplaySelection(8)
    // When the selection is clamped against the eight-step run.
    const clamped = clampReplaySelection(selection, 8)
    // Then the last step is selected.
    expect(clamped).toEqual({ kind: "step", stepIndex: 7 })
  })

  it("clamps a step beyond the run length to the last step", () => {
    // Given the selected step index is far beyond the run.
    const selection = stepReplaySelection(99)
    // When the selection is clamped against the eight-step run.
    const clamped = clampReplaySelection(selection, 8)
    // Then the last step is selected.
    expect(clamped).toEqual({ kind: "step", stepIndex: 7 })
  })

  it("clamps a negative step index to the first step", () => {
    // Given a negative step index is selected.
    const selection = stepReplaySelection(-3)
    // When the selection is clamped against the eight-step run.
    const clamped = clampReplaySelection(selection, 8)
    // Then the first step is selected.
    expect(clamped).toEqual({ kind: "step", stepIndex: 0 })
  })

  it("returns the final state when the run has no steps", () => {
    // Given a step is selected but the run records no steps.
    const selection = stepReplaySelection(2)
    // When the selection is clamped against an empty run.
    const clamped = clampReplaySelection(selection, 0)
    // Then the final state is selected.
    expect(clamped).toEqual({ kind: "final" })
  })

  it("returns the final state when the step count is negative", () => {
    // Given a step is selected but the step count is negative.
    const selection = stepReplaySelection(2)
    // When the selection is clamped against the negative count.
    const clamped = clampReplaySelection(selection, -1)
    // Then the final state is selected.
    expect(clamped).toEqual({ kind: "final" })
  })
})

describe("decision state", () => {
  it("starts with no tentative choice and no submission", () => {
    expect(initialDecisionState()).toEqual({
      status: "pending",
      choice: null,
      reason: "",
      revisions: 0,
    })
  })

  it("keeps a first selection tentative", () => {
    // Given no choice has been made.
    const current = initialDecisionState()
    // When a choice is selected.
    const decision = updateDecision(current, { type: "select", choice: "accepted" })
    // Then the choice is remembered but nothing is submitted.
    expect(decision).toEqual({
      status: "pending",
      choice: "accepted",
      reason: "",
      revisions: 0,
    })
  })

  it("allows a tentative choice to change and records the revision", () => {
    // Given a tentative acceptance.
    const accepted = updateDecision(initialDecisionState(), {
      type: "select",
      choice: "accepted",
    })
    // When the participant changes to rejection.
    const rejected = updateDecision(accepted, { type: "select", choice: "rejected" })
    // Then the rejection replaces it and the change is counted.
    expect(rejected).toEqual({
      status: "pending",
      choice: "rejected",
      reason: "",
      revisions: 1,
    })
  })

  it("does not count reselecting the same choice as a revision", () => {
    const accepted = updateDecision(initialDecisionState(), {
      type: "select",
      choice: "accepted",
    })
    expect(updateDecision(accepted, { type: "select", choice: "accepted" })).toBe(accepted)
  })

  it("keeps an optional reason while the decision is pending", () => {
    const decided = updateDecision(initialDecisionState(), {
      type: "select",
      choice: "rejected",
    })
    const withReason = updateDecision(decided, { type: "reason", reason: "Wrong product in cart" })
    expect(withReason.reason).toBe("Wrong product in cart")
    expect(withReason.status).toBe("pending")
  })

  it("submits the selected choice and locks later actions", () => {
    // Given a tentative rejection.
    const selected = updateDecision(initialDecisionState(), {
      type: "select",
      choice: "rejected",
    })
    // When it is submitted.
    const submitted = updateDecision(selected, { type: "submit" })
    // Then the submitted state is final.
    expect(submitted.status).toBe("submitted")
    expect(submitted.choice).toBe("rejected")
    expect(updateDecision(submitted, { type: "select", choice: "accepted" })).toBe(submitted)
    expect(updateDecision(submitted, { type: "reason", reason: "changed my mind" })).toBe(submitted)
    expect(updateDecision(submitted, { type: "submit" })).toBe(submitted)
  })

  it("does not submit before a choice is selected", () => {
    const current = initialDecisionState()
    expect(updateDecision(current, { type: "submit" })).toBe(current)
  })
})
