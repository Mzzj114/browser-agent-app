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

function inspectorPanel(): HTMLElement {
  const panel = document.querySelector(".study-inspector-panel")
  if (!(panel instanceof HTMLElement)) throw new Error("Missing inspector panel")
  return panel
}

function localizationSelect(): HTMLElement {
  return screen.getByRole("combobox", { name: /earliest mistaken action/i })
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

    // Then the common context, final page, and final inspector are shown.
    expect(screen.getByText(run.task)).toBeVisible()
    expect(screen.getByText(run.report)).toBeVisible()
    expect(screen.getByText("Original task")).toBeVisible()
    expect(screen.getByText("Agent-reported result")).toBeVisible()
    const browser = screen.getByRole("region", { name: "Agent browser" })
    expect(within(browser).getByText(finalObservation.title)).toBeVisible()
    expect(within(browser).getByText(finalObservation.url)).toBeVisible()
    expect(within(browser).getByText("Last recorded state")).toBeVisible()
    expect(within(browser).getByText("End of run · not live")).toBeVisible()
    expect(document.querySelector(".page-screenshot")).toHaveAttribute(
      "src",
      "screenshots/en/08-cart.webp",
    )
    expect(screen.getByRole("heading", { name: "Final state" })).toBeVisible()
    expect(screen.queryByRole("button", { name: "Mark as earliest mistake" })).toBeNull()

    const rail = screen.getByRole("navigation", { name: "Execution overview" })
    for (const episode of run.episodes) {
      expect(within(rail).getByText(episode.action)).toBeVisible()
    }
  })

  it.each(studyConditions)(
    "keeps final state last in the same rail list and preserves the form mark in %s",
    async (condition) => {
      // Given the initial final view and a mark set through the sole form control.
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
      expect(finalButton).not.toHaveAttribute("data-marked", "true")

      // And the participant inspector has no navigation or marking controls.
      const panel = inspectorPanel()
      expect(within(panel).queryByRole("button")).toBeNull()
      expect(within(panel).queryByRole("combobox")).toBeNull()
      expect(within(panel).queryByRole("group", { name: "Page replay controls" })).toBeNull()

      // When episode four is marked through the form without navigating.
      await user.selectOptions(localizationSelect(), "episode-04")
      expect(localizationSelect()).toHaveValue("episode-04")
      expect(finalButton).toHaveAttribute("aria-current", "step")

      // And episode four is viewed through the rail.
      await user.click(railButtons()[3] ?? document.body)
      expect(within(panel).getByRole("heading", { name: "Viewed step 4" })).toBeVisible()
      expect(within(panel).queryByRole("button")).toBeNull()

      // Then the last rail item restores the final observation without moving the mark.
      await user.click(within(finalItem).getByRole("button"))
      expect(within(panel).getByRole("heading", { name: "Final state" })).toBeVisible()
      expect(finalButton).toHaveAttribute("aria-current", "step")
      expect(localizationSelect()).toHaveValue("episode-04")
      expect(within(navigation).getByText("Your mark")).toBeVisible()
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
      expect(within(browser).getByText(beforeEpisodeFour.title)).toBeVisible()
      expect(within(browser).getByText(beforeEpisodeFour.url)).toBeVisible()
      expect(within(browser).getByText("Recorded · not live")).toBeVisible()
      expect(screen.getByRole("heading", { name: "Viewed step 4" })).toBeVisible()
    },
  )

  it("keeps the action in an inspector free of navigation and marking controls", async () => {
    // Given the final view.
    useEnglish()
    const user = userEvent.setup()
    const run = studyRuns("candidates").en
    const episode = run.episodes[3]
    if (!episode) throw new Error("Missing episode four")
    const { container } = render(<App runs={studyRuns("candidates")} />)

    // When episode four is viewed through the rail.
    await user.click(railButtons()[3] ?? document.body)

    // Then the inspector holds the evidence body without a replay header or marking control.
    const inspector = container.querySelector(".study-inspector")
    const panel = inspectorPanel()
    expect(inspector).not.toBeNull()
    expect(container.querySelector(".study-inspector-header")).toBeNull()
    expect(within(panel).queryByRole("group", { name: "Page replay controls" })).toBeNull()
    expect(within(panel).queryByRole("combobox")).toBeNull()
    expect(within(panel).queryByRole("button")).toBeNull()

    // And the action lives in the inspector rather than the compact browser metadata.
    const browser = screen.getByRole("region", { name: "Agent browser" })
    expect(within(browser).queryByText(episode.action)).toBeNull()
    expect(within(panel).getByText(episode.action)).toBeVisible()
    expect(within(browser).getByText("Recorded · not live")).toBeVisible()
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
    expect(within(railButtons()[4] ?? document.body).getByText("Viewed step 5")).toBeVisible()
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
    "keeps the mark independent of viewing and verdict in %s",
    async (condition) => {
      // Given episode four marked while it is viewed.
      useEnglish()
      const user = userEvent.setup()
      render(<App runs={studyRuns(condition)} />)
      await user.click(railButtons()[3] ?? document.body)
      await user.selectOptions(localizationSelect(), "episode-04")
      expect(localizationSelect()).toHaveValue("episode-04")

      // When the verdict changes and another episode is viewed.
      await user.click(screen.getByRole("button", { name: "Does not fulfill the request" }))
      await user.click(railButtons()[4] ?? document.body)

      // Then viewing and verdict change without moving the mark.
      expect(screen.getByRole("heading", { name: "Viewed step 5" })).toBeVisible()
      expect(screen.getByText("Before step 5 of 8")).toBeVisible()
      expect(localizationSelect()).toHaveValue("episode-04")
      expect(within(railButtons()[3] ?? document.body).getByText("Your mark")).toBeVisible()
      expect(within(railButtons()[4] ?? document.body).queryByText("Your mark")).toBeNull()
    },
  )

  it.each(studyConditions)(
    "allows marking a terminal episode but not final in %s",
    async (condition) => {
      // Given the eighth, terminal episode.
      useEnglish()
      const user = userEvent.setup()
      const { container } = render(<App runs={studyRuns(condition)} />)
      await user.click(railButtons()[7] ?? document.body)
      expect(screen.getByText("Before step 8 of 8")).toBeVisible()

      // When it is marked.
      await user.selectOptions(localizationSelect(), "episode-08")
      expect(localizationSelect()).toHaveValue("episode-08")

      // Then the final state remains an unmarkable observation and does not move the mark.
      const finalItem = container.querySelector(".execution-rail-list li:last-child")
      if (!(finalItem instanceof HTMLElement)) throw new Error("Missing final rail item")
      await user.click(within(finalItem).getByRole("button"))
      expect(screen.getByRole("heading", { name: "Final state" })).toBeVisible()
      expect(
        screen.queryByRole("button", { name: /Mark as earliest mistake|Clear mark/ }),
      ).toBeNull()
      expect(within(inspectorPanel()).queryByRole("button")).toBeNull()
      expect(localizationSelect()).toHaveValue("episode-08")
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
      await user.selectOptions(localizationSelect(), "episode-04")
      await user.type(explanationBox(), explanation)
      await user.click(screen.getByRole("button", { name: "Does not fulfill the request" }))
      await user.click(screen.getByRole("button", { name: "Submit assessment" }))

      // Then the judgment, localization, mark, and explanation are locked.
      expect(screen.getByRole("button", { name: "Fulfills the request" })).toBeDisabled()
      expect(screen.getByRole("button", { name: "Does not fulfill the request" })).toBeDisabled()
      expect(localizationSelect()).toBeDisabled()
      expect(localizationSelect()).toHaveValue("episode-04")
      expect(explanationBox()).toBeDisabled()
      expect(explanationBox()).toHaveValue(explanation)
      expect(screen.getByRole("button", { name: "Submit assessment" })).toBeDisabled()
      expect(screen.getByText("Response recorded on this page only.")).toBeVisible()

      // When the execution rail is used after submission.
      await user.click(railButtons()[4] ?? document.body)

      // Then navigation still changes the viewed page and screenshots.
      expect(screen.getByRole("heading", { name: "Viewed step 5" })).toBeVisible()
      expect(screen.getByText("Before step 5 of 8")).toBeVisible()
      expect(document.querySelector(".page-screenshot")).toHaveAttribute(
        "src",
        "screenshots/en/05-product.webp",
      )
      expect(localizationSelect()).toHaveValue("episode-04")

      // And the rail remains usable back to the first episode.
      await user.click(railButtons()[0] ?? document.body)
      expect(screen.getByText("Before step 1 of 8")).toBeVisible()
      expect(screen.getByRole("heading", { name: "Viewed step 1" })).toBeVisible()
      expect(localizationSelect()).toHaveValue("episode-04")
    },
  )

  it.each(studyConditions)(
    "clears the mark and chooses uncertainty without navigating in %s",
    async (condition) => {
      // Given episode three viewed and episode four marked from the form.
      useEnglish()
      const user = userEvent.setup()
      render(<App runs={studyRuns(condition)} />)
      await user.click(railButtons()[2] ?? document.body)
      expect(screen.getByText("Before step 3 of 8")).toBeVisible()
      await user.selectOptions(localizationSelect(), "episode-04")
      expect(within(railButtons()[3] ?? document.body).getByText("Your mark")).toBeVisible()

      // When the form select clears the mark.
      await user.selectOptions(localizationSelect(), "")
      expect(localizationSelect()).toHaveValue("")
      expect(within(railButtons()[3] ?? document.body).queryByText("Your mark")).toBeNull()

      // And when it records uncertainty.
      await user.selectOptions(localizationSelect(), "cannot-determine")
      expect(localizationSelect()).toHaveValue("cannot-determine")

      // Then viewing stayed on episode three throughout.
      expect(screen.getByText("Before step 3 of 8")).toBeVisible()
      expect(screen.getByRole("heading", { name: "Viewed step 3" })).toBeVisible()
    },
  )

  it("removes technical disclosures, the composer, and chat jumping from the participant view", () => {
    // Given the participant workspace.
    useEnglish()
    const { container } = render(<App runs={studyRuns("probabilities")} />)

    // Then only evidence and response controls remain.
    expect(container.querySelector("details")).toBeNull()
    expect(screen.queryByText(/Technical details/)).toBeNull()
    expect(screen.queryByText(/Python/)).toBeNull()
    expect(screen.queryByRole("textbox", { name: /Agent prompt/ })).toBeNull()
    expect(screen.queryByRole("button", { name: "Send prompt" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Jump to latest" })).toBeNull()
    expect(container.querySelector(".chat-jump")).toBeNull()
    expect(container.querySelector(".agent-prompt")).toBeNull()
    expect(screen.queryByText("No mistaken action")).toBeNull()
  })

  it.each(studyConditions)(
    "preserves the draft viewed ID, mark, verdict, and participant text across locale in %s",
    async (condition) => {
      // Given a Chinese draft viewing and marking episode four.
      const runs = studyRuns(condition)
      const user = userEvent.setup()
      const explanation = "  Keep this participant text exactly.\nSecond line.  "
      render(<App runs={runs} />)
      const rail = screen.getByRole("navigation", { name: "执行概览" })
      await user.click(within(rail).getAllByRole("button")[3] ?? document.body)
      await user.selectOptions(screen.getByRole("combobox"), "episode-04")
      fireEvent.change(screen.getByRole("textbox", { name: /简短说明/ }), {
        target: { value: explanation },
      })
      await user.click(screen.getByRole("button", { name: "不符合原始任务" }))

      // When English is selected without remounting the workspace.
      await user.click(screen.getByRole("button", { name: "English" }))

      // Then the same stable state is localized around untouched participant text.
      expect(screen.getByRole("navigation", { name: "Execution overview" })).toBe(rail)
      expect(screen.getByText(runs.en.task)).toBeVisible()
      expect(screen.getByText("Before step 4 of 8")).toBeVisible()
      expect(screen.getByRole("heading", { name: "Viewed step 4" })).toBeVisible()
      expect(document.querySelector(".page-screenshot")).toHaveAttribute(
        "src",
        "screenshots/en/04-sorted.webp",
      )
      expect(localizationSelect()).toHaveValue("episode-04")
      expect(within(railButtons()[3] ?? document.body).getByText("Your mark")).toBeVisible()
      expect(screen.getByRole("button", { name: "Does not fulfill the request" })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
      expect(explanationBox()).toHaveValue(explanation)
    },
  )

  it.each(studyConditions)(
    "keeps a submitted response locked with the same IDs and text across locale in %s",
    async (condition) => {
      // Given a submitted rejection localized to episode four.
      const runs = studyRuns(condition)
      const user = userEvent.setup()
      const explanation = "  Exactly authored participant explanation.  "
      render(<App runs={runs} />)
      const rail = screen.getByRole("navigation", { name: "执行概览" })
      await user.click(within(rail).getAllByRole("button")[3] ?? document.body)
      await user.selectOptions(screen.getByRole("combobox"), "episode-04")
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
      expect(localizationSelect()).toHaveValue("episode-04")
      expect(localizationSelect()).toBeDisabled()
      expect(explanationBox()).toHaveValue(explanation)
      expect(explanationBox()).toBeDisabled()
      expect(screen.getByText("Response recorded on this page only.")).toBeVisible()
      expect(within(railButtons()[3] ?? document.body).getByText("Your mark")).toBeVisible()
    },
  )
})
