export const LOCALES = ["zh", "en"] as const
export type Locale = (typeof LOCALES)[number]

export const LOCALE_STORAGE_KEY = "browser-agent.locale"

export const HTML_LANG: Record<Locale, string> = {
  zh: "zh-CN",
  en: "en",
}

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "zh" || value === "en"
}

type LocaleDetectionInput = {
  readonly search: string
  readonly stored: string | null
  readonly language: string
  readonly languages?: readonly string[]
}

function isChineseLanguage(language: string): boolean {
  return /^zh(?:[-_]|$)/i.test(language.trim())
}

export function detectLocale({
  search,
  stored,
  language,
  languages = [],
}: LocaleDetectionInput): Locale {
  const fromQuery = new URLSearchParams(search).get("lang")
  if (isLocale(fromQuery)) return fromQuery
  if (isLocale(stored)) return stored
  const preferred = language.trim() === "" ? languages : [language]
  return preferred.some(isChineseLanguage) ? "zh" : "en"
}

export function initialLocale(): Locale {
  let stored: string | null = null
  try {
    stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  } catch {
    stored = null
  }
  return detectLocale({
    search: window.location.search,
    stored,
    language: window.navigator.language,
    languages: window.navigator.languages,
  })
}

export function storeLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Storage may be unavailable in restricted or private browsing contexts.
  }
}
