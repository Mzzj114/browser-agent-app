import { ListTree } from "lucide-react"
import { useReducer, useState } from "react"
import {
  BrandMark,
  BrowserFrame,
  DecisionFooter,
  DesktopOnlyMessage,
  MessageBlock,
  ReplayControls,
  ScreenshotDialog,
  StatusBadge,
  StepCard,
} from "./components/ui"
import { agentRun } from "./data/agent-run"
import type { DecisionState, ReplaySelection } from "./domain/replay"
import {
  finalReplaySelection,
  initialReplaySelection,
  nextReplaySelection,
  previousReplaySelection,
  stepReplaySelection,
  submitDecision,
} from "./domain/replay"
import type { PageState } from "./domain/run-schema"

class InvalidReplayIndexError extends Error {
  public readonly index: number

  public constructor(index: number) {
    super("Replay index is outside the recorded run")
    this.name = "InvalidReplayIndexError"
    this.index = index
  }
}

function viewedPageState(selection: ReplaySelection): PageState {
  const index = selection.kind === "final" ? agentRun.steps.length - 1 : selection.stepIndex
  const step = agentRun.steps[index]
  if (step === undefined) {
    throw new InvalidReplayIndexError(index)
  }
  return step.pageState
}

export function App() {
  const [selection, setSelection] = useState<ReplaySelection>(initialReplaySelection)
  const [decision, chooseDecision] = useReducer(submitDecision, {
    kind: "undecided",
  } satisfies DecisionState)
  const [dialogOpen, setDialogOpen] = useState(false)
  const pageState = viewedPageState(selection)
  const screenshot = pageState.screenshot
  const dialogPage = screenshot === null ? null : { ...pageState, screenshot }
  const selectedStepIndex = selection.kind === "step" ? selection.stepIndex : null

  return (
    <>
      <div className="app-shell">
        <h1 className="sr-only">浏览助手任务结果核验</h1>
        <header className="product-header">
          <BrandMark />
          <StatusBadge label={`${agentRun.steps.length} 个执行步骤`} icon={<ListTree />} />
        </header>
        <main className="workspace">
          <aside className="agent-panel" aria-label="Agent 任务记录">
            <div className="chat-scroll">
              <div className="chat-messages">
                <MessageBlock label="原始任务" speaker="user">
                  {agentRun.task}
                </MessageBlock>
                <MessageBlock label="Agent 最终回复" speaker="assistant">
                  {agentRun.final.text}
                </MessageBlock>
              </div>
              <section className="execution-history" aria-labelledby="execution-heading">
                <div className="execution-heading">
                  <h2 id="execution-heading">执行历史</h2>
                  <span>{agentRun.steps.length} 步</span>
                </div>
                <div className="step-list">
                  {agentRun.steps.map((step, index) => (
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
            <DecisionFooter state={decision} onDecision={chooseDecision} />
          </aside>
          <section className="browser-panel" aria-labelledby="browser-heading">
            <h2 id="browser-heading" className="sr-only">
              网页结果
            </h2>
            <BrowserFrame pageState={pageState} onZoom={() => setDialogOpen(true)} />
            <ReplayControls
              currentStep={selectedStepIndex}
              stepCount={agentRun.steps.length}
              onPrevious={() =>
                setSelection((current) => previousReplaySelection(current, agentRun.steps.length))
              }
              onNext={() =>
                setSelection((current) => nextReplaySelection(current, agentRun.steps.length))
              }
              onFinal={() => setSelection(finalReplaySelection())}
            />
          </section>
        </main>
      </div>
      <DesktopOnlyMessage />
      {dialogOpen && dialogPage !== null ? (
        <ScreenshotDialog pageState={dialogPage} onClose={() => setDialogOpen(false)} />
      ) : null}
    </>
  )
}
