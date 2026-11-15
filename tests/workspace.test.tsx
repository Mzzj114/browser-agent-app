import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { App } from "../src/App"
import { agentRun } from "../src/data/agent-run"

describe("verification workspace", () => {
  it("hydrates with the final response and the last recorded page", () => {
    // Given the approved synthetic run.
    render(<App />)
    // When the workspace first mounts.
    // Then the final response and last recorded page are shown without a correctness verdict.
    expect(screen.getByText(agentRun.final.text)).toBeInTheDocument()
    const browser = screen.getByRole("region", { name: "Agent 浏览器" })
    expect(within(browser).getByText("购物车｜云朵商城")).toBeInTheDocument()
    expect(within(browser).getByText("https://mall.example/cart")).toBeInTheDocument()
    expect(within(browser).getByText("最后一次录制的状态")).toBeVisible()
    expect(within(browser).getByText("运行结束时录制 · 非实时")).toBeVisible()
    expect(screen.getByText("录制执行 · 8 步")).toBeInTheDocument()
    const decision = screen.getByRole("contentinfo")
    expect(within(decision).queryByText(/正确|错误/)).not.toBeInTheDocument()
  })

  it("shows an action label first and keeps native execution behind technical details", async () => {
    // Given the desktop workspace.
    const user = userEvent.setup()
    render(<App />)
    // Then the first factual action is visible while Python is secondary.
    expect(screen.getByText("打开商城首页")).toBeVisible()
    const initialCode = screen.getByText(/new_tab\("https:\/\/mall.example\/"\)/)
    expect(initialCode).not.toBeVisible()
    // When step three is selected.
    await user.click(screen.getByRole("button", { name: "步骤 3，提交搜索：查看页面" }))
    // Then the recorded page, action, and step identity update together.
    const browser = screen.getByRole("region", { name: "Agent 浏览器" })
    expect(within(browser).getByText("红色跑鞋－商品搜索")).toBeInTheDocument()
    expect(within(browser).getByText("步骤 3 / 8 · 此步之后录制")).toBeVisible()
    expect(within(browser).getByText("提交搜索")).toBeVisible()
    expect(screen.getByRole("button", { name: "步骤 3，提交搜索：正在查看页面" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(screen.getByText("步骤 3 / 8")).toBeInTheDocument()
    // When that step's technical details are opened.
    const stepCard = screen.getByRole("article", { name: "步骤 3" })
    const nativeCell = within(stepCard).getByText(/press_key\("Enter"\)/)
    expect(nativeCell).not.toBeVisible()
    await user.click(within(stepCard).getByText("技术细节 · 1 个 Python 单元"))
    // Then the linked native execution remains available and readable.
    expect(nativeCell).toBeVisible()
  })

  it("does not duplicate the final report inside the technical code", async () => {
    // Given the run whose last cell delivered the final report.
    const user = userEvent.setup()
    render(<App />)
    // When the last step's technical details are opened.
    const stepCard = screen.getByRole("article", { name: "步骤 8" })
    await user.click(within(stepCard).getByText("技术细节 · 1 个 Python 单元"))
    // Then the code points to the separate report channel instead of repeating it.
    expect(within(stepCard).getByText(/最终回复见对话中的消息/)).toBeVisible()
    expect(within(stepCard).queryByText(agentRun.final.text)).not.toBeInTheDocument()
  })

  it("jumps directly to a step from the menu without sequential playback", async () => {
    // Given the final recorded state.
    const user = userEvent.setup()
    render(<App />)
    // When a later step is chosen from the chronological menu.
    const menu = screen.getByRole("combobox", { name: "跳转步骤" })
    expect(within(menu).getByRole("option", { name: "步骤 6 · 选择尺码 42" })).toBeInTheDocument()
    await user.selectOptions(menu, "5")
    // Then that recorded state is selected immediately.
    expect(
      screen.getByRole("button", { name: "步骤 6，选择尺码 42：正在查看页面" }),
    ).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByText("步骤 6 / 8")).toBeInTheDocument()
  })

  it("moves one step back from final and returns to the last recorded state", async () => {
    // Given the initial final state.
    const user = userEvent.setup()
    render(<App />)
    // When previous is requested.
    await user.click(screen.getByRole("button", { name: "上一步" }))
    // Then step eight is selected and the final action becomes available.
    expect(
      screen.getByRole("button", { name: "步骤 8，打开购物车：正在查看页面" }),
    ).toBeInTheDocument()
    const browser = screen.getByRole("region", { name: "Agent 浏览器" })
    expect(within(browser).getByText("购物车｜云朵商城")).toBeInTheDocument()
    // When the last recorded state is restored.
    await user.click(screen.getByRole("button", { name: "返回最后录制状态" }))
    // Then the position returns to final and next stays disabled at the boundary.
    expect(within(browser).getByText("最后一次录制的状态")).toBeVisible()
    expect(screen.getByRole("button", { name: "下一步" })).toBeDisabled()
  })

  it("keeps a decision tentative until submission and then locks it", async () => {
    // Given an undecided task result.
    const user = userEvent.setup()
    render(<App />)
    const accepted = screen.getByRole("button", { name: "符合原始任务" })
    const rejected = screen.getByRole("button", { name: "不符合原始任务" })
    const submit = screen.getByRole("button", { name: "提交评估" })
    // When a choice is selected.
    await user.click(accepted)
    // Then it remains changeable and nothing has been submitted.
    expect(accepted).toBeEnabled()
    expect(rejected).toBeEnabled()
    expect(submit).toBeEnabled()
    expect(screen.getByText(/已选择：符合原始任务。提交前仍可更改。/)).toBeInTheDocument()
    // When the choice is changed.
    await user.click(rejected)
    // Then the tentative choice follows and the revision is recorded.
    expect(screen.getByText(/已选择：不符合原始任务。提交前仍可更改。/)).toBeInTheDocument()
    expect(screen.getByText("提交前已更改选择 1 次。")).toBeInTheDocument()
    // When an optional reason is added.
    await user.click(screen.getByText("理由（可选）", { selector: "summary span" }))
    const reason = screen.getByRole("textbox", { name: "理由（可选）" })
    await user.type(reason, "购物车商品与回复不一致")
    expect(reason).toHaveValue("购物车商品与回复不一致")
    // When the assessment is submitted.
    await user.click(submit)
    // Then both choices are locked and only a neutral submitted status remains.
    expect(accepted).toBeDisabled()
    expect(rejected).toBeDisabled()
    expect(submit).toBeDisabled()
    expect(screen.getByText(/已提交：不符合原始任务。/)).toBeInTheDocument()
    const decision = screen.getByRole("contentinfo")
    expect(within(decision).queryByText(/正确|错误/)).not.toBeInTheDocument()
  })

  it("keeps the decision at the end of the final response inside the transcript", () => {
    // Given the verification workspace.
    const { container } = render(<App />)
    // Then the decision prompt closes the final response inside the scroll area.
    const decision = screen.getByRole("contentinfo")
    const scroll = container.querySelector(".chat-scroll")
    const messages = container.querySelector(".chat-messages")
    expect(scroll).toContainElement(decision)
    expect(messages?.lastElementChild).toBe(decision)
  })

  it("shows a task-agnostic inspection hint", () => {
    // Given the verification workspace.
    render(<App />)
    // Then the hint stays a single line and reveals no task correctness.
    expect(screen.getByText("如何检查录制")).toBeVisible()
    expect(screen.getByText("选择任一步，查看该步之后录制的页面。")).toBeVisible()
    const decision = screen.getByRole("contentinfo")
    expect(within(decision).queryByText(/正确|错误/)).not.toBeInTheDocument()
  })

  it("shows the recorded model in a disabled agent prompt", () => {
    // Given the replay workspace.
    render(<App />)
    // Then the composer is read-only and names the model recorded in the run metadata.
    expect(screen.getByRole("textbox", { name: /Agent 指令/ })).toBeDisabled()
    expect(screen.getByText(agentRun.engine.model)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "发送指令" })).toBeDisabled()
  })
})
