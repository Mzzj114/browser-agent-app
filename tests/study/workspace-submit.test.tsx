import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { App } from "../../src/App"
import { StudySubmittedNotice } from "../../src/components/ui/study-submitted-notice"
import { LocaleProvider } from "../../src/i18n"
import type { StudyRuntime } from "../../src/study/runtime.ts"
import type { StudySession } from "../../src/study/session.ts"
import type { SubmissionPayload } from "../../src/study/submission.ts"
import { readCompletedMarker, readSubmissionQueue } from "../../src/study/submission-store.ts"
import { SubmissionSendError, type SubmissionSink } from "../../src/study/supabase-rest.ts"
import { studyRuns } from "../fixtures/decision-runs.ts"

const session: StudySession = {
  participantCode: "P01",
  caseOrder: 1,
  caseCode: "C01",
  runId: "F1_add_single_item_clean",
  condition: "baseline",
  fixtureRevision: "decision-replay/2",
  appVersion: "0.1.0",
}

function useEnglish(): void {
  window.history.replaceState({}, "", "/?lang=en")
}

function railButtons(): readonly HTMLElement[] {
  return within(screen.getByRole("navigation", { name: "Execution overview" })).getAllByRole(
    "button",
  )
}

function explanationBox(): HTMLElement {
  return screen.getByRole("textbox", { name: /short explanation/i })
}

function runtime(sink: SubmissionSink): StudyRuntime {
  return { session, sink }
}

describe("study submission wiring", () => {
  it("submits once with the built payload and marks the case complete", async () => {
    useEnglish()
    const user = userEvent.setup()
    const sent: SubmissionPayload[] = []
    const sink: SubmissionSink = async (row) => {
      sent.push(row)
    }

    render(<App runs={studyRuns("baseline")} study={runtime(sink)} />)
    await user.click(screen.getByRole("button", { name: "Does not fulfill the request" }))
    fireEvent.change(explanationBox(), { target: { value: "The cart holds the wrong product." } })
    await user.click(screen.getByRole("button", { name: "Submit assessment" }))

    await waitFor(() => expect(sent).toHaveLength(1))
    const row = sent[0]
    if (!row) throw new Error("Missing submitted row")

    expect(row.submissionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
    expect(row.participantCode).toBe("P01")
    expect(row.caseOrder).toBe(1)
    expect(row.condition).toBe("baseline")
    expect(row.runId).toBe("F1_add_single_item_clean")
    expect(row.locale).toBe("en")
    expect(row.verdict).toBe("rejected")
    expect(row.explanation).toBe("The cart holds the wrong product.")
    expect(row.timing.wallMs).toBeGreaterThanOrEqual(0)
    expect(row.timing.stepViews).toBe(0)
    expect(row.timing.uniqueStepsViewed).toBe(0)
    expect(row.timing.finalViews).toBe(0)
    expect(row.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(row.submittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(row.appVersion).toBe("0.1.0")
    expect(row.fixtureRevision).toBe("decision-replay/2")
    expect(row.viewport.width).toBeGreaterThan(0)
    expect(row.viewport.height).toBeGreaterThan(0)

    expect(readCompletedMarker(window.localStorage, "P01", 1, "F1_add_single_item_clean")).toEqual({
      submissionId: row.submissionId,
    })
    expect(readSubmissionQueue(window.localStorage)).toEqual([])

    const dialog = await screen.findByRole("dialog", { name: "Response submitted" })
    expect(
      within(dialog).getByText("Case submitted. Please wait for the researcher."),
    ).toBeVisible()
    await within(dialog).findByText("Your response was sent to the study server.")

    await user.click(within(dialog).getByRole("button", { name: "Done" }))

    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByText("Case submitted. Please wait for the researcher.")).toBeVisible()
    expect(screen.getByText("Case submitted. Please wait for the researcher.")).toHaveFocus()
    await screen.findByText("Your response was sent to the study server.")
    expect(
      screen.queryByText("Shown on this page only. Reloading clears your response."),
    ).toBeNull()
  })

  it("records rail views into the timing counts", async () => {
    useEnglish()
    const user = userEvent.setup()
    const sent: SubmissionPayload[] = []
    const sink: SubmissionSink = async (row) => {
      sent.push(row)
    }

    render(<App runs={studyRuns("baseline")} study={runtime(sink)} />)
    await user.click(railButtons()[3] ?? document.body)
    await user.click(railButtons()[4] ?? document.body)
    const finalItem = document.querySelector(".execution-rail-list li:last-child")
    if (!(finalItem instanceof HTMLElement)) throw new Error("Missing final rail item")
    await user.click(within(finalItem).getByRole("button"))
    await user.click(screen.getByRole("button", { name: "Fulfills the request" }))
    await user.click(screen.getByRole("button", { name: "Submit assessment" }))

    await waitFor(() => expect(sent).toHaveLength(1))
    const row = sent[0]
    if (!row) throw new Error("Missing submitted row")
    expect(row.timing.stepViews).toBe(2)
    expect(row.timing.uniqueStepsViewed).toBe(2)
    expect(row.timing.finalViews).toBe(1)
  })

  it("keeps the response queued when the insert fails to send", async () => {
    useEnglish()
    const user = userEvent.setup()
    const sink: SubmissionSink = async () => {
      throw new SubmissionSendError("offline", true)
    }

    render(<App runs={studyRuns("baseline")} study={runtime(sink)} />)
    await user.click(screen.getByRole("button", { name: "Does not fulfill the request" }))
    await user.click(screen.getByRole("button", { name: "Submit assessment" }))

    await waitFor(() =>
      expect(
        within(screen.getByRole("dialog")).getByText(
          "Your response is saved on this device and will be sent automatically.",
        ),
      ).toBeVisible(),
    )
    expect(readSubmissionQueue(window.localStorage)).toHaveLength(1)
    expect(
      readCompletedMarker(window.localStorage, "P01", 1, "F1_add_single_item_clean"),
    ).not.toBeNull()
  })

  it("reports a permanent rejection honestly", async () => {
    useEnglish()
    const user = userEvent.setup()
    const sink: SubmissionSink = async () => {
      throw new SubmissionSendError("rejected", false)
    }

    render(<App runs={studyRuns("baseline")} study={runtime(sink)} />)
    await user.click(screen.getByRole("button", { name: "Does not fulfill the request" }))
    await user.click(screen.getByRole("button", { name: "Submit assessment" }))

    await waitFor(() =>
      expect(
        within(screen.getByRole("dialog")).getByText(
          "Your response is saved on this device. Please tell the researcher.",
        ),
      ).toBeVisible(),
    )
    expect(readSubmissionQueue(window.localStorage)[0]?.status).toBe("failed")
  })

  it("never submits twice even when the locale changes after submission", async () => {
    useEnglish()
    const user = userEvent.setup()
    const sent: SubmissionPayload[] = []
    const sink: SubmissionSink = async (row) => {
      sent.push(row)
    }

    render(<App runs={studyRuns("baseline")} study={runtime(sink)} />)
    await user.click(screen.getByRole("button", { name: "Does not fulfill the request" }))
    await user.click(screen.getByRole("button", { name: "Submit assessment" }))
    await waitFor(() => expect(sent).toHaveLength(1))

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Done" }))
    await user.click(screen.getByRole("button", { name: "中文" }))

    expect(sent).toHaveLength(1)
  })

  it("opens the dialog immediately and updates it when delivery completes", async () => {
    useEnglish()
    const user = userEvent.setup()
    const delivery = Promise.withResolvers<void>()
    const sunk: SubmissionPayload[] = []
    const sink: SubmissionSink = async (row) => {
      sunk.push(row)
      await delivery.promise
    }

    render(<App runs={studyRuns("baseline")} study={runtime(sink)} />)
    await user.click(screen.getByRole("button", { name: "Fulfills the request" }))
    await user.click(screen.getByRole("button", { name: "Submit assessment" }))

    const dialog = await screen.findByRole("dialog", { name: "Response submitted" })
    expect(within(dialog).getByRole("status")).toBeEmptyDOMElement()

    await waitFor(() => expect(sunk).toHaveLength(1))
    delivery.resolve()

    await waitFor(() =>
      expect(within(dialog).getByRole("status")).toHaveTextContent(
        "Your response was sent to the study server.",
      ),
    )
  })

  it("keeps demo submissions on the page only", async () => {
    useEnglish()
    const user = userEvent.setup()
    render(<App runs={studyRuns("baseline")} />)

    await user.click(screen.getByRole("button", { name: "Does not fulfill the request" }))
    await user.click(screen.getByRole("button", { name: "Submit assessment" }))

    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByText("Response recorded on this page only.")).toBeVisible()
    expect(screen.queryByText("Case submitted. Please wait for the researcher.")).toBeNull()
    expect(readSubmissionQueue(window.localStorage)).toEqual([])
    expect(
      readCompletedMarker(window.localStorage, "P01", 1, "F1_add_single_item_clean"),
    ).toBeNull()
  })

  it("renders the submitted notice for each upload state", () => {
    const cases = [
      ["delivered", "Your response was sent to the study server."],
      ["retrying", "Your response is saved on this device and will be sent automatically."],
      ["failed", "Your response is saved on this device. Please tell the researcher."],
    ] as const

    for (const [uploadStatus, line] of cases) {
      const view = render(
        <LocaleProvider initialLocale="en" syncDocument={false}>
          <StudySubmittedNotice uploadStatus={uploadStatus} />
        </LocaleProvider>,
      )
      expect(
        screen.getByRole("heading", { name: "Case submitted. Please wait for the researcher." }),
      ).toBeVisible()
      expect(screen.getByText(line)).toBeVisible()
      view.unmount()
    }
  })
})
