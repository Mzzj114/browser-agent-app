import type { DecisionAction, DecisionState } from "../../domain/replay"
import type { Messages } from "../../i18n"
import { useMessages } from "../../i18n"
import { ActionButton } from "./buttons"
import { Disclosure } from "./disclosure"

type DecisionFooterProps = {
  readonly state: DecisionState
  readonly onDecision: (action: DecisionAction) => void
}

function decisionStatus(state: DecisionState, messages: Messages): string {
  if (state.choice === null) return ""
  if (state.status === "submitted") {
    return messages.decisionSubmittedStatus(state.choice === "accepted")
  }
  return messages.decisionPendingStatus(state.choice === "accepted")
}

export function DecisionFooter({ state, onDecision }: DecisionFooterProps) {
  const messages = useMessages()
  const submitted = state.status === "submitted"
  const status = decisionStatus(state, messages)
  return (
    <footer
      className="decision-footer"
      data-status={state.status}
      data-choice={state.choice ?? "none"}
      data-revisions={state.revisions}
    >
      <p id="decision-question">{messages.decisionQuestion}</p>
      <fieldset
        className="decision-actions"
        aria-labelledby="decision-question"
        disabled={submitted}
      >
        <ActionButton
          disabled={submitted}
          selected={state.choice === "accepted"}
          onClick={() => onDecision({ type: "select", choice: "accepted" })}
        >
          {messages.acceptResult}
        </ActionButton>
        <ActionButton
          disabled={submitted}
          selected={state.choice === "rejected"}
          onClick={() => onDecision({ type: "select", choice: "rejected" })}
        >
          {messages.rejectResult}
        </ActionButton>
      </fieldset>
      <div className="decision-submit-row">
        <ActionButton
          disabled={submitted || state.choice === null}
          aria-describedby="decision-consequence"
          onClick={() => onDecision({ type: "submit" })}
        >
          {messages.decisionSubmit}
        </ActionButton>
        <p className="decision-status" aria-live="polite">
          {status}
        </p>
      </div>
      <p id="decision-consequence" className="decision-explanation">
        {messages.decisionExplanation}
      </p>
      {state.revisions > 0 ? (
        <p className="decision-revisions">{messages.decisionRevisions(state.revisions)}</p>
      ) : null}
      <Disclosure label={messages.decisionReasonLabel}>
        <label className="decision-reason-field">
          <span className="sr-only">{messages.decisionReasonLabel}</span>
          <textarea
            aria-label={messages.decisionReasonLabel}
            value={state.reason}
            maxLength={500}
            rows={2}
            disabled={submitted}
            placeholder={messages.decisionReasonPlaceholder}
            onChange={(event) => onDecision({ type: "reason", reason: event.target.value })}
          />
        </label>
      </Disclosure>
    </footer>
  )
}
