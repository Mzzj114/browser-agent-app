import { Code2 } from "lucide-react"
import type { PythonCell } from "../../domain/run-schema"
import { useMessages } from "../../i18n"
import { Disclosure } from "./disclosure"

type CodeCellProps = {
  readonly cell: PythonCell
  readonly index: number
}

export function CodeCell({ cell, index }: CodeCellProps) {
  const messages = useMessages()
  const result = cell.result
  return (
    <section className="code-cell" aria-label={messages.pythonCellLabel(index)}>
      <div className="code-cell-heading">
        <Code2 aria-hidden="true" />
        <span>{messages.pythonCellHeading(index)}</span>
      </div>
      <pre className="code-block">
        <code>{cell.code}</code>
      </pre>
      {result ? (
        <Disclosure
          label={result.isError ? messages.showErrorOutput : messages.showOutput}
          defaultOpen={result.isError}
          tone={result.isError ? "error" : "default"}
        >
          <pre className="output-block" data-error={result.isError}>
            <code>{result.content}</code>
          </pre>
        </Disclosure>
      ) : null}
    </section>
  )
}
