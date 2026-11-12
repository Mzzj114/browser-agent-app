import { Code2 } from "lucide-react"
import type { PythonCell } from "../../domain/run-schema"
import { Disclosure } from "./disclosure"

type CodeCellProps = {
  readonly cell: PythonCell
  readonly index: number
}

export function CodeCell({ cell, index }: CodeCellProps) {
  const result = cell.result
  return (
    <section className="code-cell" aria-label={`Python 单元 ${index}`}>
      <div className="code-cell-heading">
        <Code2 aria-hidden="true" />
        <span>Python · 单元 {index}</span>
      </div>
      <pre className="code-block">
        <code>{cell.code}</code>
      </pre>
      {result ? (
        <Disclosure
          label={result.isError ? "查看错误输出" : "查看输出"}
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
