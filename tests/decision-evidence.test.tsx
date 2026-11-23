import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactElement } from "react"
import { describe, expect, it, vi } from "vitest"
import rawWalletEn from "../fixtures/agent-runs/F1_add_single_item_clean/run.en.json" with {
  type: "json",
}
import rawWalletZh from "../fixtures/agent-runs/F1_add_single_item_clean/run.zh.json" with {
  type: "json",
}
import { App } from "../src/App"
import { DecisionChoiceGroup } from "../src/components/ui/decision-choice-group"
import { DecisionInspector } from "../src/components/ui/decision-inspector"
import { ExecutionRail } from "../src/components/ui/execution-rail"
import type { ViewedSelection } from "../src/domain/decision-replay.ts"
import { decisionRunSchema } from "../src/domain/decision-run-schema.ts"
import { projectRun } from "../src/domain/project-run.ts"
import { type StudyCondition, studyConditions } from "../src/domain/study-condition.ts"
import type { StudyRun } from "../src/domain/study-run-schema.ts"
import { LOCALE_STORAGE_KEY, LocaleProvider } from "../src/i18n"
import { enStudyMessages } from "../src/i18n/study-messages"
import { edgeRun, studyRuns } from "./fixtures/decision-runs.ts"

const fixtureRevision = "0".repeat(64)
const walletFixtures = {
  en: decisionRunSchema.parse(rawWalletEn),
  zh: decisionRunSchema.parse(rawWalletZh),
}

function walletRun(condition: StudyCondition): StudyRun {
  return projectRun(walletFixtures.en, condition, fixtureRevision)
}

function walletRuns(condition: StudyCondition) {
  return {
    en: projectRun(walletFixtures.en, condition, fixtureRevision),
    zh: projectRun(walletFixtures.zh, condition, fixtureRevision),
  }
}

function renderEnglish(element: ReactElement) {
  return render(
    <LocaleProvider initialLocale="en" syncDocument={false}>
      {element}
    </LocaleProvider>,
  )
}

function renderInspector(run: StudyRun, viewed: ViewedSelection) {
  return renderEnglish(<DecisionInspector run={run} viewed={viewed} />)
}

function groupOf(kind: "actions" | "things"): HTMLElement {
  const group = document.querySelector<HTMLElement>(`[data-choice-kind="${kind}"]`)
  if (!group) throw new Error(`Missing ${kind} choice group`)
  return group
}

function cardIds(root: ParentNode): readonly (string | null)[] {
  return Array.from(root.querySelectorAll("[data-candidate-id]")).map((card) =>
    card.getAttribute("data-candidate-id"),
  )
}

function alternativeCards(root: ParentNode): readonly HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-choice="alternative"]'))
}

function alternativeIds(root: ParentNode): readonly (string | null)[] {
  return alternativeCards(root).map((card) => card.getAttribute("data-candidate-id"))
}

function toggleButton(root: ParentNode): HTMLElement | null {
  return root.querySelector<HTMLElement>("button[aria-expanded]")
}

function remainingOfferedIds(head: {
  readonly offered: readonly { readonly id: string }[]
  readonly selectedId: string
  readonly previewIds: readonly string[]
}): readonly string[] {
  return head.offered
    .filter(
      (candidate) => candidate.id !== head.selectedId && !head.previewIds.includes(candidate.id),
    )
    .map((candidate) => candidate.id)
}

function choiceGroupElement(
  kind: "actions" | "things",
  heading: string,
  otherChoicesHeading: string,
  head: Parameters<typeof DecisionChoiceGroup>[0]["head"],
  reportedConfidence?: number | null,
) {
  return (
    <DecisionChoiceGroup
      kind={kind}
      heading={heading}
      otherChoicesHeading={otherChoicesHeading}
      head={head}
      {...(reportedConfidence === undefined ? {} : { reportedConfidence })}
    />
  )
}

describe("execution rail", () => {
  it.each(studyConditions)("shows the same chronological action labels for %s", (condition) => {
    const run = studyRuns(condition).en
    renderEnglish(
      <ExecutionRail
        episodes={run.episodes}
        viewed={{ kind: "final" }}
        onView={vi.fn()}
        onFinal={vi.fn()}
      />,
    )

    const buttons = screen.getAllByRole("button")
    expect(buttons).toHaveLength(9)
    expect(buttons.at(-1)).toHaveTextContent("Final state")
    expect(buttons.at(-1)).toHaveAttribute("aria-current", "step")
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1)
    expect(screen.getByText("Typed “red running shoes”")).toBeVisible()
    expect(screen.getByText("Opened “Cloud Walk Red Sneakers”")).toBeVisible()
    expect(screen.getByText("Reported task completion")).toBeVisible()
    expect(document.querySelector("[data-marked]")).toBeNull()
  })

  it("ties the viewed label and aria-current only to the viewed item", () => {
    const run = studyRuns("candidates").en
    renderEnglish(
      <ExecutionRail
        episodes={run.episodes}
        viewed={{ kind: "episode", episodeId: "episode-04" }}
        onView={vi.fn()}
        onFinal={vi.fn()}
      />,
    )

    const buttons = screen.getAllByRole("button")
    const viewedButton = buttons[3]
    const otherButton = buttons[1]
    const finalButton = buttons[8]
    if (!viewedButton || !otherButton || !finalButton) {
      throw new Error("Expected nine rail buttons")
    }

    expect(within(viewedButton).getByText("Viewed step 4")).toBeVisible()
    expect(viewedButton).toHaveAttribute("aria-current", "step")
    expect(within(otherButton).queryByText("Viewed step 4")).toBeNull()
    expect(otherButton).not.toHaveAttribute("aria-current", "step")
    expect(finalButton).toHaveAttribute("data-viewed", "false")
    expect(finalButton).not.toHaveAttribute("aria-current", "step")
    expect(document.querySelector("[data-marked]")).toBeNull()
    expect(screen.queryByText("Your mark")).toBeNull()
  })

  it("reports the stable episode ID when a viewed item is chosen", async () => {
    const user = userEvent.setup()
    const onView = vi.fn()
    const onFinal = vi.fn()
    const run = studyRuns("probabilities").en
    renderEnglish(
      <ExecutionRail
        episodes={run.episodes}
        viewed={{ kind: "final" }}
        onView={onView}
        onFinal={onFinal}
      />,
    )

    await user.click(screen.getByRole("button", { name: /Selected size 42/ }))
    expect(onView).toHaveBeenCalledWith("episode-05")
    expect(onFinal).not.toHaveBeenCalled()
  })

  it("appends final state last in the same list and reports its selection", async () => {
    const user = userEvent.setup()
    const onView = vi.fn()
    const onFinal = vi.fn()
    const run = studyRuns("candidates").en
    renderEnglish(
      <ExecutionRail
        episodes={run.episodes}
        viewed={{ kind: "episode", episodeId: "episode-08" }}
        onView={onView}
        onFinal={onFinal}
      />,
    )

    // Then the final state shares the list and its item treatment.
    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(9)
    const finalItem = items[8]
    if (!finalItem) throw new Error("Missing final rail item")
    expect(finalItem).toHaveTextContent("Final state")
    expect(finalItem.querySelector(".execution-rail-item")).not.toBeNull()
    const finalButton = within(finalItem).getByRole("button")
    expect(finalButton).not.toHaveAttribute("data-marked")

    // When the final item is chosen.
    await user.click(finalButton)

    // Then it reports only the final view.
    expect(onFinal).toHaveBeenCalledTimes(1)
    expect(onView).not.toHaveBeenCalled()
  })
})

describe("decision choice groups", () => {
  it("shows the wallet choices and agent-reported confidence in probabilities", () => {
    const run = walletRun("probabilities")
    renderInspector(run, { kind: "episode", episodeId: "episode-03" })

    const actions = groupOf("actions")
    const things = groupOf("things")
    expect(within(actions).getByRole("heading", { name: "What the agent did" })).toBeVisible()
    expect(within(things).getByRole("heading", { name: "What it clicked" })).toBeVisible()

    expect(cardIds(actions)).toEqual(["CLICK", "BLOCKED", "SCROLL_DOWN"])
    expect(alternativeIds(actions)).toEqual(["BLOCKED", "SCROLL_DOWN"])
    expect(cardIds(things)).toEqual(["39", "38"])
    expect(alternativeIds(things)).toEqual(["38"])

    expect(within(actions).getByText("96%")).toBeVisible()
    expect(within(things).getByText("50%")).toBeVisible()
    expect(screen.queryByText("97%")).toBeNull()
    expect(screen.queryByText("51%")).toBeNull()
    expect(screen.queryByText("97.0%")).toBeNull()
    expect(screen.queryByText("51.0%")).toBeNull()

    for (const card of alternativeCards(document.body)) {
      expect(card.textContent).not.toMatch(/%/)
    }
    expect(screen.getAllByText(enStudyMessages.confidenceExplanation)).toHaveLength(1)
  })

  it("shows the same preview cards without confidence or scores in candidates", () => {
    const candidates = renderInspector(walletRun("candidates"), {
      kind: "episode",
      episodeId: "episode-03",
    })
    const candidateCards = {
      actions: alternativeIds(groupOf("actions")),
      things: alternativeIds(groupOf("things")),
    }
    const candidateLabels = {
      actions: alternativeCards(groupOf("actions")).map((card) => card.textContent),
      things: alternativeCards(groupOf("things")).map((card) => card.textContent),
    }
    expect(screen.getByText("Click")).toBeVisible()
    expect(screen.queryByText(/%/)).toBeNull()
    expect(screen.queryByText(enStudyMessages.confidenceLabel)).toBeNull()
    expect(screen.queryByText(enStudyMessages.confidenceExplanation)).toBeNull()
    candidates.unmount()

    renderInspector(walletRun("probabilities"), { kind: "episode", episodeId: "episode-03" })
    expect({
      actions: alternativeIds(groupOf("actions")),
      things: alternativeIds(groupOf("things")),
    }).toEqual(candidateCards)
    expect({
      actions: alternativeCards(groupOf("actions")).map((card) => card.textContent),
      things: alternativeCards(groupOf("things")).map((card) => card.textContent),
    }).toEqual(candidateLabels)
  })

  it("adds no choice group to baseline", () => {
    const { container } = renderInspector(walletRun("baseline"), {
      kind: "episode",
      episodeId: "episode-03",
    })

    expect(screen.getByText("Open Classic Leather Wallet product page")).toBeVisible()
    expect(container.querySelector("[data-choice-kind]")).toBeNull()
    expect(container.querySelector("[data-candidate-id]")).toBeNull()
    expect(container.querySelector("button[aria-expanded]")).toBeNull()
    expect(container.textContent).not.toMatch(/%/)
    expect(container.textContent).not.toMatch(/confidence/i)
    expect(within(container).queryAllByRole("button")).toHaveLength(0)
  })

  it("rounds confidence to a whole percentage and renders zero as zero", () => {
    renderEnglish(
      choiceGroupElement(
        "actions",
        "What the agent did",
        "Other actions offered",
        {
          selectedId: "CLICK",
          previewIds: [],
          offered: [{ id: "CLICK", label: "Click", context: null }],
        },
        0,
      ),
    )

    expect(screen.getByText("0%")).toBeVisible()
    expect(screen.queryByText("Confidence unavailable")).toBeNull()
    expect(screen.getByText("Agent-reported confidence")).toBeVisible()
  })

  it("distinguishes unavailable confidence from zero and omits it when not supplied", () => {
    const head = {
      selectedId: "CLICK",
      previewIds: [],
      offered: [{ id: "CLICK", label: "Click", context: null }],
    }
    const unavailable = renderEnglish(
      choiceGroupElement("actions", "What the agent did", "Other actions offered", head, null),
    )

    expect(screen.getByText("Confidence unavailable")).toBeVisible()
    expect(screen.queryByText("0%")).toBeNull()
    unavailable.unmount()

    renderEnglish(
      choiceGroupElement("actions", "What the agent did", "Other actions offered", head),
    )
    expect(screen.queryByText("Confidence unavailable")).toBeNull()
    expect(screen.queryByText("Agent-reported confidence")).toBeNull()
    expect(screen.queryByText(/%/)).toBeNull()
  })

  it("keeps duplicate labels as distinct cards identified by the offered ID", () => {
    const head = {
      selectedId: "CLICK:billing",
      previewIds: ["CLICK:shipping", "CLICK:profile"],
      offered: [
        { id: "CLICK:billing", label: "Edit", context: "Billing address" },
        { id: "CLICK:shipping", label: "Edit", context: "Shipping address" },
        { id: "CLICK:profile", label: "Edit", context: "Profile address" },
      ],
    }
    renderEnglish(choiceGroupElement("things", "What it clicked", "Other things offered", head))

    const group = groupOf("things")
    expect(within(group).getAllByText("Edit")).toHaveLength(3)
    expect(cardIds(group)).toEqual(["CLICK:billing", "CLICK:shipping", "CLICK:profile"])
    expect(within(group).getByText("Shipping address")).toBeVisible()
    expect(within(group).getByText("Profile address")).toBeVisible()
    for (const card of alternativeCards(group)) {
      expect(card.querySelector("button, a, [tabindex]")).toBeNull()
    }
  })

  it("keeps repeated target labels as separate projected cards", () => {
    const run = projectRun(edgeRun("repeated-targets"), "candidates", fixtureRevision)
    renderInspector(run, { kind: "episode", episodeId: "episode-04" })

    const things = groupOf("things")
    expect(cardIds(things)).toEqual([
      "target-cloud-walk",
      "target-cloud-walk-copy",
      "target-breeze",
    ])
    expect(within(things).getAllByText("Cloud Walk Red Sneakers")).toHaveLength(2)
    expect(within(things).getByText("Result card 2")).toBeVisible()
    expect(within(things).getByText("Result card 3")).toBeVisible()
  })

  it("puts each count button immediately after its previews and expands only that group", async () => {
    const user = userEvent.setup()
    const run = walletRun("probabilities")
    renderInspector(run, { kind: "episode", episodeId: "episode-03" })

    const actions = groupOf("actions")
    const things = groupOf("things")
    const actionToggle = within(actions).getByRole("button", { name: "and 4 more actions" })
    const thingToggle = within(things).getByRole("button", { name: "and 36 more things" })

    for (const [group, toggle, previews] of [
      [actions, actionToggle, ["BLOCKED", "SCROLL_DOWN"]],
      [things, thingToggle, ["38"]],
    ] as const) {
      const list = group.querySelector("ul")
      if (!list) throw new Error("Missing alternative list")
      const previewItems = Array.from(list.querySelectorAll("li[data-candidate-id]"))
      expect(previewItems.map((item) => item.getAttribute("data-candidate-id"))).toEqual([
        ...previews,
      ])
      const toggleItem = toggle.closest("li")
      expect(toggleItem?.previousElementSibling).toBe(previewItems.at(-1))
      expect(list.children[previews.length]).toBe(toggleItem)
    }

    actionToggle.focus()
    await user.keyboard("{Enter}")

    expect(actionToggle).toHaveAttribute("aria-expanded", "true")
    expect(document.activeElement).toBe(actionToggle)
    expect(alternativeCards(actions)).toHaveLength(6)
    expect(alternativeIds(actions)).toEqual([
      "BLOCKED",
      "SCROLL_DOWN",
      "TYPE_TEXT",
      "SELECT",
      "WAIT",
      "DONE",
    ])
    expect(thingToggle).toHaveAttribute("aria-expanded", "false")
    expect(alternativeCards(things)).toHaveLength(1)

    await user.keyboard("{Enter}")
    expect(actionToggle).toHaveAttribute("aria-expanded", "false")
    expect(document.activeElement).toBe(actionToggle)
    expect(alternativeCards(actions)).toHaveLength(2)
  })

  it("expands all 36 remaining target choices in offered order", async () => {
    const user = userEvent.setup()
    const run = walletRun("probabilities")
    if (run.condition === "baseline") throw new Error("Expected experimental run")
    const episode = run.episodes.find((item) => item.id === "episode-03")
    if (!episode?.targetHead) throw new Error("Missing wallet target head")
    const expectedRemaining = remainingOfferedIds(episode.targetHead)
    expect(expectedRemaining).toHaveLength(36)

    renderInspector(run, { kind: "episode", episodeId: "episode-03" })
    const things = groupOf("things")
    const toggle = within(things).getByRole("button", { name: "and 36 more things" })
    await user.click(toggle)

    expect(alternativeCards(things)).toHaveLength(37)
    expect(alternativeIds(things).slice(1)).toEqual(expectedRemaining)
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(document.activeElement).toBe(toggle)
  })

  it("renders no expansion button when no alternatives remain", () => {
    renderInspector(walletRun("candidates"), { kind: "episode", episodeId: "episode-01" })

    const things = groupOf("things")
    expect(cardIds(things)).toEqual(["3"])
    expect(toggleButton(things)).toBeNull()
    expect(alternativeCards(things)).toHaveLength(0)
  })

  it("shows only a count button when every unchosen option scored zero", async () => {
    const user = userEvent.setup()
    renderInspector(walletRun("probabilities"), {
      kind: "episode",
      episodeId: "episode-02",
    })

    const things = groupOf("things")
    expect(alternativeCards(things)).toHaveLength(0)
    const toggle = within(things).getByRole("button", { name: "and 40 more things" })
    expect(things.querySelector("h4")).toBeNull()
    await user.click(toggle)
    expect(alternativeCards(things)).toHaveLength(40)
  })

  it("renders no target group for a targetless step", () => {
    const run = projectRun(edgeRun("controls"), "probabilities", fixtureRevision)
    renderInspector(run, { kind: "episode", episodeId: "episode-03" })

    expect(groupOf("actions")).toBeVisible()
    expect(document.querySelector('[data-choice-kind="things"]')).toBeNull()
    expect(screen.queryByRole("heading", { name: "What it clicked" })).toBeNull()
    expect(screen.getByText("No target required.")).toBeVisible()
  })

  it("renders no choice cards in the final state", () => {
    renderInspector(walletRun("probabilities"), { kind: "final" })

    expect(screen.getByRole("heading", { name: "Final state" })).toBeVisible()
    expect(document.querySelector("[data-choice-kind]")).toBeNull()
    expect(document.querySelector("[data-candidate-id]")).toBeNull()
    expect(document.querySelector("button[aria-expanded]")).toBeNull()
    expect(screen.queryByText(/%/)).toBeNull()
  })

  it("keeps the viewed episode read-only apart from the local count buttons", () => {
    const { container } = renderInspector(walletRun("candidates"), {
      kind: "episode",
      episodeId: "episode-03",
    })

    expect(screen.getByRole("heading", { name: "Viewed step 3" })).toBeVisible()
    expect(screen.getByText("Open Classic Leather Wallet product page")).toBeVisible()
    expect(within(container).queryByRole("combobox")).toBeNull()
    expect(within(container).queryByRole("textbox")).toBeNull()
    const buttons = within(container).getAllByRole("button")
    expect(buttons.length).toBeGreaterThan(0)
    for (const button of buttons) expect(button).toHaveAttribute("aria-expanded")
    expect(within(container).queryByText("Your mark")).toBeNull()
  })

  it("resets expansions on step change but preserves them across a verdict edit", async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en")
    render(<App runs={walletRuns("candidates")} />)

    const railItems = document.querySelectorAll<HTMLButtonElement>(".execution-rail-item")
    await user.click(railItems[2] ?? document.body)
    const actionToggle = within(groupOf("actions")).getByRole("button", {
      name: "and 4 more actions",
    })
    const thingToggle = within(groupOf("things")).getByRole("button", {
      name: "and 36 more things",
    })
    await user.click(actionToggle)
    await user.click(thingToggle)
    expect(actionToggle).toHaveAttribute("aria-expanded", "true")
    expect(thingToggle).toHaveAttribute("aria-expanded", "true")
    expect(alternativeCards(groupOf("actions"))).toHaveLength(6)
    expect(alternativeCards(groupOf("things"))).toHaveLength(37)

    await user.click(screen.getByRole("button", { name: "Does not fulfill the request" }))
    expect(actionToggle).toHaveAttribute("aria-expanded", "true")
    expect(thingToggle).toHaveAttribute("aria-expanded", "true")
    expect(alternativeCards(groupOf("actions"))).toHaveLength(6)
    expect(alternativeCards(groupOf("things"))).toHaveLength(37)

    await user.click(railItems[3] ?? document.body)
    await user.click(railItems[2] ?? document.body)
    const reopenedAction = within(groupOf("actions")).getByRole("button", {
      name: "and 4 more actions",
    })
    const reopenedThing = within(groupOf("things")).getByRole("button", {
      name: "and 36 more things",
    })
    expect(reopenedAction).toHaveAttribute("aria-expanded", "false")
    expect(reopenedThing).toHaveAttribute("aria-expanded", "false")
    expect(alternativeCards(groupOf("actions"))).toHaveLength(2)
    expect(alternativeCards(groupOf("things"))).toHaveLength(1)
  })
})

describe("decision inspector", () => {
  it("shows the same action and outcome in every condition", () => {
    for (const condition of studyConditions) {
      const run = projectRun(edgeRun("operation-error"), condition, fixtureRevision)
      const view = renderInspector(run, { kind: "episode", episodeId: "episode-04" })

      expect(screen.getByText("Attempted to open “Cloud Walk Red Sneakers”")).toBeVisible()
      expect(
        screen.getByText("The product click did not navigate to the product page."),
      ).toBeVisible()
      view.unmount()
    }
  })

  it("keeps a terminal episode to the action group only", () => {
    for (const condition of ["candidates", "probabilities"] as const) {
      const run = studyRuns(condition).en
      const view = renderInspector(run, { kind: "episode", episodeId: "episode-08" })

      expect(groupOf("actions")).toBeVisible()
      expect(document.querySelector('[data-choice-kind="things"]')).toBeNull()
      expect(screen.getByText("No target required.")).toBeVisible()
      view.unmount()
    }
  })

  it("shows neutral missing-target evidence for a malformed targeted episode", () => {
    for (const condition of ["candidates", "probabilities"] as const) {
      const run = studyRuns(condition).en
      if (run.condition === "baseline") throw new Error("Expected an experimental run")
      const malformed = {
        ...run,
        episodes: run.episodes.map((episode) =>
          episode.id === "episode-04" ? { ...episode, targetHead: null } : episode,
        ),
      } as StudyRun
      const view = renderInspector(malformed, { kind: "episode", episodeId: "episode-04" })

      expect(document.querySelector('[data-choice-kind="things"]')).toBeNull()
      expect(screen.queryByText("No target required.")).toBeNull()
      expect(screen.getByText("Target evidence is missing for this operation.")).toBeVisible()
      view.unmount()
    }
  })

  it.each(studyConditions)("keeps entered text common and unscored in %s", (condition) => {
    const run = studyRuns(condition).en
    renderInspector(run, { kind: "episode", episodeId: "episode-01" })

    expect(screen.getByText("Entered text")).toBeVisible()
    expect(screen.getByText("red running shoes")).toBeVisible()
    expect(screen.getByText("Actual input; not scored.")).toBeVisible()
  })
})
