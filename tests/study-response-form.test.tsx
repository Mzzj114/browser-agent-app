import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { StudyResponseForm } from "../src/components/ui/study-response-form"
import type { EpisodeCore } from "../src/domain/decision-run-schema.ts"
import {
  initialStudyResponse,
  type ResponseAction,
  type StudyResponse,
  updateStudyResponse,
} from "../src/domain/study-response.ts"
import { LocaleProvider } from "../src/i18n"
import { canonicalRun } from "./fixtures/decision-runs.ts"

type EpisodeSummary = Pick<EpisodeCore, "id" | "ordinal" | "action">

type HarnessProps = {
  readonly locale?: "en" | "zh"
  readonly initial?: StudyResponse
  readonly onResponse?: (action: ResponseAction) => void
}

function Harness({ locale = "en", initial, onResponse }: HarnessProps) {
  const episodes: readonly EpisodeSummary[] = canonicalRun(locale).episodes
  const episodeIds = episodes.map((episode) => episode.id)
  const [state, setState] = useState(initial ?? initialStudyResponse())

  function handleResponse(action: ResponseAction) {
    onResponse?.(action)
    setState((current) => updateStudyResponse(current, action, episodeIds))
  }

  return (
    <LocaleProvider initialLocale={locale} syncDocument={false}>
      <StudyResponseForm episodes={episodes} state={state} onResponse={handleResponse} />
    </LocaleProvider>
  )
}

function episodeIds(): readonly string[] {
  return canonicalRun("en").episodes.map((episode) => episode.id)
}

function submitButton(): HTMLElement {
  return screen.getByRole("button", { name: "Submit assessment" })
}

describe("study response form", () => {
  it("offers equal neutral verdict buttons without a no-mistake answer", () => {
    render(<Harness />)

    const accept = screen.getByRole("button", { name: "Fulfills the request" })
    const reject = screen.getByRole("button", { name: "Does not fulfill the request" })

    expect(accept).toBeVisible()
    expect(reject).toBeVisible()
    expect(accept.className).toBe(reject.className)
    expect(accept).not.toHaveAttribute("data-variant")
    expect(reject).not.toHaveAttribute("data-variant")
    expect(screen.queryByRole("button", { name: /No mistaken action/i })).toBeNull()
  })

  it("uses stable episode IDs and a persistent explanation field", () => {
    render(<Harness />)

    expect(screen.getAllByRole("option").map((option) => option.getAttribute("value"))).toEqual([
      "",
      ...episodeIds(),
      "cannot-determine",
    ])
    expect(screen.getByRole("option", { name: "Cannot determine" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: /No mistaken action/i })).toBeNull()

    const explanation = screen.getByRole("textbox")
    expect(explanation).toBeVisible()
    expect(explanation).toHaveAttribute("maxLength", "500")
    expect(
      screen.getByText("Shown on this page only. Reloading clears your response."),
    ).toBeVisible()
    expect(
      screen.getByText("Submitting does not place an order, rerun the agent, or trigger a repair."),
    ).toBeVisible()
    expect(submitButton()).toBeDisabled()
  })

  it("dispatches only response actions through the shared reducer", async () => {
    const user = userEvent.setup()
    const onResponse = vi.fn()
    render(<Harness onResponse={onResponse} />)

    await user.click(screen.getByRole("button", { name: "Fulfills the request" }))
    expect(onResponse).toHaveBeenCalledWith({ type: "verdict", verdict: "accepted" })

    await user.selectOptions(screen.getByRole("combobox"), "episode-04")
    expect(onResponse).toHaveBeenCalledWith({
      type: "localize",
      localization: { kind: "episode", episodeId: "episode-04" },
    })

    await user.selectOptions(screen.getByRole("combobox"), "cannot-determine")
    expect(onResponse).toHaveBeenCalledWith({
      type: "localize",
      localization: { kind: "cannot-determine" },
    })

    await user.type(screen.getByRole("textbox"), "Checked the cart")
    expect(onResponse).toHaveBeenLastCalledWith({ type: "explain", text: "Checked the cart" })
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
    expect(screen.getByRole("combobox")).toBeDisabled()
    expect(screen.getByRole("textbox")).toBeDisabled()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("reports a missing localization without dispatching an invalid submit", async () => {
    const user = userEvent.setup()
    const onResponse = vi.fn()
    render(<Harness onResponse={onResponse} />)

    await user.click(screen.getByRole("button", { name: "Does not fulfill the request" }))
    await user.click(submitButton())

    expect(onResponse).not.toHaveBeenCalledWith({ type: "submit" })
    const alert = screen.getByRole("alert")
    expect(
      within(alert).getByText("Select the earliest mistaken step or Cannot determine."),
    ).toBeVisible()

    const select = screen.getByRole("combobox")
    expect(select).toHaveAttribute("aria-invalid", "true")
    const errorId = select
      .getAttribute("aria-describedby")
      ?.split(" ")
      .find((id) => id.endsWith("localization-required"))
    expect(errorId).toBeDefined()
    if (!errorId) throw new Error("Missing localization error association")
    expect(document.getElementById(errorId)).toHaveTextContent(
      "Select the earliest mistaken step or Cannot determine.",
    )

    await user.selectOptions(select, "cannot-determine")
    expect(screen.queryByRole("alert")).toBeNull()
    expect(select).not.toHaveAttribute("aria-invalid")
  })

  it("requires a marked explanation for a rejection and then submits it", async () => {
    const user = userEvent.setup()
    const onResponse = vi.fn()
    render(<Harness onResponse={onResponse} />)

    await user.click(screen.getByRole("button", { name: "Does not fulfill the request" }))
    await user.selectOptions(screen.getByRole("combobox"), "episode-04")

    const explanation = screen.getByRole("textbox")
    expect(explanation).toHaveAttribute("aria-required", "true")
    expect(screen.getByText("Required")).toBeVisible()

    await user.click(submitButton())
    expect(onResponse).not.toHaveBeenCalledWith({ type: "submit" })
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Add a short explanation for the marked step.",
    )
    expect(explanation).toHaveAttribute("aria-invalid", "true")

    await user.type(explanation, "The cart step did not add the selected shoe.")
    await user.click(submitButton())

    expect(onResponse).toHaveBeenCalledWith({ type: "submit" })
    expect(screen.getByRole("status")).toHaveTextContent("Response recorded on this page only.")
  })

  it("permits rejection with uncertainty and an optional explanation", async () => {
    const user = userEvent.setup()
    const onResponse = vi.fn()
    render(<Harness onResponse={onResponse} />)

    await user.click(screen.getByRole("button", { name: "Does not fulfill the request" }))
    await user.selectOptions(screen.getByRole("combobox"), "cannot-determine")

    expect(screen.getByText("Optional when you choose Cannot determine.")).toBeVisible()
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-required", "false")
    expect(screen.getByText("Optional")).toBeVisible()

    await user.click(submitButton())
    expect(onResponse).toHaveBeenCalledWith({ type: "submit" })
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("preserves the exact explanation while localization changes", async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const explanation = screen.getByRole("textbox")
    fireEvent.change(explanation, { target: { value: "  Checked the cart\nand the total.  " } })
    expect(explanation).toHaveValue("  Checked the cart\nand the total.  ")

    await user.selectOptions(screen.getByRole("combobox"), "cannot-determine")
    expect(explanation).toHaveValue("  Checked the cart\nand the total.  ")

    await user.selectOptions(screen.getByRole("combobox"), "episode-04")
    expect(explanation).toHaveValue("  Checked the cart\nand the total.  ")
  })

  it("locks an already submitted response and keeps its status neutral", () => {
    render(
      <Harness
        initial={{
          ...initialStudyResponse(),
          status: "submitted",
          verdict: "rejected",
          localization: { kind: "cannot-determine" },
        }}
      />,
    )

    expect(screen.getByRole("status")).toHaveTextContent("Response recorded on this page only.")
    expect(screen.getByRole("button", { name: "Does not fulfill the request" })).toBeDisabled()
    expect(screen.getByRole("combobox")).toBeDisabled()
    expect(screen.getByRole("textbox")).toBeDisabled()
    expect(screen.queryByText(/correct|success/i)).toBeNull()
  })

  it("renders the Chinese form copy and on-screen-only notice", () => {
    render(<Harness locale="zh" />)

    expect(screen.getByRole("option", { name: "无法判断" })).toBeInTheDocument()
    expect(screen.getByText("评估仅显示在本页，刷新后将清除。")).toBeVisible()
    expect(screen.getByRole("button", { name: "符合原始任务" })).toBeVisible()
    expect(screen.getByRole("button", { name: "不符合原始任务" })).toBeVisible()
    expect(screen.getByRole("button", { name: "提交评估" })).toBeVisible()
    expect(screen.getByRole("textbox")).toHaveAttribute("maxLength", "500")
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
