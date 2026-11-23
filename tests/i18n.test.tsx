import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { App } from "../src/App"
import {
  detectLocale,
  enMessages,
  initialLocale,
  LOCALE_STORAGE_KEY,
  zhMessages,
} from "../src/i18n"
import { enStudyMessages, zhStudyMessages } from "../src/i18n/study-messages"
import { studyRuns } from "./fixtures/decision-runs.ts"

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
  it("renders the English interface around the same projected run", () => {
    window.history.replaceState({}, "", "/?lang=en")
    const runs = studyRuns("baseline")

    render(<App runs={runs} />)

    expect(screen.getAllByText(runs.en.task).length).toBeGreaterThan(0)
    expect(screen.getByRole("region", { name: "Agent browser" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Fulfills the request" })).toBeInTheDocument()
    const browser = screen.getByRole("region", { name: "Agent browser" })
    expect(within(browser).getByText("Last recorded state")).toBeVisible()
    expect(document.documentElement.lang).toBe("en")
    expect(document.title).toBe("Browser Assistant")
  })

  it("switches language from the header and remembers the choice", async () => {
    const user = userEvent.setup()
    const runs = studyRuns("baseline")

    render(<App runs={runs} />)
    await user.click(screen.getByRole("button", { name: "English" }))

    expect(screen.getAllByText(runs.en.task).length).toBeGreaterThan(0)
    expect(screen.getByRole("button", { name: "Fulfills the request" })).toBeInTheDocument()
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en")
    expect(document.documentElement.lang).toBe("en")
  })

  it("keeps the language query and stored choice in sync when toggling", async () => {
    // Given an English query override with Chinese stored from a previous visit.
    window.history.replaceState(null, "", "/?lang=en")
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "zh")
    const user = userEvent.setup()
    const runs = studyRuns("baseline")
    // When the workspace renders in English and the Chinese option is clicked.
    render(<App runs={runs} />)
    expect(screen.getAllByText(runs.en.task).length).toBeGreaterThan(0)
    await user.click(screen.getByRole("button", { name: "中文" }))
    // Then the query, storage, document language, and run all follow the click.
    expect(window.location.search).toBe("?lang=zh")
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("zh")
    expect(document.documentElement.lang).toBe("zh-CN")
    expect(screen.getAllByText(runs.zh.task).length).toBeGreaterThan(0)
  })

  it("keeps the recorded response when the language changes", async () => {
    // Given a Chinese workspace with a submitted acceptance.
    const user = userEvent.setup()
    render(<App runs={studyRuns("probabilities")} />)
    await user.click(screen.getByRole("button", { name: "符合原始任务" }))
    await user.click(screen.getByRole("button", { name: "提交评估" }))
    // When English is then selected.
    await user.click(screen.getByRole("button", { name: "English" }))
    // Then the submitted response stays locked and its status is translated.
    const accepted = screen.getByRole("button", { name: "Fulfills the request" })
    expect(accepted).toBeDisabled()
    expect(accepted).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByText("Response recorded on this page only.")).toBeVisible()
  })

  it("restores the Chinese document metadata when switching back", async () => {
    // Given a Chinese workspace.
    const user = userEvent.setup()
    render(<App runs={studyRuns("baseline")} />)
    // When English is selected and then Chinese again.
    await user.click(screen.getByRole("button", { name: "English" }))
    await user.click(screen.getByRole("button", { name: "中文" }))
    // Then the document language and title follow the interface.
    expect(document.documentElement.lang).toBe("zh-CN")
    expect(document.title).toBe(zhMessages.appTitle)
  })
})

describe("study copy", () => {
  it("keeps the explanation optional for either verdict and drops localization controls", () => {
    for (const messages of [enStudyMessages, zhStudyMessages]) {
      expect(messages.explanationHeading).not.toBe("")
      expect(messages.explanationOptional).not.toBe("")
      expect(messages.explanationOptionalHelper).not.toBe("")
      expect("localizationPrompt" in messages).toBe(false)
      expect("localizationPlaceholder" in messages).toBe(false)
      expect("cannotDetermine" in messages).toBe(false)
      expect("uncertaintyHelper" in messages).toBe(false)
      expect("yourMark" in messages).toBe(false)
      expect("markEarliestMistake" in messages).toBe(false)
      expect("clearMark" in messages).toBe(false)
    }
  })

  it("retires the table and probability-score copy", () => {
    for (const messages of [enStudyMessages, zhStudyMessages]) {
      expect("offeredOperations" in messages).toBe(false)
      expect("offeredTargets" in messages).toBe(false)
      expect("candidateColumn" in messages).toBe(false)
      expect("contextColumn" in messages).toBe(false)
      expect("probabilityColumn" in messages).toBe(false)
      expect("conditionalScoreExplanation" in messages).toBe(false)
      expect("roundingCaveat" in messages).toBe(false)
    }
  })

  it("exposes the study copy through the shared message contract", () => {
    expect(enMessages.study).toBe(enStudyMessages)
    expect(zhMessages.study).toBe(zhStudyMessages)
  })

  it("provides the complete bilingual study vocabulary", () => {
    for (const messages of [enStudyMessages, zhStudyMessages]) {
      expect(messages.executionOverview).not.toBe("")
      expect(messages.stepsHeading).not.toBe("")
      expect(messages.viewedStep(4)).toContain("4")
      expect(messages.viewedStepTag).not.toBe("")
      expect(messages.stepLabel(4)).toContain("4")
      expect(messages.originalTask).not.toBe("")
      expect(messages.originalTaskHint).not.toBe("")
      expect(messages.beforeStepCaption(4, 8)).toContain("4")
      expect(messages.beforeStepCaption(4, 8)).toContain("8")
      expect(messages.finalStateHeading).not.toBe("")
      expect(messages.finalStateExplanation).not.toBe("")
      expect(messages.recordedOutcome).not.toBe("")
      expect(messages.enteredText).not.toBe("")
      expect(messages.enteredTextNote).not.toBe("")
      expect(messages.whatTheAgentDid).not.toBe("")
      expect(messages.whatItClicked).not.toBe("")
      expect(messages.whereItTyped).not.toBe("")
      expect(messages.whatItSelected).not.toBe("")
      expect(messages.otherActionsOffered).not.toBe("")
      expect(messages.otherThingsOffered).not.toBe("")
      expect(messages.moreActions(4)).not.toBe("")
      expect(messages.moreThings(4)).not.toBe("")
      expect(messages.fewerActions).not.toBe("")
      expect(messages.fewerThings).not.toBe("")
      expect(messages.confidenceLabel).not.toBe("")
      expect(messages.confidenceUnavailable).not.toBe("")
      expect(messages.confidenceExplanation).not.toBe("")
      expect(messages.selected).not.toBe("")
      expect(messages.noTargetRequired).not.toBe("")
      expect(messages.explanationHeading).not.toBe("")
      expect(messages.explanationOptional).not.toBe("")
      expect(messages.explanationOptionalHelper).not.toBe("")
      expect(messages.syntheticProvenance).not.toBe("")
      expect(messages.loadingStudy).not.toBe("")
      expect(messages.loadErrorTitle).not.toBe("")
      expect(messages.loadErrorHint).not.toBe("")
    }
  })

  it("explains confidence as agent-reported rather than a correctness check", () => {
    expect(enStudyMessages.confidenceLabel).toBe("Confidence")
    expect(zhStudyMessages.confidenceLabel).toBe("置信度")
    expect(enStudyMessages.confidenceExplanation).toMatch(/agent reported/i)
    expect(enStudyMessages.confidenceExplanation).toMatch(/not a check/i)
    expect(enStudyMessages.confidenceExplanation).toMatch(/correct/i)
    expect(zhStudyMessages.confidenceExplanation).toMatch(/Agent/)
    expect(zhStudyMessages.confidenceExplanation).toMatch(/报告/)
    expect(zhStudyMessages.confidenceExplanation).toMatch(/不代表/)
  })

  it("uses the compact step and alternative vocabulary", () => {
    expect(enStudyMessages.stepsHeading).toBe("Steps")
    expect(zhStudyMessages.stepsHeading).toBe("步骤")
    expect(enStudyMessages.otherActionsOffered).toBe("Other actions not taken")
    expect(zhStudyMessages.otherActionsOffered).toBe("未采取的其他操作")
    expect(enStudyMessages.otherThingsOffered).toBe("Other things it could click")
    expect(zhStudyMessages.otherThingsOffered).toBe("其他可点击目标")
  })

  it("uses singular count copy for one remaining choice", () => {
    expect(enStudyMessages.moreActions(1)).toBe("and 1 more action")
    expect(enStudyMessages.moreThings(1)).toBe("and 1 more thing")
    expect(enStudyMessages.moreActions(4)).toBe("and 4 more actions")
    expect(enStudyMessages.moreThings(36)).toBe("and 36 more things")
    expect(enStudyMessages.fewerActions).toBe("Show fewer actions")
    expect(enStudyMessages.fewerThings).toBe("Show fewer things")
    expect(zhStudyMessages.moreActions(4)).toContain("4")
    expect(zhStudyMessages.moreThings(36)).toContain("36")
  })

  it("renders the approved before-step captions", () => {
    expect(enStudyMessages.beforeStepCaption(4, 8)).toBe("Before step 4 of 8")
    expect(zhStudyMessages.beforeStepCaption(4, 8)).toBe("第 4 步操作前 · 共 8 步")
  })

  it("describes the final state without removed marking copy", () => {
    expect(enStudyMessages.finalStateExplanation).toBe(
      "The final page is shown after the last recorded action. It is not a numbered step.",
    )
    expect(zhStudyMessages.finalStateExplanation).toBe(
      "此处显示最后一次记录操作后的页面。最终状态不是编号步骤。",
    )
  })

  it("provides the researcher link, configuration, and case progress copy", () => {
    for (const messages of [enStudyMessages, zhStudyMessages]) {
      expect(messages.invalidLinkTitle).not.toBe("")
      expect(messages.invalidLinkHint).not.toBe("")
      expect(messages.studyConfigErrorTitle).not.toBe("")
      expect(messages.studyConfigErrorHint).not.toBe("")
      expect(messages.caseProgress(2, 3)).toContain("2")
      expect(messages.caseProgress(2, 3)).toContain("3")
      expect(typeof messages.studySubmittedNotice).toBe("string")
      expect(typeof messages.uploadSynced).toBe("string")
      expect(typeof messages.uploadRetrying).toBe("string")
      expect(typeof messages.uploadFailedNotice).toBe("string")
      expect(messages.uploadSynced).not.toBe(messages.uploadRetrying)
      expect(messages.uploadRetrying).not.toBe(messages.uploadFailedNotice)
    }
  })
})
