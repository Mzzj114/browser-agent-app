import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test } from "@playwright/test"
import { representativeRunId, runUrl } from "./run.ts"

const cases = JSON.parse(readFileSync(resolve("src", "study", "cases.json"), "utf8")) as Record<
  string,
  string
>

const caseEntry = Object.entries(cases).find(([, runId]) => runId === representativeRunId)
if (!caseEntry) throw new Error("Missing case code for the representative run")
const caseCode = caseEntry[0]

const submissionUrl = "**/rest/v1/study_submissions"

// The webServer build pins the condition through the same variable the app reads.
const expectedCondition = process.env["VITE_STUDY_CONDITION"] ?? "baseline"

function studyUrl(params: string): string {
  return `/?lang=en&${params}`
}

test("collects a study submission through a researcher link", async ({ page }) => {
  const rows: Record<string, unknown>[] = []
  await page.route(submissionUrl, async (route) => {
    rows.push(route.request().postDataJSON() as Record<string, unknown>)
    await route.fulfill({ status: 201 })
  })

  await page.goto(studyUrl(`p=P01&c=1&case=${caseCode}`))

  await expect(page.getByText("Case 1 of 3")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Final state" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Choose a recorded run" })).toHaveCount(0)

  await page.locator(".execution-rail-item").nth(3).click()

  await page.getByRole("button", { name: "Does not fulfill the request" }).click()
  await page
    .getByRole("textbox", { name: /short explanation/i })
    .fill("The cart holds the wrong product.")
  await page.getByRole("button", { name: "Submit assessment" }).click()

  await expect(page.getByText("Case submitted. Please wait for the researcher.")).toBeVisible()
  await expect(page.getByText("Your response was sent to the study server.")).toBeVisible()
  await expect(
    page.getByText("Shown on this page only. Reloading clears your response."),
  ).toHaveCount(0)

  expect(rows).toHaveLength(1)
  const row = rows[0]
  if (!row) throw new Error("Missing submitted row")
  expect(row["participant_code"]).toBe("P01")
  expect(row["case_order"]).toBe(1)
  expect(row["condition"]).toBe(expectedCondition)
  expect(row["run_id"]).toBe(representativeRunId)
  expect(row["verdict"]).toBe("rejected")
  expect(row["explanation"]).toBe("The cart holds the wrong product.")
  expect(typeof row["submission_id"]).toBe("string")
  const timing = row["timing"] as Record<string, number>
  expect(timing["wallMs"]).toBeGreaterThanOrEqual(0)
  expect(timing["stepViews"]).toBe(1)
  expect(timing["uniqueStepsViewed"]).toBe(1)
  expect(timing["finalViews"]).toBe(0)
})

test("shows the submitted notice on reload instead of a blank form", async ({ page }) => {
  await page.route(submissionUrl, (route) => route.fulfill({ status: 201 }))

  await page.goto(studyUrl(`p=P01&c=2&case=${caseCode}`))
  await page.getByRole("button", { name: "Fulfills the request" }).click()
  await page.getByRole("button", { name: "Submit assessment" }).click()
  await expect(page.getByText("Case submitted. Please wait for the researcher.")).toBeVisible()

  await page.reload()

  await expect(
    page.getByRole("heading", { name: "Case submitted. Please wait for the researcher." }),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Submit assessment" })).toHaveCount(0)
})

test("retries a failed upload when the browser comes back online", async ({ page }) => {
  let offline = true
  await page.route(submissionUrl, (route) =>
    offline ? route.abort("connectionfailed") : route.fulfill({ status: 201 }),
  )

  await page.goto(studyUrl(`p=P01&c=3&case=${caseCode}`))
  await page.getByRole("button", { name: "Fulfills the request" }).click()
  await page.getByRole("button", { name: "Submit assessment" }).click()

  await expect(
    page.getByText("Your response is saved on this device and will be sent automatically."),
  ).toBeVisible()

  offline = false
  await page.evaluate(() => window.dispatchEvent(new Event("online")))

  await expect(page.getByText("Your response was sent to the study server.")).toBeVisible()
})

test("retries a queued upload from the submitted notice when back online", async ({ page }) => {
  let offline = true
  await page.route(submissionUrl, (route) =>
    offline ? route.abort("connectionfailed") : route.fulfill({ status: 201 }),
  )

  await page.goto(studyUrl(`p=P02&c=1&case=${caseCode}`))
  await page.getByRole("button", { name: "Fulfills the request" }).click()
  await page.getByRole("button", { name: "Submit assessment" }).click()
  await expect(
    page.getByText("Your response is saved on this device and will be sent automatically."),
  ).toBeVisible()

  await page.reload()

  await expect(
    page.getByRole("heading", { name: "Case submitted. Please wait for the researcher." }),
  ).toBeVisible()
  await expect(
    page.getByText("Your response is saved on this device and will be sent automatically."),
  ).toBeVisible()

  offline = false
  await page.evaluate(() => window.dispatchEvent(new Event("online")))

  await expect(page.getByText("Your response was sent to the study server.")).toBeVisible()
})

test("reports a permanent rejection honestly", async ({ page }) => {
  await page.route(submissionUrl, (route) => route.fulfill({ status: 400 }))

  await page.goto(studyUrl(`p=P01&c=1&case=${caseCode}`))
  await page.getByRole("button", { name: "Fulfills the request" }).click()
  await page.getByRole("button", { name: "Submit assessment" }).click()

  await expect(
    page.getByText("Your response is saved on this device. Please tell the researcher."),
  ).toBeVisible()
  await expect(
    page.getByText("Your response is saved on this device and will be sent automatically."),
  ).toHaveCount(0)
})

test("rejects malformed study links without the picker", async ({ page }) => {
  for (const params of ["case=NOPE&p=P01&c=1", "p=P07", "c=2", "case=C01&c=1"]) {
    await page.goto(studyUrl(params))
    await expect(page.getByRole("heading", { name: "That link is not valid" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Choose a recorded run" })).toHaveCount(0)
  }
})

test("keeps the demo deep link working", async ({ page }) => {
  await page.goto(runUrl("en"))

  await expect(page.getByRole("heading", { name: "Final state" })).toBeVisible()
  await expect(page.getByText(/^Case \d of \d$/)).toHaveCount(0)
})
