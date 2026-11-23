import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { App } from "../src/App"
import { studyConditions } from "../src/domain/study-condition.ts"
import { studyRuns } from "./fixtures/decision-runs.ts"

function useEnglish(): void {
  window.history.replaceState({}, "", "/?lang=en")
}

function railButtons(): readonly HTMLElement[] {
  return within(screen.getByRole("navigation", { name: "Execution overview" })).getAllByRole(
    "button",
  )
}

function rail(): HTMLElement {
  return screen.getByRole("navigation", { name: "Execution overview" })
}

function taskStrip(): HTMLDetailsElement {
  const strip = document.querySelector(".study-task-strip")
  if (!(strip instanceof HTMLDetailsElement)) throw new Error("Missing task strip")
  return strip
}

function reviewPage(): HTMLElement {
  const page = document.querySelector(".study-page")
  if (!(page instanceof HTMLElement)) throw new Error("Missing review page")
  return page
}

function evidencePanel(): HTMLElement {
  const panel = document.querySelector(".decision-inspector")
  if (!(panel instanceof HTMLElement)) throw new Error("Missing evidence panel")
  return panel
}

function explanationBox(): HTMLElement {
  return screen.getByRole("textbox", { name: /short explanation/i })
}

describe("decision evidence workspace", () => {
  it.each(studyConditions)("starts on the explicit final observation in %s", (condition) => {
    // Given a projected fixed-condition run.
    useEnglish()
    const runs = studyRuns(condition)
    const run = runs.en
    const finalObservation = run.observations.find(
      (observation) => observation.id === run.finalObservationId,
    )
    if (!finalObservation) throw new Error("Missing final observation")

    // When the workspace mounts.
    render(<App runs={runs} />)

    // Then the common context, final page, and final evidence are shown.
    expect(within(taskStrip()).getAllByText(run.task).length).toBeGreaterThan(0)
    expect(screen.getByText("Original task")).toBeVisible()
    const browser = screen.getByRole("region", { name: "Agent browser" })
    expect(within(browser).getByText("Last recorded state")).toBeVisible()
    expect(within(browser).queryByText(finalObservation.title)).toBeNull()
    expect(within(browser).queryByText(finalObservation.url)).toBeNull()
    expect(within(browser).queryByText("End of run · not live")).toBeNull()
    expect(within(browser).getByText("Zoom")).toBeVisible()
    expect(document.querySelector(".page-screenshot")).toHaveAttribute(
      "src",
      "screenshots/en/08-cart.webp",
    )
    expect(screen.getByRole("heading", { name: "Final state" })).toBeVisible()
    expect(screen.queryByRole("button", { name: /earliest mistake|mark/i })).toBeNull()
    expect(screen.queryByRole("combobox")).toBeNull()
    expect(document.querySelector("[data-marked]")).toBeNull()

    const rail = screen.getByRole("navigation", { name: "Execution overview" })
    for (const episode of run.episodes) {
      expect(within(rail).getByText(episode.action)).toBeVisible()
    }
  })

  it.each(studyConditions)(
    "keeps final state last in the same rail list and preserves the explanation draft in %s",
    async (condition) => {
      // Given the initial final view.
      useEnglish()
      const user = userEvent.setup()
      const runs = studyRuns(condition)
      const run = runs.en
      const finalObservation = run.observations.find(
        (observation) => observation.id === run.finalObservationId,
      )
      if (!finalObservation?.screenshot) throw new Error("Missing final observation screenshot")
      render(<App runs={runs} />)

      // Then final state is the last item of the same chronological list.
      const navigation = rail()
      const items = within(navigation).getAllByRole("listitem")
      expect(items).toHaveLength(9)
      const firstItem = items[0] ?? document.body
      const lastEpisodeItem = items[7] ?? document.body
      const finalItem = items[8] ?? document.body
      expect(within(firstItem).getByText(run.episodes[0]?.action ?? "")).toBeVisible()
      expect(within(lastEpisodeItem).getByText(run.episodes[7]?.action ?? "")).toBeVisible()
      expect(within(finalItem).getByText("Final state")).toBeVisible()
      const finalButton = within(finalItem).getByRole("button")
      expect(finalButton).toHaveAttribute("aria-current", "step")
      expect(finalButton).toHaveAttribute("data-viewed", "true")
      expect(finalButton).not.toHaveAttribute("data-marked")
      expect(document.querySelector("[data-marked]")).toBeNull()

      // And the participant evidence panel has no navigation or response controls.
      const panel = evidencePanel()
      expect(within(panel).queryByRole("button")).toBeNull()
      expect(within(panel).queryByRole("combobox")).toBeNull()
      expect(within(panel).queryByRole("group", { name: "Page replay controls" })).toBeNull()

      // When an explanation draft is written without navigating.
      fireEvent.change(explanationBox(), { target: { value: "  Draft explanation  " } })
      expect(explanationBox()).toHaveValue("  Draft explanation  ")
      expect(finalButton).toHaveAttribute("aria-current", "step")

      // And episode four is viewed through the rail.
      await user.click(railButtons()[3] ?? document.body)
      expect(within(evidencePanel()).getByRole("heading", { name: "Viewed step 4" })).toBeVisible()
      expect(within(evidencePanel()).queryByRole("button")).toBeNull()

      // Then the last rail item restores the final observation without moving the draft.
      await user.click(within(finalItem).getByRole("button"))
      expect(within(evidencePanel()).getByRole("heading", { name: "Final state" })).toBeVisible()
      expect(finalButton).toHaveAttribute("aria-current", "step")
      expect(explanationBox()).toHaveValue("  Draft explanation  ")
      expect(within(navigation).queryByText("Your mark")).toBeNull()
      expect(document.querySelector("[data-marked]")).toBeNull()
      expect(document.querySelector(".page-screenshot")).toHaveAttribute(
        "src",
        finalObservation.screenshot.path,
      )
    },
  )

  it.each(studyConditions)(
    "shows the before-image rather than the result of the selected action in %s",
    async (condition) => {
      // Given the final recorded observation.
      useEnglish()
      const user = userEvent.setup()
      const runs = studyRuns(condition)
      const beforeEpisodeFour = runs.en.observations.find(
        (observation) => observation.id === "obs-03",
      )
      if (!beforeEpisodeFour) throw new Error("Missing episode-four before observation")
      render(<App runs={runs} />)

      // When the fourth episode is chosen from the execution rail.
      await user.click(railButtons()[3] ?? document.body)

      // Then the page before that action is shown, not its sorted or product result.
      expect(screen.getByText("Before step 4 of 8")).toBeVisible()
      expect(document.querySelector(".page-screenshot")).toHaveAttribute(
        "src",
        "screenshots/en/04-sorted.webp",
      )
      const browser = screen.getByRole("region", { name: "Agent browser" })
      expect(within(browser).getByText("Before step 4 of 8")).toBeVisible()
      expect(within(browser).queryByText(beforeEpisodeFour.title)).toBeNull()
      expect(within(browser).queryByText(beforeEpisodeFour.url)).toBeNull()
      expect(within(browser).queryByText("Recorded · not live")).toBeNull()
      expect(screen.getByRole("heading", { name: "Viewed step 4" })).toBeVisible()
      expect(screen.queryByRole("combobox")).toBeNull()
    },
  )

  it("puts the screenshot before the evidence inside one review column", async () => {
    // Given the final view.
    useEnglish()
    const user = userEvent.setup()
    const run = studyRuns("candidates").en
    const episode = run.episodes[3]
    if (!episode) throw new Error("Missing episode four")
    const { container } = render(<App runs={studyRuns("candidates")} />)

    // When episode four is viewed through the rail.
    await user.click(railButtons()[3] ?? document.body)

    // Then the review column contains the browser frame immediately before the evidence panel.
    const page = reviewPage()
    const browserFrame = page.querySelector(".browser-frame")
    const panel = evidencePanel()
    expect(browserFrame).not.toBeNull()
    expect(panel).not.toBeNull()
    expect(browserFrame?.nextElementSibling).toBe(panel)
    expect(container.querySelector(".study-inspector")).toBeNull()
    expect(container.querySelector(".study-inspector-panel")).toBeNull()
    expect(within(panel).queryByRole("group", { name: "Page replay controls" })).toBeNull()
    expect(within(panel).queryByRole("combobox")).toBeNull()
    expect(within(panel).queryByRole("button")).toBeNull()

    // And the action lives in the evidence panel rather than the compact browser metadata.
    const browser = screen.getByRole("region", { name: "Agent browser" })
    expect(within(browser).queryByText(episode.action)).toBeNull()
    expect(panel.querySelector(".decision-inspector-action")).toHaveTextContent(episode.action)
    expect(within(browser).getByText("Zoom")).toBeVisible()
  })

  it("renders one compact state-and-zoom caption without full browser metadata", async () => {
    // Given the study workspace in its compact browser-frame mode.
    useEnglish()
    const user = userEvent.setup()
    render(<App runs={studyRuns("candidates")} />)
    const browser = screen.getByRole("region", { name: "Agent browser" })

    // Then only the state label and Zoom control sit above the screenshot.
    expect(within(browser).getByText("Last recorded state")).toBeVisible()
    expect(browser.querySelector(".browser-meta")).toBeNull()
    expect(browser.querySelector(".browser-evidence-caption")).toBeNull()
    expect(browser.querySelector(".browser-state-time")).toBeNull()
    expect(browser.querySelector(".browser-state-badge")).toBeNull()
    const zoom = within(browser).getByText("Zoom").closest("button")
    if (!(zoom instanceof HTMLButtonElement)) throw new Error("Missing compact zoom control")
    expect(zoom).toHaveAttribute("aria-label", "Zoom screenshot to actual size")

    // When the caption control is used, it toggles the screenshot's shared zoom state.
    await user.click(zoom)
    expect(zoom).toHaveTextContent("Fit")
    expect(zoom).toHaveAttribute("aria-label", "Fit screenshot to panel")
    expect(document.querySelector(".screenshot-trigger")).toHaveAttribute("data-zoomed", "true")
    await user.click(zoom)
    expect(zoom).toHaveTextContent("Zoom")
    expect(document.querySelector(".screenshot-trigger")).toHaveAttribute("data-zoomed", "false")
  })

  it("expands a long bilingual task without losing the draft or viewed step", async () => {
    // Given a long task whose final constraint must remain in the DOM.
    useEnglish()
    const user = userEvent.setup()
    const runs = studyRuns("candidates")
    const enTask = `${runs.en.task} Final constraint: include both the product name and the price in the answer.`
    const zhTask = `${runs.zh.task} 最后要求：请在回答中同时给出商品名称和价格。`
    const longRuns = {
      zh: { ...runs.zh, task: zhTask },
      en: { ...runs.en, task: enTask },
    }
    render(<App runs={longRuns} />)
    const strip = taskStrip()
    const summary = strip.querySelector("summary")
    if (!(summary instanceof HTMLElement)) throw new Error("Missing task summary")

    // Then the summary keeps the exact task text for visual clipping.
    expect(strip.open).toBe(false)
    expect(strip.querySelector(".study-task-excerpt")).toHaveTextContent(enTask)
    expect(strip.querySelector(".study-task-text")).toHaveTextContent(enTask)

    // When a step is viewed and a draft is written before expanding the task.
    await user.click(railButtons()[3] ?? document.body)
    fireEvent.change(explanationBox(), { target: { value: "Draft stays put." } })
    await user.click(summary)

    // Then the complete exact task, including its last constraint, is exposed.
    expect(strip.open).toBe(true)
    expect(strip.querySelector(".study-task-text")).toHaveTextContent(enTask)
    expect(strip.querySelector(".study-task-text")).toHaveTextContent(
      "include both the product name and the price",
    )
    expect(explanationBox()).toHaveValue("Draft stays put.")
    expect(screen.getByText("Before step 4 of 8")).toBeVisible()

    // And switching locale expands the exact Chinese task without changing review state.
    await user.click(screen.getByRole("button", { name: "中文" }))
    expect(strip.open).toBe(true)
    expect(strip.querySelector(".study-task-text")).toHaveTextContent(zhTask)
    expect(screen.getByRole("textbox", { name: /简短说明/ })).toHaveValue("Draft stays put.")
    expect(screen.getByText("第 4 步操作前 · 共 8 步")).toBeVisible()
  })

  it("resets the page scroll on replay selection without moving focus", async () => {
    // Given a scrolled document in the final view.
    useEnglish()
    const user = userEvent.setup()
    render(<App runs={studyRuns("probabilities")} />)
    document.documentElement.scrollTop = 320
    const secondStep = railButtons()[1]
    if (!secondStep) throw new Error("Missing second rail step")

    // When the rail selects another step.
    await user.click(secondStep)

    // Then the page is back at the top and the rail keeps keyboard focus.
    expect(document.documentElement.scrollTop).toBe(0)
    expect(document.activeElement).toBe(secondStep)
  })

  it("keeps rail navigation on the same viewed ID and before-image", async () => {
    // Given the initial final state.
    useEnglish()
    const user = userEvent.setup()
    const { container } = render(<App runs={studyRuns("candidates")} />)

    // When the rail chooses episode four.
    await user.click(railButtons()[3] ?? document.body)
    expect(railButtons()[3]).toHaveAttribute("aria-current", "step")
    expect(screen.getByText("Before step 4 of 8")).toBeVisible()
    expect(document.querySelector(".page-screenshot")).toHaveAttribute(
      "src",
      "screenshots/en/04-sorted.webp",
    )

    // When another rail item selects episode five.
    await user.click(railButtons()[4] ?? document.body)
    expect(railButtons()[4]).toHaveTextContent("Viewed step 5")
    expect(screen.getByText("Before step 5 of 8")).toBeVisible()
    expect(document.querySelector(".page-screenshot")).toHaveAttribute(
      "src",
      "screenshots/en/05-product.webp",
    )

    // When a rail item selects episode two directly.
    await user.click(railButtons()[1] ?? document.body)
    expect(screen.getByText("Before step 2 of 8")).toBeVisible()
    expect(document.querySelector(".page-screenshot")).toHaveAttribute(
      "src",
      "screenshots/en/02-search-filled.webp",
    )

    // When the final rail item restores the last recorded state.
    const finalItem = container.querySelector(".execution-rail-list li:last-child")
    if (!(finalItem instanceof HTMLElement)) throw new Error("Missing final rail item")
    await user.click(within(finalItem).getByRole("button"))
    expect(screen.getByRole("heading", { name: "Final state" })).toBeVisible()
    expect(screen.getByText("Last recorded state")).toBeVisible()
    expect(document.querySelector(".page-screenshot")).toHaveAttribute(
      "src",
      "screenshots/en/08-cart.webp",
    )
  })

  it.each(studyConditions)(
    "keeps the explanation draft independent of viewing and verdict in %s",
    async (condition) => {
      // Given a rejection draft written while episode four is viewed.
      useEnglish()
      const user = userEvent.setup()
      const explanation = "The cart step did not add the selected shoe."
      render(<App runs={studyRuns(condition)} />)
      await user.click(railButtons()[3] ?? document.body)
      fireEvent.change(explanationBox(), { target: { value: explanation } })
      await user.click(screen.getByRole("button", { name: "Does not fulfill the request" }))

      // When another episode is viewed and the verdict changes.
      await user.click(railButtons()[4] ?? document.body)
      await user.click(screen.getByRole("button", { name: "Fulfills the request" }))

      // Then viewing and verdict change without moving the draft.
      expect(screen.getByRole("heading", { name: "Viewed step 5" })).toBeVisible()
      expect(screen.getByText("Before step 5 of 8")).toBeVisible()
      expect(explanationBox()).toHaveValue(explanation)
      expect(screen.getByRole("button", { name: "Fulfills the request" })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
      expect(within(railButtons()[3] ?? document.body).queryByText("Your mark")).toBeNull()
      expect(document.querySelector("[data-marked]")).toBeNull()
    },
  )

  it.each(studyConditions)(
    "locks judgments after submission while replay stays usable in %s",
    async (condition) => {
      // Given a complete rejected response.
      useEnglish()
      const user = userEvent.setup()
      const explanation = "The cart shows a different product from the report."
      render(<App runs={studyRuns(condition)} />)
      await user.click(railButtons()[3] ?? document.body)
      await user.type(explanationBox(), explanation)
      await user.click(screen.getByRole("button", { name: "Does not fulfill the request" }))
      await user.click(screen.getByRole("button", { name: "Submit assessment" }))

      // Then the judgment and explanation are locked.
      expect(screen.getByRole("button", { name: "Fulfills the request" })).toBeDisabled()
      expect(screen.getByRole("button", { name: "Does not fulfill the request" })).toBeDisabled()
      expect(explanationBox()).toBeDisabled()
      expect(explanationBox()).toHaveValue(explanation)
      expect(screen.getByRole("button", { name: "Submit assessment" })).toBeDisabled()
      expect(screen.getByText("Response recorded on this page only.")).toBeVisible()
      expect(screen.queryByRole("combobox")).toBeNull()

      // When the execution rail is used after submission.
      await user.click(railButtons()[4] ?? document.body)

      // Then navigation still changes the viewed page and screenshots.
      expect(screen.getByRole("heading", { name: "Viewed step 5" })).toBeVisible()
      expect(screen.getByText("Before step 5 of 8")).toBeVisible()
      expect(document.querySelector(".page-screenshot")).toHaveAttribute(
        "src",
        "screenshots/en/05-product.webp",
      )
      expect(explanationBox()).toHaveValue(explanation)

      // And the rail remains usable back to the first episode.
      await user.click(railButtons()[0] ?? document.body)
      expect(screen.getByText("Before step 1 of 8")).toBeVisible()
      expect(screen.getByRole("heading", { name: "Viewed step 1" })).toBeVisible()
      expect(explanationBox()).toHaveValue(explanation)
    },
  )

  it("removes technical disclosures, the composer, and chat jumping from the participant view", () => {
    // Given the participant workspace.
    useEnglish()
    const { container } = render(<App runs={studyRuns("probabilities")} />)

    // Then the task is the only disclosure and no technical evidence remains.
    const disclosures = container.querySelectorAll("details")
    expect(disclosures).toHaveLength(1)
    expect(disclosures[0]).toBe(taskStrip())
    expect(taskStrip().tagName).toBe("DETAILS")
    expect(screen.queryByText(/Technical details/)).toBeNull()
    expect(screen.queryByText(/Python/)).toBeNull()
    expect(screen.queryByRole("textbox", { name: /Agent prompt/ })).toBeNull()
    expect(screen.queryByRole("button", { name: "Send prompt" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Jump to latest" })).toBeNull()
    expect(container.querySelector(".chat-jump")).toBeNull()
    expect(container.querySelector(".agent-prompt")).toBeNull()
    expect(screen.queryByText("No mistaken action")).toBeNull()
    expect(document.querySelector("[data-marked]")).toBeNull()
  })

  it.each(studyConditions)(
    "preserves the draft viewed ID, verdict, and participant text across locale in %s",
    async (condition) => {
      // Given a Chinese draft viewing episode four and rejecting the work.
      const runs = studyRuns(condition)
      const user = userEvent.setup()
      const explanation = "  Keep this participant text exactly.\nSecond line.  "
      render(<App runs={runs} />)
      const rail = screen.getByRole("navigation", { name: "执行概览" })
      await user.click(within(rail).getAllByRole("button")[3] ?? document.body)
      fireEvent.change(screen.getByRole("textbox", { name: /简短说明/ }), {
        target: { value: explanation },
      })
      await user.click(screen.getByRole("button", { name: "不符合原始任务" }))

      // When English is selected without remounting the workspace.
      await user.click(screen.getByRole("button", { name: "English" }))

      // Then the same stable state is localized around untouched participant text.
      expect(screen.getByRole("navigation", { name: "Execution overview" })).toBe(rail)
      expect(within(taskStrip()).getAllByText(runs.en.task).length).toBeGreaterThan(0)
      expect(screen.getByText("Before step 4 of 8")).toBeVisible()
      expect(screen.getByRole("heading", { name: "Viewed step 4" })).toBeVisible()
      expect(document.querySelector(".page-screenshot")).toHaveAttribute(
        "src",
        "screenshots/en/04-sorted.webp",
      )
      expect(screen.queryByRole("combobox")).toBeNull()
      expect(document.querySelector("[data-marked]")).toBeNull()
      expect(within(railButtons()[3] ?? document.body).queryByText("Your mark")).toBeNull()
      expect(screen.getByRole("button", { name: "Does not fulfill the request" })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
      expect(explanationBox()).toHaveValue(explanation)
    },
  )

  it.each(studyConditions)(
    "keeps a submitted response locked with the same ID and text across locale in %s",
    async (condition) => {
      // Given a submitted rejection with an authored explanation.
      const runs = studyRuns(condition)
      const user = userEvent.setup()
      const explanation = "  Exactly authored participant explanation.  "
      render(<App runs={runs} />)
      const rail = screen.getByRole("navigation", { name: "执行概览" })
      await user.click(within(rail).getAllByRole("button")[3] ?? document.body)
      fireEvent.change(screen.getByRole("textbox", { name: /简短说明/ }), {
        target: { value: explanation },
      })
      await user.click(screen.getByRole("button", { name: "不符合原始任务" }))
      await user.click(screen.getByRole("button", { name: "提交评估" }))

      // When English is selected.
      await user.click(screen.getByRole("button", { name: "English" }))

      // Then the submitted response is still localized, locked, and textually unchanged.
      expect(screen.getByRole("button", { name: "Fulfills the request" })).toBeDisabled()
      const rejected = screen.getByRole("button", { name: "Does not fulfill the request" })
      expect(rejected).toBeDisabled()
      expect(rejected).toHaveAttribute("aria-pressed", "true")
      expect(screen.queryByRole("combobox")).toBeNull()
      expect(explanationBox()).toHaveValue(explanation)
      expect(explanationBox()).toBeDisabled()
      expect(screen.getByText("Response recorded on this page only.")).toBeVisible()
      expect(document.querySelector("[data-marked]")).toBeNull()
    },
  )

  it("clears the on-screen judgment when the workspace reloads", async () => {
    // Given a submitted rejection with an explanation.
    useEnglish()
    const user = userEvent.setup()
    const runs = studyRuns("baseline")
    const view = render(<App runs={runs} />)
    await user.click(screen.getByRole("button", { name: "Does not fulfill the request" }))
    fireEvent.change(explanationBox(), { target: { value: "Draft explanation." } })
    await user.click(screen.getByRole("button", { name: "Submit assessment" }))
    expect(screen.getByText("Response recorded on this page only.")).toBeVisible()

    // When the workspace remounts as a reload would.
    view.unmount()
    render(<App runs={runs} />)

    // Then the judgment and text are gone and the form is pending again.
    expect(screen.queryByText("Response recorded on this page only.")).toBeNull()
    expect(explanationBox()).toHaveValue("")
    expect(screen.getByRole("button", { name: "Submit assessment" })).toBeDisabled()
    expect(screen.queryByRole("combobox")).toBeNull()
    expect(document.querySelector("[data-marked]")).toBeNull()
  })
})
