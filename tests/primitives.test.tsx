import { render, screen } from "@testing-library/react"
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
  ScreenshotDialog,
  StepCard,
} from "../src/components/ui"
import { agentRun } from "../src/data/agent-run"
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
    render(<ActionButton onClick={onClick}>接受结果</ActionButton>)
    // When the user clicks it.
    await user.click(screen.getByRole("button", { name: "接受结果" }))
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

  it("selects a step while keeping its native Python visible", async () => {
    // Given an execution step with a recovered error.
    const user = userEvent.setup()
    const onSelect = vi.fn()
    renderWithLocale(<StepCard step={sampleStep} selected={false} onSelect={onSelect} />)
    // When its page-selection button is clicked.
    await user.click(screen.getByRole("button", { name: /查看页面/ }))
    // Then selection is requested without hiding the native cell.
    expect(onSelect).toHaveBeenCalledOnce()
    const nativeCells = screen.getAllByText(/DOM.focus/)
    expect(nativeCells).toHaveLength(2)
    for (const nativeCell of nativeCells) {
      expect(nativeCell).toBeVisible()
    }
  })

  it("shows a neutral missing-screenshot fallback", () => {
    // Given a recorded page state without an image.
    const pageState = { ...samplePage, screenshot: null }
    // When the browser frame is rendered.
    renderWithLocale(<BrowserFrame pageState={pageState} onZoom={vi.fn()} />)
    // Then a textual fallback replaces the image and zoom is unavailable.
    expect(screen.getByText("此步骤没有可用截图")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "放大查看" })).toBeDisabled()
  })

  it("supports native-resolution zoom and close in the screenshot dialog", async () => {
    // Given an opened screenshot dialog.
    const user = userEvent.setup()
    const onClose = vi.fn()
    if (samplePage.screenshot === null) {
      throw new MissingFixtureStepError(2)
    }
    const dialogPage = { ...samplePage, screenshot: samplePage.screenshot }
    renderWithLocale(<ScreenshotDialog pageState={dialogPage} onClose={onClose} />)
    // When the user zooms in once.
    await user.click(screen.getByRole("button", { name: "放大" }))
    // Then the image exceeds its native width and remains inspectable.
    expect(screen.getByRole("img")).toHaveStyle({ width: "1500px" })
    await user.click(screen.getByRole("button", { name: "关闭截图" }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("keeps both decisions disabled and neutral after acceptance", () => {
    // Given an already accepted decision.
    renderWithLocale(
      <DecisionFooter state={{ kind: "decided", choice: "accepted" }} onDecision={vi.fn()} />,
    )
    // When the completed footer is inspected.
    // Then both equal actions are disabled and no correctness verdict appears.
    expect(screen.getByRole("button", { name: "接受结果" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "拒绝结果" })).toBeDisabled()
    expect(screen.getByText(/已记录：接受结果/)).toBeInTheDocument()
    expect(screen.queryByText(/正确|错误/)).not.toBeInTheDocument()
  })
})
