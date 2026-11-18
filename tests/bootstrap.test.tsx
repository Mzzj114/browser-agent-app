import { act } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { mountStudyApp } from "../src/bootstrap"
import { agentRun } from "../src/data/agent-run"
import type { StudyCondition } from "../src/domain/study-condition"
import { enMessages, zhMessages } from "../src/i18n"
import { studyRuns } from "./fixtures/decision-runs.ts"

type FixtureFile = "manifest.json" | "run.en.json" | "run.zh.json"
type FixtureFiles = Record<FixtureFile, unknown>

const containers: HTMLElement[] = []

function rootElement(): HTMLElement {
  const element = document.createElement("div")
  document.body.append(element)
  containers.push(element)
  return element
}

function applicationBaseUrl(): URL {
  return new URL("../", document.baseURI)
}

function studyFixtureUrls(applicationBase: URL): readonly string[] {
  return ["manifest.json", "run.en.json", "run.zh.json"]
    .map((file) => new URL(`study/${file}`, applicationBase).href)
    .sort()
}

function requestPathnames(calls: readonly string[]): readonly string[] {
  return calls.map((url) => new URL(url).pathname).sort()
}

function fixtureFiles(condition: StudyCondition): FixtureFiles {
  const runs = studyRuns(condition)
  return {
    "manifest.json": {
      fixtureVersion: runs.zh.fixtureVersion,
      condition,
      fixtureRevision: runs.zh.fixtureRevision,
      files: { zh: "run.zh.json", en: "run.en.json" },
    },
    "run.zh.json": structuredClone(runs.zh),
    "run.en.json": structuredClone(runs.en),
  }
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected an object")
  }
  return value as Record<string, unknown>
}

function respondWith(files: FixtureFiles) {
  const calls: string[] = []
  const fetcher = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    calls.push(url)
    const name = new URL(url).pathname.split("/").at(-1) ?? ""
    if (!(name in files)) return new Response("missing", { status: 404 })
    return new Response(JSON.stringify(files[name as FixtureFile]), { status: 200 })
  }) as typeof fetch
  return { calls, fetcher }
}

function deferred() {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function startMount(
  element: HTMLElement,
  applicationBase: URL,
  condition: StudyCondition,
): Promise<void> {
  let mounting: Promise<void> = Promise.resolve()
  act(() => {
    mounting = mountStudyApp(element, applicationBase, condition)
  })
  return mounting
}

afterEach(() => {
  for (const element of containers.splice(0)) element.remove()
  vi.unstubAllGlobals()
})

describe("participant bootstrap", () => {
  it("shows only localized loading text until both locales validate", async () => {
    // Given fixture requests that have not completed.
    const files = fixtureFiles("baseline")
    const gate = deferred()
    const { fetcher } = respondWith(files)
    vi.stubGlobal("fetch", (async (input: RequestInfo | URL) => {
      await gate.promise
      return fetcher(input)
    }) as typeof fetch)
    const element = rootElement()
    const applicationBase = applicationBaseUrl()

    // When the participant app starts.
    const mounting = startMount(element, applicationBase, "baseline")

    // Then no workspace or raw fixture data is shown before validation.
    expect(screenText(element).trim()).toBe(zhMessages.study.loadingStudy)
    expect(element.querySelector(".app-shell")).toBeNull()
    expect(screenText(element)).not.toContain(studyRuns("baseline").zh.task)

    // When validation finishes.
    await act(async () => {
      gate.resolve()
      await mounting
    })

    // Then the projected workspace mounts once.
    expect(element.querySelector(".study-shell")).not.toBeNull()
    expect(screenText(element)).toContain(studyRuns("baseline").zh.task)
    expect(element).not.toHaveTextContent(zhMessages.study.loadingStudy)
  })

  it("mounts from an application root base and resolves the study directory", async () => {
    // Given English locale selection and valid baseline fixtures at the application root.
    window.history.replaceState({}, "", "/?lang=en")
    const runs = studyRuns("baseline")
    const applicationBase = new URL("/", document.baseURI)
    const { calls, fetcher } = respondWith(fixtureFiles("baseline"))
    vi.stubGlobal("fetch", fetcher)
    const element = rootElement()

    // When the app finishes validation.
    const mounting = startMount(element, applicationBase, "baseline")
    await act(async () => {
      await mounting
    })

    // Then the projected English run is rendered and fixtures came from the study subdirectory.
    expect(screenText(element)).toContain(runs.en.task)
    expect(screenText(element)).toContain(runs.en.report)
    expect(element.querySelector(".page-screenshot")).toHaveAttribute(
      "src",
      "screenshots/en/08-cart.webp",
    )
    expect(calls.sort()).toEqual(studyFixtureUrls(applicationBase))
    expect(requestPathnames(calls)).toEqual([
      "/study/manifest.json",
      "/study/run.en.json",
      "/study/run.zh.json",
    ])
  })

  it("resolves fixtures below a nested application deployment base", async () => {
    // Given the app deployed under a nested path with its fixtures one level below it.
    window.history.replaceState({}, "", "/?lang=en")
    const runs = studyRuns("baseline")
    const applicationBase = new URL("/nested-app/", document.baseURI)
    const { calls, fetcher } = respondWith(fixtureFiles("baseline"))
    vi.stubGlobal("fetch", fetcher)
    const element = rootElement()

    // When the app validates from that application base.
    const mounting = startMount(element, applicationBase, "baseline")
    await act(async () => {
      await mounting
    })

    // Then both locales mount and requests point exactly at nested-app/study, not the app root.
    expect(screenText(element)).toContain(runs.en.task)
    expect(calls.sort()).toEqual(studyFixtureUrls(applicationBase))
    expect(requestPathnames(calls)).toEqual([
      "/nested-app/study/manifest.json",
      "/nested-app/study/run.en.json",
      "/nested-app/study/run.zh.json",
    ])
  })

  it("renders a localized safe error and never falls back on a rejected fixture", async () => {
    // Given a manifest that declares the wrong condition.
    window.history.replaceState({}, "", "/?lang=en")
    const files = fixtureFiles("baseline")
    files["manifest.json"] = {
      ...record(files["manifest.json"]),
      condition: "probabilities",
    }
    const { calls, fetcher } = respondWith(files)
    vi.stubGlobal("fetch", fetcher)
    const element = rootElement()
    const applicationBase = applicationBaseUrl()

    // When validation rejects the fixture.
    const mounting = startMount(element, applicationBase, "baseline")
    await act(async () => {
      await mounting
    })

    // Then only localized safe error copy is rendered.
    expect(screenText(element)).toContain(enMessages.study.loadErrorTitle)
    expect(screenText(element)).toContain(enMessages.study.loadErrorHint)
    expect(element.querySelector(".app-shell")).toBeNull()
    expect(screenText(element)).not.toMatch(/condition|HTTP|Zod|Failed to load|fixture/i)

    // And no stale or richer fixture was substituted.
    expect(screenText(element)).not.toContain(studyRuns("baseline").en.task)
    expect(screenText(element)).not.toContain(agentRun.final.text)
    expect(calls.sort()).toEqual(studyFixtureUrls(applicationBase))
  })
})

function screenText(element: HTMLElement): string {
  return element.textContent ?? ""
}
