import type * as React from "react"
import { useId, useState } from "react"
import type { Candidate, DecisionHead } from "../../domain/decision-run-schema"
import { useLocale, useMessages } from "../../i18n"
import type { Locale } from "../../i18n/locale"

export type DecisionChoiceGroupProps = {
  readonly kind: "actions" | "things"
  readonly heading: string
  readonly otherChoicesHeading: string
  readonly head: DecisionHead<Candidate> & { readonly previewIds: readonly string[] }
  readonly reportedConfidence?: number | null
}

const rawIdentifierPrefix = /^\[[A-Za-z0-9:_-]+\]\s+/

function formatConfidence(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value)
}

function displayLabel(label: string): string {
  const stripped = label.replace(rawIdentifierPrefix, "").trim()
  return stripped.length > 0 ? stripped : label
}

function AlternativeCard({ candidate }: { readonly candidate: Candidate }) {
  return (
    <li
      className="decision-choice-card decision-choice-card-alternative"
      data-choice="alternative"
      data-candidate-id={candidate.id}
    >
      <span className="decision-choice-label">{displayLabel(candidate.label)}</span>
      {candidate.context ? (
        <span className="decision-choice-context">{candidate.context}</span>
      ) : null}
    </li>
  )
}

export function DecisionChoiceGroup({
  kind,
  heading,
  otherChoicesHeading,
  head,
  reportedConfidence,
}: DecisionChoiceGroupProps): React.JSX.Element | null {
  const { locale } = useLocale()
  const messages = useMessages()
  const [expanded, setExpanded] = useState(false)
  const headingId = useId()

  const chosen = head.offered.find((candidate) => candidate.id === head.selectedId)
  const previews = head.previewIds.flatMap((previewId) => {
    const candidate = head.offered.find((item) => item.id === previewId)
    return candidate ? [candidate] : []
  })
  const previewIds = new Set(head.previewIds)
  const remaining = head.offered.filter(
    (candidate) => candidate.id !== head.selectedId && !previewIds.has(candidate.id),
  )

  if (!chosen) return null

  const moreLabel =
    kind === "actions"
      ? messages.study.moreActions(remaining.length)
      : messages.study.moreThings(remaining.length)
  const fewerLabel = kind === "actions" ? messages.study.fewerActions : messages.study.fewerThings

  return (
    <section className="decision-choice-group" data-choice-kind={kind} aria-labelledby={headingId}>
      <div
        className="decision-choice-card decision-choice-card-chosen"
        data-choice="chosen"
        data-candidate-id={chosen.id}
      >
        <div className="decision-choice-chosen-main">
          <h3 id={headingId} className="decision-choice-heading">
            {heading}
          </h3>
          <span className="decision-choice-label">{displayLabel(chosen.label)}</span>
          <span className="decision-choice-selected sr-only">{messages.study.selected}</span>
          {chosen.context ? (
            <span className="decision-choice-context">{chosen.context}</span>
          ) : null}
        </div>
        {reportedConfidence === undefined ? null : (
          <span className="decision-choice-confidence">
            <span className="decision-choice-confidence-label">
              {messages.study.confidenceLabel}
            </span>
            <span className="decision-choice-confidence-value">
              {reportedConfidence === null
                ? messages.study.confidenceUnavailable
                : formatConfidence(reportedConfidence, locale)}
            </span>
          </span>
        )}
      </div>

      {previews.length > 0 ? (
        <h4 className="decision-choice-subheading">{otherChoicesHeading}</h4>
      ) : null}

      {previews.length > 0 || remaining.length > 0 ? (
        <ul className="decision-choice-alternatives">
          {previews.map((candidate) => (
            <AlternativeCard key={candidate.id} candidate={candidate} />
          ))}
          {remaining.length > 0 ? (
            <li className="decision-choice-toggle-item">
              <button
                type="button"
                className="decision-choice-toggle"
                aria-expanded={expanded}
                onClick={() => setExpanded((open) => !open)}
              >
                {expanded ? fewerLabel : moreLabel}
              </button>
            </li>
          ) : null}
          {expanded
            ? remaining.map((candidate) => (
                <AlternativeCard key={candidate.id} candidate={candidate} />
              ))
            : null}
        </ul>
      ) : null}
    </section>
  )
}
