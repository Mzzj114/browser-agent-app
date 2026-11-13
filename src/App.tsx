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
  ScreenshotDialog,
  StatusBadge,
  StepCard,
} from "./components/ui"
import { agentRuns } from "./data/agent-run"
import type { DecisionState, ReplaySelection } from "./domain/replay"
import {
  clampReplaySelection,
  finalReplaySelection,
  initialReplaySelection,
  nextReplaySelection,
  previousReplaySelection,
  stepReplaySelection,
  submitDecision,
} from "./domain/replay"
import type { AgentRun, PageState } from "./domain/run-schema"
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
  const [decision, chooseDecision] = useReducer(submitDecision, {
    kind: "undecided",
  } satisfies DecisionState)
  const [dialogOpen, setDialogOpen] = useState(false)
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
  const screenshot = pageState.screenshot
  const dialogPage = screenshot === null ? null : { ...pageState, screenshot }
  const selectedStepIndex = activeSelection.kind === "step" ? activeSelection.stepIndex : null

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
              onZoom={() => setDialogOpen(true)}
              controls={
                <ReplayControls
                  currentStep={selectedStepIndex}
                  stepCount={run.steps.length}
                  onPrevious={() =>
                    setSelection(previousReplaySelection(activeSelection, run.steps.length))
                  }
                  onNext={() =>
                    setSelection(nextReplaySelection(activeSelection, run.steps.length))
                  }
                  onFinal={() => setSelection(finalReplaySelection())}
                />
              }
            />
          </section>
          <aside className="agent-panel" aria-label={messages.agentRecordLabel}>
            <div className="chat-shell">
              <div className="chat-scroll" ref={chatScrollRef} onScroll={syncJump}>
                <div className="chat-messages">
                  <MessageBlock label={messages.originalTask} speaker="user">
                    {run.task}
                  </MessageBlock>
                  <MessageBlock label={messages.agentFinalResponse} speaker="assistant">
                    {run.final.text}
                  </MessageBlock>
                  <DecisionFooter state={decision} onDecision={chooseDecision} />
                </div>
                <section className="execution-history" aria-labelledby="execution-heading">
                  <div className="execution-heading">
                    <h2 id="execution-heading">{messages.executionHistory}</h2>
                    <span>{messages.executionStepCount(run.steps.length)}</span>
                  </div>
                  <div className="step-list">
                    {run.steps.map((step, index) => (
                      <StepCard
                        key={step.id}
                        step={step}
                        selected={selectedStepIndex === index}
                        onSelect={() => setSelection(stepReplaySelection(index))}
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
      {dialogOpen && dialogPage !== null ? (
        <ScreenshotDialog pageState={dialogPage} onClose={() => setDialogOpen(false)} />
      ) : null}
    </>
  )
}
