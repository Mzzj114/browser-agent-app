export type ReplaySelection =
  | { readonly kind: "final" }
  | { readonly kind: "step"; readonly stepIndex: number }

export type DecisionChoice = "accepted" | "rejected"

export type DecisionState =
  | { readonly kind: "undecided" }
  | { readonly kind: "decided"; readonly choice: DecisionChoice }

export function initialReplaySelection(): ReplaySelection {
  return { kind: "final" }
}

export function stepReplaySelection(stepIndex: number): ReplaySelection {
  return { kind: "step", stepIndex }
}

class UnexpectedStateError extends Error {
  public constructor(public readonly state: never) {
    super("Unsupported replay or decision state")
    this.name = "UnexpectedStateError"
  }
}

function assertNever(value: never): never {
  throw new UnexpectedStateError(value)
}

export function previousReplaySelection(
  selection: ReplaySelection,
  stepCount: number,
): ReplaySelection {
  switch (selection.kind) {
    case "final":
      return stepCount > 0 ? { kind: "step", stepIndex: stepCount - 1 } : selection
    case "step":
      return selection.stepIndex > 0
        ? { kind: "step", stepIndex: selection.stepIndex - 1 }
        : selection
    default:
      return assertNever(selection)
  }
}

export function nextReplaySelection(
  selection: ReplaySelection,
  stepCount: number,
): ReplaySelection {
  switch (selection.kind) {
    case "final":
      return selection
    case "step":
      return selection.stepIndex + 1 < stepCount
        ? { kind: "step", stepIndex: selection.stepIndex + 1 }
        : selection
    default:
      return assertNever(selection)
  }
}

export function finalReplaySelection(): ReplaySelection {
  return { kind: "final" }
}

export function submitDecision(
  current: DecisionState,
  choice: DecisionChoice,
): DecisionState {
  switch (current.kind) {
    case "undecided":
      return { kind: "decided", choice }
    case "decided":
      return current
    default:
      return assertNever(current)
  }
}
