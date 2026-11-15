import { ArrowDown, ListTree } from "lucide-react"
import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import {
  AgentPrompt,
  BrandMark,
  BrowserFrame,
  DecisionFooter,
  DesktopOnlyMessage,
  IconButton,
  LanguageToggle,
  MessageBlock,
  ReplayControls,
  StatusBadge,
  StepCard,
} from "./components/ui"
import { agentRuns } from "./data/agent-run"
import type { ReplaySelection } from "./domain/replay"
import {
  clampReplaySelection,
  finalReplaySelection,
  initialDecisionState,
  initialReplaySelection,
  nextReplaySelection,
  previousReplaySelection,
  stepReplaySelection,
  updateDecision,
} from "./domain/replay"
import type { AgentRun, PageState } from "./domain/run-schema"
import type { Locale } from "./i18n"
import { LocaleProvider, useLocale } from "./i18n"

class InvalidReplayIndexError extends Error {
  public readonly index: number

  public constructor(index: number) {
    super("Replay index is outside the recorded run")
    this.name = "InvalidReplayIndexError"
    this.index = index
  }
}

function viewedPageState(run: AgentRun, selection: ReplaySelection): PageState {
  const index = selection.kind === "final" ? run.steps.length - 1 : selection.stepIndex
  const step = run.steps[index]
  if (step === undefined) {
    throw new InvalidReplayIndexError(index)
  }
  return step.pageState
}

function formatCapturedAt(iso: string, locale: Locale): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function App() {
  return (
    <LocaleProvider>
      <Workspace />
    </LocaleProvider>
  )
}

function Workspace() {
  const { locale, messages } = useLocale()
  const run = agentRuns[locale]
  const [selection, setSelection] = useState<ReplaySelection>(initialReplaySelection)
  const activeSelection = clampReplaySelection(selection, run.steps.length)
  const [decision, dispatchDecision] = useReducer(updateDecision, null, () =>
    initialDecisionState(),
  )
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const [showJump, setShowJump] = useState(false)
  const syncJump = useCallback(() => {
    const scroller = chatScrollRef.current
    if (scroller === null) return
    const distanceFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
    setShowJump(distanceFromBottom > 24)
  }, [])
  useEffect(() => {
    const scroller = chatScrollRef.current
    if (scroller === null) return
    syncJump()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(syncJump)
    for (const child of scroller.children) {
      observer.observe(child)
    }
    return () => observer.disconnect()
  }, [syncJump])
  const jumpToLatest = () => {
    const scroller = chatScrollRef.current
    if (scroller === null) return
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" })
  }
  const pageState = viewedPageState(run, activeSelection)
  const selectedStepIndex = activeSelection.kind === "step" ? activeSelection.stepIndex : null
  const selectedStep = selectedStepIndex === null ? null : (run.steps[selectedStepIndex] ?? null)
  const stateLabel =
    selectedStep === null
      ? messages.lastRecordedState
      : messages.stepRecordedAfter(selectedStep.ordinal, run.steps.length)
  const stateNote = selectedStep === null ? messages.lastRecordedStateNote : null
  const actionLabel = selectedStep?.action ?? null
  const capturedAtLabel = messages.capturedAt(formatCapturedAt(pageState.capturedAt, locale))
  const stepCount = run.steps.length
  const goToStep = (stepIndex: number) => setSelection(stepReplaySelection(stepIndex))
  const goPrevious = () => setSelection(previousReplaySelection(activeSelection, stepCount))
  const goNext = () => setSelection(nextReplaySelection(activeSelection, stepCount))
  const goFinal = () => setSelection(finalReplaySelection())

  return (
    <>
      <div className="app-shell">
        <h1 className="sr-only">{messages.workspaceHeading}</h1>
        <header className="product-header">
          <BrandMark />
          <div className="product-header-actions">
            <StatusBadge label={messages.stepCountBadge(run.steps.length)} icon={<ListTree />} />
            <LanguageToggle />
          </div>
        </header>
        <main className="workspace">
          <section className="browser-panel" aria-labelledby="browser-heading">
            <h2 id="browser-heading" className="sr-only">
              {messages.pageResultHeading}
            </h2>
            <BrowserFrame
              pageState={pageState}
              stepCount={stepCount}
              stateLabel={stateLabel}
              stateNote={stateNote}
              actionLabel={actionLabel}
              capturedAtLabel={capturedAtLabel}
            />
            <div className="replay-bar">
              <div className="replay-bar-heading">
                <span className="replay-bar-label">{messages.replayBarLabel}</span>
                <span className="replay-bar-count">
                  {messages.executionStepCount(run.steps.length)}
                </span>
              </div>
              <ReplayControls
                currentStep={selectedStepIndex}
                steps={run.steps}
                onPrevious={goPrevious}
                onNext={goNext}
                onFinal={goFinal}
                onJump={goToStep}
              />
            </div>
          </section>
          <aside className="agent-panel" aria-label={messages.agentRecordLabel}>
            <div className="chat-shell">
              <div className="chat-scroll" ref={chatScrollRef} onScroll={syncJump}>
                <div className="chat-messages">
                  <MessageBlock name={messages.userSpeaker} speaker="user">
                    {run.task}
                  </MessageBlock>
                  <MessageBlock name={messages.agentSpeaker} speaker="assistant">
                    {run.final.text}
                  </MessageBlock>
                  <DecisionFooter state={decision} onDecision={dispatchDecision} />
                </div>
                <section className="execution-history" aria-labelledby="execution-heading">
                  <div className="execution-heading">
                    <h2 id="execution-heading">{messages.executionHistory}</h2>
                    <span>{messages.executionStepCount(run.steps.length)}</span>
                  </div>
                  <p className="inspection-hint">
                    <strong>{messages.inspectionHintLabel}</strong>
                    {messages.inspectionHint}
                  </p>
                  <div className="step-list">
                    {run.steps.map((step, index) => (
                      <StepCard
                        key={step.id}
                        step={step}
                        selected={selectedStepIndex === index}
                        onSelect={() => goToStep(index)}
                      />
                    ))}
                  </div>
                </section>
              </div>
              {showJump ? (
                <IconButton
                  className="chat-jump"
                  label={messages.jumpToLatest}
                  variant="outlined"
                  onClick={jumpToLatest}
                >
                  <ArrowDown />
                </IconButton>
              ) : null}
            </div>
            <AgentPrompt model={run.engine.model} />
          </aside>
        </main>
      </div>
      <DesktopOnlyMessage />
    </>
  )
}
