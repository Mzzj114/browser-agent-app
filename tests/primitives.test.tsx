import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ZoomIn } from "lucide-react"
import type { ReactElement } from "react"
import { describe, expect, it, vi } from "vitest"
import {
  ActionButton,
  BrowserFrame,
  DecisionFooter,
  Disclosure,
  IconButton,
  StepCard,
} from "../src/components/ui"
import { agentRun } from "../src/data/agent-run"
import { initialDecisionState, updateDecision } from "../src/domain/replay"
import { LocaleProvider } from "../src/i18n"

class MissingFixtureStepError extends Error {
  public readonly ordinal: number

  public constructor(ordinal: number) {
    super("Required fixture step is missing")
    this.ordinal = ordinal
  }
}

const sampleStep = agentRun.steps.find((step) => step.ordinal === 2)
if (sampleStep === undefined) {
  throw new MissingFixtureStepError(2)
}
const samplePage = sampleStep.pageState

function renderWithLocale(ui: ReactElement) {
  return render(
    <LocaleProvider initialLocale="zh" syncDocument={false}>
      {ui}
    </LocaleProvider>,
  )
}

const browserProps = {
  pageState: samplePage,
  stateLabel: "步骤 2 / 8 · 此步之后录制",
  stateNote: "录制 · 非实时",
  capturedAtLabel: "录制于 17:00",
}

describe("primitive controls", () => {
  it("exposes an icon button through its accessible name", () => {
    // Given an icon-only zoom control.
    // When it is rendered.
    render(
      <IconButton label="放大">
        <ZoomIn />
      </IconButton>,
    )
    // Then assistive technology receives the literal action name.
    expect(screen.getByRole("button", { name: "放大" })).toBeInTheDocument()
  })

  it("calls the action when an action button is clicked", async () => {
    // Given a clickable action.
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<ActionButton onClick={onClick}>符合原始任务</ActionButton>)
    // When the user clicks it.
    await user.click(screen.getByRole("button", { name: "符合原始任务" }))
    // Then the action fires once.
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("expands native disclosure content when its summary is clicked", async () => {
    // Given a collapsed output disclosure.
    const user = userEvent.setup()
    render(<Disclosure label="查看输出">原生输出内容</Disclosure>)
    const summary = screen.getByText("查看输出")
    // When the summary is clicked.
    await user.click(summary)
    // Then the native details element opens.
    expect(summary.closest("details")).toHaveAttribute("open")
  })

  it("shows the action label first and keeps Python behind technical details", async () => {
    // Given an execution step with native Python.
    const user = userEvent.setup()
    const onSelect = vi.fn()
    renderWithLocale(<StepCard step={sampleStep} selected={false} onSelect={onSelect} />)
    // Then the factual action is the primary label.
    expect(screen.getByText(sampleStep.action)).toBeVisible()
    expect(screen.getByText("技术细节 · 2 个 Python 单元")).toBeVisible()
    const nativeCells = screen.getAllByText(/DOM.focus/)
    expect(nativeCells).toHaveLength(2)
    for (const nativeCell of nativeCells) {
      expect(nativeCell).not.toBeVisible()
    }
    // When technical details are opened.
    await user.click(screen.getByText("技术细节 · 2 个 Python 单元"))
    // Then the native cells become readable.
    for (const nativeCell of nativeCells) {
      expect(nativeCell).toBeVisible()
    }
    // And the step can still be selected as evidence.
    await user.click(screen.getByRole("button", { name: /输入搜索词.*查看页面/ }))
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it("shows a neutral missing-screenshot fallback", () => {
    // Given a recorded page state without an image.
    const pageState = { ...samplePage, screenshot: null }
    // When the browser frame is rendered.
    renderWithLocale(<BrowserFrame {...browserProps} pageState={pageState} />)
    // Then a textual fallback replaces the image while the compact metadata stays visible.
    expect(screen.getByText("此步骤没有可用截图")).toBeInTheDocument()
    expect(screen.getByText(samplePage.title)).toBeVisible()
    expect(screen.getByText(samplePage.url)).toBeVisible()
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })

  it("treats a failed image request as missing evidence and recovers on another path", () => {
    // Given a structural recorded page whose screenshot fails to decode.
    const brokenState = {
      url: "https://mall.example/checkout",
      title: "Checkout | Cloud Mall",
      capturedAt: samplePage.capturedAt,
      screenshot: { path: "screenshots/broken.webp", width: 1200, height: 800 },
    }
    const view = renderWithLocale(<BrowserFrame {...browserProps} pageState={brokenState} />)
    fireEvent.error(screen.getByRole("img"))

    // Then missing evidence is explicit while URL, title, and caption stay visible.
    expect(screen.getByText("此步骤没有可用截图")).toBeVisible()
    expect(screen.getByText("https://mall.example/checkout")).toBeVisible()
    expect(screen.getByText("Checkout | Cloud Mall")).toBeVisible()
    expect(screen.getByText("步骤 2 / 8 · 此步之后录制")).toBeVisible()
    expect(screen.queryByRole("img")).toBeNull()

    // When another healthy path is viewed, the image is restored without an after-frame.
    const healthyState = {
      ...brokenState,
      screenshot: { ...brokenState.screenshot, path: "screenshots/05-product.webp" },
    }
    view.rerender(
      <LocaleProvider initialLocale="zh" syncDocument={false}>
        <BrowserFrame {...browserProps} pageState={healthyState} />
      </LocaleProvider>,
    )
    const image = screen.getByRole("img")
    expect(image).toHaveAttribute("src", "screenshots/05-product.webp")
    expect(image).toHaveAttribute("width", "1200")
    expect(image).toHaveAttribute("height", "800")
    expect(screen.queryByText("此步骤没有可用截图")).toBeNull()
  })

  it("labels the recorded state and toggles the screenshot between fit and actual size", async () => {
    // Given a historical frame with a screenshot.
    const user = userEvent.setup()
    renderWithLocale(<BrowserFrame {...browserProps} />)
    // Then the compact metadata keeps the full page title, URL, state, and capture time.
    expect(screen.getByText("步骤 2 / 8 · 此步之后录制")).toBeVisible()
    expect(screen.getByText("录制 · 非实时")).toBeVisible()
    expect(screen.getByText("录制于 17:00")).toBeVisible()
    expect(screen.getByText(samplePage.title)).toHaveAttribute("title", samplePage.title)
    expect(screen.getByText(samplePage.url)).toHaveAttribute("title", samplePage.url)
    expect(screen.queryByText(sampleStep.action)).toBeNull()
    // And the image keeps its recorded pixel dimensions for inspectable scaling.
    const image = screen.getByRole("img")
    expect(image).toHaveAttribute("width", "1200")
    expect(image).toHaveAttribute("height", "800")
    // The screenshot starts fitted to the panel.
    const trigger = screen.getByRole("button", { name: "放大截图至实际大小" })
    expect(trigger).toHaveAttribute("data-zoomed", "false")
    // When the image is clicked, it switches to actual size.
    await user.click(trigger)
    expect(trigger).toHaveAttribute("data-zoomed", "true")
    expect(screen.getByRole("button", { name: "缩放截图以适应面板" })).toBe(trigger)
    // And clicking again returns it to fit.
    await user.click(trigger)
    expect(trigger).toHaveAttribute("data-zoomed", "false")
  })

  it("renders a compact state-and-zoom caption without full browser metadata", async () => {
    // Given the study page's compact browser frame.
    const user = userEvent.setup()
    renderWithLocale(<BrowserFrame {...browserProps} variant="compact" />)

    // Then only the state label and a text-style zoom control are shown.
    expect(screen.getByText("步骤 2 / 8 · 此步之后录制")).toBeVisible()
    expect(screen.queryByText(samplePage.title)).toBeNull()
    expect(screen.queryByText(samplePage.url)).toBeNull()
    expect(screen.queryByText("录制 · 非实时")).toBeNull()
    expect(screen.queryByText("录制于 17:00")).toBeNull()
    const zoom = screen.getByText("放大").closest("button")
    if (!(zoom instanceof HTMLButtonElement)) throw new Error("Missing compact zoom control")
    expect(zoom).toBeEnabled()
    expect(zoom).toHaveAttribute("aria-label", "放大截图至实际大小")

    // When the compact control is used, it toggles the shared screenshot zoom.
    await user.click(zoom)
    expect(zoom).toHaveTextContent("适应")
    expect(zoom).toHaveAttribute("aria-label", "缩放截图以适应面板")
    expect(document.querySelector(".screenshot-trigger")).toHaveAttribute("data-zoomed", "true")
  })

  it("renders an accurate compact missing-image state and disables zoom", () => {
    renderWithLocale(
      <BrowserFrame
        {...browserProps}
        variant="compact"
        pageState={{ ...samplePage, screenshot: null }}
      />,
    )

    // Then the compact state names the missing evidence and what remains available.
    expect(screen.getByText("此步骤没有可用截图")).toBeVisible()
    expect(screen.getByText("任务和步骤详情仍可查看。")).toBeVisible()
    expect(screen.getByText("步骤 2 / 8 · 此步之后录制")).toBeVisible()
    // And it does not promise the full-variant URL/title metadata.
    expect(screen.queryByText(samplePage.title)).toBeNull()
    expect(screen.queryByText(samplePage.url)).toBeNull()
    const zoom = screen.getByText("放大").closest("button")
    expect(zoom).toBeDisabled()
  })

  it("marks the last recorded state as an end-of-run capture, not a live check", () => {
    // Given the final recorded state rather than a historical step.
    renderWithLocale(
      <BrowserFrame
        {...browserProps}
        stateLabel="最后一次录制的状态"
        stateNote="运行结束时录制 · 非实时"
      />,
    )
    // Then the provenance caveat reads as a compact badge beside the state.
    const badge = screen.getByText("运行结束时录制 · 非实时")
    expect(badge).toBeVisible()
    expect(badge).toHaveClass("browser-state-badge")
  })

  it("shows a tentative decision as changeable and explains submission", () => {
    // Given a selected but unsubmitted choice.
    const tentative = updateDecision(initialDecisionState(), {
      type: "select",
      choice: "accepted",
    })
    // When the footer is rendered.
    renderWithLocale(<DecisionFooter state={tentative} onDecision={vi.fn()} />)
    // Then both choices and submission remain available.
    expect(screen.getByRole("button", { name: "符合原始任务" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "不符合原始任务" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "提交评估" })).toBeEnabled()
    expect(screen.getByText(/已选择：符合原始任务。提交前仍可更改。/)).toBeInTheDocument()
    expect(screen.getByText(/提交不会下单、不会重新运行 Agent/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "提交评估" })).toHaveAccessibleDescription(
      "提交不会下单、不会重新运行 Agent，也不会触发修复。",
    )
    expect(screen.queryByText(/正确|错误/)).not.toBeInTheDocument()
  })

  it("keeps both decisions locked after submission", () => {
    // Given a submitted acceptance.
    const submitted = updateDecision(
      updateDecision(initialDecisionState(), { type: "select", choice: "accepted" }),
      { type: "submit" },
    )
    // When the completed footer is inspected.
    renderWithLocale(<DecisionFooter state={submitted} onDecision={vi.fn()} />)
    // Then both equal choices and submission are disabled with a neutral status.
    expect(screen.getByRole("button", { name: "符合原始任务" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "不符合原始任务" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "提交评估" })).toBeDisabled()
    expect(screen.getByText(/已提交：符合原始任务。/)).toBeInTheDocument()
    expect(screen.queryByText(/正确|错误/)).not.toBeInTheDocument()
  })
})
