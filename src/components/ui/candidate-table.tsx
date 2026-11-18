import type * as React from "react"
import type { Candidate, DecisionHead, ScoredCandidate } from "../../domain/decision-run-schema"
import { useLocale, useMessages } from "../../i18n"

type CandidateTableProps =
  | {
      readonly mode: "candidates"
      readonly head: DecisionHead<Candidate>
      readonly caption: string
    }
  | {
      readonly mode: "probabilities"
      readonly head: DecisionHead<ScoredCandidate>
      readonly caption: string
    }

type CandidateRowProps = {
  readonly candidate: Candidate
  readonly selected: boolean
  readonly selectedLabel: string
  readonly probability: string | null
}

function CandidateRow({ candidate, selected, selectedLabel, probability }: CandidateRowProps) {
  return (
    <tr data-candidate-id={candidate.id} data-selected={selected}>
      <th scope="row" className="candidate-label">
        <span>{candidate.label}</span>
        {selected ? <span className="candidate-selected">{selectedLabel}</span> : null}
      </th>
      <td className="candidate-context">{candidate.context ?? ""}</td>
      {probability === null ? null : <td className="candidate-probability">{probability}</td>}
    </tr>
  )
}

export function CandidateTable(props: CandidateTableProps): React.JSX.Element {
  const { locale } = useLocale()
  const messages = useMessages()
  const numberFormat = new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  const scored = props.mode === "probabilities"

  return (
    <table className="candidate-table" data-mode={props.mode}>
      <caption className="candidate-caption">{props.caption}</caption>
      <thead>
        <tr>
          <th scope="col">{messages.study.candidateColumn}</th>
          <th scope="col">{messages.study.contextColumn}</th>
          {scored ? <th scope="col">{messages.study.probabilityColumn}</th> : null}
        </tr>
      </thead>
      <tbody>
        {props.mode === "probabilities"
          ? props.head.offered.map((candidate) => (
              <CandidateRow
                key={candidate.id}
                candidate={candidate}
                selected={candidate.id === props.head.selectedId}
                selectedLabel={messages.study.selected}
                probability={numberFormat.format(candidate.probability)}
              />
            ))
          : props.head.offered.map((candidate) => (
              <CandidateRow
                key={candidate.id}
                candidate={candidate}
                selected={candidate.id === props.head.selectedId}
                selectedLabel={messages.study.selected}
                probability={null}
              />
            ))}
      </tbody>
    </table>
  )
}
