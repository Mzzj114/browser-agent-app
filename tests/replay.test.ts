import { describe, expect, it } from "vitest"
import {
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
