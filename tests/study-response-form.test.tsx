import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { StudyResponseForm } from "../src/components/ui/study-response-form"
import {
  initialStudyResponse,
  type ResponseAction,
  type StudyResponse,
  updateStudyResponse,
} from "../src/domain/study-response.ts"
import { LocaleProvider } from "../src/i18n"

type HarnessProps = {
  readonly locale?: "en" | "zh"
  readonly initial?: StudyResponse
  readonly onResponse?: (action: ResponseAction) => void
}

function Harness({ locale = "en", initial, onResponse }: HarnessProps) {
  const [state, setState] = useState(initial ?? initialStudyResponse())

  function handleResponse(action: ResponseAction) {
    onResponse?.(action)
    setState((current) => updateStudyResponse(current, action))
  }

  return (
    <LocaleProvider initialLocale={locale} syncDocument={false}>
      <StudyResponseForm state={state} onResponse={handleResponse} />
    </LocaleProvider>
  )
}

function submitButton(): HTMLElement {
  return screen.getByRole("button", { name: "Submit assessment" })
}

describe("study response form", () => {
  it("offers equal neutral verdict buttons without a localization control", () => {
    render(<Harness />)

    const accept = screen.getByRole("button", { name: "Fulfills the request" })
    const reject = screen.getByRole("button", { name: "Does not fulfill the request" })

    expect(accept).toBeVisible()
    expect(reject).toBeVisible()
    expect(accept.className).toBe(reject.className)
    expect(accept).not.toHaveAttribute("data-variant")
    expect(reject).not.toHaveAttribute("data-variant")
    expect(screen.queryByRole("combobox")).toBeNull()
    expect(screen.queryByRole("button", { name: /earliest mistake|mark/i })).toBeNull()
  })

  it("keeps one optional explanation field with a 500-character counter", () => {
    render(<Harness />)

    const explanation = screen.getByRole("textbox")
    expect(explanation).toBeVisible()
    expect(explanation).toHaveAttribute("maxLength", "500")
    expect(explanation).toHaveAttribute("aria-required", "false")
    expect(screen.getByText("Optional")).toBeVisible()
    expect(screen.getByText("Optional for either judgment.")).toBeVisible()
    expect(screen.getByText("0/500")).toBeVisible()
    expect(
      screen.getByText("Shown on this page only. Reloading clears your response."),
    ).toBeVisible()
    expect(
      screen.getByText("Submitting does not place an order, rerun the agent, or trigger a repair."),
    ).toBeVisible()
    expect(submitButton()).toBeDisabled()
    expect(screen.queryByRole("combobox")).toBeNull()
  })

  it("dispatches only verdict and explanation actions through the shared reducer", async () => {
    const user = userEvent.setup()
    const onResponse = vi.fn()
    render(<Harness onResponse={onResponse} />)

    await user.click(screen.getByRole("button", { name: "Fulfills the request" }))
    expect(onResponse).toHaveBeenCalledWith({ type: "verdict", verdict: "accepted" })

    await user.click(screen.getByRole("button", { name: "Does not fulfill the request" }))
    expect(onResponse).toHaveBeenLastCalledWith({ type: "verdict", verdict: "rejected" })

    await user.type(screen.getByRole("textbox"), "Checked the cart")
    expect(onResponse).toHaveBeenLastCalledWith({ type: "explain", text: "Checked the cart" })
    expect(onResponse).not.toHaveBeenCalledWith(expect.objectContaining({ type: "localize" }))
  })

  it("counts the explanation up to the limit", () => {
    render(<Harness initial={{ ...initialStudyResponse(), explanation: "x".repeat(500) }} />)

    expect(screen.getByText("500/500")).toBeVisible()
    expect(screen.getByRole("textbox")).toHaveAttribute("maxLength", "500")
  })

  it("disables submit until a verdict and locks judgments after a valid submission", async () => {
    const user = userEvent.setup()
    const onResponse = vi.fn()
    render(<Harness onResponse={onResponse} />)

    expect(submitButton()).toBeDisabled()
    await user.click(screen.getByRole("button", { name: "Fulfills the request" }))
    expect(submitButton()).toBeEnabled()

    await user.click(submitButton())

    expect(onResponse).toHaveBeenCalledWith({ type: "submit" })
    expect(screen.getByRole("status")).toHaveTextContent("Response recorded on this page only.")
    expect(screen.getByRole("button", { name: "Fulfills the request" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Does not fulfill the request" })).toBeDisabled()
    expect(screen.getByRole("textbox")).toBeDisabled()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("submits a rejection with a blank explanation", async () => {
    const user = userEvent.setup()
    const onResponse = vi.fn()
    render(<Harness onResponse={onResponse} />)

    await user.click(screen.getByRole("button", { name: "Does not fulfill the request" }))
    await user.click(submitButton())

    expect(onResponse).toHaveBeenCalledWith({ type: "submit" })
    expect(screen.getByRole("status")).toHaveTextContent("Response recorded on this page only.")
    expect(screen.getByRole("textbox")).toHaveValue("")
  })

  it("reports an over-limit explanation without dispatching an invalid submit", async () => {
    const user = userEvent.setup()
    const onResponse = vi.fn()
    render(
      <Harness
        initial={{
          ...initialStudyResponse(),
          verdict: "rejected",
          explanation: "x".repeat(501),
        }}
        onResponse={onResponse}
      />,
    )

    // When the invalid response is submitted.
    await user.click(submitButton())

    // Then the summary explains the limit and the submit is rejected.
    expect(onResponse).not.toHaveBeenCalledWith({ type: "submit" })
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("Shorten the explanation to 500 characters or fewer.")
    expect(alert).toHaveFocus()
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true")

    // When the explanation is shortened to the limit.
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "x".repeat(500) } })
    await user.click(submitButton())

    // Then it submits and the error summary clears.
    expect(onResponse).toHaveBeenCalledWith({ type: "submit" })
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("does not steal typing focus while the explanation is valid", async () => {
    const user = userEvent.setup()
    render(<Harness />)

    // When the participant types a normal explanation before choosing a verdict.
    const explanation = screen.getByRole("textbox")
    await user.click(explanation)
    await user.type(explanation, "Checked the cart.")

    // Then the explanation keeps focus and no error summary appears.
    expect(explanation).toHaveFocus()
    expect(explanation).toHaveValue("Checked the cart.")
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("preserves the exact explanation while the verdict changes", async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const explanation = screen.getByRole("textbox")
    fireEvent.change(explanation, { target: { value: "  Checked the cart\nand the total.  " } })
    expect(explanation).toHaveValue("  Checked the cart\nand the total.  ")

    await user.click(screen.getByRole("button", { name: "Does not fulfill the request" }))
    expect(explanation).toHaveValue("  Checked the cart\nand the total.  ")

    await user.click(screen.getByRole("button", { name: "Fulfills the request" }))
    expect(explanation).toHaveValue("  Checked the cart\nand the total.  ")
  })

  it("locks an already submitted response and keeps its status neutral", () => {
    render(
      <Harness
        initial={{
          ...initialStudyResponse(),
          status: "submitted",
          verdict: "rejected",
          explanation: "An authored explanation.",
        }}
      />,
    )

    expect(screen.getByRole("status")).toHaveTextContent("Response recorded on this page only.")
    expect(screen.getByRole("button", { name: "Does not fulfill the request" })).toBeDisabled()
    expect(screen.getByRole("textbox")).toBeDisabled()
    expect(screen.getByRole("textbox")).toHaveValue("An authored explanation.")
    expect(screen.queryByRole("combobox")).toBeNull()
    expect(screen.queryByText(/correct|success/i)).toBeNull()
  })

  it("renders the Chinese form copy and on-screen-only notice", () => {
    render(<Harness locale="zh" />)

    expect(screen.getByText("评估仅显示在本页，刷新后将清除。")).toBeVisible()
    expect(screen.getByRole("button", { name: "符合原始任务" })).toBeVisible()
    expect(screen.getByRole("button", { name: "不符合原始任务" })).toBeVisible()
    expect(screen.getByRole("button", { name: "提交评估" })).toBeVisible()
    expect(screen.getByRole("textbox")).toHaveAttribute("maxLength", "500")
    expect(screen.getByText("可选")).toBeVisible()
    expect(screen.queryByRole("combobox")).toBeNull()
  })

  it("does not call network, storage, or download APIs", async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const storageSpy = vi.spyOn(Storage.prototype, "setItem")
    render(<Harness />)

    await user.click(screen.getByRole("button", { name: "Fulfills the request" }))
    await user.click(submitButton())

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(storageSpy).not.toHaveBeenCalled()
    expect(document.querySelector("a[download]")).toBeNull()
  })
})
