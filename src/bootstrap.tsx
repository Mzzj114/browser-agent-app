import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import { loadRunIndex, loadStudyRun } from "./data/load-study-runs"
import type { StudyCondition } from "./domain/study-condition"
import type { StudyRunIndex } from "./domain/study-run-schema"
import { HTML_LANG, initialLocale, LocaleProvider, messagesFor } from "./i18n"
import { RunPicker } from "./RunPicker"
import { caseCodes } from "./study/case-codes.ts"
import { parseStudyLink } from "./study/case-link.ts"
import { submissionSinkConfig } from "./study/config.ts"
import type { StudySession } from "./study/session.ts"

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

  const renderError = (title: string, hint: string): void => {
    root.render(
      <StrictMode>
        <BootstrapError title={title} hint={hint} />
      </StrictMode>,
    )
  }

  const link = parseStudyLink(new URL(window.location.href).searchParams, caseCodes)
  if (link.kind === "invalid") {
    renderError(messages.invalidLinkTitle, messages.invalidLinkHint)
    return
  }

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
    renderError(messages.loadErrorTitle, messages.loadErrorHint)
    return
  }

  if (link.kind === "demo") {
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
      renderError(messages.loadErrorTitle, messages.loadErrorHint)
    }
    return
  }

  const sinkConfig = submissionSinkConfig(import.meta.env)
  if (sinkConfig === null) {
    renderError(messages.studyConfigErrorTitle, messages.studyConfigErrorHint)
    return
  }

  const summary = index.runs.find((run) => run.id === link.runId)
  if (summary === undefined) {
    renderError(messages.invalidLinkTitle, messages.invalidLinkHint)
    return
  }

  const session: StudySession = {
    participantCode: link.participantCode,
    caseOrder: link.caseOrder,
    caseCode: link.caseCode,
    runId: link.runId,
    condition,
    fixtureRevision: index.fixtureRevision,
    appVersion: __APP_VERSION__,
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
        <App runs={runs} study={session} />
      </StrictMode>,
    )
  } catch {
    renderError(messages.loadErrorTitle, messages.loadErrorHint)
  }
}
