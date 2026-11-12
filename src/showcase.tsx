import "@fontsource-variable/inter"
import { ArrowRight, Check, ImageOff, Search, X } from "lucide-react"
import { StrictMode, useState } from "react"
import { createRoot } from "react-dom/client"
import {
  ActionButton,
  AgentPrompt,
  BrandMark,
  BrowserFrame,
  DecisionFooter,
  Disclosure,
  IconButton,
  MessageBlock,
  ReplayControls,
  ScreenshotDialog,
  StatusBadge,
  StepCard,
} from "./components/ui"
import { agentRun } from "./data/agent-run"
import type { DecisionState } from "./domain/replay"
import type { AgentStep, PageState } from "./domain/run-schema"
import "./styles/index.css"

class MissingShowcaseFixtureError extends Error {
  public constructor() {
    super("The showcase requires at least one fixture step")
    this.name = "MissingShowcaseFixtureError"
  }
}

class MissingShowcaseRootError extends Error {
  public constructor() {
    super("Showcase root element is missing")
    this.name = "MissingShowcaseRootError"
  }
}

function fixtureStep(index: number): AgentStep {
  const step = agentRun.steps[index]
  if (step === undefined) {
    throw new MissingShowcaseFixtureError()
  }
  return step
}

const firstStep = fixtureStep(0)
const selectedStep = fixtureStep(1)
const finalStep = fixtureStep(agentRun.steps.length - 1)
const missingPage: PageState = { ...finalStep.pageState, screenshot: null }
const selectedScreenshot = selectedStep.pageState.screenshot
const dialogPage =
  selectedScreenshot === null ? null : { ...selectedStep.pageState, screenshot: selectedScreenshot }

function Showcase() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [decision, setDecision] = useState<DecisionState>({ kind: "undecided" })

  return (
    <div className="showcase-document">
      <div className="showcase-wrap">
        <header className="showcase-header">
          <div>
            <BrandMark />
            <h1>基础组件状态审查</h1>
            <p>仅用于开发期视觉与交互检查，不进入产品入口。所有组件状态使用最终设计令牌。</p>
          </div>
          <StatusBadge label="桌面端 · 浅色" icon={<Check />} />
        </header>

        <main>
          <section className="showcase-section">
            <h2>操作控件与内容块</h2>
            <div className="showcase-grid">
              <article className="specimen">
                <h3>IconButton · 默认 / 描边 / 禁用</h3>
                <div className="specimen-stage">
                  <IconButton label="搜索">
                    <Search />
                  </IconButton>
                  <IconButton label="查看下一步" variant="outlined">
                    <ArrowRight />
                  </IconButton>
                  <IconButton label="关闭" variant="dialog">
                    <X />
                  </IconButton>
                  <IconButton label="禁用操作" disabled>
                    <ImageOff />
                  </IconButton>
                </div>
              </article>
              <article className="specimen">
                <h3>ActionButton · 默认 / 选中 / 禁用 / 图标</h3>
                <div className="specimen-stage">
                  <ActionButton>默认操作</ActionButton>
                  <ActionButton selected>已选择</ActionButton>
                  <ActionButton disabled>不可用</ActionButton>
                  <ActionButton icon={<Check />}>确认</ActionButton>
                </div>
              </article>
              <article className="specimen">
                <h3>Disclosure · 收起 / 错误展开</h3>
                <div className="specimen-stack">
                  <Disclosure label="查看模型思考">先定位搜索框，再输入商品关键词。</Disclosure>
                  <Disclosure label="查看错误输出" tone="error" defaultOpen>
                    Error: No node with given id found
                  </Disclosure>
                </div>
              </article>
              <article className="specimen">
                <h3>MessageBlock · 原始任务 / 最终回复</h3>
                <div className="specimen-stack">
                  <MessageBlock label="原始任务" speaker="user">
                    {agentRun.task}
                  </MessageBlock>
                  <MessageBlock label="Agent 最终回复" speaker="assistant">
                    {agentRun.final.text}
                  </MessageBlock>
                </div>
              </article>
            </div>
          </section>

          <section className="showcase-section">
            <h2>执行历史</h2>
            <div className="specimen-stack specimen-step">
              <StepCard step={selectedStep} selected onSelect={() => undefined} />
              <StepCard step={firstStep} selected={false} onSelect={() => undefined} />
            </div>
          </section>

          <section className="showcase-section">
            <h2>浏览器与回放</h2>
            <div className="showcase-grid">
              <article className="specimen specimen-wide specimen-browser">
                <h3>BrowserFrame · 有截图 / 截图缺失</h3>
                <div className="specimen-columns">
                  <BrowserFrame
                    pageState={selectedStep.pageState}
                    onZoom={() => setDialogOpen(true)}
                  />
                  <BrowserFrame pageState={missingPage} onZoom={() => undefined} />
                </div>
              </article>
              <article className="specimen specimen-wide">
                <h3>ReplayControls · 中间步骤 / 最终状态</h3>
                <div className="specimen-stack">
                  <ReplayControls
                    currentStep={1}
                    stepCount={agentRun.steps.length}
                    onPrevious={() => undefined}
                    onNext={() => undefined}
                    onFinal={() => undefined}
                  />
                  <ReplayControls
                    currentStep={null}
                    stepCount={agentRun.steps.length}
                    onPrevious={() => undefined}
                    onNext={() => undefined}
                    onFinal={() => undefined}
                  />
                </div>
              </article>
            </div>
          </section>

          <section className="showcase-section">
            <h2>决策栏</h2>
            <div className="showcase-grid">
              <article className="specimen-decision">
                <DecisionFooter
                  state={decision}
                  onDecision={(choice) => setDecision({ kind: "decided", choice })}
                />
              </article>
              <article className="specimen-decision">
                <DecisionFooter
                  state={{ kind: "decided", choice: "accepted" }}
                  onDecision={() => undefined}
                />
              </article>
              <article className="specimen-decision">
                <DecisionFooter
                  state={{ kind: "decided", choice: "rejected" }}
                  onDecision={() => undefined}
                />
              </article>
            </div>
          </section>

          <section className="showcase-section">
            <h2>Agent 输入</h2>
            <div className="showcase-grid">
              <article className="specimen-agent-prompt">
                <AgentPrompt model={agentRun.engine.model} />
              </article>
            </div>
          </section>
        </main>
      </div>

      {dialogOpen && dialogPage ? (
        <ScreenshotDialog pageState={dialogPage} onClose={() => setDialogOpen(false)} />
      ) : null}
    </div>
  )
}

const rootElement = document.querySelector("#root")
if (!(rootElement instanceof HTMLElement)) {
  throw new MissingShowcaseRootError()
}

createRoot(rootElement).render(
  <StrictMode>
    <Showcase />
  </StrictMode>,
)
