import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import { RunPicker } from "./RunPicker"
import { loadRunIndex, loadStudyRun } from "./data/load-study-runs"
import type { StudyCondition } from "./domain/study-condition"
import type { StudyRunIndex } from "./domain/study-run-schema"
import { HTML_LANG, initialLocale, LocaleProvider, messagesFor } from "./i18n"

type BootstrapNoticeProps = {
  readonly text: string
}

function BootstrapLoading({ text }: BootstrapNoticeProps): React.JSX.Element {
  return (
    <main className="study-bootstrap" role="status" aria-live="polite">
      <p>{text}</p>
    </main>
  )
}

type BootstrapErrorProps = {
  readonly title: string
  readonly hint: string
}

function BootstrapError({ title, hint }: BootstrapErrorProps): React.JSX.Element {
  return (
    <main className="study-bootstrap" role="alert">
      <h1>{title}</h1>
      <p>{hint}</p>
    </main>
  )
}

function requestedRunId(): string | null {
  return new URL(window.location.href).searchParams.get("run")
}

export async function mountStudyApp(
  element: HTMLElement,
  baseUrl: URL,
  condition: StudyCondition,
): Promise<void> {
  const root = createRoot(element)
  const locale = initialLocale()
  const localizedMessages = messagesFor(locale)
  const messages = localizedMessages.study

  document.documentElement.lang = HTML_LANG[locale]
  document.title = localizedMessages.appTitle

  root.render(
    <StrictMode>
      <BootstrapLoading text={messages.loadingRuns} />
    </StrictMode>,
  )

  const runsBaseUrl = new URL("runs/", baseUrl)
  let index: StudyRunIndex
  try {
    index = await loadRunIndex(runsBaseUrl, condition)
  } catch {
    root.render(
      <StrictMode>
        <BootstrapError title={messages.loadErrorTitle} hint={messages.loadErrorHint} />
      </StrictMode>,
    )
    return
  }

  const runId = requestedRunId()
  const summary = runId === null ? undefined : index.runs.find((run) => run.id === runId)

  if (runId === null || summary === undefined) {
    root.render(
      <StrictMode>
        <LocaleProvider>
          <RunPicker index={index} unknownRun={runId ?? undefined} />
        </LocaleProvider>
      </StrictMode>,
    )
    return
  }

  root.render(
    <StrictMode>
      <BootstrapLoading text={messages.loadingStudy} />
    </StrictMode>,
  )

  try {
    const runs = await loadStudyRun(runsBaseUrl, index, summary.id)
    root.render(
      <StrictMode>
        <App runs={runs} />
      </StrictMode>,
    )
  } catch {
    root.render(
      <StrictMode>
        <BootstrapError title={messages.loadErrorTitle} hint={messages.loadErrorHint} />
      </StrictMode>,
    )
  }
}
