import { ListTree } from "lucide-react"
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react"
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
import type { StudyRuntime } from "./study/runtime"
import { buildSubmission } from "./study/submission"
import {
  enqueueSubmission,
  flushSubmissionQueue,
  queuedSubmissionStatus,
  writeCompletedMarker,
} from "./study/submission-store"
import {
  finishReviewTiming,
  type ReviewTiming,
  recordFinalView,
  recordStepView,
  startReviewTiming,
} from "./study/timing"

type AppProps = {
  readonly runs: StudyRuns
  readonly study?: StudyRuntime | null
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

export function App({ runs, study }: AppProps): React.JSX.Element {
  return (
    <LocaleProvider>
      <StudyWorkspace runs={runs} study={study ?? null} />
    </LocaleProvider>
  )
}

function StudyWorkspace({ runs, study }: AppProps): React.JSX.Element {
  const { locale, messages } = useLocale()
  const session = study?.session ?? null
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
  const [uploadStatus, setUploadStatus] = useState<"synced" | "retrying" | "failed" | null>(null)
  const viewedKey = activeViewed.kind === "final" ? "final" : activeViewed.episodeId
  const mainRef = useRef<HTMLElement>(null)
  const pageRef = useRef<HTMLElement>(null)
  const timingRef = useRef<ReviewTiming | null>(null)
  const submissionIdRef = useRef<string | null>(null)
  const submittedRef = useRef(false)

  if (session !== null && timingRef.current === null) {
    timingRef.current = startReviewTiming(new Date().toISOString(), performance.now())
  }

  // The document scrolls, so reset it to the top of the review page on selection.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the viewed selection key controls the reset.
  useEffect(() => {
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [viewedKey])

  // Cap the rail at the review page's height so it only scrolls when the steps outgrow the page.
  useLayoutEffect(() => {
    const main = mainRef.current
    const page = pageRef.current
    if (!main || !page) return
    const apply = () => {
      const height = page.getBoundingClientRect().height
      if (height > 0) main.style.setProperty("--rail-max-block-size", `${height}px`)
    }
    apply()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(apply)
    observer.observe(page)
    return () => observer.disconnect()
  }, [])

  const stateLabel =
    viewedEpisode === null
      ? messages.lastRecordedState
      : messages.study.beforeStepCaption(viewedEpisode.episode.ordinal, run.episodes.length)

  const viewEpisode = (episodeId: string) => {
    if (session !== null) {
      const current =
        timingRef.current ?? startReviewTiming(new Date().toISOString(), performance.now())
      timingRef.current = recordStepView(current, episodeId)
    }
    setViewed({ kind: "episode", episodeId })
  }
  const goFinal = () => {
    if (session !== null) {
      const current =
        timingRef.current ?? startReviewTiming(new Date().toISOString(), performance.now())
      timingRef.current = recordFinalView(current)
    }
    setViewed(initialViewedSelection())
  }

  // A submitted study case is persisted and queued exactly once, even if this
  // effect re-runs after a locale switch or a re-render.
  useEffect(() => {
    if (study == null || response.status !== "submitted" || response.verdict === null) return
    if (submittedRef.current) return
    submittedRef.current = true

    const { session: submittedSession, sink } = study
    const timing =
      timingRef.current ?? startReviewTiming(new Date().toISOString(), performance.now())
    const submissionId = crypto.randomUUID()
    submissionIdRef.current = submissionId
    const payload = buildSubmission({
      session: submittedSession,
      locale,
      verdict: response.verdict,
      explanation: response.explanation,
      timing,
      finished: finishReviewTiming(timing, performance.now()),
      submittedAtIso: new Date().toISOString(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      submissionId,
    })

    writeCompletedMarker(
      window.localStorage,
      submittedSession.participantCode,
      submittedSession.caseOrder,
      submittedSession.runId,
      submissionId,
    )
    enqueueSubmission(window.localStorage, payload)

    const refreshUploadStatus = () => {
      const id = submissionIdRef.current
      if (id === null) return
      const outcome = queuedSubmissionStatus(window.localStorage, id)
      setUploadStatus(outcome === "delivered" ? "synced" : outcome)
    }
    void flushSubmissionQueue(window.localStorage, sink).then(refreshUploadStatus)
  }, [study, locale, response])

  // While the case upload is still pending, going back online retries it.
  useEffect(() => {
    if (study == null || uploadStatus !== "retrying") return

    const onOnline = () => {
      void flushSubmissionQueue(window.localStorage, study.sink).then(() => {
        const id = submissionIdRef.current
        if (id === null) return
        const outcome = queuedSubmissionStatus(window.localStorage, id)
        setUploadStatus(outcome === "delivered" ? "synced" : outcome)
      })
    }
    window.addEventListener("online", onOnline)
    return () => window.removeEventListener("online", onOnline)
  }, [study, uploadStatus])

  return (
    <>
      <div className="app-shell study-shell">
        <h1 className="sr-only">{messages.workspaceHeading}</h1>
        <header className="product-header">
          <BrandMark />
          <div className="product-header-actions">
            {session === null ? null : (
              <span className="case-progress">
                {messages.study.caseProgress(session.caseOrder, 3)}
              </span>
            )}
            <StatusBadge label={messages.stepCountBadge(run.episodes.length)} icon={<ListTree />} />
            <LanguageToggle />
          </div>
        </header>

        <section className="study-context" aria-label={messages.study.originalTask}>
          <StudyTaskStrip task={run.task} />
        </section>

        <main ref={mainRef} className="study-main">
          <ExecutionRail
            episodes={run.episodes}
            viewed={activeViewed}
            onView={viewEpisode}
            onFinal={goFinal}
          />

          <section ref={pageRef} className="study-page" aria-labelledby="study-page-heading">
            <h2 id="study-page-heading" className="sr-only">
              {messages.pageResultHeading}
            </h2>
            <BrowserFrame variant="compact" pageState={observation} stateLabel={stateLabel} />
            <DecisionInspector run={run} viewed={activeViewed} />
          </section>
        </main>

        <section className="study-response" aria-label={messages.decisionQuestion}>
          <StudyResponseForm
            state={response}
            onResponse={dispatchResponse}
            mode={session === null ? "demo" : "study"}
            uploadStatus={session === null ? null : uploadStatus}
          />
        </section>
      </div>
      <DesktopOnlyMessage />
    </>
  )
}
