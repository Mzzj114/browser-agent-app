import { BrandMark } from "./components/ui/buttons"
import { LanguageToggle } from "./components/ui/language-toggle"
import type { StudyRunIndex } from "./domain/study-run-schema"
import { useLocale } from "./i18n"

type RunPickerProps = {
  readonly index: StudyRunIndex
  readonly unknownRun?: string | undefined
}

function runHref(runId: string): string {
  const url = new URL(window.location.href)
  url.searchParams.set("run", runId)
  return `${url.pathname}${url.search}`
}

export function RunPicker({ index, unknownRun }: RunPickerProps): React.JSX.Element {
  const { locale, messages } = useLocale()
  const study = messages.study

  return (
    <>
      <div className="app-shell picker-shell">
        <h1 className="sr-only">{study.chooseRun}</h1>
        <header className="product-header">
          <BrandMark />
          <div className="product-header-actions">
            <LanguageToggle />
          </div>
        </header>

        <main className="picker-main">
          <div className="picker-intro">
            <h2>{study.chooseRun}</h2>
            <p>{study.chooseRunHint}</p>
            {unknownRun === undefined ? null : (
              <p className="picker-alert" role="alert">
                <strong>{study.unknownRunTitle}</strong> {study.unknownRunHint}
              </p>
            )}
          </div>

          <nav className="picker-list" aria-label={study.runListLabel}>
            <ul>
              {index.runs.map((run) => (
                <li key={run.id}>
                  <a className="picker-item" href={runHref(run.id)}>
                    <span className="picker-ordinal">{study.runOrdinal(run.ordinal)}</span>
                    <span className="picker-title">{run.title[locale]}</span>
                    <span className="picker-meta">
                      {study.runStepCount(run.steps)} · {study.englishPageNote}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </main>
      </div>
    </>
  )
}
