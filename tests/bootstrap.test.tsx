import { act } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { mountStudyApp } from "../src/bootstrap"
import { agentRun } from "../src/data/agent-run"
import type { StudyCondition } from "../src/domain/study-condition"
import { enMessages, HTML_LANG, zhMessages } from "../src/i18n"
import { studyRuns } from "./fixtures/decision-runs.ts"

const runId = "fixture-run"

type FixtureFiles = Record<string, unknown>

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

function runFixtureUrls(applicationBase: URL): readonly string[] {
  return ["index.json", `${runId}/run.en.json`, `${runId}/run.zh.json`]
    .map((file) => new URL(`runs/${file}`, applicationBase).href)
    .sort()
}

function requestPathnames(calls: readonly string[]): readonly string[] {
  return calls.map((url) => new URL(url).pathname).sort()
}

function fixtureFiles(condition: StudyCondition): FixtureFiles {
  const runs = studyRuns(condition)
  const zh = { ...runs.zh, runId }
  const en = { ...runs.en, runId }
  return {
    "index.json": {
      fixtureVersion: runs.zh.fixtureVersion,
      condition,
      fixtureRevision: runs.zh.fixtureRevision,
      runs: [
        {
          id: runId,
          ordinal: 1,
          steps: zh.episodes.length,
          title: { zh: "测试记录", en: "Test run" },
          files: { zh: "run.zh.json", en: "run.en.json" },
        },
      ],
    },
    [`${runId}/run.zh.json`]: structuredClone(zh),
    [`${runId}/run.en.json`]: structuredClone(en),
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!(typeof value === "object" && value !== null && !Array.isArray(value))) {
    throw new Error("Expected an object")
  }
  return value as Record<string, unknown>
}

function respondWith(files: FixtureFiles) {
  const calls: string[] = []
  const fetcher = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    calls.push(url)
    const key = new URL(url).pathname.replace(/^.*\/runs\//, "")
    if (!(key in files)) return new Response("missing", { status: 404 })
    return new Response(JSON.stringify(files[key]), { status: 200 })
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
    window.history.replaceState({}, "", `/?lang=zh&run=${runId}`)
    const files = fixtureFiles("baseline")
    const gate = deferred()
    const { fetcher } = respondWith(files)
    vi.stubGlobal("fetch", (async (input: RequestInfo | URL) => {
      await gate.promise
      return fetcher(input)
    }) as typeof fetch)
    const element = rootElement()
    const applicationBase = applicationBaseUrl()

    const mounting = startMount(element, applicationBase, "baseline")

    expect(screenText(element).trim()).toBe(zhMessages.study.loadingRuns)
    expect(element.querySelector(".app-shell")).toBeNull()
    expect(screenText(element)).not.toContain(studyRuns("baseline").zh.task)
    expect(document.documentElement.lang).toBe(HTML_LANG.zh)
    expect(document.title).toBe(zhMessages.appTitle)

    await act(async () => {
      gate.resolve()
      await mounting
    })

    expect(element.querySelector(".study-shell")).not.toBeNull()
    expect(screenText(element)).toContain(studyRuns("baseline").zh.task)
    expect(element).not.toHaveTextContent(zhMessages.study.loadingRuns)
  })

  it("sets the document language and title for an English loading notice", async () => {
    window.history.replaceState({}, "", `/?lang=en&run=${runId}`)
    const files = fixtureFiles("baseline")
    const gate = deferred()
    const { fetcher } = respondWith(files)
    vi.stubGlobal("fetch", (async (input: RequestInfo | URL) => {
      await gate.promise
      return fetcher(input)
    }) as typeof fetch)
    const element = rootElement()
    const applicationBase = applicationBaseUrl()

    const mounting = startMount(element, applicationBase, "baseline")

    expect(screenText(element).trim()).toBe(enMessages.study.loadingRuns)
    expect(document.documentElement.lang).toBe(HTML_LANG.en)
    expect(document.title).toBe(enMessages.appTitle)

    await act(async () => {
      gate.resolve()
      await mounting
    })

    expect(element.querySelector(".study-shell")).not.toBeNull()
    expect(document.documentElement.lang).toBe(HTML_LANG.en)
    expect(document.title).toBe(enMessages.appTitle)
  })

  it("mounts from an application root base and resolves the runs directory", async () => {
    window.history.replaceState({}, "", `/?lang=en&run=${runId}`)
    const runs = studyRuns("baseline")
    const applicationBase = new URL("/", document.baseURI)
    const { calls, fetcher } = respondWith(fixtureFiles("baseline"))
    vi.stubGlobal("fetch", fetcher)
    const element = rootElement()

    const mounting = startMount(element, applicationBase, "baseline")
    await act(async () => {
      await mounting
    })

    expect(screenText(element)).toContain(runs.en.task)
    expect(element.querySelector(".page-screenshot")).toHaveAttribute(
      "src",
      "screenshots/en/08-cart.webp",
    )
    expect(calls.sort()).toEqual(runFixtureUrls(applicationBase))
    expect(requestPathnames(calls)).toEqual([
      `/runs/${runId}/run.en.json`,
      `/runs/${runId}/run.zh.json`,
      "/runs/index.json",
    ])
  })

  it("resolves runs below a nested application deployment base", async () => {
    window.history.replaceState({}, "", `/?lang=en&run=${runId}`)
    const runs = studyRuns("baseline")
    const applicationBase = new URL("/nested-app/", document.baseURI)
    const { calls, fetcher } = respondWith(fixtureFiles("baseline"))
    vi.stubGlobal("fetch", fetcher)
    const element = rootElement()

    const mounting = startMount(element, applicationBase, "baseline")
    await act(async () => {
      await mounting
    })

    expect(screenText(element)).toContain(runs.en.task)
    expect(calls.sort()).toEqual(runFixtureUrls(applicationBase))
    expect(requestPathnames(calls)).toEqual([
      `/nested-app/runs/${runId}/run.en.json`,
      `/nested-app/runs/${runId}/run.zh.json`,
      "/nested-app/runs/index.json",
    ])
  })

  it("renders the picker when no run is requested", async () => {
    window.history.replaceState({}, "", "/?lang=en")
    const { fetcher } = respondWith(fixtureFiles("baseline"))
    vi.stubGlobal("fetch", fetcher)
    const element = rootElement()

    const mounting = startMount(element, applicationBaseUrl(), "baseline")
    await act(async () => {
      await mounting
    })

    expect(screenText(element)).toContain(enMessages.study.chooseRun)
    expect(element.querySelector(".picker-list a")).toHaveAttribute(
      "href",
      `/?lang=en&run=${runId}`,
    )
    expect(element.querySelector(".study-shell")).toBeNull()
  })

  it("renders the picker with an error for an unknown run", async () => {
    window.history.replaceState({}, "", "/?lang=en&run=missing-run")
    const { calls, fetcher } = respondWith(fixtureFiles("baseline"))
    vi.stubGlobal("fetch", fetcher)
    const element = rootElement()

    const mounting = startMount(element, applicationBaseUrl(), "baseline")
    await act(async () => {
      await mounting
    })

    expect(screenText(element)).toContain(enMessages.study.unknownRunTitle)
    expect(requestPathnames(calls)).toEqual(["/runs/index.json"])
  })

  it("renders a localized safe error and never falls back on a rejected index", async () => {
    window.history.replaceState({}, "", `/?lang=en&run=${runId}`)
    const files = fixtureFiles("baseline")
    files["index.json"] = {
      ...record(files["index.json"]),
      condition: "probabilities",
    }
    const { calls, fetcher } = respondWith(files)
    vi.stubGlobal("fetch", fetcher)
    const element = rootElement()
    const applicationBase = applicationBaseUrl()

    const mounting = startMount(element, applicationBase, "baseline")
    await act(async () => {
      await mounting
    })

    expect(screenText(element)).toContain(enMessages.study.loadErrorTitle)
    expect(screenText(element)).toContain(enMessages.study.loadErrorHint)
    expect(document.documentElement.lang).toBe(HTML_LANG.en)
    expect(document.title).toBe(enMessages.appTitle)
    expect(element.querySelector(".app-shell")).toBeNull()
    expect(screenText(element)).not.toMatch(/condition|HTTP|Zod|Failed to load|fixture/i)

    expect(screenText(element)).not.toContain(studyRuns("baseline").en.task)
    expect(screenText(element)).not.toContain(agentRun.final.text)
    expect(calls.sort()).toEqual([new URL("runs/index.json", applicationBase).href])
  })
})

function screenText(element: HTMLElement): string {
  return element.textContent ?? ""
}
