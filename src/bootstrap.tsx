import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import { loadStudyRuns } from "./data/load-study-runs"
import type { StudyCondition } from "./domain/study-condition"
import { HTML_LANG, initialLocale, messagesFor } from "./i18n"

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
      <BootstrapLoading text={messages.loadingStudy} />
    </StrictMode>,
  )

  try {
    const fixtureBaseUrl = new URL("study/", baseUrl)
    const runs = await loadStudyRuns(fixtureBaseUrl, condition)
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
