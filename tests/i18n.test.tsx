import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { App } from "../src/App"
import { agentRuns } from "../src/data/agent-run"
import {
  detectLocale,
  enMessages,
  initialLocale,
  LOCALE_STORAGE_KEY,
  zhMessages,
} from "../src/i18n"
import { enStudyMessages, zhStudyMessages } from "../src/i18n/study-messages"

describe("locale detection", () => {
  it("prefers the query parameter, then stored choice, then browser language", () => {
    expect(detectLocale({ search: "?lang=en", stored: "zh", language: "zh-CN" })).toBe("en")
    expect(detectLocale({ search: "", stored: "en", language: "zh-CN" })).toBe("en")
    expect(detectLocale({ search: "", stored: null, language: "zh-CN" })).toBe("zh")
    expect(detectLocale({ search: "", stored: null, language: "en-US" })).toBe("en")
    expect(detectLocale({ search: "?lang=fr", stored: null, language: "en-US" })).toBe("en")
  })

  it("uses Chinese for simplified and traditional Chinese browser languages", () => {
    for (const language of ["zh", "zh-CN", "zh-Hans-CN", "zh-TW", "zh-HK", "zh-Hant-TW"]) {
      expect(detectLocale({ search: "", stored: null, language })).toBe("zh")
    }
  })

  it("uses English for every other browser language", () => {
    for (const language of ["en-US", "fr-FR", "ja-JP", ""]) {
      expect(detectLocale({ search: "", stored: null, language })).toBe("en")
    }
  })

  it("falls back to the preferred language list when the primary language is empty", () => {
    expect(detectLocale({ search: "", stored: null, language: "", languages: ["zh-TW"] })).toBe(
      "zh",
    )
  })
})

describe("locale persistence", () => {
  it("restores the stored locale when no language query is present", () => {
    // Given an English choice stored from a previous visit.
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en")
    // When the initial locale is resolved without a query string.
    const english = initialLocale()
    // Then the stored choice is used.
    expect(english).toBe("en")

    // Given a Chinese choice stored from a previous visit.
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "zh")
    // When the initial locale is resolved without a query string.
    const chinese = initialLocale()
    // Then the stored choice is used.
    expect(chinese).toBe("zh")
  })
})

describe("bilingual workspace", () => {
  it("renders the English interface and fixture when English is selected", () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en")

    render(<App />)

    expect(screen.getByText(agentRuns.en.final.text)).toBeInTheDocument()
    const browser = screen.getByRole("region", { name: "Agent browser" })
    expect(browser).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Fulfills the request" })).toBeInTheDocument()
    expect(within(browser).getByText("Last recorded state")).toBeVisible()
    expect(document.documentElement.lang).toBe("en")
    expect(document.title).toBe("Browser Assistant")
  })

  it("switches language from the header and remembers the choice", async () => {
    const user = userEvent.setup()

    render(<App />)
    await user.click(screen.getByRole("button", { name: "English" }))

    expect(screen.getByText(agentRuns.en.final.text)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Fulfills the request" })).toBeInTheDocument()
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en")
    expect(document.documentElement.lang).toBe("en")
  })

  it("keeps the language query and stored choice in sync when toggling", async () => {
    // Given an English query override with Chinese stored from a previous visit.
    window.history.replaceState(null, "", "/?lang=en")
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "zh")
    const user = userEvent.setup()
    // When the workspace renders in English and the Chinese option is clicked.
    render(<App />)
    expect(screen.getByText(agentRuns.en.final.text)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "中文" }))
    // Then the query, storage, document language, and fixture all follow the click.
    expect(window.location.search).toBe("?lang=zh")
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("zh")
    expect(document.documentElement.lang).toBe("zh-CN")
    expect(screen.getByText(agentRuns.zh.final.text)).toBeInTheDocument()
  })

  it("keeps the recorded decision when the language changes", async () => {
    // Given a Chinese workspace.
    const user = userEvent.setup()
    render(<App />)
    // When a choice is submitted and English is then selected.
    await user.click(screen.getByRole("button", { name: "符合原始任务" }))
    await user.click(screen.getByRole("button", { name: "提交评估" }))
    await user.click(screen.getByRole("button", { name: "English" }))
    // Then the submitted decision stays locked and its status is translated.
    expect(screen.getByRole("button", { name: "Fulfills the request" })).toBeDisabled()
    expect(screen.getByText("Submitted: fulfills the request.")).toBeInTheDocument()
  })

  it("restores the Chinese document metadata when switching back", async () => {
    // Given a Chinese workspace.
    const user = userEvent.setup()
    render(<App />)
    // When English is selected and then Chinese again.
    await user.click(screen.getByRole("button", { name: "English" }))
    await user.click(screen.getByRole("button", { name: "中文" }))
    // Then the document language and title follow the interface.
    expect(document.documentElement.lang).toBe("zh-CN")
    expect(document.title).toBe(zhMessages.appTitle)
  })
})

describe("study copy", () => {
  it("uses the approved bilingual localization prompt", () => {
    expect(enStudyMessages.localizationPrompt).toBe(
      "Which step contains the agent's earliest mistaken action?",
    )
    expect(zhStudyMessages.localizationPrompt).toBe("哪一步包含 Agent 最早的错误操作？")
  })

  it("exposes the study copy through the shared message contract", () => {
    expect(enMessages.study).toBe(enStudyMessages)
    expect(zhMessages.study).toBe(zhStudyMessages)
  })

  it("provides the complete bilingual study vocabulary", () => {
    for (const messages of [enStudyMessages, zhStudyMessages]) {
      expect(messages.executionOverview).not.toBe("")
      expect(messages.viewedStep(4)).toContain("4")
      expect(messages.viewedStepTag).not.toBe("")
      expect(messages.stepLabel(4)).toContain("4")
      expect(messages.originalTask).not.toBe("")
      expect(messages.agentReportedResult).not.toBe("")
      expect(messages.beforeStepCaption(4, 8)).toContain("4")
      expect(messages.beforeStepCaption(4, 8)).toContain("8")
      expect(messages.finalStateHeading).not.toBe("")
      expect(messages.finalStateExplanation).not.toBe("")
      expect(messages.recordedOutcome).not.toBe("")
      expect(messages.enteredText).not.toBe("")
      expect(messages.enteredTextNote).not.toBe("")
      expect(messages.offeredOperations).not.toBe("")
      expect(messages.offeredTargets).not.toBe("")
      expect(messages.candidateColumn).not.toBe("")
      expect(messages.contextColumn).not.toBe("")
      expect(messages.probabilityColumn).not.toBe("")
      expect(messages.selected).not.toBe("")
      expect(messages.noTargetRequired).not.toBe("")
      expect(messages.markEarliestMistake).not.toBe("")
      expect(messages.clearMark).not.toBe("")
      expect(messages.yourMark).not.toBe("")
      expect(messages.syntheticProvenance).not.toBe("")
      expect(messages.conditionalScoreExplanation).not.toBe("")
      expect(messages.roundingCaveat).not.toBe("")
    }
  })

  it("renders the approved before-step captions", () => {
    expect(enStudyMessages.beforeStepCaption(4, 8)).toBe("Before step 4 of 8")
    expect(zhStudyMessages.beforeStepCaption(4, 8)).toBe("第 4 步操作前 · 共 8 步")
  })
})
