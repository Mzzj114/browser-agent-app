import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import { StudySubmittedNotice } from "./components/ui/study-submitted-notice"
import { loadRunIndex, loadStudyRun } from "./data/load-study-runs"
import type { StudyCondition } from "./domain/study-condition"
import type { StudyRunIndex } from "./domain/study-run-schema"
import { HTML_LANG, initialLocale, LocaleProvider, messagesFor } from "./i18n"
import { RunPicker } from "./RunPicker"
import { caseCodes } from "./study/case-codes.ts"
import { parseStudyLink } from "./study/case-link.ts"
import { submissionSinkConfig } from "./study/config.ts"
import type { StudyRuntime } from "./study/runtime.ts"
import {
  flushSubmissionQueue,
  queuedSubmissionStatus,
  readCompletedMarker,
} from "./study/submission-store.ts"
import { restSubmissionSink } from "./study/supabase-rest.ts"

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

  const sink = restSubmissionSink(sinkConfig)

  const marker = readCompletedMarker(
    window.localStorage,
    link.participantCode,
    link.caseOrder,
    link.runId,
  )
  if (marker !== null) {
    // A submitted case never revives a blank form on reload or the back button.
    const renderSubmittedNotice = () => {
      root.render(
        <StrictMode>
          <LocaleProvider>
            <StudySubmittedNotice
              uploadStatus={queuedSubmissionStatus(window.localStorage, marker.submissionId)}
            />
          </LocaleProvider>
        </StrictMode>,
      )
    }
    renderSubmittedNotice()
    void flushSubmissionQueue(window.localStorage, sink).then(renderSubmittedNotice)
    return
  }

  // A fresh case still retries anything older that is queued on this device.
  void flushSubmissionQueue(window.localStorage, sink)

  const summary = index.runs.find((run) => run.id === link.runId)
  if (summary === undefined) {
    renderError(messages.invalidLinkTitle, messages.invalidLinkHint)
    return
  }

  const runtime: StudyRuntime = {
    session: {
      participantCode: link.participantCode,
      caseOrder: link.caseOrder,
      caseCode: link.caseCode,
      runId: link.runId,
      condition,
      fixtureRevision: index.fixtureRevision,
      appVersion: __APP_VERSION__,
    },
    sink,
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
        <App runs={runs} study={runtime} />
      </StrictMode>,
    )
  } catch {
    renderError(messages.loadErrorTitle, messages.loadErrorHint)
  }
}
