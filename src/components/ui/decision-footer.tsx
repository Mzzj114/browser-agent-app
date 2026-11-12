import { assertNever } from "../../domain/assert-never"
import type { DecisionChoice, DecisionState } from "../../domain/replay"
import { ActionButton } from "./buttons"

type DecisionFooterProps = {
  readonly state: DecisionState
  readonly onDecision: (choice: DecisionChoice) => void
}

type DecisionView = {
  readonly disabled: boolean
  readonly choice: DecisionChoice | null
  readonly status: string
}

function decisionView(state: DecisionState): DecisionView {
  switch (state.kind) {
    case "undecided":
      return { disabled: false, choice: null, status: "选择后不可更改。" }
    case "decided":
      return {
        disabled: true,
        choice: state.choice,
        status: `已记录：${state.choice === "accepted" ? "接受结果" : "拒绝结果"}。本次选择不可更改。`,
      }
    default:
      return assertNever(state)
  }
}

export function DecisionFooter({ state, onDecision }: DecisionFooterProps) {
  const view = decisionView(state)
  return (
    <footer className="decision-footer">
      <p id="decision-question">你是否接受 Agent 的任务结果？</p>
      <fieldset className="decision-actions" aria-labelledby="decision-question">
        <ActionButton
          disabled={view.disabled}
          selected={view.choice === "accepted"}
          onClick={() => onDecision("accepted")}
        >
          接受结果
        </ActionButton>
        <ActionButton
          disabled={view.disabled}
          selected={view.choice === "rejected"}
          onClick={() => onDecision("rejected")}
        >
          拒绝结果
        </ActionButton>
      </fieldset>
      <p className="decision-status" aria-live="polite">
        {view.status}
      </p>
    </footer>
  )
}
