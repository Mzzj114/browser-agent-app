import { useMessages } from "../../i18n"

type StudyTaskStripProps = {
  readonly task: string
}

export function StudyTaskStrip({ task }: StudyTaskStripProps): React.JSX.Element {
  const messages = useMessages()

  return (
    <details className="study-task-strip">
      <summary className="study-task-summary" title={messages.study.originalTaskHint}>
        <span className="study-task-summary-label">{messages.study.originalTask}</span>
        <span className="study-task-excerpt">{task}</span>
      </summary>
      <div className="study-task-body">
        <p className="study-task-text">{task}</p>
        <p className="study-task-note">{messages.study.syntheticProvenance}</p>
      </div>
    </details>
  )
}
