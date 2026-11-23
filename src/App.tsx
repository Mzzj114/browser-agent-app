import { ListTree } from "lucide-react"
import { useEffect, useReducer, useRef, useState } from "react"
import { BrowserFrame } from "./components/ui/browser-frame"
import { BrandMark, StatusBadge } from "./components/ui/buttons"
import { DecisionInspector } from "./components/ui/decision-inspector"
import { DesktopOnlyMessage } from "./components/ui/desktop-only"
import { ExecutionRail } from "./components/ui/execution-rail"
import { LanguageToggle } from "./components/ui/language-toggle"
import { StudyResponseForm } from "./components/ui/study-response-form"
import { StudyTaskStrip } from "./components/ui/study-task-strip"
import {
  initialViewedSelection,
  normalizeViewedSelection,
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
    (state: StudyResponse, action: ResponseAction) => updateStudyResponse(state, action),
    initialStudyResponse(),
  )
  const reviewRef = useRef<HTMLElement>(null)
  const viewedKey = activeViewed.kind === "final" ? "final" : activeViewed.episodeId

  // biome-ignore lint/correctness/useExhaustiveDependencies: the viewed selection key controls the reset.
  useEffect(() => {
    if (reviewRef.current) reviewRef.current.scrollTop = 0
  }, [viewedKey])

  const stateLabel =
    viewedEpisode === null
      ? messages.lastRecordedState
      : messages.study.beforeStepCaption(viewedEpisode.episode.ordinal, run.episodes.length)

  const viewEpisode = (episodeId: string) => {
    setViewed({ kind: "episode", episodeId })
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
          <StudyTaskStrip task={run.task} />
        </section>

        <main className="study-main">
          <ExecutionRail
            episodes={run.episodes}
            viewed={activeViewed}
            onView={viewEpisode}
            onFinal={goFinal}
          />

          <section ref={reviewRef} className="study-page" aria-labelledby="study-page-heading">
            <h2 id="study-page-heading" className="sr-only">
              {messages.pageResultHeading}
            </h2>
            <BrowserFrame variant="compact" pageState={observation} stateLabel={stateLabel} />
            <DecisionInspector run={run} viewed={activeViewed} />
          </section>
        </main>

        <section className="study-response" aria-label={messages.decisionQuestion}>
          <StudyResponseForm state={response} onResponse={dispatchResponse} />
        </section>
      </div>
      <DesktopOnlyMessage />
    </>
  )
}
