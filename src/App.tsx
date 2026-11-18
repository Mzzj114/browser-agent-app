import { ListTree } from "lucide-react"
import { useReducer, useState } from "react"
import { BrowserFrame } from "./components/ui/browser-frame"
import { BrandMark, StatusBadge } from "./components/ui/buttons"
import { DecisionInspector } from "./components/ui/decision-inspector"
import { DesktopOnlyMessage } from "./components/ui/desktop-only"
import { ExecutionRail } from "./components/ui/execution-rail"
import { LanguageToggle } from "./components/ui/language-toggle"
import { ReplayControls } from "./components/ui/replay-controls"
import { StudyResponseForm } from "./components/ui/study-response-form"
import {
  initialViewedSelection,
  nextViewedSelection,
  normalizeViewedSelection,
  previousViewedSelection,
  type ViewedSelection,
  viewedObservation,
} from "./domain/decision-replay"
import {
  initialStudyResponse,
  type ResponseAction,
  type StudyResponse,
  updateStudyResponse,
} from "./domain/study-response"
import type { StudyRun, StudyRuns } from "./domain/study-run-schema"
import type { Locale } from "./i18n"
import { LocaleProvider, useLocale } from "./i18n"

type AppProps = {
  readonly runs: StudyRuns
}

type ViewedEpisode = {
  readonly index: number
  readonly episode: StudyRun["episodes"][number]
}

function selectedEpisode(run: StudyRun, viewed: ViewedSelection): ViewedEpisode | null {
  if (viewed.kind === "final") return null
  const index = run.episodes.findIndex((episode) => episode.id === viewed.episodeId)
  const episode = run.episodes[index]
  return index < 0 || episode === undefined ? null : { index, episode }
}

function formatCapturedAt(iso: string, locale: Locale): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function App({ runs }: AppProps): React.JSX.Element {
  return (
    <LocaleProvider>
      <StudyWorkspace runs={runs} />
    </LocaleProvider>
  )
}

function StudyWorkspace({ runs }: AppProps): React.JSX.Element {
  const { locale, messages } = useLocale()
  const run = runs[locale]
  const episodeIds = run.episodes.map((episode) => episode.id)
  const [viewed, setViewed] = useState<ViewedSelection>(initialViewedSelection)
  const activeViewed = normalizeViewedSelection(viewed, episodeIds)
  const viewedEpisode = selectedEpisode(run, activeViewed)
  const observation = viewedObservation(run, activeViewed)
  const [response, dispatchResponse] = useReducer(
    (state: StudyResponse, action: ResponseAction) =>
      updateStudyResponse(state, action, episodeIds),
    initialStudyResponse(),
  )

  const stateLabel =
    viewedEpisode === null
      ? messages.lastRecordedState
      : messages.study.beforeStepCaption(viewedEpisode.episode.ordinal, run.episodes.length)
  const stateNote = viewedEpisode === null ? messages.lastRecordedStateNote : null
  const actionLabel = viewedEpisode?.episode.action ?? null
  const capturedAtLabel = messages.capturedAt(formatCapturedAt(observation.capturedAt, locale))

  const viewEpisode = (episodeId: string) => {
    setViewed({ kind: "episode", episodeId })
  }
  const goToStep = (stepIndex: number) => {
    const episode = run.episodes[stepIndex]
    if (episode) viewEpisode(episode.id)
  }
  const goPrevious = () => {
    setViewed((current) => previousViewedSelection(current, episodeIds))
  }
  const goNext = () => {
    setViewed((current) => nextViewedSelection(current, episodeIds))
  }
  const goFinal = () => {
    setViewed(initialViewedSelection())
  }

  return (
    <>
      <div className="app-shell study-shell">
        <h1 className="sr-only">{messages.workspaceHeading}</h1>
        <header className="product-header">
          <BrandMark />
          <div className="product-header-actions">
            <StatusBadge label={messages.stepCountBadge(run.episodes.length)} icon={<ListTree />} />
            <LanguageToggle />
          </div>
        </header>

        <section className="study-context" aria-label={messages.study.originalTask}>
          <article className="study-context-panel" aria-labelledby="study-task-heading">
            <h2 id="study-task-heading">{messages.study.originalTask}</h2>
            <p>{run.task}</p>
          </article>
          <article className="study-context-panel" aria-labelledby="study-report-heading">
            <h2 id="study-report-heading">{messages.study.agentReportedResult}</h2>
            <p>{run.report}</p>
            <p className="study-context-note">{messages.study.syntheticProvenance}</p>
          </article>
        </section>

        <main className="study-main">
          <ExecutionRail
            episodes={run.episodes}
            viewed={activeViewed}
            localization={response.localization}
            onView={viewEpisode}
          />

          <section className="study-page" aria-labelledby="study-page-heading">
            <h2 id="study-page-heading" className="sr-only">
              {messages.pageResultHeading}
            </h2>
            <BrowserFrame
              pageState={observation}
              stepCount={run.episodes.length}
              stateLabel={stateLabel}
              stateNote={stateNote}
              actionLabel={actionLabel}
              capturedAtLabel={capturedAtLabel}
            />
            <div className="study-replay-bar">
              <ReplayControls
                currentStep={viewedEpisode?.index ?? null}
                steps={run.episodes}
                onPrevious={goPrevious}
                onNext={goNext}
                onFinal={goFinal}
                onJump={goToStep}
              />
            </div>
          </section>

          <aside className="study-inspector-panel">
            <DecisionInspector
              run={run}
              viewed={activeViewed}
              response={response}
              onResponse={dispatchResponse}
            />
          </aside>
        </main>

        <section className="study-response" aria-label={messages.decisionQuestion}>
          <StudyResponseForm
            episodes={run.episodes}
            state={response}
            onResponse={dispatchResponse}
          />
        </section>
      </div>
      <DesktopOnlyMessage />
    </>
  )
}
