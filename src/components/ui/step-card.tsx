import { ChevronRight, Monitor } from "lucide-react"
import type { AgentStep } from "../../domain/run-schema"
import { CodeCell } from "./code-cell"
import { Disclosure } from "./disclosure"

type StepCardProps = {
  readonly step: AgentStep
  readonly selected: boolean
  readonly onSelect: () => void
}

export function StepCard({ step, selected, onSelect }: StepCardProps) {
  return (
    <article className="step-card" data-selected={selected} aria-label={`步骤 ${step.ordinal}`}>
      <button
        type="button"
        className="step-select"
        aria-pressed={selected}
        onClick={onSelect}
        aria-label={`步骤 ${step.ordinal}：${selected ? "正在查看页面" : "查看页面"}`}
      >
        <span className="step-heading">
          <span className="step-number">步骤 {step.ordinal}</span>
          <span className="step-metadata">{step.cells.length} 个 Python 单元</span>
        </span>
        <span className="step-page-action">
          <Monitor aria-hidden="true" />
          <span>{selected ? "正在查看" : "查看页面"}</span>
          <ChevronRight aria-hidden="true" />
        </span>
      </button>
      <div className="step-body">
        {step.thinking ? <Disclosure label="查看模型思考">{step.thinking}</Disclosure> : null}
        {step.cells.map((cell, index) => (
          <CodeCell key={`${step.id}-${cell.code}`} cell={cell} index={index + 1} />
        ))}
      </div>
    </article>
  )
}
