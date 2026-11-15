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
  StatusBadge,
  StepCard,
} from "./components/ui"
import { agentRun } from "./data/agent-run"
import type { DecisionState } from "./domain/replay"
import { initialDecisionState, updateDecision } from "./domain/replay"
import type { AgentStep, PageState } from "./domain/run-schema"
import { LocaleProvider } from "./i18n"
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

function Showcase() {
  const [decision, setDecision] = useState<DecisionState>(initialDecisionState)

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
                <h3>MessageBlock · 用户 / Agent</h3>
                <div className="specimen-stack">
                  <MessageBlock name="你" speaker="user">
                    {agentRun.task}
                  </MessageBlock>
                  <MessageBlock name="Agent" speaker="assistant">
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
                    stepCount={agentRun.steps.length}
                    stateLabel="Step 2 / 8 · recorded after this step"
                    stateNote={null}
                    actionLabel={selectedStep.action}
                    capturedAtLabel="Captured 09:00"
                  />
                  <BrowserFrame
                    pageState={missingPage}
                    stepCount={agentRun.steps.length}
                    stateLabel="Last recorded state"
                    stateNote="Captured at the end of this run; not a new live check."
                    actionLabel={null}
                    capturedAtLabel="Captured 09:00"
                  />
                </div>
              </article>
              <article className="specimen specimen-wide">
                <h3>ReplayControls · 中间步骤 / 最终状态</h3>
                <div className="specimen-stack">
                  <ReplayControls
                    currentStep={1}
                    steps={agentRun.steps}
                    onPrevious={() => undefined}
                    onNext={() => undefined}
                    onFinal={() => undefined}
                    onJump={() => undefined}
                  />
                  <ReplayControls
                    currentStep={null}
                    steps={agentRun.steps}
                    onPrevious={() => undefined}
                    onNext={() => undefined}
                    onFinal={() => undefined}
                    onJump={() => undefined}
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
                  onDecision={(action) => setDecision(updateDecision(decision, action))}
                />
              </article>
              <article className="specimen-decision">
                <DecisionFooter
                  state={updateDecision(
                    updateDecision(initialDecisionState(), {
                      type: "select",
                      choice: "accepted",
                    }),
                    { type: "submit" },
                  )}
                  onDecision={() => undefined}
                />
              </article>
              <article className="specimen-decision">
                <DecisionFooter
                  state={updateDecision(
                    updateDecision(initialDecisionState(), {
                      type: "select",
                      choice: "rejected",
                    }),
                    { type: "submit" },
                  )}
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
    </div>
  )
}

const rootElement = document.querySelector("#root")
if (!(rootElement instanceof HTMLElement)) {
  throw new MissingShowcaseRootError()
}

createRoot(rootElement).render(
  <StrictMode>
    <LocaleProvider initialLocale="zh" syncDocument={false}>
      <Showcase />
    </LocaleProvider>
  </StrictMode>,
)
