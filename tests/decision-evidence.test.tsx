import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactElement } from "react"
import { describe, expect, it, vi } from "vitest"
import { CandidateTable } from "../src/components/ui/candidate-table"
import { DecisionInspector } from "../src/components/ui/decision-inspector"
import { ExecutionRail } from "../src/components/ui/execution-rail"
import type { ViewedSelection } from "../src/domain/decision-replay.ts"
import { projectRun } from "../src/domain/project-run.ts"
import { studyConditions } from "../src/domain/study-condition.ts"
import {
  initialStudyResponse,
  type ResponseAction,
  type StudyResponse,
} from "../src/domain/study-response.ts"
import type { StudyRun } from "../src/domain/study-run-schema.ts"
import { LocaleProvider } from "../src/i18n"
import { edgeRun, studyRuns } from "./fixtures/decision-runs.ts"

const fixtureRevision = "0".repeat(64)

function renderEnglish(element: ReactElement) {
  return render(
    <LocaleProvider initialLocale="en" syncDocument={false}>
      {element}
    </LocaleProvider>,
  )
}

function renderInspector(
  run: StudyRun,
  viewed: ViewedSelection,
  response: StudyResponse = initialStudyResponse(),
  onResponse: (action: ResponseAction) => void = vi.fn(),
) {
  return renderEnglish(
    <DecisionInspector run={run} viewed={viewed} response={response} onResponse={onResponse} />,
  )
}

function episodeById(run: StudyRun, episodeId: string): StudyRun["episodes"][number] {
  const episode = run.episodes.find((item) => item.id === episodeId)
  if (!episode) throw new Error(`Missing episode ${episodeId}`)
  return episode
}

function rowIds(table: HTMLElement): readonly (string | null)[] {
  return Array.from(table.querySelectorAll("tbody tr")).map((row) =>
    row.getAttribute("data-candidate-id"),
  )
}

function allRowIds(): readonly (readonly (string | null)[])[] {
  return screen.getAllByRole("table").map((table) => rowIds(table))
}

describe("candidate tables", () => {
  it("keeps same-label targets distinct without adding scores", () => {
    const head = {
      selectedId: "CLICK:shipping",
      offered: [
        { id: "CLICK:billing", label: "Edit", context: "Billing address" },
        { id: "CLICK:shipping", label: "Edit", context: "Shipping address" },
      ],
    }
    renderEnglish(<CandidateTable mode="candidates" head={head} caption="Click targets" />)

    expect(screen.getAllByText("Edit")).toHaveLength(2)
    expect(screen.getByText("Shipping address")).toBeVisible()
    expect(screen.getByText("Billing address")).toBeVisible()
    expect(screen.queryByRole("columnheader", { name: "Probability" })).toBeNull()
    expect(rowIds(screen.getByRole("table", { name: "Click targets" }))).toEqual([
      "CLICK:billing",
      "CLICK:shipping",
    ])
  })

  it("renders read-only rows with a selected marker", () => {
    const head = {
      selectedId: "CLICK:shipping",
      offered: [
        { id: "CLICK:billing", label: "Edit", context: "Billing address" },
        { id: "CLICK:shipping", label: "Edit", context: "Shipping address" },
      ],
    }
    renderEnglish(<CandidateTable mode="candidates" head={head} caption="Click targets" />)

    const table = screen.getByRole("table", { name: "Click targets" })
    expect(within(table).queryAllByRole("button")).toHaveLength(0)
    expect(within(table).queryAllByRole("link")).toHaveLength(0)
    expect(within(table).queryAllByRole("textbox")).toHaveLength(0)
    expect(within(table).getByText("Selected")).toBeVisible()
    expect(
      table.querySelector('tbody tr[data-selected="true"]')?.getAttribute("data-candidate-id"),
    ).toBe("CLICK:shipping")
  })

  it("adds one-decimal percentages only in the scored variant", () => {
    const head = {
      selectedId: "CLICK:shipping",
      offered: [
        { id: "CLICK:billing", label: "Edit", context: "Billing address", probability: 0.25 },
        { id: "CLICK:shipping", label: "Edit", context: "Shipping address", probability: 0.75 },
      ],
    }
    renderEnglish(<CandidateTable mode="probabilities" head={head} caption="Click targets" />)

    const table = screen.getByRole("table", { name: "Click targets" })
    expect(within(table).getByRole("columnheader", { name: "Probability" })).toBeVisible()
    expect(within(table).getByText("25.0%")).toBeVisible()
    expect(within(table).getByText("75.0%")).toBeVisible()
    expect(rowIds(table)).toEqual(["CLICK:billing", "CLICK:shipping"])
    expect(table.querySelector("[style]")).toBeNull()
  })

  it("formats percentages with the active locale", () => {
    render(
      <LocaleProvider initialLocale="zh" syncDocument={false}>
        <CandidateTable
          mode="probabilities"
          head={{
            selectedId: "target-one",
            offered: [{ id: "target-one", label: "目标一", context: null, probability: 0.5 }],
          }}
          caption="候选目标"
        />
      </LocaleProvider>,
    )

    const table = screen.getByRole("table", { name: "候选目标" })
    expect(within(table).getByRole("columnheader", { name: "概率" })).toBeVisible()
    expect(within(table).getByText("50.0%")).toBeVisible()
  })
})

describe("execution rail", () => {
  it.each(studyConditions)("shows the same chronological action labels for %s", (condition) => {
    const run = studyRuns(condition).en
    renderEnglish(
      <ExecutionRail
        episodes={run.episodes}
        viewed={{ kind: "final" }}
        localization={{ kind: "unanswered" }}
        onView={vi.fn()}
      />,
    )

    const buttons = screen.getAllByRole("button")
    expect(buttons).toHaveLength(8)
    expect(screen.getByText("Typed “red running shoes”")).toBeVisible()
    expect(screen.getByText("Opened “Cloud Walk Red Sneakers”")).toBeVisible()
    expect(screen.getByText("Reported task completion")).toBeVisible()
    expect(screen.queryByText("Your mark")).toBeNull()
  })

  it("keeps viewed and marked labels separate", () => {
    const run = studyRuns("candidates").en
    renderEnglish(
      <ExecutionRail
        episodes={run.episodes}
        viewed={{ kind: "episode", episodeId: "episode-04" }}
        localization={{ kind: "episode", episodeId: "episode-02" }}
        onView={vi.fn()}
      />,
    )

    const buttons = screen.getAllByRole("button")
    const viewedButton = buttons[3]
    const markedButton = buttons[1]
    if (!viewedButton || !markedButton) throw new Error("Expected eight rail buttons")

    expect(within(viewedButton).getByText("Viewed step 4")).toBeVisible()
    expect(within(viewedButton).queryByText("Your mark")).toBeNull()
    expect(within(markedButton).getByText("Your mark")).toBeVisible()
    expect(within(markedButton).queryByText("Viewed step 4")).toBeNull()
  })

  it("reports the stable episode ID when a viewed item is chosen", async () => {
    const user = userEvent.setup()
    const onView = vi.fn()
    const run = studyRuns("probabilities").en
    renderEnglish(
      <ExecutionRail
        episodes={run.episodes}
        viewed={{ kind: "final" }}
        localization={{ kind: "unanswered" }}
        onView={onView}
      />,
    )

    await user.click(screen.getByRole("button", { name: /Selected size 42/ }))
    expect(onView).toHaveBeenCalledWith("episode-05")
  })
})

describe("decision inspector", () => {
  it("keeps baseline free of candidate evidence", () => {
    const run = studyRuns("baseline").en
    const { container } = renderInspector(run, { kind: "episode", episodeId: "episode-04" })

    expect(screen.getByText("Opened “Cloud Walk Red Sneakers”")).toBeVisible()
    expect(screen.getByText("Viewed step 4")).toBeVisible()
    expect(screen.queryByRole("table")).toBeNull()
    expect(screen.queryByText("Offered operations")).toBeNull()
    expect(screen.queryByText("Offered targets")).toBeNull()
    expect(screen.queryByText("Probability")).toBeNull()
    expect(screen.queryByText("No target required.")).toBeNull()
    expect(container.querySelector("[data-candidate-id]")).toBeNull()
    expect(container.querySelector("[title]")).toBeNull()
    expect(container.querySelector("[aria-label]")).toBeNull()
    expect(container.querySelector("[aria-labelledby]")).toBeNull()
    expect(container.querySelector("[hidden]")).toBeNull()
    expect(container.innerHTML).not.toMatch(/candidate|probability/i)
    expect(screen.getByRole("button", { name: "Mark as earliest mistake" })).toBeEnabled()
  })

  it.each(studyConditions)("shows the same action and outcome in %s", (condition) => {
    const run = projectRun(edgeRun("operation-error"), condition, fixtureRevision)
    renderInspector(run, { kind: "episode", episodeId: "episode-04" })

    expect(screen.getByText("Attempted to open “Cloud Walk Red Sneakers”")).toBeVisible()
    expect(
      screen.getByText("The product click did not navigate to the product page."),
    ).toBeVisible()
  })

  it("shows ordered operation and target tables without scores in candidates", () => {
    const run = studyRuns("candidates").en
    const { container } = renderInspector(run, { kind: "episode", episodeId: "episode-04" })

    const tables = screen.getAllByRole("table")
    expect(tables).toHaveLength(2)

    const operationTable = screen.getByRole("table", { name: "Offered operations" })
    const targetTable = screen.getByRole("table", { name: "Offered targets" })
    expect(rowIds(operationTable)).toEqual(["CLICK", "TYPE_TEXT", "SELECT", "DONE"])
    expect(rowIds(targetTable)).toEqual([
      "target-breeze",
      "target-cloud-walk",
      "target-blaze",
      "target-retro",
    ])
    expect(
      operationTable
        .querySelector('tbody tr[data-selected="true"]')
        ?.getAttribute("data-candidate-id"),
    ).toBe("CLICK")
    expect(
      targetTable
        .querySelector('tbody tr[data-selected="true"]')
        ?.getAttribute("data-candidate-id"),
    ).toBe("target-cloud-walk")
    expect(within(operationTable).queryByRole("columnheader", { name: "Probability" })).toBeNull()
    expect(within(targetTable).queryByRole("columnheader", { name: "Probability" })).toBeNull()
    expect(container.querySelector("[style]")).toBeNull()
  })

  it("keeps candidate and probability rows in the same authored order", () => {
    const candidatesView = renderInspector(studyRuns("candidates").en, {
      kind: "episode",
      episodeId: "episode-04",
    })
    const candidateRows = allRowIds()
    candidatesView.unmount()

    renderInspector(studyRuns("probabilities").en, {
      kind: "episode",
      episodeId: "episode-04",
    })
    expect(allRowIds()).toEqual(candidateRows)

    const operationTable = screen.getByRole("table", { name: "Offered operations" })
    const targetTable = screen.getByRole("table", { name: "Offered targets" })
    expect(within(operationTable).getByText("68.0%")).toBeVisible()
    expect(within(targetTable).getByText("55.0%")).toBeVisible()
    expect(within(operationTable).getByText("14.0%")).toBeVisible()
    expect(within(targetTable).getByText("27.0%")).toBeVisible()
    expect(
      screen.getByText(
        "Probabilities apply within each operation or target list only; they are not overall action scores.",
      ),
    ).toBeVisible()
    expect(
      screen.getByText(
        "Percentages are rounded to one decimal place and may not add up to exactly 100%.",
      ),
    ).toBeVisible()
  })

  it.each(["candidates", "probabilities"] as const)(
    "shows no target table for a terminal episode in %s",
    (condition) => {
      const run = studyRuns(condition).en
      renderInspector(run, { kind: "episode", episodeId: "episode-08" })

      expect(screen.getAllByRole("table")).toHaveLength(1)
      expect(screen.getByRole("table", { name: "Offered operations" })).toBeVisible()
      expect(screen.getByText("No target required.")).toBeVisible()
    },
  )

  it("shows no target table for a control episode", () => {
    const run = projectRun(edgeRun("controls"), "probabilities", fixtureRevision)
    renderInspector(run, { kind: "episode", episodeId: "episode-03" })

    expect(screen.getAllByRole("table")).toHaveLength(1)
    expect(screen.getByText("No target required.")).toBeVisible()
  })

  it("keeps every native-select option as a separate contextual row", () => {
    const run = studyRuns("candidates").en
    renderInspector(run, { kind: "episode", episodeId: "episode-05" })

    const targetTable = screen.getByRole("table", { name: "Offered targets" })
    expect(rowIds(targetTable)).toEqual([
      "target-size-40",
      "target-size-41",
      "target-size-42",
      "target-size-43",
    ])
    expect(within(targetTable).getAllByText("Size option")).toHaveLength(4)
    expect(within(targetTable).getByText("Size 40")).toBeVisible()
    expect(within(targetTable).getByText("Size 43")).toBeVisible()
    expect(
      targetTable
        .querySelector('tbody tr[data-selected="true"]')
        ?.getAttribute("data-candidate-id"),
    ).toBe("target-size-42")
  })

  it("distinguishes repeated target labels by context", () => {
    const run = projectRun(edgeRun("repeated-targets"), "candidates", fixtureRevision)
    renderInspector(run, { kind: "episode", episodeId: "episode-04" })

    const targetTable = screen.getByRole("table", { name: "Offered targets" })
    expect(within(targetTable).getAllByText("Cloud Walk Red Sneakers")).toHaveLength(2)
    expect(within(targetTable).getByText("Result card 2")).toBeVisible()
    expect(within(targetTable).getByText("Result card 3")).toBeVisible()
    expect(
      targetTable
        .querySelector('tbody tr[data-selected="true"]')
        ?.getAttribute("data-candidate-id"),
    ).toBe("target-cloud-walk")
  })

  it.each(studyConditions)("keeps entered text common and unscored in %s", (condition) => {
    const run = studyRuns(condition).en
    renderInspector(run, { kind: "episode", episodeId: "episode-01" })

    expect(screen.getByText("Entered text")).toBeVisible()
    expect(screen.getByText("red running shoes")).toBeVisible()
    expect(screen.getByText("Actual input; not scored.")).toBeVisible()
    for (const table of screen.queryAllByRole("table")) {
      expect(within(table).queryByText("red running shoes")).toBeNull()
    }
  })

  it("shows no mark control for the final state", () => {
    const run = studyRuns("probabilities").en
    renderInspector(run, { kind: "final" })

    expect(screen.getByText("Final state")).toBeVisible()
    expect(
      screen.getByText(
        "The final page is shown after the last recorded action. It is not a numbered step and cannot be marked.",
      ),
    ).toBeVisible()
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("marks and clears the viewed episode through response actions", async () => {
    const user = userEvent.setup()
    const onResponse = vi.fn()
    const run = studyRuns("baseline").en
    const viewed = { kind: "episode", episodeId: "episode-04" } as const
    const view = renderEnglish(
      <DecisionInspector
        run={run}
        viewed={viewed}
        response={initialStudyResponse()}
        onResponse={onResponse}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Mark as earliest mistake" }))
    expect(onResponse).toHaveBeenCalledWith({ type: "mark", episodeId: "episode-04" })

    view.rerender(
      <LocaleProvider initialLocale="en" syncDocument={false}>
        <DecisionInspector
          run={run}
          viewed={viewed}
          response={{
            ...initialStudyResponse(),
            status: "pending",
            verdict: "accepted",
            localization: { kind: "episode", episodeId: "episode-04" },
          }}
          onResponse={onResponse}
        />
      </LocaleProvider>,
    )

    await user.click(screen.getByRole("button", { name: "Clear mark" }))
    expect(onResponse).toHaveBeenLastCalledWith({ type: "mark", episodeId: "episode-04" })
  })

  it("disables marking but not rail viewing after submission", async () => {
    const user = userEvent.setup()
    const run = studyRuns("candidates").en
    const onView = vi.fn()
    const onResponse = vi.fn()
    const response: StudyResponse = {
      status: "submitted",
      verdict: "accepted",
      localization: { kind: "episode", episodeId: "episode-04" },
      explanation: "The earliest mistake was opening the wrong product.",
    }

    renderEnglish(
      <>
        <ExecutionRail
          episodes={run.episodes}
          viewed={{ kind: "episode", episodeId: "episode-04" }}
          localization={response.localization}
          onView={onView}
        />
        <DecisionInspector
          run={run}
          viewed={{ kind: "episode", episodeId: "episode-04" }}
          response={response}
          onResponse={onResponse}
        />
      </>,
    )

    expect(screen.getByRole("button", { name: "Clear mark" })).toBeDisabled()
    const railButton = screen.getByRole("button", { name: /Selected size 42/ })
    expect(railButton).toBeEnabled()
    await user.click(railButton)
    expect(onView).toHaveBeenCalledWith("episode-05")
    expect(onResponse).not.toHaveBeenCalled()
    expect(screen.getAllByRole("table")).toHaveLength(2)
    expect(episodeById(run, "episode-04").action).toBe("Opened “Cloud Walk Red Sneakers”")
  })
})
