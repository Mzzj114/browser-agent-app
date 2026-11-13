import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { App } from "../src/App"
import { agentRuns } from "../src/data/agent-run"
import { detectLocale, initialLocale, LOCALE_STORAGE_KEY, zhMessages } from "../src/i18n"

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
    expect(screen.getByRole("region", { name: "Agent browser" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Accept result" })).toBeInTheDocument()
    expect(screen.getByText("Final state")).toBeInTheDocument()
    expect(document.documentElement.lang).toBe("en")
    expect(document.title).toBe("Browser Assistant")
  })

  it("switches language from the header and remembers the choice", async () => {
    const user = userEvent.setup()

    render(<App />)
    await user.click(screen.getByRole("button", { name: "English" }))

    expect(screen.getByText(agentRuns.en.final.text)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Accept result" })).toBeInTheDocument()
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
    // When the result is accepted and English is then selected.
    await user.click(screen.getByRole("button", { name: "接受结果" }))
    await user.click(screen.getByRole("button", { name: "English" }))
    // Then the decision stays locked and its status is translated.
    expect(screen.getByRole("button", { name: "Accept result" })).toBeDisabled()
    expect(screen.getByText("Recorded: result accepted.")).toBeInTheDocument()
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
