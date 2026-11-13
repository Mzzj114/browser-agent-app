import { assertNever } from "../../domain/assert-never"
import type { DecisionChoice, DecisionState } from "../../domain/replay"
import type { Messages } from "../../i18n"
import { useMessages } from "../../i18n"
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

function decisionView(state: DecisionState, messages: Messages): DecisionView {
  switch (state.kind) {
    case "undecided":
      return { disabled: false, choice: null, status: "" }
    case "decided":
      return {
        disabled: true,
        choice: state.choice,
        status: messages.decisionStatus(state.choice === "accepted"),
      }
    default:
      return assertNever(state)
  }
}

export function DecisionFooter({ state, onDecision }: DecisionFooterProps) {
  const messages = useMessages()
  const view = decisionView(state, messages)
  return (
    <footer className="decision-footer">
      <p id="decision-question">{messages.decisionQuestion}</p>
      <fieldset className="decision-actions" aria-labelledby="decision-question">
        <ActionButton
          disabled={view.disabled}
          selected={view.choice === "accepted"}
          onClick={() => onDecision("accepted")}
        >
          {messages.acceptResult}
        </ActionButton>
        <ActionButton
          disabled={view.disabled}
          selected={view.choice === "rejected"}
          onClick={() => onDecision("rejected")}
        >
          {messages.rejectResult}
        </ActionButton>
      </fieldset>
      <p className="decision-status" aria-live="polite">
        {view.status}
      </p>
    </footer>
  )
}
