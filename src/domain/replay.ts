import { assertNever } from "./assert-never"

export type ReplaySelection =
  | { readonly kind: "final" }
  | { readonly kind: "step"; readonly stepIndex: number }

export type DecisionChoice = "accepted" | "rejected"

export type DecisionState = {
  readonly status: "pending" | "submitted"
  readonly choice: DecisionChoice | null
  readonly reason: string
  readonly revisions: number
}

export type DecisionAction =
  | { readonly type: "select"; readonly choice: DecisionChoice }
  | { readonly type: "reason"; readonly reason: string }
  | { readonly type: "submit" }

export function initialReplaySelection(): ReplaySelection {
  return { kind: "final" }
}

export function stepReplaySelection(stepIndex: number): ReplaySelection {
  return { kind: "step", stepIndex }
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

export function clampReplaySelection(
  selection: ReplaySelection,
  stepCount: number,
): ReplaySelection {
  switch (selection.kind) {
    case "final":
      return selection
    case "step": {
      if (stepCount <= 0) return finalReplaySelection()
      const stepIndex = Math.min(Math.max(selection.stepIndex, 0), stepCount - 1)
      return stepIndex === selection.stepIndex ? selection : stepReplaySelection(stepIndex)
    }
    default:
      return assertNever(selection)
  }
}

export function initialDecisionState(): DecisionState {
  return { status: "pending", choice: null, reason: "", revisions: 0 }
}

export function updateDecision(state: DecisionState, action: DecisionAction): DecisionState {
  if (state.status === "submitted") return state
  switch (action.type) {
    case "select":
      if (state.choice === action.choice) return state
      return {
        ...state,
        choice: action.choice,
        revisions: state.choice === null ? state.revisions : state.revisions + 1,
      }
    case "reason":
      return action.reason === state.reason ? state : { ...state, reason: action.reason }
    case "submit":
      return state.choice === null ? state : { ...state, status: "submitted" }
    default:
      return assertNever(action)
  }
}
