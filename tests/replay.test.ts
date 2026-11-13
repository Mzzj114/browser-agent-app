import { describe, expect, it } from "vitest"
import {
  clampReplaySelection,
  finalReplaySelection,
  initialReplaySelection,
  nextReplaySelection,
  previousReplaySelection,
  stepReplaySelection,
  submitDecision,
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

describe("decision submission", () => {
  it("records acceptance when the first decision is accepted", () => {
    // Given no decision has been submitted.
    const current = { kind: "undecided" } as const
    // When acceptance is submitted.
    const decision = submitDecision(current, "accepted")
    // Then acceptance is recorded.
    expect(decision).toEqual({ kind: "decided", choice: "accepted" })
  })

  it("preserves acceptance when a later rejection is attempted", () => {
    // Given acceptance was already submitted.
    const current = { kind: "decided", choice: "accepted" } as const
    // When another decision is attempted.
    const decision = submitDecision(current, "rejected")
    // Then the original acceptance cannot be changed.
    expect(decision).toEqual(current)
  })

  it("preserves rejection when a later acceptance is attempted", () => {
    // Given rejection was already submitted.
    const current = { kind: "decided", choice: "rejected" } as const
    // When another decision is attempted.
    const decision = submitDecision(current, "accepted")
    // Then the original rejection cannot be changed.
    expect(decision).toEqual(current)
  })
})
