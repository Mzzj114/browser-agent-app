import { ChevronRight, Monitor } from "lucide-react"
import type { AgentStep } from "../../domain/run-schema"
import { sanitizeTechnicalCode } from "../../domain/technical-details"
import { useMessages } from "../../i18n"
import { CodeCell } from "./code-cell"
import { Disclosure } from "./disclosure"

type StepCardProps = {
  readonly step: AgentStep
  readonly selected: boolean
  readonly onSelect: () => void
}

export function StepCard({ step, selected, onSelect }: StepCardProps) {
  const messages = useMessages()
  return (
    <article
      className="step-card"
      data-selected={selected}
      aria-label={messages.stepAriaLabel(step.ordinal)}
    >
      <button
        type="button"
        className="step-select"
        aria-pressed={selected}
        onClick={onSelect}
        aria-label={messages.stepSelectLabel(step.ordinal, step.action, selected)}
      >
        <span className="step-heading">
          <span className="step-number">{messages.stepHeading(step.ordinal)}</span>
          <span className="step-action">{step.action}</span>
        </span>
        <span className="step-page-action">
          <Monitor aria-hidden="true" />
          <span>{selected ? messages.viewingPage : messages.viewPage}</span>
          <ChevronRight aria-hidden="true" />
        </span>
      </button>
      <div className="step-body">
        <Disclosure label={messages.technicalDetails(step.cells.length)}>
          <div className="technical-details">
            {step.thinking ? (
              <Disclosure label={messages.viewThinking}>{step.thinking}</Disclosure>
            ) : null}
            {step.cells.map((cell, index) => (
              <CodeCell
                key={`${step.id}-${cell.code}`}
                cell={cell}
                index={index + 1}
                displayCode={sanitizeTechnicalCode(
                  cell.code,
                  messages.technicalFinalReportRedacted,
                )}
              />
            ))}
          </div>
        </Disclosure>
      </div>
    </article>
  )
}
