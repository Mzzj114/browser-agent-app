import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { App } from "../src/App"
import { agentRun } from "../src/data/agent-run"

describe("verification workspace", () => {
  it("hydrates with the final response and the final recorded page", () => {
    // Given the approved synthetic run.
    render(<App />)
    // When the workspace first mounts.
    // Then the final response and final page are shown without a correctness verdict.
    expect(screen.getByText(agentRun.final.text)).toBeInTheDocument()
    const browser = screen.getByRole("region", { name: "Agent 浏览器" })
    expect(within(browser).getByText("购物车｜云朵商城")).toBeInTheDocument()
    expect(within(browser).getByText("https://mall.example/cart")).toBeInTheDocument()
    expect(screen.getByText("最终状态")).toBeInTheDocument()
    const decision = screen.getByRole("contentinfo")
    expect(within(decision).queryByText(/正确|错误/)).not.toBeInTheDocument()
  })

  it("shows a selected historical step without collapsing its native execution", async () => {
    // Given the desktop workspace.
    const user = userEvent.setup()
    render(<App />)
    // When step three is selected.
    await user.click(screen.getByRole("button", { name: "步骤 3：查看页面" }))
    // Then the recorded page changes and the step remains selected with native code visible.
    const browser = screen.getByRole("region", { name: "Agent 浏览器" })
    expect(within(browser).getByText("红色跑鞋－商品搜索")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "步骤 3：正在查看页面" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(screen.getByText("步骤 3 / 8")).toBeInTheDocument()
    const nativeCells = screen.getAllByText(/cdp\("DOM.focus"/)
    expect(nativeCells).toHaveLength(2)
    for (const nativeCell of nativeCells) {
      expect(nativeCell).toBeVisible()
    }
  })

  it("moves one step back from final and returns to final explicitly", async () => {
    // Given the initial final state.
    const user = userEvent.setup()
    render(<App />)
    // When previous is requested.
    await user.click(screen.getByRole("button", { name: "上一步" }))
    // Then step eight is selected and the final action becomes available.
    expect(screen.getByRole("button", { name: "步骤 8：正在查看页面" })).toBeInTheDocument()
    const browser = screen.getByRole("region", { name: "Agent 浏览器" })
    expect(within(browser).getByText("购物车｜云朵商城")).toBeInTheDocument()
    // When final state is restored.
    await user.click(screen.getByRole("button", { name: "返回最终状态" }))
    // Then the position returns to final and next stays disabled at the boundary.
    expect(screen.getByText("最终状态")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "下一步" })).toBeDisabled()
  })

  it("records acceptance once and disables both equal decisions", async () => {
    // Given an undecided task result.
    const user = userEvent.setup()
    render(<App />)
    const accepted = screen.getByRole("button", { name: "接受结果" })
    const rejected = screen.getByRole("button", { name: "拒绝结果" })
    // When acceptance is chosen.
    await user.click(accepted)
    // Then both choices are locked and only the neutral recorded state remains.
    expect(accepted).toBeDisabled()
    expect(rejected).toBeDisabled()
    expect(screen.getByText(/已记录：接受结果/)).toBeInTheDocument()
    const decision = screen.getByRole("contentinfo")
    expect(within(decision).queryByText(/正确|错误/)).not.toBeInTheDocument()
  })

  it("opens the native screenshot dialog and closes it from the explicit control", async () => {
    // Given the final browser state.
    const user = userEvent.setup()
    render(<App />)
    const zoomTrigger = screen.getByRole("button", { name: "放大查看" })
    // When the screenshot is enlarged.
    await user.click(zoomTrigger)
    const dialog = screen.getByRole("dialog", { name: "放大查看" })
    // Then it renders at native width and closes through the labelled action.
    expect(within(dialog).getByRole("img")).toBeVisible()
    await user.click(within(dialog).getByRole("button", { name: "关闭截图" }))
    expect(screen.queryByRole("dialog", { name: "放大查看" })).not.toBeInTheDocument()
    await waitFor(() => expect(zoomTrigger).toHaveFocus())
  })
})
